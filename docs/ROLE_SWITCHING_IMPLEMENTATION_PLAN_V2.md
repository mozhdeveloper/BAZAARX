# Role Switching Implementation Plan V2

Date: 2026-02-24
Status: Proposed
Scope: Buyer <-> Seller switch UX and service flow (web)
Supersedes: V1 behavior where missing role rows were auto-created during switch

## 1. Executive Summary

The requested process is doable.

One hard limit must be accepted:
- Existing account passwords cannot be read from Supabase/Auth and cannot be auto-filled.

Best V2 UX to match your goal:
- If the user is already authenticated, do not ask for password again during role switch onboarding.
- Prefill email and phone from profile.
- Ask only for the minimum missing fields:
  - Buyer -> Seller: `storeName`, `storeDescription`, `phone` (step 2 only).
  - Seller -> Buyer: `firstName`, `lastName` (email and phone prefilled).

## 2. Product Rules (Target Behavior)

## 2.1 Buyer -> Seller

When user clicks "Switch to Seller":

1. If seller profile exists and session is valid:
- Route directly to `/seller`.

2. If seller profile exists but session is stale/unusable for seller context:
- Route to `/seller/login` with email prefilled.

3. If seller profile does not exist:
- Route to `/seller/register` in `switch mode` (not new-account mode).
- Step 1 (email/password creation) is skipped.
- Email is prefilled from current profile and locked/read-only.
- Phone is prefilled if available.
- User fills only step 2 fields:
  - `storeName`
  - `storeDescription`
  - `phone` (editable, prefilled if present)
- Submit creates/updates:
  - `user_roles` row for `seller` (idempotent)
  - `sellers` row (idempotent upsert)
- Then route to seller destination (dashboard or pending page based on seller status).

## 2.2 Seller -> Buyer

When user clicks "Switch to Buyer":

1. If buyer profile exists and session is valid:
- Route directly to `/profile`.

2. If buyer profile does not exist:
- Route to `/signup` in `switch mode` (not new-account mode).
- Email and phone are prefilled from current profile and locked/read-only.
- Password fields are hidden in switch mode.
- User fills only:
  - `firstName`
  - `lastName`
- Submit creates/updates:
  - `user_roles` row for `buyer` (idempotent)
  - `buyers` row (idempotent upsert)
  - `profiles.first_name`, `profiles.last_name` if blank
- Then route to `/profile`.

## 3. Security and Technical Constraints

## 3.1 Password auto-fill limitation

Not possible:
- Read current password from auth provider.
- Pre-fill existing password from backend.

Allowed and recommended:
- Use current authenticated session to upgrade role.
- Skip password fields entirely in switch mode.
- If re-auth is needed, ask user to enter password manually in login screen.

## 3.2 PII handling

Avoid putting email/phone in URL query params.
Use navigation state + sessionStorage switch context object.

## 4. Delta From Current V1 Code (Keep vs Revert vs Change)

## Keep
- Seller context hydration protections in seller pages/sidebar.
- Buyer profile loading fallback and user-facing recovery UI.
- Seller profile save flow resiliency (`sellerId` fallback logic).

## Change
- `roleSwitchService.switchToSellerMode`:
  - Missing seller record should route to seller register switch mode, not generic seller auth choice.
- `roleSwitchService.switchToBuyerMode`:
  - Stop silent buyer auto-bootstrap during plain switch.
  - Route missing buyer record to buyer signup switch mode.

## Revert (behavior, not necessarily full code revert)
- Any switch path that creates buyer/seller records without user completing required role onboarding form.

## 5. Architecture and Data Contract

Add a small switch context contract used across pages:

```ts
type SwitchSourceMode = "buyer" | "seller";
type SwitchTargetMode = "buyer" | "seller";

interface RoleSwitchContext {
  sourceMode: SwitchSourceMode;
  targetMode: SwitchTargetMode;
  userId: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
}
```

Storage strategy:
- Primary: `navigate(path, { state: { switchContext } })`
- Fallback on refresh: `sessionStorage["roleSwitchContext"]`
- TTL: 15 minutes

## 6. Detailed Implementation Plan

## Phase A: Service Routing Decisions

Files:
- `web/src/services/roleSwitchService.ts`

Tasks:
1. Add role switch decision methods:
- `switchBuyerToSeller(userId?)`
- `switchSellerToBuyer(userId?)`

2. Each method returns decision routes:
- `/seller`
- `/seller/login` (prefill email state)
- `/seller/register` (switch mode context)
- `/profile`
- `/signup` (switch mode context)
- `/login` as unauthenticated fallback

3. Remove automatic buyer row creation from direct seller->buyer switch.
4. Keep role/table existence checks idempotent.

Exit criteria:
- Service returns deterministic route + context action for all combinations.

## Phase B: Buyer Entry Point Update

Files:
- `web/src/pages/BuyerProfilePage.tsx`

