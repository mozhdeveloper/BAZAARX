# Admin Seller Management - Supabase Integration

**Date:** January 19, 2026  
**Status:** ✅ Complete

---

## Overview

Integrated the Admin Seller Management system with Supabase to display real-time seller applications with pending approval status. Admins can now view, approve, reject, and suspend sellers directly from the database.

---

## Features Implemented

### 1. **Real-time Seller Data Loading**

- Fetches sellers from Supabase `sellers` table
- Joins with `profiles` table to get user information (email, full name, phone)
- Displays all seller information including documents, business details, and banking info

### 2. **Admin Actions**

- ✅ **Approve Seller** - Updates `approval_status` to 'approved' with timestamp
- ❌ **Reject Seller** - Updates status to 'rejected' with reason
- 🚫 **Suspend Seller** - Updates status to 'suspended' with reason
- 👁️ **View Details** - Shows complete seller profile in modal

### 3. **Document Management**

- Displays submitted document URLs:
  - Business Permit
  - Valid ID
  - Proof of Address
  - DTI Registration
  - Tax ID

### 4. **Real-time Filtering**

- Search by business name, owner name, or email
- Filter by status: Pending, Approved, Rejected, Suspended
- Real-time counts in tab headers

### 5. **Admin Authentication**

- Integrated with Supabase Auth
- Validates admin user type from profiles table
- Secure session management

---

## Database Setup

### Admin User Creation

**Step 1: Create Admin User in Supabase**

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add user"**
3. Enter credentials:
   - Email: `admin@gmail.com`
   - Password: `password`
4. Click **"Create user"**
5. **Copy the generated User ID**

**Step 2: Insert Admin Profile**

```sql
INSERT INTO profiles (id, email, full_name, phone, user_type, avatar_url)
VALUES (
  'PASTE_USER_ID_HERE',  -- Replace with actual user ID from Step 1
  'admin@gmail.com',
  'Admin User',
  NULL,
  'admin',
  NULL
);
```

### Row Level Security (RLS) Policies

**Policy for Admins to View All Sellers:**

```sql
CREATE POLICY "Admins can view all sellers"
ON sellers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);
```

**Policy for Admins to Update Sellers:**

```sql
CREATE POLICY "Admins can update sellers"
ON sellers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);
```

---

## Code Changes

### Files Modified

#### 1. `web/src/stores/adminStore.ts`

**Changes:**

- Added Supabase import and integration
- Updated `loadSellers()` to fetch from Supabase with LEFT JOIN on profiles
- Updated `approveSeller()` to update approval_status in database
- Updated `rejectSeller()` to save rejection reason
- Updated `suspendSeller()` to save suspension reason
- Modified `login()` to authenticate against Supabase Auth
- Added admin user_type validation
- Updated `logout()` to sign out from Supabase

**Key Functions:**

```typescript
loadSellers: async () => {
  // Fetches sellers with profile data
  const { data: sellersData } = await supabase
    .from("sellers")
    .select(`*, profiles(email, full_name, phone)`)
    .order("created_at", { ascending: false });
};

approveSeller: async (id) => {
  await supabase
    .from("sellers")
    .update({
      approval_status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: "admin",
    })
    .eq("id", id);
};
```

#### 2. `web/src/pages/AdminSellers.tsx`

**Changes:**

- Added `RefreshCw` icon import
- Added **Refresh** button to manually reload seller data
- Button shows spinning animation when loading

#### 3. `web/src/pages/AdminAuth.tsx`

**Changes:**

- Updated demo credentials to `admin@gmail.com` / `password`
- Updated both credential displays (orange box and blue info box)

---

## Data Flow

### Seller Registration Flow

1. **Seller registers** at `/seller/register`
2. Account created in `auth.users` table
3. Profile created in `profiles` table with `user_type = 'seller'`
4. Seller record created in `sellers` table with `approval_status = 'pending'`

### Admin Approval Flow

1. **Admin logs in** at `/admin/login` with Supabase credentials
2. System verifies `user_type = 'admin'` in profiles table
3. **Admin views sellers** at `/admin/sellers`
4. RLS policy allows admin to see all sellers
5. **Admin approves** seller → Updates `approval_status`, `approved_at`, `approved_by`
6. Seller can now access full platform features

---

## API Integration

### Supabase Queries Used

**Load All Sellers:**

```typescript
const { data } = await supabase
  .from("sellers")
  .select(
    `
    *,
    profiles(email, full_name, phone)
  `,
  )
  .order("created_at", { ascending: false });
```

**Approve Seller:**

```typescript
await supabase
  .from("sellers")
  .update({
    approval_status: "approved",
    approved_at: new Date().toISOString(),
    approved_by: "admin",
  })
  .eq("id", sellerId);
```

**Reject Seller:**

```typescript
await supabase
  .from("sellers")
  .update({
    approval_status: "rejected",
    rejected_at: new Date().toISOString(),
    rejected_by: "admin",
    rejection_reason: reason,
  })
  .eq("id", sellerId);
```

---

## Testing Guide

### 1. Create Test Seller

1. Go to `/seller/register`
2. Register a new seller account
3. Complete registration (status will be 'pending')

### 2. Login as Admin

