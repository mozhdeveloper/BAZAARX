/**
 * Web CRUD Operations Test Script
 * Tests Create, Read, Update, Delete operations for all major entities
 * Run with: npx tsx scripts/test-crud-operations.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, message: string, details?: any) {
  results.push({ name, passed, message, details });
  const icon = passed ? '✅' : '❌';
  console.log(`   ${icon} ${name}: ${message}`);
  if (details && !passed) {
    console.log(`      Details:`, details);
  }
}

// ============================================================
// PRODUCTS CRUD TESTS
// ============================================================
async function testProductsCRUD() {
  console.log('\n📦 Testing Products CRUD...');
  
  // READ - Get all products
  const { data: products, error: readError } = await supabase
    .from('products')
    .select('*')
    .limit(5);
  
  logTest('Products READ', !readError && products !== null, 
    readError ? readError.message : `Found ${products?.length || 0} products`);

  // READ - Get single product with filters
  const { data: filteredProducts, error: filterError } = await supabase
    .from('products')
    .select('id, name, price, stock, approval_status')
    .eq('approval_status', 'approved')
    .limit(3);
  
  logTest('Products READ (filtered)', !filterError && filteredProducts !== null,
    filterError ? filterError.message : `Found ${filteredProducts?.length || 0} approved products`);

  // CREATE - Test product (will be deleted after)
  const testProduct = {
    name: 'TEST_PRODUCT_' + Date.now(),
    description: 'Test product for CRUD testing',
    price: 999,
    stock: 10,
    category: 'Electronics',
    images: ['https://example.com/test.jpg'],
    seller_id: null, // Will use first seller
    approval_status: 'pending',
    colors: ['Red', 'Blue'],
    sizes: ['S', 'M', 'L']
  };

  // Get a seller ID first
  const { data: sellers } = await supabase
    .from('sellers')
    .select('id')
    .limit(1)
    .single();
  
  if (sellers?.id) {
    testProduct.seller_id = sellers.id;
  }

  const { data: createdProduct, error: createError } = await supabase
    .from('products')
    .insert(testProduct)
    .select()
    .single();

  logTest('Products CREATE', !createError && createdProduct !== null,
    createError ? createError.message : `Created product: ${createdProduct?.id}`);

  let testProductId = createdProduct?.id;

  // UPDATE - Update the test product
  if (testProductId) {
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update({ 
        price: 1299, 
        stock: 15,
        name: 'TEST_PRODUCT_UPDATED_' + Date.now()
      })
      .eq('id', testProductId)
      .select()
      .single();

    logTest('Products UPDATE', !updateError && updatedProduct?.price === 1299,
      updateError ? updateError.message : `Updated price to ${updatedProduct?.price}`);

    // DELETE - Delete the test product
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', testProductId);

    logTest('Products DELETE', !deleteError,
      deleteError ? deleteError.message : 'Test product deleted successfully');
  }
}

// ============================================================
// ORDERS CRUD TESTS
// ============================================================
async function testOrdersCRUD() {
  console.log('\n🛒 Testing Orders CRUD...');
  
  // READ - Get all orders
  const { data: orders, error: readError } = await supabase
    .from('orders')
    .select('*')
    .limit(5);
  
  logTest('Orders READ', !readError && orders !== null,
    readError ? readError.message : `Found ${orders?.length || 0} orders`);

  // READ - Get orders with items
  const { data: ordersWithItems, error: joinError } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      total_amount,
      order_items (
        id,
        product_id,
        quantity,
        price
      )
    `)
    .limit(3);

  logTest('Orders READ (with items)', !joinError && ordersWithItems !== null,
    joinError ? joinError.message : `Found ${ordersWithItems?.length || 0} orders with items`);

  // Get a seller and buyer for test order
  const { data: seller } = await supabase.from('sellers').select('id').limit(1).single();
  const { data: buyer } = await supabase.from('buyers').select('id').limit(1).single();

  // CREATE - Test order
  const testOrder = {
    order_number: 'TEST-ORD-' + Date.now(),
    buyer_id: buyer?.id || null,
    seller_id: seller?.id,
    buyer_name: 'Test Buyer',
    buyer_email: 'test@example.com',
    status: 'pending_payment',
    subtotal: 1500,
    total_amount: 1500,
    shipping_address: { city: 'Test City', street: '123 Test St', zip: '1234' },
    payment_method: 'cod',
    order_type: 'ONLINE'
  };

  const { data: createdOrder, error: createError } = await supabase
    .from('orders')
    .insert(testOrder)
    .select()
    .single();

  logTest('Orders CREATE', !createError && createdOrder !== null,
    createError ? createError.message : `Created order: ${createdOrder?.id}`);

  let testOrderId = createdOrder?.id;

  // UPDATE - Update order status
  if (testOrderId) {
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', testOrderId)
      .select()
      .single();

    logTest('Orders UPDATE (status)', !updateError && updatedOrder?.status === 'processing',
      updateError ? updateError.message : `Updated status to ${updatedOrder?.status}`);

    // DELETE - Delete test order
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', testOrderId);

    logTest('Orders DELETE', !deleteError,
      deleteError ? deleteError.message : 'Test order deleted successfully');
  }
}

// ============================================================
// SELLERS CRUD TESTS
// ============================================================
async function testSellersCRUD() {
  console.log('\n🏪 Testing Sellers CRUD...');
  
  // READ - Get all sellers
  const { data: sellers, error: readError } = await supabase
    .from('sellers')
    .select('id, store_name, business_name, approval_status')
    .limit(5);
  
  logTest('Sellers READ', !readError && sellers !== null,
    readError ? readError.message : `Found ${sellers?.length || 0} sellers`);

  // READ - Get approved sellers
  const { data: approvedSellers, error: filterError } = await supabase
    .from('sellers')
    .select('id, store_name, approval_status')
    .eq('approval_status', 'approved')
    .limit(3);

  logTest('Sellers READ (approved only)', !filterError && approvedSellers !== null,
    filterError ? filterError.message : `Found ${approvedSellers?.length || 0} approved sellers`);

  // Note: We won't create/delete sellers as they require auth
  // Instead, we test UPDATE on an existing seller
  if (sellers && sellers.length > 0) {
    const testSellerId = sellers[0].id;

    // UPDATE - Update seller (test with store_description)
    const { data: updatedSeller, error: updateError } = await supabase
      .from('sellers')
      .update({ 
        store_description: 'Updated description for CRUD test - ' + Date.now()
      })
      .eq('id', testSellerId)
      .select('id, store_description')
      .single();

    logTest('Sellers UPDATE', !updateError && updatedSeller !== null,
      updateError ? updateError.message : 'Seller description updated');
  }
}

// ============================================================
// BUYERS CRUD TESTS
// ============================================================
async function testBuyersCRUD() {
  console.log('\n👤 Testing Buyers CRUD...');
  
  // READ - Get all buyers
  const { data: buyers, error: readError } = await supabase
    .from('buyers')
    .select('id, bazcoins, created_at')
    .limit(5);
  
  logTest('Buyers READ', !readError && buyers !== null,
    readError ? readError.message : `Found ${buyers?.length || 0} buyers`);

  // READ - Get buyer with bazcoins
  const { data: buyerWithCoins, error: filterError } = await supabase
    .from('buyers')
    .select('id, bazcoins')
    .gt('bazcoins', 0)
    .limit(3);

  logTest('Buyers READ (with bazcoins)', !filterError,
    filterError ? filterError.message : `Found ${buyerWithCoins?.length || 0} buyers with bazcoins`);

  // UPDATE - Update buyer bazcoins (on existing buyer)
  if (buyers && buyers.length > 0) {
    const testBuyerId = buyers[0].id;
    const originalCoins = buyers[0].bazcoins || 0;

    const { data: updatedBuyer, error: updateError } = await supabase
      .from('buyers')
      .update({ 
        bazcoins: originalCoins + 10
      })
      .eq('id', testBuyerId)
      .select('id, bazcoins')
      .single();

    logTest('Buyers UPDATE (bazcoins)', !updateError,
      updateError ? updateError.message : `Updated bazcoins: ${originalCoins} → ${updatedBuyer?.bazcoins}`);

    // Revert the change
    await supabase.from('buyers').update({ bazcoins: originalCoins }).eq('id', testBuyerId);
  }
}

// ============================================================
// CART CRUD TESTS
// ============================================================
async function testCartCRUD() {
  console.log('\n🛍️ Testing Cart CRUD...');
  
  // READ - Get carts
  const { data: carts, error: readError } = await supabase
    .from('carts')
    .select('*')
    .limit(5);
  
  logTest('Carts READ', !readError,
    readError ? readError.message : `Found ${carts?.length || 0} carts`);

  // READ - Get cart items
  const { data: cartItems, error: itemsError } = await supabase
    .from('cart_items')
    .select(`
      id,
      quantity,
      products (id, name, price)
    `)
    .limit(5);

  logTest('Cart Items READ (with products)', !itemsError,
    itemsError ? itemsError.message : `Found ${cartItems?.length || 0} cart items`);
}

// ============================================================
// PRODUCT QA CRUD TESTS
// ============================================================
async function testProductQACRUD() {
  console.log('\n✅ Testing Product QA CRUD...');
  
  // READ - Get product QA entries
  const { data: qaEntries, error: readError } = await supabase
    .from('product_qa')
    .select('*')
    .limit(5);
  
  logTest('Product QA READ', !readError,
    readError ? readError.message : `Found ${qaEntries?.length || 0} QA entries`);

  // READ - Get pending QA
  const { data: pendingQA, error: filterError } = await supabase
    .from('product_qa')
    .select('product_id, status')
    .eq('status', 'pending')
    .limit(5);

  logTest('Product QA READ (pending)', !filterError,
    filterError ? filterError.message : `Found ${pendingQA?.length || 0} pending QA items`);
}

// ============================================================
// ORDER STATUS HISTORY TEST (Using orders table)
// ============================================================
async function testOrderHistoryCRUD() {
  console.log('\n📜 Testing Order Status History...');
  
  // READ - Get recent order status changes (via orders table)
  const { data: recentOrders, error: readError } = await supabase
    .from('orders')
    .select('id, order_number, status, updated_at')
    .order('updated_at', { ascending: false })
    .limit(10);
  
  logTest('Order Status History READ', !readError,
    readError ? readError.message : `Found ${recentOrders?.length || 0} recent order updates`);
}

// ============================================================
// NOTIFICATIONS CRUD TESTS
// ============================================================
async function testNotificationsCRUD() {
  console.log('\n🔔 Testing Notifications CRUD...');
  
  // READ - Get notifications
  const { data: notifications, error: readError } = await supabase
    .from('notifications')
    .select('*')
    .limit(5);
  
  logTest('Notifications READ', !readError,
    readError ? readError.message : `Found ${notifications?.length || 0} notifications`);

  // Get a buyer for test notification
  const { data: buyer } = await supabase.from('buyers').select('id').limit(1).single();

  if (buyer?.id) {
    // CREATE - Test notification
    const testNotification = {
      user_id: buyer.id,
      user_type: 'buyer',
      title: 'Test Notification',
      message: 'This is a test notification for CRUD testing',
      type: 'order_update',
      is_read: false
    };

    const { data: created, error: createError } = await supabase
      .from('notifications')
      .insert(testNotification)
      .select()
      .single();

    logTest('Notifications CREATE', !createError,
      createError ? createError.message : `Created notification: ${created?.id}`);

    if (created?.id) {
      // UPDATE - Mark as read
      const { data: updated, error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', created.id)
        .select()
        .single();

      logTest('Notifications UPDATE (mark read)', !updateError && updated?.is_read === true,
        updateError ? updateError.message : 'Notification marked as read');

      // DELETE - Delete test notification
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', created.id);

      logTest('Notifications DELETE', !deleteError,
        deleteError ? deleteError.message : 'Test notification deleted');
    }
  }
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================
async function runAllTests() {
  console.log('🧪 WEB CRUD OPERATIONS TEST');
  console.log('============================================================');
  console.log(`📅 Date: ${new Date().toLocaleString()}`);
  console.log(`🔗 Supabase URL: ${supabaseUrl?.substring(0, 30)}...`);

  try {
    await testProductsCRUD();
    await testOrdersCRUD();
    await testSellersCRUD();
    await testBuyersCRUD();
    await testCartCRUD();
    await testProductQACRUD();
    await testOrderHistoryCRUD();
    await testNotificationsCRUD();
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }

  // Print summary
  console.log('\n============================================================');
  console.log('📊 TEST SUMMARY');
  console.log('============================================================\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📋 Total: ${total}`);
  console.log(`   📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.message}`);
    });
  }

  console.log('\n' + (failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️ SOME TESTS FAILED'));
  
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests();
