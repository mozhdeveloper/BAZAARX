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
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { notificationService } from '../services/notificationService';
import { useAuthStore as useBuyerAuthStore } from '../stores/authStore';
import { useAuthStore as useSellerAuthStore } from '../stores/sellerStore';

export function useGlobalNotifications() {
  const buyerUser = useBuyerAuthStore((s) => s.user);
  const sellerUser = useSellerAuthStore((s) => s.seller);

  // Keep stable refs so effect doesn't rerun on every render
  const buyerIdRef = useRef<string | null>(null);
  const sellerIdRef = useRef<string | null>(null);

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

    return () => {
      unsubscribers.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
    };
  }, [buyerUser?.id, sellerUser?.id]);
}
