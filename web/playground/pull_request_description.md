## Summary
Refactors order/shipment flows to the new typed API surface, migrates app callers off direct `orderService` usage, adds reusable order UI components, and introduces an atomic SQL RPC for cancellation.

This PR completes the Order/Shipment API adoption plan and updates the execution tracker in `web/playground/order_api_adoption_plan.md`.

## What Changed
### 1) New typed order domain layer
- Added `web/src/types/orders.ts` with shared order DTOs:
  - `BuyerOrderSnapshot`
  - `SellerOrderSnapshot`
  - `OrderDetailSnapshot`
  - `OrderTrackingSnapshot`
  - `NormalizedShippingAddress`
  - `OrderUiStatus`

### 2) Shared order constants and utilities
- Added `web/src/data/orders/status-maps.ts`
- Added `web/src/data/orders/tracking-steps.ts`
- Added utility modules:
  - `web/src/utils/orders/legacy.ts`
  - `web/src/utils/orders/status.ts`
  - `web/src/utils/orders/shipment.ts`
  - `web/src/utils/orders/mappers.ts`

These centralize:
- Legacy `SHIPPING_ADDRESS:` parsing fallback
- Normalized status -> UI/legacy status mapping
- Latest shipment/cancellation record resolution
- DB row -> buyer/seller/detail snapshot mapping

### 3) New services and API adoption
- Added read service: `web/src/services/orders/orderReadService.ts`
  - `getBuyerOrders({ buyerId })`
  - `getSellerOrders({ sellerId })`
  - `getOrderTracking({ orderIdOrNumber, buyerId? })`
  - `getOrderDetail({ orderIdOrNumber, buyerId? })`
- Added mutation service: `web/src/services/orders/orderMutationService.ts`
  - `updateOrderStatus(...)`
  - `markOrderShipped(...)`
  - `markOrderDelivered(...)`
  - `cancelOrder(...)`
  - `submitOrderReview(...)`
  - `createPOSOrder(...)`

### 4) Caller migrations (app + script tests)
Migrated direct order calls in:
- `web/src/pages/OrdersPage.tsx`
- `web/src/pages/OrderDetailPage.tsx`
- `web/src/components/TrackingModal.tsx`
- `web/src/components/ReviewModal.tsx`
- `web/src/pages/SellerPOS.tsx`
- `web/src/stores/sellerStore.ts`
- `web/src/tests/service-tests.ts`
- `web/src/tests/flow-tests.ts`

Result:
- App code now reads via `orderReadService` and writes via `orderMutationService`.
- No direct `orderService` imports remain in app pages/components/stores.

### 5) Atomic cancel migration
- Added `supabase-migrations/004_order_cancel_atomic.sql`.
- Introduces `cancel_order_atomic(p_order_id, p_reason, p_cancelled_by, p_changed_by_role) returns boolean`.
- Behavior:
  - Locks order row with `FOR UPDATE`
  - Computes next payment status (`refunded` for paid/partially_refunded, otherwise `pending_payment`)
  - Updates `orders.payment_status` + `orders.shipment_status='returned'`
  - Inserts `order_cancellations`
  - Inserts `order_status_history`
  - Does **not** overwrite `orders.notes`

### 6) Reusable order UI components
- Added:
  - `web/src/components/orders/OrderStatusBadge.tsx`
  - `web/src/components/orders/TrackingSteps.tsx`
  - `web/src/components/orders/ShippingAddressCard.tsx`
- Integrated into:
  - `web/src/components/TrackingModal.tsx`
  - `web/src/components/OrderDetailsModal.tsx`
  - `web/src/pages/SellerOrders.tsx`
  - `web/src/pages/OrdersPage.tsx`
  - `web/src/pages/OrderDetailPage.tsx`

### 7) Store cleanup
- Added explicit buyer-order hydration action in `web/src/stores/cartStore.ts`:
  - `hydrateBuyerOrders(orders)`
- Removed redundant optimistic seller-order writes in `web/src/stores/sellerStore.ts` where service refresh is authoritative.
- Removed unused file: `web/src/stores/orderStore.ts`.

### 8) Focused tests added
- `web/src/tests/order-status-mappers.test.ts`
- `web/src/tests/order-row-mappers.test.ts`
- `web/src/tests/order-mutation-cancel.test.ts`

## Validation
Executed successfully:
- `cd web && npm run build`
- `cd web && npx vitest run src/tests/order-status-mappers.test.ts src/tests/order-row-mappers.test.ts src/tests/order-mutation-cancel.test.ts`

Test result:
- 3 test files passed
- 8 tests passed

## Notes
- `web/src/services/orderService.ts` remains in repo as compatibility backend for the new services in this pass.
- Existing build warnings about chunk size/dynamic import boundaries are unchanged and non-blocking for this PR.
- Tracker status and milestone log were updated in `web/playground/order_api_adoption_plan.md`.

## Follow-up Performance Hotfix (Included)
To reduce perceived latency (~700ms+) when confirming, shipping, delivering, and cancelling orders:

- Made seller-side order status notifications non-blocking in:
  - `web/src/services/orderService.ts`
- Switched seller actions to optimistic state updates with background refresh (no blocking full reload in action path):
  - `web/src/stores/sellerStore.ts`
- Switched buyer cancel flow to optimistic local update + background reload:
  - `web/src/pages/OrdersPage.tsx`
- Reduced payload on ship/deliver pre-check queries (`select` only needed columns) in:
  - `web/src/services/orderService.ts`
- Added DB index migration for hot order query paths:
  - `supabase-migrations/005_order_query_indexes.sql`

Validation rerun after hotfix:
- `cd web && npm run build`
- `cd web && npx vitest run src/tests/order-status-mappers.test.ts src/tests/order-row-mappers.test.ts src/tests/order-mutation-cancel.test.ts`
- Result: 3 test files passed, 8 tests passed.
