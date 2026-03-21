/**
 * Email Service (Mobile)
 *
 * Sends emails via the Supabase `send-email` edge function using a direct
 * fetch() call with the anon key — no JWT required (function is deployed
 * with --no-verify-jwt).
 */

export interface SendTemplatedEmailParams {
  templateSlug: string;
  to: string;
  eventType: string;
  recipientId?: string;
  variables?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface SendEmailResult {
  sent: boolean;
  messageId?: string;
  error?: string;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

class EmailService {
  private static instance: EmailService;

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendTemplatedEmail(params: SendTemplatedEmailParams): Promise<SendEmailResult> {
    if (!params.to) {
      return { sent: false, error: 'No recipient email address' };
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('[EmailService] Missing Supabase env vars');
      return { sent: false, error: 'Email service misconfigured' };
    }

    const body = {
      template_slug: params.templateSlug,
      to: params.to,
      event_type: params.eventType,
      recipient_id: params.recipientId,
      variables: params.variables,
      metadata: params.metadata,
    };

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        console.error(`[EmailService] send-email returned ${response.status}:`, text);
        return { sent: false, error: `HTTP ${response.status}` };
      }

      const result = await response.json();
      console.log('[EmailService] Email sent:', params.templateSlug, '→', params.to);
      return { sent: true, messageId: result?.id ?? result?.messageId };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[EmailService] fetch error:', msg);
      return { sent: false, error: msg };
    }
  }
}

export const emailService = EmailService.getInstance();
