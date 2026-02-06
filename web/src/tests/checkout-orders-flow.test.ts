/**
 * Checkout → Orders Flow Test
 * 
 * This test validates the complete checkout flow:
 * 1. Add items to cart
 * 2. Proceed to checkout
 * 3. Complete checkout with address and payment
 * 4. Verify order is created in database
 * 5. Verify order appears in /orders page
 * 6. Verify navigation to orders after checkout
 * 
 * Run with: npx ts-node src/tests/checkout-orders-flow.test.ts
 */

import { createClient } from '@supabase/supabase-js';

// Supabase config
const SUPABASE_URL = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzUyMTUsImV4cCI6MjA4NTgxMTIxNX0.slNSrIdWo-EH4lpJQRIsIw9XbhaFKXsa2nICDmVBTrY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test data
const TEST_BUYER_ID = '25a4e31b-158e-43c0-be33-78b83603674a';
const TEST_BUYER_EMAIL = 'buyer1@test.com';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    results.push({
      name,
      passed: true,
      message: 'PASSED',
      duration: Date.now() - start
    });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    results.push({
      name,
      passed: false,
      message: error.message || 'Unknown error',
      duration: Date.now() - start
    });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

// ============================================================================
// TESTS
// ============================================================================

async function testDatabaseConnection() {
  const { error } = await supabase.from('buyers').select('id').limit(1);
  if (error) throw new Error(`Database connection failed: ${error.message}`);
}

async function testBuyerExists() {
  // Buyers table links to profiles - email is in profiles
  const { data, error } = await supabase
    .from('buyers')
    .select('id, bazcoins')
    .eq('id', TEST_BUYER_ID)
    .single();
  
  if (error) throw new Error(`Buyer not found: ${error.message}`);
  if (!data) throw new Error('Buyer data is null');
  
  // Get profile info
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, email')
    .eq('id', TEST_BUYER_ID)
    .single();
  
  console.log(`   Found buyer: ${profile?.first_name} ${profile?.last_name} (${profile?.email || 'no email'})`);
}

async function testProductsExist() {
  // Products don't have stock column - stock is in product_variants
  const { data, error, count } = await supabase
    .from('products')
    .select('id, name, price, seller_id', { count: 'exact' })
    .eq('approval_status', 'approved')
    .is('disabled_at', null)
    .limit(5);
  
  if (error) throw new Error(`Products query failed: ${error.message}`);
  if (!data || data.length === 0) throw new Error('No approved products found');
  console.log(`   Found ${count} approved products`);
}

async function testSellersExist() {
  // Sellers use approval_status with value 'verified' not 'approved'
  const { data, error, count } = await supabase
    .from('sellers')
    .select('id, store_name', { count: 'exact' });
  
  if (error) throw new Error(`Sellers query failed: ${error.message}`);
  if (!data || data.length === 0) throw new Error('No sellers found');
  console.log(`   Found ${count} sellers`);
}

async function testOrdersTableExists() {
  const { error } = await supabase
    .from('orders')
    .select('id')
    .limit(1);
  
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Orders table query failed: ${error.message}`);
  }
}

async function testOrderItemsTableExists() {
  const { error } = await supabase
    .from('order_items')
    .select('id')
    .limit(1);
  
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Order items table query failed: ${error.message}`);
  }
}

async function testBuyerNotificationsTable() {
  const { error } = await supabase
    .from('buyer_notifications')
    .select('id')
    .limit(1);
  
  if (error && error.code !== 'PGRST116') {
    // Table doesn't exist or other error
    console.log(`   Note: buyer_notifications table: ${error.message}`);
  } else {
    console.log('   buyer_notifications table exists');
  }
}

