/**
 * Chat Service - Handles messaging between buyers and sellers
 * Uses Supabase for storage and real-time subscriptions
 * * Updated for new normalized schema (February 2026):
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
  message_type?: 'user' | 'system';
  message_content?: string;
  order_event_type?: string;
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
  is_online?: boolean;
  isOnline?: boolean;
  // Local UI flag – not stored in DB, set optimistically after sends
  last_sender_type?: 'buyer' | 'seller';
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
   * Lightweight version: returns only { id } with minimal queries.
   * Use when you already have seller/buyer info and only need conversation ID.
   */
  async getOrCreateConversationLite(
    buyerId: string,
    sellerId: string,
    orderId?: string
  ): Promise<{ id: string } | null> {
    // Fast path: direct lookup by orderId (single indexed query)
    if (orderId) {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('buyer_id', buyerId)
        .eq('order_id', orderId)
        .maybeSingle();

      if (existing) return existing;
    }

    // Fallback: find conversation with this seller via messages
    const { data: convList } = await supabase
      .from('conversations')
      .select('id')
      .eq('buyer_id', buyerId);

    for (const conv of convList || []) {
      const { data: sellerMsg } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conv.id)
        .eq('sender_id', sellerId)
        .limit(1)
        .maybeSingle();

      if (sellerMsg) return conv;
    }

    // Create new conversation
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({ buyer_id: buyerId, order_id: orderId || null })
      .select('id')
      .single();

    if (error) {
      console.error('[ChatService] Error creating conversation:', error);
      return null;
    }

    return newConv;
  }

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
      .maybeSingle();

    // Note: If products don't have seller_id, this might need adjustment
    return (data?.product as any)?.seller_id || null;
  }

  /**
   * Helper: Get seller ID from messages in a conversation
   */
  private async getSellerIdFromMessages(conversationId: string): Promise<string | null> {
    // Find the seller from messages where sender_type is 'seller'
    const { data } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'seller')
      .limit(1)
      .maybeSingle();

    return data?.sender_id || null;
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
    // Get last message - use maybeSingle to handle conversations with no messages yet
    const { data: lastMsg } = await supabase
      .from('messages')
      .select('content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get unread counts
    const { count: buyerUnread } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'seller')
      .eq('is_read', false);

    const { count: sellerUnread } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'buyer')
      .eq('is_read', false);

    const displayContent = lastMsg?.content || '';

    return {
      lastMessage: displayContent || '',
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
        .maybeSingle();

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
        .maybeSingle();

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
  private async enrichConversation(conv: any, knownSellerId?: string, callerType: 'buyer' | 'seller' = 'buyer'): Promise<Conversation> {
    // Get buyer info using new schema (first_name, last_name)
    const { data: buyer } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', conv.buyer_id)
      .maybeSingle();

    const { data: buyerData } = await supabase
      .from('buyers')
      .select('avatar_url')
      .eq('id', conv.buyer_id)
      .maybeSingle();

    // Try to get seller from multiple sources:
    // 1. Provided knownSellerId
    // 2. From order (via order_items -> products -> seller_id)
    // 3. From messages where sender_type is 'seller'
    let resolvedSellerId = knownSellerId;
    if (!resolvedSellerId && conv.order_id) {
      resolvedSellerId = await this.getSellerIdFromOrder(conv.order_id) || undefined;
    }
    if (!resolvedSellerId) {
      resolvedSellerId = await this.getSellerIdFromMessages(conv.id) || undefined;
    }

    let seller = null;
    if (resolvedSellerId) {
      const { data } = await supabase
        .from('sellers')
        .select('store_name, avatar_url')
        .eq('id', resolvedSellerId)
        .maybeSingle();
      seller = data;
    }

    // Fetch Real-time Presence
    // Buyers check the seller's presence; Sellers check the buyer's presence.
    let isOnline = false;
    const targetUserId = callerType === 'seller' ? conv.buyer_id : resolvedSellerId;
    if (targetUserId) {
        const { data: presence } = await supabase
            .from('user_presence')
            .select('is_online')
            .eq('user_id', targetUserId)
            .maybeSingle();
        isOnline = presence?.is_online === true;
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
      is_online: isOnline,
      isOnline: isOnline,
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
   * Get all conversations for a buyer — optimised bulk loading.
   * Replaces N×8 individual queries with 5 parallel batched queries.
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
    if (!conversations || conversations.length === 0) return [];

    const convIds = conversations.map((c) => c.id);

    // --- 5 parallel bulk queries instead of N×8 sequential ones ---
    const [
      sellerMsgsResult,
      recentMsgsResult,
      unreadMsgsResult,
    ] = await Promise.all([
      // Q2: One seller-sender message per conversation (gives us seller IDs)
      supabase
        .from('messages')
        .select('conversation_id, sender_id')
        .in('conversation_id', convIds)
        .eq('sender_type', 'seller')
        .order('created_at', { ascending: false }),
      // Q3: Recent messages for "last message" preview
      supabase
        .from('messages')
        .select('conversation_id, content, created_at, sender_type')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false })
        .limit(200),
      // Q4: Unread seller messages per conversation (for badge counts)
      supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .eq('sender_type', 'seller')
        .eq('is_read', false),
    ]);

    // Build convId → sellerId map (first seller msg per conv)
    const sellerIdByConvId = new Map<string, string>();
    for (const msg of sellerMsgsResult.data || []) {
      if (!sellerIdByConvId.has(msg.conversation_id)) {
        sellerIdByConvId.set(msg.conversation_id, msg.sender_id);
      }
    }

    // Build convId → last message map
    const lastMsgByConvId = new Map<string, { content: string; created_at: string; sender_type: string }>();
    for (const msg of recentMsgsResult.data || []) {
      if (!lastMsgByConvId.has(msg.conversation_id)) {
        lastMsgByConvId.set(msg.conversation_id, msg);
      }
    }

    // Build convId → unread count map
    const unreadByConvId = new Map<string, number>();
    for (const msg of unreadMsgsResult.data || []) {
      unreadByConvId.set(msg.conversation_id, (unreadByConvId.get(msg.conversation_id) || 0) + 1);
    }

    const sellerIds = [...new Set(sellerIdByConvId.values())];

    // Q5 + Q6 in parallel: seller info & presence
    const [sellersResult, presenceResult] = await Promise.all([
      sellerIds.length > 0
        ? supabase.from('sellers').select('id, store_name, avatar_url').in('id', sellerIds)
        : Promise.resolve({ data: [] }),
      sellerIds.length > 0
        ? supabase.from('user_presence').select('user_id, is_online').in('user_id', sellerIds)
        : Promise.resolve({ data: [] }),
    ]);

    const sellerById = new Map<string, { store_name: string; avatar_url: string }>();
    for (const s of (sellersResult as any).data || []) sellerById.set(s.id, s);

    const presenceById = new Map<string, boolean>();
    for (const p of (presenceResult as any).data || []) presenceById.set(p.user_id, p.is_online === true);

    return conversations
      .map((conv) => {
        const sellerId = sellerIdByConvId.get(conv.id);
        const seller = sellerId ? sellerById.get(sellerId) : null;
        const lastMsg = lastMsgByConvId.get(conv.id);
        const isOnline = sellerId ? (presenceById.get(sellerId) ?? false) : false;
        return {
          ...conv,
          seller_id: sellerId,
          seller_store_name: seller?.store_name,
          seller_avatar: seller?.avatar_url,
          last_message: lastMsg?.content || '',
          last_message_at: lastMsg?.created_at || conv.updated_at,
          last_sender_type: lastMsg?.sender_type,
          buyer_unread_count: unreadByConvId.get(conv.id) || 0,
          seller_unread_count: 0,
          is_online: isOnline,
          isOnline: isOnline,
        } as Conversation;
      })
      .sort(
        (a, b) =>
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

    // Bulk fetch last messages and unread counts in parallel
    const [recentMsgsResult, sellerUnreadResult, buyerProfilesResult] = await Promise.all([
      supabase
        .from('messages')
        .select('conversation_id, content, created_at, sender_type')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })
        .limit(200),
      // Unread messages FROM buyers (seller hasn't read them yet)
      supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', conversationIds)
        .eq('sender_type', 'buyer')
        .eq('is_read', false),
      supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', conversations.map(c => c.buyer_id)),
    ]);

    const lastMsgByConvId = new Map<string, { content: string; created_at: string; sender_type: string }>();
    for (const msg of recentMsgsResult.data || []) {
      if (!lastMsgByConvId.has(msg.conversation_id)) lastMsgByConvId.set(msg.conversation_id, msg);
    }

    const sellerUnreadByConvId = new Map<string, number>();
    for (const msg of sellerUnreadResult.data || []) {
      sellerUnreadByConvId.set(msg.conversation_id, (sellerUnreadByConvId.get(msg.conversation_id) || 0) + 1);
    }

    const buyerProfileById = new Map<string, { first_name?: string; last_name?: string }>();
    for (const p of buyerProfilesResult.data || []) buyerProfileById.set(p.id, p);

    const enriched = conversations
      .map((conv) => {
        const lastMsg = lastMsgByConvId.get(conv.id);
        // Skip blank conversations (no messages at all)
        if (!lastMsg) return null;
        const profile = buyerProfileById.get(conv.buyer_id);
        const buyerName = profile
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Customer'
          : 'Unknown Customer';
        return {
          ...conv,
          seller_id: sellerId,
          buyer_name: buyerName,
          last_message: lastMsg.content || '',
          last_message_at: lastMsg.created_at || conv.updated_at,
          last_sender_type: lastMsg.sender_type,
          seller_unread_count: sellerUnreadByConvId.get(conv.id) || 0,
          buyer_unread_count: 0,
          is_online: false,
          isOnline: false,
        } as Conversation;
      })
      .filter((c): c is Conversation => c !== null);

    // Fetch buyer avatars + presence in parallel
    const buyerIds = [...new Set(enriched.map(c => c.buyer_id))];
    const [buyersResult, presenceResult] = await Promise.all([
      buyerIds.length > 0
        ? supabase.from('buyers').select('id, avatar_url').in('id', buyerIds)
        : Promise.resolve({ data: [] }),
      buyerIds.length > 0
        ? supabase.from('user_presence').select('user_id, is_online').in('user_id', buyerIds)
        : Promise.resolve({ data: [] }),
    ]);

    const avatarById = new Map<string, string>();
    for (const b of (buyersResult as any).data || []) avatarById.set(b.id, b.avatar_url);
    const presenceById = new Map<string, boolean>();
    for (const p of (presenceResult as any).data || []) presenceById.set(p.user_id, p.is_online === true);

    return enriched
      .map(c => ({
        ...c,
        buyer_avatar: avatarById.get(c.buyer_id),
        is_online: presenceById.get(c.buyer_id) ?? false,
        isOnline: presenceById.get(c.buyer_id) ?? false,
      }))
      .sort((a, b) =>
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

    return (data || []).map((msg: any) => ({
      ...msg,
      content: msg.content
    }));
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
      .maybeSingle();

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
            .maybeSingle();

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
          console.log("🔥 REALTIME PAYLOAD RECEIVED:", payload); // <-- ADD THIS
          const newMsg = payload.new as Message;
          onMessage(newMsg);
        }
      )
      .subscribe((status, err) => {
        // <-- ADD THIS ENTIRE BLOCK
        console.log(`📡 CHANNEL STATUS [${channelName}]:`, status);
        if (err) console.error("🚨 CHANNEL ERROR:", err);
      });

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

    this.unsubscribe(channelName);

    // For sellers: track known conversation IDs so we can scope the listener
    let sellerConvIds = new Set<string>();
    if (userType === 'seller') {
      // Pre-populate using getSellerConversations which already does multi-path discovery
      this.getSellerConversations(userId).then((convs) => {
        for (const c of convs) sellerConvIds.add(c.id);
      }).catch(() => {});
    }

    const handleConversationChange = async (conv: any) => {
      if (!conv) return;

      if (userType === 'buyer') {
        if (conv.buyer_id !== userId) return;
        const enriched = await this.enrichConversation(conv, undefined, 'buyer');
        onUpdate(enriched);
        return;
      }

      // Seller path: if we don't already know this conversation, let enrichConversation
      // determine ownership. This handles buyer-initiated conversations where the seller
      // hasn't replied yet — enrichConversation resolves seller_id via order or messages.
      if (!sellerConvIds.has(conv.id)) {
        // Let enrichConversation discover the seller via order/messages (don't pre-bias with userId)
        const enriched = await this.enrichConversation(conv, undefined, 'seller');
        // If enrichConversation found a different seller, discard
        if (enriched.seller_id && enriched.seller_id !== userId) return;
        // If it found us or couldn't find any seller (brand-new buyer-initiated conv), accept
        enriched.seller_id = userId;
        sellerConvIds.add(conv.id);
        onUpdate(enriched);
        return;
      }

      const enriched = await this.enrichConversation(conv, userId, 'seller');
      if (enriched.seller_id === userId) {
        onUpdate(enriched);
      }
    };

    const buyerFilter = userType === 'buyer' ? `buyer_id=eq.${userId}` : undefined;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          ...(buyerFilter ? { filter: buyerFilter } : {}),
        },
        async (payload) => {
          await handleConversationChange((payload.new || payload.old) as any);
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const msg = payload.new as Message;
          if (!msg?.conversation_id) return;

          // For buyers: quick check before DB round-trip
          if (userType === 'buyer') {
            // fetch conversation only if it might belong to us
          }
          // For sellers: skip if we know this conv isn't ours
          if (userType === 'seller' && sellerConvIds.size > 0 && !sellerConvIds.has(msg.conversation_id)) {
            return;
          }

          const { data: conv } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', msg.conversation_id)
            .maybeSingle();

          await handleConversationChange(conv);
        }
      )
      .subscribe((status, err) => {
        console.log(`📡 CONVERSATION STATUS [${channelName}]:`, status);
        if (err) console.error('🚨 CONVERSATION ERROR:', err);
      });

    this.subscriptions.set(channelName, channel);
    return () => this.unsubscribe(channelName);
  }

  /**
   * Lightweight global message listener scoped to a specific set of conversation IDs.
   * Emits only the fields needed to update sidebar badges/previews — no enrichConversation call.
   * Used by Header and SellerSidebar to avoid duplicate heavy channels.
   */
  subscribeToMessagesGlobal(
    conversationIds: string[],
    onNewMessage: (msg: Pick<Message, 'id' | 'conversation_id' | 'content' | 'created_at' | 'sender_type'>) => void
  ): () => void {
    if (conversationIds.length === 0) return () => {};
    const channelName = `global-messages:${conversationIds.slice(0, 3).join('-')}`;
    this.unsubscribe(channelName);

    const idSet = new Set(conversationIds);
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as Message;
          if (!msg?.conversation_id || !idSet.has(msg.conversation_id)) return;
          onNewMessage({
            id: msg.id,
            conversation_id: msg.conversation_id,
            content: msg.content,
            created_at: msg.created_at,
            sender_type: msg.sender_type,
          });
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);
    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to presence updates
   */
  subscribeToPresenceUpdates(onPresenceChange: (userId: string, isOnline: boolean) => void): () => void {
    const channelName = 'global-presence';
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'user_presence' },
        (payload) => {
          const newRecord = payload.new as any;
          if (newRecord && newRecord.user_id) {
             onPresenceChange(newRecord.user_id, newRecord.is_online === true);
          }
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);
    return () => this.unsubscribe(channelName);
  }

  /**
   * Update Global Presence
   */
  async updateUserPresence(userId: string, status: 'online' | 'offline', _userType?: string): Promise<void> {
    const now = new Date().toISOString();
    await supabase.from('user_presence').upsert({
      user_id: userId,
      is_online: status === 'online',
      last_seen: now,
      updated_at: now,
    }, { onConflict: 'user_id' });
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
        .select('id', { count: 'exact' })
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
        .select('id', { count: 'exact' })
        .in('conversation_id', convIds)
        .eq('sender_type', 'buyer')
        .eq('is_read', false);

      return count || 0;
    }
  }

  /**
   * Trigger an idempotent system message for order events
   * Call this when an order is placed, confirmed, shipped, or delivered.
   */
  async triggerOrderSystemMessage(
    orderId: string,
    conversationId: string,
    eventType: 'placed' | 'confirmed' | 'shipped' | 'delivered',
    content: string
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('process_idempotent_order_message', {
        p_order_id: orderId,
        p_conv_id: conversationId,
        p_event_type: eventType,
        p_content: content
      });

      if (error) {
        console.error('[ChatService] Error triggering system message:', error);
      }
    } catch (e) {
      console.error('[ChatService] RPC call failed:', e);
    }
  }
}

export const chatService = new ChatService();