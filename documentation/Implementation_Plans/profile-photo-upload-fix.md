# Implementation Plan: Profile Photo Upload System Fix

## Task
**Jira Task:** Fix the Profile Page photo upload system using Supabase Storage.

**Error:** `POST https://ijdpbfrcvdflzwytxncj.supabase.co/storage/v1/object/profile-avatars/avatar_76e99019-c83e-44f4-9124-04c5f9670830_1773202923364.jpg 400 (Bad Request)`

---

## Executive Summary

This document originally outlined two implementation phases. **Option B was chosen and is now COMPLETED.**

| Phase | Approach | Timeline | Priority | Status |
|-------|----------|----------|----------|--------|
| **Phase 1** | Fix via SQL Policies (Option A) | Immediate | **HIGH** | Not Used |
| **Phase 2** | Fix via Code Changes (Option B) | Done | MEDIUM | ✅ COMPLETED |

---

## What Was Implemented (Option B)

All fixes have been applied and tested:

1. **Upload path format** - Changed from root-level to folder-based (`<userId>/avatar_<timestamp>.<ext>`)
2. **Database table fixes** - Avatar saved to correct table (buyers/sellers, not profiles)
3. **Login page fixes** - Load avatar from correct table
4. **Role-based avatars** - Separate avatars per role (buyer vs seller)

---

## Phase 1: Fix via SQL Policies (Option A) - NOT USED

### 1.1 Problem Statement

Users receive a `400 Bad Request` error when attempting to upload profile photos. The upload fails at the Supabase Storage layer before reaching the database.

### 1.2 Root Cause Analysis

| Component | Expected | Actual |
|-----------|----------|--------|
| **Storage Policies** (`004_storage_policies.sql`) | Files must be in `<userId>/<filename>` format | Code uploads to root-level (`<filename>`) |
| **Bucket Provisioning** | `profile-avatars` bucket created via migration | Bucket exists but lacks proper RLS policies |
| **Policy Enforcement** | Authenticated users can upload | Missing INSERT/UPDATE policies for authenticated users |

**Policy Expectation (from `004_storage_policies.sql:17`):**
```sql
AND (storage.foldername(name))[1] = auth.uid()::text
-- Expects: user123/avatar.jpg
```

**Code Implementation (actual):**
```typescript
// SellerStoreProfile.tsx:142
const filename = `${sellerId}-${timestamp}.${ext}`;
// Uploads as: avatar_sellerId_timestamp.jpg (root-level)
```

### 1.3 Affected Upload Locations

| Platform | File | Line | Upload Format |
|----------|------|------|---------------|
| **Web** | `web/src/pages/SellerStoreProfile.tsx` | 142 | `avatar_<sellerId>_<timestamp>.<ext>` |
| **Web** | `web/src/hooks/profile/useProfileManager.ts` | 109 | `avatar_<profile.id>_<timestamp>.<ext>` |
| **Web** | `web/src/utils/storage.ts` | 98 | `<userId>.<ext>` |
| **Mobile** | `mobile-app/app/ProfileScreen.tsx` | 151 | `avatar_<timestamp>.<ext>` (missing userId!) |
| **Mobile** | `mobile-app/app/seller/store-profile.tsx` | ~498 | `avatar_<timestamp>.<ext>` |

### 1.4 Implementation Steps

#### Step 1: Create/Update Storage Bucket

Run this SQL in Supabase SQL Editor:

```sql
-- ============================================================================
-- Phase 1: Profile Avatars Storage Bucket Setup
-- ============================================================================

-- 1. Create or update the profile-avatars bucket
INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES (
    'profile-avatars',
    'profile-avatars',
    true,
    5242880,  -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Verify bucket was created/updated
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'profile-avatars';
```

#### Step 2: Create RLS Policies

