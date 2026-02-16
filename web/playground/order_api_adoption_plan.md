# Order API Adoption Tracker

This tracker is the single source of truth for the refactor execution status.

## API Mapping Matrix
| Old call | New call |
|---|---|
| `orderService.getBuyerOrders(buyerId)` | `orderReadService.getBuyerOrders({ buyerId })` |
| `orderService.getSellerOrders(sellerId)` | `orderReadService.getSellerOrders({ sellerId })` |
| `orderService.getOrderTrackingSnapshot(orderIdOrNumber)` | `orderReadService.getOrderTracking({ orderIdOrNumber })` |
| `orderService.updateOrderStatus(orderId, status, note, actorId, actorRole)` | `orderMutationService.updateOrderStatus({ orderId, nextStatus: status, note, actorId, actorRole })` |
| `orderService.markOrderAsShipped(orderId, trackingNumber, sellerId)` | `orderMutationService.markOrderShipped({ orderId, trackingNumber, sellerId })` |
| `orderService.markOrderAsDelivered(orderId, sellerId)` | `orderMutationService.markOrderDelivered({ orderId, sellerId })` |
| `orderService.cancelOrder(orderId, reason, cancelledBy)` | `orderMutationService.cancelOrder({ orderId, reason, cancelledBy, changedByRole: cancelledBy ? "buyer" : null })` |
| `orderService.submitOrderReview(orderId, buyerId, rating, comment, images)` | `orderMutationService.submitOrderReview({ orderId, buyerId, rating, comment, images })` |
| `orderService.createPOSOrder(...)` | `orderMutationService.createPOSOrder(input)` |

## Milestones
| ID | Status | Task | Files |
|---|---|---|---|
| M0 | DONE | Create tracker doc with API matrix, per-file checklist, milestone log, resume notes | `web/playground/order_api_adoption_plan.md` |
| M1 | DONE | Add domain types + constants + shared order utilities/mappers | `web/src/types/orders.ts`, `web/src/data/orders/*`, `web/src/utils/orders/*` |
| M2 | DONE | Implement read service and migrate read callers | `web/src/services/orders/orderReadService.ts`, pages/stores/components |
| M3 | DONE | Add atomic cancel migration and wire mutation service cancel to RPC | `supabase-migrations/004_order_cancel_atomic.sql`, `web/src/services/orders/orderMutationService.ts` |
| M4 | DONE | Implement mutation methods and migrate write callers | `web/src/services/orders/orderMutationService.ts`, stores/pages/components |
| M5 | DONE | Extract reusable order UI components and replace duplicated rendering | `web/src/components/orders/*`, related pages/components |
| M6 | DONE | Store hydration cleanup and redundant write removal | `web/src/stores/cartStore.ts`, `web/src/stores/sellerStore.ts` |
| M7 | DONE | Remove deprecated app-level `orderService` usage and dead code | `web/src/services/orderService.ts`, `web/src/stores/orderStore.ts` |
| M8 | DONE | Update tests and add focused unit tests | `web/src/tests/*` |
| M9 | DONE | Final validation + tracker completion | `web/playground/order_api_adoption_plan.md` |

## File Migration Checklist
- [x] `web/src/pages/OrdersPage.tsx`
- [x] `web/src/pages/OrderDetailPage.tsx`
- [x] `web/src/components/TrackingModal.tsx`
- [x] `web/src/components/ReviewModal.tsx`
- [x] `web/src/pages/SellerPOS.tsx`
- [x] `web/src/stores/sellerStore.ts`
- [x] `web/src/tests/service-tests.ts`
- [x] `web/src/tests/flow-tests.ts`
- [x] `web/src/components/OrderDetailsModal.tsx`
- [x] `web/src/pages/SellerOrders.tsx`

## Performance Follow-up Todo
| ID | Status | Task | Files |
|---|---|---|---|
| P1 | DONE | Make seller status/ship/deliver notifications non-blocking in service layer | `web/src/services/orderService.ts` |
| P2 | DONE | Optimistically update seller order state and refresh in background | `web/src/stores/sellerStore.ts` |
| P3 | DONE | Optimistically update buyer cancel flow and refresh in background | `web/src/pages/OrdersPage.tsx` |
| P4 | DONE | Add query indexes for orders/order_items/shipments/cancellations hot paths | `supabase-migrations/005_order_query_indexes.sql` |

## Milestone Log
- 2026-02-11: Initialized tracker and confirmed migration targets.
- 2026-02-11: Added shared order domain types, status constants, utility helpers, and mapper layer.
- 2026-02-11: Added `orderReadService` + `orderMutationService` and migrated app callers to new services.
- 2026-02-11: Added atomic cancellation migration RPC (`cancel_order_atomic`) and wired mutation cancel to RPC path.
- 2026-02-11: Added reusable order UI components (`OrderStatusBadge`, `TrackingSteps`, `ShippingAddressCard`) and integrated them into order screens/modals.
- 2026-02-11: Added cart buyer-order hydration action and removed redundant optimistic seller-order writes in favor of refresh.
- 2026-02-11: Removed deprecated app-level direct `orderService` usage and removed unused `web/src/stores/orderStore.ts`.
- 2026-02-11: Added focused unit tests (`order-status-mappers`, `order-row-mappers`, `order-mutation-cancel`) and validated with build + targeted vitest run.
- 2026-02-11: Applied order action latency hotfixes (non-blocking notifications, optimistic local updates, background refresh).
- 2026-02-11: Added order query performance indexes migration (`supabase-migrations/005_order_query_indexes.sql`).

## Resume From Here
1. No open milestones in this tracker.
2. Optional next pass: refactor `web/src/services/orderService.ts` internals into a pure compatibility shim backed directly by the new services.
