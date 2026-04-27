# P0 Implementation — Queries to Run

> Lead-engineer execution plan for the P0 fixes from `DEV_FIX_LIST.md`.
> Two new migrations + matching application-code changes have been committed.
> This file is the runbook for applying them to Supabase.

---

## Scope

| Fix | Title | Approach |
|---|---|---|
| FIX-001 | `order_shipments.seller_id` → `uuid` | DDL in `039` (drops + rebuilds dependent RLS policies) |
| FIX-002 | `seller_notifications.seller_id` `NOT NULL` | DDL in `039` |
| FIX-003 | `refund_return_periods.resolved_by` → `uuid` + new `resolution_source` | DDL in `039` + app code |
| FIX-004 | 9 nullable `created_at` / `updated_at` → `NOT NULL DEFAULT now()` | DDL in `039` |
| FIX-012 | `varchar` → `text` on 6 outlier tables | DDL in `039` |
| FIX-005 | **Drop** `seller_payout_accounts`, replace with updatable view → `seller_payout_settings` | DDL in `040` |
| FIX-006 | **Drop** `admin_action_log`, replace with updatable view → `admin_audit_logs` | DDL in `040` |

**Deferred (FIX-007)**: collapsing `order_payments` into `payment_transactions`. Has too many PostgREST embed callsites in mobile + web; needs app refactor first.

---

## What changed since the previous draft

* `039` now **drops the two RLS policies on `order_shipments` that referenced `seller_id`** before the `ALTER COLUMN ... TYPE uuid`, then recreates them without the legacy `::text` cast. Fixes the error you hit:
  `cannot alter type of a column used in a policy definition`.
* `040` no longer just installs sync triggers — it **physically removes the duplicate tables**:
  1. Backfills the canonical table.
  2. `DROP TABLE ... CASCADE` (drops policies, indexes, grants).
  3. Recreates the duplicate name as an **updatable view** over the canonical table.
  4. Installs `INSTEAD OF INSERT/UPDATE/DELETE` triggers so every legacy `SELECT/INSERT/UPDATE/DELETE` keeps working with zero app code changes.

---

## Pre-flight checks (run BEFORE anything)

```sql
-- 1. Any non-UUID seller_id rows in order_shipments? (will block 039)
SELECT id, seller_id
FROM public.order_shipments
WHERE seller_id IS NOT NULL
  AND seller_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
LIMIT 50;

-- 2. Orphan seller_notifications that 039 will delete.
SELECT count(*) FROM public.seller_notifications WHERE seller_id IS NULL;

-- 3. Sentinel resolved_by values 039 will move to resolution_source.
SELECT resolved_by, count(*)
FROM public.refund_return_periods
WHERE resolved_by IS NOT NULL
  AND resolved_by !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
GROUP BY resolved_by;

-- 4. Baseline counts for the duplicates 040 will collapse.
SELECT 'admin_action_log'        AS t, count(*) FROM public.admin_action_log
UNION ALL SELECT 'admin_audit_logs',       count(*) FROM public.admin_audit_logs
UNION ALL SELECT 'seller_payout_accounts', count(*) FROM public.seller_payout_accounts
UNION ALL SELECT 'seller_payout_settings', count(*) FROM public.seller_payout_settings;
```

---

## Step 1 — Apply migration 039

Paste `supabase-migrations/039_p0_type_and_constraint_fixes.sql` into the Supabase SQL editor and run. Wrapped in `BEGIN…COMMIT`, atomic.

What it does:
1. Drops `Sellers can read own shipments` and `Sellers can update own shipments` RLS policies, casts `order_shipments.seller_id` `text → uuid`, recreates the policies using `seller_id = auth.uid()` directly. Adds `FK → sellers(id)`.
2. Deletes orphan `seller_notifications`, `SET NOT NULL` on `seller_id`.
3. Adds `refund_return_periods.resolution_source text` + check constraint, moves sentinel-string `resolved_by` values into `resolution_source`, casts `resolved_by` to `uuid`.
4. Indexes the new columns.
5. Backfills + `SET NOT NULL` + `DEFAULT now()` on the 9 nullable timestamps.
6. `varchar → text` across 6 tables.

### Verification after 039

```sql
SELECT data_type FROM information_schema.columns
 WHERE table_schema='public' AND table_name='order_shipments' AND column_name='seller_id';
-- expect: uuid

SELECT polname FROM pg_policy
 WHERE polrelid = 'public.order_shipments'::regclass
   AND polname IN ('Sellers can read own shipments','Sellers can update own shipments');
-- expect: 2 rows

SELECT is_nullable FROM information_schema.columns
 WHERE table_schema='public' AND table_name='seller_notifications' AND column_name='seller_id';
-- expect: NO

SELECT column_name, data_type FROM information_schema.columns
 WHERE table_schema='public' AND table_name='refund_return_periods'
   AND column_name IN ('resolved_by','resolution_source');
-- expect: resolved_by=uuid, resolution_source=text
```

---

## Step 2 — Apply migration 040