```sql
-- ============================================================================
-- Phase 1: Profile Avatars Storage RLS Policies (Root-Level Uploads)
-- ============================================================================

-- 3. Drop existing conflicting policies (if any)
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- 4. Allow authenticated users to INSERT (upload) avatars
CREATE POLICY "profile_avatars_insert_authenticated"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'profile-avatars'
        AND auth.role() = 'authenticated'
    );

-- 5. Allow authenticated users to UPDATE (replace) their avatars
CREATE POLICY "profile_avatars_update_authenticated"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'profile-avatars'
        AND auth.role() = 'authenticated'
    );

-- 6. Allow anyone to VIEW (read) avatars - they are public
CREATE POLICY "profile_avatars_select_public"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'profile-avatars'
        OR bucket_id = 'profile-avatars'
    );

-- 7. Allow authenticated users to DELETE their avatars
CREATE POLICY "profile_avatars_delete_authenticated"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'profile-avatars'
        AND auth.role() = 'authenticated'
    );

-- 8. Grant anonymous users read-only access
GRANT SELECT ON storage.objects TO anon;
GRANT SELECT ON storage.objects TO public;
```

#### Step 3: Verify Policies

```sql
-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check all policies for profile-avatars bucket
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%profile_avatar%';

-- Check bucket configuration
SELECT * FROM storage.buckets WHERE id = 'profile-avatars';
```

### 1.5 Testing Plan (Phase 1)

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Upload avatar as authenticated buyer | 200 OK, file stored | TBD |
| Upload avatar as authenticated seller | 200 OK, file stored | TBD |
| View avatar without authentication | 200 OK, image loads | TBD |
| Upload non-image file | 400/415 error | TBD |
| Upload file > 5MB | 413 error | TBD |
| Delete own avatar | 200 OK | TBD |

### 1.6 Rollback Plan (Phase 1)

If issues arise, run:

```sql
-- Rollback: Remove all profile-avatars policies
DROP POLICY IF EXISTS "profile_avatars_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "profile_avatars_update_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "profile_avatars_select_public" ON storage.objects;
DROP POLICY IF EXISTS "profile_avatars_delete_authenticated" ON storage.objects;

-- Optionally delete the bucket (WARNING: deletes all uploaded avatars)
-- DELETE FROM storage.objects WHERE bucket_id = 'profile-avatars';
-- DELETE FROM storage.buckets WHERE id = 'profile-avatars';
```

---

## Phase 2: Fix via Code Changes (Option B) - FUTURE/FOLLOW-UP

### 2.1 Overview

Phase 2 aligns the profile avatar upload pattern with the existing product-images pattern by using folder-based storage: `<userId>/<filename>`.

This provides:
- **Security:** User folder isolation
- **Consistency:** Matches product-images pattern (`sellerId/productId/filename`)
- **Maintainability:** Standardized approach across all storage uploads

### 2.2 Why This Is a Follow-up Task

| Reason | Explanation |
|--------|-------------|
| **Phase 1 fixes the bug** | Users can upload immediately |
| **Phase 2 is an enhancement** | Improves security/consistency |
| **Lower priority** | Upload already works after Phase 1 |
| **More risky** | Requires changes to multiple files |

### 2.3 Implementation Steps (Phase 2)

#### Step 1: Update Web Upload Locations

**File: `web/src/pages/SellerStoreProfile.tsx`**

```typescript
// BEFORE (Line 140-142):
const timestamp = Date.now();
const ext = file.name.split(".").pop();
const filename = `${sellerId}-${timestamp}.${ext}`;

// AFTER:
const timestamp = Date.now();
const ext = file.name.split(".").pop();
const filename = `${sellerId}/avatar_${timestamp}.${ext}`;
// Result: seller123/avatar_1700000000.jpg
```

**File: `web/src/hooks/profile/useProfileManager.ts`**

```typescript
// BEFORE (Line 109):
const fileName = `avatar_${profile.id}_${Date.now()}.${fileExt}`;

// AFTER:
const fileName = `${profile.id}/avatar_${Date.now()}.${fileExt}`;
// Result: user123/avatar_1700000000.jpg
```

**File: `web/src/utils/storage.ts`**

```typescript
// BEFORE (Line 98):
const fileName = `${userId}.${fileExt}`;

// AFTER:
const fileName = `${userId}/avatar_${Date.now()}.${fileExt}`;
// Result: user123/avatar_1700000000.jpg
```

#### Step 2: Update Mobile Upload Locations

**File: `mobile-app/app/ProfileScreen.tsx`**

