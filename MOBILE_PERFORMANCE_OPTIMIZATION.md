# Mobile App Performance Optimization Plan

**Date:** March 2, 2026  
**Status:** Implementation In Progress

---

## Executive Summary

Full performance audit of the BAZAAR mobile app (React Native / Expo) revealed **17+ issues** across data fetching, rendering, image handling, state management, and database indexing. The top problems causing lag:

1. **No pagination** — HomeScreen & ShopScreen fetch ALL products from the database on mount
2. **ScrollView + .map() instead of FlatList** — ShopScreen renders all products at once (no virtualization)
3. **No image caching** — Using RN `<Image>` everywhere (re-downloads on scroll-back)
4. **N+1 queries in checkout** — Stock validation, seller lookup, and stock updates each loop per item
5. **Missing React.memo** — ProductCard, OrderCard, CartItemRow re-render on every parent update
6. **Missing database indexes** — No indexes on hot query paths (orders by buyer, order_items by product, etc.)

---

## Priority 1: CRITICAL (Implemented)

### 1A. Add Pagination to Product Fetching
- **File:** `mobile-app/src/services/productService.ts`
- **Problem:** `getProducts()` fetches ALL products with no limit. HomeScreen and ShopScreen both call this on mount.
- **Fix:** Default `limit: 30` when no limit specified. HomeScreen uses `limit: 20`.
- **Impact:** Reduces payload from 100s of products to 20-30, cutting load time 5-10x.

### 1B. Replace ScrollView + .map() with FlatList on ShopScreen
- **File:** `mobile-app/app/ShopScreen.tsx`
- **Problem:** `filteredProducts.map()` inside `ScrollView` renders ALL products at once. No virtualization.
- **Fix:** Replace with `FlatList` using `numColumns={2}`, `initialNumToRender={10}`, `maxToRenderPerBatch={6}`, `windowSize={5}`.
- **Impact:** From rendering 100+ cards to ~10 visible, massive memory and render savings.

### 1C. Wrap List Components in React.memo
- **Files:** `ProductCard.tsx`, `OrderCard.tsx`, `CartItemRow.tsx`
- **Problem:** These are rendered many times in lists but re-render on every parent state change.
- **Fix:** Wrap exports in `React.memo()`.
- **Impact:** Eliminates unnecessary re-renders in product grids, order lists, and cart.

### 1D. Install expo-image for Cached Image Loading
- **Problem:** React Native's `<Image>` has no disk caching. Images re-download on every scroll-back.
- **Fix:** Install `expo-image` and replace `<Image>` with `<Image>` from expo-image in ProductCard, OrderCard, CartItemRow.
- **Impact:** Images load from disk cache on re-scroll, dramatically reducing network and render time.

### 1E. Database Performance Indexes
- **Migration:** `20260302090000_performance_indexes.sql`
- **Problem:** No indexes on frequently-queried columns. Every product listing, order lookup, and cart fetch does full table scans.
- **Indexes added:**
  - `orders(buyer_id, created_at DESC)` — buyer order list
  - `orders(shipment_status)` — filtered order queries
  - `order_items(product_id)` — sold count calculations
  - `order_items(order_id)` — order detail loading
  - `product_images(product_id, is_primary)` — product listing image lookup
  - `product_variants(product_id)` — variant stock checks
  - `product_discounts(product_id)` — discount lookup per product
  - `product_discounts(campaign_id)` — campaign product lookup
  - `cart_items(cart_id)` — cart loading
  - `reviews(product_id)` — review aggregation
  - `products(approval_status, deleted_at)` — active product filtering
  - `products(seller_id)` — seller product listing
  - `products(category_id)` — category browsing
  - `refund_return_periods(order_id)` — return request lookup
  - `order_status_history(order_id)` — status history
  - `discount_campaigns(status, starts_at, ends_at)` — active campaign lookup
- **Impact:** 10-50x faster queries on all major read paths.

---

## Priority 2: HIGH (Implemented)

### 2A. Batch N+1 Queries in Checkout Service
- **File:** `mobile-app/src/services/checkoutService.ts`
- **Problem:** Stock validation loops through each item making a separate DB call. Seller ID lookup does the same. Stock update at checkout does the same.
- **Fix:**
  - Stock validation: Single `.in('product_id', productIds)` query
  - Seller ID lookup: Single `.in('id', productIds)` query
  - Campaign discount recording: Single `.in('product_id', productIds)` batch
- **Impact:** Checkout N+1 queries reduced from O(items) to O(1) per phase.

