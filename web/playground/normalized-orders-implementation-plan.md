# Normalized Orders Integration Plan (Seller + Tracking Components)

## Summary
Update seller order screens and tracking modal to consume normalized order data (`orders`, `order_items`, `order_recipients`, `order_shipments`, `shipping_addresses`) through shared store/service mappings.

This phase excludes `OrdersPage` refactor and keeps current order-level status behavior for mixed-seller orders.

## Scope (Phase 1)
- `web/src/pages/SellerOrders.tsx`
- `web/src/components/OrderDetailsModal.tsx`
- `web/src/components/TrackingModal.tsx`
- `web/src/stores/sellerStore.ts`
- `web/src/stores/cartStore.ts`
- `web/src/services/orderService.ts`
- `web/src/tests/service-tests.ts`

## Interface/API Changes
- `SellerOrder` in `web/src/stores/sellerStore.ts` now includes:
  - `shipmentStatusRaw?: ShipmentStatus`
  - `paymentStatusRaw?: PaymentStatus`
  - `shippedAt?: string`
  - `deliveredAt?: string`
- `Order` in `web/src/stores/cartStore.ts` now includes:
  - `dbId?: string`
  - `shipmentStatus?: ShipmentStatus`
  - `paymentStatus?: PaymentStatus`
  - `shippedAt?: Date`
  - `deliveredAt?: Date`
- `OrderService` in `web/src/services/orderService.ts` now includes:
  - `getOrderTrackingSnapshot(orderIdOrNumber: string, buyerId?: string): Promise<OrderTrackingSnapshot | null>`
- `useOrderStore` in `web/src/stores/sellerStore.ts` now includes:
  - `markOrderAsShipped(id: string, trackingNumber: string): Promise<void>`
  - `markOrderAsDelivered(id: string): Promise<void>`

## Implementation To-Do List
- [x] Add normalized status mapping helpers used by `orderService` and `sellerStore`.
- [x] Expand `orderService.getSellerOrders` join/select and compatibility projection.
- [x] Add `orderService.getOrderTrackingSnapshot`.
- [x] Fix `orderService.updateOrderStatus` seller resolution from normalized order payload.
- [x] Extend `SellerOrder` type and rewrite `mapOrderToSellerOrder`.
- [x] Add `useOrderStore.markOrderAsShipped` and `useOrderStore.markOrderAsDelivered`.
- [x] Refactor `web/src/pages/SellerOrders.tsx` to use store actions.
- [x] Refactor `web/src/components/OrderDetailsModal.tsx` to use store actions and remove debug logs.
- [x] Extend cart `Order` type with optional DB tracking fields.
- [x] Refactor `web/src/components/TrackingModal.tsx` to fetch/use normalized tracking snapshot with fallbacks.
- [x] Add/adjust service tests for seller orders + shipment tracking snapshot.
- [x] Run targeted regression check: `npm run build` (pass).

## Validation Scenarios
1. Seller order load maps normalized statuses correctly (`waiting_for_seller`, `processing`, `ready_to_ship`, `out_for_delivery`, `delivered`, `returned`).
2. Seller “Mark as Shipped” writes `orders.shipment_status='shipped'`, writes/updates `order_shipments.tracking_number`, and refreshes UI.
3. Seller “Mark as Delivered” writes `orders.shipment_status='delivered'`, updates `order_shipments.delivered_at`, and refreshes UI.
4. Seller order modal renders recipient/address from normalized joins with fallback to `notes` address payload.
5. Buyer `TrackingModal` attempts DB tracking snapshot when `dbId` exists and falls back safely for local/mock orders.
6. Offline/POS orders remain render-safe when address/tracking fields are absent.

## Deferred (Phase 2)
- Refactor `web/src/pages/OrdersPage.tsx` to use shared buyer-order mapping logic.
- Align cancel flow to normalized schema (`payment_status` + `shipment_status` + `order_cancellations`).

