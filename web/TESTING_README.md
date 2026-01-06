# POS & Order Flow - Automated Test Suite

## Overview

Comprehensive automated test suite for validating the complete POS Lite and order flow functionality, including inventory management, stock tracking, and audit trail.

## Test Coverage

### 1. Product Store - Inventory Management
- ✅ Product availability validation
- ✅ Negative stock prevention
- ✅ Stock deduction with ledger entries
- ✅ Stock addition with ledger entries
- ✅ Manual stock adjustment with mandatory notes
- ✅ Low stock alert system

### 2. POS Lite - Offline Order Creation
- ✅ Offline order creation
- ✅ Stock deduction for all items
- ✅ Ledger entry creation per item
- ✅ Insufficient stock prevention
- ✅ Multi-item order handling

### 3. Order Store - Order Management
- ✅ Order retrieval by status
- ✅ Order status updates
- ✅ POS vs Online order tracking

### 4. Inventory Ledger - Audit Trail
- ✅ Immutable ledger maintenance
- ✅ Required field validation
- ✅ Product-specific ledger queries
- ✅ Recent entries queries

### 5. End-to-End POS Flow
- ✅ Complete transaction flow
- ✅ Cart → Order → Stock → Ledger chain

### 6. Data Integrity & Validation
- ✅ Cross-store data consistency
- ✅ Order total calculations
- ✅ Non-negative stock levels
- ✅ Ledger math correctness

## Running Tests

### Run All Tests
```bash
npm run test
```

### Run Tests in Watch Mode
```bash
npm run test
```

### Run Tests Once
```bash
npm run test:run
```

### Run POS-Specific Tests
```bash
npm run test:pos
```

### Run Tests with UI
```bash
npm run test:ui
```

## Test Output

The test suite provides detailed console output including:

- ✅ Pass/fail status for each test
- 📊 Test summary report with:
  - Product inventory status
  - Order counts by type
  - Ledger entry statistics
  - Low stock alerts
- 🎉 End-to-end flow verification

### Sample Output

```
🧪 Test Setup: Product prod-123 with stock 50

✅ Found 24 products in store
✅ Negative stock prevention working
✅ Stock deducted: 50 → 45
✅ Ledger entry created: ledger-1736234567890-abc123
✅ Stock added: 45 → 65
✅ Stock adjusted to 15 with notes
✅ Low stock alert created for stock level 8

🎉 END-TO-END FLOW COMPLETE:
   ✅ Order ID: POS-1736234567-xyz789
   ✅ Items sold: 2
   ✅ Total amount: ₱2,598
   ✅ Stock deducted for all items
   ✅ Sales counters updated
   ✅ Ledger entries created: 2
   ✅ Order status: delivered
   ✅ Payment status: paid

═══════════════════════════════════════════════════════════════
📊 TEST SUMMARY REPORT
═══════════════════════════════════════════════════════════════

📦 PRODUCTS:
   Total Products:        24
   In Stock:              22
   Low Stock (<10):       3
   Out of Stock:          2

🛒 ORDERS:
   Total Orders:          15
   Offline (POS):         8
   Online:                7
   Delivered:             12
   Pending:               3

📋 INVENTORY LEDGER:
   Total Entries:         45
   Deductions:            28
   Additions:             12
   Adjustments:           5
   Low Stock Alerts:      3
   Active Alerts:         2

═══════════════════════════════════════════════════════════════
✅ ALL TESTS COMPLETED SUCCESSFULLY
═══════════════════════════════════════════════════════════════
```

## Test Files

- **pos-order-flow.test.ts** - Main test suite
- **setup.ts** - Test environment configuration

## Configuration

- **vitest.config.ts** - Vitest configuration
- Uses `happy-dom` for DOM environment
- Includes global test utilities
- Path alias support (`@/` → `src/`)

## Writing New Tests

To add new tests, follow this structure:

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  it('should do something', () => {
    const store = useProductStore.getState();
    
    // Perform action
    store.deductStock(productId, quantity, 'OFFLINE_SALE', 'ORDER-123');
    
    // Assert result
    expect(updatedProduct.stock).toBe(expectedStock);
  });

  afterEach(() => {
    // Cleanup after each test
  });
});
```

## Continuous Integration

Tests can be integrated into CI/CD pipeline:

```yaml
- name: Run Tests
  run: npm run test:run
```

## Troubleshooting

### Tests Failing
1. Check if stores are properly initialized
2. Verify test product has sufficient stock
3. Clear localStorage between test runs

### Import Errors
1. Ensure path aliases are configured in `vitest.config.ts`
2. Check TypeScript configuration
3. Verify all dependencies are installed

## Best Practices

1. **Isolation** - Each test should be independent
2. **Cleanup** - Reset state after each test
3. **Assertions** - Use specific, meaningful assertions
4. **Coverage** - Test happy path and edge cases
5. **Documentation** - Add console logs for debugging

## Next Steps

- Add UI component tests
- Add API integration tests
- Add performance benchmarks
- Add visual regression tests
