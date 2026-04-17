# PayMongo Test Cards - Complete Guide

**Last Updated:** April 16, 2026  
**Total Test Cards:** 23  
**Validator Status:** ✅ Enhanced with all scenarios

## Overview

This guide explains all 23 PayMongo test cards available in BAZAARX and how to use them for testing. The validator has been enhanced to handle all scenarios comprehensively.

---

## Quick Reference Table

| # | Card Number | Expiry | CVV | Scenario | Expected Result |
|---|---|---|---|---|---|
| **BASIC CARDS (Success)** |
| 1 | 4343434343434345 | 12/25 | 123 | Visa (International) | ✅ Success |
| 2 | 4571736000000075 | 12/25 | 123 | Visa Debit (International) | ✅ Success |
| 3 | 4009930000001421 | 12/25 | 123 | Visa (Credit PH) | ✅ Success |
| 4 | 4404520000001439 | 12/25 | 123 | Visa Debit (PH) | ✅ Success |
| 5 | 5555444444444457 | 12/25 | 123 | Mastercard (International) | ✅ Success |
| 6 | 5455590000000009 | 12/25 | 123 | Mastercard Debit (International) | ✅ Success |
| 7 | 5339080000000003 | 12/25 | 123 | Mastercard (Prepaid) | ✅ Success |
| 8 | 5240050000001440 | 12/25 | 123 | Mastercard (Credit PH) | ✅ Success |
| 9 | 5577510000001446 | 12/25 | 123 | Mastercard Debit (PH) | ✅ Success |
| **3DS CARDS (Authentication)** |
| 10 | 4120000000000007 | 12/25 | 123 | 3DS - Auth Required | 🔐 Requires 3DS |
| 11 | 4230000000000004 | 12/25 | 123 | 3DS - Declined Before Auth | ❌ Declines (404 error) |
| 12 | 5234000000000106 | 12/25 | 123 | 3DS - Declined After Auth | ❌ Declines (after 3DS) |
| 13 | 5123000000000001 | 12/25 | 123 | 3DS - Optional (Will Pass) | ✅ Success |
| **SCENARIO CARDS (Various Declines)** |
| 14 | 4200000000000018 | **01/20** | 123 | Card Expired | ❌ Declines (expired) |
| 15 | 4300000000000017 | 12/25 | **000** | Invalid CVC | ❌ Declines (invalid CVC) |
| 16 | 4400000000000016 | 12/25 | 123 | Generic Decline | ❌ Declines (generic) |
| 17 | 4500000000000015 | 12/25 | 123 | Fraudulent | ❌ Declines (fraud) |
| 18 | 5100000000000198 | 12/25 | 123 | Insufficient Funds | ❌ Declines (no funds) |
| 19 | 5200000000000197 | 12/25 | 123 | Processor Blocked | ❌ Declines (blocked) |
| 20 | 5300000000000196 | 12/25 | 123 | Lost Card | ❌ Declines (lost) |
| 21 | 5400000000000195 | 12/25 | 123 | Stolen Card | ❌ Declines (stolen) |
| 22 | 5500000000000194 | 12/25 | 123 | Processor Unavailable | ❌ Declines (unavailable) |
| 23 | 4600000000000014 | 12/25 | 123 | PayMongo Fraud Block | ❌ Declines (blocked) |

---

## Detailed Scenario Descriptions

### BASIC CARDS (9 cards - All Succeed)

These cards test successful payments across different card types, brands, and regions.

**When to use:**
- Testing happy path scenarios
- Verifying transaction completion
- Testing order confirmation flows

**Expected behavior:** All will show "✅ Payment Successful"

---

### 3DS CARDS (4 cards - Authentication Tests)

#### Card #10: 4120000000000007 - 3DS Authentication Required
- **Purpose:** Test 3DS authentication flow
- **Expected Result:** Payment waits for 3DS authentication
- **Behavior:** Payment is not immediately completed; requires user to authenticate
- **Use case:** Verify 3DS modal/redirect functionality

#### Card #11: 4230000000000004 - 3DS Declined Before Auth
- **Purpose:** Test card that declines BEFORE authentication
- **Expected Result:** ❌ Immediate decline with error code `generic_decline`
- **Use case:** Handle decline scenarios that happen before auth

#### Card #12: 5234000000000106 - 3DS Declined After Auth
- **Purpose:** Test card that completes auth but then declines
- **Expected Result:** ❌ Declines AFTER successful 3DS authentication
- **Use case:** Test scenarios where auth succeeds but payment fails

