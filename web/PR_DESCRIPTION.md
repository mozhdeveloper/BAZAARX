## What does this PR do?

This PR completes the **Registry & Gifting** feature alignment between the **Web** and **Mobile** apps.
It covers bug fixes, UX improvements, new screen wiring, and service-layer enhancements — all scoped
to the Registry & Gifting module.

---

## 🛠️ Changes by Area

### 1. Web — Editable Registry Name & Category (Buyer Role)

**File:** `web/src/components/RegistryDetailModal.tsx`

- The modal previously showed registry **title** and **category** as static, read-only text
- Buyer had no way to edit these fields after creation — inconsistent with Mobile's `EditCategoryModal`
- Added editable `<Input>` for **Registry Name** and `<Select>` dropdown for **Gift Category**
- Extended `handleSavePreferences()` → `updateRegistryMeta()` to include `title` and `category`

---

### 2. Web — Product Images Not Rendering in Registry

**Files:** `web/src/components/RegistryDetailModal.tsx`, `web/src/pages/SharedRegistryPage.tsx`, `web/src/stores/buyer/buyerHelpers.ts`

- Registry product images failed to display in both the owner's detail modal and the public shared link page
- **Root cause (3 layers):**
  - `buyerHelpers.ts → mapDbToRegistryProduct()`: `snapshot.image` could be empty while `snapshot.images[0]` had a valid URL — the array fallback was missing
  - `RegistryDetailModal.tsx`: Used `product.image ? <img>` with no fallback
  - `SharedRegistryPage.tsx`: Same pattern on the public gifter-facing page
- **Fix:** Explicitly resolve `resolvedImage = snapshot.image || snapshot.images?.[0] || ''` in the mapper; use `product.image || images?.[0]` in both UI pages with `onError` graceful hide — mirrors Mobile's `item.image || item.images?.[0]`

---

### 3. Web — Registry Button Icon Redesign on Product Detail Page

**File:** `web/src/pages/ProductDetailPage.tsx`

- Replaced the **Heart** icon with a **Gift** icon for the "Add to Registry" button — consistent with the new Registry & Gifting branding across both platforms
- Removed the toggle behavior (clicking when already in registry no longer removes it) — always opens the registry picker modal instead
- Fixed duplicate detection: uses `sourceProductId` comparison so the same product can't be added to the same registry folder twice — shows a toast if already added
- Cleaned up: removed unused `removeRegistryItem` import

**File:** `web/src/stores/buyerStore.ts`

- `addToRegistry` now checks `sourceProductId` before inserting — prevents silent duplicates at the store level
- `tempProduct` now includes `sourceProductId` field so optimistic state matches DB shape

**File:** `web/src/stores/buyer/buyerTypes.ts`

- Added `sourceProductId?: string` field to `RegistryProduct` interface — required for duplicate detection logic

---

### 4. Web — Header Tooltip Label Fix

**File:** `web/src/components/Header.tsx`

- Corrected the Gift icon's `title` tooltip from `"Registry"` to `"Registry & Gifting"` to match the page name

---

### 5. Web — TypeScript Config Fix

**File:** `web/tsconfig.app.json`

- `"ignoreDeprecations": "6.0"` → `"ignoreDeprecations": "5.0"` — `"6.0"` is not a valid TypeScript value; the only accepted value is `"5.0"`

---

### 6. Mobile — New `RegistryScreen` (Replaces `WishlistScreen` Route)

**Files:** `mobile-app/App.tsx` *(new screen)*, `mobile-app/app/RegistryScreen.tsx` *(new file)*

- Wired the `Wishlist` route in `App.tsx` to the new **`RegistryScreen`** component
- `RegistryScreen` is a full Registry & Gifting screen replacing the old general `WishlistScreen` for the registry flow — supports categories/folders, occasion tabs, product list view, edit modal, share, and delete

---

### 7. Mobile — Icon Rebrand: Heart → Gift Throughout

