// @ts-nocheck
/**
 * delete-account Edge Function
 * Implements Data Privacy Act (RA 10173) compliant account deletion.
 *
 * Flow:
 * 1. Authenticate the requesting user via JWT
 * 2. Verify password re-entry (requires current password)
 * 3. Check for pending orders that block deletion
 * 4. Soft-delete (anonymize) all user PII from linked tables
 * 5. Delete the auth user (cascade to all DB rows via ON DELETE CASCADE)
 *
 * Security: Uses service role only AFTER user is authenticated. No RLS bypass
 * is granted until the user's identity is confirmed via signInWithPassword.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';

const BLOCKING_ORDER_STATUSES = ['pending_payment', 'processing', 'ready_to_ship', 'shipped', 'out_for_delivery'];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Authenticate the requesting user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse and validate request body
    let body: { password?: string; confirm?: boolean };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!body.confirm) {
      return new Response(JSON.stringify({ error: 'Deletion must be explicitly confirmed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Re-verify identity with password (required for sensitive operations)
    if (!body.password) {
      return new Response(JSON.stringify({ error: 'Password required to delete account' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: signInError } = await userClient.auth.signInWithPassword({
      email: user.email!,
      password: body.password,
    });

    if (signInError) {
      return new Response(JSON.stringify({ error: 'Incorrect password' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Escalate to service role for cascading deletes
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 4. Check for blocking orders (cannot delete with active orders)
    const { data: activeOrders } = await adminClient
      .from('orders')
      .select('id, status')
      .eq('buyer_id', user.id)
      .in('status', BLOCKING_ORDER_STATUSES)
      .limit(1);

    if (activeOrders && activeOrders.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Cannot delete account with active orders',
          code: 'ACTIVE_ORDERS',
          message: 'You have orders in progress. Please wait until they are delivered or cancelled before deleting your account.',
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // 5. Anonymize PII before auth deletion (belt-and-suspenders in case FK isn't CASCADE)
    const anonymizedName = '[Deleted User]';
    const anonymizedPhone = null;

    await Promise.allSettled([
      // Anonymize profile
      adminClient
        .from('profiles')
        .update({
          first_name: anonymizedName,
          last_name: '',
          phone: anonymizedPhone,
          avatar_url: null,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', user.id),

      // Soft-delete seller record if applicable
      adminClient
        .from('sellers')
        .update({
          owner_name: anonymizedName,
          store_name: '[Deleted Store]',
          store_description: '',
          avatar_url: null,
          store_banner_url: null,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', user.id),

      // Clear cart items
      adminClient.from('cart_items').delete().eq('buyer_id', user.id),

      // Remove shipping addresses
      adminClient.from('shipping_addresses').delete().eq('user_id', user.id),

      // Remove payment method references (no actual card data stored)
      adminClient.from('saved_payment_methods').delete().eq('user_id', user.id),
    ]);

    // 6. Delete the auth user — this cascades via ON DELETE CASCADE on all FK references
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Failed to delete auth user:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete account. Please contact support.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Account successfully deleted' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('Unexpected error in delete-account:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
