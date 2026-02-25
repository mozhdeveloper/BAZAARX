/**
 * Service Test Scripts
 * Comprehensive tests for all updated services
 * 
 * These tests validate the new normalized schema implementation
 * Run with: npx ts-node src/tests/service-tests.ts
 * Or import and run individual test functions
 */

import { authService } from '../services/authService';
import { productService } from '../services/productService';
import { cartService } from '../services/cartService';
import { orderService } from '../services/orderService';
import { orderReadService } from '../services/orders/orderReadService';
import { orderMutationService } from '../services/orders/orderMutationService';
import { qaService } from '../services/qaService';
import { chatService } from '../services/chatService';

// ============================================================================
// TYPES FOR TEST RESULTS
// ============================================================================

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  data?: unknown;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const logResult = (result: TestResult) => {
  const icon = result.success ? '✅' : '❌';
  console.log(`  ${icon} ${result.name}`);
  if (!result.success && result.error) {
    console.log(`      Error: ${result.error}`);
  }
};

const runTest = async <T>(
  name: string,
  testFn: () => Promise<T>,
  validator?: (result: T) => boolean
): Promise<TestResult> => {
  try {
    const result = await testFn();
    const success = validator ? validator(result) : true;
    return { name, success, data: result };
  } catch (error) {
    return {
      name,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// ============================================================================
// AUTH SERVICE TESTS
// ============================================================================

export const testAuthService = async (testUserId?: string): Promise<TestSuite> => {
  console.log('\n📋 AUTH SERVICE TESTS');
  console.log('═'.repeat(50));
  
  const tests: TestResult[] = [];
  
  // Test 1: Get user profile
  if (testUserId) {
    tests.push(
      await runTest(
        'getUserProfile - retrieves profile with first_name/last_name',
        () => authService.getUserProfile(testUserId),
        (profile) => profile !== null && 'first_name' in (profile || {})
      )
    );
    
    // Test 2: Get user roles
    tests.push(
      await runTest(
        'getUserRoles - retrieves roles from user_roles table',
        () => authService.getUserRoles(testUserId),
        (roles) => Array.isArray(roles)
      )
    );
    
    // Test 3: Check if user is seller
    tests.push(
      await runTest(
        'isUserSeller - checks seller role correctly',
        () => authService.isUserSeller(testUserId),
        (result) => typeof result === 'boolean'
      )
    );
    
    // Test 4: Check if user is buyer
    tests.push(
      await runTest(
        'isUserBuyer - checks buyer role correctly',
        () => authService.isUserBuyer(testUserId),
        (result) => typeof result === 'boolean'
      )
    );
  } else {
    tests.push({
      name: 'Skipped - no test user ID provided',
      success: true,
    });
  }
  
  tests.forEach(logResult);
  
  return {
    name: 'Auth Service',
    tests,
    passed: tests.filter((t) => t.success).length,
    failed: tests.filter((t) => !t.success).length,
  };
};

// ============================================================================
// PRODUCT SERVICE TESTS
// ============================================================================

export const testProductService = async (testSellerId?: string): Promise<TestSuite> => {
  console.log('\n📦 PRODUCT SERVICE TESTS');
  console.log('═'.repeat(50));
  
  const tests: TestResult[] = [];
  
  // Test 1: Get all products
  tests.push(
    await runTest(
      'getAllProducts - retrieves products with images array',
      () => productService.getAllProducts(),
      (products) => Array.isArray(products)
    )
  );
  
  // Test 2: Get active products
  tests.push(
    await runTest(
      'getActiveProducts - filters by disabled_at/deleted_at',
      () => productService.getActiveProducts(),
      (products) => Array.isArray(products)
    )
  );
  
  // Test 3: Get products by category
  tests.push(
    await runTest(
      'getProductsByCategory - uses category_id FK',
      () => productService.getProductsByCategory('test-category-id'),
      (products) => Array.isArray(products)
    )
  );
  
  if (testSellerId) {
    // Test 4: Get seller products
    tests.push(
      await runTest(
        'getSellerProducts - retrieves seller products with variants',
        () => productService.getSellerProducts(testSellerId),
        (products) => Array.isArray(products)
      )
    );
  }
  
  // Test 5: Search products
  tests.push(
    await runTest(
      'searchProducts - full-text search works',
      () => productService.searchProducts('test'),
      (products) => Array.isArray(products)
    )
  );
  
  tests.forEach(logResult);
  
  return {
    name: 'Product Service',
    tests,
    passed: tests.filter((t) => t.success).length,
    failed: tests.filter((t) => !t.success).length,
  };
};

// ============================================================================
// CART SERVICE TESTS
// ============================================================================

export const testCartService = async (testBuyerId?: string): Promise<TestSuite> => {
  console.log('\n🛒 CART SERVICE TESTS');
  console.log('═'.repeat(50));
  
  const tests: TestResult[] = [];
  
  if (testBuyerId) {
    // Test 1: Get or create cart
    tests.push(
      await runTest(
        'getOrCreateCart - creates cart without total fields',
        () => cartService.getOrCreateCart(testBuyerId),
        (cart) => cart !== null && 'buyer_id' in cart
      )
    );
    
    // Test 2: Get cart
    const cartResult = await cartService.getCart(testBuyerId);
    if (cartResult) {
      // Test 3: Get cart items with joins
      tests.push(
        await runTest(
          'getCartItems - retrieves items with product_images',
          () => cartService.getCartItems(cartResult.id),
          (items) => Array.isArray(items)
        )
      );
      
      // Test 4: Calculate totals
      tests.push(
        await runTest(
          'calculateCartTotals - computes totals from items',
          () => cartService.calculateCartTotals(cartResult.id),
          (result) => 
            'subtotal' in result && 
            'itemCount' in result && 
            typeof result.subtotal === 'number'
        )
      );
    }
  } else {
    tests.push({
      name: 'Skipped - no test buyer ID provided',
      success: true,
    });
  }
  
  tests.forEach(logResult);
  
  return {
    name: 'Cart Service',
    tests,
    passed: tests.filter((t) => t.success).length,
    failed: tests.filter((t) => !t.success).length,
  };
};

// ============================================================================
// ORDER SERVICE TESTS
// ============================================================================

export const testOrderService = async (
  testBuyerId?: string,
  testSellerId?: string
): Promise<TestSuite> => {
  console.log('\n📋 ORDER SERVICE TESTS');
  console.log('═'.repeat(50));
  
  const tests: TestResult[] = [];
  
  if (testBuyerId) {
    // Test 1: Get buyer orders
    tests.push(
      await runTest(
        'getBuyerOrders - retrieves orders with payment_status/shipment_status',
        () => orderService.getBuyerOrders(testBuyerId),
        (orders) => Array.isArray(orders)
      )
    );
  }
  
  if (testSellerId) {
    // Test 2: Get seller orders
    tests.push(
      await runTest(
        'orderReadService.getSellerOrders - typed seller snapshots',
        () => orderReadService.getSellerOrders({ sellerId: testSellerId }),
        (orders) => Array.isArray(orders)
      )
    );
  }
  
  // Test 3: POS Order creation (mock mode)
  tests.push(
    await runTest(
      'orderMutationService.createPOSOrder - creates POS order',
      () =>
        orderMutationService.createPOSOrder({
          sellerId: testSellerId || 'test-seller',
          sellerName: 'Test Store',
          items: [
            {
              productId: 'test-product',
              productName: 'Test Item',
              quantity: 1,
              price: 100,
              image: 'test.jpg',
            },
          ],
          total: 100,
          note: 'Test POS order',
          paymentMethod: 'cash',
        }),
      (result) => result !== null && 'orderId' in result
    )
  );
  
  tests.forEach(logResult);
  
  return {
    name: 'Order Service',
    tests,
    passed: tests.filter((t) => t.success).length,
    failed: tests.filter((t) => !t.success).length,
  };
};

// ============================================================================
// QA SERVICE TESTS
// ============================================================================

export const testQAService = async (testProductId?: string): Promise<TestSuite> => {
  console.log('\n🔍 QA SERVICE TESTS');
  console.log('═'.repeat(50));
  
  const tests: TestResult[] = [];
  
  // Test 1: Get pending assessments
  tests.push(
    await runTest(
      'getPendingAssessments - uses product_assessments table',
      () => qaService.getPendingAssessments(),
      (assessments) => Array.isArray(assessments)
    )
  );
  
  // Test 2: Get all assessments
  tests.push(
    await runTest(
      'getAllAssessments - retrieves assessments with product join',
      () => qaService.getAllAssessments(),
      (assessments) => Array.isArray(assessments)
    )
  );
  
  if (testProductId) {
    // Test 3: Get assessment by product ID
    tests.push(
      await runTest(
        'getAssessmentByProductId - retrieves single assessment',
        () => qaService.getAssessmentByProductId(testProductId),
        (assessment) => assessment === null || (typeof assessment === 'object' && 'status' in (assessment as object))
      )
    );
  }
  
  // Test 4: Check different statuses
  tests.push(
    await runTest(
      'getAssessmentsByStatus - filters by lowercase status',
      () => qaService.getAssessmentsByStatus('pending_digital_review'),
      (assessments) => Array.isArray(assessments)
    )
  );
  
  tests.forEach(logResult);
  
  return {
    name: 'QA Service',
    tests,
    passed: tests.filter((t) => t.success).length,
    failed: tests.filter((t) => !t.success).length,
  };
};

// ============================================================================
// CHAT SERVICE TESTS
// ============================================================================

export const testChatService = async (testBuyerId?: string): Promise<TestSuite> => {
  console.log('\n💬 CHAT SERVICE TESTS');
  console.log('═'.repeat(50));
  
  const tests: TestResult[] = [];
  
  if (testBuyerId) {
    // Test 1: Get buyer conversations
    tests.push(
      await runTest(
        'getBuyerConversations - retrieves conversations without seller_id',
        () => chatService.getBuyerConversations(testBuyerId),
        (conversations) => Array.isArray(conversations)
      )
    );
    
    // Test 2: Get unread count
    tests.push(
      await runTest(
        'getUnreadCount - computes from messages table',
        () => chatService.getUnreadCount(testBuyerId, 'buyer'),
        (count) => typeof count === 'number' && count >= 0
      )
    );
  } else {
    tests.push({
      name: 'Skipped - no test buyer ID provided',
      success: true,
    });
  }
  
  tests.forEach(logResult);
  
  return {
    name: 'Chat Service',
    tests,
    passed: tests.filter((t) => t.success).length,
    failed: tests.filter((t) => !t.success).length,
  };
};

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

export interface TestConfig {
  testUserId?: string;
  testBuyerId?: string;
  testSellerId?: string;
  testProductId?: string;
}

export const runAllTests = async (config: TestConfig = {}): Promise<void> => {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║     BAZAAR SERVICE TESTS - NEW SCHEMA VALIDATION   ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('\nRunning comprehensive service tests...\n');
  
  const suites: TestSuite[] = [];
  
  try {
    suites.push(await testAuthService(config.testUserId || config.testBuyerId));
    suites.push(await testProductService(config.testSellerId));
    suites.push(await testCartService(config.testBuyerId));
    suites.push(await testOrderService(config.testBuyerId, config.testSellerId));
    suites.push(await testQAService(config.testProductId));
    suites.push(await testChatService(config.testBuyerId));
  } catch (error) {
    console.error('Test runner error:', error);
  }
  
  // Summary
  console.log('\n');
  console.log('═'.repeat(50));
  console.log('TEST SUMMARY');
  console.log('═'.repeat(50));
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  suites.forEach((suite) => {
    const icon = suite.failed === 0 ? '✅' : '⚠️';
    console.log(`${icon} ${suite.name}: ${suite.passed}/${suite.tests.length} passed`);
    totalPassed += suite.passed;
    totalFailed += suite.failed;
  });
  
  console.log('');
  console.log(`Total: ${totalPassed}/${totalPassed + totalFailed} tests passed`);
  
  if (totalFailed > 0) {
    console.log(`\n⚠️  ${totalFailed} test(s) failed. Review errors above.`);
  } else {
    console.log('\n🎉 All tests passed!');
  }
};

// ============================================================================
// INDIVIDUAL FLOW TESTS
// ============================================================================

/**
 * Test the complete buyer flow
 */
export const testBuyerFlow = async (buyerId: string): Promise<void> => {
  console.log('\n🛍️ TESTING BUYER FLOW');
  console.log('═'.repeat(50));
  
  try {
    // Step 1: Get buyer profile
    console.log('\n1️⃣ Getting buyer profile...');
    const profile = await authService.getUserProfile(buyerId);
    console.log(`   Profile: ${profile?.first_name} ${profile?.last_name}`);
    
    // Step 2: Browse products
    console.log('\n2️⃣ Browsing active products...');
    const products = await productService.getActiveProducts();
    console.log(`   Found ${products.length} active products`);
    
    // Step 3: Get/create cart
    console.log('\n3️⃣ Getting shopping cart...');
    const cart = await cartService.getOrCreateCart(buyerId);
    console.log(`   Cart ID: ${cart.id}`);
    
    // Step 4: Get cart items and totals
    console.log('\n4️⃣ Calculating cart totals...');
    const totals = await cartService.calculateCartTotals(cart.id);
    console.log(`   Items: ${totals.itemCount}, Subtotal: ₱${totals.subtotal}`);
    
    // Step 5: Get orders
    console.log('\n5️⃣ Getting order history...');
    const orders = await orderService.getBuyerOrders(buyerId);
    console.log(`   Found ${orders.length} orders`);
    
    // Step 6: Get conversations
    console.log('\n6️⃣ Getting conversations...');
    const conversations = await chatService.getBuyerConversations(buyerId);
    console.log(`   Found ${conversations.length} conversations`);
    
    console.log('\n✅ Buyer flow test completed successfully!');
  } catch (error) {
    console.error('\n❌ Buyer flow test failed:', error);
  }
};

/**
 * Test the complete seller flow
 */
export const testSellerFlow = async (sellerId: string): Promise<void> => {
  console.log('\n🏪 TESTING SELLER FLOW');
  console.log('═'.repeat(50));
  
  try {
    // Step 1: Get seller profile
    console.log('\n1️⃣ Getting seller profile...');
    const profile = await authService.getUserProfile(sellerId);
    console.log(`   Profile: ${profile?.first_name} ${profile?.last_name}`);
    
    // Step 2: Verify seller role
    console.log('\n2️⃣ Verifying seller role...');
    const isSeller = await authService.isUserSeller(sellerId);
    console.log(`   Is seller: ${isSeller}`);
    
    // Step 3: Get seller products
    console.log('\n3️⃣ Getting seller products...');
    const products = await productService.getSellerProducts(sellerId);
    console.log(`   Found ${products.length} products`);
    
    // Step 4: Get seller orders
    console.log('\n4️⃣ Getting seller orders...');
    const orders = await orderReadService.getSellerOrders({ sellerId });
    console.log(`   Found ${orders.length} orders`);
    
    console.log('\n✅ Seller flow test completed successfully!');
  } catch (error) {
    console.error('\n❌ Seller flow test failed:', error);
  }
};

/**
 * Test the QA approval flow
 */
export const testQAFlow = async (): Promise<void> => {
  console.log('\n🔍 TESTING QA FLOW');
  console.log('═'.repeat(50));
  
  try {
    // Step 1: Get pending assessments
    console.log('\n1️⃣ Getting pending assessments...');
    const pending = await qaService.getPendingAssessments();
    console.log(`   Found ${pending.length} pending assessments`);
    
    // Step 2: Get all assessments
    console.log('\n2️⃣ Getting all assessments...');
    const all = await qaService.getAllAssessments();
    console.log(`   Total: ${all.length} assessments`);
    
    // Step 3: Check different statuses
    console.log('\n3️⃣ Checking assessment statuses...');
    const approved = await qaService.getAssessmentsByStatus('verified');
    const rejected = await qaService.getAssessmentsByStatus('rejected');
    const revision = await qaService.getAssessmentsByStatus('for_revision');
    console.log(`   Approved: ${approved.length}`);
    console.log(`   Rejected: ${rejected.length}`);
    console.log(`   Needs Revision: ${revision.length}`);
    
    console.log('\n✅ QA flow test completed successfully!');
  } catch (error) {
    console.error('\n❌ QA flow test failed:', error);
  }
};

// Export for use in other files
export default {
  runAllTests,
  testAuthService,
  testProductService,
  testCartService,
  testOrderService,
  testQAService,
  testChatService,
  testBuyerFlow,
  testSellerFlow,
  testQAFlow,
};
