/**
 * Cross-Platform Add Product & QA Process Test
 * ==============================================
 * Tests the full lifecycle:
 *   1. Seller adds product with images + variants (simulates mobile-app flow)
 *   2. Assessment (QA entry) is auto-created via upsert
 *   3. Admin can see the product in QA approvals (web flow) — with pre-joined data
 *   4. Seller sees only their products (mobile flow) — with pre-joined data
 *   5. Admin approves → seller status updates
 *   6. Seller submits sample → admin reviews
 *   7. Admin verifies → product goes live
 *   8. Rejection & revision flows
 *   9. Image sanitization logic
 *   10. Data integrity constraints
 *   11. Cleanup: removes test data
 *
 * Usage: node test-add-product-qa-cross-platform.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzUyMTUsImV4cCI6MjA4NTgxMTIxNX0.slNSrIdWo-EH4lpJQRIsIw9XbhaFKXsa2nICDmVBTrY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test data — uses a real seller and category from the DB
const TEST_SELLER_ID = '7955043d-f46f-47aa-8767-0582c35b95c7'; // TechHub Electronics
const TEST_CATEGORY_ID = 'fc4fc320-3248-4762-9042-928b4f0ee142'; // Electronics

const TEST_PRODUCT_NAME = `__TEST_CROSS_PLATFORM_${Date.now()}`;
const TEST_PRODUCT_IMAGES = [
  'https://placehold.co/400x400?text=Test+Main',
  'https://placehold.co/400x400?text=Test+Side',
  'https://placehold.co/400x400?text=Test+Back',
];

let testProductId = null;
let testAssessmentId = null;
let testVariantIds = [];
let testImageIds = [];

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

// ═══════════════════════════════════════════════
// PHASE 1: Seller Adds Product (Mobile Flow)
// ═══════════════════════════════════════════════

async function test_01_createProduct() {
  log('📦', '— PHASE 1: Seller Creates Product (Mobile) —');

  const { data, error } = await supabase
    .from('products')
    .insert({
      name: TEST_PRODUCT_NAME,
      description: 'Cross-platform test product for QA flow verification',
      price: 999.99,
      category_id: TEST_CATEGORY_ID,
      seller_id: TEST_SELLER_ID,
      approval_status: 'pending',
      low_stock_threshold: 10,
      specifications: {},
      is_free_shipping: false,
      variant_label_1: 'Size',
      variant_label_2: 'Color',
    })
    .select()
    .single();

  assert(!error, '1.1  Product INSERT succeeds', error?.message);
  assert(data?.id, '1.2  Product ID returned', 'No ID');
  assert(data?.approval_status === 'pending', '1.3  approval_status = pending');
  assert(data?.seller_id === TEST_SELLER_ID, '1.4  seller_id matches');

  if (data?.id) testProductId = data.id;
  return !!data?.id;
}

async function test_02_createDefaultVariant() {
  if (!testProductId) return;

  const { data, error } = await supabase
    .from('product_variants')
    .insert({
      product_id: testProductId,
      variant_name: 'Default',
      sku: `TEST-SKU-${Date.now()}`,
      price: 999.99,
      stock: 50,
      size: 'M',
      color: 'Black',
      option_1_value: 'M',
      option_2_value: 'Black',
    })
    .select()
    .single();

  assert(!error, '1.5  Default variant INSERT succeeds', error?.message);
  assert(data?.stock === 50, '1.6  Variant stock = 50');

  if (data?.id) testVariantIds.push(data.id);
}

async function test_03_createProductImages() {
  if (!testProductId) return;

  // Mobile now saves images via addProductImages (CRITICAL FIX)
  const imageInserts = TEST_PRODUCT_IMAGES.map((url, idx) => ({
    product_id: testProductId,
    image_url: url,
    is_primary: idx === 0,
    sort_order: idx,
    alt_text: '',
  }));

  const { data, error } = await supabase
    .from('product_images')
    .insert(imageInserts)
    .select();

  assert(!error, '1.7  Multiple product images INSERT succeeds', error?.message);
  assert(data?.length === TEST_PRODUCT_IMAGES.length, `1.8  ${TEST_PRODUCT_IMAGES.length} images saved to DB`, `Got ${data?.length}`);

  // Verify primary image flag
  const primary = data?.find(img => img.is_primary);
  assert(!!primary, '1.9  Primary image flag set correctly');

  if (data) testImageIds = data.map(d => d.id);
}

// ═══════════════════════════════════════════════
// PHASE 2: QA Entry Created (Upsert — Mobile)
// ═══════════════════════════════════════════════

async function test_04_createQAEntry() {
  log('📋', '— PHASE 2: QA Assessment Created via Upsert —');

  if (!testProductId) return;

  // Simulate createQAEntry from qaService (upsert, not insert+select)
  const { error } = await supabase
    .from('product_assessments')
    .upsert(
      {
        product_id: testProductId,
        status: 'pending_digital_review',
        submitted_at: new Date().toISOString(),
        created_by: TEST_SELLER_ID,
      },
      { onConflict: 'product_id', ignoreDuplicates: true }
    );

  assert(!error, '2.1  Assessment UPSERT succeeds', error?.message);

  // Verify the row exists
  const { data: assessment, error: fetchErr } = await supabase
    .from('product_assessments')
    .select('*')
    .eq('product_id', testProductId)
    .maybeSingle();

  assert(!fetchErr, '2.2  Assessment SELECT succeeds', fetchErr?.message);
  assert(assessment?.id, '2.3  Assessment record exists');
  assert(assessment?.status === 'pending_digital_review', '2.4  Status = pending_digital_review');
  assert(assessment?.created_by === TEST_SELLER_ID, '2.5  created_by = seller ID');

  if (assessment?.id) testAssessmentId = assessment.id;
}

async function test_05_upsertIdempotent() {
  if (!testProductId) return;

  // Same upsert again — should NOT fail (unique constraint) because ignoreDuplicates=true
  const { error } = await supabase
    .from('product_assessments')
    .upsert(
      {
        product_id: testProductId,
        status: 'pending_digital_review',
        submitted_at: new Date().toISOString(),
        created_by: TEST_SELLER_ID,
      },
      { onConflict: 'product_id', ignoreDuplicates: true }
    );

  assert(!error, '2.6  Repeat UPSERT is idempotent (no error)', error?.message);

  // Still only 1 assessment for this product
  const { data, error: countErr } = await supabase
    .from('product_assessments')
    .select('id')
    .eq('product_id', testProductId);

  assert(!countErr && data?.length === 1, '2.7  Only 1 assessment exists (no duplicate)');
}

// ═══════════════════════════════════════════════
// PHASE 3: Admin Loads QA Products (Web Flow)
// ═══════════════════════════════════════════════

async function test_06_adminLoadAllQAEntries() {
  log('🖥️', '— PHASE 3: Admin Loads QA Products (Web) —');

  // Simulates productQAStore.loadProducts(null) — getAllQAEntries with seller + logistics joins
  const { data, error } = await supabase
    .from('product_assessments')
    .select(`
      *,
      product:products (
        id, name, description, price, category_id, seller_id,
        variant_label_1, variant_label_2,
        category:categories (name),
        images:product_images (image_url, is_primary),
        variants:product_variants (id, variant_name, sku, size, color, price, stock, thumbnail_url),
        seller:sellers (store_name, owner_name)
      ),
      logistics_records:product_assessment_logistics (details),
      rejection_records:product_rejections (description),
      revision_records:product_revisions (description)
    `)
    .order('created_at', { ascending: false });

  assert(!error, '3.1  Admin getAllQAEntries query succeeds (with joins)', error?.message);

  const testEntry = data?.find(e => e.product_id === testProductId);
  assert(!!testEntry, '3.2  Test product appears in admin QA list');
  assert(testEntry?.product?.name === TEST_PRODUCT_NAME, '3.3  Product name matches');
  assert(testEntry?.product?.seller?.store_name, '3.4  Seller store_name is joined', `Got: ${testEntry?.product?.seller?.store_name}`);
  assert(testEntry?.product?.images?.length === TEST_PRODUCT_IMAGES.length, `3.5  All ${TEST_PRODUCT_IMAGES.length} product images joined`, `Got: ${testEntry?.product?.images?.length}`);
  assert(testEntry?.product?.variants?.length > 0, '3.6  Product variants joined');
  assert(testEntry?.product?.category?.name, '3.7  Category name joined');
  // Pre-joined logistics/rejection/revision arrays exist (even if empty)
  assert(Array.isArray(testEntry?.logistics_records), '3.8  logistics_records pre-joined (array)');
  assert(Array.isArray(testEntry?.rejection_records), '3.9  rejection_records pre-joined (array)');
  assert(Array.isArray(testEntry?.revision_records), '3.10 revision_records pre-joined (array)');

  log('ℹ️', `     Vendor: ${testEntry?.product?.seller?.store_name || 'Unknown'}`);
  log('ℹ️', `     Category: ${testEntry?.product?.category?.name || 'Unknown'}`);
  log('ℹ️', `     Images: ${testEntry?.product?.images?.length || 0}`);
}

async function test_07_sellerLoadQAEntries() {
  log('📱', '— PHASE 3b: Seller Loads QA Products (Mobile) —');

  // Simulates productQAStore.loadProducts(sellerId) — getQAEntriesBySeller with !inner join + pre-joined data
  const { data, error } = await supabase
    .from('product_assessments')
    .select(`
      *,
      product:products!inner (
        id, name, description, price, category_id, seller_id,
        variant_label_1, variant_label_2,
        category:categories (name),
        images:product_images (image_url, is_primary),
        variants:product_variants (id, variant_name, sku, size, color, price, stock, thumbnail_url),
        seller:sellers (store_name, owner_name)
      ),
      logistics_records:product_assessment_logistics (details),
      rejection_records:product_rejections (description),
      revision_records:product_revisions (description)
    `)
    .eq('product.seller_id', TEST_SELLER_ID)
    .order('created_at', { ascending: false });

  assert(!error, '3.11 Seller getQAEntriesBySeller (!inner + pre-joins) succeeds', error?.message);

  const testEntry = data?.find(e => e.product_id === testProductId);
  assert(!!testEntry, '3.12 Test product appears in seller QA list');

  // Verify no entries leak from other sellers
  const otherSeller = data?.find(e => e.product?.seller_id && e.product.seller_id !== TEST_SELLER_ID);
  assert(!otherSeller, '3.13 No products from other sellers leak through');

  // Verify pre-joined arrays
  assert(Array.isArray(testEntry?.logistics_records), '3.14 Seller view has logistics_records pre-joined');
}

// ═══════════════════════════════════════════════
// PHASE 4: Orphan Reconciliation (Admin Safety Net)
// ═══════════════════════════════════════════════

async function test_08_orphanDetection() {
  log('🔍', '— PHASE 4: Orphan Reconciliation —');

  // Simulate getOrphanProducts: find products without assessments
  const { data: assessed } = await supabase
    .from('product_assessments')
    .select('product_id');

  const assessedIds = new Set((assessed || []).map(a => a.product_id));

  const { data: products } = await supabase
    .from('products')
    .select('id, name, seller_id, seller:sellers (store_name)')
    .order('created_at', { ascending: false });

  const orphans = (products || []).filter(p => !assessedIds.has(p.id));

  assert(true, `4.1  Orphan detection ran — found ${orphans.length} orphan(s)`);

  // Our test product should NOT be an orphan (it has an assessment)
  const testOrphan = orphans.find(o => o.id === testProductId);
  assert(!testOrphan, '4.2  Test product is NOT an orphan (has assessment)');
}

// ═══════════════════════════════════════════════
// PHASE 5: QA Workflow — Admin Approves (Web)
// ═══════════════════════════════════════════════

async function test_09_adminApproveDigital() {
  log('✅', '— PHASE 5: QA Workflow Status Transitions —');

  if (!testProductId || !testAssessmentId) return;

  // First test: updateQAStatus-style safe assessment lookup with .maybeSingle() + .order().limit(1)
  const { data: safeLookup, error: lookupErr } = await supabase
    .from('product_assessments')
    .select('id')
    .eq('product_id', testProductId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  assert(!lookupErr, '5.1  Safe assessment lookup (maybeSingle+order+limit) succeeds', lookupErr?.message);
  assert(safeLookup?.id === testAssessmentId, '5.2  Correct assessment found by safe lookup');

  // Test getAssessmentByProductId style: full enriched query with .order().limit(1).maybeSingle()
  const { data: enrichedLookup, error: enrichedErr } = await supabase
    .from('product_assessments')
    .select(`
      *,
      product:products (
        id, name, description, price, category_id, seller_id,
        variant_label_1, variant_label_2,
        category:categories (name),
        images:product_images (image_url, is_primary),
        variants:product_variants (id, variant_name, sku, size, color, price, stock, thumbnail_url)
      )
    `)
    .eq('product_id', testProductId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  assert(!enrichedErr, '5.3  Enriched getAssessmentByProductId succeeds', enrichedErr?.message);
  assert(enrichedLookup?.product?.images?.length === TEST_PRODUCT_IMAGES.length, '5.4  Enriched lookup has all images');

  // Step 1: Approve digital review → waiting_for_sample
  const { error: updateErr } = await supabase
    .from('product_assessments')
    .update({ status: 'waiting_for_sample' })
    .eq('product_id', testProductId);

  assert(!updateErr, '5.5  Admin: pending_digital → waiting_for_sample', updateErr?.message);

  // Create approval record
  const { error: approvalErr } = await supabase
    .from('product_approvals')
    .insert({
      assessment_id: testAssessmentId,
      description: 'Digital review passed, awaiting sample',
    });

  assert(!approvalErr, '5.6  Approval record created', approvalErr?.message);

  // Update products.approval_status
  const { error: prodErr } = await supabase
    .from('products')
    .update({ approval_status: 'pending', updated_at: new Date().toISOString() })
    .eq('id', testProductId);

  assert(!prodErr, '5.7  Product approval_status updated', prodErr?.message);

  // Verify
  const { data } = await supabase
    .from('product_assessments')
    .select('status')
    .eq('product_id', testProductId)
    .maybeSingle();

  assert(data?.status === 'waiting_for_sample', '5.8  Assessment status = waiting_for_sample');
}

async function test_10_sellerSubmitSample() {
  if (!testProductId || !testAssessmentId) return;

  // Step 2: Seller submits sample → pending_physical_review
  const { error: updateErr } = await supabase
    .from('product_assessments')
    .update({ status: 'pending_physical_review' })
    .eq('product_id', testProductId);

  assert(!updateErr, '5.9  Seller: waiting_for_sample → pending_physical_review', updateErr?.message);

  // Create logistics record
  const { error: logErr } = await supabase
    .from('product_assessment_logistics')
    .insert({
      assessment_id: testAssessmentId,
      details: 'Drop-off by Courier — Test',
    });

  assert(!logErr, '5.10 Logistics record created', logErr?.message);

  const { data } = await supabase
    .from('product_assessments')
    .select('status')
    .eq('product_id', testProductId)
    .maybeSingle();

  assert(data?.status === 'pending_physical_review', '5.11 Assessment status = pending_physical_review');
}

async function test_11_adminVerifyProduct() {
  if (!testProductId || !testAssessmentId) return;

  // Step 3: Admin verifies → verified (product goes live)
  const { error: updateErr } = await supabase
    .from('product_assessments')
    .update({
      status: 'verified',
      verified_at: new Date().toISOString(),
    })
    .eq('product_id', testProductId);

  assert(!updateErr, '5.12 Admin: pending_physical → verified', updateErr?.message);

  // Update products.approval_status to approved
  const { error: prodErr } = await supabase
    .from('products')
    .update({ approval_status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', testProductId);

  assert(!prodErr, '5.13 Product approval_status = approved', prodErr?.message);

  // Create approval record for verification
  const { error: approvalErr } = await supabase
    .from('product_approvals')
    .insert({
      assessment_id: testAssessmentId,
      description: 'Product verified and approved',
    });

  assert(!approvalErr, '5.14 Verification approval record created', approvalErr?.message);

  // Final verification
  const { data: assessment } = await supabase
    .from('product_assessments')
    .select('status, verified_at')
    .eq('product_id', testProductId)
    .maybeSingle();

  assert(assessment?.status === 'verified', '5.15 Final assessment status = verified');
  assert(!!assessment?.verified_at, '5.16 verified_at timestamp set');

  const { data: product } = await supabase
    .from('products')
    .select('approval_status')
    .eq('id', testProductId)
    .single();

  assert(product?.approval_status === 'approved', '5.17 Product approval_status = approved');
}

// ═══════════════════════════════════════════════
// PHASE 6: Rejection & Revision Flow
// ═══════════════════════════════════════════════

async function test_12_rejectionFlow() {
  log('🔄', '— PHASE 6: Rejection & Revision Flow —');

  if (!testProductId || !testAssessmentId) return;

  // Test revision request
  const { error: revErr } = await supabase
    .from('product_assessments')
    .update({
      status: 'for_revision',
      revision_requested_at: new Date().toISOString(),
    })
    .eq('product_id', testProductId);

  assert(!revErr, '6.1  Status → for_revision', revErr?.message);

  const { error: revRecErr } = await supabase
    .from('product_revisions')
    .insert({
      assessment_id: testAssessmentId,
      description: 'Please update product images — test',
    });

  assert(!revRecErr, '6.2  Revision record created', revRecErr?.message);

  // Test rejection
  const { error: rejErr } = await supabase
    .from('product_assessments')
    .update({ status: 'rejected' })
    .eq('product_id', testProductId);

  assert(!rejErr, '6.3  Status → rejected', rejErr?.message);

  const { error: rejRecErr } = await supabase
    .from('product_rejections')
    .insert({
      assessment_id: testAssessmentId,
      product_id: testProductId,
      description: 'Product does not meet quality standards — test',
    });

  assert(!rejRecErr, '6.4  Rejection record created', rejRecErr?.message);

  // Verify joined data reads back correctly (like transformToLegacy does)
  const { data: logistics } = await supabase
    .from('product_assessment_logistics')
    .select('details')
    .eq('assessment_id', testAssessmentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  assert(logistics?.details?.includes('Courier'), '6.5  Logistics details readable via maybeSingle()');

  const { data: rejection } = await supabase
    .from('product_rejections')
    .select('description')
    .eq('assessment_id', testAssessmentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  assert(rejection?.description?.includes('quality'), '6.6  Rejection description readable');

  const { data: revision } = await supabase
    .from('product_revisions')
    .select('description')
    .eq('assessment_id', testAssessmentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  assert(revision?.description?.includes('images'), '6.7  Revision description readable');
}

// ═══════════════════════════════════════════════
// PHASE 7: Image URL Sanitization
// ═══════════════════════════════════════════════

function test_13_imageSanitization() {
  log('🖼️', '— PHASE 7: Image URL Sanitization —');

  // Inline the logic from imageUtils.ts for testing
  const BLOCKED_DOMAINS = [
    'facebook.com', 'fbcdn.net', 'fbsbx.com',
    'instagram.com', 'cdninstagram.com',
    'twimg.com', 'pbs.twimg.com',
  ];

  const PLACEHOLDER = 'https://placehold.co/400x400?text=No+Image';

  function getSafeImageUrl(url) {
    if (!url) return PLACEHOLDER;
    try {
      const { hostname } = new URL(url);
      if (BLOCKED_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`))) {
        return PLACEHOLDER;
      }
    } catch { /* pass */ }
    return url;
  }

  assert(getSafeImageUrl(null) === PLACEHOLDER, '7.1  null → placeholder');
  assert(getSafeImageUrl('') === PLACEHOLDER, '7.2  empty string → placeholder');
  assert(getSafeImageUrl(undefined) === PLACEHOLDER, '7.3  undefined → placeholder');

  assert(
    getSafeImageUrl('https://scontent-sin6-4.xx.fbcdn.net/v/photo.jpg') === PLACEHOLDER,
    '7.4  Facebook CDN URL → blocked'
  );
  assert(
    getSafeImageUrl('https://www.facebook.com/photo/?fbid=12345') === PLACEHOLDER,
    '7.5  Facebook photo URL → blocked'
  );
  assert(
    getSafeImageUrl('https://pbs.twimg.com/media/photo.jpg') === PLACEHOLDER,
    '7.6  Twitter media URL → blocked'
  );
  assert(
    getSafeImageUrl('https://scontent.cdninstagram.com/v/photo.jpg') === PLACEHOLDER,
    '7.7  Instagram CDN URL → blocked'
  );

  // Valid URLs should pass through
  assert(
    getSafeImageUrl('https://placehold.co/100?text=OK') === 'https://placehold.co/100?text=OK',
    '7.8  placehold.co → passes through'
  );
  assert(
    getSafeImageUrl('https://ijdpbfrcvdflzwytxncj.supabase.co/storage/v1/object/test.jpg').includes('supabase'),
    '7.9  Supabase storage URL → passes through'
  );
  assert(
    getSafeImageUrl('https://example.com/img.png') === 'https://example.com/img.png',
    '7.10 Regular URL → passes through'
  );
}