Tasks:
1. Switch button calls new `switchBuyerToSeller`.
2. If result requires onboarding, navigate to seller register switch mode with context.
3. Preserve existing loading/error handling.

Exit criteria:
- Buyer users without seller row land in seller register step 2 flow.

## Phase C: Seller Entry Point Update

Files:
- `web/src/components/seller/SellerSidebar.tsx`

Tasks:
1. Switch button calls `switchSellerToBuyer`.
2. Missing buyer row routes to buyer signup switch mode with context.
3. Existing buyer row routes to `/profile`.

Exit criteria:
- Seller users without buyer row land in reduced buyer signup flow.

## Phase D: Seller Register Switch Mode

Files:
- `web/src/pages/SellerAuth.tsx` (`SellerRegister`)

Tasks:
1. Add `switch mode` detection from navigation state/session context.
2. In switch mode:
- Skip step 1 password/email creation section.
- Preload email from context and show read-only.
- Preload phone if available.
- Default owner name from profile first+last when present.
3. Submit path in switch mode:
- Do not call account `signUp`.
- Use current session user id.
- Add seller role and upsert seller profile.

Exit criteria:
- Buyer can become seller without creating a second auth account.

## Phase E: Buyer Signup Switch Mode

Files:
- `web/src/pages/BuyerSignupPage.tsx`

Tasks:
1. Add `switch mode` detection.
2. In switch mode:
- Prefill email and phone from context, read-only.
- Hide password and confirm password fields.
- Require only first/last name.
3. Submit path in switch mode:
- Do not call account `signUp`.
- Use current session user id.
- Add buyer role and upsert buyer row.
- Upsert profile first/last if missing.

Exit criteria:
- Seller can become buyer by entering only first and last name.

## Phase F: Auth Service Upgrade Methods

Files:
- `web/src/services/authService.ts`

Tasks:
1. Add session-based upgrade methods:
- `upgradeCurrentUserToSeller(payload)`
- `upgradeCurrentUserToBuyer(payload)`

2. Ensure both methods are idempotent:
- role upsert
- role-table row upsert

3. Add helper:
- `getCurrentProfileBasics(userId)` for prefill sourcing.

Exit criteria:
- Upgrade logic is centralized and reusable by UI.

## Phase G: Validation and Guard Hardening

Files:
- `web/src/components/ProtectedSellerRoute.tsx` (if enabled later)
- `web/src/pages/BuyerLoginPage.tsx` (optional prefilled return flow)

Tasks:
1. On missing/expired switch context, redirect safely:
- to `/seller/login` or `/login` based on target.
2. Keep route guards aligned with session + role + row existence.
3. Ensure no path creates duplicate auth accounts by mistake.

Exit criteria:
- No dead-end route and no account duplication from switch flow.

## 7. Database / Schema Assumptions

Confirmed assumptions used by V2:
- `user_roles` exists with unique `(user_id, role)`.
- `profiles` has `email`, `first_name`, `last_name`, `phone`.
- `sellers.id = profiles.id`.
- `buyers.id = profiles.id`.

## 8. QA Matrix (Must Pass)

## Buyer -> Seller
1. Buyer with no seller row:
- lands on seller register switch mode
- email prefilled
- completes store info only
- ends in seller area

2. Buyer with existing seller row:
- goes directly to seller area

3. Buyer with existing seller role but no seller row:
- lands on seller register switch mode

## Seller -> Buyer
4. Seller with no buyer row:
- lands on buyer signup switch mode
- email/phone prefilled
- user inputs first/last only
- lands on buyer profile

5. Seller with existing buyer row:
- goes directly to buyer profile

## Session and Security
6. Session expired:
- switch routes to appropriate login screen
- no crash and no infinite loading

7. No duplicate auth account:
- same `user_id` owns both buyer and seller rows after upgrade.

## Data consistency
8. No duplicate role rows:
- `(user_id, role)` uniqueness intact.

## 9. Rollout Plan

Feature flag:
- `VITE_ROLE_SWITCH_V2=true`

Rollout stages:
1. Local dev
2. Staging
3. Internal canary users
4. Full production

Observability:
- switch route decision counts
- onboarding completion rate
- failed upsert rate for buyers/sellers

## 10. Acceptance Criteria

Functional:
- Requested switch flow is exactly followed.
- No password prompt required for authenticated role upgrade flows.
- No forced silent row creation during switch.

Technical:
- No dependency on `profiles.user_type`.
- No duplicate auth users.
- No critical regressions in seller profile or buyer profile load flows.

## 11. Open Decisions Requiring Product Confirmation

1. Existing seller row but not verified:
- Route to dashboard, or always route to pending page?

2. Email/phone in switch mode:
- Read-only strictly, or allow editing before submit?

3. If profile phone is empty:
- make phone required in seller step 2 (recommended).