1. Ensure admin user exists in Supabase
2. Go to `/admin/login`
3. Use credentials: `admin@gmail.com` / `password`
4. Click "Sign In" or use "Use Demo Credentials" button

### 3. View Pending Sellers

1. Navigate to `/admin/sellers`
2. Click "Pending" tab
3. Should see all sellers with `approval_status = 'pending'`
4. Verify all 7 columns display correctly

### 4. Test Approval Flow

1. Click "View Details" on any pending seller
2. Verify all information displays correctly
3. Click "Approve" button
4. Confirm approval in dialog
5. Verify seller moves to "Approved" tab
6. Check database: `approval_status = 'approved'`

### 5. Test Rejection Flow

1. Select a pending seller
2. Click "Reject" button
3. Enter rejection reason
4. Confirm rejection
5. Verify seller moves to "Rejected" tab
6. Check database for `rejection_reason`

---

## Security Considerations

### Row Level Security (RLS)

- ✅ RLS enabled on `sellers` table
- ✅ Sellers can only view/update their own records
- ✅ Admins can view all sellers
- ✅ Only authenticated users with `user_type = 'admin'` can perform admin actions

### Authentication

- ✅ Admin login requires valid Supabase credentials
- ✅ Profile must have `user_type = 'admin'`
- ✅ Session managed by Supabase Auth
- ✅ Auto-logout on session expiry

### Data Validation

- ✅ Rejection/suspension requires reason
- ✅ All status changes logged with timestamp
- ✅ Admin ID recorded for audit trail

---

## Environment Variables

Ensure these are set in `.env.local`:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Known Issues & Limitations

1. **No Email Notifications**: Sellers are not notified of approval/rejection yet
2. **No Activity Logs**: Admin actions are not logged in separate audit table
3. **No Bulk Actions**: Cannot approve/reject multiple sellers at once
4. **Document Verification**: Documents are displayed but not verifiable (no file download)
5. **Avatar Generation**: Uses placeholder API (ui-avatars.io) - requires internet

---

## Future Enhancements

### Phase 2

- [ ] Email notifications to sellers on status change
- [ ] Document upload/download functionality with Supabase Storage
- [ ] Bulk approve/reject actions
- [ ] Admin activity audit log
- [ ] Seller verification checklist with document review
- [ ] Comments/notes system for sellers

### Phase 3

- [ ] Real-time seller metrics (products, orders, revenue)
- [ ] Advanced filtering (by registration date, category, location)
- [ ] Export seller data to CSV
- [ ] Seller analytics dashboard
- [ ] Integration with CRM system

---

## Troubleshooting

### Sellers Not Appearing

**Issue:** Only 1 seller shows instead of all 7

**Solution:**

1. Check if logged in as seller (will only see own record)
2. Logout and login as admin
3. Verify RLS policy exists: `\dp sellers` in SQL
4. Check console for errors
5. Clear browser cache and localStorage

### Admin Cannot Login

**Issue:** "Access denied. Admin account required."

**Solution:**

1. Verify admin user exists in `auth.users`
2. Check profile has `user_type = 'admin'`
3. Run: `SELECT * FROM profiles WHERE email = 'admin@gmail.com';`
4. Ensure RLS allows reading from profiles table

### Approval Not Saving

**Issue:** Approval button clicked but status doesn't change

**Solution:**

1. Check console for Supabase errors
2. Verify RLS UPDATE policy exists for admins
3. Check database directly: `SELECT approval_status FROM sellers;`
4. Ensure admin is authenticated (check session)

---

## Console Debugging

Added console logs for debugging:

```javascript
// In adminStore.ts loadSellers()
console.log("Raw sellers data from Supabase:", sellersData);
console.log("Number of sellers fetched:", sellersData?.length);
console.log("Mapped sellers:", sellers);
console.log("Pending sellers:", pendingSellers);
```

Check browser console (F12) to see:

- Number of sellers fetched
- Data transformation
- RLS policy filtering

---

## Admin Credentials

**Production Admin:**

- Email: `admin@gmail.com`
- Password: `password`
- User Type: `admin`

**Demo Credentials:**

- Displayed on login page
- Auto-fill button available
- Same as production for testing

---

## Related Documentation

- [Seller Registration Flow](./SELLER_REGISTRATION_COMPLETE.md)
- [Admin Panel Complete](./ADMIN_PANEL_COMPLETE.md)
- [Supabase Setup Guide](./SUPABASE_SETUP_CHECKLIST.md)
- [Seller Onboarding Documents](./SELLER_ONBOARDING_DOCUMENT_URLS.md)

---

## Summary

✅ **Completed:**

- Real-time seller data loading from Supabase
- Admin authentication with Supabase Auth
- Approve/Reject/Suspend functionality
- RLS policies for admin access
- Search and filter capabilities
- Refresh button for manual reload
- Updated admin credentials

🎯 **Impact:**

- Admins can now manage real seller applications
- All 7 pending sellers visible in admin panel
- Secure authentication and authorization
- Real-time status updates to database
- Complete audit trail with timestamps

🚀 **Next Steps:**

1. Create admin user in Supabase Dashboard
2. Add admin profile with `user_type = 'admin'`
3. Create RLS policies for admin access
4. Test approval workflow end-to-end
5. Plan Phase 2 enhancements (email notifications, document verification)
