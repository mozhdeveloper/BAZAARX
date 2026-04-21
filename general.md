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

## Session Log — April 21, 2026

### Mobile COD Payment Display & UX Issues - Comprehensive Fix

**Status:** ✅ COMPLETE

**Problems Identified & Fixed:**

#### 1. Payment Method Display Shows "cod" Instead of "Cash on Delivery"
**Severity:** HIGH - User-facing text issue

**Location:** `mobile-app/app/OrderConfirmation.tsx`
- Line 118: Subtitle displaying raw `{order.paymentMethod}` → showed "cod"
- Line 150: Payment method card displaying raw `{order.paymentMethod}` → showed "cod"

**Root Cause:**
- CheckoutScreen.tsx (line 2156) passed payment method as raw string value `'cod'`
- OrderConfirmation displayed it without any mapping/transformation
- OrderDetailScreen had the correct mapping implementation that wasn't replicated

**Fix Implemented:**
- Added `getPaymentMethodDisplay()` helper function (Lines 30-47)
  - Maps `"cod"` → `"Cash on Delivery"`
  - Maps `"gcash"` → `"GCash"`
  - Maps `"card"` → `"Card"`
  - Maps `"paymongo"` → `"PayMongo"`
  - Handles both string and object payment method formats
- Updated subtitle to use `{getPaymentMethodDisplay()}`
- Updated payment method card to use `{getPaymentMethodDisplay()}`

**Result:** Buyers now see **"Cash on Delivery"** instead of **"cod"** ✅

---

#### 2. Order Status Hardcoded as "Confirmed" for Pending COD Orders
**Severity:** MEDIUM-HIGH - Misleading status for delayed payments

**Location:** `mobile-app/app/OrderConfirmation.tsx` (Line 162)
- Status was hardcoded as `"Confirmed"` for ALL payment methods
- For COD orders, it should show `"Pending"` (payment not yet received from buyer)

**Root Cause:**
- No dynamic logic to check payment method before displaying status
- Only hardcoded single status value in badge

