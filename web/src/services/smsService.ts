/**
 * SMS Service
 *
 * Client-side service for sending SMS via the send-sms edge function.
 * API-ready — currently logs as disabled when no SMS provider is configured.
 */

import { supabase } from '@/lib/supabase';

export interface SendSMSParams {
  to: string;
  message: string;
  eventType: string;
  recipientId?: string;
  metadata?: Record<string, unknown>;
}

export interface SendSMSResult {
  sent: boolean;
  provider?: string;
  messageId?: string;
  reason?: string;
  error?: string;
}

class SMSService {
  private static instance: SMSService;

  static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService();
    }
    return SMSService.instance;
  }

  /**
   * Send an SMS via the send-sms edge function.
   */
  async sendSMS(params: SendSMSParams): Promise<SendSMSResult> {
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: {
        to: params.to,
        message: params.message,
        event_type: params.eventType,
        recipient_id: params.recipientId,
        metadata: params.metadata,
      },
    });

    if (error) {
      console.error('[SMSService] Edge function error:', error.message);
      return { sent: false, error: error.message };
    }

    return data as SendSMSResult;
  }

  /**
   * Check if SMS is enabled for a given event type.
   */
  async isEnabled(eventType: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('is_enabled')
      .eq('channel', 'sms')
      .eq('event_type', eventType)
      .single();

    if (error || !data) return false;
    return data.is_enabled;
  }
}

export const smsService = SMSService.getInstance();
