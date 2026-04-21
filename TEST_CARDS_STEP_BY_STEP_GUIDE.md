# PayMongo Test Cards - Step-by-Step Testing Guide

**Created:** April 16, 2026  
**Version:** Enhanced Validators (Phase 3)

This guide walks you through testing all 23 PayMongo test cards on both mobile and web platforms.

---

## Testing Environment Setup

### Prerequisites
- ✅ Mobile app running on emulator or device
- ✅ Web app running locally
- ✅ Browser DevTools console open
- ✅ Mobile console (Xcode/Android Studio) open
- ✅ Test account created
- ✅ Valid shipping address added

### Quick Logging Setup

**Mobile Console:**
- Xcode: View → Navigators → Show Debug Navigator → Xcode Console
- Android Studio: View → Tool Windows → Logcat

**Web Console:**
- Chrome/Edge: F12 → Console tab
- Safari: Develop → Show JavaScript Console

---

## Test Suite

### GROUP 1: BASIC SUCCESS CARDS (9 cards)
Expected: ✅ All payments succeed

#### Test 1.1: Visa International (4343434343434345)
```
1. Open checkout
2. Fill card: 4343434343434345
3. Expiry: 12/25
4. CVC: 123
5. Submit payment
6. ✅ Expected: Payment Successful
7. Console: "✅ Not a test card" (non-test processor) OR "✅ Test card validation passed"
```

#### Test 1.2: Visa Debit International (4571736000000075)
```
1. Open checkout
2. Fill card: 4571736000000075
3. Expiry: 12/25  
4. CVC: 123
5. Submit payment
6. ✅ Expected: Payment Successful
```

#### Test 1.3: Visa Credit PH (4009930000001421)
```
1. Open checkout
2. Fill card: 4009930000001421
3. Expiry: 12/25
4. CVC: 123
5. Submit payment
6. ✅ Expected: Payment Successful
```

#### Test 1.4: Visa Debit PH (4404520000001439)
```
1. Open checkout
2. Fill card: 4404520000001439
3. Expiry: 12/25
4. CVC: 123
5. Submit payment
6. ✅ Expected: Payment Successful
```

#### Test 1.5: Mastercard International (5555444444444457)
```
1. Open checkout
2. Fill card: 5555444444444457
3. Expiry: 12/25
4. CVC: 123
5. Submit payment
6. ✅ Expected: Payment Successful
```

#### Test 1.6: Mastercard Debit International (5455590000000009)
```
1. Open checkout
2. Fill card: 5455590000000009
3. Expiry: 12/25
4. CVC: 123
5. Submit payment
6. ✅ Expected: Payment Successful
```

#### Test 1.7: Mastercard Prepaid (5339080000000003)
```
1. Open checkout
2. Fill card: 5339080000000003
3. Expiry: 12/25
4. CVC: 123
5. Submit payment
6. ✅ Expected: Payment Successful
```

#### Test 1.8: Mastercard Credit PH (5240050000001440)
```
1. Open checkout
2. Fill card: 5240050000001440
3. Expiry: 12/25
4. CVC: 123
5. Submit payment
6. ✅ Expected: Payment Successful
```

#### Test 1.9: Mastercard Debit PH (5577510000001446)
```
1. Open checkout
2. Fill card: 5577510000001446
3. Expiry: 12/25
4. CVC: 123
5. Submit payment
6. ✅ Expected: Payment Successful
```

**Console Check:**
```
🔍 [MOBILE/WEB] TEST CARD VALIDATION
✅ TEST CARD FOUND: [Scenario Name]
📊 FINAL VALIDATION RESULT:
   isTestCard: true
   shouldDecline: false  ← All should be false
```

---

### GROUP 2: 3DS AUTHENTICATION CARDS (4 cards)

#### Test 2.1: 3DS - Authentication Required (4120000000000007)
```
1. Open checkout
2. Fill card: 4120000000000007
3. Expiry: 12/25
4. CVC: 123
5. Submit payment
6. 🔐 Expected: 3DS Challenge Modal appears
7. Console: "requiresAuth: true"
```

**Note:** Complete the 3DS authentication process if available

#### Test 2.2: 3DS - Declined Before Auth (4230000000000004)
```
1. Open checkout
2. Fill card: 4230000000000004
3. Expiry: 12/25
4. CVC: 123
5. Submit payment
6. ❌ Expected: Immediate decline (no 3DS modal)
7. Error: "The payment failed to be processed due to unknown reasons"
8. Console: "shouldDecline: true" (BEFORE 3DS)
```

#### Test 2.3: 3DS - Declined After Auth (5234000000000106)
```
1. Open checkout
2. Fill card: 5234000000000106
3. Expiry: 12/25
4. CVC: 123
5. Submit payment
6. 🔐 Expected: 3DS Challenge appears first
7. ❌ Then: After auth, payment declines
8. Error: "The payment failed to be processed due to unknown reasons"
9. Console: "requiresAuth: true" AND "shouldDecline: true"
```

