# Developer Verification Checklist

**Date**: 2025-04-16  
**Implementation**: PayMongo Test Card Integration  
**Status**: Ready for Verification  

---

## 📋 Pre-Verification Steps

### Code Review
- [ ] All files created in correct locations
- [ ] No syntax errors
- [ ] Imports are correct
- [ ] No console warnings or errors

### File Checklist
- [ ] `/web/src/services/paymongoTestCards.ts` exists
- [ ] `/web/src/pages/PaymentSuccessPage.tsx` exists
- [ ] `/web/src/pages/PaymentFailurePage.tsx` exists
- [ ] `/web/src/pages/CheckoutPage.tsx` updated with imports
- [ ] `/web/src/App.tsx` updated with routes

### Verify Integrations
```bash
# Check imports in CheckoutPage
$ grep -n "paymongoTestCards" web/src/pages/CheckoutPage.tsx
# Should return: import { detectTestCard, getPaymentErrorRedirectUrl }

# Check routes in App.tsx
$ grep -n "payment-success\|payment-failure" web/src/App.tsx
# Should return: 2 route definitions
```

---

## 🚀 Testing Procedures

### Test 1: Success Card Flow
**Objective**: Verify success page displays correctly

**Steps**:
1. Navigate to `http://localhost:3000/checkout`
2. Fill all required fields
   - Name: Juan Dela Cruz
   - Address: 123 Main St, Manila
   - City: Manila
   - Phone: 0912345678
3. Select "PayMongo" as payment method
4. Card Number: `4343434343434345` (success card)
5. Expiry: `12/25`
6. CVC: `123`
7. Click "Place Order"
8. Observe: Checkout form should process without error
9. Expected: Should navigate to `/order/{id}` or `/payment-success`

**Success Criteria**:
- ✅ No console errors
- ✅ Toast appears (optional)
- ✅ Navigation works smoothly
- ✅ Order page displays

---

### Test 2: Error Card Flow  
**Objective**: Verify error page displays with correct message

**Steps**:
1. Navigate to `http://localhost:3000/checkout`
2. Fill all required fields (same as Test 1)
3. Select "PayMongo" as payment method
4. Card Number: `4200000000000018` (expired card)
5. Expiry: `12/25` (must be future, even for expired card test)
6. CVC: `123`
7. Click "Place Order"
8. Observe: Toast should appear saying "Test Card - Payment Would Fail"
9. Wait 1.5 seconds
10. Expected: Page should redirect to `/payment-failure`

**Success Criteria**:
- ✅ Toast appears with test card message
- ✅ Redirect happens after 1.5 seconds
- ✅ Error page loads
- ✅ Shows "Card Expired" message
- ✅ Red/color-coded styling
- ✅ Try Again button works
- ✅ Support contact visible

**Screenshot**: Take screenshot of error page

---

### Test 3: Error Message Variations
**Objective**: Test different error types

**Run these 5 tests**:

| Card # | Expected Error | Check |
|--------|---|---|
| 4300000000000017 | Invalid CVC | Amber color |
| 4500000000000015 | Fraudulent | Red color + warning |
| 5100000000000198 | Insufficient Funds | Orange color |
| 4600000000000014 | PayMongo Blocked | Red color + support CTA |
| 5500000000000194 | Processor Down | Yellow color + retry advice |

**For Each**:
1. Go to checkout
2. Enter test card
3. Submit form
4. Verify error page loads
5. Note: Color, message, recommendations
6. Click "Try Again" → should return to checkout with form cleared
7. Click "Return to Shop" → should navigate to `/shop`

---

### Test 4: 3D Secure Card
**Objective**: Verify 3DS detection

**Steps**:
1. Navigate to checkout
2. Card Number: `4120000000000007` (3DS required)
3. Expiry: `12/25`
4. CVC: `123`
5. Click "Place Order"

**Expected**:
- ✅ Toast: "3DS Authentication Required"
- ✅ Return to checkout (3DS flow not fully implemented yet)

---

### Test 5: Mobile Responsiveness
**Objective**: Verify pages work on mobile

**For Success Page**:
1. Navigate to payment success page
2. Simulate mobile (DevTools, 375px width)
3. Check:
   - ✅ Layout is vertical stack
   - ✅ Text is readable
   - ✅ Buttons are full-width
   - ✅ Order info visible
   - ✅ Action buttons working

