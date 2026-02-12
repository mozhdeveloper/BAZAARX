/**
 * Quick test for profile fetching and mapping
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

async function test() {
  console.log('Testing new profile fetch approach...\n');

  // Step 1: Get ONLINE orders with buyer_id
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, buyer_id, order_type')
    .eq('order_type', 'ONLINE')
    .not('buyer_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching orders:', error.message);
    return;
  }

  console.log(`Found ${orders?.length || 0} ONLINE orders with buyer_id`);

  // Step 2: Get buyer profiles - simulate new approach
  const buyerIds = orders?.map(o => o.buyer_id) || [];
  const uniqueBuyerIds = [...new Set(buyerIds)];

  console.log(`Unique buyer IDs: ${uniqueBuyerIds.length}`);

  if (uniqueBuyerIds.length > 0) {
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, phone')
      .in('id', uniqueBuyerIds);

    if (pError) {
      console.error('Error fetching profiles:', pError.message);
      return;
    }

    console.log(`Fetched ${profiles?.length || 0} profiles\n`);

    // Build profile map
    const profileMap: Record<string, any> = {};
    profiles?.forEach(p => { profileMap[p.id] = p; });

    // Test mapping logic for each order
    console.log('Order -> Buyer Name Mapping:');
    console.log('═'.repeat(60));

    for (const order of orders || []) {
      const profile = profileMap[order.buyer_id];
      let buyerName = 'Walk-in Customer';
      let source = 'default';

      if (profile?.first_name || profile?.last_name) {
        buyerName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Customer';
        source = 'first_name/last_name';
      } else if (profile?.email) {
        buyerName = profile.email.split('@')[0];
        source = 'email username';
      }

      console.log(`${order.order_number}:`);
      console.log(`  Buyer ID: ${order.buyer_id}`);
      console.log(`  Profile: ${profile ? JSON.stringify({ email: profile.email, first_name: profile.first_name, last_name: profile.last_name }) : 'NOT FOUND'}`);
      console.log(`  Resolved Name: "${buyerName}" (from ${source})`);
      console.log('');
    }
  }

  console.log('✅ Profile fetch approach works correctly!');
}

test().catch(console.error);
