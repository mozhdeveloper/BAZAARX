import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BC_BASE: Record<string, number> = {
  sourcing: 150,
  qc: 50,
  general: 25,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Authenticate caller
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { request_id, type, content } = await req.json();

    if (!request_id || !type || !content?.trim()) {
      return new Response(
        JSON.stringify({ error: "request_id, type, and content are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!["sourcing", "qc", "general"].includes(type)) {
      return new Response(
        JSON.stringify({ error: "type must be sourcing, qc, or general" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Caller-scoped client (respects RLS for auth checks)
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client for data operations
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Confirm product_request exists
    const { data: prExists } = await db
      .from("product_requests")
      .select("id")
      .eq("id", request_id)
      .single();

    if (!prExists) {
      return new Response(JSON.stringify({ error: "Product request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get contributor tier multiplier (default 1.00 if no tier row yet)
    const { data: tierRow } = await db
      .from("contributor_tiers")
      .select("bc_multiplier")
      .eq("user_id", user.id)
      .single();

    const multiplier = Number(tierRow?.bc_multiplier ?? 1.0);
    const baseBC = BC_BASE[type] ?? 25;
    const bcAwarded = Math.round(baseBC * multiplier);
    const isAdminOnly = type === "sourcing";

    // Insert comment
    const { data: comment, error: insertErr } = await db
      .from("product_request_comments")
      .insert({
        request_id,
        user_id: user.id,
        type,
        content: content.trim(),
        is_admin_only: isAdminOnly,
        bc_awarded: bcAwarded,
      })
      .select()
      .single();

    if (insertErr) {
      return new Response(
        JSON.stringify({ error: "Failed to create comment", detail: insertErr.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Award BazCoins via the award-bc function (fire-and-forget on error)
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/award-bc`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          amount: bcAwarded,
          reason: `comment_${type}`,
          reference_id: comment.id,
          reference_type: "product_request_comment",
        }),
      });
    } catch (bcErr) {
      console.error("award-bc call failed (non-fatal):", bcErr);
    }

    // Build response — mask content for sourcing if caller is not admin/lab
    const { data: callerRoles } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdminCaller = (callerRoles ?? []).some((r: any) =>
      ["admin", "lab"].includes(r.role)
    );

    const responseComment = {
      ...comment,
      content: isAdminOnly && !isAdminCaller ? null : comment.content,
    };

    return new Response(JSON.stringify({ success: true, comment: responseComment }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("post-comment error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
