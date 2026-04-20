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

## Session Log — April 20, 2026

### PayMongo Card Validation & Smart Form UX - Mobile Payment Methods

**Status:** ✅ COMPLETE

**Problem:**
The Payment Methods screen needed proper test card validation with smart form UX:
1. Only PayMongo test cards should be saveable
2. Button should be disabled until form is valid
3. Users should see why button is disabled (validation feedback)
4. Error messages for card field only (not global)
5. Modal should clear errors on close
6. Remove header plus button and bottom navigation

**Changes Implemented:**

#### 1. Real-Time Card Validation
- Card number validated as soon as 16 digits entered
- Checks against all 23 PayMongo test cards from testCards.ts
- Real-time error feedback below card field

#### 2. Smart Button Logic
- Separate `cardNumberError` state (not global error)
- Helper functions: `isFormComplete()` and `isCardNumberValid()`
- Button disabled until: all fields filled AND card is valid
- Clear feedback on why button is disabled

#### 3. Modal Cleanup
- Errors cleared when modal closes (Cancel, Back, Overlay)
- Form reset completely for fresh start next time
- No error persistence between sessions

#### 4. UI Cleanup
- Removed plus button from header
- Removed bottom navigation menu (BuyerBottomNav)

**Files Modified:**
- `mobile-app/app/PaymentMethodsScreen.tsx`
  - Line 52: Added cardNumberError state
  - Lines 119-136: Added helper functions
  - Lines 475-490: Real-time card validation
  - Line 242: Removed plus button
  - Line 603: Removed BuyerBottomNav

**User Experience:**
```
1. Open modal → Button DISABLED (form empty)
2. Type card number → Error shown if invalid, Button DISABLED
3. Fill all fields → Button ENABLED if card is valid ✅
4. Click Add Card → Saved, Modal closes, Form resets
```

---

### Checkout Flow - PayMongo Saved Cards Fix

**Status:** ✅ COMPLETE

**Problem:**
- Saved PayMongo cards were being loaded correctly but navigation logic was broken
- When buyer selected a saved card and clicked "Place Order", the app navigated to PaymentGatewayScreen instead of skipping directly to OrderConfirmation
- Buyer had to re-enter card details even though a card was already selected
- React hook closure issue: validation alert showed "Please select a saved card" even after selecting one

**Root Causes Identified & Fixed:**

#### 1. **Missing Navigation Logic for Saved Cards (Lines 1976-2000)**
**Problem:** All PayMongo payments went through PaymentGatewayScreen regardless of whether a saved card was selected.

**Solution Implemented:**
- Added special routing for PayMongo saved cards:
  - Check if `paymentMethod === 'paymongo' && selectedPaymentMethodId` exists
  - If true: Skip PaymentGatewayScreen, create order immediately
  - Navigate directly to OrderConfirmation screen
  - Early return prevents PaymentGateway navigation

#### 2. **Enhanced Checkout Payload with Saved Card ID (Line 1962)**
**Problem:** Backend didn't know which saved card to use for payment processing.

**Solution Implemented:**
- Added conditional spread operator to payload:
  ```typescript
  ...(paymentMethod === 'paymongo' && selectedPaymentMethodId 
    ? { savedPaymentMethodId: selectedPaymentMethodId } 
    : {})
  ```
- Backend can now identify which saved card to charge

#### 3. **React Hook Closure Issue - Missing Dependencies (Line 2161)**
**Problem:** `selectedPaymentMethodId` was missing from useCallback dependency array in `handlePlaceOrder`
- Result: Callback always saw stale `selectedPaymentMethodId = null`
- Validation check would fail even after selecting a card

**Solution Implemented:**
- Added missing dependencies to useCallback:
  - `selectedPaymentMethodId` — Now captures current selected card
  - `shippingResults` — Used in order creation
  - `selectedMethods` — Used in logistics mapping
- Callback now properly recreates when these values change

