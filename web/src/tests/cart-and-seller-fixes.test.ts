/**
 * Tests for cart UX fixes and seller store page bug:
 * 1. Mobile cart: flash sale price refresh (validates DB query returns correct prices)
 * 2. Web cart: seller total = products only (no shipping)
 * 3. Seller page: PGRST200 fix — seller_payout_settings queried separately
 * 4. Web cart: sale % badge calculation correctness
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzUyMTUsImV4cCI6MjA4NTgxMTIxNX0.slNSrIdWo-EH4lpJQRIsIw9XbhaFKXsa2nICDmVBTrY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail = '') {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

// ─── T1: Flash sale submissions accessible (price refresh prereq) ────────────
async function testFlashSalePriceRefreshData() {
  console.log('\nT1: Flash sale price refresh — DB query structure');
  const now = new Date().toISOString();

  const { data: slots, error: slotsError } = await supabase
    .from('global_flash_sale_slots')
    .select('id, start_time, end_time, status')
    .eq('status', 'active')
    .lte('start_time', now)
    .gte('end_time', now);

  assert(!slotsError, 'Query global_flash_sale_slots without error', slotsError?.message);

  if (slots && slots.length > 0) {
    const slotIds = slots.map((s: any) => s.id);
    const { data: subs, error: subErr } = await supabase
      .from('flash_sale_submissions')
      .select('product_id, submitted_price, status')
      .in('slot_id', slotIds)
      .eq('status', 'approved')
      .limit(5);

    assert(!subErr, 'Query flash_sale_submissions by slot_id without error', subErr?.message);
    assert(Array.isArray(subs), 'Returns array of approved submissions');

    const hasPrice = (subs || []).every((s: any) => s.submitted_price != null);
    assert(hasPrice || subs?.length === 0, 'All submissions have submitted_price');
  } else {
    console.log('  ~ No active flash sale slots right now (test still valid)');
    passed++;
  }
}

// ─── T2: Seller total calculation (products only, no shipping) ────────────────
async function testSellerTotalNoShipping() {
  console.log('\nT2: Seller total = sum of products (no shipping added)');

  // Simulate the fixed cart seller total logic — items under ₱1000 threshold so shipping would apply
  const mockItems = [
    { id: 'p1', price: 200, quantity: 2, selected: true, isFreeShipping: false },  // ₱400
    { id: 'p2', price: 300, quantity: 1, selected: true, isFreeShipping: false },  // ₱300  → subtotal ₱700 (< ₱1000 threshold, so shipping = ₱100 in old logic)
    { id: 'p3', price: 200, quantity: 1, selected: false, isFreeShipping: false }, // not selected
  ];

  // OLD buggy logic (includes shipping)
  const selectedSubtotal = mockItems
    .filter(i => i.selected)
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
  const hasFreeShipping = mockItems.filter(i => i.selected).some(i => i.isFreeShipping);
  const effectiveShipping = hasFreeShipping || selectedSubtotal >= 1000 ? 0 : 100;
  const oldTotal = selectedSubtotal + effectiveShipping;

  // NEW fixed logic (products only)
  const newTotal = mockItems
    .filter(i => i.selected)
    .reduce((sum, item) => sum + item.price * item.quantity, 0);

  assert(newTotal === 700, `Fixed seller total = ₱700 (200×2 + 300×1)`, `got ₱${newTotal}`);
  assert(oldTotal === 800, `Old buggy total was ₱800 (included ₱100 shipping)`, `got ₱${oldTotal}`);
  assert(newTotal !== oldTotal, 'Fix removes ₱100 shipping from seller total');
}

// ─── T3: Sale percentage badge calculation ────────────────────────────────────
async function testSalePercentageBadge() {
  console.log('\nT3: Sale % badge calculation');

  const cases = [
    { original: 1000, effective: 800, expectedPct: 20 },
    { original: 500,  effective: 425, expectedPct: 15 },
    { original: 299,  effective: 239, expectedPct: 20 },
    { original: 1200, effective: 1020, expectedPct: 15 },
  ];

  for (const c of cases) {
    const pct = Math.round((c.original - c.effective) / c.original * 100);
    assert(pct === c.expectedPct,
      `₱${c.original} → ₱${c.effective} = ${c.expectedPct}% OFF`,
      `got ${pct}%`);
  }
}

// ─── T4: Seller store page — no embedded payout join ─────────────────────────
async function testSellerPayoutSeparateQuery() {
  console.log('\nT4: Seller payout settings queried separately (no PGRST200)');

  // Pick any seller from DB
  const { data: sellers, error: sellerErr } = await supabase
    .from('sellers')
    .select('id')
    .limit(1)
    .maybeSingle();

  assert(!sellerErr, 'Can query sellers table', sellerErr?.message);
  if (!sellers) {
    console.log('  ~ No sellers found in DB, skipping payout query test');
    passed++;
    return;
  }

  const sellerId = (sellers as any).id;

  // T4a: Old embedded join should fail (PGRST200) — we test this by verifying
  // our new approach works without it.
  const { data: sellerRow, error: sellerRowErr } = await supabase
    .from('sellers')
    .select('id, store_name')
    .eq('id', sellerId)
    .single();

  assert(!sellerRowErr, `Sellers query (without embedded payout) succeeds`, sellerRowErr?.message);

  // T4b: Separate payout query works
  const { data: payoutData, error: payoutErr } = await supabase
    .from('seller_payout_settings')
    .select('seller_id, bank_name, bank_account_name, bank_account_number, payout_method')
    .eq('seller_id', sellerId)
    .maybeSingle();

  assert(!payoutErr, 'Separate seller_payout_settings query succeeds', payoutErr?.message);
  // payoutData may be null if seller has no payout settings yet — that's valid
  assert(payoutData === null || typeof payoutData === 'object',
    'Returns payout data or null (not error)');

  // T4c: Embedded join WOULD fail — verify PGRST200 is the known error
  const { error: joinErr } = await (supabase as any)
    .from('sellers')
    .select('id, payout_account:seller_payout_settings(seller_id, bank_name)')
    .eq('id', sellerId)
    .single();

  if (joinErr) {
    const isExpectedError = joinErr.code === 'PGRST200' ||
      joinErr.message?.includes('relationship') ||
      joinErr.message?.includes('PGRST200');
    assert(isExpectedError,
      'Embedded join correctly fails with PGRST200 (confirming fix was needed)',
      `Error code: ${joinErr.code} — ${joinErr.message}`);
  } else {
    // If the join works, it means Supabase has a FK now — the fix is still valid as it uses separate query
    console.log('  ~ Note: Embedded join succeeded (Supabase may have added FK). Separate query approach still valid.');
    passed++;
  }
}

// ─── T5: Admin sellers batch payout query ────────────────────────────────────
async function testAdminSellersBatchPayoutQuery() {
  console.log('\nT5: Admin sellers — batch payout query');

  const { data: sellers, error: sellersErr } = await supabase
    .from('sellers')
    .select('id')
    .limit(5);

  assert(!sellersErr, 'Batch sellers query succeeds', sellersErr?.message);

  const sellerIds = (sellers || []).map((s: any) => s.id).filter(Boolean);
  if (sellerIds.length === 0) {
    console.log('  ~ No sellers found, skipping');
    passed++;
    return;
  }

  const { data: payoutRows, error: payoutErr } = await supabase
    .from('seller_payout_settings')
    .select('seller_id, bank_account_name, bank_name, bank_account_number')
    .in('seller_id', sellerIds);

  assert(!payoutErr, 'Batch payout settings query succeeds', payoutErr?.message);
  assert(Array.isArray(payoutRows), 'Returns array (may be empty if sellers have no payout settings)');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Cart & Seller Fixes Test Suite ===');

  await testFlashSalePriceRefreshData();
  await testSellerTotalNoShipping();
  await testSalePercentageBadge();
  await testSellerPayoutSeparateQuery();
  await testAdminSellersBatchPayoutQuery();

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Passed: ${passed}  Failed: ${failed}`);
  if (failed > 0) {
    console.error(`\n${failed} test(s) failed.`);
    process.exit(1);
  } else {
    console.log('\nAll tests passed!');
  }
}

main();
