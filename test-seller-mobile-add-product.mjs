/**
 * Seller Mobile Add Product — Consistency & Parity Test
 * ======================================================
 * Simulates the EXACT flow that AddProductScreen.tsx + sellerStore.ts
 * execute when a seller adds a product from the mobile app, then
 * verifies every row/constraint matches what the web app produces.
 *
 * Phases:
 *   1. Mobile add product (exact same DB operations as sellerStore.addProduct)
 *   2. Verify product row columns
 *   3. Verify images saved with CHECK constraint compliance
 *   4. Verify variants with UNIQUE SKU constraint
 *   5. Verify QA assessment auto-created
 *   6. Web add product (exact same DB operations as web sellerStore.addProduct)
 *   7. Cross-platform parity comparison
 *   8. Edit product flow (replaceProductImages)
 *   9. Variant label & variant data consistency
 *  10. Edge cases: duplicate SKU, local URI filtering, empty images, zero stock
 *  11. Full display query (what the product list screen runs)
 *  12. Cleanup
 *
 * Usage: node test-seller-mobile-add-product.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzUyMTUsImV4cCI6MjA4NTgxMTIxNX0.slNSrIdWo-EH4lpJQRIsIw9XbhaFKXsa2nICDmVBTrY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Test data ──────────────────────────────────
const TEST_SELLER_ID = '7955043d-f46f-47aa-8767-0582c35b95c7'; // TechHub Electronics
const TEST_CATEGORY_ID = 'fc4fc320-3248-4762-9042-928b4f0ee142'; // Electronics
const TS = Date.now();

// Simulates what AddProductScreen builds
const MOBILE_PRODUCT = {
  name: `__MOBILE_TEST_${TS}`,
  description: 'Test product from mobile seller add product flow',
  price: 1299.99,
  category: 'Electronics',
  images: [
    'https://placehold.co/400x400?text=Mobile+Main',
    'https://placehold.co/400x400?text=Mobile+Side',
    'file:///data/user/0/com.bazaar/cache/photo1.jpg', // local URI — must be filtered
    '',                                                  // empty — must be filtered
  ],
  stock: 25,
  sizes: ['S', 'M', 'L'],
  colors: ['Red', 'Blue'],
  variants: [
    { option1: 'Red', option2: 'S', price: '1299.99', stock: '10', sku: 'RED-S' },
    { option1: 'Red', option2: 'M', price: '1299.99', stock: '8', sku: 'RED-M' },
    { option1: 'Blue', option2: 'L', price: '1399.99', stock: '7', sku: 'BLU-L' },
  ],
  variant_label_1: 'Color',
  variant_label_2: 'Size',
};

// Web product for parity comparison
const WEB_PRODUCT = {
  name: `__WEB_TEST_${TS}`,
  description: 'Test product from web seller add product flow',
  price: 1299.99,
  category: 'Electronics',
  images: [
    'https://placehold.co/400x400?text=Web+Main',
    'https://placehold.co/400x400?text=Web+Side',
  ],
  stock: 25,
  variants: [
    { variantLabel1Value: 'Red', variantLabel2Value: 'S', price: 1299.99, stock: 10, sku: 'RED-S' },
    { variantLabel1Value: 'Red', variantLabel2Value: 'M', price: 1299.99, stock: 8, sku: 'RED-M' },
    { variantLabel1Value: 'Blue', variantLabel2Value: 'L', price: 1399.99, stock: 7, sku: 'BLU-L' },
  ],
  variant_label_1: 'Color',
  variant_label_2: 'Size',
};

// Tracking
let mobileProductId = null;
let mobileAssessmentId = null;
let mobileVariantIds = [];
let mobileImageIds = [];
let webProductId = null;
let webAssessmentId = null;
let webVariantIds = [];
let webImageIds = [];

let passed = 0;
let failed = 0;
const results = [];

function log(emoji, msg) { console.log(`${emoji} ${msg}`); }
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

// ═══════════════════════════════════════════════════════
// PHASE 1: Mobile Add Product (mirrors sellerStore.addProduct)
// ═══════════════════════════════════════════════════════

async function phase1_mobileCreateProduct() {
  log('📱', '═══ PHASE 1: Mobile Seller Creates Product ═══');

  // Step 1a: Resolve category by name (like resolveCategoryIdByName)
  const { data: categoryRow, error: catErr } = await supabase
    .from('categories')
    .select('id, name')
    .eq('name', MOBILE_PRODUCT.category)
    .maybeSingle();

  assert(!catErr && !!categoryRow, '1.01 Resolve category by name', catErr?.message || 'No category found');
  assert(categoryRow?.id === TEST_CATEGORY_ID, '1.02 Category ID matches expected Electronics ID');

  // Step 1b: buildProductInsert → products INSERT
  const insertData = {
    name: MOBILE_PRODUCT.name,
    description: MOBILE_PRODUCT.description,
    price: MOBILE_PRODUCT.price,
    category_id: categoryRow?.id || TEST_CATEGORY_ID,
    brand: null,
    sku: null,
    seller_id: TEST_SELLER_ID,
    approval_status: 'pending',
    low_stock_threshold: 10,
    specifications: {},
    weight: null,
    dimensions: null,
    is_free_shipping: false,
    variant_label_1: MOBILE_PRODUCT.variant_label_1,
    variant_label_2: MOBILE_PRODUCT.variant_label_2,
  };

  const { data: product, error: prodErr } = await supabase
    .from('products')
    .insert(insertData)
    .select()
    .single();

  assert(!prodErr, '1.03 Product INSERT succeeds', prodErr?.message);
  assert(!!product?.id, '1.04 Product ID returned (UUID)', `Got: ${product?.id}`);
  assert(product?.seller_id === TEST_SELLER_ID, '1.05 seller_id set correctly');
  assert(product?.approval_status === 'pending', '1.06 approval_status = pending');
  assert(product?.category_id === TEST_CATEGORY_ID, '1.07 category_id FK set');
  assert(product?.variant_label_1 === 'Color', '1.08 variant_label_1 = Color');
  assert(product?.variant_label_2 === 'Size', '1.09 variant_label_2 = Size');
  assert(product?.price === MOBILE_PRODUCT.price, '1.10 price stored correctly');
  assert(product?.low_stock_threshold === 10, '1.11 low_stock_threshold = 10');
  assert(product?.is_free_shipping === false, '1.12 is_free_shipping = false');
  assert(!product?.disabled_at, '1.13 disabled_at is NULL (product not disabled)');
  assert(!product?.deleted_at, '1.14 deleted_at is NULL (product not deleted)');

  if (product?.id) mobileProductId = product.id;
  return !!product?.id;
}

async function phase1_mobileCreateImages() {
  if (!mobileProductId) return;

  // Step 1c: Filter images — only valid HTTP URLs pass (mirrors sellerStore.addProduct)
  const validImages = MOBILE_PRODUCT.images.filter(
    (url) => url && /^https?:\/\//i.test(url.trim())
  );

  assert(validImages.length === 2, '1.15 Local URI + empty string filtered (4 input → 2 valid)', `Got: ${validImages.length}`);
  assert(!validImages.some(u => u.startsWith('file://')), '1.16 No file:// URIs in valid set');
  assert(!validImages.some(u => u.trim() === ''), '1.17 No empty strings in valid set');

  // Step 1d: addProductImages (mirrors productService.addProductImages)
  const imageInserts = validImages.map((url, idx) => ({
    product_id: mobileProductId,
    image_url: url.trim(),
    alt_text: '',
    sort_order: idx,
    is_primary: idx === 0,
  }));

  const { data: images, error: imgErr } = await supabase
    .from('product_images')
    .insert(imageInserts)
    .select();

  assert(!imgErr, '1.18 Product images INSERT succeeds', imgErr?.message);
  assert(images?.length === 2, '1.19 Exactly 2 images saved to DB', `Got: ${images?.length}`);

  const primary = images?.find(i => i.is_primary);
  assert(!!primary, '1.20 Primary image flag set (is_primary = true on first image)');
  assert(primary?.sort_order === 0, '1.21 Primary image sort_order = 0');
  assert(images?.every(i => /^https?:\/\//.test(i.image_url)), '1.22 All image_url pass CHECK constraint');

  if (images) mobileImageIds = images.map(i => i.id);
}

async function phase1_mobileCreateVariants() {
  if (!mobileProductId) return;

  // Step 1e: Build variants — mirrors sellerStore.addProduct variant logic
  const idPrefix = mobileProductId.substring(0, 8);
  const variantInserts = MOBILE_PRODUCT.variants.map((v, index) => {
    const baseSku = v.sku ? v.sku.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 20) : `V${index}`;
    return {
      product_id: mobileProductId,
      variant_name: [v.option2, v.option1].filter(x => x && x !== '-').join(' - ') || 'Default',
      size: (v.option2 || '') === '-' ? null : (v.option2 || null),
      color: (v.option1 || '') === '-' ? null : (v.option1 || null),
      stock: parseInt(v.stock) || 0,
      price: parseFloat(v.price) || MOBILE_PRODUCT.price,
      sku: `${idPrefix}-${baseSku}`,
      thumbnail_url: null,
      barcode: null,
      option_1_value: (v.option1 || '') === '-' ? null : (v.option1 || null),
      option_2_value: (v.option2 || '') === '-' ? null : (v.option2 || null),
      embedding: null,
    };
  });

  const { data: variants, error: varErr } = await supabase
    .from('product_variants')
    .insert(variantInserts)
    .select();

  assert(!varErr, '1.23 Product variants INSERT succeeds (no SKU collision)', varErr?.message);
  assert(variants?.length === 3, '1.24 All 3 variants created', `Got: ${variants?.length}`);

  // Verify SKU format
  const skus = variants?.map(v => v.sku) || [];
  assert(skus.every(s => s.startsWith(idPrefix + '-')), '1.25 All SKUs prefixed with product ID');
  assert(new Set(skus).size === skus.length, '1.26 All SKUs unique within this product');

  // Verify stock
  const totalVariantStock = variants?.reduce((sum, v) => sum + v.stock, 0) || 0;
  assert(totalVariantStock === 25, '1.27 Total variant stock = 25 (10+8+7)', `Got: ${totalVariantStock}`);

  // Verify option values mapped
  const redS = variants?.find(v => v.sku.includes('RED-S'));
  assert(redS?.option_1_value === 'Red', '1.28 option_1_value = Red for RED-S variant');
  assert(redS?.option_2_value === 'S', '1.29 option_2_value = S for RED-S variant');
  assert(redS?.color === 'Red', '1.30 color = Red');
  assert(redS?.size === 'S', '1.31 size = S');

  if (variants) mobileVariantIds = variants.map(v => v.id);
}

async function phase1_mobileCreateQA() {
  if (!mobileProductId) return;

  // Step 1f: QA assessment auto-created (mirrors addProductToQA → qaService.createQAEntry)
  const { error: qaErr } = await supabase
    .from('product_assessments')
    .upsert(
      {
        product_id: mobileProductId,
        status: 'pending_digital_review',
        submitted_at: new Date().toISOString(),
        created_by: TEST_SELLER_ID,
      },
      { onConflict: 'product_id', ignoreDuplicates: true }
    );

  assert(!qaErr, '1.32 QA assessment UPSERT succeeds', qaErr?.message);

  const { data: qa, error: qaFetchErr } = await supabase
    .from('product_assessments')
    .select('*')
    .eq('product_id', mobileProductId)
    .maybeSingle();

  assert(!qaFetchErr && !!qa, '1.33 QA assessment row exists', qaFetchErr?.message);
  assert(qa?.status === 'pending_digital_review', '1.34 QA status = pending_digital_review');
  assert(qa?.created_by === TEST_SELLER_ID, '1.35 QA created_by = seller ID');

  if (qa?.id) mobileAssessmentId = qa.id;
}

// ═══════════════════════════════════════════════════════
// PHASE 2: Product Row Verification
// ═══════════════════════════════════════════════════════

async function phase2_verifyProductRow() {
  log('🔍', '═══ PHASE 2: Product Row Column Verification ═══');
  if (!mobileProductId) return;

  // Read back the exact product row
  const { data: p, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', mobileProductId)
    .single();

  assert(!error, '2.01 Re-read product row succeeds', error?.message);

  // Verify all columns the product list screen uses
  assert(typeof p.name === 'string' && p.name.length > 0, '2.02 name is non-empty string');
  assert(typeof p.description === 'string', '2.03 description is string');
  assert(typeof p.price === 'number' && p.price > 0, '2.04 price is positive number');
  assert(p.category_id !== null, '2.05 category_id is not null');
  assert(p.seller_id !== null, '2.06 seller_id is not null');
  assert(['pending', 'approved', 'rejected', 'reclassified'].includes(p.approval_status), '2.07 approval_status is valid enum');
  assert(p.specifications !== undefined, '2.08 specifications defined (jsonb)');
  assert(p.created_at !== null, '2.09 created_at set');
  assert(p.updated_at !== null, '2.10 updated_at set');

  // Verify NO stock/is_active columns (DB schema doesn't have them)
  assert(!('stock' in p) || p.stock === undefined, '2.11 No "stock" column on products (stock lives in variants)');
  assert(!('is_active' in p) || p.is_active === undefined, '2.12 No "is_active" column (uses disabled_at)');
}

// ═══════════════════════════════════════════════════════
// PHASE 3: Image CHECK Constraint Compliance
// ═══════════════════════════════════════════════════════

async function phase3_imageConstraints() {
  log('🖼️', '═══ PHASE 3: Image CHECK Constraint Compliance ═══');
  if (!mobileProductId) return;

  // Verify local URI is rejected by DB CHECK constraint
  const { error: localErr } = await supabase
    .from('product_images')
    .insert({
      product_id: mobileProductId,
      image_url: 'file:///data/user/0/com.bazaar/cache/photo1.jpg',
      alt_text: '',
      sort_order: 99,
      is_primary: false,
    });

  assert(!!localErr, '3.01 file:// URI rejected by CHECK constraint (image_url ~ ^https?://)', localErr?.message || 'Should have failed');

  // Verify empty string is rejected
  const { error: emptyErr } = await supabase
    .from('product_images')
    .insert({
      product_id: mobileProductId,
      image_url: '',
      alt_text: '',
      sort_order: 99,
      is_primary: false,
    });

  assert(!!emptyErr, '3.02 Empty string rejected by CHECK constraint');

  // Verify data: URI is rejected
  const { error: dataErr } = await supabase
    .from('product_images')
    .insert({
      product_id: mobileProductId,
      image_url: 'data:image/png;base64,iVBORw0K',
      alt_text: '',
      sort_order: 99,
      is_primary: false,
    });

  assert(!!dataErr, '3.03 data: URI rejected by CHECK constraint');

  // Verify HTTPS URL passes
  const { data: httpsImg, error: httpsErr } = await supabase
    .from('product_images')
    .insert({
      product_id: mobileProductId,
      image_url: 'https://placehold.co/100x100?text=CHECK_TEST',
      alt_text: '',
      sort_order: 99,
      is_primary: false,
    })
    .select()
    .single();

  assert(!httpsErr, '3.04 HTTPS URL passes CHECK constraint', httpsErr?.message);

  // Cleanup the extra test image
  if (httpsImg?.id) {
    await supabase.from('product_images').delete().eq('id', httpsImg.id);
  }

  // Read back images and verify count matches
  const { data: allImgs } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', mobileProductId)
    .order('sort_order');

  assert(allImgs?.length === 2, '3.05 Product still has exactly 2 valid images', `Got: ${allImgs?.length}`);
}

// ═══════════════════════════════════════════════════════
// PHASE 4: Variant UNIQUE SKU Constraint
// ═══════════════════════════════════════════════════════

async function phase4_variantSKUConstraint() {
  log('🏷️', '═══ PHASE 4: Variant UNIQUE SKU Constraint ═══');
  if (!mobileProductId || mobileVariantIds.length === 0) return;

  // Get existing SKU
  const { data: existingVariant } = await supabase
    .from('product_variants')
    .select('sku')
    .eq('id', mobileVariantIds[0])
    .single();

  const existingSku = existingVariant?.sku;
  assert(!!existingSku, '4.01 Got existing SKU to test duplication', `SKU: ${existingSku}`);

  // Try to insert duplicate SKU
  const { error: dupErr } = await supabase
    .from('product_variants')
    .insert({
      product_id: mobileProductId,
      variant_name: 'Dup Test',
      sku: existingSku, // same SKU
      price: 100,
      stock: 1,
    });

  assert(!!dupErr, '4.02 Duplicate SKU INSERT fails (UNIQUE constraint)', dupErr?.message || 'Should have failed');
  assert(dupErr?.code === '23505' || dupErr?.message?.includes('unique'), '4.03 Error is specifically unique constraint violation');

  // Verify product ID prefix makes SKUs unique across products
  const prefix = mobileProductId.substring(0, 8);
  assert(existingSku.startsWith(prefix + '-'), '4.04 SKU starts with product ID prefix', `SKU: ${existingSku}`);

  // Test that a DIFFERENT product can use the same base SKU name
  // (because the prefix prevents collision — this is the core fix)
  const { data: otherProd, error: otherProdErr } = await supabase
    .from('products')
    .insert({
      name: `__SKU_COLLISION_TEST_${TS}`,
      description: 'Temporary product to test SKU uniqueness',
      price: 100,
      category_id: TEST_CATEGORY_ID,
      seller_id: TEST_SELLER_ID,
      approval_status: 'pending',
      low_stock_threshold: 10,
      specifications: {},
      is_free_shipping: false,
    })
    .select()
    .single();

  if (otherProd?.id) {
    const otherPrefix = otherProd.id.substring(0, 8);
    const { error: otherVarErr } = await supabase
      .from('product_variants')
      .insert({
        product_id: otherProd.id,
        variant_name: 'Same Base SKU',
        sku: `${otherPrefix}-RED-S`, // Same base "RED-S" but different prefix
        price: 100,
        stock: 1,
      });

    assert(!otherVarErr, '4.05 Same base SKU on different product succeeds (prefix prevents collision)', otherVarErr?.message);

    // Cleanup
    await supabase.from('product_variants').delete().eq('product_id', otherProd.id);
    await supabase.from('products').delete().eq('id', otherProd.id);
  }
}

// ═══════════════════════════════════════════════════════
// PHASE 5: QA Assessment Verification
// ═══════════════════════════════════════════════════════

async function phase5_qaAssessment() {
  log('📋', '═══ PHASE 5: QA Assessment Verification ═══');
  if (!mobileProductId || !mobileAssessmentId) return;

  // Idempotent upsert — should not create duplicate
  const { error: repeatErr } = await supabase
    .from('product_assessments')
    .upsert(
      {
        product_id: mobileProductId,
        status: 'pending_digital_review',
        submitted_at: new Date().toISOString(),
        created_by: TEST_SELLER_ID,
      },
      { onConflict: 'product_id', ignoreDuplicates: true }
    );

  assert(!repeatErr, '5.01 Repeat UPSERT is idempotent (no error)', repeatErr?.message);

  const { data: qaRows } = await supabase
    .from('product_assessments')
    .select('id')
    .eq('product_id', mobileProductId);

  assert(qaRows?.length === 1, '5.02 Still exactly 1 assessment (no duplicate)', `Got: ${qaRows?.length}`);

  // Direct INSERT should fail (UNIQUE product_id)
  const { error: dupErr } = await supabase
    .from('product_assessments')
    .insert({
      product_id: mobileProductId,
      status: 'pending_digital_review',
      submitted_at: new Date().toISOString(),
    });

  assert(!!dupErr, '5.03 Direct INSERT duplicate product_id fails (UNIQUE)', dupErr?.message || 'Should fail');
}

// ═══════════════════════════════════════════════════════
// PHASE 6: Web Add Product (for parity comparison)
// ═══════════════════════════════════════════════════════

async function phase6_webCreateProduct() {
  log('🖥️', '═══ PHASE 6: Web Seller Creates Product (Parity Baseline) ═══');

  // Same buildProductInsert from web — should produce identical row structure
  const { data: product, error: prodErr } = await supabase
    .from('products')
    .insert({
      name: WEB_PRODUCT.name,
      description: WEB_PRODUCT.description,
      price: WEB_PRODUCT.price,
      category_id: TEST_CATEGORY_ID,
      brand: null,
      sku: null,
      seller_id: TEST_SELLER_ID,
      approval_status: 'pending',
      low_stock_threshold: 10,
      specifications: {},
      weight: null,
      dimensions: null,
      is_free_shipping: false,
      variant_label_1: WEB_PRODUCT.variant_label_1,
      variant_label_2: WEB_PRODUCT.variant_label_2,
    })
    .select()
    .single();

  assert(!prodErr, '6.01 Web product INSERT succeeds', prodErr?.message);
  if (product?.id) webProductId = product.id;
  else return;

  // Web images (URLs already valid, no filtering needed like web does)
  const webImgInserts = WEB_PRODUCT.images.map((url, idx) => ({
    product_id: webProductId,
    image_url: url,
    alt_text: '',
    sort_order: idx,
    is_primary: idx === 0,
  }));

  const { data: webImgs, error: imgErr } = await supabase
    .from('product_images')
    .insert(webImgInserts)
    .select();

  assert(!imgErr, '6.02 Web product images INSERT succeeds', imgErr?.message);
  if (webImgs) webImageIds = webImgs.map(i => i.id);

  // Web variants — same SKU pattern
  const webPrefix = webProductId.substring(0, 8);
  const webVarInserts = WEB_PRODUCT.variants.map((v, index) => ({
    product_id: webProductId,
    variant_name: [v.variantLabel1Value, v.variantLabel2Value].filter(Boolean).join(' - ') || 'Default',
    size: v.variantLabel2Value || null,
    color: v.variantLabel1Value || null,
    option_1_value: v.variantLabel1Value || null,
    option_2_value: v.variantLabel2Value || null,
    stock: v.stock || 0,
    price: v.price || WEB_PRODUCT.price,
    sku: `${webPrefix}-${(v.sku || `V${index}`).replace(/[^a-zA-Z0-9-]/g, '').substring(0, 20)}`,
    thumbnail_url: null,
    barcode: null,
    embedding: null,
  }));

  const { data: webVars, error: varErr } = await supabase
    .from('product_variants')
    .insert(webVarInserts)
    .select();

  assert(!varErr, '6.03 Web product variants INSERT succeeds', varErr?.message);
  if (webVars) webVariantIds = webVars.map(v => v.id);

  // Web QA assessment
  const { error: qaErr } = await supabase
    .from('product_assessments')
    .upsert(
      {
        product_id: webProductId,
        status: 'pending_digital_review',
        submitted_at: new Date().toISOString(),
        created_by: TEST_SELLER_ID,
      },
      { onConflict: 'product_id', ignoreDuplicates: true }
    );

  assert(!qaErr, '6.04 Web QA assessment UPSERT succeeds', qaErr?.message);

  const { data: qa } = await supabase
    .from('product_assessments')
    .select('id')
    .eq('product_id', webProductId)
    .maybeSingle();

  if (qa?.id) webAssessmentId = qa.id;
}

// ═══════════════════════════════════════════════════════
// PHASE 7: Cross-Platform Parity Comparison
// ═══════════════════════════════════════════════════════

async function phase7_parityComparison() {
  log('⚖️', '═══ PHASE 7: Cross-Platform Parity Comparison ═══');
  if (!mobileProductId || !webProductId) return;

  // Read both products with full joins
  const query = `
    *,
    category:categories (id, name),
    images:product_images (id, image_url, is_primary, sort_order),
    variants:product_variants (id, variant_name, sku, size, color, price, stock, option_1_value, option_2_value),
    seller:sellers (id, store_name, owner_name)
  `;

  const { data: mobileP } = await supabase
    .from('products')
    .select(query)
    .eq('id', mobileProductId)
    .single();

  const { data: webP } = await supabase
    .from('products')
    .select(query)
    .eq('id', webProductId)
    .single();

  assert(!!mobileP && !!webP, '7.01 Both products read back successfully');

  // Structure parity — same columns present
  const mobileKeys = Object.keys(mobileP || {}).sort().join(',');
  const webKeys = Object.keys(webP || {}).sort().join(',');
  assert(mobileKeys === webKeys, '7.02 Product row columns identical (mobile vs web)');

  // Key field parity
  assert(mobileP.approval_status === webP.approval_status, '7.03 approval_status same');
  assert(mobileP.category_id === webP.category_id, '7.04 category_id same');
  assert(mobileP.seller_id === webP.seller_id, '7.05 seller_id same');
  assert(mobileP.is_free_shipping === webP.is_free_shipping, '7.06 is_free_shipping same');
  assert(mobileP.low_stock_threshold === webP.low_stock_threshold, '7.07 low_stock_threshold same');

  // Variant label parity
  assert(mobileP.variant_label_1 === webP.variant_label_1, '7.08 variant_label_1 same (Color)');
  assert(mobileP.variant_label_2 === webP.variant_label_2, '7.09 variant_label_2 same (Size)');

  // Images parity — both have images with correct structure
  assert(mobileP.images?.length > 0, '7.10 Mobile product has images');
  assert(webP.images?.length > 0, '7.11 Web product has images');
  assert(mobileP.images?.some(i => i.is_primary), '7.12 Mobile has primary image flag');
  assert(webP.images?.some(i => i.is_primary), '7.13 Web has primary image flag');

  // Variants parity
  assert(mobileP.variants?.length === webP.variants?.length, '7.14 Same number of variants', `Mobile: ${mobileP.variants?.length}, Web: ${webP.variants?.length}`);

  // SKU format parity — both use product ID prefix
  const mobileSkus = mobileP.variants?.map(v => v.sku) || [];
  const webSkus = webP.variants?.map(v => v.sku) || [];
  const mobilePrefix = mobileProductId.substring(0, 8);
  const webPrefix = webProductId.substring(0, 8);
  assert(mobileSkus.every(s => s.startsWith(mobilePrefix + '-')), '7.15 Mobile SKUs use product prefix');
  assert(webSkus.every(s => s.startsWith(webPrefix + '-')), '7.16 Web SKUs use product prefix');

  // Seller join parity
  assert(mobileP.seller?.store_name === webP.seller?.store_name, '7.17 Seller store_name joined same');
  assert(mobileP.seller?.store_name === 'TechHub Electronics', '7.18 Correct seller name');

  // Category join parity
  assert(mobileP.category?.name === webP.category?.name, '7.19 Category name joined same');
  assert(mobileP.category?.name === 'Electronics', '7.20 Correct category name');
}

// ═══════════════════════════════════════════════════════
// PHASE 8: Edit Product Flow (replaceProductImages)
// ═══════════════════════════════════════════════════════

async function phase8_editProductImages() {
  log('✏️', '═══ PHASE 8: Edit Product — Replace Images ═══');
  if (!mobileProductId) return;

  // Verify initial state
  const { data: before } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', mobileProductId)
    .order('sort_order');

  assert(before?.length === 2, '8.01 Product starts with 2 images', `Got: ${before?.length}`);

  // replaceProductImages: delete old, insert new
  const newImageUrls = [
    'https://placehold.co/400x400?text=Updated+Main',
    'https://placehold.co/400x400?text=Updated+Side',
    'https://placehold.co/400x400?text=Updated+Back',
    'file:///invalid/local/path.jpg', // should be filtered
  ];

  // Filter (mirrors productService.replaceProductImages)
  const validUrls = newImageUrls.filter(url => url && /^https?:\/\//i.test(url.trim()));
  assert(validUrls.length === 3, '8.02 replaceProductImages filters to 3 valid URLs');

  // Delete old
  const { error: delErr } = await supabase
    .from('product_images')
    .delete()
    .eq('product_id', mobileProductId);

  assert(!delErr, '8.03 Delete old images succeeds', delErr?.message);

  // Insert new
  const { data: newImgs, error: insErr } = await supabase
    .from('product_images')
    .insert(validUrls.map((url, idx) => ({
      product_id: mobileProductId,
      image_url: url.trim(),
      alt_text: '',
      sort_order: idx,
      is_primary: idx === 0,
    })))
    .select();

  assert(!insErr, '8.04 Insert new images succeeds', insErr?.message);
  assert(newImgs?.length === 3, '8.05 Product now has 3 images after edit', `Got: ${newImgs?.length}`);
  assert(newImgs?.[0]?.is_primary === true, '8.06 First new image is primary');
  assert(newImgs?.[0]?.image_url.includes('Updated+Main'), '8.07 First image is the updated main');

  // Update tracked IDs
  if (newImgs) mobileImageIds = newImgs.map(i => i.id);
}

// ═══════════════════════════════════════════════════════
// PHASE 9: Variant Labels & Data Consistency
// ═══════════════════════════════════════════════════════

async function phase9_variantConsistency() {
  log('📊', '═══ PHASE 9: Variant Label & Data Consistency ═══');
  if (!mobileProductId) return;

  const { data: product } = await supabase
    .from('products')
    .select('variant_label_1, variant_label_2')
    .eq('id', mobileProductId)
    .single();

  const { data: variants } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', mobileProductId)
    .order('sku');

  assert(!!product && !!variants, '9.01 Product + variants readable');

  // variant_label_1 = Color → should correspond to option_1_value / color
  if (product.variant_label_1 === 'Color') {
    const colorVariants = variants.filter(v => v.option_1_value);
    assert(colorVariants.length > 0, '9.02 Variants have option_1_value when label_1 = Color');
    assert(colorVariants.every(v => v.color === v.option_1_value), '9.03 color column matches option_1_value');
  }

  // variant_label_2 = Size → should correspond to option_2_value / size
  if (product.variant_label_2 === 'Size') {
    const sizeVariants = variants.filter(v => v.option_2_value);
    assert(sizeVariants.length > 0, '9.04 Variants have option_2_value when label_2 = Size');
    assert(sizeVariants.every(v => v.size === v.option_2_value), '9.05 size column matches option_2_value');
  }

  // Verify price is always ≥ 0 (CHECK constraint)
  assert(variants.every(v => v.price >= 0), '9.06 All variant prices ≥ 0');

  // Verify stock is always ≥ 0 (CHECK constraint)
  assert(variants.every(v => v.stock >= 0), '9.07 All variant stocks ≥ 0');

  // Verify variant_name is meaningful
  assert(variants.every(v => v.variant_name && v.variant_name.length > 0), '9.08 All variant_name non-empty');
}

// ═══════════════════════════════════════════════════════
// PHASE 10: Edge Cases
// ═══════════════════════════════════════════════════════

async function phase10_edgeCases() {
  log('⚡', '═══ PHASE 10: Edge Cases ═══');

  // 10a: Product with no variants gets default variant
  log('  ', '  --- Default variant when no variants provided ---');
  const { data: noVarProd } = await supabase
    .from('products')
    .insert({
      name: `__NO_VARIANT_TEST_${TS}`,
      description: 'Product with no variants',
      price: 500,
      category_id: TEST_CATEGORY_ID,
      seller_id: TEST_SELLER_ID,
      approval_status: 'pending',
      low_stock_threshold: 10,
      specifications: {},
      is_free_shipping: false,
    })
    .select()
    .single();

  if (noVarProd?.id) {
    // Simulate default variant creation (mirrors addProduct when no variants)
    const defaultSku = `${noVarProd.id.substring(0, 8)}-default`;
    const { data: defVar, error: defVarErr } = await supabase
      .from('product_variants')
      .insert({
        product_id: noVarProd.id,
        variant_name: 'Default',
        size: null,
        color: null,
        stock: 15,
        price: 500,
        sku: defaultSku,
        thumbnail_url: null,
        barcode: null,
        option_1_value: null,
        option_2_value: null,
        embedding: null,
      })
      .select()
      .single();

    assert(!defVarErr, '10.01 Default variant created for no-variant product', defVarErr?.message);
    assert(defVar?.variant_name === 'Default', '10.02 Default variant name = "Default"');
    assert(defVar?.sku === defaultSku, '10.03 Default SKU uses product ID prefix');
    assert(defVar?.stock === 15, '10.04 Default variant stock matches');

    // Cleanup
    await supabase.from('product_variants').delete().eq('product_id', noVarProd.id);
    await supabase.from('products').delete().eq('id', noVarProd.id);
  }

  // 10b: Product with only placeholder image
  log('  ', '  --- Placeholder image when all images invalid ---');
  const allInvalidImages = [
    'file:///local/photo1.jpg',
    'data:image/png;base64,abc',
    '',
    '   ',
  ];
  const filtered = allInvalidImages.filter(url => url && /^https?:\/\//i.test(url.trim()));
  assert(filtered.length === 0, '10.05 All invalid images filtered out (0 valid)');
  // App would use: ['https://placehold.co/400x400?text=No+Image'] as fallback

  // 10c: Two products with identical names but different IDs get different SKUs
  log('  ', '  --- Identical product names → unique SKUs ---');
  const { data: dup1 } = await supabase
    .from('products')
    .insert({
      name: `__DUP_NAME_TEST_${TS}`,
      description: 'Dup 1',
      price: 100,
      category_id: TEST_CATEGORY_ID,
      seller_id: TEST_SELLER_ID,
      approval_status: 'pending',
      low_stock_threshold: 10,
      specifications: {},
      is_free_shipping: false,
    })
    .select()
    .single();

  const { data: dup2 } = await supabase
    .from('products')
    .insert({
      name: `__DUP_NAME_TEST_${TS}`,
      description: 'Dup 2',
      price: 100,
      category_id: TEST_CATEGORY_ID,
      seller_id: TEST_SELLER_ID,
      approval_status: 'pending',
      low_stock_threshold: 10,
      specifications: {},
      is_free_shipping: false,
    })
    .select()
    .single();

  if (dup1?.id && dup2?.id) {
    const sku1 = `${dup1.id.substring(0, 8)}-default`;
    const sku2 = `${dup2.id.substring(0, 8)}-default`;

    assert(sku1 !== sku2, '10.06 Same-name products get different SKU prefixes', `${sku1} vs ${sku2}`);

    const { error: v1Err } = await supabase
      .from('product_variants')
      .insert({ product_id: dup1.id, variant_name: 'Default', sku: sku1, price: 100, stock: 1 });
    const { error: v2Err } = await supabase
      .from('product_variants')
      .insert({ product_id: dup2.id, variant_name: 'Default', sku: sku2, price: 100, stock: 1 });

    assert(!v1Err && !v2Err, '10.07 Both variants insert without SKU collision', v1Err?.message || v2Err?.message);

    // Cleanup
    await supabase.from('product_variants').delete().eq('product_id', dup1.id);
    await supabase.from('product_variants').delete().eq('product_id', dup2.id);
    await supabase.from('products').delete().eq('id', dup1.id);
    await supabase.from('products').delete().eq('id', dup2.id);
  }

  // 10d: Variant with '-' option values → should store as null
  log('  ', '  --- Dash option values stored as null ---');
  if (mobileProductId) {
    const dashOption = { option1: '-', option2: '-' };
    const resultColor = (dashOption.option1 || '') === '-' ? null : dashOption.option1;
    const resultSize = (dashOption.option2 || '') === '-' ? null : dashOption.option2;
    assert(resultColor === null, '10.08 Dash option1 maps to null');
    assert(resultSize === null, '10.09 Dash option2 maps to null');
  }
}

// ═══════════════════════════════════════════════════════
// PHASE 11: Full Display Query (Product List Screen)
// ═══════════════════════════════════════════════════════

async function phase11_displayQuery() {
  log('📺', '═══ PHASE 11: Full Display Query (Seller Product List) ═══');
  if (!mobileProductId) return;

  // This is the exact query that the seller products list screen runs
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories (id, name, slug),
      images:product_images (id, image_url, is_primary, sort_order),
      variants:product_variants (id, variant_name, sku, size, color, price, stock, option_1_value, option_2_value, thumbnail_url),
      seller:sellers (id, store_name, owner_name)
    `)
    .eq('seller_id', TEST_SELLER_ID)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  assert(!error, '11.01 Seller product list query succeeds', error?.message);
  assert(Array.isArray(data) && data.length > 0, '11.02 Products returned for this seller');

  const mobileProd = data?.find(p => p.id === mobileProductId);
  assert(!!mobileProd, '11.03 Mobile-created product appears in seller list');

  // Verify display fields
  assert(!!mobileProd?.name, '11.04 Product name present for display');
  assert(typeof mobileProd?.price === 'number', '11.05 Product price present for display');
  assert(!!mobileProd?.category?.name, '11.06 Category name joined for display');
  assert(mobileProd?.images?.length > 0, '11.07 Images joined for display');
  assert(mobileProd?.variants?.length > 0, '11.08 Variants joined for display');
  assert(!!mobileProd?.seller?.store_name, '11.09 Seller name joined for display');

  // Compute total stock from variants (how the app does it)
  const totalStock = mobileProd?.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
  assert(totalStock > 0, '11.10 Total stock from variants > 0', `Got: ${totalStock}`);

  // Primary image for thumbnail
  const primaryImg = mobileProd?.images?.find(i => i.is_primary) || mobileProd?.images?.[0];
  assert(!!primaryImg?.image_url, '11.11 Primary image URL available for thumbnail');
  assert(/^https?:\/\//.test(primaryImg?.image_url), '11.12 Primary image URL is valid HTTP');

  // QA assessment also visible in admin query
  const { data: qaData, error: qaErr } = await supabase
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
      )
    `)
    .eq('product_id', mobileProductId)
    .maybeSingle();

  assert(!qaErr, '11.13 QA assessment query with full joins succeeds', qaErr?.message);
  assert(qaData?.product?.name === MOBILE_PRODUCT.name, '11.14 QA product name matches');
  assert(qaData?.product?.images?.length > 0, '11.15 QA product images present');
  assert(qaData?.product?.variants?.length === 3, '11.16 QA product variants = 3', `Got: ${qaData?.product?.variants?.length}`);
  assert(qaData?.product?.seller?.store_name === 'TechHub Electronics', '11.17 QA product seller joined');
}

// ═══════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════

async function cleanup() {
  log('🧹', '═══ CLEANUP ═══');

  for (const { label, productId, assessmentId, variantIds, imageIds } of [
    { label: 'Mobile', productId: mobileProductId, assessmentId: mobileAssessmentId, variantIds: mobileVariantIds, imageIds: mobileImageIds },
    { label: 'Web', productId: webProductId, assessmentId: webAssessmentId, variantIds: webVariantIds, imageIds: webImageIds },
  ]) {
    if (!productId) continue;

    if (assessmentId) {
      await supabase.from('product_approvals').delete().eq('assessment_id', assessmentId);
      await supabase.from('product_rejections').delete().eq('assessment_id', assessmentId);
      await supabase.from('product_revisions').delete().eq('assessment_id', assessmentId);
      await supabase.from('product_assessment_logistics').delete().eq('assessment_id', assessmentId);
      await supabase.from('product_assessments').delete().eq('id', assessmentId);
    }

    // Delete variants + images by product_id (catches any extras)
    await supabase.from('product_variants').delete().eq('product_id', productId);
    await supabase.from('product_images').delete().eq('product_id', productId);
    await supabase.from('products').delete().eq('id', productId);

    log('🧹', `  ${label} test product cleaned up`);
  }

  // Verify cleanup
  if (mobileProductId) {
    const { data } = await supabase.from('products').select('id').eq('id', mobileProductId).maybeSingle();
    assert(!data, '12.01 Mobile test product fully deleted');
  }
  if (webProductId) {
    const { data } = await supabase.from('products').select('id').eq('id', webProductId).maybeSingle();
    assert(!data, '12.02 Web test product fully deleted');
  }
}

// ═══════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  Seller Mobile Add Product — Consistency & Parity Test          ║');
  console.log('║  Tests the EXACT DB operations from sellerStore.addProduct      ║');
  console.log('║  and verifies cross-platform consistency with web flow          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Phase 1: Mobile creates product (full flow)
    const created = await phase1_mobileCreateProduct();
    if (created) {
      await phase1_mobileCreateImages();
      await phase1_mobileCreateVariants();
      await phase1_mobileCreateQA();
    }

    // Phase 2: Verify product row
    await phase2_verifyProductRow();

    // Phase 3: Image CHECK constraint
    await phase3_imageConstraints();

    // Phase 4: SKU UNIQUE constraint
    await phase4_variantSKUConstraint();

    // Phase 5: QA assessment
    await phase5_qaAssessment();

    // Phase 6: Web creates product for comparison
    await phase6_webCreateProduct();

    // Phase 7: Parity comparison
    await phase7_parityComparison();

    // Phase 8: Edit product images
    await phase8_editProductImages();

    // Phase 9: Variant consistency
    await phase9_variantConsistency();

    // Phase 10: Edge cases
    await phase10_edgeCases();

    // Phase 11: Full display query
    await phase11_displayQuery();

  } catch (err) {
    console.error('\n💥 Unexpected error:', err);
  } finally {
    await cleanup();
  }

  // Summary
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('═══════════════════════════════════════════════════════════');

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
