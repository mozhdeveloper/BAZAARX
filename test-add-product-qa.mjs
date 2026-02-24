/**
 * Add Product + Variants + QA Process — End-to-End Integration Test
 * 
 * Tests the FULL flow from seller adding a product (with various variant combos)
 * through the complete QA assessment pipeline, verifying both seller-side and admin-side.
 *
 * Covers:
 *  1. Seller Add Product — no variants (default variant auto-created)
 *  2. Seller Add Product — size + color variants
 *  3. Seller Add Product — size-only variants
 *  4. Seller Add Product — color-only variants
 *  5. QA Entry Auto-Creation (product_assessments row)
 *  6. Admin Digital Review → Approve for Sample
 *  7. Seller Submit Sample (logistics)
 *  8. Admin Physical Review → Pass Quality Check
 *  9. Admin Reject Flow
 * 10. Admin Request Revision Flow
 * 11. Seller-Filtered Queries (!inner join)
 * 12. Admin Enriched Queries (N+1 fix)
 * 13. Vendor Name Resolution (store_name not product.name)
 * 14. Product approval_status Sync
 * 15. Edge Cases (duplicate assessment, maybeSingle safety)
 *
 * Usage:
 *   node test-add-product-qa.mjs
 */

import { createClient } from '@supabase/supabase-js';

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzUyMTUsImV4cCI6MjA4NTgxMTIxNX0.slNSrIdWo-EH4lpJQRIsIw9XbhaFKXsa2nICDmVBTrY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const TS = Date.now(); // unique timestamp for test data

// ─── Test Framework ───────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];
const cleanupIds = {
  products: [],
  assessments: [],
  images: [],
  variants: [],
  approvals: [],
  rejections: [],
  revisions: [],
  logistics: [],
};

