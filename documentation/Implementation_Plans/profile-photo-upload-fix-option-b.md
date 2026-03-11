# Implementation Plan: Profile Photo Upload Fix - Option B

## Option B: Fix via Code Changes (Folder-Based Uploads)

**Alternative to Option A** - Fixes the 400 error by updating upload code to use folder structure instead of modifying storage policies.

**Jira Task:** Fix the Profile Page photo upload system using Supabase Storage.

---

## Executive Summary

| Aspect | Details |
|--------|---------|
| **Approach** | Update upload code to use `<userId>/<filename>` format |
| **Root Cause** | Code uploads to root-level; policies expect folders |
| **Benefits** | Security (folder isolation), consistency (matches product-images), no SQL changes |
| **Risk** | Lower than Option A (no infrastructure changes) |
| **Timeline** | 30-60 minutes |
| **Status** | ✅ COMPLETED |

---

## Problem Statement

Users receive `400 Bad Request` when uploading profile photos.

**Root Cause:**
- Existing policies (`004_storage_policies.sql`) require: `<userId>/<filename>`
- Current code uploads: `<filename>` (root-level)

**Example:**
```
Policy expects: 76e99019-c83e-44f4-9124-04c5f9670830/avatar_123.jpg
Code uploads:  avatar_76e99019-c83e-44f4-9124-04c5f9670830_123.jpg
```

---

## Additional Issues Found & Fixed

During implementation, additional issues were discovered:

### Issue 1: Wrong Database Table
- **Problem:** Code was trying to save `avatar_url` to `profiles` table (which doesn't have that column)
- **Solution:** Save to correct table based on role:
  - Buyer avatar → `buyers.avatar_url`
  - Seller avatar → `sellers.avatar_url`

### Issue 2: Login Not Loading Avatar
- **Problem:** Login pages were looking for avatar in wrong table
- **Solution:** Load avatar from correct table based on role

### Issue 3: Role-Based Avatars
- **Decision:** Separate avatars per role (Option A chosen)
  - Buyer role uses `buyers.avatar_url`
  - Seller role uses `sellers.avatar_url`
  - Each role has independent avatar

---

## Implementation Steps (COMPLETED)

### Step 1: Update Upload Path - SellerStoreProfile.tsx

**File:** `web/src/pages/SellerStoreProfile.tsx`

```typescript
// BEFORE (Lines 140-142):
const timestamp = Date.now();
const ext = file.name.split(".").pop();
const filename = `${sellerId}-${timestamp}.${ext}`;

// AFTER:
const timestamp = Date.now();
const ext = file.name.split(".").pop();
const filename = `${sellerId}/avatar_${timestamp}.${ext}`;

// Result: seller123/avatar_1700000000.jpg
```

**Also fixed:** Database update to use `sellers` table instead of `profiles`:

```typescript
// BEFORE:
const { error: updateError } = await supabase
  .from("profiles")
  .update({ avatar_url: avatarUrl })
  .eq("id", sellerId);

// AFTER:
const { error: updateError } = await supabase
  .from("sellers")
  .update({ avatar_url: avatarUrl })
  .eq("id", sellerId);
```

---

### Step 2: Update Upload Path - useProfileManager.ts

**File:** `web/src/hooks/profile/useProfileManager.ts`

```typescript
// BEFORE (Lines 108-110):
const fileExt = file.name.split('.').pop();
const fileName = `avatar_${profile.id}_${Date.now()}.${fileExt}`;
const filePath = `${fileName}`;

// AFTER:
const fileExt = file.name.split('.').pop();
const fileName = `${profile.id}/avatar_${Date.now()}.${fileExt}`;
const filePath = `${fileName}`;

// Result: user123/avatar_1700000000.jpg
```

**Also fixed:** Update to use `avatar` field (not `avatar_url`) when calling updateProfile:

```typescript
// BEFORE:
await updateProfile({ avatar_url: publicUrl } as any);

// AFTER:
await updateProfile({ avatar: publicUrl } as any);
```

---

### Step 3: Update Upload Path - storage.ts

**File:** `web/src/utils/storage.ts`

```typescript
// BEFORE (Lines 96-98):
const fileExt = file.name.split('.').pop();
const fileName = `${userId}.${fileExt}`;

// AFTER:
const fileExt = file.name.split('.').pop();
const fileName = `${userId}/avatar_${Date.now()}.${fileExt}`;
```

---

### Step 4: Fix buyerStore.ts - Save to Correct Table

**File:** `web/src/stores/buyerStore.ts`

```typescript
// BEFORE (Line 605):
if (updates.avatar !== undefined) profileUpdates.avatar_url = updates.avatar;

// AFTER:
if (updates.avatar !== undefined) buyerUpdates.avatar_url = updates.avatar;
```

**Explanation:** Avatar belongs to `buyers` table, not `profiles` table.

---

### Step 5: Fix BuyerLoginPage.tsx - Load from Correct Table

**File:** `web/src/pages/BuyerLoginPage.tsx`

```typescript
// BEFORE (Lines 94-98):
avatar: profileAny?.avatar_url || `https://ui-avatars.com/...`

// AFTER:
avatar: (buyerData as any)?.avatar_url || profileAny?.avatar_url || `https://ui-avatars.com/...`
```

**Explanation:** Check `buyers` table first (where avatar is actually stored), then fallback to profiles.

---

### Step 6: Fix Mobile Seller Login - Load from Correct Table

**File:** `mobile-app/app/seller/login.tsx`

```typescript
// BEFORE (Line 102):
avatar: (profile as any)?.avatar_url || ''

// AFTER:
avatar: sellerData.avatar_url || (profile as any)?.avatar_url || ''
```

**Explanation:** Check `sellers` table first (where seller avatar is stored), then fallback to profiles.

---

### Step 7: Update Mobile userService.ts

**File:** `mobile-app/src/services/userService.ts`

```typescript
// BEFORE (Line 88):
const fileName = `avatar_${userId}_${Date.now()}.${fileExt}`;

// AFTER:
const fileName = `${userId}/avatar_${Date.now()}.${fileExt}`;
```

---

### Step 8: Mobile ProfileScreen.tsx (Already Correct)

**Status:** ✅ Already using folder structure (`userId/avatar_timestamp`)

---

## Database Schema Reference

| Role | Table | avatar_url Column | Status |
|------|-------|-------------------|--------|
| Buyer | `buyers` | ✅ Has avatar_url | Working |
| Seller | `sellers` | ✅ Has avatar_url | Working |
| Profile | `profiles` | ❌ No avatar_url | N/A |

---

## Role-Based Avatar System

### Current Implementation: Separate Avatars Per Role

| When... | Avatar Loaded From | Avatar Saved To |
|---------|-------------------|-----------------|
| Login as Buyer | `buyers.avatar_url` | `buyers.avatar_url` |
| Login as Seller | `sellers.avatar_url` | `sellers.avatar_url` |
| Role switch to Buyer | `buyers.avatar_url` | `buyers.avatar_url` |
| Role switch to Seller | `sellers.avatar_url` | `sellers.avatar_url` |

### Files Affected by Role Switching

| File | Function |
|------|----------|
| `web/src/stores/buyerStore.ts` | Loads buyer avatar from `buyers` table |
| `web/src/stores/sellerStore.ts` | Loads seller avatar from `sellers` table |
| `web/src/pages/BuyerLoginPage.tsx` | Initializes buyer profile with avatar |
| `web/src/services/roleSwitchService.ts` | Handles role transitions |

---

## Storage Policies (Already Compatible!)

The policies in `004_storage_policies.sql` support folder-based uploads:

```sql
-- Already exists - no changes needed!
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-avatars' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

---

## File Change Summary

| Platform | File | Lines | Change Type |
|----------|------|-------|-------------|
| Web | `SellerStoreProfile.tsx` | 140-142, 175-179 | Path format + DB table |
| Web | `useProfileManager.ts` | 108-110, 126 | Path format + field name |
| Web | `storage.ts` | 96-98 | Path format |
| Web | `buyerStore.ts` | 605, 607 | DB table (profiles → buyers) |
| Web | `BuyerLoginPage.tsx` | 94-98 | Load from correct table |
| Mobile | `ProfileScreen.tsx` | 151-152 | ✅ Already correct |
| Mobile | `seller/login.tsx` | 102 | Load from correct table |
| Mobile | `userService.ts` | 88-89 | Path format |

---

## Testing Plan

### Pre-Testing Checklist

- [x] Clear any cached uploads from previous failed attempts
- [x] Test with fresh user session
- [x] Prepare test images: JPG, PNG, WebP (all < 5MB)

### Test Cases

| # | Test Scenario | Expected Result | Status |
|---|---------------|-----------------|--------|
| 1 | Upload avatar as Buyer | 200 OK, file in `<userId>/avatar_*.jpg` | ✅ PASS |
| 2 | Upload avatar as Seller | 200 OK, file in `<sellerId>/avatar_*.jpg` | ✅ PASS |
| 3 | View uploaded avatar (no auth) | 200 OK, image loads | ✅ PASS |
| 4 | Log out and log back in (Buyer) | Avatar persists | ✅ PASS |
| 5 | Log out and log back in (Seller) | Avatar persists | ✅ PASS |
| 6 | Upload PNG image | 200 OK | ✅ PASS |
| 7 | Upload WebP image | 200 OK | ✅ PASS |
| 8 | Upload non-image file (PDF) | 400/415 error | ✅ PASS |
| 9 | Upload file > 5MB | 413 error | ✅ PASS |
| 10 | Upload to another user's folder | 403 Forbidden | ✅ PASS |

---

## Verification Queries

Run in Supabase SQL Editor:

```sql
-- Check uploaded files in profile-avatars
SELECT 
    name,
    created_at,
    metadata->>'size' as size,
    metadata->>'mime_type' as mime_type
FROM storage.objects
WHERE bucket_id = 'profile-avatars'
ORDER BY created_at DESC
LIMIT 10;

-- Check buyer avatars in database
SELECT id, avatar_url, updated_at
FROM buyers
WHERE avatar_url IS NOT NULL;

-- Check seller avatars in database
SELECT id, store_name, avatar_url, updated_at
FROM sellers
WHERE avatar_url IS NOT NULL;
```

---

## Rollback Plan

If issues arise, revert code changes:

| File | Revert Change |
|------|---------------|
| `web/src/pages/SellerStoreProfile.tsx` | `<sellerId>/avatar_<timestamp>.<ext>` → `avatar_<sellerId>_<timestamp>.<ext>` |
| `web/src/hooks/profile/useProfileManager.ts` | `<profile.id>/avatar_<timestamp>.<ext>` → `avatar_<profile.id>_<timestamp>.<ext>` |
| `web/src/utils/storage.ts` | `<userId>/avatar_<timestamp>.<ext>` → `<userId>.<ext>` |
| `web/src/stores/buyerStore.ts` | `buyerUpdates.avatar_url` → `profileUpdates.avatar_url` |
| `web/src/pages/BuyerLoginPage.tsx` | Check buyers table first → Check profiles only |

---

## Success Criteria (ALL COMPLETED)

- [x] Upload avatar as authenticated user → 200 OK
- [x] Files stored in `<userId>/avatar_*.jpg` format
- [x] Users cannot upload to other users' folders
- [x] Public can view uploaded avatars
- [x] No 400 Bad Request errors
- [x] Works on both Web and Mobile
- [x] Avatar persists after logout/login
- [x] Separate avatars per role (buyer vs seller)

---

## References

- Existing policies: `documentation/Supabase_Migrations/004_storage_policies.sql`
- Product images pattern: `web/src/utils/storage.ts:11-44`
- Supabase Storage: https://supabase.com/docs/guides/storage

---

**Document Version:** 2.0  
**Created:** 2026-03-11  
**Updated:** 2026-03-11  
**Status:** ✅ COMPLETED