**For Failure Page**:
1. Navigate to payment failure page
2. Simulate mobile (DevTools, 375px width)
3. Check:
   - ✅ Layout is vertical stack
   - ✅ Error icon visible
   - ✅ Message clear
   - ✅ Recommendations readable
   - ✅ Buttons working

---

### Test 6: Copy-to-Clipboard
**Objective**: Verify order number copying works

**Steps**:
1. Navigate to success page
2. See order number (e.g., "#TXNO8IRI0F5")
3. Click on order number
4. Open a text editor
5. Paste (Ctrl+V / Cmd+V)
6. Expected: Order number is in clipboard

**Success Criteria**:
- ✅ Button click registers
- ✅ Text copies to clipboard
- ✅ Can paste successfully

---

### Test 7: Navigation Links
**Objective**: Verify all navigation works

**Success Page**:
- ✅ Track Order → navigates to `/orders`
- ✅ Continue Shopping → navigates to `/shop`
- ✅ Share button → opens native share (mobile) or alert (desktop)

**Failure Page**:
- ✅ Try Again → navigates to `/checkout` with form cleared
- ✅ Return to Shop → navigates to `/shop`
- ✅ Contact Support → triggers email client or support chat

---

### Test 8: URL Parameter Handling
**Objective**: Verify URL encoding/decoding

**Success Page**:
1. Manually construct URL with success data:
```
/payment-success?data=eyJvcmRlck51bWJlciI6IiNVQkFYWEc1TjQiLCJhbW91bnQiOjEwMDAsImJhemNvaW5zRWFybmVkIjoxMDAsInBheW1lbnRNZXRob2QiOiJwYXltb25nbyIsImVtYWlsIjoiY3VzdG9tZXJAYmF6YWFyeC5waCJ9
```
2. Navigate to this URL
3. Expected: Page loads and displays data correctly
4. Check console: No errors decoding

**Failure Page**:
1. Manually construct URL with error data:
```
/payment-failure?data=eyJ0eXBlIjoiY2FyZF9leHBpcmVkIiwiYW1vdW50IjoxMDAwLCJvcmRlck51bWJlciI6Ik9SRC0yMDI1MDQxNjEyMzQ1NiIsImVtYWlsIjoiY3VzdG9tZXJAYmF6YWFyeC5waCJ9
```
2. Navigate to this URL
3. Expected: Page loads and displays error correctly
4. Check console: No errors decoding

---

### Test 9: Browser Console (Development Mode)
**Objective**: Verify dev features work

**Steps**:
1. Open Browser DevTools (F12)
2. Go to Console tab
3. Paste:
```javascript
import { detectTestCard } from '@/services/paymongoTestCards';
detectTestCard('4343434343434345');
```

**Expected Output**:
```javascript
{
  isTestCard: true,
  scenario: 'successful_visa',
  type: 'success',
  description: 'Visa - Successful payment'
}
```

**Test Error Card**:
```javascript
detectTestCard('4200000000000018');
```

**Expected Output**:
```javascript
{
  isTestCard: true,
  scenario: 'card_expired',
  type: 'error',
  errorCode: 'card_expired',
  description: 'Card has already expired'
}
```

---

### Test 10: Page Accessibility (DevTools Audit)
**Objective**: Ensure pages are accessible

**For Each Page**:
1. Open Lighthouse in DevTools
2. Run Accessibility audit
3. Expected: Score > 90
4. Check: WCAG AA compliance

**Manual Checks**:
- [ ] Tab through page (keyboard navigation)
- [ ] All buttons have focus indicators
- [ ] Color not sole indicator of status
- [ ] Text has sufficient contrast

---

## 🔍 Browser Testing

### Chrome
```bash
npm start  # or your dev command
# Navigate to localhost:3000
# Test all scenarios above
# Press F12 for DevTools
```

### Firefox
```bash
# Same as Chrome
```

### Safari (Mac)
```bash
# Same as Chrome  
# Option+Cmd+I for DevTools
```

### Edge (Windows)
```bash
# Same as Chrome
# F12 for DevTools
```

### Mobile Chrome (Android)
```bash
# Use Android emulator or actual device
# DevTools: chrome://inspect
# Test all scenarios
```

### Mobile Safari (iOS)
```bash
# Use iOS simulator or actual device
# Develop menu → Safari settings
# Enable Web Inspector
# Test all scenarios
```

