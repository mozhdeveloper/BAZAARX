# PayMongo Payment State Bug Fix - Integration Guide

## 🎯 Problem Summary

PayMongo orders were being incorrectly persisted as "Cash on Delivery" (COD) in the database and UI, and were landing in the wrong navigation tabs. This caused:
- Database corruption with wrong payment_method values
- Orders appearing in "Pending" tab instead of "Processing" 
- UI showing COD payment info for PayMongo orders
- Incorrect order status flow

## ✅ Solutions Implemented

### 1. **Unified Payment Method Constants** ✨
**File:** [`mobile-app/src/constants/paymentMethods.ts`](mobile-app/src/constants/paymentMethods.ts)

**What it does:**
- Defines standard payment method strings (PAYMONGO, COD, GCASH, etc.)
- Provides user-friendly display labels
- Normalizes payment method from any input format
- Includes helper functions for common checks

**Key Helper Functions:**
```typescript
getPaymentMethodLabel(method)      // Returns display name
normalizePaymentMethod(method)     // Converts to standard format
isCOD(method)                      // Checks if COD
isPayMongo(method)                 // Checks if PayMongo
isOnlinePayment(method)            // Checks if online payment
getInitialOrderStatus(method, isPaid) // Returns correct order status
```

**Usage:**
```typescript
import { PAYMENT_METHODS, normalizePaymentMethod, isCOD } from '../constants/paymentMethods';

const normalized = normalizePaymentMethod(order.paymentMethod);
const isCODOrder = isCOD(order.paymentMethod);
```

---

### 2. **CheckoutService Enhancements** 🔧
**File:** [`mobile-app/src/services/checkoutService.ts`](mobile-app/src/services/checkoutService.ts)

**Changes:**
- Added `isPaid` and `paymentStatus` to `CheckoutPayload` interface
- Payment method normalization on order creation
- Dynamic order status based on payment method:
  - **PayMongo (paid):** `shipment_status = 'processing'`
  - **COD or unpaid:** `shipment_status = 'waiting_for_seller'`
  - **Payment status:** Set to `'paid'` if `isPaid=true`

**Critical Logic:**
```typescript
const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);
const resolvedPaymentStatus = paymentStatus || (isPaid ? 'paid' : 'pending_payment');
const resolvedShipmentStatus = (isPaid && normalizedPaymentMethod === PAYMENT_METHODS.PAYMONGO) 
    ? 'processing' 
    : 'waiting_for_seller';
```

**When to use `isPaid=true`:**
- Only when PayMongo payment is successful AND confirmed
- For saved card flows: Pass `isPaid=true` immediately (payment is atomic)
- For new card flows: Don't pass `isPaid` in initial checkout; set after PaymentGateway confirms

---

### 3. **OrderDetailScreen Payment Display** 📱
**File:** [`mobile-app/app/OrderDetailScreen.tsx`](mobile-app/app/OrderDetailScreen.tsx)

**Improvements:**
- Uses `normalizePaymentMethod()` for consistent extraction
- Uses `getPaymentMethodLabel()` for correct display names
- Uses `isCOD()` helper for COD detection
- **Conditional rendering:** COD info card ONLY shows when `isCOD = true`
  - Automatically hidden for PayMongo, GCash, etc.
  - Respects order status (hidden when order received/returned/cancelled)

**Conditional Logic:**
```typescript
{isCODPayment && !['received', 'returned', 'reviewed', 'cancelled'].includes(order.status) && (
  // Show COD Payment Instruction card
)}
```

---

### 4. **Navigation to Processing Tab** 🗂️
**File:** [`mobile-app/app/OrderConfirmation.tsx`](mobile-app/app/OrderConfirmation.tsx)

**Enhancement:**
- `handleViewPurchases()` now detects payment method
- Routes to correct tab:
  - **PayMongo:** Navigate to `'processing'` tab
  - **COD:** Navigate to `'pending'` tab

**Implementation:**
```typescript
const handleViewPurchases = () => {
  const isPayMongo = normalizePaymentMethod(order?.paymentMethod) === PAYMENT_METHODS.PAYMONGO;
  const initialTab = isPayMongo ? 'processing' : 'pending';
  navigation.navigate('Orders', { initialTab });
};
```

---

### 5. **PaymentGatewayScreen Order Status Update** 💳
**File:** [`mobile-app/app/PaymentGatewayScreen.tsx`](mobile-app/app/PaymentGatewayScreen.tsx)

**Addition:**
- After successful payment, updates order in database:
  - Sets `payment_status = 'paid'`
  - For PayMongo: Sets `shipment_status = 'processing'`
  - Updates `updated_at` timestamp
