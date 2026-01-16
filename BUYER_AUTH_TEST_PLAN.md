# Buyer Authentication Migration - Test Plan

## Test Scenarios

### 1. New Buyer Signup

**Steps:**

1. Navigate to shop page
2. Click "Sign In" button
3. Switch to "Sign Up" tab
4. Fill in:
   - Full Name: "Test Buyer"
   - Email: "testbuyer@example.com"
   - Password: "password123"
   - Confirm Password: "password123"
5. Click "Create Account"

**Expected Results:**

- ✅ Success screen appears with "Welcome!" message
- ✅ User is redirected to shop page
- ✅ User ID is stored in session
- ✅ Database check: `buyers` table has new record with user ID
- ✅ Database check: `profiles` table has new record with role='buyer'

**SQL Verification:**

```sql
SELECT * FROM buyers WHERE email = 'testbuyer@example.com';
SELECT * FROM profiles WHERE email = 'testbuyer@example.com';
SELECT * FROM auth.users WHERE email = 'testbuyer@example.com';
```

---

### 2. Buyer Login (Existing Account)

**Steps:**

1. Sign out (if logged in)
2. Click "Sign In" button
3. Fill in:
   - Email: "testbuyer@example.com"
   - Password: "password123"
4. Click "Sign In"

**Expected Results:**

- ✅ Success screen appears
- ✅ User is authenticated
- ✅ User is redirected to shop page
- ✅ No duplicate key errors

---

### 3. Invalid Login Credentials

**Steps:**

1. Click "Sign In"
2. Fill in:
   - Email: "wrong@example.com"
   - Password: "wrongpassword"
3. Click "Sign In"

**Expected Results:**

- ✅ Error message: "Invalid email or password"
- ✅ User remains on login screen
- ✅ No authentication session created

---

### 4. Seller Attempting Buyer Login

**Steps:**

1. Create a seller account (if not exists)
2. Try to log in as buyer with seller credentials

**Expected Results:**

- ✅ Error message: "This account is not registered as a buyer"
- ✅ User is automatically signed out
- ✅ Buyer features remain inaccessible

**Test with SQL:**

```sql
-- Create a seller account
INSERT INTO sellers (id, business_name, email)
VALUES ('test-seller-uuid', 'Test Shop', 'seller@example.com');

-- Try logging in as buyer with this account
-- Should fail role verification
```

---

### 5. Password Validation

**Steps:**

1. Try to sign up with password: "12345" (too short)

**Expected Results:**

- ✅ Error message: "Password must be at least 6 characters"
- ✅ Account not created

---

### 6. Password Mismatch

**Steps:**

1. Fill signup form
2. Password: "password123"
3. Confirm Password: "password456"
4. Submit

**Expected Results:**

- ✅ Error message: "Passwords do not match"
- ✅ Account not created

---

### 7. Duplicate Email Signup

**Steps:**

1. Sign up with email: "testbuyer@example.com"
2. Try to sign up again with same email

**Expected Results:**

- ✅ Supabase error: Email already registered
- ✅ No duplicate key errors (handled by upsert)

---

### 8. Full Name Required

**Steps:**

1. Fill signup form but leave "Full Name" empty
2. Submit

**Expected Results:**

- ✅ Error message: "Full name is required"
- ✅ Account not created

---

### 9. Guest Checkout

**Steps:**

1. Click "Continue as Guest" button

**Expected Results:**

- ✅ Modal closes
- ✅ User can browse shop
- ✅ Cart functionality available
- ✅ No authentication session created

---

### 10. Session Persistence

**Steps:**

1. Log in as buyer
2. Refresh page
3. Check authentication state

**Expected Results:**

- ✅ User remains logged in
- ✅ Session persists across page refresh
- ✅ Buyer profile accessible

---

## Database Verification Queries

### Check Buyer Record

```sql
SELECT
  b.id,
  b.full_name,
  b.email,
  b.created_at,
  p.role
FROM buyers b
JOIN profiles p ON b.id = p.id
WHERE b.email = 'testbuyer@example.com';
```

