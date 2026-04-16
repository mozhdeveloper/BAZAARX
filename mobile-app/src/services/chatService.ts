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
import { decode } from 'base64-arraybuffer';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'buyer' | 'seller';
  content: string;
  image_url?: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'document';
  is_read: boolean;
  created_at: string;
  message_type?: 'user' | 'system' | 'text' | 'image' | 'video' | 'document';
  message_content?: string;
  order_event_type?: string;
  // Reply-to support
  reply_to_message_id?: string | null;
  reply_to_content?: string;          // Joined — not in DB
  reply_to_sender_type?: 'buyer' | 'seller'; // Joined — not in DB
  // UI-only fields (not persisted)
  _status?: 'sending' | 'failed';
  _pendingUpload?: any;
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
  last_sender_type?: 'buyer' | 'seller' | null;
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

export interface SendMessageOptions {
  targetSellerId?: string;
}

class ChatService {
  private subscriptions: Map<string, RealtimeChannel> = new Map();

  /**
   * Helper: Get seller ID from order
   */
  private async getSellerIdFromOrder(orderId: string): Promise<string | null> {
    try {
      // Step 1: Get product ID from order items
      const { data: orderItem, error: itemError } = await supabase
        .from('order_items')
        .select('product_id')
        .eq('order_id', orderId)
        .limit(1)
        .single();

      if (itemError || !orderItem?.product_id) {
        // Fallback: Try with join if 2-step fails, or maybe order_items is empty
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

      // Step 2: Get seller ID from product
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

  /**
   * Helper: Get buyer's full name from profile
   */
  private getBuyerFullName(profile: { first_name?: string; last_name?: string; email?: string }): string {
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    const full = `${firstName} ${lastName}`.trim();
    if (full) return full;
    // Fallback to email prefix if name is empty
    if (profile.email) return profile.email.split('@')[0];
    return 'Unknown Buyer';
  }

  /**
   * Helper: Get last message and unread counts for a conversation
   */
  private async getConversationStats(conversationId: string, buyerId: string, sellerId?: string): Promise<{
    lastMessage: string;
    lastMessageAt: string | null;
    buyerUnreadCount: number;
    sellerUnreadCount: number;
    lastSenderType: 'buyer' | 'seller' | null;
  }> {
    // Step 11: Run all 3 stats queries in parallel
    const [lastMsgResult, buyerUnreadResult, sellerUnreadResult] = await Promise.all([
      supabase
        .from('messages')
        .select('content, message_content, message_type, sender_type, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'seller')
        .eq('is_read', false),
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'buyer')
        .eq('is_read', false),
    ]);

    const lastMsg = lastMsgResult.data;
    const buyerUnread = buyerUnreadResult.count;
    const sellerUnread = sellerUnreadResult.count;

    const mediaPreviewMap: Record<string, string> = {
      image: '📷 Photo',
      video: '🎬 Video',
      document: '📄 Document',
    };
    const displayContent = !lastMsg ? '' :
      (lastMsg as any).message_type === 'system' ? ((lastMsg as any).message_content || '') :
        mediaPreviewMap[(lastMsg as any).media_type || (lastMsg as any).message_type || ''] ||
        (['[Image]', '[Video]', '[Document]'].includes((lastMsg as any).content || '') ? mediaPreviewMap[(lastMsg as any).message_type || ''] || (lastMsg as any).content : null) ||
        (lastMsg as any).content || (lastMsg as any).message_content || '';

    return {
      lastMessage: displayContent || '',
      lastMessageAt: lastMsg?.created_at || null,
      buyerUnreadCount: buyerUnread || 0,
      sellerUnreadCount: sellerUnread || 0,
      lastSenderType: (lastMsg?.sender_type as 'buyer' | 'seller' | null) ?? null,
    };
  }

  /**
   * Store lightweight metadata on buyer messages so direct (non-order) chats
   * can be re-resolved even before the seller replies.
   */
  private buildBuyerMessageMetadata(targetSellerId?: string): string | null {
    if (!targetSellerId) return null;
    return JSON.stringify({
      schema: 'buyer_chat_metadata_v1',
      targetSellerId,
    });
  }

  /**
   * Parse seller hint metadata from buyer-authored message_content JSON.
   */
  private parseBuyerMessageMetadata(messageContent?: string | null): { targetSellerId: string } | null {
    if (!messageContent || messageContent[0] !== '{') return null;
    try {
      const parsed = JSON.parse(messageContent);
      const targetSellerId = typeof parsed?.targetSellerId === 'string'
        ? parsed.targetSellerId
        : (typeof parsed?.target_seller_id === 'string' ? parsed.target_seller_id : null);
      if (!targetSellerId) return null;
      return { targetSellerId };
    } catch {
      return null;
    }
  }

  /**
   * Resolve seller ID from buyer message metadata within a conversation.
   */
  private async getSellerIdFromBuyerMessageMetadata(conversationId: string): Promise<string | null> {
    const { data: buyerMsgs } = await supabase
      .from('messages')
      .select('message_content, created_at')
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'buyer')
      .not('message_content', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    for (const msg of buyerMsgs || []) {
      const meta = this.parseBuyerMessageMetadata((msg as any).message_content);
      if (meta?.targetSellerId) return meta.targetSellerId;
    }

    return null;
  }

  /**
   * Get or create a conversation between a buyer and seller.
   * Robust lookup to prevent duplicate conversations for the same buyer-seller pair.
   * Since the conversations table has NO seller_id column, we resolve via:
   *   1) order_id match, 2) seller messages, 3) order→product→seller resolution.
   */
  async getOrCreateConversation(buyerId: string, sellerId: string, orderId?: string): Promise<Conversation | null> {
    // 1. If orderId provided, look for order-specific conversation first
    if (orderId) {
      const { data: existing, error: findError } = await supabase
        .from('conversations')
        .select('id, buyer_id, order_id, created_at, updated_at')
        .eq('buyer_id', buyerId)
        .eq('order_id', orderId)
        .single();

      if (existing && !findError) {
        return this.enrichConversation(existing, sellerId);
      }
    }

    // 2. Batch: find ANY message from this seller across all buyer conversations
    const { data: convList } = await supabase
      .from('conversations')
      .select('id, buyer_id, order_id, created_at, updated_at')
      .eq('buyer_id', buyerId);

    if (convList && convList.length > 0) {
      const convIds = convList.map(c => c.id);

      // Single query: check if seller has sent any messages in any of these conversations
      const { data: sellerMsgs } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .eq('sender_id', sellerId)
        .limit(1)
        .maybeSingle();

      if (sellerMsgs) {
        const matchedConv = convList.find(c => c.id === sellerMsgs.conversation_id);
        if (matchedConv) return this.enrichConversation(matchedConv, sellerId);
      }

      // Fallback: resolve by buyer message metadata (direct non-order chat hint)
      const { data: buyerHintMessages } = await supabase
        .from('messages')
        .select('conversation_id, message_content, created_at')
        .in('conversation_id', convIds)
        .eq('sender_type', 'buyer')
        .not('message_content', 'is', null)
        .ilike('message_content', `%${sellerId}%`)
        .order('created_at', { ascending: false })
        .limit(200);

      if (buyerHintMessages && buyerHintMessages.length > 0) {
        for (const msg of buyerHintMessages) {
          const meta = this.parseBuyerMessageMetadata((msg as any).message_content);
          if (meta?.targetSellerId !== sellerId) continue;
          const matchedConv = convList.find(c => c.id === msg.conversation_id);
          if (matchedConv) return this.enrichConversation(matchedConv, sellerId);
        }
      }

      // Fallback: check order → seller resolution in parallel
      const orderConvs = convList.filter(c => c.order_id);
      if (orderConvs.length > 0) {
        const orderResults = await Promise.all(
          orderConvs.map(async (conv) => {
            const resolvedSellerId = await this.getSellerIdFromOrder(conv.order_id!);
            return { conv, match: resolvedSellerId === sellerId };
          })
        );
        const matched = orderResults.find(r => r.match);
        if (matched) return this.enrichConversation(matched.conv, sellerId);
      }
    }

    // 3. No existing conversation found — create new
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
    // Step 1: Resolve seller ID (must be sequential — depends on order/messages fallback)
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
        .maybeSingle();
      if (msg?.sender_id) resolvedSellerId = msg.sender_id;
    }

    if (!resolvedSellerId) {
      resolvedSellerId = await this.getSellerIdFromBuyerMessageMetadata(conv.id) || undefined;
    }

    // Step 11: Batch all remaining independent queries in parallel
    const sellerQuery = resolvedSellerId
      ? supabase.from('sellers').select('store_name, avatar_url').eq('id', resolvedSellerId).single()
      : Promise.resolve({ data: null, error: null });

    const presenceUserId = conv.buyer_id;
    const [
      { data: buyer },
      { data: buyerData },
      { data: sellerData },
      { data: presence },
      stats,
    ] = await Promise.all([
      supabase.from('profiles').select('first_name, last_name, email').eq('id', conv.buyer_id).single(),
      supabase.from('buyers').select('avatar_url').eq('id', conv.buyer_id).single(),
      sellerQuery,
      supabase.from('user_presence').select('is_online').eq('user_id', presenceUserId).maybeSingle(),
      this.getConversationStats(conv.id, conv.buyer_id, resolvedSellerId),
    ]);

    const seller = sellerData;
    let sellerStoreName = 'Unknown Store';
    if (seller?.store_name) {
      sellerStoreName = seller.store_name;
    } else if (resolvedSellerId) {
      // Fallback: profile name (only if no store_name)
      const { data: sellerProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', resolvedSellerId)
        .maybeSingle();
      if (sellerProfile) {
        const name = `${sellerProfile.first_name || ''} ${sellerProfile.last_name || ''}`.trim();
        if (name) sellerStoreName = name;
      }
    }

    const isOnline = !!presence?.is_online;
    const buyerFullName = buyer ? this.getBuyerFullName(buyer as any) : 'Unknown Buyer';

    return {
      ...conv,
      seller_id: resolvedSellerId,
      buyer_name: buyerFullName,
      buyer_email: buyer?.email,
      buyer_avatar: buyerData?.avatar_url,
      seller_store_name: sellerStoreName,
      seller_avatar: seller?.avatar_url,
      last_message: stats.lastMessage,
      last_message_at: stats.lastMessageAt || conv.updated_at,
      buyer_unread_count: stats.buyerUnreadCount,
      seller_unread_count: stats.sellerUnreadCount,
      last_sender_type: stats.lastSenderType,
      is_online: isOnline,
      isOnline: isOnline,
      buyer: {
        first_name: buyer?.first_name ?? undefined,
        last_name: buyer?.last_name ?? undefined,
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
      .select('id, buyer_id, order_id, created_at, updated_at')
      .eq('buyer_id', buyerId)
      .order('updated_at', { ascending: false })
      .limit(50);

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

    // Step 8: Deduplicate by seller_id — keep most recent per seller, skip unresolvable
    const sellerMap = new Map<string, Conversation>();
    for (const conv of enrichedConversations) {
      if (!conv.seller_id) continue; // Step 8: skip conversations with no resolved seller
      if (!conv.last_message) continue; // skip empty conversations
      const sid = conv.seller_id;
      const existing = sellerMap.get(sid);
      if (!existing || new Date(conv.last_message_at || conv.updated_at).getTime() > new Date(existing.last_message_at || existing.updated_at).getTime()) {
        sellerMap.set(sid, conv);
      }
    }

    return Array.from(sellerMap.values())
      .sort((a, b) =>
        new Date(b.last_message_at || b.updated_at).getTime() -
        new Date(a.last_message_at || a.updated_at).getTime()
      );
  }

  /**
   * Get all conversations for a seller
   * New schema: no seller_id in conversations, so we find via messages
   */
  async getSellerConversations(sellerId: string): Promise<Conversation[]> {
    // Find all conversations where this seller has messages or buyer metadata hints.
    const { data: sellerMessages } = await supabase
      .from('messages')
      .select('conversation_id')
      .eq('sender_id', sellerId)
      .eq('sender_type', 'seller');

    // For first-time buyer-initiated direct chats, seller may not have replied yet.
    // Use buyer metadata hints to discover those conversations.
    const { data: buyerHintMessages } = await supabase
      .from('messages')
      .select('conversation_id, message_content, created_at')
      .eq('sender_type', 'buyer')
      .not('message_content', 'is', null)
      .ilike('message_content', `%${sellerId}%`)
      .order('created_at', { ascending: false })
      .limit(500);

    const hintedConversationIds = new Set<string>();
    for (const msg of buyerHintMessages || []) {
      const meta = this.parseBuyerMessageMetadata((msg as any).message_content);
      if (meta?.targetSellerId === sellerId) {
        hintedConversationIds.add(msg.conversation_id);
      }
    }

    const conversationIds = [...new Set([
      ...(sellerMessages?.map(m => m.conversation_id) || []),
      ...Array.from(hintedConversationIds),
    ])];

    if (conversationIds.length === 0) {
      return [];
    }

    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, buyer_id, order_id, created_at, updated_at')
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

    // Deduplicate by buyer_id — keep conversation with most recent message per buyer
    const buyerMap = new Map<string, Conversation>();
    for (const conv of enrichedConversations) {
      const bid = conv.buyer_id;
      const existing = buyerMap.get(bid);
      if (!existing || new Date(conv.last_message_at || conv.updated_at).getTime() > new Date(existing.last_message_at || existing.updated_at).getTime()) {
        buyerMap.set(bid, conv);
      }
    }

    return Array.from(buyerMap.values())
      .sort((a, b) =>
        new Date(b.last_message_at || b.updated_at).getTime() -
        new Date(a.last_message_at || a.updated_at).getTime()
      );
  }

  /**
   * Fetch and enrich a single buyer conversation for fast realtime insertion.
   * Returns null if the conversation does not belong to the buyer or has no
   * resolvable seller/last message yet.
   */
  async getBuyerConversationById(conversationId: string, buyerId: string): Promise<Conversation | null> {
    const { data: conv, error } = await supabase
      .from('conversations')
      .select('id, buyer_id, order_id, created_at, updated_at')
      .eq('id', conversationId)
      .eq('buyer_id', buyerId)
      .maybeSingle();

    if (error || !conv) return null;

    const enriched = await this.enrichConversation(conv);
    if (!enriched.seller_id || !enriched.last_message) return null;
    return enriched;
  }

  /**
   * Fetch and enrich a single seller conversation for fast realtime insertion.
   * Returns null if the seller is not a participant or no last message exists yet.
   */
  async getSellerConversationById(conversationId: string, sellerId: string): Promise<Conversation | null> {
    const { data: conv, error } = await supabase
      .from('conversations')
      .select('id, buyer_id, order_id, created_at, updated_at')
      .eq('id', conversationId)
      .maybeSingle();

    if (error || !conv) return null;

    const enriched = await this.enrichConversation(conv, sellerId);
    if (enriched.seller_id !== sellerId || !enriched.last_message) return null;
    return enriched;
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, sender_type, content, message_content, created_at, is_read, message_type, image_url, media_url, media_type, reply_to_message_id')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('[ChatService] Error fetching messages:', error);
      return [];
    }

    const messages: Message[] = (data || []).map((msg: any) => ({
      ...msg,
      // Normalize legacy image_url into media_url for old rows
      media_url: msg.media_url || msg.image_url || undefined,
      media_type: msg.media_type || (msg.image_url && !msg.media_url ? 'image' : undefined),
      content: msg.message_type === 'system' ? msg.message_content : msg.content,
    }));

    // Resolve reply-to references from the local array
    const msgMap = new Map(messages.map(m => [m.id, m]));
    for (const msg of messages) {
      if (msg.reply_to_message_id) {
        const original = msgMap.get(msg.reply_to_message_id);
        if (original) {
          msg.reply_to_content = original.content;
          msg.reply_to_sender_type = original.sender_type;
        }
      }
    }

    return messages;
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
    imageUrl?: string,
    mediaUrl?: string,
    mediaType?: 'image' | 'video' | 'document',
    replyToMessageId?: string,
    options?: SendMessageOptions
  ): Promise<Message | null> {
    const buyerMessageMetadata = senderType === 'buyer'
      ? this.buildBuyerMessageMetadata(options?.targetSellerId)
      : null;

    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        sender_type: senderType,
        content,
        image_url: imageUrl || null,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        message_type: mediaType || 'text',
        message_content: buyerMessageMetadata,
        is_read: false,
        reply_to_message_id: replyToMessageId || null,
      } as any)
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
      if (senderType === 'buyer') {
        // Buyer sent message → notify seller via order or explicit metadata hint.
        const resolvedTargetSellerId = conv?.order_id
          ? await this.getSellerIdFromOrder(conv.order_id)
          : (options?.targetSellerId || await this.getSellerIdFromBuyerMessageMetadata(conversationId));

        if (resolvedTargetSellerId) {
          const { data: buyer } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', senderId)
            .single();

          const buyerName = buyer ? this.getBuyerFullName(buyer as any) : 'A customer';

          await notificationService.notifySellerNewMessage({
            sellerId: resolvedTargetSellerId,
            buyerName,
            conversationId,
            messagePreview: content,
          });
        }
      } else if (senderType === 'seller' && conv?.buyer_id) {
        // Seller sent message → notify buyer
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
      // Don't fail the message send if notification fails
    }

    return message as unknown as Message;
  }

  /**
   * Upload a chat media file to Supabase Storage.
   * Accepts a base64 string (from expo-file-system ReadAsStringAsync).
   * Returns the public URL, or null on failure.
   */
  async uploadChatMedia(
    base64Data: string,
    conversationId: string,
    fileName: string,
    mimeType: string
  ): Promise<string | null> {
    try {
      const ext = fileName.split('.').pop()?.toLowerCase() || 'bin';
      // Preserve original filename with a timestamp prefix (matches web behaviour)
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${conversationId}/${Date.now()}_${safeName}`;

      const { error } = await supabase.storage
        .from('chat_media')
        .upload(path, decode(base64Data), { contentType: mimeType, upsert: false });

      if (error) {
        console.error('[ChatService] Media upload error:', error);
        return null;
      }

      const { data } = supabase.storage.from('chat_media').getPublicUrl(path);
      return data?.publicUrl ?? null;
    } catch (e) {
      console.error('[ChatService] uploadChatMedia exception:', e);
      return null;
    }
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
          const newMsg = payload.new as Message;
          if (newMsg.message_type === 'system') {
            newMsg.content = newMsg.message_content || '';
          }
          onMessage(newMsg);
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
   * Lightweight subscription to ALL new messages (no filter, no async enrichment).
   * Used by chatlist screens to update last_message / unread counts instantly from
   * the raw Supabase payload — avoids the 6–8 async DB calls in enrichConversation.
   * Caller is responsible for checking if message.conversation_id is relevant.
   */
  subscribeToAllNewMessages(
    onMessage: (message: Message) => void
  ): () => void {
    const channelName = 'all-new-messages-chatlist';
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
        (payload) => {
          const msg = payload.new as Message;
          if (!msg) return;
          // Normalise system messages so content is always populated
          if (msg.message_type === 'system') {
            msg.content = msg.message_content || '';
          }
          onMessage(msg);
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);
    return () => this.unsubscribe(channelName);
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

    const handleConversationChange = async (conv: any) => {
      if (!conv) return;

      if (userType === 'buyer') {
        if (conv.buyer_id !== userId) return;
        const enriched = await this.enrichConversation(conv);
        onUpdate(enriched);
        return;
      }

      const enriched = await this.enrichConversation(conv, userId);
      if (enriched.seller_id === userId) {
        onUpdate(enriched);
      }
    };

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
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

          const { data: conv } = await supabase
            .from('conversations')
            .select('id, buyer_id, order_id, created_at, updated_at')
            .eq('id', msg.conversation_id)
            .maybeSingle();

          await handleConversationChange(conv);
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
  async updateUserPresence(userId: string, status: 'online' | 'offline', platform: 'mobile' | 'web' | 'both'): Promise<void> {
    await supabase.from('user_presence').upsert({
      user_id: userId,
      is_online: status === 'online',
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString()
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