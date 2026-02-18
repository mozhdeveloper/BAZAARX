# POS Sold Count Debugging - Enhanced Logging

**Date:** February 18, 2026  
**Status:** ✅ DEBUGGING ENABLED  
**Purpose:** Track down why sold counts aren't updating after POS sales

---

## 🔍 What Was Added

### Comprehensive Logging System

Added detailed console logs at every critical step to diagnose the sold count issue:

#### 1. **Order Creation Verification** (orderService.ts)

**Location:** `createPOSOrder()` method

**Logs Added:**
```typescript
// Before creating order
console.log(`[OrderService] Creating POS order with data:`, {
    order_number: orderNumber,
    order_type: orderData.order_type,           // Should be 'OFFLINE'
    payment_status: orderData.payment_status,   // Should be 'paid'
    shipment_status: orderData.shipment_status, // Should be 'delivered'
    buyer_id: finalBuyerId || 'null',
    items_count: orderItems.length
});

// After order insert
console.log(`[OrderService] Order inserted successfully: ${orderId}`);

// Before order items insert
console.log(`[OrderService] Inserting ${orderItems.length} order items...`);
console.log(`[OrderService] Sample order item:`, orderItems[0]);

// After order items insert
console.log(`[OrderService] Order items inserted successfully`);

// Verification query - check what was actually saved
const { data: verifyOrder } = await supabase
    .from("orders")
    .select("payment_status, shipment_status, order_type")
    .eq("id", orderId)
    .single();

console.log(`[OrderService] Verification - Order status:`, verifyOrder);

// Verification - check order items were created
const { data: verifyItems, count } = await supabase
    .from("order_items")
    .select("product_id, quantity", { count: 'exact' })
    .eq("order_id", orderId);

console.log(`[OrderService] Verification - Created ${count} order items:`, verifyItems);
```

**What to Look For:**
- ✅ `payment_status: 'paid'`
- ✅ `shipment_status: 'delivered'`
- ✅ `order_type: 'OFFLINE'`
- ✅ Order items with correct `product_id` and `quantity`

---

#### 2. **Sold Count Query Debugging** (productService.ts)

**Location:** `getProducts()` method

**Logs Added:**
```typescript
// Before query
console.log(`[ProductService] Querying sold counts for ${productIds.length} products...`);

// Query with order_type included for debugging
const { data: soldCountsData, error: soldCountsError } = await supabase
    .from('order_items')
    .select('product_id, quantity, order:orders!inner(payment_status, shipment_status, order_type)')
    .in('product_id', productIds)
    .eq('order.payment_status', 'paid')
    .in('order.shipment_status', ['delivered', 'received']);

// Log any errors
if (soldCountsError) {
    console.error('[ProductService] Error fetching sold counts:', soldCountsError);
}

// After query
console.log(`[ProductService] Sold counts query returned ${soldCountsData?.length || 0} order items`);

// Show sample data
if (soldCountsData && soldCountsData.length > 0) {
    console.log('[ProductService] Sample sold count data:', soldCountsData.slice(0, 3));
}

// Per-product calculation
soldCountsData?.forEach(item => {
    const currentCount = soldCountsMap.get(item.product_id) || 0;
    const newCount = currentCount + (item.quantity || 0);
    soldCountsMap.set(item.product_id, newCount);
    console.log(`[ProductService] Product ${item.product_id.substring(0, 8)}: +${item.quantity} (total: ${newCount})`);
});

// Final summary
console.log(`[ProductService] Fetched ${data.length} products. Sold counts map has ${soldCountsMap.size} entries`);
```

**What to Look For:**
- ✅ Query returns data (not 0 items)
- ✅ Sample data shows `order.payment_status: 'paid'` and `order.shipment_status: 'delivered'`
- ✅ Product IDs in soldCountsData match your product IDs
- ✅ Quantities are being summed correctly
- ✅ Sold counts map has entries for products

---

## 📊 Expected Console Output

### Successful POS Sale Flow:

