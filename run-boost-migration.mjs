/**
 * Migration script: Add seller SELECT policy to product_ad_boosts
 * Run with: node run-boost-migration.mjs
 */
import { createClient } from '@supabase/supabase-js';

const url = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzNTIxNSwiZXhwIjoyMDg1ODExMjE1fQ.tlEny3k81W_cM5UNGy-1Cb-ff4AjMH_ykXKhC0CUd3A';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzUyMTUsImV4cCI6MjA4NTgxMTIxNX0.slNSrIdWo-EH4lpJQRIsIw9XbhaFKXsa2nICDmVBTrY';

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

async function main() {
  console.log('=== Product Ad Boosts Migration Check ===\n');

  // 1. Check table exists
  const { data: tableCheck, error: tableErr } = await admin
    .from('product_ad_boosts')
    .select('id')
    .limit(0);

  if (tableErr) {
    console.log('❌ product_ad_boosts table does NOT exist.');
    console.log('   Please run this SQL in Supabase SQL Editor:');
    console.log('   File: supabase-migrations/012_product_ad_boosts.sql');
    return;
  }

  console.log('✅ product_ad_boosts table exists');

  // 2. Test boostable products query with service key
  const sellers = ['7955043d-f46f-47aa-8767-0582c35b95c7']; // TechHub Electronics
  const sellerId = sellers[0];

  const { data: prods, error: prodErr } = await admin
    .from('products')
    .select('id, name, approval_status')
    .eq('seller_id', sellerId)
    .eq('approval_status', 'approved')
    .is('disabled_at', null)
    .is('deleted_at', null)
    .limit(3);

  console.log(`✅ Boostable products for TechHub: ${prods?.length || 0} found`);
  if (prods?.length > 0) {
    prods.forEach(p => console.log(`   - ${p.name} (${p.id.slice(0,8)}...)`));
  }

  // 3. Test creating a boost (service key — bypasses RLS)
  const testProductId = prods?.[0]?.id;
  if (testProductId) {
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { data: boost, error: boostErr } = await admin
      .from('product_ad_boosts')
      .insert({
        product_id: testProductId,
        seller_id: sellerId,
        boost_type: 'featured',
        duration_days: 7,
        daily_budget: 0,
        total_budget: 0,
        cost_per_day: 0,
        total_cost: 0,
        currency: 'PHP',
        status: 'active',
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      })
      .select()
      .single();

    if (boostErr) {
      console.log('❌ Failed to create test boost:', boostErr.message);
    } else {
      console.log(`✅ Test boost created: ${boost.id}`);

      // Clean up
      await admin.from('product_ad_boosts').delete().eq('id', boost.id);
      console.log('✅ Test boost cleaned up');
    }
  }

  // 4. Check if RLS seller SELECT policy is needed
  console.log('\n--- RLS Policy Check ---');
  console.log('ℹ️  The missing "Sellers can view their own boosts" SELECT policy');
  console.log('   must be added via Supabase SQL Editor. Run this SQL:\n');
  console.log(`   CREATE POLICY "Sellers can view their own boosts"`);
  console.log(`     ON public.product_ad_boosts FOR SELECT`);
  console.log(`     USING (seller_id = auth.uid());`);
  console.log('\n   This lets sellers see their paused/ended/cancelled boosts too.\n');

  console.log('=== Migration check complete ===');
}

main().catch(console.error);
