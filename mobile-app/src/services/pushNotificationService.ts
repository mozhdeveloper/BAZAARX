/**
 * Push Notification Service
 *
 * Handles Expo push token registration, storage, and handlers for
 * foreground/tap notification events.
 *
 * Usage (call once after user logs in):
 *   await pushNotificationService.register(userId);
 *   pushNotificationService.setupHandlers(navigation);    // optional deep-link nav
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// Only configure the foreground handler when NOT running in Expo Go —
// remote notification APIs are unavailable there since SDK 53.
if (Constants.appOwnership !== 'expo') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    } as any),
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PushNotificationData {
  type?: string;
  orderId?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Push Notification Service
// ---------------------------------------------------------------------------

class PushNotificationService {
  private _subscription: Notifications.Subscription | null = null;
  private _responseSubscription: Notifications.Subscription | null = null;

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Request permission and register the device token in the DB.
   * Safe to call multiple times — updates token on re-login.
   *
   * NOTE: Remote push notifications are NOT supported in Expo Go (SDK 53+).
   * Registration is automatically skipped when running in Expo Go — use a
   * development build for full push notification support.
   */
  async register(userId: string): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('[Push] Skipping registration — not a physical device');
      return null;
    }

    // Expo Go removed remote push notification support in SDK 53.
    // Skip silently so the app doesn't spam warnings during development.
    const isExpoGo = Constants.appOwnership === 'expo';
    if (isExpoGo) {
      console.log('[Push] Skipping registration — Expo Go does not support remote push notifications (SDK 53+). Use a development build.');
      return null;
    }

    // On Android, create a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'BazaarX',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6A00',
      });
    }

    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permission denied — push notifications disabled');
      return null;
    }

    try {
      // Retrieve the Expo push token
      // In EAS builds, projectId comes from app.json extra.eas.projectId.
      // In Expo Go, it falls back to the slug-based experience.
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId ??
        undefined;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      const token = tokenData.data;

      // Persist in DB (upsert — handles re-logins and token rotation)
      await this._saveToken(userId, token);

      console.log('[Push] Registered token:', token);
      return token;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Push] Token registration failed:', msg);
      return null;
    }
  }

  /**
   * Remove all push tokens for this user on logout.
   */
  async unregister(userId: string): Promise<void> {
    try {
      await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', userId);
      console.log('[Push] Tokens removed for user', userId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Push] Failed to remove tokens:', msg);
    }
  }

  /**
   * Set up foreground display handler and notification tap (response) handler.
   *
   * @param onTap - Optional callback when user taps a notification.
   *                Receives the notification data payload.
   */
  setupHandlers(onTap?: (data: PushNotificationData) => void): void {
    // Clean up previous subscriptions
    this.teardownHandlers();

    // Ensure foreground notifications are displayed even in Expo Go (local notifications).
    // The module-level setNotificationHandler is guarded to non-Expo-Go builds only,
    // so we set it here unconditionally to cover local notification testing in Expo Go.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      } as any),
    });

    // Foreground notifications are already configured via setNotificationHandler above.
    // This subscription fires when a notification arrives while app is open.
    this._subscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Push] Notification received (foreground):', notification.request.identifier);
    });

    // Fires when user taps on a notification
    this._responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as PushNotificationData;
      console.log('[Push] Notification tapped:', data);
      onTap?.(data);
    });
  }

  teardownHandlers(): void {
    this._subscription?.remove();
    this._responseSubscription?.remove();
    this._subscription = null;
    this._responseSubscription = null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Dev / testing helpers (work in Expo Go via local notifications)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Fire a local notification that behaves identically to a remote push.
   * Works in Expo Go — no dev build needed.
   *
   * @param type - Matches the `type` field checked in App.tsx tap handler.
   *               Use 'order', 'seller_order', 'chat', 'return', or any string.
   * @param title - Notification title
   * @param body  - Notification body text
   * @param extra - Any extra data to include in `notification.request.content.data`
   */
  async testLocalNotification(
    type: string = 'order',
    title: string = '[TEST] Push Notification',
    body: string = 'Tap me to test deep-link routing',
    extra: Record<string, unknown> = {},
  ): Promise<string> {
    // Ensure foreground handler is set so the alert appears even when app is open
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      } as any),
    });

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type, ...extra },
        sound: true,
      },
      trigger: null, // fire immediately
    });

    console.log(`[Push][TEST] Local notification scheduled: ${id} (type=${type})`);
    return id;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  private async _saveToken(userId: string, token: string): Promise<void> {
    const platform: 'ios' | 'android' | 'web' =
      Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' },
      );

    if (error) {
      throw new Error(`Failed to save push token: ${error.message}`);
    }
  }
}

export const pushNotificationService = new PushNotificationService();
