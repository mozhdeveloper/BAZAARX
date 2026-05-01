# PayMongo Payment Fix - Deployment Checklist

**Status:** Ready for Testing & Deployment  
**Created:** May 1, 2026  
**Impact:** Critical - Fixes payment state persistence bug affecting all PayMongo orders

---

## 📋 Files Modified

### ✅ New Files Created
- [ ] `mobile-app/src/constants/paymentMethods.ts` - Payment method constants and helpers

### ✅ Files Updated
- [ ] `mobile-app/src/services/checkoutService.ts` - Added isPaid support and dynamic status
- [ ] `mobile-app/app/CheckoutScreen.tsx` - Pass isPaid flag in payload
- [ ] `mobile-app/app/OrderDetailScreen.tsx` - Use constants, conditional COD display
- [ ] `mobile-app/app/OrderConfirmation.tsx` - Navigate to correct tab
- [ ] `mobile-app/app/PaymentGatewayScreen.tsx` - Update order status after payment

---

## 🧪 Pre-Deployment Testing

### Phase 1: Unit Testing

#### Constants Module Tests
```
[ ] normalizePaymentMethod('PayMongo') returns 'paymongo'
[ ] normalizePaymentMethod({type: 'PAYMONGO'}) returns 'paymongo'
[ ] normalizePaymentMethod('cod') returns 'cod'
[ ] normalizePaymentMethod(null) returns 'cod'
[ ] isCOD('cod') returns true
[ ] isCOD('paymongo') returns false
[ ] isPayMongo('paymongo') returns true
[ ] getPaymentMethodLabel('paymongo') returns 'PayMongo'
[ ] getPaymentMethodLabel('cod') returns 'Cash on Delivery'
[ ] getInitialOrderStatus('paymongo', true) returns 'processing'
[ ] getInitialOrderStatus('cod', false) returns 'pending'
```

### Phase 2: Integration Testing (Staging Environment)

#### Test Case 1: PayMongo Saved Card (Immediate Payment) ✨
**Scenario:** User selects saved PayMongo card → Order should go to Processing
```
[✓] Precondition: User has saved PayMongo card in Payment Methods
[✓] Step 1: Add items to cart
[✓] Step 2: Go to checkout
[✓] Step 3: Select saved PayMongo card
[✓] Step 4: Place order
[✓] Verify: Order created immediately without PaymentGateway
[✓] Verify: Database - payment_status = 'paid'
[✓] Verify: Database - shipment_status = 'processing'
[✓] Verify: Database - payment_method = { type: 'paymongo' }
[✓] Verify: OrderConfirmation shows immediately
[✓] Verify: "View My Purchases" navigates to Processing tab
[✓] Verify: Order appears in My Orders → Processing tab
[✓] Verify: OrderDetail displays "Payment Method: PayMongo"
[✓] Verify: NO COD instruction card visible
[✓] Expected Result: ✅ PASS
```

#### Test Case 2: PayMongo New Card (Payment Gateway) 🆕
**Scenario:** User enters new card → PaymentGateway processes → Order goes to Processing
```
[✓] Precondition: User has no saved PayMongo cards
[✓] Step 1: Add items to cart
[✓] Step 2: Go to checkout
[✓] Step 3: Select PayMongo
[✓] Step 4: Click "Add Card Details"
[✓] Step 5: Enter test card (4343 4343 4343 4345)
[✓] Step 6: Place order
[✓] Verify: Navigates to PaymentGatewayScreen
[✓] Verify: Database - order created with payment_status = 'pending_payment' (initial)
[✓] Verify: Database - shipment_status = 'waiting_for_seller' (initial)
[✓] Step 7: Fill card form (test success card)
[✓] Verify: "Pay" button enabled
[✓] Step 8: Click "Pay"
[✓] Verify: Payment processing animation shown
[✓] Verify: Database - order UPDATED to payment_status = 'paid'
[✓] Verify: Database - shipment_status = 'processing'
[✓] Verify: Shows success screen
[✓] Step 9: Navigate to My Orders
[✓] Verify: Order in Processing tab (not Pending)
[✓] Expected Result: ✅ PASS
```

#### Test Case 3: PayMongo Payment Failure ❌
**Scenario:** User enters failed card → Payment fails → Order stays in Pending
```
[✓] Precondition: User ready to checkout
[✓] Step 1-6: Same as Test Case 2
[✓] Step 7: Fill card form (use test failure card)
[✓] Step 8: Click "Pay"
[✓] Verify: Payment fails
[✓] Verify: Error message displayed
[✓] Verify: Database - order still exists with payment_status = 'pending_payment'
[✓] Step 9: Click "Go Back"
[✓] Step 10: Navigate to My Orders
[✓] Verify: Order appears in Pending tab (for retry)
[✓] Expected Result: ✅ PASS (allows retry)
```