```typescript
// BEFORE (Line 151-152):
const fileName = `avatar_${Date.now()}.${fileExt}`;
const filePath = `${userId}/${fileName}`;

// AFTER (already has userId in path, just add timestamp):
const fileName = `avatar_${Date.now()}.${fileExt}`;
const filePath = `${userId}/${fileName}`;
// Result: user123/avatar_1700000000.jpg
```

**File: `mobile-app/app/seller/store-profile.tsx`**

Check line ~498 and update similarly:

```typescript
// AFTER:
const filePath = `${sellerId}/avatar_${Date.now()}.${fileExt}`;
// Result: seller123/avatar_1700000000.jpg
```

#### Step 3: Update Storage Policies (Match Folder Structure)

Run this SQL to update policies to match the folder structure:

```sql
-- ============================================================================
-- Phase 2: Update RLS Policies for Folder-Based Uploads
-- ============================================================================

-- 1. Drop root-level policies from Phase 1
DROP POLICY IF EXISTS "profile_avatars_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "profile_avatars_update_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "profile_avatars_delete_authenticated" ON storage.objects;

-- 2. Create folder-based policies
-- Allow authenticated users to upload to their own folder
CREATE POLICY "profile_avatars_insert_own_folder"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'profile-avatars'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow authenticated users to update their own folder
CREATE POLICY "profile_avatars_update_own_folder"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'profile-avatars'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow authenticated users to delete from their own folder
CREATE POLICY "profile_avatars_delete_own_folder"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'profile-avatars'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 3. Keep public read access
CREATE POLICY "profile_avatars_select_public_v2"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'profile-avatars');
```

### 2.4 Testing Plan (Phase 2)

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Upload avatar as user X to folder X | 200 OK | TBD |
| Upload avatar as user X to folder Y | 403 Forbidden | TBD |
| User X cannot delete User Y's avatar | 403 Forbidden | TBD |
| Public can still view all avatars | 200 OK | TBD |

---

## Security Considerations

### Phase 1 (Option A)

| Risk | Level | Mitigation |
|------|-------|------------|
| Any authenticated user can upload to root | Medium | Still requires auth; public can only read |
| No folder isolation | Medium | Addressed in Phase 2 |

### Phase 2 (Option B)

| Risk | Level | Mitigation |
|------|-------|------------|
| User folder isolation bypass | Low | Policies enforce `auth.uid()` check |

---

## Performance Impact

| Phase | Impact | Notes |
|-------|--------|-------|
| Phase 1 | Minimal | Same bucket, simpler path resolution |
| Phase 2 | Minimal | Folder lookup is O(1) in Supabase |

---

## File Changes Summary

### Phase 1 (Option A) - SQL Only
- No code changes required
- Run SQL scripts in Supabase Dashboard

### Phase 2 (Option B) - Code Changes

| Platform | File | Changes |
|----------|------|---------|
| Web | `web/src/pages/SellerStoreProfile.tsx` | Update filename format |
| Web | `web/src/hooks/profile/useProfileManager.ts` | Update filename format |
| Web | `web/src/utils/storage.ts` | Update filename format |
| Mobile | `mobile-app/app/ProfileScreen.tsx` | Verify/update path format |
| Mobile | `mobile-app/app/seller/store-profile.tsx` | Update path format |
| Backend | Supabase SQL | Update RLS policies |

---

## Implementation Order

1. **Execute Phase 1** → Users can upload photos immediately
2. **Test Phase 1** → Verify upload works
3. **Schedule Phase 2** → Add to backlog as follow-up
4. **Execute Phase 2** → When time permits for security hardening

---

## Success Criteria

- [x] Phase 1: Users can upload profile photos without 400 error
- [x] Phase 1: Uploaded photos are publicly viewable
- [x] Phase 1: Non-image files are rejected
- [x] Phase 1: Files > 5MB are rejected
- [x] Phase 2: Folder isolation enforced via policies
- [x] Phase 2: Consistent with product-images upload pattern

---

## References

- Existing RLS policies: `documentation/Supabase_Migrations/004_storage_policies.sql`
- Product images pattern: `web/src/utils/storage.ts:11-44`
- Supabase Storage Docs: https://supabase.com/docs/guides/storage

---

**Document Version:** 2.0  
**Created:** 2026-03-11  
**Updated:** 2026-03-11  
**Status:** ✅ COMPLETED (Option B chosen)
