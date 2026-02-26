/**
 * Implementation Plan Features — Frontend Verification Test Suite
 * 
 * Tests all 8 features (P1-A through P3-C) at the code-level:
 * - Service methods exist and are typed correctly
 * - Store methods exist and have proper signatures
 * - Page components import correct services/stores
 * - No mock/demo data remains in modified files
 * - DB queries use correct table/column names
 * 
 * Run with: npx tsx src/tests/implementation-features-verify.test.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const webRoot = path.resolve(__dirname, '../../');

// ============================================================================
// TEST INFRASTRUCTURE
// ============================================================================

interface TestResult {
  id: number;
  feature: string;
  category: 'code' | 'db' | 'no-mock' | 'import' | 'integration';
  passed: boolean;
  message: string;
  severity: 'critical' | 'warning' | 'info';
}

const results: TestResult[] = [];
let testId = 0;

function test(feature: string, category: TestResult['category'], severity: TestResult['severity'], 
  passed: boolean, message: string) {
  testId++;
  results.push({ id: testId, feature, category, passed, message, severity });
  const icon = passed ? '✅' : severity === 'critical' ? '🔴' : '⚠️';
  console.log(`  ${icon} [${testId}] ${feature} | ${category} | ${message}`);
}

function readFileContent(relPath: string): string {
  const fullPath = path.resolve(webRoot, relPath);
  if (!fs.existsSync(fullPath)) return '';
  return fs.readFileSync(fullPath, 'utf-8');
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.resolve(webRoot, relPath));
}

// ============================================================================
// P1-A: Admin Categories CRUD
// ============================================================================
function testP1A_Categories() {
  console.log('\n--- P1-A: Admin Categories CRUD ---');
  
  const storeContent = readFileContent('src/stores/adminStore.ts');
  
  test('P1-A Categories', 'no-mock', 'critical',
    !storeContent.includes('demoCategories'),
    'No demoCategories mock data in adminStore');

  test('P1-A Categories', 'no-mock', 'critical',
    !storeContent.includes('setTimeout') || !storeContent.substring(
      storeContent.indexOf('useAdminCategories'),
      storeContent.indexOf('useAdminCategories') + 3000
    ).includes('setTimeout'),
    'No setTimeout in categories section');

  test('P1-A Categories', 'code', 'critical',
    storeContent.includes("from('categories')"),
    'Categories store queries categories table');

  test('P1-A Categories', 'code', 'warning',
    storeContent.includes("products:products(count)"),
    'Categories include product count join');

  test('P1-A Categories', 'code', 'critical',
    storeContent.includes('.insert(') && storeContent.includes('.update(') && storeContent.includes('.delete()'),
    'Categories store has INSERT, UPDATE, DELETE operations');
}

// ============================================================================
// P1-B: Admin Reviews Moderation
// ============================================================================
function testP1B_Reviews() {
  console.log('\n--- P1-B: Admin Reviews Moderation ---');
  
  const storeContent = readFileContent('src/stores/adminStore.ts');
  
  test('P1-B Reviews', 'no-mock', 'critical',
    !storeContent.includes('demoReviews'),
    'No demoReviews mock data in adminStore');

  test('P1-B Reviews', 'code', 'critical',
    storeContent.includes("from('reviews')"),
    'Reviews store queries reviews table');

  test('P1-B Reviews', 'code', 'warning',
    storeContent.includes('is_hidden'),
    'Reviews store uses is_hidden field for moderation');

  test('P1-B Reviews', 'code', 'warning',
    storeContent.includes("from('review_images')") && storeContent.includes("from('review_votes')"),
    'Reviews delete cascades through review_images and review_votes');
}

// ============================================================================
// P2-A: Admin Flash Sales
// ============================================================================
function testP2A_FlashSales() {
  console.log('\n--- P2-A: Admin Flash Sales ---');
  
  const serviceContent = readFileContent('src/services/discountService.ts');
  const pageContent = readFileContent('src/pages/AdminFlashSales.tsx');
  
  test('P2-A Flash Sales', 'code', 'critical',
    serviceContent.includes('getAllFlashSales'),
    'discountService has getAllFlashSales method');

  test('P2-A Flash Sales', 'code', 'critical',
    serviceContent.includes("campaign_type', 'flash_sale'"),
    'getAllFlashSales filters by flash_sale type');

  test('P2-A Flash Sales', 'import', 'critical',
    pageContent.includes('discountService'),
    'AdminFlashSales imports discountService');

  test('P2-A Flash Sales', 'code', 'critical',
    pageContent.includes('loadFlashSales'),
    'AdminFlashSales has loadFlashSales function');

  test('P2-A Flash Sales', 'no-mock', 'critical',
    !pageContent.includes("id: 'flash_") && !pageContent.includes("id: '1'"),
    'No hardcoded flash sale mock IDs in page');

  test('P2-A Flash Sales', 'code', 'warning',
    pageContent.includes('deleteCampaign') && pageContent.includes('toggleCampaignStatus'),
    'Delete and toggle call real service methods');

  test('P2-A Flash Sales', 'code', 'info',
    pageContent.includes("setSaleName('')") && pageContent.includes("setStartDate('')"),
    'Form resets after successful create');
}

// ============================================================================
// P2-B: Buyer Return & Refund
// ============================================================================
function testP2B_BuyerReturn() {
  console.log('\n--- P2-B: Buyer Return & Refund ---');
  
  const serviceExists = fileExists('src/services/returnService.ts');
  test('P2-B Buyer Return', 'code', 'critical', serviceExists,
    'returnService.ts exists');

  if (serviceExists) {
    const serviceContent = readFileContent('src/services/returnService.ts');
    
    test('P2-B Buyer Return', 'code', 'critical',
      serviceContent.includes('submitReturnRequest'),
      'returnService has submitReturnRequest method');

    test('P2-B Buyer Return', 'code', 'critical',
      serviceContent.includes('getReturnRequestsByBuyer'),
      'returnService has getReturnRequestsByBuyer method');

    test('P2-B Buyer Return', 'code', 'critical',
      serviceContent.includes('getReturnRequestsBySeller'),
      'returnService has getReturnRequestsBySeller method');

    test('P2-B Buyer Return', 'code', 'warning',
      serviceContent.includes('approveReturn') && serviceContent.includes('rejectReturn'),
      'returnService has approveReturn and rejectReturn');

    test('P2-B Buyer Return', 'db', 'critical',
      serviceContent.includes("from('refund_return_periods')"),
      'returnService queries refund_return_periods table');

    test('P2-B Buyer Return', 'db', 'warning',
      serviceContent.includes("from('order_status_history')"),
      'returnService inserts into order_status_history');

    test('P2-B Buyer Return', 'code', 'warning',
      serviceContent.includes("shipment_status: 'returned'"),
      'submitReturnRequest updates order shipment_status to returned');
  }

  const pageContent = readFileContent('src/pages/OrdersPage.tsx');
  
  test('P2-B Buyer Return', 'import', 'critical',
    pageContent.includes("from '../services/returnService'") || 
    pageContent.includes("from \"../services/returnService\""),
    'OrdersPage imports returnService');

  test('P2-B Buyer Return', 'no-mock', 'critical',
    !pageContent.includes('In a real app'),
    'No "In a real app" mock comment in handleReturnSubmit');

  test('P2-B Buyer Return', 'code', 'critical',
    pageContent.includes('returnService.submitReturnRequest'),
    'handleReturnSubmit calls returnService.submitReturnRequest');
}

// ============================================================================
// P2-C: Seller Return & Refund
// ============================================================================
function testP2C_SellerReturn() {
  console.log('\n--- P2-C: Seller Return & Refund ---');
  
  const storeContent = readFileContent('src/stores/sellerReturnStore.ts');
  
  test('P2-C Seller Return', 'no-mock', 'critical',
    !storeContent.includes('dummyRequests') && !storeContent.includes('ret_1'),
    'No dummy/mock data in sellerReturnStore');

  test('P2-C Seller Return', 'import', 'critical',
    storeContent.includes("from '../services/returnService'") ||
    storeContent.includes("from \"../services/returnService\""),
    'sellerReturnStore imports returnService');

  test('P2-C Seller Return', 'code', 'critical',
    storeContent.includes('loadRequests'),
    'sellerReturnStore has loadRequests method');

  test('P2-C Seller Return', 'code', 'warning',
    storeContent.includes('returnService.approveReturn') && storeContent.includes('returnService.rejectReturn'),
    'approve/reject methods call returnService');

  test('P2-C Seller Return', 'code', 'critical',
    storeContent.includes('orderNumber: string'),
    'SellerReturnRequest has orderNumber field (separate from orderId)');

  const pageContent = readFileContent('src/pages/SellerReturns.tsx');
  
  test('P2-C Seller Return', 'import', 'critical',
    pageContent.includes('loadRequests'),
    'SellerReturns page uses loadRequests');

  test('P2-C Seller Return', 'code', 'warning',
    pageContent.includes('useEffect') && pageContent.includes("seller?.id"),
    'SellerReturns calls loadRequests in useEffect');

  test('P2-C Seller Return', 'code', 'info',
    pageContent.includes('req.orderNumber'),
    'SellerReturns displays orderNumber (not orderId UUID)');
}

// ============================================================================
// P3-A: Seller Earnings Dashboard
// ============================================================================
function testP3A_Earnings() {
  console.log('\n--- P3-A: Seller Earnings Dashboard ---');
  
  const serviceExists = fileExists('src/services/earningsService.ts');
  test('P3-A Earnings', 'code', 'critical', serviceExists,
    'earningsService.ts exists');

  if (serviceExists) {
    const serviceContent = readFileContent('src/services/earningsService.ts');
    
    test('P3-A Earnings', 'code', 'critical',
      serviceContent.includes('getEarningsSummary'),
      'earningsService has getEarningsSummary method');

    test('P3-A Earnings', 'code', 'critical',
      serviceContent.includes('getPayoutHistory'),
      'earningsService has getPayoutHistory method');

    test('P3-A Earnings', 'code', 'warning',
      serviceContent.includes('getRecentTransactions'),
      'earningsService has getRecentTransactions method');

    test('P3-A Earnings', 'db', 'critical',
      serviceContent.includes("from('order_items')") && serviceContent.includes("products!inner"),
      'earningsService queries order_items with products join');
  }

  const pageContent = readFileContent('src/pages/SellerEarnings.tsx');
  
  test('P3-A Earnings', 'no-mock', 'critical',
    !pageContent.includes("id: 1,") && !pageContent.includes("'PYT-2024-001'"),
    'No hardcoded demo payout data in SellerEarnings');

  test('P3-A Earnings', 'import', 'critical',
    pageContent.includes('earningsService'),
    'SellerEarnings imports earningsService');

  test('P3-A Earnings', 'code', 'critical',
    pageContent.includes('earningsService.getEarningsSummary'),
    'SellerEarnings calls getEarningsSummary');

  test('P3-A Earnings', 'no-mock', 'warning',
    !pageContent.includes('+12.5%'),
    'No hardcoded growth percentage');
}

// ============================================================================
// P3-B: Admin Payout Management
// ============================================================================
function testP3B_AdminPayouts() {
  console.log('\n--- P3-B: Admin Payout Management ---');
  
  const storeContent = readFileContent('src/stores/adminStore.ts');
  
  test('P3-B Admin Payouts', 'no-mock', 'critical',
    !storeContent.includes('demoPayouts') && !storeContent.includes("payout_1"),
    'No demoPayouts mock data in adminStore');

  test('P3-B Admin Payouts', 'code', 'critical',
    storeContent.includes("from('order_items')") && storeContent.includes("seller_payout_accounts"),
    'Payouts store queries real DB tables');

  test('P3-B Admin Payouts', 'code', 'warning',
    storeContent.includes('sellers:sellers'),
    'Payouts store joins to sellers table for store_name');
}

// ============================================================================
// P3-C: Admin Product Requests
// ============================================================================
function testP3C_ProductRequests() {
  console.log('\n--- P3-C: Admin Product Requests ---');
  
  const serviceExists = fileExists('src/services/productRequestService.ts');
  test('P3-C Product Requests', 'code', 'critical', serviceExists,
    'productRequestService.ts exists');

  if (serviceExists) {
    const serviceContent = readFileContent('src/services/productRequestService.ts');
    
    test('P3-C Product Requests', 'code', 'critical',
      serviceContent.includes('getAllRequests'),
      'productRequestService has getAllRequests method');

    test('P3-C Product Requests', 'code', 'critical',
      serviceContent.includes('updateStatus'),
      'productRequestService has updateStatus method');

    test('P3-C Product Requests', 'db', 'critical',
      serviceContent.includes("from('product_requests')"),
      'productRequestService queries product_requests table');
  }

  const pageContent = readFileContent('src/pages/AdminProductRequests.tsx');
  
  test('P3-C Product Requests', 'no-mock', 'critical',
    !pageContent.includes("req-1") && !pageContent.includes("Organic Rice from Ifugao"),
    'No hardcoded mock data in AdminProductRequests');

  test('P3-C Product Requests', 'import', 'critical',
    pageContent.includes('productRequestService'),
    'AdminProductRequests imports productRequestService');

  test('P3-C Product Requests', 'code', 'critical',
    pageContent.includes('productRequestService.getAllRequests') || 
    pageContent.includes('productRequestService.updateStatus'),
    'AdminProductRequests calls service methods');

  // Check migration exists
  const migrationPath = path.resolve(webRoot, '../supabase-migrations/009_product_requests.sql');
  test('P3-C Product Requests', 'db', 'critical',
    fs.existsSync(migrationPath),
    '009_product_requests.sql migration file exists');
}

// ============================================================================
// CROSS-CUTTING: No remaining mock patterns
// ============================================================================
function testNoRemainingMocks() {
  console.log('\n--- Cross-Cutting: No Remaining Mocks ---');
  
  // Note: adminStore.ts has setTimeout in OTHER admin features (sellers, buyers, stats, products)
  // that were not in scope of our 8 implementation targets. Only check files fully owned by us.
  const files = [
    'src/stores/sellerReturnStore.ts',
    'src/pages/SellerEarnings.tsx',
    'src/pages/AdminFlashSales.tsx',
    'src/pages/AdminProductRequests.tsx',
  ];

  for (const file of files) {
    const content = readFileContent(file);
    if (!content) {
      test('No Mocks', 'no-mock', 'warning', false, `${file} not found`);
      continue;
    }
    
    // Check for remaining setTimeout with resolve (fake async pattern)
    const hasFakeAsync = /setTimeout\s*\(\s*resolve/.test(content);
    test('No Mocks', 'no-mock', 'warning',
      !hasFakeAsync,
      `${path.basename(file)}: No setTimeout(resolve) fake async patterns`);
  }

  // For adminStore.ts, only check the categories/reviews/payouts sections we rewrote
  const adminContent = readFileContent('src/stores/adminStore.ts');
  if (adminContent) {
    // Extract only the categories section (~lines 442-570) and check for setTimeout
    const catMatch = adminContent.match(/fetchCategories.*?(?=fetchReviews|$)/s);
    const revMatch = adminContent.match(/fetchReviews.*?(?=useVoucherStore|$)/s);
    const catHasFake = catMatch ? /setTimeout\s*\(\s*resolve/.test(catMatch[0]) : false;
    const revHasFake = revMatch ? /setTimeout\s*\(\s*resolve/.test(revMatch[0]) : false;
    test('No Mocks', 'no-mock', 'warning',
      !catHasFake && !revHasFake,
      'adminStore.ts: No setTimeout in categories/reviews sections we implemented');
  }
}

// ============================================================================
// DB INTEGRATION: Verify queries actually work
// ============================================================================
async function testDBIntegration() {
  console.log('\n--- DB Integration (Live Queries) ---');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    test('DB Integration', 'integration', 'warning', false, 'Supabase credentials not found');
    return;
  }

  // Categories
  const { error: catErr } = await supabase.from('categories').select('*, products:products(count)').limit(1);
  test('DB Integration', 'integration', 'critical', !catErr,
    `Categories query: ${catErr ? catErr.message : 'OK'}`);

  // Reviews with joins
  const { error: revErr } = await supabase.from('reviews')
    .select('*, product:products(id, name), buyer:buyers(id, profiles(first_name, last_name))').limit(1);
  test('DB Integration', 'integration', 'critical', !revErr,
    `Reviews join query: ${revErr ? revErr.message : 'OK'}`);

  // Flash sales
  const { error: fsErr } = await supabase.from('discount_campaigns')
    .select('*').eq('campaign_type', 'flash_sale').limit(1);
  test('DB Integration', 'integration', 'critical', !fsErr,
    `Flash sales query: ${fsErr ? fsErr.message : 'OK'}`);

  // Return requests
  const { error: retErr } = await supabase.from('refund_return_periods')
    .select('*, order:orders(id, order_number)').limit(1);
  test('DB Integration', 'integration', 'critical', !retErr,
    `Return requests query: ${retErr ? retErr.message : 'OK'}`);

  // Earnings aggregation
  const { error: earnErr } = await supabase.from('order_items')
    .select('id, price, product:products!inner(seller_id), order:orders!inner(payment_status)').limit(1);
  test('DB Integration', 'integration', 'critical', !earnErr,
    `Earnings aggregation query: ${earnErr ? earnErr.message : 'OK'}`);

  // Payout accounts
  const { error: payErr } = await supabase.from('seller_payout_accounts').select('*').limit(1);
  test('DB Integration', 'integration', 'critical', !payErr,
    `Payout accounts query: ${payErr ? payErr.message : 'OK'}`);

  // Product requests (may not exist yet)
  const { error: prErr } = await supabase.from('product_requests').select('*').limit(1);
  test('DB Integration', 'integration', 'warning', !prErr,
    `Product requests query: ${prErr ? prErr.message : 'OK'} ${prErr ? '(run migration 009)' : ''}`);
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  BAZAARX — Implementation Features Frontend Verification     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`  Web root: ${webRoot}`);
  console.log(`  Time: ${new Date().toISOString()}\n`);

  // Code-level checks (no DB needed)
  testP1A_Categories();
  testP1B_Reviews();
  testP2A_FlashSales();
  testP2B_BuyerReturn();
  testP2C_SellerReturn();
  testP3A_Earnings();
  testP3B_AdminPayouts();
  testP3C_ProductRequests();
  testNoRemainingMocks();

  // DB integration checks
  await testDBIntegration();

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '═'.repeat(65));
  console.log('  RESULTS SUMMARY');
  console.log('═'.repeat(65));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const criticalFailed = results.filter(r => !r.passed && r.severity === 'critical').length;
  const total = results.length;

  // By feature
  const features = [...new Set(results.map(r => r.feature))];
  for (const feature of features) {
    const featureResults = results.filter(r => r.feature === feature);
    const fp = featureResults.filter(r => r.passed).length;
    const ff = featureResults.filter(r => !r.passed).length;
    const fc = featureResults.filter(r => !r.passed && r.severity === 'critical').length;
    const icon = ff === 0 ? '✅' : fc > 0 ? '🔴' : '⚠️';
    console.log(`  ${icon} ${feature}: ${fp}/${fp + ff} passed${fc > 0 ? ` (${fc} critical)` : ''}`);
  }

  console.log(`\n  Total: ${passed}/${total} passed | ${failed} failed | ${criticalFailed} critical`);
  console.log(`  Pass Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (criticalFailed > 0) {
    console.log('\n  🔴 CRITICAL FAILURES:');
    results.filter(r => !r.passed && r.severity === 'critical').forEach(r => {
      console.log(`     [${r.id}] ${r.feature}: ${r.message}`);
    });
  }

  if (failed > 0 && criticalFailed === 0) {
    console.log('\n  ⚠️  All failures are non-critical (warnings/info)');
  }

  console.log('\n' + '═'.repeat(65));
  process.exit(criticalFailed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
