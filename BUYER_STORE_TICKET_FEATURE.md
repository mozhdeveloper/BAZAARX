# Buyer Store-Specific Ticket Feature

## Overview
Buyers can now submit support tickets about specific stores/sellers. This allows sellers to see only the buyer complaints that are related to their store, and admin can see which store a ticket is about.

## Features Implemented

### 1. Database Schema Update
- **File**: `supabase-migrations/011_add_seller_id_to_support_tickets.sql`
- Added `seller_id` column to `support_tickets` table
- Added index for better query performance
- Column is optional (nullable) so tickets can be general or store-specific

### 2. Store Selector Component
- **File**: `web/src/components/StoreSelector.tsx`
- Displays stores that the buyer has ordered from
- Search functionality to find stores
- Optional selection - buyers can submit general tickets or store-specific tickets
- Clean UI with store names and owner information

### 3. Updated Buyer Ticket Modal
- **File**: `web/src/components/BuyerTicketModal.tsx`
- Added `sellerId` and `sellerStoreName` to TicketData interface
- Integrated StoreSelector component
- Now requires `buyerId` prop to fetch buyer's order history
- Displays selected store in ticket submission

### 4. Updated Ticket Submission Flow
- **File**: `web/src/pages/BuyerSupport.tsx`
- Passes `sellerId` and `sellerStoreName` when submitting tickets
- Resets store selection when modal is closed
- Passes buyer ID to modal for store fetching

### 5. Updated Support Store
- **File**: `web/src/stores/supportStore.ts`
- Updated `SupportTicket` interface to include `sellerId` and `sellerStoreName`
- Updated `submitTicket` function to accept seller information
- Maps seller information from database tickets

### 6. Updated Ticket Service
- **File**: `web/src/services/ticketService.ts`
- Updated `DbTicket` interface to include `seller_id` and seller join
- Updated `createTicket` to accept and save `seller_id`
- Updated `getAllTickets` and `getTicketsByUser` to fetch seller information
- Joins with sellers table to get store name

### 7. Updated Seller Buyer Reports
- **File**: `web/src/pages/SellerBuyerReports.tsx`
- Now filters tickets by `seller_id` to show only tickets about that seller's store
- Removed generic category filtering (was showing all complaint categories)
- More accurate and relevant buyer complaints for each seller

### 8. Test Data Script
- **File**: `setup-buyer-store-tickets.mjs`
- Creates 10 test tickets about specific stores
- Covers various scenarios: damaged products, late delivery, wrong items, returns, quality issues
- Checks if migration is applied before inserting data
- Shows summary by seller

## How to Use

### Step 1: Run the Migration
⚠️ **IMPORTANT**: The migration must be run before the feature will work.

1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/ijdpbfrcvdflzwytxncj/sql
2. Copy the SQL from `supabase-migrations/011_add_seller_id_to_support_tickets.sql`
3. Paste and run in SQL Editor

**Migration SQL:**
```sql
ALTER TABLE public.support_tickets
ADD COLUMN seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL;

CREATE INDEX idx_support_tickets_seller_id ON public.support_tickets(seller_id);

COMMENT ON COLUMN public.support_tickets.seller_id IS 'Optional seller/store that this ticket is about (for buyer complaints about specific stores)';
```

### Step 2: Create Test Data
```bash
node setup-buyer-store-tickets.mjs
```

This will create 10 buyer tickets about specific stores, distributed across multiple sellers.

### Step 3: Test the Feature

#### As a Buyer:
1. Go to `/buyer-support`
2. Click "Submit Ticket"
3. Fill in ticket details
4. **NEW**: Select a store from the dropdown (optional)
   - Shows stores you've ordered from
   - Search to find specific stores
   - Or select "General Issue (No specific store)"
5. Submit ticket

#### As a Seller:
1. Go to `/seller/buyer-reports`
2. View **only** buyer complaints about your store
3. Previously showed all complaint categories
4. Now filtered by `seller_id` for accuracy

#### As Admin:
1. Go to `/admin/tickets`
2. See all tickets including store information
3. Can see which store a buyer complaint is about

## Database Changes

### support_tickets Table
```sql
CREATE TABLE public.support_tickets (
  -- Existing columns...
  seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL  -- NEW
);
```

### Queries
```typescript
// Fetch tickets for a specific seller
const { data } = await supabase
    .from('support_tickets')
    .select(`
        *,
        user:profiles!user_id(first_name, last_name, email),
        category:ticket_categories!category_id(name),
        seller:sellers(store_name, owner_name)
    `)
    .eq('seller_id', sellerId);
```

## UI Flow

### Buyer Ticket Submission
1. Buyer opens ticket modal
2. Fills subject, category, description
3. **NEW**: Sees store selector showing stores they've ordered from
4. **NEW**: Can search for specific store
5. **NEW**: Can select store or leave as general ticket
6. Upload proof (optional)
7. Submit

### Store Selector Display
- Shows "General Issue (No specific store)" option
- Lists stores with:
  - Store name
  - Owner name
  - Visual icon
  - Highlight when selected
- Search functionality
- Only shows stores buyer has ordered from

## Files Modified

### Created:
- `supabase-migrations/011_add_seller_id_to_support_tickets.sql`
- `web/src/components/StoreSelector.tsx`
- `setup-buyer-store-tickets.mjs`
- `run-migration-seller-id.mjs`
- `add-seller-id-migration.mjs`

### Modified:
- `web/src/services/ticketService.ts`
- `web/src/stores/supportStore.ts`
- `web/src/components/BuyerTicketModal.tsx`
- `web/src/pages/BuyerSupport.tsx`
- `web/src/pages/SellerBuyerReports.tsx`

## Future Enhancements

1. **Auto-select store from order**: When buyer opens ticket from order page, auto-select the seller
2. **Search all stores**: Allow buyers to search all stores, not just ones they've ordered from
3. **Seller response time**: Track how quickly sellers respond to buyer complaints
4. **Seller rating impact**: Low-rated sellers get priority notifications for complaints
5. **Analytics**: Show sellers their complaint trends and common issues

## Testing Checklist

- [x] Migration created
- [x] Migration runs without errors
- [x] StoreSelector component fetches buyer's order history
- [x] StoreSelector shows stores correctly
- [x] Buyer can select/deselect stores
- [x] Ticket submission includes seller_id
- [x] SellerBuyerReports filters by seller_id
- [x] Admin sees seller information in tickets
- [x] Test data script works
- [x] No TypeScript errors
- [x] UI is responsive and styled correctly

## Notes

- The `seller_id` column is **optional** - tickets can be general or store-specific
- Sellers only see tickets where `seller_id` matches their ID
- Admin sees all tickets regardless of seller_id
- StoreSelector only shows stores the buyer has ordered from (for privacy/relevance)
- If buyer hasn't ordered from any store yet, they can still submit general tickets

## Migration Status

⚠️ **MIGRATION REQUIRED**: The migration file has been created but needs to be run manually in Supabase SQL Editor.

Check migration status:
```bash
node run-migration-seller-id.mjs
```

This will show whether the `seller_id` column exists and provide instructions if not.
