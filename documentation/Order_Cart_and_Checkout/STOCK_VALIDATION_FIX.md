# Mobile Stock Validation Implementation Plan

**Date:** March 5, 2026  
**Status:** ✅ Implemented

---

## Executive Summary

This document outlines the implementation of stock validation fixes for the mobile app's buyer flow - specifically for Add to Cart, Buy Now, Cart, and Checkout processes.

**Problem:** Users could add out-of-stock items to cart and proceed to checkout even when variants were unavailable, because stock validation was incomplete or missing in certain scenarios.

---

## Issues Identified

| # | Issue | Location |
|---|-------|----------|
| 1 | Variant stock not validated in VariantSelectionModal | `mobile-app/src/components/VariantSelectionModal.tsx` |
| 2 | Product stock not checked on main ProductDetailScreen | `mobile-app/app/ProductDetailScreen.tsx` |
| 3 | Checkout skipped validation for products without variants | `mobile-app/src/services/checkoutService.ts` |
| 4 | No explicit error when variant not found during checkout | `mobile-app/src/services/checkoutService.ts` |

---

## Implementation Details

### Fix 1: VariantSelectionModal Stock Validation

**File:** `mobile-app/src/components/VariantSelectionModal.tsx`

**Changes:**
- Added `isOutOfStock` check using `activeVariantInfo.stock`
- Added `canConfirm` variable that combines selection validity AND stock availability
- Button disabled when variant is out of stock
- Button text changes to "Out of Stock" when unavailable

**Code:**
```typescript
const isOutOfStock = Number(activeVariantInfo.stock || 0) <= 0;
const canConfirm = isSelectionValid && !isOutOfStock;
```

**Performance:** Uses existing `activeVariantInfo` which is already memoized with `useMemo` - no performance impact.

---

### Fix 2: ProductDetailScreen Stock Validation

**File:** `mobile-app/app/ProductDetailScreen.tsx`

**Changes:**
- Added `hasAnyStock` variable to check if product has stock (from variants OR base product)
- Added `disabledBtn` style for disabled state
- Main Add to Cart and Buy Now buttons disabled when product has no stock
- Button text changes to "Out of Stock" when unavailable

**Code:**
```typescript
const hasAnyStock = productVariants.some((v: any) => Number(v.stock || 0) > 0) || Number(product.stock || 0) > 0;
```

**Performance:** Simple `.some()` on array - minimal performance impact.

---

### Fix 3: Checkout Stock Validation - Products Without Variants

**File:** `mobile-app/src/services/checkoutService.ts`

**Changes:**
- Added batch query for base product stock (for products without variants)
- Fixed validation logic to properly handle both:
  - Products WITH variants (validate against variant stock)
  - Products WITHOUT variants (validate against base product stock)
- Added explicit error when variant not found

**Code:**
```typescript
// Fetch both variants AND base product stock
let allProducts: { id: string; stock: number }[] = [];
const { data: productsData } = await supabase
    .from('products')
    .select('id, stock')
    .in('id', productIdsForStock);

// Validation for products without variants
if (productStock < item.quantity) {
    throw new Error(`Insufficient stock for ${item.name}. Only ${productStock} available.`);
}
```

**Performance:** Still uses batch queries (`.in()`) - O(1) database round-trip, matches Priority 2A of performance optimizations.

---

### Fix 4: Checkout Explicit Error for Missing Variants

**File:** `mobile-app/src/services/checkoutService.ts`

**Changes:**
- Added explicit check when variantId is provided but variant not found in database
- Throws clear error message instead of silently failing

**Code:**
```typescript
if (!selectedVariant) {
    console.warn(`[Checkout] Variant ${item.selectedVariant.variantId} not found for product ${item.name}`);
    throw new Error(`Selected variant for "${item.name}" is no longer available. Please remove and re-add to cart.`);
}
```

---

## User Flow After Fixes

### Scenario: User adds item to cart with 1 stock, someone else buys it

1. **Product Detail Page:**
   - If product has NO stock: Buttons disabled, shows "Out of Stock"
   - If product has variants with stock: Works normally

2. **Variant Selection Modal:**
   - If selected variant has NO stock: Confirm button disabled, shows "Out of Stock"
   - If variant has stock: Works normally

3. **Cart Screen:**
   - User sees items in cart (may show stale data)

4. **Checkout:**
   - System fetches LATEST stock from database
   - If variant out of stock: Error thrown - "Insufficient stock"
   - If product out of stock: Error thrown - "Insufficient stock"
   - Cannot complete checkout for unavailable items

---

## Compliance with Performance Optimizations

### MOBILE_PERFORMANCE_OPTIMIZATION.md (Priority 2A)

| Requirement | Status |
|-------------|--------|
| Batch N+1 queries in checkout | ✅ Still using single `.in()` query |
| O(1) database round-trips | ✅ Maintained |

**Verdict:** ✅ **Complies** - Stock validation still uses batch queries

---

### PERFORMANCE_OPTIMIZATION_PLAN.md

| Requirement | Status |
|-------------|--------|
| UseMemo for expensive calculations | ✅ `activeVariantInfo` already memoized |
| Batch queries for stock validation | ✅ Maintained |

**Verdict:** ✅ **Complies** - No new performance issues introduced

---

### ai_standard.md

| Requirement | Status |
|-------------|--------|
| Input Validation | ✅ Stock validation added |
| Error Handling | ✅ Clear error messages thrown |
| Data Integrity | ✅ Stock validated at checkout |

**Verdict:** ✅ **Complies** - Improves security and data integrity

---

## Files Modified

| File | Changes |
|------|---------|
| `mobile-app/src/components/VariantSelectionModal.tsx` | Stock validation in modal |
| `mobile-app/app/ProductDetailScreen.tsx` | Stock validation on product page |
| `mobile-app/src/services/checkoutService.ts` | Stock validation at checkout |

---

## Testing Checklist

- [ ] Add to Cart disabled when product out of stock
- [ ] Buy Now disabled when product out of stock  
- [ ] Variant modal shows "Out of Stock" for out-of-stock variants
- [ ] Cannot checkout with out-of-stock variant (someone else bought it)
- [ ] Cannot checkout with out-of-stock non-variant product
- [ ] Clear error messages shown when stock insufficient

---

**Last Updated:** March 5, 2026  
**Version:** 1.0.0
