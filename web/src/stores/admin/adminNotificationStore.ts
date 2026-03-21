/**
 * Admin Notification Settings Store
 *
 * Manages notification channel toggles (email, SMS, push) per event type.
 * Provides CRUD operations for notification_settings and log viewing.
 */

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface NotificationSetting {
  id: string;
  channel: 'email' | 'sms' | 'push';
  event_type: string;
  is_enabled: boolean;
  template_id: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailLog {
  id: string;
  recipient_email: string;
  recipient_id: string | null;
  template_id: string | null;
  event_type: string;
  subject: string;
  status: string;
  resend_message_id: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  delivered_at: string | null;
}

export interface SMSLog {
  id: string;
  recipient_phone: string;
  recipient_id: string | null;
  event_type: string;
  message_body: string;
  status: string;
  provider: string;
  provider_message_id: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  delivered_at: string | null;
}

interface AdminNotificationState {
  settings: NotificationSetting[];
  emailLogs: EmailLog[];
  smsLogs: SMSLog[];
  loading: boolean;
  logsLoading: boolean;
  error: string | null;

  fetchSettings: () => Promise<void>;
  toggleSetting: (id: string, enabled: boolean) => Promise<void>;
  bulkToggleChannel: (channel: string, enabled: boolean) => Promise<void>;
  seedDefaults: () => Promise<void>;

  fetchEmailLogs: (limit?: number) => Promise<void>;
  fetchSMSLogs: (limit?: number) => Promise<void>;
}

const DEFAULT_SETTINGS: { channel: string; event_type: string; is_enabled: boolean }[] = [
  // Email
  { channel: 'email', event_type: 'order_placed', is_enabled: true },
  { channel: 'email', event_type: 'order_confirmed', is_enabled: true },
  { channel: 'email', event_type: 'order_shipped', is_enabled: true },
  { channel: 'email', event_type: 'order_delivered', is_enabled: true },
  { channel: 'email', event_type: 'order_cancelled', is_enabled: true },
  { channel: 'email', event_type: 'payment_received', is_enabled: true },
  { channel: 'email', event_type: 'refund_processed', is_enabled: true },
  { channel: 'email', event_type: 'welcome', is_enabled: true },
  { channel: 'email', event_type: 'password_reset', is_enabled: true },
  { channel: 'email', event_type: 'marketing_blast', is_enabled: false },
  { channel: 'email', event_type: 'abandoned_cart', is_enabled: false },
  { channel: 'email', event_type: 'order_ready_to_ship', is_enabled: true },
  { channel: 'email', event_type: 'order_out_for_delivery', is_enabled: true },
  { channel: 'email', event_type: 'order_failed_delivery', is_enabled: true },
  { channel: 'email', event_type: 'order_returned', is_enabled: true },
  { channel: 'email', event_type: 'partial_refund', is_enabled: true },
  { channel: 'email', event_type: 'payment_failed', is_enabled: false },
  { channel: 'email', event_type: 'digital_receipt', is_enabled: true },
  // SMS (disabled until provider configured)
  { channel: 'sms', event_type: 'order_placed', is_enabled: false },
  { channel: 'sms', event_type: 'order_confirmed', is_enabled: false },
  { channel: 'sms', event_type: 'order_shipped', is_enabled: false },
  { channel: 'sms', event_type: 'order_delivered', is_enabled: false },
  { channel: 'sms', event_type: 'order_cancelled', is_enabled: false },
  { channel: 'sms', event_type: 'payment_received', is_enabled: false },
  { channel: 'sms', event_type: 'refund_processed', is_enabled: false },
  { channel: 'sms', event_type: 'welcome', is_enabled: false },
  { channel: 'sms', event_type: 'password_reset', is_enabled: false },
  { channel: 'sms', event_type: 'marketing_blast', is_enabled: false },
  { channel: 'sms', event_type: 'abandoned_cart', is_enabled: false },
  { channel: 'sms', event_type: 'order_ready_to_ship', is_enabled: false },
  { channel: 'sms', event_type: 'order_out_for_delivery', is_enabled: false },
  { channel: 'sms', event_type: 'order_failed_delivery', is_enabled: false },
  { channel: 'sms', event_type: 'order_returned', is_enabled: false },
  { channel: 'sms', event_type: 'partial_refund', is_enabled: false },
  { channel: 'sms', event_type: 'payment_failed', is_enabled: false },
  { channel: 'sms', event_type: 'digital_receipt', is_enabled: false },
  // Push
  { channel: 'push', event_type: 'order_placed', is_enabled: true },
  { channel: 'push', event_type: 'order_confirmed', is_enabled: true },
  { channel: 'push', event_type: 'order_shipped', is_enabled: true },
  { channel: 'push', event_type: 'order_delivered', is_enabled: true },
  { channel: 'push', event_type: 'order_cancelled', is_enabled: true },
  { channel: 'push', event_type: 'payment_received', is_enabled: true },
  { channel: 'push', event_type: 'refund_processed', is_enabled: true },
  { channel: 'push', event_type: 'welcome', is_enabled: false },
  { channel: 'push', event_type: 'password_reset', is_enabled: false },
  { channel: 'push', event_type: 'marketing_blast', is_enabled: false },
  { channel: 'push', event_type: 'abandoned_cart', is_enabled: false },
  { channel: 'push', event_type: 'order_ready_to_ship', is_enabled: true },
  { channel: 'push', event_type: 'order_out_for_delivery', is_enabled: true },
  { channel: 'push', event_type: 'order_failed_delivery', is_enabled: true },
  { channel: 'push', event_type: 'order_returned', is_enabled: true },
  { channel: 'push', event_type: 'partial_refund', is_enabled: false },
  { channel: 'push', event_type: 'payment_failed', is_enabled: true },
  { channel: 'push', event_type: 'digital_receipt', is_enabled: false },
];

export const useAdminNotifications = create<AdminNotificationState>((set, get) => ({
  settings: [],
  emailLogs: [],
  smsLogs: [],
  loading: false,
  logsLoading: false,
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .order('channel')
      .order('event_type');

    if (error) {
      console.error('[AdminNotifications] fetchSettings error:', error.message);
      set({ loading: false, error: error.message });
      return;
    }
    set({ settings: (data ?? []) as NotificationSetting[], loading: false });
  },

  toggleSetting: async (id: string, enabled: boolean) => {
    const { error } = await supabase
      .from('notification_settings')
      .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      set({
        settings: get().settings.map((s) =>
          s.id === id ? { ...s, is_enabled: enabled } : s,
        ),
      });
    }
  },

  bulkToggleChannel: async (channel: string, enabled: boolean) => {
    const { error } = await supabase
      .from('notification_settings')
      .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
      .eq('channel', channel);

    if (!error) {
      set({
        settings: get().settings.map((s) =>
          s.channel === channel ? { ...s, is_enabled: enabled } : s,
        ),
      });
    }
  },

  seedDefaults: async () => {
    set({ loading: true, error: null });
    const { error } = await supabase
      .from('notification_settings')
      .upsert(
        DEFAULT_SETTINGS.map((s) => ({
          channel: s.channel,
          event_type: s.event_type,
          is_enabled: s.is_enabled,
        })),
        { onConflict: 'channel,event_type', ignoreDuplicates: true }
      );

    if (error) {
      console.error('[AdminNotifications] seedDefaults error:', error.message);
      set({ loading: false, error: error.message });
      return;
    }
    // Re-fetch to get the inserted rows with IDs
    await get().fetchSettings();
  },

  fetchEmailLogs: async (limit = 100) => {
    set({ logsLoading: true });
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data) {
      set({ emailLogs: data as EmailLog[] });
    }
    set({ logsLoading: false });
  },

  fetchSMSLogs: async (limit = 100) => {
    set({ logsLoading: true });
    const { data, error } = await supabase
      .from('sms_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data) {
      set({ smsLogs: data as SMSLog[] });
    }
    set({ logsLoading: false });
  },
}));
