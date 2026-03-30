# Implementation Plan: Separate Suspend from Blacklist

**Created:** March 28, 2026  
**Status:** Completed

---

## Summary

Separate the "Suspend" action from "Blacklist" in the Seller Approval admin view. The suspend action is intended for approved sellers who need temporary suspension, while blacklist is reserved for permanent bans after multiple offenses through the reapplication flow.

---

## Background

Previously, when an admin suspended a seller, the system incorrectly set their status to `blacklisted`, which:
1. Combined them with permanently banned sellers in the same category
2. Displayed "Permanently Blacklisted" badge incorrectly
3. Mixed admin-initiated suspensions with system-generated permanent blacklists

---

## Changes Made

### 1. Database Schema Update

**File:** `currentdb.md`

**Change 1:** Added `'suspended'` to the `approval_status` CHECK constraint.

```sql
-- Before
CHECK (approval_status = ANY (ARRAY['pending', 'verified', 'rejected', 'needs_resubmission', 'blacklisted']))

-- After
CHECK (approval_status = ANY (ARRAY['pending', 'verified', 'rejected', 'needs_resubmission', 'blacklisted', 'suspended']))
```

**Change 2:** Added dedicated columns for suspension data (to separate from blacklist data).

```sql
-- Add to sellers table
ALTER TABLE sellers 
ADD COLUMN suspended_at timestamp with time zone,
ADD COLUMN suspension_reason text;
```

**Note:** Do not add `suspended_by` as a foreign key to `profiles` to avoid PostgREST relationship ambiguity.
If it was previously added, drop it:

```sql
ALTER TABLE sellers DROP COLUMN IF EXISTS suspended_by;
```

### 2. Backend - suspendSeller Function

**File:** `web/src/stores/admin/adminSellersStore.ts`

**Change:** Updated `suspendSeller` function to use the dedicated suspension columns and clear blacklist flags.

```typescript
// Before
const { error } = await supabase
  .from('sellers')
  .update({
    approval_status: 'blacklisted',
    blacklisted_at: new Date().toISOString(),
    is_permanently_blacklisted: false,
  } as any)

// After
const { error } = await supabase
  .from('sellers')
  .update({
    approval_status: 'suspended',
    suspended_at: new Date().toISOString(),
    suspension_reason: reason,
    blacklisted_at: null,
    is_permanently_blacklisted: false,
    temp_blacklist_until: null,
  } as any)
```

---

## Behavior After Changes

### Seller Status Flow

| Scenario | Status | Tab | Badge | Login Blocked |
|----------|--------|-----|-------|----------------|
| Admin clicks "Suspend" on approved seller | `suspended` | Suspended | Suspended | Yes |
| Seller rejected -> 3 failed reattempts -> 3 cooldowns -> 3 temp blacklists | `blacklisted` | Blacklisted | Permanently Blacklisted | Yes |

**Badge behavior:** Suspended sellers show the "Suspended" status badge only. Blacklist badges are tied to `blacklisted` status.

### Access Control

Both `suspended` and `blacklisted` statuses return `SellerAccessTier: "blocked"`, ensuring sellers cannot log in regardless of suspension type.

---

## Data Fix Required

Run the following SQL to add the new columns, remove the old FK column (if present), and update manually suspended sellers:

```sql
-- Step 0: Remove suspended_by if it exists (avoid PostgREST ambiguity)
ALTER TABLE sellers DROP COLUMN IF EXISTS suspended_by;

-- Step 1: Add new suspension columns
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS suspension_reason text;

-- Step 2: Update sellers who were manually suspended (by admin) to use 'suspended' status
-- These are approved sellers who were suspended by admin, not auto-blacklisted through reapplication flow
UPDATE sellers 
SET 
  approval_status = 'suspended',
  suspended_at = COALESCE(suspended_at, blacklisted_at),
  suspension_reason = COALESCE(suspension_reason, 'Migrated from previous suspension'),
  blacklisted_at = NULL,
  is_permanently_blacklisted = false,
  temp_blacklist_until = NULL,
  temp_blacklist_count = 0
WHERE store_name IN ('Lexiii', 'For Seller Approval Testing 1');

-- Step 3: Ensure any suspended seller has blacklist flags cleared
UPDATE sellers
SET
  blacklisted_at = NULL,
  is_permanently_blacklisted = false,
  temp_blacklist_until = NULL,
  temp_blacklist_count = 0
WHERE approval_status = 'suspended';
```

---

## Testing Checklist

- [ ] Suspend an approved seller -> appears in Suspended tab with "Suspended" badge
- [ ] Suspended seller cannot log in
- [ ] Blacklisted sellers remain in Blacklisted tab with "Permanently Blacklisted" badge
- [ ] Suspended tab count is accurate
- [ ] Blacklisted tab count is accurate

---

## Files Modified

1. `currentdb.md` - Added 'suspended' to CHECK constraint + new suspension columns
2. `web/src/stores/admin/adminSellersStore.ts` - Updated suspendSeller function to clear blacklist flags and removed suspended_by writes

---

## Rollback Plan

1. Revert CHECK constraint in database to remove 'suspended'
2. Drop `suspended_at` and `suspension_reason` columns if added
3. Revert suspendSeller function to set 'blacklisted' status
4. Run data fix to restore any changed statuses/flags if needed







