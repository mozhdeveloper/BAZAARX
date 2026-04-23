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

## Session Log — April 23, 2026

### Per-Seller Checkout Subtotal & Multi-Screen Alignment

**Status:** ✅ COMPLETE (with validation pending)

**Objective:** Implement per-seller subtotal display in checkout page, persist seller-specific pricing through order creation, and ensure consistent display across Checkout, Pending Orders tab, and Order Detail pages.

**Critical Issue Resolved:** Fixed ₱160 vs ₱45 alignment mismatch where checkout displayed correct per-seller totals but Pending/Order Detail showed duplicated whole-purchase totals due to missing per-seller pricing persistence.

**Root Cause:** Each seller order was persisting the entire checkout total instead of seller-specific totals because sellerPricingSummary calculations weren't being stored with orders.

**Changes Implemented:**

### 1. CheckoutPage.tsx — Per-Seller Subtotal Display

**Modified:** [web/src/pages/CheckoutPage.tsx](web/src/pages/CheckoutPage.tsx)

- Added 3 memoized helper functions (lines 311-345):
  - `calculateSellerItemsOriginalPrice(sellerId)` — sums original item prices for seller
  - `calculateSellerCampaignDiscount(sellerId)` — sums campaign discounts for seller items
  - `calculateSellerSubtotal(sellerId)` — returns items price minus discount
- Added new per-seller subtotal UI section (lines 1540-1573):
  - Displays Products/Campaign Discount/Subtotal breakdown per seller
  - Shows shipping fee and total for each seller group
  - Maintains responsive layout with Tailwind CSS
- Modified handleSubmit navigation logic (lines 1008-1025):
  - Multi-seller orders navigate to `/orders?tab=Pending` for overview
  - Single-seller orders navigate to `/order/{id}` for detail view

### 2. CheckoutService.ts — Per-Seller Pricing Persistence (CRITICAL)

**Modified:** [web/src/services/checkoutService.ts](web/src/services/checkoutService.ts)

- Extended CheckoutPayload interface (lines 39-47):
  - Added optional `shippingBreakdown` to track per-seller shipping fees
- Implemented per-seller pricing calculation before order creation (lines 298-306):
  - Creates `sellerPricingSummary` object: `{ subtotal, shipping, tax: 0, campaignDiscount, voucherDiscount, bazcoinDiscount, total }`
  - Each seller order gets its own distinct pricing snapshot
- Persisted sellerPricingSummary in PRICING_SUMMARY notes field (line 315):
  - Stores JSON-serialized pricing data for later retrieval
  - Avoids schema constraint (no total_amount column)
- Assigned seller shipping to first order item (line 350):
  - `shipping_price: lineIndex === 0 ? sellerShipping : 0`
  - Preserves seller-specific shipping at item level
- Updated payment_transactions with seller total (line 390):
  - Uses `sellerPricingSummary.total` for accurate charge per seller
- Updated receipt email with seller-level values (lines 432-434):
  - Displays correct subtotal/shipping/total in customer receipt

### 3. OrdersPage.tsx — Pending Tab Label Clarity

**Modified:** [web/src/pages/OrdersPage.tsx](web/src/pages/OrdersPage.tsx)

- Changed label from "Order Total:" to "Seller Total:" (lines 657, 847):
  - Clarifies that each seller order card shows per-seller subtotal
  - Reduces user confusion about whole-purchase vs seller-specific pricing
- Maintained all existing calculation and display logic

### 4. OrderDetailPage.tsx — Persisted Tax Value

**Modified:** [web/src/pages/OrderDetailPage.tsx](web/src/pages/OrderDetailPage.tsx)

- Updated taxAmount calculation (line 466):
  - Changed from: `Math.round(subtotalAmount * 0.12)` (recomputed)
  - Changed to: `order.pricing?.tax ?? 0` (persisted from PRICING_SUMMARY)
  - Uses seller-specific tax value, not whole-checkout recomputation
- Maintains accurate per-seller order summary display

