---
description: "Project-wide AI assistant standard for BAZAARX. Governs all prompts, planning, and code generation."
---

# BAZAARX — AI Assistant Standard

## Project Context

- **Project**: BAZAARX — a full-stack marketplace platform
- **Developer**: Full-stack developer (sole owner of all decisions)
- **Stack**: React.js + Vite (web), Expo React Native (mobile), Supabase (backend/database)
- **Structure**: `web/` (web app), `mobile-app/` (mobile app), `supabase/` (database/functions)

---

## Global Rules (Apply to Every Prompt)

- Keep implementations **simple** — do not over-architect
- Make **only the changes requested** — do not refactor unrelated code
- Do **not** add unnecessary comments, docstrings, or type annotations to untouched code
- Do **not** create new files unless strictly necessary — prefer editing existing files
- Always consider **security** (OWASP Top 10) and **accessibility** in every change
- Never start implementation without the developer's explicit permission when a plan is involved
- When in doubt, **ask** before assuming scope

---

## Workflow: When to Use Each Standard

### Planning a Feature or Change → Follow `plan.md`

When the request involves designing, scoping, or planning new functionality:

1. Read `plan.md` for the full planning standard
2. Output the plan into `/docs/plans/<requirement_name>.plan.md`
3. Iterate with the developer until the plan is approved
4. **Do NOT implement until given permission**

### Implementing / Generating Code → Follow `codegen.md`

When the request involves writing, modifying, or generating actual code:

1. Read `codegen.md` for the full code generation standard
2. Work step-by-step through the implementation plan (if one exists)
3. Limit changes to **no more than 20 files per step**
4. End each step with a summary and any required user instructions

---

## Project Conventions

- Environment variables live in `.env` — never commit them
- Supabase migrations go in `supabase-migrations/`
- Shared documentation goes in `docs/`
- Plans go in `docs/plans/`
- Always validate against the existing database schema before modifying Supabase queries
- Mobile and web share Supabase as the single source of truth — keep logic consistent across both

---

## Files Excluded from Git

The following files are local AI standards and are **never committed**:

- `general.md`
- `plan.md`
- `codegen.md`

---

## Session Log — April 22, 2026

### Mobile Checkout Screen Card Input Enhancement

**Status:** ✅ COMPLETE

**Objective:** Enhance the PayMongo card entry flow on mobile checkout by providing an intuitive "Add Card Details" button when no saved cards exist, with automatic card saving after successful payment.

**Problems Identified:**

1. **Confusing Card Entry Flow**: When users had no saved PayMongo cards, they saw a passive message saying "Enter your card details on the next screen after clicking 'Place Order'" with no clear CTA
2. **No Card Persistence**: Manually entered cards were not being saved to Payment Methods after successful payment, requiring users to re-enter them for future orders
3. **Unclear Alert Messages**: Alert for missing saved cards mentioned "Use Different Card" but that button didn't exist from the new flow
4. **Test Card Handling**: No distinction between test cards (autofilled) and real cards (manually entered), causing test data to be saved

**Root Causes:**

- CheckoutScreen had a passive info box instead of an actionable card entry button
- PaymentGatewayScreen had no logic to save successfully entered cards to Payment Methods
- No mechanism to differentiate between autofilled test cards and manually entered real cards

**Solution Implemented:**

### Part 1: Active Card Entry Button in CheckoutScreen

**Problem:** Users with no saved PayMongo cards couldn't easily understand how to add a card

**Solution:** Added an "Add Card Details" button with full checkout validation and flow:

**Changes in [mobile-app/app/CheckoutScreen.tsx](mobile-app/app/CheckoutScreen.tsx):**

1. **Updated Alert Message** (Line 2001-2006):
   - Old: "Please select a saved card or click 'Use Different Card' to enter a new card."
   - New: "Please click 'Add Card Details' to add a new card, or if you have saved cards, select one above."
   - Uses proper `Alert` structure with OK button

2. **Replaced Info Box with Interactive Button** (Lines 2777-2986):
   - Removed plain text message box
   - Added gradient info card with CreditCard icon
   - Created "Add Card Details" Pressable button
   - Button includes full validation:
     - ✅ User authentication check
     - ✅ Delivery address validation
     - ✅ Seller ID validation
   - Button creates complete checkout payload with all order details
   - Calls `processCheckout()` to create the order in database
   - Navigates to PaymentGateway with `isQuickCheckout: false` flag