- Error handling: Logs warnings but doesn't block order

**Update Logic:**
```typescript
const { error: updateError } = await supabase
  .from('orders')
  .update({
    payment_status: 'paid',
    shipment_status: normalized === PAYMENT_METHODS.PAYMONGO ? 'processing' : 'waiting_for_seller',
    updated_at: new Date().toISOString()
  })
  .eq('id', finalOrder.orderId);
```

---

### 6. **CheckoutScreen Payload Enhancement** 🛒
**File:** [`mobile-app/app/CheckoutScreen.tsx`](mobile-app/app/CheckoutScreen.tsx)

**Change:**
- Added `isPaid` flag to checkout payload for saved card PayMongo orders
- When user selects saved PayMongo card: `isPaid = true`
- When user selects new card: `isPaid = false` (set after PaymentGateway confirms)

```typescript
isPaid: paymentMethod === 'paymongo' && selectedPaymentMethodId ? true : false,
```

---

## 🔄 End-to-End Flow

### Scenario A: PayMongo with Saved Card ✨
```
1. User selects saved PayMongo card
2. CheckoutScreen calls processCheckout(payload) with isPaid=true
3. Order created with:
   - payment_method: { type: 'paymongo' }
   - payment_status: 'paid'
   - shipment_status: 'processing'
4. Order skips PaymentGateway (no new card details needed)
5. Navigates directly to OrderConfirmation
6. handleViewPurchases() routes to 'processing' tab
7. OrderDetailScreen shows "Payment Method: PayMongo"
8. ✅ Order appears in My Orders → Processing tab
```

### Scenario B: PayMongo with New Card 🆕
```
1. User enters new card details in CheckoutScreen
2. CheckoutScreen calls processCheckout(payload) with isPaid=false
3. Order created with:
   - payment_method: { type: 'paymongo' }
   - payment_status: 'pending_payment'
   - shipment_status: 'waiting_for_seller'
4. User navigated to PaymentGatewayScreen
5. PaymentGatewayScreen processes card payment
6. If SUCCESS:
   - Updates order: payment_status='paid', shipment_status='processing'
   - Navigates to OrderConfirmation
   - handleViewPurchases() routes to 'processing' tab
   - ✅ Order appears in My Orders → Processing tab
7. If FAILURE:
   - Shows error message
   - User can go back and retry
   - Order remains with payment_status='pending_payment'
   - ✅ Order appears in My Orders → Pending tab (for retry)
```

### Scenario C: Cash on Delivery (COD) 💰
```
1. User selects COD
2. CheckoutScreen calls processCheckout(payload) with isPaid=false (default)
3. Order created with:
   - payment_method: { type: 'cod' }
   - payment_status: 'pending_payment'
   - shipment_status: 'waiting_for_seller'
4. Order skips PaymentGatewayScreen (no payment needed)
5. Navigates to OrderConfirmation
6. handleViewPurchases() routes to 'pending' tab
7. OrderDetailScreen shows:
   - "Payment Method: Cash on Delivery"
   - ✅ COD payment instruction card visible
8. ✅ Order appears in My Orders → Pending tab (awaiting seller confirmation)
```

---

## 🧪 Testing Checklist

### Unit Tests for Constants
```typescript
// Test normalizePaymentMethod
expect(normalizePaymentMethod('PayMongo')).toBe('paymongo');
expect(normalizePaymentMethod({ type: 'PAYMONGO' })).toBe('paymongo');
expect(normalizePaymentMethod('cod')).toBe('cod');

// Test helpers
expect(isCOD('cod')).toBe(true);
expect(isCOD('paymongo')).toBe(false);
expect(getPaymentMethodLabel('paymongo')).toBe('PayMongo');
```

### Integration Tests

#### PayMongo Saved Card Flow
- [ ] User adds saved card in Payment Methods
- [ ] Select saved card on checkout → Order created with `isPaid=true`
- [ ] Verify in database: `payment_status = 'paid'`, `shipment_status = 'processing'`
- [ ] Navigate to Orders → Processing tab shows order
- [ ] Order Detail shows "Payment Method: PayMongo"
- [ ] No COD info card visible

#### PayMongo New Card Flow  
- [ ] Enter new card details on checkout
- [ ] Navigate to PaymentGatewayScreen
- [ ] Use test card for success
- [ ] Verify in database: order updated to `payment_status = 'paid'`
- [ ] Navigate to Orders → Processing tab shows order
- [ ] Order Detail shows "Payment Method: PayMongo"

#### PayMongo Payment Failure
- [ ] Use test card for failure scenario
- [ ] Payment fails → See error message
- [ ] Go back → Order remains in database
- [ ] Navigate to Orders → Pending tab (for retry)

