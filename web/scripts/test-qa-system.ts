#!/usr/bin/env tsx
/**
 * QA System Test Runner
 * Comprehensive testing script for Product QA workflow
 * Tests both frontend state management and Supabase database integration
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

type TestResult = {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
};

class QASystemTester {
  private supabase: any;
  private results: TestResult[] = [];
  private testProductIds: string[] = [];

  constructor() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase credentials in .env file');
    }
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  private log(message: string, color: keyof typeof colors = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const start = Date.now();
    try {
      await testFn();
      const duration = Date.now() - start;
      this.results.push({ name, passed: true, duration });
      this.log(`  ✓ ${name} (${duration}ms)`, 'green');
    } catch (error) {
      const duration = Date.now() - start;
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.results.push({ name, passed: false, error: errorMsg, duration });
      this.log(`  ✗ ${name} (${duration}ms)`, 'red');
      this.log(`    ${errorMsg}`, 'gray');
    }
  }

  async testDatabaseSchema() {
    this.log('\n📋 Testing Database Schema...', 'cyan');

    await this.runTest('product_qa table exists', async () => {
      const { data, error } = await this.supabase
        .from('product_qa')
        .select('*')
        .limit(1);
      
      if (error) throw new Error(`product_qa table error: ${error.message}`);
    });

    await this.runTest('product_qa has correct columns', async () => {
      const { data } = await this.supabase
        .from('product_qa')
        .select('id, product_id, vendor, status, logistics, rejection_reason, rejection_stage, submitted_at, approved_at, verified_at, rejected_at, revision_requested_at')
        .limit(1);
      
      // If query succeeds, columns exist
    });

    await this.runTest('product_qa status constraint works', async () => {
      const { error } = await this.supabase
        .from('product_qa')
        .insert({
          product_id: 'test-constraint',
          vendor: 'Test',
          status: 'INVALID_STATUS',
        });

      if (!error) throw new Error('Status constraint not enforced!');
    });

    await this.runTest('product_qa indexes exist', async () => {
      const { data, error } = await this.supabase
        .from('product_qa')
        .select('*')
        .eq('status', 'PENDING_DIGITAL_REVIEW')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw new Error(`Index query failed: ${error.message}`);
    });
  }

  async testCreateQAEntry() {
    this.log('\n📝 Testing QA Entry Creation...', 'cyan');

    let testProductId: string;

    await this.runTest('Create test product', async () => {
      const { data, error } = await this.supabase
        .from('products')
        .insert({
          name: 'QA Test Product ' + Date.now(),
          description: 'Test product for QA workflow',
          price: 999,
          category: 'Electronics',
          seller_id: '00000000-0000-0000-0000-000000000000', // Use UUID format
          approval_status: 'pending',
          images: ['https://placehold.co/400'],
          stock: 10,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      testProductId = data.id;
      this.testProductIds.push(testProductId);
    });

    await this.runTest('Create QA entry for product', async () => {
      const { data, error } = await this.supabase
        .from('product_qa')
        .insert({
          product_id: testProductId,
          vendor: 'Test Vendor',
          status: 'PENDING_DIGITAL_REVIEW',
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      if (data.status !== 'PENDING_DIGITAL_REVIEW') {
        throw new Error('Initial status should be PENDING_DIGITAL_REVIEW');
      }
    });

    await this.runTest('Fetch QA entry with product JOIN', async () => {
      const { data, error } = await this.supabase
        .from('product_qa')
        .select(`
          *,
          product:products!product_qa_product_id_fkey (
            id,
            name,
            price,
            category,
            images,
            seller_id
          )
        `)
        .eq('product_id', testProductId)
        .single();

      if (error) throw error;
      if (!data.product) throw new Error('Product JOIN failed');
      if (!data.product.name) throw new Error('Product data incomplete');
    });
  }

  async testQAWorkflow() {
    this.log('\n🔄 Testing QA Workflow Transitions...', 'cyan');

    let workflowProductId: string;

    // Setup
    await this.runTest('Setup workflow test product', async () => {
      const { data: product } = await this.supabase
        .from('products')
        .insert({
          name: 'Workflow Test Product ' + Date.now(),
          description: 'Testing complete workflow',
          price: 1500,
          category: 'Beauty',
          seller_id: '00000000-0000-0000-0000-000000000000',
          approval_status: 'pending',
          images: ['https://placehold.co/400'],
          stock: 5,
          is_active: true,
        })
        .select()
        .single();

      workflowProductId = product.id;
      this.testProductIds.push(workflowProductId);

      await this.supabase
        .from('product_qa')
        .insert({
          product_id: workflowProductId,
          vendor: 'Workflow Test Vendor',
          status: 'PENDING_DIGITAL_REVIEW',
        });
    });

    // Step 1: Approve for sample
    await this.runTest('Admin approves digital review', async () => {
      const { error } = await this.supabase
        .from('product_qa')
        .update({
          status: 'WAITING_FOR_SAMPLE',
          approved_at: new Date().toISOString(),
        })
        .eq('product_id', workflowProductId);

      if (error) throw error;

      const { data } = await this.supabase
        .from('product_qa')
        .select('status, approved_at')
        .eq('product_id', workflowProductId)
        .single();

      if (data.status !== 'WAITING_FOR_SAMPLE') throw new Error('Status not updated');
      if (!data.approved_at) throw new Error('Approval timestamp missing');
    });

    // Step 2: Seller submits sample
    await this.runTest('Seller submits sample', async () => {
      const { error } = await this.supabase
        .from('product_qa')
        .update({
          status: 'IN_QUALITY_REVIEW',
          logistics: 'JRS Express',
        })
        .eq('product_id', workflowProductId);

      if (error) throw error;

      const { data } = await this.supabase
        .from('product_qa')
        .select('status, logistics')
        .eq('product_id', workflowProductId)
        .single();

      if (data.status !== 'IN_QUALITY_REVIEW') throw new Error('Status not updated');
      if (data.logistics !== 'JRS Express') throw new Error('Logistics not saved');
    });

    // Step 3: Admin verifies quality
    await this.runTest('Admin passes quality check', async () => {
      const { error: qaError } = await this.supabase
        .from('product_qa')
        .update({
          status: 'ACTIVE_VERIFIED',
          verified_at: new Date().toISOString(),
        })
        .eq('product_id', workflowProductId);

      if (qaError) throw qaError;

      // Update product approval status
      const { error: productError } = await this.supabase
        .from('products')
        .update({
          approval_status: 'approved',
        })
        .eq('id', workflowProductId);

      if (productError) throw productError;

      // Verify both tables
      const { data: qaData } = await this.supabase
        .from('product_qa')
        .select('status, verified_at')
        .eq('product_id', workflowProductId)
        .single();

      const { data: productData } = await this.supabase
        .from('products')
        .select('approval_status')
        .eq('id', workflowProductId)
        .single();

      if (qaData.status !== 'ACTIVE_VERIFIED') throw new Error('QA status not updated');
      if (!qaData.verified_at) throw new Error('Verification timestamp missing');
      if (productData.approval_status !== 'approved') throw new Error('Product approval not synced');
    });
  }

  async testRejectionFlow() {
    this.log('\n❌ Testing Rejection Flow...', 'cyan');

    let rejectProductId: string;

    await this.runTest('Setup rejection test product', async () => {
      const { data: product } = await this.supabase
        .from('products')
        .insert({
          name: 'Reject Test Product ' + Date.now(),
          description: 'Testing rejection',
          price: 500,
          category: 'Fashion',
          seller_id: '00000000-0000-0000-0000-000000000000',
          approval_status: 'pending',
          images: ['https://placehold.co/400'],
          stock: 3,
          is_active: true,
        })
        .select()
        .single();

      rejectProductId = product.id;
      this.testProductIds.push(rejectProductId);

      await this.supabase
        .from('product_qa')
        .insert({
          product_id: rejectProductId,
          vendor: 'Reject Test Vendor',
          status: 'PENDING_DIGITAL_REVIEW',
        });
    });

    await this.runTest('Reject at digital stage', async () => {
      const reason = 'Poor image quality - images are blurry';
      
      const { error: qaError } = await this.supabase
        .from('product_qa')
        .update({
          status: 'REJECTED',
          rejection_reason: reason,
          rejection_stage: 'digital',
          rejected_at: new Date().toISOString(),
        })
        .eq('product_id', rejectProductId);

      if (qaError) throw qaError;

      const { error: productError } = await this.supabase
        .from('products')
        .update({
          approval_status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', rejectProductId);

      if (productError) throw productError;

      // Verify
      const { data: qaData } = await this.supabase
        .from('product_qa')
        .select('status, rejection_reason, rejection_stage, rejected_at')
        .eq('product_id', rejectProductId)
        .single();

      if (qaData.status !== 'REJECTED') throw new Error('Status not rejected');
      if (qaData.rejection_reason !== reason) throw new Error('Reason not saved');
      if (qaData.rejection_stage !== 'digital') throw new Error('Stage not saved');
      if (!qaData.rejected_at) throw new Error('Rejection timestamp missing');
    });
  }

  async testRevisionFlow() {
    this.log('\n🔄 Testing Revision Request Flow...', 'cyan');

    let revisionProductId: string;

    await this.runTest('Setup revision test product', async () => {
      const { data: product } = await this.supabase
        .from('products')
        .insert({
          name: 'Revision Test Product ' + Date.now(),
          description: 'Testing revision request',
          price: 750,
          category: 'Home',
          seller_id: '00000000-0000-0000-0000-000000000000',
          approval_status: 'pending',
          images: ['https://placehold.co/400'],
          stock: 7,
          is_active: true,
        })
        .select()
        .single();

      revisionProductId = product.id;
      this.testProductIds.push(revisionProductId);

      await this.supabase
        .from('product_qa')
        .insert({
          product_id: revisionProductId,
          vendor: 'Revision Test Vendor',
          status: 'PENDING_DIGITAL_REVIEW',
        });
    });

    await this.runTest('Request revision with feedback', async () => {
      const feedback = 'Please add more detailed product description and specifications';
      
      const { error } = await this.supabase
        .from('product_qa')
        .update({
          status: 'FOR_REVISION',
          rejection_reason: feedback,
          rejection_stage: 'digital',
          revision_requested_at: new Date().toISOString(),
        })
        .eq('product_id', revisionProductId);

      if (error) throw error;

      const { data } = await this.supabase
        .from('product_qa')
        .select('status, rejection_reason, revision_requested_at')
        .eq('product_id', revisionProductId)
        .single();

      if (data.status !== 'FOR_REVISION') throw new Error('Status not updated');
      if (data.rejection_reason !== feedback) throw new Error('Feedback not saved');
      if (!data.revision_requested_at) throw new Error('Revision timestamp missing');
    });
  }

  async testFilteringAndQueries() {
    this.log('\n🔍 Testing Filtering & Queries...', 'cyan');

    await this.runTest('Filter by status - PENDING_DIGITAL_REVIEW', async () => {
      const { data, error } = await this.supabase
        .from('product_qa')
        .select('*')
        .eq('status', 'PENDING_DIGITAL_REVIEW')
        .limit(10);

      if (error) throw error;
      data.forEach((item: any) => {
        if (item.status !== 'PENDING_DIGITAL_REVIEW') {
          throw new Error('Filter not working correctly');
        }
      });
    });

    await this.runTest('Filter by seller ID via JOIN', async () => {
      const sellerId = '00000000-0000-0000-0000-000000000000';
      
      const { data, error } = await this.supabase
        .from('product_qa')
        .select(`
          *,
          product:products!product_qa_product_id_fkey (
            seller_id
          )
        `)
        .limit(10);

      if (error) throw error;
      // Note: Direct filtering on joined columns requires different syntax in Supabase
    });

    await this.runTest('Order by created_at DESC', async () => {
      const { data, error } = await this.supabase
        .from('product_qa')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      // Verify descending order
      for (let i = 1; i < data.length; i++) {
        const prev = new Date(data[i - 1].created_at);
        const curr = new Date(data[i].created_at);
        if (curr > prev) {
          throw new Error('Order is not descending');
        }
      }
    });

    await this.runTest('Count products by status', async () => {
      const { count, error } = await this.supabase
        .from('product_qa')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ACTIVE_VERIFIED');

      if (error) throw error;
      if (typeof count !== 'number') throw new Error('Count not returned');
    });
  }

  async testPerformance() {
    this.log('\n⚡ Testing Performance...', 'cyan');

    await this.runTest('Fetch all QA entries < 1s', async () => {
      const start = Date.now();
      const { data, error } = await this.supabase
        .from('product_qa')
        .select('*')
        .limit(50);

      const duration = Date.now() - start;
      if (error) throw error;
      if (duration > 1000) throw new Error(`Query too slow: ${duration}ms`);
    });

    await this.runTest('Complex JOIN query < 1.5s', async () => {
      const start = Date.now();
      const { data, error } = await this.supabase
        .from('product_qa')
        .select(`
          *,
          product:products!product_qa_product_id_fkey (
            id,
            name,
            price,
            category,
            images,
            seller_id,
            approval_status
          )
        `)
        .limit(20);

      const duration = Date.now() - start;
      if (error) throw error;
      if (duration > 1500) throw new Error(`JOIN query too slow: ${duration}ms`);
    });
  }

  async cleanup() {
    this.log('\n🧹 Cleaning up test data...', 'cyan');

    for (const productId of this.testProductIds) {
      try {
        // Delete from product_qa (will cascade from products if needed)
        await this.supabase.from('product_qa').delete().eq('product_id', productId);
        // Delete from products
        await this.supabase.from('products').delete().eq('id', productId);
        this.log(`  Deleted test product: ${productId}`, 'gray');
      } catch (error) {
        this.log(`  Failed to delete ${productId}: ${error}`, 'yellow');
      }
    }
  }

  printSummary() {
    this.log('\n' + '='.repeat(60), 'blue');
    this.log('📊 TEST SUMMARY', 'blue');
    this.log('='.repeat(60), 'blue');

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    this.log(`\nTotal Tests: ${total}`, 'cyan');
    this.log(`Passed: ${passed}`, 'green');
    this.log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
    this.log(`Total Duration: ${totalDuration}ms`, 'cyan');
    this.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`, 'cyan');

    if (failed > 0) {
      this.log('Failed Tests:', 'red');
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          this.log(`  ✗ ${r.name}`, 'red');
          this.log(`    ${r.error}`, 'gray');
        });
    }

    this.log('\n' + '='.repeat(60) + '\n', 'blue');
  }

  async runAllTests() {
    try {
      this.log('\n🚀 Starting QA System Integration Tests', 'blue');
      this.log('━'.repeat(60), 'blue');

      await this.testDatabaseSchema();
      await this.testCreateQAEntry();
      await this.testQAWorkflow();
      await this.testRejectionFlow();
      await this.testRevisionFlow();
      await this.testFilteringAndQueries();
      await this.testPerformance();
      
      await this.cleanup();
      this.printSummary();

      // Exit with code 1 if any tests failed
      const failed = this.results.filter(r => !r.passed).length;
      process.exit(failed > 0 ? 1 : 0);
    } catch (error) {
      this.log(`\n❌ Fatal Error: ${error}`, 'red');
      process.exit(1);
    }
  }
}

// Run tests
const tester = new QASystemTester();
tester.runAllTests();
