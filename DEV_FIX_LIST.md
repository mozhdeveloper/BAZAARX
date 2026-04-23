# Developer Fix List — BazaarX Backend

> Generated from: `DATABASE_ARCHITECTURE_AUDIT.md`  
> Date: 2026-04-23  
> Branch: `dev`  
> **All fixes are ordered by severity. P0 items must ship before any new feature work.**

---

## How to use this list

- Each item has an **ID** (`FIX-001`, etc.) for PR/commit references.
- Each item has a **severity** (P0 / P1 / P2), an **estimated effort**, and the **exact table/column** that needs changing.
- Database fixes go in a numbered migration file under `supabase-migrations/` (next available: `039_*`).
- Application fixes (TypeScript) follow the DB migration — update generated types after running `supabase gen types`.
- Mark an item `✅ done` in this file and link the PR when resolved.

---

## P0 — Ship This Week (Causes Runtime Bugs Today)

---

### FIX-001 — `order_shipments.seller_id` type is `text` instead of `uuid`
**Status**: ❌ Open  
**Effort**: Small (migration + type regen)  
**File**: `supabase-migrations/039_fix_seller_id_type_on_order_shipments.sql`

**Problem**: Every other table uses `uuid` for `seller_id`. `order_shipments` uses `text`. Any join `order_shipments JOIN sellers ON sellers.id = order_shipments.seller_id` fails without an explicit `::uuid` cast. This breaks seller dashboard shipment queries, payout reconciliation, and was hit during the returns P0 sprint.

**Migration to write**:
```sql
ALTER TABLE order_shipments
  ALTER COLUMN seller_id TYPE uuid USING seller_id::uuid;
```

**App changes after migration**:
- Run `supabase gen types typescript --project-id <id> > src/types/database.ts`
- Remove any manual `::uuid` workaround casts in `orderShipments` queries in `web/src/services/` and `mobile-app/src/`.

---

### FIX-002 — `seller_notifications.seller_id` is nullable (should be NOT NULL)
**Status**: ❌ Open  
**Effort**: Small  
**File**: `supabase-migrations/039_*` (batch with FIX-001)

**Problem**: `buyer_notifications.buyer_id` and `admin_notifications.admin_id` are NOT NULL. `seller_notifications.seller_id` is Nullable. RLS policies using `seller_id = auth.uid()` silently skip orphan rows → sellers report missing notifications that were actually inserted without a `seller_id`.

**Migration to write**:
```sql
-- First delete orphans (or investigate how they got here)
DELETE FROM seller_notifications WHERE seller_id IS NULL;

ALTER TABLE seller_notifications
  ALTER COLUMN seller_id SET NOT NULL;
```

---

### FIX-003 — `refund_return_periods.resolved_by` is `text` instead of `uuid`
**Status**: ❌ Open  
**Effort**: Small  
**File**: `supabase-migrations/039_*` (batch with FIX-001)

**Problem**: The column stores actor UUIDs for human resolution but the current type is `text`. If the column also stores sentinel strings like `"system"` or `"auto-escalation"`, split the concern into two columns.

**Migration to write**:
```sql
ALTER TABLE refund_return_periods
  ADD COLUMN resolution_source text;           -- 'buyer' | 'seller' | 'admin' | 'system' | 'auto'

-- Migrate sentinel strings to new column, real UUIDs stay as resolved_by
UPDATE refund_return_periods
  SET resolution_source = resolved_by,
      resolved_by = NULL
  WHERE resolved_by IN ('system', 'auto', 'auto-escalation')
     OR resolved_by !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

ALTER TABLE refund_return_periods
  ALTER COLUMN resolved_by TYPE uuid USING resolved_by::uuid;
```

**App changes**: Update `returnService.ts` and any admin page that writes `resolved_by` to pass a UUID; pass `resolution_source = 'auto'` for pg_cron-triggered resolutions.

---

