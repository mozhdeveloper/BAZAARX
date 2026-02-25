# Seller Product QA Process — Deep Analysis & Fix Plan

> **Generated:** 2025  
> **Scope:** Full seller product addition → admin QA review → approval/rejection flow  
> **Platforms:** Web (React/Vite) + Mobile (React Native/Expo) + Supabase Backend  
> **RLS Status:** No RLS policies configured — all queries execute without auth barriers

---

## Table of Contents

1. [Complete Flow Overview](#1-complete-flow-overview)
2. [Database Schema Summary](#2-database-schema-summary)
3. [File Map](#3-file-map)
4. [Issue Registry (All Found Bugs)](#4-issue-registry)
5. [Fix Plan (Prioritized)](#5-fix-plan)
6. [Implementation Details per Fix](#6-implementation-details)
7. [Testing Strategy](#7-testing-strategy)

---

## 1. Complete Flow Overview

```
SELLER CREATES PRODUCT
  ├── INSERT → products (approval_status: 'pending')
  ├── INSERT → product_images (web only — MOBILE MISSING)
  ├── INSERT → product_variants (or default variant)
  ├── INSERT → inventory_ledger
  └── INSERT → product_assessments (status: 'pending_digital_review')

ADMIN DIGITAL REVIEW
  ├── APPROVE → assessment → 'waiting_for_sample'
  │             + product_approvals record
  │             + Notification to seller
  ├── REJECT  → assessment → 'rejected'
  │             + product_rejections record
  │             + products.approval_status → 'rejected'
  └── REVISION → assessment → 'for_revision'
                + product_revisions record

SELLER SUBMITS SAMPLE (when status = 'waiting_for_sample')
  └── assessment → 'pending_physical_review'
      + product_assessment_logistics record

ADMIN PHYSICAL QA
  ├── PASS → assessment → 'verified'
  │          + products.approval_status → 'approved'
  │          + Notification: product approved
  └── FAIL → assessment → 'rejected'
             + products.approval_status → 'rejected'
             + Notification: product rejected
```

---

## 2. Database Schema Summary

### Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `products` | Main product data | `id`, `name`, `price`, `category_id`, `seller_id`, `approval_status` |
| `product_images` | Normalized images | `product_id`, `image_url`, `is_primary`, `sort_order` |
| `product_variants` | SKU-level inventory | `product_id`, `sku`, `variant_name`, `price`, `stock` |
| `product_assessments` | QA workflow state machine | `product_id`, `status`, `submitted_at`, `verified_at` |
| `product_approvals` | Approval audit records | `assessment_id`, `description`, `created_by` → `admins` |
| `product_rejections` | Rejection audit records | `assessment_id`, `product_id`, `description`, `created_by` → `admins` |
| `product_revisions` | Revision request records | `assessment_id`, `description`, `created_by` → `admins` |
| `product_assessment_logistics` | Sample logistics info | `assessment_id`, `details`, `created_by` → `admins` |
| `sellers` | Seller/store info | `id`, `store_name`, `owner_name`, `approval_status` |
| `categories` | Product categories | `id`, `name` |

### Assessment Status Flow (DB CHECK constraint)

```
pending_digital_review → waiting_for_sample → pending_physical_review → verified
                      ↘ for_revision                                  ↘ rejected
                      ↘ rejected
```

### Product approval_status Values (DB CHECK constraint)

`'pending'` | `'approved'` | `'rejected'` | `'reclassified'`

---

## 3. File Map

### Services
| File | Purpose |
|------|---------|
| `web/src/services/qaService.ts` (699 lines) | QA workflow DB operations, status mapping, CRUD for assessments |
| `mobile-app/src/services/qaService.ts` (703 lines) | Near-identical copy of web qaService |
| `web/src/services/productService.ts` | Product CRUD, images, variants, categories |
| `mobile-app/src/services/productService.ts` | Mirror of web productService |

### Stores (State Management)
| File | Purpose |
|------|---------|
| `web/src/stores/productQAStore.ts` (303 lines) | Zustand store for QA products, status transitions |
| `mobile-app/src/stores/productQAStore.ts` (278 lines) | Mobile QA store — **different API signature** |
| `web/src/stores/sellerStore.ts` | Seller product CRUD (addProduct at ~L904) |
| `mobile-app/src/stores/sellerStore.ts` | Mobile seller store (addProduct at ~L1050) |
| `mobile-app/src/stores/adminStore.ts` | Admin-side wrapper around productQAStore |

### Pages / Screens
| File | Purpose |
|------|---------|
| `web/src/pages/SellerProducts.tsx` | Seller product listing + AddProduct form |
| `web/src/pages/SellerProductStatus.tsx` (510 lines) | Seller QA status tracking |
| `web/src/pages/AdminProductApprovals.tsx` (1093 lines) | Admin QA review dashboard |
| `mobile-app/src/components/seller/AddProductScreen.tsx` | Mobile product creation |
| `mobile-app/app/admin/(tabs)/product-approvals.tsx` (970 lines) | Mobile admin QA review |

---

## 4. Issue Registry

### 🔴 CRITICAL (Blocks Core Functionality)

#### ISSUE-01: Mobile `addProduct` does NOT insert `product_images`
- **Location:** `mobile-app/src/stores/sellerStore.ts` ~L1050-1211
- **Problem:** Web's `addProduct` calls `productService.addProductImages()` (L968-985), but mobile skips this entirely.
- **Impact:** Products created on mobile have NO rows in `product_images`. QA review pages show placeholder images. The `getAllQAEntries` query joins `product_images` and returns empty arrays for mobile products.
- **Evidence:** Compare web L968-985 (has image insert) vs mobile L1050-1211 (no image insert call).

#### ISSUE-02: `transformToLegacy` uses `product.name` as `vendor` instead of seller name
- **Location:** `web/src/services/qaService.ts` L165
- **Code:** `vendor: assessment.product?.name || 'Unknown'`
- **Problem:** The `vendor` field shows the **product** name (e.g., "Wireless Earbuds") instead of the **seller/store** name (e.g., "Tech Haven").
- **Root cause:** The Supabase query joins `products` but does NOT join `sellers`. No access to `sellers.store_name`.
- **Impact:** All QA pages display product name where seller name should appear.

#### ISSUE-03: `getQAEntriesBySeller` PostgREST nested filter may silently fail
- **Location:** `web/src/services/qaService.ts` L393
- **Code:** `.eq('product.seller_id', sellerId)`
- **Problem:** PostgREST nested filters (filtering on a joined table column) can behave unexpectedly — they may return ALL records with the joined row as `null` rather than filtering them out. The correct approach is to use an RPC or filter after fetching.
- **Impact:** Seller may see other sellers' products in their QA status page, or get empty results.

#### ISSUE-04: N+1 Query Problem in `transformToLegacy`
- **Location:** `web/src/services/qaService.ts` L129-168
- **Problem:** Each `transformToLegacy` call makes **3 separate DB queries** (logistics, rejections, revisions). When loading all assessments, `Promise.all(assessments.map(a => this.transformToLegacy(a)))` makes **3N queries** for N assessments.
- **Impact:** Severe performance degradation. 20 assessments = 60 additional queries. Admin page load could take 5-10+ seconds.

#### ISSUE-05: No unique constraint on `product_assessments.product_id`
- **Location:** Database schema
- **Problem:** Multiple assessments can be created for the same product. Both `createQAEntry` and `updateQAStatus` use `.eq('product_id', productId).single()` which will fail (PGRST116) if duplicates exist.
- **Impact:** If a product is added to QA twice (e.g., retry after error), all subsequent operations will fail.

### 🟡 HIGH (Causes Incorrect Behavior)

#### ISSUE-06: API signature mismatch — `addProductToQA` web vs mobile
- **Location:** 
  - Web: `web/src/stores/productQAStore.ts` L59 — `addProductToQA(productData: Omit<QAProduct, ...>)` (object)
  - Mobile: `mobile-app/src/stores/productQAStore.ts` L52 — `addProductToQA(productId, vendorName, sellerId?)` (3 args)
- **Problem:** Different function signatures for the same logical operation. Makes shared testing impossible.
- **Impact:** Maintenance burden, divergent behavior.

#### ISSUE-07: `createQAEntry` discards `sellerId` parameter
- **Location:** `web/src/services/qaService.ts` L335-360
- **Code:** `sellerId` param is received but never used in the insert.
- **Problem:** The `product_assessments` table has `created_by` (FK → auth.users) and `assigned_to` (FK → auth.users) but neither is set.
- **Impact:** No audit trail. Cannot query "who created this assessment" or "who is assigned to review this".

#### ISSUE-08: Orphan products when QA creation fails
- **Location:** 
  - Web: `web/src/stores/sellerStore.ts` L1127-1142
  - Mobile: `mobile-app/src/stores/sellerStore.ts` L1196-1203
- **Code:** `catch (qaError) { console.error("Error adding product to QA flow:", qaError); }`
- **Problem:** Product is successfully created in `products` table, but if QA entry creation fails, the product exists without any assessment. It's invisible to the QA flow and stuck in `approval_status: 'pending'` forever.
- **Impact:** Ghost products that can never be approved.

#### ISSUE-09: `QAProduct.id` semantics differ between web and mobile
- **Location:**
  - Web: `id` = `product_id` (the product's UUID)  
  - Mobile: `id` = assessment UUID, separate `productId` field for product UUID
- **Problem:** Status transition methods use `find(p => p.id === productId)` — works differently per platform.
- **Impact:** Mobile status transitions may target wrong records.

#### ISSUE-10: Mobile has no `syncToSellerStore`
- **Location:** `mobile-app/src/stores/productQAStore.ts` — no `syncToSellerStore` function
- **Problem:** When admin changes QA status on mobile, the seller's local product store doesn't update `approvalStatus`.
- **Impact:** Seller sees stale `approval_status` in their product list on mobile until they refresh.

### 🟢 MEDIUM (Quality / Maintenance)

#### ISSUE-11: Mock data persists in web `productQAStore`
- **Location:** `web/src/stores/productQAStore.ts` L62-103
- **Problem:** 4 hardcoded fake products (`PROD-001` through `PROD-004`) are initial state. Persisted to `localStorage` as `bazaarx-product-qa-shared`. If DB load fails, stale mock data remains visible.
- **Impact:** Admin may see fake products in QA dashboard.

#### ISSUE-12: Mobile categories hardcoded in `AddProductScreen`
- **Location:** `mobile-app/src/components/seller/AddProductScreen.tsx` ~L80
- **Problem:** Category list is hardcoded (Electronics, Fashion, Beauty, etc.) instead of fetched from `categories` table like web does.
- **Impact:** Categories may be out of sync with database.

#### ISSUE-13: Legacy UPPERCASE status used throughout UI
- **Location:** All store files, all page components
- **Problem:** UI uses `PENDING_DIGITAL_REVIEW`, DB uses `pending_digital_review`. Relies on bidirectional mapping layer.
- **Impact:** Extra complexity, potential mapping bugs.

#### ISSUE-14: `SellerProductListings.tsx` is pure mock data
- **Location:** `web/src/pages/SellerProductListings.tsx`
- **Problem:** Entire page uses hardcoded mock data, not connected to DB.
- **Impact:** Non-functional page. Low priority if it's an intentional demo.

#### ISSUE-15: `product_images.image_url` has CHECK constraint `~ '^https?://'`
- **Location:** Database schema
- **Problem:** If mobile sends local file URIs (`file:///...`) or base64 data URIs, the insert will fail with a constraint violation.
- **Impact:** Product creation may fail silently if images aren't uploaded to storage first.

---

## 5. Fix Plan (Prioritized)

### Phase 1: Critical Database & Backend Fixes (Must Do First)

| # | Fix | Files | Effort |
|---|-----|-------|--------|
| F1 | Add unique constraint on `product_assessments.product_id` to prevent duplicates | Migration SQL | 10 min |
| F2 | Fix `transformToLegacy` N+1 queries — join logistics/rejections/revisions in main query | `qaService.ts` (web + mobile) | 1 hr |
| F3 | Fix `vendor` field — add `sellers` join to QA queries, use `seller.store_name` | `qaService.ts` (web + mobile) | 30 min |
| F4 | Fix `getQAEntriesBySeller` — filter after fetch instead of nested PostgREST filter | `qaService.ts` (web + mobile) | 30 min |
| F5 | Set `created_by` in `createQAEntry` for audit trail | `qaService.ts` (web + mobile) | 15 min |

### Phase 2: Mobile Parity Fixes

| # | Fix | Files | Effort |
|---|-----|-------|--------|
| F6 | Add `product_images` insertion to mobile `addProduct` | `mobile-app/src/stores/sellerStore.ts` | 30 min |
| F7 | Unify `addProductToQA` signature (use object pattern on both platforms) | `mobile-app/src/stores/productQAStore.ts`, `mobile-app/src/stores/sellerStore.ts` | 45 min |
| F8 | Fix `QAProduct.id` semantics — make both platforms use `product_id` as `id` | `mobile-app/src/stores/productQAStore.ts` | 30 min |
| F9 | Add `syncToSellerStore` to mobile QA store | `mobile-app/src/stores/productQAStore.ts` | 30 min |
| F10 | Fetch categories from DB in mobile `AddProductScreen` | `mobile-app/src/components/seller/AddProductScreen.tsx` | 30 min |

### Phase 3: Reliability & Quality Fixes

| # | Fix | Files | Effort |
|---|-----|-------|--------|
| F11 | Handle orphan products — retry QA creation or rollback product | `sellerStore.ts` (web + mobile) | 45 min |
| F12 | Remove mock `initialProducts` from web QA store | `web/src/stores/productQAStore.ts` | 15 min |
| F13 | Add `upsert` logic to `createQAEntry` to handle re-submissions | `qaService.ts` (web + mobile) | 20 min |
| F14 | Validate image URLs before inserting into `product_images` | `sellerStore.ts` (web + mobile) | 15 min |

---

## 6. Implementation Details per Fix

### F1: Unique Constraint on `product_assessments.product_id`

```sql
-- Migration: 009_unique_product_assessment.sql
-- Deduplicate existing assessments first (keep latest)
DELETE FROM product_assessments a
USING product_assessments b
WHERE a.product_id = b.product_id
  AND a.created_at < b.created_at;

-- Add unique constraint
ALTER TABLE product_assessments
ADD CONSTRAINT product_assessments_product_id_unique UNIQUE (product_id);
```

### F2: Fix N+1 Query — Join Related Tables

Replace `transformToLegacy` with an enriched query that fetches everything in one call:

```typescript
// In getAllQAEntries / getQAEntriesBySeller:
const { data, error } = await supabase
  .from('product_assessments')
  .select(`
    *,
    product:products (
      id, name, description, price, category_id, seller_id,
      variant_label_1, variant_label_2,
      category:categories (name),
      images:product_images (image_url, is_primary),
      variants:product_variants (id, variant_name, sku, size, color, price, stock, thumbnail_url),
      seller:sellers (store_name, owner_name)
    ),
    logistics:product_assessment_logistics (details),
    approvals:product_approvals (description, created_at),
    rejections:product_rejections (description, vendor_submitted_category, admin_reclassified_category),
    revisions:product_revisions (description)
  `)
  .order('created_at', { ascending: false });
```

Then `transformToLegacy` becomes a simple mapper with NO additional queries:

```typescript
private transformToLegacySync(assessment: any): QAProductDB {
  const logistics = assessment.logistics?.[0]?.details || null;
  const rejection = assessment.rejections?.[0] || null;
  const revision = assessment.revisions?.[0] || null;
  const legacyStatus = NEW_TO_LEGACY_STATUS[assessment.status] || 'PENDING_DIGITAL_REVIEW';
  
  return {
    id: assessment.id,
    product_id: assessment.product_id,
    vendor: assessment.product?.seller?.store_name || assessment.product?.seller?.owner_name || 'Unknown Vendor',
    status: legacyStatus,
    logistics,
    rejection_reason: rejection?.description || revision?.description || null,
    // ... rest of mapping
  };
}
```

### F3: Fix vendor field (included in F2)

The enriched query from F2 adds `seller:sellers (store_name, owner_name)` to the product join. Then use `assessment.product?.seller?.store_name` instead of `assessment.product?.name`.

### F4: Fix `getQAEntriesBySeller` filter

```typescript
async getQAEntriesBySeller(sellerId: string): Promise<QAProductDB[]> {
  // Fetch all assessments with full joins
  const { data, error } = await supabase
    .from('product_assessments')
    .select(`
      *,
      product:products!inner (
        id, name, description, price, category_id, seller_id,
        variant_label_1, variant_label_2,
        category:categories (name),
        images:product_images (image_url, is_primary),
        variants:product_variants (id, variant_name, sku, size, color, price, stock, thumbnail_url),
        seller:sellers (store_name, owner_name)
      ),
      logistics:product_assessment_logistics (details),
      approvals:product_approvals (description, created_at),
      rejections:product_rejections (description, vendor_submitted_category, admin_reclassified_category),
      revisions:product_revisions (description)
    `)
    .eq('product.seller_id', sellerId)  // !inner makes this a proper filter
    .order('created_at', { ascending: false });
```

**Key change:** Use `products!inner` instead of `products` — the `!inner` modifier converts the left join to an inner join, making the `.eq()` filter work correctly and exclude non-matching rows.

### F5: Set `created_by` in `createQAEntry`

```typescript
async createQAEntry(
  productId: string,
  vendorName: string,
  sellerId: string
): Promise<QAProductDB | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('product_assessments')
    .insert({
      product_id: productId,
      status: 'pending_digital_review',
      submitted_at: new Date().toISOString(),
      created_by: user?.id || null,  // ← Add this
    })
    .select()
    .single();
  // ...
}
```

### F6: Add `product_images` insertion to mobile

In `mobile-app/src/stores/sellerStore.ts`, after product creation (~L1100), add:

```typescript
// Insert product images (MISSING on mobile)
if (product.images && product.images.length > 0) {
  const validImages = product.images.filter(
    (url: string) => url && url.trim().length > 0 && /^https?:\/\//.test(url)
  );
  if (validImages.length > 0) {
    try {
      await productService.addProductImages(
        newProduct.id,
        validImages.map((url: string, idx: number) => ({
          product_id: newProduct.id,
          alt_text: '',
          image_url: url,
          sort_order: idx,
          is_primary: idx === 0,
        })),
      );
    } catch (imgError) {
      console.error('Error adding product images:', imgError);
    }
  }
}
```

### F7: Unify `addProductToQA` signature

Change mobile to match web's object-based pattern:

```typescript
// mobile-app/src/stores/productQAStore.ts
addProductToQA: async (productData: { id: string; name: string; vendor: string; sellerId?: string; price: number; category: string; image?: string }) => {
  set({ isLoading: true });
  try {
    if (!productData.id || !productData.name) {
      throw new Error('Product data is incomplete');
    }
    
    const exists = get().products.find(p => p.productId === productData.id);
    if (exists) {
      console.warn(`Product ${productData.id} already in QA`);
      return;
    }

    const entry = await qaService.createQAEntry(
      productData.id,
      productData.vendor,
      productData.sellerId || 'unknown'
    );
    if (!entry) throw new Error('Failed to create QA entry');
    await get().loadProducts();
  } catch (error) {
    // ...
  }
},
```

Update the call site in `mobile-app/src/stores/sellerStore.ts`:

```typescript
await qaStore.addProductToQA({
  id: newProduct.id,
  name: newProduct.name,
  vendor: authStoreState.seller?.store_name || 'Unknown Vendor',
  sellerId: authStoreState.seller?.id,
  price: newProduct.price,
  category: newProduct.category,
  image: newProduct.images?.[0] || 'https://placehold.co/100?text=Product',
});
```

### F11: Handle Orphan Products

```typescript
// In addProduct, wrap QA creation with retry logic:
let qaCreated = false;
for (let attempt = 0; attempt < 3 && !qaCreated; attempt++) {
  try {
    const qaStore = useProductQAStore.getState();
    await qaStore.addProductToQA({ ... });
    qaCreated = true;
  } catch (qaError) {
    console.error(`QA creation attempt ${attempt + 1} failed:`, qaError);
    if (attempt === 2) {
      // Final fallback: delete the orphan product
      console.error('All QA creation attempts failed, cleaning up product');
      await productService.deleteProduct(newProduct.id);
      throw new Error('Failed to create product QA entry after 3 attempts');
    }
    await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
  }
}
```

### F12: Remove Mock Data

```typescript
// web/src/stores/productQAStore.ts
// BEFORE:
const initialProducts: QAProduct[] = [ /* 4 mock items */ ];
// ...
products: initialProducts,

// AFTER:
products: [] as QAProduct[],
```

### F13: Upsert for `createQAEntry`

```typescript
const { data, error } = await supabase
  .from('product_assessments')
  .upsert(
    {
      product_id: productId,
      status: 'pending_digital_review',
      submitted_at: new Date().toISOString(),
      created_by: user?.id || null,
    },
    { onConflict: 'product_id' }  // Requires F1 unique constraint
  )
  .select()
  .single();
```

---

## 7. Testing Strategy

A test script (`test-qa-process.mjs`) is provided alongside this document. It covers:

1. **Product Creation Tests**
   - Create product with all required fields
   - Verify product exists in `products` table
   - Verify `product_images` records created
   - Verify `product_variants` records created
   - Verify `product_assessments` record created with `pending_digital_review`

2. **QA Status Transition Tests**
   - `pending_digital_review` → `waiting_for_sample` (admin approve digital)
   - `waiting_for_sample` → `pending_physical_review` (seller submit sample)
   - `pending_physical_review` → `verified` (admin pass QA)
   - `pending_digital_review` → `rejected` (admin reject)
   - `pending_digital_review` → `for_revision` (admin request revision)
   - Invalid transitions are blocked

3. **Admin Review Tests**
   - All assessments load for admin (no seller filter)
   - Seller-filtered assessments only show that seller's products
   - Approval/rejection records created in audit tables
   - Product `approval_status` synced correctly

4. **Data Integrity Tests**
   - No orphan products (product without assessment)
   - No duplicate assessments per product
   - All FK relationships valid
   - Status values match CHECK constraints

5. **Query Performance Tests**
   - `getAllQAEntries` executes in < 2 seconds
   - `getQAEntriesBySeller` returns correct filtered set
   - `transformToLegacy` doesn't make N+1 queries (after fix)

---

## Appendix: Quick Reference

### Status Mapping (Legacy ↔ DB)

| Legacy (UI) | Database | Description |
|-------------|----------|-------------|
| `PENDING_DIGITAL_REVIEW` | `pending_digital_review` | Awaiting admin to review digital submission |
| `WAITING_FOR_SAMPLE` | `waiting_for_sample` | Digital approved, seller must send sample |
| `IN_QUALITY_REVIEW` | `pending_physical_review` | Sample received, admin doing physical QA |
| `ACTIVE_VERIFIED` | `verified` | Passed all QA, product live |
| `FOR_REVISION` | `for_revision` | Admin requested changes |
| `REJECTED` | `rejected` | Failed QA |

### Product `approval_status` Mapping

| Assessment Status | Product approval_status |
|-------------------|------------------------|
| `pending_digital_review` | `pending` |
| `waiting_for_sample` | `pending` |
| `pending_physical_review` | `pending` |
| `verified` | `approved` |
| `for_revision` | `pending` |
| `rejected` | `rejected` |
