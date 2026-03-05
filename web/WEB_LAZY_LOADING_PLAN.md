# WEB LAZY LOADING & DEFERRED LOADING PLAN

> **Status:** Route-level `React.lazy()` on all pages is ALREADY done in `App.tsx`.
> This plan covers the remaining layers: component-level lazy loading, image lazy loading,
> route prefetching, and Intersection Observer deferred rendering.

---

## Priority Order

```
P1 — Image lazy loading (affects every page, biggest perceived perf win)
P2 — Modal & heavy component lazy loading inside buyer flow pages
P3 — Route prefetching on hover (near-instant transition feel)
P4 — Intersection Observer for below-the-fold heavy sections
P5 — Recharts lazy in SellerAnalytics
P6 — Skeleton loaders for above-the-fold data sections
```

---

## P1 — Image Lazy Loading (All Pages)

**Problem:** Product cards, store cards, hero images load immediately via `<img src=...>` with no `loading` attribute. On a page with 20+ product cards, all images fire on mount.

**Files to touch:**
- `web/src/components/ProductCard.tsx`
- `web/src/components/StoreCard.tsx`
- `web/src/components/CollectionCard.tsx`
- `web/src/components/StorefrontProductCard.tsx`
- `web/src/pages/HomePage.tsx` (hero images)
- `web/src/pages/ProductDetailPage.tsx` (gallery images)

**Fix — add `loading="lazy"` + `decoding="async"` to every `<img>` that is not above the fold:**
```tsx
// Before
<img src={product.image} alt={product.name} />

// After
<img
  src={product.image}
  alt={product.name}
  loading="lazy"
  decoding="async"
/>
```

**Above-the-fold exceptions (should NOT be lazy):**
- First hero image on HomePage (`BazaarHero`)
- First product image in `ProductDetailPage` gallery (currently selected thumb)

---

## P2 — Component-Level Lazy Loading — Buyer Flow (Highest Value)

### 2a. `ProductDetailPage.tsx`
These 3 components are eagerly imported even though they're modals/sections only shown on user interaction or scroll:

| Component | When shown | Action |
|---|---|---|
| `ProductReviews` | Below the fold, requires scroll | `React.lazy` + IntersectionObserver trigger |
| `CreateRegistryModal` | Only on "Add to Registry" click | `React.lazy` |
| `CartModal` | Only after "Add to Cart" click | `React.lazy` |
| `BuyNowModal` | Only after "Buy Now" click | `React.lazy` |

**Implementation:**
```tsx
// ProductDetailPage.tsx — replace static imports with lazy
const ProductReviews = lazy(() =>
  import("@/components/reviews/ProductReviews").then(m => ({ default: m.ProductReviews }))
);
const CreateRegistryModal = lazy(() =>
  import("../components/CreateRegistryModal").then(m => ({ default: m.CreateRegistryModal }))
);
const CartModal = lazy(() =>
  import("../components/ui/cart-modal").then(m => ({ default: m.CartModal }))
);
const BuyNowModal = lazy(() =>
  import("../components/ui/buy-now-modal").then(m => ({ default: m.BuyNowModal }))
);
```

Wrap modal renders in `{isOpen && <Suspense fallback={null}><TheModal /></Suspense>}` so the chunk only downloads when the modal first opens.

### 2b. `OrdersPage.tsx`
| Component | When shown | Action |
|---|---|---|
| Return submission modal | On "Return" click | `React.lazy` |
| Cancel order modal | On "Cancel" click | `React.lazy` |
| Confirm received modal | On "Confirm" click | `React.lazy` |
| Review modal | On "Leave Review" click | `React.lazy` |

**Pattern:**
```tsx
const ReturnModal = lazy(() => import("@/components/orders/ReturnModal"));
// render: {returnModalOpen && <Suspense fallback={null}><ReturnModal /></Suspense>}
```

### 2c. `EnhancedCartPage.tsx`
| Component | Action |
|---|---|
| Variant selection modal | `React.lazy` — only needed when "Edit Options" is clicked |

### 2d. `CheckoutPage.tsx`
| Component | Action |
|---|---|
| Address selection modal / map | `React.lazy` — only shown when user clicks "Change Address" |

---

## P3 — Route Prefetching on Hover

**Problem:** Even with `React.lazy`, the chunk for the next page only downloads when the user *navigates* there. Adding prefetch on hover makes transitions feel instant.

**Files:**
- `web/src/components/Header.tsx` — Cart icon, nav links
- `web/src/pages/EnhancedCartPage.tsx` — "Proceed to Checkout" button
- `web/src/pages/ProductDetailPage.tsx` — "Add to Cart" / "Buy Now" buttons

**Implementation — create a `prefetch` utility:**
```ts
// web/src/lib/prefetch.ts
export function prefetchRoute(factory: () => Promise<any>) {
  // Fires the dynamic import without rendering — just warms the cache
  void factory();
}
```

**Usage:**
```tsx
// Header cart icon
<button
  onMouseEnter={() => prefetchRoute(() => import("../pages/EnhancedCartPage"))}
  onClick={...}
>
  <ShoppingCart />
</button>

// Cart "Proceed to Checkout" button
<Button
  onMouseEnter={() => prefetchRoute(() => import("../pages/CheckoutPage"))}
  onClick={handleCheckout}
>
  Proceed to Checkout
</Button>

// ProductDetail "Add to Cart" success → prefetch cart
// ProductDetail "Buy Now" → prefetch checkout immediately
```

