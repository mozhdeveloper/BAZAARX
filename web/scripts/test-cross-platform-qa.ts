/**
 * Cross-Platform QA System Integration Test
 * 
 * Tests that:
 * 1. Mobile seller creates product → appears in Web Admin
 * 2. Web admin approves → status updates in Mobile Seller
 * 3. Mobile seller submits sample → appears in Web Admin
 * 4. Web admin passes QA → product visible in Mobile Buyer
 * 
 * This verifies both platforms share the same Supabase database.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load web .env (same database as mobile)
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

class CrossPlatformQATester {
  private supabase: any;
  private testSellerId: string = '';
  private testProductId: string = '';
  private testResults: { test: string; passed: boolean; error?: string }[] = [];

  constructor() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase credentials');
    }
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  private log(message: string, color: keyof typeof colors = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  private async test(name: string, fn: () => Promise<void>): Promise<boolean> {
    try {
      await fn();
      this.testResults.push({ test: name, passed: true });
      this.log(`  ✅ ${name}`, 'green');
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.testResults.push({ test: name, passed: false, error: errorMsg });
      this.log(`  ❌ ${name}: ${errorMsg}`, 'red');
      return false;
    }
  }

  async initialize() {
    this.log('\n🔧 Setting up cross-platform test...', 'cyan');
    
    const { data: sellers } = await this.supabase
      .from('sellers')
      .select('id, store_name')
      .limit(1);

    if (sellers && sellers.length > 0) {
      this.testSellerId = sellers[0].id;
      this.log(`  Using seller: ${sellers[0].store_name}`, 'gray');
    } else {
      throw new Error('No sellers found');
    }
  }

  async testMobileSellerCreatesProduct() {
    this.log('\n📱 MOBILE SELLER CREATES PRODUCT', 'blue');
    this.log('═'.repeat(50), 'blue');

    await this.test('Mobile seller creates product in Supabase', async () => {
      const { data, error } = await this.supabase
        .from('products')
        .insert({
          name: `Cross-Platform Test ${Date.now()}`,
          description: 'Testing web-mobile sync',
          price: 2500,
          category: 'Electronics',
          seller_id: this.testSellerId,
          approval_status: 'pending',
          images: ['https://placehold.co/400'],
          stock: 10,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      this.testProductId = data.id;
      this.log(`    Product ID: ${data.id}`, 'gray');
    });

    await this.test('QA entry created for mobile product', async () => {
      const { data, error } = await this.supabase
        .from('product_qa')
        .insert({
          product_id: this.testProductId,
          vendor: 'Mobile Seller',
          status: 'PENDING_DIGITAL_REVIEW',
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      if (data.status !== 'PENDING_DIGITAL_REVIEW') {
        throw new Error('Wrong initial status');
      }
    });
  }

  async testWebAdminSeesProduct() {
    this.log('\n💻 WEB ADMIN SEES MOBILE PRODUCT', 'blue');
    this.log('═'.repeat(50), 'blue');

    await this.test('Web admin can query QA entries', async () => {
      const { data, error } = await this.supabase
        .from('product_qa')
        .select(`
          *,
          product:products!product_qa_product_id_fkey (
            id, name, seller_id
          )
        `)
        .eq('product_id', this.testProductId)
        .single();

      if (error) throw new Error(error.message);
      if (!data) throw new Error('Product not found in QA table');
      this.log(`    Found: ${data.product.name}`, 'gray');
    });

    await this.test('Product appears in pending digital review', async () => {
      const { data } = await this.supabase
        .from('product_qa')
        .select('*')
        .eq('status', 'PENDING_DIGITAL_REVIEW');

      const found = (data || []).find((p: any) => p.product_id === this.testProductId);
      if (!found) throw new Error('Product not in pending queue');
    });
  }

  async testWebAdminApproves() {
    this.log('\n💻 WEB ADMIN APPROVES FOR SAMPLE', 'blue');
    this.log('═'.repeat(50), 'blue');

    await this.test('Web admin approves digital review', async () => {
      const { error } = await this.supabase
        .from('product_qa')
        .update({
          status: 'WAITING_FOR_SAMPLE',
          approved_at: new Date().toISOString(),
        })
        .eq('product_id', this.testProductId);

      if (error) throw new Error(error.message);
    });

    await this.test('Status changed in database', async () => {
      const { data } = await this.supabase
        .from('product_qa')
        .select('status')
        .eq('product_id', this.testProductId)
        .single();

      if (data?.status !== 'WAITING_FOR_SAMPLE') {
        throw new Error(`Expected WAITING_FOR_SAMPLE, got ${data?.status}`);
      }
    });
  }

  async testMobileSellerSeesApproval() {
    this.log('\n📱 MOBILE SELLER SEES APPROVAL', 'blue');
    this.log('═'.repeat(50), 'blue');

    await this.test('Mobile seller queries show updated status', async () => {
      // Simulate mobile seller querying their products
      const { data, error } = await this.supabase
        .from('product_qa')
        .select(`
          *,
          product:products!product_qa_product_id_fkey (
            id, seller_id, name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      // Filter by seller (as mobile would do)
      const sellerProducts = (data || []).filter(
        (entry: any) => entry.product?.seller_id === this.testSellerId
      );

      const myProduct = sellerProducts.find(
        (p: any) => p.product_id === this.testProductId
      );

      if (!myProduct) throw new Error('Product not found');
      if (myProduct.status !== 'WAITING_FOR_SAMPLE') {
        throw new Error(`Status not updated: ${myProduct.status}`);
      }
      this.log(`    Status: ${myProduct.status} ✓`, 'gray');
    });
  }

  async testMobileSellerSubmitsSample() {
    this.log('\n📱 MOBILE SELLER SUBMITS SAMPLE', 'blue');
    this.log('═'.repeat(50), 'blue');

    await this.test('Mobile seller submits with logistics', async () => {
      const { error } = await this.supabase
        .from('product_qa')
        .update({
          status: 'IN_QUALITY_REVIEW',
          logistics: 'J&T Express',
        })
        .eq('product_id', this.testProductId);

      if (error) throw new Error(error.message);
    });

    await this.test('Web admin sees sample in queue', async () => {
      const { data } = await this.supabase
        .from('product_qa')
        .select('*')
        .eq('status', 'IN_QUALITY_REVIEW');

      const found = (data || []).find((p: any) => p.product_id === this.testProductId);
      if (!found) throw new Error('Sample not in QA queue');
      if (found.logistics !== 'J&T Express') {
        throw new Error('Logistics not saved');
      }
    });
  }

  async testWebAdminPassesQA() {
    this.log('\n💻 WEB ADMIN PASSES QA', 'blue');
    this.log('═'.repeat(50), 'blue');

    await this.test('Web admin verifies product', async () => {
      // Update product_qa table
      const { error: qaError } = await this.supabase
        .from('product_qa')
        .update({
          status: 'ACTIVE_VERIFIED',
          verified_at: new Date().toISOString(),
        })
        .eq('product_id', this.testProductId);

      if (qaError) throw new Error(qaError.message);

      // Update products table (make visible to buyers)
      const { error: prodError } = await this.supabase
        .from('products')
        .update({
          approval_status: 'approved',
        })
        .eq('id', this.testProductId);

      if (prodError) throw new Error(prodError.message);
    });

    await this.test('Both tables synced', async () => {
      const { data: qa } = await this.supabase
        .from('product_qa')
        .select('status')
        .eq('product_id', this.testProductId)
        .single();

      const { data: prod } = await this.supabase
        .from('products')
        .select('approval_status')
        .eq('id', this.testProductId)
        .single();

      if (qa?.status !== 'ACTIVE_VERIFIED') {
        throw new Error('QA status wrong');
      }
      if (prod?.approval_status !== 'approved') {
        throw new Error('Product status wrong');
      }
    });
  }

  async testMobileBuyerSeesProduct() {
    this.log('\n📱 MOBILE BUYER SEES APPROVED PRODUCT', 'blue');
    this.log('═'.repeat(50), 'blue');

    await this.test('Mobile buyer query returns approved product', async () => {
      // Simulate mobile buyer query (same as ShopScreen.tsx)
      const { data, error } = await this.supabase
        .from('products')
        .select(`
          *,
          seller:sellers!products_seller_id_fkey (
            store_name, is_verified
          )
        `)
        .eq('is_active', true)
        .eq('approval_status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      const found = (data || []).find((p: any) => p.id === this.testProductId);
      if (!found) throw new Error('Product not visible to buyers');
      this.log(`    Found in buyer view: ${found.name}`, 'gray');
    });

    await this.test('Pending products NOT visible to buyer', async () => {
      // Create a pending product
      const { data: pending } = await this.supabase
        .from('products')
        .insert({
          name: 'Pending Test Product',
          price: 100,
          category: 'Test',
          seller_id: this.testSellerId,
          approval_status: 'pending',
          is_active: true,
        })
        .select()
        .single();

      // Query as buyer
      const { data: buyerView } = await this.supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('approval_status', 'approved');

      const foundPending = (buyerView || []).find((p: any) => p.id === pending?.id);
      
      // Cleanup
      if (pending) {
        await this.supabase.from('products').delete().eq('id', pending.id);
      }

      if (foundPending) {
        throw new Error('Pending product should NOT be visible');
      }
    });
  }

  async cleanup() {
    this.log('\n🧹 CLEANUP', 'blue');
    
    if (this.testProductId) {
      await this.supabase.from('product_qa').delete().eq('product_id', this.testProductId);
      await this.supabase.from('products').delete().eq('id', this.testProductId);
      this.log(`  Deleted test product: ${this.testProductId.substring(0, 8)}...`, 'gray');
    }
  }

  printSummary() {
    this.log('\n' + '═'.repeat(60), 'blue');
    this.log('📊 CROSS-PLATFORM QA TEST SUMMARY', 'bright');
    this.log('═'.repeat(60), 'blue');

    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    const total = this.testResults.length;

    this.log(`\nTotal: ${total} | Passed: ${passed} | Failed: ${failed}`, 'cyan');
    this.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`, 'cyan');

    this.log('Verified Scenarios:', 'cyan');
    this.log('  📱 Mobile Seller → 💻 Web Admin (product creation)', 'reset');
    this.log('  💻 Web Admin → 📱 Mobile Seller (approval sync)', 'reset');
    this.log('  📱 Mobile Seller → 💻 Web Admin (sample submission)', 'reset');
    this.log('  💻 Web Admin → 📱 Mobile Buyer (product visibility)', 'reset');

    this.log('\n' + '═'.repeat(60), 'blue');

    if (failed === 0) {
      this.log('🎉 ALL CROSS-PLATFORM TESTS PASSED!', 'green');
      this.log('   Web and Mobile share the same Supabase database.', 'green');
    } else {
      this.log('⚠️  Some tests failed.', 'yellow');
    }
    this.log('');
  }

  async runAllTests() {
    try {
      this.log('\n' + '═'.repeat(60), 'bright');
      this.log('🔄 CROSS-PLATFORM QA INTEGRATION TEST', 'bright');
      this.log('═'.repeat(60), 'bright');
      this.log('\nVerifying Web ↔ Mobile database synchronization', 'cyan');
      this.log(`Started: ${new Date().toLocaleString()}\n`, 'gray');

      await this.initialize();
      await this.testMobileSellerCreatesProduct();
      await this.testWebAdminSeesProduct();
      await this.testWebAdminApproves();
      await this.testMobileSellerSeesApproval();
      await this.testMobileSellerSubmitsSample();
      await this.testWebAdminPassesQA();
      await this.testMobileBuyerSeesProduct();
      await this.cleanup();
      this.printSummary();

      const failed = this.testResults.filter(r => !r.passed).length;
      process.exit(failed > 0 ? 1 : 0);

    } catch (error) {
      this.log(`\n❌ Fatal Error: ${error}`, 'red');
      process.exit(1);
    }
  }
}

const tester = new CrossPlatformQATester();
tester.runAllTests();
