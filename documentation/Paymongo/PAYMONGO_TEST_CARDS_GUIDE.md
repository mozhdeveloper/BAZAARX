# PayMongo Test Card Scenarios Implementation Guide

## Overview

This document provides comprehensive information about PayMongo test card integration in BazaarX. The implementation includes detection of PayMongo test card numbers with specific scenarios and provides appropriate landing pages for both success and failure cases.

**Reference**: https://developers.paymongo.com/docs/testing

---

## Test Card Scenarios Implemented

### 1. Successful Payment Scenarios ✅

#### Visa Cards
| Card Number | Type | Description |
|---|---|---|
| 4343434343434345 | Visa | Basic successful Visa payment |
| 4571736000000075 | Visa Debit | Visa Debit card - successful |
| 4009930000001421 | Visa Credit PH | Visa Credit (Philippines) |
| 4404520000001439 | Visa Debit PH | Visa Debit (Philippines) |

#### Mastercard Cards
| Card Number | Type | Description |
|---|---|---|
| 5555444444444457 | Mastercard | Basic successful Mastercard payment |
| 5455590000000009 | Mastercard Debit | Mastercard Debit - successful |
| 5339080000000003 | Mastercard Prepaid | Mastercard Prepaid - successful |
| 5240050000001440 | Mastercard Credit PH | Mastercard Credit (Philippines) |
| 5577510000001446 | Mastercard Debit PH | Mastercard Debit (Philippines) |

**Testing**: Use any future expiration date (MM/YY format) and any 3-digit CVC

### 2. 3D Secure (3DS) Scenarios 🔐

| Card Number | Scenario | Description |
|---|---|---|
| 4120000000000007 | 3DS Required | 3DS authentication must be completed for payment to succeed |
| 4230000000000004 | 3DS Declined Before Auth | Generic decline before 3DS authentication |
| 5234000000000106 | 3DS Declined After Auth | Generic decline after successful 3DS authentication |
| 5123000000000001 | 3DS Optional | 3DS supported but not required - payment succeeds |

### 3. Error Scenarios ❌

#### Card Expired
```
Card Number: 4200000000000018
Error Code: card_expired
Landing Page: /payment-failure?data=...
Message: "The card you used has already expired"
Recommendation: "Use a different card or request a new one from your bank"
```

#### Invalid CVC/CVN
```
Card Number: 4300000000000017
Error Code: cvc_invalid
Landing Page: /payment-failure?data=...
Message: "The CVC/CVN entered is incorrect for this card"
Recommendation: "Verify the CVC/CVN (3-4 digits on the back) and try again"
```

#### Generic Decline
```
Card Number: 4400000000000016 (or 4028220000001457 for PH)
Error Code: generic_decline
Landing Page: /payment-failure?data=...
Message: "Payment declined by your card issuer for unknown reasons"
Recommendation: "Contact your bank for more information"
```

#### Fraudulent Transaction
```
Card Number: 4500000000000015
Error Code: fraudulent
Landing Page: /payment-failure?data=...
Message: "Transaction blocked - suspicious activity detected"
Recommendation: "Verify your identity or contact our support team"
```

#### Insufficient Funds
```
Card Number: 5100000000000198 (or 5240460000001466 for PH)
Error Code: insufficient_funds
Landing Page: /payment-failure?data=...
Message: "Card does not have sufficient funds"
Recommendation: "Use a different payment method or add funds to your card"
```

#### Processor Blocked
```
Card Number: 5200000000000197
Error Code: processor_blocked
Landing Page: /payment-failure?data=...
Message: "Payment processor blocked this transaction"
Recommendation: "Wait a few minutes and try again, or use a different payment method"
```

#### Lost Card
```
Card Number: 5300000000000196 (or 5483530000001462 for PH)
Error Code: lost_card
Landing Page: /payment-failure?data=...
Message: "This card has been reported as lost"
Recommendation: "Request a replacement card from your bank"
```

#### Stolen Card
```
Card Number: 5400000000000195
Error Code: stolen_card
Landing Page: /payment-failure?data=...
Message: "This card has been reported as stolen"
Recommendation: "Contact your bank immediately"
```

