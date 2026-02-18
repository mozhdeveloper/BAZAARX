/**
 * Mobile POS Frontend Test Script
 * Tests that all POS components are properly integrated and visible
 */

import * as fs from 'fs';
import * as path from 'path';

const MOBILE_APP_PATH = path.join(__dirname, '..');

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const icons = {
    info: '📋',
    success: '✅',
    error: '❌',
    warn: '⚠️',
  };
  console.log(`${icons[type]} ${message}`);
}

function addResult(name: string, passed: boolean, details: string) {
  results.push({ name, passed, details });
  log(`${name}: ${details}`, passed ? 'success' : 'error');
}

// ==============================================================================
// TEST 1: Check POS file exists and has correct imports
// ==============================================================================
function testPOSFileImports() {
  log('\n📦 Testing POS file imports...', 'info');
  
  const posFilePath = path.join(MOBILE_APP_PATH, 'app', 'seller', 'pos.tsx');
  
  if (!fs.existsSync(posFilePath)) {
    addResult('POS File Exists', false, 'pos.tsx not found');
    return;
  }
  
  const posContent = fs.readFileSync(posFilePath, 'utf-8');
  
  // Check for new component imports
  const requiredImports = [
    { name: 'BarcodeScanner', pattern: /import\s+(\{?\s*BarcodeScanner\s*\}?|BarcodeScanner)\s+from/ },
    { name: 'QuickProductModal', pattern: /import\s+(\{?\s*QuickProductModal\s*\}?|QuickProductModal)\s+from/ },
    { name: 'barcodeService', pattern: /import\s+\{.*lookupBarcodeQuick.*\}\s+from/ },
    { name: 'posSettingsService', pattern: /getPOSSettings|calculateTax|generateReceiptHTML/ },
    { name: 'expo-haptics', pattern: /import\s+\*\s+as\s+Haptics\s+from\s+['"]expo-haptics['"]/ },
    { name: 'PaymentMethod type', pattern: /PaymentMethod/ },
  ];
  
  for (const imp of requiredImports) {
    const found = imp.pattern.test(posContent);
    addResult(`Import: ${imp.name}`, found, found ? 'Found' : 'Missing');
  }
}

// ==============================================================================
// TEST 2: Check state variables are defined
// ==============================================================================
function testPOSStateVariables() {
  log('\n🔧 Testing POS state variables...', 'info');
  
  const posFilePath = path.join(MOBILE_APP_PATH, 'app', 'seller', 'pos.tsx');
  const posContent = fs.readFileSync(posFilePath, 'utf-8');
  
  const requiredStates = [
    { name: 'showBarcodeScanner', pattern: /useState.*showBarcodeScanner|showBarcodeScanner.*useState/ },
    { name: 'showQuickProductModal', pattern: /useState.*showQuickProductModal|showQuickProductModal.*useState/ },
    { name: 'pendingBarcode', pattern: /useState.*pendingBarcode|pendingBarcode.*useState/ },
    { name: 'paymentMethod', pattern: /useState.*paymentMethod|paymentMethod.*useState/ },
    { name: 'posSettings', pattern: /useState.*posSettings|posSettings.*useState/ },
  ];
  
  for (const state of requiredStates) {
    const found = state.pattern.test(posContent);
    addResult(`State: ${state.name}`, found, found ? 'Defined' : 'Missing');
  }
}

// ==============================================================================
// TEST 3: Check UI components are rendered
// ==============================================================================
function testPOSUIComponents() {
  log('\n🎨 Testing POS UI component rendering...', 'info');
  
  const posFilePath = path.join(MOBILE_APP_PATH, 'app', 'seller', 'pos.tsx');
  const posContent = fs.readFileSync(posFilePath, 'utf-8');
  
  const requiredUIElements = [
    { name: 'BarcodeScanner component', pattern: /<BarcodeScanner/ },
    { name: 'QuickProductModal component', pattern: /<QuickProductModal/ },
    { name: 'Barcode scan button', pattern: /barcodeScanButton|setShowBarcodeScanner\(true\)/ },
    { name: 'Payment method selection', pattern: /paymentMethodSection|paymentMethodOptions/ },
    { name: 'Payment method Cash', pattern: /paymentMethod\s*===\s*['"]cash['"]/ },
    { name: 'Payment method Card', pattern: /paymentMethod\s*===\s*['"]card['"]/ },
    { name: 'Payment method E-Wallet', pattern: /paymentMethod\s*===\s*['"]ewallet['"]/ },
    { name: 'Tax display', pattern: /posSettings\.enableTax|cartTax/ },
  ];
  
  for (const element of requiredUIElements) {
    const found = element.pattern.test(posContent);
    addResult(`UI: ${element.name}`, found, found ? 'Rendered' : 'Missing');
  }
}

// ==============================================================================
// TEST 4: Check BarcodeScanner component file
// ==============================================================================
function testBarcodeScannerComponent() {
  log('\n📷 Testing BarcodeScanner component...', 'info');
  
  const scannerPath = path.join(MOBILE_APP_PATH, 'src', 'components', 'seller', 'BarcodeScanner.tsx');
  
  if (!fs.existsSync(scannerPath)) {
    addResult('BarcodeScanner file exists', false, 'BarcodeScanner.tsx not found');
    return;
  }
  
  const scannerContent = fs.readFileSync(scannerPath, 'utf-8');
  
  const requiredFeatures = [
    { name: 'expo-camera import', pattern: /import.*CameraView.*from\s+['"]expo-camera['"]/ },
    { name: 'Camera permission handling', pattern: /useCameraPermissions|requestPermission/ },
    { name: 'onBarcodeScanned handler', pattern: /onBarcodeScanned/ },
    { name: 'Torch toggle', pattern: /enableTorch|torch/ },
    { name: 'Close button', pattern: /onClose/ },
    { name: 'Scan area UI', pattern: /scanArea|cornerBracket/ },
    { name: 'Barcode types config', pattern: /ean13|ean8|upc_a|code128/ },
    { name: 'Modal presentation', pattern: /<Modal/ },
  ];
  
  for (const feature of requiredFeatures) {
    const found = feature.pattern.test(scannerContent);
    addResult(`Scanner: ${feature.name}`, found, found ? 'Present' : 'Missing');
  }
}

// ==============================================================================
// TEST 5: Check QuickProductModal component file
// ==============================================================================
function testQuickProductModalComponent() {
  log('\n📝 Testing QuickProductModal component...', 'info');
  
  const modalPath = path.join(MOBILE_APP_PATH, 'src', 'components', 'seller', 'QuickProductModal.tsx');
  
  if (!fs.existsSync(modalPath)) {
    addResult('QuickProductModal file exists', false, 'QuickProductModal.tsx not found');
    return;
  }
  
  const modalContent = fs.readFileSync(modalPath, 'utf-8');
  
  const requiredFeatures = [
    { name: 'Modal component', pattern: /<Modal/ },
    { name: 'Product name input', pattern: /name|productName/i },
    { name: 'Price input', pattern: /price/i },
    { name: 'Stock input', pattern: /stock/i },
    { name: 'Category selection', pattern: /category|categoryId/i },
    { name: 'Barcode prop', pattern: /barcode/i },
    { name: 'onProductCreated callback', pattern: /onProductCreated/ },
    { name: 'Form validation', pattern: /trim\(\)|\.length/ },
    { name: 'Supabase integration', pattern: /supabase/ },
  ];
  
  for (const feature of requiredFeatures) {
    const found = feature.pattern.test(modalContent);
    addResult(`QuickModal: ${feature.name}`, found, found ? 'Present' : 'Missing');
  }
}

// ==============================================================================
// TEST 6: Check barcodeService file
// ==============================================================================
function testBarcodeService() {
  log('\n🔍 Testing barcodeService...', 'info');
  
  const servicePath = path.join(MOBILE_APP_PATH, 'src', 'services', 'barcodeService.ts');
  
  if (!fs.existsSync(servicePath)) {
    addResult('barcodeService file exists', false, 'barcodeService.ts not found');
    return;
  }
  
  const serviceContent = fs.readFileSync(servicePath, 'utf-8');
  
  const requiredFunctions = [
    { name: 'lookupBarcodeQuick function', pattern: /export\s+(async\s+)?function\s+lookupBarcodeQuick/ },
    { name: 'logBarcodeScan function', pattern: /export\s+(async\s+)?function\s+logBarcodeScan/ },
    { name: 'createProductWithBarcode function', pattern: /export\s+(async\s+)?function\s+createProductWithBarcode/ },
    { name: 'product_variants query', pattern: /\.from\(['"]product_variants['"]/ },
    { name: 'barcode search', pattern: /\.eq\(['"]barcode['"]/ },
    { name: 'SKU search', pattern: /sku/i },
  ];
  
  for (const func of requiredFunctions) {
    const found = func.pattern.test(serviceContent);
    addResult(`Service: ${func.name}`, found, found ? 'Present' : 'Missing');
  }
}

// ==============================================================================
// TEST 7: Check posSettingsService file
// ==============================================================================
function testPOSSettingsService() {
  log('\n⚙️ Testing posSettingsService...', 'info');
  
  const servicePath = path.join(MOBILE_APP_PATH, 'src', 'services', 'posSettingsService.ts');
  
  if (!fs.existsSync(servicePath)) {
    addResult('posSettingsService file exists', false, 'posSettingsService.ts not found');
    return;
  }
  
  const serviceContent = fs.readFileSync(servicePath, 'utf-8');
  
  const requiredFeatures = [
    { name: 'POSSettings interface', pattern: /interface\s+POSSettings/ },
    { name: 'PaymentMethod type', pattern: /type\s+PaymentMethod/ },
    { name: 'DEFAULT_POS_SETTINGS', pattern: /export\s+(const\s+)?DEFAULT_POS_SETTINGS/ },
    { name: 'getPOSSettings function', pattern: /export\s+(async\s+)?function\s+getPOSSettings/ },
    { name: 'savePOSSettings function', pattern: /export\s+(async\s+)?function\s+savePOSSettings/ },
    { name: 'calculateTax function', pattern: /export\s+function\s+calculateTax/ },
    { name: 'generateReceiptHTML function', pattern: /export\s+function\s+generateReceiptHTML/ },
    { name: 'Tax rate setting', pattern: /taxRate/ },
    { name: 'Tax inclusive setting', pattern: /taxIncludedInPrice|tax_included/ },
    { name: 'Payment method settings', pattern: /enableCash|enableCard|enableEwallet/ },
  ];
  
  for (const feature of requiredFeatures) {
    const found = feature.pattern.test(serviceContent);
    addResult(`Settings: ${feature.name}`, found, found ? 'Present' : 'Missing');
  }
}

// ==============================================================================
// TEST 8: Check styles are defined
// ==============================================================================
function testPOSStyles() {
  log('\n🎨 Testing POS styles...', 'info');
  
  const posFilePath = path.join(MOBILE_APP_PATH, 'app', 'seller', 'pos.tsx');
  const posContent = fs.readFileSync(posFilePath, 'utf-8');
  
  const requiredStyles = [
    'barcodeScanButton',
    'paymentMethodSection',
    'paymentMethodOptions',
    'paymentMethodOption',
    'paymentMethodOptionActive',
    'paymentMethodText',
    'paymentMethodTextActive',
    'cartModalPaymentSection',
    'cartModalPaymentOptions',
    'cartModalPaymentOption',
  ];
  
  for (const style of requiredStyles) {
    const pattern = new RegExp(`${style}\\s*:`);
    const found = pattern.test(posContent);
    addResult(`Style: ${style}`, found, found ? 'Defined' : 'Missing');
  }
}

// ==============================================================================
// TEST 9: Check tax calculation logic
// ==============================================================================
function testTaxCalculationLogic() {
  log('\n💰 Testing tax calculation logic...', 'info');
  
  const posFilePath = path.join(MOBILE_APP_PATH, 'app', 'seller', 'pos.tsx');
  const posContent = fs.readFileSync(posFilePath, 'utf-8');
  
  // Check for cartSubtotal, cartTax, cartTotal calculations
  const taxPatterns = [
    { name: 'cartSubtotal useMemo', pattern: /cartSubtotal\s*=\s*useMemo/ },
    { name: 'cartTax useMemo', pattern: /cartTax\s*=\s*useMemo/ },
    { name: 'cartTotal useMemo', pattern: /cartTotal\s*=\s*useMemo/ },
    { name: 'calculateTax usage', pattern: /calculateTax\(cartSubtotal/ },
  ];
  
  for (const pattern of taxPatterns) {
    const found = pattern.pattern.test(posContent);
    addResult(`Tax: ${pattern.name}`, found, found ? 'Present' : 'Missing');
  }
}

// ==============================================================================
// TEST 10: Check package.json for required dependencies
// ==============================================================================
function testPackageDependencies() {
  log('\n📦 Testing package dependencies...', 'info');
  
  const packagePath = path.join(MOBILE_APP_PATH, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  
  const requiredDeps = [
    'expo-camera',
    'expo-haptics',
    'expo-print',
    'expo-sharing',
  ];
  
  for (const dep of requiredDeps) {
    const found = dep in packageJson.dependencies;
    addResult(`Dependency: ${dep}`, found, found ? `v${packageJson.dependencies[dep]}` : 'Not installed');
  }
}

// ==============================================================================
// TEST 11: Check database schema compatibility (pos_settings table)
// ==============================================================================
function testDatabaseSchema() {
  log('\n🗄️ Testing database schema compatibility...', 'info');
  
  const dbSchemaPath = path.join(MOBILE_APP_PATH, '..', 'currentdb.md');
  
  if (!fs.existsSync(dbSchemaPath)) {
    addResult('Database schema file', false, 'currentdb.md not found');
    return;
  }
  
  const schemaContent = fs.readFileSync(dbSchemaPath, 'utf-8');
  
  // Check for pos_settings table and required columns
  const hasPosSettingsTable = /CREATE TABLE public\.pos_settings/.test(schemaContent);
  addResult('pos_settings table exists', hasPosSettingsTable, hasPosSettingsTable ? 'Found' : 'Missing');
  
  if (hasPosSettingsTable) {
    const requiredColumns = [
      'seller_id',
      'tax_enabled',
      'tax_rate',
      'tax_inclusive',
      'accept_cash',
      'accept_card',
      'accept_gcash',
      'barcode_scanner_enabled',
      'auto_add_on_scan',
    ];
    
    for (const col of requiredColumns) {
      const pattern = new RegExp(`pos_settings[\\s\\S]*?${col}`);
      const found = pattern.test(schemaContent);
      addResult(`DB Column: ${col}`, found, found ? 'Present' : 'Missing');
    }
  }
  
  // Check for product_variants.barcode column
  const hasBarcodeColumn = /product_variants[\s\S]*?barcode\s+text/.test(schemaContent);
  addResult('product_variants.barcode column', hasBarcodeColumn, hasBarcodeColumn ? 'Found' : 'Missing');
}

// ==============================================================================
// MAIN TEST RUNNER
// ==============================================================================
async function runTests() {
  console.log('═'.repeat(60));
  console.log('🛒 MOBILE POS FRONTEND TEST SUITE');
  console.log('═'.repeat(60));
  console.log(`📅 Date: ${new Date().toLocaleString()}`);
  console.log('─'.repeat(60));
  
  // Run all tests
  testPOSFileImports();
  testPOSStateVariables();
  testPOSUIComponents();
  testBarcodeScannerComponent();
  testQuickProductModalComponent();
  testBarcodeService();
  testPOSSettingsService();
  testPOSStyles();
  testTaxCalculationLogic();
  testPackageDependencies();
  testDatabaseSchema();
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   • ${r.name}: ${r.details}`);
    });
  }
  
  console.log('\n' + '═'.repeat(60));
  
  // Feature checklist
  console.log('📋 MOBILE POS FEATURE CHECKLIST');
  console.log('─'.repeat(60));
  
  const features = [
    { name: 'Barcode Scanner (Camera)', check: results.some(r => r.name.includes('BarcodeScanner') && r.passed) },
    { name: 'Quick Product Creation', check: results.some(r => r.name.includes('QuickProductModal') && r.passed) },
    { name: 'Payment Method Selection', check: results.some(r => r.name.includes('Payment method') && r.passed) },
    { name: 'Tax Calculations', check: results.some(r => r.name.includes('Tax') && r.passed) },
    { name: 'BIR Receipt Generation', check: results.some(r => r.name.includes('generateReceiptHTML') && r.passed) },
    { name: 'POS Settings Service', check: results.some(r => r.name.includes('getPOSSettings') && r.passed) },
    { name: 'Haptic Feedback', check: results.some(r => r.name.includes('expo-haptics') && r.passed) },
  ];
  
  features.forEach(f => {
    console.log(`${f.check ? '✅' : '❌'} ${f.name}`);
  });
  
  console.log('═'.repeat(60));
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
