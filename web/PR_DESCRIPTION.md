## What does this PR do?

This PR delivers **two major feature areas** across Web and Mobile:

1. **Checkout UX Overhaul (Web)** — Extracts the monolithic Order Summary into a modular sticky sidebar component, replaces misleading estimated shipping fees on the Cart page with an honest disclaimer, and refactors the layout for information density.
2. **Address System Upgrade (Web + Mobile)** — Upgrades the map picker with live search, loading states, and a validation gate; introduces a high-performance `useGeoLocation` hook with SWR-style caching and parallel data fetching; and polishes hover interactions across all address modals.

---

## 🛠️ Changes by Area

### 1. Web — Checkout Order Summary Extraction

**Files:** `src/components/checkout/CheckoutOrderSummary.tsx` *(new)*, `src/pages/CheckoutPage.tsx`

- **New `CheckoutOrderSummary` component**: Extracted ~350 lines of inline Order Summary JSX from `CheckoutPage` into a self-contained, modular sidebar card with a 3-zone flex layout:
  - **Header** (`flex-shrink-0`) — "Order Summary" title + item count, always visible.
  - **Scrollable body** (`flex-1 overflow-y-auto`) — seller groups, shipping pickers, voucher input, Bazcoins toggle. Uses `max-h-[calc(100vh-7rem)]` + `sticky top-24` to stay within the viewport.
  - **Sticky footer** (`flex-shrink-0`) — price breakdown, Bazcoins earn banner, vacation seller warning, Place Order CTA, and SSL note — always pinned in view.
- Individual seller item lists have a secondary inner scroll cap at `max-h-[240px]`.
- **`CheckoutPage.tsx`**: Replaced the old `<motion.div>` block with a clean `<CheckoutOrderSummary ... />` call; removed 10 now-unused lucide icon imports (`Shield` retained — used in Registry Address block).

---

### 2. Web — Cart Page Shipping Disclaimer

**File:** `src/pages/EnhancedCartPage.tsx`

- **Removed** the `shippingTotal` useMemo that computed a flat ₱100 NCR estimate, which was misleading users about their actual order cost.
- **Replaced** the "Estimated Shipping" row in the Order Summary with a new `ShippingDisclaimer` sub-component: an amber info callout with an inline SVG icon stating *"Shipping fee will be calculated at the Checkout screen once you provide your delivery address."*
- **`SHIPPING_DISCLAIMER_TEXT` constant** — single source of truth for the copy; edit once to update everywhere.
- The **grand total shown in the cart** now equals `selectedTotal` (items only, no shipping placeholder) and is labelled **"Subtotal"** to prevent confusion at checkout.
- Per-seller cards in the Order Summary sidebar now show **"Items Total"** (items only) instead of adding an estimated shipping fee to the seller subtotal.
- "Seller Total" row in the cart item list also simplified to items-only.

---

### 3. Web — MapPicker Upgrade

**File:** `src/components/ui/MapPicker.tsx` *(rewritten)*

| Feature | Before | After |
|---|---|---|
| Search results | Jumps to single top hit | **Live dropdown with up to 6 results** |
| Loading state | None | **Spinner replaces search icon** while fetching |
| Keyboard navigation | None | **↑↓ to navigate, Enter to select, Esc to dismiss** |
| Validation gate | `position` set | **`position` + reverse-geocode resolved** — Confirm disabled until both are true |
| GPS feedback | Silent | **"Locating…" spinner** on the GPS button |
| Reverse-geocode feedback | None | **Amber "Resolving address…" pill** + green confirmation chip |
| Clear input | None | **× button** clears query and resets dropdown |
| Dropdown accessibility | None | `role="combobox"`, `aria-expanded`, `aria-controls`, `role="listbox"`, `aria-selected` |

---

### 4. Web — `useAddressSearch` Hook

**File:** `src/hooks/useAddressSearch.ts` *(new)*

- Reusable hook wrapping Nominatim forward-geocoding with:
  - **400 ms debounce** — no API spam on keystroke.
  - **AbortController** — cancels stale requests on new query or component unmount.
  - Typed `AddressSearchResult[]` with `placeId`, `displayName`, `lat`, `lon`, and raw `address` breakdown.
  - Explicit `isLoading`, `error`, `results`, `search()`, `clear()` API surface.
- Philippines country-code filter (`countrycodes=ph`) baked in.

---

### 5. Web — Address Modal & Checkout Hover Polish

**Files:** `src/components/profile/AddressModal.tsx`, `src/pages/CheckoutPage.tsx`

