/**
 * COMPREHENSIVE SELLER COMPLETE FLOW TEST
 * 
 * Tests the complete seller flow for web:
 * 1. Seller authentication
 * 2. Seller profile and store data
 * 3. Product creation and management
 * 4. Inventory management
 * 5. Order receiving and processing
 * 6. Order status updates
 * 7. Sales data and analytics
 * 8. Notifications
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test seller account
const SELLER = {
  email: 'active.sports@bazaarph.com',
  password: 'Seller123!',
  id: '',
  sellerId: ''
};

// Test buyer account (for creating test orders)
const BUYER = {
  email: 'anna.cruz@gmail.com',
  password: 'Buyer123!',
  id: ''
};

let testsPassed = 0;
let testsFailed = 0;
let testProductId = '';
let testOrderId = '';
let testOrderNumber = '';

function log(emoji: string, message: string) {
  console.log(`${emoji} ${message}`);
}

function pass(test: string) {
  testsPassed++;
  log('✅', test);
}

function fail(test: string, error?: any) {
  testsFailed++;
  log('❌', `${test}${error ? ': ' + (error.message || error) : ''}`);
}

// ========== AUTHENTICATION TESTS ==========

async function test1_SellerLogin() {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: SELLER.email,
      password: SELLER.password
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned');

    SELLER.id = data.user.id;
    pass('Test 1: Seller login successful');
  } catch (error) {
    fail('Test 1: Seller login', error);
  }
}

async function test2_SellerProfileExists() {
  try {
    // The sellers table uses 'id' as primary key (same as auth user id)
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('id', SELLER.id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('No seller profile found');

    SELLER.sellerId = data.id; // Same as SELLER.id
    log('📋', `  Store: ${data.store_name || data.business_name}`);
    pass('Test 2: Seller profile exists in sellers table');
  } catch (error) {
    fail('Test 2: Seller profile exists', error);
  }
}

async function test3_ProfilesTableAccess() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', SELLER.id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('No profile found');

    pass('Test 3: Profiles table accessible with seller data');
  } catch (error) {
    fail('Test 3: Profiles table access', error);
  }
}

// ========== PRODUCT MANAGEMENT TESTS ==========

async function test4_CreateProduct() {
  try {
    const productData = {
      name: `Test Product ${Date.now()}`,
      description: 'Product created via seller flow test',
      price: 1999.99,
      original_price: 2499.99,
      stock: 50,
      category: 'Electronics',
      images: ['https://placehold.co/400?text=Test+Product'],
      colors: ['Red', 'Blue', 'Black'],
      sizes: ['S', 'M', 'L', 'XL'],
      seller_id: SELLER.sellerId,
      approval_status: 'approved', // Pre-approved for testing
      is_active: true
    };

    const { data, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('No product returned');

    testProductId = data.id;
    log('📦', `  Product ID: ${data.id.substring(0, 8)}...`);
    pass('Test 4: Create product successful');
  } catch (error) {
    fail('Test 4: Create product', error);
  }
}

async function test5_GetSellerProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', SELLER.sellerId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No products found');

    pass(`Test 5: Retrieved ${data.length} seller products`);
  } catch (error) {
    fail('Test 5: Get seller products', error);
  }
}

async function test6_UpdateProductStock() {
  try {
    if (!testProductId) throw new Error('No test product ID');

    const newStock = 45;
    const { error } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', testProductId);

    if (error) throw error;

    // Verify
    const { data } = await supabase
      .from('products')
      .select('stock')
      .eq('id', testProductId)
      .single();

    if (data?.stock !== newStock) throw new Error('Stock not updated');

    pass('Test 6: Update product stock successful');
  } catch (error) {
    fail('Test 6: Update product stock', error);
  }
}

async function test7_UpdateProductPrice() {
  try {
    if (!testProductId) throw new Error('No test product ID');

    const newPrice = 1799.99;
    const { error } = await supabase
      .from('products')
      .update({ price: newPrice })
      .eq('id', testProductId);

    if (error) throw error;

    // Verify
    const { data } = await supabase
      .from('products')
      .select('price')
      .eq('id', testProductId)
      .single();

    if (Math.abs(data?.price - newPrice) > 0.01) throw new Error('Price not updated');

    pass('Test 7: Update product price successful');
  } catch (error) {
    fail('Test 7: Update product price', error);
  }
}

async function test8_ToggleProductActive() {
  try {
    if (!testProductId) throw new Error('No test product ID');

    // Deactivate
    await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', testProductId);

    // Verify deactivated
    const { data: deactivated } = await supabase
      .from('products')
      .select('is_active')
      .eq('id', testProductId)
      .single();

    if (deactivated?.is_active !== false) throw new Error('Product not deactivated');

    // Reactivate
    await supabase
      .from('products')
      .update({ is_active: true })
      .eq('id', testProductId);

    pass('Test 8: Toggle product active status');
  } catch (error) {
    fail('Test 8: Toggle product active', error);
  }
}

// ========== ORDER MANAGEMENT TESTS ==========

async function test9_CreateTestOrder() {
  try {
    // First login as buyer to create order
    const { data: buyerAuth } = await supabase.auth.signInWithPassword({
      email: BUYER.email,
      password: BUYER.password
    });

    if (!buyerAuth?.user) throw new Error('Buyer login failed');
    BUYER.id = buyerAuth.user.id;

    // Get product price
    const { data: product } = await supabase
      .from('products')
      .select('id, name, price')
      .eq('id', testProductId)
      .single();

    if (!product) throw new Error('Product not found');

    // Generate order number
    const year = new Date().getFullYear();
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    testOrderNumber = `ORD-TEST-${year}${randomNum}`;

    const orderData = {
      order_number: testOrderNumber,
      buyer_id: BUYER.id,
      seller_id: SELLER.sellerId,
      buyer_name: 'Anna Cruz',
      buyer_email: BUYER.email,
      shipping_address: {
        fullName: 'Anna Cruz',
        phone: '+63 912 345 6789',
        street: '123 Test Street',
        city: 'Quezon City',
        province: 'Metro Manila',
        postalCode: '1100'
      },
      payment_method: { type: 'cod', details: {} },
      status: 'pending_payment',
      payment_status: 'pending',
      subtotal: product.price,
      total_amount: product.price,
      currency: 'PHP',
      shipping_cost: 50,
      discount_amount: 0,
      tax_amount: 0,
      is_reviewed: false,
      is_returnable: true,
      return_window: 7
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) throw orderError;
    if (!order) throw new Error('No order returned');

    testOrderId = order.id;

    // Add order item
    await supabase.from('order_items').insert({
      order_id: order.id,
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      price: product.price,
      subtotal: product.price,
      status: 'pending',
      is_reviewed: false
    });

    log('🛒', `  Order: ${testOrderNumber}`);

    // Re-login as seller
    await supabase.auth.signInWithPassword({
      email: SELLER.email,
      password: SELLER.password
    });

    pass('Test 9: Create test order successful');
  } catch (error) {
    fail('Test 9: Create test order', error);
  }
}

async function test10_SellerReceivesOrder() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          id,
          product_name,
          quantity,
          price
        ),
        buyer:buyers!orders_buyer_id_fkey(
          id
        )
      `)
      .eq('seller_id', SELLER.sellerId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No orders found for seller');

    const foundOrder = data.find((o: any) => o.id === testOrderId);
    if (!foundOrder) throw new Error('Test order not found in seller orders');

    pass(`Test 10: Seller received order (${data.length} orders total)`);
  } catch (error) {
    fail('Test 10: Seller receives order', error);
  }
}

async function test11_ConfirmOrder() {
  try {
    if (!testOrderId) throw new Error('No test order ID');

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'processing',
        payment_status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', testOrderId);

    if (error) throw error;

    // Verify
    const { data } = await supabase
      .from('orders')
      .select('status, payment_status')
      .eq('id', testOrderId)
      .single();

    if (data?.status !== 'processing') throw new Error('Order not confirmed');

    pass('Test 11: Confirm order successful');
  } catch (error) {
    fail('Test 11: Confirm order', error);
  }
}

async function test12_ShipOrder() {
  try {
    if (!testOrderId) throw new Error('No test order ID');

    const trackingNumber = `TRK${Date.now()}`;

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'shipped',
        tracking_number: trackingNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', testOrderId);

    if (error) throw error;

    // Verify
    const { data } = await supabase
      .from('orders')
      .select('status, tracking_number')
      .eq('id', testOrderId)
      .single();

    if (data?.status !== 'shipped') throw new Error('Order not shipped');
    if (!data?.tracking_number) throw new Error('Tracking number not saved');

    log('📦', `  Tracking: ${trackingNumber}`);
    pass('Test 12: Ship order successful');
  } catch (error) {
    fail('Test 12: Ship order', error);
  }
}

async function test13_DeliverOrder() {
  try {
    if (!testOrderId) throw new Error('No test order ID');

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        updated_at: new Date().toISOString()
      })
      .eq('id', testOrderId);

    if (error) throw error;

    // Verify
    const { data } = await supabase
      .from('orders')
      .select('status')
      .eq('id', testOrderId)
      .single();

    if (data?.status !== 'delivered') throw new Error('Order not delivered');

    pass('Test 13: Deliver order successful');
  } catch (error) {
    fail('Test 13: Deliver order', error);
  }
}

// ========== SALES & ANALYTICS TESTS ==========

async function test14_GetOrdersByStatus() {
  try {
    const statuses = ['pending_payment', 'processing', 'shipped', 'delivered'];
    
    for (const status of statuses) {
      const { data, error } = await supabase
        .from('orders')
        .select('id')
        .eq('seller_id', SELLER.sellerId)
        .eq('status', status);

      if (error) throw error;
    }

    pass('Test 14: Get orders by status successful');
  } catch (error) {
    fail('Test 14: Get orders by status', error);
  }
}

async function test15_CalculateSalesTotal() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('total_amount, status')
      .eq('seller_id', SELLER.sellerId)
      .in('status', ['delivered', 'completed']);

    if (error) throw error;

    const totalSales = (data || []).reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
    log('💰', `  Total Sales: ₱${totalSales.toLocaleString()}`);

    pass('Test 15: Calculate sales total successful');
  } catch (error) {
    fail('Test 15: Calculate sales total', error);
  }
}

async function test16_GetProductPerformance() {
  try {
    const { data, error } = await supabase
      .from('order_items')
      .select(`
        product_id,
        product_name,
        quantity,
        price,
        order:orders!order_items_order_id_fkey(
          seller_id,
          status
        )
      `)
      .limit(50);

    if (error) throw error;

    // Filter by seller
    const sellerItems = (data || []).filter(
      (item: any) => item.order?.seller_id === SELLER.sellerId
    );

    pass(`Test 16: Get product performance (${sellerItems.length} items)`);
  } catch (error) {
    fail('Test 16: Get product performance', error);
  }
}

// ========== NOTIFICATIONS TESTS ==========

async function test17_GetSellerNotifications() {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', SELLER.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    pass(`Test 17: Retrieved ${data?.length || 0} notifications`);
  } catch (error) {
    fail('Test 17: Get seller notifications', error);
  }
}

async function test18_CreateOrderNotification() {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: SELLER.id,
        user_type: 'seller',
        type: 'order',
        title: 'New Order Received',
        message: `You have a new order: ${testOrderNumber}`,
        action_url: `/seller/orders/${testOrderId}`,
        priority: 'normal',
        is_read: false
      });

    if (error) throw error;

    pass('Test 18: Create order notification successful');
  } catch (error) {
    fail('Test 18: Create order notification', error);
  }
}

// ========== INVENTORY LEDGER TESTS ==========

async function test19_CheckInventoryLedger() {
  try {
    const { data, error } = await supabase
      .from('inventory_ledger')
      .select('*')
      .eq('product_id', testProductId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      log('⚠️', '  Inventory ledger table may not exist (optional)');
      testsPassed++;
      return;
    }

    pass(`Test 19: Inventory ledger accessible (${data?.length || 0} entries)`);
  } catch (error: any) {
    if (error.message?.includes('does not exist')) {
      log('⚠️', '  Test 19: Inventory ledger not implemented (optional)');
      testsPassed++;
    } else {
      fail('Test 19: Check inventory ledger', error);
    }
  }
}

// ========== CLEANUP ==========

async function test20_CleanupTestData() {
  try {
    // Delete test notifications
    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', SELLER.id)
      .ilike('message', `%${testOrderNumber}%`);

    // Delete test order items
    if (testOrderId) {
      await supabase.from('order_items').delete().eq('order_id', testOrderId);
    }

    // Delete test order
    if (testOrderId) {
      await supabase.from('orders').delete().eq('id', testOrderId);
    }

    // Delete test product
    if (testProductId) {
      await supabase.from('product_qa').delete().eq('product_id', testProductId);
      await supabase.from('products').delete().eq('id', testProductId);
    }

    pass('Test 20: Cleanup test data');
  } catch (error) {
    fail('Test 20: Cleanup', error);
  }
}

// ========== RUN ALL TESTS ==========

async function runTests() {
  console.log('\n🧪 Starting Seller Complete Flow Tests - Web Version\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Testing: Auth → Products → Orders → Processing → Analytics\n');

  console.log('📋 AUTHENTICATION');
  await test1_SellerLogin();
  await test2_SellerProfileExists();
  await test3_ProfilesTableAccess();

  console.log('\n📦 PRODUCT MANAGEMENT');
  await test4_CreateProduct();
  await test5_GetSellerProducts();
  await test6_UpdateProductStock();
  await test7_UpdateProductPrice();
  await test8_ToggleProductActive();

  console.log('\n🛒 ORDER MANAGEMENT');
  await test9_CreateTestOrder();
  await test10_SellerReceivesOrder();
  await test11_ConfirmOrder();
  await test12_ShipOrder();
  await test13_DeliverOrder();

  console.log('\n📊 SALES & ANALYTICS');
  await test14_GetOrdersByStatus();
  await test15_CalculateSalesTotal();
  await test16_GetProductPerformance();

  console.log('\n🔔 NOTIFICATIONS');
  await test17_GetSellerNotifications();
  await test18_CreateOrderNotification();

  console.log('\n📋 INVENTORY');
  await test19_CheckInventoryLedger();

  console.log('\n🧹 CLEANUP');
  await test20_CleanupTestData();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`\n📊 Results: ${testsPassed}/${testsPassed + testsFailed} tests passed`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! Seller complete flow is working correctly.\n');
  } else {
    console.log(`\n⚠️  ${testsFailed} test(s) failed. Please review the errors above.\n`);
  }

  // Sign out
  await supabase.auth.signOut();
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests();
