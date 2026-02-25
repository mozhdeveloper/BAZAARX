# Test Scripts

This directory contains TypeScript test scripts for the BazaarPH platform.

## POS Advanced Features Tests

### test-pos-features.ts
**Purpose:** Unit and integration tests for all POS business logic  
**Run:** `npm run test:pos`  
**Dependencies:** None (no database required)  
**Tests:** 19 tests covering tax, cash drawer, payments, barcodes, staff, branches, receipts, settings, and edge cases  
**Status:** ✅ All tests passing (100% success rate)

### test-pos-settings-db.ts
**Purpose:** Database integration tests for POS settings CRUD operations  
**Run:** `npm run test:pos-db`  
**Dependencies:** Supabase connection (requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)  
**Tests:** Connection, table creation, CRUD operations  
**Status:** ⚠️ Requires Supabase setup first

## Other Test Scripts

- `test-qa-system.ts` - QA system integration tests
- `test-messages.ts` - Messaging system tests
- `test-buyer-process.ts` - Buyer flow tests
- `test-seller-complete-flow.ts` - Seller workflow tests
- `test-e2e-buyer-seller.ts` - E2E buyer-seller interaction tests
- `test-address-system.ts` - Address management tests

## Running Tests

```bash
cd web

# Run POS unit tests (no database needed)
npm run test:pos

# Run POS database integration tests (needs Supabase)
npm run test:pos-db

# Run other test suites
npm run test:qa-integration
npm run test:messages
npm run test:buyer
npm run test:seller-flow
npm run test:e2e
npm run test:address
```

## Documentation

For detailed test documentation, see:
- [POS_TEST_SUITE_DOCUMENTATION.md](../POS_TEST_SUITE_DOCUMENTATION.md)
- [POS_ADVANCED_FEATURES_DOCUMENTATION.md](../POS_ADVANCED_FEATURES_DOCUMENTATION.md)
