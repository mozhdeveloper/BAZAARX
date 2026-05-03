# Platform Enhancements: Payment Security, Map Precision, and Feature Rebranding

This PR introduces a comprehensive set of updates across the web and mobile platforms, focusing on payment integrity, location accuracy in checkout, and the platform-wide rebranding of "Registry" to "Wishlist".

---

## What Changed

### 1. Payment Security & UI Overhaul (Mobile & Web)
- **Duplicate Prevention**: Implemented strict existence checks in `paymentMethodService.ts` (Mobile) and `paymentService.ts` (Web) using `card_last4` and `card_brand` to prevent redundant records.
- **Test Card Blocking**: Automatically excludes "Quick Auto-fill" test cards from database persistence to maintain clean production data.
- **Premium Saved Card UI**: Overhauled the mobile `PaymentMethodsScreen` and `CheckoutScreen` with a native `StyleSheet` design, featuring secure asterisk masking (e.g., `VISA **** 4242`) and bold branding.
- **Join Resolution**: Fixed a rendering bug in mobile card mapping where single-object join responses from Supabase were previously ignored.

### 2. Precision Checkout Mapping (Web)
- **Reverse Geocoding**: Integrated a listener in `MapPicker.tsx` that automatically updates the address search bar based on the user's pinned location on the map.
- **Geocoding Utility**: Introduced `geocoding.ts` with a debounced API implementation to ensure high performance and prevent rate-limiting.
- **UX Improvements**: Disabled browser autocomplete in the address modal to prevent UI overlap and added z-index management for search results.

### 3. Registry to Wishlist Rebranding
- **Global Rebranding**: Replaced "Registry" with "Wishlist" across user-facing modules including `SharedRegistryPage.tsx`, `CheckoutPage.tsx`, and `useRegistryCheckout.ts`.
- **Gifting Logic**: Updated `useOrderPrivacy.ts` and `mappers.ts` to ensure privacy settings and database conventions remain intact despite the front-end string updates.
- **Guest Flow**: Refined the unauthenticated view for shared lists, ensuring guests are prompted to log in before purchasing while preserving their navigation context.

---

## Verification Results

### Manual Testing
- [x] **Payment Persistence**: Verified that duplicate cards are detected and test cards are blocked from saving.
- [x] **Map Accuracy**: Confirmed that moving the pin on the web map successfully populates the address input via reverse geocoding.
- [x] **Rebranding**: Verified all user-facing instances of "Registry" now read "Wishlist" in the checkout and shared list pages.
- [x] **Mobile UX**: Verified consistent rendering of saved cards in both settings and checkout screens on mobile.

### Technical Integrity
- [x] **Build Status**: Web build (`npm run build`) completed successfully.
- [x] **Type Safety**: `npx tsc --noEmit` passed in the mobile-app directory.

---

## Files Impacted
- **Mobile**: `CheckoutScreen.tsx`, `PaymentMethodsScreen.tsx`, `paymentMethodService.ts`
- **Web Components**: `MapPicker.tsx`, `OrderDetailsModal.tsx`
- **Web Pages**: `CheckoutPage.tsx`, `SharedRegistryPage.tsx`
- **Services/Hooks**: `checkoutService.ts`, `paymentService.ts`, `useOrderPrivacy.ts`, `useRegistryCheckout.ts`, `geocoding.ts`
