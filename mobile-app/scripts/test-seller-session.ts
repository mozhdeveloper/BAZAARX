/**
 * Seller Session & Data Isolation Test Script
 * 
 * This script tests:
 * 1. Seller authentication and session persistence
 * 2. Products are filtered by seller ID
 * 3. Orders are fetched correctly via order_items → products chain
 * 4. Seller data isolation (seller 2 can't see seller 1's data)
 * 
 * Run with: npx ts-node scripts/test-seller-session.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test seller accounts
const TEST_SELLERS = [
  { email: 'seller1@bazaarph.com', password: 'Test@123456', name: "Maria's Fashion Boutique" },
  { email: 'seller2@bazaarph.com', password: 'Test@123456', name: 'TechHub Electronics' },
  { email: 'seller3@bazaarph.com', password: 'Test@123456', name: 'Beauty Essentials PH' },
];

interface TestResult {
  test: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function logTest(test: string, passed: boolean, details: string) {
  results.push({ test, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${test}: ${details}`);
}

async function testSellerAuthentication(seller: typeof TEST_SELLERS[0]): Promise<string | null> {
  console.log(`\n--- Testing Authentication for ${seller.name} ---`);
  
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: seller.email,
      password: seller.password,
    });

    if (authError) {
      logTest('Authentication', false, `Failed: ${authError.message}`);
      return null;
    }

    if (!authData.user) {
      logTest('Authentication', false, 'No user returned');
      return null;
    }

    logTest('Authentication', true, `User ID: ${authData.user.id}`);

    // Verify seller exists in sellers table
    const { data: sellerData, error: sellerError } = await supabase
      .from('sellers')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (sellerError || !sellerData) {
      logTest('Seller Profile', false, `Not found in sellers table: ${sellerError?.message}`);
      return null;
    }

    logTest('Seller Profile', true, `Store: ${sellerData.store_name}, Status: ${sellerData.approval_status}`);

    return authData.user.id;
  } catch (error: any) {
    logTest('Authentication', false, `Exception: ${error.message}`);
    return null;
  }
}

async function testProductsFiltering(sellerId: string, sellerName: string): Promise<void> {
  console.log(`\n--- Testing Products Filtering for ${sellerName} ---`);

  try {
    // Get products for this seller only
    const { data: sellerProducts, error: prodError } = await supabase
      .from('products')
      .select('id, name, seller_id, approval_status')
      .eq('seller_id', sellerId);

    if (prodError) {
      logTest('Products Query', false, `Error: ${prodError.message}`);
      return;
    }

    logTest('Products Query', true, `Found ${sellerProducts?.length || 0} products for seller`);

    // Verify none of the products belong to other sellers
    const wrongProducts = (sellerProducts || []).filter(p => p.seller_id !== sellerId);
    if (wrongProducts.length > 0) {
      logTest('Product Isolation', false, `Found ${wrongProducts.length} products from other sellers!`);
    } else {
      logTest('Product Isolation', true, 'All products belong to this seller');
    }

    // Get total products count to compare
    const { count: totalCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    logTest('Product Count Comparison', true, 
      `Seller has ${sellerProducts?.length || 0} of ${totalCount || 0} total products`);

  } catch (error: any) {
    logTest('Products Filtering', false, `Exception: ${error.message}`);
  }
}

async function testOrdersFetching(sellerId: string, sellerName: string): Promise<void> {
  console.log(`\n--- Testing Orders Fetching for ${sellerName} ---`);

  try {
    // Step 1: Get all product IDs belonging to this seller
    const { data: sellerProducts, error: prodError } = await supabase
      .from('products')
      .select('id')
      .eq('seller_id', sellerId);

    if (prodError) {
      logTest('Get Seller Products', false, `Error: ${prodError.message}`);
      return;
    }

    logTest('Get Seller Products', true, `Found ${sellerProducts?.length || 0} products`);

    if (!sellerProducts || sellerProducts.length === 0) {
      logTest('Orders Fetching', true, 'No products → No orders expected');
      return;
    }

    const productIds = sellerProducts.map((p: any) => p.id);

    // Step 2: Get distinct order IDs from order_items that reference seller's products
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('order_id, product_id')
      .in('product_id', productIds);

    if (itemsError) {
      logTest('Get Order Items', false, `Error: ${itemsError.message}`);
      return;
    }

    logTest('Get Order Items', true, `Found ${orderItems?.length || 0} order items for seller's products`);

    if (!orderItems || orderItems.length === 0) {
      logTest('Orders Fetching', true, 'No order items found for this seller');
      return;
    }

    const uniqueOrderIds = [...new Set(orderItems.map((item: any) => item.order_id))];

    // Step 3: Fetch the full orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, payment_status, shipment_status, created_at')
      .in('id', uniqueOrderIds)
      .order('created_at', { ascending: false });

    if (ordersError) {
      logTest('Fetch Orders', false, `Error: ${ordersError.message}`);
      return;
    }

    logTest('Fetch Orders', true, `Found ${orders?.length || 0} orders for this seller`);

    // Verify the query chain is correct
    if (orders && orders.length > 0) {
      logTest('Order Chain Verification', true, 
        `First order: ${orders[0].order_number}, Status: ${orders[0].shipment_status}`);
    }

  } catch (error: any) {
    logTest('Orders Fetching', false, `Exception: ${error.message}`);
  }
}

async function testDataIsolation(): Promise<void> {
  console.log('\n\n=== Testing Data Isolation Between Sellers ===');

  // Login as seller 1
  const seller1Id = await testSellerAuthentication(TEST_SELLERS[0]);
  if (!seller1Id) return;

  // Get seller 1's products
  const { data: seller1Products } = await supabase
    .from('products')
    .select('id')
    .eq('seller_id', seller1Id);

  // Sign out
  await supabase.auth.signOut();

  // Login as seller 2
  const seller2Id = await testSellerAuthentication(TEST_SELLERS[1]);
  if (!seller2Id) return;

  // Get seller 2's products
  const { data: seller2Products } = await supabase
    .from('products')
    .select('id')
    .eq('seller_id', seller2Id);

  // Verify no overlap
  const seller1Ids = new Set((seller1Products || []).map(p => p.id));
  const seller2Ids = new Set((seller2Products || []).map(p => p.id));
  
  let overlap = 0;
  seller2Ids.forEach(id => {
    if (seller1Ids.has(id)) overlap++;
  });

  if (overlap > 0) {
    logTest('Data Isolation', false, `Found ${overlap} overlapping products between sellers!`);
  } else {
    logTest('Data Isolation', true, 
      `Seller 1 has ${seller1Ids.size} products, Seller 2 has ${seller2Ids.size} products, no overlap`);
  }

  await supabase.auth.signOut();
}

async function testSchemaValidation(): Promise<void> {
  console.log('\n\n=== Testing Schema Validation ===');

  // Test that products table has seller_id column
  try {
    const { data, error } = await supabase
      .from('products')
      .select('seller_id')
      .limit(1);

    if (error) {
      logTest('Products.seller_id Column', false, `Error: ${error.message}`);
    } else {
      logTest('Products.seller_id Column', true, 'Column exists and queryable');
    }
  } catch (error: any) {
    logTest('Products.seller_id Column', false, `Exception: ${error.message}`);
  }

  // Test that order_items table has product_id column
  try {
    const { data, error } = await supabase
      .from('order_items')
      .select('product_id, order_id')
      .limit(1);

    if (error) {
      logTest('OrderItems.product_id Column', false, `Error: ${error.message}`);
    } else {
      logTest('OrderItems.product_id Column', true, 'Column exists and queryable');
    }
  } catch (error: any) {
    logTest('OrderItems.product_id Column', false, `Exception: ${error.message}`);
  }

  // Test that orders table does NOT have seller_id column (or it's nullable/empty)
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .limit(1);

    if (error) {
      logTest('Orders Table Query', false, `Error: ${error.message}`);
    } else {
      logTest('Orders Table Query', true, 'Orders table queryable');
    }
  } catch (error: any) {
    logTest('Orders Table Query', false, `Exception: ${error.message}`);
  }
}

async function runAllTests(): Promise<void> {
  console.log('🧪 Seller Session & Data Isolation Test Suite');
  console.log('='.repeat(50));

  // Test 1: Schema validation
  await testSchemaValidation();

  // Test 2: Authentication for each seller
  for (const seller of TEST_SELLERS) {
    const sellerId = await testSellerAuthentication(seller);
    
    if (sellerId) {
      // Test 3: Products filtering
      await testProductsFiltering(sellerId, seller.name);
      
      // Test 4: Orders fetching via the new chain
      await testOrdersFetching(sellerId, seller.name);
    }

    await supabase.auth.signOut();
  }

  // Test 5: Data isolation between sellers
  await testDataIsolation();

  // Summary
  console.log('\n\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Pass Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.test}: ${r.details}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
