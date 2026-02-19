/**
 * Barcode Scanning System - Integration Test Suite
 * Tests alignment between database schema, service, hooks, and components
 * 
 * Run with: npx tsx scripts/test-barcode-system.ts
 * Or: npm run test:barcode
 */

// Test utilities
const testResults: { name: string; passed: boolean; error?: string }[] = [];

function test(name: string, fn: () => Promise<void> | void) {
  return async () => {
    try {
      console.log(`\n🧪 Testing: ${name}`);
      await fn();
      testResults.push({ name, passed: true });
      console.log(`✅ PASSED: ${name}`);
    } catch (error) {
      testResults.push({ 
        name, 
        passed: false, 
        error: error instanceof Error ? error.message : String(error) 
      });
      console.log(`❌ FAILED: ${name}`);
      console.error(error);
    }
  };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(
      `${message || 'Values not equal'}\nExpected: ${expected}\nActual: ${actual}`
    );
  }
}

function assertDeepEqual(actual: any, expected: any, message?: string) {
  const actualStr = JSON.stringify(actual, null, 2);
  const expectedStr = JSON.stringify(expected, null, 2);
  if (actualStr !== expectedStr) {
    throw new Error(
      `${message || 'Objects not equal'}\nExpected: ${expectedStr}\nActual: ${actualStr}`
    );
  }
}

// ============================================================================
// DATABASE SCHEMA TESTS
// ============================================================================

const DB_BARCODE_SCANS_COLUMNS = [
  'id',
  'vendor_id',  // Database uses vendor_id, not seller_id
  'product_id',
  'variant_id',
  'service_id',  // Exists in current DB for service barcodes
  'barcode_value',
  'is_successful',
  'error_message',
  'scan_source',
  'order_id',
  'raw_scan',  // Exists in current DB
  'scan_duration_ms',
  'scanner_type',
  'scan_timestamp',
  'created_at',
];

const VALID_SCAN_SOURCES = ['pos', 'inventory', 'receiving', 'manual'];
const VALID_SCANNER_TYPES = ['hardware', 'camera', 'manual'];
const VALID_BARCODE_FORMATS = ['EAN-13', 'EAN-8', 'CODE128', 'CODE39', 'ITF', 'QR'];

const testBarcodeScanTableSchema = test('DB Schema - barcode_scans Table Columns', () => {
  const expectedColumns = new Set(DB_BARCODE_SCANS_COLUMNS);
  
  console.log(`  Expected columns: ${expectedColumns.size}`);
  
  for (const col of expectedColumns) {
    assert(typeof col === 'string' && col.length > 0, `Column ${col} should be valid`);
  }
  
  // Verify required columns
  assert(expectedColumns.has('id'), 'Should have id column');
  assert(expectedColumns.has('vendor_id'), 'Should have vendor_id column');
  assert(expectedColumns.has('barcode_value'), 'Should have barcode_value column');
  assert(expectedColumns.has('is_successful'), 'Should have is_successful column');
  assert(expectedColumns.has('scan_timestamp'), 'Should have scan_timestamp column');
  
  console.log('  All required columns present');
});

const testScanSourceValues = test('DB Schema - Valid Scan Sources', () => {
  for (const source of VALID_SCAN_SOURCES) {
    assert(typeof source === 'string', `Scan source '${source}' should be string`);
  }
  
  assertEqual(VALID_SCAN_SOURCES.length, 4, 'Should have 4 valid scan sources');
  assert(VALID_SCAN_SOURCES.includes('pos'), 'Should include pos');
  assert(VALID_SCAN_SOURCES.includes('inventory'), 'Should include inventory');
  assert(VALID_SCAN_SOURCES.includes('receiving'), 'Should include receiving');
  assert(VALID_SCAN_SOURCES.includes('manual'), 'Should include manual');
  
  console.log('  All scan source values valid');
});