### FIX-004 — 9 tables have nullable `created_at` with no default
**Status**: ❌ Open  
**Effort**: Small  
**File**: `supabase-migrations/039_*` (batch)

**Problem**: Nullable `created_at` causes unpredictable sort order in paginated queries. Rows with `NULL` float inconsistently across Postgres versions.

**Affected tables**:
- `courier_rate_cache`
- `delivery_bookings`
- `delivery_tracking_events`
- `flash_sale_submissions`
- `global_flash_sale_slots`
- `payment_transactions`
- `seller_payouts`
- `seller_payout_settings`
- `user_presence` (`updated_at` column)

**Migration to write**:
```sql
-- Backfill NULLs first, then set NOT NULL + default
UPDATE courier_rate_cache         SET created_at = now() WHERE created_at IS NULL;
UPDATE delivery_bookings          SET created_at = now() WHERE created_at IS NULL;
UPDATE delivery_tracking_events   SET created_at = now() WHERE created_at IS NULL;
UPDATE flash_sale_submissions     SET created_at = now() WHERE created_at IS NULL;
UPDATE global_flash_sale_slots    SET created_at = now() WHERE created_at IS NULL;
UPDATE payment_transactions       SET created_at = now() WHERE created_at IS NULL;
UPDATE seller_payouts             SET created_at = now() WHERE created_at IS NULL;
UPDATE seller_payout_settings     SET created_at = now() WHERE created_at IS NULL;
UPDATE user_presence              SET updated_at = now() WHERE updated_at IS NULL;

ALTER TABLE courier_rate_cache        ALTER COLUMN created_at SET NOT NULL, ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE delivery_bookings         ALTER COLUMN created_at SET NOT NULL, ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE delivery_tracking_events  ALTER COLUMN created_at SET NOT NULL, ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE flash_sale_submissions    ALTER COLUMN created_at SET NOT NULL, ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE global_flash_sale_slots   ALTER COLUMN created_at SET NOT NULL, ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE payment_transactions      ALTER COLUMN created_at SET NOT NULL, ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE seller_payouts            ALTER COLUMN created_at SET NOT NULL, ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE seller_payout_settings    ALTER COLUMN created_at SET NOT NULL, ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE user_presence             ALTER COLUMN updated_at SET DEFAULT now();
```

---

### FIX-005 — `seller_payout_accounts` duplicates `seller_payout_settings` (money-loss risk)
**Status**: ❌ Open  
**Effort**: Medium  
**File**: `supabase-migrations/040_merge_seller_payout_accounts.sql`

**Problem**: Both tables store bank details for the same seller, with different column names and different types (`text` vs `varchar`). A seller who updates bank info in one place but not the other will receive payouts to a stale account.

`seller_payout_accounts`: `seller_id PK, bank_name text, account_name text, account_number text`  
`seller_payout_settings`: `id uuid, seller_id UNIQUE, payout_method, bank_name varchar, bank_account_name varchar, bank_account_number varchar, ewallet_*, auto_payout, min_payout_amount`

**Migration to write**:
```sql
-- Backfill seller_payout_settings from seller_payout_accounts where settings row is missing
INSERT INTO seller_payout_settings (
  id, seller_id, payout_method, bank_name, bank_account_name,
  bank_account_number, created_at, updated_at
)
SELECT
  gen_random_uuid(), spa.seller_id, 'bank',
  spa.bank_name, spa.account_name, spa.account_number,
  spa.created_at, spa.updated_at
FROM seller_payout_accounts spa
WHERE NOT EXISTS (
  SELECT 1 FROM seller_payout_settings sps WHERE sps.seller_id = spa.seller_id
)
ON CONFLICT (seller_id) DO NOTHING;

-- Update existing settings rows where accounts have richer data
UPDATE seller_payout_settings sps
SET
  bank_name         = COALESCE(NULLIF(sps.bank_name,''), spa.bank_name),
  bank_account_name = COALESCE(NULLIF(sps.bank_account_name,''), spa.account_name),
  bank_account_number = COALESCE(NULLIF(sps.bank_account_number,''), spa.account_number)
FROM seller_payout_accounts spa
WHERE sps.seller_id = spa.seller_id;

-- Drop the duplicate table
DROP TABLE seller_payout_accounts;
```

