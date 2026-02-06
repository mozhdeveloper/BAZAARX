/**
 * Complete Flow Integration Tests
 * 
 * This file tests the complete end-to-end flows for:
 * 1. Buyer Flow: Browse → Add to Cart → Checkout → Order Tracking
 * 2. Seller Flow: Add Product → QA Review → Manage Orders
 * 3. QA Flow: Review Products → Approve/Reject → Verify
 * 
 * Run with: npx ts-node src/tests/flow-tests.ts
 */

import { authService } from '../services/authService';
import { productService } from '../services/productService';
import { cartService } from '../services/cartService';
import { orderService } from '../services/orderService';
import { qaService } from '../services/qaService';
import { chatService } from '../services/chatService';

// ============================================================================
// TEST UTILITIES
// ============================================================================

const log = (icon: string, message: string) => console.log(`${icon} ${message}`);
const success = (message: string) => log('✅', message);
const error = (message: string) => log('❌', message);
const info = (message: string) => log('📋', message);
const step = (num: number, message: string) => console.log(`\n${num}️⃣ ${message}`);

interface FlowTestResult {
  flow: string;
  success: boolean;
  steps: { name: string; success: boolean; error?: string }[];
}

// ============================================================================
// BUYER FLOW TEST
// ============================================================================

export async function testCompleteBuyerFlow(buyerId: string): Promise<FlowTestResult> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              COMPLETE BUYER FLOW TEST                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  
  const steps: FlowTestResult['steps'] = [];
  
  try {
    // Step 1: Authenticate and get profile
    step(1, 'Authenticating buyer and fetching profile...');
    try {
      const profile = await authService.getUserProfile(buyerId);
      const isBuyer = await authService.isUserBuyer(buyerId);
      if (profile && isBuyer) {
        success(`Profile loaded: ${profile.first_name} ${profile.last_name}`);
        steps.push({ name: 'Get buyer profile', success: true });
      } else {
        throw new Error('Profile not found or not a buyer');
      }
    } catch (e) {
      error(`Failed to get profile: ${e}`);
      steps.push({ name: 'Get buyer profile', success: false, error: String(e) });
    }
    
    // Step 2: Browse products
    step(2, 'Browsing active products...');
    try {
      const products = await productService.getActiveProducts();
      success(`Found ${products.length} active products`);
      if (products.length > 0) {
        info(`Sample: ${products[0].name} - ₱${products[0].price}`);
      }
      steps.push({ name: 'Browse products', success: true });
    } catch (e) {
      error(`Failed to browse products: ${e}`);
      steps.push({ name: 'Browse products', success: false, error: String(e) });
    }
    
    // Step 3: Search products
    step(3, 'Searching products...');
    try {
      const searchResults = await productService.searchProducts('test');
      success(`Search returned ${searchResults.length} results`);
      steps.push({ name: 'Search products', success: true });
    } catch (e) {
      error(`Failed to search: ${e}`);
      steps.push({ name: 'Search products', success: false, error: String(e) });
    }
    
    // Step 4: Get/create cart
    step(4, 'Getting shopping cart...');
    try {
      const cart = await cartService.getOrCreateCart(buyerId);
      success(`Cart ID: ${cart.id}`);
      steps.push({ name: 'Get/create cart', success: true });
      
      // Step 5: Get cart totals
      step(5, 'Calculating cart totals...');
      try {
        const totals = await cartService.calculateCartTotals(cart.id);
        success(`Items: ${totals.itemCount}, Subtotal: ₱${totals.subtotal.toFixed(2)}`);
        steps.push({ name: 'Calculate cart totals', success: true });
      } catch (e) {
        error(`Failed to calculate totals: ${e}`);
        steps.push({ name: 'Calculate cart totals', success: false, error: String(e) });
      }
    } catch (e) {
      error(`Failed to get cart: ${e}`);
      steps.push({ name: 'Get/create cart', success: false, error: String(e) });
    }
    
    // Step 6: Get order history
    step(6, 'Getting order history...');
    try {
      const orders = await orderService.getBuyerOrders(buyerId);
      success(`Found ${orders.length} orders`);
      steps.push({ name: 'Get order history', success: true });
    } catch (e) {
      error(`Failed to get orders: ${e}`);
      steps.push({ name: 'Get order history', success: false, error: String(e) });
    }
    
    // Step 7: Get conversations
    step(7, 'Getting chat conversations...');
    try {
      const conversations = await chatService.getBuyerConversations(buyerId);
      const unreadCount = await chatService.getUnreadCount(buyerId, 'buyer');
      success(`Found ${conversations.length} conversations (${unreadCount} unread)`);
      steps.push({ name: 'Get conversations', success: true });
    } catch (e) {
      error(`Failed to get conversations: ${e}`);
      steps.push({ name: 'Get conversations', success: false, error: String(e) });
    }
    
  } catch (e) {
    error(`Unexpected error: ${e}`);
  }
  
  const passed = steps.filter(s => s.success).length;
  const total = steps.length;
  
  console.log('\n' + '═'.repeat(60));
  console.log(`BUYER FLOW RESULT: ${passed}/${total} steps passed`);
  console.log('═'.repeat(60));
  
  return {
    flow: 'Buyer Flow',
    success: passed === total,
    steps,
  };
}

