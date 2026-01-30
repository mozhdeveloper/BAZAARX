/**
 * Test Seeded Buyers and Reviews Script
 * Verifies buyer data, credentials, addresses, and product reviews
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

const buyerCredentials = [
  { email: 'anna.cruz@gmail.com', password: 'Buyer123!', name: 'Anna Marie Cruz' },
  { email: 'miguel.santos@gmail.com', password: 'Buyer123!', name: 'Miguel Antonio Santos' },
  { email: 'sofia.reyes@gmail.com', password: 'Buyer123!', name: 'Sofia Gabrielle Reyes' },
  { email: 'carlos.garcia@gmail.com', password: 'Buyer123!', name: 'Carlos Miguel Garcia' },
  { email: 'isabella.fernandez@gmail.com', password: 'Buyer123!', name: 'Isabella Rose Fernandez' },
  { email: 'rafael.mendoza@gmail.com', password: 'Buyer123!', name: 'Rafael Jose Mendoza' },
  { email: 'gabriela.torres@gmail.com', password: 'Buyer123!', name: 'Gabriela Maria Torres' },
  { email: 'daniel.villanueva@gmail.com', password: 'Buyer123!', name: 'Daniel James Villanueva' },
];

async function runTests() {
  console.log('============================================================');
  console.log('TESTING SEEDED BUYERS AND REVIEWS');
  console.log('============================================================\n');

  // Test 1: Check buyer profiles exist
  console.log('👤 Testing Buyer Profiles...\n');
  
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_type', 'buyer');

  if (profilesError) {
    logTest('Fetch buyer profiles', false, profilesError.message);
    return;
  }

  logTest('Fetch buyer profiles', true, `Found ${profiles.length} buyer profiles`);
  logTest('Minimum 8 buyers exist', profiles.length >= 8, `Count: ${profiles.length}`);

  // Test 2: Check specific buyers exist
  console.log('\n🔍 Testing Specific Buyers...\n');
  
  for (const cred of buyerCredentials) {
    const found = profiles.find(p => p.email === cred.email);
    logTest(`Buyer exists: ${cred.name}`, !!found);
  }

  // Test 3: Test buyer authentication
  console.log('\n🔐 Testing Buyer Authentication...\n');
  
  let authSuccessCount = 0;
  for (const cred of buyerCredentials.slice(0, 3)) { // Test first 3 to save time
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cred.email,
      password: cred.password,
    });
    
    const passed = !error && !!data.user;
    if (passed) authSuccessCount++;
    
    logTest(`Login: ${cred.email}`, passed, error ? error.message : 'Authentication successful');
    await supabase.auth.signOut();
  }
  
  logTest('All tested logins work', authSuccessCount === 3, `${authSuccessCount}/3 successful`);

  // Test 4: Check buyer addresses
  console.log('\n📍 Testing Buyer Addresses...\n');
  
  const { data: addresses, error: addressesError } = await supabase
    .from('addresses')
    .select('*, profiles!inner(email)')
    .in('profiles.email', buyerCredentials.map(b => b.email));

  if (addressesError) {
    logTest('Fetch buyer addresses', false, addressesError.message);
  } else {
    logTest('Buyers have addresses', addresses.length >= 8, `${addresses.length} addresses found`);
    
    const withComplete = addresses.filter(a => a.street && a.city && a.province);
    logTest('Addresses are complete', withComplete.length >= 8, `${withComplete.length} complete addresses`);
  }

  // Test 5: Check reviews exist
  console.log('\n⭐ Testing Product Reviews...\n');
  
  const { count: reviewCount, error: reviewsError } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true });

  if (reviewsError) {
    logTest('Fetch reviews', false, reviewsError.message);
  } else {
    logTest('Reviews exist', (reviewCount || 0) > 0, `Total: ${reviewCount} reviews`);
    logTest('Significant review count (≥100)', (reviewCount || 0) >= 100, `Count: ${reviewCount}`);
  }

  // Test 6: Check review distribution
  console.log('\n📊 Testing Review Distribution...\n');
  
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating');

  if (reviews) {
    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      ratingCounts[r.rating as keyof typeof ratingCounts]++;
    });
    
    logTest('5-star reviews exist', ratingCounts[5] > 0, `Count: ${ratingCounts[5]}`);
    logTest('4-star reviews exist', ratingCounts[4] > 0, `Count: ${ratingCounts[4]}`);
    logTest('3-star reviews exist', ratingCounts[3] > 0, `Count: ${ratingCounts[3]}`);
    
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    logTest('Average rating is reasonable (3.5-5)', avgRating >= 3.5 && avgRating <= 5,
      `Average: ${avgRating.toFixed(2)} stars`);
  }

  // Test 7: Check reviews have comments
  console.log('\n💬 Testing Review Comments...\n');
  
  const { data: reviewsWithComments } = await supabase
    .from('reviews')
    .select('comment')
    .not('comment', 'is', null);

  if (reviewsWithComments) {
    logTest('Reviews have comments', reviewsWithComments.length > 0,
      `${reviewsWithComments.length} reviews with comments`);
    
    const withMeaningfulComments = reviewsWithComments.filter(r => 
      r.comment && r.comment.length > 10
    );
    logTest('Comments are meaningful (>10 chars)', withMeaningfulComments.length > 50,
      `${withMeaningfulComments.length} meaningful comments`);
  }

  // Test 8: Check products have been reviewed
  console.log('\n📦 Testing Product Review Coverage...\n');
  
  const { data: products } = await supabase
    .from('products')
    .select('id, name, rating, review_count')
    .eq('approval_status', 'approved');

  if (products) {
    const withReviews = products.filter(p => p.review_count && p.review_count > 0);
    logTest('Products have review counts', withReviews.length > 0,
      `${withReviews.length}/${products.length} products with reviews`);
    
    const withRatings = products.filter(p => p.rating && p.rating > 0);
    logTest('Products have ratings', withRatings.length > 0,
      `${withRatings.length}/${products.length} products with ratings`);
    
    const avgProductReviews = withReviews.reduce((sum, p) => sum + (p.review_count || 0), 0) / withReviews.length;
    logTest('Average reviews per product (≥3)', avgProductReviews >= 3,
      `Average: ${avgProductReviews.toFixed(1)} reviews per product`);
  }

  // Test 9: Check orders created for reviews
  console.log('\n🛒 Testing Order Records...\n');
  
  const { count: orderCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'delivered');

  logTest('Delivered orders exist', (orderCount || 0) > 0, `Count: ${orderCount}`);
  logTest('Significant order count (≥100)', (orderCount || 0) >= 100, `Count: ${orderCount}`);

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

  // Print credentials
  console.log('\n============================================================');
  console.log('BUYER LOGIN CREDENTIALS');
  console.log('============================================================\n');
  
  console.log('| Name                     | Email                          | Password    |');
  console.log('|--------------------------|--------------------------------|-------------|');
  
  for (const cred of buyerCredentials) {
    const namePad = cred.name.padEnd(24);
    const emailPad = cred.email.padEnd(30);
    console.log(`| ${namePad} | ${emailPad} | ${cred.password} |`);
  }
  
  console.log('\n============================================================');
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
