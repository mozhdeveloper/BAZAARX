# TypeScript Error Fixes - Batch Reference

## Critical Pattern Errors

### 1. `useSellerStore` is NOT a Zustand store
**Problem**: Code calls `useSellerStore.getState()` but it's a wrapper hook
**Fix**: Import the individual stores directly:
- `useAuthStore.getState()` for seller/auth
- `useProductStore.getState()` for products  
- `useStatsStore.getState()` for stats
- `useOrderStoreExternal.getState()` for orders

### 2. ProductService filters must be objects
**Problem**: `fetchProducts(sellerId)` called with string
**Fix**: `fetchProducts({ sellerId })`

### 3. SellerService missing methods
Need to add stub methods:
- `getFollowedShops(buyerId)`
- `followSeller(buyerId, sellerId)`  
- `unfollowSeller(buyerId, sellerId)`
- `getFollowerCount(sellerId)`
- `checkIsFollowing(buyerId, sellerId)`

### 4. Database field naming (snake_case vs camelCase)
Seller interface uses camelCase, DB uses snake_case.
Need to access via transformed properties or add missing fields.

### 5. ProductQAStore `addProductToQA` signature
**Current**: `addProductToQA(productId: string, vendorName: string)`
**Called with**: Object `{ id, name, vendor, ... }`
**Fix**: Change signature or call correctly

### 6. SellerStats missing fields
Add to interface:
- `revenueChange?: number`
- `ordersChange?: number`
- `totalVisits?: number`
- `visitsChange?: number`
- `revenueData?: Array<{ month: string, revenue: number, value?: number, date?: string }>`
- `categorySales?: Array<{ category: string, sales: number, value?: number, color?: string }>`

## Files Requiring Manual Intervention

Most errors are in seller screens that need access to individual stores rather than the wrapper.