#### Test Case 4: Cash on Delivery (COD) 💰
**Scenario:** User selects COD → Order goes to Pending
```
[✓] Precondition: User ready to checkout
[✓] Step 1: Add items to cart
[✓] Step 2: Go to checkout
[✓] Step 3: Select COD
[✓] Step 4: Place order
[✓] Verify: Order created immediately (no payment gateway)
[✓] Verify: Database - payment_status = 'pending_payment'
[✓] Verify: Database - shipment_status = 'waiting_for_seller'
[✓] Verify: Database - payment_method = { type: 'cod' }
[✓] Verify: OrderConfirmation shows
[✓] Verify: "View My Purchases" navigates to Pending tab
[✓] Verify: Order appears in My Orders → Pending tab
[✓] Verify: OrderDetail displays "Cash on Delivery"
[✓] Verify: COD instruction card VISIBLE with payment deadline
[✓] Expected Result: ✅ PASS
```

#### Test Case 5: Multiple Sellers with Mixed Payment ⚡
**Scenario:** Items from 2 sellers, all PayMongo → One order per seller
```
[✓] Step 1: Add items from Seller A (PayMongo-enabled)
[✓] Step 2: Add items from Seller B (PayMongo-enabled)
[✓] Step 3: Checkout with PayMongo
[✓] Verify: Creates 2 orders (one per seller)
[✓] Verify: Both orders have payment_status = 'paid'
[✓] Verify: Both orders have shipment_status = 'processing'
[✓] Verify: Both appear in Processing tab
[✓] Expected Result: ✅ PASS
```

### Phase 3: UI/UX Testing

#### OrderDetail Display Tests
```
[ ] PayMongo Order:
    - "Payment Method: PayMongo" displays correctly
    - COD instruction card is HIDDEN
    - Payment section shows only "Payment Method" row
    - Vertical rhythm maintained (no gaps)

[ ] COD Order:
    - "Payment Method: Cash on Delivery" displays
    - COD instruction card is VISIBLE
    - Shows 💳 emoji and instruction text
    - Shows "Estimated Payment Due: [date]"
    - Proper colors and styling applied

[ ] GCash/Maya Orders:
    - Show correct payment method name
    - COD card HIDDEN
    - No payment processing UI
```

#### My Orders Tab Tests
```
[ ] Processing tab shows PayMongo orders
    - Newly created PayMongo orders appear
    - Count increases after each PayMongo checkout
    
[ ] Pending tab shows:
    - COD orders
    - Failed PayMongo orders (for retry)
    
[ ] Tab switching smooth
    - No lag or loading issues
    - Correct count displayed for each tab
```

---

## 🗄️ Database Verification

### Before Deployment
```sql
-- Check for existing mixed-up orders (PayMongo but pending status)
SELECT COUNT(*) as broken_orders
FROM orders
WHERE payment_method::text LIKE '%paymongo%'
AND payment_status = 'pending_payment'
AND shipment_status = 'waiting_for_seller';

-- This query should return a number indicating how many orders need fixing
-- If > 0, may need data migration script
```

### Post-Deployment Verification
```sql
-- Verify new PayMongo orders are created correctly
SELECT 
  id, order_number, payment_method, payment_status, shipment_status
FROM orders
WHERE payment_method::text LIKE '%paymongo%'
ORDER BY created_at DESC
LIMIT 10;

-- Expected:
-- - payment_method: { type: 'paymongo' }
-- - payment_status: 'paid' (saved card) or 'pending_payment' → 'paid' (new card after payment)
-- - shipment_status: 'processing' (saved card) or 'waiting_for_seller' → 'processing' (after payment)

-- Verify COD orders unaffected
SELECT 
  id, order_number, payment_method, payment_status, shipment_status
FROM orders
WHERE payment_method::text LIKE '%cod%'
ORDER BY created_at DESC
LIMIT 10;

-- Expected:
-- - payment_method: { type: 'cod' }
-- - payment_status: 'pending_payment'
-- - shipment_status: 'waiting_for_seller'
```

---

## 📲 Mobile App Testing (Per Device)

### iOS Testing Checklist
```
[ ] Test on iPhone 13/14 (latest)
[ ] Test on iPhone 11 (older device)
[ ] Test saved card flow
[ ] Test new card flow  
[ ] Test COD flow
[ ] Verify tab navigation correct
[ ] Check button responsiveness
[ ] Verify no crashes during payment
```

### Android Testing Checklist
```
[ ] Test on Pixel 6/7 (latest)
[ ] Test on older Android device
[ ] Test saved card flow
[ ] Test new card flow
[ ] Test COD flow
[ ] Verify tab navigation correct
[ ] Check keyboard behavior
[ ] Verify no crashes during payment
```