Paste `supabase-migrations/040_consolidate_duplicate_tables.sql` and run.

What it does:
1. **FIX-006**: backfills every `admin_action_log` row into `admin_audit_logs`, drops the table, recreates `admin_action_log` as an updatable view exposing the legacy column names (`target_type`, `target_id text`, `metadata`). `INSTEAD OF INSERT` trigger redirects writes to `admin_audit_logs` (casts UUIDs, archives non-UUIDs into `new_values.legacy_target_id`).
2. **FIX-005**: backfills `seller_payout_accounts` rows into `seller_payout_settings`, drops the table, recreates `seller_payout_accounts` as an updatable view exposing `seller_id, bank_name, account_name, account_number, created_at, updated_at`. `INSTEAD OF INSERT/UPDATE/DELETE` triggers route DML to `seller_payout_settings`. DELETE clears the bank fields rather than deleting the canonical row.

### Verification after 040

```sql
-- Both names are now VIEWS, not BASE TABLES.
SELECT table_name, table_type
  FROM information_schema.tables
 WHERE table_schema='public'
   AND table_name IN ('admin_action_log','seller_payout_accounts');
-- expect: both rows show table_type='VIEW'

-- Reads through the legacy names still return rows.
SELECT count(*) FROM public.admin_action_log;
SELECT count(*) FROM public.seller_payout_accounts;

-- Smoke-test the seller_payout_accounts write-through (use a real seller id).
BEGIN;
  INSERT INTO seller_payout_accounts (seller_id, bank_name, account_name, account_number)
  VALUES ('<seller-uuid>', 'BPI-TEST', 'Juan dela Cruz', '0123456789')
  ON CONFLICT (seller_id) DO UPDATE SET bank_name = EXCLUDED.bank_name;
  SELECT bank_name, bank_account_name, bank_account_number
    FROM seller_payout_settings WHERE seller_id = '<seller-uuid>';
ROLLBACK;
-- expect: settings row reflects 'BPI-TEST' / 'Juan dela Cruz' / '0123456789'
```

---

## Step 3 — Regenerate types

```bash
supabase gen types typescript --project-id <YOUR_PROJECT_ID> > web/src/types/database.types.ts
supabase gen types typescript --project-id <YOUR_PROJECT_ID> > mobile-app/src/types/database.types.ts
```

`admin_action_log` and `seller_payout_accounts` will now appear under `Database['public']['Views']` instead of `['Tables']`. The Supabase JS `.from('...')` API treats them identically.

---

## Step 4 — Application code already updated in this commit

Edited to align with `refund_return_periods` getting a real `uuid` `resolved_by`:

| File | Change |
|---|---|
| `web/src/services/returnService.ts` | Sentinel writes (`resolved_by: "seller"\|"buyer"`) switched to `resolution_source`; mapping reads new column. |
| `web/src/services/orderService.ts` | Seller-cancel-resolves-return path writes `resolution_source` and filters on it. |
| `web/src/pages/AdminReturns.tsx` | Admin actions write `resolution_source: "admin"`; UI shows `resolution_source ?? resolved_by`. |
| `web/src/types/orders.ts` | Added `resolutionSource?: string` to `BuyerReturnRequestSnapshot`. |
| `web/src/utils/orders/returns.ts` | Seller-cancellation detection compares `request.resolutionSource === 'seller'`. |
| `web/src/stores/sellerReturnStore.ts` | Maps `resolutionSource` through to UI. |

> `web/api/warranty.ts` and `web/src/services/warrantyService.ts` write `updaterId` (a real UUID) into `warranty_claims.resolved_by`, a different table already typed `uuid`. Left unchanged.

> The 4 callsites that write to `admin_action_log` and the ~10 callsites that read/write `seller_payout_accounts` are **deliberately unchanged** — the views + `INSTEAD OF` triggers preserve the legacy interface. Rewrites can happen in a follow-up sprint.

---

## Rollback

Both migrations are atomic. If anything fails mid-flight, nothing changes.

To undo `040` post-hoc:
```sql
DROP VIEW IF EXISTS public.admin_action_log;
DROP VIEW IF EXISTS public.seller_payout_accounts;
DROP FUNCTION IF EXISTS public.admin_action_log_view_insert();
DROP FUNCTION IF EXISTS public.seller_payout_accounts_view_insert();
DROP FUNCTION IF EXISTS public.seller_payout_accounts_view_update();
DROP FUNCTION IF EXISTS public.seller_payout_accounts_view_delete();
-- then restore originals from backup or re-run migrations 036 + 014.
```

To undo `039` in production: write a forward-fix migration. Don't try to reverse type changes manually on live data.

---

## Out-of-scope (next sprint)

* **FIX-007** — collapse `order_payments` into `payment_transactions`. Requires refactoring PostgREST embeds in mobile + web read paths first.
* **P1** fixes FIX-008 → FIX-012 from `DEV_FIX_LIST.md`.
* **P2** fixes FIX-013 → FIX-021.
* Once all callsites move off the `admin_action_log` / `seller_payout_accounts` legacy names, drop the views entirely.
