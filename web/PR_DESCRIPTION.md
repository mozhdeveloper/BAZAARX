# Mobile App Enhancements: Order Badges, Flash Sale UI, and Cart Fixes

This PR implements a series of critical logic fixes and UI/UX enhancements for the mobile shopping experience, focusing on order tracking transparency, flash sale aesthetics, and cart stability.

---

## 🛠️ Changes by Area

### 1. Order Management & Profile Badges
- **Dynamic Notification System**: Integrated a performance-optimized order badge system on the Profile screen.
    - Implemented `useOrderCounts` custom hook using parallel Supabase queries (`{ count: 'exact', head: true }`) to minimize data transfer.
    - Added red circular notification badges to Pending, Processing, Shipped, and Delivered icons.
- **Status Mapping Synchronization**: Refined the logic in `useOrderCounts` to exactly match the `OrdersScreen` tab logic, ensuring badge counts are consistent with the filtered views.
- **"Reviewed" Tab Implementation**: Added a new tab in the Orders screen for already reviewed products, achieving parity with the web version.
- **Tab Reordering**: Updated navigation sequence to: *All → Pending → Processing → Shipped → Delivered → To Review → Return/Refund → Cancelled → Reviewed*.

### 2. Global Flash Sale UI Restructuring
- **Header Modernization**: Replaced text-based "Back to Home" navigation with a compact, sleek Chevron icon.
- **Title Layout**: Restructured the header to move the "Flash Sale" title and Zap icon into a compact flex layout, improving spacing for small screens.
- **Content Cleanup**: Removed redundant shop name displays from campaign section headers to provide a cleaner, more focused "Global Flash Sale" experience.

### 3. Shopping Cart & Variant Stability
- **Cart Variation Fix**: Resolved a logic bug where switching variants of an existing cart item would incorrectly merge selection strings or fail to update the unique ID.
- **State Management**: Refined `cartStore` and `cartService` to handle variant replacements robustly, ensuring correct price and stock syncing.

---

## 📄 Files Changed Summary

### Mobile (`mobile-app/`)

| File | Type | Description |
|---|---|---|
| `app/ProfileScreen.tsx` | Modified | Integrated dynamic order badges and status icons. |
| `src/hooks/useOrderCounts.ts` | **New** | Optimized hook for fetching order counts by status. |
| `app/OrdersScreen.tsx` | Modified | Added "Reviewed" tab, renamed "Received" to "To Review", and reordered tabs. |
| `app/FlashSaleScreen.tsx` | Modified | Restructured header navigation and cleaned section titles. |
| `app/CartScreen.tsx` | Modified | Fixed variant switching logic and UI updates. |
| `src/components/CartItemRow.tsx` | Modified | Updated variant picker callback logic. |
| `src/stores/cartStore.ts` | Modified | Improved cart item update logic for variants. |
| `src/services/cartService.ts` | Modified | Ensured database parity during cart item variant updates. |

---

## ✅ Testing Done

- [x] **Order Badges**: Verified that counts on the Profile screen match the number of items in the corresponding Orders tabs.
- [x] **Delivered Exclusions**: Verified that Reviewed and Returned items are excluded from the "Delivered" badge count.
- [x] **Tab Navigation**: Verified all 9 tabs in the Orders screen display the correct filtered data.
- [x] **Flash Sale UI**: Verified the compact header remains responsive on small devices (iPhone SE simulation).
- [x] **Cart Stability**: Verified that changing a variant (e.g., Color/Size) correctly replaces the item in the cart without string duplication.

---

## 💡 Notes for Reviewer
The addition of the `useOrderCounts` hook significantly improves the Profile screen performance by avoiding a full orders fetch. The UI refinements in the Flash Sale screen were designed to improve accessibility and touch targets for mobile users.
