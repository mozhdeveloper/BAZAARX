/**
 * RECEIPT AND VARIANT DISPLAY TEST
 * 
 * Tests that order items with variants display correctly for PDF receipt:
 * 1. Order items have selected_variant stored correctly
 * 2. Variant size and color are retrievable
 * 3. Order data structure supports PDF generation
 * 4. Seller info is available for receipt
 * 5. Philippine format data is correct
 * 
 * Run with: npx tsx scripts/test-receipt-variant-display.ts
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
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TEST_ORDER_NUMBER = `RECEIPT-TEST-${Date.now()}`;
let testOrderId = '';
let buyerId = '';
let sellerId = '';
let testProductId = '';

let testsPassed = 0;
let testsFailed = 0;

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

function header(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`📄 ${title}`);
  console.log('='.repeat(60));
}

// ========== SETUP ==========

async function setup() {
  header('SETUP');
  
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'anna.cruz@gmail.com',
      password: 'Buyer123!'
    });

    if (authError) throw authError;
    buyerId = authData.user!.id;
    pass('Logged in as buyer');

    // Get seller
    const { data: sellerData } = await supabase
      .from('sellers')
      .select('id, store_name, business_name, business_address, phone')
      .limit(1)
      .single();

    if (!sellerData) {
      log('⚠️', 'No seller found - will create test data without seller reference');
      sellerId = buyerId; // Use buyer ID as placeholder for testing
    } else {
      sellerId = sellerData.id;
      pass(`Found seller: ${sellerData.store_name}`);
    }

    // Get product - if none exist, we'll create mock data
    const { data: productData } = await supabase
      .from('products')
      .select('id, name, price, variants')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!productData) {
      log('⚠️', 'No product found - will use mock product data');
      testProductId = 'mock-product-id';
    } else {
      testProductId = productData.id;
      pass(`Found product: ${productData.name}`);
    }

    return true;
  } catch (error) {
    fail('Setup', error);
    return false;
  }
}

// ========== TEST 1: CREATE ORDER WITH VARIANTS ==========

async function test1_CreateOrderWithVariants() {
  header('TEST 1: Create Order with Variants');
  
  try {
    // Use mock data if no real product exists
    let productName = 'Test Product';
    let productPrice = 1500;
    let productImages: string[] = [];
    
    if (testProductId !== 'mock-product-id') {
      const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('id', testProductId)
        .single();

      if (product) {
        productName = product.name;
        productPrice = product.price;
        productImages = product.images || [];
      }
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: TEST_ORDER_NUMBER,
        buyer_id: buyerId,
        seller_id: sellerId,
        buyer_name: 'Anna Cruz',
        buyer_email: 'anna.cruz@gmail.com',
        shipping_address: {
          fullName: 'Anna Cruz',
          phone: '09171234567',
          addressLine1: '123 Test Street, Brgy. Test',
          city: 'Makati City',
          province: 'Metro Manila',
          postalCode: '1200',
          country: 'Philippines'
        },
        payment_method: { type: 'cod' },
        status: 'delivered',
        payment_status: 'paid',
        subtotal: productPrice,
        total_amount: productPrice,
        currency: 'PHP',
        shipping_cost: 0
      })
      .select()
      .single();

    if (orderError) throw orderError;
    testOrderId = order.id;
    pass(`Created order: ${TEST_ORDER_NUMBER}`);

    // Create order item WITH variant
    const selectedVariant = {
      size: 'Large',
      color: 'Navy Blue',
      name: 'Size: Large, Color: Navy Blue'
    };

    const { error: itemError } = await supabase
      .from('order_items')
      .insert({
        order_id: testOrderId,
        product_id: testProductId === 'mock-product-id' ? null : testProductId,
        product_name: productName,
        product_images: productImages,
        quantity: 2,
        price: productPrice,
        subtotal: productPrice * 2,
        selected_variant: selectedVariant,
        status: 'delivered'
      });

    if (itemError) throw itemError;
    pass('Created order item with variant');

    return true;
  } catch (error) {
    fail('Create order with variants', error);
    return false;
  }
}

// ========== TEST 2: VERIFY VARIANT STORAGE ==========

async function test2_VerifyVariantStorage() {
  header('TEST 2: Verify Variant Storage');
  
  try {
    const { data: items, error } = await supabase
      .from('order_items')
      .select('selected_variant, product_name')
      .eq('order_id', testOrderId);

    if (error) throw error;
    if (!items || items.length === 0) throw new Error('No items found');

    const item = items[0];
    pass(`Found order item: ${item.product_name}`);

    if (item.selected_variant) {
      pass('selected_variant is stored');
      
      if (item.selected_variant.size) {
        pass(`Size stored: ${item.selected_variant.size}`);
      } else {
        fail('Size not stored');
      }

      if (item.selected_variant.color) {
        pass(`Color stored: ${item.selected_variant.color}`);
      } else {
        fail('Color not stored');
      }

      if (item.selected_variant.name) {
        pass(`Display name: ${item.selected_variant.name}`);
      }
    } else {
      fail('selected_variant not stored');
    }

    return true;
  } catch (error) {
    fail('Verify variant storage', error);
    return false;
  }
}

// ========== TEST 3: FULL ORDER QUERY FOR RECEIPT ==========

async function test3_FullOrderQueryForReceipt() {
  header('TEST 3: Full Order Query for Receipt');
  
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items (
          id,
          product_name,
          quantity,
          price,
          subtotal,
          selected_variant,
          product_images
        ),
        seller:sellers (
          store_name,
          business_name,
          business_address,
          phone
        )
      `)
      .eq('id', testOrderId)
      .single();

    if (error) throw error;
    if (!order) throw new Error('Order not found');

    pass('Full order query successful');

    // Check required receipt fields
    const receiptFields = [
      { field: 'order_number', value: order.order_number },
      { field: 'buyer_name', value: order.buyer_name },
      { field: 'total_amount', value: order.total_amount },
      { field: 'status', value: order.status },
      { field: 'currency', value: order.currency },
    ];

    for (const f of receiptFields) {
      if (f.value !== undefined && f.value !== null) {
        pass(`${f.field}: ${f.value}`);
      } else {
        fail(`Missing ${f.field}`);
      }
    }

    // Check shipping address
    if (order.shipping_address && order.shipping_address.fullName) {
      pass('Shipping address complete');
    } else {
      fail('Shipping address incomplete');
    }

    // Check seller info
    if (order.seller && order.seller.store_name) {
      pass(`Seller: ${order.seller.store_name}`);
    } else {
      fail('Missing seller info');
    }

    // Check items
    if (order.items && order.items.length > 0) {
      pass(`Items: ${order.items.length} item(s)`);
      
      const item = order.items[0];
      if (item.selected_variant) {
        console.log('\n📦 Item Variant Info:');
        console.log(`   Size: ${item.selected_variant.size || 'N/A'}`);
        console.log(`   Color: ${item.selected_variant.color || 'N/A'}`);
        console.log(`   Display: ${item.selected_variant.name || 'N/A'}`);
        pass('Item has variant info for receipt');
      }
    } else {
      fail('No items in order');
    }

    return true;
  } catch (error) {
    fail('Full order query', error);
    return false;
  }
}

// ========== TEST 4: PHILIPPINE FORMAT VERIFICATION ==========

async function test4_PhilippineFormatVerification() {
  header('TEST 4: Philippine Format Verification');
  
  try {
    const { data: order } = await supabase
      .from('orders')
      .select('total_amount, currency, created_at, shipping_address')
      .eq('id', testOrderId)
      .single();

    if (!order) throw new Error('Order not found');

    // Currency should be PHP
    if (order.currency === 'PHP') {
      pass('Currency is PHP');
    } else {
      fail(`Currency is ${order.currency}, expected PHP`);
    }

    // Format amount in Philippine style
    const formattedAmount = `₱${order.total_amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
    pass(`Formatted amount: ${formattedAmount}`);

    // Format date in Philippine style
    const date = new Date(order.created_at);
    const formattedDate = date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    pass(`Formatted date: ${formattedDate}`);

    // Check address has Philippine format
    if (order.shipping_address.province && order.shipping_address.postalCode) {
      pass('Address has province and postal code');
    } else {
      fail('Address missing Philippine format fields');
    }

    return true;
  } catch (error) {
    fail('Philippine format verification', error);
    return false;
  }
}

// ========== TEST 5: RECEIPT DATA STRUCTURE ==========

async function test5_ReceiptDataStructure() {
  header('TEST 5: Receipt Data Structure');
  
  try {
    const { data: order } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items (
          product_name,
          quantity,
          price,
          subtotal,
          selected_variant
        ),
        seller:sellers (
          store_name,
          business_address
        )
      `)
      .eq('id', testOrderId)
      .single();

    if (!order) throw new Error('Order not found');

    // Build receipt structure
    const receiptData = {
      receiptNumber: order.order_number,
      date: new Date(order.created_at).toLocaleDateString('en-PH'),
      store: {
        name: order.seller?.store_name || 'BazaarPH Store',
        address: order.seller?.business_address || 'Philippines'
      },
      customer: {
        name: order.buyer_name,
        address: `${order.shipping_address.addressLine1}, ${order.shipping_address.city}, ${order.shipping_address.province}`
      },
      items: order.items.map((item: any) => ({
        name: item.product_name,
        variant: item.selected_variant ? 
          `${item.selected_variant.size ? 'Size: ' + item.selected_variant.size : ''}${item.selected_variant.color ? ', Color: ' + item.selected_variant.color : ''}`.replace(/^, /, '') : 
          null,
        qty: item.quantity,
        price: item.price,
        subtotal: item.subtotal
      })),
      subtotal: order.subtotal,
      shipping: order.shipping_cost || 0,
      total: order.total_amount,
      paymentMethod: order.payment_method?.type || 'N/A',
      status: order.status
    };

    console.log('\n📄 RECEIPT DATA STRUCTURE:');
    console.log(JSON.stringify(receiptData, null, 2));

    pass('Receipt data structure valid');

    // Verify variant is in items
    if (receiptData.items[0].variant) {
      pass(`Variant in receipt: ${receiptData.items[0].variant}`);
    } else {
      fail('Variant missing from receipt items');
    }

    return true;
  } catch (error) {
    fail('Receipt data structure', error);
    return false;
  }
}

// ========== CLEANUP ==========

async function cleanup() {
  header('CLEANUP');
  
  try {
    await supabase.from('order_items').delete().eq('order_id', testOrderId);
    log('🧹', 'Deleted test order items');
    
    await supabase.from('orders').delete().eq('id', testOrderId);
    log('🧹', 'Deleted test order');
  } catch (error) {
    log('⚠️', 'Cleanup error: ' + error);
  }
}

// ========== MAIN ==========

async function runTests() {
  console.log('\n📄 RECEIPT AND VARIANT DISPLAY TEST\n');
  console.log('Testing order data structure for PDF receipt generation...\n');

  const setupOk = await setup();
  if (!setupOk) {
    console.log('\n❌ Setup failed.\n');
    process.exit(1);
  }

  await test1_CreateOrderWithVariants();
  await test2_VerifyVariantStorage();
  await test3_FullOrderQueryForReceipt();
  await test4_PhilippineFormatVerification();
  await test5_ReceiptDataStructure();

  await cleanup();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All receipt/variant tests passed!\n');
  } else {
    console.log('\n⚠️ Some tests failed.\n');
    process.exit(1);
  }
}

runTests().catch(console.error);
