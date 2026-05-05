/**
 * useGlobalNotifications (Mobile)
 *
 * Mounts a Supabase Realtime subscription for the current user and fires an
 * immediate local notification via expo-notifications whenever a new row is
 * inserted into buyer_notifications or seller_notifications.
 *
 * Works in ALL app states:
 *   - Foreground: fires a local notification so the banner appears on-screen.
 *   - Background/Killed: the DB trigger → send-push-notification edge function
 *     already delivers a remote push notification via the Expo Push API.
 *
 * Mount this hook ONCE in MainTabs (or the root component) so it is always
 * active while the user is logged in.
 */
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { notificationService } from '../services/notificationService';
import { useAuthStore as useBuyerAuthStore } from '../stores/authStore';
import { useAuthStore as useSellerAuthStore } from '../stores/sellerStore';

export function useGlobalNotifications() {
  const buyerUser = useBuyerAuthStore((s) => s.user);
  const sellerUser = useSellerAuthStore((s) => s.seller);

  // Keep stable refs so effect doesn't rerun on every render
  const buyerIdRef = useRef<string | null>(null);
  const sellerIdRef = useRef<string | null>(null);
  // Deduplication: track message IDs already surfaced as notifications
  // (prevents double-firing when both buyer_notifications and the direct
  //  messages subscription react to the same message)
  const recentlyShownMsgIds = useRef<Set<string>>(new Set());

  // ── One-time: ensure notification permissions + foreground handler ──────
  // This runs regardless of Expo Go / dev-build so that local notifications
  // (used for foreground banners when a DB row is inserted) always work.
  useEffect(() => {
    // Set foreground display handler so banners show while app is open
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      } as any),
    });

    // Request permission (needed on iOS; on Android 13+ for POST_NOTIFICATIONS)
    Notifications.getPermissionsAsync()
      .then(({ status }) => {
        if (status !== 'granted') {
          return Notifications.requestPermissionsAsync();
        }
      })
      .catch(() => { /* non-critical */ });

    // Ensure Android notification channel exists for local notifications
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'BazaarX',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6A00',
      }).catch(() => { /* non-critical */ });
    }
  }, []);

  buyerIdRef.current = buyerUser?.id ?? null;
  sellerIdRef.current = sellerUser?.id ?? null;

  useEffect(() => {
    const buyerId = buyerIdRef.current;
    const sellerId = sellerIdRef.current;

    if (!buyerId && !sellerId) return;

    const unsubscribers: Array<() => void> = [];

    async function scheduleLocal(title: string, body: string, data?: Record<string, unknown>) {
      // Only show local notification when the app is in foreground —
      // remote push already handles background/killed states.
      if (AppState.currentState !== 'active') return;
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: data ?? {},
            sound: true,
          },
          trigger: null, // fires immediately
        });
      } catch (err) {
        console.warn('[GlobalNotifications] Failed to schedule local notification:', err);
      }
    }

    // ── Buyer notifications ─────────────────────────────────────────────
    if (buyerId) {
      const unsub = notificationService.subscribeToNotifications(
        buyerId,
        'buyer',
        (notification) => {
          if (notification?.title && notification?.message) {
            // Track message IDs so the direct messages subscription below
            // doesn't fire a duplicate notification for the same message.
            if (notification.type === 'new_message' && notification.action_data?.message_id) {
              recentlyShownMsgIds.current.add(notification.action_data.message_id as string);
              setTimeout(() => recentlyShownMsgIds.current.delete(notification.action_data.message_id as string), 10_000);
            }
            scheduleLocal(notification.title, notification.message, {
              type: notification.type,
              action_url: notification.action_url,
              ...(notification.action_data ?? {}),
            });
          }
        },
      );
      unsubscribers.push(unsub);
    }

    // ── Seller notifications ────────────────────────────────────────────
    if (sellerId) {
      const unsub = notificationService.subscribeToNotifications(
        sellerId,
        'seller',
        (notification) => {
          if (notification?.title && notification?.message) {
            if (notification.type === 'new_message' && notification.action_data?.message_id) {
              recentlyShownMsgIds.current.add(notification.action_data.message_id as string);
              setTimeout(() => recentlyShownMsgIds.current.delete(notification.action_data.message_id as string), 10_000);
            }
            scheduleLocal(notification.title, notification.message, {
              type: notification.type,
              action_url: notification.action_url,
              ...(notification.action_data ?? {}),
            });
          }
        },
      );
      unsubscribers.push(unsub);
    }

    // ── Direct messages subscription (fallback) ─────────────────────────
    // Fires a local notification when a new chat message arrives, without
    // relying on the _notify_on_new_message DB trigger.  Deduplicates
    // against the buyer_notifications / seller_notifications paths above.
    //
    // Buyer: notified when a seller sends in any of the buyer's conversations.
    // Seller: notified when a buyer sends a message directed at this seller.
    const msgChannel = supabase
      .channel(`direct_messages_${buyerId || ''}_${sellerId || ''}`)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload: any) => {
          const msg = payload.new;
          if (!msg?.id || !msg?.conversation_id) return;

          // Skip if already shown via buyer_notifications / seller_notifications
          if (recentlyShownMsgIds.current.has(msg.id)) return;
          recentlyShownMsgIds.current.add(msg.id);
          setTimeout(() => recentlyShownMsgIds.current.delete(msg.id), 10_000);

          const senderType: string = msg.sender_type ?? msg.message_type ?? '';
          const preview: string =
            (msg.content || msg.message_content || '').toString().substring(0, 80) ||
            'Sent you a message';

          // ── Seller sent → notify buyer ──────────────────────────────
          if (senderType === 'seller' && buyerId) {
            const { data: conv } = await supabase
              .from('conversations')
              .select('buyer_id')
              .eq('id', msg.conversation_id)
              .eq('buyer_id', buyerId)
              .maybeSingle();
            if (!conv) return;

            // Resolve the seller's store name for a richer notification title
            let storeName = 'Seller';
            if (msg.sender_id) {
              const { data: sellerRow } = await supabase
                .from('sellers')
                .select('store_name')
                .eq('user_id', msg.sender_id)
                .maybeSingle();
              storeName = sellerRow?.store_name || storeName;
            }

            await scheduleLocal(`💬 ${storeName}`, preview, {
              type: 'new_message',
              conversation_id: msg.conversation_id,
              sender_id: msg.sender_id,
            });
            return;
          }

          // ── Buyer sent → notify seller ──────────────────────────────
          if (senderType === 'buyer' && sellerId) {
            // target_seller_id on the message is the sellers.id
            if (msg.target_seller_id && msg.target_seller_id !== sellerId) return;

            if (!msg.target_seller_id) {
              // Fallback: check if this seller is associated with the conversation
              const { data: conv } = await supabase
                .from('conversations')
                .select('id, order_id')
                .eq('id', msg.conversation_id)
                .maybeSingle();
              if (!conv?.order_id) return;

              const { data: item } = await supabase
                .from('order_items')
                .select('product_id, products!inner(seller_id)')
                .eq('order_id', conv.order_id)
                .maybeSingle();
              if ((item?.products as any)?.seller_id !== sellerId) return;
            }

            // Get buyer's display name
            let buyerName = 'Buyer';
            if (msg.sender_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('first_name, last_name')
                .eq('id', msg.sender_id)
                .maybeSingle();
              if (profile?.first_name) {
                buyerName = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
              }
            }

            await scheduleLocal(`💬 ${buyerName}`, preview, {
              type: 'new_message',
              conversation_id: msg.conversation_id,
              sender_id: msg.sender_id,
            });
          }
        }
      )
      .subscribe();

    unsubscribers.push(() => supabase.removeChannel(msgChannel));

    return () => {
      unsubscribers.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
    };
  }, [buyerUser?.id, sellerUser?.id]);
}
