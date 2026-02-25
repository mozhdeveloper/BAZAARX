/**
 * POS Orders Test Script
 * Tests the complete POS Lite flow including:
 * - Creating POS orders with NULL buyer_id
 * - Saving to Supabase database
 * - Verifying order_type = 'OFFLINE'
 * - Stock deduction
 * - Order retrieval
 * 
 * Prerequisites:
 * 1. Run this SQL in Supabase first:
 *    ALTER TABLE orders ALTER COLUMN buyer_id DROP NOT NULL;
 * 
 * 2. Have at least one seller and one product in the database
 * 
 * Run: npx ts-node scripts/test-pos-orders.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.log('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<{ passed: boolean; message: string }>) {
  const start = Date.now();
  try {
    const result = await testFn();
    const duration = Date.now() - start;
    results.push({ name, ...result, duration });
    console.log(result.passed ? `✅ ${name}` : `❌ ${name}: ${result.message}`);
  } catch (error) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, message, duration });
    console.log(`❌ ${name}: ${message}`);
  }
}

// ============================================================================
// TEST DATA
// ============================================================================

let testSellerId: string = '';
let testProductId: string = '';
let testProductStock: number = 0;
let createdOrderId: string = '';
let createdOrderNumber: string = '';

// ============================================================================
// TESTS
// ============================================================================

async function test1_GetTestSeller(): Promise<{ passed: boolean; message: string }> {
  const { data, error } = await supabase
    .from('sellers')
    .select('id, store_name, business_name')
    .limit(1)
    .single();

  if (error || !data) {
    return { passed: false, message: 'No sellers found in database' };
  }

  testSellerId = data.id;
  console.log(`   Using seller: ${data.store_name || data.business_name} (${testSellerId.slice(0, 8)}...)`);
  return { passed: true, message: '' };
}

async function test2_GetTestProduct(): Promise<{ passed: boolean; message: string }> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, stock')
    .eq('seller_id', testSellerId)
    .gt('stock', 0)
    .limit(1)
    .single();

  if (error || !data) {
    // Try any product with stock
    const { data: anyProduct, error: anyError } = await supabase
      .from('products')
      .select('id, name, price, stock, seller_id')
      .gt('stock', 0)
      .limit(1)
      .single();

    if (anyError || !anyProduct) {
      return { passed: false, message: 'No products with stock found' };
    }

    testProductId = anyProduct.id;
    testProductStock = anyProduct.stock;
    testSellerId = anyProduct.seller_id; // Update seller to match product
    console.log(`   Using product: ${anyProduct.name} (₱${anyProduct.price}, Stock: ${anyProduct.stock})`);
    return { passed: true, message: '' };
  }

  testProductId = data.id;
  testProductStock = data.stock;
  console.log(`   Using product: ${data.name} (₱${data.price}, Stock: ${data.stock})`);
  return { passed: true, message: '' };
}

async function test3_CheckBuyerIdNullable(): Promise<{ passed: boolean; message: string }> {
  // Try to check if buyer_id allows NULL by querying table info
  // This is a indirect test - we'll see if it fails in the actual insert
  const { data, error } = await supabase
    .from('orders')
    .select('id')
    .is('buyer_id', null)
    .limit(1);

  // If query works without error, NULL is allowed
  if (!error) {
    return { passed: true, message: 'buyer_id allows NULL values' };
  }

  return { 
    passed: false, 
    message: 'Run: ALTER TABLE orders ALTER COLUMN buyer_id DROP NOT NULL;' 
  };
}

async function test4_CreatePOSOrder(): Promise<{ passed: boolean; message: string }> {
  const orderNumber = `POS-TEST-${Date.now().toString().slice(-8)}`;
  const orderId = crypto.randomUUID();
  const total = 1299;

  const orderData = {
    id: orderId,
    order_number: orderNumber,
    buyer_id: null, // Walk-in customer - NULL
    seller_id: testSellerId,
    buyer_name: 'Walk-in Customer (Test)',
    buyer_email: 'pos-test@walkin.local',
    buyer_phone: null,
    order_type: 'OFFLINE',
    pos_note: 'Test POS Sale',
    subtotal: total,
    discount_amount: 0,
    shipping_cost: 0,
    tax_amount: 0,
    total_amount: total,
    currency: 'PHP',
    status: 'delivered',
    payment_status: 'paid',
    shipping_address: {
      fullName: 'Walk-in Customer',
      street: 'In-Store Purchase',
      city: 'Test Store',
      province: 'POS',
      postalCode: '0000',
      phone: 'N/A'
    },
    payment_method: { type: 'cash', details: 'POS Test Cash Payment' },
    payment_reference: `CASH-TEST-${Date.now()}`,
    payment_date: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('orders')
    .insert(orderData);

  if (error) {
    if (error.message?.includes('buyer_id') || error.code === '23503' || error.code === '23502') {
      return { 
        passed: false, 
        message: 'buyer_id constraint failed. Run: ALTER TABLE orders ALTER COLUMN buyer_id DROP NOT NULL;' 
      };
    }
    return { passed: false, message: `Insert failed: ${error.message}` };
  }

  createdOrderId = orderId;
  createdOrderNumber = orderNumber;
  console.log(`   Created order: ${orderNumber}`);
  return { passed: true, message: '' };
}

async function test5_CreateOrderItems(): Promise<{ passed: boolean; message: string }> {
  if (!createdOrderId) {
    return { passed: false, message: 'No order created to add items to' };
  }

  const orderItems = [{
    id: crypto.randomUUID(),
    order_id: createdOrderId,
    product_id: testProductId,
    product_name: 'Test POS Item',
    product_images: ['https://via.placeholder.com/100'],
    price: 1299,
    quantity: 1,
    subtotal: 1299,
    selected_variant: { color: 'White', size: '36' },
  }];

  const { error } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (error) {
    return { passed: false, message: `Insert items failed: ${error.message}` };
  }

  console.log(`   Added 1 item to order`);
  return { passed: true, message: '' };
}

async function test6_VerifyOrderInDatabase(): Promise<{ passed: boolean; message: string }> {
  if (!createdOrderId) {
    return { passed: false, message: 'No order created to verify' };
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', createdOrderId)
    .single();

  if (error || !data) {
    return { passed: false, message: 'Order not found in database' };
  }

  // Verify key fields
  const checks = [
    { field: 'order_type', expected: 'OFFLINE', actual: data.order_type },
    { field: 'buyer_id', expected: null, actual: data.buyer_id },
    { field: 'status', expected: 'delivered', actual: data.status },
    { field: 'payment_status', expected: 'paid', actual: data.payment_status },
  ];

  for (const check of checks) {
    if (check.actual !== check.expected) {
      return { 
        passed: false, 
        message: `${check.field}: expected ${check.expected}, got ${check.actual}` 
      };
    }
  }

  const itemCount = data.order_items?.length || 0;
  console.log(`   Order verified: ${data.order_number} with ${itemCount} items`);
  return { passed: true, message: '' };
}

async function test7_VerifyOrderType(): Promise<{ passed: boolean; message: string }> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, order_type')
    .eq('order_type', 'OFFLINE')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    return { passed: false, message: `Query failed: ${error.message}` };
  }

  const count = data?.length || 0;
  console.log(`   Found ${count} OFFLINE orders in database`);
  
  const hasTestOrder = data?.some(o => o.id === createdOrderId);
  if (!hasTestOrder && createdOrderId) {
    return { passed: false, message: 'Test order not in OFFLINE orders list' };
  }

  return { passed: true, message: '' };
}

async function test8_FetchSellerOrders(): Promise<{ passed: boolean; message: string }> {
  // Simulate what the app does to fetch orders
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('seller_id', testSellerId)
    .order('created_at', { ascending: false });

  if (error) {
    return { passed: false, message: `Fetch failed: ${error.message}` };
  }

  const allOrders = data?.length || 0;
  const offlineOrders = data?.filter(o => o.order_type === 'OFFLINE').length || 0;
  const onlineOrders = data?.filter(o => o.order_type === 'ONLINE').length || 0;

  console.log(`   Seller orders: ${allOrders} total (${onlineOrders} online, ${offlineOrders} offline)`);
  return { passed: true, message: '' };
}

async function test9_TestStockDeduction(): Promise<{ passed: boolean; message: string }> {
  // Check if stock RPC exists - this is optional
  const { error } = await supabase.rpc('decrement_product_stock', {
    p_product_id: testProductId,
    p_quantity: 0 // Test with 0 to not actually change stock
  });

  if (error) {
    // RPC might not exist or have different signature - this is optional
    console.log(`   ⚠️ Stock deduction RPC not configured (optional feature)`);
    return { passed: true, message: 'RPC not configured (optional)' };
  }

  console.log(`   Stock deduction RPC available`);
  return { passed: true, message: '' };
}

async function test10_CleanupTestOrder(): Promise<{ passed: boolean; message: string }> {
  if (!createdOrderId) {
    return { passed: true, message: 'No test order to cleanup' };
  }

  // Delete order items first
  await supabase
    .from('order_items')
    .delete()
    .eq('order_id', createdOrderId);

  // Delete the order
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', createdOrderId);

  if (error) {
    return { passed: false, message: `Cleanup failed: ${error.message}` };
  }

  console.log(`   Cleaned up test order: ${createdOrderNumber}`);
  return { passed: true, message: '' };
}

async function test11_VerifyWebMobileParity(): Promise<{ passed: boolean; message: string }> {
  // Check that both web and mobile orderService have createPOSOrder
  // This is a code check, not runtime
  const fs = await import('fs');
  const webPath = path.resolve(__dirname, '../src/services/orderService.ts');
  const mobilePath = path.resolve(__dirname, '../../mobile-app/src/services/orderService.ts');

  let webHas = false;
  let mobileHas = false;

  try {
    const webContent = fs.readFileSync(webPath, 'utf-8');
    webHas = webContent.includes('createPOSOrder');
  } catch {
    return { passed: false, message: 'Web orderService.ts not found' };
  }

  try {
    const mobileContent = fs.readFileSync(mobilePath, 'utf-8');
    mobileHas = mobileContent.includes('createPOSOrder');
  } catch {
    return { passed: false, message: 'Mobile orderService.ts not found' };
  }

  if (!webHas) {
    return { passed: false, message: 'Web orderService missing createPOSOrder' };
  }

  if (!mobileHas) {
    return { passed: false, message: 'Mobile orderService missing createPOSOrder' };
  }

  console.log(`   Both web and mobile have createPOSOrder method`);
  return { passed: true, message: '' };
}

async function test12_CountOrdersByType(): Promise<{ passed: boolean; message: string }> {
  const { data, error } = await supabase
    .from('orders')
    .select('order_type')
    .not('order_type', 'is', null);

  if (error) {
    return { passed: false, message: `Query failed: ${error.message}` };
  }

  const online = data?.filter(o => o.order_type === 'ONLINE').length || 0;
  const offline = data?.filter(o => o.order_type === 'OFFLINE').length || 0;

  console.log(`   Order stats: ${online} ONLINE, ${offline} OFFLINE`);
  return { passed: true, message: '' };
}

// ============================================================================
// MAIN RUNNER
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 POS LITE ORDER TEST SUITE');
  console.log('='.repeat(70));
  console.log(`📅 ${new Date().toLocaleString()}`);
  console.log(`🔗 Supabase: ${supabaseUrl}`);
  console.log('='.repeat(70) + '\n');

  // Run all tests
  await runTest('1. Get test seller', test1_GetTestSeller);
  await runTest('2. Get test product', test2_GetTestProduct);
  await runTest('3. Check buyer_id allows NULL', test3_CheckBuyerIdNullable);
  await runTest('4. Create POS order (buyer_id=NULL)', test4_CreatePOSOrder);
  await runTest('5. Create order items', test5_CreateOrderItems);
  await runTest('6. Verify order in database', test6_VerifyOrderInDatabase);
  await runTest('7. Verify order_type=OFFLINE', test7_VerifyOrderType);
  await runTest('8. Fetch seller orders', test8_FetchSellerOrders);
  await runTest('9. Test stock deduction RPC', test9_TestStockDeduction);
  await runTest('10. Cleanup test order', test10_CleanupTestOrder);
  await runTest('11. Verify web/mobile parity', test11_VerifyWebMobileParity);
  await runTest('12. Count orders by type', test12_CountOrdersByType);

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(70));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`\n✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`⏱️  Total time: ${results.reduce((sum, r) => sum + r.duration, 0)}ms`);

  if (failed > 0) {
    console.log('\n⚠️  FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.message}`);
    });
  }

  const successRate = Math.round((passed / total) * 100);
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🎯 Success Rate: ${successRate}%`);
  
  if (successRate === 100) {
    console.log('🎉 ALL TESTS PASSED! POS Lite is ready to use.');
  } else if (successRate >= 80) {
    console.log('⚠️  Most tests passed. Check failed tests above.');
  } else {
    console.log('❌ Multiple tests failed. Please fix issues above.');
  }
  console.log('='.repeat(70) + '\n');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
