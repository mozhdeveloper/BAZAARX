/**
 * Chat Service - Handles messaging between buyers and sellers
 * Uses Supabase for storage and real-time subscriptions
 * 
 * Updated for new normalized schema (February 2026):
 * - conversations table only has: id, buyer_id, order_id, created_at, updated_at
 * - NO seller_id (seller determined via order→order_items→product→seller or via messages)
 * - NO last_message, unread counts (computed from messages)
 * - Uses first_name/last_name instead of full_name
 */

import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { notificationService } from './notificationService';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'buyer' | 'seller';
  content: string;
  image_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  buyer_id: string;
  order_id?: string | null;
  created_at: string;
  updated_at: string;
  // Computed/joined data (not in DB)
  seller_id?: string;
  last_message?: string;
  last_message_at?: string;
  buyer_unread_count?: number;
  seller_unread_count?: number;
  // Joined profile data
  buyer_name?: string;
  buyer_email?: string;
  buyer_avatar?: string;
  seller_name?: string;
  seller_avatar?: string;
  seller_store_name?: string;
  // For compatibility
  buyer?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;  // Computed for legacy
    email?: string;
    avatar_url?: string;
  };
  seller?: {
    store_name?: string;
  };
}

class ChatService {
  private subscriptions: Map<string, RealtimeChannel> = new Map();

  /**
   * Helper: Get seller ID from order
   */
  private async getSellerIdFromOrder(orderId: string): Promise<string | null> {
    // Get seller from order items (first product's seller)
    const { data } = await supabase
      .from('order_items')
      .select(`
        product:products (
          seller_id
        )
      `)
      .eq('order_id', orderId)
      .limit(1)
      .single();

    // Note: If products don't have seller_id, this might need adjustment
    return (data?.product as any)?.seller_id || null;
  }

  /**
   * Helper: Get buyer's full name from profile
   */
  private getBuyerFullName(profile: { first_name?: string; last_name?: string }): string {
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown Buyer';
  }

  /**
   * Helper: Get last message and unread counts for a conversation
   */
  private async getConversationStats(conversationId: string, buyerId: string, sellerId?: string): Promise<{
    lastMessage: string;
    lastMessageAt: string | null;
    buyerUnreadCount: number;
    sellerUnreadCount: number;
  }> {
    // Get last message
    const { data: lastMsg } = await supabase
      .from('messages')
      .select('content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get unread counts
    const { count: buyerUnread } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'seller')
      .eq('is_read', false);

    const { count: sellerUnread } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'buyer')
      .eq('is_read', false);