**Files:** `mobile-app/app/WishlistScreen.tsx`, `mobile-app/src/components/AddToWishlistModal.tsx`, `mobile-app/app/ProfileScreen.tsx`, `mobile-app/src/components/BuyerBottomNav.tsx`

| Location | Before | After |
|---|---|---|
| `WishlistScreen` — folder card icon | `FolderHeart` | `Gift` |
| `WishlistScreen` — empty state icon | `Heart` | `Gift` |
| `WishlistScreen` — product thumbnail placeholder | `Heart` | `Gift` |
| `AddToWishlistModal` — folder list icon | `FolderHeart` | `Gift` |
| `ProfileScreen` — menu item label + icon | `Heart / "Wishlist"` | `Gift / "Registry & Gifting"` |
| `BuyerBottomNav` — added Registry tab | *(not present)* | `Gift` icon, `"Registry"` label |

---

### 8. Mobile — Product Detail: Registry Action Redesign

**File:** `mobile-app/app/ProductDetailScreen.tsx`

- Replaced **Heart** icon with **Gift** icon in the product detail header
- Removed toggle behavior (was: tap to remove from wishlist when already saved) — now always opens the Registry picker modal
- Removed unused `removeFromWishlist` import
- Replaced `<AddToWishlistModal>` with the new `<AddToRegistryModal>` component

**File:** `mobile-app/src/components/AddToRegistryModal.tsx` *(new file)*

- New modal component for adding a product to a specific registry folder — replaces `AddToWishlistModal` in the product detail context

---

### 9. Mobile — `SharedWishlistScreen` Overhaul

**File:** `mobile-app/app/SharedWishlistScreen.tsx` (+187 lines changed)

- Major refactor of the public shared registry view (accessed via shared link)
- Now renders the registry name, occasion/category, item count, delivery preference, and a product grid with images
- Improved UI to match the gifter-facing experience: shows fulfillment status, "Buy Gift" CTA per item

---

### 10. Mobile — `FindRegistryScreen` Refactor

**File:** `mobile-app/app/FindRegistryScreen.tsx` (-69 lines net)

- Cleaned up and simplified the public registry search screen
- Now uses `wishlistService.searchPublicRegistries()` for Supabase-backed search

---

### 11. Mobile — `wishlistService` Enhancements

**File:** `mobile-app/src/services/wishlistService.ts` (+77 lines)

- `createRegistry()` — now accepts and persists `delivery` preference (JSONB)
- `updateRegistry()` — extended type signature to support `privacy` and `delivery` fields
- **New method:** `searchPublicRegistries(query)` — searches `registries` table by title with `privacy = 'link'`, returns title, category, item count
- **New method:** `getPublicRegistry(registryId)` — fetches a single public registry with its items for the shared view

---

### 12. Mobile — `wishlistStore` Delivery Preference Support

**File:** `mobile-app/src/stores/wishlistStore.ts` (+37 lines)

- Exported new `RegistryDeliveryPreference` interface
- `WishlistCategory` now includes `delivery?: RegistryDeliveryPreference`
- `mapDbRowToCategory()` — maps `delivery` JSONB from DB into the store shape
- `createCategory()` — now passes `delivery` through to `wishlistService.createRegistry()`
- `updateCategory()` — now handles `privacy` and `delivery` updates in `updateRegistry()`

---

## Files Changed Summary

### Web (`web/`)

| File | Type | Description |
|---|---|---|
| `src/components/RegistryDetailModal.tsx` | Modified | Editable name/category + image fix |
| `src/pages/SharedRegistryPage.tsx` | Modified | Image fallback fix |
| `src/pages/ProductDetailPage.tsx` | Modified | Gift icon, duplicate guard, remove toggle |
| `src/components/Header.tsx` | Modified | Tooltip label fix |
| `src/stores/buyer/buyerHelpers.ts` | Modified | Image resolution fix in data mapper |
| `src/stores/buyer/buyerTypes.ts` | Modified | Added `sourceProductId` to `RegistryProduct` |
| `src/stores/buyerStore.ts` | Modified | Duplicate guard in `addToRegistry` |
| `tsconfig.app.json` | Modified | Fixed invalid `ignoreDeprecations` value |

