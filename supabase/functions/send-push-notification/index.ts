/**
 * Edge Function: send-push-notification
 *
 * Sends push notifications to one or more users via:
 *   1. Web Push protocol (VAPID)  â†’ for browser/PWA subscriptions stored as JSON tokens
 *   2. Expo Push API              â†’ for ExponentPushToken[...] mobile tokens
 *
 * Tokens in the `push_tokens` table are differentiated automatically:
 *   - Tokens starting with `{` are JSON-serialized PushSubscription objects (web)
 *   - Tokens starting with `ExponentPushToken[` (or `ExpoPushToken[`) are Expo (mobile)
 *
 * Required env / secrets:
 *   - SUPABASE_URL                  (auto-injected)
 *   - SUPABASE_SERVICE_ROLE_KEY     (auto-injected)
 *   - VAPID_PUBLIC_KEY              (must match the VITE_VAPID_PUBLIC_KEY shipped to the browser)
 *   - VAPID_PRIVATE_KEY             (kept secret â€” never ship to clients)
 *   - VAPID_SUBJECT                 (mailto:you@bazaar.ph or https://bazaar.ph)
 *
 * Request body:
 *   { userId: string;  title: string; body: string; data?: object }
 *   { userIds: string[]; title: string; body: string; data?: object }
 *   { tokens: string[]; title: string; body: string; data?: object }
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore - npm specifier resolved at runtime by Deno
import webpush from "npm:web-push@3.6.7";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExpoPushPayload {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  priority?: "default" | "normal" | "high";
  channelId?: string;
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface RequestBody {
  userId?: string;
  userIds?: string[];
  tokens?: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
  channelId?: string;
}

interface WebPushSubscriptionJSON {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXPO_PUSH_URL = "https://exp.host/--/exponent/api/v2/push/send";
const EXPO_PUSH_BATCH_SIZE = 100;

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT =
  Deno.env.get("VAPID_SUBJECT") || "mailto:support@bazaar.ph";

// Configure web-push once (no-op if keys are missing â€” web sends will be skipped)
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (err) {
    console.error("[push] Failed to set VAPID details:", err);
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const reqBody: RequestBody = await req.json();
    const { title, body: messageBody, data, badge, channelId } = reqBody;

    if (!title || !messageBody) {
      return jsonResponse({ error: "title and body are required" }, 400);
    }

    // â”€â”€ Resolve tokens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let pushTokens: string[] = [];

    if (reqBody.tokens && reqBody.tokens.length > 0) {
      pushTokens = reqBody.tokens;
    } else {
      const userIds: string[] = reqBody.userId
        ? [reqBody.userId]
        : (reqBody.userIds || []);

      if (userIds.length === 0) {
        return jsonResponse({ error: "Provide userId, userIds, or tokens" }, 400);
      }

      const { data: rows, error } = await supabase
        .from("push_tokens")
        .select("token")
        .in("user_id", userIds);

      if (error) {
        console.error("[push] DB error:", error.message);
        return jsonResponse({ error: "Failed to fetch push tokens" }, 500);
      }

      pushTokens = (rows || []).map((r: { token: string }) => r.token);
    }

    if (pushTokens.length === 0) {
      return jsonResponse({ sent: 0, message: "No push tokens registered" });
    }

    // â”€â”€ Split tokens by transport â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const expoTokens: string[] = [];
    const webSubscriptions: WebPushSubscriptionJSON[] = [];
    const webRawTokens: string[] = []; // keep original string so we can prune stale

    for (const t of pushTokens) {
      if (typeof t !== "string" || t.length === 0) continue;
      if (t.startsWith("{")) {
        try {
          const sub = JSON.parse(t) as WebPushSubscriptionJSON;
          if (sub && sub.endpoint && sub.keys?.p256dh && sub.keys?.auth) {
            webSubscriptions.push(sub);
            webRawTokens.push(t);
          }
        } catch {
          // skip malformed
        }
      } else if (isExpoPushToken(t)) {
        expoTokens.push(t);
      }
    }

    let sent = 0;
    const failedTokens: string[] = [];

    // â”€â”€ 1. Send Web Push (VAPID) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (webSubscriptions.length > 0) {
      if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        console.warn("[push] Web subscriptions present but VAPID keys not configured â€” skipping");
      } else {
        const webPayload = JSON.stringify({
          title,
          body: messageBody,
          data: data || {},
          icon: "/Logo.png",
          badge: "/Logo.png",
        });

        const results = await Promise.allSettled(
          webSubscriptions.map((sub) =>
            webpush.sendNotification(sub as any, webPayload, {
              TTL: 60 * 60 * 24,
              urgency: "high",
            }),
          ),
        );

        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          if (r.status === "fulfilled") {
            sent++;
          } else {
            const err = r.reason as { statusCode?: number; body?: string };
            const code = err?.statusCode;
            // 404/410 = subscription gone, prune it
            if (code === 404 || code === 410) {
              failedTokens.push(webRawTokens[i]);
            }
            console.warn(`[push][web] failed (status=${code ?? "?"}):`, err?.body || err);
          }
        }
      }
    }

    // â”€â”€ 2. Send Expo Push (mobile) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (expoTokens.length > 0) {
      const messages: ExpoPushPayload[] = expoTokens.map((token) => ({
        to: token,
        title,
        body: messageBody,
        data: data || {},
        sound: "default",
        badge: badge ?? 1,
        priority: "high",
        ...(channelId ? { channelId } : {}),
      }));

      for (let i = 0; i < messages.length; i += EXPO_PUSH_BATCH_SIZE) {
        const batch = messages.slice(i, i + EXPO_PUSH_BATCH_SIZE);
        const batchTokens = expoTokens.slice(i, i + EXPO_PUSH_BATCH_SIZE);

        const response = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
          },
          body: JSON.stringify(batch),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("[push][expo] API error:", response.status, errText);
          continue;
        }

        const result: { data: ExpoPushTicket[] } = await response.json();
        const tickets = result.data || [];

        for (let j = 0; j < tickets.length; j++) {
          const ticket = tickets[j];
          if (ticket.status === "ok") {
            sent++;
          } else {
            const detail = ticket.details?.error;
            if (detail === "DeviceNotRegistered") {
              failedTokens.push(batchTokens[j]);
            }
            console.warn("[push][expo] Ticket error:", ticket.message, detail);
          }
        }
      }
    }

    // â”€â”€ Prune stale tokens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (failedTokens.length > 0) {
      await supabase
        .from("push_tokens")
        .delete()
        .in("token", failedTokens);
      console.log(`[push] Removed ${failedTokens.length} stale token(s)`);
    }

    return jsonResponse({
      sent,
      total: webSubscriptions.length + expoTokens.length,
      web: webSubscriptions.length,
      expo: expoTokens.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[push] Unhandled error:", message);
    return jsonResponse({ error: message }, 500);
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isExpoPushToken(token: string): boolean {
  return (
    token.startsWith("ExponentPushToken[") ||
    token.startsWith("ExpoPushToken[")
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    },
  });
}

