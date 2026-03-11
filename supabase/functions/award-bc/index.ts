import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, amount, reason, reference_id, reference_type } =
      await req.json();

    if (!user_id || !amount || !reason) {
      return new Response(
        JSON.stringify({ error: "user_id, amount, and reason are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (typeof amount !== "number" || amount === 0) {
      return new Response(
        JSON.stringify({ error: "amount must be a non-zero number" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Fetch current balance — buyers row may not exist for non-buyer users
    const { data: buyer, error: buyerErr } = await db
      .from("buyers")
      .select("bazcoins")
      .eq("id", user_id)
      .single();

    if (buyerErr || !buyer) {
      return new Response(
        JSON.stringify({ error: "User buyer record not found", detail: buyerErr?.message }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const newBalance = Math.max(0, (buyer.bazcoins ?? 0) + amount);

    // 2. Update balance — do this first so transaction is accurate
    const { error: updateErr } = await db
      .from("buyers")
      .update({ bazcoins: newBalance, updated_at: new Date().toISOString() })
      .eq("id", user_id);

    if (updateErr) {
      return new Response(
        JSON.stringify({ error: "Failed to update balance", detail: updateErr.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Record in ledger
    const { data: tx, error: txErr } = await db
      .from("bazcoin_transactions")
      .insert({
        user_id,
        amount,
        balance_after: newBalance,
        reason,
        reference_id: reference_id ?? null,
        reference_type: reference_type ?? null,
      })
      .select()
      .single();

    if (txErr) {
      // Balance already updated — log but don't fail
      console.error("Failed to write bazcoin_transaction ledger entry:", txErr.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        balance_after: newBalance,
        transaction_id: tx?.id ?? null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("award-bc error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