**Files Modified:**
- `mobile-app/app/CheckoutScreen.tsx`
  - Line 1962: Added savedPaymentMethodId to payload (conditional spread)
  - Lines 1976-2000: Added special routing for saved PayMongo cards
  - Line 2161: Added 3 missing dependencies to useCallback array

**Code Changes:**
```typescript
// Payload enhancement
...(paymentMethod === 'paymongo' && selectedPaymentMethodId 
  ? { savedPaymentMethodId: selectedPaymentMethodId } 
  : {}),

// Special navigation for saved cards
if (paymentMethod === 'paymongo' && selectedPaymentMethodId) {
  // Create order and navigate directly to OrderConfirmation
  navigation.navigate('OrderConfirmation', { order, earnedBazcoins });
  return;
}

// Fixed dependency array
}, [hasUnavailableItems, ..., selectedPaymentMethodId, shippingResults, selectedMethods]);
```

**User Experience:**
```
Checkout Flow with Saved Card:
1. Select saved PayMongo card ✓
2. Click "Place Order"
3. Order created immediately
4. Navigate to OrderConfirmation (skips PaymentGatewayScreen) ✓
5. No card re-entry needed ✓
6. Validation works correctly (no false "select card" alerts) ✓

Checkout Flow with New Card:
1. Select PayMongo payment method
2. Click "Place Order"
3. Navigate to PaymentGatewayScreen (card entry form) ✓
4. Enter new card details
5. Process payment
6. Navigate to OrderConfirmation ✓
```

---

### Order Details Page - Payment Method & Shipping Alignment Fix

**Status:** ✅ COMPLETE

**Problem:**
- Payment method always displayed as "Cash on Delivery" even when PayMongo/GCash/Card was selected
- Shipping information only showed first seller instead of all sellers
- Total amount calculation was incorrect for multi-seller orders

**Root Cause:**
- `order_payments` table wasn't being fetched in OrdersScreen query
- `payment_method` field wasn't included in select statement
- Total calculation used single `shipping_cost` instead of summing all sellers' fees

**Changes Implemented:**

#### 1. Fixed Payment Method Display
- Added `payments:order_payments(payment_method, status, created_at)` to both select queries in OrdersScreen
- Updated payment method extraction logic to fetch from `order.payments[0]?.payment_method`
- Now correctly displays: PayMongo, GCash, Card, or Cash on Delivery

#### 2. Added COD Pending Payment Status
- Yellow "PENDING" badge next to Cash on Delivery payment method
- Instruction message for COD orders: "You'll pay the full amount to the delivery driver when they arrive. Please have the exact amount ready."
- Only displays for COD orders, hidden for other payment methods

#### 3. Fixed Total Amount Calculation
- Changed from single `shippingFee` to sum of all sellers' `calculated_fee`
- Now uses: `total = subtotal + totalShipping - voucherDiscount`
- `totalShipping` = sum of all order_shipments.calculated_fee
- Correctly accounts for multiple sellers with different shipping fees

**Files Modified:**
- `mobile-app/app/OrdersScreen.tsx`
  - Lines 203, 254: Added payments relation to select queries
  - Lines 436-453: Updated total amount calculation logic
  - Lines 471-481: Updated payment method extraction from payments array
  - Line 463: Changed shippingFee to totalShipping

- `mobile-app/app/OrderDetailScreen.tsx`
  - Lines 805-845: Added COD pending status badge and instruction message
  - Existing payment extraction logic now receives correct data from OrdersScreen

**User Experience:**
```
Orders List:
- Displays correct payment method (e.g., "PayMongo" not "Cash on Delivery")
- Total amount includes all sellers' shipping fees

Order Details Page:
- COD orders show: "Cash on Delivery [PENDING]" with instruction message
- Per-seller shipping breakdown with method, fee, and estimated days
- Correct total: subtotal + all shipping fees - voucher discount
```

---

### Checkout Loading UI & Form Validation Refinements

**Status:** ✅ COMPLETE

**Problem:**
1. **Loading UI Design Mismatch**: Loading screen didn't match desired design from reference image
   - Background color wrong (light gray instead of white)
   - Spinner radius inconsistent
   - Message text and dots too large, breaking proportions
   - Animation broken when transitioning between screens
   
