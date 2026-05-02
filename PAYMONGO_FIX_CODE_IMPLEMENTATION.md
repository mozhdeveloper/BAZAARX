# PayMongo Payment Fix - Code Implementation Summary

## Overview
This document provides the exact code implementations for fixing the PayMongo payment state bug. All changes are organized by file and include explanations.

---

## 1️⃣ Payment Method Constants
**File:** `mobile-app/src/constants/paymentMethods.ts` ✨ NEW FILE

```typescript
/**
 * Unified Payment Methods Constants
 * Use these constants throughout the app to avoid typos and ensure consistency
 */

export const PAYMENT_METHODS = {
  COD: 'cod',
  PAYMONGO: 'paymongo',
  GCASH: 'gcash',
  MAYA: 'maya',
  CARD: 'card',
  GRAB_PAY: 'grab_pay',
  BANK_TRANSFER: 'bank_transfer',
} as const;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  [PAYMENT_METHODS.COD]: 'Cash on Delivery',
  [PAYMENT_METHODS.PAYMONGO]: 'PayMongo',
  [PAYMENT_METHODS.GCASH]: 'GCash',
  [PAYMENT_METHODS.MAYA]: 'Maya',
  [PAYMENT_METHODS.CARD]: 'Card',
  [PAYMENT_METHODS.GRAB_PAY]: 'Grab Pay',
  [PAYMENT_METHODS.BANK_TRANSFER]: 'Bank Transfer',
};

// Helper function to normalize any payment method format to lowercase standard
export const normalizePaymentMethod = (method: any): string => {
  if (!method) return PAYMENT_METHODS.COD;
  if (typeof method === 'object' && method.type) {
    return String(method.type).toLowerCase().trim();
  }
  if (typeof method === 'string') {
    return method.toLowerCase().trim();
  }
  return PAYMENT_METHODS.COD;
};

// Check if payment is COD
export const isCOD = (method: any): boolean => {
  return normalizePaymentMethod(method) === PAYMENT_METHODS.COD;
};

// Check if payment is PayMongo
export const isPayMongo = (method: any): boolean => {
  return normalizePaymentMethod(method) === PAYMENT_METHODS.PAYMONGO;
};

// Get user-friendly label
export const getPaymentMethodLabel = (method?: string | null): string => {
  if (!method) return 'Unknown';
  const normalized = normalizePaymentMethod(method);
  return PAYMENT_METHOD_LABELS[normalized] || method;
};

// Determine proper order status based on payment method
export const getInitialOrderStatus = (method: any, isPaid: boolean = false): string => {
  const normalized = normalizePaymentMethod(method);
  return isPaid && normalized !== PAYMENT_METHODS.COD ? 'processing' : 'pending';
};
```

---

## 2️⃣ CheckoutService Updates
**File:** `mobile-app/src/services/checkoutService.ts`

### Change 1: Add Imports
```typescript
import { PAYMENT_METHODS, normalizePaymentMethod, getInitialOrderStatus, getInitialPaymentStatus } from '../constants/paymentMethods';
```

### Change 2: Update CheckoutPayload Interface
```typescript
export interface CheckoutPayload {
    userId: string;
    items: CartItem[];
    totalAmount: number;
    shippingAddress: { /* ... */ };
    paymentMethod: string;
    // ... existing fields ...
    
    // BX-PAYMENT-FIX: Track payment status for proper order status initialization
    isPaid?: boolean;
    paymentStatus?: string;
}
```

### Change 3: Update processCheckout Signature
```typescript
export const processCheckout = async (payload: CheckoutPayload): Promise<CheckoutResult> => {
    const {
        userId,
        items,
        totalAmount,
        shippingAddress,
        paymentMethod,
        usedBazcoins,
        earnedBazcoins,
        shippingFee,
        discount,
        voucherId,
        discountAmount,
        email,
        campaignDiscountTotal,
        campaignDiscounts,
        isPaid = false,              // ← NEW
        paymentStatus               // ← NEW
    } = payload;

    // ... rest of function
};
```

### Change 4: Dynamic Order Status Based on Payment Method
```typescript
// At order creation (around line 355-380):

// BX-PAYMENT-FIX: Determine proper status based on payment method
const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);
const resolvedPaymentStatus = paymentStatus || (isPaid ? 'paid' : 'pending_payment');
const resolvedShipmentStatus = (isPaid && normalizedPaymentMethod === PAYMENT_METHODS.PAYMONGO) 
    ? 'processing' 
    : 'waiting_for_seller';

// When calling RPC or direct insert, use resolved statuses:
const { data: rpcResult, error: rpcError } = await supabase
    .rpc('create_order_safe', {
        p_order_number: orderNumber,
        p_buyer_id: userId,
        p_order_type: 'ONLINE',
        p_address_id: addressData.id,
        p_recipient_id: recipientId,
        p_payment_status: resolvedPaymentStatus,      // ← USE RESOLVED
        p_shipment_status: resolvedShipmentStatus,    // ← USE RESOLVED
        p_notes: `Order from ${shippingAddress.fullName}`
    });

// Or for direct insert:
const { data: insertedOrder, error: orderError } = await supabase
    .from('orders')
    .insert({
        order_number: orderNumber,
        buyer_id: userId,
        order_type: 'ONLINE',
        address_id: addressData.id,
        recipient_id: recipientId,
        payment_status: resolvedPaymentStatus,        // ← USE RESOLVED
        shipment_status: resolvedShipmentStatus,      // ← USE RESOLVED
        payment_method: { type: paymentMethod },
        notes: `Order from ${shippingAddress.fullName}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    })
    .select()
    .single();
