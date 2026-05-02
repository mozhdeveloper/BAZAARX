# Mandatory Photo Proof for Order Confirmation and Mobile Stability Fixes

This PR implements the mandatory photo proof requirement for order receipts in the mobile app and resolves several critical stability issues related to image processing and database interactions.

---

## What Changed

### 1. Mandatory Photo Proof Confirmation (Mobile)
- **New `ConfirmReceivedModal`**: Replaced the legacy system `Alert` with a high-fidelity modal that requires users to capture or upload photo proof before confirming order receipt.
- **Enforced Validation**: The "Yes, I Received It" button remains disabled until at least one photo is provided, with clear visual feedback for the user.
- **Image Processing Refactor**: Switched to `base64` data extraction from `ImagePicker` to bypass unreliable filesystem reads on Android and iOS.
- **Vibrant UI**: Updated the confirmation button to a more vibrant green (`#16A34A`) that clearly "lights up" when the requirement is met.

### 2. Critical Bug Fixes & Stability
- **Database ID Alignment**: Fixed the "Order not found" error by ensuring the internal database UUID is used for status updates instead of the display order number.
- **Schema Compatibility**: Resolved a schema cache error by removing attempts to update the non-existent `proof_image_url` column in the `orders` table, redirecting photo URLs to the `order_status_history` metadata instead.
- **`atob` Polyfill Fix**: Fixed a crash in `ProfileScreen.tsx` by replacing the web-only `atob` function with the `base64-arraybuffer` decode utility.
- **TypeScript & Deprecation Fixes**:
  - Resolved `ImagePicker.MediaTypeOptions` deprecation warnings by using the modern `['images']` array format.
  - Fixed a `FileSystem.EncodingType` property error by using compatible string literals.
  - Resolved a "Bucket not found" error by switching to the established `review-images` storage bucket.

### 3. UX & Flow Improvements
- **Post-Action Redirection**: Added automatic navigation to the "Received" tab in the `OrdersScreen` after a successful receipt confirmation.
- **Consistent Storage**: Aligned the mobile storage path with the web platform (`buyerId/orderId/filename`) to ensure cross-platform visibility of receipt photos.

---

## Verification Results

### Manual Testing
- [x] **Confirm Received**: Modal opens correctly from both `OrdersScreen` and `OrderDetailScreen`.
- [x] **Photo Requirement**: Button is disabled when no photos are present; enables immediately after selection.
- [x] **Upload**: Photos successfully upload to Supabase `review-images` bucket.
- [x] **Status Update**: Order status updates to `received` in the database, and photo URLs are logged in `order_status_history`.
- [x] **Navigation**: User is redirected to the "Received" tab upon success.
- [x] **TypeScript**: `npx tsc --noEmit` passes with 0 errors.

### screenshots
- [Insert screenshot of new ConfirmReceivedModal here]
- [Insert screenshot of 'Received' tab redirection here]