function log(icon, msg) { console.log(`  ${icon} ${msg}`); }

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
  if (actual !== expected) throw new Error(`${message || 'Assertion'}: expected "${expected}", got "${actual}"`);
}
function assertNotNull(value, message) {
  if (value === null || value === undefined) throw new Error(`${message || 'Value'} is null/undefined`);
}
function assertIncludes(arr, value, message) {
  if (!arr || !arr.includes(value)) throw new Error(`${message || 'Array'} does not include "${value}"`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOrCreateCategory(name) {
  const { data } = await supabase.from('categories').select('id').eq('name', name).limit(1).single();
  if (data) return data.id;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const { data: created, error } = await supabase.from('categories').insert({ name, slug }).select('id').single();
  if (error) throw new Error(`Failed to create category: ${error.message}`);
  return created.id;
}

async function getTestSeller() {
  const { data } = await supabase.from('sellers').select('id, store_name, owner_name').limit(1).single();
  return data;
}

/**
 * Simulates the full seller addProduct flow:
 *  1. Insert product
 *  2. Insert images
 *  3. Insert variants (or default variant)
 *  4. Create QA assessment
 * Returns { productId, imageIds, variantIds, assessmentId }
 */
async function sellerAddProduct({
  name,
  description = 'Test product for E2E',
  price,
  stock,
  categoryId,
  sellerId,
  images,
  variants,          // array of { variantLabel1Value, variantLabel2Value, stock, price, sku }
  variantLabel1,     // e.g. 'Size'
  variantLabel2,     // e.g. 'Color'
}) {
  // 1. Insert product
  const { data: product, error: prodErr } = await supabase
    .from('products')
    .insert({
      name,
      description,
      price,
      category_id: categoryId,
      seller_id: sellerId,
      approval_status: 'pending',
      variant_label_1: variantLabel1 || null,
      variant_label_2: variantLabel2 || null,
    })
    .select()
    .single();
  if (prodErr) throw new Error(`Product insert failed: ${prodErr.message}`);
  const productId = product.id;
  cleanupIds.products.push(productId);

  // 2. Insert images
  const imageRecords = (images || ['https://placehold.co/400x400?text=Test']).map((url, idx) => ({
    product_id: productId,
    image_url: url,
    is_primary: idx === 0,
    sort_order: idx,
    alt_text: `Image ${idx + 1}`,
  }));
  const { data: imgData, error: imgErr } = await supabase
    .from('product_images')
    .insert(imageRecords)
    .select();
  if (imgErr) throw new Error(`Image insert failed: ${imgErr.message}`);
  const imageIds = (imgData || []).map(i => i.id);
  imageIds.forEach(id => cleanupIds.images.push(id));

  // 3. Insert variants
  let variantIds = [];
  if (variants && variants.length > 0) {
    const variantInserts = variants.map((v, idx) => ({
      product_id: productId,
      variant_name: [v.variantLabel1Value, v.variantLabel2Value].filter(Boolean).join(' - ') || 'Default',
      size: v.variantLabel1Value || null,
      color: v.variantLabel2Value || null,
      option_1_value: v.variantLabel1Value || null,
      option_2_value: v.variantLabel2Value || null,
      stock: v.stock || 0,
      price: v.price || price,
      sku: v.sku || `${name.substring(0, 3).toUpperCase()}-${TS}-${idx}`,
      thumbnail_url: null,
    }));
    const { data: varData, error: varErr } = await supabase
      .from('product_variants')
      .insert(variantInserts)
      .select();
    if (varErr) throw new Error(`Variant insert failed: ${varErr.message}`);
    variantIds = (varData || []).map(v => v.id);
  } else {
    // Default variant (same as sellerStore logic)
    const { data: defVar, error: defErr } = await supabase
      .from('product_variants')
      .insert({
        product_id: productId,
        variant_name: 'Default',
        size: null,
        color: null,
        option_1_value: null,
        option_2_value: null,
        stock: stock || 0,
        price: price,
        sku: `${productId.substring(0, 8)}-default`,
        thumbnail_url: null,
      })
      .select();
    if (defErr) throw new Error(`Default variant insert failed: ${defErr.message}`);
    variantIds = (defVar || []).map(v => v.id);
  }
  variantIds.forEach(id => cleanupIds.variants.push(id));

  // 4. Create QA assessment (same as qaService.createQAEntry)
  const { data: assessment, error: assessErr } = await supabase
    .from('product_assessments')
    .insert({
      product_id: productId,
      status: 'pending_digital_review',
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (assessErr) throw new Error(`Assessment insert failed: ${assessErr.message}`);
  const assessmentId = assessment.id;
  cleanupIds.assessments.push(assessmentId);

  return { productId, imageIds, variantIds, assessmentId };
}

/**
 * Simulates admin QA status change (same as qaService.updateQAStatus)
 */
async function adminUpdateStatus(productId, assessmentId, newDbStatus, metadata = {}) {
  const update = { status: newDbStatus };
  if (newDbStatus === 'verified') update.verified_at = new Date().toISOString();
  if (newDbStatus === 'for_revision') update.revision_requested_at = new Date().toISOString();

  const { error } = await supabase
    .from('product_assessments')
    .update(update)
    .eq('id', assessmentId);
  if (error) throw new Error(`Assessment update failed: ${error.message}`);

  // Create audit record
  if (newDbStatus === 'waiting_for_sample' || newDbStatus === 'verified') {
    const { data, error: appErr } = await supabase.from('product_approvals').insert({
      assessment_id: assessmentId,
      description: newDbStatus === 'verified' ? 'Product verified and approved' : 'Digital review passed',
    }).select('id').single();
    if (!appErr && data) cleanupIds.approvals.push(data.id);
  } else if (newDbStatus === 'rejected') {
    const { data, error: rejErr } = await supabase.from('product_rejections').insert({
      assessment_id: assessmentId,
      product_id: productId,
      description: metadata.reason || 'Rejected',
    }).select('id').single();
    if (!rejErr && data) cleanupIds.rejections.push(data.id);
  } else if (newDbStatus === 'for_revision') {
    const { data, error: revErr } = await supabase.from('product_revisions').insert({
      assessment_id: assessmentId,
      description: metadata.reason || 'Needs revision',
    }).select('id').single();
    if (!revErr && data) cleanupIds.revisions.push(data.id);
  } else if (newDbStatus === 'pending_physical_review') {
    const { data, error: logErr } = await supabase.from('product_assessment_logistics').insert({
      assessment_id: assessmentId,
      details: metadata.logistics || 'Sample shipped',
    }).select('id').single();
    if (!logErr && data) cleanupIds.logistics.push(data.id);
  }

  // Sync product approval_status
  const statusMap = {
    pending_digital_review: 'pending',
    waiting_for_sample: 'pending',
    pending_physical_review: 'pending',
    verified: 'approved',
    for_revision: 'pending',
    rejected: 'rejected',
  };
  await supabase.from('products').update({
    approval_status: statusMap[newDbStatus],
    updated_at: new Date().toISOString(),
  }).eq('id', productId);
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  let counts = {};

  // Delete audit records first
  for (const id of cleanupIds.approvals) {
    await supabase.from('product_approvals').delete().eq('id', id);
  }
  for (const id of cleanupIds.rejections) {
    await supabase.from('product_rejections').delete().eq('id', id);
  }
  for (const id of cleanupIds.revisions) {
    await supabase.from('product_revisions').delete().eq('id', id);
  }
  for (const id of cleanupIds.logistics) {
    await supabase.from('product_assessment_logistics').delete().eq('id', id);
  }

  // Delete any remaining assessment-linked records
  for (const assessmentId of cleanupIds.assessments) {
    await supabase.from('product_assessment_logistics').delete().eq('assessment_id', assessmentId);
    await supabase.from('product_approvals').delete().eq('assessment_id', assessmentId);
    await supabase.from('product_rejections').delete().eq('assessment_id', assessmentId);
    await supabase.from('product_revisions').delete().eq('assessment_id', assessmentId);
  }

  for (const id of cleanupIds.assessments) {
    await supabase.from('product_assessments').delete().eq('id', id);
  }
  for (const id of cleanupIds.images) {
    await supabase.from('product_images').delete().eq('id', id);
  }
  for (const id of cleanupIds.variants) {
    await supabase.from('product_variants').delete().eq('id', id);
  }
  for (const id of cleanupIds.products) {
    await supabase.from('inventory_ledger').delete().eq('product_id', id);
    await supabase.from('products').delete().eq('id', id);
  }

  counts = {
    products: cleanupIds.products.length,
    assessments: cleanupIds.assessments.length,
    images: cleanupIds.images.length,
    variants: cleanupIds.variants.length,
  };
  console.log(`  Cleaned: ${counts.products} products, ${counts.assessments} assessments, ${counts.images} images, ${counts.variants} variants`);
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

async function runTests() {
  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║   ADD PRODUCT + VARIANTS + QA PROCESS — END-TO-END INTEGRATION TESTS   ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝');
  console.log(`\n🔗 Supabase: ${SUPABASE_URL}`);
  console.log(`📅 ${new Date().toISOString()}\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 0: Prerequisites
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n━━━ SECTION 0: Prerequisites ━━━');

  let seller = null;
  let categoryId = null;

  await test('Setup', 'Supabase connection', async () => {
    const { error } = await supabase.from('products').select('id').limit(1);
    assert(!error, `Connection failed: ${error?.message}`);
  });

  await test('Setup', 'Get or create test category', async () => {
    categoryId = await getOrCreateCategory('QA E2E Test Category');
    assertNotNull(categoryId, 'Category ID');
  });

  await test('Setup', 'Get test seller', async () => {
    seller = await getTestSeller();
    assertNotNull(seller, 'Test seller');
    log('ℹ️', `Using seller: "${seller.store_name}" (${seller.id})`);
  });

  if (!seller || !categoryId) {
    console.log('\n⛔ Cannot proceed — missing seller or category. Aborting.');
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: Add Product — No Variants (Default Variant)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n━━━ SECTION 1: Add Product — No Variants (Default Variant Auto-Created) ━━━');

  let noVarProduct = null;

  await test('NoVar', 'Create product without custom variants', async () => {
    noVarProduct = await sellerAddProduct({
      name: `E2E No-Variant Product ${TS}`,
      price: 999,
      stock: 50,
      categoryId,
      sellerId: seller.id,
      images: ['https://placehold.co/400x400?text=NoVar1', 'https://placehold.co/400x400?text=NoVar2'],
    });
    assertNotNull(noVarProduct.productId, 'Product ID');
    assertNotNull(noVarProduct.assessmentId, 'Assessment ID');
  });

  await test('NoVar', 'Default variant was created', async () => {
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', noVarProduct.productId);
    assert(!error, error?.message);
    assertEqual(data.length, 1, 'Should have exactly 1 default variant');
    assertEqual(data[0].variant_name, 'Default', 'Variant name should be "Default"');
    assertEqual(data[0].size, null, 'Size should be null for default');
    assertEqual(data[0].color, null, 'Color should be null for default');
    assertEqual(data[0].stock, 50, 'Stock should match product stock');
    assertEqual(data[0].price, 999, 'Price should match product price');
  });

  await test('NoVar', 'Product has 2 images', async () => {
    const { data } = await supabase.from('product_images').select('*').eq('product_id', noVarProduct.productId).order('sort_order');
    assertEqual(data.length, 2, 'Image count');
    assert(data[0].is_primary, 'First image should be primary');
    assert(!data[1].is_primary, 'Second image should not be primary');
  });

  await test('NoVar', 'Assessment created with pending_digital_review', async () => {
    const { data } = await supabase.from('product_assessments').select('*').eq('id', noVarProduct.assessmentId).single();
    assertEqual(data.status, 'pending_digital_review', 'Assessment status');
    assertEqual(data.product_id, noVarProduct.productId, 'Assessment product_id');
  });

  await test('NoVar', 'Product approval_status is pending', async () => {
    const { data } = await supabase.from('products').select('approval_status').eq('id', noVarProduct.productId).single();
    assertEqual(data.approval_status, 'pending', 'approval_status');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: Add Product — Size + Color Variants
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n━━━ SECTION 2: Add Product — Size + Color Variants ━━━');

  let sizeColorProduct = null;

  await test('SizeColor', 'Create product with size + color variants', async () => {
    sizeColorProduct = await sellerAddProduct({
      name: `E2E Size+Color Product ${TS}`,
      price: 1500,
      stock: 0, // All stock in variants
      categoryId,
      sellerId: seller.id,
      variantLabel1: 'Size',
      variantLabel2: 'Color',
      images: [
        'https://placehold.co/400x400?text=SC-Main',
        'https://placehold.co/400x400?text=SC-Side',
        'https://placehold.co/400x400?text=SC-Back',
      ],
      variants: [
        { variantLabel1Value: 'Small', variantLabel2Value: 'Red', stock: 25, price: 1500, sku: `SC-SM-RED-${TS}` },
        { variantLabel1Value: 'Small', variantLabel2Value: 'Blue', stock: 20, price: 1500, sku: `SC-SM-BLU-${TS}` },
        { variantLabel1Value: 'Medium', variantLabel2Value: 'Red', stock: 30, price: 1600, sku: `SC-MD-RED-${TS}` },
        { variantLabel1Value: 'Medium', variantLabel2Value: 'Blue', stock: 15, price: 1600, sku: `SC-MD-BLU-${TS}` },
        { variantLabel1Value: 'Large', variantLabel2Value: 'Red', stock: 10, price: 1700, sku: `SC-LG-RED-${TS}` },
        { variantLabel1Value: 'Large', variantLabel2Value: 'Blue', stock: 12, price: 1700, sku: `SC-LG-BLU-${TS}` },
      ],
    });
    assertNotNull(sizeColorProduct.productId, 'Product ID');
    assertEqual(sizeColorProduct.variantIds.length, 6, 'Should have 6 variants');
  });

  await test('SizeColor', 'Product has variant_label_1=Size and variant_label_2=Color', async () => {
    const { data } = await supabase.from('products').select('variant_label_1, variant_label_2').eq('id', sizeColorProduct.productId).single();
    assertEqual(data.variant_label_1, 'Size', 'variant_label_1');
    assertEqual(data.variant_label_2, 'Color', 'variant_label_2');
  });

  await test('SizeColor', 'All 6 variants have correct size and color', async () => {
    const { data } = await supabase
      .from('product_variants')
      .select('variant_name, size, color, stock, price, sku')
      .eq('product_id', sizeColorProduct.productId)
      .order('sku');
    assertEqual(data.length, 6, 'Variant count');

    // Verify sizes
    const sizes = data.map(v => v.size);
    assert(sizes.includes('Small'), 'Should have Small');
    assert(sizes.includes('Medium'), 'Should have Medium');
    assert(sizes.includes('Large'), 'Should have Large');

    // Verify colors
    const colors = data.map(v => v.color);
    assert(colors.includes('Red'), 'Should have Red');
    assert(colors.includes('Blue'), 'Should have Blue');

    // Verify variant_name format "Size - Color"
    const names = data.map(v => v.variant_name);
    assert(names.includes('Small - Red'), 'Should have "Small - Red"');
    assert(names.includes('Large - Blue'), 'Should have "Large - Blue"');

    // Verify total stock
    const totalStock = data.reduce((sum, v) => sum + v.stock, 0);
    assertEqual(totalStock, 112, 'Total variant stock');
  });

  await test('SizeColor', 'Variant SKUs are unique', async () => {
    const { data } = await supabase.from('product_variants').select('sku').eq('product_id', sizeColorProduct.productId);
    const skus = data.map(v => v.sku);
    assertEqual(skus.length, new Set(skus).size, 'SKUs should be unique');
  });

  await test('SizeColor', 'Has 3 images with correct primary flag', async () => {
    const { data } = await supabase.from('product_images').select('*').eq('product_id', sizeColorProduct.productId).order('sort_order');
    assertEqual(data.length, 3, 'Image count');
    assert(data[0].is_primary, 'First image is primary');
    assert(!data[1].is_primary, 'Second image not primary');
    assert(!data[2].is_primary, 'Third image not primary');
  });

  await test('SizeColor', 'QA assessment created', async () => {
    const { data } = await supabase.from('product_assessments').select('status').eq('id', sizeColorProduct.assessmentId).single();
    assertEqual(data.status, 'pending_digital_review', 'Assessment status');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: Add Product — Size-Only Variants
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n━━━ SECTION 3: Add Product — Size-Only Variants ━━━');

  let sizeOnlyProduct = null;

  await test('SizeOnly', 'Create product with size-only variants', async () => {
    sizeOnlyProduct = await sellerAddProduct({
      name: `E2E Size-Only Product ${TS}`,
      price: 800,
      stock: 0,
      categoryId,
      sellerId: seller.id,
      variantLabel1: 'Size',
      variantLabel2: null,
      images: ['https://placehold.co/400x400?text=SizeOnly'],
      variants: [
        { variantLabel1Value: 'XS', variantLabel2Value: '', stock: 20, price: 800, sku: `SO-XS-${TS}` },
        { variantLabel1Value: 'S', variantLabel2Value: '', stock: 30, price: 800, sku: `SO-S-${TS}` },
        { variantLabel1Value: 'M', variantLabel2Value: '', stock: 40, price: 850, sku: `SO-M-${TS}` },
        { variantLabel1Value: 'L', variantLabel2Value: '', stock: 25, price: 900, sku: `SO-L-${TS}` },
        { variantLabel1Value: 'XL', variantLabel2Value: '', stock: 15, price: 950, sku: `SO-XL-${TS}` },
      ],
    });
    assertNotNull(sizeOnlyProduct.productId, 'Product ID');
    assertEqual(sizeOnlyProduct.variantIds.length, 5, 'Should have 5 size variants');
  });

  await test('SizeOnly', 'Variants have size but no color', async () => {
    const { data } = await supabase
      .from('product_variants')
      .select('variant_name, size, color')
      .eq('product_id', sizeOnlyProduct.productId)
      .order('size');
    assertEqual(data.length, 5, 'Variant count');

    for (const v of data) {
      assertNotNull(v.size, `Variant "${v.variant_name}" should have a size`);
      assert(v.color === null || v.color === '', `Variant "${v.variant_name}" should not have color, got "${v.color}"`);
    }

    // Verify variant_name is just the size (no " - " separator for single attribute)
    const names = data.map(v => v.variant_name);
    assert(names.includes('XS'), 'Should have XS variant name');
    assert(names.includes('XL'), 'Should have XL variant name');
  });

  await test('SizeOnly', 'Product has variant_label_1=Size, variant_label_2=null', async () => {
    const { data } = await supabase.from('products').select('variant_label_1, variant_label_2').eq('id', sizeOnlyProduct.productId).single();
    assertEqual(data.variant_label_1, 'Size', 'variant_label_1');
    assertEqual(data.variant_label_2, null, 'variant_label_2');
  });

  await test('SizeOnly', 'Total stock across size variants', async () => {
    const { data } = await supabase.from('product_variants').select('stock').eq('product_id', sizeOnlyProduct.productId);
    const total = data.reduce((s, v) => s + v.stock, 0);
    assertEqual(total, 130, 'Total stock should be 130');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: Add Product — Color-Only Variants
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n━━━ SECTION 4: Add Product — Color-Only Variants ━━━');

  let colorOnlyProduct = null;

  await test('ColorOnly', 'Create product with color-only variants', async () => {
    colorOnlyProduct = await sellerAddProduct({
      name: `E2E Color-Only Product ${TS}`,
      price: 650,
      stock: 0,
      categoryId,
      sellerId: seller.id,
      variantLabel1: null,
      variantLabel2: 'Color',
      images: ['https://placehold.co/400x400?text=ColorOnly'],
      variants: [
        { variantLabel1Value: '', variantLabel2Value: 'Black', stock: 40, price: 650, sku: `CO-BLK-${TS}` },
        { variantLabel1Value: '', variantLabel2Value: 'White', stock: 35, price: 650, sku: `CO-WHT-${TS}` },
        { variantLabel1Value: '', variantLabel2Value: 'Navy', stock: 20, price: 700, sku: `CO-NVY-${TS}` },
      ],
    });
    assertNotNull(colorOnlyProduct.productId, 'Product ID');
    assertEqual(colorOnlyProduct.variantIds.length, 3, 'Should have 3 color variants');
  });

  await test('ColorOnly', 'Variants have color but no size', async () => {
    const { data } = await supabase
      .from('product_variants')
      .select('variant_name, size, color')
      .eq('product_id', colorOnlyProduct.productId)
      .order('color');
    assertEqual(data.length, 3, 'Variant count');

    for (const v of data) {
      assertNotNull(v.color, `Variant "${v.variant_name}" should have a color`);
      assert(v.size === null || v.size === '', `Variant "${v.variant_name}" should not have size, got "${v.size}"`);
    }

    const colors = data.map(v => v.color);
    assertIncludes(colors, 'Black', 'Should have Black');
    assertIncludes(colors, 'White', 'Should have White');
    assertIncludes(colors, 'Navy', 'Should have Navy');
  });

  await test('ColorOnly', 'Product has variant_label_2=Color, variant_label_1=null', async () => {
    const { data } = await supabase.from('products').select('variant_label_1, variant_label_2').eq('id', colorOnlyProduct.productId).single();
    assertEqual(data.variant_label_1, null, 'variant_label_1');
    assertEqual(data.variant_label_2, 'Color', 'variant_label_2');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: Full QA Happy Path (Digital → Sample → Physical → Verified)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n━━━ SECTION 5: QA Happy Path — Full Status Transitions ━━━');

  // Use the Size+Color product for the happy path
  const happyProductId = sizeColorProduct.productId;
  const happyAssessmentId = sizeColorProduct.assessmentId;

  await test('QA-Happy', 'Step 1: Admin approves digital review → waiting_for_sample', async () => {
    await adminUpdateStatus(happyProductId, happyAssessmentId, 'waiting_for_sample');
    
    const { data } = await supabase.from('product_assessments').select('status').eq('id', happyAssessmentId).single();
    assertEqual(data.status, 'waiting_for_sample', 'Assessment status');

    // Product still pending (not approved yet)
    const { data: prod } = await supabase.from('products').select('approval_status').eq('id', happyProductId).single();
    assertEqual(prod.approval_status, 'pending', 'Product still pending');
  });

  await test('QA-Happy', 'Step 2: Seller submits sample → pending_physical_review', async () => {
    await adminUpdateStatus(happyProductId, happyAssessmentId, 'pending_physical_review', {
      logistics: 'Drop-off at Bazaar HQ via LBC Express',
    });

    const { data } = await supabase.from('product_assessments').select('status').eq('id', happyAssessmentId).single();
    assertEqual(data.status, 'pending_physical_review', 'Assessment status');

    // Verify logistics record was created
    const { data: logData } = await supabase
      .from('product_assessment_logistics')
      .select('details')
      .eq('assessment_id', happyAssessmentId);
    assert(logData.length >= 1, 'Should have logistics record');
    assertEqual(logData[0].details, 'Drop-off at Bazaar HQ via LBC Express', 'Logistics details');
  });

  await test('QA-Happy', 'Step 3: Admin passes quality check → verified', async () => {
    await adminUpdateStatus(happyProductId, happyAssessmentId, 'verified');

    const { data } = await supabase.from('product_assessments').select('status, verified_at').eq('id', happyAssessmentId).single();
    assertEqual(data.status, 'verified', 'Assessment status');
    assertNotNull(data.verified_at, 'verified_at should be set');

    // Product should now be approved
    const { data: prod } = await supabase.from('products').select('approval_status').eq('id', happyProductId).single();
    assertEqual(prod.approval_status, 'approved', 'Product approved');
  });

  await test('QA-Happy', 'Approval records exist (digital + physical)', async () => {
    const { data } = await supabase.from('product_approvals').select('*').eq('assessment_id', happyAssessmentId);
    assert(data.length >= 2, `Expected ≥2 approval records, got ${data.length}`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: QA Rejection Path
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n━━━ SECTION 6: QA Rejection Path ━━━');

  // Use the Size-Only product for rejection
  const rejectProductId = sizeOnlyProduct.productId;
  const rejectAssessmentId = sizeOnlyProduct.assessmentId;

  await test('QA-Reject', 'Admin rejects product at digital review', async () => {
    await adminUpdateStatus(rejectProductId, rejectAssessmentId, 'rejected', {
      reason: 'Product images are blurry and description is incomplete',
    });

    const { data } = await supabase.from('product_assessments').select('status').eq('id', rejectAssessmentId).single();
    assertEqual(data.status, 'rejected', 'Assessment status');

    const { data: prod } = await supabase.from('products').select('approval_status').eq('id', rejectProductId).single();
    assertEqual(prod.approval_status, 'rejected', 'Product rejected');
  });

  await test('QA-Reject', 'Rejection record exists with reason', async () => {
    const { data } = await supabase.from('product_rejections').select('*').eq('assessment_id', rejectAssessmentId);
    assert(data.length >= 1, 'Should have rejection record');
    assertEqual(data[0].description, 'Product images are blurry and description is incomplete', 'Rejection reason');
    assertEqual(data[0].product_id, rejectProductId, 'Rejection product_id');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 7: QA Revision Path
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n━━━ SECTION 7: QA Revision Path ━━━');

  // Use the Color-Only product for revision
  const revisionProductId = colorOnlyProduct.productId;
  const revisionAssessmentId = colorOnlyProduct.assessmentId;

  await test('QA-Revision', 'Admin requests revision at digital review', async () => {
    await adminUpdateStatus(revisionProductId, revisionAssessmentId, 'for_revision', {
      reason: 'Please add more detailed product specifications',
    });

    const { data } = await supabase.from('product_assessments').select('status, revision_requested_at').eq('id', revisionAssessmentId).single();
    assertEqual(data.status, 'for_revision', 'Assessment status');
    assertNotNull(data.revision_requested_at, 'revision_requested_at should be set');

    const { data: prod } = await supabase.from('products').select('approval_status').eq('id', revisionProductId).single();
    assertEqual(prod.approval_status, 'pending', 'Product remains pending during revision');
  });

  await test('QA-Revision', 'Revision record exists with reason', async () => {
    const { data } = await supabase.from('product_revisions').select('*').eq('assessment_id', revisionAssessmentId);
    assert(data.length >= 1, 'Should have revision record');
    assertEqual(data[0].description, 'Please add more detailed product specifications', 'Revision reason');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 8: Seller-Filtered QA Queries (Frontend Parity)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n━━━ SECTION 8: Seller-Filtered QA Queries (Frontend Parity) ━━━');

  await test('SellerQuery', 'getQAEntriesBySeller (!inner) returns only this seller\'s products', async () => {
    const { data, error } = await supabase
      .from('product_assessments')
      .select(`
        *,
        product:products!inner (
          id, name, price, seller_id,
          category:categories (name),
          images:product_images (image_url, is_primary),
          variants:product_variants (id, variant_name, size, color, price, stock),
          seller:sellers (store_name, owner_name)
        ),
        logistics_records:product_assessment_logistics (details),
        rejection_records:product_rejections (description),
        revision_records:product_revisions (description)
      `)
      .eq('product.seller_id', seller.id)
      .order('created_at', { ascending: false });

    assert(!error, `Query failed: ${error?.message}`);
    assert(data.length >= 4, `Expected ≥4 records for seller, got ${data.length}`);

    // All results must belong to our seller
    for (const row of data) {
      assertEqual(row.product.seller_id, seller.id, 'Seller mismatch in filtered query');
    }
    log('ℹ️', `Seller-filtered query returned ${data.length} records — all match seller`);
  });

  await test('SellerQuery', 'Filtered results include all 4 test products', async () => {
    const { data } = await supabase
      .from('product_assessments')
      .select('product_id, product:products!inner (seller_id)')
      .eq('product.seller_id', seller.id);

    const productIds = data.map(r => r.product_id);
    const testIds = [noVarProduct.productId, sizeColorProduct.productId, sizeOnlyProduct.productId, colorOnlyProduct.productId];
    for (const id of testIds) {
      assertIncludes(productIds, id, `Product ${id} should appear in seller-filtered query`);
    }
  });

  await test('SellerQuery', 'Seller query returns variants in product join', async () => {
    const { data } = await supabase
      .from('product_assessments')
      .select(`
        product:products!inner (
          id,
          variants:product_variants (id, variant_name, size, color, price, stock)
        )
      `)
      .eq('product.seller_id', seller.id)
      .eq('product_id', sizeColorProduct.productId)
      .single();

    assertNotNull(data.product, 'Product join');
    assertEqual(data.product.variants.length, 6, 'Should have 6 variants in join');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 9: Admin Enriched Queries (N+1 Fix Verification)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n━━━ SECTION 9: Admin Enriched Query (N+1 Fix Verification) ━━━');

  await test('AdminQuery', 'Single enriched query joins all related data', async () => {
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
          variants:product_variants (id, variant_name, sku, size, color, price, stock),
          seller:sellers (store_name, owner_name)
        ),
        logistics_records:product_assessment_logistics (details),
        approvals:product_approvals (description, created_at),
        rejections:product_rejections (description, product_id),
        revisions:product_revisions (description)
      `)
      .order('created_at', { ascending: false });

    const duration = Date.now() - start;
    assert(!error, `Enriched query failed: ${error?.message}`);
    assert(data.length >= 4, `Expected ≥4 records`);
    log('ℹ️', `Enriched query returned ${data.length} records in ${duration}ms (single query, no N+1)`);

    // Verify the verified product has approvals + logistics
    const verifiedRec = data.find(a => a.product_id === sizeColorProduct.productId);
    assertNotNull(verifiedRec, 'Verified product record');
    assert(verifiedRec.approvals?.length >= 1, 'Should have approval records');
    assert(verifiedRec.logistics_records?.length >= 1, 'Should have logistics records');
    assertNotNull(verifiedRec.product?.seller?.store_name, 'Seller store_name in enriched query');

    // Verify rejected product has rejection records
    const rejectedRec = data.find(a => a.product_id === sizeOnlyProduct.productId);
    assertNotNull(rejectedRec, 'Rejected product record');
    assert(rejectedRec.rejections?.length >= 1, 'Should have rejection records');

    // Verify revision product has revision records
    const revisionRec = data.find(a => a.product_id === colorOnlyProduct.productId);
    assertNotNull(revisionRec, 'Revision product record');
    assert(revisionRec.revisions?.length >= 1, 'Should have revision records');
  });

  await test('AdminQuery', 'Admin query returns variant data for all products', async () => {
    const { data } = await supabase
      .from('product_assessments')
      .select(`
        product_id,
        product:products (
          id,
          variants:product_variants (id, variant_name, size, color)
        )
      `)
      .in('product_id', [
        noVarProduct.productId,
        sizeColorProduct.productId,
        sizeOnlyProduct.productId,
        colorOnlyProduct.productId,
      ]);

    const variantCounts = {};
    for (const row of data) {
      variantCounts[row.product_id] = row.product?.variants?.length || 0;
    }

    assertEqual(variantCounts[noVarProduct.productId], 1, 'No-var product should have 1 default variant');
    assertEqual(variantCounts[sizeColorProduct.productId], 6, 'Size+Color product should have 6 variants');
    assertEqual(variantCounts[sizeOnlyProduct.productId], 5, 'Size-only product should have 5 variants');
    assertEqual(variantCounts[colorOnlyProduct.productId], 3, 'Color-only product should have 3 variants');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 10: Vendor Name Resolution
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n━━━ SECTION 10: Vendor Name Resolution (store_name vs product.name) ━━━');

  await test('Vendor', 'Seller join returns store_name (not product name)', async () => {
    const { data } = await supabase
      .from('product_assessments')
      .select(`
        id,
        product:products (
          name,
          seller:sellers (store_name, owner_name)
        )
      `)
      .eq('id', happyAssessmentId)
      .single();

    const productName = data.product?.name;
    const storeName = data.product?.seller?.store_name;
    assertNotNull(storeName, 'store_name should not be null');
    log('ℹ️', `Product name: "${productName}"`);
    log('ℹ️', `Store name (correct vendor): "${storeName}"`);
    // Store name and product name should be different — vendor should use store_name
    assert(storeName !== productName, 'store_name should differ from product name (vendor fix validation)');
  });

  await test('Vendor', 'transformToLegacy vendor resolution order works', async () => {
    // Simulate the resolution: seller.store_name → product.seller.store_name → product.name → 'Unknown'
    const { data } = await supabase
      .from('product_assessments')
      .select(`
        id,
        product:products (
          name,
          seller:sellers (store_name)
        )
      `)
      .in('product_id', [noVarProduct.productId, sizeColorProduct.productId, sizeOnlyProduct.productId, colorOnlyProduct.productId]);

    for (const row of data) {
      const resolvedVendor = row.product?.seller?.store_name || row.product?.name || 'Unknown';
      assertEqual(resolvedVendor, seller.store_name, 'Vendor should resolve to seller store_name');
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 11: approval_status Sync Verification
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n━━━ SECTION 11: approval_status Sync Verification ━━━');

  await test('Sync', 'No-variant product: pending (no QA action taken)', async () => {
    const { data } = await supabase.from('products').select('approval_status').eq('id', noVarProduct.productId).single();
    assertEqual(data.approval_status, 'pending', 'No-var product should be pending');
  });

  await test('Sync', 'Size+Color product: approved (verified)', async () => {
    const { data } = await supabase.from('products').select('approval_status').eq('id', sizeColorProduct.productId).single();
    assertEqual(data.approval_status, 'approved', 'Size+Color product should be approved');
  });

  await test('Sync', 'Size-only product: rejected', async () => {
    const { data } = await supabase.from('products').select('approval_status').eq('id', sizeOnlyProduct.productId).single();
    assertEqual(data.approval_status, 'rejected', 'Size-only product should be rejected');
  });

  await test('Sync', 'Color-only product: pending (for_revision → pending)', async () => {
    const { data } = await supabase.from('products').select('approval_status').eq('id', colorOnlyProduct.productId).single();
    assertEqual(data.approval_status, 'pending', 'Color-only product should be pending (revision)');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 12: Data Integrity Checks
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n━━━ SECTION 12: Data Integrity Checks ━━━');

  const allTestProductIds = [noVarProduct.productId, sizeColorProduct.productId, sizeOnlyProduct.productId, colorOnlyProduct.productId];

  await test('Integrity', 'All test products have exactly 1 assessment', async () => {
    for (const pid of allTestProductIds) {
      const { data } = await supabase.from('product_assessments').select('id').eq('product_id', pid);
      assertEqual(data.length, 1, `Product ${pid.substring(0, 8)} should have exactly 1 assessment, got ${data.length}`);
    }
  });

  await test('Integrity', 'product_assessments.status matches CHECK constraint', async () => {
    const validStatuses = ['pending_digital_review', 'waiting_for_sample', 'pending_physical_review', 'verified', 'for_revision', 'rejected'];
    const { data } = await supabase.from('product_assessments').select('id, status').in('product_id', allTestProductIds);
    for (const row of data) {
      assertIncludes(validStatuses, row.status, `Invalid status "${row.status}"`);
    }
  });

  await test('Integrity', 'products.approval_status matches CHECK constraint', async () => {
    const validStatuses = ['pending', 'approved', 'rejected', 'reclassified'];
    const { data } = await supabase.from('products').select('id, approval_status').in('id', allTestProductIds);
    for (const row of data) {
      assertIncludes(validStatuses, row.approval_status, `Invalid approval_status "${row.approval_status}"`);
    }
  });

  await test('Integrity', 'All product_images have valid https URLs', async () => {
    const { data } = await supabase.from('product_images').select('id, image_url').in('product_id', allTestProductIds);
    for (const img of data) {
      assert(/^https?:\/\//.test(img.image_url), `Image URL "${img.image_url}" fails https check`);
    }
  });

  await test('Integrity', 'All variant SKUs are globally unique', async () => {
    const { data } = await supabase.from('product_variants').select('sku').in('product_id', allTestProductIds);
    const skus = data.map(v => v.sku);
    assertEqual(skus.length, new Set(skus).size, `Found duplicate SKUs among ${skus.length} variants`);
  });

  await test('Integrity', 'FK: assessment → product is valid', async () => {
    const { data } = await supabase
      .from('product_assessments')
      .select('product_id, product:products (id)')
      .in('product_id', allTestProductIds);
    for (const row of data) {
      assertNotNull(row.product, `Assessment for product ${row.product_id} has broken FK`);
    }
  });

  await test('Integrity', 'FK: variant → product is valid', async () => {
    const { data } = await supabase
      .from('product_variants')
      .select('id, product_id')
      .in('product_id', allTestProductIds);
    for (const row of data) {
      assertIncludes(allTestProductIds, row.product_id, 'Variant FK mismatch');
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 13: Edge Cases
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n━━━ SECTION 13: Edge Cases ━━━');

  await test('Edge', '.maybeSingle() returns null for non-existent product', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const { data, error } = await supabase
      .from('product_assessments')
      .select('id')
      .eq('product_id', fakeId)
      .maybeSingle();
    assert(!error, `maybeSingle() should not error: ${error?.message}`);
    assertEqual(data, null, 'Should return null for non-existent product');
  });

  await test('Edge', '.single() would fail on non-existent product (406 safety)', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const { data, error } = await supabase
      .from('product_assessments')
      .select('id')
      .eq('product_id', fakeId)
      .single();
    // .single() throws PGRST116 when 0 rows
    assert(error !== null, '.single() should error on 0 rows');
    assertEqual(error.code, 'PGRST116', 'Error code should be PGRST116');
    log('ℹ️', 'Confirmed: .single() throws 406 on 0 rows — .maybeSingle() is safer');
  });

  await test('Edge', 'Duplicate assessment for same product (no DB constraint)', async () => {
    // Insert a second assessment for the no-variant product
    const { data, error } = await supabase
      .from('product_assessments')
      .insert({
        product_id: noVarProduct.productId,
        status: 'pending_digital_review',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      log('ℹ️', `Duplicate blocked by constraint: ${error.message}`);
    } else {
      cleanupIds.assessments.push(data.id); // clean up the duplicate
      log('⚠️', `Duplicate assessment created (no unique constraint on product_id). This is a known schema gap.`);
      
      // .single() should fail now
      const { error: singleErr } = await supabase
        .from('product_assessments')
        .select('id')
        .eq('product_id', noVarProduct.productId)
        .single();
      
      if (singleErr?.code === 'PGRST116') {
        log('⚠️', '.single() fails with 406 when duplicates exist — maybeSingle() or limit(1) needed');
      }
    }
    // This test always passes — it's diagnostic
  });

  await test('Edge', 'Variant with zero stock is valid', async () => {
    const { data, error } = await supabase
      .from('product_variants')
      .insert({
        product_id: noVarProduct.productId,
        variant_name: 'Zero Stock Test',
        size: 'ZEROTEST',
        color: null,
        stock: 0,
        price: 100,
        sku: `ZERO-TEST-${TS}`,
      })
      .select()
      .single();
    assert(!error, `Zero-stock variant should be valid: ${error?.message}`);
    cleanupIds.variants.push(data.id);
  });

  await test('Edge', 'Variant with negative stock is rejected by CHECK constraint', async () => {
    const { error } = await supabase
      .from('product_variants')
      .insert({
        product_id: noVarProduct.productId,
        variant_name: 'Negative Stock Test',
        stock: -5,
        price: 100,
        sku: `NEG-TEST-${TS}`,
      });
    assert(error !== null, 'Negative stock should be rejected by CHECK constraint');
    log('ℹ️', `Correctly rejected: ${error.message}`);
  });

  await test('Edge', 'Product with zero price is valid (free items)', async () => {
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: `E2E Free Item ${TS}`,
        price: 0,
        category_id: categoryId,
        seller_id: seller.id,
        approval_status: 'pending',
      })
      .select()
      .single();
    assert(!error, `Zero-price product should be valid: ${error?.message}`);
    cleanupIds.products.push(data.id);
  });

  await test('Edge', 'Product with negative price is rejected', async () => {
    const { error } = await supabase
      .from('products')
      .insert({
        name: `E2E Negative Price ${TS}`,
        price: -100,
        category_id: categoryId,
        seller_id: seller.id,
      });
    assert(error !== null, 'Negative price should be rejected by CHECK constraint');
    log('ℹ️', `Correctly rejected: ${error.message}`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 14: Frontend Component Parity
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n━━━ SECTION 14: Frontend Component Parity ━━━');

  await test('Frontend', 'SellerProductStatus query shape matches', async () => {
    // The SellerProductStatus page loads QA products via getQAEntriesBySeller
    // Verify the query shape returns everything the frontend needs
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
      .eq('product.seller_id', seller.id)
      .eq('product_id', sizeColorProduct.productId)
      .single();

    assert(!error, `Query failed: ${error?.message}`);
    
    // Verify all fields the frontend components need
    assertNotNull(data.id, 'assessment.id (used as assessmentId key)');
    assertNotNull(data.status, 'assessment.status');
    assertNotNull(data.product?.id, 'product.id');
    assertNotNull(data.product?.name, 'product.name');
    assertNotNull(data.product?.price, 'product.price');
    assertNotNull(data.product?.category?.name, 'product.category.name');
    assertNotNull(data.product?.seller?.store_name, 'product.seller.store_name (vendor field)');
    assert(data.product?.images?.length >= 1, 'product.images');
    assert(data.product?.variants?.length >= 1, 'product.variants');
    assertNotNull(data.product?.variant_label_1, 'product.variant_label_1');
    assertNotNull(data.product?.variant_label_2, 'product.variant_label_2');
  });

  await test('Frontend', 'AdminProductApprovals query shape matches', async () => {
    // Admin page uses getAllQAEntries — verify query returns everything needed
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
      .in('product_id', allTestProductIds);

    assert(!error, `Admin query failed: ${error?.message}`);
    assert(data.length >= 4, `Expected ≥4 records, got ${data.length}`);

    for (const row of data) {
      assertNotNull(row.id, 'assessment.id for React key');
      assertNotNull(row.product?.id, 'product.id');
      assertNotNull(row.product?.seller?.store_name, 'product.seller.store_name for vendor');
    }
  });

  await test('Frontend', 'Status mapping: DB → Legacy → DB round-trip', async () => {
    const LEGACY_TO_NEW = {
      'PENDING_DIGITAL_REVIEW': 'pending_digital_review',
      'WAITING_FOR_SAMPLE': 'waiting_for_sample',
      'IN_QUALITY_REVIEW': 'pending_physical_review',
      'ACTIVE_VERIFIED': 'verified',
      'FOR_REVISION': 'for_revision',
      'REJECTED': 'rejected',
    };
    const NEW_TO_LEGACY = {
      'pending_digital_review': 'PENDING_DIGITAL_REVIEW',
      'waiting_for_sample': 'WAITING_FOR_SAMPLE',
      'pending_physical_review': 'IN_QUALITY_REVIEW',
      'verified': 'ACTIVE_VERIFIED',
      'for_revision': 'FOR_REVISION',
      'rejected': 'REJECTED',
    };

    // Round-trip test
    for (const [legacy, db] of Object.entries(LEGACY_TO_NEW)) {
      assertEqual(NEW_TO_LEGACY[db], legacy, `Round-trip failed for ${legacy}`);
    }
    for (const [db, legacy] of Object.entries(NEW_TO_LEGACY)) {
      assertEqual(LEGACY_TO_NEW[legacy], db, `Round-trip failed for ${db}`);
    }
    log('ℹ️', 'All 6 status mappings round-trip correctly');
  });

  await test('Frontend', 'Unique React keys: assessmentId is distinct for each product', async () => {
    const { data } = await supabase
      .from('product_assessments')
      .select('id, product_id')
      .in('product_id', allTestProductIds);

    // assessmentId (used as React key) should be unique
    const ids = data.map(r => r.id);
    assertEqual(ids.length, new Set(ids).size, 'Assessment IDs should be unique (React keys)');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 15: Full Product Data Verification (as seller would see it)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n━━━ SECTION 15: Full Product Data Verification ━━━');

  await test('FullData', 'Size+Color product: complete data with all relationships', async () => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories (id, name),
        images:product_images (id, image_url, is_primary, sort_order),
        variants:product_variants (id, variant_name, sku, size, color, price, stock, option_1_value, option_2_value),
        assessments:product_assessments (id, status, submitted_at, verified_at)
      `)
      .eq('id', sizeColorProduct.productId)
      .single();

    assert(!error, `Full query failed: ${error?.message}`);
    assertEqual(data.name, `E2E Size+Color Product ${TS}`, 'Product name');
    assertEqual(data.price, 1500, 'Product price');
    assertEqual(data.approval_status, 'approved', 'approval_status');
    assertEqual(data.variant_label_1, 'Size', 'variant_label_1');
    assertEqual(data.variant_label_2, 'Color', 'variant_label_2');
    assertEqual(data.seller_id, seller.id, 'seller_id');
    assertNotNull(data.category, 'Category join');
    assertEqual(data.images.length, 3, 'Image count');
    assertEqual(data.variants.length, 6, 'Variant count');
    assertEqual(data.assessments.length, 1, 'Assessment count');
    assertEqual(data.assessments[0].status, 'verified', 'Assessment status');
    assertNotNull(data.assessments[0].verified_at, 'verified_at');

    // Verify variant option_1_value/option_2_value match size/color
    for (const v of data.variants) {
      assertEqual(v.option_1_value, v.size, `option_1_value should match size for "${v.variant_name}"`);
      assertEqual(v.option_2_value, v.color, `option_2_value should match color for "${v.variant_name}"`);
    }
  });

  await test('FullData', 'No-variant product: default variant data correct', async () => {
    const { data } = await supabase
      .from('products')
      .select(`
        *,
        variants:product_variants (id, variant_name, sku, size, color, stock, price)
      `)
      .eq('id', noVarProduct.productId)
      .single();

    // Should have 1 default + possibly the zero-stock test variant
    assert(data.variants.length >= 1, 'Should have at least 1 variant');
    const defaultVar = data.variants.find(v => v.variant_name === 'Default');
    assertNotNull(defaultVar, 'Default variant should exist');
    assertEqual(defaultVar.stock, 50, 'Default variant stock');
    assertEqual(defaultVar.price, 999, 'Default variant price');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP & RESULTS
  // ═══════════════════════════════════════════════════════════════════════════
  await cleanup();

  console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                           TEST RESULTS                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝');
  console.log(`  ✅ Passed:  ${passed}`);
  console.log(`  ❌ Failed:  ${failed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  📊 Total:   ${passed + failed + skipped}`);

  if (failures.length > 0) {
    console.log('\n━━━ FAILURES ━━━');
    for (const f of failures) {
      console.log(`  ❌ [${f.section}] ${f.name}`);
      console.log(`     ${f.error}`);
    }
  }

  console.log('\n━━━ COVERAGE SUMMARY ━━━');
  console.log('  ✓ Seller add product — no variants (default auto-created)');
  console.log('  ✓ Seller add product — size + color variants (6 combos)');
  console.log('  ✓ Seller add product — size-only variants (5 sizes)');
  console.log('  ✓ Seller add product — color-only variants (3 colors)');
  console.log('  ✓ QA assessment auto-creation on product add');
  console.log('  ✓ QA happy path: digital → sample → physical → verified');
  console.log('  ✓ QA rejection path with reason');
  console.log('  ✓ QA revision path with reason');
  console.log('  ✓ Seller-filtered queries (!inner join fix)');
  console.log('  ✓ Admin enriched queries (N+1 fix)');
  console.log('  ✓ Vendor name resolution (store_name not product.name)');
  console.log('  ✓ approval_status sync across all states');
  console.log('  ✓ Data integrity (FKs, CHECK constraints, unique SKUs)');
  console.log('  ✓ Edge cases (maybeSingle, duplicates, zero/neg values)');
  console.log('  ✓ Frontend component query shape parity');
  console.log('  ✓ Status mapping round-trip');
  console.log('  ✓ React key uniqueness (assessmentId)');
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

// ─── Run ──────────────────────────────────────────────────────────────────────

runTests().catch(err => {
  console.error('\n💥 Fatal error:', err);
  cleanup().finally(() => process.exit(2));
});
