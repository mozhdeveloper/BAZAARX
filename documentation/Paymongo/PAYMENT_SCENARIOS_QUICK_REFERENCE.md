# BazaarX Payment Scenarios - Visual Reference & Quick Guide

## Payment Flow Diagram

```
User enters checkout page
    ↓
Selects payment method
    ↓
Selects "PayMongo" (card)
    ↓
Enters card number → 🎯 DETECTION POINT
    ↓
Form Validation
    ├─ ❌ Invalid (missing fields) → Show validation errors
    ├─ ✅ Valid card format → Continue
    │    ├─ 🚫 Test Error Card (e.g., 4200000000000018)
    │    │   └─ Redirect: /payment-failure?data=... ⚠️ ERROR PAGE
    │    ├─ 🔐 Test 3DS Card (e.g., 4120000000000007)
    │    │   └─ Redirect: 3DS authentication flow 🔒 AUTH PAGE
    │    └─ ✅ Test Success Card (e.g., 4343434343434345)
    │        └─ Continue with payment processing
    │           └─ Redirect: /payment-success?data=... ✅ SUCCESS PAGE
    └─ 🏥 Production card
        └─ Process with PayMongo API
```

## Quick Reference Card

### 🟢 SUCCESS SCENARIOS (No action needed - order completes)

**For Testing**: Use ANY future date and ANY 3-digit CVC

```
Visa Cards:
  4343434343434345  → Visa (basic)
  4571736000000075  → Visa Debit
  4009930000001421  → Visa Credit (PH)
  4404520000001439  → Visa Debit (PH)

Mastercard:
  5555444444444457  → Mastercard (basic)
  5455590000000009  → Mastercard Debit
  5339080000000003  → Mastercard Prepaid
  5240050000001440  → Mastercard Credit (PH)
  5577510000001446  → Mastercard Debit (PH)
```

**Expected Behavior**: 
- Order processes successfully
- Redirects to `/payment-success` page
- Displays order number, amount, bazcoins earned
- Shows tracking information

---

### 🔴 ERROR SCENARIOS (Redirect to failure page)

All require: Future date (MM/YY) + Any 3-digit CVC

| Error Type | Card Number | Error Code | Page Color | Tone |
|---|---|---|---|---|
| Card Expired | 4200000000000018 | `card_expired` | 🔴 Red | Contact bank |
| Invalid CVC | 4300000000000017 | `cvc_invalid` | 🟡 Amber | Verify & retry |
| Generic Decline | 4400000000000016 | `generic_decline` | 🔴 Red | Contact bank |
|  | 4028220000001457 | `generic_decline` | 🔴 Red | Contact bank |
| Fraudulent | 4500000000000015 | `fraudulent` | 🔴 Red | Contact support |
| Insufficient Funds | 5100000000000198 | `insufficient_funds` | 🟠 Orange | Try different card |
|  | 5240460000001466 | `insufficient_funds` | 🟠 Orange | Try different card |
| Processor Blocked | 5200000000000197 | `processor_blocked` | 🔴 Red | Retry or use alternate |
| Lost Card | 5300000000000196 | `lost_card` | 🔴 Red | Request replacement |
|  | 5483530000001462 | `lost_card` | 🔴 Red | Request replacement |
| Stolen Card | 5400000000000195 | `stolen_card` | 🔴 Red | Contact bank immediately |
| Processor Down | 5500000000000194 | `processor_unavailable` | 🟡 Yellow | Try again later |
| PayMongo Blocked | 4600000000000014 | `blocked` | 🔴 Red | Contact support |
| State Error | 5417881844647288 | `resource_failed_state` | 🔴 Red | Retry operation |

**Expected Behavior**:
- Shows specific error message
- Displays color-coded alert icon
- Provides actionable recommendation
- Offers retry or contact support options
- Shows test card info in dev mode

---

### 🔐 3D SECURE SCENARIOS (Authentication flow)

