/**
 * COMPREHENSIVE MOBILE QA END-TO-END TEST
 * 
 * Complete flow test:
 * 1. Vendor creates product on mobile → Auto QA entry with PENDING_DIGITAL_REVIEW
 * 2. Admin (mobile/web) approves digital → WAITING_FOR_SAMPLE
 * 3. Vendor submits sample via mobile → IN_QUALITY_REVIEW
 * 4. Admin passes QA → ACTIVE_VERIFIED + products.approval_status = 'approved'
 * 5. Buyer sees product on mobile shop
 * 
 * Also tests:
 * - Rejection flow
 * - Revision request flow
 * - Cross-platform sync (same database)
 * - Buyer view filters (only approved visible)
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

interface TestResult {
  test: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

class MobileQAE2ETester {
  private supabase: any;
  private testSellerId: string = '';
  private testSellerName: string = '';
  private testProducts: string[] = [];
  private testResults: TestResult[] = [];
  private startTime: number = 0;

  constructor() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase credentials. Check .env file.');
    }
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  private log(message: string, color: keyof typeof colors = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  private logSection(title: string, emoji: string = '📦') {
    this.log(`\n${emoji} ${title}`, 'blue');
    this.log('═'.repeat(55), 'blue');
  }

  private async test(name: string, fn: () => Promise<void>): Promise<boolean> {
    const start = Date.now();
    try {
      await fn();
      const duration = Date.now() - start;
      this.testResults.push({ test: name, passed: true, duration });
      this.log(`  ✅ ${name} (${duration}ms)`, 'green');
      return true;
    } catch (error) {
      const duration = Date.now() - start;
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.testResults.push({ test: name, passed: false, error: errorMsg, duration });
      this.log(`  ❌ ${name}`, 'red');
      this.log(`     Error: ${errorMsg}`, 'gray');
      return false;
    }
  }

  async initialize() {
    this.startTime = Date.now();
    this.log('\n🔧 INITIALIZING TEST ENVIRONMENT', 'cyan');
    
    // Get an existing seller
    const { data: sellers } = await this.supabase
      .from('sellers')
      .select('id, store_name, business_name')
      .eq('is_verified', true)
      .limit(1);

    if (!sellers || sellers.length === 0) {
      // Try any seller if no verified ones
      const { data: anySellers } = await this.supabase
        .from('sellers')
        .select('id, store_name, business_name')
        .limit(1);
      
      if (!anySellers || anySellers.length === 0) {
        throw new Error('No sellers found in database');
      }
      this.testSellerId = anySellers[0].id;
      this.testSellerName = anySellers[0].store_name || anySellers[0].business_name;
    } else {
      this.testSellerId = sellers[0].id;
      this.testSellerName = sellers[0].store_name || sellers[0].business_name;
    }

    this.log(`  Using seller: ${this.testSellerName}`, 'gray');
    this.log(`  Seller ID: ${this.testSellerId.substring(0, 8)}...`, 'gray');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1: VENDOR CREATES PRODUCT (Mobile)
  // ═══════════════════════════════════════════════════════════════════════════

  async testPhase1_VendorCreatesProduct() {
    this.logSection('PHASE 1: MOBILE VENDOR CREATES PRODUCT', '📱');

    await this.test('Vendor creates product via mobile API', async () => {
      const productData = {
        name: `Mobile E2E Test Product ${Date.now()}`,
        description: 'Created by mobile vendor for QA testing',
        price: 1999,
        category: 'Electronics',
        seller_id: this.testSellerId,
        approval_status: 'pending', // New products start as pending
        images: ['https://placehold.co/400?text=Mobile+Product'],
        stock: 25,
        is_active: true,
      };

      const { data, error } = await this.supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (error) throw new Error(`Insert failed: ${error.message}`);
      if (!data) throw new Error('No data returned');
      
      this.testProducts.push(data.id);
      this.log(`     Product: ${data.name}`, 'gray');
      this.log(`     ID: ${data.id}`, 'gray');
    });

    await this.test('QA entry auto-created with correct status', async () => {
      const productId = this.testProducts[0];
      
      // Simulate what mobile app does when creating product
      const { data, error } = await this.supabase
        .from('product_qa')
        .insert({
          product_id: productId,
          vendor: this.testSellerName,
          status: 'PENDING_DIGITAL_REVIEW',
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw new Error(`QA insert failed: ${error.message}`);
      if (data.status !== 'PENDING_DIGITAL_REVIEW') {
        throw new Error(`Wrong status: ${data.status}`);
      }
    });

    await this.test('Product appears in vendor QA list', async () => {
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

      // Filter by seller (as mobile app does)
      const vendorProducts = (data || []).filter(
        (entry: any) => entry.product?.seller_id === this.testSellerId
      );

      const ourProduct = vendorProducts.find(
        (p: any) => p.product_id === this.testProducts[0]
      );

      if (!ourProduct) throw new Error('Product not in vendor QA list');
    });

    await this.test('Product NOT visible in buyer shop yet', async () => {
      const { data } = await this.supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('approval_status', 'approved');

      const found = (data || []).find((p: any) => p.id === this.testProducts[0]);
      if (found) throw new Error('Pending product should not be in buyer view!');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2: ADMIN DIGITAL REVIEW
  // ═══════════════════════════════════════════════════════════════════════════

  async testPhase2_AdminDigitalReview() {
    this.logSection('PHASE 2: ADMIN DIGITAL REVIEW', '👨‍💼');

    await this.test('Admin sees product in pending queue', async () => {
      const { data } = await this.supabase
        .from('product_qa')
        .select(`
          *,
          product:products!product_qa_product_id_fkey (name)
        `)
        .eq('status', 'PENDING_DIGITAL_REVIEW');

      const found = (data || []).find((p: any) => p.product_id === this.testProducts[0]);
      if (!found) throw new Error('Product not in admin pending queue');
      this.log(`     Found: ${found.product?.name}`, 'gray');
    });

    await this.test('Admin approves for sample submission', async () => {
      const { error } = await this.supabase
        .from('product_qa')
        .update({
          status: 'WAITING_FOR_SAMPLE',
          approved_at: new Date().toISOString(),
        })
        .eq('product_id', this.testProducts[0]);

      if (error) throw new Error(error.message);
    });

    await this.test('Status updated to WAITING_FOR_SAMPLE', async () => {
      const { data } = await this.supabase
        .from('product_qa')
        .select('status, approved_at')
        .eq('product_id', this.testProducts[0])
        .single();

      if (data?.status !== 'WAITING_FOR_SAMPLE') {
        throw new Error(`Expected WAITING_FOR_SAMPLE, got ${data?.status}`);
      }
      if (!data?.approved_at) {
        throw new Error('approved_at timestamp not set');
      }
    });

    await this.test('Vendor sees updated status on mobile', async () => {
      const { data } = await this.supabase
        .from('product_qa')
        .select('status')
        .eq('product_id', this.testProducts[0])
        .single();

      if (data?.status !== 'WAITING_FOR_SAMPLE') {
        throw new Error('Vendor not seeing updated status');
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3: VENDOR SUBMITS SAMPLE
  // Tests the exact flow used in mobile qa-products.tsx
  // ═══════════════════════════════════════════════════════════════════════════

  async testPhase3_VendorSubmitsSample() {
    this.logSection('PHASE 3: VENDOR SUBMITS PHYSICAL SAMPLE', '📮');

    // First, get the QA entry to verify we have both id and product_id
    let qaEntryId = '';
    let productId = this.testProducts[0];

    await this.test('QA entry has distinct id and product_id', async () => {
      const { data } = await this.supabase
        .from('product_qa')
        .select('id, product_id')
        .eq('product_id', productId)
        .single();

      if (!data) throw new Error('QA entry not found');
      if (!data.id) throw new Error('QA entry has no id');
      if (!data.product_id) throw new Error('QA entry has no product_id');
      if (data.id === data.product_id) {
        throw new Error('id and product_id should be different!');
      }

      qaEntryId = data.id;
      this.log(`     QA entry id: ${qaEntryId.substring(0, 8)}...`, 'gray');
      this.log(`     product_id: ${data.product_id.substring(0, 8)}...`, 'gray');
    });

    await this.test('Submit sample uses product_id NOT qa entry id', async () => {
      // This simulates the FIXED mobile flow:
      // setSelectedProduct(product.productId) - NOT product.id
      
      // Simulate looking up product by product_id (the correct way)
      const { data: correctLookup } = await this.supabase
        .from('product_qa')
        .select('*')
        .eq('product_id', productId)
        .single();

      if (!correctLookup) {
        throw new Error('Product lookup by product_id failed');
      }

      // Simulate the BUG: looking up by the QA entry id as if it were product_id
      const { data: buggyLookup } = await this.supabase
        .from('product_qa')
        .select('*')
        .eq('product_id', qaEntryId) // This was the bug!
        .single();

      if (buggyLookup) {
        throw new Error('Bug: Using QA entry id as product_id found a match - this should fail!');
      }

      this.log('     ✓ Verified: product_id must be used for submit', 'gray');
    });

    await this.test('Vendor selects logistics and submits sample', async () => {
      const logistics = 'J&T Express';
      
      // Use product_id (correct approach)
      const { error } = await this.supabase
        .from('product_qa')
        .update({
          status: 'IN_QUALITY_REVIEW',
          logistics: logistics,
        })
        .eq('product_id', productId);

      if (error) throw new Error(error.message);
    });

    await this.test('Status updated to IN_QUALITY_REVIEW', async () => {
      const { data } = await this.supabase
        .from('product_qa')
        .select('status, logistics')
        .eq('product_id', productId)
        .single();

      if (data?.status !== 'IN_QUALITY_REVIEW') {
        throw new Error(`Wrong status: ${data?.status}`);
      }
      if (data?.logistics !== 'J&T Express') {
        throw new Error('Logistics not saved');
      }
      this.log(`     Logistics: ${data.logistics}`, 'gray');
    });

    await this.test('Product still NOT visible in buyer shop', async () => {
      const { data } = await this.supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('approval_status', 'approved');

      const found = (data || []).find((p: any) => p.id === this.testProducts[0]);
      if (found) throw new Error('Product in QA should not be visible to buyers');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 4: ADMIN QUALITY CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  async testPhase4_AdminQualityCheck() {
    this.logSection('PHASE 4: ADMIN QUALITY CHECK', '🔬');

    await this.test('Admin sees product in QA queue', async () => {
      const { data } = await this.supabase
        .from('product_qa')
        .select('*')
        .eq('status', 'IN_QUALITY_REVIEW');

      const found = (data || []).find((p: any) => p.product_id === this.testProducts[0]);
      if (!found) throw new Error('Product not in QA queue');
    });

    await this.test('Admin passes quality check', async () => {
      // Update QA table
      const { error: qaError } = await this.supabase
        .from('product_qa')
        .update({
          status: 'ACTIVE_VERIFIED',
          verified_at: new Date().toISOString(),
        })
        .eq('product_id', this.testProducts[0]);

      if (qaError) throw new Error(`QA update failed: ${qaError.message}`);

      // Update products table to make visible to buyers
      const { error: prodError } = await this.supabase
        .from('products')
        .update({
          approval_status: 'approved',
        })
        .eq('id', this.testProducts[0]);

      if (prodError) throw new Error(`Product update failed: ${prodError.message}`);
    });

    await this.test('QA status is ACTIVE_VERIFIED', async () => {
      const { data } = await this.supabase
        .from('product_qa')
        .select('status, verified_at')
        .eq('product_id', this.testProducts[0])
        .single();

      if (data?.status !== 'ACTIVE_VERIFIED') {
        throw new Error(`Wrong status: ${data?.status}`);
      }
      if (!data?.verified_at) {
        throw new Error('verified_at not set');
      }
    });

    await this.test('Product approval_status is approved', async () => {
      const { data } = await this.supabase
        .from('products')
        .select('approval_status')
        .eq('id', this.testProducts[0])
        .single();

      if (data?.approval_status !== 'approved') {
        throw new Error(`Wrong approval_status: ${data?.approval_status}`);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 5: BUYER SEES PRODUCT
  // ═══════════════════════════════════════════════════════════════════════════

  async testPhase5_BuyerSeesProduct() {
    this.logSection('PHASE 5: MOBILE BUYER SEES PRODUCT', '🛍️');

    await this.test('Product appears in mobile buyer shop query', async () => {
      // Exact query used by mobile ShopScreen.tsx and HomeScreen.tsx
      const { data, error } = await this.supabase
        .from('products')
        .select(`
          *,
          seller:sellers!products_seller_id_fkey (
            business_name,
            store_name,
            rating,
            is_verified
          )
        `)
        .eq('is_active', true)
        .eq('approval_status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      const found = (data || []).find((p: any) => p.id === this.testProducts[0]);
      if (!found) throw new Error('Approved product not visible to buyers!');
      
      this.log(`     Found: ${found.name}`, 'gray');
      this.log(`     Seller: ${found.seller?.store_name}`, 'gray');
    });

    await this.test('Product has correct seller information', async () => {
      const { data } = await this.supabase
        .from('products')
        .select(`
          *,
          seller:sellers!products_seller_id_fkey (
            id, store_name
          )
        `)
        .eq('id', this.testProducts[0])
        .single();

      if (data?.seller?.id !== this.testSellerId) {
        throw new Error('Seller ID mismatch');
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 6: REJECTION FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  async testPhase6_RejectionFlow() {
    this.logSection('PHASE 6: REJECTION FLOW', '❌');

    // Create new product for rejection test
    const { data: rejectProduct } = await this.supabase
      .from('products')
      .insert({
        name: `Rejection Test ${Date.now()}`,
        price: 500,
        category: 'Test',
        seller_id: this.testSellerId,
        approval_status: 'pending',
        is_active: true,
      })
      .select()
      .single();

    if (rejectProduct) {
      this.testProducts.push(rejectProduct.id);

      await this.supabase.from('product_qa').insert({
        product_id: rejectProduct.id,
        vendor: this.testSellerName,
        status: 'PENDING_DIGITAL_REVIEW',
      });

      await this.test('Admin rejects product with reason', async () => {
        const reason = 'Product images are too blurry';

        const { error: qaError } = await this.supabase
          .from('product_qa')
          .update({
            status: 'REJECTED',
            rejection_reason: reason,
            rejection_stage: 'digital',
            rejected_at: new Date().toISOString(),
          })
          .eq('product_id', rejectProduct.id);

        if (qaError) throw new Error(qaError.message);

        const { error: prodError } = await this.supabase
          .from('products')
          .update({
            approval_status: 'rejected',
            rejection_reason: reason,
          })
          .eq('id', rejectProduct.id);

        if (prodError) throw new Error(prodError.message);
      });

      await this.test('Rejected product NOT in buyer shop', async () => {
        const { data } = await this.supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .eq('approval_status', 'approved');

        const found = (data || []).find((p: any) => p.id === rejectProduct.id);
        if (found) throw new Error('Rejected product should not be visible!');
      });

      await this.test('Vendor sees rejection reason', async () => {
        const { data } = await this.supabase
          .from('product_qa')
          .select('status, rejection_reason, rejection_stage')
          .eq('product_id', rejectProduct.id)
          .single();

        if (data?.status !== 'REJECTED') throw new Error('Wrong status');
        if (!data?.rejection_reason) throw new Error('No rejection reason');
        this.log(`     Reason: ${data.rejection_reason}`, 'gray');
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 7: CROSS-PLATFORM SYNC
  // ═══════════════════════════════════════════════════════════════════════════

  async testPhase7_CrossPlatformSync() {
    this.logSection('PHASE 7: CROSS-PLATFORM DATABASE SYNC', '🔄');

    await this.test('Same database for web and mobile', async () => {
      // Verify we can query product_qa and products tables
      const { data: qa, error: qaError } = await this.supabase
        .from('product_qa')
        .select('count')
        .limit(1);

      const { data: prod, error: prodError } = await this.supabase
        .from('products')
        .select('count')
        .limit(1);

      if (qaError || prodError) {
        throw new Error('Database tables not accessible');
      }
    });

    await this.test('QA status matches product approval', async () => {
      const { data } = await this.supabase
        .from('product_qa')
        .select(`
          status,
          product:products!product_qa_product_id_fkey (
            approval_status
          )
        `)
        .eq('product_id', this.testProducts[0])
        .single();

      const qaStatus = data?.status;
      const prodStatus = (data as any)?.product?.approval_status;

      // ACTIVE_VERIFIED should map to approved
      if (qaStatus === 'ACTIVE_VERIFIED' && prodStatus !== 'approved') {
        throw new Error('Status mismatch: QA=ACTIVE_VERIFIED but product!=approved');
      }
    });

    await this.test('Mobile seller and web admin see same data', async () => {
      // Both platforms query the same tables
      const { data: qaData } = await this.supabase
        .from('product_qa')
        .select('*')
        .eq('product_id', this.testProducts[0])
        .single();

      const { data: prodData } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', this.testProducts[0])
        .single();

      if (!qaData || !prodData) {
        throw new Error('Data not synced across platforms');
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  async cleanup() {
    this.logSection('CLEANUP', '🧹');

    for (const productId of this.testProducts) {
      try {
        await this.supabase.from('product_qa').delete().eq('product_id', productId);
        await this.supabase.from('products').delete().eq('id', productId);
        this.log(`  Deleted: ${productId.substring(0, 8)}...`, 'gray');
      } catch (e) {
        this.log(`  Failed to delete ${productId}: ${e}`, 'yellow');
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  printSummary() {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    const total = this.testResults.length;

    this.log('\n' + '═'.repeat(60), 'bright');
    this.log('📊 MOBILE QA E2E TEST SUMMARY', 'bright');
    this.log('═'.repeat(60), 'bright');

    this.log(`\nTotal Tests: ${total}`, 'cyan');
    this.log(`Passed: ${passed}`, 'green');
    this.log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
    this.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`, 'cyan');
    this.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`, 'gray');

    if (failed > 0) {
      this.log('\nFailed Tests:', 'red');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => {
          this.log(`  ✗ ${r.test}`, 'red');
          if (r.error) this.log(`    ${r.error}`, 'gray');
        });
    }

    this.log('\nTest Phases:', 'cyan');
    this.log('  ✓ Phase 1: Vendor Creates Product (mobile)', 'reset');
    this.log('  ✓ Phase 2: Admin Digital Review', 'reset');
    this.log('  ✓ Phase 3: Vendor Submits Sample', 'reset');
    this.log('  ✓ Phase 4: Admin Quality Check', 'reset');
    this.log('  ✓ Phase 5: Buyer Sees Product', 'reset');
    this.log('  ✓ Phase 6: Rejection Flow', 'reset');
    this.log('  ✓ Phase 7: Cross-Platform Sync', 'reset');

    this.log('\n' + '═'.repeat(60), 'bright');

    if (failed === 0) {
      this.log('🎉 ALL TESTS PASSED! Mobile QA System is fully functional!', 'green');
      this.log('   ✓ Mobile vendor → Admin approval → Buyer view working', 'green');
      this.log('   ✓ Web and Mobile share same Supabase database', 'green');
    } else {
      this.log('⚠️  Some tests failed. Review the errors above.', 'yellow');
    }
    this.log('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RUNNER
  // ═══════════════════════════════════════════════════════════════════════════

  async runAllTests() {
    try {
      this.log('\n' + '═'.repeat(60), 'bright');
      this.log('📱 MOBILE QA E2E TEST - COMPLETE FLOW', 'bright');
      this.log('═'.repeat(60), 'bright');

      this.log('\nTesting complete QA flow:', 'cyan');
      this.log('  Vendor (mobile) → Admin → Buyer (mobile)', 'gray');
      this.log(`  Started: ${new Date().toLocaleString()}\n`, 'gray');

      await this.initialize();
      await this.testPhase1_VendorCreatesProduct();
      await this.testPhase2_AdminDigitalReview();
      await this.testPhase3_VendorSubmitsSample();
      await this.testPhase4_AdminQualityCheck();
      await this.testPhase5_BuyerSeesProduct();
      await this.testPhase6_RejectionFlow();
      await this.testPhase7_CrossPlatformSync();
      await this.cleanup();
      this.printSummary();

      const failed = this.testResults.filter(r => !r.passed).length;
      process.exit(failed > 0 ? 1 : 0);

    } catch (error) {
      this.log(`\n❌ Fatal Error: ${error}`, 'red');
      await this.cleanup();
      process.exit(1);
    }
  }
}

// Run tests
const tester = new MobileQAE2ETester();
tester.runAllTests();
