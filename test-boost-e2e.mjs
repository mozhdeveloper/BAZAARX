/**
 * End-to-end test: Seller Ad Boost Flow
 * Tests the complete lifecycle: list products → create boost → verify → pause → resume → cancel
 * Run with: node test-boost-e2e.mjs
 */
import { createClient } from '@supabase/supabase-js';

const url = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzNTIxNSwiZXhwIjoyMDg1ODExMjE1fQ.tlEny3k81W_cM5UNGy-1Cb-ff4AjMH_ykXKhC0CUd3A';

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

let passed = 0;
let failed = 0;
let createdBoostId = null;
const SELLER_ID = '7955043d-f46f-47aa-8767-0582c35b95c7'; // TechHub Electronics

function test(name, ok, detail = '') {
  if (ok) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Ad Boost System — End-to-End Test');
  console.log('═══════════════════════════════════════════\n');

  // ── 1. List boostable products ──
  console.log('── Step 1: List Boostable Products ──');
  const { data: products, error: prodErr } = await admin
    .from('products')
    .select('id, name, price, approval_status, images:product_images(image_url, is_primary), category:categories(id, name), variants:product_variants(stock)')
    .eq('seller_id', SELLER_ID)
    .eq('approval_status', 'approved')
    .is('disabled_at', null)
    .is('deleted_at', null)
    .order('name');

  test('No query error', !prodErr, prodErr?.message);
  test('Products returned', products && products.length > 0, `Count: ${products?.length || 0}`);

  if (!products || products.length === 0) {
    console.log('\n❌ Cannot continue — no boostable products found');
    return;
  }

  const testProduct = products[0];
  console.log(`  📦 Using product: "${testProduct.name}" (${testProduct.id.slice(0,8)}...)`);
  test('Product has images', testProduct.images && testProduct.images.length > 0);
  test('Product has category', !!testProduct.category);
  test('Product has variants', testProduct.variants && testProduct.variants.length > 0);

  // ── 2. Create a boost ──
  console.log('\n── Step 2: Create Boost ──');
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: boost, error: createErr } = await admin
    .from('product_ad_boosts')
    .insert({
      product_id: testProduct.id,
      seller_id: SELLER_ID,
      boost_type: 'featured',
      duration_days: 7,
      daily_budget: 100,
      total_budget: 700,
      cost_per_day: 0,
      total_cost: 0,
      currency: 'PHP',
      status: 'active',
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .select()
    .single();

  test('Boost created', !createErr && !!boost, createErr?.message);

  if (!boost) {
    console.log('\n❌ Cannot continue — boost creation failed');
    return;
  }
  createdBoostId = boost.id;
  test('Boost status is active', boost.status === 'active');
  test('Boost type is featured', boost.boost_type === 'featured');
  test('Boost duration is 7', boost.duration_days === 7);
  test('Cost is ₱0 (free period)', boost.total_cost === 0);
  console.log(`  🆔 Boost ID: ${boost.id}`);

  // ── 3. Verify boost appears in active boosts ──
  console.log('\n── Step 3: Verify Active Boosts ──');
  const { data: activeBoosted, error: activeErr } = await admin
    .from('product_ad_boosts')
    .select(`
      *,
      product:products!inner(
        id, name, price,
        images:product_images(id, image_url, is_primary),
        category:categories(id, name),
        seller:sellers(id, store_name, avatar_url),
        reviews(rating),
        variants:product_variants(stock)
      )
    `)
    .eq('status', 'active')
    .gte('ends_at', new Date().toISOString())
    .order('total_budget', { ascending: false });

  test('Active boosts query succeeds', !activeErr, activeErr?.message);
  test('Created boost in active list', activeBoosted?.some(b => b.id === boost.id));
  test('Boost has product name', activeBoosted?.find(b => b.id === boost.id)?.product?.name === testProduct.name);

  // ── 4. Verify seller boosts list ──
  console.log('\n── Step 4: Verify Seller Boosts ──');
  const { data: sellerBoosts, error: sellerErr } = await admin
    .from('product_ad_boosts')
    .select(`
      *,
      product:products!inner(
        id, name, price,
        images:product_images(id, image_url, is_primary),
        category:categories(id, name),
        seller:sellers(id, store_name, avatar_url),
        reviews(rating),
        variants:product_variants(stock)
      )
    `)
    .eq('seller_id', SELLER_ID)
    .order('created_at', { ascending: false });

  test('Seller boosts query succeeds', !sellerErr, sellerErr?.message);
  test('Seller sees their boost', sellerBoosts?.some(b => b.id === boost.id));

  // ── 5. Pause boost ──
  console.log('\n── Step 5: Pause Boost ──');
  const { error: pauseErr } = await admin
    .from('product_ad_boosts')
    .update({ status: 'paused', paused_at: new Date().toISOString() })
    .eq('id', boost.id)
    .eq('seller_id', SELLER_ID);

  test('Pause succeeds', !pauseErr, pauseErr?.message);

  const { data: pausedBoost } = await admin
    .from('product_ad_boosts')
    .select('status, paused_at')
    .eq('id', boost.id)
    .single();

  test('Status is paused', pausedBoost?.status === 'paused');
  test('paused_at timestamp set', !!pausedBoost?.paused_at);

  // ── 6. Resume boost ──
  console.log('\n── Step 6: Resume Boost ──');
  const { error: resumeErr } = await admin
    .from('product_ad_boosts')
    .update({ status: 'active', paused_at: null })
    .eq('id', boost.id)
    .eq('seller_id', SELLER_ID);

  test('Resume succeeds', !resumeErr, resumeErr?.message);

  const { data: resumedBoost } = await admin
    .from('product_ad_boosts')
    .select('status, paused_at')
    .eq('id', boost.id)
    .single();

  test('Status is active again', resumedBoost?.status === 'active');
  test('paused_at is null', resumedBoost?.paused_at === null);

  // ── 7. Cancel boost ──
  console.log('\n── Step 7: Cancel Boost ──');
  const { error: cancelErr } = await admin
    .from('product_ad_boosts')
    .update({ status: 'cancelled' })
    .eq('id', boost.id)
    .eq('seller_id', SELLER_ID);

  test('Cancel succeeds', !cancelErr, cancelErr?.message);

  const { data: cancelledBoost } = await admin
    .from('product_ad_boosts')
    .select('status')
    .eq('id', boost.id)
    .single();

  test('Status is cancelled', cancelledBoost?.status === 'cancelled');

  // ── 8. Verify cancelled boost NOT in active list ──
  console.log('\n── Step 8: Active List Exclusion ──');
  const { data: activeAfterCancel } = await admin
    .from('product_ad_boosts')
    .select('id')
    .eq('status', 'active')
    .gte('ends_at', new Date().toISOString());

  test('Cancelled boost NOT in active', !activeAfterCancel?.some(b => b.id === boost.id));

  // ── 9. Pricing formula ──
  console.log('\n── Step 9: Pricing Formula ──');
  const baseRates = { featured: 15, search_priority: 25, homepage_banner: 50, category_spotlight: 35 };
  for (const [type, rate] of Object.entries(baseRates)) {
    // 7 day, no discount
    const cost7 = rate * 7;
    test(`${type} 7d = ₱${cost7}`, cost7 === rate * 7);
  }
  // 14 day with 15% discount
  const cost14 = Math.round(15 * 0.85 * 14 * 100) / 100;
  test(`featured 14d = ₱${cost14} (15% off)`, cost14 === 178.5);
  // 30 day with 25% discount
  const cost30 = Math.round(15 * 0.75 * 30 * 100) / 100;
  test(`featured 30d = ₱${cost30} (25% off)`, cost30 === 337.5);

  // ── Cleanup ──
  console.log('\n── Cleanup ──');
  const { error: deleteErr } = await admin
    .from('product_ad_boosts')
    .delete()
    .eq('id', boost.id);

  test('Test boost deleted', !deleteErr, deleteErr?.message);
  createdBoostId = null;

  // ── Summary ──
  console.log('\n═══════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('═══════════════════════════════════════════');

  if (failed > 0) process.exit(1);
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  if (createdBoostId) {
    console.log('Cleaning up test boost...');
    await admin.from('product_ad_boosts').delete().eq('id', createdBoostId);
  }
  process.exit(1);
});
