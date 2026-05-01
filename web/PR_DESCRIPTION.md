# Registry Privacy, Guest Authentication Flow, and Type Hotfixes

This PR implements crucial privacy and user experience enhancements for the Registry Gifting feature, alongside fixing critical TypeScript build errors in the mobile application.

---

## 🛠️ Changes by Area

### 1. Registry Data Privacy & Integrity
- **Recipient Identity Fix**: Resolved a critical data leakage issue where Registry Gifting orders were incorrectly defaulting to the Gifter's (Buyer's) profile information in the Seller Dashboard instead of the intended recipient.
- **Source of Truth Migration**: Modified `checkoutService.ts` to derive the recipient's name directly from the immutable `shipping_addresses` table during order creation, deprecating the use of stale registry metadata strings.
- **Data Fallbacks**: Updated `orderService.ts` and `mappers.ts` to include `first_name` and `last_name` in the database join queries, ensuring accurate naming is always available for the UI.
- **Type Consistency**: Synchronized `SellerOrder` and `SellerOrderSnapshot` interfaces to support the `is_registry_order` flag and properly type extended payment methods (e.g., e-wallets) and order statuses.

### 2. Registry Guest Redirection Flow
- **View-Only Guest Mode**: Allowed unauthenticated users to access shared registry links (`/registry/share/:id`) in a read-only state. Added an informational banner indicating guest status.
- **Seamless Login Routing**: Replaced "Buy Gift" buttons for guests with "Log in to Buy Gift", which automatically captures the current registry URL into session storage (`redirect_to`) before routing to the login screen.
- **Post-Auth Callback**: Upgraded the authentication listeners across `App.tsx`, `BuyerLoginPage.tsx`, and `AuthCallbackPage.tsx` to detect the stored `redirect_to` path. Upon a successful login or email-verified signup, users are automatically routed back to their specific shared registry link rather than the default shop page.

### 3. Mobile TypeScript Hotfixes
- **Cart Null Safety**: Fixed a potential null reference bug in `CartScreen.tsx` by ensuring `editingItem` is verified before accessing its quantity.
- **Checkout Service Typings**: Resolved a persistent TypeScript error in the mobile app's `checkoutService.ts` related to the `payment_method` schema by safely casting the direct database insert payload.

---

## 📄 Files Changed Summary

### Web (`web/`)

| File | Type | Description |
|---|---|---|
| `src/services/checkoutService.ts` | Modified | Updated recipient name resolution to use `shipping_addresses`. |
| `src/services/orderService.ts` | Modified | Enhanced joins to fetch name elements for fallback mapping. |
| `src/utils/orders/mappers.ts` | Modified | Applied address-based recipient name fallbacks. |
| `src/types/orders.ts` & `sellerTypes.ts` | Modified | Added `is_registry_order` and updated payment method unions. |
| `src/pages/SharedRegistryPage.tsx` | Modified | Implemented Guest Mode banner and redirect logic. |
| `src/pages/BuyerLoginPage.tsx` | Modified | Added standard login redirect interception. |
| `src/pages/AuthCallbackPage.tsx` | Modified | Added post-signup redirect interception. |
| `src/App.tsx` | Modified | Updated OAuth `onAuthStateChange` listener to respect redirect paths. |

### Mobile (`mobile-app/`)

| File | Type | Description |
|---|---|---|
| `app/CartScreen.tsx` | Modified | Fixed null checks for `editingItem`. |
| `src/services/checkoutService.ts` | Modified | Fixed `payment_method` update schema typescript error. |

---

## ✅ Testing Done

- [x] **Registry Privacy**: Confirmed that new registry orders correctly display the recipient's information to the seller.
- [x] **Guest Redirection**: Verified that visiting a registry unauthenticated, clicking login, and authenticating properly returns the user to the registry URL.
- [x] **OAuth Continuity**: Confirmed Google Sign-In respects the registry redirect path.
- [x] **Mobile Builds**: Verified `npx tsc --noEmit` passes with 0 errors in the mobile workspace.

---

## 💡 Notes for Reviewer
Existing incorrect registry orders in the database are immutable and will remain unchanged. These fixes apply only to newly created registry orders going forward. The `redirect_to` flow has been built robustly using `sessionStorage` to survive OAuth redirects.
