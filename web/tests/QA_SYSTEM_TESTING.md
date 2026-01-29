# QA System Testing Guide

Complete testing suite for the Product QA workflow system, including frontend state management and Supabase database integration.

## 🎯 Test Coverage

### 1. **Database Schema Tests**
- ✅ `product_qa` table structure
- ✅ Column validation
- ✅ Status enum constraints
- ✅ Index performance
- ✅ Foreign key relationships

### 2. **QA Entry Creation**
- ✅ Create product and QA entry
- ✅ Initial status validation
- ✅ JOIN queries with products table
- ✅ Seller ID filtering

### 3. **Complete Workflow Tests**
- ✅ Digital Review → Approve for Sample
- ✅ Seller Submits Sample with Logistics
- ✅ Quality Review → Active Verified
- ✅ Database sync validation
- ✅ Timestamp tracking

### 4. **Rejection Flow Tests**
- ✅ Reject at digital stage
- ✅ Reject at physical stage
- ✅ Rejection reason storage
- ✅ Product approval status sync

### 5. **Revision Request Tests**
- ✅ Request revision with feedback
- ✅ Revision stage tracking
- ✅ Timestamp management

### 6. **Query & Filter Tests**
- ✅ Filter by QA status
- ✅ Filter by seller ID
- ✅ Order by created date
- ✅ Count by status

### 7. **Performance Tests**
- ✅ Query response time < 1s
- ✅ Complex JOIN queries < 1.5s
- ✅ Batch operations

## 🚀 Running Tests

### Prerequisites
```bash
# Ensure environment variables are set
cp .env.example .env
# Add your Supabase credentials:
# VITE_SUPABASE_URL=your_url
# VITE_SUPABASE_ANON_KEY=your_key
```

### Run All QA Tests
```bash
# Unit tests with Vitest
npm run test:qa

# Integration tests with Supabase
npm run test:qa-integration

# Run both
npm run test:qa-full
```

### Run Specific Test Suites
```bash
# Database schema only
vitest run qa-system-integration -t "Database Schema"

# Workflow tests only
vitest run qa-system-integration -t "QA Workflow"

# Performance tests only
vitest run qa-system-integration -t "Performance"
```

## 📋 Test Categories

### Unit Tests (`qa-system-integration.test.ts`)
Uses Vitest framework with Supabase client for database validation:
- Database schema validation
- CRUD operations
- Status transitions
- Data integrity

### Integration Tests (`test-qa-system.ts`)
Standalone TypeScript script that tests:
- Real database operations
- Complete workflows
- Error handling
- Performance benchmarks

## 🔍 What Each Test Validates

### Database Schema
```typescript
✓ product_qa table exists
✓ Correct columns (id, product_id, status, etc.)
✓ Status enum constraint enforced
✓ Indexes work correctly
```

### Create QA Entry
```typescript
✓ Product creation
✓ QA entry creation with PENDING_DIGITAL_REVIEW
✓ JOIN with products table returns complete data
✓ Timestamps populated correctly
```

### Complete Workflow
```typescript
✓ PENDING_DIGITAL_REVIEW → WAITING_FOR_SAMPLE (Digital Approved)
✓ WAITING_FOR_SAMPLE → IN_QUALITY_REVIEW (Sample Submitted)
✓ IN_QUALITY_REVIEW → ACTIVE_VERIFIED (Quality Passed)
✓ Product approval_status syncs to 'approved'
```

### Rejection Flow
```typescript
✓ Set status to REJECTED
✓ Store rejection_reason
✓ Track rejection_stage (digital/physical)
✓ Update rejected_at timestamp
✓ Sync to products.approval_status = 'rejected'
```

### Revision Request
```typescript
✓ Set status to FOR_REVISION
✓ Store revision feedback
✓ Track revision_requested_at
✓ Keep products.approval_status = 'pending'
```

## 📊 Expected Output

