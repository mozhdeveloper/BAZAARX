## What does this PR do?

This PR completes the **Registry & Gifting** feature alignment and logic enforcement between the **Web** and **Mobile** apps.
It covers bug fixes, UX improvements, new screen wiring, and service-layer enhancements — all scoped to the Registry & Gifting module.

---

## 🛠️ Changes by Area

### 1. Web — Registry Management & Address Logic

**File:** `web/src/components/RegistryDetailModal.tsx`

- **Editable Registry Metadata**: Added editable `<Input>` for **Registry Name** and `<Select>` dropdown for **Gift Category**.
- **Recipient Field Removal**: Removed redundant "Recipient Name" fields; shipping names are now exclusively pulled from the selected address object.
- **Automated Address Assignment**: Implemented logic to automatically assign the buyer's address if exactly one saved address exists.
- **UI Standardization**: 
    - Standardized Category labels to uppercase (e.g., "WEDDING", "BIRTHDAY").
    - Updated "Manage Address" button to navigate to the Profile Addresses tab.
    - Updated "Add Item" button to navigate directly to the Shop.
- **Bug Fixes**: Resolved critical JSX tag-balancing and scroll-container issues that were causing build failures.

---

### 2. Web — Registry Data & Images

**Files:** `web/src/components/RegistryDetailModal.tsx`, `web/src/pages/SharedRegistryPage.tsx`, `web/src/stores/buyer/buyerHelpers.ts`

- **Image Fallback**: Explicitly resolve `resolvedImage = snapshot.image || snapshot.images?.[0] || ''` in the mapper; mirrors Mobile's fallback logic.
- **Duplicate Guard**: `addToRegistry` now checks `sourceProductId` before inserting to prevent silent duplicates.

---

### 3. Mobile — New Registry & Gifting Navigation

**Files:** `mobile-app/App.tsx`, `mobile-app/app/RegistryScreen.tsx`

- **Registry Screen**: Wired the `Wishlist` route to a new, comprehensive **`RegistryScreen`** that supports category folders, occasion tabs, and full CRUD operations.
- **Auth Guard & Redirect**: Intercepted "Add to Registry" for guests and redirected to `Login`. 
- **Post-Login Return**: Updated `LoginScreen` and `RootStackParamList` to support a `from` parameter, allowing users to return to the product detail page automatically after a successful login.

---

### 4. Mobile — Service & Store Enhancements

**Files:** `mobile-app/src/services/wishlistService.ts`, `mobile-app/src/stores/wishlistStore.ts`

- **Field Cleanup**: Removed `recipient_name` from all API calls and store interfaces.
- **Address Logic**: Implemented automated address assignment during registry creation if the buyer has exactly one saved address.
- **JSONB Delivery support**: Extended `createRegistry` and `updateRegistry` to persist `delivery` JSONB objects containing `addressId` and `instructions`.

---

### 5. Mobile — UI & UX Alignment

**Files:** `mobile-app/app/ProductDetailScreen.tsx`, `src/components/AddToRegistryModal.tsx`

- **Icon Rebrand**: Replaced **Heart** icon with **Gift** throughout the app (Bottom Nav, Profile, Product Detail).
- **Add to Registry Modal**: New modal replacing the old wishlist picker; includes support for creating new registries with immediate address assignment logic.
- **Category Formatting**: Standardized occasion/category labels to uppercase to match the Web implementation.

---

## Files Changed Summary

### Web (`web/`)

| File | Type | Description |
|---|---|---|
| `src/components/RegistryDetailModal.tsx` | Modified | Tag balancing, Recipient removal, Address logic |
| `src/stores/buyerStore.ts` | Modified | Removed `recipientName`, added Duplicate guard |
| `src/pages/ProductDetailPage.tsx` | Modified | Gift icon, remove toggle behavior |
| `src/stores/buyer/buyerHelpers.ts` | Modified | Image resolution fix in data mapper |

### Mobile (`mobile-app/`)

| File | Type | Description |
|---|---|---|
| `App.tsx` | Modified | RootStackParamList updates for Login redirect |
| `app/LoginScreen.tsx` | Modified | Post-login redirect logic |
| `app/RegistryScreen.tsx` | **New** | Registry & Gifting screen (Categories/Delivery) |
| `src/services/wishlistService.ts` | Modified | Fixed syntax error, removed recipient_name |
| `src/components/AddToRegistryModal.tsx` | **New** | New picker with automated address logic |

---

## Feature Comparison Matrix

| Behavior | Mobile | Web |
|---|---|---|
| Edit registry name | ✅ Editable in `RegistryScreen` | ✅ Editable in `RegistryDetailModal` |
| Address Assignment | ✅ Auto-assign if 1 address exists | ✅ Auto-assign if 1 address exists |
| Recipient Field | ❌ Removed (Unified with Address) | ❌ Removed (Unified with Address) |
| Post-Login Return | ✅ Redirects back to Product | ✅ Existing Redirect Logic |
| Category Format | ✅ UPPERCASE (e.g. BIRTHDAY) | ✅ UPPERCASE (e.g. BIRTHDAY) |

---

## Screenshots

> _Attach screenshots of:_
> 1. Automated address assignment popup or field selection.
> 2. RegistryDetailModal showing Uppercase categories and removed recipient field.
> 3. Post-login redirect flow on Mobile.
> 4. "Manage Address" button navigation to Profile.

---

## Testing Done

- [x] Edit registry name and category → Save → changes reflected.
- [x] Create registry with 0 addresses → prompt to add address shown.
- [x] Create registry with 1 address → address auto-assigned.
- [x] Guest user → Add to Registry → Login → Redirected back to product.
- [x] Verify "Recipient Name" is no longer in state or UI (Web/Mobile).
- [x] `npx tsc --noEmit` passed for both Web and Mobile.
- [x] Validated JSX structural integrity on Web.

---

## Notes for Reviewer

- **Recipient Field Removal**: This was done to reduce redundancy as the `addressId` link already provides the full recipient context via the Addresses table.
- **JSX Balancing**: `RegistryDetailModal.tsx` underwent a significant structural repair to fix nested `motion.div` errors.
- **Navigation**: The `Login` route in Mobile now explicitly supports a `from` param for better UX.