| Card Number | Type | Result | Status |
|---|---|---|---|
| 4120000000000007 | 3DS Required | Must complete authentication | ⏳ Pending |
| 4230000000000004 | 3DS Then Decline | Fails BEFORE auth | ❌ Error |
| 5234000000000106 | 3DS Then Decline | Fails AFTER auth | ❌ Error |
| 5123000000000001 | 3DS Optional | Succeeds without auth | ✅ Success |

---

## Component Page Specifications

### 📄 PaymentSuccessPage (`/payment-success`)

**Purpose**: Celebrate successful order placement

**Features**:
- Large green checkmark icon
- Order number with copy-to-clipboard
- Amount breakdown
- Bazcoins earned (highlighted)
- Payment method confirmation
- 4-step order process timeline
- Action buttons:
  - Track Order → `/orders`
  - Continue Shopping → `/shop`
  - Share → Native share dialog
- Responsive design (mobile/tablet/desktop)

**Design Colors**:
- Primary: Orange gradient (brand colors)
- Accents: Green for success, Orange for rewards
- Background: Gradient from orange-50 to white

**Data Structure** (URL param):
```json
{
  "orderNumber": "#TXNO8IRI0F5",
  "amount": 1000,
  "bazcoinsEarned": 100,
  "paymentMethod": "paymongo",
  "transactionId": "pi_xxxxx",
  "email": "customer@bazaarx.ph"
}
```

---

### ⚠️ PaymentFailurePage (`/payment-failure`)

**Purpose**: Explain error and provide next steps

**Features**:
- Color-coded error icon (red/amber/yellow/orange)
- Clear error title and description
- "What Happened?" section with details
- Order information display
- Actionable recommendations
- Support contact section
- Action buttons:
  - Try Again → `/checkout`
  - Return to Shop → `/shop`
- Dev-only test card display

**Color Coding**:
- 🔴 Red: Critical (fraud, stolen, lost, generic decline, expired, blocked)
- 🟠 Orange: Temporary (insufficient funds)
- 🟡 Amber: Format issue (invalid CVC)
- 🟡 Yellow: Temporary system issue (processor unavailable)

**Data Structure** (URL param):
```json
{
  "type": "card_expired",
  "amount": 1000,
  "orderNumber": "ORD-20250416123456",
  "email": "customer@bazaarx.ph"
}
```

---

## Code Testing Examples

### Testing a Success Flow
```typescript
// Navigate to checkout
navigate('/checkout');

// Fill form
formData = {
  fullName: 'Test User',
  street: '123 Test St',
  city: 'Manila',
  province: 'Metro Manila',
  postalCode: '1000',
  phone: '+63 912 345 6789',
  paymentMethod: 'card',
  cardNumber: '4343434343434345',  // ✅ Success card
  cardName: 'Test User',
  expiryDate: '12/25',
  cvv: '123'
};

// Submit form
handleSubmit();

// Expected: Redirected to /payment-success after short delay
```

### Testing an Error Flow
```typescript
// Navigate to checkout
navigate('/checkout');

// Fill form
formData = {
  fullName: 'Test User',
  street: '123 Test St',
  city: 'Manila',
  province: 'Metro Manila',
  postalCode: '1000',
  phone: '+63 912 345 6789',
  paymentMethod: 'card',
  cardNumber: '4200000000000018',  // 🔴 Expired card
  cardName: 'Test User',
  expiryDate: '12/25',  // Still must be future
  cvv: '123'
};

// Submit form
handleSubmit();

// Toast shows: "Test Card - Payment Would Fail"
// After 1.5s: Redirected to /payment-failure?data=...
```

---

## Browser Console Testing

### Check if Detection Works
```javascript
// Copy-paste in browser console after importing paymongoTestCards
import { detectTestCard } from '@/services/paymongoTestCards';

// Test success card
console.log(detectTestCard('4343434343434345'));
// Output: { isTestCard: true, scenario: 'successful_visa', type: 'success', ... }

// Test error card
console.log(detectTestCard('4200000000000018'));
// Output: { isTestCard: true, scenario: 'card_expired', type: 'error', errorCode: 'card_expired', ... }

// Test production card
console.log(detectTestCard('1234567890123456'));
// Output: { isTestCard: false, scenario: null, type: 'success', ... }
```

