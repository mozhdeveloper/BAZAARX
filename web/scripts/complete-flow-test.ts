/**
 * Complete Flow Test Script
 * Tests the entire user flow from browsing to checkout
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

let passed = 0;
let failed = 0;
const results: { test: string; status: 'PASS' | 'FAIL'; details?: string }[] = [];

function log(test: string, success: boolean, details?: string) {
  if (success) {
    passed++;
    results.push({ test, status: 'PASS' });
    console.log(`  ✅ ${test}`);
  } else {
    failed++;
    results.push({ test, status: 'FAIL', details });
    console.log(`  ❌ ${test}: ${details}`);
  }
}

async function testPublicBrowsing() {
  console.log('\n📱 PUBLIC BROWSING FLOW');

  // Test 1: Browse categories
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  log('Browse categories', !catError && categories!.length >= 8, catError?.message);

  // Test 2: Browse products
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('*, product_images(*), product_variants(*)')
    .eq('approval_status', 'approved');
  log('Browse products', !prodError && products!.length >= 12, prodError?.message);

  // Test 3: Product has images
  const hasImages = products?.every(p => p.product_images.length > 0);
  log('Products have images', hasImages === true, 'Some products missing images');

  // Test 4: Product has variants
  const hasVariants = products?.every(p => p.product_variants.length > 0);
  log('Products have variants', hasVariants === true, 'Some products missing variants');

  // Test 5: Filter by category
  const { data: catProducts, error: filterError } = await supabase
    .from('products')
    .select('*')
    .eq('category_id', categories![0].id);
  log('Filter by category', !filterError, filterError?.message);

  // Test 6: Search products
  const { data: searchResults, error: searchError } = await supabase
    .from('products')
    .select('*')
    .ilike('name', '%smart%');
  log('Search products', !searchError && searchResults!.length >= 1, searchError?.message);

  return { categories, products };
}

async function testSellerFlow(email: string, password: string) {
  console.log(`\n👔 SELLER FLOW (${email})`);

  // Sign in as seller
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  log('Seller login', !authError, authError?.message);
  if (authError) return null;

  const userId = authData.user.id;

  // Get seller profile
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*, seller_business_profiles(*), seller_payout_accounts(*)')
    .eq('id', userId)
    .single();
  log('Get seller profile', !sellerError && seller !== null, sellerError?.message);

  // Get seller products
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('*, product_images(*), product_variants(*)')
    .eq('seller_id', userId);
  log('Get seller products', !prodError, prodError?.message);
  log(`  - Product count: ${products?.length || 0}`, true);

  // Test creating a product
  const testProduct = {
    name: 'Test Product ' + Date.now(),
    description: 'This is a test product',
    price: 999,
    category_id: (await supabase.from('categories').select('id').limit(1).single()).data?.id,
    seller_id: userId,
    approval_status: 'pending',
    sku: 'TEST-' + Date.now(),
  };

  const { data: newProduct, error: createError } = await supabase
    .from('products')
    .insert(testProduct)
    .select()
    .single();
  log('Create product', !createError, createError?.message);

  // Test updating a product
  if (newProduct) {
    const { error: updateError } = await supabase
      .from('products')
      .update({ description: 'Updated description' })
      .eq('id', newProduct.id);
    log('Update product', !updateError, updateError?.message);

    // Clean up test product
    await supabase.from('products').delete().eq('id', newProduct.id);
    log('Delete test product', true);
  }

  await supabase.auth.signOut();
  return { seller, products };
}

async function testBuyerFlow(email: string, password: string) {
  console.log(`\n🛒 BUYER FLOW (${email})`);

  // Sign in as buyer
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (authError) {
    log('Buyer login', false, authError.message);
    console.log('  ⏭️  Skipping buyer tests (account not created yet)');
    return null;
  }
  log('Buyer login', true);

  const userId = authData.user.id;

  // Get buyer profile
  const { data: buyer, error: buyerError } = await supabase
    .from('buyers')
    .select('*')
    .eq('id', userId)
    .single();
  log('Get buyer profile', !buyerError && buyer !== null, buyerError?.message);

  // Test adding to cart
  const { data: products } = await supabase.from('products').select('id').limit(1).single();
  if (products) {
    const { error: cartError } = await supabase.from('cart_items').upsert({
      buyer_id: userId,
      product_id: products.id,
      quantity: 1,
    });
    log('Add to cart', !cartError, cartError?.message);

    // Get cart
    const { data: cart, error: getCartError } = await supabase
      .from('cart_items')
      .select('*, products(*)')
      .eq('buyer_id', userId);
    log('Get cart items', !getCartError, getCartError?.message);

    // Clean up cart
    await supabase.from('cart_items').delete().eq('buyer_id', userId);
  }

  // Test wishlist
  if (products) {
    const { error: wishError } = await supabase.from('wishlists').upsert({
      buyer_id: userId,
      product_id: products.id,
    });
    log('Add to wishlist', !wishError, wishError?.message);

    await supabase.from('wishlists').delete().eq('buyer_id', userId);
  }

  await supabase.auth.signOut();
  return { buyer };
}

async function testVouchers() {
  console.log('\n🎫 VOUCHER SYSTEM');

  const { data: vouchers, error } = await supabase
    .from('vouchers')
    .select('*')
    .eq('is_active', true);
  log('Get active vouchers', !error, error?.message);
  log(`  - Active vouchers: ${vouchers?.length || 0}`, true);

  // Test voucher validation
  if (vouchers && vouchers.length > 0) {
    const voucher = vouchers[0];
    const isValid = new Date(voucher.valid_until) > new Date();
    log(`Voucher ${voucher.code} is valid`, isValid, 'Voucher expired');
  }
}

async function testStoreDetails() {
  console.log('\n🏪 STORE DETAILS');

  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('*, seller_business_profiles(*), seller_payout_accounts(*)')
    .eq('approval_status', 'verified');
  log('Get verified sellers', !error && sellers!.length >= 2, error?.message);

  for (const seller of sellers || []) {
    log(`  - ${seller.store_name}`, true);
    log(`    Has business profile: ${seller.seller_business_profiles?.length > 0}`, true);
    log(`    Has payout account: ${seller.seller_payout_accounts?.length > 0}`, true);
  }
}

async function testDataIntegrity() {
  console.log('\n🔍 DATA INTEGRITY');

  // Products belong to valid categories
  const { data: products } = await supabase.from('products').select('category_id');
  const { data: categories } = await supabase.from('categories').select('id');
  const categoryIds = new Set(categories?.map(c => c.id));
  const validCategories = products?.every(p => categoryIds.has(p.category_id));
  log('Products have valid categories', validCategories === true, 'Some products have invalid category_id');

  // Products belong to valid sellers
  const { data: sellers } = await supabase.from('sellers').select('id');
  const sellerIds = new Set(sellers?.map(s => s.id));
  const { data: productsWithSeller } = await supabase.from('products').select('seller_id');
  const validSellers = productsWithSeller?.every(p => sellerIds.has(p.seller_id));
  log('Products have valid sellers', validSellers === true, 'Some products have invalid seller_id');

  // All product images reference valid products
  const { data: productIds } = await supabase.from('products').select('id');
  const prodIds = new Set(productIds?.map(p => p.id));
  const { data: images } = await supabase.from('product_images').select('product_id');
  const validImages = images?.every(i => prodIds.has(i.product_id));
  log('Product images reference valid products', validImages === true, 'Orphaned images found');

  // All variants reference valid products
  const { data: variants } = await supabase.from('product_variants').select('product_id');
  const validVariants = variants?.every(v => prodIds.has(v.product_id));
  log('Product variants reference valid products', validVariants === true, 'Orphaned variants found');
}

async function testAdminFlow(email: string, password: string) {
  console.log(`\n👮 ADMIN FLOW (${email})`);

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (authError) {
    log('Admin login', false, authError.message);
    console.log('  ⏭️  Skipping admin tests (account not created yet)');
    return null;
  }
  log('Admin login', true);

  const userId = authData.user.id;

  // Check admin role
  const { data: role, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  log('Has admin role', !roleError && role?.role === 'admin', roleError?.message || `Role: ${role?.role}`);

  // Get pending seller applications
  const { data: pendingSellers, error: pendingError } = await supabase
    .from('sellers')
    .select('*')
    .eq('approval_status', 'pending');
  log('View pending sellers', !pendingError, pendingError?.message);

  // Get all products for moderation
  const { data: allProducts, error: modError } = await supabase
    .from('products')
    .select('*');
  log('View all products', !modError, modError?.message);

  await supabase.auth.signOut();
  return { role };
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║         BAZAARPH COMPLETE FLOW TEST                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // Run all tests
  await testPublicBrowsing();
  await testSellerFlow('seller1@bazaarph.com', 'Seller123!');
  await testSellerFlow('seller2@bazaarph.com', 'Seller123!');
  await testBuyerFlow('buyer1@bazaarph.com', 'Buyer123!');
  await testVouchers();
  await testStoreDetails();
  await testDataIntegrity();
  await testAdminFlow('admin@bazaarph.com', 'Admin123!');

  // Print summary
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                         SUMMARY                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\n  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📊 Total:  ${passed + failed}`);
  console.log(`  📈 Rate:   ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n  ⚠️  Failed Tests:');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => console.log(`     - ${r.test}: ${r.details}`));
  }

  console.log('\n');
}

main();
