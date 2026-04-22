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

### Mobile Checkout Payment Method Ordering - UX Reorganization

**Status:** ✅ COMPLETE

**Objective:** Fix payment method display ordering on mobile checkout screen so available payment methods appear first, followed by coming soon options.

**Problem Identified:**

The payment methods on the mobile checkout screen were displayed in a confusing order that scattered available and coming-soon options:

| Position | Method | Status |
|----------|--------|--------|
| 1st | GCash | ❌ Coming Soon (disabled) |
| 2nd | PayMongo | ✅ Available (enabled) |
| 3rd | Credit/Debit Card | ❌ Coming Soon (disabled) |
| 4th | Cash on Delivery | ✅ Available (enabled) |

**UX Problem:**
- Users see a disabled option first (GCash)
- Then an enabled option (PayMongo)  
- Then another disabled option (Credit/Debit Card)
- Finally the last enabled option (COD)
- This non-intuitive grouping creates confusion about what payment options are actually available

**Root Cause:**
Payment method options were rendered in the order they were originally coded, without consideration for grouping available vs. coming soon methods.

**Solution Implemented:**

Reordered the payment method Pressable components in [mobile-app/app/CheckoutScreen.tsx](mobile-app/app/CheckoutScreen.tsx) (Lines 2490-2850) to the proper sequence:

**New Order (Priority):**

| Position | Method | Status |
|----------|--------|--------|
| 1st | **PayMongo** | ✅ Available (enabled) |
| 2nd | **Cash on Delivery** | ✅ Available (enabled) |
| 3rd | GCash | ❌ Coming Soon (disabled) |
| 4th | Credit/Debit Card | ❌ Coming Soon (disabled) |

**Changes Made:**

1. Moved PayMongo Pressable block to first position (originally at line 2509)
2. Moved PayMongo conditional form section to stay directly after PayMongo option (originally at line 2523-2765)
3. Moved COD Pressable block to second position (originally at line 2816)
4. Moved GCash Pressable block to third position (originally at line 2490)
5. Moved Credit/Debit Card Pressable block to fourth position (originally at line 2766)
6. Kept Credit Card saved cards conditional section with its parent (originally at line 2799-2815)

**What Was Preserved (No Changes to Logic):**
- ✅ All state management: `paymentMethod`, `setPaymentMethod` unchanged
- ✅ All event handlers: `onPress` callbacks remain identical
- ✅ All conditional rendering: `{paymentMethod === 'paymongo' && (...)}`
- ✅ All styling: Color, opacity, active states untouched
- ✅ All payment processing logic: Routes to PaymentGateway or OrderConfirmation
- ✅ All business logic: COD gift blocking, saved card management
- ✅ Form sections: Stayed attached to their parent options

**Result:**

✅ Available payment methods (PayMongo, COD) now appear first and are immediately discoverable
✅ Coming soon options clearly separated at the bottom
✅ Much clearer, more intuitive UX flow
✅ Users can immediately see what payment options are currently usable
✅ No functionality changes or side effects
✅ No TypeScript/compilation errors
✅ Mobile app compiles successfully

**Visual Comparison:**

**Before (Confusing):**
```
Payment Method
─────────────────────────
⭕ GCash (COMING SOON)
   Instantly paid online

⬤ PayMongo (selected)
   Securely pay with card

⭕ Credit/Debit Card (COMING SOON)
   Instantly paid online

⭕ Cash on Delivery
   Pay when you receive
```

**After (Clear):**
```
Payment Method
─────────────────────────
⬤ PayMongo (selected)
   Securely pay with card

⭕ Cash on Delivery
   Pay when you receive

⭕ GCash (COMING SOON)
   Instantly paid online

⭕ Credit/Debit Card (COMING SOON)
   Instantly paid online
```

**File Modified:** 1
- [mobile-app/app/CheckoutScreen.tsx](mobile-app/app/CheckoutScreen.tsx) — Reordered payment method options (Lines 2490-2850)

**Testing Status:**
✅ TypeScript compilation: No errors
✅ Code review: All state, logic, and handlers preserved
✅ Mobile app: Ready for visual testing on device
✅ Payment flows: All payment routing intact
✅ Conditional rendering: All conditions working as before

---

## Session Log — April 22, 2026 (Continued)

### Flash Sale Discount Percentage Accuracy - Bug Fixes & UX Enhancement

**Status:** ✅ COMPLETE

**Objectives:** 
1. Fix discount percentage rendering error in checkout screen
2. Fix flash sale pricing not being applied to cart
3. Add visual discount percentage badge in cart
4. Fix discount percentage accuracy in product detail screen
5. Fix discount percentage display on home page flash sales

---

### Issue 1: React Object-as-Child Rendering Error

**Problem:**
CheckoutScreen was rendering a seller object directly in a Text component, causing React error: "Objects are not valid as a React child"

**Root Cause:**
`items[0]?.seller` could be either a string or a full object `{id, avatar_url, owner_name, store_name, ...}`, but code assumed it was always a string.

**Solution:** 
Added type-safe extraction in `getSellerDisplayName()` function (line 576) and updated seller displays in `sellerInputs` mappings (lines 618, 688):
```javascript
typeof seller === 'object' ? seller.store_name : seller
```

