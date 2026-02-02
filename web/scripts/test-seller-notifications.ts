/**
 * Seller Notification System Test Script
 * 
 * Tests all seller notification scenarios:
 * 1. New order notifications
 * 2. Chat message notifications
 * 3. QA approval notifications (product approved)
 * 4. Sample request notifications
 * 5. Product rejection notifications
 * 6. Revision request notifications
 * 
 * Run: npx ts-node scripts/test-seller-notifications.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Try multiple env file locations
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

class SellerNotificationTester {
  private results: TestResult[] = [];
  private testSellerId: string | null = null;
  private testProductId: string | null = null;
  private testBuyerId: string | null = null;

  private log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warn: '⚠️'
    };
    console.log(`${prefix[type]} ${message}`);
  }

  private async test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      this.results.push({ name, passed: true });
      this.log(`${name}`, 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.results.push({ name, passed: false, error: errorMessage });
      this.log(`${name}: ${errorMessage}`, 'error');
    }
  }

  async setup() {
    this.log('Setting up test data...', 'info');

    // Get a seller
    const { data: sellers } = await supabase
      .from('sellers')
      .select('id, store_name')
      .limit(1)
      .single();

    if (sellers) {
      this.testSellerId = sellers.id;
      this.log(`Using seller: ${sellers.store_name} (${sellers.id})`, 'info');
    } else {
      this.log('No sellers found in database', 'warn');
    }

    // Get a product for this seller
    if (this.testSellerId) {
      const { data: product } = await supabase
        .from('products')
        .select('id, name')
        .eq('seller_id', this.testSellerId)
        .limit(1)
        .single();

      if (product) {
        this.testProductId = product.id;
        this.log(`Using product: ${product.name} (${product.id})`, 'info');
      }
    }

    // Get a buyer
    const { data: buyer } = await supabase
      .from('profiles')
      .select('id, full_name')
      .limit(1)
      .single();

    if (buyer) {
      this.testBuyerId = buyer.id;
      this.log(`Using buyer: ${buyer.full_name} (${buyer.id})`, 'info');
    }
  }

  async cleanup() {
    // Clean up test notifications
    if (this.testSellerId) {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', this.testSellerId)
        .like('title', '%TEST%');
    }
  }

  async runTests() {
    console.log('\n========================================');
    console.log('  SELLER NOTIFICATION SYSTEM TESTS');
    console.log('========================================\n');

    await this.setup();

    if (!this.testSellerId) {
      this.log('Cannot run tests without a seller in the database', 'error');
      return;
    }

    // Test 1: Create new order notification
    await this.test('Create new order notification', async () => {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: this.testSellerId,
          user_type: 'seller',
          type: 'seller_new_order',
          title: '[TEST] New Order Received',
          message: 'New order #TEST-001 from Test Customer. Total: ₱1,500',
          icon: 'ShoppingBag',
          icon_bg: 'bg-green-500',
          action_url: '/seller/orders',
          action_data: { orderId: 'test-order-id' },
          priority: 'high',
          is_read: false
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No notification created');
      if (data.type !== 'seller_new_order') throw new Error('Wrong notification type');
    });

    // Test 2: Create chat message notification
    await this.test('Create chat message notification', async () => {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: this.testSellerId,
          user_type: 'seller',
          type: 'seller_new_message',
          title: '[TEST] New Message',
          message: 'Test Customer: Hi, I have a question about your product...',
          icon: 'MessageSquare',
          icon_bg: 'bg-blue-500',
          action_url: '/seller/messages',
          action_data: { conversationId: 'test-conv-id' },
          priority: 'normal',
          is_read: false
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No notification created');
      if (data.type !== 'seller_new_message') throw new Error('Wrong notification type');
    });

    // Test 3: Create sample request notification
    await this.test('Create sample request notification', async () => {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: this.testSellerId,
          user_type: 'seller',
          type: 'product_sample_request',
          title: '[TEST] Sample Requested',
          message: 'Your product "Test Product" has been digitally approved. Please submit a physical sample for quality review.',
          icon: 'Package',
          icon_bg: 'bg-purple-500',
          action_url: '/seller/product-status-qa',
          action_data: { productId: this.testProductId || 'test-product-id' },
          priority: 'high',
          is_read: false
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No notification created');
      if (data.type !== 'product_sample_request') throw new Error('Wrong notification type');
    });

    // Test 4: Create product approved notification
    await this.test('Create product approved notification', async () => {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: this.testSellerId,
          user_type: 'seller',
          type: 'product_approved',
          title: '[TEST] Product Approved! 🎉',
          message: 'Great news! Your product "Test Product" has passed quality review and is now live on the marketplace.',
          icon: 'CheckCircle',
          icon_bg: 'bg-green-500',
          action_url: '/seller/products',
          action_data: { productId: this.testProductId || 'test-product-id' },
          priority: 'high',
          is_read: false
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No notification created');
      if (data.type !== 'product_approved') throw new Error('Wrong notification type');
    });

    // Test 5: Create product rejected notification
    await this.test('Create product rejected notification', async () => {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: this.testSellerId,
          user_type: 'seller',
          type: 'product_rejected',
          title: '[TEST] Product Rejected',
          message: 'Your product "Test Product" was rejected during digital review. Reason: Images do not meet quality standards',
          icon: 'XCircle',
          icon_bg: 'bg-red-500',
          action_url: '/seller/product-status-qa',
          action_data: { productId: this.testProductId || 'test-product-id' },
          priority: 'high',
          is_read: false
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No notification created');
      if (data.type !== 'product_rejected') throw new Error('Wrong notification type');
    });

    // Test 6: Create revision requested notification
    await this.test('Create revision requested notification', async () => {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: this.testSellerId,
          user_type: 'seller',
          type: 'product_revision_requested',
          title: '[TEST] Revision Requested',
          message: 'Please update your product "Test Product". Feedback: Please add more product photos',
          icon: 'AlertCircle',
          icon_bg: 'bg-yellow-500',
          action_url: '/seller/products',
          action_data: { productId: this.testProductId || 'test-product-id' },
          priority: 'high',
          is_read: false
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No notification created');
      if (data.type !== 'product_revision_requested') throw new Error('Wrong notification type');
    });

    // Test 7: Fetch seller notifications
    await this.test('Fetch seller notifications', async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', this.testSellerId)
        .eq('user_type', 'seller')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('No notifications found');
      
      // We should have at least the 6 test notifications we created
      const testNotifs = data.filter(n => n.title.includes('[TEST]'));
      if (testNotifs.length < 6) throw new Error(`Expected at least 6 test notifications, got ${testNotifs.length}`);
    });

    // Test 8: Get unread count
    await this.test('Get unread notification count', async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.testSellerId)
        .eq('user_type', 'seller')
        .eq('is_read', false);

      if (error) throw error;
      if (count === null) throw new Error('Could not get count');
      if (count < 6) throw new Error(`Expected at least 6 unread, got ${count}`);
    });

    // Test 9: Mark notification as read
    await this.test('Mark notification as read', async () => {
      // Get one of our test notifications
      const { data: notifs } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', this.testSellerId)
        .like('title', '%[TEST]%')
        .limit(1)
        .single();

      if (!notifs) throw new Error('No notification to mark as read');

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notifs.id);

      if (error) throw error;

      // Verify it's marked as read
      const { data: updated } = await supabase
        .from('notifications')
        .select('is_read')
        .eq('id', notifs.id)
        .single();

      if (!updated?.is_read) throw new Error('Notification not marked as read');
    });

    // Test 10: Mark all as read
    await this.test('Mark all notifications as read', async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', this.testSellerId)
        .eq('user_type', 'seller')
        .like('title', '%[TEST]%');

      if (error) throw error;

      // Verify all are read
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.testSellerId)
        .like('title', '%[TEST]%')
        .eq('is_read', false);

      if (count && count > 0) throw new Error(`${count} notifications still unread`);
    });

    // Test 11: Delete notification
    await this.test('Delete notification', async () => {
      // Get one test notification
      const { data: notif } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', this.testSellerId)
        .like('title', '%[TEST]%')
        .limit(1)
        .single();

      if (!notif) throw new Error('No notification to delete');

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notif.id);

      if (error) throw error;

      // Verify deletion
      const { data: deleted } = await supabase
        .from('notifications')
        .select('id')
        .eq('id', notif.id)
        .single();

      if (deleted) throw new Error('Notification not deleted');
    });

    // Test 12: Notification priority filtering
    await this.test('Filter by priority (high)', async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', this.testSellerId)
        .eq('priority', 'high');

      if (error) throw error;
      // Just verify query works, don't fail if no high priority
    });

    // Test 13: Notification type filtering
    await this.test('Filter by type (seller_new_order)', async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', this.testSellerId)
        .eq('type', 'seller_new_order');

      if (error) throw error;
      // At least one from our tests
    });

    // Cleanup test data
    await this.cleanup();

    // Print summary
    this.printSummary();
  }

  private printSummary() {
    console.log('\n========================================');
    console.log('  TEST SUMMARY');
    console.log('========================================\n');

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

    if (failed > 0) {
      console.log('Failed Tests:');
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  ❌ ${r.name}: ${r.error}`);
      });
    }

    console.log('\n========================================');
    console.log(failed === 0 ? '  ✅ ALL TESTS PASSED!' : '  ⚠️ SOME TESTS FAILED');
    console.log('========================================\n');
  }
}

// Run tests
const tester = new SellerNotificationTester();
tester.runTests().catch(console.error);
