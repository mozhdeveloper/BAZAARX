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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verify the caller is authenticated
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

    const { action, productId, sellerId, priority } = await req.json();

    // Verify seller ownership for seller-initiated actions
    const { data: sellerRecord } = await db.from("sellers").select("id").eq("id", user.id).maybeSingle();
    const { data: adminRecord } = await db.from("admins").select("id").eq("id", user.id).maybeSingle();

    if (!sellerRecord && !adminRecord) {
      return new Response(
        JSON.stringify({ error: "Forbidden: seller or admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For sellers, ensure they can only modify their own products
    const effectiveSellerId = sellerRecord ? user.id : sellerId;

    if (action === "feature") {
      if (!productId || !effectiveSellerId) {
        return new Response(
          JSON.stringify({ error: "productId and sellerId are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await db.from("featured_products").upsert(
        {
          product_id: productId,
          seller_id: effectiveSellerId,
          is_active: true,
          priority: priority || 0,
          featured_at: new Date().toISOString(),
        },
        { onConflict: "product_id" }
      );

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "unfeature") {
      if (!productId || !effectiveSellerId) {
        return new Response(
          JSON.stringify({ error: "productId and sellerId are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await db.from("featured_products").delete()
        .eq("product_id", productId)
        .eq("seller_id", effectiveSellerId);

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
