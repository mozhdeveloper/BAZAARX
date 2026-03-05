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
  is_system_message?: boolean;
  metadata?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  buyer_id: string;
  order_id?: string | null;
  created_at: string;
  updated_at: string;
  seller_id?: string;
  last_message?: string;
  last_message_at?: string;
  buyer_unread_count?: number;
  seller_unread_count?: number;
  seller_online?: boolean;
  seller_last_active_at?: string | null;
  buyer_name?: string;
  buyer_email?: string;
  buyer_avatar?: string;
  seller_name?: string;
  seller_avatar?: string;
  seller_store_name?: string;
  buyer?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
  seller?: {
    store_name?: string;
  };
}

class ChatService {
  private subscriptions: Map<string, RealtimeChannel> = new Map();

  private async getSellerIdFromOrder(orderId: string): Promise<string | null> {
    try {
      const { data: orderItem, error: itemError } = await supabase
        .from('order_items')
        .select('product_id')
        .eq('order_id', orderId)
        .limit(1)
        .single();

      if (itemError || !orderItem?.product_id) {
        const { data: joinData } = await supabase
          .from('order_items')
          .select(`
            product:products (
              seller_id
            )
          `)
          .eq('order_id', orderId)
          .limit(1)
          .single();
          
        return (joinData?.product as any)?.seller_id || null;
      }

      const { data: product, error: prodError } = await supabase
        .from('products')
        .select('seller_id')
        .eq('id', orderItem.product_id)
        .single();

      if (prodError || !product) return null;
      return product.seller_id;
    } catch (e) {
      console.warn('[ChatService] Error resolving seller from order:', e);
      return null;
    }
  }

  private getBuyerFullName(profile: { first_name?: string; last_name?: string }): string {
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown Buyer';
  }

  private async getConversationStats(conversationId: string, buyerId: string, sellerId?: string): Promise<{
    lastMessage: string;
    lastMessageAt: string | null;
    buyerUnreadCount: number;
    sellerUnreadCount: number;
  }> {
    const { data: lastMsg } = await supabase
      .from('messages')
      .select('content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

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

  async getOrCreateConversation(buyerId: string, sellerId: string, orderId?: string): Promise<Conversation | null> {
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

    const { data: convList } = await supabase
      .from('conversations')
      .select('*')
      .eq('buyer_id', buyerId);

    for (const conv of convList || []) {
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

  private async enrichConversation(conv: any, sellerId?: string): Promise<Conversation> {
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

    let resolvedSellerId = sellerId || conv.seller_id;
    
    if (!resolvedSellerId && conv.order_id) {
      resolvedSellerId = await this.getSellerIdFromOrder(conv.order_id) || undefined;
    }

    if (!resolvedSellerId) {
      const { data: msg } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('conversation_id', conv.id)
        .eq('sender_type', 'seller')
        .limit(1)
        .single();
      
      if (msg) {
        resolvedSellerId = msg.sender_id;
      }
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

    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        return this.enrichConversation(conv);
      })
    );

    return enrichedConversations.sort((a, b) => 
      new Date(b.last_message_at || b.updated_at).getTime() - 
      new Date(a.last_message_at || a.updated_at).getTime()
    );
  }

  async getSellerConversations(sellerId: string): Promise<Conversation[]> {
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

    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        return this.enrichConversation(conv, sellerId);
      })
    );

