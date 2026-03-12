# Fix: Add to Cart with Zero Quantity Bug

> **Date:** March 12, 2026  
> **Status:** ✅ Implemented

---

## Problem

There are two locations where quantity could become 0, causing database constraint violations:

### Issue 1: ProductDetailPage
When a user views a product that has **0 stock**, the `ProductDetailPage` sets `quantity = 0`:

```typescript
if (maxStock === 0) {
    setQuantity(0);
}
```

### Issue 2: VariantSelectionModal
When switching between variants in the variant modal:

```typescript
// Original buggy code
if (quantity > matchedVariant.stock) {
    setQuantity(Math.min(1, matchedVariant.stock));  // If stock=0, sets qty to 0!
}
```

Then when the user clicks **Add to Cart**, it passes `quantity = 0` to `cartService.addToCart()`, which violates the database constraint `cart_items_quantity_check`.

### Error
```
new row for relation "cart_items" violates check constraint "cart_items_quantity_check"
```

---

## Solution

1. **ProductDetailPage**: Add stock check in `handleAddToCart` to prevent adding when stock is 0
2. **VariantSelectionModal**: Fix quantity reset logic to always reset to at least 1

---

## Implementation Plan

### Fix 1: ProductDetailPage

**File:** `web/src/pages/ProductDetailPage.tsx`

**Location:** `handleAddToCart` function (~line 404)

```typescript
// Stock validation - prevent adding out of stock items
const currentVariant = getSelectedVariant();
const stockQty = currentVariant?.stock ?? normalizedProduct?.stock ?? 0;

if (stockQty === 0) {
    toast({
        title: "Out of Stock",
        description: "This product is currently unavailable.",
        variant: "destructive",
    });
    return;
}
```

---

### Fix 2: VariantSelectionModal

**File:** `web/src/components/ui/variant-selection-modal.tsx`

**Location:** Line ~177-180

**Before:**
```typescript
// Reset quantity if exceeds stock
if (quantity > matchedVariant.stock) {
    setQuantity(Math.min(1, matchedVariant.stock));
}
```

**After:**
```typescript
// Reset quantity if exceeds stock or if stock is 0
if (quantity > matchedVariant.stock || matchedVariant.stock === 0) {
    setQuantity(Math.max(1, matchedVariant.stock));
}
```

---

## Compliance Check

### ai_standard.md

| Requirement | How This Addresses |
|-------------|-------------------|
| Input Validation | ✅ Validates stock before proceeding |
| Error Handling | ✅ Shows user-friendly toast instead of DB error |
| Resilience | ✅ Prevents invalid cart operations |

### web_performance_optimization_plan.md

- No new queries - uses existing data
- No re-render issues - simple logic changes

---

## Testing Checklist

- [ ] ProductDetailPage: Add to Cart on out-of-stock product shows toast error
- [ ] ProductDetailPage: Add to Cart on in-stock product still works
- [ ] Variant modal: Quantity resets to 1 when switching from out-of-stock to in-stock variant
- [ ] Variant modal: Quantity is 1 when selecting in-stock variant (not stuck at 0)
- [ ] No more constraint violation errors in console

---

## Files Modified

| File | Changes |
|------|---------|
| `web/src/pages/ProductDetailPage.tsx` | Add stock check in `handleAddToCart` |
| `web/src/components/ui/variant-selection-modal.tsx` | Fix quantity reset logic |

---

**Implemented**
