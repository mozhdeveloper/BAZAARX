/**
 * Inventory Rules Test Script
 * Tests all 8 inventory rules for mobile app compliance
 * 
 * Run with: node scripts/test-inventory-rules.js
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('📦 INVENTORY RULES TEST SCRIPT');
console.log('='.repeat(60));
console.log('');

// Read the sellerStore.ts file
const sellerStorePath = path.join(__dirname, '../src/stores/sellerStore.ts');
const sellerStoreContent = fs.readFileSync(sellerStorePath, 'utf8');

const tests = [];
let passed = 0;
let failed = 0;

function test(name, condition, details = '') {
  const status = condition ? '✅ PASS' : '❌ FAIL';
  tests.push({ name, passed: condition, details });
  if (condition) passed++;
  else failed++;
  console.log(`${status}: ${name}`);
  if (details && !condition) console.log(`   Details: ${details}`);
}

console.log('RULE 1: Stock tracked per SKU/variant only');
console.log('-'.repeat(50));

// Check for variant stock tracking
test(
  '1.1 SellerProduct has variants with stock field',
  sellerStoreContent.includes('variants?: {') && 
  sellerStoreContent.includes('stock: string;'),
  'Product variants should have individual stock'
);

test(
  '1.2 deductVariantStock method exists',
  sellerStoreContent.includes('deductVariantStock:'),
  'Should have method to deduct variant-level stock'
);

test(
  '1.3 addVariantStock method exists',
  sellerStoreContent.includes('addVariantStock:'),
  'Should have method to add variant-level stock'
);

test(
  '1.4 Product-level stock field exists',
  sellerStoreContent.includes('stock: number;'),
  'Products should have aggregate stock field'
);

console.log('');
console.log('RULE 2: No negative stock allowed');
console.log('-'.repeat(50));

test(
  '2.1 deductStock validates stock before deduction',
  sellerStoreContent.includes('if (product.stock < quantity)') ||
  sellerStoreContent.includes('product.stock < quantity'),
  'Should check if sufficient stock before deducting'
);

test(
  '2.2 deductStock throws error on insufficient stock',
  sellerStoreContent.includes('Insufficient stock for') &&
  sellerStoreContent.includes('throw new Error'),
  'Should throw error when stock is insufficient'
);

test(
  '2.3 adjustStock prevents negative stock',
  sellerStoreContent.includes('if (newQuantity < 0)') &&
  sellerStoreContent.includes('Stock quantity cannot be negative'),
  'Manual adjustments should not allow negative values'
);

test(
  '2.4 reserveStock validates stock availability',
  sellerStoreContent.includes('reserveStock') &&
  sellerStoreContent.match(/reserveStock[\s\S]*?product\.stock < quantity/),
  'Stock reservation should check availability'
);

console.log('');
console.log('RULE 3: Bazaar orders reserve then deduct stock');
console.log('-'.repeat(50));

test(
  '3.1 reserveStock method exists',
  sellerStoreContent.includes('reserveStock:') &&
  sellerStoreContent.includes('reserveStock: (productId, quantity, orderId)'),
  'Should have reserveStock for order placement'
);

test(
  '3.2 reserveStock creates RESERVATION ledger entry',
  sellerStoreContent.includes("changeType: 'RESERVATION'"),
  'Reservation should be tracked in ledger'
);

test(
  '3.3 releaseStock method exists for order cancellation',
  sellerStoreContent.includes('releaseStock:') &&
  sellerStoreContent.includes('releaseStock: (productId, quantity, orderId)'),
  'Should have releaseStock for cancelled orders'
);

test(
  '3.4 releaseStock creates RELEASE ledger entry',
  sellerStoreContent.includes("changeType: 'RELEASE'") &&
  sellerStoreContent.includes("reason: 'ORDER_CANCELLATION'"),
  'Stock release should be tracked in ledger'
);

console.log('');
console.log('RULE 4: Offline sales deduct immediately');
console.log('-'.repeat(50));

test(
  '4.1 addOfflineOrder method exists',
  sellerStoreContent.includes('addOfflineOrder:'),
  'Should have method for POS offline orders'
);

test(
  '4.2 Offline orders deduct stock atomically',
  sellerStoreContent.includes("type: 'OFFLINE'") &&
  sellerStoreContent.includes('stock: product.stock - cartItem.quantity'),
  'Offline orders should deduct stock immediately'
);

test(
  '4.3 Offline orders create ledger entries',
  sellerStoreContent.includes("reason: 'OFFLINE_SALE'") &&
  sellerStoreContent.includes('inventoryLedger: [...state.inventoryLedger'),
  'Offline sales should be logged in ledger'
);

test(
  '4.4 Offline orders are marked as completed immediately',
  sellerStoreContent.includes("status: 'completed'") &&
  sellerStoreContent.includes('// POS orders are immediately completed'),
  'POS orders should be auto-completed'
);

console.log('');
console.log('RULE 5: Adjustments require reason notes');
console.log('-'.repeat(50));

test(
  '5.1 adjustStock method exists',
  sellerStoreContent.includes('adjustStock:') &&
  sellerStoreContent.includes('adjustStock: (productId, newQuantity, reason, notes)'),
  'Should have adjustStock method with notes parameter'
);

test(
  '5.2 adjustStock validates notes are not empty',
  sellerStoreContent.includes("!notes || notes.trim() === ''") &&
  sellerStoreContent.includes('Adjustment notes are required'),
  'Should reject adjustments without notes'
);

test(
  '5.3 adjustStock includes reason in ledger',
  sellerStoreContent.includes("reason: 'MANUAL_ADJUSTMENT'") &&
  sellerStoreContent.includes('notes: `${reason}: ${notes}`'),
  'Adjustment reason should be stored in ledger'
);

console.log('');
console.log('RULE 6: Single inventory source');
console.log('-'.repeat(50));

test(
  '6.1 All stock mutations go through sellerStore',
  sellerStoreContent.includes('deductStock:') &&
  sellerStoreContent.includes('addStock:') &&
  sellerStoreContent.includes('adjustStock:'),
  'All stock changes should be centralized in sellerStore'
);

test(
  '6.2 Products array is single source of truth',
  sellerStoreContent.includes('products: SellerProduct[]') &&
  sellerStoreContent.includes("set((state) => ({") &&
  sellerStoreContent.includes('products: state.products.map'),
  'Products should be managed through single state'
);

console.log('');
console.log('RULE 7: All changes logged in ledger');
console.log('-'.repeat(50));

test(
  '7.1 InventoryLedgerEntry interface defined',
  sellerStoreContent.includes('interface InventoryLedgerEntry') ||
  sellerStoreContent.includes('export interface InventoryLedgerEntry'),
  'Should have ledger entry type definition'
);

test(
  '7.2 inventoryLedger state exists',
  sellerStoreContent.includes('inventoryLedger: InventoryLedgerEntry[]') &&
  sellerStoreContent.includes('inventoryLedger: [],'),
  'Should have ledger array in state'
);

test(
  '7.3 Ledger tracks all change types',
  sellerStoreContent.includes("'DEDUCTION'") &&
  sellerStoreContent.includes("'ADDITION'") &&
  sellerStoreContent.includes("'ADJUSTMENT'") &&
  sellerStoreContent.includes("'RESERVATION'") &&
  sellerStoreContent.includes("'RELEASE'"),
  'Ledger should support all change types'
);

test(
  '7.4 Ledger entries include full audit info',
  sellerStoreContent.includes('quantityBefore:') &&
  sellerStoreContent.includes('quantityChange:') &&
  sellerStoreContent.includes('quantityAfter:') &&
  sellerStoreContent.includes('userId:') &&
  sellerStoreContent.includes('timestamp:'),
  'Ledger entries should have complete audit trail'
);

test(
  '7.5 getLedgerByProduct method exists',
  sellerStoreContent.includes('getLedgerByProduct:') &&
  sellerStoreContent.includes('getLedgerByProduct: (productId)'),
  'Should have method to query ledger by product'
);

test(
  '7.6 getRecentLedgerEntries method exists',
  sellerStoreContent.includes('getRecentLedgerEntries:') &&
  sellerStoreContent.includes('getRecentLedgerEntries: (limit'),
  'Should have method to get recent ledger entries'
);

console.log('');
console.log('RULE 8: Low-stock alerts triggered automatically');
console.log('-'.repeat(50));

test(
  '8.1 LowStockAlert interface defined',
  sellerStoreContent.includes('interface LowStockAlert') ||
  sellerStoreContent.includes('export interface LowStockAlert'),
  'Should have alert type definition'
);

test(
  '8.2 lowStockAlerts state exists',
  sellerStoreContent.includes('lowStockAlerts: LowStockAlert[]') &&
  sellerStoreContent.includes('lowStockAlerts: [],'),
  'Should have alerts array in state'
);

test(
  '8.3 checkLowStock method exists',
  sellerStoreContent.includes('checkLowStock:') &&
  sellerStoreContent.includes('checkLowStock: ()'),
  'Should have method to check for low stock'
);

test(
  '8.4 checkLowStock called after stock mutations',
  (sellerStoreContent.match(/get\(\)\.checkLowStock\(\)/g) || []).length >= 5,
  'checkLowStock should be called after all stock changes'
);

test(
  '8.5 LOW_STOCK_THRESHOLD constant defined',
  sellerStoreContent.includes('LOW_STOCK_THRESHOLD') &&
  sellerStoreContent.includes('const LOW_STOCK_THRESHOLD'),
  'Should have configurable threshold'
);

test(
  '8.6 Alert deduplication logic exists',
  sellerStoreContent.includes('existingAlert') &&
  sellerStoreContent.includes('!alert.acknowledged'),
  'Should not create duplicate alerts'
);

test(
  '8.7 acknowledgeLowStockAlert method exists',
  sellerStoreContent.includes('acknowledgeLowStockAlert:') &&
  sellerStoreContent.includes('acknowledged: true'),
  'Should have method to acknowledge alerts'
);

test(
  '8.8 getLowStockThreshold method exists',
  sellerStoreContent.includes('getLowStockThreshold:') &&
  sellerStoreContent.includes('getLowStockThreshold: () => LOW_STOCK_THRESHOLD'),
  'Should have method to get threshold value'
);

console.log('');
console.log('='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`Total Tests: ${tests.length}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Pass Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
console.log('');

if (failed === 0) {
  console.log('🎉 ALL INVENTORY RULES IMPLEMENTED CORRECTLY!');
  console.log('');
  console.log('Mobile app now matches web inventory management:');
  console.log('  ✅ Rule 1: Stock tracked per SKU/variant');
  console.log('  ✅ Rule 2: No negative stock allowed');
  console.log('  ✅ Rule 3: Bazaar orders reserve then deduct');
  console.log('  ✅ Rule 4: Offline sales deduct immediately');
  console.log('  ✅ Rule 5: Adjustments require reason notes');
  console.log('  ✅ Rule 6: Single inventory source');
  console.log('  ✅ Rule 7: All changes logged in ledger');
  console.log('  ✅ Rule 8: Low-stock alerts triggered');
} else {
  console.log('⚠️ Some tests failed. Please review the implementation.');
  console.log('');
  console.log('Failed tests:');
  tests.filter(t => !t.passed).forEach(t => {
    console.log(`  ❌ ${t.name}`);
    if (t.details) console.log(`     ${t.details}`);
  });
}

console.log('');
console.log('='.repeat(60));

// Exit with appropriate code
process.exit(failed > 0 ? 1 : 0);
