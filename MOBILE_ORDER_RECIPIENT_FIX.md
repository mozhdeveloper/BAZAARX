# Fix: Mobile Orders Missing Recipient Details in Seller's Orders Page

## Problem Summary
When a buyer places an order successfully from the mobile app, the seller's orders page was not displaying the full customer details. Instead of showing:
- Customer name: "beii the buyer"
- Email: "beii@gmail.com"
- Full address details

It only displayed:
- Generic text: "Customer"
- Limited location: "Metro Manila, Manila"

## Root Cause Analysis
The mobile checkout service (`mobile-app/src/services/checkoutService.ts`) was **not creating `order_recipients` records** when processing orders, unlike the web checkout service.

### Database Schema Requirements
The database has this structure:
- **order_recipients** table: stores recipient first_name, last_name, phone, email
- **orders** table: has a `recipient_id` foreign key linking to order_recipients
- **shipping_addresses** table: stores full address details

### The Issue
Mobile checkout was only creating:
- ✅ Shipping address record in `shipping_addresses` table
- ❌ NO recipient record in `order_recipients` table
- ❌ NOT linking `recipient_id` in the order

When the seller's orders page fetched the order, the mapper tried to get buyer details from `recipient` (which was NULL because no recipient was created), causing fallback to generic values like "Customer".

## Solution Implemented

### 1. Mobile Checkout Service Update
**File:** `mobile-app/src/services/checkoutService.ts`

Added recipient creation logic:
```typescript
// Create recipient record with buyer details
const nameParts = (shippingAddress.fullName || '').trim().split(' ');
const recipientFirstName = nameParts[0] || '';
const recipientLastName = nameParts.slice(1).join(' ') || '';

const { data: recipientResult, error: recipientError } = await supabase
    .from('order_recipients')
    .insert({
        first_name: recipientFirstName,
        last_name: recipientLastName,
        phone: shippingAddress.phone || '',
        email: email || ''
    })
    .select('id')
    .single();

if (recipientError) throw recipientError;
const recipientId = recipientResult?.id;
```

### 2. Updated Order Creation
All three order creation paths now include `recipient_id`:

**Path A - RPC Function (Strategy 1):**
```typescript
await supabase.rpc('create_order_safe', {
    p_order_number: orderNumber,
    p_buyer_id: userId,
    p_order_type: 'ONLINE',
    p_address_id: addressData.id,
    p_recipient_id: recipientId,  // ← NEW
    p_payment_status: 'pending_payment',
    p_shipment_status: 'waiting_for_seller',
    p_notes: `Order from ${shippingAddress.fullName}`
});
```

