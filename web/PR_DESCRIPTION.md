## What does this PR do?

This PR fixes critical issues in the **Seller Dashboard Product Management** flow, specifically focusing on the "Edit Product" functionality. It ensures that product details, variants, and draft statuses are correctly persisted to Supabase, while improving the UI/UX with loading states and corrected styling.

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

---

## Testing Done

- [x] **Product Editing**: Successfully updated existing products and verified changes in Supabase.
- [x] **Variant Sync**: Verified that price, stock, and SKU changes for individual variants are persisted correctly.
- [x] **Draft Mode**: Verified that products saved as drafts correctly display the "draft" status and map the `isDraft` flag.
- [x] **UI Feedback**: Verified the loading spinner appears during product submission.
- [x] **Style Regression**: Verified the "Cancel" button now has the correct neutral styling instead of the brand orange gradient.
- [x] **Navigation**: Verified that saving a product correctly redirects the user back to the product list with a success toast.

---

## Notes for Reviewer

- The individual variant update approach in `SellerProducts.tsx` was chosen to ensure maximum reliability over bulk updates, which were occasionally failing due to constraint conflicts.
- Audit logging has been removed from the frontend as it should ideally be handled via database triggers or a dedicated backend service for security and performance reasons.