**App changes**: Search codebase for any reference to `seller_payout_accounts`. Replace all reads/writes with `seller_payout_settings`.

---

### FIX-006 — `admin_action_log` duplicates `admin_audit_logs` with incompatible types
**Status**: ❌ Open  
**Effort**: Medium  
**File**: `supabase-migrations/040_*` (batch with FIX-005)

**Problem**: Two admin audit tables. `admin_action_log.target_id` is `text`; `admin_audit_logs.target_id` is `uuid`. Querying all admin actions on a given record requires hitting both tables with a UNION and a cast. History is split.

**Migration to write**:
```sql
-- Migrate rows where target_id looks like a UUID
INSERT INTO admin_audit_logs (id, admin_id, action, target_table, target_id, metadata, created_at)
SELECT
  id, admin_id, action, target_type, target_id::uuid, metadata, created_at
FROM admin_action_log
WHERE target_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
ON CONFLICT (id) DO NOTHING;

-- Archive non-UUID rows to metadata in admin_audit_logs
INSERT INTO admin_audit_logs (id, admin_id, action, target_table, metadata, created_at)
SELECT
  id, admin_id, action, target_type,
  jsonb_build_object('legacy_target_id', target_id) || COALESCE(metadata, '{}'::jsonb),
  created_at
FROM admin_action_log
WHERE target_id IS NULL
   OR target_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
ON CONFLICT (id) DO NOTHING;

DROP TABLE admin_action_log;
```

**App changes**: Grep for `admin_action_log` in all services/hooks. Replace with `admin_audit_logs`.

---

### FIX-007 — `order_payments` duplicates `payment_transactions` (payment-status drift)
**Status**: ❌ Open  
**Effort**: Large  
**File**: `supabase-migrations/041_drop_order_payments.sql`

**Problem**: Every order creates a record in both `order_payments` (simple, `payment_method jsonb`) AND `payment_transactions` (full gateway record). Application code syncs them by hand. When sync fails, `orders.payment_status` disagrees with `payment_transactions.status` — "payment status not updating" bug.

**Migration approach**:
1. Create a compatibility view: `CREATE VIEW order_payments AS SELECT ...` over `payment_transactions` matching `order_payments` column names.
2. Drop the `order_payments` base table.
3. Application reads go through the view automatically — no app change needed immediately.
4. In a follow-up sprint, remove all writes to `order_payments` from the app and drop the view.

```sql
-- Step 1: Migrate any order_payments rows not already in payment_transactions
-- (identify by order_id match)
-- ... (data analysis required before writing this step)

-- Step 2: Create compat view
CREATE OR REPLACE VIEW order_payments AS
SELECT
  id,
  order_id,
  metadata AS payment_method,   -- closest equivalent
  gateway_payment_intent_id AS payment_reference,
  paid_at AS payment_date,
  amount,
  status,
  created_at
FROM payment_transactions;

-- Step 3: Drop table (requires renaming view target if view exists)
-- DROP TABLE order_payments;  -- run after data audit confirms no data loss
```

**App changes**: Find all `INSERT INTO order_payments` in service files — remove them. Reads should continue through the view.

---

## P1 — Fix Within Current Sprint

---

### FIX-008 — Merge `seller_verification_document_drafts` → `seller_verification_documents`
**Status**: ❌ Open  
**Effort**: Small  
**File**: `supabase-migrations/042_merge_seller_verification_drafts.sql`

**Problem**: Two tables with identical document columns. Sellers can submit documents to the drafts table but admins query the live table — resulting in "submitted but admin can't see" bugs.

