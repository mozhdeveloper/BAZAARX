/**
 * Edge Function: email-webhook
 *
 * Receives Resend webhook events and processes them for:
 *   BR-EMA-026  Open/click/delivery tracking (email_events table)
 *   BR-EMA-030  Hard bounce → immediate suppression (suppression_list)
 *   BR-EMA-031  Soft bounce → log for retry evaluation
 *   BR-EMA-032  3× consecutive soft bounces → convert to hard suppression
 *   BR-EMA-039  Spam complaint → suppression_list
 *
 * Resend webhook events handled:
 *   email.sent, email.delivered, email.opened, email.clicked,
 *   email.bounced, email.complained, email.delivery_delayed
 *
 * Security: Validates Resend webhook signature (SVIX) when
 *   RESEND_WEBHOOK_SECRET is configured.
 *
 * Setup:
 *   1. In Resend dashboard: Domains → Webhooks → Add endpoint
 *   2. URL: https://<project>.supabase.co/functions/v1/email-webhook
 *   3. Events: select all
 *   4. Copy signing secret → supabase secrets set RESEND_WEBHOOK_SECRET=<secret>
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
    bounce?: {
      message: string;
    };
    [key: string]: unknown;
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const rawBody = await req.text();

  // ── Validate Resend webhook signature (SVIX) if secret is configured ──
  const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  if (webhookSecret) {
    const svixId = req.headers.get("svix-id") ?? "";
    const svixTimestamp = req.headers.get("svix-timestamp") ?? "";
    const svixSignature = req.headers.get("svix-signature") ?? "";

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.warn("[email-webhook] Missing Svix headers — rejecting request");
      return jsonResponse({ error: "Missing webhook signature headers" }, 401);
    }

    // Reconstruct the signed content: "{svix-id}.{svix-timestamp}.{body}"
    const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
    const encoder = new TextEncoder();

    // SVIX uses base64-encoded secret (prefixed "whsec_")
    const secretBase64 = webhookSecret.replace(/^whsec_/, "");
    const secretBytes = base64Decode(secretBase64);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(signedContent));
    const computedSig = "v1," + btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

    // svix-signature can be comma-separated list of "v1,<sig>" entries
    const signatures = svixSignature.split(" ");
    const valid = signatures.some((s) => s === computedSig);
    if (!valid) {
      console.warn("[email-webhook] Invalid webhook signature");
      return jsonResponse({ error: "Invalid signature" }, 401);
    }
  }

  let event: ResendWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const resendMessageId = event.data?.email_id ?? null;
  const occurredAt = event.created_at ?? new Date().toISOString();

  console.log(`[email-webhook] Event: ${event.type} | message_id: ${resendMessageId}`);

  // Find the corresponding email_log entry (if any)
  let emailLogId: string | null = null;
  if (resendMessageId) {
    const { data: logRow } = await supabase
      .from("email_logs")
      .select("id")
      .eq("resend_message_id", resendMessageId)
      .maybeSingle();
    emailLogId = logRow?.id ?? null;
  }

  switch (event.type) {
    // ── Delivery confirmation ──────────────────────────────────────────────
    case "email.delivered": {
      if (emailLogId) {
        await supabase
          .from("email_logs")
          .update({ status: "delivered", delivered_at: occurredAt })
          .eq("id", emailLogId);
      }
      await insertEmailEvent(supabase, emailLogId, resendMessageId, "delivered", event.data, occurredAt);
      break;
    }

    // ── Open tracking (BR-EMA-026) ────────────────────────────────────────
    case "email.opened": {
      await insertEmailEvent(supabase, emailLogId, resendMessageId, "opened", event.data, occurredAt);
      // Update open count on campaign if this email has a campaign ID in metadata
      if (emailLogId) {
        const { data: logRow } = await supabase
          .from("email_logs")
          .select("metadata")
          .eq("id", emailLogId)
          .maybeSingle();
        const campaignId = (logRow?.metadata as Record<string, unknown>)?.campaign_id as string | undefined;
        if (campaignId) {
          await supabase.rpc("increment_campaign_metric", {
            p_campaign_id: campaignId,
            p_field: "total_opened",
          });
        }
      }
      break;
    }

    // ── Click tracking (BR-EMA-026) ────────────────────────────────────────
    case "email.clicked": {
      await insertEmailEvent(supabase, emailLogId, resendMessageId, "clicked", event.data, occurredAt);
      break;
    }

    // ── Bounce handling (BR-EMA-030/031/032) ──────────────────────────────
    case "email.bounced": {
      const recipientEmail = Array.isArray(event.data.to) ? event.data.to[0] : (event.data.to ?? "");
      const bounceMessage = (event.data.bounce?.message ?? "").toLowerCase();

      // Classify bounce type: hard bounces indicate a permanent failure
      // Resend typically reports "hard" for invalid addresses, "soft" for temp failures
      const isHard = bounceMessage.includes("invalid") ||
        bounceMessage.includes("does not exist") ||
        bounceMessage.includes("no such user") ||
        bounceMessage.includes("permanent") ||
        bounceMessage.includes("550") ||
        bounceMessage.includes("551") ||
        bounceMessage.includes("553");

      const bounceType = isHard ? "hard" : "soft";

      // Log the bounce
      await supabase.from("bounce_logs").insert({
        email: recipientEmail,
        bounce_type: bounceType,
        reason: bounceMessage || "Unknown",
        resend_event_id: resendMessageId,
        logged_at: occurredAt,
      });

      if (emailLogId) {
        await supabase
          .from("email_logs")
          .update({ status: "bounced" })
          .eq("id", emailLogId);
      }

      await insertEmailEvent(supabase, emailLogId, resendMessageId, "bounced", event.data, occurredAt);

      if (isHard) {
        // BR-EMA-030: Hard bounce → immediate suppression
        console.log(`[email-webhook] Hard bounce for ${recipientEmail} — suppressing immediately`);
        await supabase.from("suppression_list").upsert({
          contact: recipientEmail,
          contact_type: "email",
          reason: "hard_bounce",
        }, { onConflict: "contact,contact_type" });
      } else {
        // BR-EMA-031/032: Soft bounce — check if 3× threshold reached
        console.log(`[email-webhook] Soft bounce for ${recipientEmail} — checking threshold`);
        await supabase.rpc("check_and_suppress_soft_bounce", { p_email: recipientEmail });
      }
      break;
    }

    // ── Spam complaint → immediate suppression ────────────────────────────
    case "email.complained": {
      const recipientEmail = Array.isArray(event.data.to) ? event.data.to[0] : (event.data.to ?? "");
      console.log(`[email-webhook] Spam complaint from ${recipientEmail} — suppressing`);

      await supabase.from("suppression_list").upsert({
        contact: recipientEmail,
        contact_type: "email",
        reason: "spam_complaint",
      }, { onConflict: "contact,contact_type" });

      await insertEmailEvent(supabase, emailLogId, resendMessageId, "complained", event.data, occurredAt);
      break;
    }

    // ── Delivery delay (logging only) ─────────────────────────────────────
    case "email.delivery_delayed": {
      await insertEmailEvent(supabase, emailLogId, resendMessageId, "delivery_delayed", event.data, occurredAt);
      break;
    }

    case "email.sent": {
      // Resend confirmed it accepted the email — update status if still 'queued'
      if (emailLogId) {
        await supabase
          .from("email_logs")
          .update({ status: "sent", sent_at: occurredAt })
          .eq("id", emailLogId)
          .eq("status", "queued");
      }
      break;
    }

    default:
      console.log(`[email-webhook] Unhandled event type: ${event.type}`);
  }

  return jsonResponse({ received: true, event_type: event.type });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function insertEmailEvent(
  supabase: ReturnType<typeof createClient>,
  emailLogId: string | null,
  resendMessageId: string | null,
  eventType: string,
  data: Record<string, unknown>,
  occurredAt: string,
) {
  const { error } = await supabase.from("email_events").insert({
    email_log_id: emailLogId,
    resend_message_id: resendMessageId,
    event_type: eventType,
    metadata: data,
    occurred_at: occurredAt,
  });
  if (error) {
    console.error(`[email-webhook] Failed to insert email_event (${eventType}):`, error.message);
  }
}

function base64Decode(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
