/**
 * Edge Function: process-email-queue
 *
 * Processes marketing emails that were deferred due to quiet hours (BR-EMA-005).
 * Called on a schedule (e.g., pg_cron or Supabase scheduled invocations)
 * every 15 minutes during 08:00–21:00 PHT.
 *
 * Compliance:
 *   BR-EMA-005  Quiet hours 21:00–08:00 PHT — no marketing sends
 *   BR-EMA-003  Re-validate consent before sending
 *   BR-EMA-028  Re-validate suppression list before sending
 *   BR-EMA-006  Re-validate weekly frequency cap (3/week) before sending
 *
 * Setup (run in Supabase dashboard → SQL editor):
 *   SELECT cron.schedule(
 *     'process-email-queue',
 *     '* /15 8-20 * * *',   -- every 15 min from 08:00 to 20:59 UTC+8
 *     $$
 *       SELECT net.http_post(
 *         url := 'https://<project>.supabase.co/functions/v1/process-email-queue',
 *         headers := '{"Authorization":"Bearer <anon_key>","Content-Type":"application/json"}'::jsonb,
 *         body := '{}'::jsonb
 *       )
 *     $$
 *   );
 *
 * Note: pg_cron runs in UTC. 08:00–21:00 PHT = 00:00–13:00 UTC.
 * Adjust cron expression accordingly for your timezone:
 *   '* /15 0-12 * * *'  (UTC, covers 08:00–21:00 PHT)
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/** Maximum emails to process per invocation (prevents timeout) */
const BATCH_SIZE = 50;

/** Maximum age for a queued email — don't send emails queued > 24h ago */
const MAX_QUEUE_AGE_HOURS = 24;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Check current PHT time (UTC+8) ────────────────────────────────────
  const nowUtc = new Date();
  const phtHour = (nowUtc.getUTCHours() + 8) % 24;

  if (phtHour < 8 || phtHour >= 21) {
    console.log(`[process-email-queue] Still in quiet hours (PHT ${phtHour}:xx). Skipping.`);
    return jsonResponse({
      processed: 0,
      skipped: 0,
      reason: "quiet_hours",
      pht_hour: phtHour,
    });
  }

  // ── Fetch queued marketing emails (oldest first) ───────────────────────
  const cutoffTime = new Date(Date.now() - MAX_QUEUE_AGE_HOURS * 60 * 60 * 1000).toISOString();

  const { data: queuedEmails, error: fetchError } = await supabase
    .from("email_logs")
    .select("id, recipient_email, recipient_id, template_id, metadata, event_type")
    .eq("status", "queued")
    .eq("category", "marketing")
    .gte("created_at", cutoffTime)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error("[process-email-queue] Failed to fetch queued emails:", fetchError.message);
    return jsonResponse({ error: "Failed to fetch queue" }, 500);
  }

  if (!queuedEmails || queuedEmails.length === 0) {
    console.log("[process-email-queue] No queued marketing emails to process.");
    return jsonResponse({ processed: 0, skipped: 0 });
  }

  console.log(`[process-email-queue] Processing ${queuedEmails.length} queued email(s) at PHT ${phtHour}:xx`);

  let processedCount = 0;
  let skippedCount = 0;

  for (const logRow of queuedEmails) {
    const recipientEmail = logRow.recipient_email as string;
    const recipientId = logRow.recipient_id as string | null;

    // ── Re-validate: suppression check ──────────────────────────────
    const { data: suppressed } = await supabase
      .from("suppression_list")
      .select("id")
      .eq("contact", recipientEmail)
      .eq("contact_type", "email")
      .maybeSingle();

    if (suppressed) {
      await markSkipped(supabase, logRow.id, "suppressed");
      skippedCount++;
      console.log(`[process-email-queue] ${recipientEmail} is suppressed — skipping`);
      continue;
    }

    // ── Re-validate: consent check ───────────────────────────────────
    if (recipientId) {
      const { data: consentRow } = await supabase
        .from("user_consent")
        .select("is_consented")
        .eq("user_id", recipientId)
        .eq("channel", "email")
        .maybeSingle();

      if (!consentRow?.is_consented) {
        await markSkipped(supabase, logRow.id, "no_consent");
        skippedCount++;
        console.log(`[process-email-queue] ${recipientEmail} has no consent — skipping`);
        continue;
      }

      // ── Re-validate: frequency cap (3 marketing/week) ─────────────
      const { data: weeklyCount } = await supabase.rpc("get_weekly_marketing_send_count", {
        p_user_id: recipientId,
      });

      if ((weeklyCount ?? 0) >= 3) {
        await markSkipped(supabase, logRow.id, "frequency_exceeded");
        skippedCount++;
        console.log(`[process-email-queue] ${recipientEmail} hit frequency cap — skipping`);
        continue;
      }
    }

    // ── Re-check notification settings ──────────────────────────────
    if (recipientId) {
      const { data: notifSettings } = await supabase
        .from("notification_settings")
        .select("is_enabled")
        .eq("user_id", recipientId)
        .maybeSingle();

      if (notifSettings && notifSettings.is_enabled === false) {
        await markSkipped(supabase, logRow.id, "disabled");
        skippedCount++;
        console.log(`[process-email-queue] ${recipientEmail} has notifications disabled — skipping`);
        continue;
      }
    }

    // ── Retrieve the original template to reconstruct email content ──
    const templateId = logRow.template_id as string | null;
    const metadata = logRow.metadata as Record<string, unknown> | null;

    let emailHtml = metadata?.["html"] as string | undefined;
    let emailSubject = metadata?.["subject"] as string | undefined;

    if (!emailHtml && templateId) {
      const { data: template } = await supabase
        .from("email_templates")
        .select("html_content, subject")
        .eq("id", templateId)
        .maybeSingle();

      emailHtml = template?.html_content;
      emailSubject = template?.subject;
    }

    if (!emailHtml || !emailSubject) {
      console.error(`[process-email-queue] Cannot reconstruct email for log ${logRow.id} — missing html/subject`);
      await markSkipped(supabase, logRow.id, "failed");
      skippedCount++;
      continue;
    }

    // ── Dispatch via send-email edge function ────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          to: recipientEmail,
          subject: emailSubject,
          html: emailHtml,
          event_type: logRow.event_type ?? "queued_marketing",
          category: "marketing",
          recipient_id: recipientId,
          template_id: templateId,
          metadata: metadata,
        }),
      });

      if (response.ok) {
        // Mark the original queued log as merged/superseded (new log will be created by send-email)
        await supabase
          .from("email_logs")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", logRow.id);

        processedCount++;
        console.log(`[process-email-queue] Dispatched email to ${recipientEmail}`);
      } else {
        const errBody = await response.text();
        console.error(`[process-email-queue] send-email returned ${response.status} for ${recipientEmail}: ${errBody}`);
        await markSkipped(supabase, logRow.id, "failed");
        skippedCount++;
      }
    } catch (err) {
      console.error(`[process-email-queue] Network error dispatching to ${recipientEmail}:`, err);
      await markSkipped(supabase, logRow.id, "failed");
      skippedCount++;
    }

    // Brief pause between sends to avoid rate-limit spikes
    await sleep(200);
  }

  console.log(`[process-email-queue] Done. Processed: ${processedCount}, Skipped: ${skippedCount}`);
  return jsonResponse({ processed: processedCount, skipped: skippedCount });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function markSkipped(
  supabase: ReturnType<typeof createClient>,
  logId: string,
  status: string,
) {
  await supabase
    .from("email_logs")
    .update({ status })
    .eq("id", logId);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
