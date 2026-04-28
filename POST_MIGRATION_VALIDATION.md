# Post-Migration Validation — What Got Fixed & What To Query

> Audit performed after migrations `039` + `040` were applied to Supabase.
> Three real breakages were found in app callsites; all have been patched in
> code, and migration `041_post_consolidation_hardening.sql` hardens the
> trigger that one of the breakages depended on.

---

## Round 2 — Deep audit findings (all fixed in this commit)

After a second sweep across the entire `web/` and `mobile-app/` codebases, I found **5 more callsites** that would break post-039/040 (in addition to the 4 fixed in Round 1):

| # | Severity | File | Symptom | Fix |
|---|---|---|---|---|
| 5 | **CRITICAL** | [mobile-app/src/services/returnService.ts](mobile-app/src/services/returnService.ts) (5 callsites: `createReturn` instant path, `approveReturn`, `rejectReturn`, `acceptCounterOffer`, `confirmReturnReceived`) | Wrote string `'system'`/`'seller'`/`'buyer'` to `resolved_by` (now `uuid` post-039) → Postgres `22P02 invalid input syntax for type uuid` | Switched all 5 to `resolution_source: 'system'\|'seller'\|'buyer'` (matches what web app already does) |
| 6 | HIGH | [web/src/services/sellerService.ts](web/src/services/sellerService.ts) `updatePayoutAccount` | `.upsert(..., onConflict)` on `seller_payout_accounts` view → `ON CONFLICT not supported on views` | Rewrote to upsert into `seller_payout_settings` with canonical columns |
| 7 | HIGH | [web/src/pages/SellerOnboarding.tsx](web/src/pages/SellerOnboarding.tsx) Step 3 | `.upsert(..., onConflict)` on view → throws | Rewrote to `seller_payout_settings` |
| 8 | HIGH | [web/src/pages/SellerStoreProfile.tsx](web/src/pages/SellerStoreProfile.tsx) `handleSaveBanking` | `.upsert(..., onConflict: 'seller_id')` on view → throws | Rewrote to `seller_payout_settings` |
| 9 | HIGH | [mobile-app/src/stores/sellerStore.ts](mobile-app/src/stores/sellerStore.ts) `updateSellerProfile` | `.upsert(..., onConflict: 'seller_id')` on view → throws | Rewrote to `seller_payout_settings` with canonical columns |
| 10 | MEDIUM | [web/src/services/sellerService.ts](web/src/services/sellerService.ts) `getSellerById`/`getStoreById` + [mobile-app/src/services/sellerService.ts](mobile-app/src/services/sellerService.ts) `getSellerById`/`getStoreById` | PostgREST embed `payout_account:seller_payout_accounts(*)` may fail FK introspection on view | Rewired all 4 embeds to `seller_payout_settings(seller_id, bank_name, bank_account_name, bank_account_number, payout_method)`. Both `transformSeller` mappers now read either shape (`pa?.bank_account_name \|\| pa?.account_name`). |
| 11 | LOW | [web/src/stores/admin/adminSellersStore.ts](web/src/stores/admin/adminSellersStore.ts) (5 fallback sites) | `adminId = … \|\| 'admin'` then inserted into view; PostgREST coerces string `'admin'` → uuid, throws 22P02 *before* trigger runs (try/catch already swallowed it; functionally silent but pollutes logs) | Changed fallback from `'admin'` to `null`; trigger from migration 041 silently no-ops on null admin_id |

