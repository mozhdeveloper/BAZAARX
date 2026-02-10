# Notification System Implementation

## What does this PR do?

- Implemented functional notification dropdown system in header
- Integrated popover component from shadcn/ui
- Added notifications popover with badge count
- Connected notifications to existing Zustand cart store
- Disabled OrderNotificationModal popup for testing (can be re-enabled)
- Excluded notifications from localStorage persistence for fresh data on each session

## Files Changed

- `src/components/NotificationsDropdown.tsx` (NEW)
- `src/components/Header.tsx` (UPDATED)
- `src/components/ui/popover.tsx` (NEW)
- `src/components/ui/badge.tsx` (UPDATED)
- `src/stores/cartStore.ts` (UPDATED)
- `src/App.tsx` (UPDATED)

## Detailed Changes

### 1. Created NotificationsDropdown.tsx

**New file: `src/components/NotificationsDropdown.tsx`**

Features:

- Bell icon with unread notification badge
- Popover dropdown showing all notifications
- Different icons for notification types (confirmed, shipped, delivered, cancelled)
- "Mark all as read" button
- Time ago formatting (e.g., "5 minutes ago", "2 hours ago")
- Click to navigate to order/delivery tracking page
- Empty state when no notifications
- State management: Uses React `useState` for popover open/close and Zustand store for notification data

### 2. Updated Header.tsx

**Modified: `src/components/Header.tsx`**

Changes:

- Added import for NotificationsDropdown component
- Replaced hardcoded notification bell icon with functional `<NotificationsDropdown />` component
- Line 130-139: Old notification icon removed, new dropdown integrated

### 3. Added Popover Component

**New file: `src/components/ui/popover.tsx`**

- Radix UI popover primitive wrapper
- Required dependency: `@radix-ui/react-popover` (installed via npm)
- Provides PopoverTrigger, PopoverContent, and PopoverAnchor exports

### 4. Fixed Badge Component

**Modified: `src/components/ui/badge.tsx`**

Changes:

- Updated import path from `../../lib/utils` to `@/lib/utils` for consistency

### 5. Updated Cart Store

**Modified: `src/stores/cartStore.ts`**

Changes:

- Added `partialize` option to persist middleware (lines 535-540)
- Notifications no longer persist to localStorage
- Only `items` and `orders` are persisted
- Notifications reset to initial state on each session for testing

Initial hardcoded notifications for testing:

```typescript
notifications: [
  {
    id: "notif-1",
    orderId: "order-001",
    type: "seller_confirmed",
    message: "Your order has been confirmed by the seller!",
    timestamp: new Date(Date.now() - 5 * 60000), // 5 minutes ago
    read: false,
  },
  {
    id: "notif-2",
    orderId: "order-002",
    type: "shipped",
    message: "Your order is on the way! Track your delivery.",
    timestamp: new Date(Date.now() - 30 * 60000), // 30 minutes ago
    read: false,
  },
  {
    id: "notif-3",
    orderId: "order-003",
    type: "delivered",
    message: "Your order has been delivered!",
    timestamp: new Date(Date.now() - 2 * 3600000), // 2 hours ago
    read: true,
  },
];
```

### 6. Disabled OrderNotificationModal

**Modified: `src/App.tsx`**

Changes:

- Line 4: Commented out import statement
- Line 236: Commented out component rendering
- Modal pop-up no longer appears when orders are confirmed
- Can be re-enabled by uncommenting both lines

## How to Use

### Add a Notification Programmatically

```tsx
import { useCartStore } from "@/stores/cartStore";

function YourComponent() {
  const { addNotification } = useCartStore();

  const handleOrderConfirm = () => {
    addNotification(
      "order-123", // orderId
      "seller_confirmed", // type: 'seller_confirmed' | 'shipped' | 'delivered' | 'cancelled'
      "Your order has been confirmed!" // message
    );
  };

  return <button onClick={handleOrderConfirm}>Confirm Order</button>;
}
```

### View Notifications

- Click the bell icon in header to open dropdown
- Badge shows unread notification count
- Click "Mark all as read" to mark all as read
- Click individual notification to mark as read and navigate to order

## Testing Done

- ✅ Tested on Chrome
- ✅ Tested on /shop route
- ✅ Tested notification dropdown opening/closing
- ✅ Tested unread badge count
- ✅ Tested navigation from notification click
- ✅ Tested "Mark all as read" functionality
- ✅ Verified localStorage persistence exclusion
- ✅ Tested hardcoded test notifications display
- ✅ Verified different notification type icons display correctly

## Notes

- Notifications are NOT persisted to localStorage (can be changed if needed)
- OrderNotificationModal is temporarily disabled to avoid blocking testing UX
- Use `localStorage.clear()` in browser console to reset state if needed
- Console logs added for debugging (can be removed later):
  - `console.log('Notifications:', notifications)`
  - `console.log('Unread count:', unreadCount)`

## Re-enabling OrderNotificationModal

To re-enable the notification modal popup:

1. In `src/App.tsx` line 4: Uncomment the import
2. In `src/App.tsx` line 236: Uncomment the component usage

## Dependencies Added

- `@radix-ui/react-popover` - Popover primitive component
