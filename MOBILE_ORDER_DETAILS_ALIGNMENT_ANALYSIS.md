# Mobile Order Details Page Alignment Issue - Analysis Report

## Executive Summary
The Order Details Page (Item & Payment section) on mobile is displaying **incomplete** payment method and shipping information that doesn't match what was selected in the Checkout page.

---

## ISSUE 1: Payment Method Display Mismatch

### Where Payment Method is Set (Checkout)
**File**: [app/CheckoutScreen.tsx](app/CheckoutScreen.tsx#L249)
- Line 249: `const [paymentMethod, setPaymentMethod] = useState<'cod' | 'gcash' | 'card' | 'paymongo' | null>('cod')`
- Stored as simple string values: `'cod'`, `'gcash'`, `'card'`, `'paymongo'`

### How Payment Method is Stored in Database
**File**: [src/services/checkoutService.ts](src/services/checkoutService.ts#L613)
- Line 613: Creates `order_payments` record with: `payment_method: { type: paymentMethod }`
- Stores as JSON object: `{ type: 'cod' | 'gcash' | 'card' | 'paymongo' }`
- This same value (`paymentMethod` string) is sent in the email template

**Database Structure**:
```
order_payments table:
  - payment_method: JSON field with { type: 'cod'|'gcash'|'card'|'paymongo' }
```

### How It's Correctly Displayed in Orders List
**File**: [app/OrdersScreen.tsx](app/OrdersScreen.tsx#L469-L479)
```typescript
paymentMethod: typeof order.payment_method === 'string'
  ? order.payment_method
  : ((order.payment_method as any)?.type === 'cod'
    ? 'Cash on Delivery'
    : (order.payment_method as any)?.type === 'gcash'
      ? 'GCash'
      : (order.payment_method as any)?.type === 'card'
        ? 'Card'
        : (order.payment_method as any)?.type === 'paymongo'
          ? 'PayMongo'
          : (order.payment_method as any)?.type || 'Cash on Delivery'),
```

**OrdersScreen** has the logic to:
1. Check if `order.payment_method` is a string or JSON object
2. Extract the `type` field if it's an object
3. Map type code to display label:
   - 'cod' → 'Cash on Delivery'
   - 'gcash' → 'GCash'
   - 'card' → 'Card'
   - 'paymongo' → 'PayMongo'

### The Problem in Order Details
**File**: [app/OrderDetailScreen.tsx](app/OrderDetailScreen.tsx#L804)
```typescript
<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
  <Text style={styles.metaLabel}>Payment Method</Text>
  <Text style={styles.primaryInfo}>{order.paymentMethod}</Text>  // ❌ NO EXTRACTION LOGIC
</View>
```

**Issues**:
- ❌ Displays `order.paymentMethod` directly WITHOUT extraction logic
- ❌ If `order.paymentMethod` is undefined or empty, shows nothing
- ❌ If it's a JSON object `{ type: 'cod' }`, displays "[object Object]"
- ❌ Doesn't match what OrdersScreen displays

**Why This Happens**:
- OrdersScreen constructs a formatted order object with `paymentMethod` as display value
- OrderDetailScreen receives the order from route params but doesn't have the same extraction logic
- Order object passed from OrdersScreen should have formatted payment method, but if order is loaded fresh, the raw data from database would have the JSON object format

---

## ISSUE 2: Shipping Information Mismatch

### Where Shipping is Selected (Checkout)
**File**: [app/CheckoutScreen.tsx](app/CheckoutScreen.tsx#L2050-2095) (approx lines where shipping breakdown is set)

The checkout has:
- **Per-seller shipping calculation**: `shippingResults` array with one entry per seller
- **Shipping method selection**: `selectedMethods` - maps seller ID to chosen method

### How Shipping is Stored
**File**: [src/services/checkoutService.ts](src/services/checkoutService.ts#L411-L432)

**Per-Seller Shipment Records Created**:
```typescript
// BX-09-002 — Persist per-seller shipment record
if (payload.shippingBreakdown && payload.shippingBreakdown.length > 0) {
  for each seller's breakdown:
    supabase
      .from('order_shipments')
      .insert({
        order_id: orderData.id,
        seller_id: sellerId,
        shipping_method: sellerBreakdown.method,        // 'standard'|'economy'|'same_day'
        shipping_method_label: sellerBreakdown.methodLabel,  // 'Standard Delivery'|'Economy'|'Same Day'
        calculated_fee: sellerBreakdown.fee,            // e.g., 150
        fee_breakdown: sellerBreakdown.breakdown,        // { baseRate, weightSurcharge, valuationFee, odzFee }
        origin_zone: sellerBreakdown.originZone,        // 'NCR', 'Luzon', etc.
        destination_zone: sellerBreakdown.destinationZone,
        estimated_days_text: sellerBreakdown.estimatedDays,  // 'Next day delivery'|'3-5 days'
        tracking_number: null,
        status: 'pending',
      })
}
```

**Database Structure**:
```
order_shipments table (NEW - BX-09-002):
  - order_id (FK to orders)
  - seller_id (FK to sellers)
  - shipping_method: 'standard'|'economy'|'same_day'|'bulky'
  - shipping_method_label: Display label
  - calculated_fee: Amount in pesos
  - fee_breakdown: JSON with { baseRate, weightSurcharge, valuationFee, odzFee }
  - origin_zone: Seller's zone
  - destination_zone: Buyer's zone
  - estimated_days_text: Display text like "3-5 business days"
  - tracking_number: Assigned when shipped
  - status: 'pending' initially, then 'shipped', 'delivered', etc.
```

### How Order Details Displays Shipping
**File**: [app/OrderDetailScreen.tsx](app/OrderDetailScreen.tsx#L73-L80) - Fetching shipment data

```typescript
// BX-09-003 — Fetch shipment record
(async () => {
  try {
    const { data } = await supabase
      .from('order_shipments')
      .select('shipping_method_label, calculated_fee, estimated_days_text, origin_zone, destination_zone, tracking_number, status')
      .eq('order_id', realOrderId)
      .maybeSingle();  // ❌ ONLY fetches ONE record (maybeSingle)
    if (data) setShipmentInfo(data as any);
  } catch (err) {
    // Silently ignore shipment fetch errors
  }
})();
```

**Display in UI** - Line 804-820:
```typescript
<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
  <Text style={styles.metaLabel}>Payment Method</Text>
  <Text style={styles.primaryInfo}>{order.paymentMethod}</Text>
</View>

<View style={styles.summaryRow}>
  <Text style={styles.summaryLabel}>Subtotal</Text>
  <Text style={styles.summaryValue}>₱{(order as any).subtotal?.toLocaleString()}</Text>
</View>
<View style={styles.summaryRow}>
  <Text style={styles.summaryLabel}>Shipping</Text>
  <Text style={styles.summaryValue}>{order.shippingFee === 0 ? 'FREE' : `₱${order.shippingFee.toLocaleString()}`}</Text>
</View>
```

**Issues**:
- ❌ Fetches shipment data using `.maybeSingle()` - only gets FIRST record
- ❌ For multi-seller orders, only shows shipment info for ONE seller
- ❌ Displays `order.shippingFee` (single value) instead of per-seller breakdown
- ❌ Doesn't show:
  - Individual seller's shipping method name (e.g., "Same Day Delivery" vs "Standard")
  - Individual seller's calculated fee
  - Estimated days per seller
  - Shipping zones information
- ❌ If multiple sellers have different shipping methods, this is hidden
- ❌ Doesn't match what buyer selected during checkout

---

## Data Flow Comparison

### Checkout → What Buyer Selects
```
Checkout Screen:
├─ Seller A → Standard Delivery (₱100, 3-5 days)
├─ Seller B → Same Day Delivery (₱250, Next day)
└─ Seller C → Economy (₱50, 5-7 days)
Total Shipping: ₱400
Payment Method: 'card' (PayMongo saved card)
```

### Database → What's Stored
```
orders table:
├─ order_id: xxx
├─ payment_status: 'pending_payment'
└─ shipment_status: 'waiting_for_seller'

order_payments table:
└─ payment_method: { type: 'paymongo' }

order_shipments table: (3 records - one per seller)
├─ Record 1: seller_id=A, shipping_method='standard', calculated_fee=100, estimated_days_text='3-5 days'
├─ Record 2: seller_id=B, shipping_method='same_day', calculated_fee=250, estimated_days_text='Next day'
└─ Record 3: seller_id=C, shipping_method='economy', calculated_fee=50, estimated_days_text='5-7 days'
```

### Order Details Display → What Buyer Sees ❌
```
Order Details Screen:
├─ Payment Method: [undefined|[object Object]|'cod'] ❌ WRONG
├─ Shipping: ₱400 (displays total but no per-seller breakdown) ❌ INCOMPLETE
└─ No shipping method names (Standard vs Same Day vs Economy) ❌ MISSING
```

---

## Root Causes

### Payment Method Issue
1. **Inconsistent extraction logic**: OrdersScreen has extraction code, OrderDetailScreen doesn't
2. **Data format mismatch**: Database stores `{ type: 'cod' }` but OrderDetailScreen expects simple string
3. **Missing mapping**: No mapping from type code to human-readable label in OrderDetailScreen

### Shipping Information Issue
1. **Single record fetch**: Using `.maybeSingle()` only fetches first `order_shipments` record
2. **Missing per-seller breakdown**: UI only shows total `order.shippingFee`, not individual fees
3. **Hidden shipping method names**: Only shows fee, not method label (Standard/Same Day/Economy)
4. **No estimated delivery times**: Not displaying estimated_days_text per seller
5. **Zone information unused**: Fetches zone data but doesn't display it

---

## Impact on User Experience

### For Buyer
- ❌ Can't verify payment method used for the order
- ❌ Can't see which shipping method was selected per seller
- ❌ Can't see estimated delivery times
- ❌ Sees only total shipping fee, not breakdown by seller
- ❌ No visibility into shipping origin/destination zones
- ❌ Confusing when multiple sellers with different shipping methods

### For Support
- ❌ Hard to troubleshoot payment method issues
- ❌ Can't verify if buyer received what they selected
- ❌ No clarity on shipping expectations

---

## Files Involved

### Checkout (Selection)
- [app/CheckoutScreen.tsx](app/CheckoutScreen.tsx) - Lines 249, 442, 2050-2095
- [src/services/checkoutService.ts](src/services/checkoutService.ts) - Lines 23, 99, 411-432, 613

### Order Details (Display)
- [app/OrderDetailScreen.tsx](app/OrderDetailScreen.tsx) - Lines 73-80, 804-820
- [app/OrdersScreen.tsx](app/OrdersScreen.tsx) - Lines 469-479 (HAS CORRECT LOGIC)

### Data Services
- [src/services/orders/orderReadService.ts](src/services/orders/orderReadService.ts)
- [src/services/orderService.ts](src/services/orderService.ts)

### Database Tables
- `orders` - Main order record
- `order_payments` - Payment method stored as `{ type: 'cod'|'gcash'|'card'|'paymongo' }`
- `order_shipments` - Per-seller shipping records (NEW - BX-09-002)

---

## Summary of Misalignment

| Aspect | Checkout Selection | Database Storage | Order Details Display | Status |
|--------|-------------------|------------------|----------------------|--------|
| Payment Method | `'card'` string | `{ type: 'card' }` JSON object | `{order.paymentMethod}` | ❌ NO MAPPING |
| Shipping Method | Per-seller (Standard/Same Day/Economy) | Per-seller in `order_shipments` | Not displayed | ❌ MISSING |
| Shipping Fee | Per-seller breakdown | Multiple `order_shipments` records | Single `order.shippingFee` | ❌ INCOMPLETE |
| Estimated Days | Per-seller in checkout | `estimated_days_text` in `order_shipments` | Not displayed | ❌ MISSING |
| Seller Info | Shown during selection | Available in `order_shipments` | Not linked | ❌ MISSING |

---

## Recommended Fixes (Not Implemented - Analysis Only)

### Fix 1: Payment Method
- Add extraction logic to OrderDetailScreen similar to OrdersScreen (lines 469-479)
- Map `{ type: 'cod' }` to display labels before rendering

### Fix 2: Shipping Information
- Change `.maybeSingle()` to `.select()` to fetch ALL seller shipment records
- Display per-seller shipping breakdown in UI
- Show shipping method names (Standard, Same Day, Economy)
- Show estimated delivery times per seller
- Create expandable/collapsible per-seller shipping section

### Fix 3: Data Consistency
- Ensure order object from OrdersScreen has same format as when fetched fresh
- Consider caching transformed order object to avoid re-transformation
