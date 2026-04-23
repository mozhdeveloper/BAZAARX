/**
 * Web Push Notification Service
 *
 * Handles browser-based push notifications via the Web Push protocol (VAPID).
 * Compatible with PWA installs on Chrome/Edge/Firefox/Safari (iOS 16.4+, requires PWA install on iOS).
 *
 * Flow:
 *   1. register(userId)   → register service worker, request permission, subscribe via VAPID,
 *                           save the subscription JSON to push_tokens (platform = 'web').
 *   2. unregister(userId) → unsubscribe from PushManager and delete tokens for this user.
 *   3. testLocalNotification() → fires a one-off local notification (no server) for dev testing.
 *
 * The VAPID public key may be overridden via VITE_VAPID_PUBLIC_KEY at build time.
 */

import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// VAPID public key (URL-safe base64). The matching private key MUST be set as
// the VAPID_PRIVATE_KEY secret on the send-push-notification Edge Function.
// Override at build time with: VITE_VAPID_PUBLIC_KEY=...
const DEFAULT_VAPID_PUBLIC_KEY =
  'BLZKxkBKTWX6wN3GBKo9e8B-GNT5bZbUQMc-9Q-LpeHe_5xkdrs3sWfCUxw5F3hcs7wVw2ikFOUBNGAkKCjPTsQ';

const VAPID_PUBLIC_KEY: string =
  ((import.meta as any)?.env?.VITE_VAPID_PUBLIC_KEY as string | undefined) ||
  DEFAULT_VAPID_PUBLIC_KEY;

const SW_URL = '/sw.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface WebPushTestPayload {
  type?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

class WebPushService {
  private _registration: ServiceWorkerRegistration | null = null;

  /**
   * True if the current browser supports the Push API + Service Workers.
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Request permission and subscribe to push notifications.
   * Stores the resulting PushSubscription as JSON in push_tokens.
   *
   * Safe to call multiple times — re-uses an existing subscription when possible.
   */
  async register(userId: string): Promise<PushSubscription | null> {
    if (!userId) return null;
    if (!this.isSupported()) {
      console.log('[WebPush] Not supported in this browser');
      return null;
    }

    try {
      // 1. Make sure the service worker is registered & active
      const registration = await this._getRegistration();
      if (!registration) return null;

      // 2. Ask for notification permission
      const permission = await this._requestPermission();
      if (permission !== 'granted') {
        console.log(`[WebPush] Permission denied (${permission})`);
        return null;
      }

      // 3. Subscribe (or re-use existing subscription)
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      // 4. Persist in DB (upsert keyed on token)
      await this._saveSubscription(userId, subscription);
      console.log('[WebPush] Registered for user', userId);
      return subscription;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[WebPush] register failed:', msg);
      return null;
    }
  }

  /**
   * Unsubscribe and remove tokens for this user.
   */
  async unregister(userId: string): Promise<void> {
    try {
      const registration = await navigator.serviceWorker?.getRegistration(SW_URL);
      const subscription = await registration?.pushManager?.getSubscription();
      if (subscription) {
        await subscription.unsubscribe().catch(() => {});
      }
      if (userId) {
        await supabase
          .from('push_tokens')
          .delete()
          .eq('user_id', userId)
          .eq('platform', 'web');
      }
    } catch (err) {
      console.warn('[WebPush] unregister failed:', err);
    }
  }

  /**
   * Show a local notification (no server roundtrip). Works as long as the
   * service worker is registered and the user has granted permission.
   * Useful for dev testing without setting up the Edge Function.
   */
  async testLocalNotification(payload: WebPushTestPayload = {}): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const registration = await this._getRegistration();
      if (!registration) return false;

      const permission = await this._requestPermission();
      if (permission !== 'granted') return false;

      await registration.showNotification(payload.title || '[TEST] BazaarX', {
        body: payload.body || 'Local web push test — tap to open the app',
        icon: '/Logo.png',
        badge: '/Logo.png',
        tag: payload.type || 'bazaarx-test',
        data: { type: payload.type || 'order', ...(payload.data || {}) },
      });
      return true;
    } catch (err) {
      console.warn('[WebPush] testLocalNotification failed:', err);
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private async _getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (this._registration) return this._registration;
    try {
      const existing = await navigator.serviceWorker.getRegistration(SW_URL);
      this._registration = existing || (await navigator.serviceWorker.register(SW_URL, { scope: '/' }));
      // Wait until the SW is fully active before subscribing
      if (this._registration && this._registration.installing) {
        await new Promise<void>((resolve) => {
          const sw = this._registration!.installing!;
          sw.addEventListener('statechange', () => {
            if (sw.state === 'activated') resolve();
          });
        });
      }
      return this._registration;
    } catch (err) {
      console.warn('[WebPush] SW registration failed:', err);
      return null;
    }
  }

  private async _requestPermission(): Promise<NotificationPermission> {
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      return Notification.permission;
    }
    return await Notification.requestPermission();
  }

  private async _saveSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    // Token = JSON-serialized subscription so the Edge Function can reconstruct
    // it (endpoint + p256dh + auth keys) when sending via the Web Push protocol.
    const token = JSON.stringify(subscription.toJSON());
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform: 'web',
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'token' },
      );
    if (error) {
      console.warn('[WebPush] _saveSubscription error:', error);
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert URL-safe base64 (the VAPID public key) into a Uint8Array
 * suitable for `pushManager.subscribe({ applicationServerKey })`.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const webPushService = new WebPushService();
export default webPushService;

// Expose on window in dev for quick testing from the browser console:
//   window.__bazaarPush.testLocalNotification({ type: 'order', body: 'Hi!' })
//   window.__bazaarPush.register('<userId>')
if (typeof window !== 'undefined' && (import.meta as any)?.env?.DEV) {
  (window as any).__bazaarPush = webPushService;
}
