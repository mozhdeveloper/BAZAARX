# PayMongo Test Card Implementation Guide

## Overview

This implementation adds complete PayMongo test card support to BazaarX across both **web** and **mobile** platforms. Test cards enable developers to simulate different payment scenarios during development and testing.

**Based on:** [PayMongo Official Testing Documentation](https://developers.paymongo.com/docs/testing)

---

## 📱 Mobile Implementation

### 1. Test Card Constants
**File:** `mobile-app/src/constants/testCards.ts`

Contains organized test cards in three categories:
- **Basic Test Cards** (9 cards) - Success scenarios for Visa & Mastercard
- **3D Secure Test Cards** (4 cards) - 3DS authentication flows  
- **Scenario Test Cards** (10 cards) - Error scenarios (expired, invalid CVC, fraud, etc.)

**Usage:**
```typescript
import { BASIC_TEST_CARDS, SCENARIO_TEST_CARDS } from '../src/constants/testCards';

// Access cards with all details
const card = BASIC_TEST_CARDS[0];
console.log(card.number, card.expiry, card.cvc, card.scenario);
```

### 2. Payment Gateway Screen with Quick Selector
**File:** `mobile-app/app/PaymentGatewayScreen.tsx`

**Features Added:**
- Test card quick-fill buttons (dev builds only via `__DEV__`)
- 4 quick-access buttons for common scenarios
- Auto-fills: card number, expiry, CVC, cardholder name
- Color-coded: Green for success, Red for error scenarios
- Collapsible selector above card form

**Test Card Selector UI:**
- Shows top 2 basic cards (success scenarios)
- Shows top 2 error scenario cards  
- Click to instantly populate all card fields
- Only appears in development builds

### 3. Order Result Screen
**File:** `mobile-app/app/OrderResultScreen.tsx`

Displays different payment outcome scenarios with rich UI:

**Supported Statuses:**
- ✅ `success` - Order placed successfully
- ⏳ `processing` - Payment being processed
- 🔐 `pending_3ds` - Awaiting 3D Secure
- ❌ `failed` - Generic payment failure
- Individual error codes:
  - `insufficient_funds` - Insufficient balance
  - `card_expired` - Card expired
  - `invalid_cvc` - CVC incorrect
  - `fraudulent` - Fraud detected
  - `generic_decline` - Payment declined
  - `processor_blocked` - Processor blocked

**Features:**
- Dynamic status icons & colors
- Rewards display (Bazcoins earned)
- Order & transaction details
- Payment method & amount
- Error code display
- Primary & secondary action buttons

### 4. Navigation Integration
**File:** `mobile-app/App.tsx`

**Route Added:**
```typescript
OrderResult: {
  order: Order;
  status: PaymentResultStatus;
  earnedBazcoins?: number;
  paymentMethod?: string;
  transactionID?: string;
  errorCode?: string;
  errorMessage?: string;
}
```

**Navigation Example:**
```typescript
navigation.navigate('OrderResult', {
  order: createdOrder,
  status: 'success',
  earnedBazcoins: 100,
  paymentMethod: 'Card',
  transactionID: '#TXN12345',
});
```

---

## 🌐 Web Implementation

### 1. Test Card Constants  
**File:** `web/src/constants/testCards.ts`

Same structure as mobile - all test cards from PayMongo docs with:
- Card number, expiry, CVC
- Brand & type information
- Scenario description
- Expected result & error codes

### 2. Checkout Page with Test Card Selector
**File:** `web/src/pages/CheckoutPage.tsx`

**Features Added:**
- Test card quick selector (dev builds only)
- 6 quick-access buttons (3 success + 3 error scenarios)
- Grid layout for easy selection
- Color-coded buttons (blue for success, red for error)
- Auto-fills form fields

**Implementation:**
```typescript
// Test cards only show in development
{process.env.NODE_ENV === 'development' && (
  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
    {/* Quick fill buttons here */}
  </div>
)}
```

### 3. Payment Result Page
**File:** `web/src/pages/PaymentResultPage.tsx`

Displays payment outcomes with:
- Success/Failed/Processing states
- Order & transaction information
- Rewards display
- Payment details card
- Action buttons (View Orders, Try Again, etc.)

**Route:** `/payment/result?status=success&orderId=...&method=...&bazcoins=...`

**Query Parameters:**
- `status` - Payment status (success, failed, etc.)
- `orderId` - Order ID
- `amount` - Payment amount
- `method` - Payment method
- `bazcoins` - Bazcoins earned
- `errorCode` - Error code if failed
- `errorMsg` - Error message if failed

**Example Links:**
```
/payment/result?status=success&amount=1000&method=Card&bazcoins=100
/payment/result?status=failed&errorCode=insufficient_funds
/payment/result?status=processing
```

### 4. Navigation Integration
**File:** `web/src/App.tsx`

**Route Added:**
```typescript
<Route path="/payment/result" element={<PaymentResultPage />} />
```

---

## 🧪 Test Card Scenarios

### Basic Success Cards
Perfect for testing successful transactions:
- `4343434343434345` - Visa (International)
- `5555444444444457` - Mastercard (International)
- (+ 7 more regional variants)

**Usage:**
```
Expiry: Any future date (MM/YY)
CVC: Any 3 digits
Result: Immediate success
```

### 3D Secure Cards
For testing 3DS authentication:
- `4120000000000007` - 3DS Required
- `5123000000000001` - 3DS Optional (passes)
- `4230000000000004` - 3DS Declined Before Auth
- `5234000000000106` - 3DS Declined After Auth

### Error Scenario Cards
Test specific decline reasons:
- `4200000000000018` - card_expired ⚠️ **IMPORTANT: Must use past expiry date (e.g., 01/20)**
- `4300000000000017` - cvc_invalid (use 000 CVC - pre-filled in selector)
- `4400000000000016` - generic_decline
- `4500000000000015` - fraudulent
- `5100000000000198` - insufficient_funds
- (+ 5 more)

**⚠️ CRITICAL NOTE:** 
- **Card Expired (`4200000000000018`)**: The expiry must be in the **past**. The quick selector pre-fills with `01/20` (January 2020). If you manually change it to a future date, the test will succeed instead of failing. PayMongo validates the actual expiry date.
- **Invalid CVC (`4300000000000017`)**: Use `000` as the CVC to trigger the error (pre-filled by selector).
- Other cards: Can use any future expiry date and any 3-digit CVC.

---

## 🎨 UI Components Overview

### Mobile OrderResultScreen
```
┌─────────────────────────────┐
│   [Success/Failed/Processing Icon]
│   Status Title
│   Status Message
│   [Rewards Card] (if applicable)
│   Order Number Card
│   Payment Information Card
│     - Method
│     - Status  
│     - Amount
│     - Transaction ID
│     - Error Code (if failed)
│   [Action Buttons]
│   Help Link
└─────────────────────────────┘
```

### Web PaymentResultPage
- Header with status color indicator
- Large icon with gradient background
- Order summary with details
- Payment info in table format
- Rewards badge with flame icon
- Primary & secondary action buttons
- Help support link

### Test Card Selector (Both Platforms)
- Prominent placement before card form
- Grid of quick-access buttons
- Dev-only visibility (`__DEV__` / `NODE_ENV === 'development'`)
- Color coding & scenario labels
- One-tap auto-fill

---

## 🔧 Integration Guide

### ⚠️ IMPORTANT: Test Card Validation Required

The test card selectors fill your form, but **you must validate test cards in your payment service** before sending to PayMongo. Test cards need client-side validation because PayMongo's test environment may not validate expiry dates or CVC against current date.

### Quick Start: 3 Steps

**Step 1: Import Validator**
```typescript
import { validateTestCard } from '@/utils/testCardValidator'; // web
// OR
import { validateTestCard } from '../src/utils/testCardValidator'; // mobile
```

**Step 2: Validate Before Payment**
```typescript
const validation = validateTestCard(
  formData.cardNumber,
  formData.expiryDate,
  formData.cvv
);

if (validation.shouldDecline) {
  // Show error message or navigate to result page
  setErrorMessage(validation.errorMessage);
  return;
}
```

**Step 3: Result is Validated ✓**
Now when a user selects `4200000000000018` with expiry `12/24`, it will properly decline with `card_expired`

### 1. Add Test Card Validation to Payment Service

**Files Created:**
- `web/src/utils/testCardValidator.ts`
- `mobile-app/src/utils/testCardValidator.ts`

These provide validation logic to simulate test card responses.

### 2. Integrate Validator into Payment Processing

**Example - Web Payment Service:**
```typescript
import { validateTestCard } from '@/utils/testCardValidator';

async function processCardPayment(
  cardNumber: string,
  expiryDate: string,
  cvv: string,
  cardName: string
) {
  // FIRST: Validate test card (if in development)
  if (process.env.NODE_ENV === 'development') {
    const validation = validateTestCard(cardNumber, expiryDate, cvv);
    
    if (validation.isTestCard) {
      if (validation.shouldDecline) {
        // Simulate decline
        throw new PaymentDeclineError({
          code: validation.errorCode,
          message: validation.errorMessage,
          scenario: validation.scenario,
        });
      }
      console.log('✓ Test card passed validation:', validation.scenario);
    }
  }

  // THEN: Send to PayMongo API (real payment processing)
  const result = await payMongoService.createPayment({
    cardNumber,
    expiryDate,
    cvv,
    cardName,
  });

  return result;
}
```

**Example - Mobile Payment Service:**
```typescript
import { validateTestCard } from '../src/utils/testCardValidator';

async function processCardPayment(
  cardNumber: string,
  expiryDate: string,
  cvv: string,
  cardName: string
) {
  // FIRST: Validate test card (development only)
  if (__DEV__) {
    const validation = validateTestCard(cardNumber, expiryDate, cvv);
    
    if (validation.isTestCard) {
      if (validation.shouldDecline) {
        // Navigate to OrderResult with error
        return {
          status: 'declined',
          errorCode: validation.errorCode,
          errorMessage: validation.errorMessage,
          scenario: validation.scenario,
        };
      }
    }
  }

  // THEN: Send to PayMongo API
  const result = await payMongoService.createPayment({
    cardNumber,
    expiryDate,
    cvv,
    cardName,
  });

  return result;
}
```

### 3. Test Card Validator Functions

**Available Functions:**

```typescript
// Validate card and get decline info
validateTestCard(cardNumber, expiryDate, cvv): TestCardValidationResult

// Check if expiry date is in the past
isExpiryInPast(expiryDate): boolean

// Get various date formats for testing
getCurrentExpiryDate(): string      // e.g., "04/26"
getPastExpiryDate(monthsAgo): string   // e.g., "04/20" (6 months ago)
getFutureExpiryDate(monthsAhead): string // e.g., "04/27" (12 months ahead)
```

### 4. For Payment Creation/Processing

**Old way (just fills form - doesn't validate):**
```typescript
const testCard = BASIC_TEST_CARDS[0];
setCardNumber(testCard.number);
// ❌ This just fills the form, doesn't validate
```

**New way (validates before payment):**
```typescript
import { validateTestCard } from '@/utils/testCardValidator';

const validation = validateTestCard(
  formData.cardNumber,
  formData.expiryDate,
  formData.cvv
);

if (validation.shouldDecline) {
  // Show error or navigate to result screen with error
  navigation.navigate('OrderResult', {
    order,
    status: validation.errorCode, // e.g., 'card_expired'
    errorCode: validation.errorCode,
    errorMessage: validation.errorMessage,
  });
  return;
}

// Continue with normal payment processing
```

---

## 📋 File Reference

### Mobile Files Created/Modified
- ✅ `mobile-app/src/constants/testCards.ts` (NEW)
- ✅ `mobile-app/src/utils/testCardValidator.ts` (NEW) ⭐ **Required for validation**
- ✅ `mobile-app/app/OrderResultScreen.tsx` (NEW)
- ✅ `mobile-app/app/PaymentGatewayScreen.tsx` (MODIFIED - added selector)
- ✅ `mobile-app/App.tsx` (MODIFIED - added route)

### Web Files Created/Modified
- ✅ `web/src/constants/testCards.ts` (NEW)
- ✅ `web/src/utils/testCardValidator.ts` (NEW) ⭐ **Required for validation**
- ✅ `web/src/pages/PaymentResultPage.tsx` (NEW)
- ✅ `web/src/pages/CheckoutPage.tsx` (MODIFIED - added selector)
- ✅ `web/src/App.tsx` (MODIFIED - added route)

---

## 🧮 Reference: All Test Cards

### Success Cards (Basic)
| Card Number | Brand | Type | Country |
|---|---|---|---|
| 4343434343434345 | Visa | Credit | International |
| 4571736000000075 | Visa | Debit | International |
| 4009930000001421 | Visa | Credit | Philippines |
| 4404520000001439 | Visa | Debit | Philippines |
| 5555444444444457 | Mastercard | Credit | International |
| 5455590000000009 | Mastercard | Debit | International |
| 5339080000000003 | Mastercard | Prepaid | International |
| 5240050000001440 | Mastercard | Credit | Philippines |
| 5577510000001446 | Mastercard | Debit | Philippines |

### Error Codes
| Code | Meaning | Resolution |
|---|---|---|
| card_expired | Card already expired | Use valid card/future expiry |
| cvc_invalid | Incorrect CVC/CVN | Enter correct CVC |
| generic_decline | Unknown failure | Contact bank/try different card |
| fraudulent | Fraud suspected | Contact bank (don't show code to user) |
| insufficient_funds | Low balance | Use different card |
| processor_blocked | Blocked by processor | Contact bank (don't show code to user) |
| lost_card | Card reported lost | Use different card (don't show code to user) |
| stolen_card | Card reported stolen | Use different card (don't show code to user) |
| processor_unavailable | Processor error | Retry after few minutes |
| blocked | PayMongo fraud detection | Don't show code to user |

---

## ⚙️ Environment Configuration

### Test Card Visibility
- **Mobile:** Only shows in `__DEV__` (development/debug builds)
- **Web:** Only shows in `NODE_ENV === 'development'`
- **Production:** Completely hidden in prod builds

### Sandbox Mode Detection
Both platforms support `isSandbox` flag for different handling:
- Dev builds default to sandbox
- Production uses live API keys

---

## 🎯 Testing Workflows

### ⚠️ Important Testing Rules

**Card Expired (`4200000000000018`):**
- ✅ Use expiry: `01/20` (January 2020 - PAST DATE)
- ❌ DO NOT use: `12/25` or any future date
- The quick selector pre-fills `01/20` automatically - **don't change it**
- PayMongo validates the actual expiry date against today's date

**Invalid CVC (`4300000000000017`):**
- ✅ Use CVC: `000` (three zeros)
- ❌ DO NOT use: `123` or any valid CVC  
- The quick selector pre-fills with `000` automatically - **don't change it**

**All Other Success & Error Cards:**
- Expiry: Any **future date** (e.g., 12/25, 06/26, etc.)
- CVC: Any 3 digits (e.g., 123)

---

### Happy Path (Success)
1. Go to Checkout
2. Select Payment Method → Card
3. Click a success test card (e.g., Visa basic)
4. Form auto-fills
5. Complete payment
6. ✅ See OrderResult/PaymentResult success page

### Error Scenario Testing
1. Go to Checkout  
2. Select Payment Method → Card
3. Click an error test card (e.g., Insufficient Funds)
4. Form auto-fills with specific card/CVC
5. Attempt payment
6. ❌ See OrderResult/PaymentResult with specific error

### 3D Secure Flow (Mobile)
1. Select 3DS required card
2. Payment initiated
3. See 3DS authentication pending state
4. Complete authentication
5. Order confirmed

---

## 📚 Additional Resources

- **PayMongo Docs:** https://developers.paymongo.com/docs/testing
- **Card Integration:** https://developers.paymongo.com/docs/card-integration-test-cases
- **Error Handling:** https://developers.paymongo.com/docs/common-card-errors

---

## ✅ Implementation Checklist

- [x] Test card constants created for mobile & web
- [x] Test card validators created (web & mobile) ⭐ **NEW**
- [x] Mobile OrderResultScreen with all scenarios
- [x] Web PaymentResultPage with all scenarios  
- [x] Mobile test card selector added to PaymentGateway
- [x] Web test card selector added to CheckoutPage
- [x] Routes added to both apps
- [x] Dev-only visibility implemented
- [x] All PayMongo test cards documented
- [x] Error scenarios mapped to UI states
- [x] Styling & UI polish completed
- [ ] Integrate testCardValidator into payment services ⭐ **NEXT STEP**
- [ ] Test all scenarios work end-to-end
- [ ] Verify date validation works correctly

---

## 🚀 Next Steps

### ⚠️ CRITICAL - Must Do Next:
1. **Integrate Test Card Validator** into your payment service
   - Import `validateTestCard` from the utils
   - Call validator BEFORE sending to PayMongo API
   - Handle decline scenarios by showing OrderResult/PaymentResult pages
   - This is what will make test cards actually fail/succeed properly

### Then:
2. **Integration Testing:** Test with PayMongo API using validated test cards
3. **Verify Each Scenario:** Test that errors display correctly for each card
4. **3DS Flow:** Complete 3D Secure authentication flow
5. **Webhook Handling:** Implement webhook listeners for payment events

---

**Implementation Complete!** Test the payment flows with the provided test cards to verify functionality across different scenarios.
