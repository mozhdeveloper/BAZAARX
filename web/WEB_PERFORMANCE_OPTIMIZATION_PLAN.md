# Web Performance Optimization Plan

> **Scope:** Buyer flow (Shop → Product → Cart → Checkout → Orders) and Seller pages (Dashboard → Products → Orders → Analytics)
> **Audit Date:** March 4, 2026
> **Status:** Ready to implement — prioritized by user-facing lag impact

---

## Summary of Issues Found

| Priority | File | Issue | Impact |
|---|---|---|---|
| 🔴 HIGH | `SellerOrders.tsx` | All filter/sort/paginate in render body, no `useMemo` | Every keystroke re-filters all orders |
| 🔴 HIGH | `SellerProducts.tsx` | `filteredProducts` not memoized, no `useCallback` | Full re-filter on every state change |
| 🔴 HIGH | `ShopPage.tsx` | O(n×m) category count inside `.map()` in JSX | 30k iterations per render with large catalog |
| 🔴 HIGH | `OrdersPage.tsx` | `.filter().sort()` in render body, no `useMemo` | Re-sorts full order list on every render |
| 🔴 HIGH | `web/productService.ts` | Zero query-level caching | Fresh Supabase fetch on every page visit |
| 🔴 HIGH | `web/orderService.ts` | Zero query-level caching | Fresh DB fetch on every navigation |
| 🟡 MEDIUM | `EnhancedCartPage.tsx` | `groups.sort()` with `Math.max(...items.map())` in comparator, not memoized | O(n log n × m) per render |
| 🟡 MEDIUM | `CheckoutPage.tsx` | `paymentMethods.filter()` called twice in JSX, no memoization | Redundant filtering in render |
| 🟡 MEDIUM | `ProductDetailPage.tsx` | All handlers missing `useCallback` | Unnecessary child re-renders on every update |
| 🟡 MEDIUM | `SellerAnalytics.tsx` | Only `useState` imported — no `useMemo` for chart data | Chart data recomputed on every render |
| 🟢 LOW | `ProductCard.tsx` | Not wrapped in `React.memo` | Re-renders on every parent update in product grids |
| 🟢 LOW | `StoreCard.tsx` / `CollectionCard.tsx` | Not wrapped in `React.memo` | Re-renders in shop/stores/collections lists |
| 🟢 LOW | `ShopPage.tsx` | No search input debounce | Filter triggers on every keystroke |
| 🟢 LOW | Various | `useCallback` missing on handlers passed into mapped lists | New function references cause child re-renders |

---

## HIGH Priority — Fix First

### 1. `SellerOrders.tsx` — Memoize All Derived Order Data

**Problem:** Everything is computed inline in the render function body — no `useMemo` anywhere. On every keystroke, modal state change, or any re-render, the entire pipeline runs:
```
orders.filter() → baseFilteredOrders
baseFilteredOrders.filter() × 3 (tab counts)
baseFilteredOrders.filter() → filteredOrders
filteredOrders.slice() → paginatedOrders
orders.filter() × 3 (orderStats: pending, delivered, posToday)
```
That's **8 separate `.filter()` passes** on every render.

**Fix:**
```tsx
// Add useMemo to import
import { useState, useEffect, useRef, useMemo } from "react";

// Memoize baseFilteredOrders
const baseFilteredOrders = useMemo(() =>
  orders.filter((order) => {
    /* existing date/search/status logic */
  }),
  [orders, searchQuery, filterStatus, dateRange]
);

// Memoize channel counts
const channelCounts = useMemo(() => ({
  all: baseFilteredOrders.length,
  online: baseFilteredOrders.filter((o) => o.type === "ONLINE").length,
  pos: baseFilteredOrders.filter((o) => o.type === "OFFLINE").length,
}), [baseFilteredOrders]);

// Memoize filteredOrders (after channel filter)
const filteredOrders = useMemo(() =>
  baseFilteredOrders.filter((order) => {
    /* existing channel filter logic */
  }),
  [baseFilteredOrders, channelFilter]
);

// Memoize orderStats (status counts)
const orderStats = useMemo(() => ({
  pending: orders.filter((o) => o.status === "pending").length,
  delivered: orders.filter((o) => o.status === "delivered").length,
  posToday: orders.filter((o) => { /* existing logic */ }).length,
}), [orders]);

// Memoize paginated slice
const paginatedOrders = useMemo(() =>
  filteredOrders.slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE),
  [filteredOrders, currentPage]
);

// Wrap handlers in useCallback
const handleStatusUpdate = useCallback(async (orderId: string, status: string) => {
  /* existing logic */
}, [fetchOrders, seller?.id]);
```