**Migration to write**:
```sql
ALTER TABLE seller_verification_documents
  ADD COLUMN status text NOT NULL DEFAULT 'submitted',
  ADD COLUMN business_permit_updated_at timestamptz,
  ADD COLUMN valid_id_updated_at timestamptz,
  ADD COLUMN proof_of_address_updated_at timestamptz,
  ADD COLUMN dti_registration_updated_at timestamptz,
  ADD COLUMN tax_id_updated_at timestamptz;

-- Upsert drafts into live table with status = 'draft'
INSERT INTO seller_verification_documents (
  seller_id, business_permit_url, valid_id_url, proof_of_address_url,
  dti_registration_url, tax_id_url, status,
  business_permit_updated_at, valid_id_updated_at, proof_of_address_updated_at,
  dti_registration_updated_at, tax_id_updated_at,
  created_at, updated_at
)
SELECT *, 'draft', business_permit_updated_at, valid_id_updated_at,
  proof_of_address_updated_at, dti_registration_updated_at, tax_id_updated_at,
  COALESCE(created_at, now()), COALESCE(updated_at, now())
FROM seller_verification_document_drafts
ON CONFLICT (seller_id) DO UPDATE
  SET status = 'draft',
      business_permit_url = EXCLUDED.business_permit_url,
      -- ... etc
      updated_at = now();

DROP TABLE seller_verification_document_drafts;
```

---

### FIX-009 — Unify 3 notification tables into 1 polymorphic table
**Status**: ❌ Open  
**Effort**: Medium-Large  
**File**: `supabase-migrations/043_unify_notifications.sql`

**Problem**: `admin_notifications`, `buyer_notifications`, `seller_notifications` are identical in shape. 3× migration burden, 3× RLS policy surface, 3× realtime subscription.

**Migration approach**:
1. Create `notifications` table (see audit §3.2 for DDL).
2. Migrate all three tables' rows with `recipient_role` = `'admin'|'buyer'|'seller'`.
3. Create views `admin_notifications`, `buyer_notifications`, `seller_notifications` over `notifications` for backwards compatibility.
4. Drop original tables.
5. Update RLS: single policy on `notifications` where `recipient_id = auth.uid()`.

**App changes**: Notification insert functions in services — replace 3 separate table inserts with one. Notification read queries — point to new table (views cover backwards compat).

---

### FIX-010 — Remove `warranty_claim_*` columns from `order_items`
**Status**: ❌ Open  
**Effort**: Small  
**File**: `supabase-migrations/044_clean_order_items_warranty.sql`

**Problem**: `order_items` has 5 columns that duplicate data owned by the `warranty_claims` table: `warranty_claimed`, `warranty_claimed_at`, `warranty_claim_reason`, `warranty_claim_status`, `warranty_claim_notes`.

These fields desync with `warranty_claims` — the UI shows the stale `order_items` value while `warranty_claims` has the truth.

**Migration to write**:
```sql
-- Confirm no warranty_claims rows are missing by backfilling from order_items first:
INSERT INTO warranty_claims (
  id, order_item_id, buyer_id, seller_id,
  claim_number, reason, status, description, created_at
)
SELECT
  gen_random_uuid(),
  oi.id,
  o.buyer_id,
  oi_seller.seller_id,  -- derive from products
  'LEGACY-' || oi.id,
  oi.warranty_claim_reason,
  oi.warranty_claim_status,
  oi.warranty_claim_notes,
  COALESCE(oi.warranty_claimed_at, now())
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN products p ON p.id = oi.product_id
LEFT JOIN products oi_seller ON oi_seller.id = oi.product_id
WHERE oi.warranty_claimed = true
  AND NOT EXISTS (
    SELECT 1 FROM warranty_claims wc WHERE wc.order_item_id = oi.id
  );

-- Drop the redundant columns
ALTER TABLE order_items
  DROP COLUMN warranty_claimed,
  DROP COLUMN warranty_claimed_at,
  DROP COLUMN warranty_claim_reason,
  DROP COLUMN warranty_claim_status,
  DROP COLUMN warranty_claim_notes;
```

