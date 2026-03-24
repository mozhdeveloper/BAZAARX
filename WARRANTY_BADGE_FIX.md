# Warranty Badge Fix - Orders Page

## Problem
The shield badge icon was not appearing on product cards in the Orders Page when orders had "received" status, even though the products had `has_warranty` set to `true` in the products table.

## Root Cause
The issue was a **data flow problem** between different parts of the system:

1. **ProductDetailPage.tsx** fetches warranty info directly from the `products` table using `warrantyService.getProductWarranty(productId)`, which correctly returns `hasWarranty: true`.

2. **OrdersPage.tsx** fetches warranty status from the `order_items` table using `warrantyService.getOrderItemsWarrantyStatus(orderItemId)`, which checks:
   - `warranty_type`
   - `warranty_expiration_date`
   - `warranty_start_date`
   - `warranty_duration_months`

3. **The Missing Link**: When orders were created (during checkout), the product's warranty information was **NOT being transferred** to the order items. This meant:
   - `order_items.warranty_type` = `null`
   - `order_items.warranty_expiration_date` = `null`
   - Result: `hasWarranty` = `false` on the Orders Page

## Solution
Modified the order creation flows to fetch product warranty data and populate the order items with warranty information:

### Files Changed

#### 1. `web/src/services/checkoutService.ts`
**Changes:**
- Added warranty data fetching for all products in cart before creating orders
- Modified `orderItemsData` creation to include warranty fields:
  - `warranty_type`
  - `warranty_duration_months`
  - `warranty_start_date` (set to order creation date)
  - `warranty_expiration_date` (calculated as start date + duration months)

**Code Location:** Lines ~232-320

#### 2. `web/src/services/orderService.ts`
**Changes:**
- Updated `createPOSOrder()` function (offline/POS orders)
- Added same warranty data fetching and population logic
- Ensures both online and offline orders have warranty information

**Code Location:** Lines ~547-635

#### 3. `web/src/pages/OrdersPage.tsx`
**Changes:**
- Removed debug console.log statements (temporary debugging code cleaned up)
- Badge display logic remains unchanged (already correct):
  ```typescript
  {(order.status === "received" || statusFilter === "warranty") && 
   item.warranty?.hasWarranty && 
   !item.warranty.isExpired && (
    <Shield badge component />
  )}
  ```

## How It Works Now

### Order Creation Flow
1. User adds products to cart and proceeds to checkout
2. Before creating order items, system fetches warranty info for all products:
   ```typescript
   const { data: warrantyData } = await supabase
     .from('products')
     .select('id, has_warranty, warranty_type, warranty_duration_months')
     .in('id', productIds);
   ```

3. For each order item, warranty fields are populated:
   ```typescript
   if (warrantyInfo?.has_warranty && warrantyInfo.warranty_type && warrantyInfo.warranty_duration_months) {
     warrantyType = warrantyInfo.warranty_type;
     warrantyDurationMonths = warrantyInfo.warranty_duration_months;
     warrantyStartDate = orderDate.toISOString();
     
     const expirationDate = new Date(orderDate);
     expirationDate.setMonth(expirationDate.getMonth() + warrantyDurationMonths);
     warrantyExpirationDate = expirationDate.toISOString();
   }
   ```

4. When order status becomes "received", the Orders Page queries order items:
   ```typescript
   const warrantyStatus = await warrantyService.getOrderItemsWarrantyStatus(orderItemId);
   ```

5. Badge appears if:
   - Order status is "received" (or warranty filter is active)
   - `item.warranty.hasWarranty === true` (derived from `warranty_type` existing)
   - `item.warranty.isExpired === false`

## Testing
To verify the fix works:

1. **Create a new order** with a product that has `has_warranty: true`
2. **Mark order as received** (via seller flow or manual status update)
3. **Navigate to Orders Page** → "Received" tab
4. **Verify shield badge appears** on the product card
5. **Click badge** to open warranty status modal

## Database Schema
The `order_items` table has these warranty-related columns:
- `warranty_type` (string | null)
- `warranty_duration_months` (number | null)
- `warranty_start_date` (datetime | null)
- `warranty_expiration_date` (datetime | null)

## Impact
- **New orders** created after this fix will have warranty information properly transferred
- **Existing orders** will not have warranty data (would require a migration script if needed)
- Both **online checkout** and **POS/offline orders** are fixed

## Future Considerations
1. Consider adding a migration script to backfill warranty data for existing orders
2. Add warranty info display in order confirmation emails
3. Consider warranty expiration notifications for buyers
