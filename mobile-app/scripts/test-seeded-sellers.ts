/**
 * Test Seeded Sellers Script
 * Verifies all seller data, credentials, and products
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, details?: string) {
  results.push({ name, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (details) {
    console.log(`   → ${details}`);
  }
}

// Test seller credentials
const sellerCredentials = [
  { email: 'maria.santos@bazaarph.com', password: 'Seller123!', store: "Maria's Fashion House" },
  { email: 'juan.tech@bazaarph.com', password: 'Seller123!', store: 'TechHub Philippines' },
  { email: 'wellness.haven@bazaarph.com', password: 'Seller123!', store: 'Wellness Haven PH' },
  { email: 'home.essentials@bazaarph.com', password: 'Seller123!', store: 'Home Essentials Co.' },
  { email: 'active.sports@bazaarph.com', password: 'Seller123!', store: 'ActiveGear Sports' },
];

async function runTests() {
  console.log('============================================================');
  console.log('TESTING SEEDED SELLERS');
  console.log('============================================================\n');

  // Test 1: Check verified sellers exist
  console.log('👤 Testing Verified Sellers...\n');
  
  const { data: sellers, error: sellersError } = await supabase
    .from('sellers')
    .select('*')
    .eq('is_verified', true)
    .eq('approval_status', 'approved');

  if (sellersError) {
    logTest('Fetch verified sellers', false, sellersError.message);
    return;
  }

  logTest('Fetch verified sellers', true, `Found ${sellers.length} verified sellers`);
  logTest('Minimum 5 verified sellers', sellers.length >= 5, `Count: ${sellers.length}`);

  // Test 2: Check specific seeded sellers exist
  console.log('\n🏪 Testing Specific Stores...\n');
  
  for (const cred of sellerCredentials) {
    const found = sellers.find(s => s.store_name === cred.store);
    logTest(`Store exists: ${cred.store}`, !!found);
  }

  // Test 3: Check seller profile completeness
  console.log('\n📋 Testing Seller Profile Completeness...\n');
  
  const completeProfiles = sellers.filter(s => 
    s.store_name && 
    s.business_name && 
    s.store_description && 
    s.business_address
  );
  
  logTest('Sellers have complete profiles', completeProfiles.length >= 5,
    `${completeProfiles.length}/${sellers.length} have complete profiles`);

  const withBankDetails = sellers.filter(s => 
    s.bank_name && s.account_name && s.account_number
  );
  
  logTest('Sellers have bank details', withBankDetails.length >= 5,
    `${withBankDetails.length}/${sellers.length} have bank details`);

  const withDocuments = sellers.filter(s => 
    s.business_permit_url || s.valid_id_url
  );
  
  logTest('Sellers have document URLs', withDocuments.length >= 5,
    `${withDocuments.length}/${sellers.length} have documents`);

  // Test 4: Test seller authentication
  console.log('\n🔐 Testing Seller Authentication...\n');
  
  for (const cred of sellerCredentials) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cred.email,
      password: cred.password,
    });
    
    logTest(`Login: ${cred.email}`, !error && !!data.user,
      error ? error.message : 'Authentication successful');
    
    // Sign out after each test
    await supabase.auth.signOut();
  }

  // Test 5: Check each seller has products
  console.log('\n📦 Testing Seller Products...\n');
  
  for (const seller of sellers.filter(s => sellerCredentials.some(c => c.store === s.store_name))) {
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, approval_status')
      .eq('seller_id', seller.id)
      .eq('approval_status', 'approved');

    if (productsError) {
      logTest(`Products for ${seller.store_name}`, false, productsError.message);
    } else {
      logTest(`Products for ${seller.store_name}`, products.length >= 3,
        `${products.length} approved products`);
    }
  }

  // Test 6: Check product quality for seeded sellers
  console.log('\n🎨 Testing Product Quality...\n');
  
  const { data: allProducts } = await supabase
    .from('products')
    .select('*, sellers!inner(store_name)')
    .eq('approval_status', 'approved')
    .in('sellers.store_name', sellerCredentials.map(c => c.store));

  if (allProducts) {
    const withImages = allProducts.filter(p => 
      p.primary_image && p.primary_image.startsWith('https://')
    );
    logTest('Products have real images', withImages.length >= 15,
      `${withImages.length} products with images`);

    const withVariants = allProducts.filter(p => 
      (p.colors && p.colors.length > 0) || (p.sizes && p.sizes.length > 0)
    );
    logTest('Products have variants', withVariants.length >= 15,
      `${withVariants.length} products with variants`);

    const withPricing = allProducts.filter(p => 
      p.price > 0 && p.original_price > p.price
    );
    logTest('Products have discount pricing', withPricing.length >= 10,
      `${withPricing.length} products with discounts`);

    const inStock = allProducts.filter(p => p.stock > 0);
    logTest('Products are in stock', inStock.length >= 15,
      `${inStock.length} products in stock`);
  }

  // Test 7: Check seller ratings
  console.log('\n⭐ Testing Seller Ratings...\n');
  
  const withRatings = sellers.filter(s => s.rating && s.rating > 0);
  logTest('Sellers have ratings', withRatings.length >= 5,
    `${withRatings.length}/${sellers.length} have ratings`);

  const highRated = sellers.filter(s => s.rating >= 4.5);
  logTest('Sellers are highly rated (≥4.5)', highRated.length >= 4,
    `${highRated.length} sellers with 4.5+ rating`);

  // Test 8: Check seller sales
  console.log('\n💰 Testing Seller Sales...\n');
  
  const withSales = sellers.filter(s => s.total_sales > 0);
  logTest('Sellers have sales records', withSales.length >= 5,
    `${withSales.length}/${sellers.length} have sales`);

  const topSellers = sellers.filter(s => s.total_sales >= 10000);
  logTest('Top sellers exist (≥10k sales)', topSellers.length >= 3,
    `${topSellers.length} sellers with 10k+ sales`);

  // Test 9: Verify business types
  console.log('\n🏢 Testing Business Types...\n');
  
  const businessTypes = [...new Set(sellers.map(s => s.business_type).filter(Boolean))];
  logTest('Multiple business types', businessTypes.length >= 2,
    `Types: ${businessTypes.join(', ')}`);

  // Test 10: Check store categories
  console.log('\n📂 Testing Store Categories...\n');
  
  const withCategories = sellers.filter(s => 
    s.store_category && Array.isArray(s.store_category) && s.store_category.length > 0
  );
  logTest('Sellers have store categories', withCategories.length >= 5,
    `${withCategories.length}/${sellers.length} have categories`);

  // Summary
  console.log('\n============================================================');
  console.log('TEST SUMMARY');
  console.log('============================================================');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`\n✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`📊 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}${r.details ? `: ${r.details}` : ''}`);
    });
  }

  // Print credentials table
  console.log('\n============================================================');
  console.log('SELLER LOGIN CREDENTIALS');
  console.log('============================================================\n');
  
  console.log('| Store Name                  | Email                          | Password    |');
  console.log('|----------------------------|--------------------------------|-------------|');
  
  for (const cred of sellerCredentials) {
    const storePad = cred.store.padEnd(27);
    const emailPad = cred.email.padEnd(30);
    console.log(`| ${storePad} | ${emailPad} | ${cred.password} |`);
  }
  
  console.log('\n============================================================');
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