---

## 🐛 Troubleshooting

### Issue: Cards not detected
**Check**:
- [ ] Exact card number matches (no spaces)
- [ ] paymongoTestCards.ts file exists
- [ ] Import statement correct in CheckoutPage
- [ ] No syntax errors in service file

**Fix**: Verify file exists at `/web/src/services/paymongoTestCards.ts`

### Issue: Routes not working
**Check**:
- [ ] Routes added to App.tsx
- [ ] Imports added to App.tsx
- [ ] Lazy loading syntax correct
- [ ] No typos in route paths

**Fix**: 
```typescript
// In App.tsx, verify:
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccessPage"));
const PaymentFailurePage = lazy(() => import("./pages/PaymentFailurePage"));

// In Routes:
<Route path="/payment-success" element={<PaymentSuccessPage />} />
<Route path="/payment-failure" element={<PaymentFailurePage />} />
```

### Issue: Page content not rendering
**Check**:
- [ ] No console errors
- [ ] Components exported as default
- [ ] All imports correct
- [ ] CSS classes exist

**Fix**: Check browser console (F12) for errors

### Issue: Toast not appearing
**Check**:
- [ ] Toast component imported
- [ ] useToast hook called
- [ ] Toast provider in root component

**Fix**: Verify toast is configured in your app

### Issue: Redirect not happening  
**Check**:
- [ ] navigate() hook used correctly
- [ ] React Router setup correct
- [ ] Routes defined in App.tsx
- [ ] No errors in console

**Fix**: Check console for navigation errors

---

## ✅ Sign-Off Verification

### Developer Sign-Off
- [ ] All code reviewed
- [ ] All tests passing
- [ ] No console errors
- [ ] Ready for QA

### QA Sign-Off
- [ ] All test cases passed
- [ ] Mobile tested
- [ ] Accessibility checked
- [ ] Performance acceptable
- [ ] Ready for production

### Product Manager Sign-Off
- [ ] Meets requirements
- [ ] UX matches design
- [ ] Documentation complete
- [ ] Ready for release

---

## 📊 Test Results Template

```
Implementation: PayMongo Test Card Integration
Date: ___________
Tester: ___________
Status: [ ] Pass [ ] Fail

Test Results:
- Test 1 (Success Card): [ ] Pass [ ] Fail
- Test 2 (Error Card): [ ] Pass [ ] Fail
- Test 3 (Error Variations): [ ] Pass [ ] Fail
- Test 4 (3DS Card): [ ] Pass [ ] Fail
- Test 5 (Mobile): [ ] Pass [ ] Fail
- Test 6 (Copy-to-Clipboard): [ ] Pass [ ] Fail
- Test 7 (Navigation): [ ] Pass [ ] Fail
- Test 8 (URL Params): [ ] Pass [ ] Fail
- Test 9 (Console): [ ] Pass [ ] Fail
- Test 10 (Accessibility): [ ] Pass [ ] Fail

Issues Found:
1. ___________
2. ___________
3. ___________

Overall Status: [ ] Pass [ ] Fail

Notes:
_____________________
_____________________
```

---

## 🎯 Final Checklist

### Prerequisites
- [ ] Node.js installed
- [ ] React app running
- [ ] All dependencies installed
- [ ] No build errors

### Implementation
- [ ] Files created in correct locations
- [ ] Imports added where needed
- [ ] Routes configured
- [ ] No TypeScript errors
- [ ] No console warnings

### Testing
- [ ] All 10 test scenarios completed
- [ ] Mobile tested
- [ ] Browser compatibility verified
- [ ] Accessibility audit passed

### Documentation
- [ ] PAYMONGO_TEST_CARDS_GUIDE.md reviewed
- [ ] PAYMENT_SCENARIOS_QUICK_REFERENCE.md reviewed
- [ ] IMPLEMENTATION_SUMMARY.md reviewed
- [ ] This checklist completed

### Deployment Ready
- [ ] Code review complete
- [ ] All tests passing
- [ ] No breaking changes
- [ ] Ready to merge
- [ ] Ready to deploy

---

**Status**: ✅ Ready for Verification  
**Date**: April 16, 2025  
**Version**: 1.0  

Print this checklist and use it to verify all functionality works correctly before deploying to production.

---

**Questions?** See the documentation files or check PayMongo's official testing guide: https://developers.paymongo.com/docs/testing
