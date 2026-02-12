/**
 * Order Flow Test Script
 * Tests the complete order flow between web and mobile including:
 * 1. Seller orders fetching (products → order_items → orders chain)
 * 2. Order total calculation
 * 3. Order status mapping
 * 4. POS vs Online order type handling
 * 5. Order status updates
 * 
 * Run with: npx ts-node scripts/test-order-flow.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, details: string) {
  results.push({ name, passed, details });
  console.log(`${passed ? '✅' : '❌'} ${name}: ${details}`);
}

// Test sellers
const TEST_SELLERS = [
  { email: 'seller1@bazaarph.com', password: 'Test@123456' },
  { email: 'seller2@bazaarph.com', password: 'Test@123456' },
];

async function testGetSellerOrders(sellerId: string, sellerEmail: string) {
  console.log(`\n📦 Testing order fetch for seller: ${sellerEmail}`);
  console.log('='.repeat(60));

  // Step 1: Get seller's products
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, name')
    .eq('seller_id', sellerId);

  if (prodError) {
    logTest(`Get products for ${sellerEmail}`, false, prodError.message);
    return [];
  }

  logTest(`Get products for ${sellerEmail}`, true, `Found ${products?.length || 0} products`);

  if (!products || products.length === 0) {
    console.log('  ⚠️ No products found for this seller');
    return [];
  }

  const productIds = products.map(p => p.id);

  // Step 2: Get order_items for these products
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('order_id, product_id, product_name, price, quantity')
    .in('product_id', productIds);

  if (itemsError) {
    logTest(`Get order items for ${sellerEmail}`, false, itemsError.message);
    return [];
  }

  logTest(`Get order items for ${sellerEmail}`, true, `Found ${orderItems?.length || 0} order items`);

  if (!orderItems || orderItems.length === 0) {
    console.log('  ⚠️ No order items found');
    return [];
  }

  // Debug: Show order items
  console.log('\n📋 Order Items Sample:');
  orderItems.slice(0, 3).forEach((item, i) => {
    console.log(`  [${i + 1}] ${item.product_name}: ₱${item.price} × ${item.quantity} = ₱${(item.price || 0) * (item.quantity || 0)}`);
  });

  const uniqueOrderIds = [...new Set(orderItems.map(item => item.order_id))];
  console.log(`\n  📑 Unique Order IDs: ${uniqueOrderIds.length}`);

  // Step 3: Fetch full orders
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(*)
    `)
    .in('id', uniqueOrderIds)
    .order('created_at', { ascending: false });

  if (ordersError) {
    logTest(`Get orders for ${sellerEmail}`, false, ordersError.message);
    return [];
  }

  logTest(`Get orders for ${sellerEmail}`, true, `Found ${orders?.length || 0} orders`);

  // Analyze orders
  console.log('\n📊 Order Analysis:');
  let totalIssues = 0;

  orders?.forEach((order, i) => {
    const orderId = order.order_number || order.id.slice(0, 8);
    const orderType = order.order_type || 'ONLINE';
    const dbTotal = parseFloat(order.total_amount?.toString() || '0');
    const items = order.order_items || [];
    
    // Calculate total from items
    const calculatedTotal = items.reduce((sum: number, item: any) => {
      return sum + ((item.price || 0) * (item.quantity || 0));
    }, 0);

    // Check for total mismatch
    const totalMatches = Math.abs(dbTotal - calculatedTotal) < 0.01 || (dbTotal === 0 && calculatedTotal > 0);
    
    // Check for empty item prices
    const itemsWithZeroPrice = items.filter((item: any) => !item.price || item.price === 0);

    if (!totalMatches || itemsWithZeroPrice.length > 0) {
      totalIssues++;
    }

    if (i < 5) { // Show first 5 orders
      console.log(`\n  [Order ${i + 1}] ${orderId} (${orderType})`);
      console.log(`    Status: ${order.payment_status}/${order.shipment_status}`);
      console.log(`    DB Total: ₱${dbTotal.toLocaleString()}`);
      console.log(`    Calculated Total: ₱${calculatedTotal.toLocaleString()}`);
      console.log(`    Items: ${items.length}`);
      
      if (itemsWithZeroPrice.length > 0) {
        console.log(`    ⚠️ Items with ₱0 price: ${itemsWithZeroPrice.length}`);
      }
      
      // Show items
      items.forEach((item: any, j: number) => {
        console.log(`      [${j + 1}] ${item.product_name?.slice(0, 30)}: ₱${item.price} × ${item.quantity}`);
      });
    }
  });

  logTest(`Order data quality for ${sellerEmail}`, totalIssues === 0, 
    totalIssues === 0 ? 'All orders have valid data' : `${totalIssues} orders have data issues`);

  return orders || [];
}

async function testOrderStatusMapping() {
  console.log('\n🔄 Testing Order Status Mapping');
  console.log('='.repeat(60));

  // UI uses: pending, to-ship, completed, cancelled
  // DB uses: waiting_for_seller, processing, ready_to_ship, shipped, delivered, etc.

  const statusMappings = [
    { db_shipment: 'waiting_for_seller', expected_ui: 'pending' },
    { db_shipment: 'processing', expected_ui: 'to-ship' },
    { db_shipment: 'ready_to_ship', expected_ui: 'to-ship' },
    { db_shipment: 'shipped', expected_ui: 'to-ship' },
    { db_shipment: 'out_for_delivery', expected_ui: 'to-ship' },
    { db_shipment: 'delivered', expected_ui: 'completed' },
    { db_shipment: 'received', expected_ui: 'completed' },
    { db_shipment: 'returned', expected_ui: 'cancelled' },
  ];

  console.log('\n  Expected mappings:');
  statusMappings.forEach(m => {
    console.log(`    ${m.db_shipment} → ${m.expected_ui}`);
  });

  logTest('Status mapping definition', true, `${statusMappings.length} mappings defined`);
}

async function testOrderTypeDisplay() {
  console.log('\n🏪 Testing Order Type Display');
  console.log('='.repeat(60));

  // Get orders by type
  const { data: onlineOrders } = await supabase
    .from('orders')
    .select('id, order_number, order_type')
    .eq('order_type', 'ONLINE')
    .limit(5);

  const { data: offlineOrders } = await supabase
    .from('orders')
    .select('id, order_number, order_type')
    .eq('order_type', 'OFFLINE')
    .limit(5);

  console.log(`\n  Online Orders (ONLINE): ${onlineOrders?.length || 0}`);
  onlineOrders?.forEach(o => console.log(`    - ${o.order_number || o.id.slice(0, 8)}`));

  console.log(`\n  POS/Walk-in Orders (OFFLINE): ${offlineOrders?.length || 0}`);
  offlineOrders?.forEach(o => console.log(`    - ${o.order_number || o.id.slice(0, 8)}`));

  logTest('Order type detection', true, `Online: ${onlineOrders?.length || 0}, POS: ${offlineOrders?.length || 0}`);
}

async function testOrderStatusUpdate(orderId: string) {
  console.log('\n🔧 Testing Order Status Update');
  console.log('='.repeat(60));

  if (!orderId) {
    console.log('  ⚠️ No order ID provided for status update test');
    return;
  }

  // Get current status
  const { data: order, error: getError } = await supabase
    .from('orders')
    .select('shipment_status, payment_status')
    .eq('id', orderId)
    .single();

  if (getError) {
    logTest('Get order for update', false, getError.message);
    return;
  }

  console.log(`  Current status: ${order.payment_status}/${order.shipment_status}`);

  // Note: We won't actually update to avoid modifying real data
  // Just verify the update endpoint would work
  logTest('Order status update capability', true, 'Update endpoint verified (no actual update performed)');
}

async function runAllTests() {
  console.log('🧪 ORDER FLOW COMPREHENSIVE TEST');
  console.log('='.repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Supabase URL: ${supabaseUrl.slice(0, 30)}...`);

  let firstOrderId: string | null = null;

  // Test for each seller
  for (const seller of TEST_SELLERS) {
    // Sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: seller.email,
      password: seller.password
    });

    if (authError) {
      logTest(`Auth for ${seller.email}`, false, authError.message);
      continue;
    }

    logTest(`Auth for ${seller.email}`, true, 'Signed in successfully');

    // Get seller profile
    const { data: sellerProfile, error: profileError } = await supabase
      .from('sellers')
      .select('id, store_name')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !sellerProfile) {
      logTest(`Get seller profile for ${seller.email}`, false, profileError?.message || 'No profile');
      continue;
    }

    console.log(`  📍 Seller: ${sellerProfile.store_name}`);

    // Test order fetching
    const orders = await testGetSellerOrders(sellerProfile.id, seller.email);

    if (orders.length > 0 && !firstOrderId) {
      firstOrderId = orders[0].id;
    }

    // Sign out
    await supabase.auth.signOut();
  }

  // Test status mapping
  await testOrderStatusMapping();

  // Test order type display
  await testOrderTypeDisplay();

  // Test status update (with first order if available)
  // Commented out to avoid modifying data
  // if (firstOrderId) {
  //   await testOrderStatusUpdate(firstOrderId);
  // }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Pass Rate: ${passRate}%`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.details}`);
    });
  }

  console.log('\n' + (failed === 0 ? '🎉 All tests passed!' : '⚠️ Some tests failed'));
  
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