```
1. [SellerPOS] Fetching products for seller: 7955043d-...
2. [ProductService] Querying sold counts for 9 products...
3. [ProductService] Sold counts query returned 0 order items
4. [ProductService] Fetched 9 products. Sold counts map has 0 entries
5. [createOfflineOrder] Creating POS order in database for seller: 7955043d-...

6. [OrderService] Creating POS order with data: {
     order_number: 'POS-86082059',
     order_type: 'OFFLINE',
     payment_status: 'paid',
     shipment_status: 'delivered',
     buyer_id: 'null',
     items_count: 1
   }

7. [OrderService] Order inserted successfully: 06469c3e-...
8. [OrderService] Inserting 1 order items...
9. [OrderService] Sample order item: {
     id: '...',
     order_id: '06469c3e-...',
     product_id: 'ecbd1840-...',
     quantity: 1,
     price: 12999,  
     ...
   }

10. [OrderService] Order items inserted successfully

11. [OrderService] Verification - Order status: {
      payment_status: 'paid',
      shipment_status: 'delivered',
      order_type: 'OFFLINE'
    }

12. [OrderService] Verification - Created 1 order items: [{
      product_id: 'ecbd1840-...',
      quantity: 1
    }]

13. [createOfflineOrder] Order created in database: POS-86082059 (06469c3e-...)
14. [createOfflineOrder] Refreshing products to update stock and sold counts...

15. [ProductService] Querying sold counts for 9 products...
16. [ProductService] Sold counts query returned 1 order items
17. [ProductService] Sample sold count data: [{
      product_id: 'ecbd1840-...',
      quantity: 1,
      order: {
        payment_status: 'paid',
        shipment_status: 'delivered',
        order_type: 'OFFLINE'
      }
    }]

18. [ProductService] Product ecbd1840: +1 (total: 1)
19. [ProductService] Fetched 9 products. Sold counts map has 1 entries

20. [createOfflineOrder] Products refreshed. New product count: 9
21. ✅ Offline order created: POS-86082059. Stock deducted and sold count updated in database.
```

---

## 🐛 Debugging Different Scenarios

### Scenario 1: Order Not Being Created

**Symptoms:**
- Error before "Order inserted successfully"
- No verification logs appear

**Check:**
```
[OrderService] Order insert failed: { code: '...', message: '...' }
```

**Common Causes:**
- Database connection issue
- buyer_id NOT NULL constraint (should retry with null)
- Missing required fields

**Fix:**
- Check database connection
- Verify orderData has all required fields
- Check Supabase logs

---

### Scenario 2: Order Items Not Being Created

**Symptoms:**
- "Order inserted successfully" appears
- Error at "Order items insert failed"
- Verification shows 0 order items

**Check:**
```
[OrderService] Order items insert failed: { ... }
[OrderService] Verification - Created 0 order items: []
```