**Expected improvement:** ~90% fewer filter operations on keystrokes

---

### 2. `SellerProducts.tsx` — Memoize filteredProducts + useCallback Handlers

**Problem:** `filteredProducts` at line 144 is a plain `products.filter()` call — no `useMemo`. Runs on every render including modal opens, input changes, etc.

**Fix:**
```tsx
// Add useMemo, useCallback to import
import React, { useState, useEffect, useMemo, useCallback } from "react";

// Line 144 — wrap in useMemo
const filteredProducts = useMemo(() =>
  products.filter((product) => {
    /* existing filter logic */
  }),
  [products, searchQuery, filterStatus]
);

// Wrap handlers in useCallback
const handleEditProduct = useCallback((product: SellerProduct) => {
  setEditingProduct(product);
  setIsEditDialogOpen(true);
}, []);

const handleDeleteProduct = useCallback((productId: string) => {
  setProductToDelete(productId);
  setIsDeleteDialogOpen(true);
}, []);

const handleToggleActive = useCallback(async (productId: string, isActive: boolean) => {
  /* existing logic */
}, [fetchProducts]);
```

**Expected improvement:** Product list stops re-filtering on modal opens

---

### 3. `ShopPage.tsx` — Fix O(n×m) Category Count

**Problem:** Line 776 runs a full `allProducts.filter()` inside a `.map()` over all categories:
```tsx
{allProducts.filter(p => p.category === cat.name).length || Math.floor(Math.random() * 50) + 10}
```
With 1,000 products × 30 categories = **30,000 comparisons per render**. Also uses `Math.random()` which prevents pure rendering.

**Fix:** Pre-compute a category count map once:
```tsx
// Add this useMemo after allProducts definition
const categoryCountMap = useMemo(() => {
  const map = new Map<string, number>();
  for (const p of allProducts) {
    map.set(p.category, (map.get(p.category) || 0) + 1);
  }
  return map;
}, [allProducts]);

// In JSX, replace the inline filter:
{categoryCountMap.get(cat.name) ?? '--'}
```

**Also add search debounce** (same 250ms pattern as mobile):
```tsx
const [searchInput, setSearchInput] = useState(searchQuery);
useEffect(() => {
  const timer = setTimeout(() => setSearchQuery(searchInput), 250);
  return () => clearTimeout(timer);
}, [searchInput]);
// Use searchInput for the TextInput, searchQuery for filteredProducts
```

**Expected improvement:** Category count: O(n) once vs O(n×m) per render

---

### 4. `OrdersPage.tsx` — Memoize Buyer Order Filter + Sort

**Problem:** The `.filter().sort()` chain at lines 350–364 runs in the render body with no `useMemo`:
```tsx
const displayedOrders = orders
  .filter((order) => { /* status + search */ })
  .sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt));
```
Runs on every re-render caused by any of the 14+ `useState` values in this component.

**Fix:**
```tsx
import { useState, useEffect, useCallback, useMemo } from "react";

const displayedOrders = useMemo(() =>
  orders
    .filter((order) => { /* existing filter logic */ })
    .sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt)),
  [orders, activeTab, searchQuery]
);
```

**Expected improvement:** Order list stops re-sorting when modals open/close

---

### 5. `web/src/services/productService.ts` — Add 60s TTL Query Cache

**Problem:** No caching at all. Every visit to ShopPage, ProductDetailPage, or SellerProducts fetches fresh from Supabase. The mobile app `productService.ts` already has a 60s TTL cache that achieved 99% cache hit rate on navigation.

**Fix:** Add the same Map-based TTL cache pattern used on mobile:
```typescript
// Add after imports
const PRODUCT_CACHE_TTL = 60_000; // 60 seconds
interface CacheEntry<T> { data: T; expiresAt: number; }
const productQueryCache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const entry = productQueryCache.get(key);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.data as T;
}
function setCache<T>(key: string, data: T): void {
  productQueryCache.set(key, { data, expiresAt: Date.now() + PRODUCT_CACHE_TTL });
}
export function invalidateProductCache(pattern?: string): void {
  if (!pattern) { productQueryCache.clear(); return; }
  for (const key of productQueryCache.keys()) {
    if (key.includes(pattern)) productQueryCache.delete(key);
  }
}

// Apply to getProducts(), getProductById(), getProductsBySeller()
async getProducts(sellerId?: string): Promise<SellerProduct[]> {
  const cacheKey = `products_${sellerId ?? 'all'}`;
  const cached = getCached<SellerProduct[]>(cacheKey);
  if (cached) return cached;
  /* ... existing fetch logic ... */
  setCache(cacheKey, result);
  return result;
}
// Call invalidateProductCache() on createProduct, updateProduct, deleteProduct
```

