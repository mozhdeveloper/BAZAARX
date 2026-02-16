# Order/Shipment Refactor + API Adoption (Decision-Complete)

## Summary
Refactor order/shipment logic into shared typed mappers and split services, while fully adopting new service APIs now (no compatibility facade), and adding an atomic DB cancel RPC migration file.  
This plan also creates a handoff-friendly API adoption document first, so another agent can continue implementation without re-discovery.

## Findings From Review (Severity Ordered)
1. **[P1] Cancel path is currently non-atomic and can lose legacy address data**.  
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/services/orderService.ts:1474` updates `orders`, then inserts `order_cancellations`, then `order_status_history` with separate calls; failures can leave partial state.  
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/services/orderService.ts:1479` overwrites `orders.notes`, but notes are parsed for legacy shipping addresses at `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/services/orderService.ts:98`, `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/pages/OrdersPage.tsx:36`, `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/stores/sellerStore.ts:483`, `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/pages/OrderDetailPage.tsx:226`.
2. **[P1] “Adopt new APIs now” requires broader caller migration than current scope lists**.  
Additional active callers exist at `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/pages/SellerPOS.tsx:230` and `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/components/ReviewModal.tsx:62`.
3. **[P2] Order detail still performs chained reads and inline mapping**.  
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/pages/OrderDetailPage.tsx:97` performs direct raw DB query and `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/pages/OrderDetailPage.tsx:140` does extra seller lookup; mapping/status/address logic is duplicated in-page.
4. **[P2] Current “targeted service tests” are not deterministic in this environment**.  
`build` passes, but script-style service tests are not directly runnable as-is, and full Vitest suites are already noisy/flaky; focused unit coverage must carry this refactor.

## Scope (Revised)
1. Keep original in-scope files from `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/playground/order_shipment_refactor_plan.md`.
2. Add these required files to scope for API adoption completeness:
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/pages/SellerPOS.tsx`,
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/components/ReviewModal.tsx`,
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/tests/flow-tests.ts` (import/API compile alignment only, not full suite rewrite).
3. Add migration scope:
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/supabase-migrations/004_order_cancel_atomic.sql`.
4. Add adoption handoff artifact:
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/playground/order_api_adoption_plan.md`.

## Public API / Type Changes
1. Add domain types in `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/types/orders.ts`:
`BuyerOrderSnapshot`, `SellerOrderSnapshot`, `OrderDetailSnapshot`, `OrderTrackingSnapshot`, `NormalizedShippingAddress`, `OrderUiStatus`.
2. Add read service in `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/services/orders/orderReadService.ts`:
`getBuyerOrders({ buyerId })`, `getSellerOrders({ sellerId })`, `getOrderTracking({ orderIdOrNumber, buyerId? })`, `getOrderDetail({ orderIdOrNumber, buyerId? })`.
3. Add mutation service in `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/services/orders/orderMutationService.ts`:
`updateOrderStatus({ orderId, nextStatus, actorId?, actorRole?, note? })`, `markOrderShipped({ orderId, sellerId, trackingNumber })`, `markOrderDelivered({ orderId, sellerId })`, `cancelOrder({ orderId, reason?, cancelledBy? })`, `submitOrderReview({ orderId, buyerId, rating, comment, images? })`, `createPOSOrder(input)`.
4. Remove direct app usage of `orderService` methods; migrate all callers above to new services.
5. Keep `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/services/orderService.ts` only as temporary compile shim during migration step, then remove old method surface in same refactor pass.

## Git Commit Strategy
Commit working changes at each major milestone to preserve incremental progress. Each commit should be atomic, buildable, and include a descriptive message.

**Commit Points:**
1. After creating handoff document → `git commit -m "docs: add order API adoption handoff plan"`
2. After extracting shared utilities → `git commit -m "refactor(orders): extract shared order utilities and mappers"`
3. After creating data constants → `git commit -m "refactor(orders): add order status maps and tracking step constants"`
4. After implementing read service + initial page migrations → `git commit -m "feat(orders): implement orderReadService and migrate OrdersPage/OrderDetailPage"`
5. After creating atomic cancel migration → `git commit -m "feat(db): add atomic order cancellation RPC migration"`
6. After implementing mutation service + migrating callers → `git commit -m "feat(orders): implement orderMutationService and migrate all callers"`
7. After refactoring UI components → `git commit -m "refactor(orders): extract OrderStatusBadge, TrackingSteps, ShippingAddressCard components"`
8. After store cleanup → `git commit -m "refactor(stores): clean up order hydration and remove redundant writes"`
9. After dead code removal → `git commit -m "chore: remove deprecated orderService methods and unused orderStore"`
10. After test updates and validation → `git commit -m "test(orders): add focused unit tests for status mappers and cancel mutation"`