#### Card #13: 5123000000000001 - 3DS Optional (Will Pass)
- **Purpose:** Test card where 3DS is optional but supported
- **Expected Result:** ✅ Payment succeeds without 3DS requirement
- **Use case:** Verify fallback to non-3DS processing

---

### SCENARIO CARDS (10 cards - Various Decline Reasons)

#### Card #14: 4200000000000018 - Card Expired ⚠️ SPECIAL
- **Card Number:** 4200000000000018
- **Expiry:** **MUST be 01/20** (January 2020 - past date)
- **CVV:** 123
- **Expected Result:** ❌ Decline with code `card_expired`
- **Error Message:** "The card used has already expired."
- **✅ FIXED:** Validator now correctly checks if expiry date has passed
- **Use case:** Test expired card handling

#### Card #15: 4300000000000017 - Invalid CVC ⚠️ SPECIAL
- **Card Number:** 4300000000000017
- **Expiry:** 12/25
- **CVV:** **MUST be 000** (invalid)
- **Expected Result:** ❌ Decline with code `cvc_invalid`
- **Error Message:** "The inputted CVC/CVN is incorrect for the card number passed."
- **Note:** If you use CVV 123, payment will succeed
- **✅ FIXED:** Validator now correctly detects invalid CVC
- **Use case:** Test CVC validation

#### Card #16: 4400000000000016 - Generic Decline
- **Expected Result:** ❌ Always declines
- **Error Code:** `generic_decline`
- **Use case:** Test generic failure scenarios

#### Card #17: 4500000000000015 - Fraudulent
- **Expected Result:** ❌ Always declines
- **Error Code:** `fraudulent`
- **Use case:** Test fraud detection and handling

#### Card #18: 5100000000000198 - Insufficient Funds
- **Expected Result:** ❌ Always declines
- **Error Code:** `insufficient_funds`
- **Use case:** Test low balance scenarios

#### Card #19: 5200000000000197 - Processor Blocked
- **Expected Result:** ❌ Always declines
- **Error Code:** `processor_blocked`
- **Use case:** Test processor-level blocks

#### Card #20: 5300000000000196 - Lost Card
- **Expected Result:** ❌ Always declines
- **Error Code:** `lost_card`
- **Use case:** Test lost card scenarios

#### Card #21: 5400000000000195 - Stolen Card
- **Expected Result:** ❌ Always declines
- **Error Code:** `stolen_card`
- **Use case:** Test stolen card handling

#### Card #22: 5500000000000194 - Processor Unavailable
- **Expected Result:** ❌ Always declines
- **Error Code:** `processor_unavailable`
- **Use case:** Test service unavailability

#### Card #23: 4600000000000014 - PayMongo Fraud Block
- **Expected Result:** ❌ Always declines
- **Error Code:** `blocked`
- **Use case:** Test PayMongo's fraud detection engine

---

## How the Enhanced Validator Works

### Mobile App (`mobile-app/src/utils/testCardValidator.ts`)
```typescript
validateTestCard(cardNumber, expiryDate, cvv)
```

### Web App (`web/src/utils/utils/testCardValidator.ts`)
```typescript
validateTestCard(cardNumber, expiryDate, cvv)
```

### Validation Flow

1. **Card Lookup:** Validator checks if card exists in test database
2. **Base Validation:** Sets `shouldDecline` based on expected result
3. **Scenario-Specific Checks:**
   - **Expired Card:** Compares expiry date against today
   - **Invalid CVC:** Checks if CVV is exactly "000"
   - **Other Cards:** Uses predefined result

4. **Return Result:**
```typescript
{
  isTestCard: boolean;           // Is this a test card?
  shouldDecline: boolean;        // Should payment decline?
  errorCode?: string;            // PayMongo error code
  errorMessage?: string;         // Human-readable error
  scenario?: string;             // Test scenario name
  requiresAuth?: boolean;        // 3DS required?
}
```

### Console Output

Enhanced validators print detailed logs:

```
════════════════════════════════════════════════════════════════════════════════
🔍 [MOBILE/WEB] TEST CARD VALIDATION
Card: 4200000000000018 | Expiry: 01/20 | CVC: 123
════════════════════════════════════════════════════════════════════════════════
📊 Total test cards in database: 23
✅ TEST CARD FOUND: Card Expired
   Brand: Visa | Type: credit
   Expected Result: decline

📋 SCENARIO-SPECIFIC VALIDATION:

🕐 Card Expired (4200000000000018)
   Input expiry: 01/20
   Parsed date: 2020-01-31 (end of month)
   Today: 2026-04-16
   Is expired? true
   ✓ WILL DECLINE with code: card_expired

════════════════════════════════════════════════════════════════════════════════
📊 FINAL VALIDATION RESULT:
   isTestCard: true
   shouldDecline: true
   errorCode: card_expired
   errorMessage: The card used has already expired.
   requiresAuth: false
════════════════════════════════════════════════════════════════════════════════
```

---

## Testing Checklist

### Basic Success Flow
- [ ] Test card #1-9: All should succeed
- [ ] Verify order confirmation page displays
- [ ] Verify transaction is marked as successful

### 3DS Flow
- [ ] Test card #10: Should show 3DS authentication modal
- [ ] Test card #11: Should decline immediately
- [ ] Test card #12: Should show 3DS but decline after auth
- [ ] Test card #13: Should succeed without 3DS

### Decline Scenarios
- [ ] Test card #14: Expired card with 01/20 expiry
- [ ] Test card #15: Invalid CVC with "000" CVV
- [ ] Test cards #16-23: Various decline reasons
- [ ] Verify error message displays correctly
- [ ] Verify transaction is marked as failed
- [ ] Verify user can retry

### Edge Cases
- [ ] Card #14 with VALID expiry (e.g., 12/25): Should succeed
- [ ] Card #15 with VALID CVV (e.g., 123): Should succeed
- [ ] Invalid card numbers: Should not be recognized

---

## Integration Points

### Mobile Payment Service
📁 `mobile-app/src/services/payMongoService.ts`

The validator is called before PayMongo API:
```typescript
const validation = validateTestCard(
  sanitizedCardNumber,
  expiryForValidator,
  request.cardDetails.cvc
);

if (!validation.isTestCard) {
  // Proceed with real PayMongo
} else if (validation.shouldDecline) {
  // Mark transaction failed with error
  throw new Error(validation.errorMessage);
} else {
  // Test card passed, proceed normally
}
```

### Web Payment Service
📁 `web/src/services/payMongoService.ts`

Same integration as mobile version.

---

## Debugging Guide

### Issue: Card shows "Payment Successful" when it should decline

**Check 1: Is it a test card?**
- Look for console log: `✅ TEST CARD FOUND`
- If you see `⚠️ CARD NOT FOUND`, card number is wrong

**Check 2: Card #14 (Expired Card)**
- Must use expiry **01/20** (not 12/25)
- Validator checks if 01/20 (Jan 2020) is before today
- Look for: `🕐 Card Expired` section in logs

**Check 3: Card #15 (Invalid CVC)**
- Must use CVV **000** (not 123)
- Any other CVV will succeed
- Look for: `🔐 Invalid CVC` section in logs

**Check 4: Validation not being used**
- Ensure payment service imports `validateTestCard`
- Check that validator is called BEFORE PayMongo API
- Search logs for: `[MOBILE/WEB] TEST CARD VALIDATION`

### Issue: Tests were passing before but failing now

The validator was significantly enhanced to handle all 23 scenarios properly. If tests were passing without proper validation, they would now fail correctly.

---

## Best Practices

1. **Always use the provided test cards** when testing payment flows
2. **Use expiry date 01/20 for expired card tests** - don't modify it
3. **Use CVV 000 for invalid CVC tests** - don't use other values
4. **Check console logs** for detailed validation output
5. **Test all 23 scenarios** before releasing
6. **Keep test card data current** - don't hardcode card numbers in UI

---

## PayMongo Documentation

For more information, see: https://developers.paymongo.com/docs/testing

---

## Support

For issues or questions about test card validation:

1. Check console logs for detailed validation output
2. Verify card number and expiry date match test card data
3. Ensure validator is being called in payment service
4. Review this guide for expected behavior

---

**Table of Contents:**
- [Quick Reference Table](#quick-reference-table)
- [Detailed Scenario Descriptions](#detailed-scenario-descriptions)
- [How the Enhanced Validator Works](#how-the-enhanced-validator-works)
- [Testing Checklist](#testing-checklist)
- [Integration Points](#integration-points)
- [Debugging Guide](#debugging-guide)
- [Best Practices](#best-practices)