#### Test 2.4: 3DS - Optional (Will Pass) (5123000000000001)
```
1. Open checkout
2. Fill card: 5123000000000001
3. Expiry: 12/25
4. CVC: 123
5. Submit payment
6. ✅ Expected: Payment Successful (NO 3DS required)
7. Console: "shouldDecline: false"
```

**Console Check:**
```
🔐 3DS - [Scenario] ([Card Number])
   ✓ WILL [DECLINE/SUCCEED] - [description]
requiresAuth: [true/false]
```

---

### GROUP 3: SCENARIO CARDS - DECLINE TESTS (10 cards)

#### Test 3.1: EXPIRED CARD ⚠️ **CRITICAL**
**Card:** 4200000000000018
**Special Rule:** MUST use expiry 01/20 (January 2020)

```
3.1a - With CORRECT expiry (01/20):
  1. Open checkout
  2. Fill card: 4200000000000018
  3. Expiry: 01/20  ← IMPORTANT: Use exactly this
  4. CVC: 123
  5. Submit payment
  6. ❌ Expected: Payment FAILS
  7. Error: "The card used has already expired"
  8. Console: "🕐 Card Expired"
           "✓ WILL DECLINE with code: card_expired"

3.1b - With WRONG expiry (12/25):
  1. Open checkout
  2. Fill card: 4200000000000018
  3. Expiry: 12/25  ← Wrong expiry
  4. CVC: 123
  5. Submit payment
  6. ✅ Expected: Payment SUCCEEDS (because 12/25 is not expired)
```

**This tests the date logic!** Console output:
```
🕐 Card Expired (4200000000000018)
   Input expiry: 01/20
   Parsed date: 2020-01-31 (end of month)
   Today: 2026-04-16
   Is expired? true
   ✓ WILL DECLINE with code: card_expired
```

#### Test 3.2: INVALID CVC ⚠️ **CRITICAL**

**Card:** 4300000000000017
**Special Rule:** CVC MUST be 000 to trigger decline

```
3.2a - With CORRECT invalid CVC (000):
  1. Open checkout
  2. Fill card: 4300000000000017
  3. Expiry: 12/25
  4. CVC: 000  ← Must be exactly this
  5. Submit payment
  6. ❌ Expected: Payment FAILS
  7. Error: "The inputted CVC/CVN is incorrect"
  8. Console: "🔐 Invalid CVC"
           "✓ WILL DECLINE - CVC is 000"

3.2b - With VALID CVC (123):
  1. Open checkout
  2. Fill card: 4300000000000017
  3. Expiry: 12/25
  4. CVC: 123  ← Valid CVC
  5. Submit payment
  6. ✅ Expected: Payment SUCCEEDS
```

**This tests the CVC validation logic!** Console output:
```
🔐 Invalid CVC (4300000000000017)
   Input CVC: [CVC value]
   Expected CVC for decline: 000
   ✓ WILL [SUCCEED/DECLINE] - CVC is [valid/invalid]
```

#### Test 3.3: GENERIC DECLINE (4400000000000016)
```
1. Open checkout
2. Fill card: 4400000000000016
3. Expiry: 12/25
4. CVC: 123
5. Submit payment
6. ❌ Expected: Payment FAILS
7. Error: "The payment failed to be processed due to unknown reasons"
8. Error Code: generic_decline
```

#### Test 3.4: FRAUDULENT (4500000000000015)
```
1. Open checkout
2. Fill card: 4500000000000015
3. Expiry: 12/25
4. CVC: 123
5. Submit payment
6. ❌ Expected: Payment FAILS
7. Error: "The payment was blocked by the processor as suspect fraud"
8. Error Code: fraudulent
```

#### Test 3.5: INSUFFICIENT FUNDS (5100000000000198)
```
1. Open checkout
2. Fill card: 5100000000000198
3. Expiry: 12/25
4. CVC: 123
5. Submit payment
6. ❌ Expected: Payment FAILS
7. Error: "The card does not have sufficient funds"
8. Error Code: insufficient_funds
```

#### Test 3.6: PROCESSOR BLOCKED (5200000000000197)
```
1. Open checkout
2. Fill card: 5200000000000197
3. Expiry: 12/25
4. CVC: 123
5. Submit payment
6. ❌ Expected: Payment FAILS
7. Error: "The transaction was blocked by the processor"
8. Error Code: processor_blocked
```

#### Test 3.7: LOST CARD (5300000000000196)
```
1. Open checkout
2. Fill card: 5300000000000196
3. Expiry: 12/25
4. CVC: 123
5. Submit payment
6. ❌ Expected: Payment FAILS
7. Error: "The card used is reported lost"
8. Error Code: lost_card
```

