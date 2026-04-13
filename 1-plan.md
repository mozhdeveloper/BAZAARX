---
description: EPIC 9 mobile implementation plan artifact
globs:
alwaysApply: false
---

# EPIC 9 Logistics and Shipping - Mobile Implementation Plan

## 1. Solution Summary

Implement per-seller shipping in checkout by replacing the current single shipping subtotal model with seller-group shipping state in [mobile-app/app/CheckoutScreen.tsx](mobile-app/app/CheckoutScreen.tsx), then persist selected shipping method plus ETA into backend-backed order records through [mobile-app/src/services/checkoutService.ts](mobile-app/src/services/checkoutService.ts). Address validation is enforced both when saving/editing addresses and before place-order, using [mobile-app/src/services/addressService.ts](mobile-app/src/services/addressService.ts) as the canonical validation entry point.

The current code already has:

- Seller grouping in checkout UI (grouped by seller name)
- Delivery rate service primitives in [mobile-app/src/services/deliveryService.ts](mobile-app/src/services/deliveryService.ts)
- Checkout context preload via edge function in [mobile-app/src/services/checkoutService.ts](mobile-app/src/services/checkoutService.ts)

The plan extends these primitives instead of introducing a large new architecture.

## 2. Affected Pages and Files

### 2.1 Directly Affected Pages (UI)

1. [mobile-app/app/CheckoutScreen.tsx](mobile-app/app/CheckoutScreen.tsx)
- Why: Core implementation for BX-09-001, BX-09-002, BX-09-003, BX-09-004.
- Changes:
	- Group shipping by seller id (not only seller name label).
	- Load shipping methods per seller group once address is valid.
	- Show per-seller fee, selected method, ETA, loading, and per-group error/retry.
	- Block place-order if any group has unresolved shipping/address validation errors.
	- Recalculate when address, selected items, quantity, or selected shipping method changes.

2. [mobile-app/app/AddressesScreen.tsx](mobile-app/app/AddressesScreen.tsx)
- Why: BX-09-004 requires stricter address validation and serviceability checks at edit/save time.
- Changes:
	- Enforce required fields and mobile/postal format checks.
	- Surface serviceability failure message before save.

3. [mobile-app/app/OrderConfirmation.tsx](mobile-app/app/OrderConfirmation.tsx)
- Why: BX-09-003 requires ETA visibility after order placement.
- Changes:
	- Display selected shipping method and ETA summary (or fallback text).

4. [mobile-app/app/OrderDetailScreen.tsx](mobile-app/app/OrderDetailScreen.tsx)
- Why: BX-09-003 requires ETA visibility in order details.
- Changes:
	- Show persisted shipping method + ETA from shipment/order data.
	- Show fallback text when ETA missing.

5. [mobile-app/app/OrdersScreen.tsx](mobile-app/app/OrdersScreen.tsx)
- Why: This screen maps DB rows to `Order` objects used by Order Detail.
- Changes:
	- Include shipment shipping method and ETA mapping so Order Detail has complete data.

6. [mobile-app/app/DeliveryTrackingScreen.tsx](mobile-app/app/DeliveryTrackingScreen.tsx)
- Why: ETA fallback string alignment and consistency with new checkout ETA semantics.
- Changes:
	- Use standardized fallback text like "Delivery estimate unavailable" when ETA not present.

### 2.2 Directly Affected Mobile Logic/Types

7. [mobile-app/src/services/checkoutService.ts](mobile-app/src/services/checkoutService.ts)
- Why: Current logic receives one `shippingFee` and splits equally by seller.
- Changes:
	- Extend payload to accept per-seller shipping selections/fees.
	- Validate selected shipping method availability before order insert.
	- Stop equal split logic; use seller-specific shipping values.
	- Persist shipment-level method/eta info (for each created seller order).

8. [mobile-app/src/services/deliveryService.ts](mobile-app/src/services/deliveryService.ts)
- Why: Source of shipping options and ETA derivation.
- Changes:
	- Add helper(s) for seller-group method retrieval and normalized ETA output.
	- Add constraints for destination/serviceability and seller-origin compatibility.