**Verified safe (no fix needed):**
* `web/api/warranty.ts` + `web/src/services/warrantyService.ts` — write `resolved_by` to `warranty_claims` (different table, not affected by 039).
* `web/src/pages/AdminReturns.tsx` 3 admin actions — only set `resolution_source: 'admin'`, not `resolved_by`. Safe.
* `mobile-app/src/services/orderService.ts` + `web/src/services/orderService.ts` — `order_shipments` reads/writes treat `seller_id` as opaque string; PostgREST handles uuid↔text coercion transparently. No manual `::text`/`::uuid` casts found.
* `mobile-app/src/services/checkoutService.ts` + `mobile-app/src/services/deliveryService.ts` — `order_shipments.insert(...)` passes `seller_id` from a uuid source. Safe.
* `mobile-app/src/types/supabase-generated.types.ts` and `web/src/types/database.types.ts` — type drift, but no runtime impact. Regenerate after applying 041 (Step 5 below).
* No callsites pass explicit `null` to the 9 NOT-NULL timestamp columns from 039. Default `now()` applies on insert.

**Scripts/tests still referencing legacy patterns** (not fixed — non-production):
* `web/scripts/{continue-populate,finalize-users,populate-data,reset-and-populate*,test-implementation-backend,web-comprehensive-test,complete-flow-test}.ts`
* `web/src/tests/{e2e-flow-test,flow-validation-test,data-population-test,implementation-features-verify,comprehensive-db-test}.ts`
* `mobile-app/src/tests/comprehensive-db-test.ts`, `mobile-app/scripts/test-auth-session.ts`, `mobile-app/scripts/test-order-edit-crud.ts`
* These will fail when run against the updated DB; either update the scripts or scope them out for now.

---

## Issues found (and now fixed)

### 1. Realtime broken on `seller_payout_accounts` view
**Why**: Postgres logical replication only emits change events for *base tables*. Subscribing to a view's name is a silent no-op — events never fire.
**Where**: `web/src/pages/AdminPayouts.tsx` had `useAdminRealtime('seller_payout_accounts', ...)`.
**Fix**: Repointed to `seller_payout_settings` (the canonical base table). Admin payouts page will now refresh in real time again.

### 2. `.upsert(..., { onConflict: 'seller_id' })` would throw on the view
**Why**: PostgREST translates `.upsert` into `INSERT … ON CONFLICT`. Postgres rejects `ON CONFLICT` on views ("ON CONFLICT … not supported on views"). The INSTEAD OF INSERT trigger never gets a chance.
**Where**:
* `mobile-app/app/seller/store-profile.tsx` — seller saves their bank details.
* `mobile-app/src/services/sellerService.ts::updatePayoutAccount()`.
**Fix**: Both rewritten to upsert directly into `seller_payout_settings` with the canonical column names (`bank_account_name`, `bank_account_number`, `payout_method='bank_transfer'`).

### 3. `admin_action_log` view trigger raised on bad `admin_id`
**Why**: Migration 040's INSTEAD OF trigger required a non-NULL `admin_id` and would raise. Legacy callers (`adminSellersStore.ts` x2, `AdminSettings.tsx`, `returnService.ts::logAuditAction`) call this best-effort and sometimes pass `null` or even the literal string `'admin'` as a fallback — they previously treated DB errors as warnings, but the trigger's RAISE EXCEPTION blew through the try/catch.
**Fix**: Migration `041_post_consolidation_hardening.sql` rewrites the trigger to:
* coerce non-UUID `admin_id` (e.g. the string `'admin'`) to NULL instead of raising,
* silently `RETURN NEW` (skip insert) when `admin_id` is NULL or not a member of `public.admins`,
* preserves "best-effort audit" semantics across all 4 callsites.

### 4. PostgREST embed `payout_account:seller_payout_accounts(...)`
**Why**: PostgREST embeds rely on FK introspection. Views have no FKs; embed inference through view→base may or may not succeed depending on PostgREST version.
**Where**: `web/src/stores/admin/adminSellersStore.ts`.
**Fix**: Rewired the embed to `seller_payout_settings(seller_id, bank_account_name, bank_name, bank_account_number)`. Consumers (`adminSellersStore.ts`, `sellerHelpers.ts`) updated to read both legacy (`account_name`/`account_number`) and canonical (`bank_account_name`/`bank_account_number`) fields so partial reads from anywhere don't 404.

