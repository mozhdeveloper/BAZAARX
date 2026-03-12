# Web Stock Validation Fix - Implementation Plan

> **Date:** March 12, 2026  
> **Status:** ✅ Implemented

---

## Executive Summary

Fix 3 gaps in web stock validation to match mobile's defense-in-depth approach:
1. ProductDetailPage - Add to Cart button not disabled when out of stock
2. ShopPage - Shows "Out of stock" but still allows adding to cart
3. checkoutService - Doesn't validate base product stock (non-variants)

---

## Pre-Action Compliance

### ai_standard.md

| Requirement | How This Plan Addresses |
|-------------|------------------------|
| Performance & Optimization | Using existing data (`getSelectedVariant()`, `totalStock`) - no new queries |
| Security & Data Integrity | Server-side checkout validation preserved; UI blocking is additive |
| Resilience & Error Handling | Checkout already throws; UI now prevents user frustration |
| Maintainability & Code Quality | Following existing patterns (matching Buy Now implementation) |

### web_performance_optimization_plan.md

- No N+1 queries - Using existing memoized data
- No new `useMemo` needed - Inline logic consistent with existing code
- No re-render issues - Adding `disabled` prop doesn't cause re-renders

### web_lazy_loading_plan.md

- **No impact** - Changes are to existing button components

---

## Fix 1: ProductDetailPage - Add to Cart Button

**File:** `web/src/pages/ProductDetailPage.tsx`

**Lines:** ~1068-1074

### Current Code

```tsx
<Button
    onClick={handleAddToCart}
    className="flex-1 h-14 rounded-2xl bg-white hover:bg-[var(--brand-wash)] text-[var(--brand-primary)] border border-[var(--brand-primary)] text-base font-bold transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
>
    <ShoppingCart className="w-5 h-5" />
    Add to Cart
</Button>
```

### Changes Required

1. Add `disabled` prop using same stock check as Buy Now (lines 1078-1082)
2. Add conditional button text: "Add to Cart" vs "Out of Stock"
3. Add disabled styling class

### Target Code

```tsx
<Button
    onClick={handleAddToCart}
    disabled={(() => {
        const currentVariant = getSelectedVariant();
        const stockQty = currentVariant?.stock ?? normalizedProduct?.stock ?? 0;
        return stockQty === 0;
    })()}
    className="flex-1 h-14 rounded-2xl bg-white hover:bg-[var(--brand-wash)] text-[var(--brand-primary)] border border-[var(--brand-primary)] text-base font-bold transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
>
    <ShoppingCart className="w-5 h-5" />
    {(() => {
        const currentVariant = getSelectedVariant();
        const stockQty = currentVariant?.stock ?? normalizedProduct?.stock ?? 0;
        return stockQty > 0 ? "Add to Cart" : "Out of Stock";
    })()}
</Button>
```

---

## Fix 2: ShopPage - Add to Cart Stock Check

**File:** `web/src/pages/ShopPage.tsx`

**Lines:** ~1198-1219

### Current Code

```tsx
if (hasVariants || hasColors || hasSizes) {
    setVariantProduct(product);
    setIsBuyNowAction(false);
    setShowVariantModal(true);
    return;
}

addToCart(product as any);
```

### Changes Required

1. Calculate totalStock before adding
2. If totalStock === 0, show toast and return early

### Target Code

```tsx
if (hasVariants || hasColors || hasSizes) {
    setVariantProduct(product);
    setIsBuyNowAction(false);
    setShowVariantModal(true);
    return;
}

const totalStock = product.variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || product.stock || 0;

if (totalStock === 0) {
    toast({
        title: "Out of Stock",
        description: "This product is currently unavailable.",
        variant: "destructive",
    });
    return;
}

addToCart(product as any);
```

---

## Fix 3: CheckoutService - Base Product Stock Validation

**File:** `web/src/services/checkoutService.ts`

**Lines:** ~86-120

### Current Code