    return {
      lastMessage: lastMsg?.content || '',
      lastMessageAt: lastMsg?.created_at || null,
      buyerUnreadCount: buyerUnread || 0,
      sellerUnreadCount: sellerUnread || 0,
    };
  }

  /**
   * Get or create a conversation between a buyer and seller
   * Note: New schema doesn't have seller_id, but we track via order or messages
   */
  async getOrCreateConversation(buyerId: string, sellerId: string, orderId?: string): Promise<Conversation | null> {
    // First, try to find existing conversation via order if provided
    if (orderId) {
      const { data: existing, error: findError } = await supabase
        .from('conversations')
        .select('*')
        .eq('buyer_id', buyerId)
        .eq('order_id', orderId)
        .single();

      if (existing && !findError) {
        return this.enrichConversation(existing, sellerId);
      }
    }

    // Try to find by buyer_id and check if any messages involve this seller
    const { data: convList } = await supabase
      .from('conversations')
      .select('*')
      .eq('buyer_id', buyerId);

    for (const conv of convList || []) {
      // Check if this conversation has messages from/to this seller
      const { data: sellerMsg } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conv.id)
        .eq('sender_id', sellerId)
        .limit(1)
        .single();

      if (sellerMsg) {
        return this.enrichConversation(conv, sellerId);
      }
    }

    // Create new conversation
    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert({
        buyer_id: buyerId,
        order_id: orderId || null,
      })
      .select()
      .single();

    if (createError) {
      console.error('[ChatService] Error creating conversation:', createError);
      return null;
    }

    return this.enrichConversation(newConv, sellerId);
  }

  /**
   * Enrich conversation with buyer/seller info and computed fields
   */
  private async enrichConversation(conv: any, sellerId?: string): Promise<Conversation> {
    // Get buyer info using new schema (first_name, last_name)
    const { data: buyer } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', conv.buyer_id)
      .single();

    const { data: buyerData } = await supabase
      .from('buyers')
      .select('avatar_url')
      .eq('id', conv.buyer_id)
      .single();

    // Try to get seller from order if not provided
    let resolvedSellerId = sellerId;
    if (!resolvedSellerId && conv.order_id) {
      resolvedSellerId = await this.getSellerIdFromOrder(conv.order_id) || undefined;
    }

    let seller = null;
    if (resolvedSellerId) {
      const { data } = await supabase
        .from('sellers')
        .select('store_name, avatar_url')
        .eq('id', resolvedSellerId)
        .single();
      seller = data;
    }

    // Get conversation stats
    const stats = await this.getConversationStats(conv.id, conv.buyer_id, resolvedSellerId);

    const buyerFullName = buyer ? this.getBuyerFullName(buyer) : 'Unknown Buyer';

    return {
      ...conv,
      seller_id: resolvedSellerId,
      buyer_name: buyerFullName,
      buyer_email: buyer?.email,
      buyer_avatar: buyerData?.avatar_url,
      seller_store_name: seller?.store_name,
      seller_avatar: seller?.avatar_url,
      last_message: stats.lastMessage,
      last_message_at: stats.lastMessageAt || conv.updated_at,
      buyer_unread_count: stats.buyerUnreadCount,
      seller_unread_count: stats.sellerUnreadCount,
      buyer: {
        first_name: buyer?.first_name,
        last_name: buyer?.last_name,
        full_name: buyerFullName,
        email: buyer?.email,
        avatar_url: buyerData?.avatar_url,
      },
      seller: seller,
    };
  }

  /**
   * Get all conversations for a buyer
   * New schema: conversations only have buyer_id, so we get all and enrich
   */
  async getBuyerConversations(buyerId: string): Promise<Conversation[]> {
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('buyer_id', buyerId)
      .order('updated_at', { ascending: false });

    if (convError) {
      console.error('[ChatService] Error fetching buyer conversations:', convError);
      return [];
    }

    if (!conversations || conversations.length === 0) {
      return [];
    }

    // Enrich each conversation with stats and seller info
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        return this.enrichConversation(conv);
      })
    );

    // Sort by last_message_at
    return enrichedConversations.sort((a, b) => 
      new Date(b.last_message_at || b.updated_at).getTime() - 
      new Date(a.last_message_at || a.updated_at).getTime()
    );
  }

  /**
   * Get all conversations for a seller
   * New schema: no seller_id in conversations, so we find via messages
   */
  async getSellerConversations(sellerId: string): Promise<Conversation[]> {
    // Find all conversations where this seller has sent/received messages
    const { data: sellerMessages } = await supabase
      .from('messages')
      .select('conversation_id')
      .eq('sender_id', sellerId)
      .eq('sender_type', 'seller');

    const conversationIds = [...new Set(sellerMessages?.map(m => m.conversation_id) || [])];

    if (conversationIds.length === 0) {
      return [];
    }

    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .in('id', conversationIds)
      .order('updated_at', { ascending: false });

    if (convError) {
      console.error('[ChatService] Error fetching seller conversations:', convError);
      return [];
    }

    if (!conversations || conversations.length === 0) {
      return [];
    }

    // Enrich each conversation
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        return this.enrichConversation(conv, sellerId);
      })
    );

    // Sort by last_message_at
    return enrichedConversations.sort((a, b) => 
      new Date(b.last_message_at || b.updated_at).getTime() - 
      new Date(a.last_message_at || a.updated_at).getTime()
    );
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[ChatService] Error fetching messages:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Send a message
   * New schema: no unread counts in conversations table, just update updated_at
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    senderType: 'buyer' | 'seller',
    content: string,
    imageUrl?: string
  ): Promise<Message | null> {
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        sender_type: senderType,
        content,
        image_url: imageUrl,
        is_read: false,
      })
      .select()
      .single();

    if (msgError) {
      console.error('[ChatService] Error sending message:', msgError);
      return null;
    }

    // Update conversation's updated_at timestamp
    await supabase
      .from('conversations')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    // Get conversation details for notification
    const { data: conv } = await supabase
      .from('conversations')
      .select('buyer_id, order_id')
      .eq('id', conversationId)
      .single();

    // Send notification to the recipient
    try {
      if (senderType === 'buyer' && conv?.order_id) {
        // Buyer sent message → try to notify seller via order
        const sellerId = await this.getSellerIdFromOrder(conv.order_id);
        if (sellerId) {
          const { data: buyer } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', senderId)
            .single();

          const buyerName = buyer ? this.getBuyerFullName(buyer) : 'A customer';

          await notificationService.notifySellerNewMessage({
            sellerId,
            buyerName,
            conversationId,
            messagePreview: content,
          });
        }
      }
      // Note: For seller → buyer notifications, add similar logic if needed
    } catch (notifError) {
      console.error('[ChatService] Error sending notification:', notifError);
      // Don't fail the message send if notification fails
    }

    return message;
  }

  /**
   * Mark messages as read
   * New schema: no unread counts in conversations, just mark messages
   */
  async markAsRead(conversationId: string, userId: string, userType: 'buyer' | 'seller'): Promise<void> {
    // Mark all messages from the other party as read
    const otherType = userType === 'buyer' ? 'seller' : 'buyer';
    
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('sender_type', otherType)
      .eq('is_read', false);
  }

  /**
   * Mark conversation as read (alias for markAsRead)
   */
  async markConversationAsRead(conversationId: string, userType: 'buyer' | 'seller'): Promise<void> {
    return this.markAsRead(conversationId, '', userType);
  }

  /**
   * Subscribe to new messages in a conversation
   */
  subscribeToMessages(
    conversationId: string,
    onMessage: (message: Message) => void
  ): () => void {
    const channelName = `messages:${conversationId}`;
    
    // Unsubscribe from existing if any
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onMessage(payload.new as Message);
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to a single conversation (alias for subscribeToMessages that returns unsubscribe object)
   */
  subscribeToConversation(
    conversationId: string,
    onMessage: (message: Message) => void
  ): { unsubscribe: () => void } | null {
    const unsubscribeFn = this.subscribeToMessages(conversationId, onMessage);
    return { unsubscribe: unsubscribeFn };
  }

  /**
   * Subscribe to conversation updates
   * New schema: Only buyer_id is in conversations, sellers subscribe differently
   */
  subscribeToConversations(
    userId: string,
    userType: 'buyer' | 'seller',
    onUpdate: (conversation: Conversation) => void
  ): () => void {
    const channelName = `conversations:${userType}:${userId}`;
    
    // For buyers, filter by buyer_id
    // For sellers, we need to listen to messages table instead
    if (userType === 'buyer') {
      this.unsubscribe(channelName);

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            schema: 'public',
            table: 'conversations',
            filter: `buyer_id=eq.${userId}`,
          },
          async (payload) => {
            if (payload.new) {
              const enriched = await this.enrichConversation(payload.new as any);
              onUpdate(enriched);
            }
          }
        )
        .subscribe();

      this.subscriptions.set(channelName, channel);
      return () => this.unsubscribe(channelName);
    } else {
      // For sellers, subscribe to messages where they are sender
      this.unsubscribe(channelName);

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes' as any,
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          async (payload) => {
            const msg = payload.new as Message;
            // Get the conversation and check if relevant to this seller
            const { data: conv } = await supabase
              .from('conversations')
              .select('*')
              .eq('id', msg.conversation_id)
              .single();
            
            if (conv) {
              const enriched = await this.enrichConversation(conv, userId);
              if (enriched.seller_id === userId || msg.sender_id === userId) {
                onUpdate(enriched);
              }
            }
          }
        )
        .subscribe();

      this.subscriptions.set(channelName, channel);
      return () => this.unsubscribe(channelName);
    }
  }

  /**
   * Unsubscribe from a channel
   */
  private unsubscribe(channelName: string): void {
    const channel = this.subscriptions.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.subscriptions.delete(channelName);
    }
  }

  /**
   * Get total unread count for a user
   * New schema: Computed from messages table, not stored in conversations
   */
  async getUnreadCount(userId: string, userType: 'buyer' | 'seller'): Promise<number> {
    if (userType === 'buyer') {
      // Count unread messages from sellers in buyer's conversations
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .eq('buyer_id', userId);

      if (!convs || convs.length === 0) return 0;

      const convIds = convs.map(c => c.id);
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', convIds)
        .eq('sender_type', 'seller')
        .eq('is_read', false);

      return count || 0;
    } else {
      // For sellers, count unread messages from buyers in their conversations
      const { data: sellerMessages } = await supabase
        .from('messages')
        .select('conversation_id')
        .eq('sender_id', userId)
        .eq('sender_type', 'seller');

      const convIds = [...new Set(sellerMessages?.map(m => m.conversation_id) || [])];
      if (convIds.length === 0) return 0;

      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', convIds)
        .eq('sender_type', 'buyer')
        .eq('is_read', false);

      return count || 0;
    }
  }
}

export const chatService = new ChatService();