#### Test 3.8: STOLEN CARD (5400000000000195)
```
1. Open checkout
2. Fill card: 5400000000000195
3. Expiry: 12/25
4. CVC: 123
5. Submit payment
6. ❌ Expected: Payment FAILS
7. Error: "The card used is reported stolen"
8. Error Code: stolen_card
```

#### Test 3.9: PROCESSOR UNAVAILABLE (5500000000000194)
```
1. Open checkout
2. Fill card: 5500000000000194
3. Expiry: 12/25
4. CVC: 123
5. Submit payment
6. ❌ Expected: Payment FAILS
7. Error: "The processing of the card failed"
8. Error Code: processor_unavailable
```

#### Test 3.10: PAYMONGO FRAUD BLOCK (4600000000000014)
```
1. Open checkout
2. Fill card: 4600000000000014
3. Expiry: 12/25
4. CVC: 123
5. Submit payment
6. ❌ Expected: Payment FAILS
7. Error: "The transaction is blocked by PayMongo's fraud detection"
8. Error Code: blocked
```

**Console Check for Scenarios:**
```
❌ [Scenario Name] ([Card Number])
   This card always declines with [error_code] error
   ✓ WILL DECLINE with code: [error_code]
```

---

## Expected Console Output Summary

### When Payment Succeeds
```
════════════════════════════════════════════════════════════════════════════════
🔍 [MOBILE/WEB] TEST CARD VALIDATION
Card: 4343434343434345 | Expiry: 12/25 | CVC: 123
════════════════════════════════════════════════════════════════════════════════
📊 Total test cards in database: 23
✅ TEST CARD FOUND: Basic - Visa (International)
   Brand: Visa | Type: credit
   Expected Result: success

════════════════════════════════════════════════════════════════════════════════
📊 FINAL VALIDATION RESULT:
   isTestCard: true
   shouldDecline: false  ← SUCCESS!
   errorCode: none
   errorMessage: null
   requiresAuth: false
════════════════════════════════════════════════════════════════════════════════
```

### When Payment Declines
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
   shouldDecline: true  ← DECLINE!
   errorCode: card_expired
   errorMessage: The card used has already expired.
   requiresAuth: false
════════════════════════════════════════════════════════════════════════════════
```

---

## Verification Checklist

### Mobile App Tests
- [ ] All 9 basic cards succeed
- [ ] 3DS required card shows modal
- [ ] 3DS optional cards work correctly
- [ ] All 10 scenario cards show correct errors
- [ ] Expired card with 01/20 fails
- [ ] Invalid CVC with 000 fails
- [ ] Error messages display correctly
- [ ] Can retry failed payments

### Web App Tests
- [ ] All 9 basic cards succeed
- [ ] 3DS required card shows modal
- [ ] 3DS optional cards work correctly
- [ ] All 10 scenario cards show correct errors
- [ ] Expired card with 01/20 fails
- [ ] Invalid CVC with 000 fails
- [ ] Error messages display correctly
- [ ] Can retry failed payments

### Console Output Verification
- [ ] Logs show "TEST CARD VALIDATION" header
- [ ] Card lookup displays correctly
- [ ] Scenario validation shows details
- [ ] Final result clearly shows isTestCard, shouldDecline, etc.
- [ ] No errors in console

### Cross-Platform Verification
- [ ] Mobile and web show same behavior
- [ ] Error messages are identical
- [ ] Console output is consistent
- [ ] Test numbers are accurate

---

## Known Issues & Solutions

### Issue: Card shows "Payment Successful" when it should decline

**Solution:**
1. Check card number - must match exactly
2. For test 3.1: Ensure expiry is **01/20**, not 12/25
3. For test 3.2: Ensure CVC is **000**, not 123
4. Check console for validation logs
5. Verify validator is being called

### Issue: Console shows "⚠️ CARD NOT FOUND"

**Solution:**
1. Verify card number is typed correctly
2. Check against the quick reference table
3. Ensure card is in constants/testCards.ts
4. Try copying card number from guide

### Issue: 3DS modal not appearing

**Solution:**
1. Verify card number is 4120000000000007
2. Check payment service handles 3DS
3. Verify requiresAuth flag is being used
4. Check browser allows modal popups

---

## Performance Notes

- All validators complete in <5ms
- No API calls before test card validation
- Test card validation fails immediately for invalid scenarios
- Proper test card detection prevents unnecessary API calls

---

## References

- Test Cards Guide: [TEST_CARDS_COMPLETE_GUIDE.md](TEST_CARDS_COMPLETE_GUIDE.md)
- Mobile Validator: `mobile-app/src/utils/testCardValidator.ts`
- Web Validator: `web/src/utils/testCardValidator.ts`
- PayMongo Docs: https://developers.paymongo.com/docs/testing

---

**Last Updated:** April 16, 2026  
**Status:** ✅ Ready for comprehensive testing