**Path B - Direct Insert Fallback (Strategy 2):**
```typescript
await supabase.from('orders').insert({
    order_number: orderNumber,
    buyer_id: userId,
    order_type: 'ONLINE',
    address_id: addressData.id,
    recipient_id: recipientId,  // ← NEW
    payment_status: 'pending_payment',
    shipment_status: 'waiting_for_seller',
    notes: `Order from ${shippingAddress.fullName}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
});
```

**Path C - Retry Insert for Duplicates:**
Same as Path B with `recipient_id` included.

### 3. RPC Function Update
**Files Updated:**
- `supabase-migrations/004_fix_buyer_orders_view_clean.sql`
- `supabase-migrations/004_fix_buyer_orders_view.sql`

Updated the `create_order_safe` function signature:
```sql
CREATE OR REPLACE FUNCTION create_order_safe(
  p_order_number TEXT,
  p_buyer_id UUID,
  p_order_type TEXT DEFAULT 'ONLINE',
  p_address_id UUID DEFAULT NULL,
  p_recipient_id UUID DEFAULT NULL,  -- ← NEW PARAMETER
  p_payment_status TEXT DEFAULT 'pending_payment',
  p_shipment_status TEXT DEFAULT 'waiting_for_seller',
  p_notes TEXT DEFAULT NULL
)
```

And added `recipient_id` to the INSERT statement:
```sql
INSERT INTO public.orders (
    order_number,
    buyer_id,
    order_type,
    address_id,
    recipient_id,  -- ← NEW COLUMN
    payment_status,
    shipment_status,
    notes,
    created_at,
    updated_at
) VALUES (...)
```

## Testing Instructions

### Manual Test Steps:

1. **Clear Cache/Restart Mobile App**
   - Rebuild the mobile app to ensure new code is deployed
   - Clear app cache if necessary

2. **Create Test Order from Mobile**
   - Log in as a buyer in mobile app
   - Add product to cart
   - Go to checkout
   - Enter shipping details:
     - Full Name: "John Doe"
     - Email: "john.doe@example.com"
     - Phone: "09123456789"
     - Address: Complete address with city, province, etc.
   - Place order

3. **Verify in Seller's Orders Page (Web)**
   - Log in as a seller (whose product was in the order)
   - Go to "Seller Orders" page
   - Find the recently created order
   - Click on it to view details
   - **Verify you see:**
     - ✅ Customer name: "John Doe" (NOT "Customer")
     - ✅ Email: "john.doe@example.com"
     - ✅ Phone: "09123456789"
     - ✅ Full address with street, city, province

4. **Verify in Order Details Modal**
   - The "Customer" section should display:
     - Full name "John Doe"
     - Email address
     - Complete address with all components

### Database Verification (Optional):

```sql
-- Check if recipient was created for the order
SELECT 
    o.order_number,
    o.recipient_id,
    r.first_name,
    r.last_name,
    r.phone,
    r.email
FROM orders o
LEFT JOIN order_recipients r ON o.recipient_id = r.id
WHERE o.order_number = 'ORD-XXXXX'  -- Replace with your test order number
ORDER BY o.created_at DESC
LIMIT 1;
```

## Files Modified

### Backend Performance: O(1)
- No performance impact
- One additional INSERT to `order_recipients` table (tiny lookup table)
- Already has proper indexing on `order_id`

### Backward Compatibility: ✅
- Web checkout already creates recipients (no change needed)
- Seller orders fetching logic unchanged
- Mapper has fallback logic for orders without recipients

## Expected Result

After deploying this fix, **all new orders from mobile** will:
1. ✅ Create proper recipient records
2. ✅ Link recipient_id to orders
3. ✅ Display full customer details in seller's orders page
4. ✅ Show complete information in order details modal (as seen in the screenshot)

## Related Code Locations

- **Mobile Checkout:** `mobile-app/src/services/checkoutService.ts` (lines 268-291)
- **Web Checkout:** `web/src/services/checkoutService.ts` (lines 183-192) - Already correct
- **Order Mapper:** `web/src/utils/orders/mappers.ts` (lines 342-380) - mapOrderRowToSellerSnapshot
- **RPC Functions:** `supabase-migrations/004_fix_buyer_orders_view*.sql`
- **Seller Orders Page:** `web/src/pages/SellerOrders.tsx` - Displays buyerName and buyerEmail from snapshot

## Potential Issues & Resolutions

### Issue 1: RPC Function Still Not Updated in Database
**Symptom:** Orders still missing recipient_id even after code deploy
**Solution:** Run the RPC migration:
```bash
# In Supabase dashboard or use supabase CLI:
supabase migration up --use-migrations
```

The fallback direct INSERT will work regardless, but using the RPC is more efficient.

### Issue 2: Old Orders Don't Show Details
**Symptom:** Orders placed before fix still show "Customer"
**Resolution:** This is expected. Only new orders created after the fix will have recipient records. Old orders can be manually updated if needed.

### Issue 3: Recipient Email Shows Empty
**Symptom:** Recipient created but email is empty
**Root Cause:** Email parameter not passed to checkout
**Solution:** Ensure `email` is included in the CheckoutPayload being sent from mobile checkout screen

## Success Criteria

- ✅ New mobile orders have recipient_id filled
- ✅ Seller orders page displays full customer name (not "Customer")
- ✅ Email address visible
- ✅ Complete address information shown
- ✅ Order details modal displays all recipient information
