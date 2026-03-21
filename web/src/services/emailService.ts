/**
 * Email Service
 *
 * Client-side service for sending emails via the send-email edge function.
 * Handles template rendering and transactional email dispatch.
 */

import { supabase } from '@/lib/supabase';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  eventType: string;
  category?: 'transactional' | 'security' | 'marketing';
  recipientId?: string;
  templateId?: string;
  metadata?: Record<string, unknown>;
}

export interface SendEmailResult {
  sent: boolean;
  messageId?: string;
  reason?: string;
  error?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  subject: string;
  html_body: string;
  text_body: string | null;
  variables: string[];
  category: 'transactional' | 'marketing' | 'system';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

class EmailService {
  private static instance: EmailService;

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Send an email via the send-email edge function.
   * Uses direct fetch with the anon key — no JWT/session required
   * (edge function is deployed with --no-verify-jwt).
   */
  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    console.log('[EmailService] ▶ sendEmail called', {
      to: params.to,
      subject: params.subject,
      eventType: params.eventType,
      category: params.category ?? 'transactional',
    });

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      console.error('[EmailService] ✖ Missing SUPABASE_URL or ANON_KEY env vars');
      return { sent: false, error: 'Email service misconfigured' };
    }

    const body = {
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      event_type: params.eventType,
      category: params.category,
      recipient_id: params.recipientId,
      template_id: params.templateId,
      metadata: params.metadata,
    };

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('[EmailService] ✖ send-email returned', response.status, errText);
        return { sent: false, error: `HTTP ${response.status}: ${errText}` };
      }

      const data = await response.json();
      console.log('[EmailService] ✔ Email sent:', data);
      return data as SendEmailResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[EmailService] ✖ fetch error:', msg);
      return { sent: false, error: msg };
    }
  }

  /**
   * Send a transactional email using a template slug.
   * Fetches the template, replaces variables, and sends.
   */
  async sendTemplatedEmail(params: {
    templateSlug: string;
    to: string;
    variables: Record<string, string>;
    recipientId?: string;
    eventType: string;
    metadata?: Record<string, unknown>;
  }): Promise<SendEmailResult> {
    console.log('[EmailService] ▶ sendTemplatedEmail', { slug: params.templateSlug, to: params.to, eventType: params.eventType });

    // Fetch template
    const { data: template, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('slug', params.templateSlug)
      .eq('is_active', true)
      .single();

    if (error || !template) {
      console.error('[EmailService] ✖ Template not found:', params.templateSlug, error?.message);
      return { sent: false, error: `Template "${params.templateSlug}" not found` };
    }

    console.log('[EmailService] Template loaded:', { id: template.id, subject: template.subject, category: template.category });

    // Render template with variables
    const rendered = this.renderTemplate(template.html_body, template.subject, params.variables);

    return this.sendEmail({
      to: params.to,
      subject: rendered.subject,
      html: rendered.html,
      eventType: params.eventType,
      category: template.category as 'transactional' | 'security' | 'marketing',
      recipientId: params.recipientId,
      templateId: template.id,
      metadata: params.metadata,
    });
  }

  /**
   * Replace {{variable}} placeholders in template strings.
   */
  renderTemplate(
    htmlBody: string,
    subject: string,
    variables: Record<string, string>,
  ): { subject: string; html: string } {
    let renderedHtml = htmlBody;
    let renderedSubject = subject;

    for (const [key, value] of Object.entries(variables)) {
      const escaped = this.escapeHtml(value);
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      renderedHtml = renderedHtml.replace(pattern, escaped);
      renderedSubject = renderedSubject.replace(pattern, value);
    }

    return { subject: renderedSubject, html: renderedHtml };
  }

  /**
   * Escape HTML to prevent XSS in email template rendering.
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Fetch all email templates.
   */
  async getTemplates(): Promise<EmailTemplate[]> {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('category')
      .order('name');

    if (error) {
      console.error('[EmailService] Failed to fetch templates:', error.message);
      return [];
    }

    return (data || []) as EmailTemplate[];
  }

  /**
   * Update an email template.
   */
  async updateTemplate(
    id: string,
    updates: Partial<Pick<EmailTemplate, 'name' | 'subject' | 'html_body' | 'text_body' | 'is_active'>>,
  ): Promise<boolean> {
    const { error } = await supabase
      .from('email_templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[EmailService] Failed to update template:', error.message);
      return false;
    }
    return true;
  }
}

export const emailService = EmailService.getInstance();