9. [mobile-app/src/services/addressService.ts](mobile-app/src/services/addressService.ts)
- Why: Must become single validator for checkout-safe addresses.
- Changes:
	- Add `validateAddressForCheckout` style API returning `{ valid, errors, serviceable }`.
	- Add phone/postal/required field checks and serviceability evaluation.

10. [mobile-app/src/types/delivery.types.ts](mobile-app/src/types/delivery.types.ts)
- Why: Need explicit model for per-seller method selection + ETA.
- Changes:
	- Add types for seller shipping group state, selected method, and method fetch result.

11. [mobile-app/src/types/index.ts](mobile-app/src/types/index.ts)
- Why: `Order` and checkout object model currently do not carry per-seller shipping metadata.
- Changes:
	- Extend `Order` shape to include optional shipping method/eta breakdown (per seller group or per order shipment snapshot).

### 2.3 Likely Supporting Files

12. [mobile-app/src/stores/orderStore.ts](mobile-app/src/stores/orderStore.ts)
- Why: Holds checkout context load state and seller metadata used by checkout.
- Changes:
	- Optionally expose richer seller metadata needed for active/serviceable checks.

13. [mobile-app/src/stores/deliveryStore.ts](mobile-app/src/stores/deliveryStore.ts)
- Why: If reused in checkout to avoid duplicating loading/error handling.
- Changes:
	- Support keyed shipping rates by seller group instead of single global `shippingRates`.

14. [mobile-app/src/hooks/useDeliveryTracking.ts](mobile-app/src/hooks/useDeliveryTracking.ts)
- Why: ETA + fallback coherence across tracking/detail screens.
- Changes:
	- Surface normalized ETA and stale/missing indicators.

15. [mobile-app/src/services/orderService.ts](mobile-app/src/services/orderService.ts)
- Why: Any order fetch path that maps shipment data should preserve shipping method/eta fields.
- Changes:
	- Include shipment shipping_method parsing where needed.

## 3. Story to File Impact Map

### BX-09-001 Per-seller shipping fee

- Primary:
	- [mobile-app/app/CheckoutScreen.tsx](mobile-app/app/CheckoutScreen.tsx)
	- [mobile-app/src/services/checkoutService.ts](mobile-app/src/services/checkoutService.ts)
	- [mobile-app/src/services/deliveryService.ts](mobile-app/src/services/deliveryService.ts)
	- [mobile-app/src/types/delivery.types.ts](mobile-app/src/types/delivery.types.ts)
- Supporting:
	- [mobile-app/src/stores/orderStore.ts](mobile-app/src/stores/orderStore.ts)
	- [mobile-app/src/stores/deliveryStore.ts](mobile-app/src/stores/deliveryStore.ts)

### BX-09-002 Shipping method per seller

- Primary:
	- [mobile-app/app/CheckoutScreen.tsx](mobile-app/app/CheckoutScreen.tsx)
	- [mobile-app/src/services/deliveryService.ts](mobile-app/src/services/deliveryService.ts)
	- [mobile-app/src/services/checkoutService.ts](mobile-app/src/services/checkoutService.ts)
	- [mobile-app/src/types/delivery.types.ts](mobile-app/src/types/delivery.types.ts)
- Supporting:
	- [mobile-app/src/types/index.ts](mobile-app/src/types/index.ts)
	- [mobile-app/src/stores/deliveryStore.ts](mobile-app/src/stores/deliveryStore.ts)

### BX-09-003 ETA visibility and persistence

- Primary:
	- [mobile-app/app/CheckoutScreen.tsx](mobile-app/app/CheckoutScreen.tsx)
	- [mobile-app/app/OrderConfirmation.tsx](mobile-app/app/OrderConfirmation.tsx)
	- [mobile-app/app/OrderDetailScreen.tsx](mobile-app/app/OrderDetailScreen.tsx)
	- [mobile-app/app/OrdersScreen.tsx](mobile-app/app/OrdersScreen.tsx)
	- [mobile-app/src/services/checkoutService.ts](mobile-app/src/services/checkoutService.ts)
