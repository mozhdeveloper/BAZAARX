/**
 * Edge Function: send-push-notification
 *
 * Sends push notifications to one or more users via the Expo Push API.
 * Supports iOS (APNs) and Android (FCM) through Expo's unified service.
 *
 * Request body:
 *   { userId: string; title: string; body: string; data?: Record<string,any> }
 *   OR
 *   { userIds: string[]; title: string; body: string; data?: Record<string,any> }
 *   OR
 *   { tokens: string[]; title: string; body: string; data?: Record<string,any> }
 *
 * Expo Push API docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PushNotificationPayload {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  priority?: "default" | "normal" | "high";
  channelId?: string;  // Android channel
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;            // receipt ID when status = "ok"
  message?: string;       // error message
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXPO_PUSH_URL = "https://exp.host/--/exponent/api/v2/push/send";
const EXPO_PUSH_BATCH_SIZE = 100;  // Expo max per request

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body: RequestBody = await req.json();
    const { title, body: messageBody, data, badge, channelId } = body;

    if (!title || !messageBody) {
      return jsonResponse({ error: "title and body are required" }, 400);
    }

    // ── Resolve tokens ────────────────────────────────────────────────────

    let pushTokens: string[] = [];

    if (body.tokens && body.tokens.length > 0) {
      // Caller supplied tokens directly
      pushTokens = body.tokens;
    } else {
      // Look up push_tokens by user ID(s)
      const userIds: string[] = body.userId
        ? [body.userId]
        : (body.userIds || []);

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

    // Filter to valid Expo tokens only
    const validTokens = pushTokens.filter(isExpoPushToken);

    if (validTokens.length === 0) {
      return jsonResponse({ sent: 0, message: "No valid Expo push tokens" });
    }

    // ── Send in batches ───────────────────────────────────────────────────

    const messages: PushNotificationPayload[] = validTokens.map((token) => ({
      to: token,
      title,
      body: messageBody,
      data: data || {},
      sound: "default",
      badge: badge ?? 1,
      priority: "high",
      ...(channelId ? { channelId } : {}),
    }));

    let totalSent = 0;
    const failedTokens: string[] = [];

    for (let i = 0; i < messages.length; i += EXPO_PUSH_BATCH_SIZE) {
      const batch = messages.slice(i, i + EXPO_PUSH_BATCH_SIZE);
      const batchTokens = validTokens.slice(i, i + EXPO_PUSH_BATCH_SIZE);

      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[push] Expo API error:", response.status, errText);
        continue;
      }

      const result: { data: ExpoPushTicket[] } = await response.json();
      const tickets = result.data || [];

      for (let j = 0; j < tickets.length; j++) {
        const ticket = tickets[j];
        if (ticket.status === "ok") {
          totalSent++;
        } else {
          const detail = ticket.details?.error;
          if (detail === "DeviceNotRegistered") {
            // Token is stale — remove it from DB
            failedTokens.push(batchTokens[j]);
          }
          console.warn("[push] Ticket error:", ticket.message, detail);
        }
      }
    }

    // Remove stale tokens
    if (failedTokens.length > 0) {
      await supabase
        .from("push_tokens")
        .delete()
        .in("token", failedTokens);
      console.log(`[push] Removed ${failedTokens.length} stale token(s)`);
    }

    return jsonResponse({ sent: totalSent, total: validTokens.length });
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
    token.startsWith("ExpoPushToken[") ||
    /^[a-zA-Z0-9_-]{20,}$/.test(token)  // FCM/APNs device tokens sent via native
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
