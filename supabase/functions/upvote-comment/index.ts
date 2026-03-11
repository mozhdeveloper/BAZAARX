import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { comment_id } = await req.json();

    if (!comment_id) {
      return new Response(JSON.stringify({ error: "comment_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve caller identity
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

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Fetch the comment to verify it exists and get author id
    const { data: comment, error: commentErr } = await db
      .from("product_request_comments")
      .select("id, user_id, upvotes, admin_upvotes")
      .eq("id", comment_id)
      .single();

    if (commentErr || !comment) {
      return new Response(JSON.stringify({ error: "Comment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-upvote
    if (comment.user_id === user.id) {
      return new Response(JSON.stringify({ error: "You cannot upvote your own comment" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is admin/lab
    const { data: callerRoles } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isAdminCaller = (callerRoles ?? []).some((r: any) =>
      ["admin", "lab"].includes(r.role)
    );

    // Insert upvote row (unique constraint blocks duplicates)
    const { error: upvoteErr } = await db.from("comment_upvotes").insert({
      comment_id,
      user_id: user.id,
    });

    if (upvoteErr) {
      if (upvoteErr.code === "23505") {
        // Duplicate — already upvoted
        return new Response(JSON.stringify({ error: "Already upvoted" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ error: "Failed to record upvote", detail: upvoteErr.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Increment the appropriate counter on the comment
    const counterField = isAdminCaller ? "admin_upvotes" : "upvotes";
    const newCount = isAdminCaller
      ? (comment.admin_upvotes ?? 0) + 1
      : (comment.upvotes ?? 0) + 1;

    await db
      .from("product_request_comments")
      .update({ [counterField]: newCount })
      .eq("id", comment_id);

    // Trigger tier recalculation for the comment author (fire-and-forget)
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/recalculate-tier`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ user_id: comment.user_id }),
      });
    } catch (tierErr) {
      console.error("recalculate-tier call failed (non-fatal):", tierErr);
    }

    return new Response(
      JSON.stringify({ success: true, new_count: newCount }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("upvote-comment error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
