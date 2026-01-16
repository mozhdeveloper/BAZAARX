# Debugging Seller Signup Issue

## Problem

Seller signup creates records in `auth.users` and `public.profiles` but NOT in `public.sellers` table.

## Root Cause

The RLS (Row Level Security) policies in `002_row_level_security.sql` have **NO INSERT policy** for the `sellers` table. The current policies only allow:

- SELECT (view their own data)
- UPDATE (modify their own data)

Without an INSERT policy, new users cannot create their own seller record.

## Debug Checklist

### 1. Check Browser Console

Open DevTools (F12) and look for errors like:

```
new row violates row-level security policy for table "sellers"
```

### 2. Check Supabase Dashboard

- Go to Table Editor → `sellers` table
- Check if any rows exist for your test user
- Go to Logs → Postgres Logs and filter for errors

### 3. Verify RLS is Enabled

Run this in Supabase SQL Editor:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'sellers';
```

### 4. Check Current Policies

```sql
SELECT * FROM pg_policies
WHERE tablename = 'sellers';
```

## Solutions

### Option 1: Add RLS INSERT Policy (Recommended for Self-Service)

Add this to your Supabase SQL Editor:

```sql
-- Allow authenticated users to insert their own seller record
CREATE POLICY "Users can create their own seller profile"
  ON public.sellers FOR INSERT
  WITH CHECK (auth.uid() = id);
```

Then update `sellerStore.ts` to ensure the seller can authenticate after signup.

### Option 2: Use Supabase Edge Function (Production Ready)

Create a server-side function with service role key that bypasses RLS:

1. Create `supabase/functions/register-seller/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { email, password, sellerData } = await req.json();

  // 1. Create auth user
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError) {
    return new Response(JSON.stringify({ error: authError.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = authData.user.id;

  // 2. Create profile
  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    id: userId,
    email,
    full_name: sellerData.ownerName || sellerData.storeName,
    phone: sellerData.phone,
    user_type: "seller",
  });

  if (profileError) {
    return new Response(JSON.stringify({ error: profileError.message }), {
      status: 400,
    });
  }

  // 3. Create seller record
  const { error: sellerError } = await supabaseAdmin.from("sellers").insert({
    id: userId,
    business_name: sellerData.businessName,
    store_name: sellerData.storeName,
    store_description: sellerData.storeDescription,
    store_category: sellerData.storeCategory,
    business_type: sellerData.businessType,
    business_registration_number: sellerData.businessRegistrationNumber,
    tax_id_number: sellerData.taxIdNumber,
    business_address: sellerData.businessAddress,
    city: sellerData.city,
    province: sellerData.province,
    postal_code: sellerData.postalCode,
    bank_name: sellerData.bankName,
    account_name: sellerData.accountName,
    account_number: sellerData.accountNumber,
    is_verified: false,
    approval_status: "pending",
  });

  if (sellerError) {
    return new Response(JSON.stringify({ error: sellerError.message }), {
      status: 400,
    });
  }

  return new Response(JSON.stringify({ success: true, userId }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
```

2. Deploy:

```bash
supabase functions deploy register-seller
```

3. Update `sellerStore.ts` to call the edge function:

```typescript
// In register function
const response = await fetch(`${SUPABASE_URL}/functions/v1/register-seller`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify({
    email: sellerData.email,
    password: sellerData.password,
    sellerData,
  }),
});

const result = await response.json();
if (!result.success) {
  console.error("Seller registration failed:", result.error);
  return false;
}
```

### Option 3: Database Trigger (Automatic)

Create a trigger that auto-creates seller record when profile is created with `user_type='seller'`:

```sql
CREATE OR REPLACE FUNCTION auto_create_seller_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_type = 'seller' THEN
    INSERT INTO public.sellers (id, store_name, business_name)
    VALUES (NEW.id, 'My Store', 'My Business');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_seller_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_seller_profile();
```

Then update the seller record later with business details.

## Immediate Fix (5 minutes)

Run this in Supabase SQL Editor NOW:

```sql
-- Enable sellers to create their own record
CREATE POLICY "Allow authenticated users to insert seller profile"
  ON public.sellers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
```

Then test signup again - it should work!

## Recommended Approach

For production, use **Option 2 (Edge Function)** because:

- ✅ Service role bypasses RLS
- ✅ All signup logic in one place
- ✅ Can add validation, email sending, etc.
- ✅ More secure than client-side insert

For quick testing, use **Option 1** to unblock yourself now.
