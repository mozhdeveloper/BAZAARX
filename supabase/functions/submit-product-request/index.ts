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
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { productName, description, category, requestedByName, requestedById, priority, estimatedDemand } =
      await req.json();

    if (!productName) {
      return new Response(
        JSON.stringify({ error: "productName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await db
      .from("product_requests")
      .insert({
        product_name: productName,
        description: description || "",
        category: category || "",
        requested_by_name: requestedByName || "Anonymous",
        requested_by_id: requestedById || null,
        priority: priority || "medium",
        estimated_demand: estimatedDemand || 0,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