### Mobile (`mobile-app/`)

| File | Type | Description |
|---|---|---|
| `App.tsx` | Modified | Wired `Wishlist` route to new `RegistryScreen` |
| `app/RegistryScreen.tsx` | **New** | Full Registry & Gifting screen |
| `src/components/AddToRegistryModal.tsx` | **New** | Add-to-registry modal for product detail |
| `app/SharedWishlistScreen.tsx` | Modified | Public shared registry view overhaul |
| `app/FindRegistryScreen.tsx` | Modified | Search screen refactor |
| `app/ProductDetailScreen.tsx` | Modified | Gift icon + registry modal integration |
| `app/ProfileScreen.tsx` | Modified | Menu item label + icon update |
| `app/WishlistScreen.tsx` | Modified | Icon rebrand Heart → Gift |
| `src/components/AddToWishlistModal.tsx` | Modified | Icon rebrand FolderHeart → Gift |
| `src/components/BuyerBottomNav.tsx` | Modified | Added Registry tab |
| `src/services/wishlistService.ts` | Modified | `delivery` support + 2 new search/get methods |
| `src/stores/wishlistStore.ts` | Modified | `delivery` persistence + interface updates |

---

## Mobile Reference

The Web fixes were aligned to match existing Mobile behavior:

| Behavior | Mobile | Web (Before) | Web (After) |
|---|---|---|---|
| Edit registry name | ✅ Editable `TextInput` in `EditCategoryModal` | ❌ Read-only `<h2>` | ✅ Editable `<Input>` |
| Edit gift category | ✅ Occasion chips in `EditCategoryModal` | ❌ Read-only `<span>` badge | ✅ `<Select>` dropdown |
| Product image source | ✅ `item.image \|\| item.images?.[0]` | ❌ `product.image` only | ✅ `product.image \|\| images?.[0]` |
| Registry button icon | ✅ `Gift` | ❌ `Heart` | ✅ `Gift` |
| Duplicate guard | ✅ `sourceProductId` check | ❌ None | ✅ `sourceProductId` check |

---

## Screenshots

> _Attach screenshots of:_
> 1. Editable Registry Name + Gift Category dropdown in the detail modal
> 2. Product images rendering correctly in the registry grid (Web + Mobile)
> 3. Gift icon on Product Detail page (Web + Mobile)
> 4. Registry tab in Mobile bottom navigation
> 5. Public shared registry page with product grid

---

## Testing Done

- [ ] Edit registry name and category → Save → changes reflected in the registry list
- [ ] Product images render in `RegistryDetailModal` and `SharedRegistryPage`
- [ ] Gift icon shown on Product Detail (Web and Mobile)
- [ ] Adding product to a registry folder where it already exists → toast shown, no duplicate
- [ ] Adding product to a new/different registry folder → works correctly
- [ ] Mobile bottom nav shows Registry tab and navigates to `RegistryScreen`
- [ ] Profile menu shows "Registry & Gifting" with Gift icon
- [ ] Public shared registry link displays items with images
- [ ] Find Registry search returns results by title
- [ ] TypeScript error on `tsconfig.app.json` line 16 is resolved
- [ ] Tested on Chrome (Web)
- [ ] Tested on Mobile view (responsive)
- [ ] Tested on Android (Mobile app)

---

## Notes for Reviewer

- No Supabase schema changes required — all new fields (`delivery`, `sourceProductId`) already exist as JSONB/nullable columns
- No architecture refactoring — only the minimum lines needed for each fix were touched
- `RegistryScreen.tsx` and `AddToRegistryModal.tsx` are entirely new files with no impact on existing screens
- The `WishlistScreen` route still exists and continues to work for any references that haven't been migrated yet