**App changes**: Any UI component reading `order_items.warranty_claim_status` should instead query `warranty_claims` by `order_item_id`.

---

### FIX-011 — Fix 8 denormalized counter columns that silently drift
**Status**: ❌ Open  
**Effort**: Medium  
**File**: `supabase-migrations/045_counter_triggers.sql`

**Affected columns and their source-of-truth**:

| Counter | Table | Source of truth |
|---|---|---|
| `product_requests.votes` | `product_requests` | No vote table found — investigate if this should reference `comment_upvotes` |
| `product_requests.comments_count` | `product_requests` | `COUNT(*) FROM product_request_comments WHERE request_id = id` |
| `product_request_comments.upvotes` | `product_request_comments` | `COUNT(*) FROM comment_upvotes WHERE comment_id = id` |
| `product_request_comments.admin_upvotes` | `product_request_comments` | Unclear source — **investigate and document** |
| `reviews.helpful_count` | `reviews` | `COUNT(*) FROM review_votes WHERE review_id = id` |
| `product_discounts.sold_count` | `product_discounts` | `SUM(oi.quantity) FROM order_items oi JOIN ...` |
| `buyers.bazcoins` | `buyers` | `SUM(amount) FROM bazcoin_transactions WHERE user_id = id` |
| `buyer_segments.buyer_count` | `buyer_segments` | Dynamic query — refresh on schedule |

**For each counter, write a trigger pair** (`AFTER INSERT/DELETE ON source_table`):
```sql
-- Example: reviews.helpful_count
CREATE OR REPLACE FUNCTION update_helpful_count() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reviews SET helpful_count = GREATEST(0, helpful_count - 1) WHERE id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_review_votes_helpful_count
AFTER INSERT OR DELETE ON review_votes
FOR EACH ROW EXECUTE FUNCTION update_helpful_count();
```

Also: **run a one-time reconciliation** to fix existing incorrect values:
```sql
UPDATE reviews r
SET helpful_count = (SELECT COUNT(*) FROM review_votes rv WHERE rv.review_id = r.id);

UPDATE product_request_comments prc
SET upvotes = (SELECT COUNT(*) FROM comment_upvotes cu WHERE cu.comment_id = prc.id);

UPDATE buyers b
SET bazcoins = COALESCE((
  SELECT SUM(amount) FROM bazcoin_transactions bt WHERE bt.user_id = b.id
), 0);
```

---

### FIX-012 — Standardize `varchar` → `text` on 6 outlier tables
**Status**: ❌ Open  
**Effort**: Small  
**File**: `supabase-migrations/046_standardize_text_types.sql`

**Problem**: `payment_transactions`, `delivery_bookings`, `seller_payouts`, `seller_payout_settings`, `courier_rate_cache`, `delivery_tracking_events` use `varchar` for columns that are unlimited-length in practice. This is a style inconsistency with every other table and causes generated-type mismatches in some TS helpers that discriminate by Postgres type.