- Supporting:
	- [mobile-app/app/DeliveryTrackingScreen.tsx](mobile-app/app/DeliveryTrackingScreen.tsx)
	- [mobile-app/src/hooks/useDeliveryTracking.ts](mobile-app/src/hooks/useDeliveryTracking.ts)
	- [mobile-app/src/services/orderService.ts](mobile-app/src/services/orderService.ts)

### BX-09-004 Delivery address validation before place order

- Primary:
	- [mobile-app/app/CheckoutScreen.tsx](mobile-app/app/CheckoutScreen.tsx)
	- [mobile-app/app/AddressesScreen.tsx](mobile-app/app/AddressesScreen.tsx)
	- [mobile-app/src/services/addressService.ts](mobile-app/src/services/addressService.ts)
	- [mobile-app/src/services/checkoutService.ts](mobile-app/src/services/checkoutService.ts)
- Supporting:
	- [mobile-app/src/types/index.ts](mobile-app/src/types/index.ts)
	- [mobile-app/src/stores/orderStore.ts](mobile-app/src/stores/orderStore.ts)

## 4. Step-by-Step Implementation Plan

1. Define data contracts first.
- Update delivery and app-level types to represent:
	- seller-group shipping options,
	- selected method per seller,
	- per-seller fee and ETA,
	- per-group loading/error/blocked state.

2. Add checkout-grade address validation in service layer.
- Implement reusable validation API in address service.
- Include required fields, phone format, postal format, and serviceability rule result.

3. Upgrade checkout service payload and order persistence.
- Extend checkout payload to receive shipping breakdown by seller.
- Remove current equal split (`shippingFee / sellerCount`) logic.
- Save selected method + ETA per seller order shipment metadata.
- Revalidate selected method availability before final insert.

4. Integrate per-seller shipping state in checkout page.
- Refactor seller grouping key from seller display name to seller id, while rendering seller name label.
- Add per-group shipping state object.
- Trigger method fetch after address validation.
- Show loading state while shipping methods are being fetched.
- Show per-group error with retry and block place-order when unresolved.

5. Recalculation and invalidation behavior.
- Recompute per-seller shipping when any dependency changes:
	- selected address,
	- checkout item quantity/selection,
	- selected shipping method.
- Invalidate stale shipping values when address becomes invalid or changes.

6. Update address forms (checkout modal + addresses page).
- Enforce validation before save and before place-order.
- Ensure user receives field-specific error guidance.

7. Update post-checkout displays.
- In Order Confirmation and Order Detail, show selected shipping method and ETA.
- Add fallback text when ETA is unavailable.
- Ensure Orders screen mapping carries these fields into `Order` object used by detail screens.

8. Testing and verification.
- Expand unit tests in [mobile-app/src/tests/services/deliveryService.test.ts](mobile-app/src/tests/services/deliveryService.test.ts) for multi-seller and method selection.
- Add/extend address validation integration tests in [mobile-app/tests/address-integration.test.ts](mobile-app/tests/address-integration.test.ts).
- Extend checkout script coverage in [mobile-app/scripts/test-checkout-flow.ts](mobile-app/scripts/test-checkout-flow.ts) for:
	- multi-seller cart,
	- per-seller fee calculation,
	- method revalidation failure,
	- ETA fallback behavior.

## 5. Validation Checklist for Developer Review

- Multi-seller checkout does not show one combined shipping fee.
- Each seller section has its own method selector, fee, ETA, and loading/error state.
- Place order is blocked if any seller group lacks valid shipping method or has shipping calculation failure.
- Address validation errors are field-specific and block checkout until fixed.
- Address changes invalidate old shipping values and force recalculation.
- Selected shipping method and ETA remain visible after placement in confirmation/detail/tracking surfaces.

## 6. External Dependency Notes (Outside mobile-app)

These are not in mobile-app but may be needed to fully satisfy backend-calculated requirements:

1. [supabase/functions/get-checkout-context/index.ts](supabase/functions/get-checkout-context/index.ts)
- May need to return richer seller fulfillment metadata (active status, origin, serviceability hints).

2. Shipping calculation endpoint/RPC used by mobile.
- Ensure shipping fee source is server-calculated and not only client-side simulated.
















































