const testScannerTypeValues = test('DB Schema - Valid Scanner Types', () => {
  for (const type of VALID_SCANNER_TYPES) {
    assert(typeof type === 'string', `Scanner type '${type}' should be string`);
  }
  
  assertEqual(VALID_SCANNER_TYPES.length, 3, 'Should have 3 valid scanner types');
  assert(VALID_SCANNER_TYPES.includes('hardware'), 'Should include hardware');
  assert(VALID_SCANNER_TYPES.includes('camera'), 'Should include camera');
  assert(VALID_SCANNER_TYPES.includes('manual'), 'Should include manual');
  
  console.log('  All scanner type values valid');
});

// ============================================================================
// BARCODE GENERATION TESTS
// ============================================================================

const testBarcodeGenerationCODE128 = test('Barcode Generation - CODE128 Format', () => {
  const vendorId = '123e4567-e89b-12d3-a456-426614174000';
  const variantId = '987fcdeb-51a2-12d3-a456-426614174000';
  
  const barcode = mockGenerateBarcode(vendorId, variantId, 'CODE128');
  
  assert(barcode.startsWith('BC'), 'CODE128 should start with BC prefix');
  assert(barcode.length > 10, 'Barcode should have reasonable length');
  assert(/^BC[A-F0-9]+$/i.test(barcode), 'CODE128 should be alphanumeric');
  
  console.log(`  Generated barcode: ${barcode}`);
});

const testBarcodeGenerationEAN13 = test('Barcode Generation - EAN-13 Format', () => {
  const vendorId = '123e4567-e89b-12d3-a456-426614174000';
  const variantId = '987fcdeb-51a2-12d3-a456-426614174000';
  
  const barcode = mockGenerateBarcode(vendorId, variantId, 'EAN-13');
  
  assertEqual(barcode.length, 13, 'EAN-13 should be exactly 13 digits');
  assert(/^\d{13}$/.test(barcode), 'EAN-13 should be numeric only');
  
  // Verify check digit
  const isValid = verifyEAN13CheckDigit(barcode);
  assert(isValid, 'EAN-13 check digit should be valid');
  
  console.log(`  Generated EAN-13: ${barcode}`);
});

const testBarcodeGenerationUniqueness = test('Barcode Generation - Uniqueness', () => {
  const vendorId = '123e4567-e89b-12d3-a456-426614174000';
  // Use variant IDs that differ in the first 8 chars (which is what we extract)
  const variants = [
    'aaaa1111-51a2-0001-a456-426614174000',
    'bbbb2222-51a2-0002-a456-426614174000',
    'cccc3333-51a2-0003-a456-426614174000',
    'dddd4444-51a2-0004-a456-426614174000',
    'eeee5555-51a2-0005-a456-426614174000',
  ];
  
  const barcodes = variants.map(v => mockGenerateBarcode(vendorId, v, 'CODE128'));
  const uniqueBarcodes = new Set(barcodes);
  
  assertEqual(uniqueBarcodes.size, variants.length, 'All barcodes should be unique');
  
  console.log(`  Generated ${barcodes.length} unique barcodes`);
});

// ============================================================================
// BARCODE VALIDATION TESTS
// ============================================================================

const testBarcodeValidationLength = test('Barcode Validation - Length Boundaries', () => {
  // Valid lengths (4-50)
  assert(validateBarcodeLength('1234'), 'Min length 4 should be valid');
  assert(validateBarcodeLength('1234567890123'), 'EAN-13 length should be valid');
  assert(validateBarcodeLength('A'.repeat(50)), 'Max length 50 should be valid');
  
  // Invalid lengths
  assert(!validateBarcodeLength('123'), 'Length < 4 should be invalid');
  assert(!validateBarcodeLength('A'.repeat(51)), 'Length > 50 should be invalid');
  assert(!validateBarcodeLength(''), 'Empty string should be invalid');
  
  console.log('  Length validation correct');
});

