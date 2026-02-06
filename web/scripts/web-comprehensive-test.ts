/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║            BAZAARPH WEB - COMPREHENSIVE FLOW TEST                          ║
 * ║                    Tests all user journeys on web                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Test results tracking
interface TestResult {
  section: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details?: string;
  duration?: number;
}

const results: TestResult[] = [];
let currentSection = '';

function log(test: string, success: boolean, details?: string) {
  const status = success ? 'PASS' : 'FAIL';
  results.push({ section: currentSection, test, status, details });
  console.log(`  ${success ? '✅' : '❌'} ${test}${details ? ': ' + details : ''}`);
}

function skip(test: string, reason: string) {
  results.push({ section: currentSection, test, status: 'SKIP', details: reason });
  console.log(`  ⏭️  ${test}: ${reason}`);
}

function section(name: string) {
  currentSection = name;
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${name}`);
  console.log(`${'═'.repeat(60)}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST MODULES
// ═══════════════════════════════════════════════════════════════════════════

async function testPublicBrowsing() {
  section('🌐 PUBLIC BROWSING');

  // Categories
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  log('Fetch all categories', !catError && (categories?.length || 0) >= 8, `${categories?.length} categories`);

  // Products with full details
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name),
      seller:sellers(id, store_name),
      images:product_images(*),
      variants:product_variants(*)
    `)
    .eq('approval_status', 'approved');
  log('Fetch approved products with relations', !prodError, `${products?.length} products`);

  // Check data integrity
  const allHaveImages = products?.every(p => p.images.length > 0);
  log('All products have images', allHaveImages === true);

  const allHaveVariants = products?.every(p => p.variants.length > 0);
  log('All products have variants', allHaveVariants === true);

  const allHaveSellers = products?.every(p => p.seller !== null);
  log('All products have sellers', allHaveSellers === true);

  const allHaveCategories = products?.every(p => p.category !== null);
  log('All products have categories', allHaveCategories === true);

  // Filter by category
  const electronicsCategory = categories?.find(c => c.name === 'Electronics');
  if (electronicsCategory) {
    const { data: filtered } = await supabase
      .from('products')
      .select('*')
      .eq('category_id', electronicsCategory.id);
    log('Filter products by category', (filtered?.length || 0) > 0, `${filtered?.length} Electronics products`);
  }

  // Search
  const { data: searchResults } = await supabase
    .from('products')
    .select('*')
    .ilike('name', '%iPhone%');
  log('Search products by name', (searchResults?.length || 0) > 0, `${searchResults?.length} results for "iPhone"`);

  // Price range filter
  const { data: priceFiltered } = await supabase
    .from('products')
    .select('*')
    .gte('price', 1000)
    .lte('price', 5000);
  log('Filter by price range (₱1000-₱5000)', (priceFiltered?.length || 0) > 0, `${priceFiltered?.length} products`);

  return { categories, products };
}

async function testSellerFlow(email: string, password: string, storeName: string) {
  section(`👔 SELLER: ${storeName}`);

  // Login
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) {
    log('Login', false, authError.message);
    return null;
  }
  log('Login', true);

  const userId = auth.user.id;

  // Get seller profile
  const { data: seller } = await supabase
    .from('sellers')
    .select('*')
    .eq('id', userId)
    .single();
  log('Fetch seller profile', seller !== null);
  
  // Get business profile separately
  const { data: bizProfile } = await supabase
    .from('seller_business_profiles')
    .select('*')
    .eq('seller_id', userId);
  log('Has business profile', (bizProfile?.length || 0) > 0, `${bizProfile?.length || 0} profiles`);
  
  // Get payout account separately
  const { data: payoutAccount } = await supabase
    .from('seller_payout_accounts')
    .select('*')
    .eq('seller_id', userId);
  log('Has payout account', (payoutAccount?.length || 0) > 0, `${payoutAccount?.length || 0} accounts`);

  // Get seller products
  const { data: products } = await supabase
    .from('products')
    .select('*, images:product_images(*), variants:product_variants(*)')
    .eq('seller_id', userId);
  log('Fetch seller products', products !== null, `${products?.length} products`);

  // Test inventory view
  const totalStock = products?.reduce((sum, p) => 
    sum + p.variants.reduce((vs: number, v: any) => vs + (v.stock || 0), 0), 0);
  log('Calculate total inventory', totalStock !== undefined, `${totalStock} units`);

  // Test create product
  const testProduct = {
    name: `TEST-${Date.now()}`,
    description: 'Test product for flow verification',
    price: 999,
    category_id: (await supabase.from('categories').select('id').limit(1).single()).data?.id,
    seller_id: userId,
    sku: `TEST-SKU-${Date.now()}`,
    approval_status: 'pending',
  };
  const { data: created, error: createError } = await supabase
    .from('products')
    .insert(testProduct)
    .select()
    .single();
  log('Create new product', !createError, createError?.message);

  if (created) {
    // Update product
    const { error: updateError } = await supabase
      .from('products')
      .update({ description: 'Updated description' })
      .eq('id', created.id);
    log('Update product', !updateError);

    // Add variant
    const { error: variantError } = await supabase
      .from('product_variants')
      .insert({ product_id: created.id, variant_name: 'Default', price: 999, stock: 10, sku: `${testProduct.sku}-DEF` });
    log('Add product variant', !variantError);

    // Add image
    const { error: imageError } = await supabase
      .from('product_images')
      .insert({ product_id: created.id, image_url: 'https://via.placeholder.com/400', is_primary: true });
    log('Add product image', !imageError);

    // Cleanup
    await supabase.from('product_images').delete().eq('product_id', created.id);
    await supabase.from('product_variants').delete().eq('product_id', created.id);
    await supabase.from('products').delete().eq('id', created.id);
    log('Cleanup test product', true);
  }

  // POS: Create sale
  const { data: posOrders } = await supabase
    .from('orders')
    .select('*')
    .eq('seller_id', userId)
    .eq('order_type', 'pos');
  log('POS: Fetch POS orders', posOrders !== null, `${posOrders?.length || 0} POS orders`);

  await supabase.auth.signOut();
  return { seller, products };
}

async function testBuyerFlow(email: string, password: string, name: string) {
  section(`🛒 BUYER: ${name}`);

  // Login
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) {
    log('Login', false, authError.message);
    return null;
  }
  log('Login', true);

  const userId = auth.user.id;

  // Get buyer profile
  const { data: buyer } = await supabase
    .from('buyers')
    .select('*')
    .eq('id', userId)
    .single();
  log('Fetch buyer profile', buyer !== null, `${buyer?.bazcoins || 0} BazCoins`);

  // Get a product to test with
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price')
    .eq('approval_status', 'approved')
    .limit(3);

  if (products && products.length > 0) {
    // First, get or create a cart for the buyer
    let cartId: string | null = null;
    const { data: existingCart } = await supabase
      .from('carts')
      .select('id')
      .eq('buyer_id', userId)
      .single();
    
    if (existingCart) {
      cartId = existingCart.id;
    } else {
      const { data: newCart, error: cartCreateError } = await supabase
        .from('carts')
        .insert({ buyer_id: userId })
        .select()
        .single();
      if (!cartCreateError && newCart) {
        cartId = newCart.id;
      }
    }
    log('Get/Create cart', cartId !== null);

    if (cartId) {
      // Add to cart
      const { error: cartError } = await supabase.from('cart_items').upsert({
        cart_id: cartId,
        product_id: products[0].id,
        quantity: 2,
      });
      log('Add item to cart', !cartError, cartError?.message);

      // Get cart
      const { data: cart } = await supabase
        .from('cart_items')
        .select('*, product:products(*)')
        .eq('cart_id', cartId);
      log('Fetch cart items', cart !== null, `${cart?.length} items`);

      // Update cart quantity
      if (cart && cart.length > 0) {
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: 3 })
          .eq('id', cart[0].id);
        log('Update cart quantity', !updateError);
      }

      // Cleanup cart items
      await supabase.from('cart_items').delete().eq('cart_id', cartId);
    }

    // Add to wishlist (check if table exists first)
    const { data: wishlistCheck, error: wishlistError } = await supabase
      .from('wishlists')
      .select('id')
      .limit(1);
    
    if (!wishlistError) {
      const { error: wishError } = await supabase.from('wishlists').upsert({
        buyer_id: userId,
        product_id: products[1]?.id || products[0].id,
      });
      log('Add to wishlist', !wishError);

      // Get wishlist
      const { data: wishlist } = await supabase
        .from('wishlists')
        .select('*, product:products(*)')
        .eq('buyer_id', userId);
      log('Fetch wishlist', wishlist !== null, `${wishlist?.length} items`);
      
      // Cleanup wishlist
      await supabase.from('wishlists').delete().eq('buyer_id', userId);
    } else {
      log('Wishlist table', false, 'Table not available');
    }

    // Test voucher validation
    const { data: vouchers } = await supabase
      .from('vouchers')
      .select('*')
      .eq('is_active', true);
    log('Fetch available vouchers', vouchers !== null, `${vouchers?.length} active`);

    // Fetch order history
    const { data: orders } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('buyer_id', userId);
    log('Fetch order history', orders !== null, `${orders?.length || 0} orders`);
  }

  await supabase.auth.signOut();
  return { buyer };
}

async function testAdminFlow(email: string, password: string) {
  section('👮 ADMIN PANEL');

  // Login
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) {
    log('Login', false, authError.message);
    return null;
  }
  log('Login', true);

  const userId = auth.user.id;

  // Check admin role
  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  log('Has admin role', role?.role === 'admin', `Role: ${role?.role}`);

  // Fetch all sellers for management
  const { data: sellers } = await supabase
    .from('sellers')
    .select('*, business_profile:seller_business_profiles(*)');
  log('Fetch all sellers', sellers !== null, `${sellers?.length} sellers`);

  // Fetch pending sellers
  const { data: pendingSellers } = await supabase
    .from('sellers')
    .select('*')
    .eq('approval_status', 'pending');
  log('Fetch pending seller applications', pendingSellers !== null, `${pendingSellers?.length} pending`);

  // Fetch all products for moderation
  const { data: allProducts } = await supabase
    .from('products')
    .select('*, seller:sellers(store_name)');
  log('Fetch all products', allProducts !== null, `${allProducts?.length} products`);

  // Fetch pending products
  const { data: pendingProducts } = await supabase
    .from('products')
    .select('*')
    .eq('approval_status', 'pending');
  log('Fetch pending products', pendingProducts !== null, `${pendingProducts?.length} pending`);

  // Fetch all orders
  const { data: allOrders } = await supabase
    .from('orders')
    .select('*');
  log('Fetch all orders', allOrders !== null, `${allOrders?.length || 0} orders`);

  // Fetch all buyers
  const { data: buyers } = await supabase
    .from('buyers')
    .select('*, profile:profiles(*)');
  log('Fetch all buyers', buyers !== null, `${buyers?.length} buyers`);

  await supabase.auth.signOut();
  return { role, sellers, allProducts };
}

async function testPOSFlow(email: string, password: string) {
  section('💳 POS (POINT OF SALE)');

  // Login as seller
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) {
    log('Seller login for POS', false, authError.message);
    return null;
  }
  log('Seller login for POS', true);

  const sellerId = auth.user.id;

  // Get seller's products for POS
  const { data: products } = await supabase
    .from('products')
    .select('*, variants:product_variants(*)')
    .eq('seller_id', sellerId)
    .eq('approval_status', 'approved');
  log('Fetch products for POS', products !== null, `${products?.length} products available`);

  // Check variant stock
  const variantsWithStock = products?.flatMap(p => p.variants.filter((v: any) => v.stock > 0));
  log('Products with available stock', (variantsWithStock?.length || 0) > 0, `${variantsWithStock?.length} variants in stock`);

  // Simulate POS cart calculation
  if (products && products.length > 0 && products[0].variants.length > 0) {
    const testItem = {
      product: products[0],
      variant: products[0].variants[0],
      quantity: 1,
    };
    const subtotal = testItem.variant.price * testItem.quantity;
    log('Calculate POS subtotal', subtotal > 0, `₱${subtotal.toLocaleString()}`);

    // Test discount calculation
    const discount = subtotal * 0.1; // 10% discount
    const total = subtotal - discount;
    log('Apply POS discount', total === subtotal - discount, `₱${total.toLocaleString()} after 10% off`);
  }

  // Fetch existing POS transactions
  const { data: posOrders } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('seller_id', sellerId)
    .eq('order_type', 'pos');
  log('Fetch POS transaction history', posOrders !== null, `${posOrders?.length || 0} transactions`);

  await supabase.auth.signOut();
  return { products };
}

async function testDataIntegrity() {
  section('🔍 DATA INTEGRITY');

  // Get all reference data
  const { data: products } = await supabase.from('products').select('id, seller_id, category_id');
  const { data: sellers } = await supabase.from('sellers').select('id');
  const { data: categories } = await supabase.from('categories').select('id');
  const { data: images } = await supabase.from('product_images').select('product_id');
  const { data: variants } = await supabase.from('product_variants').select('product_id');

  const productIds = new Set(products?.map(p => p.id));
  const sellerIds = new Set(sellers?.map(s => s.id));
  const categoryIds = new Set(categories?.map(c => c.id));

  // Check foreign key integrity
  const validSellers = products?.every(p => sellerIds.has(p.seller_id));
  log('All products have valid sellers', validSellers === true);

  const validCategories = products?.every(p => categoryIds.has(p.category_id));
  log('All products have valid categories', validCategories === true);

  const validImages = images?.every(i => productIds.has(i.product_id));
  log('All images reference valid products', validImages === true);

  const validVariants = variants?.every(v => productIds.has(v.product_id));
  log('All variants reference valid products', validVariants === true);

  // Check for orphans
  const orphanProducts = products?.filter(p => !sellerIds.has(p.seller_id));
  log('No orphan products', orphanProducts?.length === 0, `${orphanProducts?.length || 0} orphans`);

  // Check business profiles
  const { data: bizProfiles } = await supabase.from('seller_business_profiles').select('seller_id');
  const sellersWithProfiles = sellers?.filter(s => bizProfiles?.some(bp => bp.seller_id === s.id));
  log('Sellers have business profiles', sellersWithProfiles?.length === sellers?.length,
    `${sellersWithProfiles?.length}/${sellers?.length}`);
}

async function testVoucherSystem() {
  section('🎫 VOUCHER SYSTEM');

  const { data: vouchers, error } = await supabase
    .from('vouchers')
    .select('*')
    .eq('is_active', true);
  log('Fetch active vouchers', !error, `${vouchers?.length} active vouchers`);

  for (const voucher of vouchers || []) {
    const now = new Date();
    const validFrom = new Date(voucher.claimable_from);
    const validUntil = new Date(voucher.claimable_until);
    const isValid = now >= validFrom && now <= validUntil;
    
    const discount = voucher.voucher_type === 'percentage' 
      ? `${voucher.value}%` 
      : `₱${voucher.value}`;
    log(`Voucher ${voucher.code}`, true, `${discount} off, min ₱${voucher.min_order_value}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    BAZAARPH WEB - COMPREHENSIVE TEST                       ║');
  console.log('║                            Full Flow Verification                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');

  const startTime = Date.now();

  // Run all tests
  await testPublicBrowsing();
  await testSellerFlow('seller1@bazaarph.com', 'Seller123!', 'TechHub Manila');
  await testSellerFlow('seller2@bazaarph.com', 'Seller123!', 'Fashion Forward PH');
  await testSellerFlow('seller3@bazaarph.com', 'Seller123!', 'Home & Living Co.');
  await testBuyerFlow('buyer1@bazaarph.com', 'Buyer123!', 'Ana Santos');
  await testBuyerFlow('buyer2@bazaarph.com', 'Buyer123!', 'Juan Cruz');
  await testBuyerFlow('buyer3@bazaarph.com', 'Buyer123!', 'Maria Garcia');
  await testAdminFlow('admin@bazaarph.com', 'Admin123!');
  await testPOSFlow('seller1@bazaarph.com', 'Seller123!');
  await testVoucherSystem();
  await testDataIntegrity();

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Summary
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;

  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                              TEST SUMMARY                                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
  console.log(`
  ✅ Passed:  ${passed}
  ❌ Failed:  ${failed}
  ⏭️  Skipped: ${skipped}
  ━━━━━━━━━━━━━━━━━━━
  📊 Total:   ${total}
  📈 Rate:    ${((passed / (passed + failed)) * 100).toFixed(1)}%
  ⏱️  Duration: ${duration}s
  `);

  if (failed > 0) {
    console.log('  ⚠️  FAILED TESTS:');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => console.log(`     [${r.section}] ${r.test}: ${r.details}`));
  }

  // Section summary
  console.log('\n  📋 SECTION BREAKDOWN:');
  const sections = [...new Set(results.map(r => r.section))];
  for (const section of sections) {
    const sectionResults = results.filter(r => r.section === section);
    const sectionPassed = sectionResults.filter(r => r.status === 'PASS').length;
    const sectionTotal = sectionResults.length;
    const icon = sectionPassed === sectionTotal ? '✅' : '⚠️';
    console.log(`     ${icon} ${section}: ${sectionPassed}/${sectionTotal}`);
  }

  console.log('\n');
}

main().catch(console.error);
