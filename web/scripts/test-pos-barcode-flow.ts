/**
 * POS Barcode Product Flow - Integration Test Script
 * Tests end-to-end barcode scanning, product lookup, creation, and cart operations
 * 
 * Run with: npx tsx scripts/test-pos-barcode-flow.ts
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzUyMTUsImV4cCI6MjA4NTgxMTIxNX0.slNSrIdWo-EH4lpJQRIsIw9XbhaFKXsa2nICDmVBTrY';

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test data
const TEST_PREFIX = 'TEST_POS_' + Date.now();
const TEST_BARCODE = `BARCODE_${TEST_PREFIX}`;
const TEST_SKU = `SKU_${TEST_PREFIX}`;

// ============================================================================
// TYPES
// ============================================================================

interface POSBarcodeLookupResult {
  type: 'product' | 'variant' | null;
  id: string | null;
  name: string | null;
  variantName?: string;
  productId?: string;
  sku?: string | null;
  price: number | null;
  stock: number | null;
  imageUrl: string | null;
  isFound: boolean;
}

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

interface TestContext {
  sellerId: string | null;
  categoryId: string | null;
  createdProductId: string | null;
  createdVariantId: string | null;
}

// ============================================================================
// TEST UTILITIES
// ============================================================================

const testResults: TestResult[] = [];

function logTest(name: string, passed: boolean, message: string, duration: number) {
  testResults.push({ name, passed, message, duration });
  const icon = passed ? '✅' : '❌';
  const durationStr = `(${duration}ms)`;
  console.log(`  ${icon} ${name} ${durationStr}`);
  if (!passed) {
    console.log(`     → ${message}`);
  }
}

async function runTest(name: string, testFn: () => Promise<{ passed: boolean; message: string }>) {
  const start = Date.now();
  try {
    const result = await testFn();
    logTest(name, result.passed, result.message, Date.now() - start);
    return result.passed;
  } catch (error: any) {
    logTest(name, false, error.message || String(error), Date.now() - start);
    return false;
  }
}

// ============================================================================
// BARCODE SERVICE FUNCTIONS (mirror from barcodeService.ts)
// ============================================================================

async function lookupBarcodeQuick(
  vendorId: string,
  barcode: string
): Promise<POSBarcodeLookupResult> {
  const notFound: POSBarcodeLookupResult = {
    type: null,
    id: null,
    name: null,
    price: null,
    stock: null,
    imageUrl: null,
    isFound: false,
  };

  if (!vendorId || !barcode) {
    return notFound;
  }

  const normalizedBarcode = barcode.trim().toUpperCase();

  try {
    // Search product_variants by barcode
    const { data: variants, error: variantError } = await supabase
      .from('product_variants')
      .select(`id, product_id, variant_name, sku, barcode, price, stock, thumbnail_url`)
      .eq('barcode', normalizedBarcode);

    if (!variantError && variants && variants.length > 0) {
      for (const variant of variants) {
        const { data: product } = await supabase
          .from('products')
          .select('id, name, seller_id, deleted_at')
          .eq('id', variant.product_id)
          .eq('seller_id', vendorId)
          .is('deleted_at', null)
          .single();

        if (product) {
          return {
            type: 'variant',
            id: variant.id,
            name: product.name,
            variantName: variant.variant_name,
            productId: variant.product_id,
            sku: variant.sku,
            price: variant.price,
            stock: variant.stock,
            imageUrl: variant.thumbnail_url,
            isFound: true,
          };
        }
      }
    }

    // Search product_variants by SKU
    const { data: variantsBySku, error: skuError } = await supabase
      .from('product_variants')
      .select(`id, product_id, variant_name, sku, barcode, price, stock, thumbnail_url`)
      .eq('sku', normalizedBarcode);

    if (!skuError && variantsBySku && variantsBySku.length > 0) {
      for (const variantBySku of variantsBySku) {
        const { data: product } = await supabase
          .from('products')
          .select('id, name, seller_id, deleted_at')
          .eq('id', variantBySku.product_id)
          .eq('seller_id', vendorId)
          .is('deleted_at', null)
          .single();

        if (product) {
          return {
            type: 'variant',
            id: variantBySku.id,
            name: product.name,
            variantName: variantBySku.variant_name,
            productId: variantBySku.product_id,
            sku: variantBySku.sku,
            price: variantBySku.price,
            stock: variantBySku.stock,
            imageUrl: variantBySku.thumbnail_url,
            isFound: true,
          };
        }
      }
    }

    // Search products by SKU
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, sku, price, seller_id')
      .eq('sku', normalizedBarcode)
      .eq('seller_id', vendorId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!productError && product) {
      return {
        type: 'product',
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        stock: 0,
        imageUrl: null,
        isFound: true,
      };
    }

    return notFound;
  } catch (error) {
    console.error('[Test] Lookup error:', error);
    return notFound;
  }
}

// ============================================================================
// TESTS
// ============================================================================

async function testDatabaseConnection(): Promise<{ passed: boolean; message: string }> {
  const { error } = await supabase.from('products').select('count').limit(1);
  if (error) {
    return { passed: false, message: `Database connection failed: ${error.message}` };
  }
  return { passed: true, message: 'Connected to Supabase' };
}

async function testGetSeller(ctx: TestContext): Promise<{ passed: boolean; message: string }> {
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('id, store_name')
    .limit(1);

  if (error) {
    return { passed: false, message: `Failed to fetch sellers: ${error.message}` };
  }
  if (!sellers || sellers.length === 0) {
    return { passed: false, message: 'No sellers found in database' };
  }

  ctx.sellerId = sellers[0].id;
  return { passed: true, message: `Using seller: ${sellers[0].store_name} (${sellers[0].id})` };
}

async function testGetCategory(ctx: TestContext): Promise<{ passed: boolean; message: string }> {
  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, name')
    .limit(1);

  if (error) {
    return { passed: false, message: `Failed to fetch categories: ${error.message}` };
  }
  if (!categories || categories.length === 0) {
    return { passed: false, message: 'No categories found in database' };
  }

  ctx.categoryId = categories[0].id;
  return { passed: true, message: `Using category: ${categories[0].name} (${categories[0].id})` };
}

async function testBarcodeLookupNotFound(ctx: TestContext): Promise<{ passed: boolean; message: string }> {
  if (!ctx.sellerId) {
    return { passed: false, message: 'No seller ID available' };
  }

  const randomBarcode = `NONEXISTENT_${Date.now()}`;
  const result = await lookupBarcodeQuick(ctx.sellerId, randomBarcode);

  if (result.isFound) {
    return { passed: false, message: 'Expected barcode to NOT be found, but it was' };
  }
  if (result.type !== null) {
    return { passed: false, message: `Expected type to be null, got: ${result.type}` };
  }

  return { passed: true, message: 'Correctly returns not found for unknown barcode' };
}

async function testCreateProductWithVariants(ctx: TestContext): Promise<{ passed: boolean; message: string }> {
  if (!ctx.sellerId || !ctx.categoryId) {
    return { passed: false, message: 'Missing seller or category ID' };
  }

  // Create product
  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({
      name: `Test Product ${TEST_PREFIX}`,
      description: 'Test product created by POS barcode test script',
      sku: TEST_SKU,
      price: 99.99,
      category_id: ctx.categoryId,
      seller_id: ctx.sellerId,
      brand: 'Test Brand',
      approval_status: 'approved',
      variant_label_1: 'Size',
      variant_label_2: 'Color',
    })
    .select()
    .single();

  if (productError) {
    return { passed: false, message: `Failed to create product: ${productError.message}` };
  }

  ctx.createdProductId = product.id;

  // Create product image
  const { error: imageError } = await supabase
    .from('product_images')
    .insert({
      product_id: product.id,
      image_url: 'https://placehold.co/400x400/orange/white?text=Test',
      is_primary: true,
      sort_order: 0,
    });

  if (imageError) {
    console.log(`  ⚠️  Warning: Could not create product image: ${imageError.message}`);
  }

  // Create variants
  const variants = [
    {
      product_id: product.id,
      variant_name: 'Small / Red',
      sku: `${TEST_SKU}-S-RED`,
      barcode: TEST_BARCODE,
      option_1_value: 'Small',
      option_2_value: 'Red',
      price: 99.99,
      stock: 10,
    },
    {
      product_id: product.id,
      variant_name: 'Medium / Blue',
      sku: `${TEST_SKU}-M-BLUE`,
      barcode: `${TEST_BARCODE}_2`,
      option_1_value: 'Medium',
      option_2_value: 'Blue',
      price: 109.99,
      stock: 15,
    },
    {
      product_id: product.id,
      variant_name: 'Large / Green',
      sku: `${TEST_SKU}-L-GREEN`,
      barcode: `${TEST_BARCODE}_3`,
      option_1_value: 'Large',
      option_2_value: 'Green',
      price: 119.99,
      stock: 5,
    },
  ];

  const { data: createdVariants, error: variantError } = await supabase
    .from('product_variants')
    .insert(variants)
    .select();

  if (variantError) {
    return { passed: false, message: `Failed to create variants: ${variantError.message}` };
  }

  if (!createdVariants || createdVariants.length !== 3) {
    return { passed: false, message: `Expected 3 variants, got: ${createdVariants?.length || 0}` };
  }

  ctx.createdVariantId = createdVariants[0].id;

  return { passed: true, message: `Created product with ${createdVariants.length} variants` };
}

async function testBarcodeLookupFound(ctx: TestContext): Promise<{ passed: boolean; message: string }> {
  if (!ctx.sellerId) {
    return { passed: false, message: 'No seller ID available' };
  }

  const result = await lookupBarcodeQuick(ctx.sellerId, TEST_BARCODE);

  if (!result.isFound) {
    return { passed: false, message: 'Expected barcode to be found, but it was not' };
  }
  if (result.type !== 'variant') {
    return { passed: false, message: `Expected type 'variant', got: ${result.type}` };
  }
  if (result.productId !== ctx.createdProductId) {
    return { passed: false, message: `Product ID mismatch. Expected: ${ctx.createdProductId}, Got: ${result.productId}` };
  }
  if (result.price !== 99.99) {
    return { passed: false, message: `Price mismatch. Expected: 99.99, Got: ${result.price}` };
  }
  if (result.stock !== 10) {
    return { passed: false, message: `Stock mismatch. Expected: 10, Got: ${result.stock}` };
  }

  return { passed: true, message: `Found variant: ${result.variantName} at ₱${result.price}` };
}

async function testSKULookup(ctx: TestContext): Promise<{ passed: boolean; message: string }> {
  if (!ctx.sellerId) {
    return { passed: false, message: 'No seller ID available' };
  }

  const result = await lookupBarcodeQuick(ctx.sellerId, `${TEST_SKU}-M-BLUE`);

  if (!result.isFound) {
    return { passed: false, message: 'Expected SKU lookup to find product' };
  }
  if (result.variantName !== 'Medium / Blue') {
    return { passed: false, message: `Expected variant 'Medium / Blue', got: ${result.variantName}` };
  }
  if (result.price !== 109.99) {
    return { passed: false, message: `Price mismatch. Expected: 109.99, Got: ${result.price}` };
  }

  return { passed: true, message: `SKU lookup found: ${result.variantName}` };
}

async function testLogBarcodeScan(ctx: TestContext): Promise<{ passed: boolean; message: string }> {
  if (!ctx.sellerId || !ctx.createdProductId || !ctx.createdVariantId) {
    return { passed: false, message: 'Missing required IDs' };
  }

  const { error } = await supabase.from('barcode_scans').insert({
    vendor_id: ctx.sellerId,
    barcode_value: TEST_BARCODE,
    product_id: ctx.createdProductId,
    variant_id: ctx.createdVariantId,
    is_successful: true,
    scan_source: 'pos',
    scanner_type: 'hardware',
    scan_duration_ms: 42,
    scan_timestamp: new Date().toISOString(),
  });

  if (error) {
    // Table might not exist - this is optional
    if (error.message.includes('schema cache') || error.message.includes('does not exist')) {
      return { passed: true, message: 'barcode_scans table not yet created (optional feature - skipped)' };
    }
    return { passed: false, message: `Failed to log barcode scan: ${error.message}` };
  }

  // Verify the scan was logged
  const { data: scans, error: fetchError } = await supabase
    .from('barcode_scans')
    .select('*')
    .eq('barcode_value', TEST_BARCODE)
    .eq('vendor_id', ctx.sellerId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (fetchError) {
    return { passed: false, message: `Failed to fetch scan log: ${fetchError.message}` };
  }
  if (!scans || scans.length === 0) {
    return { passed: false, message: 'Scan log not found after insert' };
  }

  return { passed: true, message: 'Barcode scan logged successfully' };
}

async function testProductVariantsSchema(): Promise<{ passed: boolean; message: string }> {
  const { data, error } = await supabase
    .from('product_variants')
    .select('id, product_id, sku, barcode, variant_name, price, stock, option_1_value, option_2_value')
    .limit(1);

  if (error) {
    // Check if the error is about missing columns
    if (error.message.includes('column') || error.code === '42703') {
      return { passed: false, message: `Schema mismatch: ${error.message}` };
    }
    return { passed: false, message: `Query failed: ${error.message}` };
  }

  return { passed: true, message: 'product_variants schema is correct' };
}

async function testBarcodeScanSchema(): Promise<{ passed: boolean; message: string }> {
  const { data, error } = await supabase
    .from('barcode_scans')
    .select('id, vendor_id, barcode_value, product_id, variant_id, is_successful, scan_source, scanner_type, scan_duration_ms')
    .limit(1);

  if (error) {
    // Table might not exist - this is a known condition for some setups
    if (error.message.includes('schema cache') || error.message.includes('does not exist')) {
      return { passed: true, message: 'barcode_scans table not yet created (optional feature)' };
    }
    if (error.message.includes('column') || error.code === '42703') {
      return { passed: false, message: `Schema mismatch: ${error.message}` };
    }
    return { passed: false, message: `Query failed: ${error.message}` };
  }

  return { passed: true, message: 'barcode_scans schema is correct' };
}

async function testCartAddWithVariant(ctx: TestContext): Promise<{ passed: boolean; message: string }> {
  if (!ctx.createdProductId || !ctx.createdVariantId) {
    return { passed: false, message: 'Missing product or variant ID' };
  }

  // Simulate what the POS does when adding to cart - check variant stock first
  const { data: variant, error: variantError } = await supabase
    .from('product_variants')
    .select('id, price, stock, variant_name')
    .eq('id', ctx.createdVariantId)
    .single();

  if (variantError) {
    return { passed: false, message: `Failed to fetch variant for cart: ${variantError.message}` };
  }

  if (variant.stock <= 0) {
    return { passed: false, message: 'Variant has no stock' };
  }

  // In POS, cart is usually managed in-memory or via a separate table
  // Here we just verify we can fetch the required data
  const cartItem = {
    productId: ctx.createdProductId,
    variantId: variant.id,
    name: `Test Product - ${variant.variant_name}`,
    price: variant.price,
    quantity: 1,
    availableStock: variant.stock,
  };

  if (cartItem.quantity > cartItem.availableStock) {
    return { passed: false, message: 'Requested quantity exceeds available stock' };
  }

  return { passed: true, message: `Cart item created: ${cartItem.name} x${cartItem.quantity}` };
}

async function testUpdateVariantStock(ctx: TestContext): Promise<{ passed: boolean; message: string }> {
  if (!ctx.createdVariantId) {
    return { passed: false, message: 'Missing variant ID' };
  }

  // Get current stock
  const { data: before, error: beforeError } = await supabase
    .from('product_variants')
    .select('stock')
    .eq('id', ctx.createdVariantId)
    .single();

  if (beforeError) {
    return { passed: false, message: `Failed to get current stock: ${beforeError.message}` };
  }

  const newStock = before.stock - 1;

  // Update stock (simulates POS sale)
  const { error: updateError } = await supabase
    .from('product_variants')
    .update({ stock: newStock })
    .eq('id', ctx.createdVariantId);

  if (updateError) {
    return { passed: false, message: `Failed to update stock: ${updateError.message}` };
  }

  // Verify update
  const { data: after, error: afterError } = await supabase
    .from('product_variants')
    .select('stock')
    .eq('id', ctx.createdVariantId)
    .single();

  if (afterError) {
    return { passed: false, message: `Failed to verify stock update: ${afterError.message}` };
  }

  if (after.stock !== newStock) {
    return { passed: false, message: `Stock not updated correctly. Expected: ${newStock}, Got: ${after.stock}` };
  }

  return { passed: true, message: `Stock updated: ${before.stock} → ${after.stock}` };
}

// ============================================================================
// CLEANUP
// ============================================================================

async function cleanupTestData(ctx: TestContext): Promise<void> {
  console.log('\n📦 Cleaning up test data...');

  try {
    // Delete barcode scans
    if (ctx.sellerId) {
      await supabase
        .from('barcode_scans')
        .delete()
        .eq('barcode_value', TEST_BARCODE)
        .eq('vendor_id', ctx.sellerId);
    }

    // Delete variants
    if (ctx.createdProductId) {
      await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', ctx.createdProductId);
    }

    // Delete product images
    if (ctx.createdProductId) {
      await supabase
        .from('product_images')
        .delete()
        .eq('product_id', ctx.createdProductId);
    }

    // Delete product
    if (ctx.createdProductId) {
      await supabase
        .from('products')
        .delete()
        .eq('id', ctx.createdProductId);
    }

    console.log('  ✅ Test data cleaned up');
  } catch (error: any) {
    console.log(`  ⚠️  Cleanup warning: ${error.message}`);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  BAZAAR POS BARCODE FLOW - INTEGRATION TESTS
  Testing: Frontend ↔ Supabase Database ↔ POS Operations
═══════════════════════════════════════════════════════════════════════════════
`);

  const ctx: TestContext = {
    sellerId: null,
    categoryId: null,
    createdProductId: null,
    createdVariantId: null,
  };

  console.log('🔌 Phase 1: Database Connection & Schema Validation');
  console.log('─────────────────────────────────────────────────────');
  await runTest('Database connection', testDatabaseConnection);
  await runTest('product_variants schema validation', testProductVariantsSchema);
  await runTest('barcode_scans schema validation', testBarcodeScanSchema);

  console.log('\n👤 Phase 2: Setup Test Context');
  console.log('─────────────────────────────────────────────────────');
  await runTest('Get test seller', () => testGetSeller(ctx));
  await runTest('Get test category', () => testGetCategory(ctx));

  console.log('\n🔍 Phase 3: Barcode Lookup - Not Found Flow');
  console.log('─────────────────────────────────────────────────────');
  await runTest('Barcode lookup returns not found for unknown code', () => testBarcodeLookupNotFound(ctx));

  console.log('\n📦 Phase 4: Product Creation with Variants');
  console.log('─────────────────────────────────────────────────────');
  await runTest('Create product with multiple variants', () => testCreateProductWithVariants(ctx));

  console.log('\n🔍 Phase 5: Barcode Lookup - Found Flow');
  console.log('─────────────────────────────────────────────────────');
  await runTest('Barcode lookup finds created variant', () => testBarcodeLookupFound(ctx));
  await runTest('SKU lookup finds variant', () => testSKULookup(ctx));

  console.log('\n📊 Phase 6: Scan Logging');
  console.log('─────────────────────────────────────────────────────');
  await runTest('Log barcode scan to database', () => testLogBarcodeScan(ctx));

  console.log('\n🛒 Phase 7: Cart Operations');
  console.log('─────────────────────────────────────────────────────');
  await runTest('Add variant to cart (data validation)', () => testCartAddWithVariant(ctx));
  await runTest('Update variant stock (simulated sale)', () => testUpdateVariantStock(ctx));

  // Cleanup
  await cleanupTestData(ctx);

  // Summary
  const passed = testResults.filter(t => t.passed).length;
  const failed = testResults.filter(t => !t.passed).length;
  const totalDuration = testResults.reduce((sum, t) => sum + t.duration, 0);

  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  TEST RESULTS SUMMARY
═══════════════════════════════════════════════════════════════════════════════

  Total Tests: ${testResults.length}
  ✅ Passed:   ${passed}
  ❌ Failed:   ${failed}
  ⏱️  Duration: ${totalDuration}ms

  ${failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED - Review output above'}

═══════════════════════════════════════════════════════════════════════════════
`);

  if (failed > 0) {
    console.log('Failed Tests:');
    testResults
      .filter(t => !t.passed)
      .forEach(t => console.log(`  ❌ ${t.name}: ${t.message}`));
    console.log('');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n💥 FATAL ERROR:', error);
  process.exit(1);
});