---

## 🚀 Deployment Steps

### Step 1: Code Deployment
```bash
[ ] git add mobile-app/src/constants/paymentMethods.ts
[ ] git add mobile-app/src/services/checkoutService.ts
[ ] git add mobile-app/app/CheckoutScreen.tsx
[ ] git add mobile-app/app/OrderDetailScreen.tsx
[ ] git add mobile-app/app/OrderConfirmation.tsx
[ ] git add mobile-app/app/PaymentGatewayScreen.tsx
[ ] git commit -m "fix: PayMongo payment state persistence bug (#XXX)"
[ ] git push origin fix/paymongo-payment-status
```

### Step 2: Code Review
```
[ ] Code review by senior dev
[ ] Verify all payment method constants used
[ ] Verify no hardcoded payment strings remain
[ ] Verify conditional rendering logic
[ ] Verify navigation logic
[ ] Verify error handling
[ ] Approve for deployment
```

### Step 3: Staging Deployment
```
[ ] Deploy to staging environment
[ ] Run all test cases (see Phase 2 above)
[ ] Monitor logs for errors
[ ] Verify database updates
[ ] Performance testing
```

### Step 4: Production Deployment
```
[ ] Deploy to production
[ ] Monitor payment flows in real-time
[ ] Check error logs for issues
[ ] Verify order statistics
[ ] Monitor user complaints
```

### Step 5: Post-Deployment
```
[ ] Run database verification queries
[ ] Check My Orders tab distributions
[ ] Monitor PayMongo success rate
[ ] Create monitoring alerts for payment failures
[ ] Document any issues
```

---

## 🔍 Monitoring & Alerting

### Key Metrics to Monitor

**1. Payment Method Distribution**
```
- Track % of orders by payment method
- PayMongo should be consistent
- Alert if PayMongo drops significantly
```

**2. Order Status Distribution**
```
- Track orders in Processing vs Pending tabs
- Alert if too many orders stuck in Pending
- Monitor payment status updates
```

**3. Payment Gateway Performance**
```
- Track PaymentGateway success rate
- Monitor payment processing time
- Alert on high failure rate
```

**4. Tab Filter Accuracy**
```
- Verify Processing tab shows correct orders
- Verify Pending tab shows correct orders
- Alert on misclassified orders
```

### Alert Conditions to Set Up

```
[ ] Alert: PayMongo payment failure rate > 10% (daily)
[ ] Alert: Order stuck in pending_payment > 24 hours (hourly)
[ ] Alert: Payment_method field invalid format (real-time)
[ ] Alert: Orders not appearing in correct tab (hourly)
[ ] Alert: PaymentGateway endpoint timeout (real-time)
```

---

## 📊 Success Criteria

### Technical Success
- [ ] All test cases pass (100%)
- [ ] No database errors in logs
- [ ] Payment method normalization working correctly
- [ ] Order status transitions correct
- [ ] Tab navigation correct

### Business Success  
- [ ] PayMongo orders appear in Processing tab
- [ ] COD orders appear in Pending tab
- [ ] No customer complaints about payment status
- [ ] Payment success rate ≥ 95%
- [ ] Order fulfillment not delayed

### User Experience Success
- [ ] Payment flow feels smooth
- [ ] Tab navigation is intuitive
- [ ] Order details display correctly
- [ ] No crashes or errors reported
- [ ] Page load times acceptable

---

## 🆘 Rollback Plan

If critical issues found after deployment:

```
[ ] Identify issue scope and affected orders
[ ] Document error in Slack/Discord
[ ] Notify stakeholders
[ ] Prepare rollback commit
[ ] Run rollback: git revert [commit hash]
[ ] Deploy rollback to production
[ ] Verify rollback successful
[ ] Investigate root cause
[ ] Fix issues in next iteration
```

### Rollback Commit Example
```bash
git revert 9a7c3f2 --no-edit
git push origin main
# Then deploy rolled-back code
```

---

## 📝 Sign-Off

**Developer:** [Your Name]  
**Date:** May 1, 2026  
**Code Review:** Pending  
**QA Approval:** Pending  
**Deployment Approval:** Pending  

---

## 📞 Support During Deployment

**Questions about code:** Check [PAYMONGO_FIX_CODE_IMPLEMENTATION.md](PAYMONGO_FIX_CODE_IMPLEMENTATION.md)  
**Questions about flow:** Check [PAYMONGO_FIX_INTEGRATION_GUIDE.md](PAYMONGO_FIX_INTEGRATION_GUIDE.md)  
**Questions about testing:** Check this file (Phase 2)

