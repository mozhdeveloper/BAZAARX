/**
 * Edge Function: unsubscribe
 *
 * One-click unsubscribe handler. Linked from marketing email footers
 * via: /functions/v1/unsubscribe?uid={user_id}&ch={channel}
 *
 * Compliance:
 *   BR-EMA-014  One-click unsubscribe within 10 business days (we process immediately)
 *   BR-EMA-016  Opt-out link in every commercial email
 *   BR-EMA-017  Honour unsubscribe requests — no re-add without explicit re-consent
 *   RA 10173     DPA Section 16 — right to withdraw consent
 *
 * Supports channels: email | sms | push
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const VALID_CHANNELS = ["email", "sms", "push"] as const;
type Channel = (typeof VALID_CHANNELS)[number];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const uid = url.searchParams.get("uid") ?? "";
  const ch = url.searchParams.get("ch") ?? "";

  // ── Input validation ───────────────────────────────────────────────────
  if (!uid || uid.length < 10) {
    return htmlResponse(errorPage("Invalid unsubscribe link — missing user identifier."));
  }

  if (!VALID_CHANNELS.includes(ch as Channel)) {
    return htmlResponse(errorPage(`Invalid channel '${ch}'. Expected: email, sms, or push.`));
  }

  const channel = ch as Channel;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Check the user actually exists ────────────────────────────────────
  const { data: userRow } = await supabase
    .from("profiles")
    .select("id, first_name")
    .eq("id", uid)
    .maybeSingle();

  if (!userRow) {
    return htmlResponse(errorPage("Invalid unsubscribe link — user not found."));
  }

  // ── Update or create consent record ───────────────────────────────────
  const { error: upsertError } = await supabase
    .from("user_consent")
    .upsert(
      {
        user_id: uid,
        channel: channel,
        is_consented: false,
        consent_source: "settings",
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,channel" },
    );

  if (upsertError) {
    console.error("[unsubscribe] Failed to update user_consent:", upsertError.message);
    return htmlResponse(errorPage("Something went wrong. Please try again later."));
  }

  // ── Append to consent_log (audit trail for DPA compliance) ───────────
  // Extract first valid IP from x-forwarded-for (may contain "ip1, ip2, ...")
  const rawIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const ipRegex = /^[\d.:a-fA-F]+$/;
  const validIp = rawIp && ipRegex.test(rawIp) ? rawIp : null;

  const { error: logErr } = await supabase.from("consent_log").insert({
    user_id: uid,
    channel: channel,
    action: "opt_out",
    source: "email_link",
    ip_address: validIp,
    user_agent: req.headers.get("user-agent") ?? null,
  });
  if (logErr) {
    console.error("[unsubscribe] consent_log insert failed:", logErr.message);
  }

  console.log(`[unsubscribe] User ${uid} unsubscribed from channel: ${channel}`);

  // ── Confirmation page ─────────────────────────────────────────────────
  const channelLabel = channel === "email" ? "marketing emails" :
    channel === "sms" ? "marketing SMS" : "push notifications";

  const appUrl = Deno.env.get("APP_URL") ?? "https://bazaar.ph";
  const settingsUrl = `${appUrl}/settings?tab=notifications`;

  return htmlResponse(successPage(channelLabel, settingsUrl));
});

// ---------------------------------------------------------------------------
// HTML page builders
// ---------------------------------------------------------------------------

function successPage(channelLabel: string, settingsUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Unsubscribed – BazaarX</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #FFF9F5;
      color: #2D2522;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
    }
    .card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      padding: 2.5rem 2rem;
      max-width: 440px;
      width: 100%;
      text-align: center;
    }
    .logo {
      font-size: 1.5rem;
      font-weight: 700;
      background: linear-gradient(90deg, #D97706, #B45309);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 1.5rem;
      display: inline-block;
    }
    .checkmark {
      width: 56px;
      height: 56px;
      background: #D97706;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
    }
    .checkmark svg { fill: none; stroke: #fff; stroke-width: 3; }
    h1 { font-size: 1.375rem; margin: 0 0 0.75rem; }
    p  { font-size: 0.9375rem; color: #6B5E59; margin: 0 0 1.5rem; line-height: 1.6; }
    a.btn {
      display: inline-block;
      padding: 0.625rem 1.25rem;
      background: #D97706;
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
    }
    a.btn:hover { background: #B45309; }
    .legal {
      margin-top: 2rem;
      font-size: 0.75rem;
      color: #9E8B85;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">BazaarX</div>
    <div class="checkmark">
      <svg viewBox="0 0 24 24" width="28" height="28">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>
    <h1>Successfully Unsubscribed</h1>
    <p>
      You have been removed from our <strong>${channelLabel}</strong> list.
      Please allow a few days for this to take effect across all queued messages.
    </p>
    <a class="btn" href="${settingsUrl}">Manage Notification Preferences</a>
    <p class="legal">
      If you change your mind, you can re-subscribe at any time from your account settings.<br/>
      In accordance with RA 10173 (Data Privacy Act of 2012).
    </p>
  </div>
</body>
</html>`;
}

function errorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Error – BazaarX</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #FFF9F5;
      color: #2D2522;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
    }
    .card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      padding: 2.5rem 2rem;
      max-width: 440px;
      width: 100%;
      text-align: center;
    }
    .logo {
      font-size: 1.5rem;
      font-weight: 700;
      background: linear-gradient(90deg, #D97706, #B45309);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      display: inline-block;
      margin-bottom: 1.5rem;
    }
    h1 { font-size: 1.25rem; margin: 0 0 0.75rem; }
    p  { color: #6B5E59; font-size: 0.9375rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">BazaarX</div>
    <h1>Unsubscribe Failed</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

function htmlResponse(html: string, status = 200) {
  return new Response(html, {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