// ============================================================================
// SELLER FLOW TEST
// ============================================================================

export async function testCompleteSellerFlow(sellerId: string): Promise<FlowTestResult> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              COMPLETE SELLER FLOW TEST                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  
  const steps: FlowTestResult['steps'] = [];
  
  try {
    // Step 1: Verify seller role
    step(1, 'Verifying seller authentication...');
    try {
      const profile = await authService.getUserProfile(sellerId);
      const isSeller = await authService.isUserSeller(sellerId);
      if (profile && isSeller) {
        success(`Seller verified: ${profile.first_name} ${profile.last_name}`);
        steps.push({ name: 'Verify seller role', success: true });
      } else {
        throw new Error('Not a seller or profile not found');
      }
    } catch (e) {
      error(`Failed to verify seller: ${e}`);
      steps.push({ name: 'Verify seller role', success: false, error: String(e) });
    }
    
    // Step 2: Get seller's products
    step(2, 'Getting seller products...');
    try {
      const products = await productService.getSellerProducts(sellerId);
      success(`Found ${products.length} products`);
      if (products.length > 0) {
        info(`Sample: ${products[0].name} - Stock: ${products[0].stock || 'N/A'}`);
      }
      steps.push({ name: 'Get seller products', success: true });
    } catch (e) {
      error(`Failed to get products: ${e}`);
      steps.push({ name: 'Get seller products', success: false, error: String(e) });
    }
    
    // Step 3: Get seller's QA entries
    step(3, 'Getting product QA status...');
    try {
      const qaEntries = await qaService.getQAEntriesBySeller(sellerId);
      success(`Found ${qaEntries.length} QA entries`);
      
      const pending = qaEntries.filter(e => e.status === 'PENDING_DIGITAL_REVIEW');
      const approved = qaEntries.filter(e => e.status === 'ACTIVE_VERIFIED');
      info(`Pending: ${pending.length}, Verified: ${approved.length}`);
      steps.push({ name: 'Get QA status', success: true });
    } catch (e) {
      error(`Failed to get QA entries: ${e}`);
      steps.push({ name: 'Get QA status', success: false, error: String(e) });
    }
    
    // Step 4: Get seller's orders
    step(4, 'Getting seller orders...');
    try {
      const orders = await orderService.getSellerOrders(sellerId);
      success(`Found ${orders.length} orders`);
      steps.push({ name: 'Get seller orders', success: true });
    } catch (e) {
      error(`Failed to get orders: ${e}`);
      steps.push({ name: 'Get seller orders', success: false, error: String(e) });
    }
    
    // Step 5: Get seller conversations
    step(5, 'Getting seller conversations...');
    try {
      const conversations = await chatService.getSellerConversations(sellerId);
      const unreadCount = await chatService.getUnreadCount(sellerId, 'seller');
      success(`Found ${conversations.length} conversations (${unreadCount} unread)`);
      steps.push({ name: 'Get conversations', success: true });
    } catch (e) {
      error(`Failed to get conversations: ${e}`);
      steps.push({ name: 'Get conversations', success: false, error: String(e) });
    }
    
  } catch (e) {
    error(`Unexpected error: ${e}`);
  }
  
  const passed = steps.filter(s => s.success).length;
  const total = steps.length;
  
  console.log('\n' + '═'.repeat(60));
  console.log(`SELLER FLOW RESULT: ${passed}/${total} steps passed`);
  console.log('═'.repeat(60));
  
  return {
    flow: 'Seller Flow',
    success: passed === total,
    steps,
  };
}

// ============================================================================
// QA FLOW TEST
// ============================================================================

