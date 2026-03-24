/**
 * Email Service (Mobile)
 *
 * Sends emails via the Supabase `send-email` edge function using a direct
 * fetch() call with the anon key — no JWT required (function is deployed
 * with --no-verify-jwt).
 *
 * Templates are fetched from the email_templates table, rendered client-side,
 * then the pre-rendered HTML is sent to the edge function — same approach as web.
 */

import { supabase } from '../lib/supabase';

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
  reason?: string;
  error?: string;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

interface EmailTemplateRecord {
  id: string;
  subject: string;
  html_body: string;
  category: string | null;
}

class EmailService {
  private static instance: EmailService;

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendTemplatedEmail(params: SendTemplatedEmailParams): Promise<SendEmailResult> {
    if (!params.to || !params.to.includes('@')) {
      console.warn('[EmailService] Invalid or empty recipient email — skipping', { to: params.to, slug: params.templateSlug });
      return { sent: false, error: 'No valid recipient email address' };
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('[EmailService] Missing Supabase env vars');
      return { sent: false, error: 'Email service misconfigured' };
    }

    // Fetch template from email_templates table
    const { data: template, error: tplError } = await (supabase as any)
      .from('email_templates')
      .select('*')
      .eq('slug', params.templateSlug)
      .eq('is_active', true)
      .single();

    const typedTemplate = template as EmailTemplateRecord | null;

    if (tplError || !typedTemplate) {
      console.error('[EmailService] Template not found:', params.templateSlug, tplError?.message);
      return { sent: false, error: `Template "${params.templateSlug}" not found` };
    }

    // Render template with variables
    const variables = params.variables || {};
    let renderedHtml = typedTemplate.html_body;
    let renderedSubject = typedTemplate.subject;
    for (const [key, value] of Object.entries(variables)) {
      // Variables ending in _html or named 'content' contain trusted HTML — skip escaping
      const isHtml = key.endsWith('_html') || key === 'content';
      const safe = isHtml ? value : this.escapeHtml(value);
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      renderedHtml = renderedHtml.replace(pattern, safe);
      renderedSubject = renderedSubject.replace(pattern, value);
    }

    // Send pre-rendered HTML to edge function (matches expected payload format)
    const body = {
      to: params.to,
      subject: renderedSubject,
      html: renderedHtml,
      event_type: params.eventType,
      category: typedTemplate.category || 'transactional',
      recipient_id: params.recipientId,
      template_id: typedTemplate.id,
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

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export const emailService = EmailService.getInstance();
