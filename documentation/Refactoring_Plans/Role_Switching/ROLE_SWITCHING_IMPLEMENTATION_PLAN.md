# Role Switching Implementation Plan

Date: 2026-02-24
Status: Draft for Review
Scope: Web app role switching (Buyer <-> Seller)

## 1. Background and Confirmed Facts

The following facts are confirmed from production schema checks:

- `profiles.user_type` does not exist.
- `user_roles` has:
  - `user_roles_pkey` on `(id)`.
  - `user_roles_user_id_role_key` unique index on `(user_id, role)`.
- There are no auto-provisioning triggers for role rows or buyer/seller rows.
  - Only `updated_at` maintenance triggers exist on `profiles`, `buyers`, and `sellers`.
- RLS policies are currently disabled in the environment.

Implication:

- Role truth must come from `public.user_roles`.
- Buyer and seller records must be created explicitly by app logic.
- Any code path reading `profiles.user_type` is a guaranteed mismatch with live schema.

## 2. Goal

Implement safe, deterministic multi-role switching where a single authenticated user can operate as both buyer and seller without account duplication.

Expected UX:

- Buyer mode -> Seller mode switch if seller role exists.
- Buyer mode -> Seller onboarding if seller role does not exist.
- Seller mode -> Buyer mode switch if buyer role exists.
- Seller mode -> Buyer bootstrap flow if buyer role does not exist.

## 3. Design Principles

1. Single identity:
- `profiles` stores identity/contact fields only.

2. Multi-role authorization:
- `user_roles` is source of truth for roles.

3. Role-specific data:
- `buyers` and `sellers` store role-specific information.

4. Idempotent writes:
- Every role/bootstrap operation must be `upsert` or `insert ... on conflict do nothing`.

5. Non-destructive switching:
- Switching mode must never remove roles or delete role records.

6. Explicit runtime mode:
- `activeMode` is an app runtime preference (`buyer` or `seller`), separate from role assignment.

## 4. Scope and Non-Goals

In scope:

- Replace all role checks based on `profiles.user_type` with `user_roles` checks.
- Normalize buyer/seller bootstrap logic for switching.
- Add explicit mode-switch orchestration on web.
- Add tests and rollout guardrails.

Out of scope in this phase:

- Mobile app full parity (can be follow-up phase).
- New RBAC model beyond `buyer|seller|admin`.
- Hard enabling of RLS (planned separately after app compatibility pass).

## 5. Current Gap Analysis (Files)

Primary code areas known to require change:

- `web/src/hooks/profile/useSellerCheck.ts`
  - Uses `profiles.user_type`.

- `web/src/stores/sellerStore.ts`
  - Seller registration flow checks `profiles.user_type` in existing-user path.

- `web/src/services/orderService.ts`
  - POS buyer lookup checks `profiles.user_type`.

- `web/src/stores/buyerStore.ts`
  - Buyer profile select still asks for legacy `full_name` and `user_type` fields.

Secondary files to review during implementation:

- `web/src/pages/BuyerProfilePage.tsx`
  - Seller-switch entry point.

- `web/src/components/seller/SellerSidebar.tsx`
  - Buyer-switch entry point.

- `web/src/components/ProtectedSellerRoute.tsx`
  - Current guard is seller-store session-centric; verify role + seller record handling.

## 6. Target Behavior Matrix

1. User has roles: `[buyer]`.
- Switch to seller requested.
- System adds `seller` role if absent, creates seller row if absent, routes to seller onboarding or seller dashboard depending on profile completeness.

2. User has roles: `[seller]`.
- Switch to buyer requested.
- System adds `buyer` role if absent, creates buyer row if absent, routes to buyer profile/home.

3. User has roles: `[buyer, seller]`.
- Switch mode only updates runtime mode and route.
- No DB mutation required.

4. User missing role record but has table row (drift).
- Self-healed by ensure-role logic.

5. User has role record but missing table row (drift).
- Self-healed by ensure-table-row logic.

## 7. Detailed Implementation Plan

