# Mobile UX Refinement: Checkout Payment Reordering and Wishlist Constraints

This PR introduces several UI/UX improvements to the mobile application, focusing on the checkout flow, payment method prioritization, and input constraints for wishlist management.

---

## What Changed

### 1. Checkout & Payment Optimization
- **Payment Method Prioritization**: Reordered payment options in `CheckoutScreen.tsx`. **Cash on Delivery (COD)** is now the first and default option, followed by PayMongo.
- **Improved Success Navigation**: Fixed the post-purchase flow to direct users to the correct order tab.
  - PayMongo orders now navigate directly to the **Processing** tab (since they are already paid).
  - COD orders correctly navigate to the **Pending** tab.
- **Type Safety**: Updated `RootStackParamList` in `App.tsx` to include `processing` and `received` tabs, resolving TypeScript compilation errors during navigation.

### 2. Wishlist & Gifting Enhancements
- **Input Character Limits**: Applied a strict **20-character limit** to all "Wishlist Name" fields across the app (`WishlistScreen.tsx` and `WishlistSelectionModal.tsx`) to prevent layout breaks and ensure consistency with the web platform.
- **Visual Indicators**: Replaced the generic heart icon with a **Gift Icon** for empty wishlist states to better align with the gifting feature's branding.
- **Navigation Logic**: Refined `BackHandler` behavior within wishlist folders to ensure the back button returns the user to the "My Wishlist" list instead of the Profile screen.

### 3. Bug Fixes & Stability
- **TypeScript Health**: Resolved several property errors and missing type definitions (`safeImageUri`, `LABELS`, and navigation hooks).
- **Navigation Flow**: Fixed a bug where "See My Purchases" would default to the "Pending" tab even for successful online payments by normalizing the `initialTab` parameter.

---

## Verification Results

### Manual Testing
- [x] **Checkout Reordering**: COD appears first and is selected by default on the checkout screen.
- [x] **PayMongo Redirect**: Successful PayMongo test payments correctly land the user on the "Processing" tab of the Orders screen.
- [x] **Character Limits**: Wishlist name inputs prevent entering more than 20 characters.
- [x] **Wishlist Icons**: Empty folders correctly display the new Gift icon.
- [x] **TypeScript**: `npx tsc --noEmit` passes with 0 errors.

### Screenshots
- [Insert screenshot of reordered Payment Methods]
- [Insert screenshot of 20-char limit in action]
- [Insert screenshot of Processing tab landing]
