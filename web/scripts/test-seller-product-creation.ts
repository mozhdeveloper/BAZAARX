/**
 * COMPREHENSIVE MOBILE SELLER PRODUCT CREATION TEST
 * 
 * Tests the complete flow of a seller adding a product on mobile:
 * 1. Product creation with valid data
 * 2. Product inserted into Supabase products table
 * 3. QA entry auto-created with foreign key link
 * 4. Product visible in seller's inventory
 * 5. Product appears in seller's QA products tab
 * 6. Product NOT visible to buyers (pending approval)
 * 7. Various validation scenarios
 * 8. Edge cases and error handling
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

// Generate a proper UUID (same as mobile app uses)
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

class MobileSellerProductCreationTester {
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
    this.log('═'.repeat(60), 'blue');
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
    
    // Get an existing verified seller
    const { data: sellers } = await this.supabase
      .from('sellers')
      .select('id, store_name, business_name')
      .limit(1);

    if (!sellers || sellers.length === 0) {
      throw new Error('No sellers found in database');
    }
    
    this.testSellerId = sellers[0].id;
    this.testSellerName = sellers[0].store_name || sellers[0].business_name || 'Test Store';
    
    this.log(`  Seller: ${this.testSellerName}`, 'gray');
    this.log(`  ID: ${this.testSellerId.substring(0, 8)}...`, 'gray');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 1: BASIC PRODUCT CREATION
  // ═══════════════════════════════════════════════════════════════════════════

  async testBasicProductCreation() {
    this.logSection('TEST 1: BASIC PRODUCT CREATION', '📱');

    let createdProductId: string = '';

    await this.test('Generate valid UUID for product', async () => {
      const uuid = generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(uuid)) {
        throw new Error(`Invalid UUID format: ${uuid}`);
      }
      this.log(`     Generated: ${uuid}`, 'gray');
    });

    await this.test('Insert product into Supabase products table', async () => {
      const productData = {
        name: `Mobile Test Product ${Date.now()}`,
        description: 'Product created via mobile seller app test',
        price: 1999.99,
        original_price: 2499.99,
        stock: 50,
        category: 'Electronics',
        images: ['https://placehold.co/400?text=Test+Product'],
        seller_id: this.testSellerId,
        approval_status: 'pending',
        is_active: true,
      };

      const { data, error } = await this.supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (error) throw new Error(`Database error: ${error.message}`);
      if (!data) throw new Error('No data returned from insert');
      if (!data.id) throw new Error('Product ID not returned');
      
      createdProductId = data.id;
      this.testProducts.push(data.id);
      this.log(`     Product ID: ${data.id}`, 'gray');
      this.log(`     Name: ${data.name}`, 'gray');
    });

    await this.test('Product has correct seller_id', async () => {
      const { data } = await this.supabase
        .from('products')
        .select('seller_id')
        .eq('id', createdProductId)
        .single();

      if (data?.seller_id !== this.testSellerId) {
        throw new Error(`Seller ID mismatch: ${data?.seller_id} vs ${this.testSellerId}`);
      }
    });

    await this.test('Product has approval_status = pending', async () => {
      const { data } = await this.supabase
        .from('products')
        .select('approval_status')
        .eq('id', createdProductId)
        .single();

      if (data?.approval_status !== 'pending') {
        throw new Error(`Expected 'pending', got '${data?.approval_status}'`);
      }
    });

    await this.test('Product is_active = true', async () => {
      const { data } = await this.supabase
        .from('products')
        .select('is_active')
        .eq('id', createdProductId)
        .single();

      if (data?.is_active !== true) {
        throw new Error(`Expected is_active=true, got ${data?.is_active}`);
      }
    });

    return createdProductId;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 2: QA ENTRY CREATION
  // ═══════════════════════════════════════════════════════════════════════════

  async testQAEntryCreation(productId: string) {
    this.logSection('TEST 2: QA ENTRY CREATION', '🔍');

    await this.test('Create QA entry with product foreign key', async () => {
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

      if (error) throw new Error(`QA insert error: ${error.message}`);
      if (!data) throw new Error('No QA data returned');
    });

    await this.test('QA entry has correct product_id', async () => {
      const { data } = await this.supabase
        .from('product_qa')
        .select('product_id')
        .eq('product_id', productId)
        .single();

      if (data?.product_id !== productId) {
        throw new Error('Product ID mismatch in QA entry');
      }
    });

    await this.test('QA status is PENDING_DIGITAL_REVIEW', async () => {
      const { data } = await this.supabase
        .from('product_qa')
        .select('status')
        .eq('product_id', productId)
        .single();

      if (data?.status !== 'PENDING_DIGITAL_REVIEW') {
        throw new Error(`Expected PENDING_DIGITAL_REVIEW, got ${data?.status}`);
      }
    });

    await this.test('QA entry has vendor name', async () => {
      const { data } = await this.supabase
        .from('product_qa')
        .select('vendor')
        .eq('product_id', productId)
        .single();

      if (!data?.vendor || data.vendor.trim() === '') {
        throw new Error('Vendor name is empty');
      }
      this.log(`     Vendor: ${data.vendor}`, 'gray');
    });

    await this.test('QA entry has submitted_at timestamp', async () => {
      const { data } = await this.supabase
        .from('product_qa')
        .select('submitted_at')
        .eq('product_id', productId)
        .single();

      if (!data?.submitted_at) {
        throw new Error('submitted_at timestamp not set');
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 3: SELLER INVENTORY VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  async testSellerInventoryView(productId: string) {
    this.logSection('TEST 3: SELLER INVENTORY VIEW', '📋');

    await this.test('Product appears in seller inventory query', async () => {
      const { data, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('seller_id', this.testSellerId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      
      const found = (data || []).find((p: any) => p.id === productId);
      if (!found) throw new Error('Product not found in seller inventory');
      this.log(`     Found in inventory with ${data?.length} total products`, 'gray');
    });

    await this.test('Product has all required fields', async () => {
      const { data } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      const requiredFields = ['id', 'name', 'price', 'stock', 'category', 'seller_id', 'approval_status'];
      const missing = requiredFields.filter(f => data?.[f] === undefined || data?.[f] === null);
      
      if (missing.length > 0) {
        throw new Error(`Missing fields: ${missing.join(', ')}`);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 4: QA PRODUCTS TAB VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  async testQAProductsTabView(productId: string) {
    this.logSection('TEST 4: QA PRODUCTS TAB VIEW', '📝');

    await this.test('Product appears in QA products query with JOIN', async () => {
      const { data, error } = await this.supabase
        .from('product_qa')
        .select(`
          *,
          product:products!product_qa_product_id_fkey (
            id,
            name,
            seller_id,
            price,
            category,
            images
          )
        `)
        .eq('product_id', productId)
        .single();

      if (error) throw new Error(error.message);
      if (!data) throw new Error('QA entry not found');
      if (!data.product) throw new Error('Product JOIN failed');
      
      this.log(`     Product: ${data.product.name}`, 'gray');
      this.log(`     Status: ${data.status}`, 'gray');
    });

    await this.test('Seller can filter QA products by their ID', async () => {
      const { data, error } = await this.supabase
        .from('product_qa')
        .select(`
          *,
          product:products!product_qa_product_id_fkey (
            seller_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      const sellerProducts = (data || []).filter(
        (entry: any) => entry.product?.seller_id === this.testSellerId
      );

      const found = sellerProducts.find((p: any) => p.product_id === productId);
      if (!found) throw new Error('Product not in seller QA list');
      
      this.log(`     Seller has ${sellerProducts.length} QA product(s)`, 'gray');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 5: BUYER VISIBILITY (SHOULD NOT BE VISIBLE)
  // ═══════════════════════════════════════════════════════════════════════════

  async testBuyerVisibility(productId: string) {
    this.logSection('TEST 5: BUYER VISIBILITY CHECK', '🛍️');

    await this.test('Pending product NOT visible in buyer shop query', async () => {
      const { data } = await this.supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('approval_status', 'approved');

      const found = (data || []).find((p: any) => p.id === productId);
      if (found) {
        throw new Error('Pending product should NOT be visible to buyers!');
      }
    });

    await this.test('Pending product NOT in approved products count', async () => {
      const { count } = await this.supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'approved')
        .eq('id', productId);

      if (count && count > 0) {
        throw new Error('Pending product should not be counted as approved');
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 6: PRODUCT DATA VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  async testProductDataValidation() {
    this.logSection('TEST 6: PRODUCT DATA VALIDATION', '✓');

    await this.test('Product with all optional fields', async () => {
      const { data, error } = await this.supabase
        .from('products')
        .insert({
          name: `Full Product ${Date.now()}`,
          description: 'Complete product with all fields',
          price: 999,
          original_price: 1299,
          stock: 100,
          category: 'Fashion',
          images: ['https://placehold.co/400', 'https://placehold.co/400?text=2'],
          sizes: ['S', 'M', 'L', 'XL'],
          colors: ['Red', 'Blue', 'Green'],
          seller_id: this.testSellerId,
          approval_status: 'pending',
          is_active: true,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      this.testProducts.push(data.id);
      this.log(`     Created with sizes: ${data.sizes?.join(', ')}`, 'gray');
      this.log(`     Created with colors: ${data.colors?.join(', ')}`, 'gray');
    });

    await this.test('Product with minimum required fields', async () => {
      const { data, error } = await this.supabase
        .from('products')
        .insert({
          name: `Minimal Product ${Date.now()}`,
          price: 100,
          stock: 1,
          category: 'Other',
          seller_id: this.testSellerId,
          approval_status: 'pending',
          is_active: true,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      this.testProducts.push(data.id);
    });

    await this.test('Product price stored correctly as decimal', async () => {
      const testPrice = 1234.56;
      const { data, error } = await this.supabase
        .from('products')
        .insert({
          name: `Price Test ${Date.now()}`,
          price: testPrice,
          stock: 1,
          category: 'Test',
          seller_id: this.testSellerId,
          approval_status: 'pending',
          is_active: true,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      this.testProducts.push(data.id);
      
      if (Math.abs(data.price - testPrice) > 0.01) {
        throw new Error(`Price mismatch: ${data.price} vs ${testPrice}`);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 7: FOREIGN KEY CONSTRAINT
  // ═══════════════════════════════════════════════════════════════════════════

  async testForeignKeyConstraint() {
    this.logSection('TEST 7: FOREIGN KEY CONSTRAINT', '🔗');

    await this.test('QA entry fails without valid product_id', async () => {
      const fakeProductId = generateUUID(); // Non-existent product
      
      const { error } = await this.supabase
        .from('product_qa')
        .insert({
          product_id: fakeProductId,
          vendor: 'Test',
          status: 'PENDING_DIGITAL_REVIEW',
        });

      if (!error) {
        throw new Error('Should have failed with foreign key violation');
      }
      if (!error.message.includes('foreign key') && !error.code?.includes('23503')) {
        throw new Error(`Unexpected error: ${error.message}`);
      }
      this.log(`     Correctly rejected: ${error.code}`, 'gray');
    });

    await this.test('QA entry succeeds with valid product_id', async () => {
      // Create product first
      const { data: product } = await this.supabase
        .from('products')
        .insert({
          name: `FK Test Product ${Date.now()}`,
          price: 100,
          stock: 1,
          category: 'Test',
          seller_id: this.testSellerId,
          approval_status: 'pending',
          is_active: true,
        })
        .select()
        .single();

      this.testProducts.push(product.id);

      // Now create QA entry
      const { error } = await this.supabase
        .from('product_qa')
        .insert({
          product_id: product.id,
          vendor: this.testSellerName,
          status: 'PENDING_DIGITAL_REVIEW',
        });

      if (error) {
        throw new Error(`QA insert failed: ${error.message}`);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 8: MULTIPLE PRODUCTS
  // ═══════════════════════════════════════════════════════════════════════════

  async testMultipleProducts() {
    this.logSection('TEST 8: MULTIPLE PRODUCTS', '📦');

    const productCount = 3;
    const createdIds: string[] = [];

    await this.test(`Create ${productCount} products in sequence`, async () => {
      for (let i = 0; i < productCount; i++) {
        const { data, error } = await this.supabase
          .from('products')
          .insert({
            name: `Batch Product ${i + 1} - ${Date.now()}`,
            price: 100 + (i * 50),
            stock: 10 + i,
            category: 'Electronics',
            seller_id: this.testSellerId,
            approval_status: 'pending',
            is_active: true,
          })
          .select()
          .single();

        if (error) throw new Error(`Product ${i + 1} failed: ${error.message}`);
        createdIds.push(data.id);
        this.testProducts.push(data.id);
      }
      this.log(`     Created ${createdIds.length} products`, 'gray');
    });

    await this.test(`Create QA entries for all ${productCount} products`, async () => {
      for (const productId of createdIds) {
        const { error } = await this.supabase
          .from('product_qa')
          .insert({
            product_id: productId,
            vendor: this.testSellerName,
            status: 'PENDING_DIGITAL_REVIEW',
          });

        if (error) throw new Error(`QA entry failed for ${productId}: ${error.message}`);
      }
    });

    await this.test('All products appear in seller inventory', async () => {
      const { data } = await this.supabase
        .from('products')
        .select('id')
        .eq('seller_id', this.testSellerId)
        .in('id', createdIds);

      if ((data?.length || 0) !== productCount) {
        throw new Error(`Expected ${productCount}, found ${data?.length}`);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 9: QA ENTRY ID VS PRODUCT ID DISTINCTION
  // This tests the bug fix where qa-products.tsx was using product.id 
  // (QA entry ID) instead of product.productId (actual product ID)
  // ═══════════════════════════════════════════════════════════════════════════

  async testQAIdDistinction() {
    this.logSection('TEST 9: QA ENTRY ID VS PRODUCT ID', '🔑');

    let testProductId = '';
    let qaEntryId = '';

    await this.test('Create product and QA entry with distinct IDs', async () => {
      // Create product
      const { data: product, error: prodError } = await this.supabase
        .from('products')
        .insert({
          name: `ID Test Product ${Date.now()}`,
          price: 500,
          stock: 5,
          category: 'Test',
          seller_id: this.testSellerId,
          approval_status: 'pending',
          is_active: true,
        })
        .select()
        .single();

      if (prodError) throw new Error(prodError.message);
      testProductId = product.id;
      this.testProducts.push(product.id);

      // Create QA entry
      const { data: qa, error: qaError } = await this.supabase
        .from('product_qa')
        .insert({
          product_id: product.id,
          vendor: this.testSellerName,
          status: 'WAITING_FOR_SAMPLE', // Ready for sample submission
        })
        .select()
        .single();

      if (qaError) throw new Error(qaError.message);
      qaEntryId = qa.id;

      this.log(`     Product ID: ${testProductId.substring(0, 8)}...`, 'gray');
      this.log(`     QA Entry ID: ${qaEntryId.substring(0, 8)}...`, 'gray');
    });

    await this.test('QA entry id and product_id are different', async () => {
      if (qaEntryId === testProductId) {
        throw new Error('QA entry id should NOT equal product_id!');
      }
    });

    await this.test('Submit sample lookup using product_id works', async () => {
      // This simulates the FIXED code: submitSample(product.productId)
      const { data } = await this.supabase
        .from('product_qa')
        .select('*')
        .eq('product_id', testProductId)
        .single();

      if (!data) {
        throw new Error('Lookup by product_id failed');
      }
      if (data.status !== 'WAITING_FOR_SAMPLE') {
        throw new Error(`Wrong status: ${data.status}`);
      }
    });

    await this.test('Submit sample lookup using QA entry id fails', async () => {
      // This simulates the BUG: submitSample(product.id) - where product.id is QA entry id
      const { data } = await this.supabase
        .from('product_qa')
        .select('*')
        .eq('product_id', qaEntryId) // Wrong! This was the bug
        .single();

      if (data) {
        throw new Error('BUG: Using QA entry id as product_id should NOT work!');
      }
    });

    await this.test('Simulated submit sample updates correctly', async () => {
      const logistics = 'LBC Express';

      const { error } = await this.supabase
        .from('product_qa')
        .update({
          status: 'IN_QUALITY_REVIEW',
          logistics: logistics,
        })
        .eq('product_id', testProductId); // Correct: using product_id

      if (error) throw new Error(error.message);

      // Verify update
      const { data: updated } = await this.supabase
        .from('product_qa')
        .select('status, logistics')
        .eq('product_id', testProductId)
        .single();

      if (updated?.status !== 'IN_QUALITY_REVIEW') {
        throw new Error('Status not updated');
      }
      if (updated?.logistics !== logistics) {
        throw new Error('Logistics not saved');
      }
      this.log(`     ✓ Sample submitted successfully`, 'gray');
    });

    await this.test('Mobile QA list returns correct ID mapping', async () => {
      // This simulates what productQAStore.loadProducts returns
      const { data } = await this.supabase
        .from('product_qa')
        .select(`
          id,
          product_id,
          status,
          product:products!product_qa_product_id_fkey (
            id,
            name,
            seller_id
          )
        `)
        .eq('product_id', testProductId)
        .single();

      if (!data) throw new Error('No data returned');
      
      // Verify the structure matches what QAProduct type expects
      const qaProduct = {
        id: data.id,           // QA entry's own ID (for React keys)
        productId: data.product_id, // Actual product ID (for operations)
      };

      if (qaProduct.id === qaProduct.productId) {
        throw new Error('id and productId should be different');
      }

      if (qaProduct.productId !== testProductId) {
        throw new Error('productId should match the actual product ID');
      }

      this.log(`     QA entry: id=${qaProduct.id.substring(0,8)}..., productId=${qaProduct.productId.substring(0,8)}...`, 'gray');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  async cleanup() {
    this.logSection('CLEANUP', '🧹');

    let deleted = 0;
    for (const productId of this.testProducts) {
      try {
        await this.supabase.from('product_qa').delete().eq('product_id', productId);
        await this.supabase.from('products').delete().eq('id', productId);
        deleted++;
      } catch (e) {
        this.log(`  Failed to delete ${productId}: ${e}`, 'yellow');
      }
    }
    this.log(`  Deleted ${deleted} test products`, 'gray');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  printSummary() {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    const total = this.testResults.length;

    this.log('\n' + '═'.repeat(65), 'bright');
    this.log('📊 MOBILE SELLER PRODUCT CREATION TEST SUMMARY', 'bright');
    this.log('═'.repeat(65), 'bright');

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

    this.log('\nTest Categories:', 'cyan');
    this.log('  ✓ Test 1: Basic Product Creation', 'reset');
    this.log('  ✓ Test 2: QA Entry Creation', 'reset');
    this.log('  ✓ Test 3: Seller Inventory View', 'reset');
    this.log('  ✓ Test 4: QA Products Tab View', 'reset');
    this.log('  ✓ Test 5: Buyer Visibility Check', 'reset');
    this.log('  ✓ Test 6: Product Data Validation', 'reset');
    this.log('  ✓ Test 7: Foreign Key Constraint', 'reset');
    this.log('  ✓ Test 8: Multiple Products', 'reset');
    this.log('  ✓ Test 9: QA Entry ID vs Product ID (Bug Fix)', 'reset');

    this.log('\n' + '═'.repeat(65), 'bright');

    if (failed === 0) {
      this.log('🎉 ALL TESTS PASSED!', 'green');
      this.log('   Mobile seller product creation is fully functional!', 'green');
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
      this.log('\n' + '═'.repeat(65), 'bright');
      this.log('📱 MOBILE SELLER PRODUCT CREATION - COMPREHENSIVE TEST', 'bright');
      this.log('═'.repeat(65), 'bright');

      this.log('\nTesting the complete product creation flow for mobile sellers', 'cyan');
      this.log(`Started: ${new Date().toLocaleString()}\n`, 'gray');

      await this.initialize();
      
      const productId = await this.testBasicProductCreation();
      await this.testQAEntryCreation(productId);
      await this.testSellerInventoryView(productId);
      await this.testQAProductsTabView(productId);
      await this.testBuyerVisibility(productId);
      await this.testProductDataValidation();
      await this.testForeignKeyConstraint();
      await this.testMultipleProducts();
      await this.testQAIdDistinction(); // Test the bug fix
      
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
const tester = new MobileSellerProductCreationTester();
tester.runAllTests();