## Phase 0: Safety Preparation

Deliverables:

- Branch dedicated to role switching.
- Snapshot SQL exports of impacted tables (`profiles`, `user_roles`, `buyers`, `sellers`).
- Baseline logs for sign-in, seller registration, buyer profile load, POS order linking.

Tasks:

1. Create branch:
- `git checkout -b feat/role-switching-web`

2. Capture baseline test status:
- Run existing auth/profile/order-related tests and store output.

3. Capture schema baseline:
- Save outputs of role/table verification queries in documentation.

Exit criteria:

- Baseline documented and reproducible.

## Phase 1: Introduce Role Switching Service Layer

Deliverables:

- New service module to centralize role checks/bootstrap.

Suggested file:

- `web/src/services/roleSwitchService.ts`

Suggested API surface:

- `getRoles(userId): Promise<UserRole[]>`
- `hasRole(userId, role): Promise<boolean>`
- `ensureBuyerRoleAndRecord(userId): Promise<void>`
- `ensureSellerRoleAndRecord(userId, sellerSeed?): Promise<void>`
- `switchToBuyerMode(userId): Promise<{ route: string }>`
- `switchToSellerMode(userId, sellerSeed?): Promise<{ route: string }>`

Notes:

- All methods must be idempotent.
- Keep DB writes minimal and wrapped in safe sequencing.
- On seller creation conflict (store_name unique), fallback to deterministic temporary store name and force user edit in onboarding.

Exit criteria:

- A single service owns switch behavior and is reusable by page/sidebar flows.

## Phase 2: Remove Legacy `profiles.user_type` Dependencies

Deliverables:

- No runtime logic depends on `profiles.user_type`.

Tasks:

1. Update `useSellerCheck`:
- Query `user_roles` by `user_id` and `role='seller'`.
- If hook currently only has email, resolve profile id by email first then role check.

2. Update `sellerStore.register`:
- Replace existing-profile `user_type` checks with `authService.isUserSeller(user.id)` or direct `user_roles` lookup.

3. Update `orderService` POS buyer lookup:
- Replace profile `user_type='buyer'` check with:
  - verify role in `user_roles`, or
  - verify row in `buyers` table.

4. Update `buyerStore.initializeBuyerProfile` select:
- Stop selecting `full_name` and `user_type` from `profiles`.
- Build names using `first_name` + `last_name`.

Exit criteria:

- Search for `profiles.user_type` references in runtime app code returns none.

## Phase 3: Wire Mode Switch UX to Service

Deliverables:

- Buyer and seller switch actions call unified service methods.

Tasks:

1. Buyer side switch button (`BuyerProfilePage`):
- Call `switchToSellerMode`.
- Route according to response.

2. Seller sidebar switch button:
- Call `switchToBuyerMode`.
- Route according to response.

3. Add loading and error handling states:
- Disable button while switching.
- Show actionable errors (for example, seller bootstrap failed).

4. Persist local active mode:
- Store in local session/storage state (for UI continuity only).
- Do not treat this as authorization.

Exit criteria:

- Switch works from both entry points and is idempotent.

## Phase 4: Guarding and Routing Hardening

Deliverables:

- Route-level checks align with role records and profile readiness.

Tasks:

1. Seller route guard behavior:
- If no seller role or seller row, redirect to seller auth/onboarding path.
- If seller exists but pending/rejected, route to pending page.

2. Buyer route behavior:
- If no buyer row for authenticated user, auto-bootstrap buyer row or route through bootstrap.

3. Ensure auth logout does not corrupt role context:
- Role context is server-derived on session restore.

Exit criteria:

- Direct URL access to buyer/seller routes behaves consistently.

## Phase 5: Optional Data Health Script

Deliverables:

- One-time idempotent script/query set to reconcile drift.

Purpose:

- Align `user_roles` with existing `buyers`/`sellers` rows for legacy users.

Suggested SQL (example template):

