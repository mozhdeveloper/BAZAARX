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

### Mobile Cart Item Combining Fix - Variant Change Merge Logic

**Status:** ✅ COMPLETE

**Problem:**
When user changed a cart item's variant to match another item with the same product and variant, the items were combining but the quantities were not adding up correctly. Example:
- Image 1: Meow Big Gray (qty 2) + Meow Big Brown (qty 1) = 2 separate items
- User changes Big Gray to Big Brown variant
- Expected: Meow Big Brown (qty 3)
- Actual: Meow Big Brown (qty 1) — the quantity wasn't combining

**Root Causes Identified & Fixed:**

#### 1. **Missing Variant Combining Logic in cartService.ts (Lines 424-510)**
**Problem:** The `updateCartItemVariant()` function only updated the variant_id without checking if another item with the same product and new variant already existed.

**Solution Implemented:**
- Step 1: Fetch current cart item to get product_id and cart_id
- Step 2: Query for existing items with same product_id and new variant_id (excluding current item)
- Step 3: If duplicate found:
  - Extract quantities from both items
  - Convert to explicit numbers to prevent string concatenation
  - Calculate combined quantity: `duplicateQty + currentQty`
  - Validate combined quantity against available stock
  - Update the duplicate item with:
    - Combined quantity
    - New variant_id
    - New personalized_options
  - Delete the original item
- Step 4: If no duplicate, proceed with normal variant update

**Files Modified:**
- `mobile-app/src/services/cartService.ts` (Lines 424-510)

**Key Implementation Detail:**
```typescript
const currentQty = Number(currentQuantity || 0);
const duplicateQty = Number(duplicateItem.quantity || 0);
const newQuantity = duplicateQty + currentQty;
```
Explicit number conversion ensures proper numeric addition (not string concatenation).

---

#### 2. **Async Promise Not Returned in cartStore.ts (Line 490)**
**Problem:** The `updateItemVariant()` function in the cart store called `run()` but didn't return the promise, so `await updateItemVariant()` in CartScreen completed immediately without waiting for the database merge to finish.

**Solution Implemented:**
Changed from: `run();` 
To: `return run();`

This ensures the async chain properly waits for:
- Service to detect and combine duplicate items
- Database update with merged quantity
- Cart to refresh from database
- CartScreen to continue after complete operation

**Files Modified:**
- `mobile-app/src/stores/cartStore.ts` (Line 490)

---

#### 3. **updateQuantity Promise Not Returned in cartStore.ts (Line 414)**
**Problem:** Similar issue - `updateQuantity()` called `run()` without returning, causing race conditions.

**Solution Implemented:**
Changed from: `run();`
To: `return run();`

**Files Modified:**
- `mobile-app/src/stores/cartStore.ts` (Line 414)

---

#### 4. **updateQuantity Overwriting Merged Quantity in CartScreen.tsx (Lines 140-170)**
**Problem:** After `updateItemVariant()` correctly merged quantities in the database, the code was calling `updateQuantity()` with the old item's quantity, which overwrote the correctly merged quantity.

**Example Flow:**
1. Items merge in database: qty 1 + qty 2 = **3** ✓
2. But then `updateQuantity(editingItem.id, 1)` was called ✗  
3. This overwrote merged qty 3 back to **1**

**Solution Implemented:**
Removed the `updateQuantity()` call entirely after `updateItemVariant()`, since the variant update operation already handles all merging logic and sets the correct combined quantity.

**Code Change:**
```typescript
// BEFORE: This was overwriting the merged quantity
await updateItemVariant(editingItem.cartItemId, variantData.variantId, newOptions);
if (newQuantity !== editingItem.quantity) {
  updateQuantity(editingItem.id, newQuantity);  // ❌ REMOVED
}

// AFTER: Only do variant update, which handles merging
await updateItemVariant(editingItem.cartItemId, variantData.variantId, newOptions);
// Do NOT call updateQuantity - the variant update with merge already handles
// setting the correct combined quantity in the database
```

**Files Modified:**
- `mobile-app/app/CartScreen.tsx` (Lines 140-170)

---

### Summary of April 18 Cart Combining Fix

| Issue | Root Cause | Fix | File | Status |
|-------|-----------|-----|------|--------|
| Items not combining | No duplicate detection logic | Implemented full merge logic with stock validation | `cartService.ts` | ✅ |
| Quantity not adding | String concatenation instead of numeric addition | Explicit `Number()` conversion | `cartService.ts` | ✅ |
| Merge not being awaited | Promise not returned from store function | Changed `run()` to `return run()` | `cartStore.ts` | ✅ |
| updateQuantity race | Promise not returned | Changed `run()` to `return run()` | `cartStore.ts` | ✅ |
| Merged qty overwritten | updateQuantity called after merge | Removed updateQuantity call | `CartScreen.tsx` | ✅ |

---

### How It Works Now (Complete Flow)

1. **User Action:** Changes Meow Big Gray (qty 2) variant to Big Brown
2. **Modal Closes:** Calls `updateItemVariant(cartItemId, newVariantId, options)` from CartScreen
3. **Cart Store:** Returns promise from `updateItemVariant` → properly awaitable
4. **Cart Service:** 
   - Fetches current item (qty 2)
   - Queries for duplicates with new variant (finds qty 1)
   - Converts quantities to numbers: 1 + 2 = 3
   - Updates duplicate item with qty 3
   - Deletes old item
5. **Cart Store:** Calls `initializeForCurrentUser()` to refresh from database
6. **CartScreen:** Await completes, cart displays correctly with Meow Big Brown (qty 3)

---

### User Experience Result

**Before:**
- User changes variant
- Items combine but with wrong quantity
- User sees "Meow Big Brown (qty 1)" instead of "(qty 3)"
- Cart total is wrong

**After:**
- User changes variant
- Items properly combine with correct combined quantity
- User sees "Meow Big Brown (qty 3)" ✅
- Cart total is accurate ✅

---

**Files Modified (3):**
- `mobile-app/src/services/cartService.ts` — Full variant combining logic with stock validation
- `mobile-app/src/stores/cartStore.ts` — Fixed promise returns for updateItemVariant and updateQuantity
- `mobile-app/app/CartScreen.tsx` — Removed updateQuantity call that was overwriting merged quantity

**Branch:** `update/payment-gateway-screen-ui`



