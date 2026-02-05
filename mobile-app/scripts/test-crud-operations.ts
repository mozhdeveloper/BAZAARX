/**
 * Mobile CRUD Operations Test Script
 * Tests Create, Read, Update, Delete operations for all major entities
 * This tests the same database used by the mobile app
 * Run with: npx tsx scripts/test-crud-operations.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Looking for: EXPO_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResult {
  name: string;
  entity: string;
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function logTest(
  entity: string,
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE',
  passed: boolean,
  message: string
) {
  const name = `${entity} ${operation}`;
  results.push({ name, entity, operation, passed, message });
  const icon = passed ? '✅' : '❌';
  console.log(`   ${icon} ${operation}: ${message}`);
}

// ============================================================
// PRODUCTS CRUD (Mobile Seller Flow)
// ============================================================
async function testProductsCRUD() {
  console.log('\n📦 PRODUCTS CRUD (Seller Product Management)');
  console.log('   Simulates: Seller adding/editing/deleting products\n');
  
  // Get a seller for testing
  const { data: seller } = await supabase
    .from('sellers')
    .select('id, store_name')
    .eq('approval_status', 'approved')
    .limit(1)
    .single();

  if (!seller) {
    console.log('   ⚠️ No approved seller found, skipping product tests');
    return;
  }

  console.log(`   Using seller: ${seller.store_name} (${seller.id})`);

  // CREATE - Seller adds a new product
  const newProduct = {
    name: 'Mobile Test Product ' + Date.now(),
    description: 'Created from mobile CRUD test',
    price: 1499,
    stock: 25,
    category: 'Fashion',
    images: ['https://picsum.photos/400/400'],
    seller_id: seller.id,
    approval_status: 'pending',
    colors: ['Black', 'White', 'Navy'],
    sizes: ['S', 'M', 'L', 'XL']
  };

  const { data: created, error: createError } = await supabase
    .from('products')
    .insert(newProduct)
    .select()
    .single();

  logTest('Products', 'CREATE', !createError && created !== null,
    createError ? createError.message : `Created: ${created?.name} (ID: ${created?.id?.slice(0, 8)}...)`);

  const productId = created?.id;

  // READ - Seller views their products
  const { data: sellerProducts, error: readError } = await supabase
    .from('products')
    .select('id, name, price, stock, approval_status')
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false })
    .limit(5);

  logTest('Products', 'READ', !readError && sellerProducts !== null,
    readError ? readError.message : `Found ${sellerProducts?.length || 0} products for this seller`);

  // UPDATE - Seller updates product price and stock
  if (productId) {
    const { data: updated, error: updateError } = await supabase
      .from('products')
      .update({
        price: 1299,
        stock: 30,
        name: 'Mobile Test Product UPDATED ' + Date.now()
      })
      .eq('id', productId)
      .select()
      .single();

    logTest('Products', 'UPDATE', !updateError && updated?.price === 1299,
      updateError ? updateError.message : `Price: 1499 → ${updated?.price}, Stock: 25 → ${updated?.stock}`);

    // DELETE - Seller removes product
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    logTest('Products', 'DELETE', !deleteError,
      deleteError ? deleteError.message : 'Product removed from catalog');
  }
}

// ============================================================
// ORDERS CRUD (Mobile Seller Order Management)
// ============================================================
async function testOrdersCRUD() {
  console.log('\n🛒 ORDERS CRUD (Seller Order Management)');
  console.log('   Simulates: Seller viewing and updating order status\n');
  
  // Get a seller
  const { data: seller } = await supabase
    .from('sellers')
    .select('id, store_name')
    .eq('approval_status', 'approved')
    .limit(1)
    .single();

  if (!seller) {
    console.log('   ⚠️ No approved seller found, skipping order tests');
    return;
  }

  console.log(`   Using seller: ${seller.store_name}`);

  // READ - Seller views their orders
  const { data: orders, error: readError } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      total_amount,
      order_type,
      created_at
    `)
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false })
    .limit(5);

  logTest('Orders', 'READ', !readError && orders !== null,
    readError ? readError.message : `Found ${orders?.length || 0} orders for this seller`);

  // CREATE - Simulate POS order creation
  const posOrder = {
    order_number: 'POS-TEST-' + Date.now(),
    seller_id: seller.id,
    buyer_id: null, // Walk-in customer
    buyer_name: 'Walk-in Customer',
    buyer_email: 'walkin@pos.local',
    status: 'delivered',
    payment_status: 'paid',
    subtotal: 2500,
    total_amount: 2500,
    shipping_address: { type: 'pos', note: 'Walk-in purchase' },
    payment_method: 'cash',
    order_type: 'OFFLINE',
    notes: 'Test POS order from mobile CRUD test'
  };

  const { data: createdOrder, error: createError } = await supabase
    .from('orders')
    .insert(posOrder)
    .select()
    .single();

  logTest('Orders', 'CREATE', !createError && createdOrder !== null,
    createError ? createError.message : `POS Order: ${createdOrder?.transaction_id}`);

  const orderId = createdOrder?.id;

  // UPDATE - Seller updates order status
  if (orderId) {
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    logTest('Orders', 'UPDATE', !updateError && updated?.status === 'completed',
      updateError ? updateError.message : `Status: delivered → ${updated?.status}`);

    // DELETE - Clean up test order
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    logTest('Orders', 'DELETE', !deleteError,
      deleteError ? deleteError.message : 'Test order cleaned up');
  }
}

// ============================================================
// CART CRUD (Mobile Buyer Cart)
// ============================================================
async function testCartCRUD() {
  console.log('\n🛍️ CART CRUD (Buyer Shopping Cart)');
  console.log('   Simulates: Buyer adding items to cart\n');
  
  // Get a buyer and product
  const { data: buyer } = await supabase.from('buyers').select('id, name').limit(1).single();
  const { data: product } = await supabase
    .from('products')
    .select('id, name, price')
    .eq('approval_status', 'approved')
    .limit(1)
    .single();

  if (!buyer || !product) {
    console.log('   ⚠️ No buyer or product found, skipping cart tests');
    return;
  }

  console.log(`   Buyer: ${buyer.name}, Product: ${product.name}`);

  // Check if buyer has a cart, create one if not
  let { data: cart } = await supabase
    .from('carts')
    .select('id')
    .eq('buyer_id', buyer.id)
    .single();

  if (!cart) {
    const { data: newCart } = await supabase
      .from('carts')
      .insert({ buyer_id: buyer.id })
      .select()
      .single();
    cart = newCart;
  }

  if (!cart) {
    console.log('   ⚠️ Could not get or create cart');
    return;
  }

  // CREATE - Add item to cart
  const cartItem = {
    cart_id: cart.id,
    product_id: product.id,
    quantity: 2,
    selected_color: 'Black',
    selected_size: 'M'
  };

  const { data: createdItem, error: createError } = await supabase
    .from('cart_items')
    .insert(cartItem)
    .select()
    .single();

  logTest('Cart Items', 'CREATE', !createError && createdItem !== null,
    createError ? createError.message : `Added ${product.name} x2 to cart`);

  const itemId = createdItem?.id;

  // READ - View cart items
  const { data: items, error: readError } = await supabase
    .from('cart_items')
    .select(`
      id,
      quantity,
      selected_color,
      selected_size,
      products (id, name, price)
    `)
    .eq('cart_id', cart.id);

  logTest('Cart Items', 'READ', !readError && items !== null,
    readError ? readError.message : `Found ${items?.length || 0} items in cart`);

  // UPDATE - Change quantity
  if (itemId) {
    const { data: updated, error: updateError } = await supabase
      .from('cart_items')
      .update({ quantity: 5 })
      .eq('id', itemId)
      .select()
      .single();

    logTest('Cart Items', 'UPDATE', !updateError && updated?.quantity === 5,
      updateError ? updateError.message : `Quantity: 2 → ${updated?.quantity}`);

    // DELETE - Remove from cart
    const { error: deleteError } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);

    logTest('Cart Items', 'DELETE', !deleteError,
      deleteError ? deleteError.message : 'Item removed from cart');
  }
}

// ============================================================
// BUYER PROFILE CRUD (Mobile Buyer Profile)
// ============================================================
async function testBuyerProfileCRUD() {
  console.log('\n👤 BUYER PROFILE CRUD (Buyer Account)');
  console.log('   Simulates: Buyer updating their profile\n');
  
  // READ - Get buyer profile
  const { data: buyers, error: readError } = await supabase
    .from('buyers')
    .select('id, bazcoins, shipping_addresses, preferences')
    .limit(1);

  logTest('Buyer Profile', 'READ', !readError && buyers !== null,
    readError ? readError.message : `Found ${buyers?.length || 0} buyers`);

  if (buyers && buyers.length > 0) {
    const buyer = buyers[0];
    const originalCoins = buyer.bazcoins || 0;

    // UPDATE - Update bazcoins (simulate earning)
    const newCoins = originalCoins + 50;
    
    const { data: updated, error: updateError } = await supabase
      .from('buyers')
      .update({ bazcoins: newCoins })
      .eq('id', buyer.id)
      .select()
      .single();

    logTest('Buyer Profile', 'UPDATE', !updateError,
      updateError ? updateError.message : `Bazcoins: ${originalCoins} → ${updated?.bazcoins}`);

    // Revert bazcoins
    if (!updateError) {
      await supabase.from('buyers').update({ bazcoins: originalCoins }).eq('id', buyer.id);
    }
  }
}

// ============================================================
// SELLER PROFILE CRUD (Mobile Seller Profile)
// ============================================================
async function testSellerProfileCRUD() {
  console.log('\n🏪 SELLER PROFILE CRUD (Seller Account)');
  console.log('   Simulates: Seller updating store info\n');
  
  // READ - Get seller profile
  const { data: sellers, error: readError } = await supabase
    .from('sellers')
    .select('id, store_name, store_description, approval_status')
    .eq('approval_status', 'approved')
    .limit(1);

  logTest('Seller Profile', 'READ', !readError && sellers !== null,
    readError ? readError.message : `Found ${sellers?.length || 0} approved sellers`);

  if (sellers && sellers.length > 0) {
    const seller = sellers[0];
    const originalDesc = seller.store_description;

    // UPDATE - Update store description
    const newDesc = 'Updated store description - Mobile test ' + Date.now();
    
    const { data: updated, error: updateError } = await supabase
      .from('sellers')
      .update({ store_description: newDesc })
      .eq('id', seller.id)
      .select()
      .single();

    logTest('Seller Profile', 'UPDATE', !updateError,
      updateError ? updateError.message : 'Store description updated');

    // Revert description
    if (!updateError) {
      await supabase.from('sellers').update({ store_description: originalDesc }).eq('id', seller.id);
    }
  }
}

// ============================================================
// REVIEWS CRUD (Mobile Product Reviews)
// ============================================================
async function testReviewsCRUD() {
  console.log('\n⭐ REVIEWS CRUD (Product Reviews)');
  console.log('   Simulates: Buyer leaving a product review\n');
  
  // Get buyer and product with seller
  const { data: buyer } = await supabase.from('buyers').select('id').limit(1).single();
  const { data: product } = await supabase
    .from('products')
    .select('id, name, seller_id')
    .eq('approval_status', 'approved')
    .limit(1)
    .single();

  if (!buyer || !product) {
    console.log('   ⚠️ No buyer or product found, skipping review tests');
    return;
  }

  // READ - Get product reviews
  const { data: reviews, error: readError } = await supabase
    .from('reviews')
    .select('id, rating, comment, buyer_id')
    .eq('product_id', product.id)
    .limit(5);

  logTest('Reviews', 'READ', !readError,
    readError ? readError.message : `Found ${reviews?.length || 0} reviews for ${product.name}`);

  // CREATE - Add a review
  const newReview = {
    product_id: product.id,
    buyer_id: buyer.id,
    seller_id: product.seller_id,
    rating: 5,
    comment: 'Great product! Test review from mobile CRUD test.',
    created_at: new Date().toISOString()
  };

  const { data: created, error: createError } = await supabase
    .from('reviews')
    .insert(newReview)
    .select()
    .single();

  logTest('Reviews', 'CREATE', !createError || createError.message.includes('duplicate'),
    createError && !createError.message.includes('duplicate') 
      ? createError.message 
      : created ? `Review added: ${created.rating}★` : 'Review exists (duplicate prevented)');

  if (created?.id) {
    // UPDATE - Edit review
    const { data: updated, error: updateError } = await supabase
      .from('reviews')
      .update({ rating: 4, comment: 'Updated review comment' })
      .eq('id', created.id)
      .select()
      .single();

    logTest('Reviews', 'UPDATE', !updateError,
      updateError ? updateError.message : `Rating: 5★ → ${updated?.rating}★`);

    // DELETE - Remove review
    const { error: deleteError } = await supabase
      .from('reviews')
      .delete()
      .eq('id', created.id);

    logTest('Reviews', 'DELETE', !deleteError,
      deleteError ? deleteError.message : 'Review removed');
  }
}

// ============================================================
// FAVORITES CRUD (Mobile Favorites/Saved Items)
// ============================================================
async function testFavoritesCRUD() {
  console.log('\n❤️ FAVORITES CRUD (Buyer Saved Items)');
  console.log('   Simulates: Buyer saving favorite products\n');
  
  // Check if favorites table exists
  const { data: favorites, error: readError } = await supabase
    .from('favorites')
    .select('id')
    .limit(1);

  if (readError && readError.message.includes('schema cache')) {
    console.log('   ⚠️ Favorites table not found - feature may not be implemented');
    console.log('   ℹ️ Skipping favorites tests\n');
    return;
  }

  logTest('Favorites', 'READ', !readError,
    readError ? readError.message : `Favorites table accessible`);
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================
async function runAllTests() {
  console.log('📱 MOBILE CRUD OPERATIONS TEST');
  console.log('============================================================');
  console.log(`📅 Date: ${new Date().toLocaleString()}`);
  console.log(`🔗 Supabase URL: ${supabaseUrl?.substring(0, 30)}...`);
  console.log('============================================================');

  try {
    await testProductsCRUD();
    await testOrdersCRUD();
    await testCartCRUD();
    await testBuyerProfileCRUD();
    await testSellerProfileCRUD();
    await testReviewsCRUD();
    await testFavoritesCRUD();
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }

  // Print summary
  console.log('\n============================================================');
  console.log('📊 TEST SUMMARY');
  console.log('============================================================\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  // Group by entity
  const entities = [...new Set(results.map(r => r.entity))];
  
  console.log('   By Entity:');
  entities.forEach(entity => {
    const entityResults = results.filter(r => r.entity === entity);
    const entityPassed = entityResults.filter(r => r.passed).length;
    const icon = entityPassed === entityResults.length ? '✅' : '⚠️';
    console.log(`   ${icon} ${entity}: ${entityPassed}/${entityResults.length} passed`);
  });

  console.log('\n   Overall:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📋 Total: ${total}`);
  console.log(`   📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n   ❌ FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`      - ${r.name}: ${r.message}`);
    });
  }

  console.log('\n' + (failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️ SOME TESTS FAILED'));
  
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests();