#### COD Flow
- [ ] Select COD at checkout
- [ ] Order created with `payment_status = 'pending_payment'`
- [ ] Navigate to Orders → Pending tab shows order
- [ ] Order Detail shows:
  - "Payment Method: Cash on Delivery"
  - COD instruction card with payment deadline
  - No card/payment processing UI

---

## 🔍 Verification Queries

Run these Supabase queries to verify correct order creation:

### Check PayMongo Order (Saved Card - should be processing)
```sql
SELECT 
  id, 
  order_number, 
  payment_method, 
  payment_status, 
  shipment_status,
  created_at
FROM orders
WHERE 
  payment_method::text LIKE '%paymongo%'
  AND payment_status = 'paid'
  AND shipment_status = 'processing'
ORDER BY created_at DESC
LIMIT 5;
```

### Check COD Order (should be pending_payment/waiting_for_seller)
```sql
SELECT 
  id, 
  order_number, 
  payment_method, 
  payment_status, 
  shipment_status,
  created_at
FROM orders
WHERE 
  payment_method::text LIKE '%cod%'
  AND payment_status = 'pending_payment'
  AND shipment_status = 'waiting_for_seller'
ORDER BY created_at DESC
LIMIT 5;
```

### Check for Mixed-Up Orders (should return empty)
```sql
-- Orders with PayMongo but COD status (BUG - should not exist)
SELECT * FROM orders
WHERE (payment_method::text LIKE '%paymongo%' OR payment_method::text LIKE '%card%')
AND (payment_method::text LIKE '%cod%' OR payment_status = 'pending_payment')
LIMIT 10;
```

---

## 📋 Deployment Checklist

- [ ] Deploy `paymentMethods.ts` constants file
- [ ] Deploy updated `checkoutService.ts` with isPaid support
- [ ] Deploy updated `OrderDetailScreen.tsx` with conditional rendering
- [ ] Deploy updated `CheckoutScreen.tsx` with isPaid in payload
- [ ] Deploy updated `PaymentGatewayScreen.tsx` with order status update
- [ ] Deploy updated `OrderConfirmation.tsx` with tab routing
- [ ] Run verification queries to check existing orders
- [ ] Test all payment flows in staging
- [ ] Monitor order creation logs for payment_method values
- [ ] Verify tab distribution in My Orders (Processing vs Pending)

---

## 📝 Notes for Future Maintenance

1. **Always use constants** from `paymentMethods.ts` instead of hardcoded strings
2. **Test both paths:** Saved cards AND new cards for PayMongo
3. **Database consistency:** Verify `payment_status` and `shipment_status` are aligned with payment method
4. **UI consistency:** OrderDetailScreen automatically hides COD info for non-COD orders
5. **Navigation logic:** Payment method determines which tab orders route to
6. **Error handling:** Payment failures keep orders in pending state for retry, not deleted

---

## 🚀 Quick Start Example

```typescript
// Import the constants
import { 
  PAYMENT_METHODS, 
  normalizePaymentMethod, 
  isCOD,
  getPaymentMethodLabel,
  getInitialOrderStatus 
} from '../constants/paymentMethods';

// In CheckoutScreen
const payload = {
  // ... other fields
  paymentMethod: 'paymongo',
  isPaid: selectedPaymentMethodId ? true : false, // true only if saved card
};

// In OrderDetailScreen
const normalized = normalizePaymentMethod(order.paymentMethod);
if (isCOD(order.paymentMethod)) {
  // Show COD info
} else {
  // Hide COD info
}

// In OrderConfirmation
const shouldProcessing = !isCOD(order.paymentMethod);
const tab = shouldProcessing ? 'processing' : 'pending';
navigation.navigate('Orders', { initialTab: tab });
```

---

## 🆘 Troubleshooting

### Orders still showing in Pending tab
- Check database: `payment_status` should be `'paid'` for PayMongo
- Check `shipment_status`: should be `'processing'` for paid PayMongo
- Verify `normalizePaymentMethod()` returns lowercase 'paymongo'

### COD info card showing for PayMongo
- Verify `isCOD()` function is being used
- Check `normalizePaymentMethod()` returns correct value
- Confirm order's `payment_method` field contains 'paymongo' (case-insensitive)

### Orders not navigating to correct tab
- Verify `OrderConfirmation.tsx` is using `initialTab` parameter
- Check `Orders` route accepts `initialTab` param
- Confirm tab names match: 'pending' vs 'processing'

### Payment fails but order not deleted
- This is expected behavior (allows retry)
- Order stays in `pending_payment` status
- User can cancel and retry checkout if needed
- For orphaned orders from failures, run cleanup query

