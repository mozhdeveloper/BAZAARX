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

## Session Log — April 18, 2026

### PaymentGatewayScreen UI Refinement & Payment Details Display

**Status:** ✅ COMPLETE

**Changes & Prompts:**

#### 1. **Enhanced Payment Details Box with Comprehensive Breakdown**
**Prompt:** "Check the Image thoroughly, I want you to fix the design of the red outlined box. This is in the PaymentGatewayScreen. Check all the codes and file that are related to it, don't change anything with the code I just want to change it and show there the Payment Details in the Checkout Screen."

**Problem Identified:**
- Payment Details box only showed "Total Amount" with empty space
- Provider logo circle occupied space without adding value
- Missing breakdown of cost components (Subtotal, Shipping, Discount, etc.)
- Inconsistent visual hierarchy

**Solution Implemented:**

**Part 1: Enhanced Payment Details Display (PaymentGatewayScreen.tsx, Lines 487-545)**
- Replaced simple total display with comprehensive payment breakdown
- Added "Payment Details" title header
- Implemented conditional rendering for optional components:
  - **Subtotal:** Always shown (calculated from total - shipping + discount)
  - **Shipping Fee:** Shows only if `shippingFee > 0`
  - **Discount/Voucher:** Shows in green only if applicable
  - **Bazcoin Discount:** Shows in green only if `bazcoinDiscount > 0`
  - **Divider Line:** Visual separator before total
  - **Total Amount:** Emphasized at bottom

**Part 2: Enhanced Styling (PaymentGatewayScreen.tsx, Styles Section)**
- Updated `billContainer` with red border and improved spacing
- Added new style definitions:
  - `billDetailsHeader` — Header row with title and logo
  - `billDetailsTitle` — "Payment Details" text styling
  - `billDetailRow` — Individual line item styling
  - `billDetailLabel` — Label text (left-aligned)
  - `billDetailValue` — Amount text (right-aligned)
  - `billDetailDivider` — Horizontal line separator
  - `billDetailRowTotal` — Total row styling
  - `billDetailLabelTotal` — "Total Amount" label
  - `billAmountTotal` — Large red total amount display

**Data Flow:**
```
Before:
  Total Amount
  ₱ 1,600
  [Empty space with circle]

After:
  Payment Details
  Subtotal         ₱ 1,500
  Shipping         ₱ 100
  [Discount        -₱ 50]  (if applicable)
  [Bazcoin Discount -₱ 20]  (if applicable)
  ─────────────────────────
  Total Amount     ₱ 1,600
```

**Files Modified:**
- `mobile-app/app/PaymentGatewayScreen.tsx` (Lines 487-545 + Styles)

**Result:** ✅ Complete payment breakdown now visible with improved visual organization

---

#### 2. **Removed Decorative Logo Circle**
**Prompt:** "Check the image thoroughly, remove the circle the one that is inside the red outlined box."

**Problem Identified:**
- Provider logo circle (60x60px container) occupied unnecessary space
- Didn't add functional value to payment details view
- Interfered with clean layout design

**Solution Implemented:**
- Removed `providerLogoContainer` JSX from `billDetailsHeader`
- Removed Image import usage in payment details section
- Changed `billDetailsHeader` flex layout from `space-between` to `flex-start`
- Removed margin-right calculations

**Impact:**
- Cleaner visual hierarchy
- More space for payment details text
- Improved readability on smaller screens

**Files Modified:**
- `mobile-app/app/PaymentGatewayScreen.tsx` (Lines 491-495)

**Result:** ✅ Circle removed, cleaner layout

---

#### 3. **Simplified Payment Details Box Styling**
**Prompt:** "Remove the red outline of the Payment Details box, leave it white and simple."

**Problem Identified:**
- Red border (`borderWidth: 2`, `borderColor: '#C53030'`) made the box too prominent
- Competed visually with other important elements
- Didn't match the overall soft, parchment theme

**Solution Implemented:**
- Removed `borderWidth: 2` from `billContainer`
- Removed `borderColor: '#C53030'` from `billContainer`
- Kept white background for clarity
- Maintained subtle shadow for depth (`elevation: 3`, `shadowOpacity: 0.08`)
- Preserved rounded corners (16px) for modern appearance

**Updated billContainer Styling:**
```typescript
billContainer: {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  marginHorizontal: 24,
  marginTop: 16,
  marginBottom: 24,
  padding: 20,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
  // Removed: borderWidth, borderColor
}
```

**Impact:**
- Clean, minimalist design
- Better visual balance with form elements
- Maintains hierarchy through spacing and typography
- Aligns with app's warm parchment theme

**Files Modified:**
- `mobile-app/app/PaymentGatewayScreen.tsx` (Styles Section)

**Result:** ✅ Simple white design with subtle shadow, no red border

---

### Summary of April 18 Session

| Task | Type | Status | Impact |
|------|------|--------|--------|
| Enhanced payment breakdown display | Feature | ✅ Complete | Users see itemized costs (subtotal, shipping, discounts) |
| Removed decorative logo circle | UI/UX | ✅ Complete | Cleaner layout, more readable |
| Simplified box styling | Design | ✅ Complete | White background, removed red border, subtle shadow |

**Key Outcomes:**
- ✅ Payment Details box now displays comprehensive breakdown
- ✅ Conditional rendering for optional cost components
- ✅ Cleaner, more professional appearance
- ✅ Better visual hierarchy
- ✅ Improved mobile responsiveness
- ✅ Maintains theme consistency (soft parchment design)

**User Experience Improvements:**
- Users now see exactly what they're paying for before confirming
- Cost breakdown is immediately clear and organized
- Green highlighting for discounts shows savings positively
- Red highlighting for total amount draws attention appropriately

**Files Modified (1):**
- `mobile-app/app/PaymentGatewayScreen.tsx` — Payment details display, styling, layout refinements

**Branch:** `update/payment-gateway-screen-ui`



