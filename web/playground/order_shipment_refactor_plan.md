# Core Order & Shipment Refactor Plan (with Legacy Adapter Layer)

## Summary
Refactor core order/shipment flows to a single normalized architecture across services, stores, and UI while preserving legacy behavior through explicit adapter functions.  
This plan removes duplicated mapping/parsing logic, improves consistency of status transitions and tracking rendering, and reduces latency by simplifying read paths and eliminating repeated per-component queries.

## Scope
In scope:
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/services/orderService.ts`
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/stores/sellerStore.ts`
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/stores/cartStore.ts`
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/pages/SellerOrders.tsx`
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/components/OrderDetailsModal.tsx`
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/components/TrackingModal.tsx`
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/pages/OrdersPage.tsx`
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/pages/OrderDetailPage.tsx`
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/tests/service-tests.ts`
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/types/database.types.ts`

Out of scope (this pass):
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/pages/DeliveryTrackingPage.tsx`
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/components/TrackingForm.tsx`
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/components/TrackingTimeline.tsx`
- Admin order pages

## File Strategy (including new files)
Use existing `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/utils/`, `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/data/`, and `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/components/`.

Create these new files:
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/utils/orders/legacy.ts`
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/utils/orders/status.ts`
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/utils/orders/shipment.ts`
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/utils/orders/mappers.ts`
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/data/orders/status-maps.ts`
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/data/orders/tracking-steps.ts`
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/components/orders/OrderStatusBadge.tsx`
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/components/orders/TrackingSteps.tsx`
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/components/orders/ShippingAddressCard.tsx`

You are explicitly allowed to create additional service/store files if more effective.  
Planned split (recommended):
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/services/orders/orderReadService.ts`
- `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/services/orders/orderMutationService.ts`

Store split rule:
- If shared async order/tracking UI state is used by 2+ consumers during refactor, create `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/stores/orderTrackingStore.ts`; otherwise keep state inside existing stores/components.

## Public APIs / Interfaces / Types
Add typed DTOs to remove `any` across order flows:
- `BuyerOrderSnapshot`
- `SellerOrderSnapshot`
- `OrderDetailSnapshot`

Centralize and export legacy-compatible helpers:
- `parseLegacyShippingAddressFromNotes(notes)`
- `mapLegacyStatusToNormalized(status)`
- `mapNormalizedToBuyerUiStatus(paymentStatus, shipmentStatus, hasCancellation, isReviewed)`
- `mapNormalizedToSellerUiStatus(paymentStatus, shipmentStatus)`
- `getLatestShipment(shipments)`
- `getLatestCancellation(cancellations)`

Keep existing store interfaces backward-compatible:
- Preserve optional fields in `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/stores/cartStore.ts` and `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/stores/sellerStore.ts`.
- Do not break existing consumers expecting current order status literals.

## Implementation Plan

### 1) Extract legacy + status + shipment utility layer
- Move all notes parsing, status conversion, and shipment/cancellation latest-record logic from pages/stores/services into `utils/orders/*`.
- Replace duplicated inline maps in `OrdersPage`, `OrderDetailPage`, `sellerStore`, and `orderService` with shared helpers.
- Mirror product legacy style from `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/utils/productMapper.ts`: normalized-first, explicit fallback, deprecation comments.

### 2) Build mapper functions for all core surfaces
- Implement mapper functions in `utils/orders/mappers.ts`:
  - DB row -> buyer UI/store order
  - DB row -> seller UI/store order
  - DB row -> order detail view model
- Ensure all core pages/services call these mappers; no page-level raw DB mapping.

### 3) Split service responsibilities
- Keep `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/services/orderService.ts` as compatibility facade.
- Move reads to `orderReadService.ts`:
  - buyer list
  - seller list
  - tracking snapshot
  - order detail snapshot
- Move writes to `orderMutationService.ts`:
  - status transition
  - mark shipped
  - mark delivered
  - cancel order
- Keep cancellation normalized writes consistent (`orders`, `order_cancellations`, `order_status_history`).

### 4) Refactor stores to consume typed snapshots
- `sellerStore`: replace inline mapping and parsing with shared mapper outputs.
- `cartStore`: ensure buyer orders are hydrated from mapped snapshots only.
- Remove redundant local mutations where service refresh is authoritative.
- Keep soft legacy behavior through centralized adapter layer only.

### 5) Refactor UI to reusable order components
- `SellerOrders`, `OrderDetailsModal`, `TrackingModal`, `OrdersPage`, `OrderDetailPage` should render:
  - `OrderStatusBadge`
  - `TrackingSteps`
  - `ShippingAddressCard`
- Remove duplicate status badge logic, timeline generation, and address fallback rendering.
- Ensure graceful null/legacy fallback for guest/offline/incomplete records.

### 6) Redundant code cleanup
- Remove repeated `SHIPPING_ADDRESS:` parsing blocks in pages/stores.
- Remove repeated status mapping blocks in pages/services.
- Remove stale comments that reference pre-normalized schema behavior.
- Review `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/stores/orderStore.ts` for dead-code cleanup after core refactor.

### 7) Latency optimization (recommendations only)
Service/query recommendations:
- Narrow select columns to view-model requirements.
- Avoid component-level chained fetches for seller/store data when already joinable in service query.
- Avoid repeated per-order lookups in loops by pre-joining or batching.

Database recommendations (no migration execution in this phase):
- Add index on `orders (buyer_id, created_at desc)`.
- Add index on `orders (shipment_status, payment_status)`.
- Add index on `order_items (order_id)`.
- Add index on `order_items (product_id, order_id)`.
- Add index on `order_shipments (order_id, created_at desc)`.
- Add index on `order_cancellations (order_id, cancelled_at desc)`.

### 8) Validation and regression pass
- Update tests for new mapper/adapter behavior and write-path consistency.
- Keep existing behavior for seller transitions and buyer tracking/cancel flows.
- Run build and targeted service tests.

## Test Cases and Scenarios
1. Buyer orders map normalized statuses to UI statuses correctly, including reviewed and cancellation-aware returned/cancelled behavior.
2. Seller orders map normalized statuses, totals, and tracking from latest shipment consistently.
3. Legacy notes-based address parsing works when normalized address relation is missing.
4. Cancel flow writes to `orders`, `order_cancellations`, and `order_status_history` in one transaction path.
5. Tracking modal timeline renders from normalized shipment timestamps and safely falls back when partial data is missing.
6. Order detail page no longer maps raw DB rows inline and still shows correct seller/item/address/tracking fields.
7. Seller “mark shipped” and “mark delivered” remain functional and reflected after refresh.
8. Core flows remain stable for offline/POS and partial legacy records.

## Assumptions and Defaults
- Use existing `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/utils/` instead of introducing `/util/`.
- Legacy compatibility is soft and centralized (do not scatter legacy branches in page components).
- New service/store files are allowed and encouraged when they reduce complexity.
- DB optimization section is recommendation-only (no migrations executed in this refactor phase).
- Normalized schema files under `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/supabase/schemas/` are source-of-truth.
