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
import {
  resolveSellerMessagingAccountStatus,
  type MessagingAccountStatus,
} from '../utils/messagingAccountStatus';

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
  seller_approval_status?: string | null;
  seller_blacklisted_at?: string | null;
  seller_temp_blacklist_until?: string | null;
  seller_cool_down_until?: string | null;
  seller_is_permanently_blacklisted?: boolean | null;
  seller_suspended_at?: string | null;
  seller_messaging_status?: MessagingAccountStatus;
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
  private targetSellerIdColumnAvailable: boolean | null = null;

  /**
   * Fetch seller profile + messaging restriction fields.
   * Falls back when `suspended_at` is unavailable in older schemas.
   */
  private async getSellerMessagingFieldsById(sellerId: string): Promise<any | null> {
    if (!sellerId) return null;

    const withSuspended = await supabase
      .from('sellers')
      .select('store_name, avatar_url, approval_status, blacklisted_at, temp_blacklist_until, cool_down_until, is_permanently_blacklisted, suspended_at')
      .eq('id', sellerId)
      .maybeSingle();

    if (!withSuspended.error) {
      return withSuspended.data;
    }

    const withoutSuspended = await supabase
      .from('sellers')
      .select('store_name, avatar_url, approval_status, blacklisted_at, temp_blacklist_until, cool_down_until, is_permanently_blacklisted')
      .eq('id', sellerId)
      .maybeSingle();

    if (withoutSuspended.error) {
      console.error('[ChatService] Error fetching seller messaging fields:', withSuspended.error, withoutSuspended.error);
      return null;
    }

    return withoutSuspended.data;
  }

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
   * Batch version of getConversationStats to avoid N+1 query fan-out on chatlists.
   */
  private async getConversationStatsBatch(conversationIds: string[]): Promise<Map<string, {
    lastMessage: string;
    lastMessageAt: string | null;
    buyerUnreadCount: number;
    sellerUnreadCount: number;
    lastSenderType: 'buyer' | 'seller' | null;
  }>> {
    const statsByConversation = new Map<string, {
      lastMessage: string;
      lastMessageAt: string | null;
      buyerUnreadCount: number;
      sellerUnreadCount: number;
      lastSenderType: 'buyer' | 'seller' | null;
    }>();

    const ids = Array.from(new Set(conversationIds.filter(Boolean)));
    if (ids.length === 0) return statsByConversation;

    const [latestRowsResult, buyerUnreadResult, sellerUnreadResult] = await Promise.all([
      supabase
        .from('messages')
        .select('conversation_id, content, message_content, message_type, sender_type, created_at')
        .in('conversation_id', ids)
        .order('created_at', { ascending: false })
        .limit(Math.max(ids.length * 12, 240)),
      supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', ids)
        .eq('sender_type', 'seller')
        .eq('is_read', false),
      supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', ids)
        .eq('sender_type', 'buyer')
        .eq('is_read', false),
    ]);

    const latestByConversation = new Map<string, any>();
    for (const row of latestRowsResult.data || []) {
      const convId = (row as any).conversation_id as string;
      if (!convId || latestByConversation.has(convId)) continue;
      latestByConversation.set(convId, row);
      if (latestByConversation.size === ids.length) break;
    }

    const missingLatestIds = ids.filter(id => !latestByConversation.has(id));
    if (missingLatestIds.length > 0) {
      // Single batched fallback query avoids per-conversation N+1 fetches.
      const { data: fallbackRows } = await supabase
        .from('messages')
        .select('conversation_id, content, message_content, message_type, sender_type, created_at')
        .in('conversation_id', missingLatestIds)
        .order('created_at', { ascending: false })
        .limit(Math.max(missingLatestIds.length * 12, 120));

      for (const row of fallbackRows || []) {
        const convId = (row as any).conversation_id as string;
        if (!convId || latestByConversation.has(convId)) continue;
        latestByConversation.set(convId, row);
      }
    }

    const buyerUnreadByConversation = new Map<string, number>();
    for (const row of buyerUnreadResult.data || []) {
      const convId = (row as any).conversation_id as string;
      if (!convId) continue;
      buyerUnreadByConversation.set(convId, (buyerUnreadByConversation.get(convId) || 0) + 1);
    }

    const sellerUnreadByConversation = new Map<string, number>();
    for (const row of sellerUnreadResult.data || []) {
      const convId = (row as any).conversation_id as string;
      if (!convId) continue;
      sellerUnreadByConversation.set(convId, (sellerUnreadByConversation.get(convId) || 0) + 1);
    }

    const mediaPreviewMap: Record<string, string> = {
      image: '📷 Photo',
      video: '🎬 Video',
      document: '📄 Document',
    };

    const toPreview = (lastMsg: any): string => {
      if (!lastMsg) return '';
      if ((lastMsg as any).message_type === 'system') {
        return (lastMsg as any).message_content || '';
      }
      return mediaPreviewMap[(lastMsg as any).message_type || ''] ||
        (['[Image]', '[Video]', '[Document]'].includes((lastMsg as any).content || '')
          ? mediaPreviewMap[(lastMsg as any).message_type || ''] || (lastMsg as any).content
          : null) ||
        (lastMsg as any).content ||
        (lastMsg as any).message_content ||
        '';
    };

    for (const convId of ids) {
      const lastMsg = latestByConversation.get(convId);
      statsByConversation.set(convId, {
        lastMessage: toPreview(lastMsg),
        lastMessageAt: lastMsg?.created_at || null,
        buyerUnreadCount: buyerUnreadByConversation.get(convId) || 0,
        sellerUnreadCount: sellerUnreadByConversation.get(convId) || 0,
        lastSenderType: (lastMsg?.sender_type as 'buyer' | 'seller' | null) ?? null,
      });
    }

    return statsByConversation;
  }

  /**
   * Batch resolve seller ids for a set of conversations.
   * Priority: explicit seller hint > seller-authored messages > buyer metadata > order_id mapping.
   */
  private async resolveSellerIdsForConversations(
    conversations: Array<{ id: string; order_id?: string | null }>,
    sellerIdHint?: string
  ): Promise<Map<string, string | undefined>> {
    const sellerIdByConversation = new Map<string, string | undefined>();
    if (conversations.length === 0) return sellerIdByConversation;

    if (sellerIdHint) {
      for (const conv of conversations) {
        sellerIdByConversation.set(conv.id, sellerIdHint);
      }
      return sellerIdByConversation;
    }

    const unresolvedConversations = () => conversations.filter(c => !sellerIdByConversation.get(c.id));

    let unresolvedIds = unresolvedConversations().map(c => c.id);
    if (unresolvedIds.length > 0) {
      const [sellerMessagesResult, buyerMetaMessagesResult] = await Promise.all([
        supabase
          .from('messages')
          .select('conversation_id, sender_id, created_at')
          .in('conversation_id', unresolvedIds)
          .eq('sender_type', 'seller')
          .order('created_at', { ascending: false })
          .limit(Math.max(unresolvedIds.length * 8, 160)),
        supabase
          .from('messages')
          .select('conversation_id, message_content, created_at')
          .in('conversation_id', unresolvedIds)
          .eq('sender_type', 'buyer')
          .not('message_content', 'is', null)
          .order('created_at', { ascending: false })
          .limit(Math.max(unresolvedIds.length * 8, 160)),
      ]);

      for (const msg of sellerMessagesResult.data || []) {
        const convId = (msg as any).conversation_id as string;
        const sid = (msg as any).sender_id as string | null;
        if (!convId || !sid || sellerIdByConversation.get(convId)) continue;
        sellerIdByConversation.set(convId, sid);
      }

      for (const msg of buyerMetaMessagesResult.data || []) {
        const convId = (msg as any).conversation_id as string;
        if (!convId || sellerIdByConversation.get(convId)) continue;
        const meta = this.parseBuyerMessageMetadata((msg as any).message_content);
        if (meta?.targetSellerId) {
          sellerIdByConversation.set(convId, meta.targetSellerId);
        }
      }
    }

    // Fallback order mapping only for remaining unresolved conversations.
    unresolvedIds = unresolvedConversations().map(c => c.id);
    if (unresolvedIds.length > 0) {
      const unresolvedIdSet = new Set(unresolvedIds);
      const unresolvedOrderIds = Array.from(
        new Set(
          conversations
            .filter(c => unresolvedIdSet.has(c.id))
            .map(c => c.order_id)
            .filter((v): v is string => !!v)
        )
      );

      if (unresolvedOrderIds.length > 0) {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('order_id, product_id')
          .in('order_id', unresolvedOrderIds);

        const productIds = Array.from(
          new Set(
            (orderItems || [])
              .map((item: any) => item.product_id)
              .filter((v: any): v is string => !!v)
          )
        );

        const sellerByProductId = new Map<string, string>();
        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from('products')
            .select('id, seller_id')
            .in('id', productIds);

          for (const product of products || []) {
            const pid = (product as any).id as string;
            const sid = (product as any).seller_id as string | null;
            if (pid && sid) sellerByProductId.set(pid, sid);
          }
        }

        const sellerByOrderId = new Map<string, string>();
        for (const item of orderItems || []) {
          const oid = (item as any).order_id as string;
          if (!oid || sellerByOrderId.has(oid)) continue;
          const productId = (item as any).product_id as string;
          const sid = sellerByProductId.get(productId);
          if (sid) sellerByOrderId.set(oid, sid);
        }

        for (const conv of conversations) {
          if (sellerIdByConversation.get(conv.id)) continue;
          if (!conv.order_id) continue;
          const sid = sellerByOrderId.get(conv.order_id);
          if (sid) sellerIdByConversation.set(conv.id, sid);
        }
      }
    }

    unresolvedIds = unresolvedConversations().map(c => c.id);
    if (unresolvedIds.length > 0 && unresolvedIds.length <= 8) {
      // Guardrail: avoid large N+1 fallback bursts on big chatlists.
      const fallback = await Promise.all(
        unresolvedIds.map(async (convId) => {
          const sid = await this.getSellerIdFromBuyerMessageMetadata(convId);
          return sid ? { convId, sid } : null;
        })
      );

      for (const row of fallback) {
        if (!row) continue;
        sellerIdByConversation.set(row.convId, row.sid);
      }
    }

    return sellerIdByConversation;
  }

  /**
   * Batch fetch seller messaging fields by id.
   */
  private async getSellerMessagingFieldsByIds(sellerIds: string[]): Promise<Map<string, any>> {
    const sellerById = new Map<string, any>();
    const ids = Array.from(new Set(sellerIds.filter(Boolean)));
    if (ids.length === 0) return sellerById;

    const withSuspended = await supabase
      .from('sellers')
      .select('id, store_name, avatar_url, approval_status, blacklisted_at, temp_blacklist_until, cool_down_until, is_permanently_blacklisted, suspended_at')
      .in('id', ids);

    if (!withSuspended.error) {
      for (const seller of withSuspended.data || []) {
        const sid = (seller as any).id as string;
        if (sid) sellerById.set(sid, seller);
      }
      return sellerById;
    }

    const withoutSuspended = await supabase
      .from('sellers')
      .select('id, store_name, avatar_url, approval_status, blacklisted_at, temp_blacklist_until, cool_down_until, is_permanently_blacklisted')
      .in('id', ids);

    if (withoutSuspended.error) {
      console.error('[ChatService] Error fetching seller messaging fields batch:', withSuspended.error, withoutSuspended.error);
      return sellerById;
    }

    for (const seller of withoutSuspended.data || []) {
      const sid = (seller as any).id as string;
      if (sid) sellerById.set(sid, seller);
    }

    return sellerById;
  }

  /**
   * Chatlist enrichment path optimized to avoid per-conversation query fan-out.
   */
  private async enrichConversationsForChatlist(conversations: any[], sellerIdHint?: string): Promise<Conversation[]> {
    if (!conversations || conversations.length === 0) return [];

    const conversationIds = Array.from(new Set(conversations.map((c: any) => c.id).filter(Boolean)));
    const [sellerIdByConversation, statsByConversation] = await Promise.all([
      this.resolveSellerIdsForConversations(conversations, sellerIdHint),
      this.getConversationStatsBatch(conversationIds),
    ]);

    const buyerIds = Array.from(new Set(conversations.map((c: any) => c.buyer_id).filter(Boolean)));
    const [buyerProfilesResult, buyerAvatarsResult, presenceResult] = await Promise.all([
      buyerIds.length > 0
        ? supabase.from('profiles').select('id, first_name, last_name, email').in('id', buyerIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      buyerIds.length > 0
        ? supabase.from('buyers').select('id, avatar_url').in('id', buyerIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      buyerIds.length > 0
        ? supabase.from('user_presence').select('user_id, is_online').in('user_id', buyerIds)
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);

    const buyerProfileById = new Map<string, any>();
    for (const row of buyerProfilesResult.data || []) {
      const id = (row as any).id as string;
      if (id) buyerProfileById.set(id, row);
    }

    const buyerAvatarById = new Map<string, string | undefined>();
    for (const row of buyerAvatarsResult.data || []) {
      const id = (row as any).id as string;
      if (id) buyerAvatarById.set(id, (row as any).avatar_url || undefined);
    }

    const presenceByUserId = new Map<string, boolean>();
    for (const row of presenceResult.data || []) {
      const uid = (row as any).user_id as string;
      if (uid) presenceByUserId.set(uid, !!(row as any).is_online);
    }

    const sellerIds = Array.from(
      new Set(
        conversations
          .map((conv: any) => sellerIdByConversation.get(conv.id))
          .filter((v): v is string => !!v)
      )
    );

    const [sellerById, sellerProfilesResult] = await Promise.all([
      this.getSellerMessagingFieldsByIds(sellerIds),
      sellerIds.length > 0
        ? supabase.from('profiles').select('id, first_name, last_name').in('id', sellerIds)
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);

    const sellerProfileById = new Map<string, any>();
    for (const row of sellerProfilesResult.data || []) {
      const id = (row as any).id as string;
      if (id) sellerProfileById.set(id, row);
    }

    const enriched = conversations.map((conv: any) => {
      const resolvedSellerId = sellerIdByConversation.get(conv.id);
      const stats = statsByConversation.get(conv.id) || {
        lastMessage: '',
        lastMessageAt: null,
        buyerUnreadCount: 0,
        sellerUnreadCount: 0,
        lastSenderType: null,
      };

      const buyerProfile = buyerProfileById.get(conv.buyer_id);
      const buyerFullName = buyerProfile ? this.getBuyerFullName(buyerProfile) : 'Unknown Buyer';
      const buyerAvatar = buyerAvatarById.get(conv.buyer_id);
      const isOnline = presenceByUserId.get(conv.buyer_id) === true;

      const seller = resolvedSellerId ? sellerById.get(resolvedSellerId) : null;
      const sellerMessagingStatus = seller
        ? resolveSellerMessagingAccountStatus({
          approval_status: seller.approval_status,
          blacklisted_at: seller.blacklisted_at,
          temp_blacklist_until: seller.temp_blacklist_until,
          cool_down_until: seller.cool_down_until,
          is_permanently_blacklisted: seller.is_permanently_blacklisted,
          suspended_at: (seller as any).suspended_at,
        })
        : 'active';

      let sellerStoreName = 'Unknown Store';
      if (seller?.store_name) {
        sellerStoreName = seller.store_name;
      } else if (resolvedSellerId) {
        const sellerProfile = sellerProfileById.get(resolvedSellerId);
        if (sellerProfile) {
          const name = `${sellerProfile.first_name || ''} ${sellerProfile.last_name || ''}`.trim();
          if (name) sellerStoreName = name;
        }
      }

      return {
        ...conv,
        seller_id: resolvedSellerId,
        buyer_name: buyerFullName,
        buyer_email: buyerProfile?.email,
        buyer_avatar: buyerAvatar,
        seller_store_name: sellerStoreName,
        seller_avatar: seller?.avatar_url,
        seller_approval_status: seller?.approval_status ?? null,
        seller_blacklisted_at: seller?.blacklisted_at ?? null,
        seller_temp_blacklist_until: seller?.temp_blacklist_until ?? null,
        seller_cool_down_until: seller?.cool_down_until ?? null,
        seller_is_permanently_blacklisted: seller?.is_permanently_blacklisted ?? null,
        seller_suspended_at: (seller as any)?.suspended_at ?? null,
        seller_messaging_status: sellerMessagingStatus,
        last_message: stats.lastMessage,
        last_message_at: stats.lastMessageAt || conv.updated_at,
        buyer_unread_count: stats.buyerUnreadCount,
        seller_unread_count: stats.sellerUnreadCount,
        last_sender_type: stats.lastSenderType,
        is_online: isOnline,
        isOnline: isOnline,
        buyer: {
          first_name: buyerProfile?.first_name ?? undefined,
          last_name: buyerProfile?.last_name ?? undefined,
          full_name: buyerFullName,
          email: buyerProfile?.email,
          avatar_url: buyerAvatar,
        },
        seller,
      } as Conversation;
    });

    return enriched;
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

  private isMissingColumnError(error: any, columnName: string): boolean {
    const message = String((error as any)?.message || (error as any)?.details || '').toLowerCase();
    return message.includes('column') && message.includes(columnName.toLowerCase());
  }

  /**
   * Resolve buyer metadata hint messages using indexed target_seller_id when available.
   * Falls back to legacy message_content JSON parsing for pre-migration rows.
   */
  private async getBuyerHintMessagesByTargetSeller(
    sellerId: string,
    options?: { conversationIds?: string[]; limit?: number }
  ): Promise<Array<{ conversation_id: string; message_content?: string | null; created_at?: string }>> {
    const limit = options?.limit || 200;
    const conversationIds = options?.conversationIds || [];

    if (this.targetSellerIdColumnAvailable !== false) {
      let hintedQuery = supabase
        .from('messages')
        .select('conversation_id, message_content, created_at')
        .eq('sender_type', 'buyer')
        .filter('target_seller_id', 'eq', sellerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (conversationIds.length > 0) {
        hintedQuery = hintedQuery.in('conversation_id', conversationIds);
      }

      const hintedResult = await hintedQuery;
      if (!hintedResult.error) {
        this.targetSellerIdColumnAvailable = true;
        return (hintedResult.data || []) as Array<{ conversation_id: string; message_content?: string | null; created_at?: string }>;
      }

      if (!this.isMissingColumnError(hintedResult.error, 'target_seller_id')) {
        console.error('[ChatService] Error querying target_seller_id hints:', hintedResult.error);
        return [];
      }

      this.targetSellerIdColumnAvailable = false;
    }

    if (conversationIds.length === 0) {
      return [];
    }

    let legacyQuery = supabase
      .from('messages')
      .select('conversation_id, message_content, created_at')
      .eq('sender_type', 'buyer')
      .not('message_content', 'is', null)
      .ilike('message_content', `%${sellerId}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (conversationIds.length > 0) {
      legacyQuery = legacyQuery.in('conversation_id', conversationIds);
    }

    const legacyResult = await legacyQuery;
    if (legacyResult.error) {
      console.error('[ChatService] Error querying legacy message_content hints:', legacyResult.error);
      return [];
    }

    return (legacyResult.data || []).filter((msg: any) => {
      const meta = this.parseBuyerMessageMetadata(msg?.message_content);
      return meta?.targetSellerId === sellerId;
    }) as Array<{ conversation_id: string; message_content?: string | null; created_at?: string }>;
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
        return this.enrichConversationForThread(existing, sellerId);
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
        if (matchedConv) return this.enrichConversationForThread(matchedConv, sellerId);
      }

      // Fallback: resolve by buyer message metadata (direct non-order chat hint)
      const buyerHintMessages = await this.getBuyerHintMessagesByTargetSeller(sellerId, {
        conversationIds: convIds,
        limit: 200,
      });

      if (buyerHintMessages.length > 0) {
        const hintedConversationIds = new Set(buyerHintMessages.map((msg) => msg.conversation_id));
        const matchedConv = convList.find(c => hintedConversationIds.has(c.id));
        if (matchedConv) return this.enrichConversationForThread(matchedConv, sellerId);
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
        if (matched) return this.enrichConversationForThread(matched.conv, sellerId);
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

    return this.enrichConversationForThread(newConv, sellerId);
  }

  /**
   * Lightweight enrichment for thread-opening flows.
   * Avoids chatlist stats/presence queries so chat screen can render faster.
   */
  private async enrichConversationForThread(conv: any, sellerId?: string): Promise<Conversation> {
    // Prefer explicit sellerId passed by caller (buyer/seller direct chat entry).
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

    const sellerQuery = resolvedSellerId
      ? this.getSellerMessagingFieldsById(resolvedSellerId)
      : Promise.resolve(null);

    const [
      { data: buyer },
      { data: buyerData },
      sellerData,
    ] = await Promise.all([
      supabase.from('profiles').select('first_name, last_name, email').eq('id', conv.buyer_id).maybeSingle(),
      supabase.from('buyers').select('avatar_url').eq('id', conv.buyer_id).maybeSingle(),
      sellerQuery,
    ]);

    const seller = sellerData;
    const sellerMessagingStatus = seller
      ? resolveSellerMessagingAccountStatus({
        approval_status: seller.approval_status,
        blacklisted_at: seller.blacklisted_at,
        temp_blacklist_until: seller.temp_blacklist_until,
        cool_down_until: seller.cool_down_until,
        is_permanently_blacklisted: seller.is_permanently_blacklisted,
        suspended_at: (seller as any).suspended_at,
      })
      : 'active';

    const buyerFullName = buyer ? this.getBuyerFullName(buyer as any) : 'Unknown Buyer';

    return {
      ...conv,
      seller_id: resolvedSellerId,
      buyer_name: buyerFullName,
      buyer_email: buyer?.email,
      buyer_avatar: buyerData?.avatar_url,
      seller_store_name: seller?.store_name || 'Unknown Store',
      seller_avatar: seller?.avatar_url,
      seller_approval_status: seller?.approval_status ?? null,
      seller_blacklisted_at: seller?.blacklisted_at ?? null,
      seller_temp_blacklist_until: seller?.temp_blacklist_until ?? null,
      seller_cool_down_until: seller?.cool_down_until ?? null,
      seller_is_permanently_blacklisted: seller?.is_permanently_blacklisted ?? null,
      seller_suspended_at: (seller as any)?.suspended_at ?? null,
      seller_messaging_status: sellerMessagingStatus,
      last_message: '',
      last_message_at: conv.updated_at,
      buyer_unread_count: 0,
      seller_unread_count: 0,
      last_sender_type: null,
      is_online: false,
      isOnline: false,
      buyer: {
        first_name: buyer?.first_name ?? undefined,
        last_name: buyer?.last_name ?? undefined,
        full_name: buyerFullName,
        email: buyer?.email,
        avatar_url: buyerData?.avatar_url,
      },
      seller,
    };
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
      ? this.getSellerMessagingFieldsById(resolvedSellerId)
      : Promise.resolve(null);

    const presenceUserId = conv.buyer_id;
    const [
      { data: buyer },
      { data: buyerData },
      sellerData,
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
    const sellerMessagingStatus = seller
      ? resolveSellerMessagingAccountStatus({
        approval_status: seller.approval_status,
        blacklisted_at: seller.blacklisted_at,
        temp_blacklist_until: seller.temp_blacklist_until,
        cool_down_until: seller.cool_down_until,
        is_permanently_blacklisted: seller.is_permanently_blacklisted,
        suspended_at: (seller as any).suspended_at,
      })
      : 'active';

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
      seller_approval_status: seller?.approval_status ?? null,
      seller_blacklisted_at: seller?.blacklisted_at ?? null,
      seller_temp_blacklist_until: seller?.temp_blacklist_until ?? null,
      seller_cool_down_until: seller?.cool_down_until ?? null,
      seller_is_permanently_blacklisted: seller?.is_permanently_blacklisted ?? null,
      seller_suspended_at: (seller as any)?.suspended_at ?? null,
      seller_messaging_status: sellerMessagingStatus,
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
    const startedAt = Date.now();
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

    // Batch enrich to avoid per-conversation query fan-out.
    const enrichStartedAt = Date.now();
    const enrichedConversations = await this.enrichConversationsForChatlist(conversations);

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

    const result = Array.from(sellerMap.values())
      .sort((a, b) =>
        new Date(b.last_message_at || b.updated_at).getTime() -
        new Date(a.last_message_at || a.updated_at).getTime()
      );

    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log(
        `[Perf][ChatService] Buyer chatlist total=${Date.now() - startedAt}ms enrich=${Date.now() - enrichStartedAt}ms convs=${conversations.length} deduped=${result.length}`
      );
    }

    return result;
  }

  /**
   * Get all conversations for a seller
   * New schema: no seller_id in conversations, so we find via messages
   */
  async getSellerConversations(sellerId: string): Promise<Conversation[]> {
    const startedAt = Date.now();
    // Constrain hint discovery to recent conversations to avoid global metadata scans.
    const { data: recentConversationRows } = await supabase
      .from('conversations')
      .select('id')
      .order('updated_at', { ascending: false })
      .limit(600);

    const recentConversationIds = (recentConversationRows || [])
      .map((row: any) => row.id as string)
      .filter(Boolean);

    // Find all conversations where this seller has messages or buyer metadata hints.
    const { data: sellerMessages } = await supabase
      .from('messages')
      .select('conversation_id, created_at')
      .eq('sender_id', sellerId)
      .eq('sender_type', 'seller')
      .order('created_at', { ascending: false })
      .limit(3000);

    // For first-time buyer-initiated direct chats, seller may not have replied yet.
    // Use buyer metadata hints to discover those conversations.
    const buyerHintMessages = recentConversationIds.length > 0
      ? await this.getBuyerHintMessagesByTargetSeller(sellerId, {
        conversationIds: recentConversationIds,
        limit: 500,
      })
      : [];
    // Keep only the most recent candidate conversations to avoid very large IN lists.
    const rankedConversationIds: string[] = [];
    const seenConversationIds = new Set<string>();

    for (const msg of sellerMessages || []) {
      const conversationId = (msg as any).conversation_id as string;
      if (!conversationId || seenConversationIds.has(conversationId)) continue;
      seenConversationIds.add(conversationId);
      rankedConversationIds.push(conversationId);
      if (rankedConversationIds.length >= 600) break;
    }

    if (rankedConversationIds.length < 600) {
      for (const msg of buyerHintMessages) {
        const conversationId = msg.conversation_id;
        if (!conversationId || seenConversationIds.has(conversationId)) continue;
        seenConversationIds.add(conversationId);
        rankedConversationIds.push(conversationId);
        if (rankedConversationIds.length >= 600) break;
      }
    }

    const conversationIds = rankedConversationIds;

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

    // Batch enrich to avoid per-conversation query fan-out.
    const enrichedConversations = await this.enrichConversationsForChatlist(conversations, sellerId);

    // Deduplicate by buyer_id — keep conversation with most recent message per buyer
    const buyerMap = new Map<string, Conversation>();
    for (const conv of enrichedConversations) {
      const bid = conv.buyer_id;
      const existing = buyerMap.get(bid);
      if (!existing || new Date(conv.last_message_at || conv.updated_at).getTime() > new Date(existing.last_message_at || existing.updated_at).getTime()) {
        buyerMap.set(bid, conv);
      }
    }

    const result = Array.from(buyerMap.values())
      .sort((a, b) =>
        new Date(b.last_message_at || b.updated_at).getTime() -
        new Date(a.last_message_at || a.updated_at).getTime()
      );

    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log(
        `[Perf][ChatService] Seller chatlist total=${Date.now() - startedAt}ms conversationIds=${conversationIds.length} deduped=${result.length}`
      );
    }

    return result;
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
   * Get latest quick-reply usage timestamps for a buyer in a single conversation.
   * Source of truth is server-side message history, so cooldown works across devices.
   */
  async getBuyerQuickReplyCooldownMap(
    conversationId: string,
    buyerId: string,
    quickReplies: string[],
    cooldownMs: number
  ): Promise<Record<string, number>> {
    if (!conversationId || !buyerId || quickReplies.length === 0 || cooldownMs <= 0) {
      return {};
    }

    const cutoffIso = new Date(Date.now() - cooldownMs).toISOString();
    const { data, error } = await supabase
      .from('messages')
      .select('content, created_at')
      .eq('conversation_id', conversationId)
      .eq('sender_id', buyerId)
      .eq('sender_type', 'buyer')
      .in('content', quickReplies)
      .gte('created_at', cutoffIso)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[ChatService] Error fetching quick-reply cooldown map:', error);
      return {};
    }

    const latestPerReply: Record<string, number> = {};
    for (const row of data || []) {
      const reply = (row as any).content as string;
      if (!quickReplies.includes(reply)) continue;
      if (latestPerReply[reply]) continue;
      const createdAt = Date.parse((row as any).created_at as string);
      if (Number.isNaN(createdAt)) continue;
      latestPerReply[reply] = createdAt;
    }

    return latestPerReply;
  }

  /**
   * Resolve current messaging status of a seller account.
   * Used by buyer/seller chat UIs for live send-block guards.
   */
  async getSellerMessagingStatusById(sellerId: string): Promise<MessagingAccountStatus> {
    if (!sellerId) return 'active';

    const data = await this.getSellerMessagingFieldsById(sellerId);
    if (!data) {
      return 'active';
    }

    return resolveSellerMessagingAccountStatus({
      approval_status: (data as any).approval_status,
      blacklisted_at: (data as any).blacklisted_at,
      temp_blacklist_until: (data as any).temp_blacklist_until,
      cool_down_until: (data as any).cool_down_until,
      is_permanently_blacklisted: (data as any).is_permanently_blacklisted,
      suspended_at: (data as any).suspended_at,
    });
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

    const insertPayload: any = {
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
    };

    if (senderType === 'buyer' && this.targetSellerIdColumnAvailable !== false) {
      insertPayload.target_seller_id = options?.targetSellerId || null;
    }

    let { data: message, error: msgError } = await supabase
      .from('messages')
      .insert(insertPayload)
      .select()
      .single();

    if (msgError && this.isMissingColumnError(msgError, 'target_seller_id')) {
      this.targetSellerIdColumnAvailable = false;

      if ('target_seller_id' in insertPayload) {
        delete insertPayload.target_seller_id;
      }

      const retryResult = await supabase
        .from('messages')
        .insert(insertPayload)
        .select()
        .single();

      message = retryResult.data;
      msgError = retryResult.error;
    }

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