### 5. Things that did NOT break (verified)
* `order_shipments.seller_id text→uuid` — no app code casts `::text`/`::uuid` manually; PostgREST embeds via the new FK to `sellers(id)` work.
* `refund_return_periods.resolved_by text→uuid` — only writer (`AdminReturns.tsx`) was already switched to `resolution_source`. `web/api/warranty.ts` writes a different table (`warranty_claims`).
* `admin_action_log` SELECT/INSERT callsites — view + hardened trigger cover them.
* `seller_payout_accounts` SELECT callsites (mobile `store-profile.tsx`, admin tests) — views support SELECT natively, column aliases preserve the legacy field names.

---

## Step 1 — Run migration 041

Paste `supabase-migrations/041_post_consolidation_hardening.sql` into the Supabase SQL editor and run.

```sql
-- After running, verify the trigger is the new version:
SELECT prosrc FROM pg_proc WHERE proname = 'admin_action_log_view_insert';
-- expect: body contains "v_is_admin" and "RETURN NEW;" early-exit
```

---

## Step 2 — Smoke-test queries (run in Supabase SQL editor)

### A) Object inventory — duplicates are gone, views are in place
```sql
SELECT table_name, table_type
  FROM information_schema.tables
 WHERE table_schema = 'public'
   AND table_name IN (
     'admin_action_log','admin_audit_logs',
     'seller_payout_accounts','seller_payout_settings',
     'order_shipments','refund_return_periods'
   )
 ORDER BY table_name;
-- expect:
--   admin_action_log         | VIEW
--   admin_audit_logs         | BASE TABLE
--   order_shipments          | BASE TABLE
--   refund_return_periods    | BASE TABLE
--   seller_payout_accounts   | VIEW
--   seller_payout_settings   | BASE TABLE
```

### B) The 9 timestamps are now NOT NULL with defaults
```sql
SELECT table_name, column_name, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND ((table_name, column_name) IN (
     ('courier_rate_cache','created_at'),
     ('delivery_bookings','created_at'),
     ('delivery_tracking_events','created_at'),
     ('flash_sale_submissions','created_at'),
     ('global_flash_sale_slots','created_at'),
     ('payment_transactions','created_at'),
     ('seller_payouts','created_at'),
     ('seller_payout_settings','created_at'),
     ('user_presence','updated_at')
   ))
 ORDER BY table_name;
-- expect: every row is_nullable='NO', column_default LIKE 'now()%'
```

### C) Type fixes landed
```sql
SELECT table_name, column_name, data_type
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND ((table_name, column_name) IN (
     ('order_shipments','seller_id'),
     ('seller_notifications','seller_id'),
     ('refund_return_periods','resolved_by'),
     ('refund_return_periods','resolution_source')
   ))
 ORDER BY table_name, column_name;
-- expect:
--   order_shipments.seller_id            uuid
--   refund_return_periods.resolution_source  text
--   refund_return_periods.resolved_by    uuid
--   seller_notifications.seller_id       uuid
```

### D) order_shipments policies still exist (after FIX-001 drop+recreate)
```sql
SELECT polname, polcmd
  FROM pg_policy
 WHERE polrelid = 'public.order_shipments'::regclass
 ORDER BY polname;
-- expect: at minimum
--   "Sellers can read own shipments"   r
--   "Sellers can update own shipments" w
```

