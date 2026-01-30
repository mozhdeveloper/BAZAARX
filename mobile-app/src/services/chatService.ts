/**
 * Chat Service - Handles messaging between buyers and sellers
 * Uses Supabase for storage and real-time subscriptions
 */

import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

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
  seller_id: string;
  last_message: string;
  last_message_at: string;
  buyer_unread_count: number;
  seller_unread_count: number;
  created_at: string;
  updated_at: string;
  // Joined data
  buyer_name?: string;
  buyer_avatar?: string;
  seller_name?: string;
  seller_avatar?: string;
  seller_store_name?: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

class ChatService {
  private subscriptions: Map<string, RealtimeChannel> = new Map();

  /**
   * Create conversation table if it doesn't exist (run via Supabase dashboard)
   */
  async ensureTablesExist(): Promise<boolean> {
    // This checks if the tables exist by trying to query them
    const { error: convError } = await supabase
      .from('conversations')
      .select('id')
      .limit(1);
    
    const { error: msgError } = await supabase
      .from('messages')
      .select('id')
      .limit(1);

    return !convError && !msgError;
  }

  /**
   * Get or create a conversation between a buyer and seller
   */
  async getOrCreateConversation(buyerId: string, sellerId: string): Promise<Conversation | null> {
    console.log('[ChatService] getOrCreateConversation called with:', { buyerId, sellerId });
    
    // First, try to find existing conversation
    const { data: existing, error: findError } = await supabase
      .from('conversations')
      .select('*')
      .eq('buyer_id', buyerId)
      .eq('seller_id', sellerId)
      .single();

    console.log('[ChatService] Existing conversation check:', { existing, findError });

    if (existing && !findError) {
      console.log('[ChatService] Found existing conversation:', existing.id);
      // Get buyer and seller info separately
      const { data: buyer } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', buyerId)
        .single();

      const { data: seller } = await supabase
        .from('sellers')
        .select('store_name')
        .eq('id', sellerId)
        .single();

      console.log('[ChatService] Enriched conversation with buyer/seller info');
      return {
        ...existing,
        buyer_name: buyer?.full_name,
        buyer_avatar: buyer?.avatar_url,
        seller_store_name: seller?.store_name,
      };
    }

    // Create new conversation
    console.log('[ChatService] Creating new conversation...');
    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert({
        buyer_id: buyerId,
        seller_id: sellerId,
        last_message: '',
        last_message_at: new Date().toISOString(),
        buyer_unread_count: 0,
        seller_unread_count: 0,
      })
      .select()
      .single();

    if (createError) {
      console.error('[ChatService] Error creating conversation:', createError);
      return null;
    }

    console.log('[ChatService] Created new conversation:', newConv.id);
    return newConv;
  }

  /**
   * Get all conversations for a buyer
   */
  async getBuyerConversations(buyerId: string): Promise<Conversation[]> {
    // Get conversations
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('buyer_id', buyerId)
      .order('last_message_at', { ascending: false });

    if (convError) {
      console.error('[ChatService] Error fetching buyer conversations:', convError);
      return [];
    }

    if (!conversations || conversations.length === 0) {
      return [];
    }

    // Get seller info separately
    const sellerIds = [...new Set(conversations.map(c => c.seller_id))];
    const { data: sellers, error: sellerError } = await supabase
      .from('sellers')
      .select('id, store_name')
      .in('id', sellerIds);

    if (sellerError) {
      console.error('[ChatService] Error fetching sellers:', sellerError);
    }

    // Merge the data
    const sellerMap = new Map((sellers || []).map(s => [s.id, s]));

    return conversations.map((conv: any) => {
      const seller = sellerMap.get(conv.seller_id);
      return {
        ...conv,
        seller_store_name: seller?.store_name || 'Store',
        seller: seller,
      };
    });
  }