```typescript
// Stock validation: all products in parallel (was a sequential for-loop)
const stockValidationResults = await Promise.all(
    items.map(async (item) => {
        if (!item.product_id) return { item, variant: null };
        const { data: variants } = await supabase
            .from('product_variants')
            .select('id, stock, sku, variant_name, price')
            .eq('product_id', item.product_id);
        const variantsList = variants || [];
        const selectedVar = item.selected_variant as any;
        const variant = selectedVar
            ? (variantsList.find(v => v.id === selectedVar.id) ||
                variantsList.find(v => v.sku === selectedVar.sku) ||
                variantsList.find(v => v.variant_name === selectedVar.name))
            : variantsList[0];
        return { item, variant: variant || null };
    })
);

// Validate stock and attach resolved variant IDs (reuse fetched data — no re-fetch later)
const resolvedStockMap = new Map<string, number>(); // variantId -> current stock
for (const { item, variant } of stockValidationResults) {
    if (variant) {
        if (variant.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${variant.variant_name || 'product'}.`);
        }
        (item as any).resolved_variant_id = variant.id;
        resolvedStockMap.set(variant.id, variant.stock);
    }
    // ❌ Missing: else clause for base product stock validation
}
```

### Changes Required

1. Batch query base product stock alongside variants
2. Add else clause to validate products without variants

### Target Code

```typescript
// Stock validation: all products in parallel (was a sequential for-loop)
const stockValidationResults = await Promise.all(
    items.map(async (item) => {
        if (!item.product_id) return { item, variant: null };
        const { data: variants } = await supabase
            .from('product_variants')
            .select('id, stock, sku, variant_name, price')
            .eq('product_id', item.product_id);
        const variantsList = variants || [];
        const selectedVar = item.selected_variant as any;
        const variant = selectedVar
            ? (variantsList.find(v => v.id === selectedVar.id) ||
                variantsList.find(v => v.sku === selectedVar.sku) ||
                variantsList.find(v => v.variant_name === selectedVar.name))
            : variantsList[0];
        return { item, variant: variant || null };
    })
);

// Batch query base product stock for products without variants
const productIds = [...new Set(items.map(item => item.product_id).filter(Boolean))];
const { data: productsData } = await supabase
    .from('products')
    .select('id, stock')
    .in('id', productIds);

const productStockMap = new Map<string, number>();
productsData?.forEach(p => productStockMap.set(p.id, p.stock || 0));

// Validate stock and attach resolved variant IDs (reuse fetched data — no re-fetch later)
const resolvedStockMap = new Map<string, number>(); // variantId -> current stock
for (const { item, variant } of stockValidationResults) {
    if (variant) {
        if (variant.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${item.name}. Only ${variant.stock} available.`);
        }
        (item as any).resolved_variant_id = variant.id;
        resolvedStockMap.set(variant.id, variant.stock);
    } else {
        // Validate base product stock (for products without variants)
        const productStock = productStockMap.get(item.product_id) || 0;
        if (productStock < item.quantity) {
            throw new Error(`Insufficient stock for ${item.name}. Only ${productStock} available.`);
        }
    }
}
```

---

## Testing Checklist

- [ ] ProductDetailPage: Add to Cart disabled when product out of stock
- [ ] ProductDetailPage: Button shows "Out of Stock" text when unavailable
- [ ] ShopPage: Cannot add out-of-stock product to cart (toast shown)
- [ ] Checkout: Fails with clear error for out-of-stock non-variant products
- [ ] Checkout: Maintains batch query pattern (no N+1 regression)
- [ ] No existing tests broken

---

## Files to Modify

| File | Changes |
|------|---------|
| `web/src/pages/ProductDetailPage.tsx` | Add disabled + text change to Add to Cart button |
| `web/src/pages/ShopPage.tsx` | Add stock check before addToCart |
| `web/src/services/checkoutService.ts` | Add base product stock validation |

---

## Comparison: Mobile vs Web After Fix

| Feature | Mobile | Web (After Fix) |
|---------|--------|-----------------|
| Add to Cart disabled (out of stock) | ✅ | ✅ |
| Buy Now disabled (out of stock) | ✅ | ✅ |
| Shows "Out of Stock" text | ✅ | ✅ |
| Checkout validates variants | ✅ | ✅ |
| Checkout validates base products | ✅ | ✅ |
| Defense-in-depth | ✅ | ✅ |

---

**Ready for implementation**
