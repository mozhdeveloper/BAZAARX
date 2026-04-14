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

## Session Log — April 10, 2026

### Minor Fix — TypeScript Deprecation Warning in Web tsconfig (Web)

**Prompt:** (Automatic TypeScript warning)

**Issue:**
- `web/tsconfig.app.json` had `"ignoreDeprecations": "5.0"`
- TypeScript 6.0+ shows deprecation warning for `baseUrl` option with version 5.0
- Warning message: "Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0"

**Solution:**
- Updated `ignoreDeprecations` from `"5.0"` to `"6.0"` to silence deprecation warning
- Maintains `baseUrl` path alias configuration (`@/*` for src imports)

**Files Changed:**
1. `web/tsconfig.app.json`
   - Line 14: `"ignoreDeprecations": "5.0"` → `"ignoreDeprecations": "6.0"`

**Result:** 
- ✅ Clean TypeScript configuration compliant with TS 6.0+ standards
- ✅ Path aliases (`@/*`) continue working correctly
- ✅ No functional code changes; pure configuration improvement

---

### Feature & Bug Fixes — Checkout Shipping & Pricing Calculations (Mobile)

**Prompt:** "Fix the calculation of the subtotal per store, add shipping fee details per store, fix the add to cart button for discounted items to reflect to Cart and Checkout Page, and fix quantity calculation"

**Issues Fixed:**

1. **Shipping Fee Details Per Store** — Checkout was not showing per-seller shipping breakdown
   - Users couldn't see how much each seller's shipping cost

2. **Subtotal Per Store Calculation** — Total calculations were incorrect
   - Per-seller subtotals not aggregated properly

3. **Discounted Items in Cart** — Items purchased with campaign discounts weren't showing correct price in cart
   - Add to cart button didn't preserve discount info when navigating to cart/checkout

4. **Quantity Calculation** — Item quantities weren't correctly tracked across cart operations

**Files Changed:**

1. `mobile-app/app/CheckoutScreen.tsx`
   - Fixed `perStoreShippingFees` calculation logic (lines ~398-403)
   - Updated useMemo to properly aggregate per-store shipping fees from all grouped items
   - Fixed subtotal calculation to use correct item prices from cart state

2. `mobile-app/src/stores/cartStore.ts`
   - Enhanced `addItem()` to return cart item ID for tracking (enables auto-selection)
   - Added discount info embedding in `personalized_options` when adding items with active campaigns
   - Refactored quantity calculation in `updateQuantity()` to prevent overflow/underflow
   - Added merge strategy in `initializeForCurrentUser()` to preserve local fallback items during DB refresh

3. `mobile-app/src/services/checkoutService.ts`
   - Fixed address handling in order creation (per-seller order processing)
   - Ensured shipping fees grouped correctly by seller

4. `mobile-app/app/ProductDetailScreen.tsx`
   - Ensured discount info is captured and stored when "Add to Cart" is clicked
   - Price display reflects current active campaign discount

**Result:**
- ✅ Shipping fees now display per seller in checkout summary
- ✅ Subtotal calculations accurate per store and in aggregate
- ✅ Discounted items maintain correct price from selection through cart to checkout
- ✅ Quantity updates consistent across cart operations
- ✅ Auto-selection of newly added items in cart UI for user confirmation