**Expected improvement:** ShopPage and SellerProducts load instantly on back-navigation (~60s window)

---

### 6. `web/src/services/orderService.ts` — Add 30s TTL Order Cache

**Problem:** Same as productService — no caching. Every navigation to OrdersPage or SellerOrders fetches fresh from DB.

**Fix:** Mirror the mobile `orderService.ts` cache (30s TTL + invalidation on mutations):
```typescript
const ORDER_CACHE_TTL = 30_000;
const orderQueryCache = new Map<string, CacheEntry<any>>();
// getCached / setCache / invalidateOrderCache helpers (same pattern)

// Apply to getBuyerOrders(buyerId), getSellerOrders(sellerId, dateRange)
// Invalidate on: createOrder, updateOrderStatus, cancelOrder
```

**Expected improvement:** Order lists load from cache on tab switch and back-navigation

---

## MEDIUM Priority — Fix After HIGH

### 7. `EnhancedCartPage.tsx` — Memoize Group Sort

**Problem:** The cart group sort comparator at line 340–342 calls `Math.max(...group.items.map(...))` inside the comparator — creating a new array **per comparison** in the sort. Not memoized.

**Fix:**
```tsx
// Add useCallback to import
import { useState, useEffect, useRef, useMemo, useCallback } from "react";

const sortedGroups = useMemo(() => {
  return Object.entries(cartGroups).sort(([, groupA], [, groupB]) => {
    const latestA = Math.max(...groupA.items.map(i => i.createdAt ? new Date(i.createdAt).getTime() : 0));
    const latestB = Math.max(...groupB.items.map(i => i.createdAt ? new Date(i.createdAt).getTime() : 0));
    return latestB - latestA;
  });
}, [cartGroups]);

// Wrap handlers in useCallback
const handleSelectItem = useCallback((itemId: string) => { /* ... */ }, [toggleSelectItem]);
const handleRemoveItem = useCallback((itemId: string, variantId?: string) => { /* ... */ }, []);
const handleQuantityChange = useCallback((itemId: string, qty: number) => { /* ... */ }, [updateQuantity]);
```

---

### 8. `CheckoutPage.tsx` — Memoize Payment Method Filters

**Problem:** `profile?.paymentMethods?.filter(pm => pm.type === 'wallet' && pm.brand === 'GCash')` is called twice in JSX (lines 1028 and 1067) and `.filter(pm => pm.type === 'wallet' && pm.brand === 'Maya')` also twice. All recalculated on every render.

**Fix:**
```tsx
const gcashWallets = useMemo(() =>
  profile?.paymentMethods?.filter(pm => pm.type === 'wallet' && pm.brand === 'GCash') ?? [],
  [profile?.paymentMethods]
);
const mayaWallets = useMemo(() =>
  profile?.paymentMethods?.filter(pm => pm.type === 'wallet' && pm.brand === 'Maya') ?? [],
  [profile?.paymentMethods]
);
// Also add useCallback to import and wrap handlePlaceOrder, handleApplyVoucher, handleAddressSelect
```

---

### 9. `ProductDetailPage.tsx` — Add useCallback to All Handlers

**Problem:** No `useCallback` on any handler. Every render creates new function references, causing child components (image gallery, review list, variant selector) to re-render unnecessarily.

**Fix:**
```tsx
import { useState, useEffect, useMemo, useCallback } from "react";

const handleAddToCart = useCallback(async () => { /* existing logic */ }, [product, quantity, selectedVariant, addToCart]);
const handleBuyNow = useCallback(async () => { /* existing logic */ }, [product, quantity, selectedVariant]);
const handleFollowSeller = useCallback(async () => { /* existing logic */ }, [currentSeller?.id]);
const handleTabChange = useCallback((tab: string) => setActiveTab(tab), []);

// Also memoize the filtered reviews
const displayedReviews = useMemo(() =>
  reviewFilter === 'all'
    ? reviews
    : reviews.filter(r => r.rating === parseInt(reviewFilter)),
  [reviews, reviewFilter]
);
```

---

### 10. `SellerAnalytics.tsx` — Add useMemo for Chart Data

**Problem:** Only `useState` is imported. The `metrics`, `categoryData`, `topProducts` and chart data are computed fresh on every render (including `timeRange` toggle clicks).