**Migration to write** (safe — varchar → text is lossless in Postgres):
```sql
-- payment_transactions
ALTER TABLE payment_transactions
  ALTER COLUMN gateway               TYPE text,
  ALTER COLUMN gateway_payment_intent_id TYPE text,
  ALTER COLUMN gateway_payment_method_id TYPE text,
  ALTER COLUMN gateway_source_id     TYPE text,
  ALTER COLUMN currency              TYPE text,
  ALTER COLUMN payment_type          TYPE text,
  ALTER COLUMN status                TYPE text,
  ALTER COLUMN statement_descriptor  TYPE text,
  ALTER COLUMN escrow_status         TYPE text;

-- delivery_bookings
ALTER TABLE delivery_bookings
  ALTER COLUMN courier_code    TYPE text,
  ALTER COLUMN courier_name    TYPE text,
  ALTER COLUMN service_type    TYPE text,
  ALTER COLUMN booking_reference TYPE text,
  ALTER COLUMN tracking_number TYPE text,
  ALTER COLUMN status          TYPE text;

-- seller_payout_settings
ALTER TABLE seller_payout_settings
  ALTER COLUMN payout_method          TYPE text,
  ALTER COLUMN bank_name              TYPE text,
  ALTER COLUMN bank_account_name      TYPE text,
  ALTER COLUMN bank_account_number    TYPE text,
  ALTER COLUMN ewallet_provider       TYPE text,
  ALTER COLUMN ewallet_number         TYPE text;

-- seller_payouts
ALTER TABLE seller_payouts
  ALTER COLUMN currency        TYPE text,
  ALTER COLUMN payout_method   TYPE text,
  ALTER COLUMN status          TYPE text;

-- courier_rate_cache
ALTER TABLE courier_rate_cache
  ALTER COLUMN courier_code        TYPE text,
  ALTER COLUMN origin_city         TYPE text,
  ALTER COLUMN destination_city    TYPE text,
  ALTER COLUMN service_type        TYPE text;

-- delivery_tracking_events
ALTER TABLE delivery_tracking_events
  ALTER COLUMN status              TYPE text,
  ALTER COLUMN location            TYPE text,
  ALTER COLUMN courier_status_code TYPE text;
```

---

## P2 — Fix When Capacity Allows

---

### FIX-013 — Collapse `payment_method_{banks,cards,wallets}` into `payment_methods.details jsonb`
**Status**: ❌ Open  
**Effort**: Medium  

**Problem**: 3 class-table-inheritance child tables with 2–4 columns each. Every payment method lookup is a `LEFT JOIN LEFT JOIN LEFT JOIN`. No business benefit to separate tables.

**Recommendation**: Add `details jsonb` to `payment_methods`, migrate each row, drop 3 child tables.

---

### FIX-014 — Merge `product_assessments` + `qa_assessment_forms` (1:1 tables)
**Status**: ❌ Open  
**Effort**: Medium  

**Problem**: `qa_assessment_forms` has a UNIQUE constraint on `assessment_id` — it is literally a 1:1 extension of `product_assessments`. Every query joins them. Merge the columns into `product_assessments`.

---

### FIX-015 — Collapse QA event-log tables into single `qa_events` table
**Status**: ❌ Open  
**Effort**: Medium  

**Affected tables to merge**:
- `product_approvals`
- `product_revisions`
- `product_rejections`
- `qa_review_logs`
- `seller_rejections`

All have `(id, assessment_id, description, created_at, created_by)` as their core shape. Collapse into `qa_events (id, assessment_id, event_type, description, metadata jsonb, created_at, created_by)`.

---

### FIX-016 — Collapse `order_discounts` + `order_promos` + `order_vouchers` into `order_adjustments`
**Status**: ❌ Open  
**Effort**: Medium  

**Recommendation**: `order_adjustments (id, order_id, buyer_id, type text CHECK('discount'|'promo'|'voucher'), source_id uuid, discount_amount numeric, created_at)`

---

### FIX-017 — Investigate and merge `delivery_bookings` ↔ `order_shipments`
**Status**: ❌ Open  
**Effort**: Large  

**Problem**: Both tables track the same physical shipment: `order_shipments` from the internal perspective, `delivery_bookings` from the courier-API perspective. Both have `tracking_number`, `status`, `delivered_at`. They are manually synced today → tracking number drift.

**Action**: Map out the full data-flow in code before deciding merge strategy. At minimum, add a FK `order_shipments.delivery_booking_id → delivery_bookings.id`.

---

### FIX-018 — `reviews.seller_reply jsonb` should be a `review_replies` table
**Status**: ❌ Open  
**Effort**: Small  

**Problem**: JSONB reply prevents: (a) querying replies, (b) seller RLS policy on reply update, (c) notification triggers on new reply, (d) reply history/editing audit.

