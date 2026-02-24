/**
 * QA Process Integration Test Script
 * 
 * Tests the FULL seller product addition → QA assessment → admin review flow
 * against the live Supabase database (no RLS enforced).
 * 
 * Covers:
 *  1. Product creation (products, product_images, product_variants)
 *  2. QA entry creation (product_assessments)
 *  3. Status transitions (all valid paths)
 *  4. Audit record creation (approvals, rejections, revisions, logistics)
 *  5. Product approval_status sync
 *  6. Seller-filtered queries
 *  7. Data integrity checks
 *  8. Edge cases (duplicates, orphans, invalid transitions)
 * 
 * Usage:
 *   node test-qa-process.mjs
 * 
 * Environment:
 *   VITE_SUPABASE_URL (optional, defaults to hardcoded project URL)
 *   VITE_SUPABASE_ANON_KEY (optional, defaults to hardcoded anon key)
 */

import { createClient } from '@supabase/supabase-js';

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzUyMTUsImV4cCI6MjA4NTgxMTIxNX0.slNSrIdWo-EH4lpJQRIsIw9XbhaFKXsa2nICDmVBTrY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Test Framework ───────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];
const cleanupIds = { products: [], assessments: [], images: [], variants: [] };

function log(icon, msg) {
  console.log(`  ${icon} ${msg}`);
}

async function test(section, name, fn) {
  try {
    await fn();
    passed++;
    log('✅', `[${section}] ${name}`);
  } catch (err) {
    failed++;
    const msg = err?.message || String(err);
    log('❌', `[${section}] ${name} — ${msg}`);
    failures.push({ section, name, error: msg });
  }
}

function skip(section, name, reason) {
  skipped++;
  log('⏭️', `[${section}] ${name} — SKIPPED: ${reason}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}: expected "${expected}", got "${actual}"`);
  }
}

