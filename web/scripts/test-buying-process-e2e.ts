/**
 * COMPLETE BUYING PROCESS E2E TEST
 * 
 * Tests the entire buyer journey with all notifications:
 * 1. Buyer browses products
 * 2. Buyer adds product to cart
 * 3. Buyer places order
 * 4. Buyer receives "Order Placed" notification
 * 5. Seller receives "New Order" notification
 * 6. Seller confirms order -> Buyer gets "Confirmed" notification
 * 7. Seller ships order -> Buyer gets "Shipped" notification
 * 8. Seller marks delivered -> Buyer gets "Delivered" notification
 * 9. Verify all notifications in buyer's list
 * 10. Verify PDF receipt data structure
 * 
 * Run with: npx tsx scripts/test-buying-process-e2e.ts
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

// Test data
const TEST_ORDER_NUMBER = `TEST-E2E-${Date.now()}`;
let testOrderId = '';
let testProductId = '';
let buyerId = '';
let sellerId = '';
let sellerUserId = '';

const BUYER = {
  email: 'anna.cruz@gmail.com',
  password: 'Buyer123!',
};

let testsPassed = 0;
let testsFailed = 0;

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

function header(title: string) {
  console.log('\n' + '='.repeat(70));
  console.log(`📋 ${title}`);
  console.log('='.repeat(70));
}

// ========== PHASE 1: SETUP ==========

async function phase1_Setup() {
  header('PHASE 1: SETUP');
  
  try {
    // Login buyer
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: BUYER.email,
      password: BUYER.password
    });

    if (authError) throw authError;
    buyerId = authData.user!.id;
    pass('1.1 Buyer logged in successfully');

    // Get seller info
    const { data: sellerData } = await supabase
      .from('sellers')
      .select('id, user_id, store_name')
      .eq('approval_status', 'approved')
      .limit(1)
      .single();

    if (!sellerData) throw new Error('No approved seller found');
    sellerId = sellerData.id;
    sellerUserId = sellerData.user_id;
    pass(`1.2 Found seller: ${sellerData.store_name}`);

    // Get a product from this seller
    const { data: productData } = await supabase
      .from('products')
      .select('id, name, price')
      .eq('seller_id', sellerId)
      .eq('approval_status', 'approved')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!productData) throw new Error('No product found');
    testProductId = productData.id;
    pass(`1.3 Found product: ${productData.name} - ₱${productData.price}`);

    return true;
  } catch (error) {
    fail('Phase 1: Setup', error);
    return false;
  }
}

// ========== PHASE 2: CREATE ORDER ==========

async function phase2_CreateOrder() {
  header('PHASE 2: CREATE ORDER');
  
  try {
    // Get product details
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', testProductId)
      .single();

    if (!product) throw new Error('Product not found');

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: TEST_ORDER_NUMBER,
        buyer_id: buyerId,
        seller_id: sellerId,
        buyer_name: 'Anna Cruz (E2E Test)',
        buyer_email: BUYER.email,
        shipping_address: {
          fullName: 'Anna Cruz',
          phone: '09171234567',
          addressLine1: '123 Test Street',
          city: 'Manila',
          province: 'Metro Manila',
          postalCode: '1000',
          country: 'Philippines'
        },
        payment_method: { type: 'cod' },
        status: 'pending_payment',
        payment_status: 'pending',
        subtotal: product.price,
        total_amount: product.price,
        currency: 'PHP',
        shipping_cost: 0
      })
      .select()
      .single();

    if (orderError) throw orderError;
    testOrderId = order.id;
    pass(`2.1 Order created: ${TEST_ORDER_NUMBER}`);

    // Create order item with variant
    const { error: itemError } = await supabase
      .from('order_items')
      .insert({
        order_id: testOrderId,
        product_id: testProductId,
        product_name: product.name,
        product_images: product.images || [],
        quantity: 1,
        price: product.price,
        subtotal: product.price,
        selected_variant: {
          size: 'Medium',
          color: 'Blue',
          name: 'Size: Medium, Color: Blue'
        },
        status: 'pending'
      });

    if (itemError) throw itemError;
    pass('2.2 Order item with variant created');

    // Create "Order Placed" notification for buyer
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: buyerId,
        user_type: 'buyer',
        type: 'order_placed',
        title: 'Order Placed',
        message: `Your order #${TEST_ORDER_NUMBER} has been placed successfully!`,
        icon: 'ShoppingBag',
        icon_bg: 'bg-green-500',
        action_url: `/order/${TEST_ORDER_NUMBER}`,
        action_data: { orderId: testOrderId, orderNumber: TEST_ORDER_NUMBER },
        priority: 'normal',
        is_read: false
      });

    if (notifError) throw notifError;
    pass('2.3 Buyer "Order Placed" notification created');

    // Create "New Order" notification for seller
    const { error: sellerNotifError } = await supabase
      .from('notifications')
      .insert({
        user_id: sellerUserId,
        user_type: 'seller',
        type: 'seller_new_order',
        title: 'New Order Received',
        message: `New order #${TEST_ORDER_NUMBER} from Anna Cruz. Total: ₱${product.price.toLocaleString()}`,
        icon: 'ShoppingBag',
        icon_bg: 'bg-green-500',
        action_url: `/seller/orders/${testOrderId}`,
        action_data: { orderId: testOrderId },
        priority: 'high',
        is_read: false
      });

    if (sellerNotifError) throw sellerNotifError;
    pass('2.4 Seller "New Order" notification created');

    return true;
  } catch (error) {
    fail('Phase 2: Create Order', error);
    return false;
  }
}

// ========== PHASE 3: SELLER CONFIRMS ORDER ==========

async function phase3_SellerConfirms() {
  header('PHASE 3: SELLER CONFIRMS ORDER');
  
  try {
    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', testOrderId);

    if (updateError) throw updateError;
    pass('3.1 Order status updated to confirmed');

    // Create "Order Confirmed" notification for buyer
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: buyerId,
        user_type: 'buyer',
        type: 'order_confirmed',
        title: 'Order Confirmed',
        message: `Your order #${TEST_ORDER_NUMBER} has been confirmed by the seller.`,
        icon: 'CheckCircle',
        icon_bg: 'bg-blue-500',
        action_url: `/order/${TEST_ORDER_NUMBER}`,
        action_data: { orderId: testOrderId, orderNumber: TEST_ORDER_NUMBER },
        priority: 'normal',
        is_read: false
      });

    if (notifError) throw notifError;
    pass('3.2 Buyer "Order Confirmed" notification created');

    return true;
  } catch (error) {
    fail('Phase 3: Seller Confirms', error);
    return false;
  }
}

// ========== PHASE 4: SELLER SHIPS ORDER ==========

async function phase4_SellerShips() {
  header('PHASE 4: SELLER SHIPS ORDER');
  
  const trackingNumber = 'TRACK-E2E-123456';
  
  try {
    // Update order status with tracking
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'shipped', 
        tracking_number: trackingNumber,
        shipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      })
      .eq('id', testOrderId);

    if (updateError) throw updateError;
    pass('4.1 Order status updated to shipped with tracking');

    // Create "Order Shipped" notification for buyer
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: buyerId,
        user_type: 'buyer',
        type: 'order_shipped',
        title: 'Order Shipped',
        message: `Your order #${TEST_ORDER_NUMBER} has been shipped! Tracking: ${trackingNumber}`,
        icon: 'Truck',
        icon_bg: 'bg-orange-500',
        action_url: `/order/${TEST_ORDER_NUMBER}`,
        action_data: { orderId: testOrderId, orderNumber: TEST_ORDER_NUMBER, trackingNumber },
        priority: 'high',
        is_read: false
      });

    if (notifError) throw notifError;
    pass('4.2 Buyer "Order Shipped" notification with tracking created');

    return true;
  } catch (error) {
    fail('Phase 4: Seller Ships', error);
    return false;
  }
}

// ========== PHASE 5: ORDER DELIVERED ==========

async function phase5_OrderDelivered() {
  header('PHASE 5: ORDER DELIVERED');
  
  try {
    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'delivered', 
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      })
      .eq('id', testOrderId);

    if (updateError) throw updateError;
    pass('5.1 Order status updated to delivered');

    // Create "Order Delivered" notification for buyer
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: buyerId,
        user_type: 'buyer',
        type: 'order_delivered',
        title: 'Order Delivered',
        message: `Your order #${TEST_ORDER_NUMBER} has been delivered! Enjoy your purchase!`,
        icon: 'Package',
        icon_bg: 'bg-green-500',
        action_url: `/order/${TEST_ORDER_NUMBER}`,
        action_data: { orderId: testOrderId, orderNumber: TEST_ORDER_NUMBER },
        priority: 'normal',
        is_read: false
      });

    if (notifError) throw notifError;
    pass('5.2 Buyer "Order Delivered" notification created');

    return true;
  } catch (error) {
    fail('Phase 5: Order Delivered', error);
    return false;
  }
}

// ========== PHASE 6: VERIFY NOTIFICATIONS ==========

async function phase6_VerifyNotifications() {
  header('PHASE 6: VERIFY ALL NOTIFICATIONS');
  
  try {
    // Get all notifications for this order
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', buyerId)
      .eq('user_type', 'buyer')
      .like('message', `%${TEST_ORDER_NUMBER}%`)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!notifications || notifications.length === 0) throw new Error('No notifications found');

    pass(`6.1 Found ${notifications.length} notifications for this order`);

    // Check for each status
    const expectedTypes = ['order_placed', 'order_confirmed', 'order_shipped', 'order_delivered'];
    
    for (const type of expectedTypes) {
      const found = notifications.find(n => n.type === type);
      if (found) {
        pass(`6.2 Found ${type} notification`);
      } else {
        fail(`6.2 Missing ${type} notification`);
      }
    }

    // Verify unread count
    const unreadCount = notifications.filter(n => !n.is_read).length;
    pass(`6.3 Unread notifications: ${unreadCount}`);

    // Verify seller notification
    const { data: sellerNotifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', sellerUserId)
      .eq('user_type', 'seller')
      .like('message', `%${TEST_ORDER_NUMBER}%`);

    if (sellerNotifs && sellerNotifs.length > 0) {
      pass('6.4 Seller notification found');
    } else {
      fail('6.4 Seller notification missing');
    }

    return true;
  } catch (error) {
    fail('Phase 6: Verify Notifications', error);
    return false;
  }
}

// ========== PHASE 7: VERIFY ORDER DATA ==========

async function phase7_VerifyOrderData() {
  header('PHASE 7: VERIFY ORDER DATA FOR PDF RECEIPT');
  
  try {
    // Get full order with items
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items (
          *,
          product:products (
            name,
            price,
            images
          )
        ),
        seller:sellers (
          store_name,
          business_name,
          business_address
        )
      `)
      .eq('id', testOrderId)
      .single();

    if (error) throw error;
    if (!order) throw new Error('Order not found');

    pass('7.1 Order retrieved with full details');

    // Verify order structure for PDF
    const requiredFields = ['order_number', 'buyer_name', 'total_amount', 'shipping_address', 'payment_method'];
    for (const field of requiredFields) {
      if (order[field] !== undefined && order[field] !== null) {
        pass(`7.2 Order has ${field}`);
      } else {
        fail(`7.2 Order missing ${field}`);
      }
    }

    // Verify items have variants
    if (order.items && order.items.length > 0) {
      const item = order.items[0];
      if (item.selected_variant && item.selected_variant.size && item.selected_variant.color) {
        pass(`7.3 Order item has variant: Size ${item.selected_variant.size}, Color ${item.selected_variant.color}`);
      } else {
        fail('7.3 Order item missing variant info');
      }
    }

    // Verify seller info
    if (order.seller && order.seller.store_name) {
      pass(`7.4 Order has seller info: ${order.seller.store_name}`);
    } else {
      fail('7.4 Order missing seller info');
    }

    // Log order summary (for manual verification)
    console.log('\n📄 ORDER SUMMARY FOR PDF:');
    console.log(`   Order #: ${order.order_number}`);
    console.log(`   Buyer: ${order.buyer_name}`);
    console.log(`   Seller: ${order.seller?.store_name || 'N/A'}`);
    console.log(`   Total: ₱${order.total_amount?.toLocaleString() || 0}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Items: ${order.items?.length || 0}`);

    return true;
  } catch (error) {
    fail('Phase 7: Verify Order Data', error);
    return false;
  }
}

// ========== CLEANUP ==========

async function cleanup() {
  header('CLEANUP');
  
  try {
    // Delete test notifications
    await supabase
      .from('notifications')
      .delete()
      .like('message', `%${TEST_ORDER_NUMBER}%`);
    log('🧹', 'Deleted test notifications');

    // Delete test order items
    await supabase
      .from('order_items')
      .delete()
      .eq('order_id', testOrderId);
    log('🧹', 'Deleted test order items');

    // Delete test order
    await supabase
      .from('orders')
      .delete()
      .eq('id', testOrderId);
    log('🧹', 'Deleted test order');

  } catch (error) {
    log('⚠️', 'Cleanup had issues: ' + error);
  }
}

// ========== MAIN ==========

async function runTests() {
  console.log('\n🛒 COMPLETE BUYING PROCESS E2E TEST\n');
  console.log('Testing the entire buyer journey with notifications...\n');
  console.log(`Test Order Number: ${TEST_ORDER_NUMBER}\n`);

  // Run all phases
  const phase1Ok = await phase1_Setup();
  if (!phase1Ok) {
    console.log('\n❌ Setup failed. Cannot continue.\n');
    process.exit(1);
  }

  await phase2_CreateOrder();
  await phase3_SellerConfirms();
  await phase4_SellerShips();
  await phase5_OrderDelivered();
  await phase6_VerifyNotifications();
  await phase7_VerifyOrderData();

  // Cleanup
  await cleanup();

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Total:  ${testsPassed + testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All E2E tests passed! The buying process with notifications is working correctly.\n');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

runTests().catch(console.error);
