# Checkout Address Implementation Plan

Created: April 14, 2026
Scope: Mobile checkout shipping-address selection, edit flow, and checkout loading stability

## 1. Baseline Changes Already Implemented

### 1.1 Shipping Information Modal UI
- Updated address cards in checkout to show:
  - Full Name
  - Label + Phone
  - Full Address
  - Radio button selection
- Added per-card edit action as a pencil icon.
- Card tap selects the address; edit tap opens address form for that specific address.

Primary file:
- `mobile-app/app/CheckoutScreen.tsx`

### 1.2 Address Edit Persistence Fix
- Fixed edit flow to update existing address instead of creating duplicates.
- Save payload now preserves and persists edited fields from form data:
  - `firstName`, `lastName`, `phone`, `label`
  - `street`, `barangay`, `city`, `province`, `region`, `postalCode`
  - `landmark`, `deliveryInstructions`
- Updated local state after save by replacing item by `id` and reselecting saved address.

Primary files:
- `mobile-app/app/CheckoutScreen.tsx`
- `mobile-app/src/components/LocationModal.tsx`
- `mobile-app/src/services/addressService.ts`

### 1.3 "Preparing your checkout..." Stuck State Fix
- Prevented stale loading flag from locking screen after prior checkout.
- Added reset on CheckoutScreen mount for transient loading state.
- Updated order store persistence merge/partialization to keep `isCheckoutContextLoading` false after hydration.

Primary files:
- `mobile-app/app/CheckoutScreen.tsx`
- `mobile-app/src/stores/orderStore.ts`

---

## 2. Code Ownership Map (Where to Change What)

### 2.1 UI/Interaction Layer
- `mobile-app/app/CheckoutScreen.tsx`
- Responsibilities:
  - Modal rendering and card layout
  - Radio selection and confirm behavior
  - Edit button behavior and open/close transitions

### 2.2 Address Form/Entry Layer
- `mobile-app/src/components/LocationModal.tsx`
- Responsibilities:
  - Edit mode form prefill
  - Final form validation
  - Emitting normalized address details back to checkout

### 2.3 Address Persistence Layer
- `mobile-app/src/services/addressService.ts`
- Responsibilities:
  - `createAddress`
  - `updateAddress`
  - `setDefaultAddress`
  - DB field mapping and integrity

### 2.4 Checkout Context Loading Layer
- `mobile-app/src/stores/orderStore.ts`
- Responsibilities:
  - checkout context loading state
  - persistence/hydration behavior for transient flags

---

## 3. Standard Change Workflow (For Future Requests)

### Step 1: Classify request type
- UI-only tweak
- Edit/save behavior change
- DB persistence/integrity fix
- Checkout loading/performance issue

### Step 2: Touch minimum files only
- UI-only: CheckoutScreen only
- Edit-save issue: CheckoutScreen + LocationModal (+ service if needed)
- Loading issue: CheckoutScreen + orderStore

### Step 3: Preserve invariants
- Editing must never create new records.
- Address update must replace local state by `id`.
- Transient loading flags must not persist stale `true` state.
- Confirm action uses currently selected address, not stale references.

### Step 4: Validate quickly
- Typecheck: `npx tsc --noEmit`
- Manual sanity checks (see section 5)

---

## 4. Common Pitfalls to Avoid

1. Using `createAddress` during edit flow.
2. Overriding edited form fields with user profile defaults.
3. Appending updated address instead of replacing by `id`.
4. Persisting loading flags that are meant to be in-memory only.
5. Closing modal without resetting edit context state.

---

## 5. Regression Checklist (Run After Each Related Change)

1. Edit first name and save; reopen modal; confirm persisted value.
2. Edit phone + label; verify card updates immediately.
3. Select address by tapping card; verify radio state and confirmation.
4. Place order, return to checkout with new product; verify no stuck loading screen.
5. Verify no duplicate address gets created after editing.
6. Run `npx tsc --noEmit` and ensure no errors.

---

## 6. Extension Plan for Upcoming Features

### 6.1 If adding address metadata
- Add fields to `LocationModal` form and output details.
- Update checkout payload mapping.
- Update `addressService` mapToDB/mapFromDB as needed.

### 6.2 If adding address validation rules
- Implement validation in `LocationModal` (client-side).
- Keep error messages field-specific and actionable.
- Preserve Metro Manila/NCR special handling.

### 6.3 If adding shipping logic by location
- Compute shipping in checkout based on normalized region/province/city.
- Fail safely if location metadata is partial.
- Keep fallback behavior explicit and tested.

---

## 7. Quick Debug Playbook

### Symptom: Edit not saved
- Check if `updateAddress` is called in edit mode.
- Inspect save payload for `firstName/lastName/phone` source.
- Confirm local list replacement by `id`.

### Symptom: Stuck on "Preparing your checkout..."
- Verify `isCheckoutContextLoading` is reset on mount.
- Verify store persistence merge does not hydrate stale `true`.
- Check `loadCheckoutContext` catch/finally path for early exits.

### Symptom: Wrong address selected after save
- Confirm `setSelectedAddress` and `setTempSelectedAddress` use saved record.
- Confirm modal close does not reapply stale selection.

---

## 8. Definition of Done for Any Future Change

- Feature works on-device in checkout flow.
- No regression in address selection, edit persistence, or checkout loading.
- No TypeScript errors.
- Existing behavior remains backward-compatible unless intentionally changed.