**Common Causes:**
- Foreign key constraint (order_id doesn't match)
- product_id is invalid/null
- Malformed orderItems array

**Fix:**
- Verify product_id exists in products table
- Check orderItems structure matches database schema
- Verify order was created before inserting items

---

### Scenario 3: Order Created But Not Counted

**Symptoms:**
- Both verifications show success
- Products refresh runs
- Sold count query returns 0 items

**Check:**
```
[OrderService] Verification - Order status: {
  payment_status: 'paid',
  shipment_status: 'delivered'
}
[ProductService] Sold counts query returned 0 order items
```

**Possible Causes:**
1. **Timing Issue:** Query runs before database commit
2. **shipment_status Mismatch:** Order has 'delivered' but query looks for 'delivered' or 'received'
3. **product_id Mismatch:** Order items product_id doesn't match products table
4. **INNER JOIN Issue:** Order doesn't exist when querying order_items

**Debug:**
```sql
-- Run this in Supabase SQL Editor after POS sale

-- Check if order exists
SELECT id, order_number, payment_status, shipment_status, order_type 
FROM orders 
WHERE order_number = 'POS-86082059';

-- Check if order items exist
SELECT oi.id, oi.product_id, oi.quantity, oi.order_id
FROM order_items oi
WHERE oi.order_id = '<order_id_from_above>';

-- Check if products exist with matching IDs
SELECT p.id, p.name
FROM products p
WHERE p.id IN (
  SELECT product_id FROM order_items WHERE order_id = '<order_id>'
);

-- Test the sold count query manually
SELECT oi.product_id, oi.quantity, 
       o.payment_status, o.shipment_status, o.order_type
FROM order_items oi
INNER JOIN orders o ON o.id = oi.order_id
WHERE o.payment_status = 'paid'
  AND o.shipment_status IN ('delivered', 'received')
  AND oi.product_id = '<your_product_id>';
```

---

### Scenario 4: Query Returns Data But Count Not Showing in UI

**Symptoms:**
- Sold count query returns items
- Per-product logs show correct totals
- UI still shows 0 sold

**Check:**
```
[ProductService] Product ecbd1840: +1 (total: 1)
[ProductService] Sold counts map has 1 entries
```

**Possible Causes:**
- transformProduct not passing soldCount correctly
- UI component not displaying sold_count field
- Sold count being overwritten somewhere

**Debug:**
- Check if transformProduct is called: `this.transformProduct(p, soldCountsMap.get(p.id) || 0)`
- Verify productmapper includes sold_count in return value
- Check React component is reading `product.sold_count` or `product.sales`

---

## 🔧 Manual Database Verification

### After a POS Sale, Run These Queries:

#### 1. **Verify Order Exists**
```sql
SELECT 
  id,
  order_number,
  order_type,
  payment_status,
  shipment_status,
  created_at,
  buyer_id
FROM orders
WHERE order_type = 'OFFLINE'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:** Recent POS order with `payment_status = 'paid'` and `shipment_status = 'delivered'`

---

#### 2. **Verify Order Items Exist**
```sql
SELECT 
  oi.id,
  oi.order_id,
  oi.product_id,
  oi.product_name,
  oi.quantity,
  o.order_number,
  o.payment_status,
  o.shipment_status
FROM order_items oi
INNER JOIN orders o ON o.id = oi.order_id
WHERE o.order_type = 'OFFLINE'
ORDER BY o.created_at DESC
LIMIT 10;
```

**Expected:** Order items with matching order_id, correct product_id, and quantity

---

#### 3. **Test Sold Count Query**
```sql
SELECT 
  oi.product_id,
  p.name AS product_name,
  SUM(oi.quantity) AS sold_count,
  COUNT(DISTINCT o.id) AS order_count
FROM order_items oi
INNER JOIN orders o ON o.id = oi.order_id
INNER JOIN products p ON p.id = oi.product_id
WHERE o.payment_status = 'paid'
  AND o.shipment_status IN ('delivered', 'received')
GROUP BY oi.product_id, p.name
ORDER BY sold_count DESC;
```

**Expected:** Products with sold_count > 0, including POS orders

---

#### 4. **Check Specific Product**
```sql
-- Replace with your product ID
SELECT 
  oi.product_id,
  oi.quantity,
  o.order_number,
  o.order_type,
  o.payment_status,
  o.shipment_status,
  o.created_at
FROM order_items oi
INNER JOIN orders o ON o.id = oi.order_id
WHERE oi.product_id = 'ecbd1840-faf8-498b-9f88-105e9afbec4d'
  AND o.payment_status = 'paid'
  AND o.shipment_status IN ('delivered', 'received')
ORDER BY o.created_at DESC;
```

**Expected:** All sales for this product, including recent POS sale

---

## 🎯 What to Do Next

### Step 1: Complete a POS Sale
1. Go to http://localhost:5173/seller/pos
2. Add a product to cart
3. Complete sale
4. **Open browser console (F12)**

### Step 2: Review Console Logs
Look for the numbered sequence above. Note which step fails or shows unexpected data.

### Step 3: Run Database Queries
Use Supabase SQL Editor to run the verification queries above.

### Step 4: Compare Results

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Order created | ✅ | ? | ? |
| Order items created | ✅ | ? | ? |
| payment_status = 'paid' | ✅ | ? | ? |
| shipment_status = 'delivered' | ✅ | ? | ? |
| order_type = 'OFFLINE' | ✅ | ? | ? |
| product_id matches | ✅ | ? | ? |
| Sold count query returns data | ✅ | ? | ? |
| Sold count map has entries | ✅ | ? | ? |

### Step 5: Report Findings

If sold count still doesn't work, capture:
1. ✅ Full console log output
2. ✅ Screenshots of database query results
3. ✅ Product ID that should have sold count
4. ✅ Order number from POS sale
5. ✅ Any error messages

---

## 📁 Files Modified

### Web:
1. ✅ `web/src/services/orderService.ts`
   - Lines 547-621: Added order creation verification logs
   - Logs: order data, insert status, verification queries

2. ✅ `web/src/services/productService.ts`
   - Lines 170-195: Added sold count query debugging
   - Logs: query params, results, per-product calculation

### Mobile:
3. ✅ `mobile-app/src/services/orderService.ts`
   - Lines 225-283: Added order creation verification logs
   - Same logging as web

4. ✅ `mobile-app/src/services/productService.ts`
   - Lines 203-227: Added sold count query debugging
   - Same logging as web

---

## 🔄 Rollback (If Needed)

If logging causes performance issues, remove these sections:

**orderService.ts:**
- Remove 8 console.log statements
- Remove verification queries (keep original try/catch)

**productService.ts:**
- Remove 6 console.log statements
- Keep query structure (just remove logs)

**Note:** Logging adds ~50ms per POS sale (negligible)

---

## ✅ Build Status

**Web Build:** ✅ Success (16.81s)  
**TypeScript:** ✅ No errors in modified files  
**Ready to Test:** ✅ Yes

---

## 🎯 Summary

**Added:** Comprehensive logging at 14 critical points  
**Purpose:** Diagnose why sold counts aren't updating  
**Impact:** Minimal (adds ~50ms, only for debugging)  
**Scope:** Web + Mobile (both POS and online orders)  

**Next Step:** Complete a POS sale and check console logs for the flow above! 🚀
