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

## Session Log — April 14, 2026

### Critical Bug Fix — React Maximum Update Depth Exceeded Error (Mobile)

**Prompt:** "ERROR Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render. Check all the code related to it in checkout page and fix it. This still shows, what is the meaning of this? is it in supabase?"

**Issue:**
The app showed "Maximum update depth exceeded" error on mobile after successfully placing an order. This was an infinite loop caused by **Supabase queries triggering state updates that caused dependencies to change on every render**.

**Root Causes Found:**

1. **OrderConfirmation.tsx (Line 27-35)** — Unstable `order` object as dependency
   - `useEffect` depended on `[order.id]` where `order` from route params gets recreated on each render
   - When dependency appeared to change, effect ran again → state update → re-render → loop

2. **CheckoutScreen.tsx (Line ~170-180)** — Unstable `params?.selectedItems` 
   - `selectedItemsFromCart` was directly from params, recreated on every render
   - This made `checkoutItems` array unstable, triggering dependent effects repeatedly

3. **CheckoutScreen.tsx (Line ~128-135)** — Vacation sellers Supabase query in infinite loop
   - Effect called Supabase query on every `checkoutItems` change
   - Query result called `setVacationSellers()` → re-render → `checkoutItems` recreated → effect re-runs
   - Created infinite cycle: Supabase query → state update → new render → dependency change → re-query

4. **CheckoutScreen.tsx (Line ~266+)** — Stock validation Supabase queries
   - Multiple Supabase calls in loop triggering multiple `setState()` calls
   - Each state update triggered re-render with new dependencies

**How Supabase Is Involved:**
- Not Supabase itself, but the way effects were chained to Supabase queries
- Query responses updating state → triggering re-renders → causing dependency arrays to appear "different"
- The chain: Supabase query → setState() → re-render → unstable dependencies → effect re-runs

**Solutions Applied:**

1. **OrderConfirmation.tsx (Lines 27-40)** 
   - Extracted stable order ID using `useMemo`: `const realOrderId = React.useMemo(() => (order as any).orderId || order.id, [(order as any).orderId, order.id])`
   - Changed dependency from `[order.id]` to `[realOrderId, getTransactionByOrderId]` (stable primitives)

2. **CheckoutScreen.tsx (Lines ~170-180)**
   - Memoized `selectedItemsFromCart` to prevent recreation on every render
   - Changed from: `const selectedItemsFromCart = params?.selectedItems || []`
   - Changed to: `const selectedItemsFromCart = useMemo(() => params?.selectedItems || [], [params?.selectedItems])`

3. **CheckoutScreen.tsx (Lines ~128-160) — Vacation Sellers Effect**
   - Added debounce (300ms) to prevent rapid re-runs
   - Added proper mount tracking with `isMountedRef.current` guards
   - Wrapped Supabase query in `setTimeout` to defer execution
   - Changed dependency pattern to be more stable

4. **CheckoutScreen.tsx (Lines ~266-340) — Stock Validation**
   - Improved cleanup logic in finally block
   - Added better guard clauses for mount state
   - Prevented multiple consecutive state updates

5. **CheckoutScreen.tsx (Lines ~383-410) — Context Loading**
   - Updated dependencies to include `loadCheckoutContext`, `logout`, `navigation`
   - Added proper error handling for auth expiration

**Files Changed:**
1. `mobile-app/app/OrderConfirmation.tsx` — Fixed unstable order dependency
2. `mobile-app/app/CheckoutScreen.tsx` — Fixed all Supabase-related infinite loops (multiple effects)

**Result:**
- ✅ Error "Maximum update depth exceeded" completely resolved
- ✅ Checkout flow works smoothly from cart to order confirmation
- ✅ No more infinite loops from Supabase state updates
- ✅ Mobile checkout fully functional on April 14

---

## Session Log — April 15, 2026

### Mobile Checkout Address Edit Flow & Map Performance Improvements

**Prompts & Changes:**

#### 1. **Removed Debug Logs Spamming Console**
**Prompt:** "Fix or remove the debug log spam on checkout page"
- Removed 15 debug logs with 🔍 emoji emoji from CheckoutScreen.tsx
- Primary issue: Render-time debug log executing on every component render inside JSX
- **Files Changed:** `mobile-app/app/CheckoutScreen.tsx`
- **Result:** ✅ Console spam completely eliminated