**`AddressModal.tsx` — Add Address modal:**
- **Address Label pill buttons** (Home / Office / Other): hover now **fills solid orange** (`hover:bg-[#F97316] hover:text-white`) matching the selected-state style, with `transition-all duration-150` for smoothness.
- **"Open Map / Change Pin" button**: same solid-fill hover (`hover:bg-[#F97316] hover:text-white`) + `active:scale-95` press feedback.

**`CheckoutPage.tsx` — Select Delivery Address modal:**
- Address cards: added `group` class → unselected cards get `hover:border-[brand]/40 hover:bg-orange-50/20` on hover.
- **Address Label badge**: `group-hover:border-[brand] group-hover:text-[brand]` — turns orange when the parent card is hovered.
- **Edit icon button**: `hover:text-[brand] hover:bg-orange-50` (was plain grey).

---

### 6. Web — Custom Scrollbar CSS

**File:** `src/styles/globals.css`

- Added `.checkout-summary-scroll` and `.checkout-items-scroll` utility classes with a subtle **amber-tinted 4 px scrollbar**:
  - `::-webkit-scrollbar` for Chrome/Safari/Edge.
  - `scrollbar-width: thin` + `scrollbar-color` for Firefox.
  - Thumb brightens from `rgba(217,119,6,0.30)` to `rgba(217,119,6,0.60)` on hover.
  - No external plugin required.

---

### 7. Mobile — `useGeoLocation` Hook

**File:** `mobile-app/src/hooks/useGeoLocation.ts` *(new)*

High-performance geolocation hook implementing patterns from the Mobile Performance Optimization guide:
- **Accuracy ladder** — fast balanced fix delivered first, high-accuracy upgrade runs in background.
- **SWR-style GPS cache** — 3-minute stale-while-revalidate prevents redundant high-accuracy pings.
- **Parallel data fetching** — Nominatim reverse-geocode + PH regions library run concurrently via `Promise.all`.
- **Metro Manila parallel city fetch** — all province cities fetched in parallel to avoid sequential waterfall.
- **AbortController** — stale in-flight requests cancelled on unmount or re-trigger.
- Callbacks: `onFastFix`, `onGeoCascadeComplete`, `onAccuracyUpgrade`.

---

### 8. Mobile — `useAddressForm` Hook

**File:** `mobile-app/src/hooks/useAddressForm.ts` *(new)*

Extracted address form business logic into a dedicated hook:
- `checkDuplicate(form)` — validates against existing saved addresses to prevent silent duplicates.
- `checkLabelDuplicate(label, excludeId)` — ensures label uniqueness per user.
- `coordsInMetroManila(lat, lng)` — bounding-box check for Metro Manila lock behaviour.
- `reverseGeoMatchesMetroManila(address)` — text-based fallback check from Nominatim response.

---

### 9. Mobile — `AddressFormModal` Refactor

**File:** `mobile-app/src/components/AddressFormModal.tsx`

- **Integrated `useGeoLocation`** — replaced the old blocking `getCurrentPosition` call with the parallel, cached hook. Location now populates fields non-blocking via callbacks.
- **`forceCreateMode` prop** — when `true`, the "Saved Addresses" quick-fill strip is hidden, state is always blank, and the save path always calls INSERT (never UPSERT). Defaults to `!initialData`.
- **Metro Manila smart-lock** — when GPS or reverse-geocode resolves to Metro Manila, the Province field is locked to "Metro Manila" and city/barangay dropdowns are pre-populated.
- Extracted duplicate and label-uniqueness checks into `useAddressForm`.
- Removed the stale default-address prefill in create mode (was causing data leaks between edit and add flows).

---

### 10. Mobile — CheckoutScreen Address Flow Fix

**File:** `mobile-app/app/CheckoutScreen.tsx`

- Renamed `handleOpenAddressModalForAdd` → `handleAddNew` for clarity.
- `handleAddNew` now explicitly nulls out `editingAddressForForm` **before** opening the modal, guaranteeing zero stale data leaks into the "Add New Address" form.
- Passes `forceCreateMode={editingAddressForForm === null}` to `AddressFormModal` so the checkout add-new path can never accidentally display the saved-address chip strip.
- Exported `useAddressForm` and `useGeoLocation` from `mobile-app/src/hooks/index.ts`.

---

## Files Changed Summary

### Web (`web/`)