// ═══════════════════════════════════════════════
// PHASE 8: Data Integrity Checks
// ═══════════════════════════════════════════════

async function test_14_dataIntegrity() {
  log('🔒', '— PHASE 8: Data Integrity —');

  // Verify unique constraint on product_assessments.product_id
  if (!testProductId) return;

  const { error: dupErr } = await supabase
    .from('product_assessments')
    .insert({
      product_id: testProductId,
      status: 'pending_digital_review',
      submitted_at: new Date().toISOString(),
    });

  assert(!!dupErr, '8.1  Duplicate product_id INSERT fails (unique constraint)');

  // Verify FK: product_assessments.product_id → products.id
  const { error: fkErr } = await supabase
    .from('product_assessments')
    .insert({
      product_id: '00000000-0000-0000-0000-000000000000',
      status: 'pending_digital_review',
      submitted_at: new Date().toISOString(),
    });

  assert(!!fkErr, '8.2  Invalid product_id fails (FK constraint)');

  // Verify status enum
  const { error: enumErr } = await supabase
    .from('product_assessments')
    .update({ status: 'invalid_status_xyz' })
    .eq('product_id', testProductId);

  assert(!!enumErr, '8.3  Invalid status value fails (CHECK constraint)');

  // Count total products vs assessments
  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  const { count: assessmentCount } = await supabase
    .from('product_assessments')
    .select('*', { count: 'exact', head: true });

  log('ℹ️', `     Products: ${productCount}, Assessments: ${assessmentCount}`);
  assert(
    assessmentCount <= productCount,
    `8.4  Assessments (${assessmentCount}) ≤ Products (${productCount})`
  );
}

