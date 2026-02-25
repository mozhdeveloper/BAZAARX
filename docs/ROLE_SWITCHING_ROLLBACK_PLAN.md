# Role Switching Rollback and Recovery Plan

Date: 2026-02-24
Status: Draft for Review
Applies to: Web role-switching rollout (Buyer <-> Seller)

## Rollback Strategy Decision (Approved)

Rollback is phase-aware and non-destructive.

Selected rollback policy:

1. For Phase 1-3 issues (web-first runtime rollout):
- Disable feature flag first (VITE_ROLE_SWITCH_V2).
- If unresolved, rollback only affected web app release.
- Do not execute DB schema rollback for these phases.

2. For Phase 4 issues (mobile parity):
- Roll back mobile runtime changes independently from web.
- Keep web release intact if healthy.

3. For Phase 5 cleanup issues (scripts/tests/types):
- Revert cleanup commits only.
- Keep runtime fixes active.

Why this is safest:

- Early phases are app-logic changes, not schema changes.
- Feature-flag-first rollback restores stability fastest.
- Avoids risky and unnecessary DB-level reversions.

### Emergency Compatibility Escape Hatch

If required during incident mitigation:

- Use temporary runtime fallback checks to table existence (buyers/sellers) while keeping user_roles primary.
- Do not reintroduce dependency on profiles.user_type.

### Phase-Specific Rollback Matrix

- Phase 1 (Web blockers): flag off -> web deploy rollback.
- Phase 2 (Web switch service): flag off -> revert switch service wiring.
- Phase 3 (Web guard hardening): revert guard-only changes.
- Phase 4 (Mobile parity): revert mobile-only changes.
- Phase 5 (Cleanup): revert cleanup-only commits.

### DB Rollback Rule

No DB object rollback unless the release explicitly introduced DB objects proven to cause production failures.

## 1. Purpose

This document defines how to quickly and safely revert role-switching changes if production behavior degrades after deployment.

Primary goals:

- Restore stable login and navigation behavior quickly.
- Preserve user and order data.
- Avoid destructive data operations.

## 2. Rollback Principles

1. Safety first:
- Prefer reversible toggles and code rollback over database data deletion.

2. Keep data:
- Never delete rows from `profiles`, `user_roles`, `buyers`, or `sellers` as part of emergency rollback.

3. Fastest viable path:
- Use the least invasive rollback level that resolves the incident.

4. Verify after each rollback level:
- Confirm key user journeys before proceeding to deeper rollback.

## 3. Incident Triggers for Rollback

Initiate rollback if any of these occur after release:

- Login success rate drops materially.
- Buyer or seller pages become inaccessible for valid users.
- Mode switching fails for a significant share of users.
- Critical order flows fail due role-resolution logic.
- Error volume related to role checks spikes and persists.

## 4. Preconditions Before Production Rollout

Required safeguards before shipping role-switching changes:

1. Git safety points:
- Tag stable pre-release commit.
- Record exact release commit hash.

2. DB safety:
- Export schema-only and data-only backup for identity tables.
- Save pre-release query snapshots for:
  - orphan role checks
  - role duplication checks

3. Operability:
- Feature flag available for role-switching path.
- Runbook owner assigned for incident response.

## 5. Rollback Levels

Use levels in order. Stop when system is stable.

## Level 0: Feature Flag Disable (Fastest)

When to use:

- New flow is unstable, but existing auth/session system still functional.

Action:

- Disable `VITE_ROLE_SWITCH_V2` (or equivalent runtime flag).
- Re-deploy config-only build if needed.

Expected effect:

- App returns to old switch logic immediately.

Verification:

- Buyer login works.
- Seller login works.
- Buyer and seller dashboards load.

## Level 1: Application Code Rollback

When to use:

- Feature flag disable insufficient.
- New code introduces broader regressions.

Action:

1. Identify stable tag/commit.
2. Roll back app deployment to stable build.

