/**
 * Product Detail Real Data Test - Mobile & Web Parity
 * 
 * Tests that both mobile and web show REAL database values for:
 * - Product description
 * - Stock count
 * - Ratings (from reviews or database)
 * - Review count
 * - Sales count
 * - Specifications
 * 
 * Run: node test-product-detail-parity.js
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [],
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'cyan');
  console.log('='.repeat(80) + '\n');
}

function printResult(testName, passed, message = '') {
  const status = passed ? '✓ PASS' : '✗ FAIL';
  const statusColor = passed ? 'green' : 'red';
  
  testResults.tests.push({ name: testName, passed, message });
  if (passed) testResults.passed++;
  else testResults.failed++;
  
  log(`  ${status} | ${testName}`, statusColor);
  if (message) log(`         ${message}`, 'yellow');
}

function printWarning(testName, message) {
  testResults.warnings++;
  testResults.tests.push({ name: testName, warning: true, message });
  log(`  ⚠ WARN | ${testName}`, 'yellow');
  log(`         ${message}`, 'yellow');
}

async function askQuestion(query) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    readline.question(query, answer => {
      readline.close();
      resolve(answer);
    });
  });
}

async function runTests() {
  log('\n╔════════════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║         Product Detail - Mobile & Web Real Data Parity Test               ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════════════╝', 'cyan');
  
  log('\nThis test verifies that BOTH mobile and web show identical REAL data', 'blue');
  log('from the database for product details.\n', 'blue');
  
  // Test Product Reference Data (from database query)
  const referenceProduct = {
    name: 'High-Waisted Stretch Denim Jeans',
    stock: 100,
    rating: 4.8,
    review_count: 189,
    sales_count: 381,
    hasDescription: true,
  };
  
  printHeader('SETUP: Test Product Reference Data');
  log('  Using product: High-Waisted Stretch Denim Jeans', 'blue');
  log('  Database values:', 'blue');
  log(`    • Stock: ${referenceProduct.stock}`, 'blue');
  log(`    • Rating: ${referenceProduct.rating}`, 'blue');
  log(`    • Reviews: ${referenceProduct.review_count}`, 'blue');
  log(`    • Sales: ${referenceProduct.sales_count}`, 'blue');
  log(`    • Has Description: ${referenceProduct.hasDescription}`, 'blue');
  
  // TEST 1: Mobile App - Product Detail Screen
  printHeader('TEST 1: Mobile App - Product Detail Screen');
  
  log('  📱 INSTRUCTIONS:', 'yellow');
  log('  1. Open mobile app (Expo Go or emulator)', 'yellow');
  log('  2. Navigate to "High-Waisted Stretch Denim Jeans" product', 'yellow');
  log('  3. Open product detail screen', 'yellow');
  log('  4. Check the console logs for debug output\n', 'yellow');
  
  await askQuestion('  Press Enter when mobile app is showing product detail...');
  
  // Mobile - Stock
  const mobileStock = await askQuestion(`  What stock count is shown on mobile? (Expected: In-Stock (${referenceProduct.stock})): `);
  const mobileStockMatch = mobileStock.includes(referenceProduct.stock.toString());
  printResult(
    'Mobile - Stock Display',
    mobileStockMatch,
    mobileStockMatch ? `Correctly shows ${referenceProduct.stock}` : `Expected ${referenceProduct.stock}, got: ${mobileStock}`
  );
  
  // Mobile - Rating
  const mobileRating = await askQuestion(`  What rating is shown on mobile? (Expected: ${referenceProduct.rating} (${referenceProduct.review_count})): `);
  const mobileRatingMatch = mobileRating.includes(referenceProduct.rating.toString()) && mobileRating.includes(referenceProduct.review_count.toString());
  printResult(
    'Mobile - Rating Display',
    mobileRatingMatch,
    mobileRatingMatch ? `Correctly shows ${referenceProduct.rating} (${referenceProduct.review_count})` : `Expected ${referenceProduct.rating} (${referenceProduct.review_count}), got: ${mobileRating}`
  );
  
  // Mobile - Description
  const mobileHasDesc = await askQuestion('  Does Details tab show real product description (not "No product details available")? (Y/N): ');
  const mobileDescMatch = mobileHasDesc.trim().toUpperCase() === 'Y';
  printResult(
    'Mobile - Description Display',
    mobileDescMatch,
    mobileDescMatch ? 'Shows real description' : 'Shows "No product details available" or hardcoded text'
  );
  
  // Mobile - Ratings Tab
  const mobileRatingsTab = await askQuestion(`  What does Ratings tab show? (Expected: Ratings (${referenceProduct.review_count})): `);
  const mobileRatingsMatch = mobileRatingsTab.includes(referenceProduct.review_count.toString());
  printResult(
    'Mobile - Ratings Tab',
    mobileRatingsMatch,
    mobileRatingsMatch ? `Correctly shows (${referenceProduct.review_count})` : `Expected (${referenceProduct.review_count}), got: ${mobileRatingsTab}`
  );
  
  // Mobile - Console Logs Check
  log('\n  📋 Check your Expo console for debug logs:', 'cyan');
  log('     Look for: [ProductDetail] Product data:', 'cyan');
  log('     Verify it shows the correct stock, rating, review_count\n', 'cyan');
  
  const mobileLogsOk = await askQuestion('  Do console logs show correct data from database? (Y/N): ');
  const mobileLogsMatch = mobileLogsOk.trim().toUpperCase() === 'Y';
  printResult(
    'Mobile - Debug Logs',
    mobileLogsMatch,
    mobileLogsMatch ? 'Console shows correct database values' : 'Console shows incorrect or missing values'
  );
  
  // TEST 2: Web App - Product Detail Page
  printHeader('TEST 2: Web App - Product Detail Page');
  
  log('  🌐 INSTRUCTIONS:', 'yellow');
  log('  1. Open web app in browser (http://localhost:5173 or deployed URL)', 'yellow');
  log('  2. Navigate to "High-Waisted Stretch Denim Jeans" product', 'yellow');
  log('  3. Open product detail page\n', 'yellow');
  
  await askQuestion('  Press Enter when web app is showing product detail...');
  
  // Web - Stock
  const webStock = await askQuestion(`  What stock count is shown on web? (Expected: ${referenceProduct.stock}): `);
  const webStockMatch = webStock.includes(referenceProduct.stock.toString());
  printResult(
    'Web - Stock Display',
    webStockMatch,
    webStockMatch ? `Correctly shows ${referenceProduct.stock}` : `Expected ${referenceProduct.stock}, got: ${webStock}`
  );
  
  // Web - Rating
  const webRating = await askQuestion(`  What rating is shown on web? (Expected: ${referenceProduct.rating}): `);
  const webRatingMatch = webRating.includes(referenceProduct.rating.toString());
  printResult(
    'Web - Rating Display',
    webRatingMatch,
    webRatingMatch ? `Correctly shows ${referenceProduct.rating}` : `Expected ${referenceProduct.rating}, got: ${webRating}`
  );
  
  // Web - Sales Count
  const webSales = await askQuestion(`  What sales count is shown on web? (Expected: ${referenceProduct.sales_count} products sold): `);
  const webSalesMatch = webSales.includes(referenceProduct.sales_count.toString());
  printResult(
    'Web - Sales Display',
    webSalesMatch,
    webSalesMatch ? `Correctly shows ${referenceProduct.sales_count}` : `Expected ${referenceProduct.sales_count}, got: ${webSales}`
  );
  
  // Web - Description
  const webHasDesc = await askQuestion('  Does web show real product description (starts with "Our best-selling...")? (Y/N): ');
  const webDescMatch = webHasDesc.trim().toUpperCase() === 'Y';
  printResult(
    'Web - Description Display',
    webDescMatch,
    webDescMatch ? 'Shows real description' : 'Missing or incorrect description'
  );
  
  // TEST 3: Mobile-Web Parity
  printHeader('TEST 3: Mobile-Web Data Parity');
  
  log('  Comparing data between mobile and web...\n', 'blue');
  
  // Compare Stock
  const stockParity = mobileStockMatch && webStockMatch;
  printResult(
    'Parity - Stock',
    stockParity,
    stockParity ? 'Mobile and web show same stock' : 'Stock mismatch between platforms'
  );
  
  // Compare Rating
  const ratingParity = mobileRatingMatch && webRatingMatch;
  printResult(
    'Parity - Rating',
    ratingParity,
    ratingParity ? 'Mobile and web show same rating' : 'Rating mismatch between platforms'
  );
  
  // Compare Description
  const descParity = mobileDescMatch && webDescMatch;
  printResult(
    'Parity - Description',
    descParity,
    descParity ? 'Both show real description' : 'Description missing or different on one platform'
  );
  
  // TEST 4: Edge Case - Product with 0 Reviews
  printHeader('TEST 4: Edge Case - Product with 0 Reviews');
  
  log('  📱 INSTRUCTIONS:', 'yellow');
  log('  1. Navigate to a product with 0 reviews (e.g., "Swimming Goggles")', 'yellow');
  log('  2. Database shows: rating=5.0, review_count=0', 'yellow');
  log('  3. App should show: 0.0 (0) - NOT 5.0 (0)\n', 'yellow');
  
  const zeroReviewTest = await askQuestion('  Does product with review_count=0 show "0.0 (0)" rating? (Y/N): ');
  const zeroReviewMatch = zeroReviewTest.trim().toUpperCase() === 'Y';
  printResult(
    'Zero Reviews - Correct Display',
    zeroReviewMatch,
    zeroReviewMatch ? 'Shows 0.0 (0) for products with no reviews ✓' : 'Incorrectly shows database rating (e.g., 5.0) instead of 0.0'
  );
  
  // TEST 5: Database Fallback
  printHeader('TEST 5: Database Fallback (review_count from DB)');
  
  log('  This test verifies that when review fetch fails or returns empty,', 'blue');
  log('  the app falls back to product.review_count from database.\n', 'blue');
  
  const dbFallback = await askQuestion('  Does mobile show review count from database (189) even if fetch returns empty? (Y/N): ');
  const dbFallbackMatch = dbFallback.trim().toUpperCase() === 'Y';
  printResult(
    'Database Fallback',
    dbFallbackMatch,
    dbFallbackMatch ? 'Correctly uses database review_count as fallback' : 'Does not fallback to database value'
  );
  
  // Print Summary
  printHeader('TEST SUMMARY');
  
  const total = testResults.passed + testResults.failed;
  const passRate = total > 0 ? ((testResults.passed / total) * 100).toFixed(1) : 0;
  
  console.log(`  Total Tests: ${total}`);
  log(`  Passed: ${testResults.passed}`, 'green');
  log(`  Failed: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'reset');
  log(`  Warnings: ${testResults.warnings}`, testResults.warnings > 0 ? 'yellow' : 'reset');
  log(`  Pass Rate: ${passRate}%`, passRate >= 90 ? 'green' : passRate >= 70 ? 'yellow' : 'red');
  
  console.log('\n' + '='.repeat(80));
  
  if (testResults.failed > 0) {
    log('\n❌ FAILED TESTS:', 'red');
    testResults.tests
      .filter(t => t.passed === false)
      .forEach(t => {
        log(`  • ${t.name}`, 'red');
        if (t.message) log(`    ${t.message}`, 'yellow');
      });
  }
  
  console.log('\n' + '='.repeat(80));
  
  if (passRate >= 90) {
    log('\n✅ EXCELLENT! Mobile and web both show real database values correctly!', 'green');
    log('   Ready for production and intern onboarding.', 'green');
  } else if (passRate >= 70) {
    log('\n⚠️  GOOD, but some issues found. Review failed tests above.', 'yellow');
  } else {
    log('\n❌ CRITICAL ISSUES! Many tests failed. Fix before deployment.', 'red');
  }
  
  // Recommendations
  printHeader('RECOMMENDATIONS');
  
  if (testResults.failed > 0) {
    log('  Based on test results, consider:', 'yellow');
    
    if (!mobileStockMatch || !webStockMatch) {
      log('  • Verify stock field is fetched from database correctly', 'yellow');
    }
    if (!mobileRatingMatch || !webRatingMatch) {
      log('  • Check rating display logic uses database values correctly', 'yellow');
    }
    if (!mobileDescMatch || !webDescMatch) {
      log('  • Ensure description field is populated in database', 'yellow');
      log('  • Check that product query selects description field', 'yellow');
    }
    if (!stockParity || !ratingParity || !descParity) {
      log('  • Investigate why mobile and web show different data', 'yellow');
      log('  • Both should query the same database source', 'yellow');
    }
    if (!zeroReviewMatch) {
      log('  • Fix rating logic to show 0.0 when review_count = 0', 'yellow');
      log('  • Do not use product.rating field when no reviews exist', 'yellow');
    }
  } else {
    log('  ✅ All tests passed! No action needed.', 'green');
  }
  
  console.log('\n');
}

// Run tests
runTests().catch(console.error);