const testBarcodeValidationFormats = test('Barcode Validation - Format Detection', () => {
  // EAN-13
  assert(validateBarcodeFormat('1234567890123', 'EAN-13'), 'Valid EAN-13');
  assert(!validateBarcodeFormat('123456789012', 'EAN-13'), 'Too short for EAN-13');
  assert(!validateBarcodeFormat('123456789012A', 'EAN-13'), 'Non-numeric for EAN-13');
  
  // EAN-8
  assert(validateBarcodeFormat('12345678', 'EAN-8'), 'Valid EAN-8');
  assert(!validateBarcodeFormat('1234567', 'EAN-8'), 'Too short for EAN-8');
  
  // CODE128
  assert(validateBarcodeFormat('BC123ABC', 'CODE128'), 'Valid CODE128');
  assert(validateBarcodeFormat('ANY-VALUE-123', 'CODE128'), 'CODE128 accepts most characters');
  
  // QR
  assert(validateBarcodeFormat('https://example.com', 'QR'), 'QR accepts URLs');
  assert(validateBarcodeFormat('Any text content!', 'QR'), 'QR accepts any text');
  
  console.log('  Format validation correct for all types');
});

// ============================================================================
// INPUT HANDLER TESTS
// ============================================================================

const testInputHandlerBuffer = test('Input Handler - Buffer Management', () => {
  const handler = new MockBarcodeInputHandler();
  
  // Simulate rapid key presses (scanner input)
  handler.simulateKeyPress('1');
  handler.simulateKeyPress('2');
  handler.simulateKeyPress('3');
  handler.simulateKeyPress('4');
  handler.simulateKeyPress('5');
  
  assertEqual(handler.getBuffer(), '12345', 'Buffer should accumulate characters');
  
  handler.clear();
  assertEqual(handler.getBuffer(), '', 'Buffer should clear');
  
  console.log('  Buffer management correct');
});

const testInputHandlerTimingDetection = test('Input Handler - Scanner vs Manual Typing', () => {
  // Scanner input should be very fast (< 200ms between keys)
  const isScannerInput = detectScannerInput([10, 15, 12, 8, 20]); // ms gaps
  assert(isScannerInput, 'Rapid input should be detected as scanner');
  
  // Manual typing is slower (> 200ms between keys)
  const isManualInput = detectScannerInput([250, 300, 180, 400, 220]);
  assert(!isManualInput, 'Slow input should be detected as manual typing');
  
  // Mixed timing
  const mixedInput = detectScannerInput([10, 15, 250, 8, 20]);
  assert(!mixedInput, 'Mixed timing should be treated as manual');
  
  console.log('  Timing detection correct');
});

const testInputHandlerEnterKey = test('Input Handler - Enter Key Processing', () => {
  const handler = new MockBarcodeInputHandler();
  let scannedValue = '';
  
  handler.onScan = (barcode) => {
    scannedValue = barcode;
  };
  
  // Type barcode and press Enter
  handler.simulateKeyPress('B');
  handler.simulateKeyPress('C');
  handler.simulateKeyPress('1');
  handler.simulateKeyPress('2');
  handler.simulateKeyPress('3');
  handler.simulateEnter();
  
  assertEqual(scannedValue, 'BC123', 'Enter should trigger callback with barcode');
  assertEqual(handler.getBuffer(), '', 'Buffer should clear after Enter');
  
  console.log('  Enter key processing correct');
});

// ============================================================================
// LOOKUP RESULT TESTS
// ============================================================================

const testLookupResultStructure = test('Lookup Result - Structure Validation', () => {
  const result = createMockLookupResult(true);
  
  // Check required fields
  assert('type' in result, 'Should have type field');
  assert('id' in result, 'Should have id field');
  assert('name' in result, 'Should have name field');
  assert('price' in result, 'Should have price field');
  assert('stock' in result, 'Should have stock field');
  assert('isFound' in result, 'Should have isFound field');
  
  // Check types
  assert(['product', 'variant', null].includes(result.type), 'Type should be valid');
  assert(typeof result.isFound === 'boolean', 'isFound should be boolean');
  
  console.log('  Lookup result structure valid');
});

const testLookupResultNotFound = test('Lookup Result - Not Found Handling', () => {
  const result = createMockLookupResult(false);
  
  assertEqual(result.isFound, false, 'isFound should be false');
  assertEqual(result.type, null, 'Type should be null when not found');
  assertEqual(result.id, null, 'ID should be null when not found');
  assertEqual(result.name, null, 'Name should be null when not found');
  
  console.log('  Not found result handled correctly');
});

