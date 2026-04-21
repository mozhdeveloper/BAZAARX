# Seller Auth Features

> Implemented across `app/seller/login.tsx`, `app/seller/signup.tsx`, `src/lib/schemas.ts`, and `src/services/authService.ts`

---

## 1. Centralized Zod Validation Schemas

**File:** `src/lib/schemas.ts`

- Added `sellerLoginSchema` — standard email + password validation shared with buyer login
- Added `sellerSignupSchema` — multi-field validation for seller-specific signup:
  - `email` — valid email format
  - `password` — 8+ chars, uppercase, lowercase, number, special character, no spaces
  - `confirmPassword` — must match password
  - `storeName` — min 3 characters, **allows numbers and special characters** for business names
  - `phone` — Philippine format (`09XXXXXXXXX` or `+639XXXXXXXXX`)
  - `storeAddress` — min 5 characters
  - `storeDescription` — optional

---

## 2. Seller Login Refactor

**File:** `app/seller/login.tsx`

- Migrated from manual `useState` fields to **React Hook Form** with `zodResolver`
- Sign In button is **dynamically disabled** until form is valid
- Added missing imports: `useNavigation`, lucide icons (`Mail`, `Lock`, `Eye`, `EyeOff`, `ArrowRight`), `KeyboardAvoidingView`, `Platform`
- Fixed a broken `fillDemoCredentials` function — replaced legacy `setEmail`/`setPassword` state calls with RHF `setValue()`
- Removed a duplicate `);` syntax error at end of component
- **Collapsible "More Options" section** for test seller accounts — reduces clutter on the main login screen
- Test accounts populate both fields via `setValue` with `shouldValidate: true`

### UI Improvements
- 8pt spacing system applied throughout
- Neutral gray icons (orange reserved for brand/primary actions only)
- Rounded inputs (`borderRadius: 14`)
- Premium button with shadow and disabled state opacity

---

## 3. Seller Signup Refactor (Multi-Step Form)

**File:** `app/seller/signup.tsx`

### Form Architecture
- Single `useForm<SellerSignupFormData>` instance spanning both steps
- Step rendering changed from **conditional rendering** (`{step === 1 ? ...}`) to **persistent mounting** (`display: 'flex' | 'none'`) — prevents RHF from losing validation state when switching steps
- `mode: 'onChange'` for real-time feedback

### Step 1 — Account Info
- Email, Password, Confirm Password fields
- **Live email role check** (debounced 500ms):
  - `idle` → `checking` → `available` / `taken` / `buyer-only`
  - Shows "Existing buyer account found. You can upgrade to seller." for buyer-only accounts
  - Blocks the Next button if email is already a seller or has restricted roles
- "Next: Store Info" button disabled during email check or if email is taken

### Step 2 — Store Details
- Store Name, Phone Number, Store Address, Store Description (optional)
- **Live store name availability check** (debounced 500ms via `ilike` query on `sellers` table)
  - Shows spinner while checking, ✓ icon when available
  - Blocks Submit button if name is taken
- `onInvalid` callback on `handleSubmit` — shows an `Alert` with the first validation error if the form fails, so the button never silently does nothing

### Progress Indicator
- Thin bar progress line + step dots with active/inactive states
- Step 1 dot becomes a ✓ checkmark when on Step 2

### Submit Shop Button
- Disabled only when: `loading`, `storeStatus === 'checking'`, or `storeStatus === 'taken'`
- No longer locked by `isValid` (which could get stuck in multi-step forms)

---

## 4. Signup Flow — Async User Creation Fixes

**File:** `src/services/authService.ts`

### Problem
`supabase.auth.signUp()` returns before Postgres fully commits the `auth.users` row. Subsequent inserts to `profiles` and `user_roles` (which have FK chains to `auth.users`) would fail with `23503` FK violations.

The FK dependency chain was:
```
user_roles.user_id → profiles.id → auth.users.id
```

### Solution — Active Polling
Instead of a static delay, `signUp()` now:
1. Calls `supabase.auth.signUp()`
2. **Polls `profiles` table every 500ms** (up to 10 attempts / 5 seconds) until the row exists
3. If the poll confirms the profile exists (created by DB trigger) → enriches it with `first_name`, `last_name`, `phone` via `update()`
4. If polling times out → falls back to a direct `upsert()` as a safety net
5. Only proceeds to `addUserRole()` after the profile is confirmed to exist

### Solution — Retry in `addUserRole()`
`addUserRole()` now retries up to 3 times with 500ms/1000ms backoff specifically for `23503` FK violation errors, as an extra safety net.

### Supabase DB Trigger (manual setup required)
To eliminate the race condition at the database level, a trigger should be created:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, phone)
  VALUES (
    NEW.id, NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

This creates the profile in the **same transaction** as the auth user, making the FK chain reliable at the DB level.

---

## 5. Buyer Upgrade Path

When an existing buyer email is entered on Seller Signup:
- The email check detects `buyer-only` role status
- Step 1 shows an informational message instead of blocking
- On submit, `authService.registerBuyerAsSeller()` is called instead of `signUp()` — signs in the user and adds the seller role to their existing account without creating a duplicate

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/schemas.ts` | Added `sellerLoginSchema`, `sellerSignupSchema`, `SellerSignupFormData` |
| `app/seller/login.tsx` | Full RHF refactor, UI overhaul, fixed imports and syntax errors |
| `app/seller/signup.tsx` | Full RHF refactor, persistent mounting, async checks, onInvalid handler |
| `src/services/authService.ts` | Active profile polling, non-fatal fallback upsert, retry in `addUserRole` |