Suggested git workflow:

```bash
git checkout main
git pull
# choose one:
# git revert <release_commit_hash>
# or deploy previous stable tag
```

Expected effect:

- Runtime logic returns to known stable version.

Verification:

- Switch critical route smoke tests pass.
- Error logs return to baseline.

## Level 2: Compatibility Hotfix (No Data Revert)

When to use:

- Need immediate fix while preserving most new code.

Action:

- Patch role checks to only use `user_roles` and fallback table existence checks.
- Remove/disable any path still expecting legacy `profiles.user_type`.

Expected effect:

- Quick stabilization without full release rollback.

Verification:

- Affected journeys succeed for buyer-only, seller-only, and dual-role users.

## Level 3: Database Object Rollback (Only if New DB Objects Were Added)

When to use:

- Release included new DB objects (columns/functions/triggers) that cause failures.

Important:

- Do not delete user/business data.
- Only rollback newly added schema objects proven to be problematic.

Example guarded rollback template:

```sql
-- Example only: drop newly added function if it exists
DROP FUNCTION IF EXISTS public.switch_active_mode(uuid, text);

-- Example only: drop newly added trigger if it exists
DROP TRIGGER IF EXISTS trg_profiles_active_mode_sync ON public.profiles;

-- Example only: drop newly added column if and only if approved
ALTER TABLE public.profiles DROP COLUMN IF EXISTS active_mode;
```

Verification:

- Schema checks run clean.
- App can run using previous logic.

## 6. Data Safety Rules During Rollback

Never run in emergency rollback:

- `delete from profiles`
- `delete from buyers`
- `delete from sellers`
- `delete from user_roles`

Allowed during emergency rollback:

- Deploy previous application code.
- Disable feature flags.
- Drop only newly added schema objects (if explicitly part of this release).

## 7. Post-Rollback Verification Checklist

Auth and role basics:

- [ ] User can sign in.
- [ ] Buyer pages load for buyer account.
- [ ] Seller pages load for seller account.
- [ ] Existing seller onboarding flow is accessible.

Data integrity:

- [ ] No duplicate role rows.
- [ ] No orphan seller roles without sellers row.
- [ ] No orphan buyer roles without buyers row.

Queries:

```sql
-- duplicate role rows
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

Operational:

- [ ] Error rate back to baseline.
- [ ] Support tickets for auth/switch stop increasing.

## 8. Communication Plan During Rollback

Internal updates to engineering/support:

1. Incident declared with timestamp.
2. Rollback level selected and rationale.
3. ETA to mitigation.
4. Verification complete notice.
5. Root-cause analysis follow-up schedule.

## 9. Root Cause Analysis Template (After Stabilization)

Capture:

- Exact failing journey(s).
- First bad release hash.
- Logs/errors with timestamps.
- Missed test coverage.
- Preventive actions and owners.

## 10. Forward-Fix Plan After Rollback

Once stable, reintroduce changes safely:

1. Re-scope to smallest failing area.
2. Add targeted tests for the incident case.
3. Re-release behind feature flag to canary users.
4. Observe 24-48 hours before broad rollout.

## 11. Quick Command Reference

Git:

```bash
# show current release
 git rev-parse HEAD

# inspect tags
 git tag --sort=-creatordate | head

# rollback by revert
 git revert <bad_commit_hash>

# create hotfix branch
 git checkout -b hotfix/role-switch-rollback
```

SQL health checks:

```sql
select to_regclass('public.user_roles') as user_roles_table;

select exists (
  select 1
  from information_schema.columns
  where table_schema='public' and table_name='profiles' and column_name='user_type'
) as has_profiles_user_type;
```

## 12. Approval Gates

Before rollback execution:

- Incident owner approves rollback level.
- DBA sign-off if Level 3 is needed.

Before rollback closure:

- QA sign-off on smoke suite.
- Engineering sign-off on metrics returning to baseline.


