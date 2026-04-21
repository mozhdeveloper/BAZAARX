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

**Verification:**
✅ All changes implemented successfully
✅ No compilation errors
✅ Ready for testing on mobile app

---