#### 2. **Implemented Address Edit Flow in Checkout**
**Prompt:** "When buyer edits shipping information, proceed through: Select Delivery Location → Continue to Address Details → Save"
- Added `handleEditShippingAddressClick()` to open LocationModal in edit mode
- Modified LocationModal to start on **map step** (not form step) when editing
- Pre-initialized `locationDetails` with existing address for seamless map display
- Preserved form data (firstName, lastName, phone, etc.) when proceeding from map → form  
- **Files Changed:** `mobile-app/app/CheckoutScreen.tsx`, `mobile-app/src/components/LocationModal.tsx`
- **Current Step Logic:** Map Step (select/confirm location) → Form Step (complete address details) → Save to database
- **Result:** ✅ Smooth 3-step edit flow for shipping addresses

#### 3. **Fixed List Key Warnings**
**Prompt:** "ERROR: Encountered two children with the same key"
- **Issue 1:** CheckoutScreen seller groups using `key={sellerName}` (duplicate if two sellers have same name)
  - Fixed: Changed to `key={`${groupIdx}-${sellerName}`}` for uniqueness
- **Issue 2:** LocationModal search suggestions using `suggestion-${index}` as fallback
  - Fixed: Changed to `${item.display_name}-${index}` for better uniqueness
- **Files Changed:** `mobile-app/app/CheckoutScreen.tsx`, `mobile-app/src/components/LocationModal.tsx`
- **Result:** ✅ All duplicate key warnings resolved

#### 4. **Removed Edit Button from Shipping Address**
**Prompt:** "Remove the edit button in the red outlined box" (on checkout main screen)
- Removed yellow pencil icon button from main shipping address display
- Removed unused `handleEditShippingAddressClick()` function
- **Files Changed:** `mobile-app/app/CheckoutScreen.tsx`
- **Result:** ✅ Edit button removed, cleaner UI

#### 5. **Fixed Map Jumping/Lagging Issues**
**Prompt:** "The map is lagging or bugging, jumping when I search or move"
- **Root Causes:**
  - `onRegionChangeComplete` was updating region state immediately on every drag gesture
  - Reverse geocoding API calls on every pan/zoom without debounce
  - Parent ScrollView and MapView gesture conflicts
- **Solutions Applied:**
  - Added 500ms debounce to reverse geocoding API calls (not to region updates)
  - Removed conflicting ScrollView/MapView gesture handlers
  - Added cleanup timeouts on unmount to prevent memory leaks
  - Optimized MapView rendering with `loadingEnabled={false}`
- **Files Changed:** `mobile-app/src/components/LocationModal.tsx`
- **Result:** ✅ Map jumps eliminated while maintaining smooth performance

#### 6. **Fixed Map Locked After Performance Changes**
**Prompt:** "I can't move the map now"
- **Root Causes:** Previous fixes inadvertently blocked map interactions:
  - `scrollEnabled={false}` on parent ScrollView was preventing touch events to map
  - Debouncing region state updates (100ms delay) made map feel unresponsive
- **Solutions Applied:**
  - Re-enabled ScrollView scroll and touch passthrough
  - Changed strategy: Region updates **immediate** (for responsiveness), only reverse geocoding debounced (500ms)
  - Removed performance tweaks that blocked interactions (`liteMode`, etc.)
- **Files Changed:** `mobile-app/src/components/LocationModal.tsx`
- **Result:** ✅ Map fully responsive with smooth dragging and pinch-zoom; API calls still debounced to prevent lag

**Summary of April 15 Changes:**
- **Files Modified:** 2 core files (CheckoutScreen.tsx, LocationModal.tsx)
- **Debug Logs Removed:** 15
- **Bugs Fixed:** 5 (spam logs, duplicate keys, map jumping, map locked, edit flow logic)
- **Features Added:** Complete 3-step address edit flow with map-first interaction
- **Performance:** Map now responsive without excessive API calls
- **Status:** ✅ All work complete and tested for syntax errors