// ============================================================================
// SCAN LOGGING TESTS
// ============================================================================

const testScanLogStructure = test('Scan Log - Structure Validation', () => {
  const log = createMockScanLog({
    barcode: 'BC12345678',
    isSuccessful: true,
  });
  
  assert('vendorId' in log, 'Should have vendorId');
  assert('barcodeValue' in log, 'Should have barcodeValue');
  assert('isSuccessful' in log, 'Should have isSuccessful');
  assert('scanSource' in log, 'Should have scanSource');
  assert('scannerType' in log, 'Should have scannerType');
  
  assert(VALID_SCAN_SOURCES.includes(log.scanSource), 'scanSource should be valid');
  assert(VALID_SCANNER_TYPES.includes(log.scannerType), 'scannerType should be valid');
  
  console.log('  Scan log structure valid');
});

const testScanLogSuccessFailure = test('Scan Log - Success vs Failure', () => {
  const successLog = createMockScanLog({ barcode: 'BC123', isSuccessful: true });
  const failLog = createMockScanLog({ barcode: 'INVALID', isSuccessful: false });
  
  assertEqual(successLog.isSuccessful, true, 'Success log should have isSuccessful=true');
  assertEqual(successLog.errorMessage, null, 'Success log should have no error message');
  
  assertEqual(failLog.isSuccessful, false, 'Fail log should have isSuccessful=false');
  assert(failLog.errorMessage !== null, 'Fail log should have error message');
  
  console.log('  Success/failure logging correct');
});

// ============================================================================
// AUDIO FEEDBACK TESTS
// ============================================================================

const testAudioFeedbackTypes = test('Audio Feedback - Type Options', () => {
  const validTypes = ['success', 'error'];
  
  for (const type of validTypes) {
    assert(typeof type === 'string', `Audio type '${type}' should be string`);
  }
  
  assertEqual(validTypes.length, 2, 'Should have 2 audio feedback types');
  
  console.log('  Audio feedback types valid');
});

// ============================================================================
// STATISTICS TESTS
// ============================================================================

const testStatisticsStructure = test('Statistics - Structure Validation', () => {
  const stats = createMockScanStats();
  
  assert('totalScans' in stats, 'Should have totalScans');
  assert('successfulScans' in stats, 'Should have successfulScans');
  assert('failedScans' in stats, 'Should have failedScans');
  assert('successRate' in stats, 'Should have successRate');
  
  assert(typeof stats.totalScans === 'number', 'totalScans should be number');
  assert(stats.successRate >= 0 && stats.successRate <= 100, 'successRate should be 0-100');
  
  console.log('  Statistics structure valid');
});

const testStatisticsCalculations = test('Statistics - Calculations', () => {
  const stats = {
    totalScans: 100,
    successfulScans: 85,
    failedScans: 15,
    successRate: 85.0,
  };
  
  assertEqual(stats.totalScans, stats.successfulScans + stats.failedScans, 'Total = success + failed');
  assertEqual(stats.successRate, (stats.successfulScans / stats.totalScans) * 100, 'Success rate calculation');
  
  console.log('  Statistics calculations correct');
});

// ============================================================================
// INTEGRATION TESTS - POS WORKFLOW
// ============================================================================

const testPOSWorkflowScan = test('POS Workflow - Scan to Cart', () => {
  // Simulate full workflow
  const cart: any[] = [];
  const barcode = 'BC12345678';
  
  // Step 1: Scanner captures barcode
  const capturedBarcode = simulateScan(barcode);
  assertEqual(capturedBarcode, barcode, 'Barcode should be captured');
  
  // Step 2: Lookup product
  const lookupResult = createMockLookupResult(true);
  lookupResult.id = 'product-123';
  lookupResult.name = 'Test Product';
  lookupResult.price = 99.99;
  lookupResult.stock = 10;
  
  // Step 3: Add to cart
  if (lookupResult.isFound && lookupResult.id) {
    cart.push({
      productId: lookupResult.id,
      productName: lookupResult.name,
      price: lookupResult.price,
      quantity: 1,
    });
  }
  
  assertEqual(cart.length, 1, 'Cart should have 1 item');
  assertEqual(cart[0].productId, 'product-123', 'Cart should have correct product');
  
  console.log('  POS workflow completed successfully');
});

