This PR fixes critical issues in the **Seller Dashboard Product Management** flow and implements major enhancements to the **Mobile Application**, including a performance-optimized order badge system, cart variation logic fixes, and UI/UX refinements to the Flash Sale and Orders screens.

---

## 🛠️ Changes by Area

### 1. Seller Dashboard — Product Editing & Persistence

**File:** `src/pages/SellerProducts.tsx`

- **Refactored `onEditProduct` logic**: Improved the mapping of database fields to the form state, specifically handling `isDraft` status and sub-category selection more robustly.
- **Improved Update Flow**:
    - Replaced monolithic update logic with a more granular approach.
    - Uses `productService.updateProduct` for core product metadata.
    - Iterates through variants to update them individually via `productService.updateVariant`, ensuring `sku`, `price`, `stock`, and `thumbnail_url` are correctly synced.
- **Removed deprecated audit logging**: Cleaned up the `admin_audit_logs` insert call from the frontend to reduce unnecessary API calls and potential failures during product saving.

### 2. Variant Management & Service Updates

**File:** `src/services/productService.ts`

- **Enhanced `updateVariant` API**: Expanded the `updates` object to support all critical variant fields:
    - `variant_name`
    - `option_1_value`
    - `option_2_value`
    - `sku`
    - `thumbnail_url`
- This allows for precise updates to individual variants when editing a product.

### 3. Data Model & Mapping (Draft Support)

**Files:** `src/stores/seller/sellerTypes.ts`, `src/utils/productMapper.ts`

- **Draft Status Integration**: 
    - Added `"draft"` as a valid `approvalStatus` in `sellerTypes.ts`.
    - Added `isDraft` and `isVacationMode` properties to the `SellerProduct` interface.
- **Mapper Logic**: Updated `mapDbProductToSellerProduct` to automatically set the `isDraft` flag based on the database `approval_status`.
- **Bug Fix**: Fixed a property access bug in `mapDbProductToNormalized` where `original_price` (snake_case) wasn't being correctly mapped from the database response.

### 4. UI/UX Polish & Error Handling

**Files:** `src/pages/SellerProducts.tsx`, `src/components/seller/products/VariantItem.tsx`, `src/components/seller/products/VariantManager.tsx`

- **Loading Feedback**: Added a spinning loader to the "Save Changes" / "Publish Product" button during submission to prevent multiple clicks and provide visual feedback.
- **Button Styling Fixes**:
    - **Cancel Button**: Fixed the "Cancel" button in the Add/Edit Product form. It previously incorrectly used the orange brand gradient; it now uses a clean `outline` variant with gray text and borders.
- **Variant UI Improvements**:
    - **Optional Images**: Updated `VariantItem.tsx` to mark variant images as "(Optional)" instead of required, providing more flexibility for sellers.
    - **Error Visibility**: Added explicit error message blocks in `VariantManager.tsx` to display validation errors related to variants and variant images, improving form troubleshooting.

### 5. Mobile App — Order Management & Profile Enhancements

**Files:** `mobile-app/app/ProfileScreen.tsx`, `mobile-app/src/hooks/useOrderCounts.ts`, `mobile-app/app/OrdersScreen.tsx`

- **Dynamic Order Badges**: Implemented a performance-optimized notification system on the Profile screen.
    - Created `useOrderCounts` hook to fetch exact order counts via parallelized Supabase `head` queries.
    - Added red circular notification badges to Pending, Processing, Shipped, and Delivered icons.
- **Orders Screen "Reviewed" Tab**: Added a new "Reviewed" tab to achieve feature parity with the web version.
    - Reordered navigation tabs: *All → Pending → Processing → Shipped → Delivered → To Review → Return/Refund → Cancelled → Reviewed*.
    - Updated status mapping logic to correctly exclude reviewed/returned items from the "Delivered" count.

### 6. Mobile App — Cart & UI Refinements

**Files:** `mobile-app/app/CartScreen.tsx`, `mobile-app/src/stores/cartStore.ts`, `mobile-app/app/FlashSaleScreen.tsx`

- **Cart Variation Fix**: Resolved a critical logic bug where changing a product's variant in the cart would incorrectly merge selection strings. It now correctly updates the variant ID and properties or replaces the item.
- **Flash Sale Header Restructuring**:
    - Replaced the bulky "Back to Home" text button with a sleek Chevron icon.
    - Modernized the header layout to be more compact and aligned with modern mobile UI patterns.
    - Removed redundant shop names from section headers for a cleaner "Global Flash Sale" aesthetic.

---

## Files Changed Summary

### Web (`web/`)

| File | Type | Description |
|---|---|---|
| `src/pages/SellerProducts.tsx` | Modified | Refactored product/variant update logic, added loading states, fixed button styles. |
| `src/services/productService.ts` | Modified | Expanded `updateVariant` to support more fields (SKU, thumbnails, etc.). |
| `src/stores/seller/sellerTypes.ts` | Modified | Added `draft` status and `isDraft` property to `SellerProduct` type. |
| `src/utils/productMapper.ts` | Modified | Added mapping for `isDraft` and fixed `original_price` mapping. |
| `src/components/seller/products/VariantItem.tsx` | Modified | Marked variant images as optional in the UI. |
| `src/components/seller/products/VariantManager.tsx` | Modified | Added dedicated error message displays for variants and variant images. |

### Mobile (`mobile-app/`)

| File | Type | Description |
|---|---|---|
| `app/ProfileScreen.tsx` | Modified | Integrated `useOrderCounts` and added dynamic notification badges. |
| `src/hooks/useOrderCounts.ts` | **New** | Performance-optimized hook for parallelized Supabase order counts. |
| `app/OrdersScreen.tsx` | Modified | Added "Reviewed" tab and synchronized status mapping logic with badges. |
| `app/CartScreen.tsx` | Modified | Fixed variant update logic to prevent selection merging. |
| `app/FlashSaleScreen.tsx` | Modified | Restructured header for compact navigation and cleaned section titles. |
| `src/stores/cartStore.ts` | Modified | Refined variant update state management logic. |

---

## Testing Done

- [x] **Product Editing**: Successfully updated existing products and verified changes in Supabase.
- [x] **Variant Sync**: Verified that price, stock, and SKU changes for individual variants are persisted correctly.
- [x] **Draft Mode**: Verified that products saved as drafts correctly display the "draft" status and map the `isDraft` flag.
- [x] **UI Feedback**: Verified the loading spinner appears during product submission.
- [x] **Mobile Order Badges**: Verified that notification badges on the Profile screen update in real-time based on Supabase counts.
- [x] **Mobile Cart Variants**: Verified that changing a variant correctly updates the cart entry without merging strings.
- [x] **Mobile Orders Tabs**: Verified the new "Reviewed" tab correctly displays filtered orders.
- [x] **Mobile Flash Sale**: Verified the new compact header layout and navigation functionality.

---

## Notes for Reviewer

- The individual variant update approach in `SellerProducts.tsx` was chosen to ensure maximum reliability over bulk updates, which were occasionally failing due to constraint conflicts.
- Audit logging has been removed from the frontend as it should ideally be handled via database triggers or a dedicated backend service for security and performance reasons.
