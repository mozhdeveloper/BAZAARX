import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function resolveTier(maxUpvotes: number): {
  tier: string;
  bc_multiplier: number;
} {
  if (maxUpvotes >= 100) return { tier: "gold",   bc_multiplier: 2.00 };
  if (maxUpvotes >= 50)  return { tier: "silver",  bc_multiplier: 1.50 };
  if (maxUpvotes >= 10)  return { tier: "bronze",  bc_multiplier: 1.25 };
  return                        { tier: "none",    bc_multiplier: 1.00 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Find the single highest upvote count across all of the user's comments
    const { data: rows, error: queryErr } = await db
      .from("product_request_comments")
      .select("upvotes")
      .eq("user_id", user_id)
      .order("upvotes", { ascending: false })
      .limit(1);

    if (queryErr) {
      return new Response(
        JSON.stringify({ error: "Failed to query comments", detail: queryErr.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const maxUpvotes = rows?.[0]?.upvotes ?? 0;
    const { tier, bc_multiplier } = resolveTier(maxUpvotes);

    // Upsert contributor_tiers row
    const { error: upsertErr } = await db
      .from("contributor_tiers")
      .upsert(
        {
          user_id,
          tier,
          max_upvotes: maxUpvotes,
          bc_multiplier,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertErr) {
      return new Response(
        JSON.stringify({ error: "Failed to upsert tier", detail: upsertErr.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, tier, max_upvotes: maxUpvotes, bc_multiplier }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("recalculate-tier error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