**Fix:**
```tsx
import { useState, useMemo } from "react";

// All chart data should be derived from the store data + timeRange in useMemo:
const filteredOrders = useMemo(() =>
  orders.filter(o => isWithinRange(o.orderDate, timeRange)),
  [orders, timeRange]
);

const metrics = useMemo(() => [
  { label: 'Revenue', value: /* compute */ },
  // ...
], [filteredOrders]);

const categoryData = useMemo(() =>
  /* compute from filteredOrders */,
  [filteredOrders]
);

const topProducts = useMemo(() =>
  [...products].sort((a, b) => b.sales - a.sales).slice(0, 5),
  [products]
);
```

---

## LOW Priority — Polish

### 11. `React.memo` on Card Components

**Problem:** `ProductCard`, `StoreCard`, `CollectionCard` are not wrapped in `React.memo`. Every parent re-render (e.g. filter toggle, search) re-renders every card in every list, even if their props haven't changed.

**Files to update:**
- `web/src/components/ProductCard.tsx`
- `web/src/components/StoreCard.tsx`
- `web/src/components/CollectionCard.tsx`
- `web/src/components/StorefrontProductCard.tsx`

**Fix:**
```tsx
// Wrap each component
export default React.memo(ProductCard);
export default React.memo(StoreCard);
```
**Note:** Only effective after handlers in parent pages are wrapped in `useCallback` (fixes 7–9 above), otherwise new function props break the memo.

---

### 12. `useCallback` for Handlers Passed into Mapped Lists

**Problem:** In ShopPage, SellerOrders, SellerProducts — handlers like `onAddToCart`, `onPress`, `onStatusUpdate` are defined inline or without `useCallback`. Every render creates new references, invalidating `React.memo` on child cards.

**Pattern to apply everywhere:**
```tsx
const handleAddToCart = useCallback((product: Product) => {
  addToCart(product);
}, [addToCart]);

// Then pass as: <ProductCard onAddToCart={handleAddToCart} ... />
```

---

### 13. Supabase Real-time Subscription Cleanup Audit

**Problem:** Several pages (SellerOrders, OrdersPage, MessagesPage) subscribe to Supabase real-time channels. If cleanup functions are missing or incorrectly implemented, subscriptions accumulate on re-mount.

**Check each `useEffect` that sets up a Supabase subscription:**
```tsx
useEffect(() => {
  const channel = supabase.channel('orders').on(...).subscribe();
  return () => supabase.removeChannel(channel); // ← must be present
}, []);
```

---

## Implementation Order (Recommended)

```
Week 1 — Highest impact, buyer-visible:
  [1] SellerOrders.tsx    → useMemo for all derived data
  [2] SellerProducts.tsx  → useMemo filteredProducts + useCallback
  [3] ShopPage.tsx        → categoryCountMap + search debounce
  [4] OrdersPage.tsx      → useMemo for displayedOrders

Week 2 — Services (enables all pages):
  [5] productService.ts   → 60s TTL cache
  [6] orderService.ts     → 30s TTL cache + invalidation

Week 3 — Medium priority:
  [7]  EnhancedCartPage.tsx    → memoized group sort + useCallback
  [8]  CheckoutPage.tsx        → memoized payment method filters
  [9]  ProductDetailPage.tsx   → useCallback + review filter memo
  [10] SellerAnalytics.tsx     → useMemo for chart data

Week 4 — Polish:
  [11] React.memo on card components
  [12] useCallback audit across all pages
  [13] Supabase subscription cleanup audit
```

---

## Expected Results After All Fixes

| Metric | Before | After |
|---|---|---|
| SellerOrders re-filter on keystroke | 8 full passes | 1 pass (only changed dep) |
| ShopPage category count per render | O(n×m) ~30k ops | O(n) once, O(1) per render |
| Product/order page back-navigation | Fresh DB fetch | Served from cache (<1ms) |
| Cart group sort per render | O(n log n × m), every render | Memoized, runs only on cart change |
| Child re-renders in product grids | All cards on every filter | Only changed props |
| Search input lag | Immediate filter per keystroke | 250ms debounced |

---

## Notes

- **Lazy loading already done** — `App.tsx` uses `React.lazy + Suspense` for all pages ✅
- **Mobile pattern is the reference** — all fixes mirror what was successfully applied to the mobile app with 99% cache hit rate and 34–1055× speedup on benchmarks
- **No new dependencies needed** — all fixes use built-in React hooks and Map-based caching
- **TypeScript** — run `npx tsc --noEmit` after each batch to catch type errors early