// ═══════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════

async function cleanup() {
  log('🧹', '— CLEANUP —');

  if (testAssessmentId) {
    // Delete related records first (FK order)
    await supabase.from('product_approvals').delete().eq('assessment_id', testAssessmentId);
    await supabase.from('product_rejections').delete().eq('assessment_id', testAssessmentId);
    await supabase.from('product_revisions').delete().eq('assessment_id', testAssessmentId);
    await supabase.from('product_assessment_logistics').delete().eq('assessment_id', testAssessmentId);
    await supabase.from('product_assessments').delete().eq('id', testAssessmentId);
    log('🧹', '  Deleted assessment + related records');
  }

  if (testVariantIds.length > 0) {
    for (const vid of testVariantIds) {
      await supabase.from('product_variants').delete().eq('id', vid);
    }
    log('🧹', `  Deleted ${testVariantIds.length} variant(s)`);
  }

  if (testImageIds.length > 0) {
    for (const iid of testImageIds) {
      await supabase.from('product_images').delete().eq('id', iid);
    }
    log('🧹', `  Deleted ${testImageIds.length} product image(s)`);
  }

  if (testProductId) {
    await supabase.from('products').delete().eq('id', testProductId);
    log('🧹', '  Deleted test product');

    // Verify deletion
    const { data } = await supabase
      .from('products')
      .select('id')
      .eq('id', testProductId)
      .maybeSingle();

    assert(!data, '9.1  Test product fully cleaned up');
  }
}

