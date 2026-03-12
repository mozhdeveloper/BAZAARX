// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Auth header' }), { status: 401, headers: corsHeaders });
    }

    // Create a standard client that acts as the logged-in user!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Verify the user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: authError }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const productIds: string[] = Array.isArray(body?.productIds) ? body.productIds : [];

    // Now we fetch using the USER'S client. RLS will protect the data naturally.
    const [addressesResult, productsResult] = await Promise.all([
      supabaseClient
        .from('shipping_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false }),

      productIds.length > 0
        ? supabaseClient
            .from('products')
            .select('id, seller_id, sellers(id, store_name, approval_status, avatar_url)')
            .in('id', productIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (addressesResult.error) throw addressesResult.error;
    if (productsResult.error) throw productsResult.error;

    const addresses = addressesResult.data ?? [];
    const defaultAddress = addresses.find((a: any) => a.is_default) ?? addresses[0] ?? null;

    const sellers: Record<string, any> = {};
    for (const product of (productsResult.data ?? [])) {
      const s = product.sellers;
      if (product.seller_id && s && !sellers[product.seller_id]) {
        sellers[product.seller_id] = {
          id: s.id,
          store_name: s.store_name,
          shipping_origin: null, // Hardcoded to satisfy frontend interface
          is_verified: s.approval_status === 'verified' || s.approval_status === 'approved',
          avatar_url: s.avatar_url,
        };
      }
    }

    return new Response(
      JSON.stringify({ addresses, defaultAddress, sellers }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[get-checkout-context] Error:', err.message);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});