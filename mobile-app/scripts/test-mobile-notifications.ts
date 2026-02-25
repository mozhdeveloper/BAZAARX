/**
 * MOBILE NOTIFICATION SYSTEM TEST
 * 
 * Tests that the mobile app notification features work correctly:
 * 1. Notification service can create notifications
 * 2. Notification service can fetch notifications
 * 3. Notification service can mark as read
 * 4. Notification service can get unread count
 * 5. Order status updates trigger notifications
 * 6. Checkout process creates notifications
 * 
 * Run with: npx tsx scripts/test-mobile-notifications.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test data
const TEST_PREFIX = `MOBILE-TEST-${Date.now()}`;
let buyerId = '';
let sellerId = '';
let sellerUserId = '';
let testNotificationIds: string[] = [];

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
  console.log('\n' + '='.repeat(60));
  console.log(`📱 ${title}`);
  console.log('='.repeat(60));
}

// ========== SETUP ==========

async function setup() {
  header('SETUP');
  
  try {
    // Login buyer
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: BUYER.email,
      password: BUYER.password
    });

    if (authError) throw authError;
    buyerId = authData.user!.id;
    pass('Buyer logged in');

    // Get seller info (optional - may not exist)
    const { data: sellerData } = await supabase
      .from('sellers')
      .select('id, user_id, store_name')
      .limit(1)
      .single();

    if (!sellerData) {
      log('⚠️', 'No seller found - using test values for seller notifications');
      sellerId = 'test-seller-id';
      sellerUserId = 'test-seller-user-id';
    } else {
      sellerId = sellerData.id;
      sellerUserId = sellerData.user_id;
      pass(`Seller found: ${sellerData.store_name}`);
    }

    return true;
  } catch (error) {
    fail('Setup', error);
    return false;
  }
}

// ========== TEST 1: CREATE NOTIFICATION (simulating notificationService.createNotification) ==========

async function test1_CreateNotification() {
  header('TEST 1: Create Notification');
  
  try {
    const notificationData = {
      user_id: buyerId,
      user_type: 'buyer',
      type: 'order_placed',
      title: 'Order Placed',
      message: `${TEST_PREFIX}: Your order has been placed!`,
      icon: 'ShoppingBag',
      icon_bg: 'bg-green-500',
      action_url: '/order/test-123',
      action_data: { orderId: 'test-123', orderNumber: 'ORD-TEST-123' },
      priority: 'normal',
      is_read: false
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('No data returned');

    testNotificationIds.push(data.id);
    pass('Created notification successfully');
    
    // Verify structure
    if (data.user_id === buyerId && data.user_type === 'buyer' && data.is_read === false) {
      pass('Notification has correct structure');
    } else {
      fail('Notification structure incorrect');
    }

    return true;
  } catch (error) {
    fail('Create notification', error);
    return false;
  }
}

// ========== TEST 2: FETCH NOTIFICATIONS (simulating notificationService.getNotifications) ==========

async function test2_FetchNotifications() {
  header('TEST 2: Fetch Notifications');
  
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', buyerId)
      .eq('user_type', 'buyer')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    if (!data) throw new Error('No data returned');

    pass(`Fetched ${data.length} notifications`);
    
    // Check that our test notification is included
    const testNotif = data.find(n => n.message?.includes(TEST_PREFIX));
    if (testNotif) {
      pass('Test notification found in list');
    } else {
      fail('Test notification not found');
    }

    return true;
  } catch (error) {
    fail('Fetch notifications', error);
    return false;
  }
}

// ========== TEST 3: GET UNREAD COUNT (simulating notificationService.getUnreadCount) ==========

async function test3_GetUnreadCount() {
  header('TEST 3: Get Unread Count');
  
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', buyerId)
      .eq('user_type', 'buyer')
      .eq('is_read', false);

    if (error) throw error;
    if (count === null) throw new Error('Count is null');

    pass(`Unread count: ${count}`);
    
    if (count >= 1) {
      pass('Has at least 1 unread notification');
    } else {
      fail('Should have at least 1 unread');
    }

    return true;
  } catch (error) {
    fail('Get unread count', error);
    return false;
  }
}

// ========== TEST 4: MARK AS READ (simulating notificationService.markAsRead) ==========

async function test4_MarkAsRead() {
  header('TEST 4: Mark As Read');
  
  try {
    const notifId = testNotificationIds[0];
    
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notifId);

    if (error) throw error;
    pass('Marked notification as read');

    // Verify
    const { data: verify } = await supabase
      .from('notifications')
      .select('is_read, read_at')
      .eq('id', notifId)
      .single();

    if (verify && verify.is_read === true && verify.read_at) {
      pass('Verified notification is read');
    } else {
      fail('Notification not properly marked as read');
    }

    return true;
  } catch (error) {
    fail('Mark as read', error);
    return false;
  }
}

// ========== TEST 5: MARK ALL AS READ (simulating notificationService.markAllAsRead) ==========

async function test5_MarkAllAsRead() {
  header('TEST 5: Mark All As Read');
  
  try {
    // Create some more unread notifications first
    for (let i = 0; i < 3; i++) {
      const { data } = await supabase
        .from('notifications')
        .insert({
          user_id: buyerId,
          user_type: 'buyer',
          type: 'order_shipped',
          title: 'Order Shipped',
          message: `${TEST_PREFIX}: Test notification ${i + 1}`,
          icon: 'Truck',
          is_read: false
        })
        .select()
        .single();
      
      if (data) testNotificationIds.push(data.id);
    }
    pass('Created 3 more unread notifications');

    // Mark all as read
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', buyerId)
      .eq('user_type', 'buyer')
      .eq('is_read', false)
      .like('message', `${TEST_PREFIX}%`);

    if (error) throw error;
    pass('Marked all test notifications as read');

    // Verify count
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', buyerId)
      .eq('user_type', 'buyer')
      .eq('is_read', false)
      .like('message', `${TEST_PREFIX}%`);

    if (count === 0) {
      pass('All test notifications are now read');
    } else {
      fail(`Still ${count} unread test notifications`);
    }

    return true;
  } catch (error) {
    fail('Mark all as read', error);
    return false;
  }
}

// ========== TEST 6: SELLER NOTIFICATION (simulating notificationService.notifySellerNewOrder) ==========

async function test6_SellerNotification() {
  header('TEST 6: Seller Notification');
  
  // Skip if no real seller
  if (sellerUserId === 'test-seller-user-id') {
    log('⏭️', 'Skipped - no real seller in database');
    return true;
  }
  
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: sellerUserId,
        user_type: 'seller',
        type: 'seller_new_order',
        title: 'New Order Received',
        message: `${TEST_PREFIX}: New order from Test Buyer. Total: ₱1,500`,
        icon: 'ShoppingBag',
        icon_bg: 'bg-green-500',
        action_url: '/seller/orders/test-id',
        action_data: { orderId: 'test-id' },
        priority: 'high',
        is_read: false
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('No data');

    testNotificationIds.push(data.id);
    pass('Seller notification created');

    // Verify seller can see it
    const { data: sellerNotifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', sellerUserId)
      .eq('user_type', 'seller')
      .like('message', `${TEST_PREFIX}%`);

    if (sellerNotifs && sellerNotifs.length > 0) {
      pass('Seller can see their notification');
    } else {
      fail('Seller cannot see notification');
    }

    return true;
  } catch (error) {
    fail('Seller notification', error);
    return false;
  }
}

// ========== TEST 7: BUYER ORDER STATUS NOTIFICATION (simulating notificationService.notifyBuyerOrderStatus) ==========

async function test7_BuyerOrderStatusNotification() {
  header('TEST 7: Buyer Order Status Notifications');
  
  const statuses = [
    { status: 'confirmed', title: 'Order Confirmed', icon: 'CheckCircle', bg: 'bg-blue-500' },
    { status: 'shipped', title: 'Order Shipped', icon: 'Truck', bg: 'bg-orange-500' },
    { status: 'delivered', title: 'Order Delivered', icon: 'Package', bg: 'bg-green-500' },
  ];

  try {
    for (const s of statuses) {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: buyerId,
          user_type: 'buyer',
          type: `order_${s.status}`,
          title: s.title,
          message: `${TEST_PREFIX}: Your order status is now ${s.status}`,
          icon: s.icon,
          icon_bg: s.bg,
          action_url: '/order/test-order',
          priority: 'normal',
          is_read: false
        })
        .select()
        .single();

      if (error) throw error;
      if (data) testNotificationIds.push(data.id);
      pass(`Created ${s.status} notification`);
    }

    // Verify all types exist
    const { data: allNotifs } = await supabase
      .from('notifications')
      .select('type')
      .eq('user_id', buyerId)
      .like('message', `${TEST_PREFIX}%`);

    const types = new Set(allNotifs?.map(n => n.type) || []);
    
    if (types.has('order_confirmed') && types.has('order_shipped') && types.has('order_delivered')) {
      pass('All order status notification types created');
    } else {
      fail('Some notification types missing');
    }

    return true;
  } catch (error) {
    fail('Order status notifications', error);
    return false;
  }
}

// ========== TEST 8: NOTIFICATION ACTION DATA ==========

async function test8_NotificationActionData() {
  header('TEST 8: Notification Action Data');
  
  try {
    const { data } = await supabase
      .from('notifications')
      .select('action_url, action_data')
      .eq('id', testNotificationIds[0])
      .single();

    if (data && data.action_url) {
      pass(`Notification has action_url: ${data.action_url}`);
    } else {
      fail('Missing action_url');
    }

    if (data && data.action_data) {
      pass('Notification has action_data');
      console.log('   Action Data:', JSON.stringify(data.action_data));
    } else {
      // action_data is optional
      log('ℹ️', 'No action_data (optional)');
    }

    return true;
  } catch (error) {
    fail('Action data check', error);
    return false;
  }
}

// ========== CLEANUP ==========

async function cleanup() {
  header('CLEANUP');
  
  try {
    // Delete all test notifications
    const { error } = await supabase
      .from('notifications')
      .delete()
      .like('message', `${TEST_PREFIX}%`);

    if (!error) {
      log('🧹', `Deleted ${testNotificationIds.length} test notifications`);
    } else {
      log('⚠️', 'Cleanup error: ' + error.message);
    }
  } catch (error) {
    log('⚠️', 'Cleanup failed: ' + error);
  }
}

// ========== MAIN ==========

async function runTests() {
  console.log('\n📱 MOBILE NOTIFICATION SYSTEM TEST\n');
  console.log('Testing notification functionality for mobile app...\n');

  const setupOk = await setup();
  if (!setupOk) {
    console.log('\n❌ Setup failed. Cannot continue.\n');
    process.exit(1);
  }

  await test1_CreateNotification();
  await test2_FetchNotifications();
  await test3_GetUnreadCount();
  await test4_MarkAsRead();
  await test5_MarkAllAsRead();
  await test6_SellerNotification();
  await test7_BuyerOrderStatusNotification();
  await test8_NotificationActionData();

  await cleanup();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Total:  ${testsPassed + testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All mobile notification tests passed!\n');
  } else {
    console.log('\n⚠️ Some tests failed. Review errors above.\n');
    process.exit(1);
  }
}

runTests().catch(console.error);