```

---

## 3️⃣ CheckoutScreen Updates
**File:** `mobile-app/app/CheckoutScreen.tsx`

### Change: Add isPaid to Checkout Payload

In the `handlePlaceOrder` function, when constructing the payload (around line 1310-1345):

```typescript
// Prepare checkout payload
const payload = {
    userId: user.id,
    items: checkoutItems,
    totalAmount: total,
    shippingAddress: {
        fullName: `${selectedAddress.firstName} ${selectedAddress.lastName}`,
        street: selectedAddress.street,
        barangay: selectedAddress.barangay,
        city: selectedAddress.city,
        province: selectedAddress.province,
        region: selectedAddress.region,
        postalCode: selectedAddress.zipCode,
        phone: selectedAddress.phone,
        country: 'Philippines'
    },
    paymentMethod,
    usedBazcoins: bazcoinDiscount,
    earnedBazcoins,
    shippingFee,
    discount,
    voucherId: appliedVoucher?.id || null,
    discountAmount: discount,
    email: user.email,
    campaignDiscountTotal,
    campaignDiscounts: checkoutItems
        .filter(item => item.campaignDiscount)
        .map(item => ({
            campaignId: item.campaignDiscount?.campaignId,
            campaignName: item.campaignDiscount?.campaignName || 'Discount',
            discountAmount: ((item.originalPrice ?? item.price ?? 0) - (item.price ?? 0)) * item.quantity,
            productId: item.id,
            quantity: item.quantity
        })),
    shippingBreakdown: shippingResults.map(r => {
        const methodKey = selectedMethods[r.sellerId];
        const method = r.methods.find(m => m.method === methodKey) || r.defaultMethod;
        return {
            sellerId: r.sellerId,
            sellerName: r.sellerName,
            method: method?.method ?? 'standard',
            methodLabel: method?.label ?? 'Standard',
            fee: method?.fee ?? 0,
            breakdown: method?.breakdown ?? { baseRate: 0, weightSurcharge: 0, valuationFee: 0, odzFee: 0 },
            estimatedDays: method?.estimatedDays ?? 'N/A',
            originZone: r.originZone,
            destinationZone: r.destinationZone,
        };
    }),
    // BX-PAYMENT-FIX: Track if this is a paid PayMongo order
    isPaid: paymentMethod === 'paymongo' && selectedPaymentMethodId ? true : false,
    // Include saved PayMongo card ID if user selected one
    ...(paymentMethod === 'paymongo' && selectedPaymentMethodId ? { savedPaymentMethodId: selectedPaymentMethodId } : {}),
};
```

---

## 4️⃣ OrderDetailScreen Updates
**File:** `mobile-app/app/OrderDetailScreen.tsx`

### Change 1: Add Import
```typescript
import { isCOD, normalizePaymentMethod, getPaymentMethodLabel } from '../src/constants/paymentMethods';
```

### Change 2: Replace Payment Method Display Logic

Replace the entire payment method section (around line 960-1000) with:

```typescript
<View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 16, gap: 12 }}>
   {/* Payment Method - with proper extraction and label mapping */}
   {(() => {
     const rawPaymentMethod = order.paymentMethod;
     const normalized = normalizePaymentMethod(rawPaymentMethod);
     const displayLabel = getPaymentMethodLabel(rawPaymentMethod);
     const isCODPayment = isCOD(rawPaymentMethod);
     
     console.log('[OrderDetail] Payment Info:', {
       raw: rawPaymentMethod,
       normalized,
       displayLabel,
       isCOD: isCODPayment
     });
     
     return (
       <>
         <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
           <Text style={styles.metaLabel}>Payment Method</Text>
           <Text style={styles.primaryInfo}>{displayLabel}</Text>
         </View>
         
         {/* 🔧 BX-PAYMENT-FIX: COD Payment Instruction Message - Only show when COD AND not yet received/returned/reviewed/cancelled */}
         {isCODPayment && !['received', 'returned', 'reviewed', 'cancelled'].includes(order.buyerUiStatus) && !['received', 'returned', 'reviewed', 'cancelled'].includes(order.status) && (() => {
           const estimatedDelivery = deliveryTracking?.booking?.estimatedDelivery || order.estimatedDelivery;
           const formattedDeadline = formatDatePH(estimatedDelivery);
           
           return (
             <View style={{ backgroundColor: '#FFFBF0', borderLeftWidth: 4, borderLeftColor: '#F59E0B', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, gap: 6, marginTop: 8 }}>
               <Text style={{ fontSize: 12, fontWeight: '700', color: '#92400E' }}>💳 Payment on Delivery</Text>
               <Text style={{ fontSize: 12, color: '#7C2D12', lineHeight: 16 }}>
                 You'll pay the full amount to the delivery driver when they arrive. Please have the exact amount ready.
               </Text>
               {formattedDeadline && (
                 <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '600' }}>
                   Estimated Payment Due: {formattedDeadline}
                 </Text>
               )}
               {!formattedDeadline && (
                 <Text style={{ fontSize: 11, color: '#D97706', fontStyle: 'italic' }}>
                   Delivery date will be updated when J&T booking is confirmed
                 </Text>
               )}
             </View>
           );
         })()}
       </>
     );
   })()}
