/**
 * Edge Function: send-email
 *
 * Sends transactional and marketing emails via the Resend API.
 *
 * Compliance implemented in this version (BazaarX BR + Philippine law):
 *   BR-EMA-001  Category required (transactional | security | marketing)
 *   BR-EMA-003  Marketing consent check (user_consent table)
 *   BR-EMA-004  Unsubscribe honours — suppression check covers this
 *   BR-EMA-005  Quiet hours 21:00–08:00 PHT — marketing deferred to queue
 *   BR-EMA-006  Frequency limit ≤3 marketing emails/week per user
 *   BR-EMA-015  Template approval_status must be 'approved'
 *   BR-EMA-018  Legal footer auto-appended on marketing emails
 *   BR-EMA-019  3× retry with exponential backoff on 5xx failures
 *   BR-EMA-023  Full audit log to email_logs with category/timing
 *   BR-EMA-027  Email format validation before dispatch
 *   BR-EMA-028  Suppression list check before dispatch
 *   BR-EMA-041  Suppression blocks even consented users
 *   BR-EMA-042  queued_at / sent_at timestamps for SLA measurement
 *   RA 10173    Philippine Data Privacy Act — consent enforcement
 *   RA 10175    Cybercrime Prevention Act — anti-spam; legal footer
 *
 * Request body:
 * {
 *   to: string | string[];
 *   subject: string;
 *   html: string;
 *   text?: string;
 *   event_type: string;
 *   category?: 'transactional' | 'security' | 'marketing';  // defaults to 'transactional'
 *   recipient_id?: string;
 *   template_id?: string;
 *   metadata?: Record<string, any>;
 * }
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const RESEND_API_URL = "https://api.resend.com/emails";
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [0, 5_000, 15_000];

type EmailCategory = "transactional" | "security" | "marketing";

interface RequestBody {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  event_type: string;
  category?: EmailCategory;
  recipient_id?: string;
  template_id?: string;
  metadata?: Record<string, unknown>;
}

interface LogParams {
  recipient_email: string;
  recipient_id: string | null;
  template_id: string | null;
  event_type: string;
  subject: string;
  status: string;
  category: EmailCategory;
  queued_at: string;
  resend_message_id?: string;
  error_message?: string;
  sent_at?: string;
  retry_count?: number;
  metadata: Record<string, unknown>;
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body: RequestBody = await req.json();
    const { to, subject, html, text, event_type, recipient_id, template_id, metadata } = body;

    // ── Validate required fields ──
    if (!to || !subject || !html || !event_type) {
      return jsonResponse({ error: "to, subject, html, and event_type are required" }, 400);
    }

    // ── BR-EMA-001: Require valid category (default: transactional) ──
    const category: EmailCategory = body.category ?? "transactional";
    if (!["transactional", "security", "marketing"].includes(category)) {
      return jsonResponse({ error: "category must be transactional, security, or marketing" }, 400);
    }

    const recipients = Array.isArray(to) ? to : [to];
    const queuedAt = new Date().toISOString();

    const baseLog: Omit<LogParams, "status"> = {
      recipient_email: recipients.join(", "),
      recipient_id: recipient_id || null,
      template_id: template_id || null,
      event_type,
      subject,
      category,
      queued_at: queuedAt,
      metadata: metadata || {},
    };

    // ── BR-EMA-027: Email format validation ──
    for (const email of recipients) {
      if (!EMAIL_REGEX.test(email)) {
        await logEmail(supabase, { ...baseLog, status: "invalid_contact" });
        return jsonResponse({ sent: false, reason: `Invalid email format: ${email}` });
      }
    }

    // ── BR-EMA-028/039/041: Global suppression check (ALL categories) ──
    const { data: suppressed } = await supabase
      .from("suppression_list")
      .select("reason")
      .in("contact", recipients)
      .eq("contact_type", "email")
      .limit(1)
      .maybeSingle();

    if (suppressed) {
      await logEmail(supabase, { ...baseLog, status: "suppressed" });
      return jsonResponse({ sent: false, reason: `Recipient suppressed: ${suppressed.reason}` });
    }

    // ── Marketing-only compliance checks ──
    if (category === "marketing") {
      // BR-EMA-003: Consent required for marketing
      if (recipient_id) {
        const { data: consent } = await supabase
          .from("user_consent")
          .select("is_consented")
          .eq("user_id", recipient_id)
          .eq("channel", "email")
          .maybeSingle();

        if (!consent?.is_consented) {
          await logEmail(supabase, { ...baseLog, status: "no_consent" });
          return jsonResponse({ sent: false, reason: "User has not opted in to marketing emails" });
        }
      }

      // BR-EMA-005: Quiet hours 21:00–08:00 PHT (UTC+8)
      const phtHour = (new Date().getUTCHours() + 8) % 24;
      if (phtHour >= 21 || phtHour < 8) {
        await logEmail(supabase, { ...baseLog, status: "queued" });
        return jsonResponse({
          sent: false,
          reason: "Deferred: outside permitted hours (08:00–21:00 PHT). Will be dispatched by queue processor.",
        });
      }

      // BR-EMA-006: Frequency limit — max 3 marketing emails per user per week
      if (recipient_id) {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from("email_logs")
          .select("*", { count: "exact", head: true })
          .eq("recipient_id", recipient_id)
          .eq("category", "marketing")
          .in("status", ["sent", "queued", "delivered"])
          .gte("created_at", weekAgo);

        if ((count ?? 0) >= 3) {
          await logEmail(supabase, { ...baseLog, status: "frequency_exceeded" });
          return jsonResponse({ sent: false, reason: "Weekly marketing email limit reached (3 per week)" });
        }
      }
    }

    // ── Check notification_settings admin toggle ──
    const { data: setting } = await supabase
      .from("notification_settings")
      .select("is_enabled")
      .eq("channel", "email")
      .eq("event_type", event_type)
      .maybeSingle();

    if (setting && !setting.is_enabled) {
      await logEmail(supabase, { ...baseLog, status: "disabled" });
      return jsonResponse({ sent: false, reason: "Email notifications disabled for this event" });
    }

    // ── BR-EMA-015: Template approval check ──
    if (template_id) {
      const { data: tmpl } = await supabase
        .from("email_templates")
        .select("approval_status")
        .eq("id", template_id)
        .maybeSingle();

      if (tmpl?.approval_status && tmpl.approval_status !== "approved") {
        return jsonResponse(
          { error: `Template is not approved (status: ${tmpl.approval_status})` },
          400,
        );
      }
    }

    // ── Get Resend credentials ──
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("[send-email] RESEND_API_KEY not configured");
      return jsonResponse({ error: "Email service not configured" }, 500);
    }

    const senderEmail = Deno.env.get("SENDER_EMAIL") ?? "no-reply@bazaar.ph";
    const senderName = Deno.env.get("SENDER_NAME") ?? "BazaarX";

    // ── BR-EMA-018: Auto-append legal footer for marketing emails ──
    const finalHtml = category === "marketing"
      ? appendLegalFooter(html, recipient_id ?? "")
      : html;

    // ── BR-EMA-019: Send with 3× retry + exponential backoff ──
    let lastError = "";
    let messageId = "";
    let retryCount = 0;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      }
      retryCount = attempt;

      const res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${senderName} <${senderEmail}>`,
          reply_to: "support@bazaar.ph",
          to: recipients,
          subject,
          html: finalHtml,
          ...(text ? { text } : {}),
        }),
      });

      if (res.ok) {
        const result = await res.json();
        messageId = result.id;
        break;
      }

      lastError = await res.text();
      // Do not retry client errors (4xx) — only retry server/network errors (5xx)
      if (res.status >= 400 && res.status < 500) break;
    }

    const sentAt = new Date().toISOString();

    if (messageId) {
      await logEmail(supabase, {
        ...baseLog,
        status: "sent",
        resend_message_id: messageId,
        sent_at: sentAt,
        retry_count: retryCount,
      });

      console.log(`[send-email] Sent ${category}/${event_type} to ${recipients.join(", ")} — ID: ${messageId} (attempt ${retryCount + 1})`);
      return jsonResponse({ sent: true, message_id: messageId });
    } else {
      await logEmail(supabase, {
        ...baseLog,
        status: "failed",
        error_message: lastError,
        sent_at: sentAt,
        retry_count: retryCount,
      });

      console.error(`[send-email] Failed after ${retryCount + 1} attempt(s): ${lastError}`);
      return jsonResponse({ sent: false, error: lastError }, 500);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[send-email] Unhandled error:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function logEmail(
  supabase: ReturnType<typeof createClient>,
  params: Omit<LogParams, never>,
) {
  const { error } = await supabase.from("email_logs").insert({
    recipient_email: params.recipient_email,
    recipient_id: params.recipient_id,
    template_id: params.template_id,
    event_type: params.event_type,
    subject: params.subject,
    status: params.status,
    category: params.category,
    queued_at: params.queued_at,
    sent_at: params.sent_at ?? null,
    retry_count: params.retry_count ?? 0,
    resend_message_id: params.resend_message_id ?? null,
    error_message: params.error_message ?? null,
    metadata: params.metadata,
  });

  if (error) {
    console.error("[send-email] Failed to log email:", error.message);
  }
}

/**
 * BR-EMA-018: Append legally required footer to marketing emails.
 * Includes unsubscribe link (RA 10173) and anti-spam disclosure (RA 10175).
 */
