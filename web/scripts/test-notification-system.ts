/**
 * COMPREHENSIVE NOTIFICATION SYSTEM TEST
 * 
 * Tests the complete notification flow for the buying process:
 * 1. Order placed - Buyer receives notification
 * 2. Seller receives new order notification
 * 3. Order confirmed - Buyer receives notification
 * 4. Order shipped - Buyer receives notification with tracking
 * 5. Order delivered - Buyer receives notification
 * 6. Notification read/unread functionality
 * 7. Mark all as read
 * 
 * Run with: npx tsx scripts/test-notification-system.ts
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

// Test accounts
const BUYER = {
  email: 'anna.cruz@gmail.com',
  password: 'Buyer123!',
  id: ''
};

const SELLER = {
  email: 'active.sports@bazaarph.com',
  password: 'Seller123!',
  id: '',
  sellerId: ''
};

let testsPassed = 0;
let testsFailed = 0;
let testNotificationId = '';

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
  console.log(`📋 ${title}`);
  console.log('='.repeat(60));
}

// ========== SETUP ==========

async function setupBuyer() {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: BUYER.email,
      password: BUYER.password
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned');

    BUYER.id = data.user.id;
    pass('Setup: Buyer login successful');
    return true;
  } catch (error) {
    fail('Setup: Buyer login', error);
    return false;
  }
}

async function setupSeller() {
  try {
    // Get any seller info
    const { data: sellerData } = await supabase
      .from('sellers')
      .select('id, user_id, store_name')
      .limit(1)
      .single();

    if (!sellerData) {
      log('⚠️', 'No seller found in database - skipping seller tests');
      SELLER.sellerId = 'test-seller-id';
      SELLER.id = 'test-seller-user-id';
      return true;  // Continue anyway for buyer tests
    }
    
    SELLER.sellerId = sellerData.id;
    SELLER.id = sellerData.user_id;
    pass(`Setup: Seller info retrieved (${sellerData.store_name})`);
    return true;
  } catch (error) {
    log('⚠️', 'Seller lookup failed - using test values');
    SELLER.sellerId = 'test-seller-id';
    SELLER.id = 'test-seller-user-id';
    return true;  // Continue anyway
  }
}

// ========== TEST 1: CREATE NOTIFICATION ==========

async function test1_CreateBuyerNotification() {
  header('TEST 1: Create Buyer Notification');
  
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: BUYER.id,
        user_type: 'buyer',
        type: 'order_placed',
        title: 'Order Placed',
        message: 'Your order #TEST-001 has been placed successfully!',
        icon: 'ShoppingBag',
        icon_bg: 'bg-green-500',
        action_url: '/order/TEST-001',
        action_data: { orderId: 'test-order-id', orderNumber: 'TEST-001' },
        priority: 'normal',
        is_read: false
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('No notification created');

    testNotificationId = data.id;
    pass('Test 1.1: Created order_placed notification');
    
    // Verify notification exists
    const { data: verify } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', testNotificationId)
      .single();
    
    if (verify && verify.is_read === false) {
      pass('Test 1.2: Notification is unread by default');
    } else {
      fail('Test 1.2: Notification should be unread');
    }
    
    return true;
  } catch (error) {
    fail('Test 1: Create notification', error);
    return false;
  }
}

// ========== TEST 2: FETCH NOTIFICATIONS ==========

async function test2_FetchBuyerNotifications() {
  header('TEST 2: Fetch Buyer Notifications');
  
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', BUYER.id)
      .eq('user_type', 'buyer')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No notifications found');

    pass(`Test 2.1: Fetched ${data.length} notifications for buyer`);
    
    // Check if our test notification is in the list
    const found = data.find(n => n.id === testNotificationId);
    if (found) {
      pass('Test 2.2: Test notification found in list');
    } else {
      fail('Test 2.2: Test notification not found');
    }
    
    return true;
  } catch (error) {
    fail('Test 2: Fetch notifications', error);
    return false;
  }
}

// ========== TEST 3: UNREAD COUNT ==========

async function test3_UnreadCount() {
  header('TEST 3: Unread Count');
  
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', BUYER.id)
      .eq('user_type', 'buyer')
      .eq('is_read', false);

    if (error) throw error;
    if (count === null) throw new Error('Could not get count');

    pass(`Test 3.1: Unread count is ${count}`);
    
    if (count > 0) {
      pass('Test 3.2: Has unread notifications');
    } else {
      fail('Test 3.2: Should have unread notifications');
    }
    
    return true;
  } catch (error) {
    fail('Test 3: Unread count', error);
    return false;
  }
}

// ========== TEST 4: MARK AS READ ==========

async function test4_MarkAsRead() {
  header('TEST 4: Mark Notification As Read');
  
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', testNotificationId);

    if (error) throw error;
    pass('Test 4.1: Marked notification as read');
    
    // Verify it's marked as read
    const { data: verify } = await supabase
      .from('notifications')
      .select('is_read, read_at')
      .eq('id', testNotificationId)
      .single();
    
    if (verify && verify.is_read === true && verify.read_at) {
      pass('Test 4.2: Notification confirmed as read with timestamp');
    } else {
      fail('Test 4.2: Notification should be marked as read');
    }
    
    return true;
  } catch (error) {
    fail('Test 4: Mark as read', error);
    return false;
  }
}

// ========== TEST 5: CREATE SELLER NOTIFICATION ==========

async function test5_CreateSellerNotification() {
  header('TEST 5: Create Seller Notification');
  
  // Skip if no real seller exists
  if (SELLER.id === 'test-seller-user-id') {
    log('⏭️', 'Test 5: Skipped - no real seller in database');
    return true;
  }
  
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: SELLER.id,
        user_type: 'seller',
        type: 'seller_new_order',
        title: 'New Order Received',
        message: 'New order #TEST-001 from Anna Cruz. Total: ₱1,500',
        icon: 'ShoppingBag',
        icon_bg: 'bg-green-500',
        action_url: `/seller/orders/test-order-id`,
        action_data: { orderId: 'test-order-id' },
        priority: 'high',
        is_read: false
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('No notification created');

    pass('Test 5.1: Created seller new_order notification');
    
    // Verify seller can see their notifications
    const { data: sellerNotifs, error: fetchErr } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', SELLER.id)
      .eq('user_type', 'seller')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (fetchErr) throw fetchErr;
    
    if (sellerNotifs && sellerNotifs.length > 0) {
      pass(`Test 5.2: Seller has ${sellerNotifs.length} notifications`);
    } else {
      fail('Test 5.2: Seller should have notifications');
    }
    
    return true;
  } catch (error) {
    fail('Test 5: Seller notification', error);
    return false;
  }
}

// ========== TEST 6: ALL STATUS NOTIFICATIONS ==========

async function test6_AllStatusNotifications() {
  header('TEST 6: All Order Status Notifications');
  
  const statuses = [
    { type: 'order_confirmed', title: 'Order Confirmed', message: 'Your order has been confirmed by the seller.' },
    { type: 'order_processing', title: 'Order Processing', message: 'Your order is now being prepared.' },
    { type: 'order_shipped', title: 'Order Shipped', message: 'Your order has been shipped! Tracking: TRACK123' },
    { type: 'order_delivered', title: 'Order Delivered', message: 'Your order has been delivered! Enjoy!' },
    { type: 'order_cancelled', title: 'Order Cancelled', message: 'Your order has been cancelled.' }
  ];
  
  try {
    for (const status of statuses) {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: BUYER.id,
          user_type: 'buyer',
          type: status.type,
          title: status.title,
          message: status.message,
          icon: 'Package',
          icon_bg: 'bg-blue-500',
          action_url: '/order/TEST-002',
          priority: 'normal',
          is_read: false
        });

      if (error) throw error;
      pass(`Test 6: Created ${status.type} notification`);
    }
    
    return true;
  } catch (error) {
    fail('Test 6: Status notifications', error);
    return false;
  }
}

// ========== TEST 7: MARK ALL AS READ ==========

async function test7_MarkAllAsRead() {
  header('TEST 7: Mark All Notifications As Read');
  
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', BUYER.id)
      .eq('user_type', 'buyer')
      .eq('is_read', false);

    if (error) throw error;
    pass('Test 7.1: Marked all notifications as read');
    
    // Verify all are read
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', BUYER.id)
      .eq('user_type', 'buyer')
      .eq('is_read', false);
    
    if (count === 0) {
      pass('Test 7.2: All notifications confirmed as read');
    } else {
      fail(`Test 7.2: Still ${count} unread notifications`);
    }
    
    return true;
  } catch (error) {
    fail('Test 7: Mark all as read', error);
    return false;
  }
}

// ========== TEST 8: NOTIFICATION ORDERING ==========

async function test8_NotificationOrdering() {
  header('TEST 8: Notification Ordering');
  
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('created_at')
      .eq('user_id', BUYER.id)
      .eq('user_type', 'buyer')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    if (!data || data.length < 2) {
      pass('Test 8: Not enough notifications to test ordering');
      return true;
    }

    // Check that notifications are in descending order
    let isOrdered = true;
    for (let i = 0; i < data.length - 1; i++) {
      if (new Date(data[i].created_at) < new Date(data[i + 1].created_at)) {
        isOrdered = false;
        break;
      }
    }

    if (isOrdered) {
      pass('Test 8: Notifications are in correct chronological order (newest first)');
    } else {
      fail('Test 8: Notifications are not properly ordered');
    }
    
    return true;
  } catch (error) {
    fail('Test 8: Ordering', error);
    return false;
  }
}

// ========== CLEANUP ==========

async function cleanup() {
  header('CLEANUP');
  
  try {
    // Delete test notifications
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', BUYER.id)
      .like('message', '%TEST-001%');

    if (!error) {
      log('🧹', 'Cleaned up test notifications');
    }
    
    const { error: err2 } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', BUYER.id)
      .like('message', '%TEST-002%');

    if (!err2) {
      log('🧹', 'Cleaned up status test notifications');
    }
    
    const { error: err3 } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', SELLER.id)
      .like('message', '%TEST-001%');

    if (!err3) {
      log('🧹', 'Cleaned up seller test notifications');
    }
  } catch (error) {
    log('⚠️', 'Cleanup had issues: ' + error);
  }
}

// ========== MAIN ==========

async function runTests() {
  console.log('\n🔔 NOTIFICATION SYSTEM TEST SUITE\n');
  console.log('Testing notification functionality for the buying process...\n');

  // Setup
  const buyerOk = await setupBuyer();
  const sellerOk = await setupSeller();
  
  if (!buyerOk || !sellerOk) {
    console.log('\n❌ Setup failed. Cannot continue tests.\n');
    process.exit(1);
  }

  // Run all tests
  await test1_CreateBuyerNotification();
  await test2_FetchBuyerNotifications();
  await test3_UnreadCount();
  await test4_MarkAsRead();
  await test5_CreateSellerNotification();
  await test6_AllStatusNotifications();
  await test7_MarkAllAsRead();
  await test8_NotificationOrdering();

  // Cleanup
  await cleanup();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Total:  ${testsPassed + testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All notification tests passed!\n');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

runTests().catch(console.error);