**Buyer flow prefetch chain:**
```
HomePage hover Product → prefetch ProductDetailPage
ProductDetail "Add to Cart" → prefetch EnhancedCartPage
Cart "Proceed to Checkout" hover → prefetch CheckoutPage
Checkout submit success → prefetch OrdersPage (already navigating, but warms assets)
```

---

## P4 — Intersection Observer for Below-the-Fold Sections

**Problem:** Heavy sections (reviews, related products, analytics charts) render immediately even if the user never scrolls there, wasting CPU and delaying TTI.

### 4a. `ProductDetailPage.tsx` — Reviews Section
The `ProductReviews` component fetches from Supabase. Should only mount (and thus fetch) when the reviews section enters the viewport.

**Implementation — `useInView` hook:**
```tsx
// web/src/hooks/useInView.ts
import { useEffect, useRef, useState } from "react";

export function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}
```

```tsx
// ProductDetailPage.tsx
const { ref: reviewsRef, inView: reviewsInView } = useInView();

<div ref={reviewsRef} className="min-h-[200px]">
  {reviewsInView && (
    <Suspense fallback={<ReviewsSkeleton />}>
      <ProductReviews productId={product.id} />
    </Suspense>
  )}
</div>
```

### 4b. `ShopPage.tsx` — Product Grid
Products below the initial viewport (rows 3+) can be rendered lazily as the user scrolls, instead of all at once.

Approach: render first 8 products immediately, then load the rest in a `useInView`-gated block.

### 4c. `SellerOrders.tsx` — Order History Table
Paginated rows beyond page 1 are already not rendered. No change needed.

---

## P5 — Recharts Lazy Loading in SellerAnalytics

**Problem:** `recharts` (~180KB gzip) is eagerly imported at the top of `SellerAnalytics.tsx`. Since the chart area is the main content of this page, use `React.lazy` at the **chart component level** to defer the recharts bundle until the chart renders.

**Implementation — extract chart JSX into a separate file:**
```tsx
// web/src/components/seller/AnalyticsCharts.tsx (new file)
// Move all recharts JSX here — AreaChart, PieChart, etc.
export function RevenueChart({ data }: { data: any[] }) { ... }
export function CategoryPieChart({ data }: { data: any[] }) { ... }
```

```tsx
// SellerAnalytics.tsx — replace recharts import with lazy
const AnalyticsCharts = lazy(() => import("@/components/seller/AnalyticsCharts"));

// In JSX:
<Suspense fallback={<ChartSkeleton />}>
  <AnalyticsCharts revenueData={revenueData} categoryData={categoryData} />
</Suspense>
```

This moves recharts out of the main bundle into its own chunk and removes it from the critical path for seller pages that don't render analytics.

---

## P6 — Skeleton Loaders for Data-Fetching Sections

**Problem:** Pages that fetch data on mount show a blank white area while loading, which looks like a bug and kills perceived performance.

**Pages / sections needing skeletons:**

| Page | Section | Skeleton |
|---|---|---|
| `ProductDetailPage` | Product images + info | Image placeholder + text lines |
| `OrdersPage` | Order list | 3 order card skeletons |
| `SellerOrders` | Orders table | Table skeleton rows |
| `SellerAnalytics` | Charts | Chart skeleton boxes |
| `EnhancedCartPage` | Cart groups | Cart item skeletons |
| `ShopPage` | Product grid | 8 product card skeletons |

**Reusable skeleton components to create:**
```
web/src/components/skeletons/
  ProductCardSkeleton.tsx
  OrderCardSkeleton.tsx
  ChartSkeleton.tsx
  CartItemSkeleton.tsx
```

**Usage pattern:**
```tsx
{isLoading ? (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
  </div>
) : (
  <ProductGrid products={products} />
)}
```

---

## Implementation Order & Effort Estimate

| # | Task | Pages | Effort | Impact |
|---|---|---|---|---|
| 1 | Add `loading="lazy"` to all product/store `<img>` | 4 components | 30 min | High |
| 2 | Lazy modals in ProductDetailPage | ProductDetailPage | 45 min | High |
| 3 | Create `prefetch.ts` + wire buyer flow hover prefetch | Header, Cart, ProductDetail | 30 min | High |
| 4 | `useInView` hook + reviews deferred render | ProductDetailPage | 30 min | Medium |
| 5 | Lazy modals in OrdersPage | OrdersPage | 30 min | Medium |
| 6 | Extract recharts → `AnalyticsCharts.tsx` + lazy | SellerAnalytics | 30 min | Medium |
| 7 | Skeleton loaders for 5 pages | Multiple | 1.5 hr | Medium |
| 8 | Lazy modal in EnhancedCartPage + CheckoutPage | CartPage, CheckoutPage | 20 min | Low-Med |

**Total estimated effort:** ~4.5 hours

---

## What NOT To Do

- **Do NOT add more route-level lazy loading** — all routes are already lazy.
- **Do NOT lazy-load `framer-motion`** — it is a shared dep used on nearly every page; splitting it would cause duplicate downloads.
- **Do NOT lazy-load `Header` or `SellerSidebar`** — they are above the fold and needed immediately.
- **Do NOT use IntersectionObserver for above-the-fold product images** — always eager-load those.
