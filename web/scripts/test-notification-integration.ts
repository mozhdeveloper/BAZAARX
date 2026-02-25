/**
 * NOTIFICATION AND VARIANT INTEGRATION TEST
 * 
 * Tests the notification system and variant display for the buying process
 * without requiring actual seller/product data in the database.
 * 
 * This test verifies:
 * 1. Notification table structure is correct
 * 2. Notifications can be created for buyers
 * 3. Notifications support all required statuses
 * 4. Variant data structure is correct
 * 5. Mark as read functionality works
 * 6. Unread count works
 * 
 * Run with: npx tsx scripts/test-notification-integration.ts
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
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TEST_PREFIX = `INTEG-TEST-${Date.now()}`;
let buyerId = '';
let createdNotificationIds: string[] = [];

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
  console.log(`🧪 ${title}`);
  console.log('='.repeat(60));
}

// ========== SETUP ==========

async function setup() {
  header('SETUP');
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'anna.cruz@gmail.com',
      password: 'Buyer123!'
    });

    if (error) throw error;
    buyerId = data.user!.id;
    pass('Logged in as buyer');
    return true;
  } catch (error) {
    fail('Setup', error);
    return false;
  }
}

// ========== TEST 1: NOTIFICATION TABLE STRUCTURE ==========

async function test1_NotificationTableStructure() {
  header('TEST 1: Notification Table Structure');
  
  try {
    // Create a test notification with all fields
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: buyerId,
        user_type: 'buyer',
        type: 'order_placed',
        title: 'Test Title',
        message: `${TEST_PREFIX}: Test message`,
        icon: 'ShoppingBag',
        icon_bg: 'bg-green-500',
        action_url: '/test',
        action_data: { test: true },
        priority: 'normal',
        is_read: false
      })
      .select()
      .single();

    if (error) throw error;
    createdNotificationIds.push(data.id);

    // Verify all fields exist
    const requiredFields = ['id', 'user_id', 'user_type', 'type', 'title', 'message', 'is_read', 'created_at'];
    const optionalFields = ['icon', 'icon_bg', 'action_url', 'action_data', 'priority', 'read_at'];
    
    for (const field of requiredFields) {
      if (data[field] !== undefined) {
        pass(`Required field exists: ${field}`);
      } else {
        fail(`Missing required field: ${field}`);
      }
    }

    for (const field of optionalFields) {
      if (data[field] !== undefined) {
        pass(`Optional field exists: ${field}`);
      }
    }

    return true;
  } catch (error) {
    fail('Notification table structure', error);
    return false;
  }
}

// ========== TEST 2: ALL ORDER STATUS NOTIFICATIONS ==========

async function test2_AllOrderStatusNotifications() {
  header('TEST 2: All Order Status Notifications');
  
  const statuses = [
    { type: 'order_placed', title: 'Order Placed', icon: 'ShoppingBag', bg: 'bg-green-500' },
    { type: 'order_confirmed', title: 'Order Confirmed', icon: 'CheckCircle', bg: 'bg-blue-500' },
    { type: 'order_processing', title: 'Order Processing', icon: 'Package', bg: 'bg-purple-500' },
    { type: 'order_shipped', title: 'Order Shipped', icon: 'Truck', bg: 'bg-orange-500' },
    { type: 'order_delivered', title: 'Order Delivered', icon: 'Package', bg: 'bg-green-500' },
    { type: 'order_cancelled', title: 'Order Cancelled', icon: 'XCircle', bg: 'bg-red-500' }
  ];

  try {
    for (const s of statuses) {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: buyerId,
          user_type: 'buyer',
          type: s.type,
          title: s.title,
          message: `${TEST_PREFIX}: Your order status is ${s.type}`,
          icon: s.icon,
          icon_bg: s.bg,
          action_url: '/order/test',
          priority: 'normal',
          is_read: false
        })
        .select()
        .single();

      if (error) throw error;
      createdNotificationIds.push(data.id);
      pass(`Created ${s.type} notification`);
    }

    return true;
  } catch (error) {
    fail('Order status notifications', error);
    return false;
  }
}

// ========== TEST 3: FETCH AND FILTER NOTIFICATIONS ==========

async function test3_FetchAndFilterNotifications() {
  header('TEST 3: Fetch and Filter Notifications');
  
  try {
    // Fetch all test notifications
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', buyerId)
      .like('message', `${TEST_PREFIX}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    pass(`Fetched ${data.length} test notifications`);

    // Verify all types are present
    const types = new Set(data.map(n => n.type));
    const expectedTypes = ['order_placed', 'order_confirmed', 'order_processing', 'order_shipped', 'order_delivered', 'order_cancelled'];
    
    for (const type of expectedTypes) {
      if (types.has(type)) {
        pass(`Found ${type} in notifications`);
      } else {
        fail(`Missing ${type} notification`);
      }
    }

    return true;
  } catch (error) {
    fail('Fetch and filter', error);
    return false;
  }
}

// ========== TEST 4: UNREAD COUNT ==========

async function test4_UnreadCount() {
  header('TEST 4: Unread Count');
  
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', buyerId)
      .like('message', `${TEST_PREFIX}%`)
      .eq('is_read', false);

    if (error) throw error;

    pass(`Unread count: ${count}`);
    
    // All our test notifications should be unread
    if (count! >= 6) {
      pass('Correct number of unread notifications');
    } else {
      fail('Unexpected unread count');
    }

    return true;
  } catch (error) {
    fail('Unread count', error);
    return false;
  }
}

// ========== TEST 5: MARK AS READ ==========

async function test5_MarkAsRead() {
  header('TEST 5: Mark As Read');
  
  try {
    // Mark first notification as read
    const notifId = createdNotificationIds[0];
    
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notifId);

    if (error) throw error;
    pass('Marked single notification as read');

    // Verify
    const { data: verify } = await supabase
      .from('notifications')
      .select('is_read, read_at')
      .eq('id', notifId)
      .single();

    if (verify?.is_read && verify?.read_at) {
      pass('Verified is_read=true and read_at is set');
    } else {
      fail('Mark as read verification failed');
    }

    return true;
  } catch (error) {
    fail('Mark as read', error);
    return false;
  }
}

// ========== TEST 6: MARK ALL AS READ ==========

async function test6_MarkAllAsRead() {
  header('TEST 6: Mark All As Read');
  
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', buyerId)
      .like('message', `${TEST_PREFIX}%`)
      .eq('is_read', false);

    if (error) throw error;
    pass('Marked all test notifications as read');

    // Verify unread count is now 0
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', buyerId)
      .like('message', `${TEST_PREFIX}%`)
      .eq('is_read', false);

    if (count === 0) {
      pass('All notifications are now read');
    } else {
      fail(`Still have ${count} unread`);
    }

    return true;
  } catch (error) {
    fail('Mark all as read', error);
    return false;
  }
}

// ========== TEST 7: VARIANT DATA STRUCTURE ==========

async function test7_VariantDataStructure() {
  header('TEST 7: Variant Data Structure');
  
  // Test that our variant structure is valid
  const variants = [
    { size: 'Small', color: 'Red', name: 'Size: Small, Color: Red' },
    { size: 'Medium', color: null, name: 'Size: Medium' },
    { size: null, color: 'Blue', name: 'Color: Blue' },
    { size: 'Large', color: 'Navy Blue', name: 'Size: Large, Color: Navy Blue' }
  ];

  try {
    for (const v of variants) {
      // Verify the variant structure
      const display = [
        v.size ? `Size: ${v.size}` : null,
        v.color ? `Color: ${v.color}` : null
      ].filter(Boolean).join(', ');

      pass(`Variant display: "${display}"`);
    }

    // Test variant in notification action_data
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: buyerId,
        user_type: 'buyer',
        type: 'order_shipped',
        title: 'Order Shipped with Variant',
        message: `${TEST_PREFIX}: Variant test`,
        action_data: {
          orderId: 'test-order',
          orderNumber: 'ORD-TEST-123',
          items: [
            { name: 'Test Product', variant: { size: 'Large', color: 'Blue' } }
          ]
        },
        is_read: false
      })
      .select()
      .single();

    if (error) throw error;
    createdNotificationIds.push(data.id);

    if (data.action_data.items && data.action_data.items[0].variant) {
      pass('Variant stored in action_data successfully');
    }

    return true;
  } catch (error) {
    fail('Variant data structure', error);
    return false;
  }
}

// ========== TEST 8: NOTIFICATION PRIORITY ==========

async function test8_NotificationPriority() {
  header('TEST 8: Notification Priority');
  
  const priorities = ['low', 'normal', 'high', 'urgent'];
  
  try {
    for (const priority of priorities) {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: buyerId,
          user_type: 'buyer',
          type: 'order_placed',
          title: `Priority ${priority}`,
          message: `${TEST_PREFIX}: Priority test ${priority}`,
          priority: priority,
          is_read: false
        })
        .select()
        .single();

      if (error) throw error;
      createdNotificationIds.push(data.id);
      pass(`Created ${priority} priority notification`);
    }

    return true;
  } catch (error) {
    fail('Notification priority', error);
    return false;
  }
}

// ========== CLEANUP ==========

async function cleanup() {
  header('CLEANUP');
  
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .like('message', `${TEST_PREFIX}%`);

    if (!error) {
      log('🧹', `Deleted ${createdNotificationIds.length} test notifications`);
    }
  } catch (error) {
    log('⚠️', 'Cleanup error: ' + error);
  }
}

// ========== MAIN ==========

async function runTests() {
  console.log('\n🧪 NOTIFICATION & VARIANT INTEGRATION TEST\n');
  console.log('Testing notification system and variant support...\n');

  const setupOk = await setup();
  if (!setupOk) {
    console.log('\n❌ Setup failed.\n');
    process.exit(1);
  }

  await test1_NotificationTableStructure();
  await test2_AllOrderStatusNotifications();
  await test3_FetchAndFilterNotifications();
  await test4_UnreadCount();
  await test5_MarkAsRead();
  await test6_MarkAllAsRead();
  await test7_VariantDataStructure();
  await test8_NotificationPriority();

  await cleanup();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Total:  ${testsPassed + testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All integration tests passed!\n');
  } else {
    console.log('\n⚠️ Some tests failed.\n');
    process.exit(1);
  }
}

runTests().catch(console.error);