  /**
   * Get all conversations for a seller
   */
  async getSellerConversations(sellerId: string): Promise<Conversation[]> {
    // First get conversations
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('seller_id', sellerId)
      .order('last_message_at', { ascending: false });

    if (convError) {
      console.error('[ChatService] Error fetching seller conversations:', convError);
      return [];
    }

    if (!conversations || conversations.length === 0) {
      return [];
    }

    // Then get buyer profiles separately
    const buyerIds = [...new Set(conversations.map(c => c.buyer_id))];
    const { data: buyers, error: buyerError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .in('id', buyerIds);

    if (buyerError) {
      console.error('[ChatService] Error fetching buyer profiles:', buyerError);
    }

    // Merge the data
    const buyerMap = new Map((buyers || []).map(b => [b.id, b]));

    return conversations.map((conv: any) => {
      const buyer = buyerMap.get(conv.buyer_id);
      return {
        ...conv,
        buyer_name: buyer?.full_name || 'Unknown Buyer',
        buyer_email: buyer?.email,
        buyer_avatar: buyer?.avatar_url,
        buyer: buyer ? {
          full_name: buyer.full_name,
          email: buyer.email,
          avatar_url: buyer.avatar_url,
        } : undefined,
      };
    });
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string, limit = 50): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[ChatService] Error fetching messages:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Send a message
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    senderType: 'buyer' | 'seller',
    content: string,
    imageUrl?: string
  ): Promise<Message | null> {
    console.log('[ChatService] sendMessage called:', { conversationId, senderId, senderType, content: content.substring(0, 50) });
    
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        sender_type: senderType,
        content: content,
        image_url: imageUrl,
        is_read: false,
      })
      .select()
      .single();

    if (msgError) {
      console.error('[ChatService] Error sending message:', msgError);
      return null;
    }

    console.log('[ChatService] Message sent successfully:', message.id);

    // Update conversation with last message
    const unreadField = senderType === 'buyer' ? 'seller_unread_count' : 'buyer_unread_count';
    
    // First get current count
    const { data: conv } = await supabase
      .from('conversations')
      .select('buyer_unread_count, seller_unread_count')
      .eq('id', conversationId)
      .single();
    
    const currentCount = (conv as any)?.[unreadField] || 0;

    await supabase
      .from('conversations')
      .update({
        last_message: content.substring(0, 100),
        last_message_at: new Date().toISOString(),
        [unreadField]: currentCount + 1,
      })
      .eq('id', conversationId);

    return message;
  }

  /**
   * Mark messages as read
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

    // Reset unread count
    const unreadField = userType === 'buyer' ? 'buyer_unread_count' : 'seller_unread_count';
    
    await supabase
      .from('conversations')
      .update({ [unreadField]: 0 })
      .eq('id', conversationId);
  }

  /**
   * Subscribe to new messages in a conversation
   */
  subscribeToMessages(
    conversationId: string,
    onMessage: (message: Message) => void
  ): () => void {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          onMessage(payload.new as Message);
        }
      )
      .subscribe();

    this.subscriptions.set(conversationId, channel);

    return () => {
      channel.unsubscribe();
      this.subscriptions.delete(conversationId);
    };
  }

  /**
   * Subscribe to conversation updates (for unread counts)
   */
  subscribeToConversations(
    userId: string,
    userType: 'buyer' | 'seller',
    onUpdate: (conversation: Conversation) => void
  ): () => void {
    const filterField = userType === 'buyer' ? 'buyer_id' : 'seller_id';
    
    const channel = supabase
      .channel(`conversations:${userId}`)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `${filterField}=eq.${userId}`,
        },
        (payload: any) => {
          onUpdate(payload.new as Conversation);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }

  /**
   * Get total unread count for a user
   */
  async getUnreadCount(userId: string, userType: 'buyer' | 'seller'): Promise<number> {
    const filterField = userType === 'buyer' ? 'buyer_id' : 'seller_id';
    const countField = userType === 'buyer' ? 'buyer_unread_count' : 'seller_unread_count';

    const { data, error } = await supabase
      .from('conversations')
      .select(countField)
      .eq(filterField, userId);

    if (error || !data) return 0;

    return data.reduce((total: number, conv: any) => total + (conv[countField] || 0), 0);
  }

  /**
   * Delete a conversation (soft delete - just removes from view)
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    return !error;
  }
}

export const chatService = new ChatService();
