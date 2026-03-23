/**
 * Edge Function: release-escrow
 *
 * Scans all `payment_transactions` with escrow_status = 'held' whose
 * `escrow_release_at` has passed and releases them:
 *   1. Sets escrow_status = 'released', escrow_released_at = NOW()
 *   2. Updates the matching seller_payout from on_hold → pending
 *   3. Sends a push notification to the seller
 *
 * Intended to be invoked by a Supabase cron job every hour:
 *   SELECT cron.schedule('release-escrow-hourly', '0 * * * *',
 *     $$SELECT net.http_post(
 *       url := current_setting('app.supabase_url') || '/functions/v1/release-escrow',
 *       headers := jsonb_build_object('Authorization','Bearer ' || current_setting('app.service_role_key')),
 *       body := '{}'::jsonb
 *     )$$
 *   );
 *
 * Can also be called manually with:
 *   POST /functions/v1/release-escrow
 *   { "orderId": "uuid" }   ← release a specific order early (admin only)
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EscrowRow {
  id: string;
  order_id: string;
  seller_id: string;
  amount: number;
  escrow_release_at: string;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
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

    const now = new Date().toISOString();
    let body: { orderId?: string } = {};

    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      // empty body is fine — just run the batch job
    }

    let released = 0;

    if (body.orderId) {
      // ── Single order release (admin action) ──────────────────────────────
      const { error } = await supabase.rpc("release_escrow_for_order", {
        p_order_id: body.orderId,
      });

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      released = 1;
      await notifySeller(supabase, body.orderId);
    } else {
      // ── Batch job: find all held transactions whose window has passed ──────
      const { data: rows, error } = await supabase
        .from("payment_transactions")
        .select("id, order_id, seller_id, amount, escrow_release_at")
        .eq("escrow_status", "held")
        .eq("status", "paid")
        .lte("escrow_release_at", now)
        .limit(500);

      if (error) {
        console.error("[release-escrow] Query error:", error.message);
        return jsonResponse({ error: error.message }, 500);
      }

      const transactions = (rows || []) as EscrowRow[];
      console.log(`[release-escrow] Found ${transactions.length} transaction(s) to release`);

      for (const txn of transactions) {
        try {
          // Release via DB function (atomic update on txn + payout)
          await supabase.rpc("release_escrow_for_order", {
            p_order_id: txn.order_id,
          });

          released++;
          await notifySeller(supabase, txn.order_id, txn.seller_id, txn.amount);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[release-escrow] Failed to release order ${txn.order_id}: ${msg}`);
        }
      }
    }

    console.log(`[release-escrow] Released ${released} escrow(s)`);
    return jsonResponse({ released });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[release-escrow] Unhandled error:", message);
    return jsonResponse({ error: message }, 500);
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function notifySeller(
  supabase: ReturnType<typeof createClient>,
  orderId: string,
  sellerId?: string,
  amount?: number,
): Promise<void> {
  try {
    // Resolve sellerId if not provided
    if (!sellerId) {
      const { data: txn } = await supabase
        .from("payment_transactions")
        .select("seller_id, amount")
        .eq("order_id", orderId)
        .single();
      if (txn) {
        sellerId = txn.seller_id;
        amount = Number(txn.amount);
      }
    }

    if (!sellerId) return;

    // Store in-app seller notification
    await supabase.from("seller_notifications").insert({
      seller_id: sellerId,
      type: "escrow_released",
      title: "Payment Released",
      message: amount
        ? `₱${Number(amount).toLocaleString()} from order has been released to your payout balance.`
        : "Payment from your order has been released to your payout balance.",
      action_data: { orderId },
      priority: "high",
    });

    // Trigger push notification via the send-push-notification function
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        userId: sellerId,
        title: "💰 Payment Released",
        body: amount
          ? `₱${Number(amount).toLocaleString()} has been released to your payout balance.`
          : "Your escrow payment has been released.",
        data: { type: "escrow_released", orderId },
      }),
    });
  } catch (err: unknown) {
    // Non-critical — log but don't fail the release
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[release-escrow] notify error:", msg);
  }
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