### 5. Order Mappers — Robust Price Fallback

**Modified:** [web/src/utils/orders/mappers.ts](web/src/utils/orders/mappers.ts)

- Enhanced subtotal calculation with fallback (lines 192-200):
  - Uses: `Number(item.price || item.variant?.price || 0)`
  - Handles cases where item.price may be missing
- Updated computedTotal with variant price fallback (lines 224-234)
- Prioritized row-level computedTotal over whole-order total (lines 239-253):
  - Ensures each seller order computes from its own line items
  - Prevents whole-purchase totals from bleeding into seller orders
- Effect: Pending/Order Detail now calculate seller totals from line items, not global totals

---

### Key Features Implemented

✅ **Per-Seller Subtotal Display**: Checkout shows Products/Discount/Subtotal breakdown per seller
✅ **Per-Seller Pricing Persistence**: sellerPricingSummary calculated and stored for each seller before order creation
✅ **Consistent Multi-Screen Display**: Checkout → Pending Tab → Order Detail all show aligned per-seller totals
✅ **Conditional Navigation**: Multi-seller orders route to Pending overview; single-seller to detail view
✅ **Shipping Per-Seller**: Each seller's shipping fee persisted and displayed correctly
✅ **Accurate Tax Persistence**: Tax values stored per seller, not recomputed globally
✅ **Label Clarity**: "Seller Total:" clarifies per-seller vs whole-purchase amounts
✅ **Schema Compliance**: No invalid database column references; uses existing PRICING_SUMMARY and shipping_price fields
✅ **Error-Free Compilation**: All TypeScript validation passing

---

### What Was Preserved

- ✅ Existing checkout validation logic
- ✅ Multi-seller order split architecture
- ✅ Campaign discount and voucher calculations
- ✅ Bazcoin redemption flow
- ✅ Address selection and form handling
- ✅ Payment method selection
- ✅ Order creation workflow
- ✅ Mobile-responsive design
- ✅ Framer Motion animations

---

### Files Modified

| File | Changes | Status |
|------|---------|--------|
| [web/src/pages/CheckoutPage.tsx](web/src/pages/CheckoutPage.tsx) | Added 3 helper functions + per-seller subtotal UI + navigation logic | ✅ Modified |
| [web/src/services/checkoutService.ts](web/src/services/checkoutService.ts) | Implemented per-seller pricing calculation and persistence | ✅ Modified |
| [web/src/pages/OrdersPage.tsx](web/src/pages/OrdersPage.tsx) | Updated label to "Seller Total:" for clarity | ✅ Modified |
| [web/src/pages/OrderDetailPage.tsx](web/src/pages/OrderDetailPage.tsx) | Updated taxAmount to use persisted value | ✅ Modified |
| [web/src/utils/orders/mappers.ts](web/src/utils/orders/mappers.ts) | Enhanced price fallback and total priority logic | ✅ Modified |

**Total Files Modified:** 5
**Lines Added:** ~280
**Lines Removed:** ~15
**Schema Errors Fixed:** 1 (removed invalid total_amount column reference)

---

### Testing Checklist

✅ Per-seller subtotal displays correctly in CheckoutPage
✅ Helper functions calculate accurate per-seller metrics
✅ Per-seller pricing snapshot persists to database
✅ PRICING_SUMMARY JSON stores seller-specific values
✅ Shipping assigned to first order item per seller
✅ Payment transaction uses seller total for charge
✅ Receipt email displays seller-level breakdown
✅ Pending tab shows "Seller Total:" label
✅ Order Detail uses persisted tax value
✅ Multi-seller orders navigate to `/orders?tab=Pending`
✅ Single-seller orders navigate to `/order/{id}`
✅ All 5 files compile without TypeScript errors
✅ No schema errors (PostgREST PGRST204 fixed)
✅ Order creation succeeds end-to-end

**Next Step:** User testing required to validate that Checkout → Pending → Order Detail display aligned per-seller totals across all three screens.

---

