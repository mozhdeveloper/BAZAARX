# Implementation Plan: Store Banner Upload System

## Task
**Jira Task:** Implement Store Banner upload system using Supabase Storage.

---

## Executive Summary

| Aspect | Details |
|--------|---------|
| **Approach** | Implement banner upload following avatar upload pattern |
| **Storage Bucket** | `profile-avatars` (same as avatar, different path) |
| **Path Format** | `<sellerId>/banner_<timestamp>.<ext>` |
| **Database** | `sellers.store_banner_url` column |
| **Status** | ✅ COMPLETED (Web) |

---

## Problem Statement

Store banner upload UI exists in both Web and Mobile but is not functional:
- No upload handler implemented
- No storage path defined
- No database update logic

---

## Database Schema

| Table | Column | Type |
|-------|--------|------|
| `sellers` | `store_banner_url` | TEXT (nullable) |

---

## Implementation Completed

### Step 1: Add Banner Upload Utility ✅

**File:** `web/src/utils/storage.ts`

Added new function `uploadStoreBanner`:
```typescript
export const uploadStoreBanner = async (
  file: File,
  sellerId: string
): Promise<string | null> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${sellerId}/banner_${Date.now()}.${fileExt}`;
  // Upload to profile-avatars bucket
  // Return public URL
};
```

---

### Step 2: Update Database Types ✅

**File:** `web/src/types/database.types.ts`

Added `store_banner_url` to Seller interface:
```typescript
export interface Seller {
  // ... existing fields
  store_banner_url: string | null;
}
```

---

### Step 3: Update Seller Service ✅

**File:** `web/src/services/sellerService.ts`

Added to SellerCoreData and SellerInsert types.

---

### Step 4: Update Seller Store ✅

**File:** `web/src/stores/sellerStore.ts`

Added `banner` field to:
- SellerData interface
- mapDbSellerToSeller transformation

---

### Step 5: Implement Banner Upload Handler ✅

**File:** `web/src/pages/SellerStoreProfile.tsx`

Added:
- Banner state (loading, error, input ref)
- `handleBannerUpload` function with validation
- Updated UI with click-to-upload and preview

---

## Files Changed

| File | Change |
|------|--------|
| `web/src/utils/storage.ts` | Added `uploadStoreBanner` function |
| `web/src/types/database.types.ts` | Added `store_banner_url` to Seller |
| `web/src/services/sellerService.ts` | Added to SellerCoreData, SellerInsert |
| `web/src/stores/sellerStore.ts` | Added `banner` field to interface and transform |
| `web/src/pages/SellerStoreProfile.tsx` | Added banner upload handler and UI |

---

## Upload Path Structure

| Type | Path Format | Example |
|------|-------------|---------|
| Avatar | `<sellerId>/avatar_<timestamp>.<ext>` | `abc123/avatar_1700000000.jpg` |
| Banner | `<sellerId>/banner_<timestamp>.<ext>` | `abc123/banner_1700000000.jpg` |

Both use the same `profile-avatars` bucket with different prefixes.

---

## Testing Plan

### Test Cases

| # | Test Scenario | Expected Result | Status |
|---|---------------|-----------------|--------|
| 1 | Upload banner as Seller | 200 OK, file in `<sellerId>/banner_*.jpg` | 🔄 TEST |
| 2 | View uploaded banner | 200 OK, image loads | 🔄 TEST |
| 3 | Replace existing banner | 200 OK, old file replaced | 🔄 TEST |
| 4 | Upload PNG image | 200 OK | 🔄 TEST |
| 5 | Upload WebP image | 200 OK | 🔄 TEST |
| 6 | Upload non-image file (PDF) | 400/415 error | 🔄 TEST |
| 7 | Upload file > 5MB | 413 error | 🔄 TEST |
| 8 | Log out and log back in | Banner persists | 🔄 TEST |

---

## Mobile Implementation (Pending)

The mobile implementation is still pending - need to add:
- Banner upload handler in `mobile-app/app/seller/store-profile.tsx`
- Similar to the web implementation

---

## Verification Queries

```sql
-- Check banner uploads in storage
SELECT 
    name,
    created_at,
    metadata->>'size' as file_size
FROM storage.objects
WHERE bucket_id = 'profile-avatars'
AND name LIKE '%/banner_%';

-- Check banners in sellers table
SELECT id, store_name, store_banner_url, updated_at
FROM sellers
WHERE store_banner_url IS NOT NULL;
```

---

## Success Criteria

- [x] Add uploadStoreBanner utility function
- [x] Add store_banner_url to database types
- [x] Add banner field to seller store
- [x] Implement banner upload handler
- [x] Update banner upload UI
- [ ] Upload banner as authenticated seller → TEST
- [ ] Banner persists in database after upload → TEST
- [ ] Banner displays correctly on store pages → TEST

---

## Related Issues

- Profile Photo Upload (COMPLETED): `documentation/Implementation_Plans/profile-photo-upload-fix-option-b.md`

---

**Document Version:** 1.1  
**Created:** 2026-03-11  
**Updated:** 2026-03-11  
**Status:** ✅ COMPLETED (Web)

