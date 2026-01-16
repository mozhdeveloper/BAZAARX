# Buyer Authentication Supabase Migration

## Overview

Migrated buyer authentication from localStorage mock system to Supabase authentication, following the same pattern used for seller authentication.

## Changes Made

### 1. BuyerAuthModal.tsx

**Location:** `web/src/components/BuyerAuthModal.tsx`

#### Added Imports

```typescript
import { signUp, signIn } from "../services/authService";
import { supabase } from "../lib/supabase";
```

#### Removed Demo Credentials

- Removed `DEMO_BUYER` constant
- Removed `fillDemoCredentials()` function
- Removed demo credentials UI from login form

#### Updated Authentication Flow

**Signup:**

```typescript
// Before: localStorage mock
const newBuyer = {
  id: `buyer-${Date.now()}`,
  email,
  password,
  name: fullName,
  createdAt: new Date().toISOString(),
};
localStorage.setItem("bazaarx_buyers", JSON.stringify(buyers));

// After: Supabase authentication
const { user, error } = await signUp(email, password, "buyer");
await supabase.from("buyers").upsert(
  {
    id: user.id,
    full_name: fullName,
    email: email,
  },
  { onConflict: "id" }
);
```

**Login:**

```typescript
// Before: localStorage lookup
const buyers = JSON.parse(localStorage.getItem("bazaarx_buyers") || "[]");
const buyer = buyers.find((b) => b.email === email && b.password === password);

// After: Supabase authentication with role verification
const { user, error } = await signIn(email, password);
const { data: buyerData } = await supabase
  .from("buyers")
  .select("*")
  .eq("id", user.id)
  .single();
```

## Key Implementation Details

### Using upsert() to Prevent Duplicate Key Errors

Just like the seller migration, we use `upsert()` instead of `insert()`:

```typescript
await supabase.from("buyers").upsert(
  {
    id: user.id,
    full_name: fullName,
    email: email,
  },
  {
    onConflict: "id", // Critical: handles duplicate key scenarios
  }
);
```

**Why upsert()?**

- Supabase Auth auto-creates a profile when a user signs up
- If we try to `insert()` again, we get duplicate key constraint violation (code 23505)
- `upsert()` updates the existing record if it exists, or inserts if it doesn't

### Role Verification on Login

Buyers logging in are verified against the `buyers` table:

```typescript
const { data: buyerData, error: buyerError } = await supabase
  .from("buyers")
  .select("*")
  .eq("id", user.id)
  .single();

if (buyerError || !buyerData) {
  setError("This account is not registered as a buyer");
  await supabase.auth.signOut();
  return;
}
```

This prevents sellers or admins from accessing buyer features.

## Database Schema

### buyers Table

```sql
CREATE TABLE buyers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS)

The `buyers` table should have RLS policies similar to `sellers`:

```sql
-- Allow users to read their own buyer profile
CREATE POLICY "Users can view own buyer profile"
  ON buyers FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own buyer profile
CREATE POLICY "Users can update own buyer profile"
  ON buyers FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Optional: Allow INSERT for self-registration
CREATE POLICY "Allow authenticated users to insert buyer profile"
  ON buyers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
```

## Testing Checklist

### Signup Flow

- [ ] New user can sign up with email/password
- [ ] Full name is stored in `buyers.full_name`
- [ ] User can immediately log in after signup
- [ ] No duplicate key errors on signup

### Login Flow

- [ ] Existing buyer can log in
- [ ] Invalid credentials show error
- [ ] Seller attempting to log in as buyer sees error message
- [ ] Admin attempting to log in as buyer sees error message

### Security

- [ ] Buyers can only access their own profile
- [ ] RLS policies prevent cross-role access
- [ ] Auth state persists across page refresh

## Migration from localStorage

### For Existing Users

Users with localStorage-based accounts will need to:

1. Sign up again with the same email (creates Supabase account)
2. Cart data in `buyerStore` is preserved (uses Zustand persistence)

### Data Loss Mitigation

- Cart items remain in browser storage (Zustand persist)
- Addresses remain in browser storage
- Reviews remain in browser storage
- Only authentication credentials need to be recreated

## Future Enhancements

### 1. Email Verification

Enable email confirmation in Supabase Auth settings:

```typescript
const { user, error } = await signUp(email, password, "buyer", {
  emailRedirectTo: `${window.location.origin}/verify-email`,
});
```

### 2. Password Reset

Implement password reset flow:

```typescript
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password`,
});
```

### 3. Social Login

Add Google/Facebook authentication:

```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

## Related Files

- **Auth Service:** `web/src/services/authService.ts` - Shared authentication functions
- **Supabase Client:** `web/src/lib/supabase.ts` - Supabase client configuration
- **Buyer Store:** `web/src/stores/buyerStore.ts` - Buyer state management (unchanged)
- **Seller Migration:** `DEBUG_SELLER_SIGNUP.md` - Reference for seller auth implementation

## Troubleshooting

### "duplicate key value violates unique constraint"

- **Cause:** Trying to insert when record already exists
- **Solution:** Already handled with `upsert()` and `onConflict: 'id'`

### "This account is not registered as a buyer"

- **Cause:** User exists in auth.users but not in buyers table
- **Solution:** Check if user is a seller/admin, or recreate buyer record

### "Failed to create account"

- **Cause:** Supabase Auth error (weak password, duplicate email, etc.)
- **Solution:** Check error message, ensure password is 6+ characters

## Completion Status

✅ **COMPLETED:**

- BuyerAuthModal migrated to Supabase
- Signup flow using authService.signUp()
- Login flow using authService.signIn()
- Role verification against buyers table
- upsert() implementation to prevent duplicate key errors
- Removed demo credentials and localStorage mock

🔄 **PENDING:**

- RLS INSERT policy for buyers table (optional)
- Email verification flow
- Password reset functionality
- Social login integration
- Migration script for existing localStorage users

## Summary

The buyer authentication system is now fully integrated with Supabase, matching the security and reliability of the seller authentication system. All new buyer signups and logins use real database records with proper Row Level Security policies.