```sql
insert into public.user_roles (user_id, role)
select b.id, 'buyer'
from public.buyers b
left join public.user_roles ur
  on ur.user_id = b.id and ur.role = 'buyer'
where ur.user_id is null;

insert into public.user_roles (user_id, role)
select s.id, 'seller'
from public.sellers s
left join public.user_roles ur
  on ur.user_id = s.id and ur.role = 'seller'
where ur.user_id is null;
```

Exit criteria:

- No orphan buyers/sellers without matching user_roles.

## Phase 6: Testing and QA

Deliverables:

- Unit, integration, and manual QA matrix completed.

Unit tests:

- role service idempotency.
- role detection and bootstrap branches.
- error handling on duplicate/constraint conflicts.

Integration tests:

1. Buyer only user -> switch to seller -> seller role + seller row created.
2. Seller only user -> switch to buyer -> buyer role + buyer row created.
3. Multi-role user -> switches both directions without DB mutation.
4. Seller pending -> routes to pending page.
5. POS buyer lookup still links points for registered buyers.

Manual QA checklist:

- Register buyer, switch to seller, complete onboarding.
- Register seller, switch to buyer.
- Logout/login and verify mode switch still works.
- Verify no duplicate role rows.
- Verify existing order/cart flows unaffected.

## Phase 7: Rollout

Recommended rollout strategy:

1. Deploy with feature flag:
- `VITE_ROLE_SWITCH_V2=true`.

2. Canary internal users first.

3. Observe:
- switch failure rate
- seller onboarding completion rate
- auth/session errors

4. Expand to all users after 24-48h stable window.

## 8. SQL Validation Queries for Go-Live

Run before rollout:

```sql
select to_regclass('public.user_roles') as user_roles_table;

select indexname, indexdef
from pg_indexes
where schemaname='public' and tablename='user_roles'
order by indexname;

select exists (
  select 1
  from information_schema.columns
  where table_schema='public' and table_name='profiles' and column_name='user_type'
) as has_profiles_user_type;
```

Run after rollout:

```sql
-- duplicate role rows should be impossible and must be zero
select user_id, role, count(*)
from public.user_roles
group by user_id, role
having count(*) > 1;

-- users with seller role but missing seller row
select ur.user_id
from public.user_roles ur
left join public.sellers s on s.id = ur.user_id
where ur.role='seller' and s.id is null;

-- users with buyer role but missing buyer row
select ur.user_id
from public.user_roles ur
left join public.buyers b on b.id = ur.user_id
where ur.role='buyer' and b.id is null;
```

## 9. Acceptance Criteria

Functional:

- Buyer can switch to seller mode and back with same account.
- Seller can switch to buyer mode and back with same account.
- No dependency on `profiles.user_type` remains.

Data integrity:

- `user_roles` remains unique by `(user_id, role)`.
- No orphan role records relative to buyer/seller tables.

Operational:

- No critical auth regression.
- Rollback playbook tested in staging.

## 10. Risks and Mitigations

Risk: hidden runtime paths still query legacy fields.
Mitigation: `rg` scan + integration coverage for critical flows.

Risk: seller creation conflict due store_name uniqueness.
Mitigation: deterministic temporary name + onboarding correction flow.

Risk: switching from stale local store state.
Mitigation: re-fetch roles from DB on each switch action.

Risk: RLS re-enable later could break queries.
Mitigation: separate RLS hardening phase with policy tests.

## 11. Execution Checklist

- [ ] Phase 0 baseline captured
- [ ] Phase 1 service added
- [ ] Phase 2 legacy references removed
- [ ] Phase 3 switch UI wired
- [ ] Phase 4 route guards hardened
- [ ] Phase 5 drift reconciliation prepared
- [ ] Phase 6 tests passed
- [ ] Phase 7 canary rollout complete

## 12. Open Decisions

1. Should `activeMode` remain local-only or be persisted server-side for cross-device continuity?
2. Should seller mode be blocked until admin verification, or allow restricted pre-verification dashboard?
3. Should buyer auto-bootstrap happen silently or through explicit confirmation UI?