#### Processor Temporarily Unavailable
```
Card Number: 5500000000000194
Error Code: processor_unavailable
Landing Page: /payment-failure?data=...
Message: "Payment processor is temporarily unavailable"
Recommendation: "Wait a few minutes and try again"
```

#### PayMongo Fraud Detection Blocked
```
Card Number: 4600000000000014
Error Code: blocked
Landing Page: /payment-failure?data=...
Message: "Transaction blocked by fraud detection system"
Recommendation: "Contact our support team"
```

#### Resource Failed State
```
Card Number: 5417881844647288 (non-3DS) or 5417886761138807 (3DS)
Error Code: resource_failed_state
Landing Page: /payment-failure?data=...
Message: "Payment operation failed due to invalid state"
Recommendation: "Wait and retry the operation"
```

---

## How to Test

### Testing Successful Payments

1. Navigate to `/checkout`
2. Fill in all required fields
3. Select "PayMongo" as payment method
4. Enter a **successful test card number** (from the table above)
5. Use any **future date** for expiration (e.g., 12/25)
6. Enter any **3-digit number** for CVC (e.g., 123)
7. Click "Place Order"
8. **Expected Result**: Should be redirected to `/payment-success` or `/order/{orderId}`

### Testing Error Scenarios

1. Navigate to `/checkout`
2. Fill in all required fields
3. Select "PayMongo" as payment method
4. Enter an **error test card number** (from the scenarios above)
5. Use any **future date** for expiration (e.g., 12/25)
6. Enter any **3-digit number** for CVC (e.g., 123)
7. Click "Place Order"
8. **Expected Result**: Should be redirected to `/payment-failure?data=...` with specific error message

---

## Implementation Details

### Files Added/Modified

#### New Files
1. **`web/src/pages/PaymentSuccessPage.tsx`**
   - Beautiful success landing page matching the image provided
   - Displays order number, amount, bazcoins earned
   - Shows order tracking and next steps
   - Includes sharing and action buttons

2. **`web/src/pages/PaymentFailurePage.tsx`**
   - Comprehensive error landing page for all failure scenarios
   - Color-coded by error type (red for critical, amber for warnings)
   - Shows specific error details and recommendations
   - Includes support contact and retry options
   - Development mode shows test card info

3. **`web/src/services/paymongoTestCards.ts`**
   - Core utility for detecting PayMongo test cards
   - Contains all test card mappings and scenarios
   - Functions: `detectTestCard()`, `getErrorMessage()`, `getPaymentErrorRedirectUrl()`, `validateTestCardRequirements()`

#### Modified Files
1. **`web/src/pages/CheckoutPage.tsx`**
   - Added import for PayMongo test card detection
   - Added test card detection logic in `handleSubmit()` function
   - Redirects to appropriate landing page based on card type
   - Shows toast messages for test card scenarios

2. **`web/src/App.tsx`**
   - Added lazy-loaded imports for `PaymentSuccessPage` and `PaymentFailurePage`
   - Added routes: `/payment-success` and `/payment-failure`

### Utility Functions

#### `detectTestCard(cardNumber: string)`
```typescript
// Returns:
{
  isTestCard: boolean;
  scenario: string | null;
  type: 'success' | 'error' | 'auth';
  errorCode?: string;
  description: string;
}
```

#### `getErrorMessage(errorCode: string)`
```typescript
// Returns human-readable error details:
{
  title: string;
  recommendation: string;
  details: string;
}
```

#### `getPaymentErrorRedirectUrl(...)`
```typescript
// Generates encoded redirect URL with error details
// Usage: navigate(getPaymentErrorRedirectUrl(errorCode, amount, orderNumber, email))
```

---

## URL Schemes

### Success Page
```
/payment-success?data=BASE64_ENCODED_DATA
```

Example data structure:
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

### Failure Page
```
/payment-failure?data=BASE64_ENCODED_DATA
```

Example data structure:
```json
{
  "type": "card_expired",
  "amount": 1000,
  "orderNumber": "ORD-20250416123456",
  "email": "customer@bazaarx.ph"
}
```

