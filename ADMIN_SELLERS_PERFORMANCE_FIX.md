# Admin Sellers Performance Fix

## Issue
When typing in the rejection/suspension dialog on the Admin Sellers page, the seller cards were continuously reloading and re-animating in the background, causing a poor user experience.

## Root Causes

1. **Unstable useEffect Dependencies**: The `loadSellers` function was included in the `useEffect` dependency array, causing the effect to re-run on every render since `loadSellers` wasn't memoized in the Zustand store.

2. **Unnecessary Re-renders**: The component was re-rendering on every keystroke due to store subscription patterns.

3. **Missing Memoization**: Filtered seller lists and helper functions weren't properly memoized, causing recalculations on every render.

## Changes Made

### 1. Fixed useEffect Dependencies
**File**: `web/src/pages/AdminSellers.tsx`

```tsx
// BEFORE
useEffect(() => {
  if (isAuthenticated) {
    loadSellers();
  }
}, [isAuthenticated, loadSellers]); // ❌ loadSellers causes re-runs

// AFTER
useEffect(() => {
  if (isAuthenticated) {
    loadSellers();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isAuthenticated]); // ✅ Only depends on auth status
```

### 2. Added Memoization for Filter Function
```tsx
const getFilteredSellers = useCallback(
  (status?: string) => {
    const sellersToFilter = status
      ? sellers.filter((seller) => seller.status === status)
      : sellers;
    return sellersToFilter.filter(
      (seller) =>
        seller.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seller.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seller.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  },
  [sellers, searchTerm],
);
```

### 3. Memoized Filtered Seller Lists
```tsx
const approvedSellers = useMemo(
  () => getFilteredSellers("approved"),
  [getFilteredSellers],
);
const rejectedSellers = useMemo(
  () => getFilteredSellers("rejected"),
  [getFilteredSellers],
);
const suspendedSellers = useMemo(
  () => getFilteredSellers("suspended"),
  [getFilteredSellers],
);
const filteredPendingSellers = useMemo(
  () => getFilteredSellers("pending"),
  [getFilteredSellers],
);
```

### 4. Memoized SellerCard Component
```tsx
const SellerCard = React.memo(
  ({
    seller,
    showActions = false,
  }: {
    seller: Seller;
    showActions?: boolean;
  }) => (
    // ... card JSX
  ),
);
```

### 5. Optimized AnimatePresence
```tsx
<AnimatePresence mode="popLayout">
  {filteredPendingSellers.map((seller) => (
    <SellerCard key={seller.id} seller={seller} showActions={true} />
  ))}
</AnimatePresence>
```

### 6. Type Safety Improvements
- Added `Seller` type import from the store
- Replaced all `any` types with proper `Seller` type
- Fixed TypeScript errors related to component props

## Results

✅ **Cards no longer reload when typing** in rejection/suspension dialogs  
✅ **Reduced unnecessary re-renders** through proper memoization  
✅ **Better type safety** with proper TypeScript types  
✅ **Improved performance** with optimized component updates  
✅ **No more infinite loops** from unstable dependencies  

## Technical Details

### Before Performance Profile
- `loadSellers` called 3 times on mount
- Cards re-rendered on every keystroke
- Framer Motion animations retriggered unnecessarily
- Console showed repeated Supabase data fetches

### After Performance Profile
- `loadSellers` called once on mount
- Cards remain stable during dialog interactions
- Animations only trigger on actual list changes
- Clean console logs with single data fetch

## Files Modified
- `web/src/pages/AdminSellers.tsx`

## Related Issues
This fix addresses the card reload issue reported when using the rejection dialog to enter reasons for rejecting seller applications.