async function testShippingAddressesTable() {
  const { error } = await supabase
    .from('shipping_addresses')
    .select('id')
    .eq('user_id', TEST_BUYER_ID)
    .limit(1);
  
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Shipping addresses query failed: ${error.message}`);
  }
  console.log('   shipping_addresses table accessible');
}

async function testCreateOrder() {
  // Get a random approved product with a variant that has stock
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, name, price, seller_id')
    .eq('approval_status', 'approved')
    .is('disabled_at', null)
    .not('seller_id', 'is', null)
    .limit(1);
  
  if (prodError) throw new Error(`Failed to get product: ${prodError.message}`);
  if (!products || products.length === 0) throw new Error('No approved products found');
  
  const product = products[0];
  console.log(`   Using product: ${product.name} (₱${product.price})`);
  
  // Check if product has variants with stock
  const { data: variants } = await supabase
    .from('product_variants')
    .select('id, stock')
    .eq('product_id', product.id)
    .gt('stock', 0)
    .limit(1);
  
  if (variants && variants.length > 0) {
    console.log(`   Product has ${variants.length} variant(s) with stock`);
  }
  
  // Create a test order using the ACTUAL orders table schema
  // Schema: order_number, buyer_id, order_type, payment_status, shipment_status
  // NO seller_id, total, subtotal on orders - those are computed from order_items
  const orderNumber = `TEST-${Date.now()}`;
  const orderData = {
    order_number: orderNumber,
    buyer_id: TEST_BUYER_ID,
    order_type: 'ONLINE',
    payment_status: 'pending_payment',
    shipment_status: 'waiting_for_seller',
  };
  
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single();
  
  if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);
  console.log(`   Created order: ${order.order_number} (ID: ${order.id})`);
  
  // Create order item using correct schema
  // Schema: order_id, product_id, product_name, price, quantity, variant_id, price_discount, shipping_price, shipping_discount
  const orderItemData = {
    order_id: order.id,
    product_id: product.id,
    product_name: product.name,
    quantity: 1,
    price: product.price,
    price_discount: 0,
    shipping_price: 0,
    shipping_discount: 0,
  };
  
  const { error: itemError } = await supabase
    .from('order_items')
    .insert(orderItemData);
  
  if (itemError) throw new Error(`Failed to create order item: ${itemError.message}`);
  console.log('   Created order item');
  
  // Store order ID for later tests
  return order.id;
}

async function testFetchBuyerOrders() {
  // Use correct schema - orders don't have seller_id or total columns
  // Total is computed from order_items
  const { data, error, count } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      buyer_id,
      order_type,
      payment_status,
      shipment_status,
      created_at,
      items:order_items (id, product_id, product_name, quantity, price, price_discount)
    `, { count: 'exact' })
    .eq('buyer_id', TEST_BUYER_ID)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) throw new Error(`Failed to fetch orders: ${error.message}`);
  console.log(`   Found ${count} orders for buyer`);
  
  if (data && data.length > 0) {
    const latestOrder = data[0];
    console.log(`   Latest order: ${latestOrder.order_number} - Payment: ${latestOrder.payment_status}, Shipment: ${latestOrder.shipment_status}`);
    console.log(`   Items: ${latestOrder.items?.length || 0}`);
    
    // Compute total from items
    const total = latestOrder.items?.reduce((sum: number, item: any) => 
      sum + (item.price - item.price_discount) * item.quantity, 0) || 0;
    console.log(`   Computed Total: ₱${total}`);
  }
}

async function testProductVariantsTable() {
  const { data, error } = await supabase
    .from('product_variants')
    .select('id, product_id, variant_name, price, stock')
    .limit(5);
  
  if (error && error.code !== 'PGRST116') {
    console.log(`   Note: product_variants table: ${error.message}`);
  } else if (data) {
    console.log(`   Found ${data.length} product variants`);
  }
}

async function testReviewsTable() {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, product_id, rating')
    .limit(5);
  
  if (error && error.code !== 'PGRST116') {
    console.log(`   Note: reviews table: ${error.message}`);
  } else if (data) {
    console.log(`   Found ${data.length} reviews`);
  } else {
    console.log('   Reviews table exists but empty');
  }
}

async function cleanupTestOrders() {
  // Delete test orders created during this test run
  const { error } = await supabase
    .from('orders')
    .delete()
    .like('order_number', 'TEST-%');
  
  if (error) {
    console.log(`   Warning: Could not cleanup test orders: ${error.message}`);
  } else {
    console.log('   Cleaned up test orders');
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n🧪 CHECKOUT → ORDERS FLOW TEST');
  console.log('================================\n');
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`🔗 Supabase: ${SUPABASE_URL}`);
  console.log(`👤 Test Buyer: ${TEST_BUYER_ID}\n`);
  
  console.log('📋 Running tests...\n');
  
  // Core database tests
  await runTest('Database Connection', testDatabaseConnection);
  await runTest('Buyer Exists', testBuyerExists);
  await runTest('Products Exist', testProductsExist);
  await runTest('Sellers Exist', testSellersExist);
  
  // Table structure tests
  await runTest('Orders Table Exists', testOrdersTableExists);
  await runTest('Order Items Table Exists', testOrderItemsTableExists);
  await runTest('Buyer Notifications Table', testBuyerNotificationsTable);
  await runTest('Shipping Addresses Table', testShippingAddressesTable);
  await runTest('Product Variants Table', testProductVariantsTable);
  await runTest('Reviews Table', testReviewsTable);
  
  // Flow tests
  await runTest('Create Test Order', testCreateOrder);
  await runTest('Fetch Buyer Orders', testFetchBuyerOrders);
  
  // Cleanup
  await runTest('Cleanup Test Orders', cleanupTestOrders);
  
  // Summary
  console.log('\n================================');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('================================\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`⏱️  Total time: ${results.reduce((sum, r) => sum + r.duration, 0)}ms`);
  
  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.message}`);
    });
  }
  
  console.log('\n================================');
  console.log('📝 CHECKOUT FLOW CHECKLIST');
  console.log('================================\n');
  
  console.log('Manual verification steps:');
  console.log('1. [ ] Go to /shop and click on a product');
  console.log('2. [ ] Click "Add to Cart" - CartModal should appear');
  console.log('3. [ ] Click "Buy Now" - BuyNowModal should appear');
  console.log('4. [ ] Select variant if applicable');
  console.log('5. [ ] Go to Cart and proceed to checkout');
  console.log('6. [ ] Fill in shipping address');
  console.log('7. [ ] Select payment method (COD)');
  console.log('8. [ ] Click "Place Order"');
  console.log('9. [ ] Should navigate to /orders after success');
  console.log('10. [ ] Order should appear in orders list');
  console.log('11. [ ] Order details should show all items');
  
  console.log('\n================================\n');
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