function appendLegalFooter(html: string, userId: string): string {
  const appUrl = Deno.env.get("APP_URL") ?? "https://bazaar.ph";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const unsubscribeUrl = `${supabaseUrl}/functions/v1/unsubscribe?uid=${encodeURIComponent(userId)}&ch=email`;
  const preferencesUrl = `${appUrl}/settings/notifications`;

  const footer = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:16px;text-align:center;border-top:1px solid #e5e7eb">
  <p style="margin:0 0 6px;font-size:12px;color:#9ca3af">
    You are receiving this email because you opted in to promotional communications from BazaarX.
  </p>
  <p style="margin:0 0 6px;font-size:12px;color:#9ca3af">
    <a href="${unsubscribeUrl}" style="color:#D97706;text-decoration:underline">Unsubscribe</a>
    &nbsp;&middot;&nbsp;
    <a href="${preferencesUrl}" style="color:#D97706;text-decoration:underline">Manage Preferences</a>
  </p>
  <p style="margin:0;font-size:11px;color:#c0c0c0">
    BazaarX &middot; Philippines &middot;
    Compliant with RA&nbsp;10173 (Data Privacy Act) &amp; RA&nbsp;10175 (Cybercrime Prevention Act)
  </p>
</div>`;

  // Insert footer just before </body> — works with all current BazaarX templates
  if (html.includes("</body>")) {
    return html.replace("</body>", footer + "</body>");
  }
  return html + footer;
}

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
