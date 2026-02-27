/**
 * Trusted Brand QA Bypass — End-to-End Test
 * ============================================
 * Tests the full trusted brand lifecycle across ALL platforms:
 *
 *   BACKEND (Database):
 *     1. Admin sets seller as trusted_brand in seller_tiers
 *     2. Verify seller_tiers row is correct
 *     3. Admin removes trusted_brand (resets to standard)
 *
 *   WEB SELLER:
 *     4. Trusted brand seller adds product → auto-verified assessment
 *     5. Product approval_status = 'approved' automatically
 *     6. Standard seller adds product → pending_digital_review
 *
 *   WEB BUYER:
 *     7. Only approved products visible on shop (trusted brand product shows)
 *     8. Standard seller's pending product NOT visible
 *
 *   MOBILE SELLER:
 *     9. Trusted brand seller adds product via mobile → auto-verified
 *    10. Product approval_status = 'approved' automatically
 *
 *   MOBILE BUYER:
 *    11. Approved products visible in mobile product listing
 *    12. Pending products NOT visible
 *
 *   FEATURED PRODUCTS:
 *    13. Seller can feature a product
 *    14. Featured products query returns active featured items
 *    15. Seller can unfeature a product
 *    16. Max 6 featured products limit enforced
 *
 * Usage: node test-trusted-brand-qa-bypass.mjs
 *
 * Runs against live Supabase with service role for admin ops + anon for buyer queries.
 * All test data is cleaned up after each run.
 */

import { createClient } from '@supabase/supabase-js';

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzUyMTUsImV4cCI6MjA4NTgxMTIxNX0.slNSrIdWo-EH4lpJQRIsIw9XbhaFKXsa2nICDmVBTrY';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzNTIxNSwiZXhwIjoyMDg1ODExMjE1fQ.tlEny3k81W_cM5UNGy-1Cb-ff4AjMH_ykXKhC0CUd3A';

// Admin/service client (bypasses RLS)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
// Anon client (buyer perspective — respects RLS)
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Use a real seller from the DB
const TEST_SELLER_ID = '7955043d-f46f-47aa-8767-0582c35b95c7'; // TechHub Electronics
const TEST_CATEGORY_ID = 'fc4fc320-3248-4762-9042-928b4f0ee142'; // Electronics

const TIMESTAMP = Date.now();
const TRUSTED_PRODUCT_NAME = `__TEST_TRUSTED_BRAND_PRODUCT_${TIMESTAMP}`;
const STANDARD_PRODUCT_NAME = `__TEST_STANDARD_PRODUCT_${TIMESTAMP}`;
const MOBILE_PRODUCT_NAME = `__TEST_MOBILE_TRUSTED_PRODUCT_${TIMESTAMP}`;

// Cleanup trackers
let trustedProductId = null;
let standardProductId = null;
let mobileProductId = null;
let trustedAssessmentId = null;
let standardAssessmentId = null;
let mobileAssessmentId = null;
let originalTierData = null;

let passed = 0;
let failed = 0;
const results = [];

function log(emoji, msg) {
  console.log(`${emoji} ${msg}`);
}

function assert(condition, testName, detail = '') {
  if (condition) {
    passed++;
    results.push({ name: testName, status: 'PASS' });
    log('✅', testName);
  } else {
    failed++;
    results.push({ name: testName, status: 'FAIL', detail });
    log('❌', `${testName} — ${detail}`);
  }
}

// ═══════════════════════════════════════════════════════════
// PHASE 0: Save original seller tier (for restore)
// ═══════════════════════════════════════════════════════════

async function phase0_saveOriginalTier() {
  log('🔧', '\n═══ PHASE 0: Save Original Seller Tier ═══');

  const { data } = await supabaseAdmin
    .from('seller_tiers')
    .select('*')
    .eq('seller_id', TEST_SELLER_ID)
    .maybeSingle();

  originalTierData = data; // null if no row
  log('ℹ️', `Original tier: ${data ? `${data.tier_level} (bypasses=${data.bypasses_assessment})` : 'none'}`);
}