### Check Auth User

```sql
SELECT
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'testbuyer@example.com';
```

### Verify No Duplicate Keys

```sql
-- Should return only 1 row per user
SELECT id, COUNT(*) as count
FROM buyers
GROUP BY id
HAVING COUNT(*) > 1;

SELECT id, COUNT(*) as count
FROM profiles
GROUP BY id
HAVING COUNT(*) > 1;
```

---

## Integration Tests

### Test with Shop Features

1. **Add to Cart**

   - Log in as buyer
   - Add product to cart
   - Verify cart persists after logout/login

2. **Quick Order (Buy Now)**

   - Log in as buyer
   - Click "Buy Now" on a product
   - Verify checkout flow works

3. **Follow Shop**
   - Log in as buyer
   - Follow a seller shop
   - Verify following state saves

---

## Error Handling Tests

### Network Errors

1. Disable network
2. Try to sign up
3. Verify error message shows

### Supabase Errors

1. Invalid Supabase configuration
2. Try authentication
3. Verify graceful error handling

---

## RLS Policy Tests

### Buyer Can Access Own Profile

```sql
-- Set auth.uid() to buyer's UUID
SET request.jwt.claims TO '{"sub": "buyer-uuid"}';

-- Should succeed
SELECT * FROM buyers WHERE id = 'buyer-uuid';
```

### Buyer Cannot Access Other Profiles

```sql
-- Set auth.uid() to buyer-1's UUID
SET request.jwt.claims TO '{"sub": "buyer-1-uuid"}';

-- Should return no rows
SELECT * FROM buyers WHERE id = 'buyer-2-uuid';
```

---

## Regression Tests

### Verify Seller Auth Still Works

1. Log in as seller
2. Verify seller dashboard accessible
3. Verify seller cannot access buyer features

### Verify Admin Auth Still Works

1. Log in as admin
2. Verify admin panel accessible
3. Verify admin cannot access buyer features

---

## Performance Tests

### Signup Performance

- Should complete in < 2 seconds
- Database insert should be < 500ms

### Login Performance

- Should complete in < 1 second
- Database query should be < 200ms

---

## Security Tests

### SQL Injection

Try malicious inputs:

```
email: "admin@test.com'; DROP TABLE buyers; --"
password: "password' OR '1'='1"
```

**Expected:** All attempts blocked by prepared statements

### XSS Prevention

Try script injection:

```
full_name: "<script>alert('XSS')</script>"
```

**Expected:** Stored as plain text, not executed

---

## Browser Compatibility

Test on:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Test Results

| Test Case           | Status     | Notes |
| ------------------- | ---------- | ----- |
| New Buyer Signup    | ⏳ Pending |       |
| Buyer Login         | ⏳ Pending |       |
| Invalid Credentials | ⏳ Pending |       |
| Seller→Buyer Login  | ⏳ Pending |       |
| Password Validation | ⏳ Pending |       |
| Password Mismatch   | ⏳ Pending |       |
| Duplicate Email     | ⏳ Pending |       |
| Full Name Required  | ⏳ Pending |       |
| Guest Checkout      | ⏳ Pending |       |
| Session Persistence | ⏳ Pending |       |

---

## Rollback Plan

If migration fails:

1. Revert BuyerAuthModal.tsx changes
2. Restore demo credentials
3. Re-enable localStorage authentication
4. Document issues for future fix

**Rollback Files:**

- `web/src/components/BuyerAuthModal.tsx` (Git: `git checkout HEAD -- <file>`)

---

## Sign-off

- [ ] All tests passed
- [ ] No console errors
- [ ] Database schema verified
- [ ] RLS policies working
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Documentation updated

**Tested by:** ******\_\_\_******  
**Date:** ******\_\_\_******  
**Approved by:** ******\_\_\_******  
**Date:** ******\_\_\_******
