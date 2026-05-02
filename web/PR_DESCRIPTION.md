# Orders Stability, Legacy Status Compatibility, and Loading UX Improvements

This PR updates both mobile and web order flows to fix missing legacy orders, improve loading behavior, reduce fetch stalls, and prevent crashes when users have many orders.

---

## What Changed

### 1. Web: Legacy status compatibility for shipped/delivered/received tabs
- Added support for legacy `completed` shipment values in status mapping.
- Improved buyer order mapping to derive effective shipment status from:
  - normalized `shipment_status`
  - legacy top-level status fallback
  - latest shipment relation fallback
- Updated tab filtering behavior so delivered/shipped tabs include equivalent legacy statuses.

### 2. Web: Better tab loading UX
- Added loading skeletons to orders list while fetching.
- Kept status-aware empty messages for shipped and delivered tabs.
- Ensured refetch and hydration occur consistently on tab changes and post-action refreshes.

### 3. Mobile: OrdersScreen tab behavior and fetch reliability
- Replaced legacy static tab label logic with centralized tab config (`Received` included).
- Added active-tab driven fetch and refresh flow via `useEffect`/`useCallback`.
- Introduced tab-aware server filters using existing DB columns (`shipment_status`, `payment_status`).
- Bounded fetch size with a configurable cap per tab to avoid loading huge payloads.

### 4. Mobile: Loading UX and large-list stability
- Added real loading state and skeleton placeholders for all tabs.
- Upgraded skeletons to animated shimmer so loading feels active.
- Replaced `ScrollView + map` with virtualized `FlatList` to prevent crashes when order count is high.
- Tuned list virtualization (`initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, clipping).

### 5. Mobile: Auth/session resilience for startup order loading
- Seeded a fallback user object during optimistic session hydration so order fetches can proceed even if background profile/role reads fail.
- Reduced Supabase fetch timeout and made it configurable to avoid long UI stalls on weak connections.
- Softened abort-like auth/profile fetch logging (warn/fallback instead of noisy hard errors).

### 6. Mobile: Type safety fix in OrderConfirmation -> Orders navigation
- Fixed route param mismatch by mapping PayMongo shortcut tab to `confirmed` (route-safe value) instead of `processing`.
- `npx tsc --noEmit` passes after this update.

---

## Files Updated

### Mobile
- `mobile-app/app/OrdersScreen.tsx`
  - tab config refactor
  - loading state + animated shimmer skeletons
  - FlatList virtualization
  - tab-aware query filtering and bounded fetch
- `mobile-app/src/lib/supabase.ts`
  - configurable fetch timeout with safer default
- `mobile-app/src/services/authService.ts`
  - abort-like error detection and calmer fallback logging
- `mobile-app/src/stores/authStore.ts`
  - fallback user seeding during optimistic session check
- `mobile-app/app/OrderConfirmation.tsx`
  - route-safe `initialTab` value (`confirmed`/`pending`)

### Web
- `web/src/pages/OrdersPage.tsx`
  - loading skeleton integration
  - improved tab matching for legacy-equivalent statuses
  - status-aware refetch paths
- `web/src/services/orderService.ts`
  - legacy `completed` mapping support
  - optional shipment status filtering support
- `web/src/services/orders/orderReadService.ts`
  - passthrough for optional shipment status filter input
- `web/src/utils/orders/mappers.ts`
  - effective shipment status derivation with legacy fallback
- `web/src/utils/orders/status.ts`
  - `completed` compatibility in buyer/seller/legacy status mapping

---

## Validation

- Type check: `mobile-app` `npx tsc --noEmit` passes.
- Lint/errors: no file-level errors reported on touched mobile/web order files.
- Runtime impact:
  - Orders loading no longer flashes empty state while data is in-flight.
  - Large order histories no longer attempt to render all cards at once.
  - Legacy completed orders now map into appropriate visible tabs.

---

## Reviewer Notes

- No schema migration is included in this PR.
- Most changes are compatibility and UI-state handling over existing normalized order data.
- Mobile query filters intentionally use only verified columns to avoid SQL errors.