**Recommendation**: `review_replies (id, review_id, seller_id, body text, created_at, updated_at)`.

---

### FIX-019 — `registries.shared_date text` → `date`
**Status**: ❌ Open  
**Effort**: Tiny  

```sql
ALTER TABLE registries
  ALTER COLUMN shared_date TYPE date USING shared_date::date;
```

---

### FIX-020 — Resolve duplicate consent tracking (`consent_log` ↔ `user_consent`)
**Status**: ❌ Open  
**Effort**: Medium  
**Legal priority**: High (RA 10173 compliance)

**Problem**: Two consent tables that are written independently. If they disagree, the system doesn't know the user's true consent state — which is a Data Privacy Act audit risk.

**Recommendation**: Make `user_consent` the canonical current-state table and `consent_log` the immutable event-source history. Add a trigger: `AFTER INSERT OR UPDATE ON user_consent → INSERT INTO consent_log`. Ensure all consent changes go through `user_consent` only — never direct inserts to `consent_log`.

---

### FIX-021 — Add `orders.payment_status` and `orders.shipment_status` CHECK constraints
**Status**: ❌ Open  
**Effort**: Tiny  

```sql
ALTER TABLE orders
  ADD CONSTRAINT chk_payment_status CHECK (payment_status IN (
    'pending','paid','partially_paid','refunded','failed','cancelled'
  )),
  ADD CONSTRAINT chk_shipment_status CHECK (shipment_status IN (
    'pending','processing','shipped','delivered','returned','cancelled'
  ));
```

---

## Summary Table

| ID | Title | Severity | Effort | Status |
|---|---|---|---|---|
| FIX-001 | `order_shipments.seller_id` → uuid | P0 | Small | ❌ Open |
| FIX-002 | `seller_notifications.seller_id` NOT NULL | P0 | Small | ❌ Open |
| FIX-003 | `refund_return_periods.resolved_by` → uuid | P0 | Small | ❌ Open |
| FIX-004 | Nullable `created_at` on 9 tables | P0 | Small | ❌ Open |
| FIX-005 | Merge seller payout accounts → settings | P0 | Medium | ❌ Open |
| FIX-006 | Drop `admin_action_log`, merge → `admin_audit_logs` | P0 | Medium | ❌ Open |
| FIX-007 | Drop `order_payments`, replace with view | P0 | Large | ❌ Open |
| FIX-008 | Merge seller verification drafts → live table | P1 | Small | ❌ Open |
| FIX-009 | Unify 3 notification tables → `notifications` | P1 | Med-Large | ❌ Open |
| FIX-010 | Remove warranty claim cols from `order_items` | P1 | Small | ❌ Open |
| FIX-011 | Add triggers for 8 drifting counter columns | P1 | Medium | ❌ Open |
| FIX-012 | Standardize `varchar` → `text` on 6 tables | P1 | Small | ❌ Open |
| FIX-013 | Collapse payment_method child tables | P2 | Medium | ❌ Open |
| FIX-014 | Merge `product_assessments` + `qa_assessment_forms` | P2 | Medium | ❌ Open |
| FIX-015 | Collapse QA event-log tables → `qa_events` | P2 | Medium | ❌ Open |
| FIX-016 | Collapse order adjustment tables | P2 | Medium | ❌ Open |
| FIX-017 | Investigate `delivery_bookings` ↔ `order_shipments` merge | P2 | Large | ❌ Open |
| FIX-018 | `reviews.seller_reply` → `review_replies` table | P2 | Small | ❌ Open |
| FIX-019 | `registries.shared_date text` → `date` | P2 | Tiny | ❌ Open |
| FIX-020 | Reconcile `consent_log` ↔ `user_consent` | P2 | Medium | ❌ Open |
| FIX-021 | Add CHECK constraints on `orders.payment_status` | P2 | Tiny | ❌ Open |

---

*Reference: `DATABASE_ARCHITECTURE_AUDIT.md` for full analysis and context behind each fix.*