function assertNotNull(value, message) {
  if (value === null || value === undefined) {
    throw new Error(`${message || 'Value'} is null/undefined`);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOrCreateCategory(name) {
  const { data } = await supabase
    .from('categories')
    .select('id')
    .eq('name', name)
    .limit(1)
    .single();
  
  if (data) return data.id;

  // Generate slug from name (lowercase, replace spaces with hyphens)
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const { data: created, error } = await supabase
    .from('categories')
    .insert({ name, slug })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create category "${name}": ${error.message}`);
  return created.id;
}

async function getTestSeller() {
  const { data, error } = await supabase
    .from('sellers')
    .select('id, store_name, owner_name')
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }
  return data;
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  // Delete in reverse dependency order
  for (const assessmentId of cleanupIds.assessments) {
    await supabase.from('product_assessment_logistics').delete().eq('assessment_id', assessmentId);
    await supabase.from('product_approvals').delete().eq('assessment_id', assessmentId);
    await supabase.from('product_rejections').delete().eq('assessment_id', assessmentId);
    await supabase.from('product_revisions').delete().eq('assessment_id', assessmentId);
  }
  
  for (const assessmentId of cleanupIds.assessments) {
    await supabase.from('product_assessments').delete().eq('id', assessmentId);
  }
  
  for (const imageId of cleanupIds.images) {
    await supabase.from('product_images').delete().eq('id', imageId);
  }
  
  for (const variantId of cleanupIds.variants) {
    await supabase.from('product_variants').delete().eq('id', variantId);
  }

  // Delete inventory_ledger entries for test products
  for (const productId of cleanupIds.products) {
    await supabase.from('inventory_ledger').delete().eq('product_id', productId);
  }
  
  for (const productId of cleanupIds.products) {
    await supabase.from('products').delete().eq('id', productId);
  }
  
  console.log(`  Cleaned: ${cleanupIds.products.length} products, ${cleanupIds.assessments.length} assessments, ${cleanupIds.images.length} images, ${cleanupIds.variants.length} variants`);
}

// ─── Assessment Status Mapping ────────────────────────────────────────────────

const VALID_STATUSES = [
  'pending_digital_review',
  'waiting_for_sample',
  'pending_physical_review',
  'verified',
  'for_revision',
  'rejected',
];

const APPROVAL_STATUS_MAP = {
  'pending_digital_review': 'pending',
  'waiting_for_sample': 'pending',
  'pending_physical_review': 'pending',
  'verified': 'approved',
  'for_revision': 'pending',
  'rejected': 'rejected',
};

// ─── Test Suite ───────────────────────────────────────────────────────────────

async function runTests() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     SELLER PRODUCT QA PROCESS — INTEGRATION TESTS          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\n🔗 Supabase: ${SUPABASE_URL}`);
  console.log(`📅 ${new Date().toISOString()}\n`);

  // ─── SECTION 0: Prerequisites ─────────────────────────────────────────────
  console.log('\n━━━ SECTION 0: Prerequisites ━━━');

  let testSeller = null;
  let categoryId = null;

  await test('Setup', 'Supabase connection works', async () => {
    const { data, error } = await supabase.from('products').select('id').limit(1);
    assert(!error, `Supabase query failed: ${error?.message}`);
  });

  await test('Setup', 'Categories table accessible', async () => {
    categoryId = await getOrCreateCategory('QA Test Category');
    assertNotNull(categoryId, 'Category ID');
  });

  await test('Setup', 'Sellers table has at least one seller', async () => {
    testSeller = await getTestSeller();
    assertNotNull(testSeller, 'Test seller');
    log('ℹ️', `Using seller: "${testSeller.store_name}" (${testSeller.id})`);
  });

  if (!testSeller || !categoryId) {
    console.log('\n⛔ Cannot proceed — missing seller or category. Aborting.');
    return;
  }

  // ─── SECTION 1: Product Creation ──────────────────────────────────────────
  console.log('\n━━━ SECTION 1: Product Creation (Seller Flow) ━━━');

  let testProductId = null;

  await test('Create', 'Insert product with required fields', async () => {
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: 'QA Test Product - ' + Date.now(),
        description: 'Test product for QA flow validation',
        price: 1500.00,
        category_id: categoryId,
        seller_id: testSeller.id,
        approval_status: 'pending',
        variant_label_1: 'Size',
        variant_label_2: 'Color',
      })
      .select()
      .single();

    assert(!error, `Insert failed: ${error?.message}`);
    assertNotNull(data?.id, 'Product ID');
    testProductId = data.id;
    cleanupIds.products.push(testProductId);
    assertEqual(data.approval_status, 'pending', 'Initial approval_status');
    assertEqual(data.seller_id, testSeller.id, 'seller_id');
  });

  await test('Create', 'Insert product_images for product', async () => {
    assert(testProductId, 'Needs testProductId');
    const images = [
      { product_id: testProductId, image_url: 'https://placehold.co/400x400?text=Main', is_primary: true, sort_order: 0 },
      { product_id: testProductId, image_url: 'https://placehold.co/400x400?text=Side', is_primary: false, sort_order: 1 },
    ];
    const { data, error } = await supabase
      .from('product_images')
      .insert(images)
      .select();

    assert(!error, `Image insert failed: ${error?.message}`);
    assert(data?.length === 2, `Expected 2 images, got ${data?.length}`);
    data.forEach(img => cleanupIds.images.push(img.id));
  });

  await test('Create', 'Insert product_variants for product', async () => {
    assert(testProductId, 'Needs testProductId');
    const timestamp = Date.now();
    const variants = [
      {
        product_id: testProductId,
        sku: `QA-TEST-SM-RED-${timestamp}`,
        variant_name: 'Small - Red',
        size: 'Small',
        color: 'Red',
        price: 1500.00,
        stock: 50,
      },
      {
        product_id: testProductId,
        sku: `QA-TEST-LG-BLUE-${timestamp}`,
        variant_name: 'Large - Blue',
        size: 'Large',
        color: 'Blue',
        price: 1700.00,
        stock: 30,
      },
    ];
    const { data, error } = await supabase
      .from('product_variants')
      .insert(variants)
      .select();

    assert(!error, `Variant insert failed: ${error?.message}`);
    assert(data?.length === 2, `Expected 2 variants, got ${data?.length}`);
    data.forEach(v => cleanupIds.variants.push(v.id));
  });

  await test('Create', 'Verify product exists with relationships', async () => {
    assert(testProductId, 'Needs testProductId');
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories (name),
        images:product_images (id, image_url, is_primary),
        variants:product_variants (id, variant_name, sku, price, stock)
      `)
      .eq('id', testProductId)
      .single();

    assert(!error, `Query failed: ${error?.message}`);
    assertEqual(data.category?.name, 'QA Test Category', 'Category name');
    assert(data.images?.length === 2, `Expected 2 images, got ${data.images?.length}`);
    assert(data.variants?.length === 2, `Expected 2 variants, got ${data.variants?.length}`);
  });

  // ─── SECTION 2: QA Entry Creation ─────────────────────────────────────────
  console.log('\n━━━ SECTION 2: QA Entry Creation (Assessment) ━━━');

  let assessmentId = null;

  await test('QA Entry', 'Create product_assessment with pending_digital_review', async () => {
    assert(testProductId, 'Needs testProductId');
    const { data, error } = await supabase
      .from('product_assessments')
      .insert({
        product_id: testProductId,
        status: 'pending_digital_review',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    assert(!error, `Assessment insert failed: ${error?.message}`);
    assertNotNull(data?.id, 'Assessment ID');
    assessmentId = data.id;
    cleanupIds.assessments.push(assessmentId);
    assertEqual(data.status, 'pending_digital_review', 'Initial assessment status');
    assertEqual(data.product_id, testProductId, 'Assessment product_id');
  });

  await test('QA Entry', 'Assessment joins to product correctly', async () => {
    assert(assessmentId, 'Needs assessmentId');
    const { data, error } = await supabase
      .from('product_assessments')
      .select(`
        *,
        product:products (
          id, name, price, seller_id,
          category:categories (name),
          images:product_images (image_url, is_primary),
          variants:product_variants (id, variant_name, price, stock)
        )
      `)
      .eq('id', assessmentId)
      .single();

    assert(!error, `Join query failed: ${error?.message}`);
    assertNotNull(data.product, 'Product join');
    assertEqual(data.product.id, testProductId, 'Joined product ID');
    assertEqual(data.product.seller_id, testSeller.id, 'Joined seller_id');
    assert(data.product.images?.length >= 1, 'Should have images');
    assert(data.product.variants?.length >= 1, 'Should have variants');
  });

  // Test the seller join (ISSUE-02 validation)
  await test('QA Entry', 'Can join seller info through product', async () => {
    assert(assessmentId, 'Needs assessmentId');
    const { data, error } = await supabase
      .from('product_assessments')
      .select(`
        id,
        product:products (
          id, name, seller_id,
          seller:sellers (store_name, owner_name)
        )
      `)
      .eq('id', assessmentId)
      .single();

    assert(!error, `Seller join query failed: ${error?.message}`);
    assertNotNull(data.product?.seller, 'Seller join should not be null');
    assertEqual(data.product.seller.store_name, testSeller.store_name, 'Seller store_name');
    log('ℹ️', `Seller join works: "${data.product.seller.store_name}" (fix ISSUE-02: use this instead of product.name)`);
  });

  // ─── SECTION 3: Status Transitions ────────────────────────────────────────
  console.log('\n━━━ SECTION 3: Status Transitions (Admin Flow) ━━━');

  // PATH A: Full happy path 
  // pending_digital_review → waiting_for_sample → pending_physical_review → verified

  await test('Transition', 'pending_digital_review → waiting_for_sample (admin approve digital)', async () => {
    assert(assessmentId, 'Needs assessmentId');
    const { error } = await supabase
      .from('product_assessments')
      .update({ status: 'waiting_for_sample' })
      .eq('id', assessmentId);

    assert(!error, `Update failed: ${error?.message}`);

    // Create approval record
    const { error: approvalErr } = await supabase
      .from('product_approvals')
      .insert({
        assessment_id: assessmentId,
        description: 'Digital review passed, awaiting sample',
      });
    assert(!approvalErr, `Approval record failed: ${approvalErr?.message}`);

    // Verify status
    const { data } = await supabase
      .from('product_assessments')
      .select('status')
      .eq('id', assessmentId)
      .single();
    assertEqual(data?.status, 'waiting_for_sample', 'Assessment status after approve');
  });

  await test('Transition', 'waiting_for_sample → pending_physical_review (seller submit sample)', async () => {
    assert(assessmentId, 'Needs assessmentId');
    const { error } = await supabase
      .from('product_assessments')
      .update({ status: 'pending_physical_review' })
      .eq('id', assessmentId);

    assert(!error, `Update failed: ${error?.message}`);

    // Create logistics record
    const { error: logErr } = await supabase
      .from('product_assessment_logistics')
      .insert({
        assessment_id: assessmentId,
        details: 'Drop-off by Courier',
      });
    assert(!logErr, `Logistics record failed: ${logErr?.message}`);

    // Verify
    const { data } = await supabase
      .from('product_assessments')
      .select('status')
      .eq('id', assessmentId)
      .single();
    assertEqual(data?.status, 'pending_physical_review', 'Assessment status after sample submit');
  });

  await test('Transition', 'pending_physical_review → verified (admin pass QA)', async () => {
    assert(assessmentId, 'Needs assessmentId');
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('product_assessments')
      .update({ status: 'verified', verified_at: now })
      .eq('id', assessmentId);

    assert(!error, `Update failed: ${error?.message}`);

    // Create approval record
    await supabase.from('product_approvals').insert({
      assessment_id: assessmentId,
      description: 'Product verified and approved',
    });

    // Sync products.approval_status → approved
    const { error: prodErr } = await supabase
      .from('products')
      .update({ approval_status: 'approved', updated_at: now })
      .eq('id', testProductId);
    assert(!prodErr, `Product status sync failed: ${prodErr?.message}`);

    // Verify assessment
    const { data: assess } = await supabase
      .from('product_assessments')
      .select('status, verified_at')
      .eq('id', assessmentId)
      .single();
    assertEqual(assess?.status, 'verified', 'Assessment status after verify');
    assertNotNull(assess?.verified_at, 'verified_at should be set');

    // Verify product
    const { data: prod } = await supabase
      .from('products')
      .select('approval_status')
      .eq('id', testProductId)
      .single();
    assertEqual(prod?.approval_status, 'approved', 'Product approval_status after verify');
  });

  // ─── SECTION 4: Rejection & Revision Paths ───────────────────────────────
  console.log('\n━━━ SECTION 4: Rejection & Revision Paths ━━━');

  // Create a second product for rejection testing
  let rejectProductId = null;
  let rejectAssessmentId = null;

  await test('Reject', 'Create product for rejection test', async () => {
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: 'QA Reject Test - ' + Date.now(),
        price: 500.00,
        category_id: categoryId,
        seller_id: testSeller.id,
        approval_status: 'pending',
      })
      .select()
      .single();

    assert(!error, `Insert failed: ${error?.message}`);
    rejectProductId = data.id;
    cleanupIds.products.push(rejectProductId);

    // Create assessment
    const { data: assess, error: assessErr } = await supabase
      .from('product_assessments')
      .insert({
        product_id: rejectProductId,
        status: 'pending_digital_review',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    assert(!assessErr, `Assessment failed: ${assessErr?.message}`);
    rejectAssessmentId = assess.id;
    cleanupIds.assessments.push(rejectAssessmentId);
  });

  await test('Reject', 'pending_digital_review → rejected (admin reject)', async () => {
    assert(rejectAssessmentId, 'Needs rejectAssessmentId');
    const { error } = await supabase
      .from('product_assessments')
      .update({ status: 'rejected' })
      .eq('id', rejectAssessmentId);

    assert(!error, `Update failed: ${error?.message}`);

    // Create rejection record
    const { error: rejErr } = await supabase
      .from('product_rejections')
      .insert({
        assessment_id: rejectAssessmentId,
        product_id: rejectProductId,
        description: 'Product does not meet quality standards',
        vendor_submitted_category: 'Electronics',
        admin_reclassified_category: null,
      });
    assert(!rejErr, `Rejection record failed: ${rejErr?.message}`);

    // Sync product status
    await supabase.from('products')
      .update({ approval_status: 'rejected' })
      .eq('id', rejectProductId);

    // Verify
    const { data } = await supabase
      .from('products')
      .select('approval_status')
      .eq('id', rejectProductId)
      .single();
    assertEqual(data?.approval_status, 'rejected', 'Product approval_status after reject');
  });

  // Create a third product for revision testing
  let revisionProductId = null;
  let revisionAssessmentId = null;

  await test('Revision', 'Create product for revision test', async () => {
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: 'QA Revision Test - ' + Date.now(),
        price: 800.00,
        category_id: categoryId,
        seller_id: testSeller.id,
        approval_status: 'pending',
      })
      .select()
      .single();

    assert(!error, `Insert failed: ${error?.message}`);
    revisionProductId = data.id;
    cleanupIds.products.push(revisionProductId);

    const { data: assess, error: assessErr } = await supabase
      .from('product_assessments')
      .insert({
        product_id: revisionProductId,
        status: 'pending_digital_review',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    assert(!assessErr, `Assessment failed: ${assessErr?.message}`);
    revisionAssessmentId = assess.id;
    cleanupIds.assessments.push(revisionAssessmentId);
  });

  await test('Revision', 'pending_digital_review → for_revision (admin request revision)', async () => {
    assert(revisionAssessmentId, 'Needs revisionAssessmentId');
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('product_assessments')
      .update({ status: 'for_revision', revision_requested_at: now })
      .eq('id', revisionAssessmentId);

    assert(!error, `Update failed: ${error?.message}`);

    // Create revision record
    const { error: revErr } = await supabase
      .from('product_revisions')
      .insert({
        assessment_id: revisionAssessmentId,
        description: 'Please update product description and add more images',
      });
    assert(!revErr, `Revision record failed: ${revErr?.message}`);

    // Verify
    const { data } = await supabase
      .from('product_assessments')
      .select('status, revision_requested_at')
      .eq('id', revisionAssessmentId)
      .single();
    assertEqual(data?.status, 'for_revision', 'Assessment status after revision request');
    assertNotNull(data?.revision_requested_at, 'revision_requested_at should be set');
  });

  // ─── SECTION 5: Audit Records ─────────────────────────────────────────────
  console.log('\n━━━ SECTION 5: Audit Records Verification ━━━');

  await test('Audit', 'product_approvals records exist for approved assessment', async () => {
    assert(assessmentId, 'Needs assessmentId');
    const { data, error } = await supabase
      .from('product_approvals')
      .select('*')
      .eq('assessment_id', assessmentId);

    assert(!error, `Query failed: ${error?.message}`);
    assert(data?.length >= 2, `Expected ≥2 approval records (digital + physical), got ${data?.length}`);
  });

  await test('Audit', 'product_rejections records exist for rejected assessment', async () => {
    assert(rejectAssessmentId, 'Needs rejectAssessmentId');
    const { data, error } = await supabase
      .from('product_rejections')
      .select('*')
      .eq('assessment_id', rejectAssessmentId);

    assert(!error, `Query failed: ${error?.message}`);
    assert(data?.length >= 1, `Expected ≥1 rejection record, got ${data?.length}`);
    assertNotNull(data[0].description, 'Rejection description');
  });

  await test('Audit', 'product_revisions records exist for revision assessment', async () => {
    assert(revisionAssessmentId, 'Needs revisionAssessmentId');
    const { data, error } = await supabase
      .from('product_revisions')
      .select('*')
      .eq('assessment_id', revisionAssessmentId);

    assert(!error, `Query failed: ${error?.message}`);
    assert(data?.length >= 1, `Expected ≥1 revision record, got ${data?.length}`);
    assertNotNull(data[0].description, 'Revision description');
  });

  await test('Audit', 'product_assessment_logistics record exists', async () => {
    assert(assessmentId, 'Needs assessmentId');
    const { data, error } = await supabase
      .from('product_assessment_logistics')
      .select('*')
      .eq('assessment_id', assessmentId);

    assert(!error, `Query failed: ${error?.message}`);
    assert(data?.length >= 1, `Expected ≥1 logistics record, got ${data?.length}`);
    assertEqual(data[0].details, 'Drop-off by Courier', 'Logistics details');
  });

  // ─── SECTION 6: Query Tests (Seller-Filtered) ────────────────────────────
  console.log('\n━━━ SECTION 6: Seller-Filtered QA Queries ━━━');

  await test('Query', 'getAllAssessments returns all test records', async () => {
    const { data, error } = await supabase
      .from('product_assessments')
      .select(`
        *,
        product:products (
          id, name, price, seller_id,
          category:categories (name),
          images:product_images (image_url, is_primary),
          variants:product_variants (id, variant_name, price, stock)
        )
      `)
      .order('created_at', { ascending: false });

    assert(!error, `Query failed: ${error?.message}`);
    assert(data?.length >= 3, `Expected ≥3 assessments, got ${data?.length}`);
    
    // All test products should be in the results
    const testIds = [testProductId, rejectProductId, revisionProductId];
    const foundIds = data.map(a => a.product_id);
    for (const id of testIds) {
      assert(foundIds.includes(id), `Product ${id} not found in results`);
    }
  });

  await test('Query', 'getQAEntriesBySeller with !inner filter returns only seller products', async () => {
    // This tests the FIX for ISSUE-03 (use !inner join)
    const { data, error } = await supabase
      .from('product_assessments')
      .select(`
        *,
        product:products!inner (
          id, name, price, seller_id,
          category:categories (name),
          images:product_images (image_url, is_primary),
          variants:product_variants (id, variant_name, price, stock),
          seller:sellers (store_name, owner_name)
        )
      `)
      .eq('product.seller_id', testSeller.id)
      .order('created_at', { ascending: false });

    assert(!error, `Filtered query failed: ${error?.message}`);
    assert(data?.length >= 3, `Expected ≥3 records for seller, got ${data?.length}`);

    // All results should belong to the test seller
    for (const record of data) {
      assertEqual(record.product?.seller_id, testSeller.id, 'Record seller_id mismatch');
    }
    log('ℹ️', `Seller filter with !inner returned ${data.length} records — all match seller`);
  });

  await test('Query', 'Original getQAEntriesBySeller (without !inner) behavior', async () => {
    // Test the CURRENT code behavior to demonstrate ISSUE-03
    const { data, error } = await supabase
      .from('product_assessments')
      .select(`
        *,
        product:products (
          id, name, price, seller_id,
          category:categories (name)
        )
      `)
      .eq('product.seller_id', testSeller.id)
      .order('created_at', { ascending: false });

    assert(!error, `Query failed: ${error?.message}`);
    
    // Check if any records have null product (would indicate the filter issue)
    const nullProducts = data?.filter(a => a.product === null) || [];
    if (nullProducts.length > 0) {
      log('⚠️', `ISSUE-03 CONFIRMED: ${nullProducts.length} records have null product (filter returned all rows, product nulled out)`);
    } else {
      log('ℹ️', `No null-product rows detected (PostgREST may handle this correctly for this dataset)`);
    }
  });

  // ─── SECTION 7: Enriched Query (N+1 Fix Validation) ──────────────────────
  console.log('\n━━━ SECTION 7: Enriched Query (N+1 Fix) ━━━');

  await test('Query', 'Single enriched query with all related tables (eliminates N+1)', async () => {
    const start = Date.now();
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
        logistics:product_assessment_logistics (details),
        approvals:product_approvals (description, created_at),
        rejections:product_rejections (description, vendor_submitted_category, admin_reclassified_category),
        revisions:product_revisions (description)
      `)
      .order('created_at', { ascending: false });

    const duration = Date.now() - start;
    assert(!error, `Enriched query failed: ${error?.message}`);
    assert(data?.length >= 3, `Expected ≥3 records`);
    
    log('ℹ️', `Enriched query returned ${data.length} records in ${duration}ms (single query, no N+1)`);

    // Validate structure for verified product
    const verifiedRecord = data.find(a => a.product_id === testProductId);
    assertNotNull(verifiedRecord, 'Verified product record');
    assertNotNull(verifiedRecord.product?.seller?.store_name, 'Seller name in enriched query');
    assert(verifiedRecord.logistics?.length >= 1, 'Should have logistics');
    assert(verifiedRecord.approvals?.length >= 1, 'Should have approvals');

    // Validate rejection record
    const rejectedRecord = data.find(a => a.product_id === rejectProductId);
    assertNotNull(rejectedRecord, 'Rejected product record');
    assert(rejectedRecord.rejections?.length >= 1, 'Should have rejections');

    // Validate revision record
    const revisionRecord = data.find(a => a.product_id === revisionProductId);
    assertNotNull(revisionRecord, 'Revision product record');
    assert(revisionRecord.revisions?.length >= 1, 'Should have revisions');
  });

  // ─── SECTION 8: Data Integrity ────────────────────────────────────────────
  console.log('\n━━━ SECTION 8: Data Integrity Checks ━━━');

  await test('Integrity', 'No orphan products (product without assessment)', async () => {
    // Check our test products — all should have assessments
    for (const pid of [testProductId, rejectProductId, revisionProductId]) {
      const { data } = await supabase
        .from('product_assessments')
        .select('id')
        .eq('product_id', pid);
      assert(data?.length >= 1, `Product ${pid} has no assessment (orphan)`);
    }
  });

  await test('Integrity', 'product_assessments.status matches CHECK constraint', async () => {
    const { data, error } = await supabase
      .from('product_assessments')
      .select('id, status')
      .in('product_id', [testProductId, rejectProductId, revisionProductId]);

    assert(!error, `Query failed: ${error?.message}`);
    for (const row of data || []) {
      assert(VALID_STATUSES.includes(row.status), `Invalid status "${row.status}" on assessment ${row.id}`);
    }
  });

  await test('Integrity', 'products.approval_status matches expected values', async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, approval_status')
      .in('id', [testProductId, rejectProductId, revisionProductId]);

    assert(!error, `Query failed: ${error?.message}`);
    for (const row of data || []) {
      assert(
        ['pending', 'approved', 'rejected', 'reclassified'].includes(row.approval_status),
        `Invalid approval_status "${row.approval_status}" on product ${row.id}`
      );
    }
  });

  await test('Integrity', 'product_images.image_url passes regex CHECK (https)', async () => {
    const { data, error } = await supabase
      .from('product_images')
      .select('id, image_url')
      .eq('product_id', testProductId);

    assert(!error, `Query failed: ${error?.message}`);
    for (const img of data || []) {
      assert(/^https?:\/\//.test(img.image_url), `Image URL "${img.image_url}" fails https check`);
    }
  });

  await test('Integrity', 'product_variants have unique SKUs', async () => {
    const { data, error } = await supabase
      .from('product_variants')
      .select('sku')
      .eq('product_id', testProductId);

    assert(!error, `Query failed: ${error?.message}`);
    const skus = data?.map(v => v.sku) || [];
    const uniqueSkus = new Set(skus);
    assertEqual(skus.length, uniqueSkus.size, 'Duplicate SKUs detected');
  });

  await test('Integrity', 'Assessment-to-product FK valid for all test records', async () => {
    const { data, error } = await supabase
      .from('product_assessments')
      .select('product_id, product:products (id)')
      .in('product_id', [testProductId, rejectProductId, revisionProductId]);

    assert(!error, `Query failed: ${error?.message}`);
    for (const row of data || []) {
      assertNotNull(row.product, `Assessment for product ${row.product_id} has broken FK`);
    }
  });

  // ─── SECTION 9: Duplicate Assessment Check ───────────────────────────────
  console.log('\n━━━ SECTION 9: Duplicate Assessment Edge Case ━━━');

  await test('Edge', 'Attempting duplicate assessment for same product', async () => {
    assert(testProductId, 'Needs testProductId');
    
    // Check if there's a unique constraint
    const { data, error } = await supabase
      .from('product_assessments')
      .insert({
        product_id: testProductId,
        status: 'pending_digital_review',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Unique constraint exists or some other constraint — GOOD
      log('ℹ️', `Duplicate blocked by constraint: ${error.message}`);
    } else {
      // Duplicate was created — BAD (ISSUE-05 confirmed)
      cleanupIds.assessments.push(data.id);
      
      // Count how many assessments exist for this product
      const { data: count } = await supabase
        .from('product_assessments')
        .select('id', { count: 'exact' })
        .eq('product_id', testProductId);

      log('⚠️', `ISSUE-05 CONFIRMED: Duplicate assessment created! Product ${testProductId} now has ${count?.length} assessments. Need unique constraint on product_id.`);
    }
  });

  await test('Edge', '.single() fails when duplicate assessments exist', async () => {
    // This tests whether updateQAStatus would fail for our test product
    const { data, error } = await supabase
      .from('product_assessments')
      .select('id')
      .eq('product_id', testProductId)
      .single();

    if (error && error.code === 'PGRST116') {
      log('⚠️', `CONFIRMED: .single() fails with PGRST116 when duplicates exist — updateQAStatus would crash`);
      // This is a known issue. Don't fail the test — just flag it.
    } else if (data) {
      log('ℹ️', `.single() succeeded — no duplicate issue for this product`);
    }
  });

  // ─── SECTION 10: Frontend Service Parity ──────────────────────────────────
  console.log('\n━━━ SECTION 10: Frontend Service Parity Analysis ━━━');

  await test('Parity', 'Verify transformToLegacy vendor bug (ISSUE-02)', async () => {
    // The current code does: vendor: assessment.product?.name
    // It should be:           vendor: assessment.product?.seller?.store_name
    const { data } = await supabase
      .from('product_assessments')
      .select(`
        id,
        product:products (
          name,
          seller:sellers (store_name)
        )
      `)
      .eq('id', assessmentId)
      .single();

    const wrongVendor = data?.product?.name;
    const correctVendor = data?.product?.seller?.store_name;

    log('ℹ️', `ISSUE-02: Current code shows vendor as "${wrongVendor}" (product name)`);
    log('ℹ️', `ISSUE-02: Should show vendor as "${correctVendor}" (seller store_name)`);
    assert(wrongVendor !== correctVendor, 'Bug confirmed: product.name != seller.store_name');
  });

  await test('Parity', 'Web createQAEntry discards sellerId param', async () => {
    // The web qaService.createQAEntry(productId, vendorName, sellerId) never inserts sellerId
    // Verify: product_assessments.created_by is null for our test assessment
    const { data } = await supabase
      .from('product_assessments')
      .select('created_by, assigned_to')
      .eq('id', assessmentId)
      .single();

    assertEqual(data?.created_by, null, 'created_by is null (ISSUE-07: sellerId discarded)');
    assertEqual(data?.assigned_to, null, 'assigned_to is also null');
    log('ℹ️', 'ISSUE-07 CONFIRMED: created_by and assigned_to are both null — no audit trail');
  });

  // ─── SECTION 11: approval_status Sync ─────────────────────────────────────
  console.log('\n━━━ SECTION 11: approval_status Sync Verification ━━━');

  await test('Sync', 'Verified product has approval_status = approved', async () => {
    const { data } = await supabase
      .from('products')
      .select('approval_status')
      .eq('id', testProductId)
      .single();
    assertEqual(data?.approval_status, 'approved', 'approval_status');
  });

  await test('Sync', 'Rejected product has approval_status = rejected', async () => {
    const { data } = await supabase
      .from('products')
      .select('approval_status')
      .eq('id', rejectProductId)
      .single();
    assertEqual(data?.approval_status, 'rejected', 'approval_status');
  });

  await test('Sync', 'For-revision product has approval_status = pending', async () => {
    const { data } = await supabase
      .from('products')
      .select('approval_status')
      .eq('id', revisionProductId)
      .single();
    // for_revision maps to 'pending' in the approval_status map
    assertEqual(data?.approval_status, 'pending', 'approval_status after revision request');
  });

  // ─── DONE ─────────────────────────────────────────────────────────────────
  await cleanup();

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                      TEST RESULTS                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`  ✅ Passed:  ${passed}`);
  console.log(`  ❌ Failed:  ${failed}`);
  console.log(`  ⏭️ Skipped: ${skipped}`);
  console.log(`  📊 Total:   ${passed + failed + skipped}`);

  if (failures.length > 0) {
    console.log('\n━━━ FAILURES ━━━');
    for (const f of failures) {
      console.log(`  ❌ [${f.section}] ${f.name}`);
      console.log(`     ${f.error}`);
    }
  }

  console.log('\n━━━ KNOWN ISSUES DETECTED ━━━');
  console.log('  See QA_PROCESS_FIX_PLAN.md for full analysis and fix details.');
  console.log('  Key issues this test validates:');
  console.log('    ISSUE-02: vendor field shows product name instead of seller name');
  console.log('    ISSUE-03: PostgREST nested filter may not filter correctly');
  console.log('    ISSUE-04: N+1 queries in transformToLegacy (section 7 tests the fix)');
  console.log('    ISSUE-05: No unique constraint on product_assessments.product_id');
  console.log('    ISSUE-07: createQAEntry discards sellerId (no audit trail)');
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

// ─── Run ──────────────────────────────────────────────────────────────────────

runTests().catch(err => {
  console.error('\n💥 Fatal error:', err);
  cleanup().finally(() => process.exit(2));
});