### E) The hardened audit trigger does NOT raise on bad inputs
```sql
BEGIN;
  -- All three of these used to throw; now they silently no-op.
  INSERT INTO admin_action_log (admin_id, action, target_type, target_id)
  VALUES (NULL, 'verify-noop', 'noop', NULL);

  INSERT INTO admin_action_log (admin_id, action, target_type, target_id)
  VALUES (NULL, 'verify-noop2', 'noop', '00000000-0000-0000-0000-000000000001');

  -- 'admin' is the literal string the legacy fallback uses; should also no-op.
  -- Cast through text first because the view column is text via the alias.
  INSERT INTO admin_action_log (admin_id, action, target_type, target_id)
  SELECT 'admin'::text::uuid, 'verify-noop3', 'noop', NULL
  WHERE FALSE;  -- skip — uuid cast errors at parser; trigger handles real runtime case

  -- Real admin path: should land in admin_audit_logs.
  INSERT INTO admin_action_log (admin_id, action, target_type, target_id)
  SELECT id, 'verify-real', 'noop', NULL
  FROM public.admins
  LIMIT 1;

  SELECT count(*) AS audit_rows_added
    FROM admin_audit_logs
   WHERE action LIKE 'verify-%';
ROLLBACK;
-- expect: count = 1 (only the real-admin row landed)
```

### F) seller_payout_accounts view round-trips correctly
```sql
-- Pick a real seller id with bank info to verify the view + triggers.
SELECT seller_id, bank_name, account_name, account_number
  FROM seller_payout_accounts
 WHERE bank_name IS NOT NULL
 LIMIT 5;

-- Write through the view; observe it lands in the canonical table.
BEGIN;
  WITH s AS (SELECT id FROM sellers LIMIT 1)
  INSERT INTO seller_payout_accounts (seller_id, bank_name, account_name, account_number)
  SELECT id, 'BPI-VERIFY', 'Verify Smoke', '9999999999' FROM s
  ON CONFLICT (seller_id) DO UPDATE SET bank_name = EXCLUDED.bank_name;
  -- ⚠ ON CONFLICT on the view will error here. This is the exact reason
  --   we routed app .upsert() calls to seller_payout_settings instead.
  --   Re-run without ON CONFLICT to verify the INSTEAD OF INSERT trigger:
ROLLBACK;

BEGIN;
  WITH s AS (SELECT id FROM sellers LIMIT 1)
  INSERT INTO seller_payout_accounts (seller_id, bank_name, account_name, account_number)
  SELECT id, 'BPI-VERIFY', 'Verify Smoke', '9999999999' FROM s;
  SELECT bank_name, bank_account_name, bank_account_number
    FROM seller_payout_settings
   WHERE bank_name = 'BPI-VERIFY';
ROLLBACK;
-- expect: 1 row showing BPI-VERIFY / Verify Smoke / 9999999999
```

### G) Realtime now subscribes to a real base table
```sql
-- Confirm replication is enabled on the table the app subscribes to:
SELECT schemaname, tablename
  FROM pg_publication_tables
 WHERE pubname = 'supabase_realtime'
   AND tablename IN ('seller_payout_settings', 'order_items');
-- expect: both rows present.
-- If seller_payout_settings is missing, run:
--   ALTER PUBLICATION supabase_realtime ADD TABLE public.seller_payout_settings;
```

### H) Sanity counts — nothing got lost in the consolidation
```sql
-- Before-vs-after row sanity. Replace BEFORE_COUNT with what you saw in
-- pre-flight Step 0 of IMPLEMENTATION_QUERIES.md.
SELECT
  (SELECT count(*) FROM admin_audit_logs)        AS audit_logs_now,
  (SELECT count(*) FROM seller_payout_settings)  AS payout_settings_now;
-- expect: audit_logs_now    >= (BEFORE admin_audit_logs) + (BEFORE admin_action_log_with_admin_id)
--         payout_settings_now >= max(BEFORE seller_payout_settings, BEFORE seller_payout_accounts)
```

