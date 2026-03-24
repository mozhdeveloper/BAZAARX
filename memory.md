# Memory Log

## 2026-03-24: Merge Conflict Resolution (Dev Branch)

### Context
- Merged warranty feature changes from `feat/mobile-variant-visibility` branch into `dev`
- Changes were stashed before checkout, then popped onto dev branch

### Merge Conflict Resolved
**File:** `web/src/pages/OrdersPage.tsx`

**Conflict:** Sorting logic for orders list
- **Upstream (dev):** Sort by `cancelledAt` if order is cancelled, otherwise by `createdAt`
- **Stashed changes:** Simple sort by `createdAt` descending

**Resolution:** Kept the upstream version with cancelled order handling (more sophisticated logic)

```typescript
// Default sort for "all" and other tabs:
// Sort by cancelledAt if the order is cancelled, otherwise by createdAt
return filtered.sort((a, b) => {
  const aTime = (a.status === "cancelled" && a.cancelledAt) ? getTimestamp(a.cancelledAt) : getTimestamp(a.createdAt);
  const bTime = (b.status === "cancelled" && b.cancelledAt) ? getTimestamp(b.cancelledAt) : getTimestamp(b.createdAt);

  if (aTime !== bTime) return bTime - aTime;
  return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
});
```

### Files Changed in Merge
- `mobile-app/package-lock.json`
- `web/src/components/seller/products/ProductFormTabs.tsx`
- `web/src/pages/OrdersPage.tsx` (conflict resolved)
- `web/src/pages/SellerProducts.tsx`
- `web/src/services/checkoutService.ts`
- `web/src/services/orderService.ts`
- `web/src/stores/admin/adminAuthStore.ts`
- `web/src/stores/seller/sellerHelpers.ts`
- `web/src/stores/seller/sellerTypes.ts`
- `web/src/types/orders.ts`
- `web/src/utils/productMapper.ts`

### New Warranty Feature Files (Untracked)
- `WARRANTY_BADGE_FIX.md`
- `WARRANTY_BUYER_IMPLEMENTATION.md`
- `WARRANTY_SELLER_IMPLEMENTATION.md`
- `web/src/components/WarrantyClaimModal.tsx`
- `web/src/components/WarrantyStatusModal.tsx`
- `web/src/components/seller/products/WarrantyTab.tsx`
- `web/supabase/migrations/20260323000000_add_warranty_columns.sql`
- `web/supabase/migrations/20260323000001_add_warranty_columns_safe.sql`
- `web/supabase/migrations/fix_qa_user_role.sql`

### Git Status After Merge
- Local `dev` branch is 1 commit ahead of `origin/dev`
- Commit message: "Merge warranty feature changes into dev - resolve OrdersPage.tsx conflict"
- Warranty feature files remain untracked

## 2026-03-24: WarrantyClaimType Export Fix

**Error:** `'@/services/warrantyService' has no exported member named 'WarrantyClaimType'`

**Location:** `web/src/components/WarrantyClaimModal.tsx`

**Cause:** `WarrantyClaimType` was imported from `@/types/database.types` in `warrantyService.ts` but not re-exported.

**Fix:** Added re-export statement in `web/src/services/warrantyService.ts`:
```typescript
// Re-export types for convenience
export type {
  WarrantyClaimType,
  WarrantyClaimStatus,
  WarrantyActionType,
  WarrantyClaim,
  WarrantyActionLog,
};
```

## 2026-03-24: Mobile Product Detail Warranty Info Section

**Feature:** Added warranty information display to mobile product detail screen

**Location:** `mobile-app/app/ProductDetailScreen.tsx`

**Changes:**
1. Added new icon imports: `Shield`, `Calendar`, `Phone`, `Mail`, `FileText`
2. Added `Linking` import from React Native for opening warranty terms URLs
3. Added warranty info state that extracts warranty data from product object
4. Added warranty section UI with:
   - Warranty header with Shield icon
   - Warranty duration badge
   - Warranty type (Local Manufacturer, International Manufacturer, Shop Warranty)
   - Provider name, contact, and email
   - Warranty policy/coverage details
   - Link to full terms & conditions
   - Info box with warranty claim guidance

**UI Components:**
- Orange-themed warranty badge matching BazaarX brand
- Icon-based detail rows for easy scanning
- Clickable terms link using `Linking.openURL()`
- Conditional rendering (only shows if `hasWarranty` is true)
- **Collapsible header** with chevron icon that rotates when expanded/collapsed

**Data Fields Used:**
- `has_warranty` / `hasWarranty`
- `warranty_type` / `warrantyType`
- `warranty_duration_months` / `warrantyDurationMonths`
- `warranty_provider_name` / `warrantyProviderName`
- `warranty_provider_contact` / `warrantyProviderContact`
- `warranty_provider_email` / `warrantyProviderEmail`
- `warranty_policy` / `warrantyPolicy`
- `warranty_terms_url` / `warrantyTermsUrl`

**Styles Added:**
- `warrantySection` - Card container
- `warrantyHeader` - Collapsible header (clickable)
- `warrantyBadge` - Duration badge
- `warrantyDetails` - Details container
- `warrantyDetailRow` - Individual detail rows
- `warrantyInfoBox` - Info box at bottom

**State:**
- `isWarrantyExpanded` - Controls expanded/collapsed state (default: true)

## 2026-03-24: Warranty Bottom Sheet Modal

**Feature:** Converted warranty section to bottom sheet modal with slide-up animation

**Location:** `mobile-app/app/ProductDetailScreen.tsx`

**Changes:**
1. Replaced inline collapsible section with modal trigger button
2. Added `showWarrantyModal` state to control modal visibility
3. Created bottom sheet modal with:
   - Slide-up animation (`animationType="slide"`)
   - Drag handle bar at top
   - Header with title and close button
   - Scrollable content area (max 350px)
   - Clickable phone/email links using `Linking.openURL()`
   - Terms & conditions link
   - Info box at bottom
4. Modal positioned at bottom (not centered) using `justifyContent: 'flex-end'`

**UI Components:**
- Trigger button in product details (shows warranty duration)
- Bottom sheet modal with rounded top corners
- Gray handle bar for visual affordance
- Icon containers with orange background circles
- Clickable contact links (tel: and mailto:)
- Semi-transparent overlay background

**Styles Added:**
- `warrantyTriggerButton` - Trigger in product details
- `warrantyTriggerContent` - Icon and text container
- `warrantyTriggerTitle` / `warrantyTriggerSubtitle` - Text styles
- `warrantyModalOverlay` - Semi-transparent backdrop
- `warrantyModalContent` - Bottom sheet container
- `warrantyModalHandle` - Drag handle bar
- `warrantyModalHeader` - Modal header with close button
- `warrantyModalBadge` - Duration badge in modal
- `warrantyModalScrollView` - Scrollable content area
- `warrantyModalDetailRow` - Detail row layout
- `warrantyModalIconContainer` - Circular icon background
- `warrantyModalDetailLabel` / `warrantyModalDetailValue` - Text styles
- `warrantyModalDetailLink` - Clickable link style
- `warrantyModalTermsLink` - Terms link button
- `warrantyModalInfoBox` - Info box at bottom