    return enrichedConversations.sort((a, b) => 
      new Date(b.last_message_at || b.updated_at).getTime() - 
      new Date(a.last_message_at || a.updated_at).getTime()
    );
  }

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

    await supabase
      .from('conversations')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    const { data: conv } = await supabase
      .from('conversations')
      .select('buyer_id, order_id')
      .eq('id', conversationId)
      .single();

    try {
      if (senderType === 'buyer' && conv?.order_id) {
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
      } else if (senderType === 'seller' && conv?.buyer_id) {
        const { data: seller } = await supabase
          .from('sellers')
          .select('store_name')
          .eq('id', senderId)
          .single();

        const sellerName = seller?.store_name || 'A seller';

        await notificationService.notifyBuyerNewMessage({
          buyerId: conv.buyer_id,
          sellerName,
          conversationId,
          messagePreview: content,
        });
      }
    } catch (notifError) {
      console.error('[ChatService] Error sending notification:', notifError);
    }

    return message;
  }

  async markAsRead(conversationId: string, userId: string, userType: 'buyer' | 'seller'): Promise<void> {
    const otherType = userType === 'buyer' ? 'seller' : 'buyer';
    
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('sender_type', otherType)
      .eq('is_read', false);
  }

  async markConversationAsRead(conversationId: string, userType: 'buyer' | 'seller'): Promise<void> {
    return this.markAsRead(conversationId, '', userType);
  }

  subscribeToMessages(
    conversationId: string,
    onMessage: (message: Message) => void
  ): () => void {
    const channelName = `messages:${conversationId}`;
    
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

  subscribeToConversation(
    conversationId: string,
    onMessage: (message: Message) => void
  ): { unsubscribe: () => void } | null {
    const unsubscribeFn = this.subscribeToMessages(conversationId, onMessage);
    return { unsubscribe: unsubscribeFn };
  }

  subscribeToConversations(
    userId: string,
    userType: 'buyer' | 'seller',
    onUpdate: (conversation: Conversation) => void
  ): () => void {
    const channelName = `conversations:${userType}:${userId}`;
    
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

  private unsubscribe(channelName: string): void {
    const channel = this.subscriptions.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.subscriptions.delete(channelName);
    }
  }

  async getUnreadCount(userId: string, userType: 'buyer' | 'seller'): Promise<number> {
    if (userType === 'buyer') {
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

  subscribeToSellerPresence(
    conversationId: string,
    onUpdate: (sellerOnline: boolean, lastActiveAt: string | null) => void
  ): () => void {
    const channelName = `seller_presence:${conversationId}`;

    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `user_type=eq.seller`,
        },
        async (payload) => {
          try {
            const presenceData = await supabase.rpc('get_seller_presence', {
              conv_id: conversationId,
            });

            if (!presenceData.error && presenceData.data && presenceData.data.length > 0) {
              const presence = presenceData.data[0];
              onUpdate(presence.is_online || false, presence.last_active_at);
            }
          } catch (e) {
            console.error('[ChatService] Error in seller presence subscription:', e);
          }
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  async enrichConversationWithPresence(
    conversation: Conversation
  ): Promise<Conversation> {
    try {
      const presenceData = await supabase.rpc('get_seller_presence', {
        conv_id: conversation.id,
      });

      if (!presenceData.error && presenceData.data && presenceData.data.length > 0) {
        const presence = presenceData.data[0];
        return {
          ...conversation,
          seller_online: presence.is_online || false,
          seller_last_active_at: presence.last_active_at,
        };
      }

      return conversation;
    } catch (e) {
      console.error('[ChatService] Error enriching conversation with presence:', e);
      return conversation;
    }
  }

  async sendSystemMessage(
    conversationId: string,
    sellerId: string,
    message: string,
    eventType: string,
    metadata?: Record<string, unknown>
  ): Promise<Message | null> {
    const { data: existingMsg } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('is_system_message', true)
      .contains('metadata', { event_type: eventType })
      .limit(1)
      .single();

    if (existingMsg) {
      return existingMsg as Message;
    }

    const { data: msg, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: sellerId,
        sender_type: 'seller',
        content: message,
        is_system_message: true,
        metadata: {
          event_type: eventType,
          ...metadata,
        },
        is_read: false,
      })
      .select()
      .single();

    if (msgError) {
      console.error('[ChatService] Error sending system message:', msgError);
      return null;
    }

    await supabase
      .from('conversations')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    return msg;
  }
}

export const chatService = new ChatService();