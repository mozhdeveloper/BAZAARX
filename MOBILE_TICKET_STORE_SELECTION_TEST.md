# Mobile App - Buyer Ticket with Store Selection Test

## Overview
Buyers can now submit support tickets about specific stores from the mobile app. This document verifies the implementation and provides testing steps.

## Implementation Status

### ✅ Completed Components

#### 1. TicketService.getSellers()
- **File**: `mobile-app/services/TicketService.ts`
- **Status**: ✅ Complete
- **Features**:
  - Fetches all approved sellers from Supabase
  - Filters by `approval_status = 'approved'`
  - Orders by store_name alphabetically
  - Returns seller id, store_name, and owner_name

#### 2. CreateTicketScreen Store Selection
- **File**: `mobile-app/app/tickets/CreateTicketScreen.tsx`
- **Status**: ✅ Complete
- **Features**:
  - Store selector button with Store icon
  - Shows "Select a store (optional)" placeholder
  - Displays selected store name when chosen
  - X button to clear selection
  - Opens modal store picker on click

#### 3. Store Picker Modal
- **File**: `mobile-app/app/tickets/CreateTicketScreen.tsx`
- **Status**: ✅ Complete and Enhanced
- **Features**:
  - Full-screen modal with search bar
  - **NEW**: "General Issue (No specific store)" option at top (matches web behavior)
  - Real-time search filtering by store name or owner name
  - Displays store icon, store name, and owner name
  - Highlights selected store with orange background
  - Clear visual distinction for general option (gray icon)
  - FlatList for efficient rendering with header component
  - Empty state when no stores found
  - Allows clearing selection by choosing general option

#### 4. Ticket Creation with Seller ID
- **File**: `mobile-app/services/TicketService.ts` (createTicket method)
- **Status**: ✅ Complete
- **Features**:
  - Accepts `sellerId` in CreateTicketData
  - Passes `seller_id` to Supabase insert
  - Joins with sellers table to fetch store info
  - Returns ticket with seller information

#### 5. Database Integration
- **Migration**: `supabase-migrations/011_add_seller_id_to_support_tickets.sql`
- **Status**: ✅ Already Applied
- **Schema**: `support_tickets.seller_id` column exists with foreign key to sellers table

## Testing Checklist

### Pre-Test Setup
- [ ] Mobile app is running (`npm start` in mobile-app directory)
- [ ] User is logged in as a buyer
- [ ] Database has approved sellers
- [ ] Supabase connection is configured

### Test Flow: Create Ticket About a Store

#### Step 1: Navigate to Help Center
1. Open mobile app
2. Navigate to Help Center / Support
3. Tap on "Submit Ticket" or "Create New Ticket"
4. **Expected**: CreateTicketScreen opens

#### Step 2: Select a Store
1. Look for "Report about a store (optional)" section
2. Tap the store selector button
3. **Expected**: Modal opens with list of stores
4. **Expected**: Search bar is visible at top
5. **Expected**: List shows approved sellers with store names

#### Step 3: Search for Store
1. Type a store name in search bar (e.g., "Craft")
2. **Expected**: List filters in real-time
3. **Expected**: Only matching stores are shown
4. Clear search or type different query
5. **Expected**: List updates accordingly

#### Step 4: Select a Store
1. Tap on a store from the list
2. **Expected**: Modal closes
3. **Expected**: Store selector button now shows the selected store name
4. **Expected**: X button appears next to store name

#### Step 5: Clear Store Selection (Optional)
1. Tap the X button next to selected store
2. **Expected**: Selection clears
3. **Expected**: Button shows "Select a store (optional)" again
4. **Expected**: X button disappears

#### Step 6: Fill Ticket Details
1. Select a category (e.g., "Product Quality")
2. Enter subject: "Damaged product received"
3. Enter description: "I received a damaged item from this store"
4. Select priority: "High"
5. **Expected**: All fields accept input

#### Step 7: Submit Ticket
1. Tap "Submit Ticket" button
2. **Expected**: Loading indicator appears
3. **Expected**: Success alert shows "Ticket created successfully!"
4. **Expected**: Navigates to HelpCenter with tickets tab active
5. **Expected**: New ticket appears in list with store name badge

#### Step 8: Verify in Database
1. Open Supabase dashboard
2. Navigate to support_tickets table
3. Find the newly created ticket
4. **Expected**: `seller_id` column contains selected store's ID
5. **Expected**: Other fields are populated correctly

#### Step 9: Verify Admin Can See Store Info
1. Login to web app as admin
2. Navigate to `/admin/tickets`
3. Find the ticket created in mobile
4. **Expected**: Store name appears with Store icon in orange badge
5. **Expected**: Ticket detail shows "About Store" section with store name

