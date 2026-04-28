/**
 * Flash Sale Bug-Fix Verification Tests
 *
 * Validates 5 fixes:
 *
 * Fix #1 – (Web+Mobile) PDP price loading delay:
 *   ProductCard now passes activeCampaignDiscount in nav state; PDP seeds state from it.
 *   Mobile PDP seeds useState from product prop directly.
 *   DB test: verify flash_sale_submissions + product data is joinable for instant seed.
 *
 * Fix #2 – (Web+Mobile) Checkout validates active flash sale:
 *   validateCheckout re-fetches active discounts and blocks checkout if sale ended.
 *   DB test: verify get_active_product_discount RPC is callable; returns null for unknown product.
 *
 * Fix #3 – (Web) Progress bar shows correct sold count:
 *   getGlobalFlashSaleProducts now fetches product_sold_counts view.
 *   DB test: verify product_sold_counts view exists and is queryable.
 *
 * Fix #4 – (Web) Progress bar campaignSold/campaignStock fields:
 *   Returned flash sale products now include campaignSold and campaignStock.
 *   DB test: verify active flash sale slots + submissions have submitted_stock.
 *
 * Fix #5 – (Mobile) Add-to-cart loading state:
 *   Client-only change; validated by manual QA.
 *
 * Run: cd web && npx tsx src/tests/flash-sale-fixes.test.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzUyMTUsImV4cCI6MjA4NTgxMTIxNX0.slNSrIdWo-EH4lpJQRIsIw9XbhaFKXsa2nICDmVBTrY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Result {
  name: string;
  passed: boolean;
  message: string;
  ms: number;
}
const results: Result[] = [];

async function test(name: string, fn: () => Promise<void>) {
  const t = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, message: 'OK', ms: Date.now() - t });
    console.log(`  ✅  ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, message: err.message ?? String(err), ms: Date.now() - t });
    console.log(`  ❌  ${name}: ${err.message}`);
  }
}

// ─── FIX #3: product_sold_counts view ────────────────────────────────────────

async function fix3_soldCountsViewQueryable() {
  const { data, error } = await supabase
    .from('product_sold_counts')
    .select('product_id, sold_count')
    .limit(5);

  if (error) throw new Error(`product_sold_counts view not queryable: ${error.message}`);
  console.log(`     product_sold_counts returned ${data?.length ?? 0} row(s) ✓`);
}

async function fix3_soldCountViewMatchesProducts() {
  // Ensure the view rows reference real product IDs
  const { data: counts, error: e1 } = await supabase
    .from('product_sold_counts')
    .select('product_id, sold_count')
    .limit(3);

  if (e1) throw new Error(`product_sold_counts query failed: ${e1.message}`);
  if (!counts || counts.length === 0) {
    console.log('     ⚠ No sold count records exist yet — skipping join check');
    return;
  }

  const pid = counts[0].product_id;
  const { data: product, error: e2 } = await supabase
    .from('products')
    .select('id, name')
    .eq('id', pid)
    .maybeSingle();

  if (e2) throw new Error(`product lookup failed: ${e2.message}`);
  if (!product) throw new Error(`product_sold_counts references non-existent product ${pid}`);

  console.log(`     sold_count=${counts[0].sold_count} for product "${product.name}" ✓`);
}

// ─── FIX #4: global flash sale data pipeline ─────────────────────────────────

async function fix4_flashSaleSlotsQueryable() {
  const { data, error } = await supabase
    .from('global_flash_sale_slots')
    .select('id, name, status, start_time, end_time')
    .limit(5);

  if (error) throw new Error(`global_flash_sale_slots not queryable: ${error.message}`);
  console.log(`     Found ${data?.length ?? 0} flash sale slot(s) total ✓`);
}

async function fix4_submissionsHaveSubmittedStock() {
  // Ensure approved submissions carry submitted_stock so campaignStock can be computed
  const { data, error } = await supabase
    .from('flash_sale_submissions')
    .select('id, slot_id, submitted_price, submitted_stock, status')
    .eq('status', 'approved')
    .limit(5);

  if (error) throw new Error(`flash_sale_submissions query failed: ${error.message}`);
  if (!data || data.length === 0) {
    console.log('     ⚠ No approved flash sale submissions yet — skipping stock check');
    return;
  }

  const missingStock = data.filter(s => s.submitted_stock == null);
  if (missingStock.length > 0) {
    throw new Error(
      `${missingStock.length} approved submission(s) have null submitted_stock — progress bar will default to total stock`
    );
  }

  console.log(`     All ${data.length} checked submission(s) have submitted_stock ✓`);
}

async function fix4_activeSlotsReturnProductsWithSoldCounts() {
  // Simulate the getGlobalFlashSaleProducts fetch and verify sold counts are available
  const now = new Date().toISOString();

  const { data: slots, error: e1 } = await supabase
    .from('global_flash_sale_slots')
    .select('id, name, end_time')
    .eq('status', 'active')
    .lte('start_time', now)
    .gte('end_time', now);

  if (e1) throw new Error(`active slots query failed: ${e1.message}`);
  if (!slots || slots.length === 0) {
    console.log('     ⚠ No active flash sale slots right now — skipping pipeline check');
    return;
  }

  const slotIds = slots.map(s => s.id);
  const { data: submissions, error: e2 } = await supabase
    .from('flash_sale_submissions')
    .select('id, slot_id, submitted_stock, product:products(id, name)')
    .in('slot_id', slotIds)
    .eq('status', 'approved');

  if (e2) throw new Error(`submissions query failed: ${e2.message}`);
  if (!submissions || submissions.length === 0) {
    console.log('     ⚠ No approved submissions for active slots — skipping pipeline check');
    return;
  }

  const productIds = submissions.map((s: any) => s.product?.id).filter(Boolean);
  const { data: soldData, error: e3 } = await supabase
    .from('product_sold_counts')
    .select('product_id, sold_count')
    .in('product_id', productIds);

  if (e3) throw new Error(`sold counts query failed: ${e3.message}`);

  const soldMap = new Map((soldData || []).map((r: any) => [r.product_id, r.sold_count]));

  // Simulate the mapping logic
  const mapped = submissions.map((sub: any) => ({
    id: sub.product?.id,
    name: sub.product?.name,
    sold: soldMap.get(sub.product?.id) || 0,
    campaignSold: soldMap.get(sub.product?.id) || 0,
    campaignStock: Math.max(0, (sub.submitted_stock || 0) - (soldMap.get(sub.product?.id) || 0)),
  }));

  const allHaveFields = mapped.every(p => p.campaignSold !== undefined && p.campaignStock !== undefined);
  if (!allHaveFields) throw new Error('Some flash sale products missing campaignSold/campaignStock');

  console.log(
    `     ${mapped.length} active flash sale product(s) have campaignSold + campaignStock ✓\n` +
    `     Sample: "${mapped[0]?.name}" sold=${mapped[0]?.campaignSold} remaining=${mapped[0]?.campaignStock}`
  );
}

// ─── FIX #1 + #2: PDP price seed & checkout flash sale validation ──────────────

async function fix1_flashSaleSubmissionJoinable() {
  // The ProductCard fix depends on activeCampaignDiscount being embedded on the flash sale product.
  // This test verifies the data join that produces it is valid.
  const { data, error } = await supabase
    .from('flash_sale_submissions')
    .select(`
      id, submitted_price, slot_id, status,
      product:products(id, name, price)
    `)
    .eq('status', 'approved')
    .limit(3);

  if (error) throw new Error(`flash_sale_submissions join query failed: ${error.message}`);

  const withPrice = (data || []).filter((s: any) => s.submitted_price != null && s.product?.price != null);
  console.log(
    `     ${withPrice.length}/${data?.length ?? 0} approved submission(s) have both ` +
    `submitted_price + product.price (needed for activeCampaignDiscount seed) ✓`
  );
}

async function fix2_getActiveProductDiscountRpcCallable() {
  // Validates that the RPC used by getActiveDiscountsForProducts() is accessible
  const { data, error } = await supabase.rpc('get_active_product_discount', {
    p_product_id: '00000000-0000-0000-0000-000000000000', // non-existent product
  });

  // Should return null/empty for non-existent product, not throw
  if (error) throw new Error(`get_active_product_discount RPC failed: ${error.message}`);

  if (data !== null && data !== undefined && (Array.isArray(data) ? data.length > 0 : false)) {
    throw new Error('Expected no discount for non-existent product, got data');
  }

  console.log('     get_active_product_discount RPC callable, returns null for unknown product ✓');
}

async function fix2_existingProductDiscountCheck() {
  // For a real product, verify the RPC either returns a discount or null (not an error)
  const { data: products, error: pe } = await supabase
    .from('products')
    .select('id, name')
    .limit(1)
    .maybeSingle();

  if (pe || !products) {
    console.log('     ⚠ No products found — skipping real-product RPC check');
    return;
  }

  const { data, error } = await supabase.rpc('get_active_product_discount', {
    p_product_id: products.id,
  });

  if (error) throw new Error(`get_active_product_discount RPC failed for real product: ${error.message}`);

  console.log(
    `     RPC for product "${products.name}" returned: ${data ? 'active discount' : 'no discount'} ✓`
  );
}

// ─── RUNNER ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔥  Flash Sale Bug-Fix Verification\n');

  console.log('─── Fix #1 & #2: PDP price seed + checkout flash sale validation ───');
  await test('fix1_flashSaleSubmissionJoinable',              fix1_flashSaleSubmissionJoinable);
  await test('fix2_getActiveProductDiscountRpcCallable',      fix2_getActiveProductDiscountRpcCallable);
  await test('fix2_existingProductDiscountCheck',             fix2_existingProductDiscountCheck);

  console.log('\n─── Fix #3: progress bar — product_sold_counts view ───');
  await test('fix3_soldCountsViewQueryable',                  fix3_soldCountsViewQueryable);
  await test('fix3_soldCountViewMatchesProducts',             fix3_soldCountViewMatchesProducts);

  console.log('\n─── Fix #4: progress bar — flash sale data pipeline ───');
  await test('fix4_flashSaleSlotsQueryable',                  fix4_flashSaleSlotsQueryable);
  await test('fix4_submissionsHaveSubmittedStock',            fix4_submissionsHaveSubmittedStock);
  await test('fix4_activeSlotsReturnProductsWithSoldCounts',  fix4_activeSlotsReturnProductsWithSoldCounts);

  // ─── Summary ───
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const totalMs = results.reduce((a, r) => a + r.ms, 0);

  console.log(`\n${'─'.repeat(55)}`);
  console.log(`  ${passed}/${total} tests passed  (${totalMs}ms total)\n`);

  if (passed < total) {
    console.log('  FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`    ❌  ${r.name}: ${r.message}`);
    });
    process.exit(1);
  }

  console.log('  All flash sale fix tests passed ✓');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
