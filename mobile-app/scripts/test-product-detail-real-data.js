/**
 * Product Detail Screen - Real Data Display Test Script
 * 
 * This script tests that ProductDetailScreen displays REAL database values
 * instead of hardcoded placeholders for:
 * - Product description
 * - Stock count
 * - Ratings (average from reviews or product.rating)
 * - Review count
 * - Sales count
 * - Seller rating (conditional)
 * - Verified badge (conditional)
 * - Free shipping badge (conditional)
 * - Product specifications
 * - Original price (conditional)
 * 
 * Run: node mobile-app/scripts/test-product-detail-real-data.js
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Test configuration
const TEST_CONFIG = {
  appPackage: 'com.jcuad.bazaarph',
  testTimeout: 60000,
  screenshotDir: './test-screenshots',
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [],
};

// Helper: Print colored message
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Helper: Print test header
function printHeader(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'cyan');
  console.log('='.repeat(80) + '\n');
}

// Helper: Print test result
function printResult(testName, passed, message = '') {
  const status = passed ? '✓ PASS' : '✗ FAIL';
  const statusColor = passed ? 'green' : 'red';
  
  testResults.tests.push({ name: testName, passed, message });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  
  log(`  ${status} | ${testName}`, statusColor);
  if (message) {
    log(`         ${message}`, 'yellow');
  }
}

// Helper: Print warning
function printWarning(testName, message) {
  testResults.warnings++;
  testResults.tests.push({ name: testName, warning: true, message });
  log(`  ⚠ WARN | ${testName}`, 'yellow');
  log(`         ${message}`, 'yellow');
}

// Helper: Run ADB command
async function runAdb(command) {
  try {
    const { stdout, stderr } = await execPromise(`adb ${command}`);
    if (stderr && !stderr.includes('KB/s')) {
      console.error('ADB stderr:', stderr);
    }
    return stdout.trim();
  } catch (error) {
    throw new Error(`ADB command failed: ${error.message}`);
  }
}

// Helper: Wait for element
async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Check if device is connected
async function test1_deviceConnection() {
  printHeader('TEST 1: Device Connection');
  
  try {
    const devices = await runAdb('devices');
    const connectedDevices = devices.split('\n').filter(line => line.includes('\t')).length;
    
    if (connectedDevices === 0) {
      printResult('Device Connected', false, 'No Android devices found. Connect device or start emulator.');
      return false;
    }
    
    printResult('Device Connected', true, `Found ${connectedDevices} device(s)`);
    return true;
  } catch (error) {
    printResult('Device Connected', false, error.message);
    return false;
  }
}

// Test 2: Check if app is installed
async function test2_appInstalled() {
  printHeader('TEST 2: App Installation Check');
  
  try {
    const packages = await runAdb(`shell pm list packages | grep ${TEST_CONFIG.appPackage}`);
    
    if (!packages.includes(TEST_CONFIG.appPackage)) {
      printResult('App Installed', false, `App ${TEST_CONFIG.appPackage} not found. Run: npm start`);
      return false;
    }
    
    printResult('App Installed', true, `Package: ${TEST_CONFIG.appPackage}`);
    return true;
  } catch (error) {
    printResult('App Installed', false, error.message);
    return false;
  }
}

// Test 3: Launch app and navigate to product detail
async function test3_launchAndNavigate() {
  printHeader('TEST 3: Launch App & Navigate to Product Detail');
  
  try {
    // Launch app
    log('  Launching app...', 'blue');
    await runAdb(`shell monkey -p ${TEST_CONFIG.appPackage} -c android.intent.category.LAUNCHER 1`);
    await wait(3000);
    
    printResult('App Launched', true);
    
    // Instructions for manual navigation
    log('\n  📱 MANUAL STEP REQUIRED:', 'yellow');
    log('  1. On your device, navigate to Home screen', 'yellow');
    log('  2. Tap on any product card to open Product Detail Screen', 'yellow');
    log('  3. Wait for product data to load', 'yellow');
    log('\n  Press Enter when ready to continue testing...', 'cyan');
    
    // Wait for user to press Enter
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });
    
    printResult('Navigation to Product Detail', true, 'Manual navigation completed');
    return true;
  } catch (error) {
    printResult('App Launch', false, error.message);
    return false;
  }
}

// Test 4: Visual inspection checklist
async function test4_visualInspection() {
  printHeader('TEST 4: Product Detail Real Data Visual Inspection');
  
  log('\n  Please verify the following on Product Detail Screen:', 'cyan');
  log('  (Answer Y for visible/correct, N for not visible/incorrect, S to skip)\n', 'yellow');
  
  const checks = [
    {
      name: 'Product Name',
      question: 'Does product name display correctly?',
      field: 'product.name'
    },
    {
      name: 'Real Stock Count',
      question: 'Does stock show real number (e.g., "In-Stock (156)") instead of hardcoded "(12)"?',
      field: 'product.stock',
      critical: true
    },
    {
      name: 'Real Rating',
      question: 'Does rating show real value (e.g., "4.8") from database instead of hardcoded?',
      field: 'averageRating or product.rating',
      critical: true
    },
    {
      name: 'Real Review Count',
      question: 'Does review count match database (e.g., "(2847)" or "(0)" for no reviews)?',
      field: 'reviewsTotal or product.review_count',
      critical: true
    },
    {
      name: 'Real Sales Count',
      question: 'Does it show "X sold this month" with real number from database?',
      field: 'product.sales_count',
      critical: true
    },
    {
      name: 'Conditional Free Shipping',
      question: 'Does "Free Shipping Available" only appear if product.is_free_shipping is true?',
      field: 'product.is_free_shipping',
      critical: true
    },
    {
      name: 'Real Price',
      question: 'Does current price show correct amount from database?',
      field: 'product.price'
    },
    {
      name: 'Conditional Original Price',
      question: 'Does strikethrough price only show if product.original_price exists?',
      field: 'product.original_price',
      critical: true
    },
    {
      name: 'Seller Name',
      question: 'Does seller name show real seller from database?',
      field: 'product.seller'
    },
    {
      name: 'Conditional Seller Rating',
      question: 'Does seller rating only show if product.sellerRating exists?',
      field: 'product.sellerRating',
      critical: true
    },
    {
      name: 'Conditional Verified Badge',
      question: 'Does "Verified Product" badge only show if approved or verified?',
      field: 'product.approval_status or product.isVerified',
      critical: true
    },
    {
      name: 'Conditional Free Shipping Badge',
      question: 'Does "Free Shipping" badge in seller section only show if applicable?',
      field: 'product.is_free_shipping',
      critical: true
    },
    {
      name: 'Details Tab - Real Description',
      question: 'Tap "Details" tab. Does it show real product.description instead of "High-fidelity sound..."?',
      field: 'product.description',
      critical: true
    },
    {
      name: 'Details Tab - No Hardcoded Features',
      question: 'Are hardcoded features (Active Noise Cancellation, etc.) REMOVED?',
      field: 'No hardcoded features',
      critical: true
    },
    {
      name: 'Details Tab - Real Specifications',
      question: 'If product has specifications, are they displayed under "Specifications:"?',
      field: 'product.specifications'
    },
    {
      name: 'Ratings Tab - Real Review Count',
      question: 'Tap "Ratings" tab. Does it show "Ratings (X)" with real count?',
      field: 'reviewsTotal',
      critical: true
    },
    {
      name: 'Ratings Tab - Reviews Display',
      question: 'If reviews exist, are they displayed with real data? If 0, shows "No reviews yet"?',
      field: 'reviews from database'
    },
  ];
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const askQuestion = (query) => new Promise(resolve => readline.question(query, resolve));
  
  for (const check of checks) {
    const answer = await askQuestion(
      `  ${check.critical ? '🔴' : '⚪'} ${check.question}\n     Field: ${check.field}\n     (Y/N/S): `
    );
    
    const response = answer.trim().toUpperCase();
    
    if (response === 'S') {
      printWarning(check.name, 'Skipped by user');
    } else if (response === 'Y') {
      printResult(check.name, true, `✓ Displays real data from ${check.field}`);
    } else {
      printResult(
        check.name,
        false,
        `✗ ${check.critical ? 'CRITICAL: ' : ''}Not showing real data from ${check.field}`
      );
    }
    
    console.log('');
  }
  
  readline.close();
  return true;
}

// Test 5: Test with product that has NO data (edge cases)
async function test5_edgeCases() {
  printHeader('TEST 5: Edge Cases - Products with Missing Data');
  
  log('\n  📱 MANUAL STEP:', 'yellow');
  log('  Navigate to a product that might have missing data fields', 'yellow');
  log('  (e.g., no description, no reviews, out of stock, etc.)', 'yellow');
  log('\n  Press Enter when ready...', 'cyan');
  
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const askQuestion = (query) => new Promise(resolve => readline.question(query, resolve));
  
  const edgeCases = [
    {
      name: 'No Description',
      question: 'If product has NO description, does Details tab show "No product details available"?'
    },
    {
      name: 'No Stock',
      question: 'If stock is 0, does it show "Out of Stock" instead of "In-Stock (0)"?'
    },
    {
      name: 'No Reviews',
      question: 'If 0 reviews, does Ratings tab show "(0)" and "No reviews yet" message?'
    },
    {
      name: 'No Seller Rating',
      question: 'If no seller rating, is the seller rating section hidden (not showing "4.9")?'
    },
    {
      name: 'No Free Shipping',
      question: 'If not free shipping, are both free shipping badges hidden?'
    },
    {
      name: 'No Original Price',
      question: 'If no original_price, is strikethrough price hidden?'
    },
  ];
  
  for (const check of edgeCases) {
    const answer = await askQuestion(`  ${check.question}\n     (Y/N/S): `);
    const response = answer.trim().toUpperCase();
    
    if (response === 'S') {
      printWarning(check.name, 'Skipped - product may have this data');
    } else if (response === 'Y') {
      printResult(check.name, true, 'Correctly handles missing data');
    } else {
      printResult(check.name, false, 'Not handling missing data correctly');
    }
    
    console.log('');
  }
  
  readline.close();
  return true;
}

// Test 6: Compare mobile with web
async function test6_mobileWebParity() {
  printHeader('TEST 6: Mobile-Web Data Parity');
  
  log('\n  This test checks if mobile shows SAME data as web for the same product', 'cyan');
  log('  📱 Open the same product on web (screenshot provided shows denim jeans)', 'yellow');
  log('\n  Press Enter when you have both mobile and web open...', 'cyan');
  
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const askQuestion = (query) => new Promise(resolve => readline.question(query, resolve));
  
  const parityChecks = [
    'Does product name match between mobile and web?',
    'Does price match exactly?',
    'Does rating match?',
    'Does "products sold" count match (e.g., web shows "381 products sold")?',
    'Does description text match?',
    'Does stock count match?',
    'Do seller details match?',
  ];
  
  for (const check of parityChecks) {
    const answer = await askQuestion(`  ${check}\n     (Y/N/S): `);
    const response = answer.trim().toUpperCase();
    
    if (response === 'S') {
      printWarning('Mobile-Web Parity', `Skipped: ${check}`);
    } else if (response === 'Y') {
      printResult('Mobile-Web Parity', true, check);
    } else {
      printResult('Mobile-Web Parity', false, `MISMATCH: ${check}`);
    }
    
    console.log('');
  }
  
  readline.close();
  return true;
}

// Print final summary
function printSummary() {
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
  
  if (testResults.warnings > 0) {
    log('\n⚠️  WARNINGS:', 'yellow');
    testResults.tests
      .filter(t => t.warning)
      .forEach(t => {
        log(`  • ${t.name}`, 'yellow');
        if (t.message) log(`    ${t.message}`, 'yellow');
      });
  }
  
  console.log('\n' + '='.repeat(80));
  
  if (passRate >= 90) {
    log('\n✅ EXCELLENT! Product Detail screen is displaying real data correctly!', 'green');
    log('   Ready for intern onboarding and production use.', 'green');
  } else if (passRate >= 70) {
    log('\n⚠️  GOOD, but some issues found. Review failed tests above.', 'yellow');
  } else {
    log('\n❌ CRITICAL ISSUES! Many tests failed. Fix before deployment.', 'red');
  }
  
  console.log('\n');
}

// Main test runner
async function runTests() {
  log('\n╔════════════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║          Product Detail Screen - Real Data Display Test Suite             ║', 'cyan');
  log('║                          Mobile App Verification                           ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════════════╝', 'cyan');
  
  log('\nThis test verifies that ProductDetailScreen displays REAL database values', 'blue');
  log('instead of hardcoded placeholders for all product information.\n', 'blue');
  
  try {
    // Run automated tests
    const deviceOk = await test1_deviceConnection();
    if (!deviceOk) {
      log('\n⚠️  Cannot proceed without connected device. Exiting...', 'red');
      return;
    }
    
    const appOk = await test2_appInstalled();
    if (!appOk) {
      log('\n⚠️  App not installed. Run "npm start" in mobile-app directory.', 'red');
      return;
    }
    
    await test3_launchAndNavigate();
    
    // Run manual verification tests
    await test4_visualInspection();
    await test5_edgeCases();
    await test6_mobileWebParity();
    
    // Print results
    printSummary();
    
  } catch (error) {
    log(`\n❌ Test execution error: ${error.message}`, 'red');
    console.error(error);
  }
}

// Run tests
runTests().catch(console.error);
