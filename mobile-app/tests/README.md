# Address Flow Tests

Complete test suite for the Add New Address feature in Checkout → Database → HomeScreen flow.

## Test Files

### 1. `MANUAL_TEST_CHECKLIST.ts` ⭐ START HERE
**Purpose:** Step-by-step manual testing checklist  
**Best for:** First-time testing, verifying UI/UX works correctly  

**How to use:**
1. Open the file
2. Follow each checkbox item in order
3. Test in the actual mobile app
4. Check off items as you complete them
5. Note any issues in the NOTES sections

**What it tests:**
- ✅ Add New Address form opens correctly
- ✅ Map search and pin location works
- ✅ Address saves to database
- ✅ Address displays in Checkout
- ✅ Address displays on HomeScreen
- ✅ Multiple addresses can be managed
- ✅ Validation prevents bad data

---

### 2. `quick-address-test.ts`
**Purpose:** Automated database connection test  
**Best for:** Quickly verifying database integration works  

**How to run:**
```bash
# 1. Update TEST_USER_ID in the file with your user ID
# 2. Run via ts-node or integrate into your app

npm install -g ts-node  # if not installed
ts-node tests/quick-address-test.ts
```

**What it tests:**
- ✅ Create address in database
- ✅ Verify all fields saved correctly
- ✅ AsyncStorage sync works
- ✅ Retrieve address from database
- ✅ HomeScreen display format
- ✅ Update address

**Output:**
```
📊 TEST RESULTS SUMMARY
==============================================
✅ Passed: 6/6
❌ Failed: 0/6

🎉 ALL TESTS PASSED! Address flow is working correctly.
```

---

### 3. `address-integration.test.ts`
**Purpose:** Full integration test suite (Jest/Vitest compatible)  
**Best for:** CI/CD pipeline, regression testing  

**How to run:**
```bash
# Using Jest
npm run test tests/address-integration.test.ts

# Using Vitest
npm run test:vitest
```

**What it tests:**
- All tests from quick-address-test.ts
- Metro Manila edge cases (no province required)
- Non-Metro Manila validation (province required)
- Multiple addresses with default switching
- Database schema validation
- address_line_1 parsing

---

### 4. `address-flow-test.md`
**Purpose:** Comprehensive test documentation  
**Best for:** QA team, detailed test planning, bug reports  

**Contents:**
- 11 detailed test cases
- Expected results for each step
- Database schema validation
- Edge cases and error scenarios
- Debug logs to watch
- Cleanup procedures

---

## Quick Start Guide

### For Developers (First Time)
1. ✅ **Manual Test First** - Use `MANUAL_TEST_CHECKLIST.ts`
   - Open in VS Code
   - Follow the checklist step-by-step
   - Test the actual app on iOS/Android
   - Takes ~15 minutes

2. ✅ **Database Test** - Run `quick-address-test.ts`
   - Update TEST_USER_ID
   - Run script to verify DB connection
   - Takes ~30 seconds

3. ✅ **Full Integration** - Run `address-integration.test.ts` (optional)
   - For comprehensive coverage
   - Takes ~2 minutes

### For QA Team
1. Use `MANUAL_TEST_CHECKLIST.ts` for manual testing
2. Reference `address-flow-test.md` for detailed test cases
3. Report issues with:
   - Which test case failed
   - Expected vs actual result
   - Console logs
   - Screenshots

### For CI/CD
```yaml
# GitHub Actions example
- name: Run Address Integration Tests
  run: npm run test tests/address-integration.test.ts
```

---

## Test Coverage

| Feature | Manual | Quick | Integration |
|---------|--------|-------|-------------|
| Create Address | ✅ | ✅ | ✅ |
| Map Search & Pin | ✅ | ❌ | ❌ |
| Save to Database | ✅ | ✅ | ✅ |
| AsyncStorage Sync | ✅ | ✅ | ✅ |
| HomeScreen Display | ✅ | ✅ | ✅ |
| Metro Manila Support | ✅ | ❌ | ✅ |
| Multiple Addresses | ✅ | ❌ | ✅ |
| Validation | ✅ | ❌ | ✅ |
| Update Address | ❌ | ✅ | ✅ |
| Delete Address | ❌ | ✅ | ✅ |

---

## Common Issues & Solutions

### ❌ "Supabase not configured"
**Solution:** Check `src/lib/supabase.ts` is properly configured with your project URL and anon key.

### ❌ "No rows found" when creating address
**Solution:** 
- Verify `shipping_addresses` table exists in Supabase
- Check RLS policies allow INSERT for authenticated users
- Verify TEST_USER_ID is valid

### ❌ AsyncStorage fails to save
**Solution:**
- Check permissions in `AndroidManifest.xml` / `Info.plist`
- Clear AsyncStorage and retry: `await AsyncStorage.clear()`

### ❌ HomeScreen doesn't update
**Solution:**
- Check `useFocusEffect` is imported from `@react-navigation/native`
- Verify AsyncStorage keys match:
  - `currentDeliveryAddress`
  - `currentDeliveryCoordinates`
  - `currentLocationDetails`

### ❌ Map search returns no results
**Solution:**
- Check internet connection
- Nominatim has rate limits (1 request/second)
- Search query must include location name

---

## Database Schema Verification

After running tests, verify in Supabase:

```sql
-- Check address was created
SELECT * FROM shipping_addresses 
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 1;

-- Expected result:
{
  id: "uuid",
  user_id: "your-user-id",
  label: "Home",
  address_line_1: "FirstName LastName, +639XXXXXXXXX, Street Address",
  barangay: "Barangay Name",
  city: "City Name",
  province: "" or "Province Name",
  region: "Region Name",
  postal_code: "XXXX",
  coordinates: {"latitude": X.XXXXX, "longitude": X.XXXXX},
  is_default: true/false,
  address_type: "residential",
  created_at: "timestamp",
  updated_at: "timestamp"
}
```

---

## Success Metrics

All tests should pass with:
- ✅ Address saves to `shipping_addresses` table
- ✅ Coordinates stored as JSONB object
- ✅ AsyncStorage contains 3 keys (address, coordinates, details)
- ✅ HomeScreen displays `"Street, City"` format
- ✅ Checkout shows full address with name and phone
- ✅ Can add multiple addresses
- ✅ Can switch default address
- ✅ Metro Manila works without province
- ✅ Other regions require province

---

## Test Data Cleanup

After testing, clean up test data:

```sql
-- Delete test addresses
DELETE FROM shipping_addresses 
WHERE label LIKE '%Test%' 
OR city = 'Test City';
```

```javascript
// Clear AsyncStorage
await AsyncStorage.multiRemove([
  'currentDeliveryAddress',
  'currentDeliveryCoordinates', 
  'currentLocationDetails'
]);
```

---

## Contributing

When adding new address features:
1. Update `MANUAL_TEST_CHECKLIST.ts` with new test steps
2. Add integration tests to `address-integration.test.ts`
3. Document in `address-flow-test.md`
4. Ensure all tests pass before PR

---

## Questions?

- **UI Issues:** Check `MANUAL_TEST_CHECKLIST.ts`
- **Database Issues:** Run `quick-address-test.ts`
- **Integration Issues:** Check `address-integration.test.ts`
- **Detailed Steps:** See `address-flow-test.md`
