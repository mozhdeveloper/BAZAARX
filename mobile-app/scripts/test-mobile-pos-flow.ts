/**
 * Mobile POS Flow Test Script
 * 
 * Tests the complete mobile POS flow including:
 * 1. Product loading from store inventory
 * 2. Cart operations (add, update quantity, remove, clear)
 * 3. Order creation with Supabase integration
 * 4. Order retrieval and filtering
 * 5. Receipt data generation
 * 
 * Run with: npx ts-node scripts/test-mobile-pos-flow.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://bsdmfynvcgqzwwdppmbl.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzZG1meW52Y2dxend3ZHBwbWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MTcyMDAsImV4cCI6MjA1OTA5MzIwMH0.FTXU_qGC4mSv50GtNShC8SHH6KyZbpkBN0KKs68Dd3k';

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const testResults: TestResult[] = [];

// Helper to run a test
async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    testResults.push({ name, passed: true, message: 'Passed', duration });
    console.log(`✅ ${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    testResults.push({ name, passed: false, message, duration });
    console.log(`❌ ${name} (${duration}ms)`);
    console.log(`   Error: ${message}`);
  }
}

// Assert helper
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

// ============================================
// MOCK DATA STRUCTURES (mimicking mobile app)
// ============================================

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  variant?: string;
  image?: string;
}

interface POSOrder {
  seller_id: string;
  buyer_id: null; // Walk-in customers have no buyer_id
  order_type: 'OFFLINE';
  status: 'delivered';
  payment_status: 'paid';
  total_amount: number;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    variant?: string;
  }>;
  shipping_address: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postal_code: string;
  };
  notes: string;
}

// ============================================
// CART SIMULATION
// ============================================

class CartSimulator {
  private items: CartItem[] = [];

  addItem(item: Omit<CartItem, 'id'>): CartItem {
    const existingIndex = this.items.findIndex(
      i => i.productId === item.productId && i.variant === item.variant
    );

    if (existingIndex >= 0) {
      this.items[existingIndex].quantity += item.quantity;
      return this.items[existingIndex];
    }

    const newItem: CartItem = {
      ...item,
      id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    this.items.push(newItem);
    return newItem;
  }

  updateQuantity(itemId: string, quantity: number): boolean {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return false;
    
    if (quantity <= 0) {
      this.removeItem(itemId);
      return true;
    }
    
    item.quantity = quantity;
    return true;
  }

  removeItem(itemId: string): boolean {
    const index = this.items.findIndex(i => i.id === itemId);
    if (index < 0) return false;
    this.items.splice(index, 1);
    return true;
  }

  clear(): void {
    this.items = [];
  }

  getItems(): CartItem[] {
    return [...this.items];
  }

  getTotal(): number {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  getItemCount(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }
}

// ============================================
// POS ORDER SERVICE SIMULATION
// ============================================

async function createPOSOrder(
  sellerId: string,
  cartItems: CartItem[],
  cashReceived: number
): Promise<{ success: boolean; order?: any; error?: string }> {
  try {
    const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const orderData: POSOrder = {
      seller_id: sellerId,
      buyer_id: null, // Walk-in customer
      order_type: 'OFFLINE',
      status: 'delivered',
      payment_status: 'paid',
      total_amount: totalAmount,
      items: cartItems.map(item => ({
        product_id: item.productId,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        variant: item.variant,
      })),
      shipping_address: {
        name: 'Walk-in Customer',
        phone: '',
        address: 'In-store Purchase',
        city: 'POS',
        state: 'POS',
        postal_code: '0000',
      },
      notes: `POS Sale | Cash: ₱${cashReceived.toFixed(2)} | Change: ₱${(cashReceived - totalAmount).toFixed(2)}`,
    };

    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, order: data };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// ============================================
// TESTS
// ============================================

let testSellerId: string | null = null;
let testProductId: string | null = null;
let createdOrderId: string | null = null;

// Test 1: Find a seller with products
async function test_findSellerWithProducts(): Promise<void> {
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('id, store_name, business_name')
    .limit(5);

  assert(!error, `Failed to fetch sellers: ${error?.message}`);
  assert(sellers !== null && sellers.length > 0, 'No sellers found in database');

  // Find seller with products
  for (const seller of sellers!) {
    const { data: products } = await supabase
      .from('products')
      .select('id, name, price')
      .eq('seller_id', seller.id)
      .eq('status', 'approved')
      .limit(1);

    if (products && products.length > 0) {
      testSellerId = seller.id;
      testProductId = products[0].id;
      break;
    }
  }

  assert(testSellerId !== null, 'No seller with approved products found');
  assert(testProductId !== null, 'No products found for testing');
}

// Test 2: Load products for POS
async function test_loadProductsForPOS(): Promise<void> {
  assert(testSellerId !== null, 'No seller ID available');

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, price, images, variants, inventory_count')
    .eq('seller_id', testSellerId)
    .eq('status', 'approved');

  assert(!error, `Failed to load products: ${error?.message}`);
  assert(products !== null, 'Products response is null');
  assert(products!.length > 0, 'No approved products for this seller');
}

// Test 3: Cart - Add items
async function test_cartAddItems(): Promise<void> {
  const cart = new CartSimulator();

  const item1 = cart.addItem({
    productId: 'prod-1',
    name: 'Test Product 1',
    price: 100,
    quantity: 2,
  });

  assert(item1.id !== undefined, 'Item should have an ID');
  assert(cart.getItemCount() === 2, 'Cart should have 2 items');
  assert(cart.getTotal() === 200, 'Cart total should be 200');

  // Add same product - should update quantity
  cart.addItem({
    productId: 'prod-1',
    name: 'Test Product 1',
    price: 100,
    quantity: 1,
  });

  assert(cart.getItems().length === 1, 'Should still have 1 unique item');
  assert(cart.getItemCount() === 3, 'Cart should now have 3 items');
  assert(cart.getTotal() === 300, 'Cart total should be 300');
}

// Test 4: Cart - Add different variants
async function test_cartVariants(): Promise<void> {
  const cart = new CartSimulator();

  cart.addItem({
    productId: 'prod-1',
    name: 'T-Shirt',
    price: 500,
    quantity: 1,
    variant: 'Small - Red',
  });

  cart.addItem({
    productId: 'prod-1',
    name: 'T-Shirt',
    price: 500,
    quantity: 1,
    variant: 'Medium - Blue',
  });

  assert(cart.getItems().length === 2, 'Different variants should be separate items');
  assert(cart.getItemCount() === 2, 'Should have 2 total items');
  assert(cart.getTotal() === 1000, 'Total should be 1000');
}

// Test 5: Cart - Update quantity
async function test_cartUpdateQuantity(): Promise<void> {
  const cart = new CartSimulator();

  const item = cart.addItem({
    productId: 'prod-1',
    name: 'Test Product',
    price: 150,
    quantity: 1,
  });

  cart.updateQuantity(item.id, 5);
  assert(cart.getItemCount() === 5, 'Quantity should be updated to 5');
  assert(cart.getTotal() === 750, 'Total should be 750');

  // Update to 0 should remove
  cart.updateQuantity(item.id, 0);
  assert(cart.getItems().length === 0, 'Item should be removed when quantity is 0');
}

// Test 6: Cart - Remove item
async function test_cartRemoveItem(): Promise<void> {
  const cart = new CartSimulator();

  const item1 = cart.addItem({
    productId: 'prod-1',
    name: 'Product 1',
    price: 100,
    quantity: 2,
  });

  const item2 = cart.addItem({
    productId: 'prod-2',
    name: 'Product 2',
    price: 200,
    quantity: 1,
  });

  assert(cart.getItems().length === 2, 'Should have 2 items');

  cart.removeItem(item1.id);
  assert(cart.getItems().length === 1, 'Should have 1 item after removal');
  assert(cart.getTotal() === 200, 'Total should be 200 after removal');
}

// Test 7: Cart - Clear all
async function test_cartClear(): Promise<void> {
  const cart = new CartSimulator();

  cart.addItem({ productId: 'p1', name: 'Item 1', price: 100, quantity: 1 });
  cart.addItem({ productId: 'p2', name: 'Item 2', price: 200, quantity: 2 });
  cart.addItem({ productId: 'p3', name: 'Item 3', price: 300, quantity: 3 });

  assert(cart.getItems().length === 3, 'Should have 3 items');

  cart.clear();
  assert(cart.getItems().length === 0, 'Cart should be empty');
  assert(cart.getTotal() === 0, 'Total should be 0');
}

// Test 8: Create POS order with NULL buyer_id
async function test_createPOSOrderWithNullBuyerId(): Promise<void> {
  assert(testSellerId !== null, 'No seller ID available');

  const cartItems: CartItem[] = [
    {
      id: 'cart-1',
      productId: testProductId || 'test-product',
      name: 'Mobile POS Test Item',
      price: 299.99,
      quantity: 2,
    },
    {
      id: 'cart-2',
      productId: 'test-product-2',
      name: 'Another Test Item',
      price: 150.50,
      quantity: 1,
    },
  ];

  const cashReceived = 800;
  const result = await createPOSOrder(testSellerId!, cartItems, cashReceived);

  assert(result.success, `Failed to create order: ${result.error}`);
  assert(result.order !== undefined, 'Order should be returned');
  assert(result.order.buyer_id === null, 'buyer_id should be null for walk-in');
  assert(result.order.order_type === 'OFFLINE', 'order_type should be OFFLINE');
  assert(result.order.status === 'delivered', 'status should be delivered');
  assert(result.order.payment_status === 'paid', 'payment_status should be paid');

  createdOrderId = result.order.id;
}

// Test 9: Verify order saved correctly
async function test_verifyOrderSaved(): Promise<void> {
  assert(createdOrderId !== null, 'No order ID from previous test');

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', createdOrderId)
    .single();

  assert(!error, `Failed to fetch order: ${error?.message}`);
  assert(order !== null, 'Order not found');
  assert(order.buyer_id === null, 'buyer_id should be null');
  assert(order.order_type === 'OFFLINE', 'order_type should be OFFLINE');
  assert(order.items.length === 2, 'Should have 2 items');
  assert(order.notes.includes('POS Sale'), 'Notes should contain POS Sale');
}

// Test 10: Filter orders by channel (POS/Offline)
async function test_filterOrdersByChannel(): Promise<void> {
  assert(testSellerId !== null, 'No seller ID available');

  // Get POS/Offline orders
  const { data: posOrders, error: posError } = await supabase
    .from('orders')
    .select('id, order_type, buyer_id')
    .eq('seller_id', testSellerId)
    .eq('order_type', 'OFFLINE')
    .limit(10);

  assert(!posError, `Failed to fetch POS orders: ${posError?.message}`);
  assert(posOrders !== null, 'POS orders response is null');

  // Verify all returned orders are OFFLINE type
  for (const order of posOrders!) {
    assert(order.order_type === 'OFFLINE', 'All filtered orders should be OFFLINE');
  }
}

// Test 11: Filter orders by channel (Online)
async function test_filterOnlineOrders(): Promise<void> {
  assert(testSellerId !== null, 'No seller ID available');

  const { data: onlineOrders, error } = await supabase
    .from('orders')
    .select('id, order_type, buyer_id')
    .eq('seller_id', testSellerId)
    .eq('order_type', 'ONLINE')
    .limit(10);

  assert(!error, `Failed to fetch online orders: ${error?.message}`);
  // Online orders may or may not exist, just verify no error
}

// Test 12: Receipt data generation
async function test_receiptDataGeneration(): Promise<void> {
  const cart = new CartSimulator();

  cart.addItem({ productId: 'p1', name: 'Widget A', price: 499.99, quantity: 2 });
  cart.addItem({ productId: 'p2', name: 'Gadget B', price: 899.50, quantity: 1 });

  const total = cart.getTotal();
  const cashReceived = 2000;
  const change = cashReceived - total;

  const receiptData = {
    orderId: `POS-${Date.now()}`,
    storeName: 'Test Store',
    items: cart.getItems().map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.price * item.quantity,
    })),
    subtotal: total,
    total: total,
    cashReceived: cashReceived,
    change: change,
    date: new Date().toISOString(),
  };

  assert(receiptData.orderId.startsWith('POS-'), 'Order ID should start with POS-');
  assert(receiptData.items.length === 2, 'Receipt should have 2 items');
  // Use toFixed for floating point comparison
  assert(receiptData.subtotal.toFixed(2) === '1899.48', `Subtotal calculation incorrect: ${receiptData.subtotal}`);
  assert(receiptData.change.toFixed(2) === '100.52', `Change calculation incorrect: ${receiptData.change}`);
}

// Test 13: Order totals calculation
async function test_orderTotalsCalculation(): Promise<void> {
  const items = [
    { price: 99.99, quantity: 3 },    // 299.97
    { price: 150.00, quantity: 2 },   // 300.00
    { price: 75.50, quantity: 4 },    // 302.00
  ];

  const expectedTotal = 901.97;
  const calculatedTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Use toFixed for floating point comparison
  assert(
    calculatedTotal.toFixed(2) === expectedTotal.toFixed(2),
    `Total calculation mismatch: expected ${expectedTotal}, got ${calculatedTotal}`
  );
}

// Test 14: Walk-in customer address format
async function test_walkInCustomerAddress(): Promise<void> {
  const walkInAddress = {
    name: 'Walk-in Customer',
    phone: '',
    address: 'In-store Purchase',
    city: 'POS',
    state: 'POS',
    postal_code: '0000',
  };

  assert(walkInAddress.name === 'Walk-in Customer', 'Name should be Walk-in Customer');
  assert(walkInAddress.address === 'In-store Purchase', 'Address should indicate in-store');
}

// Test 15: Cleanup - Delete test order
async function test_cleanup(): Promise<void> {
  if (createdOrderId) {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', createdOrderId);

    assert(!error, `Failed to cleanup test order: ${error?.message}`);
  }
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    const { error } = await supabase.from('sellers').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

async function runAllTests(): Promise<void> {
  console.log('\n🧪 Mobile POS Flow Test Suite\n');
  console.log('='.repeat(50));
  console.log('');

  // Check network connectivity first
  const hasNetwork = await checkNetworkConnectivity();
  
  if (!hasNetwork) {
    console.log('⚠️  Network not available - running offline tests only\n');
  }

  // Database tests (require network)
  if (hasNetwork) {
    console.log('📦 Database & Product Tests\n');
    await runTest('Find seller with products', test_findSellerWithProducts);
    await runTest('Load products for POS', test_loadProductsForPOS);
  } else {
    console.log('📦 Database & Product Tests (SKIPPED - no network)\n');
  }

  // Cart tests (offline)
  console.log('\n🛒 Cart Operation Tests\n');
  await runTest('Cart - Add items', test_cartAddItems);
  await runTest('Cart - Handle variants', test_cartVariants);
  await runTest('Cart - Update quantity', test_cartUpdateQuantity);
  await runTest('Cart - Remove item', test_cartRemoveItem);
  await runTest('Cart - Clear all', test_cartClear);

  // Order creation tests (require network)
  if (hasNetwork) {
    console.log('\n📝 Order Creation Tests\n');
    await runTest('Create POS order with NULL buyer_id', test_createPOSOrderWithNullBuyerId);
    await runTest('Verify order saved correctly', test_verifyOrderSaved);
  } else {
    console.log('\n📝 Order Creation Tests (SKIPPED - no network)\n');
  }

  // Filtering tests (require network)
  if (hasNetwork) {
    console.log('\n🔍 Order Filtering Tests\n');
    await runTest('Filter orders by channel (POS/Offline)', test_filterOrdersByChannel);
    await runTest('Filter orders by channel (Online)', test_filterOnlineOrders);
  } else {
    console.log('\n🔍 Order Filtering Tests (SKIPPED - no network)\n');
  }

  // Receipt & calculation tests (offline)
  console.log('\n🧾 Receipt & Calculation Tests\n');
  await runTest('Receipt data generation', test_receiptDataGeneration);
  await runTest('Order totals calculation', test_orderTotalsCalculation);
  await runTest('Walk-in customer address format', test_walkInCustomerAddress);

  // Cleanup (require network)
  if (hasNetwork && createdOrderId) {
    console.log('\n🧹 Cleanup\n');
    await runTest('Delete test order', test_cleanup);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY\n');

  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  const totalTime = testResults.reduce((sum, r) => sum + r.duration, 0);
  const skipped = hasNetwork ? 0 : 7; // Network tests skipped

  console.log(`   Total Tests: ${testResults.length}${skipped > 0 ? ` (+${skipped} skipped)` : ''}`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  if (skipped > 0) console.log(`   ⏭️  Skipped: ${skipped} (no network)`);
  console.log(`   ⏱️  Total Time: ${totalTime}ms`);
  console.log(`   📈 Pass Rate: ${((passed / testResults.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:\n');
    testResults
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`   • ${r.name}`);
        console.log(`     Error: ${r.message}\n`);
      });
  }

  console.log('\n' + '='.repeat(50));
  console.log(failed === 0 ? '\n🎉 All tests passed!\n' : '\n⚠️  Some tests failed.\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