**File Modified:**
- [mobile-app/app/CheckoutScreen.tsx](mobile-app/app/CheckoutScreen.tsx#L576) — Type-safe seller name extraction

---

### Issue 2: Flash Sale Pricing Not Applied to Cart

**Problem:**
Products added from global flash sale appeared in cart at full original price, not discounted flash sale price. The discount percentage badge was not showing.

**Root Cause:**
`getGlobalFlashSaleProducts()` in discountService was not including the `activeCampaignDiscount` object needed for persistence through navigation flow.

**Solution:**
Enhanced `getGlobalFlashSaleProducts()` to include comprehensive discount object:
```javascript
activeCampaignDiscount: discountPct > 0 ? {
  campaignId: sub.slot_id,
  campaignName: slot?.name || 'Flash Sale',
  discountType: 'percentage',
  discountValue: discountPct,
  discountedPrice: basePrice,
  originalPrice: originalPrice,
  badgeText: `${discountPct}% OFF`,
  badgeColor: '#FF6A00',
  endsAt: new Date(slot?.end_time || Date.now())
} : undefined
```

**File Modified:**
- [mobile-app/src/services/discountService.ts](mobile-app/src/services/discountService.ts#L474-L583) — Enhanced getGlobalFlashSaleProducts() with activeCampaignDiscount object

---

### Issue 3: Added Discount Percentage Badge Display in Cart

**Problem:**
Cart items showed original and discounted prices but no visual indicator of discount percentage (e.g., "30% OFF", "50% OFF").

**Solution:**
Added discount percentage badge to CartItemRow component:
- Created `priceWrapper` container for price/original-price alignment
- Added `discountBadge` component displaying calculated percentage
- Added new styles: `priceWrapper`, `discountBadge`, `discountBadgeText`

Discount calculation:
```javascript
Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100) % OFF
```

**Files Modified:**
- [mobile-app/src/components/CartItemRow.tsx](mobile-app/src/components/CartItemRow.tsx#L107-L124) — Added discount badge UI
- Lines 224-253 — Added discount badge styling (red background, white text)

---

### Issue 4: Discount Percentage Accuracy in Product Detail

**Problem:**
Discount percentage shown in cart was inaccurate because `handleAddToCart()` was using wrong prices.

**Root Cause:**
- Line 874 was passing `product.price` (current price) as `originalPrice` instead of the pre-calculated `originalPrice` variable
- This caused CartItemRow to calculate wrong percentage: `((product.price - discountedPrice) / product.price) * 100`

**Solution:**
Changed `handleAddToCart()` to use the same prices calculated for display:
```javascript
// Before (WRONG):
originalPrice: product.price || 0,
price: discountService.calculateLineDiscount(product.price || 0, ...).discountedUnitPrice

// After (CORRECT):
originalPrice: originalPrice,  // Calculated at line 530
price: regularPrice,            // Calculated at line 516
```

**File Modified:**
- [mobile-app/app/ProductDetailScreen.tsx](mobile-app/app/ProductDetailScreen.tsx#L867-L878) — Fixed prices used when adding to cart

---

### Issue 5: Discount Percentage Display on Home Page Flash Sales

**Problem:**
Home page flash sale products showed incorrect discount percentages because ProductCard component couldn't find the discount percentage fields and had to calculate from prices (potential rounding differences).

**Root Cause:**
`getGlobalFlashSaleProducts()` was missing `campaignDiscountType` and `campaignDiscountValue` fields that ProductCard needed for accurate display.

**Solution:**
Added missing discount fields to flash sale products return object (lines 565-567):
```javascript
campaignDiscountType: discountPct > 0 ? 'percentage' : undefined,
campaignDiscountValue: discountPct > 0 ? discountPct : undefined,
discountBadgePercent: discountPct > 0 ? discountPct : undefined,
```

Now ProductCard uses direct values instead of calculating from prices:
```javascript
const discountPercent = hasDiscount
  ? (product.campaignDiscountType === 'percentage' && product.campaignDiscountValue
    ? Math.round(product.campaignDiscountValue)  // Direct value ✅
    : Math.round(((originalPrice - regularPrice) / originalPrice) * 100))
  : 0;
```

**File Modified:**
- [mobile-app/src/services/discountService.ts](mobile-app/src/services/discountService.ts#L555-L577) — Added campaignDiscountType, campaignDiscountValue, and discountBadgePercent fields

---

### Summary of Changes

| Issue | File | Lines | Status |
|-------|------|-------|--------|
| React object-as-child error | CheckoutScreen.tsx | 576, 618, 688 | ✅ Fixed |
| Flash sale pricing not applied | discountService.ts | 474-583 | ✅ Fixed |
| No discount badge in cart | CartItemRow.tsx | 107-124, 224-253 | ✅ Fixed |
| Inaccurate discount % in cart | ProductDetailScreen.tsx | 867-878 | ✅ Fixed |
| Wrong discount % on home page | discountService.ts | 565-567 | ✅ Fixed |

**Files Modified:** 4
- [mobile-app/app/CheckoutScreen.tsx](mobile-app/app/CheckoutScreen.tsx)
- [mobile-app/app/ProductDetailScreen.tsx](mobile-app/app/ProductDetailScreen.tsx)
- [mobile-app/src/components/CartItemRow.tsx](mobile-app/src/components/CartItemRow.tsx)
- [mobile-app/src/services/discountService.ts](mobile-app/src/services/discountService.ts)

**Testing Status:**
✅ TypeScript compilation: No errors on all changes
✅ Discount calculation: Verified consistent across all components
✅ Data flow: Flash sale discounts persist through navigation → product detail → cart
✅ Visual display: Discount percentages now accurate on home page and in cart
✅ Mobile app: Ready for device testing

---