2. **Duplicate Address Issue**: Address dropdown showing duplicate entries
   - Same address appearing multiple times in filtered list
   - User confusion about which address to select
   
3. **PaymentGatewayScreen Validation**: Missing validation fields that exist in PaymentMethodsModal
   - PaymentGatewayScreen card form had no field-level validation feedback
   - Button wasn't disabled for invalid states
   - User experience inconsistent between screens

**Changes Implemented:**

#### 1. Loading UI Refinements
- **Background**: Changed from `#F5F5F5` (light gray) to `#FFFFFF` (pure white)
- **Spinner styling**:
  - Border radius: Kept at `25` (perfect circle)
  - Border width: Maintained at `3px`
  - Border color: `#FFFFFF` (matches background)
  - Border-top color: `COLORS.primary` (orange)
- **Text sizing**:
  - Font size: Reduced from `16px` to `13px`
  - Font weight: Changed from `600` to `500` (lighter appearance)
  - Color: Changed from `#666666` to `#999999` (subtly lighter)
  - Margin top: Reduced from `32px` to `24px`
- **Dots sizing**:
  - Reduced from `6x6px` to `4x4px` (much smaller)
  - Border radius: Adjusted from `3` to `2`
  - Gap between dots: Reduced from `6px` to `4px`
  - Margin top: Reduced from `20px` to `12px`
- **Animation optimization**:
  - Changed from sequence (600ms up + 600ms down) to linear continuous loop (1200ms)
  - Removed `Easing.inOut(Easing.ease)` for consistent frame rendering
  - Used `Easing.linear` for smooth, uninterrupted rotation

**Files Modified:**
- `mobile-app/app/CheckoutScreen.tsx`
  - Line 3492: Background color updated to `#FFFFFF`
  - Line 3520: Spinner border color updated to `#FFFFFF`
  - Lines 3535-3545: Text styling refinements (font size, weight, color, spacing)
  - Lines 3547-3562: Dots sizing refinements (width, height, borderRadius, gap, margin)
  - Lines 380-390: Animation timing optimized (linear 1200ms loop)

#### 2. Duplicate Address Fix
- Added deduplication logic in address dropdown filtering
- Filtered list now removes duplicate addresses based on ID
- Prevents same address appearing multiple times after filtering

**Files Modified:**
- `mobile-app/app/CheckoutScreen.tsx`
  - Address dropdown deduplication logic implemented

#### 3. PaymentGatewayScreen Validation Fields
- Added same validation structure as PaymentMethodsModal:
  - Real-time card number validation
  - Field-level error display (below card input)
  - Save button disabled until form is complete AND card is valid
  - Helper functions: `isFormComplete()` and `isCardNumberValid()`
  - Errors cleared when navigating away
- User sees immediate feedback why button is disabled

**Files Modified:**
- `mobile-app/app/PaymentGatewayScreen.tsx`
  - Added `cardNumberError` state for field-level validation
  - Lines: Added helper functions for form validation
  - Lines: Real-time card validation on card number input
  - Lines: Button disability logic tied to validation state
  - Lines: Error clearing on screen unmount/blur

**User Experience:**
```
Loading Screen:
✓ Clean white background matching reference design
✓ Proportionally sized spinner and dots
✓ Readable, smaller message text
✓ Smooth, uninterrupted animation
✓ No more animation jank when transitioning screens

Address Selection:
✓ No duplicate addresses in filtered list
✓ Clean, deduped selection experience

Payment Gateway Form:
✓ Real-time card validation feedback
✓ "Add Card" button disabled until valid
✓ Clear field-level error messages
✓ Consistent with PaymentMethodsModal UX
✓ Validation errors clear on screen exit
```

**Message Updates:**
- Payment redirect message: "Redirecting to secure payment gateway" (instead of generic "Redirecting to payment...")
- Applies to both direct Place Order and Use Different Card flows
- More descriptive and reassuring to users

---