**Fix Implemented:**
- Added `getOrderStatus()` helper function (Lines 49-67)
  - **COD orders**: Returns "Pending" with yellow badge (#FEF3C7, #92400E)
  - **Other payment methods**: Returns "Confirmed" with gray badge (#E5E7EB, #374151)
- Updated status display to use dynamic `getOrderStatus()` function
- Badge color and text now respond to payment method type

**Result:**
- COD orders correctly show **"Pending"** status with yellow badge ✅
- Online payment orders show **"Confirmed"** status with gray badge ✅
- Buyer expectations aligned with actual payment status ✅

---

#### 3. Double Loading UI Message for COD Payments
**Severity:** MEDIUM - UX issue with misleading loading message

**Location:** `mobile-app/app/CheckoutScreen.tsx` (Line 1960)

**Problem:**
- `setProcessingMessage('Redirecting to secure payment gateway')` was set at the very beginning of checkout process
- This message appeared for ALL payment methods, including COD
- For COD orders, showing "Redirecting to secure payment gateway" is completely misleading
- Created confusing UX with double loading messages

**Root Cause:**
- Initial processing message was hardcoded to payment gateway language
- No differentiation between COD and online payment flows at start

**Fix Implemented:**
- Changed line 1960 from:
  ```jsx
  setProcessingMessage('Redirecting to secure payment gateway');
  ```
  to:
  ```jsx
  setProcessingMessage('Processing your order...');
  ```

**Result:**
- **COD flow**: "Processing your order..." → "Preparing your checkout..." → "Confirming your order..." ✅
- **Online flow**: "Processing your order..." → "Preparing your checkout..." → "Redirecting to secure payment gateway" ✅
- No more misleading payment gateway message for COD users ✅

---

#### 4. Remove "Pending" Badge from Order Details Page for COD Orders
**Severity:** LOW - UX/Design cleanup

**Location:** `mobile-app/app/OrderDetailScreen.tsx` (Lines 823-843)

**Problem:**
- Order Details page displayed a yellow "PENDING" badge next to payment method
- Badge appeared redundantly alongside the instruction message
- Cleaner design if badge was removed, keeping only instruction message

**Fix Implemented:**
- Removed the yellow badge wrapper and "PENDING" text display
- Kept the orange instruction message box ("Payment on Delivery" with delivery instructions)
- Simplified the payment method row to just show "Cash on Delivery" text

**Before:**
```jsx
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
  <Text style={styles.primaryInfo}>{paymentMethod}</Text>
  {isCOD && (
    <View style={{ backgroundColor: '#FEF3C7', ... }}>
      <Text>PENDING</Text>
    </View>
  )}
</View>
```

**After:**
```jsx
<Text style={styles.primaryInfo}>{paymentMethod}</Text>
```

**Result:**
- ✅ Removed the yellow "PENDING" badge
- ✅ Kept the orange instruction message box
- ✅ Cleaner payment method display
- ✅ More focused UX on the helpful instruction message

---

### Summary of Changes

**Files Modified:** 2
- `mobile-app/app/OrderConfirmation.tsx` — Added helper functions for payment method display and status determination
- `mobile-app/app/OrderDetailScreen.tsx` — Removed redundant status badge, kept instruction message
- `mobile-app/app/CheckoutScreen.tsx` — Fixed initial processing message to be generic

**User-Facing Improvements:**
1. ✅ Correct payment method text ("Cash on Delivery" not "cod")
2. ✅ Correct order status ("Pending" for COD, "Confirmed" for others)
3. ✅ Clear loading messages without misleading payment gateway references for COD
4. ✅ Cleaner Order Details page design with focused instruction messaging
5. ✅ No compilation errors across all changes
6. ✅ Consistent implementation patterns across OrderConfirmation and OrderDetailScreen

---

### Add COD Payment Deadline Display to Mobile Order Details

**Status:** ✅ COMPLETE

**Objective:** Display COD (Cash on Delivery) payment deadline based on J&T estimated delivery date in the Items & Payment section of mobile OrderDetailScreen.

**Root Causes Identified & Fixed:**

#### 1. Payment Method Detection Failing in OrderDetailScreen.tsx
**Severity:** HIGH - Feature completely non-functional

**Location:** `mobile-app/app/OrderDetailScreen.tsx` (Lines 830-880)

**Root Cause:**
- Code was checking for `.type` property on `order.paymentMethod` (treating it as object)
- Mobile Order interface defines `paymentMethod: string` (not object with `.type`)
- This type mismatch caused COD detection to always fail silently
- Resulted in COD instruction box never rendering

**Fix Implemented:**
- Enhanced payment method detection to handle both string and object formats:
  - String format: `"cod"` → directly compare with `.toLowerCase().trim()`
  - Object format: `{ type: "cod" }` → check `.type` property
- Added comprehensive logging for debugging payment method flow
- Added robust null/empty string checks
- Fallback messages when delivery date not yet available

**Result:** COD orders now properly detected and instruction box renders ✅

---

#### 2. HistoryScreen.tsx Hardcoding Payment Method as "Paid"
**Severity:** HIGH - Payment method always incorrect in History tab

**Location:** `mobile-app/app/HistoryScreen.tsx` (Lines 71-113)

**Root Cause:**
- HistoryScreen was hardcoding `paymentMethod: 'Paid'` for ALL orders
- When users viewed COD orders from History, it showed "Paid" instead of "Cash on Delivery"
- Prevented COD detection logic from working in OrderDetailScreen
- Supabase query wasn't fetching payments data

**Fix Implemented:**
1. Updated Supabase query to include payments data (Line 63):
   ```jsx
   payments:order_payments(payment_method, status, created_at)
   ```

2. Implemented proper payment method extraction (Lines 78-90):
   ```jsx
   const getPaymentMethod = (): string => {
     const paymentData = (order.payments && order.payments.length > 0) ? order.payments[0]?.payment_method : null;
     if (typeof paymentData === 'string') {
       return paymentData;
     }
     if (typeof paymentData === 'object' && paymentData) {
       const type = (paymentData as any)?.type;
       if (type === 'cod') return 'Cash on Delivery';
       if (type === 'gcash') return 'GCash';
       if (type === 'card') return 'Card';
       if (type === 'paymongo') return 'PayMongo';
       return type || 'Cash on Delivery';
     }
     return 'Paid';
   };
   ```

3. Updated mapping to use function result (Line 112):
   ```jsx
   paymentMethod: getPaymentMethod(),
   ```

**Result:** History tab now correctly displays payment methods ✅

---

#### 3. Order Interface Missing Payments Property
**Severity:** MEDIUM - TypeScript compilation error

**Location:** `mobile-app/src/types/index.ts` (Line 209-214)

**Problem:**
- Order interface didn't include optional `payments` property
- Caused TypeScript error when accessing `order.payments` in OrderDetailScreen and HistoryScreen

**Fix Implemented:**
- Added payments property to Order interface:
  ```typescript
  payments?: Array<{
    payment_method: string | { type: string };
    status?: string;
    created_at?: string;
  }>;
  ```

**Result:** TypeScript compilation errors resolved ✅

---

#### 4. Enhanced Date Formatting for COD Deadline Display
**Location:** `mobile-app/app/OrderDetailScreen.tsx` (Lines 24-38)

**Implementation:**
- Already present: `formatDatePH()` utility function converts date strings to Philippine format
- Handles all input types: string, Date object, null, undefined
- Returns formatted string like "April 26, 2026"
- Used in COD instruction box to display payment deadline

**Result:** Dates display correctly in user-friendly format ✅

---

### Final Implementation

**User-Facing Feature:**
- ✅ Payment Method displays correctly: "Cash on Delivery"
- ✅ COD Instruction Box appears in Items & Payment section:
  - Title: "💳 Payment on Delivery"
  - Instructions: "You'll pay the full amount to the delivery driver when they arrive. Please have the exact amount ready."
  - Deadline: "Payment Due: April 26, 2026" (formatted from J&T ETA)
  - Fallback: "Delivery date will be updated when J&T booking is confirmed"

**Files Modified:** 4
- `mobile-app/app/OrderDetailScreen.tsx` — Enhanced payment detection, added COD instruction box
- `mobile-app/app/HistoryScreen.tsx` — Fixed payment method mapping, added payments query
- `mobile-app/src/types/index.ts` — Added payments property to Order interface

**Testing Done:**
✅ Feature displays correctly on mobile app
✅ Shows formatted deadline date from J&T estimated delivery
✅ Appears in correct section (Items & Payment)
✅ No TypeScript compilation errors
✅ Works for orders viewed from both OrdersScreen and HistoryScreen

---