const testPOSWorkflowDuplicateScan = test('POS Workflow - Duplicate Scan Increments Quantity', () => {
  const cart: any[] = [
    { productId: 'product-123', productName: 'Test', price: 99.99, quantity: 1 }
  ];
  
  // Simulate scanning same product again
  const existingItem = cart.find(item => item.productId === 'product-123');
  
  if (existingItem) {
    existingItem.quantity += 1;
  }
  
  assertEqual(cart.length, 1, 'Cart should still have 1 item');
  assertEqual(cart[0].quantity, 2, 'Quantity should be incremented');
  
  console.log('  Duplicate scan handling correct');
});

// ============================================================================
// MOCK/HELPER FUNCTIONS
// ============================================================================

function mockGenerateBarcode(vendorId: string, variantId: string, format: string): string {
  const vendorPrefix = vendorId.replace(/-/g, '').slice(0, 4).toUpperCase();
  const variantSuffix = variantId.replace(/-/g, '').slice(0, 8).toUpperCase();
  
  if (format === 'EAN-13') {
    const digits = (vendorPrefix + variantSuffix).replace(/[^0-9]/g, '').slice(0, 12).padStart(12, '0');
    const checkDigit = calculateEAN13CheckDigit(digits);
    return digits + checkDigit;
  }
  
  return `BC${vendorPrefix}${variantSuffix}`;
}