```

---

## 5️⃣ OrderConfirmation Updates
**File:** `mobile-app/app/OrderConfirmation.tsx`

### Change: Update Navigation Logic

Replace the `handleViewPurchases` function (around line 165-168):

```typescript
const handleViewPurchases = () => {
  // BX-PAYMENT-FIX: Navigate to the correct tab based on payment method
  // PayMongo orders go to 'processing' tab (already paid)
  // COD orders go to 'pending' tab (awaiting seller confirmation)
  const paymentMethod = order?.paymentMethod;
  const isPayMongo = paymentMethod && 
    (typeof paymentMethod === 'string' ? paymentMethod.toLowerCase() : paymentMethod?.type?.toLowerCase()) === 'paymongo';
  
  const initialTab = isPayMongo ? 'processing' : 'pending';
  navigation.navigate('Orders', { initialTab });
};
```

---

## 6️⃣ PaymentGatewayScreen Updates
**File:** `mobile-app/app/PaymentGatewayScreen.tsx`

### Change 1: Add Imports
```typescript
import { supabase } from '../src/lib/supabase';
import { PAYMENT_METHODS, normalizePaymentMethod } from '../src/constants/paymentMethods';
```

### Change 2: Update Order Status After Successful Payment

In the `onPaymentApproved` function (around line 330-360), add this code after `finalOrder.isPaid = true;`:

```typescript
// 🔧 BX-PAYMENT-FIX: Update order status in database after successful payment
// For PayMongo orders, set payment_status to 'paid' so they appear in Processing tab
// For other online payments, also mark as paid and processing
if (finalOrder.orderId) {
  const paymentMethod = finalOrder.paymentMethod;
  const normalized = normalizePaymentMethod(paymentMethod);
  
  try {
    // Update the order in database with new payment and shipment status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        shipment_status: normalized === PAYMENT_METHODS.PAYMONGO ? 'processing' : 'waiting_for_seller',
        updated_at: new Date().toISOString()
      })
      .eq('id', finalOrder.orderId);
    
    if (updateError) {
      console.error('[PaymentGateway] ⚠️ Failed to update order status after payment:', updateError);
      // Don't throw - payment succeeded, just log the warning
    } else {
      console.log('[PaymentGateway] ✅ Order status updated to paid:', finalOrder.orderId);
    }
  } catch (err) {
    console.error('[PaymentGateway] Error updating order status:', err);
    // Don't throw - payment succeeded, this is a secondary update
  }
}
```

---

## Testing the Implementation

### Quick Test: Saved Card PayMongo
```
1. Go to Checkout
2. Select a saved PayMongo card
3. Place order
4. Verify in database: payment_status = 'paid', shipment_status = 'processing'
5. Navigate to My Orders → Processing tab
6. Order should appear ✅
```

### Quick Test: New Card PayMongo  
```
1. Go to Checkout
2. Select new card
3. Enter PayMongo test card (4343 4343 4343 4345)
4. Complete payment
5. Verify in database: payment_status should be updated to 'paid'
6. Navigate to My Orders → Processing tab
7. Order should appear ✅
```

### Quick Test: COD
```
1. Go to Checkout
2. Select COD
3. Place order
4. Navigate to My Orders → Pending tab
5. Order should appear ✅
6. Open order details
7. Should see "Cash on Delivery" with payment instructions ✅
```

---

## Verification Commands

```bash
# Check PayMongo orders are in processing
supabase query "SELECT COUNT(*) FROM orders WHERE payment_method::text LIKE '%paymongo%' AND payment_status = 'paid' AND shipment_status = 'processing'"

# Check COD orders are in pending
supabase query "SELECT COUNT(*) FROM orders WHERE payment_method::text LIKE '%cod%' AND payment_status = 'pending_payment' AND shipment_status = 'waiting_for_seller'"

# Check for mixed-up orders (should be 0)
supabase query "SELECT COUNT(*) FROM orders WHERE (payment_method::text LIKE '%paymongo%') AND (payment_status = 'pending_payment' AND shipment_status = 'waiting_for_seller')"
```

