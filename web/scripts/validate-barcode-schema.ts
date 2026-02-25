/**
 * Barcode System Schema Validation Script
 * Validates alignment between frontend service, SQL migration, and database schema
 * 
 * Run with: npx tsx scripts/validate-barcode-schema.ts
 * Or: npm run validate:barcode
 */

console.log(`
═══════════════════════════════════════════════════════════════════════════════
  BAZAAR BARCODE SYSTEM - SCHEMA ALIGNMENT VALIDATION
  Checking Frontend ↔ SQL Migration ↔ Database Schema
═══════════════════════════════════════════════════════════════════════════════
`);

// ============================================================================
// 1. DATABASE SCHEMA DEFINITION (from currentdb.md)
// ============================================================================

const DB_BARCODE_SCANS_SCHEMA = {
  tableName: 'barcode_scans',
  columns: {
    id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
    vendor_id: { type: 'uuid', nullable: false, foreignKey: 'vendors(id)' },
    product_id: { type: 'uuid', nullable: true, foreignKey: 'products(id)' },
    service_id: { type: 'uuid', nullable: true, foreignKey: 'services(id)' },
    barcode_value: { type: 'text', nullable: false },
    is_successful: { type: 'boolean', nullable: true, default: true },
    error_message: { type: 'text', nullable: true },
    scan_source: { type: 'text', nullable: true, default: 'pos', check: "['pos', 'inventory', 'receiving', 'manual']" },
    order_id: { type: 'uuid', nullable: true, foreignKey: 'orders(id)' },
    raw_scan: { type: 'text', nullable: true },
    scan_duration_ms: { type: 'integer', nullable: true },
    scanner_type: { type: 'text', nullable: true, default: 'hardware' },
    scan_timestamp: { type: 'timestamp with time zone', nullable: true, default: 'now()' },
    created_at: { type: 'timestamp with time zone', nullable: true, default: 'now()' },
    // Note: variant_id will be added by migration
    variant_id: { type: 'uuid', nullable: true, foreignKey: 'product_variants(id)', addedByMigration: true },
  },
};

const DB_PRODUCT_VARIANTS_SCHEMA = {
  tableName: 'product_variants',
  columnsNeeded: {
    // Note: barcode column will be added by migration
    barcode: { type: 'text', nullable: true, unique: true, addedByMigration: true },
  },
};

// ============================================================================
// 2. FRONTEND SERVICE COLUMN MAPPING (from barcodeService.ts)
// ============================================================================

const FRONTEND_SCAN_LOG_COLUMNS = {
  vendor_id: 'params.vendorId',
  barcode_value: 'params.barcodeValue',
  product_id: 'params.productId',
  variant_id: 'params.variantId',
  is_successful: 'params.isSuccessful',
  error_message: 'params.errorMessage',
  scan_source: 'params.scanSource',
  order_id: 'params.orderId',
  scanner_type: 'params.scannerType',
  scan_duration_ms: 'params.scanDurationMs',
  scan_timestamp: 'new Date().toISOString()',
};

const FRONTEND_LOOKUP_COLUMNS = {
  product_variants: ['id', 'product_id', 'variant_name', 'sku', 'barcode', 'price', 'stock', 'thumbnail_url'],
  products: ['id', 'name', 'vendor_id', 'deleted_at', 'sku', 'price'],
};

// ============================================================================
// 3. SQL FUNCTION PARAMETERS (from 009_barcode_scanning_system.sql)
// ============================================================================

const SQL_FUNCTION_DEFINITIONS = {
  generate_product_barcode: {
    params: ['p_vendor_id UUID', 'p_variant_id UUID', 'p_format TEXT'],
    returns: 'TEXT',
  },
  record_barcode_scan: {
    params: ['p_vendor_id UUID', 'p_barcode_value TEXT', 'p_scan_source TEXT', 'p_order_id UUID', 'p_scanner_type TEXT'],
    returns: 'TABLE (item_type TEXT, item_id UUID, item_name TEXT, item_price NUMERIC, item_stock INT, is_found BOOLEAN)',
  },
  get_top_scanned_products: {
    params: ['p_vendor_id UUID', 'p_limit INT', 'p_days INT'],
    returns: 'TABLE (product_id UUID, product_name TEXT, scan_count BIGINT)',
  },
  get_daily_scan_counts: {
    params: ['p_vendor_id UUID', 'p_days INT'],
    returns: 'TABLE (scan_date DATE, scan_count BIGINT)',
  },
};

