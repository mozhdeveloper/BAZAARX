# Mobile Order & Payment Fixes + History/Order Details UI

This PR contains a focused set of bug fixes and UI improvements across the mobile app's order flow and a small related update to the web Order Detail page. Key areas addressed include payment-method normalization, Order Details/History UI parity (received state), return request validation, and a few checkout/service type fixes.

---

## Summary of Changes (based on working tree)

### Mobile (`mobile-app/`)
- `app/OrderDetailScreen.tsx` (modified): Ensure Order Details reflects `received` state consistently; improved status resolution and immediate UI update after confirming receipt; defensive fixes around payment resolution and action-button rendering.
- `app/OrdersScreen.tsx` (modified): Robust payment resolution to handle Supabase returning either object or array for `order.payments`; use normalized payment method labels.
- `app/CheckoutScreen.tsx` (modified): Store normalized payment method on checkout flow and fix related edge cases.
- `app/PaymentGatewayScreen.tsx` (modified): Payment flow adjustments and UI labels for payment methods.
- `app/OrderConfirmation.tsx` (modified): Minor flow/label fixes post-checkout.
- `app/ProductDetailScreen.tsx` (modified): Removed Free Shipping badge and minor spacing tweaks.
- `app/ReturnRequestScreen.tsx` (modified): Make description and evidence mandatory when required, add validation and error states, and reposition asterisk indicators.
- `src/services/checkoutService.ts` (modified): Normalize payment method when creating `order_payments` records to avoid mismatched values (e.g., 'PayMongo' vs 'paymongo').
- `src/services/orderService.ts` (modified): Minor service adjustments to map statuses/fields consistently for UI rendering.
- `src/constants/paymentMethods.ts` (new, untracked): Centralized payment method constants and helpers to normalize, detect PayMongo, and produce labels.

### Web (`web/`)
- `src/pages/OrderDetailPage.tsx` (modified): Small UI/label updates to match mobile Order Details behavior for received orders.

---

## Files Changed (git status)

Modified:
- mobile-app/app/CheckoutScreen.tsx
- mobile-app/app/HistoryScreen.tsx
- mobile-app/app/OrderConfirmation.tsx
- mobile-app/app/OrderDetailScreen.tsx
- mobile-app/app/OrdersScreen.tsx
- mobile-app/app/PaymentGatewayScreen.tsx
- mobile-app/app/ProductDetailScreen.tsx
- mobile-app/app/ReturnRequestScreen.tsx
- mobile-app/src/services/checkoutService.ts
- mobile-app/src/services/orderService.ts
- web/src/pages/OrderDetailPage.tsx

Added (untracked):
- mobile-app/src/constants/paymentMethods.ts

---

## Notes / Rationale
- Root cause for multiple PayMongo vs COD display issues: inconsistent casing/format of `payment_method` across services and Supabase responses (array vs object). Standardizing storage (lowercase) and adding normalization utilities fixes display and logic bugs.
- History -> OrderDetails flow now passes `buyerUiStatus` so the Order Details screen can render the same received-state UI and hide action buttons consistently.
- Return request validation was tightened to reduce incomplete submissions and improve UX.

## Next Steps / Recommendations
- Run the mobile app and verify the Order Details flow: confirm receipt, ensure button disappears and status shows `Order Received` in History.
- Run unit/type checks: `npx tsc --noEmit` in `mobile-app` to verify typings after these changes.

If you'd like, I can open a draft PR with these changes and include screenshots verifying the Order Received state.