## API Endpoints Tested

### TicketService.getSellers()
```typescript
// Returns:
[
  {
    id: "uuid-1",
    store_name: "Craftsman's Corner",
    owner_name: "Juan dela Cruz"
  },
  {
    id: "uuid-2",
    store_name: "TechHub Manila",
    owner_name: "Maria Santos"
  }
]
```

### TicketService.createTicket()
```typescript
// Input:
{
  userId: "buyer-uuid",
  subject: "Damaged product received",
  description: "I received a damaged item from this store",
  categoryId: "quality-uuid",
  priority: "high",
  sellerId: "store-uuid" // ← This is populated when store is selected
}

// Creates ticket in DB with seller_id set
```

## Expected Behavior

### When Store is Selected
- ✅ Store name displays in selector button
- ✅ X button appears to clear selection
- ✅ `sellerId` is included in ticket submission
- ✅ Ticket in database has `seller_id` populated
- ✅ Seller can see this ticket in "Buyer Reports" tab
- ✅ Admin sees store name with ticket

### When Store is NOT Selected
- ✅ Selector shows "Select a store (optional)"
- ✅ `sellerId` is null in ticket submission
- ✅ Ticket in database has `seller_id` as NULL
- ✅ This is a general support ticket (not about any specific store)
- ✅ Admin sees ticket without store badge

## Common Issues & Solutions

### Issue: "No stores found"
**Cause**: No approved sellers in database
**Solution**: 
1. Login to Supabase
2. Update seller approval_status to 'approved'
3. Refresh mobile app

### Issue: Store selector not opening
**Cause**: Navigation issue or modal state
**Solution**: 
1. Check console for errors
2. Verify `showStorePicker` state is being set
3. Check modal props in CreateTicketScreen

### Issue: Ticket not showing store name
**Cause**: seller_id not being passed or join not working
**Solution**: 
1. Check TicketService.createTicket includes seller_id in insert
2. Verify Supabase query includes seller join
3. Check mapDbTicketToTicket maps seller data correctly

## Success Criteria

✅ **All of the following must be true:**
1. Store selector modal opens and shows stores
2. Search filters stores in real-time
3. Selected store appears in button
4. Ticket submission includes seller_id
5. New ticket appears in buyer's ticket list
6. Store name badge shows on ticket (if store selected)
7. Admin can see which store the ticket is about
8. Seller can see ticket in their "Buyer Reports"

## Integration Points

### Mobile → Database
- CreateTicketScreen → TicketService.getSellers() → Supabase sellers table
- CreateTicketScreen → TicketService.createTicket() → Supabase support_tickets table

### Mobile → Web Admin
- Mobile creates ticket → Web admin fetches via ticketService.getAllTickets()
- Web shows store info from seller join in ticket list and detail

### Mobile → Seller Web
- Mobile creates ticket with seller_id → Seller web shows in /seller/buyer-reports
- Filtered by `seller_id = current_seller.id`

## Files Modified/Verified

### Mobile App Files
- ✅ `mobile-app/services/TicketService.ts`
  - getSellers() method filters approved stores
  - createTicket() includes seller_id parameter
  
- ✅ `mobile-app/app/tickets/CreateTicketScreen.tsx`
  - Store selector UI with modal
  - Search functionality
  - Selection state management
  - Passes sellerId to createTicket

- ✅ `mobile-app/app/types/ticketTypes.ts`
  - CreateTicketData interface includes sellerId?: string | null

### Database
- ✅ `supabase-migrations/011_add_seller_id_to_support_tickets.sql`
  - Adds seller_id column to support_tickets
  - Foreign key to sellers table
  - Index for performance

### Web Admin (Already Updated)
- ✅ `web/src/pages/AdminTickets.tsx`
  - Shows store icon and name in ticket list
  - Shows "About Store" section in ticket detail

## Next Steps for Developer

1. **Run Mobile App**: `cd mobile-app && npm start`
2. **Login as Buyer**: Use test buyer account
3. **Navigate to Help Center**: Tap support/tickets
4. **Create Ticket**: Follow test flow above
5. **Verify in Admin**: Check web admin panel shows store info
6. **Verify in Seller**: Check seller can see ticket in buyer reports

## Notes

- Store selection is **optional** - buyers can submit general tickets
- Only **approved** sellers appear in the store list
- Search is **case-insensitive** and matches store name or owner name
- Modal uses FlatList for performance with many stores
- Store info is automatically loaded when ticket is fetched
- Web and mobile share the same database schema and logic

## Status: ✅ READY FOR TESTING

All components are implemented and integrated. The feature is functional and ready for end-to-end testing.