**Commit Guidelines:**
- Run `npm run build` before each commit to ensure it compiles
- Stage only related files for each commit (use `git add <specific-files>`)
- If a step fails, do not commit partial/broken work
- Use conventional commit format: `type(scope): description`
- Types: `feat`, `refactor`, `test`, `chore`, `docs`, `fix`

## Implementation Plan
1. **Create API adoption handoff file first** in `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/playground/order_api_adoption_plan.md`; include old->new API mapping matrix, per-file migration checklist, milestone log, and “resume from here” notes.
2. **Extract shared order utilities** into:
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/utils/orders/legacy.ts`,
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/utils/orders/status.ts`,
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/utils/orders/shipment.ts`,
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/utils/orders/mappers.ts`;
move all duplicated `SHIPPING_ADDRESS` parsing, status maps, latest shipment/cancellation logic here.
3. **Create data constants** in:
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/data/orders/status-maps.ts`,
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/data/orders/tracking-steps.ts`.
4. **Implement read service** and replace raw inline mapping in:
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/pages/OrdersPage.tsx`,
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/pages/OrderDetailPage.tsx`,
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/stores/sellerStore.ts`,
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/components/TrackingModal.tsx`.
5. **Implement mutation service** with atomic cancel RPC usage and migrate callers in:
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/stores/sellerStore.ts`,
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/pages/OrdersPage.tsx`,
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/components/ReviewModal.tsx`,
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/pages/SellerPOS.tsx`.
6. **Add atomic cancel migration** in `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/supabase-migrations/004_order_cancel_atomic.sql`; function updates `orders` + inserts `order_cancellations` + inserts `order_status_history` in one transaction; do not overwrite `orders.notes`.
7. **Refactor UI composition** by introducing:
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/components/orders/OrderStatusBadge.tsx`,
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/components/orders/TrackingSteps.tsx`,
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/components/orders/ShippingAddressCard.tsx`;
replace duplicated badge/timeline/address rendering in the five targeted pages/components.
8. **Store hydration cleanup**:
add explicit buyer-order hydration action in `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/stores/cartStore.ts` (no direct `setState` from page), remove redundant optimistic local writes where mutation service + refresh is source of truth.
9. **Dead code cleanup**:
remove or archive `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/stores/orderStore.ts` if still unreferenced after refactor.
10. **Finalize API adoption**:
remove old `orderService.*` app usage and update `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/tests/service-tests.ts` plus import/API compile alignment in `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/tests/flow-tests.ts`.

## Test Cases and Validation
1. Buyer snapshot mapping returns consistent UI statuses (`pending`, `confirmed`, `shipped`, `delivered`, `cancelled`, `returned`, `reviewed`) including cancellation-aware `returned` logic.
2. Seller snapshot mapping returns consistent totals, tracking, and normalized raw statuses.
3. Legacy notes parsing works when normalized recipient/address joins are null.
4. Cancel mutation executes atomic path via RPC contract and never clobbers legacy notes payload.
5. Tracking component renders full timeline from normalized timestamps and degrades safely with partial shipment data.
6. Order detail page consumes `OrderDetailSnapshot` only; no inline DB row mapping.
7. Seller ship/deliver mutations still reflect correctly after refresh.
8. POS order creation still works through new mutation API and appears in seller order list.
9. Focused tests added:
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/tests/order-status-mappers.test.ts`,
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/tests/order-row-mappers.test.ts`,
`/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/src/tests/order-mutation-cancel.test.ts`.
10. Acceptance commands:
`npm run build` and `npx vitest run src/tests/order-status-mappers.test.ts src/tests/order-row-mappers.test.ts src/tests/order-mutation-cancel.test.ts`.

## Assumptions and Defaults
1. Chosen default: adopt new APIs now; caller migration is done in this same pass.
2. Chosen default: implement atomic cancel via migration SQL + service RPC call; migration file is authored but not executed in this refactor.
3. Chosen default: focused + unit test updates only; full integration suite stabilization is deferred.
4. `orders.notes` remains reserved for legacy payload compatibility; cancellation reason lives in `order_cancellations` and `order_status_history`.
5. Normalized schema files in `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/web/supabase/schemas/` are treated as source of truth for read/write fields.