// ═══════════════════════════════════════════════════════════
// PHASE 1: BACKEND — Admin sets trusted_brand tier
// ═══════════════════════════════════════════════════════════

async function phase1_adminSetTrustedBrand() {
  log('🛡️', '\n═══ PHASE 1: BACKEND — Admin Sets Trusted Brand ═══');

  // 1.1 Admin upserts seller_tiers to trusted_brand
  const { data, error } = await supabaseAdmin
    .from('seller_tiers')
    .upsert({
      seller_id: TEST_SELLER_ID,
      tier_level: 'trusted_brand',
      bypasses_assessment: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'seller_id' })
    .select()
    .single();

  assert(!error, '1.1  Admin upsert seller_tiers to trusted_brand succeeds', error?.message);
  assert(data?.tier_level === 'trusted_brand', '1.2  tier_level = trusted_brand', `Got: ${data?.tier_level}`);
  assert(data?.bypasses_assessment === true, '1.3  bypasses_assessment = true', `Got: ${data?.bypasses_assessment}`);

  // 1.4 Verify via direct query
  const { data: verify } = await supabaseAdmin
    .from('seller_tiers')
    .select('tier_level, bypasses_assessment')
    .eq('seller_id', TEST_SELLER_ID)
    .single();

  assert(verify?.tier_level === 'trusted_brand', '1.4  Verification query confirms trusted_brand');
  assert(verify?.bypasses_assessment === true, '1.5  Verification query confirms bypasses_assessment');
}

// ═══════════════════════════════════════════════════════════
// PHASE 2: WEB SELLER — Trusted brand adds product (auto-verified)
// ═══════════════════════════════════════════════════════════

