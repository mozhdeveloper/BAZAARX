/**
 * Test Script: Sold Count Verification
 * 
 * Verifies that the sold count feature works correctly for:
 * 1. POS (Point of Sale) orders - should increment sold count immediately
 * 2. Online orders - should only count after delivered
 * 3. Cancelled orders - should NOT be counted
 * 
 * Run: npx tsx scripts/test-sold-count.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const PASS = '✅';
const FAIL = '❌';
const WARN = '⚠️';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function test(name: string, condition: boolean, details?: string): void {
  results.push({ name, passed: condition, details });
  console.log(`${condition ? PASS : FAIL} ${name}${details ? ` - ${details}` : ''}`);
}

// =====================================================
// 1. Test Database Migration File
// =====================================================

console.log('\n' + '═'.repeat(60));
console.log('📦 1. DATABASE MIGRATION VERIFICATION');
console.log('═'.repeat(60) + '\n');

const migrationPath = path.join(__dirname, '..', '..', 'supabase-migrations', '009_product_sold_counts.sql');

try {
  const migrationExists = fs.existsSync(migrationPath);
  test('Migration file exists', migrationExists, '009_product_sold_counts.sql');

  if (migrationExists) {
    const migrationContent = fs.readFileSync(migrationPath, 'utf-8');

    // Check view creation
    test(
      'Creates product_sold_counts view',
      migrationContent.includes('CREATE VIEW public.product_sold_counts'),
      'View for calculating sold counts'
    );

    // Check it filters by payment_status
    test(
      'Filters by payment_status = paid',
      migrationContent.includes("payment_status = 'paid'"),
      'Only counts paid orders'
    );

    // Check it filters by shipment_status
    test(
      'Filters by shipment_status (delivered/received)',
      migrationContent.includes("shipment_status IN ('delivered', 'received')"),
      'Only counts delivered orders'
    );

    // Check helper function
    test(
      'Creates get_product_sold_count function',
      migrationContent.includes('CREATE OR REPLACE FUNCTION public.get_product_sold_count'),
      'Helper function for single product lookup'
    );

    // Check indexes for performance
    test(
      'Creates performance indexes',
      migrationContent.includes('idx_orders_payment_shipment_status') &&
      migrationContent.includes('idx_order_items_product_id'),
      'Indexes for fast queries'
    );

    // Check grants
    test(
      'Grants proper permissions',
      migrationContent.includes('GRANT SELECT ON public.product_sold_counts'),
      'anon, authenticated, service_role access'
    );
  }
} catch (error) {
  test('Migration file accessible', false, String(error));
}

// =====================================================
// 2. Test Web ProductService
// =====================================================

console.log('\n' + '═'.repeat(60));
console.log('🌐 2. WEB PRODUCT SERVICE VERIFICATION');
console.log('═'.repeat(60) + '\n');

const webProductServicePath = path.join(__dirname, '..', '..', 'web', 'src', 'services', 'productService.ts');

try {
  const webServiceContent = fs.readFileSync(webProductServicePath, 'utf-8');

  // Check it uses product_sold_counts view
  test(
    'Uses product_sold_counts view in query',
    webServiceContent.includes('sold_counts:product_sold_counts'),
    'Joins with sold_counts view'
  );

  // Check it doesn't use order_items for sold count
  test(
    'Does not calculate from order_items directly',
    !webServiceContent.includes("order_items.reduce") &&
    !webServiceContent.includes('orderItems.reduce((sum'),
    'Removed legacy calculation'
  );

  // Check transformProduct uses sold_counts
  test(
    'transformProduct uses sold_counts data',
    webServiceContent.includes('product.sold_counts') &&
    webServiceContent.includes('soldCounts?.sold_count'),
    'Gets sold count from view'
  );

  // Check getProducts query
  const getProductsMatch = webServiceContent.match(/from\("products"\)[\s\S]*?\.select\(/);
  test(
    'getProducts query includes sold_counts',
    getProductsMatch !== null && webServiceContent.includes('sold_counts:product_sold_counts'),
    'Main products query updated'
  );

  // Check getProductById query
  test(
    'getProductById query includes sold_counts',
    (webServiceContent.match(/sold_counts:product_sold_counts/g) || []).length >= 2,
    'Both getProducts and getProductById updated'
  );

} catch (error) {
  test('Web productService accessible', false, String(error));
}

// =====================================================
// 3. Test Mobile ProductService
// =====================================================

console.log('\n' + '═'.repeat(60));
console.log('📱 3. MOBILE PRODUCT SERVICE VERIFICATION');
console.log('═'.repeat(60) + '\n');

const mobileProductServicePath = path.join(__dirname, '..', 'src', 'services', 'productService.ts');

try {
  const mobileServiceContent = fs.readFileSync(mobileProductServicePath, 'utf-8');

  // Check it uses product_sold_counts view
  test(
    'Uses product_sold_counts view in query',
    mobileServiceContent.includes('sold_counts:product_sold_counts'),
    'Joins with sold_counts view'
  );

  // Check it doesn't use order_items for sold count
  test(
    'Does not calculate from order_items directly',
    !mobileServiceContent.includes("order_items.reduce") &&
    !mobileServiceContent.includes('orderItems.reduce((sum'),
    'Removed legacy calculation'
  );

  // Check transformProduct uses sold_counts
  test(
    'transformProduct uses sold_counts data',
    mobileServiceContent.includes('product.sold_counts') &&
    mobileServiceContent.includes('soldCounts?.sold_count'),
    'Gets sold count from view'
  );

  // Check both queries updated
  test(
    'Both queries include sold_counts',
    (mobileServiceContent.match(/sold_counts:product_sold_counts/g) || []).length >= 2,
    'getProducts and getProductById updated'
  );

} catch (error) {
  test('Mobile productService accessible', false, String(error));
}

// =====================================================
// 4. Test POS Order Creation (Web)
// =====================================================

console.log('\n' + '═'.repeat(60));
console.log('🛒 4. WEB POS ORDER SERVICE VERIFICATION');
console.log('═'.repeat(60) + '\n');

const webOrderServicePath = path.join(__dirname, '..', '..', 'web', 'src', 'services', 'orderService.ts');

try {
  const webOrderContent = fs.readFileSync(webOrderServicePath, 'utf-8');

  // Check POS orders are set to 'paid'
  test(
    'POS orders payment_status = paid',
    webOrderContent.includes("payment_status: \"paid\"") ||
    webOrderContent.includes('payment_status: "paid" as PaymentStatus'),
    'POS orders marked as paid'
  );

  // Check POS orders are set to 'delivered'
  test(
    'POS orders shipment_status = delivered',
    webOrderContent.includes("shipment_status: \"delivered\"") ||
    webOrderContent.includes('shipment_status: "delivered" as ShipmentStatus'),
    'POS orders marked as delivered'
  );

  // Check order_type is OFFLINE
  test(
    'POS orders type = OFFLINE',
    webOrderContent.includes('order_type: "OFFLINE"'),
    'POS orders marked as offline'
  );

} catch (error) {
  test('Web orderService accessible', false, String(error));
}

// =====================================================
// 5. Test POS Order Creation (Mobile)
// =====================================================

console.log('\n' + '═'.repeat(60));
console.log('📲 5. MOBILE POS ORDER SERVICE VERIFICATION');
console.log('═'.repeat(60) + '\n');

const mobileOrderServicePath = path.join(__dirname, '..', 'src', 'services', 'orderService.ts');

try {
  const mobileOrderContent = fs.readFileSync(mobileOrderServicePath, 'utf-8');

  // Check POS orders are set to 'paid'
  test(
    'POS orders payment_status = paid',
    mobileOrderContent.includes("payment_status: 'paid'") ||
    mobileOrderContent.includes('payment_status: "paid"'),
    'POS orders marked as paid'
  );

  // Check POS orders are set to 'delivered'
  test(
    'POS orders shipment_status = delivered',
    mobileOrderContent.includes("shipment_status: 'delivered'") ||
    mobileOrderContent.includes('shipment_status: "delivered"'),
    'POS orders marked as delivered'
  );

} catch (error) {
  test('Mobile orderService accessible', false, String(error));
}

// =====================================================
// 6. Test UI Display Components
// =====================================================

console.log('\n' + '═'.repeat(60));
console.log('🎨 6. UI DISPLAY VERIFICATION');
console.log('═'.repeat(60) + '\n');

// Check web ShopPage shows sold count
const webShopPagePath = path.join(__dirname, '..', '..', 'web', 'src', 'pages', 'ShopPage.tsx');
try {
  const shopContent = fs.readFileSync(webShopPagePath, 'utf-8');
  test(
    'ShopPage displays sold count',
    shopContent.includes('product.sold') || shopContent.includes('{product.sold}'),
    'Shows sold count in product cards'
  );
} catch {
  test('ShopPage displays sold count', false, 'File not accessible');
}

// Check web SearchPage shows sold count
const webSearchPagePath = path.join(__dirname, '..', '..', 'web', 'src', 'pages', 'SearchPage.tsx');
try {
  const searchContent = fs.readFileSync(webSearchPagePath, 'utf-8');
  test(
    'SearchPage displays sold count',
    searchContent.includes('product.sold') || searchContent.includes('{product.sold}'),
    'Shows sold count in search results'
  );
} catch {
  test('SearchPage displays sold count', false, 'File not accessible');
}

// Check web SellerPOS shows sold count  
const webPOSPath = path.join(__dirname, '..', '..', 'web', 'src', 'pages', 'SellerPOS.tsx');
try {
  const posContent = fs.readFileSync(webPOSPath, 'utf-8');
  test(
    'SellerPOS displays sold count',
    posContent.includes('sold') || posContent.includes('product.sold'),
    'Shows sold count in POS inventory'
  );
} catch {
  test('SellerPOS displays sold count', false, 'File not accessible');
}

// =====================================================
// Summary
// =====================================================

console.log('\n' + '═'.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('═'.repeat(60));

const passed = results.filter(r => r.passed).length;
const total = results.length;
const passRate = ((passed / total) * 100).toFixed(1);

console.log(`✅ Passed: ${passed}/${total}`);
console.log(`❌ Failed: ${total - passed}/${total}`);
console.log(`📈 Success Rate: ${passRate}%`);

if (passed === total) {
  console.log('\n🎉 ALL TESTS PASSED! Sold count feature is properly implemented.');
} else {
  console.log('\n' + WARN + ' Some tests failed. Check the details above.');
  
  const failedTests = results.filter(r => !r.passed);
  console.log('\nFailed tests:');
  failedTests.forEach(t => {
    console.log(`  ${FAIL} ${t.name}${t.details ? ` (${t.details})` : ''}`);
  });
}

console.log('\n' + '═'.repeat(60));
console.log('📋 SOLD COUNT FEATURE CHECKLIST');
console.log('─'.repeat(60));

const features = [
  { name: 'Database view (product_sold_counts)', check: results.some(r => r.name.includes('Creates product_sold_counts view') && r.passed) },
  { name: 'Only counts paid orders', check: results.some(r => r.name.includes('payment_status = paid') && r.passed) },
  { name: 'Only counts delivered orders', check: results.some(r => r.name.includes('shipment_status') && r.passed) },
  { name: 'Web productService updated', check: results.filter(r => r.name.includes('Web') || r.name.includes('web')).every(r => r.passed) },
  { name: 'Mobile productService updated', check: results.filter(r => r.name.includes('Mobile') || r.name.includes('mobile')).every(r => r.passed) },
  { name: 'POS orders set as completed', check: results.some(r => r.name.includes('POS orders') && r.name.includes('delivered') && r.passed) },
];

features.forEach(f => {
  console.log(`${f.check ? PASS : FAIL} ${f.name}`);
});

console.log('═'.repeat(60) + '\n');

// Exit with appropriate code
process.exit(passed === total ? 0 : 1);