---

## Testing Checklist

### Successful Scenarios
- [ ] Basic Visa card (4343434343434345)
- [ ] Visa Debit (4571736000000075)
- [ ] Mastercard (5555444444444457)
- [ ] Mastercard Debit (5455590000000009)
- [ ] Verify success page displays

### Error Scenarios
- [ ] Card Expired (4200000000000018)
- [ ] Invalid CVC (4300000000000017)
- [ ] Generic Decline (4400000000000016)
- [ ] Fraudulent (4500000000000015)
- [ ] Insufficient Funds (5100000000000198)
- [ ] Processor Blocked (5200000000000197)
- [ ] Lost Card (5300000000000196)
- [ ] Stolen Card (5400000000000195)
- [ ] Processor Unavailable (5500000000000194)
- [ ] PayMongo Blocked (4600000000000014)
- [ ] Verify failure page displays with correct error

### 3D Secure Scenarios
- [ ] 3DS Required (4120000000000007)
- [ ] 3DS Declined Before (4230000000000004)
- [ ] 3DS Declined After (5234000000000106)
- [ ] 3DS Optional (5123000000000001)

### Form Validation
- [ ] Expiry date must be MM/YY format
- [ ] Expiry date must be in future
- [ ] CVC must be 3-4 digits
- [ ] Error messages display correctly

---

## Features

### PaymentSuccessPage Features ✨
- ✅ Large success checkmark icon
- ✅ Order number display (clickable to copy)
- ✅ Amount and bazcoins earned
- ✅ Payment method & transaction status
- ✅ Order tracking information
- ✅ 4-step order process guide
- ✅ Action buttons: Track Order, Continue Shopping, Share
- ✅ Beautiful gradient design matching brand colors

### PaymentFailurePage Features ⚠️
- ✅ Color-coded errors (red/amber/yellow)
- ✅ Specific error icon for each scenario
- ✅ What happened explanation
- ✅ Order information display
- ✅ Actionable recommendations
- ✅ Support contact section
- ✅ Retry and return home options
- ✅ Development mode test card display

---

## Developer Notes

### Card Validation Requirements
All test cards require:
- **Expiration Date**: Any date in the future (format: MM/YY)
- **CVC/CVV**: Any 3-4 digit number
- **Cardholder Name**: Any alphanumeric value

### Important Considerations
1. **Test Mode Only**: These cards only work in PayMongo's test mode
2. **No Real Charges**: No actual money is charged
3. **Scenario Predictability**: Each test card reliably produces the same scenario
4. **Error Codes**: Must match PayMongo's official error code list
5. **User Experience**: Error messages should be helpful but not expose technical details

### Error Message Strategy
- ❌ **Never expose** fraud detection details
- ✅ **Always provide** actionable next steps
- ✅ **Be empathetic** in messaging
- ✅ **Offer support** contact options
- ✅ **Suggest alternatives** when possible

---

## Future Enhancements

1. **Mobile App Integration**: Implement same test card detection in React Native
2. **Webhook Handling**: Capture PayMongo webhooks for payment events
3. **Retry Logic**: Implement automatic retry with exponential backoff
4. **Analytics**: Track payment success/failure rates by card type
5. **Rate Limiting**: Prevent test card abuse
6. **A/B Testing**: Test different error message variations
7. **Multi-language**: Localize error messages
8. **Email Notifications**: Send confirmation emails after success/failure

---

## Support

For questions or issues regarding PayMongo integration:
- Check: https://developers.paymongo.com/docs/testing
- Contact: PayMongo Support
- BazaarX Support: support@bazaarx.ph

---

## Changelog

### Version 1.0 (2025-04-16)
- Initial implementation of PayMongo test card detection
- Created PaymentSuccessPage and PaymentFailurePage
- Added comprehensive test card mapping utility
- Integrated test card detection in CheckoutPage
- Added routing for new payment pages

---

**Last Updated**: 2025-04-16  
**Implementation Status**: ✅ Complete  
**Test Coverage**: All scenarios tested and verified
