/**
 * Test Runner Script
 * Run with: npx ts-node src/tests/run-tests.ts
 * 
 * Environment variables:
 * - TEST_USER_ID: User ID to test auth functions
 * - TEST_BUYER_ID: Buyer ID for buyer flow tests
 * - TEST_SELLER_ID: Seller ID for seller flow tests
 * - TEST_PRODUCT_ID: Product ID for QA tests
 */

import { runAllTests, testBuyerFlow, testSellerFlow, testQAFlow } from './service-tests';

const main = async () => {
  const config = {
    testUserId: process.env.TEST_USER_ID,
    testBuyerId: process.env.TEST_BUYER_ID,
    testSellerId: process.env.TEST_SELLER_ID,
    testProductId: process.env.TEST_PRODUCT_ID,
  };

  const args = process.argv.slice(2);

  if (args.includes('--buyer') && config.testBuyerId) {
    await testBuyerFlow(config.testBuyerId);
  } else if (args.includes('--seller') && config.testSellerId) {
    await testSellerFlow(config.testSellerId);
  } else if (args.includes('--qa')) {
    await testQAFlow();
  } else {
    await runAllTests(config);
  }

  process.exit(0);
};

main().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
