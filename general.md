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

## Session Log — April 24, 2026

### PayMongo Checkout and Profile Payment Methods Parity (Web)

**Status:** ✅ COMPLETE

**Objective:** Align web checkout/payment behavior with mobile by improving PayMongo card handling, enforcing sandbox test-card policy, and ensuring checkout card entry is persisted to Profile Payment Methods.

**Scope Delivered Today:**

### 1. Checkout Layout and Order Summary Width

**Modified:** [web/src/pages/CheckoutPage.tsx](web/src/pages/CheckoutPage.tsx)

- Adjusted desktop checkout grid proportions so the order summary panel is wider.
- Preserved two-column layout integrity (form + summary).
- Kept responsive behavior intact for smaller breakpoints.

### 2. Profile Payment Methods Web/Mobile Consistency

**Modified:** [web/src/components/profile/PaymentMethodsSection.tsx](web/src/components/profile/PaymentMethodsSection.tsx)
**Modified:** [web/src/components/profile/PaymentMethodModal.tsx](web/src/components/profile/PaymentMethodModal.tsx)
**Modified:** [web/src/hooks/profile/usePaymentMethodManager.ts](web/src/hooks/profile/usePaymentMethodManager.ts)

- Updated web profile payment methods flow to match mobile UX direction.
- Focused PayMongo/card path as primary active payment method flow.
- Applied stricter validation for manual card entry consistency.

### 3. Strict PayMongo Sandbox Policy (Test Cards Only)

**Modified:** [web/src/pages/CheckoutPage.tsx](web/src/pages/CheckoutPage.tsx)
**Modified:** [web/src/services/payMongoService.ts](web/src/services/payMongoService.ts)

- Enforced test-card-only checks in checkout validation layer.
- Enforced the same policy in service layer to prevent bypass.
- Non-test cards are now rejected consistently before/at processing.

### 4. Saved Card + Use Different Card in Web Checkout

**Modified:** [web/src/pages/CheckoutPage.tsx](web/src/pages/CheckoutPage.tsx)

- Added saved PayMongo card selection in checkout when cards exist.
- Added "Use Different Card" path to allow manual entry during checkout.
- Ensured payload includes `cardDetails` only for manual-entry flow.

### 5. Auto-Save Checkout Card to Profile (No Saved Card Case)

**Modified:** [web/src/pages/CheckoutPage.tsx](web/src/pages/CheckoutPage.tsx)

- Implemented post-success save behavior that mirrors mobile logic:
  - If payment method is PayMongo card,
  - and buyer has no saved PayMongo card,
  - and buyer entered card manually,
  - then save card to Payment Methods after successful checkout.
- Uses existing payment service write path and updates local buyer state immediately so Profile reflects the card without reload.
- Save failure is non-blocking: order success is preserved and user receives a clear notice.

---

### Files Modified (Today)

| File | Changes | Status |
|------|---------|--------|
| [web/src/pages/CheckoutPage.tsx](web/src/pages/CheckoutPage.tsx) | Checkout width update, PayMongo validation, saved card selection, use-different-card path, post-success auto-save to Profile | ✅ Modified |
| [web/src/services/payMongoService.ts](web/src/services/payMongoService.ts) | Service-level test-card-only enforcement for PayMongo | ✅ Modified |
| [web/src/components/profile/PaymentMethodsSection.tsx](web/src/components/profile/PaymentMethodsSection.tsx) | Profile payment methods parity updates | ✅ Modified |
| [web/src/components/profile/PaymentMethodModal.tsx](web/src/components/profile/PaymentMethodModal.tsx) | Card add modal validation and PayMongo-focused flow | ✅ Modified |
| [web/src/hooks/profile/usePaymentMethodManager.ts](web/src/hooks/profile/usePaymentMethodManager.ts) | Payment method manager alignment with updated card flow | ✅ Modified |

**Total Files Modified:** 5

---

### Validation Snapshot

✅ No TypeScript errors in changed checkout file after latest patch
✅ Web flow now mirrors mobile behavior for manual-card save after successful PayMongo checkout (no-saved-card scenario)
✅ Test-card-only policy applied in both UI and service layers

---

### Next Step

Run end-to-end user testing for:
- Existing saved card checkout path
- No saved card manual-entry checkout path
- Profile Payment Methods reflecting newly saved PayMongo card immediately after successful order

---

