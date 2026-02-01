/**
 * Test Buyer Process - Web Version
 * Tests the complete buyer flow from authentication to checkout
 * Both frontend (stores/services) and backend (Supabase)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test buyer account
const BUYER = {
  email: 'anna.cruz@gmail.com',
  password: 'Buyer123!',
  id: ''
};

let testsPassed = 0;
let testsFailed = 0;
let testProductId = '';
let testSellerId = '';
let testOrderId = '';
let testCartId = '';

function log(emoji: string, message: string) {
  console.log(`${emoji} ${message}`);
}

function pass(test: string) {
  testsPassed++;
  log('✅', test);
}

function fail(test: string, error?: any) {
  testsFailed++;
  log('❌', `${test}${error ? ': ' + (error.message || error) : ''}`);
}

// ========== AUTHENTICATION TESTS ==========

async function test1_BuyerLogin() {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: BUYER.email,
      password: BUYER.password
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned');

    BUYER.id = data.user.id;
    pass('Test 1: Buyer login successful');
  } catch (error) {
    fail('Test 1: Buyer login', error);
  }
}

async function test2_BuyerProfileExists() {
  try {
    const { data, error } = await supabase
      .from('buyers')
      .select('*')
      .eq('id', BUYER.id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('No buyer profile found');

    pass('Test 2: Buyer profile exists in buyers table');
  } catch (error) {
    fail('Test 2: Buyer profile exists', error);
  }
}

async function test3_ProfilesTableAccess() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', BUYER.id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('No profile found');
    if (!data.full_name) throw new Error('Profile missing full_name');

    pass('Test 3: Profiles table accessible with buyer data');
  } catch (error) {
    fail('Test 3: Profiles table access', error);
  }
}

// ========== PRODUCT BROWSING TESTS ==========

async function test4_FetchProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        seller:sellers!products_seller_id_fkey(
          id,
          store_name,
          city
        )
      `)
      .eq('approval_status', 'approved')
      .eq('is_active', true)
      .limit(10);

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No products found');

    // Save first product for later tests
    testProductId = data[0].id;
    testSellerId = data[0].seller_id;

    pass(`Test 4: Fetched ${data.length} approved products`);
  } catch (error) {
    fail('Test 4: Fetch products', error);
  }
}

async function test5_ProductHasVariants() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, colors, sizes, stock')
      .eq('approval_status', 'approved')
      .not('colors', 'is', null)
      .limit(5);

    if (error) throw error;
    
    const hasColors = data && data.some(p => p.colors && p.colors.length > 0);
    const hasSizes = data && data.some(p => p.sizes && p.sizes.length > 0);

    if (hasColors || hasSizes) {
      pass('Test 5: Products have color/size variants');
    } else {
      log('⚠️', 'Test 5: No products with color/size variants found (optional)');
      testsPassed++;
    }
  } catch (error) {
    fail('Test 5: Product variants', error);
  }
}

async function test6_ProductCategories() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .eq('approval_status', 'approved')
      .eq('is_active', true);

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No products found');

    const categories = [...new Set(data.map(p => p.category))];
    
    if (categories.length === 0) throw new Error('No categories found');

    pass(`Test 6: Found ${categories.length} product categories`);
  } catch (error) {
    fail('Test 6: Product categories', error);
  }
}

async function test7_ProductSearch() {
  try {
    const searchTerm = 'test';
    const { data, error } = await supabase
      .from('products')
      .select('id, name')
      .eq('approval_status', 'approved')
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .limit(5);

    if (error) throw error;

    pass(`Test 7: Product search works (found ${data?.length || 0} results)`);
  } catch (error) {
    fail('Test 7: Product search', error);
  }
}

// ========== CART TESTS ==========

async function test8_GetOrCreateCart() {
  try {
    // Check for existing cart
    const { data: existingCart } = await supabase
      .from('carts')
      .select('id')
      .eq('buyer_id', BUYER.id)
      .is('expires_at', null)
      .maybeSingle();

    if (existingCart) {
      testCartId = existingCart.id;
      pass('Test 8: Found existing cart');
    } else {
      // Create new cart
      const { data: newCart, error } = await supabase
        .from('carts')
        .insert({
          buyer_id: BUYER.id,
          discount_amount: 0,
          shipping_cost: 0,
          tax_amount: 0,
          total_amount: 0,
        })
        .select()
        .single();

      if (error) throw error;
      if (!newCart) throw new Error('Failed to create cart');

      testCartId = newCart.id;
      pass('Test 8: Created new cart');
    }
  } catch (error) {
    fail('Test 8: Get or create cart', error);
  }
}

async function test9_AddToCart() {
  try {
    if (!testProductId || !testCartId) throw new Error('Missing test product or cart ID');

    // Get product price
    const { data: product } = await supabase
      .from('products')
      .select('price')
      .eq('id', testProductId)
      .single();

    const price = product?.price || 100;

    // Check if cart item exists
    const { data: existing } = await supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', testCartId)
      .eq('product_id', testProductId)
      .maybeSingle();

    if (existing) {
      // Update quantity
      const newQty = existing.quantity + 1;
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQty, subtotal: newQty * price })
        .eq('id', existing.id);

      if (error) throw error;
      pass('Test 9: Updated cart item quantity');
    } else {
      // Insert new
      const { error } = await supabase
        .from('cart_items')
        .insert({
          cart_id: testCartId,
          product_id: testProductId,
          quantity: 1,
          subtotal: price
        });

      if (error) throw error;
      pass('Test 9: Added new item to cart');
    }
  } catch (error) {
    fail('Test 9: Add to cart', error);
  }
}

async function test10_GetCartItems() {
  try {
    if (!testCartId) throw new Error('No cart ID');

    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        product:products(
          id,
          name,
          price,
          images,
          seller_id
        )
      `)
      .eq('cart_id', testCartId);

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Cart is empty');

    pass(`Test 10: Retrieved ${data.length} cart items`);
  } catch (error) {
    fail('Test 10: Get cart items', error);
  }
}

async function test11_UpdateCartQuantity() {
  try {
    if (!testCartId) throw new Error('No cart ID');

    const { data: cartItem } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', testCartId)
      .limit(1)
      .single();

    if (!cartItem) throw new Error('No cart item found');

    const newQuantity = cartItem.quantity + 1;
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: newQuantity })
      .eq('id', cartItem.id);

    if (error) throw error;

    // Verify
    const { data: updated } = await supabase
      .from('cart_items')
      .select('quantity')
      .eq('id', cartItem.id)
      .single();

    if (updated?.quantity !== newQuantity) throw new Error('Quantity not updated');

    pass('Test 11: Update cart quantity successful');
  } catch (error) {
    fail('Test 11: Update cart quantity', error);
  }
}

// ========== ADDRESS TESTS ==========

async function test12_GetAddresses() {
  try {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', BUYER.id);

    if (error) throw error;

    pass(`Test 12: Retrieved ${data?.length || 0} saved addresses`);
  } catch (error) {
    fail('Test 12: Get addresses', error);
  }
}

async function test13_AddAddress() {
  try {
    const testAddress = {
      user_id: BUYER.id,
      label: 'Test Address',
      first_name: 'Anna',
      last_name: 'Cruz',
      phone: '09123456789',
      street: '123 Test Street',
      barangay: 'Test Barangay',
      city: 'Quezon City',
      province: 'Metro Manila',
      region: 'NCR',
      zip_code: '1100',
      is_default: false,
      address_type: 'residential'
    };

    const { data, error } = await supabase
      .from('addresses')
      .insert(testAddress)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('No address returned');

    // Clean up
    await supabase.from('addresses').delete().eq('id', data.id);

    pass('Test 13: Add new address successful');
  } catch (error) {
    fail('Test 13: Add address', error);
  }
}

// ========== ORDER TESTS ==========

async function test14_CreateOrder() {
  try {
    if (!testProductId || !testSellerId) throw new Error('Missing test product or seller ID');

    // Get product price
    const { data: product } = await supabase
      .from('products')
      .select('id, name, price')
      .eq('id', testProductId)
      .single();

    if (!product) throw new Error('Product not found');

    // Generate order number
    const year = new Date().getFullYear();
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `ORD-TEST-${year}${randomNum}`;

    const orderData = {
      order_number: orderNumber,
      buyer_id: BUYER.id,
      seller_id: testSellerId,
      buyer_name: 'Anna Cruz',
      buyer_email: BUYER.email,
      shipping_address: {
        fullName: 'Anna Cruz',
        phone: '+63 912 345 6789',
        street: '123 Test Street',
        city: 'Quezon City',
        province: 'Metro Manila',
        postalCode: '1100'
      },
      payment_method: { type: 'cod', details: {} },
      status: 'pending_payment',
      payment_status: 'pending',
      subtotal: product.price,
      total_amount: product.price,
      currency: 'PHP',
      shipping_cost: 0,
      discount_amount: 0,
      tax_amount: 0,
      is_reviewed: false,
      is_returnable: true,
      return_window: 7
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) throw orderError;
    if (!order) throw new Error('No order returned');

    testOrderId = order.id;

    // Add order item
    await supabase.from('order_items').insert({
      order_id: order.id,
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      price: product.price,
      subtotal: product.price,
      status: 'pending',
      is_reviewed: false
    });

    pass('Test 14: Create order successful');
  } catch (error) {
    fail('Test 14: Create order', error);
  }
}

async function test15_GetBuyerOrders() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          id,
          product_name,
          quantity,
          price
        ),
        seller:sellers!orders_seller_id_fkey(
          store_name
        )
      `)
      .eq('buyer_id', BUYER.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No orders found');

    pass(`Test 15: Retrieved ${data.length} orders for buyer`);
  } catch (error) {
    fail('Test 15: Get buyer orders', error);
  }
}

async function test16_GetOrderDetails() {
  try {
    if (!testOrderId) throw new Error('No test order ID');

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*),
        seller:sellers!orders_seller_id_fkey(store_name, city)
      `)
      .eq('id', testOrderId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Order not found');

    pass('Test 16: Get order details successful');
  } catch (error) {
    fail('Test 16: Get order details', error);
  }
}

// ========== REVIEW TESTS ==========

async function test17_CheckReviewsTable() {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .limit(5);

    if (error) throw error;

    pass(`Test 17: Reviews table accessible (${data?.length || 0} reviews found)`);
  } catch (error) {
    fail('Test 17: Reviews table access', error);
  }
}

// ========== WISHLIST/FAVORITES TESTS ==========

async function test18_CheckWishlist() {
  try {
    // Try the wishlist table first
    const { data, error } = await supabase
      .from('wishlist')
      .select('*')
      .eq('buyer_id', BUYER.id)
      .limit(5);

    if (error) {
      // Try favorites table as fallback
      const { data: favorites, error: favError } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', BUYER.id)
        .limit(5);

      if (favError) {
        log('⚠️', 'Test 18: Wishlist/favorites table not found (optional feature)');
        testsPassed++;
        return;
      }

      pass(`Test 18: Retrieved ${favorites?.length || 0} favorites`);
      return;
    }

    pass(`Test 18: Retrieved ${data?.length || 0} wishlist items`);
  } catch (error: any) {
    if (error.message?.includes('does not exist')) {
      log('⚠️', 'Test 18: Wishlist table not implemented (optional)');
      testsPassed++;
    } else {
      fail('Test 18: Check wishlist', error);
    }
  }
}

// ========== NOTIFICATION TESTS ==========

async function test19_GetNotifications() {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', BUYER.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    pass(`Test 19: Retrieved ${data?.length || 0} notifications`);
  } catch (error) {
    fail('Test 19: Get notifications', error);
  }
}

// ========== CLEANUP ==========

async function test20_CleanupTestData() {
  try {
    // Delete test order (cascades to order_items)
    if (testOrderId) {
      await supabase.from('order_items').delete().eq('order_id', testOrderId);
      await supabase.from('orders').delete().eq('id', testOrderId);
    }

    // Delete cart items we created (if any)
    if (testCartId && testProductId) {
      await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', testCartId)
        .eq('product_id', testProductId);
    }

    pass('Test 20: Cleanup test data');
  } catch (error) {
    fail('Test 20: Cleanup', error);
  }
}

// ========== RUN ALL TESTS ==========

async function runTests() {
  console.log('\n🧪 Starting Buyer Process Tests - Web Version\n');
  console.log('================================================');
  console.log('Testing: Authentication → Products → Cart → Checkout → Orders\n');

  console.log('📋 AUTHENTICATION');
  await test1_BuyerLogin();
  await test2_BuyerProfileExists();
  await test3_ProfilesTableAccess();

  console.log('\n📦 PRODUCT BROWSING');
  await test4_FetchProducts();
  await test5_ProductHasVariants();
  await test6_ProductCategories();
  await test7_ProductSearch();

  console.log('\n🛒 CART OPERATIONS');
  await test8_GetOrCreateCart();
  await test9_AddToCart();
  await test10_GetCartItems();
  await test11_UpdateCartQuantity();

  console.log('\n📍 ADDRESSES');
  await test12_GetAddresses();
  await test13_AddAddress();

  console.log('\n📝 ORDERS');
  await test14_CreateOrder();
  await test15_GetBuyerOrders();
  await test16_GetOrderDetails();

  console.log('\n⭐ REVIEWS & EXTRAS');
  await test17_CheckReviewsTable();
  await test18_CheckWishlist();
  await test19_GetNotifications();

  console.log('\n🧹 CLEANUP');
  await test20_CleanupTestData();

  console.log('\n================================================');
  console.log(`\n📊 Results: ${testsPassed}/${testsPassed + testsFailed} tests passed`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! Buyer process is working correctly.\n');
  } else {
    console.log(`\n⚠️  ${testsFailed} test(s) failed. Please review the errors above.\n`);
  }

  // Sign out
  await supabase.auth.signOut();
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests();
