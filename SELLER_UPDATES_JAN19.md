# Seller Updates - January 19, 2026

## Summary

Updated seller dashboard to remove mock data, improved email handling from database, and added seller requirement validation in admin panel.

---

## 1. Removed Mock Data from Seller Dashboard

**Files Modified:**

- `web/src/stores/sellerStore.ts`
- `web/src/pages/SellerDashboard.tsx`

**Changes:**

- Replaced hardcoded mock stats with dynamic calculations from real data
- Implemented `refreshStats()` to calculate:
  - Total revenue from delivered orders
  - Total orders and products count
  - Average rating from order reviews
  - Monthly revenue (last 12 months)
  - Top products by sales
  - Recent activity feed
- Commented out stats cards, revenue charts, and recent activity sections in UI (temporarily)
- Dashboard now shows only Recent Orders and Best Selling Products sections

---

## 2. Email Fetching from Profiles Table

**Files Modified:**

- `web/src/services/authService.ts`
- `web/src/stores/sellerStore.ts`

**Changes:**

- Added `getEmailFromProfile(userId: string)` function in authService
  - Executes: `SELECT email FROM profiles WHERE id = $1`
  - Returns email or null
- Updated login flow to fetch email from profiles table
- Email is now properly merged into seller object during authentication

**Database Schema:**

```
auth.users → profiles (email) → sellers (business data)
```

---

## 3. Email Display in Seller Profile

**Files Modified:**

- `web/src/pages/SellerStoreProfile.tsx`

**Changes:**

- Email already displayed in "Owner & Contact Information" section
- Added fallback text "Not provided" for consistency
- Email shows in both view and edit modes

---

## 4. Seller Requirements Validation in Admin Panel

**Files Modified:**

- `web/src/stores/adminStore.ts`
- `web/src/pages/AdminSellers.tsx`

**Changes:**

- Added `hasCompleteRequirements(seller: Seller)` method to adminStore
- Validates seller has:
  - ✅ business_address (NOT NULL)
  - ✅ valid_id_url (NOT NULL)
  - ✅ proof_of_address_url (NOT NULL)
  - ✅ dti_registration_url (NOT NULL)
  - ✅ tax_id_url (NOT NULL)
- Updated Admin Sellers UI:
  - **Complete requirements**: Shows green "Approve" button
  - **Incomplete requirements**: Shows gray disabled "Incomplete" button with warning icon
- Validation runs automatically when `/admin/sellers` route loads

---

## Technical Details

### New Functions:

```typescript
// authService.ts
export const getEmailFromProfile(userId: string): Promise<string | null>

// adminStore.ts
hasCompleteRequirements(seller: Seller): boolean
```

### Helper Functions (sellerStore.ts):

```typescript
calculateMonthlyRevenue(orders: SellerOrder[])
calculateTopProducts(products: SellerProduct[], orders: SellerOrder[])
generateRecentActivity(orders: SellerOrder[], products: SellerProduct[])
getRelativeTime(dateString: string)
```

---

## Testing Checklist

- [ ] Login as seller and verify email appears in /seller/profile
- [ ] Check that email is fetched from profiles table (not sellers table)
- [ ] Verify stats are calculated from real order/product data
- [ ] Test admin panel - sellers with incomplete docs show "Incomplete" button
- [ ] Test admin panel - sellers with complete docs show "Approve" button