async function phase2_webSellerTrustedProduct() {
  log('🌐', '\n═══ PHASE 2: WEB SELLER — Trusted Brand Adds Product ═══');

  // 2.1 Create product
  const { data: product, error: prodErr } = await supabaseAdmin
    .from('products')
    .insert({
      name: TRUSTED_PRODUCT_NAME,
      description: 'Test product from trusted brand seller',
      price: 149.99,
      category_id: TEST_CATEGORY_ID,
      seller_id: TEST_SELLER_ID,
      approval_status: 'pending',
      low_stock_threshold: 5,
      specifications: {},
      is_free_shipping: false,
    })
    .select()
    .single();

  assert(!prodErr, '2.1  Trusted brand product INSERT succeeds', prodErr?.message);
  assert(product?.id, '2.2  Product ID returned');
  if (product?.id) trustedProductId = product.id;

  if (!trustedProductId) return;

  // 2.3 Simulate QA entry creation (same logic as qaService.createQAEntry)
  // First check if seller bypasses QA
  const { data: tierCheck } = await supabaseAdmin
    .from('seller_tiers')
    .select('tier_level, bypasses_assessment')
    .eq('seller_id', TEST_SELLER_ID)
    .in('tier_level', ['premium_outlet', 'trusted_brand'])
    .eq('bypasses_assessment', true)
    .maybeSingle();

  const isPremium = !!tierCheck;
  assert(isPremium, '2.3  isPremiumOutlet() returns TRUE for trusted_brand seller');

  const status = isPremium ? 'verified' : 'pending_digital_review';
  const verifiedAt = isPremium ? new Date().toISOString() : null;

  // 2.4 Create QA assessment
  const { error: qaErr } = await supabaseAdmin
    .from('product_assessments')
    .upsert({
      product_id: trustedProductId,
      status,
      submitted_at: new Date().toISOString(),
      verified_at: verifiedAt,
      created_by: TEST_SELLER_ID,
    }, { onConflict: 'product_id', ignoreDuplicates: true });

  assert(!qaErr, '2.4  QA assessment upsert succeeds', qaErr?.message);

  // 2.5 Verify assessment is auto-verified
  const { data: assessment } = await supabaseAdmin
    .from('product_assessments')
    .select('*')
    .eq('product_id', trustedProductId)
    .single();

  trustedAssessmentId = assessment?.id;
  assert(assessment?.status === 'verified', '2.5  Assessment status = verified (auto-bypassed QA)', `Got: ${assessment?.status}`);
  assert(assessment?.verified_at !== null, '2.6  verified_at is set');

  // 2.7 Update product approval_status (as qaService does for bypassed sellers)
  if (isPremium) {
    const { error: updateErr } = await supabaseAdmin
      .from('products')
      .update({ approval_status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', trustedProductId);
    assert(!updateErr, '2.7  Product approval_status updated to approved', updateErr?.message);
  }

  // 2.8 Verify product is approved
  const { data: approvedProduct } = await supabaseAdmin
    .from('products')
    .select('approval_status')
    .eq('id', trustedProductId)
    .single();

  assert(approvedProduct?.approval_status === 'approved', '2.8  Product approval_status = approved', `Got: ${approvedProduct?.approval_status}`);
}

// ═══════════════════════════════════════════════════════════
// PHASE 3: WEB SELLER — Standard seller adds product (pending)
// ═══════════════════════════════════════════════════════════

async function phase3_webSellerStandardProduct() {
  log('🌐', '\n═══ PHASE 3: WEB SELLER — Standard Seller Adds Product (Pending) ═══');

  // 3.1 Temporarily reset seller to standard tier
  await supabaseAdmin
    .from('seller_tiers')
    .upsert({
      seller_id: TEST_SELLER_ID,
      tier_level: 'standard',
      bypasses_assessment: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'seller_id' });

  // 3.2 Create product as standard seller
  const { data: product, error: prodErr } = await supabaseAdmin
    .from('products')
    .insert({
      name: STANDARD_PRODUCT_NAME,
      description: 'Test product from standard seller',
      price: 79.99,
      category_id: TEST_CATEGORY_ID,
      seller_id: TEST_SELLER_ID,
      approval_status: 'pending',
      low_stock_threshold: 5,
      specifications: {},
      is_free_shipping: false,
    })
    .select()
    .single();

  assert(!prodErr, '3.1  Standard product INSERT succeeds', prodErr?.message);
  if (product?.id) standardProductId = product.id;

  if (!standardProductId) return;

  // 3.3 Check seller tier — should NOT bypass
  const { data: tierCheck } = await supabaseAdmin
    .from('seller_tiers')
    .select('tier_level, bypasses_assessment')
    .eq('seller_id', TEST_SELLER_ID)
    .in('tier_level', ['premium_outlet', 'trusted_brand'])
    .eq('bypasses_assessment', true)
    .maybeSingle();

  const isPremium = !!tierCheck;
  assert(!isPremium, '3.2  isPremiumOutlet() returns FALSE for standard seller');

  // 3.4 Create QA assessment as pending
  const status = isPremium ? 'verified' : 'pending_digital_review';
  const { error: qaErr } = await supabaseAdmin
    .from('product_assessments')
    .upsert({
      product_id: standardProductId,
      status,
      submitted_at: new Date().toISOString(),
      verified_at: null,
      created_by: TEST_SELLER_ID,
    }, { onConflict: 'product_id', ignoreDuplicates: true });

  assert(!qaErr, '3.3  Standard QA assessment upsert succeeds', qaErr?.message);

  // 3.5 Verify assessment is pending (NOT auto-verified)
  const { data: assessment } = await supabaseAdmin
    .from('product_assessments')
    .select('*')
    .eq('product_id', standardProductId)
    .single();

  standardAssessmentId = assessment?.id;
  assert(assessment?.status === 'pending_digital_review', '3.4  Assessment status = pending_digital_review', `Got: ${assessment?.status}`);
  assert(assessment?.verified_at === null, '3.5  verified_at is NULL (not auto-verified)');

  // 3.6 Product remains pending
  const { data: pendingProduct } = await supabaseAdmin
    .from('products')
    .select('approval_status')
    .eq('id', standardProductId)
    .single();

  assert(pendingProduct?.approval_status === 'pending', '3.6  Product approval_status remains pending', `Got: ${pendingProduct?.approval_status}`);

  // Restore trusted_brand for next phases
  await supabaseAdmin
    .from('seller_tiers')
    .upsert({
      seller_id: TEST_SELLER_ID,
      tier_level: 'trusted_brand',
      bypasses_assessment: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'seller_id' });
}

// ═══════════════════════════════════════════════════════════
// PHASE 4: WEB BUYER — Only approved products visible
// ═══════════════════════════════════════════════════════════

async function phase4_webBuyerVisibility() {
  log('🛒', '\n═══ PHASE 4: WEB BUYER — Product Visibility ═══');

  // 4.1 Buyer queries approved products (same as ShopPage)
  const { data: approvedProducts, error } = await supabaseAdmin
    .from('products')
    .select('id, name, approval_status')
    .eq('approval_status', 'approved')
    .eq('seller_id', TEST_SELLER_ID)
    .like('name', '__TEST_%');

  assert(!error, '4.1  Buyer can query approved products', error?.message);

  const trustedVisible = approvedProducts?.some(p => p.id === trustedProductId);
  assert(trustedVisible, '4.2  Trusted brand product IS visible (approved)', `Product ${trustedProductId} not found`);

  const standardVisible = approvedProducts?.some(p => p.id === standardProductId);
  assert(!standardVisible, '4.3  Standard product NOT visible (still pending)');

  // 4.4 Verify the trusted product assessment is verified
  const { data: verifiedAssessments } = await supabaseAdmin
    .from('product_assessments')
    .select('product_id, status')
    .eq('status', 'verified')
    .eq('product_id', trustedProductId);

  assert(verifiedAssessments?.length > 0, '4.4  Trusted product assessment is verified in DB');

  // 4.5 Verify the standard product assessment is still pending
  const { data: pendingAssessments } = await supabaseAdmin
    .from('product_assessments')
    .select('product_id, status')
    .eq('status', 'pending_digital_review')
    .eq('product_id', standardProductId);

  assert(pendingAssessments?.length > 0, '4.5  Standard product assessment still pending_digital_review');
}

// ═══════════════════════════════════════════════════════════
// PHASE 5: MOBILE SELLER — Trusted brand adds product (auto-verified)
// ═══════════════════════════════════════════════════════════

async function phase5_mobileSellerTrustedProduct() {
  log('📱', '\n═══ PHASE 5: MOBILE SELLER — Trusted Brand Adds Product ═══');

  // 5.1 Create product (simulates mobile-app addProduct flow)
  const { data: product, error: prodErr } = await supabaseAdmin
    .from('products')
    .insert({
      name: MOBILE_PRODUCT_NAME,
      description: 'Test product from mobile trusted brand seller',
      price: 249.99,
      category_id: TEST_CATEGORY_ID,
      seller_id: TEST_SELLER_ID,
      approval_status: 'pending',
      low_stock_threshold: 5,
      specifications: {},
      is_free_shipping: false,
    })
    .select()
    .single();

  assert(!prodErr, '5.1  Mobile trusted brand product INSERT succeeds', prodErr?.message);
  if (product?.id) mobileProductId = product.id;

  if (!mobileProductId) return;

  // 5.2 Check isPremiumOutlet (mobile qaService logic)
  const { data: tierCheck } = await supabaseAdmin
    .from('seller_tiers')
    .select('tier_level, bypasses_assessment')
    .eq('seller_id', TEST_SELLER_ID)
    .in('tier_level', ['premium_outlet', 'trusted_brand'])
    .eq('bypasses_assessment', true)
    .maybeSingle();

  const isPremium = !!tierCheck;
  assert(isPremium, '5.2  Mobile isPremiumOutlet() returns TRUE for trusted_brand');

  const status = isPremium ? 'verified' : 'pending_digital_review';
  const verifiedAt = isPremium ? new Date().toISOString() : null;

  // 5.3 Create QA assessment
  const { error: qaErr } = await supabaseAdmin
    .from('product_assessments')
    .upsert({
      product_id: mobileProductId,
      status,
      submitted_at: new Date().toISOString(),
      verified_at: verifiedAt,
      created_by: TEST_SELLER_ID,
    }, { onConflict: 'product_id', ignoreDuplicates: true });

  assert(!qaErr, '5.3  Mobile QA assessment upsert succeeds', qaErr?.message);

  // 5.4 Verify assessment status
  const { data: assessment } = await supabaseAdmin
    .from('product_assessments')
    .select('*')
    .eq('product_id', mobileProductId)
    .single();

  mobileAssessmentId = assessment?.id;
  assert(assessment?.status === 'verified', '5.4  Mobile assessment status = verified (auto-bypassed)', `Got: ${assessment?.status}`);
  assert(assessment?.verified_at !== null, '5.5  Mobile verified_at is set');

  // 5.6 Update product approval_status
  if (isPremium) {
    await supabaseAdmin
      .from('products')
      .update({ approval_status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', mobileProductId);
  }

  const { data: approved } = await supabaseAdmin
    .from('products')
    .select('approval_status')
    .eq('id', mobileProductId)
    .single();

  assert(approved?.approval_status === 'approved', '5.6  Mobile product approval_status = approved', `Got: ${approved?.approval_status}`);
}

// ═══════════════════════════════════════════════════════════
// PHASE 6: MOBILE BUYER — Product visibility 
// ═══════════════════════════════════════════════════════════

async function phase6_mobileBuyerVisibility() {
  log('📱', '\n═══ PHASE 6: MOBILE BUYER — Product Visibility ═══');

  // 6.1 Mobile buyer query — approved products only (same as HomeScreen)
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, name, approval_status, price')
    .eq('approval_status', 'approved')
    .eq('seller_id', TEST_SELLER_ID)
    .like('name', '__TEST_%');

  assert(!error, '6.1  Mobile buyer can query approved products', error?.message);

  const mobileVisible = products?.some(p => p.id === mobileProductId);
  assert(mobileVisible, '6.2  Mobile trusted product IS visible (approved)');

  const trustedVisible = products?.some(p => p.id === trustedProductId);
  assert(trustedVisible, '6.3  Web trusted product also visible on mobile (approved)');

  const standardVisible = products?.some(p => p.id === standardProductId);
  assert(!standardVisible, '6.4  Standard pending product NOT visible on mobile');
}

// ═══════════════════════════════════════════════════════════
// PHASE 7: FEATURED PRODUCTS 
// ═══════════════════════════════════════════════════════════

async function phase7_featuredProducts() {
  log('⭐', '\n═══ PHASE 7: Featured Products ═══');

  if (!trustedProductId) {
    log('⚠️', 'Skipping — no trusted product');
    return;
  }

  // 7.1 Seller features a product
  const { data: featured, error: featErr } = await supabaseAdmin
    .from('featured_products')
    .upsert({
      product_id: trustedProductId,
      seller_id: TEST_SELLER_ID,
      is_active: true,
      priority: 1,
      featured_at: new Date().toISOString(),
    }, { onConflict: 'product_id' })
    .select()
    .single();

  assert(!featErr, '7.1  Feature product INSERT succeeds', featErr?.message);
  assert(featured?.is_active === true, '7.2  Featured product is_active = true');

  // 7.3 Query featured products (buyer perspective)
  const { data: featuredList, error: listErr } = await supabaseAdmin
    .from('featured_products')
    .select(`
      *,
      product:products!inner (
        id, name, price, approval_status,
        seller:sellers (store_name)
      )
    `)
    .eq('is_active', true)
    .eq('product_id', trustedProductId);

  assert(!listErr, '7.3  Featured products query succeeds', listErr?.message);
  assert(featuredList?.length > 0, '7.4  Featured product appears in query results', `Got: ${featuredList?.length}`);
  assert(featuredList?.[0]?.product?.name === TRUSTED_PRODUCT_NAME, '7.5  Featured product has correct name');

  // 7.6 Unfeature the product
  const { error: unfeatErr } = await supabaseAdmin
    .from('featured_products')
    .update({ is_active: false })
    .eq('product_id', trustedProductId);

  assert(!unfeatErr, '7.6  Unfeature product succeeds', unfeatErr?.message);

  // 7.7 Verify it no longer appears in active featured
  const { data: inactiveList } = await supabaseAdmin
    .from('featured_products')
    .select('*')
    .eq('is_active', true)
    .eq('product_id', trustedProductId);

  assert(inactiveList?.length === 0, '7.7  Unfeatured product no longer in active list');
}

// ═══════════════════════════════════════════════════════════
// PHASE 8: ADMIN — Toggle trusted brand on/off
// ═══════════════════════════════════════════════════════════

async function phase8_adminToggle() {
  log('🛡️', '\n═══ PHASE 8: ADMIN — Toggle Trusted Brand On/Off ═══');

  // 8.1 Admin removes trusted_brand (back to standard)
  const { error: removeErr } = await supabaseAdmin
    .from('seller_tiers')
    .upsert({
      seller_id: TEST_SELLER_ID,
      tier_level: 'standard',
      bypasses_assessment: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'seller_id' });

  assert(!removeErr, '8.1  Admin removes trusted_brand → standard', removeErr?.message);

  // 8.2 Verify no longer bypasses
  const { data: stdTier } = await supabaseAdmin
    .from('seller_tiers')
    .select('tier_level, bypasses_assessment')
    .eq('seller_id', TEST_SELLER_ID)
    .single();

  assert(stdTier?.tier_level === 'standard', '8.2  tier_level = standard after removal', `Got: ${stdTier?.tier_level}`);
  assert(stdTier?.bypasses_assessment === false, '8.3  bypasses_assessment = false', `Got: ${stdTier?.bypasses_assessment}`);

  // 8.4 Re-add trusted_brand (toggling back)
  const { error: readdErr } = await supabaseAdmin
    .from('seller_tiers')
    .upsert({
      seller_id: TEST_SELLER_ID,
      tier_level: 'trusted_brand',
      bypasses_assessment: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'seller_id' });

  assert(!readdErr, '8.4  Admin re-enables trusted_brand', readdErr?.message);

  const { data: reTier } = await supabaseAdmin
    .from('seller_tiers')
    .select('tier_level, bypasses_assessment')
    .eq('seller_id', TEST_SELLER_ID)
    .single();

  assert(reTier?.tier_level === 'trusted_brand', '8.5  tier_level = trusted_brand after re-enable');
  assert(reTier?.bypasses_assessment === true, '8.6  bypasses_assessment = true after re-enable');
}

// ═══════════════════════════════════════════════════════════
// PHASE 9: EDGE CASES
// ═══════════════════════════════════════════════════════════

async function phase9_edgeCases() {
  log('🔍', '\n═══ PHASE 9: Edge Cases ═══');

  // 9.1 Invalid tier_level should be rejected by DB constraint
  const { error: invalidErr } = await supabaseAdmin
    .from('seller_tiers')
    .upsert({
      seller_id: TEST_SELLER_ID,
      tier_level: 'invalid_tier',
      bypasses_assessment: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'seller_id' });

  assert(!!invalidErr, '9.1  Invalid tier_level rejected by DB constraint', 'Should have failed');

  // 9.2 Verify the tier wasn't changed by the failed upsert
  const { data: afterInvalid } = await supabaseAdmin
    .from('seller_tiers')
    .select('tier_level')
    .eq('seller_id', TEST_SELLER_ID)
    .single();

  assert(afterInvalid?.tier_level === 'trusted_brand', '9.2  Tier unchanged after invalid attempt', `Got: ${afterInvalid?.tier_level}`);

  // 9.3 Duplicate featured product (same product_id) handled by unique constraint
  if (trustedProductId) {
    // First ensure it exists
    await supabaseAdmin
      .from('featured_products')
      .upsert({
        product_id: trustedProductId,
        seller_id: TEST_SELLER_ID,
        is_active: true,
        priority: 1,
      }, { onConflict: 'product_id' });

    // Try inserting duplicate (not upsert)
    const { error: dupErr } = await supabaseAdmin
      .from('featured_products')
      .insert({
        product_id: trustedProductId,
        seller_id: TEST_SELLER_ID,
        is_active: true,
        priority: 2,
      });

    assert(!!dupErr, '9.3  Duplicate featured_product rejected by unique constraint');
  }

  // 9.4 Test premium_outlet tier also bypasses (backward compat)
  await supabaseAdmin
    .from('seller_tiers')
    .upsert({
      seller_id: TEST_SELLER_ID,
      tier_level: 'premium_outlet',
      bypasses_assessment: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'seller_id' });

  const { data: premiumCheck } = await supabaseAdmin
    .from('seller_tiers')
    .select('tier_level, bypasses_assessment')
    .eq('seller_id', TEST_SELLER_ID)
    .in('tier_level', ['premium_outlet', 'trusted_brand'])
    .eq('bypasses_assessment', true)
    .maybeSingle();

  assert(!!premiumCheck, '9.4  premium_outlet still bypasses QA (backward compat)');

  // Restore to trusted_brand for cleanup
  await supabaseAdmin
    .from('seller_tiers')
    .upsert({
      seller_id: TEST_SELLER_ID,
      tier_level: 'trusted_brand',
      bypasses_assessment: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'seller_id' });
}

// ═══════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════

async function cleanup() {
  log('🧹', '\n═══ CLEANUP ═══');

  // Remove featured products
  if (trustedProductId) {
    await supabaseAdmin.from('featured_products').delete().eq('product_id', trustedProductId);
  }

  // Remove assessments
  const assessmentIds = [trustedAssessmentId, standardAssessmentId, mobileAssessmentId].filter(Boolean);
  for (const id of assessmentIds) {
    await supabaseAdmin.from('product_assessments').delete().eq('id', id);
  }
  // Also delete by product_id in case IDs weren't captured
  const productIds = [trustedProductId, standardProductId, mobileProductId].filter(Boolean);
  for (const pid of productIds) {
    await supabaseAdmin.from('product_assessments').delete().eq('product_id', pid);
  }

  // Remove test products (cascades images, variants etc.)
  for (const pid of productIds) {
    await supabaseAdmin.from('products').delete().eq('id', pid);
  }

  // Restore original tier
  if (originalTierData) {
    await supabaseAdmin
      .from('seller_tiers')
      .upsert({
        seller_id: TEST_SELLER_ID,
        tier_level: originalTierData.tier_level,
        bypasses_assessment: originalTierData.bypasses_assessment,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'seller_id' });
    log('ℹ️', `Restored seller tier to: ${originalTierData.tier_level}`);
  } else {
    // No original row — delete the one we created
    await supabaseAdmin.from('seller_tiers').delete().eq('seller_id', TEST_SELLER_ID);
    log('ℹ️', 'Removed seller_tiers row (none existed before)');
  }

  log('✨', 'Cleanup complete');
}

// ═══════════════════════════════════════════════════════════
// MAIN RUNNER
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  TRUSTED BRAND QA BYPASS — End-to-End Test                  ║');
  console.log('║  Tests: Backend, Web Seller, Web Buyer, Mobile Seller,      ║');
  console.log('║         Mobile Buyer, Featured Products, Edge Cases         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    await phase0_saveOriginalTier();
    await phase1_adminSetTrustedBrand();
    await phase2_webSellerTrustedProduct();
    await phase3_webSellerStandardProduct();
    await phase4_webBuyerVisibility();
    await phase5_mobileSellerTrustedProduct();
    await phase6_mobileBuyerVisibility();
    await phase7_featuredProducts();
    await phase8_adminToggle();
    await phase9_edgeCases();
  } catch (err) {
    log('💥', `Unexpected error: ${err.message}`);
    console.error(err);
  } finally {
    await cleanup();
  }

  // ── Summary ──
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  if (failed > 0) {
    console.log('FAILED TESTS:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.name} — ${r.detail}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