### Successful Run
```
🚀 Starting QA System Integration Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Testing Database Schema...
  ✓ product_qa table exists (45ms)
  ✓ product_qa has correct columns (32ms)
  ✓ product_qa status constraint works (28ms)
  ✓ product_qa indexes exist (41ms)

📝 Testing QA Entry Creation...
  ✓ Create test product (156ms)
  ✓ Create QA entry for product (89ms)
  ✓ Fetch QA entry with product JOIN (67ms)

🔄 Testing QA Workflow Transitions...
  ✓ Setup workflow test product (142ms)
  ✓ Admin approves digital review (98ms)
  ✓ Seller submits sample (87ms)
  ✓ Admin passes quality check (134ms)

❌ Testing Rejection Flow...
  ✓ Setup rejection test product (138ms)
  ✓ Reject at digital stage (91ms)

🔄 Testing Revision Request Flow...
  ✓ Setup revision test product (145ms)
  ✓ Request revision with feedback (86ms)

🔍 Testing Filtering & Queries...
  ✓ Filter by status - PENDING_DIGITAL_REVIEW (54ms)
  ✓ Filter by seller ID via JOIN (62ms)
  ✓ Order by created_at DESC (48ms)
  ✓ Count products by status (39ms)

⚡ Testing Performance...
  ✓ Fetch all QA entries < 1s (234ms)
  ✓ Complex JOIN query < 1.5s (567ms)

🧹 Cleaning up test data...
  Deleted test product: abc123...
  Deleted test product: def456...

============================================================
📊 TEST SUMMARY
============================================================

Total Tests: 23
Passed: 23
Failed: 0
Total Duration: 2456ms
Success Rate: 100.0%

============================================================
```

## 🐛 Troubleshooting

### Missing Supabase Credentials
```
Error: Missing Supabase credentials in .env file
```
**Solution:** Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env`

### Table Not Found
```
Error: product_qa table error: relation "product_qa" does not exist
```
**Solution:** Run migrations: `supabase db push` or check database setup

### Permission Denied
```
Error: new row violates row-level security policy
```
**Solution:** Ensure RLS policies allow anon key to insert/update for testing

### Tests Timing Out
```
Error: Query too slow: 2500ms
```
**Solution:** Check database indexes and connection speed

## 🔐 Security Notes

- Tests use **anon key** for authentication
- Test data is automatically cleaned up
- No sensitive data should be in test fixtures
- RLS policies may need temporary adjustment for tests

## 📈 Performance Benchmarks

| Operation | Target | Typical |
|-----------|--------|---------|
| Simple SELECT | < 100ms | ~50ms |
| JOIN Query | < 200ms | ~120ms |
| INSERT | < 150ms | ~90ms |
| UPDATE | < 150ms | ~85ms |
| Batch (5 items) | < 500ms | ~350ms |

## 🔄 CI/CD Integration

Add to GitHub Actions workflow:
```yaml
- name: Run QA System Tests
  run: |
    npm install
    npm run test:qa-full
  env:
    VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

## 📝 Adding New Tests

### Unit Test (Vitest)
```typescript
// In qa-system-integration.test.ts
it('should validate new feature', async () => {
  if (!isSupabaseConfigured()) return;
  
  // Your test logic
  const { data, error } = await supabase...
  
  expect(error).toBeNull();
  expect(data).toBeDefined();
});
```

### Integration Test (TypeScript)
```typescript
// In test-qa-system.ts
async testNewFeature() {
  this.log('\n🎯 Testing New Feature...', 'cyan');
  
  await this.runTest('Test case name', async () => {
    // Your test logic
    const result = await this.supabase...
    
    if (!result) throw new Error('Test failed');
  });
}
```

## 🎓 Best Practices

1. **Always clean up test data** - Use `afterAll` or cleanup methods
2. **Use unique identifiers** - Add timestamps to avoid conflicts
3. **Test both success and failure** - Cover edge cases
4. **Validate database state** - Don't just check API responses
5. **Performance matters** - Set reasonable time limits
6. **Document assumptions** - Comment why tests exist

## 📚 Related Documentation

- [QA Workflow Guide](../PRODUCT_QA_FLOW_COMPLETE.md)
- [Database Schema](../supabase-migrations/001_initial_schema.sql)
- [QA Service API](../src/services/qaService.ts)
- [Admin QA Page](../src/pages/AdminProductApprovals.tsx)
- [Seller QA Page](../src/pages/SellerProductStatus.tsx)
