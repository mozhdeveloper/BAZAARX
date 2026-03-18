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
    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verify the caller is an admin
    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: adminRecord } = await db.from("admins").select("id").eq("id", user.id).maybeSingle();
    if (!adminRecord) {
      return new Response(
        JSON.stringify({ error: "Forbidden: admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, ...params } = await req.json();

    if (action === "list-sellers") {
      const [sellersResult, tiersResult, productsResult] = await Promise.all([
        db.from("sellers").select("id, store_name, avatar_url, approval_status, created_at").order("store_name"),
        db.from("seller_tiers").select("seller_id, tier_level, bypasses_assessment"),
        db.from("products").select("seller_id").is("disabled_at", null),
      ]);

      if (sellersResult.error) throw sellersResult.error;

      return new Response(
        JSON.stringify({
          sellers: sellersResult.data,
          tiers: tiersResult.data || [],
          productCounts: productsResult.data || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "toggle-trusted") {
      const { sellerId, trusted } = params;
      if (!sellerId) {
        return new Response(
          JSON.stringify({ error: "sellerId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await db.from("seller_tiers").upsert(
        {
          seller_id: sellerId,
          tier_level: trusted ? "trusted_brand" : "standard",
          bypasses_assessment: !!trusted,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "seller_id" }
      );

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