### 2B. Parallel Data Fetching on HomeScreen
- **File:** `mobile-app/app/HomeScreen.tsx`
- **Problem:** 5 separate `useEffect` hooks fire 5 sequential API calls on mount (products, flash sales, featured, sellers, notifications).
- **Fix:** Combine into single `useEffect` with `Promise.allSettled()`.
- **Impact:** HomeScreen loads in 1 round-trip time instead of 5.

### 2C. Remove console.log from Hot Paths
- **File:** `mobile-app/src/services/productService.ts`
- **Problem:** 6+ `console.log` statements in `getProducts()` (called on every screen load). Logging to the JS bridge is not free.
- **Fix:** Remove or gate behind `__DEV__`.
- **Impact:** Minor but measurable improvement on every product fetch.

### 2D. Limit Orders Query with Pagination
- **File:** `mobile-app/app/OrdersScreen.tsx`
- **Problem:** Fetches ALL orders with deep joins (addresses, items with products and images, reviews, cancellations, vouchers) with no limit.
- **Fix:** Add `.limit(30)` to orders query.
- **Impact:** Faster order list load, especially for users with many orders.

---

## Priority 3: MEDIUM (Future)

### 3A. Extract HomeScreen Carousel into Memoized Component
- **Problem:** Auto-scroll timer updates `activeSlide` state every 4 seconds → full HomeScreen re-render including all product grids.
- **Fix:** Extract carousel into `React.memo`-wrapped sub-component with its own state.

### 3B. Consolidate Flash Sale Timers
- **Problem:** Two `setInterval(1000)` timers run on HomeScreen → 2 re-renders per second.
- **Fix:** Single timer, or compute display value in render using a ref.

### 3C. Break Down Monolithic Screens
- `CheckoutScreen.tsx` — 3,183 lines (split into ShippingStep, PaymentStep, ConfirmationStep)
- `ProductDetailScreen.tsx` — 2,134 lines (extract ImageGallery, VariantSelector, ReviewSection)
- `SellerProductsScreen` — 2,176 lines (extract modals)

### 3D. Use Zustand Selectors Everywhere
- **Problem:** `const { items, removeItem, ... } = useCartStore()` subscribes to ALL store changes.
- **Fix:** `const items = useCartStore(s => s.items)` — subscribe only to needed slices.

### 3E. Remove Dummy Data from OrderStore
- **Problem:** ~150 lines of hardcoded dummy orders bloat initial state and AsyncStorage.
- **Fix:** Start store empty, populate from API.

### 3F. Materialized View for Product Sold Counts
- **Problem:** Second query after products fetch joins order_items → orders to calculate sold counts.
- **Fix:** Create a `product_sold_counts` materialized view or cached column.

---

## Implementation Checklist

| # | Task | Priority | Status |
|---|------|----------|--------|
| 1A | Pagination in productService.getProducts() | Critical | ✅ Done |
| 1B | FlatList on ShopScreen product grid | Critical | ✅ Done |
| 1C | React.memo on ProductCard, OrderCard, CartItemRow | Critical | ✅ Done |
| 1D | expo-image installation & usage | Critical | ✅ Done |
| 1E | Database performance indexes migration | Critical | ✅ Done |
| 2A | Batch N+1 queries in checkoutService | High | ✅ Done |
| 2B | Parallel fetching on HomeScreen | High | ✅ Done |
| 2C | Remove console.log from productService | High | ✅ Done |
| 2D | Orders query limit | High | ✅ Done |
| 3A | Extract carousel component | Medium | 🔲 Future |
| 3B | Consolidate flash timers | Medium | 🔲 Future |
| 3C | Break down monolithic screens | Medium | 🔲 Future |
| 3D | Zustand selectors | Medium | 🔲 Future |
| 3E | Remove dummy order data | Medium | 🔲 Future |
| 3F | Materialized sold counts | Medium | 🔲 Future |

---

## Expected Performance Gains

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| HomeScreen load time | ~3-5s | ~0.8-1.2s | ~4x faster |
| ShopScreen scroll FPS | ~15-25 FPS | ~55-60 FPS | ~3x smoother |
| Checkout processing | ~4-8s (N+1) | ~1-2s (batched) | ~4x faster |
| Image re-scroll | Re-download | From cache | Instant |
| DB query time (products) | Full scan | Index seek | 10-50x faster |
| Memory (ShopScreen) | All products rendered | ~10 rendered | ~80% reduction |