---

## User Journey Maps

### ✅ Happy Path (Success)
```
User → Checkout → Fill Form → Enter Success Card → Submit
   ↓
Process Payment → Success Message → Order Page (with bazcoins!)
   ↓
Can: Track Order, Continue Shopping, Share
```

### ❌ Sad Path (Error)
```
User → Checkout → Fill Form → Enter Error Card → Submit
   ↓
Toast: "Test Card - Payment Would Fail" → Wait 1.5s
   ↓
Redirect to Error Page → See specific error
   ↓
Can: Try Again, Return to Shop, Contact Support
```

### 🔐 Auth Path (3DS)
```
User → Checkout → Fill Form → Enter 3DS Card → Submit
   ↓
Toast: "3DS Authentication Required"
   ↓
Redirect to 3DS Auth Page (future implementation)
   ↓
Complete Authentication → Success or Failure
```

---

## Mobile Responsiveness

### Mobile Layout (< 768px)
- ✅ Stack layout (not side-by-side)
- ✅ Full-width buttons
- ✅ Larger touch targets (>44px)
- ✅ Optimized card size
- ✅ Readable font sizes

### Tablet Layout (768px - 1024px)
- ✅ 2-column grid for details
- ✅ Medium-sized buttons
- ✅ Centered cards

### Desktop Layout (> 1024px)
- ✅ Full 3-column capability
- ✅ Side-by-side information
- ✅ Maximum width constraint

---

## Development Mode Features

### Visible in Development Only
```javascript
if (process.env.NODE_ENV === 'development') {
  // Show test card number
  // Show error code
  // Show scenario info
}
```

### Available in Console
```javascript
// Check environment
console.log(process.env.NODE_ENV); // 'development'

// Manual test card detection
import { detectTestCard } from '@/services/paymongoTestCards';
detectTestCard('4343434343434345');
```

---

## Error Message Templates

### Template 1: Contact Bank
```
What Happened?
"Your bank has declined this transaction for reasons only 
they can explain."

What You Can Do:
"Please contact your card issuing bank for more information 
about why your payment was declined."
```

### Template 2: Try Again
```
What Happened?
"The payment processor is experiencing technical issues."

What You Can Do:
"Please wait a few minutes before re-trying the 
transaction. Else, request a different card or other 
form of payment."
```

### Template 3: Verify Identity
```
What Happened?
"Your payment was blocked as we suspect it to be fraudulent."

What You Can Do:
"Please verify your identity with your bank or contact our 
support team for assistance."
```

### Template 4: Request Replacement
```
What Happened?
"This card has been reported as lost."

What You Can Do:
"Please request a replacement card from your bank or 
use a different payment method."
```

---

## Troubleshooting Guide

### Issue: Card not detected as test card
**Solution**: Ensure card number is exactly as specified, with no spaces/dashes

### Issue: Expiry date not validating
**Solution**: Use MM/YY format, must be future date relative to current month/year

### Issue: CVC validation fails
**Solution**: Must be 3-4 digits only, no letters or special characters

### Issue: Redirect not happening
**Solution**: 
- Check browser console for errors
- Verify route exists in App.tsx
- Clear browser cache
- Check for ad blockers

### Issue: Authorization header missing
**Solution**: 
- Verify user is logged in
- Check profile ID exists
- Verify auth token in localStorage

---

## Performance Metrics

**Expected Response Times**:
- Card Detection: < 1ms
- Form Validation: < 10ms
- Page Redirect: < 2s (intentional delay for UX)
- Page Load: < 3s (with animations)

---

## Accessibility Checklist

- [ ] Color not sole indicator of status (use icons)
- [ ] Sufficient contrast ratios (WCAG AA)
- [ ] Keyboard navigation support
- [ ] Screen reader labels
- [ ] Focus management
- [ ] Semantic HTML
- [ ] Error messages clear
- [ ] Alternative text for icons

---

**Version**: 1.0  
**Last Updated**: 2025-04-16  
**Status**: Production Ready ✅
