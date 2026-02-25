# Role Switching Rollback Plan V2

Date: 2026-02-24
Status: Proposed
Scope: Rollback for role-switch onboarding flows introduced in Implementation Plan V2

## 1. Rollback Objective

If V2 role-switch onboarding fails in production, restore stable switching quickly without data loss.

## 2. Core Safety Rules

Never do during rollback:
- Delete from `profiles`
- Delete from `buyers`
- Delete from `sellers`
- Delete from `user_roles`

Always do first:
- Disable V2 feature flag.
- Validate buyer login, seller login, buyer profile route, seller profile route.

## 3. Rollback Levels

## Level 0: Disable V2 flag (fastest)

Action:
- Set `VITE_ROLE_SWITCH_V2=false`

Expected behavior:
- Switch buttons revert to pre-V2 route behavior.
- No switch onboarding context is used.

Use when:
- Errors are isolated to V2 switch mode pages or context handling.

## Level 1: Revert only switch routing decisions

Files to revert first:
- `web/src/services/roleSwitchService.ts`
- `web/src/pages/BuyerProfilePage.tsx`
- `web/src/components/seller/SellerSidebar.tsx`

Target fallback behavior:
- Buyer -> Seller routes to legacy `/seller/auth` or direct `/seller`.
- Seller -> Buyer routes to `/profile`.

Use when:
- Routing logic is unstable, but core auth works.

## Level 2: Revert switch-mode form behavior

Files:
- `web/src/pages/SellerAuth.tsx`
- `web/src/pages/BuyerSignupPage.tsx`

Target fallback behavior:
- Disable switch-mode overrides.
- Restore default form behavior.

Use when:
- Form state or context parsing causes blocked onboarding or bad submissions.

## Level 3: Revert upgrade methods only

Files:
- `web/src/services/authService.ts`

Target fallback behavior:
- Stop calling session-upgrade helper methods introduced by V2.
- Keep existing sign-in and profile operations.

Use when:
- Upsert/role-upgrade path has server-side or policy errors.

## Level 4: Full code rollback to pre-V2 release

Use when:
- Partial rollback does not restore stability.

Action:
- Deploy pre-V2 stable commit/tag.

## 4. Emergency Fallback UX

If V2 is disabled:
- Buyer switching to seller goes to seller auth choice/login/register.
- Seller switching to buyer goes to buyer login or buyer profile based on session.
- No special prefill-only onboarding enforcement.

## 5. Verification Checklist After Each Rollback Level

Authentication:
- [ ] Buyer can sign in.
- [ ] Seller can sign in.

Switching:
- [ ] Buyer switch button does not crash.
- [ ] Seller switch button does not crash.

Core pages:
- [ ] `/profile` loads.
- [ ] `/seller` loads or redirects intentionally.

Data integrity:
- [ ] No duplicate `(user_id, role)` rows.
- [ ] Existing buyer/seller rows still present.

## 6. SQL Health Checks

```sql
-- duplicate role rows must be zero
select user_id, role, count(*)
from public.user_roles
group by user_id, role
having count(*) > 1;

-- seller role without seller row
select ur.user_id
from public.user_roles ur
left join public.sellers s on s.id = ur.user_id
where ur.role='seller' and s.id is null;

-- buyer role without buyer row
select ur.user_id
from public.user_roles ur
left join public.buyers b on b.id = ur.user_id
where ur.role='buyer' and b.id is null;
```

## 7. Incident Communication Template

1. Incident start time
2. V2 feature flag status
3. Rollback level executed
4. Current user-facing impact
5. ETA to stabilization

## 8. Re-Release Requirements After Rollback

Before enabling V2 again:
- Add regression tests for failed scenario.
- Verify switch context parsing with page refresh.
- Verify upgrade flow with expired session.
- Canary test at least:
  - buyer without seller profile
  - seller without buyer profile
  - dual-role user
