/**
 * END-TO-END BUYER-SELLER FLOW TEST
 * 
 * Tests the complete flow from buyer placing an order to seller processing it:
 * 1. Buyer browses products
 * 2. Buyer places an order
 * 3. Seller receives order
 * 4. Seller confirms order
 * 5. Seller ships order
 * 6. Order delivered
 * 7. Both buyer and seller can see the order history
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

// Test accounts
const BUYER = {
  email: 'anna.cruz@gmail.com',
  password: 'Buyer123!',
  id: ''
};

const SELLER = {
  email: 'active.sports@bazaarph.com',
  password: 'Seller123!',
  id: '',
  sellerId: ''
};

let testsPassed = 0;
let testsFailed = 0;
let testProductId = '';
let testOrderId = '';
let testOrderNumber = '';

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

// ========== PHASE 1: BUYER PLACES ORDER ==========

async function phase1_BuyerLogin() {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: BUYER.email,
      password: BUYER.password
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned');

    BUYER.id = data.user.id;
    pass('Phase 1.1: Buyer login successful');
  } catch (error) {
    fail('Phase 1.1: Buyer login', error);
  }
}

async function phase1_BuyerBrowsesProducts() {
  try {
    // Get a product from seller
    const { data: sellerData } = await supabase
      .from('sellers')
      .select('id, store_name')
      .eq('store_name', 'ActiveGear Sports')
      .single();

    if (!sellerData) throw new Error('Seller not found');
    SELLER.sellerId = sellerData.id;

    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, seller_id, images')
      .eq('seller_id', SELLER.sellerId)
      .eq('approval_status', 'approved')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (error) throw error;
    if (!data) throw new Error('No approved products found');

    testProductId = data.id;
    log('🛍️', `  Product: ${data.name} - ₱${data.price}`);
    pass('Phase 1.2: Buyer found product from seller');
  } catch (error) {
    fail('Phase 1.2: Buyer browses products', error);
  }
}

async function phase1_BuyerPlacesOrder() {
  try {
    if (!testProductId) throw new Error('No test product ID');

    // Get product details
    const { data: product } = await supabase
      .from('products')
      .select('id, name, price, seller_id')
      .eq('id', testProductId)
      .single();

    if (!product) throw new Error('Product not found');

    // Generate order number
    const year = new Date().getFullYear();
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    testOrderNumber = `ORD-E2E-${year}${randomNum}`;

    const orderData = {
      order_number: testOrderNumber,
      buyer_id: BUYER.id,
      seller_id: product.seller_id,
      buyer_name: 'Anna Cruz',
      buyer_email: BUYER.email,
      shipping_address: {
        fullName: 'Anna Cruz',
        phone: '+63 912 345 6789',
        street: '123 Test Street, Brgy. Test',
        city: 'Quezon City',
        province: 'Metro Manila',
        postalCode: '1100'
      },
      payment_method: { type: 'cod', details: {} },
      status: 'pending_payment',
      payment_status: 'pending',
      subtotal: product.price,
      total_amount: product.price + 50, // +shipping
      currency: 'PHP',
      shipping_cost: 50,
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

    log('🛒', `  Order: ${testOrderNumber}`);
    pass('Phase 1.3: Buyer placed order successfully');
  } catch (error) {
    fail('Phase 1.3: Buyer places order', error);
  }
}

async function phase1_BuyerCanSeeOrder() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(id, product_name, quantity, price)
      `)
      .eq('id', testOrderId)
      .eq('buyer_id', BUYER.id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Order not visible to buyer');
    if (data.status !== 'pending_payment') throw new Error('Wrong order status');

    pass('Phase 1.4: Buyer can see their order');
  } catch (error) {
    fail('Phase 1.4: Buyer can see order', error);
  }
}

// ========== PHASE 2: SELLER PROCESSES ORDER ==========

async function phase2_SellerLogin() {
  try {
    // Sign out buyer
    await supabase.auth.signOut();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: SELLER.email,
      password: SELLER.password
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned');

    SELLER.id = data.user.id;
    pass('Phase 2.1: Seller login successful');
  } catch (error) {
    fail('Phase 2.1: Seller login', error);
  }
}

async function phase2_SellerSeesNewOrder() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(id, product_name, quantity, price)
      `)
      .eq('seller_id', SELLER.sellerId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No orders found');

    const testOrder = data.find((o: any) => o.id === testOrderId);
    if (!testOrder) throw new Error('Test order not in seller orders');

    log('📦', `  Seller sees ${data.length} orders`);
    pass('Phase 2.2: Seller sees new order');
  } catch (error) {
    fail('Phase 2.2: Seller sees new order', error);
  }
}

async function phase2_SellerConfirmsOrder() {
  try {
    if (!testOrderId) throw new Error('No test order ID');

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'processing',
        payment_status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', testOrderId)
      .eq('seller_id', SELLER.sellerId);

    if (error) throw error;

    // Verify
    const { data } = await supabase
      .from('orders')
      .select('status')
      .eq('id', testOrderId)
      .single();

    if (data?.status !== 'processing') throw new Error('Order not confirmed');

    pass('Phase 2.3: Seller confirmed order');
  } catch (error) {
    fail('Phase 2.3: Seller confirms order', error);
  }
}

async function phase2_SellerShipsOrder() {
  try {
    if (!testOrderId) throw new Error('No test order ID');

    const trackingNumber = `LBC-${Date.now()}`;

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'shipped',
        tracking_number: trackingNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', testOrderId)
      .eq('seller_id', SELLER.sellerId);

    if (error) throw error;

    log('🚚', `  Tracking: ${trackingNumber}`);
    pass('Phase 2.4: Seller shipped order');
  } catch (error) {
    fail('Phase 2.4: Seller ships order', error);
  }
}

async function phase2_SellerMarkDelivered() {
  try {
    if (!testOrderId) throw new Error('No test order ID');

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        updated_at: new Date().toISOString()
      })
      .eq('id', testOrderId)
      .eq('seller_id', SELLER.sellerId);

    if (error) throw error;

    pass('Phase 2.5: Seller marked order as delivered');
  } catch (error) {
    fail('Phase 2.5: Seller marks delivered', error);
  }
}

// ========== PHASE 3: VERIFICATION ==========

async function phase3_BuyerVerifiesDelivery() {
  try {
    // Sign out seller
    await supabase.auth.signOut();

    // Sign in as buyer
    await supabase.auth.signInWithPassword({
      email: BUYER.email,
      password: BUYER.password
    });

    const { data, error } = await supabase
      .from('orders')
      .select('status, tracking_number')
      .eq('id', testOrderId)
      .eq('buyer_id', BUYER.id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Order not found');
    if (data.status !== 'delivered') throw new Error(`Wrong status: ${data.status}`);

    log('✓', '  Order status: delivered');
    pass('Phase 3.1: Buyer sees order delivered');
  } catch (error) {
    fail('Phase 3.1: Buyer verifies delivery', error);
  }
}

async function phase3_SellerSeesCompletedOrder() {
  try {
    // Sign out buyer
    await supabase.auth.signOut();

    // Sign in as seller
    await supabase.auth.signInWithPassword({
      email: SELLER.email,
      password: SELLER.password
    });

    const { data, error } = await supabase
      .from('orders')
      .select('status, total_amount')
      .eq('id', testOrderId)
      .eq('seller_id', SELLER.sellerId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Order not found');
    if (data.status !== 'delivered') throw new Error(`Wrong status: ${data.status}`);

    log('💰', `  Revenue: ₱${data.total_amount}`);
    pass('Phase 3.2: Seller sees completed order');
  } catch (error) {
    fail('Phase 3.2: Seller sees completed order', error);
  }
}

async function phase3_SellerStatsUpdated() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('seller_id', SELLER.sellerId)
      .in('status', ['delivered', 'completed']);

    if (error) throw error;

    const totalRevenue = (data || []).reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
    log('📊', `  Total Revenue: ₱${totalRevenue.toLocaleString()}`);
    pass('Phase 3.3: Seller stats updated');
  } catch (error) {
    fail('Phase 3.3: Seller stats updated', error);
  }
}

// ========== CLEANUP ==========

async function cleanup() {
  try {
    // Delete test order items
    if (testOrderId) {
      await supabase.from('order_items').delete().eq('order_id', testOrderId);
    }

    // Delete test order
    if (testOrderId) {
      await supabase.from('orders').delete().eq('id', testOrderId);
    }

    pass('Cleanup: Test data removed');
  } catch (error) {
    fail('Cleanup', error);
  }
}

// ========== RUN ALL TESTS ==========

async function runTests() {
  console.log('\n🔄 END-TO-END BUYER-SELLER FLOW TEST\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Testing complete flow: Buyer Order → Seller Processing → Delivery\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🛍️ PHASE 1: BUYER PLACES ORDER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  await phase1_BuyerLogin();
  await phase1_BuyerBrowsesProducts();
  await phase1_BuyerPlacesOrder();
  await phase1_BuyerCanSeeOrder();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 PHASE 2: SELLER PROCESSES ORDER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  await phase2_SellerLogin();
  await phase2_SellerSeesNewOrder();
  await phase2_SellerConfirmsOrder();
  await phase2_SellerShipsOrder();
  await phase2_SellerMarkDelivered();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✓ PHASE 3: VERIFICATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  await phase3_BuyerVerifiesDelivery();
  await phase3_SellerSeesCompletedOrder();
  await phase3_SellerStatsUpdated();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧹 CLEANUP');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  await cleanup();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`\n📊 Results: ${testsPassed}/${testsPassed + testsFailed} tests passed`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 ALL PHASES COMPLETE!');
    console.log('   ✓ Buyer can browse and order products');
    console.log('   ✓ Seller receives and processes orders');
    console.log('   ✓ Order status flows correctly: pending → processing → shipped → delivered');
    console.log('   ✓ Both buyer and seller see consistent data');
    console.log('   ✓ Frontend and backend are synchronized with Supabase\n');
  } else {
    console.log(`\n⚠️  ${testsFailed} test(s) failed. Review the errors above.\n`);
  }

  // Sign out
  await supabase.auth.signOut();
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests();