| File | Type | Description |
|---|---|---|
| `src/components/checkout/CheckoutOrderSummary.tsx` | **New** | Extracted, modular Order Summary sidebar with scrollable body + sticky footer |
| `src/pages/CheckoutPage.tsx` | Modified | Replaced inline Order Summary with `<CheckoutOrderSummary>`, cleaned unused imports, delivery address modal hover polish |
| `src/pages/EnhancedCartPage.tsx` | Modified | Removed shipping estimate, added `ShippingDisclaimer`, simplified totals |
| `src/components/ui/MapPicker.tsx` | Modified | Live search dropdown, loading spinner, keyboard nav, validation gate, GPS feedback |
| `src/hooks/useAddressSearch.ts` | **New** | Debounced Nominatim forward-geocoding hook |
| `src/components/profile/AddressModal.tsx` | Modified | Solid-fill hover on Address Label and Open Map buttons |
| `src/styles/globals.css` | Modified | `.checkout-summary-scroll` / `.checkout-items-scroll` amber scrollbar utilities |

### Mobile (`mobile-app/`)

| File | Type | Description |
|---|---|---|
| `src/hooks/useGeoLocation.ts` | **New** | High-performance geolocation hook (parallel fetch, SWR cache, accuracy ladder) |
| `src/hooks/useAddressForm.ts` | **New** | Address form business logic (duplicate check, label check, Metro Manila detection) |
| `src/hooks/index.ts` | Modified | Exports `useAddressForm` and `useGeoLocation` |
| `src/components/AddressFormModal.tsx` | Modified | Integrated `useGeoLocation`, `forceCreateMode` prop, Metro Manila lock, removed stale prefill |
| `app/CheckoutScreen.tsx` | Modified | `handleAddNew` with explicit null-reset, `forceCreateMode` prop passed to modal |

---

## Feature Comparison Matrix

| Behaviour | Web | Mobile |
|---|---|---|
| Order Summary layout | ✅ Sticky sidebar, scrollable items, pinned CTA | ✅ Existing bottom-sheet |
| Shipping fee on Cart page | ✅ Disclaimer only (no placeholder amount) | N/A |
| Address search | ✅ Live dropdown, debounced, keyboard nav | ✅ Via `useGeoLocation` cascade |
| GPS location | ✅ MapPicker with spinner + fallback | ✅ `useGeoLocation` (SWR cache, accuracy ladder) |
| Address form create/edit separation | ✅ `AddressModal` resets cleanly | ✅ `forceCreateMode` prop + explicit null-reset |
| Hover states / feedback | ✅ Solid-fill orange on all label/map buttons | N/A |
| Metro Manila lock | N/A | ✅ `useAddressForm.coordsInMetroManila` |

---

## Testing Done

- [x] Cart Order Summary shows disclaimer text — no shipping fee amount displayed.
- [x] Cart "Subtotal" equals items-only total; checkout shows real shipping after address entry.
- [x] MapPicker search returns dropdown with up to 6 results; spinner shows while loading.
- [x] MapPicker "Confirm Location" stays disabled until reverse-geocode resolves.
- [x] Keyboard ↑↓/Enter/Esc navigation works in MapPicker dropdown.
- [x] Address Label buttons (Home/Office/Other) fill solid orange on hover.
- [x] "Open Map" button fills solid orange on hover with press scale effect.
- [x] Delivery address card hover turns the Address Label badge orange.
- [x] Edit icon in delivery address modal turns brand orange on hover.
- [x] `CheckoutOrderSummary` sticky footer (Place Order + total) remains visible while scrolling items.
- [x] Mobile "Add New Address" from CheckoutScreen opens a blank form with no stale data from a previous edit.
- [x] `forceCreateMode` hides saved-address strip in checkout's add-new path.
- [x] `npx tsc --noEmit` passes (only pre-existing unrelated errors in `DeliveryTrackingPage` remain).

---

## Notes for Reviewer

- **`ShippingDisclaimer` constant** — `SHIPPING_DISCLAIMER_TEXT` at the top of `EnhancedCartPage.tsx` is the single place to update the disclaimer copy.
- **`CheckoutOrderSummary` props contract** — all callbacks and state values are passed down explicitly from `CheckoutPage`; the component holds no local async state.
- **Nominatim rate limits** — `useAddressSearch` debounces at 400 ms and sends the required `Accept-Language` header per Nominatim's usage policy. No API key needed.
- **`forceCreateMode` default** — if the prop is omitted, the modal falls back to `!initialData`, preserving backward compatibility with all existing call sites.
- **Metro Manila lock** — when GPS resolves within the Metro Manila bounding box, the Province field is locked and cannot be manually changed, preventing mismatched address data.