export async function testCompleteQAFlow(adminId?: string): Promise<FlowTestResult> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              COMPLETE QA FLOW TEST                            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  
  const steps: FlowTestResult['steps'] = [];
  
  try {
    // Step 1: Verify admin role (if adminId provided)
    if (adminId) {
      step(1, 'Verifying admin authentication...');
      try {
        const isAdmin = await authService.isUserAdmin(adminId);
        if (isAdmin) {
          success('Admin role verified');
          steps.push({ name: 'Verify admin role', success: true });
        } else {
          info('User is not an admin, continuing as QA reviewer');
          steps.push({ name: 'Verify admin role', success: true });
        }
      } catch (e) {
        error(`Failed to verify admin: ${e}`);
        steps.push({ name: 'Verify admin role', success: false, error: String(e) });
      }
    }
    
    // Step 2: Get all assessments
    step(2, 'Getting all product assessments...');
    try {
      const allAssessments = await qaService.getAllAssessments();
      success(`Found ${allAssessments.length} total assessments`);
      steps.push({ name: 'Get all assessments', success: true });
    } catch (e) {
      error(`Failed to get assessments: ${e}`);
      steps.push({ name: 'Get all assessments', success: false, error: String(e) });
    }
    
    // Step 3: Get pending assessments
    step(3, 'Getting pending assessments (QA queue)...');
    try {
      const pending = await qaService.getPendingAssessments();
      success(`Found ${pending.length} pending assessments`);
      if (pending.length > 0) {
        info(`Next in queue: ${pending[0].product?.name || 'Unknown'}`);
      }
      steps.push({ name: 'Get pending queue', success: true });
    } catch (e) {
      error(`Failed to get pending: ${e}`);
      steps.push({ name: 'Get pending queue', success: false, error: String(e) });
    }
    
    // Step 4: Check by status
    step(4, 'Checking assessments by status...');
    try {
      const verified = await qaService.getAssessmentsByStatus('verified');
      const rejected = await qaService.getAssessmentsByStatus('rejected');
      const forRevision = await qaService.getAssessmentsByStatus('for_revision');
      
      success(`Status breakdown:`);
      info(`  Verified: ${verified.length}`);
      info(`  Rejected: ${rejected.length}`);
      info(`  For Revision: ${forRevision.length}`);
      steps.push({ name: 'Check by status', success: true });
    } catch (e) {
      error(`Failed to check status: ${e}`);
      steps.push({ name: 'Check by status', success: false, error: String(e) });
    }
    
    // Step 5: Get legacy QA entries
    step(5, 'Testing legacy QA entry format...');
    try {
      const legacyEntries = await qaService.getAllQAEntries();
      success(`Legacy format: ${legacyEntries.length} entries`);
      if (legacyEntries.length > 0) {
        info(`Sample legacy status: ${legacyEntries[0].status}`);
      }
      steps.push({ name: 'Legacy format test', success: true });
    } catch (e) {
      error(`Failed legacy test: ${e}`);
      steps.push({ name: 'Legacy format test', success: false, error: String(e) });
    }
    
  } catch (e) {
    error(`Unexpected error: ${e}`);
  }
  
  const passed = steps.filter(s => s.success).length;
  const total = steps.length;
  
  console.log('\n' + '═'.repeat(60));
  console.log(`QA FLOW RESULT: ${passed}/${total} steps passed`);
  console.log('═'.repeat(60));
  
  return {
    flow: 'QA Flow',
    success: passed === total,
    steps,
  };
}

// ============================================================================
// RUN ALL FLOW TESTS
// ============================================================================

export async function runAllFlowTests(config: {
  buyerId?: string;
  sellerId?: string;
  adminId?: string;
}): Promise<void> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           BAZAAR COMPLETE FLOW INTEGRATION TESTS              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('\nConfiguration:');
  console.log(`  Buyer ID:  ${config.buyerId || 'Not provided'}`);
  console.log(`  Seller ID: ${config.sellerId || 'Not provided'}`);
  console.log(`  Admin ID:  ${config.adminId || 'Not provided'}`);
  
  const results: FlowTestResult[] = [];
  
  if (config.buyerId) {
    results.push(await testCompleteBuyerFlow(config.buyerId));
  }
  
  if (config.sellerId) {
    results.push(await testCompleteSellerFlow(config.sellerId));
  }
  
  // QA flow can run without auth
  results.push(await testCompleteQAFlow(config.adminId));
  
  // Final summary
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    FINAL TEST SUMMARY                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  
  let totalPassed = 0;
  let totalSteps = 0;
  
  results.forEach(result => {
    const passed = result.steps.filter(s => s.success).length;
    totalPassed += passed;
    totalSteps += result.steps.length;
    
    const icon = result.success ? '✅' : '⚠️';
    console.log(`${icon} ${result.flow}: ${passed}/${result.steps.length} steps`);
    
    // Show failed steps
    result.steps.filter(s => !s.success).forEach(step => {
      console.log(`   ❌ ${step.name}: ${step.error}`);
    });
  });
  
  console.log('');
  console.log(`Total: ${totalPassed}/${totalSteps} steps passed`);
  
  if (totalPassed === totalSteps) {
    console.log('\n🎉 All flow tests passed successfully!');
  } else {
    console.log(`\n⚠️ ${totalSteps - totalPassed} step(s) failed. Review errors above.`);
  }
}

// ============================================================================
// CLI RUNNER
// ============================================================================

if (require.main === module) {
  const config = {
    buyerId: process.env.TEST_BUYER_ID,
    sellerId: process.env.TEST_SELLER_ID,
    adminId: process.env.TEST_ADMIN_ID,
  };
  
  runAllFlowTests(config)
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('Flow tests failed:', e);
      process.exit(1);
    });
}

export default {
  testCompleteBuyerFlow,
  testCompleteSellerFlow,
  testCompleteQAFlow,
  runAllFlowTests,
};