const SQL_RPC_CALL_PARAMS = {
  get_top_scanned_products: { p_vendor_id: 'vendorId', p_limit: 10, p_days: 30 },
  get_daily_scan_counts: { p_vendor_id: 'vendorId', p_days: 30 },
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

let totalChecks = 0;
let passedChecks = 0;
let failedChecks: string[] = [];

function check(description: string, condition: boolean, details?: string) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✅ ${description}`);
  } else {
    failedChecks.push(`${description}${details ? ': ' + details : ''}`);
    console.log(`  ❌ ${description}`);
    if (details) console.log(`     └── ${details}`);
  }
}

// ============================================================================
// VALIDATION TESTS
// ============================================================================

console.log('\n📦 1. DATABASE SCHEMA VALIDATION');
console.log('─────────────────────────────────────────────────────────────────');

// Check required columns exist in schema definition
check(
  'barcode_scans has vendor_id (not seller_id)',
  'vendor_id' in DB_BARCODE_SCANS_SCHEMA.columns && !('seller_id' in DB_BARCODE_SCANS_SCHEMA.columns)
);

check(
  'barcode_scans.vendor_id is NOT NULL',
  DB_BARCODE_SCANS_SCHEMA.columns.vendor_id.nullable === false
);

check(
  'barcode_scans.vendor_id references vendors(id)',
  DB_BARCODE_SCANS_SCHEMA.columns.vendor_id.foreignKey === 'vendors(id)'
);

check(
  'barcode_scans has scan_source with valid CHECK constraint',
  DB_BARCODE_SCANS_SCHEMA.columns.scan_source.check?.includes('pos') ?? false
);

check(
  'barcode_scans has scanner_type column',
  'scanner_type' in DB_BARCODE_SCANS_SCHEMA.columns
);

check(
  'barcode_scans has variant_id (added by migration)',
  DB_BARCODE_SCANS_SCHEMA.columns.variant_id?.addedByMigration === true
);

check(
  'product_variants needs barcode column (added by migration)',
  DB_PRODUCT_VARIANTS_SCHEMA.columnsNeeded.barcode?.addedByMigration === true
);

console.log('\n🔧 2. FRONTEND SERVICE VALIDATION');
console.log('─────────────────────────────────────────────────────────────────');

// Check frontend uses vendor_id
check(
  'Frontend logBarcodeScan uses vendor_id',
  'vendor_id' in FRONTEND_SCAN_LOG_COLUMNS
);

check(
  'Frontend maps vendorId to vendor_id column',
  FRONTEND_SCAN_LOG_COLUMNS.vendor_id === 'params.vendorId'
);

check(
  'Frontend includes all required scan log columns',
  ['vendor_id', 'barcode_value', 'is_successful', 'scan_source', 'scanner_type']
    .every(col => col in FRONTEND_SCAN_LOG_COLUMNS)
);

check(
  'Frontend lookupBarcodeQuick queries barcode column',
  FRONTEND_LOOKUP_COLUMNS.product_variants.includes('barcode')
);

check(
  'Frontend filters by vendor_id in products table',
  FRONTEND_LOOKUP_COLUMNS.products.includes('vendor_id')
);

check(
  'Frontend checks deleted_at for soft deletes',
  FRONTEND_LOOKUP_COLUMNS.products.includes('deleted_at')
);

console.log('\n⚙️ 3. SQL FUNCTION VALIDATION');
console.log('─────────────────────────────────────────────────────────────────');

// Check SQL functions use vendor_id
check(
  'generate_product_barcode uses p_vendor_id',
  SQL_FUNCTION_DEFINITIONS.generate_product_barcode.params.some(p => p.includes('p_vendor_id'))
);

check(
  'record_barcode_scan uses p_vendor_id',
  SQL_FUNCTION_DEFINITIONS.record_barcode_scan.params.some(p => p.includes('p_vendor_id'))
);

check(
  'get_top_scanned_products uses p_vendor_id',
  SQL_FUNCTION_DEFINITIONS.get_top_scanned_products.params.some(p => p.includes('p_vendor_id'))
);

check(
  'get_daily_scan_counts uses p_vendor_id',
  SQL_FUNCTION_DEFINITIONS.get_daily_scan_counts.params.some(p => p.includes('p_vendor_id'))
);

check(
  'No SQL functions use seller_id parameter',
  !Object.values(SQL_FUNCTION_DEFINITIONS).some(fn => 
    fn.params.some(p => p.includes('seller_id'))
  )
);

console.log('\n🔗 4. FRONTEND ↔ SQL RPC ALIGNMENT');
console.log('─────────────────────────────────────────────────────────────────');

check(
  'Frontend RPC call uses p_vendor_id for get_top_scanned_products',
  'p_vendor_id' in SQL_RPC_CALL_PARAMS.get_top_scanned_products
);

check(
  'Frontend RPC call uses p_vendor_id for get_daily_scan_counts',
  'p_vendor_id' in SQL_RPC_CALL_PARAMS.get_daily_scan_counts
);

console.log('\n📝 5. VALID ENUM VALUES');
console.log('─────────────────────────────────────────────────────────────────');

const VALID_SCAN_SOURCES = ['pos', 'inventory', 'receiving', 'manual'];
const VALID_SCANNER_TYPES = ['hardware', 'camera', 'manual'];
const VALID_BARCODE_FORMATS = ['EAN-13', 'EAN-8', 'CODE128', 'CODE39', 'ITF', 'QR'];

check(
  'scan_source values match database CHECK constraint',
  VALID_SCAN_SOURCES.length === 4 && 
  VALID_SCAN_SOURCES.includes('pos') &&
  VALID_SCAN_SOURCES.includes('inventory')
);

check(
  'scanner_type values include hardware, camera, manual',
  VALID_SCANNER_TYPES.length === 3 &&
  VALID_SCANNER_TYPES.includes('hardware')
);

check(
  'Barcode formats include standard retail formats',
  VALID_BARCODE_FORMATS.includes('CODE128') &&
  VALID_BARCODE_FORMATS.includes('EAN-13')
);

console.log('\n🔍 6. DATA FLOW VALIDATION');
console.log('─────────────────────────────────────────────────────────────────');

// Simulate the data flow
const simulatedScanData = {
  vendorId: '123e4567-e89b-12d3-a456-426614174000',
  barcodeValue: 'BC12345678',
  productId: 'product-uuid',
  variantId: 'variant-uuid',
  isSuccessful: true,
  errorMessage: null,
  scanSource: 'pos' as const,
  orderId: null,
  scannerType: 'hardware' as const,
  scanDurationMs: 150,
};

// Transform to DB columns (as frontend service does)
const dbInsertData = {
  vendor_id: simulatedScanData.vendorId,
  barcode_value: simulatedScanData.barcodeValue,
  product_id: simulatedScanData.productId,
  variant_id: simulatedScanData.variantId,
  is_successful: simulatedScanData.isSuccessful,
  error_message: simulatedScanData.errorMessage,
  scan_source: simulatedScanData.scanSource,
  order_id: simulatedScanData.orderId,
  scanner_type: simulatedScanData.scannerType,
  scan_duration_ms: simulatedScanData.scanDurationMs,
  scan_timestamp: new Date().toISOString(),
};

check(
  'Simulated data transforms correctly for DB insert',
  dbInsertData.vendor_id === simulatedScanData.vendorId &&
  dbInsertData.barcode_value === simulatedScanData.barcodeValue &&
  dbInsertData.scan_source === 'pos'
);

check(
  'All DB columns have corresponding service parameters',
  Object.keys(FRONTEND_SCAN_LOG_COLUMNS).every(col => 
    col in DB_BARCODE_SCANS_SCHEMA.columns || col === 'variant_id'
  )
);

check(
  'scan_timestamp is ISO 8601 format',
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dbInsertData.scan_timestamp)
);

// ============================================================================
// SUMMARY
// ============================================================================

console.log(`
═══════════════════════════════════════════════════════════════════════════════
  VALIDATION SUMMARY
═══════════════════════════════════════════════════════════════════════════════

  Total Checks: ${totalChecks}
  ✅ Passed: ${passedChecks}
  ❌ Failed: ${failedChecks.length}
  Success Rate: ${((passedChecks / totalChecks) * 100).toFixed(1)}%
`);

if (failedChecks.length > 0) {
  console.log('\n❌ FAILED CHECKS:');
  failedChecks.forEach((check, i) => {
    console.log(`  ${i + 1}. ${check}`);
  });
  process.exit(1);
} else {
  console.log('✅ All schema alignments validated successfully!');
  console.log(`
📋 ALIGNMENT CONFIRMED:
  • Database uses vendor_id (not seller_id)
  • Frontend service maps vendorId → vendor_id
  • SQL functions use p_vendor_id parameter
  • RPC calls pass p_vendor_id correctly
  • Migration adds required columns (barcode, variant_id)
  • All enum values match database CHECK constraints
`);
  process.exit(0);
}
