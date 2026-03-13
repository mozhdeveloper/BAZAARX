# BazaarX Promotional System - Technical Documentation

## 1. System Architecture
The promotional system utilizes a dual-layered hierarchy to seamlessly integrate admin-driven marketplace events with seller-driven independent campaigns.

### 1.1 Components Overview
- **Global Flash Sales (`global_flash_sale_slots`)**: Admin-created events with predefined time windows and constraints (e.g., minimum discount required).
- **Submissions (`flash_sale_submissions`)**: Products nominated by sellers to join global flash sales. Requires admin approval to go live.
- **Store Campaigns (`discount_campaigns` & `product_discounts`)**: Independent promotions created by sellers (`campaign_scope = 'store'`), giving them full autonomy over their store's strategy.

### 1.2 Hierarchy & Priority Logic
To prevent discount stacking and ensure predictable pricing, a strict priority rule is enforced at the database level:

1. **Global Flash Sale (Highest Priority)**: If a product has an approved submission for an active global event, this price overrides all others.
2. **Store Campaign (Medium Priority)**: If no global event applies, active store-level campaigns take effect.
3. **Regular Price (Fallback)**: Used if no campaigns apply or promotional stock is exhausted.

## 2. Database Implementation

### 2.1 RPC `get_active_product_discount`
This SQL function resolves the active discount for a product following the priority rules. It dynamically calculates the final price and identifies the winning campaign source.

- **Check 1**: Queries `flash_sale_submissions` joined with `global_flash_sale_slots` for approved, active global campaigns.
- **Check 2**: `UNION ALL` with `product_discounts` and `discount_campaigns` for active store campaigns.
- **Resolution**: Results are assigned a numeric `source_priority` (Global = 2, Store = 1). The query forces `ORDER BY source_priority DESC LIMIT 1`.

### 2.2 Atomic Stock Deduction: `decrement_product_stock`
To prevent overselling and maintain consistency across high-concurrency checkout and POS flows, stock deductions are atomic and promotional-aware.

When called, the function deducts stock exactly matching the priority of the current active discount:
- First, it decrements `submitted_stock` from `flash_sale_submissions` if an active global sale applies.
- Otherwise, it increments `sold_count` (which reduces available promotional stock) on `product_discounts` if a store campaign applies.
- Finally, it recursively deducts the required quantity from the base inventory (`product_variants`).

## 3. Web Client Integration

### 3.1 Admin Coordination UI
- **Dashboard (`AdminFlashSales.tsx`)**: High-fidelity UI allowing admins to manage global slots. Features top-level statistics headers and comprehensive creation/editing forms.
- **In-Card Review Drawer**: Directly integrated into event cards, allowing admins to view products and toggle approvals (`Approve` / `Reject`) in real-time.

### 3.2 Seller Participant UI
- **Global Event Splitting (`SellerDiscounts.tsx`)**: The seller promotion view is split into "My Store Campaigns" and "Global Flash Sales" using interactive Tabs.
- **Join Flow**: Sellers utilize the `JoinGlobalSlotDialog.tsx` to view active/upcoming global slots, select products, and nominate promotional prices/stock limits.

### 3.3 Store & Buyer UI
- **Store Profile Banner (`SellerStoreProfile.tsx`)**: An animated, branded promotional banner appears dynamically on seller profiles for active store campaigns, featuring countdown timers and discount details.
- **Product Cards**: Automatically pick up on `product.originalPrice` and `product.price` to show "crossed-out" original prices and display vibrant "% OFF" badges automatically when discounts are active.

## 4. API & Services

### `discountService.ts`
The primary interface for resolving and retrieving campaigns:
- `getCampaignsBySeller`: Returns filtered active store campaigns.
- `getGlobalFlashSaleSlots`: Returns Admin-defined events.
- `getActiveDiscountsForProducts`: Batches the RPC resolution logic efficiently to support product matrix/grid views.