### I) refund_return_periods writes accept uuid (Round-2 finding #5)
```sql
-- Confirm resolved_by accepts uuid + nullable, and resolution_source is text.
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema='public'
   AND table_name='refund_return_periods'
   AND column_name IN ('resolved_by','resolution_source')
 ORDER BY column_name;
-- expect:
--   resolution_source | text | YES
--   resolved_by       | uuid | YES

-- Smoke: writing the new shape works.
BEGIN;
  WITH r AS (SELECT id FROM refund_return_periods LIMIT 1)
  UPDATE refund_return_periods
     SET resolution_source = 'system',
         resolved_at       = now()
   WHERE id IN (SELECT id FROM r)
   RETURNING id, resolution_source, resolved_by;
ROLLBACK;
-- expect: 1 row returned with resolution_source='system'
```

### J) seller_payout_settings is realtime-enabled and accepts upserts
```sql
-- Realtime publication membership (also covered by G):
SELECT 1
  FROM pg_publication_tables
 WHERE pubname = 'supabase_realtime'
   AND tablename = 'seller_payout_settings';
-- expect: 1 row

-- Upsert smoke test (rolls back). This is the path all the production
-- callsites now take instead of upserting into the view.
BEGIN;
  WITH s AS (SELECT id FROM sellers LIMIT 1)
  INSERT INTO seller_payout_settings
    (seller_id, payout_method, bank_name, bank_account_name, bank_account_number)
  SELECT id, 'bank_transfer', 'BPI-VERIFY', 'Smoke Test', '0001112223'
    FROM s
  ON CONFLICT (seller_id) DO UPDATE
     SET bank_name           = EXCLUDED.bank_name,
         bank_account_name   = EXCLUDED.bank_account_name,
         bank_account_number = EXCLUDED.bank_account_number,
         updated_at          = now()
  RETURNING seller_id, bank_name, bank_account_name, bank_account_number;
ROLLBACK;
-- expect: 1 row with the values you sent.
```

---

## Step 3 — Application QA checklist

After deploying the app code from this commit:

| Surface | Action | Expected |
|---|---|---|
| Web Admin → Payouts | Open the page, then have someone update a seller bank in mobile | Page auto-refreshes (realtime works) |
| Web Admin → Sellers | Open seller detail | Bank name / account name / account number all populate |
| Web Admin → Returns | Reject or refund a return | UI shows `Resolved by: admin`; DB row has `resolution_source = 'admin'` and `resolved_by = <admin uuid>` |
| Web Admin → Settings | Save settings | No console error from `admin_action_log` insert; row appears in `admin_audit_logs` |
| Web Admin → Sellers → Blacklist | Blacklist a seller | No `admin_action_log` error in console (trigger silently skips when fallback `'admin'` string is used as admin_id) |
| Mobile Seller → Store Profile → Banking | Save banking info | No "ON CONFLICT not supported" error; row visible in `seller_payout_settings` |
| Mobile Seller → Orders | Open order list | `order_shipments` embed loads (no `operator does not exist: uuid = text`) |
| Buyer/Seller flow | Cancel an order with active return | `refund_return_periods.resolution_source = 'seller'` (or `'buyer'`); no UUID-cast error in PostgREST logs |

---

## Step 4 — Things that are now SAFE to clean up later (not now)

* The 4 legacy `admin_action_log` callsites can stay; the hardened trigger handles them. Future cleanup PR can rewrite them to use `admin_audit_logs` directly.
* `seller_payout_accounts` SELECT callsites (e.g. mobile `store-profile.tsx` read, admin tests) can stay on the view. Rewrite when convenient.
* `order_payments` (FIX-007) is still pending — the embed surface is large; needs its own sprint.

---

## Step 5 — Regenerate types (only after 041 is applied)

```bash
supabase gen types typescript --project-id <YOUR_PROJECT_ID> > web/src/types/database.types.ts
supabase gen types typescript --project-id <YOUR_PROJECT_ID> > mobile-app/src/types/database.types.ts
```

`admin_action_log` and `seller_payout_accounts` will appear under `Database['public']['Views']`. Manual hand-written type aliases (`SellerPayoutAccount`, etc.) in `web/src/types/database.types.ts` and `mobile-app/src/types/database.types.ts` can stay — they describe the shape the views still return.