3. **Styling Enhancement**:
   - LinearGradient background (#E0F2FE to #F0F9FF)
   - Blue border (1.5px, #0EA5E9)
   - Informative text: "No Saved Cards Yet"
   - CreditCard icon for visual clarity

**Files Modified:**
- [mobile-app/app/CheckoutScreen.tsx](mobile-app/app/CheckoutScreen.tsx#L1998-L2986)

---

### Part 2: Automatic Card Saving in PaymentGatewayScreen

**Problem:** When users entered a new card successfully, it wasn't saved to Payment Methods for future use

**Solution:** Added card persistence logic after successful payment

**Changes in [mobile-app/app/PaymentGatewayScreen.tsx](mobile-app/app/PaymentGatewayScreen.tsx):**

1. **Added Manual Entry Tracking** (Line 77):
   ```typescript
   const [isManualEntry, setIsManualEntry] = useState(true);
   ```
   - Tracks whether card was manually typed or autofilled from test cards
   - Defaults to `true` (assumes manual entry)

2. **Test Card Autofill Updates** (Lines 513-514, 533-534):
   - When user selects a test card (success or error), set `isManualEntry(false)`
   - Prevents test cards from being saved to Payment Methods

3. **Manual Entry Tracking on User Input** (Lines 563-565, 605-608, 627-630, 650-653):
   - When user types in card number field: `setIsManualEntry(true)`
   - When user types in expiry field: `setIsManualEntry(true)`
   - When user types in CVV field: `setIsManualEntry(true)`
   - When user types in name field: `setIsManualEntry(true)`

4. **Automatic Card Saving After Payment** (Lines 309-340):
   - After successful payment, checks if:
     - `isManualEntry` is true (user typed the card)
     - `showCardForm` is true (card form was shown)
     - `cardName !== 'TEST CARD'` (not a test card)
   - If conditions met:
     - Retrieves existing saved cards
     - Determines if this should be default card (`isFirstCard`)
     - Calls `paymentMethodService.savePaymentMethod()` with:
       - User ID
       - Card data (number, name, expiry, CVV)
       - Default flag
     - Shows success alert: "Your card has been saved to Payment Methods for future purchases."
   - If save fails:
     - Doesn't throw error (payment already succeeded)
     - Shows info alert: "Payment successful, but card could not be saved. You can add it later in Payment Methods."

**Imports Added:**
- `useAuthStore` — Get current user
- `paymentMethodService` — Save card data

**Files Modified:**
- [mobile-app/app/PaymentGatewayScreen.tsx](mobile-app/app/PaymentGatewayScreen.tsx#L31-L32, L77, L309-L340, L513-L514, L533-L534, L563-L565, L605-L608, L627-L630, L650-L653)

---

### User Experience Flow

**Before:**
```
1. User at checkout with no saved cards
2. Sees message: "Enter your card details on the next screen"
3. Clicks "Place Order"
4. PaymentGateway opens with card form
5. User enters card
6. Payment succeeds
7. Card is NOT saved (user must re-enter next time)
```

**After:**
```
1. User at checkout with no saved cards
2. Sees "Add Card Details" button (clear CTA)
3. Clicks "Add Card Details"
4. Order created in database
5. PaymentGateway opens with card form
6. User enters card (tracked as manual entry)
7. Payment succeeds
8. Card automatically saved to Payment Methods
9. Card available for future orders
```

**Test Card Scenario:**
```
1. User at PaymentGateway card form
2. Clicks test card shortcut (e.g., "✓ Success")
3. Card auto-filled (isManualEntry = false)
4. Payment succeeds
5. Card is NOT saved (was just for testing)
6. User sees: "Payment successful"
```

---

### What Was Preserved

- ✅ All existing payment flow logic unchanged
- ✅ All checkout validations intact
- ✅ All order creation logic preserved
- ✅ All PayMongo payment processing unchanged
- ✅ All cart management untouched
- ✅ All state management for other fields
- ✅ All TypeScript types and interfaces
- ✅ All styling for other components

---

### Result

✅ **Clear UX**: Users with no saved cards have obvious "Add Card Details" button instead of confusing message
✅ **Reduced Friction**: Cards automatically save after successful payment → no re-entry needed
✅ **Smart Defaults**: First card automatically set as default payment method
✅ **Test Card Safety**: Test cards never saved (tracked separately from manual entry)
✅ **Error Resilient**: If card save fails, payment still succeeds
✅ **User Informed**: Clear alerts about card saving success or issues
✅ **No Breaking Changes**: All existing payment flows continue to work
✅ **TypeScript Validated**: No compilation errors

---

### Files Modified

| File | Changes | Status |
|------|---------|--------|
| [mobile-app/app/CheckoutScreen.tsx](mobile-app/app/CheckoutScreen.tsx) | Added "Add Card Details" button with full checkout validation (Lines 1998-2006, 2777-2986) | ✅ Complete |
| [mobile-app/app/PaymentGatewayScreen.tsx](mobile-app/app/PaymentGatewayScreen.tsx) | Added card saving logic + manual entry tracking (Multiple locations) | ✅ Complete |

**Total Files Modified:** 2

---

### Testing Checklist

✅ Checkout validates required fields before "Add Card Details"
✅ PaymentGateway receives correct order data
✅ Manual card entry saves after successful payment
✅ Test card autofill does NOT save
✅ First card becomes default payment method
✅ Subsequent cards don't override default
✅ Card save failure doesn't block order completion
✅ Alert messages display correctly
✅ TypeScript compilation: No errors

---

