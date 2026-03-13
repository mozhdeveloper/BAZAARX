# BazaarX Promotional System Refactor Documentation

## Overview
The BazaarX promotional system has been refactored into a dual-layered hierarchy: **Admin Tier (Marketplace Coordination)** and **Seller Tier (Autonomy & Participation)**. This refactor introduces event slots, submission review, and clear price priority logic.

## 1. Database Schema

### Global Flash Sale Slots (`global_flash_sale_slots`)
Defines "Event Containers" managed by Admins.
- `id` (UUID, PK)
- `name` (TEXT): e.g., "12.12 Mega Sale"
- `start_date` (TIMESTAMPTZ)
- `end_date` (TIMESTAMPTZ)
- `min_discount` (NUMERIC): Minimum discount percentage required for submissions.
- `created_at` (TIMESTAMPTZ)

### Flash Sale Submissions (`flash_sale_submissions`)
Products nominated by sellers for a specific slot.
- `id` (UUID, PK)
- `slot_id` (UUID, FK): References `global_flash_sale_slots`
- `seller_id` (UUID, FK): References `sellers`
- `product_id` (UUID, FK): References `products`
- `submitted_price` (NUMERIC)
- `submitted_stock` (INT)
- `status` (ENUM): 'pending', 'approved', 'rejected'
- `created_at` (TIMESTAMPTZ)

### Discount Campaigns (`discount_campaigns`) - Updated
- `campaign_scope` (TEXT): 'global' or 'store'.
- Other existing fields: `name`, `campaign_type`, `starts_at`, `ends_at`, `status`, etc.

## 2. Price Priority Resolution Logic

During overlapping promotional windows, the system resolves the final price using the following hierarchy (highest to lowest priority):

1.  **Global Flash Sale Price**: Approved submissions for an active `global_flash_sale_slots`.
2.  **Store Campaign Price**: Active `discount_campaigns` with `campaign_scope = 'store'`.
3.  **Regular Price**: The base price defined in the `products` table.

**Implementation**: The `productService` and `discountService` sort all active discounts by `campaign_scope` ('global' first) and `campaign_type` ('flash_sale' first) before selecting the best deal for the user.

## 3. Migration Steps

1.  **Schema Update**: Added `campaign_scope` to `discount_campaigns` and created `global_flash_sale_slots` and `flash_sale_submissions` tables.
2.  **Existing Campaigns**: All existing campaigns were defaulted to `campaign_scope = 'store'` to maintain seller autonomy.
3.  **Stock Management**: Transitioned all checkout and POS transactions to use the atomic `decrement_stock` RPC function to prevent overselling.

## 4. Admin Management Instructions

### Creating Event Slots
1.  Navigate to the **Admin Flash Sale** tab.
2.  Click **Create Event Slot**.
3.  Define the Event Name (e.g., "Payday Sale"), Start/End dates, and the **Minimum Discount %** required from sellers.
4.  Once created, the slot becomes visible to all sellers in their dashboard.

### Reviewing Submissions
1.  Go to the **Review Submissions** tab in the Flash Sale coordination page.
2.  You will see a list of products nominated by sellers for active or upcoming slots.
3.  Check the **Original Price** vs **Submitted Price** to ensure it meets the event's criteria.
4.  Click **Approve** (Checkmark) to include the product in the global event, or **Reject** (X) to exclude it.
5.  Approved products automatically appear in the global flash sale feed during the event window.

## 5. Seller Participation

### Joining Marketplace Events
1.  Navigate to the **Discounts** tab in the Seller Dashboard.
2.  Switch to the **Marketplace Events** sub-tab.
3.  View upcoming Admin-defined slots and click **Join Now**.
4.  Nominate products and set their flash sale price/stock.

### Creating Store Campaigns
1.  In the **Discounts** tab, click **Create Campaign**.
2.  Ensure **Campaign Scope** is set to **Store Only**.
3.  These campaigns will trigger a promotional banner on your store profile and filter products for visiting buyers.

## 6. Performance & Optimization
- **FlashList**: Utilized in mobile product feeds for 60fps scrolling performance.
- **Memoization**: Countdown timers are memoized to prevent unnecessary re-renders.
- **Atomic Updates**: `decrement_stock` ensures database-level consistency for all transactions.