// ═══════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Cross-Platform Add Product & QA Process Test               ║');
  console.log('║  Seller (Mobile) → QA Engine → Admin (Web) → Full Workflow  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Phase 1: Seller creates product with images + variants
    const productCreated = await test_01_createProduct();
    if (productCreated) {
      await test_02_createDefaultVariant();
      await test_03_createProductImages();
    }

    // Phase 2: QA entry
    await test_04_createQAEntry();
    await test_05_upsertIdempotent();

    // Phase 3: Admin + Seller load QA products
    await test_06_adminLoadAllQAEntries();
    await test_07_sellerLoadQAEntries();

    // Phase 4: Orphan detection
    await test_08_orphanDetection();

    // Phase 5: QA workflow transitions
    await test_09_adminApproveDigital();
    await test_10_sellerSubmitSample();
    await test_11_adminVerifyProduct();

    // Phase 6: Rejection & revision
    await test_12_rejectionFlow();

    // Phase 7: Image sanitization (pure logic)
    test_13_imageSanitization();

    // Phase 8: Data integrity
    await test_14_dataIntegrity();

  } catch (err) {
    console.error('\n💥 Unexpected error:', err);
  } finally {
    await cleanup();
  }

  // Summary
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('═══════════════════════════════════════════════');

  if (failed > 0) {
    console.log('\n  Failed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`    ❌ ${r.name}: ${r.detail}`);
    });
  }

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

main();