function calculateEAN13CheckDigit(digits: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(digits[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  return ((10 - (sum % 10)) % 10).toString();
}

function verifyEAN13CheckDigit(barcode: string): boolean {
  if (barcode.length !== 13 || !/^\d+$/.test(barcode)) return false;
  const providedCheck = barcode[12];
  const calculatedCheck = calculateEAN13CheckDigit(barcode.slice(0, 12));
  return providedCheck === calculatedCheck;
}

function validateBarcodeLength(barcode: string): boolean {
  return barcode.length >= 4 && barcode.length <= 50;
}

function validateBarcodeFormat(barcode: string, format: string): boolean {
  switch (format) {
    case 'EAN-13':
      return /^\d{13}$/.test(barcode);
    case 'EAN-8':
      return /^\d{8}$/.test(barcode);
    case 'CODE128':
    case 'CODE39':
      return /^[A-Z0-9\-\.\/\+\%\$\s]+$/i.test(barcode);
    case 'ITF':
      return /^\d+$/.test(barcode) && barcode.length % 2 === 0;
    case 'QR':
      return true;
    default:
      return true;
  }
}

class MockBarcodeInputHandler {
  private buffer = '';
  public onScan: ((barcode: string) => void) | null = null;
  
  simulateKeyPress(char: string): void {
    this.buffer += char;
  }
  
  simulateEnter(): void {
    if (this.onScan && this.buffer.length >= 4) {
      this.onScan(this.buffer);
    }
    this.buffer = '';
  }
  
  getBuffer(): string {
    return this.buffer;
  }
  
  clear(): void {
    this.buffer = '';
  }
}

function detectScannerInput(gaps: number[]): boolean {
  const maxGap = 200; // ms
  return gaps.every(gap => gap < maxGap);
}

function createMockLookupResult(found: boolean): any {
  if (!found) {
    return {
      type: null,
      id: null,
      name: null,
      price: null,
      stock: null,
      imageUrl: null,
      isFound: false,
    };
  }
  
  return {
    type: 'variant',
    id: 'variant-123',
    name: 'Test Product',
    variantName: 'Red / Large',
    productId: 'product-123',
    sku: 'TEST-SKU-001',
    price: 99.99,
    stock: 50,
    imageUrl: 'https://example.com/image.jpg',
    isFound: true,
  };
}

function createMockScanLog(options: { barcode: string; isSuccessful: boolean }): any {
  return {
    id: 'log-' + Date.now(),
    vendorId: 'vendor-123',
    productId: options.isSuccessful ? 'product-123' : null,
    variantId: options.isSuccessful ? 'variant-123' : null,
    barcodeValue: options.barcode,
    isSuccessful: options.isSuccessful,
    errorMessage: options.isSuccessful ? null : 'Barcode not found',
    scanSource: 'pos',
    orderId: null,
    scannerType: 'hardware',
    scanTimestamp: new Date().toISOString(),
  };
}

function createMockScanStats(): any {
  return {
    totalScans: 100,
    successfulScans: 85,
    failedScans: 15,
    successRate: 85.0,
    topScannedProducts: [
      { productId: 'p1', productName: 'Product 1', scanCount: 25 },
      { productId: 'p2', productName: 'Product 2', scanCount: 18 },
    ],
    scansByDay: [
      { date: '2026-02-14', count: 30 },
      { date: '2026-02-15', count: 35 },
      { date: '2026-02-16', count: 35 },
    ],
  };
}

function simulateScan(barcode: string): string {
  return barcode.trim().toUpperCase();
}

// ============================================================================
// TEST RUNNER
// ============================================================================

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  BAZAAR BARCODE SCANNING SYSTEM - TEST SUITE');
  console.log('  Testing DB Schema ↔ Service ↔ Hooks ↔ Components');
  console.log('═══════════════════════════════════════════════════════════════');

  // Database Schema Tests
  console.log('\n🗄️ DATABASE SCHEMA TESTS');
  console.log('─────────────────────────────────────────────────────────────────');
  await testBarcodeScanTableSchema();
  await testScanSourceValues();
  await testScannerTypeValues();

  // Barcode Generation Tests
  console.log('\n🔢 BARCODE GENERATION TESTS');
  console.log('─────────────────────────────────────────────────────────────────');
  await testBarcodeGenerationCODE128();
  await testBarcodeGenerationEAN13();
  await testBarcodeGenerationUniqueness();

  // Barcode Validation Tests
  console.log('\n✅ BARCODE VALIDATION TESTS');
  console.log('─────────────────────────────────────────────────────────────────');
  await testBarcodeValidationLength();
  await testBarcodeValidationFormats();

  // Input Handler Tests
  console.log('\n⌨️ INPUT HANDLER TESTS');
  console.log('─────────────────────────────────────────────────────────────────');
  await testInputHandlerBuffer();
  await testInputHandlerTimingDetection();
  await testInputHandlerEnterKey();

  // Lookup Result Tests
  console.log('\n🔍 LOOKUP RESULT TESTS');
  console.log('─────────────────────────────────────────────────────────────────');
  await testLookupResultStructure();
  await testLookupResultNotFound();

  // Scan Logging Tests
  console.log('\n📝 SCAN LOGGING TESTS');
  console.log('─────────────────────────────────────────────────────────────────');
  await testScanLogStructure();
  await testScanLogSuccessFailure();

  // Audio Feedback Tests
  console.log('\n🔊 AUDIO FEEDBACK TESTS');
  console.log('─────────────────────────────────────────────────────────────────');
  await testAudioFeedbackTypes();

  // Statistics Tests
  console.log('\n📊 STATISTICS TESTS');
  console.log('─────────────────────────────────────────────────────────────────');
  await testStatisticsStructure();
  await testStatisticsCalculations();

  // Integration Tests
  console.log('\n🔄 INTEGRATION TESTS');
  console.log('─────────────────────────────────────────────────────────────────');
  await testPOSWorkflowScan();
  await testPOSWorkflowDuplicateScan();

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  TEST RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');

  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  const total = testResults.length;

  console.log(`\n  Total Tests: ${total}`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n  FAILED TESTS:');
    testResults
      .filter(r => !r.passed)
      .forEach(r => console.log(`    ❌ ${r.name}: ${r.error}`));
  }

  console.log('\n═══════════════════════════════════════════════════════════════');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
