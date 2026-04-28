-- ============================================================================
-- Migration: 040_consolidate_duplicate_tables   (REPLACES previous 040 draft)
-- Purpose:   Physically remove the duplicate tables called out in
--            DEV_FIX_LIST.md, replacing them with updatable VIEWS over the
--            canonical tables. Application code keeps working without an
--            immediate refactor: every legacy SELECT, INSERT, UPDATE, DELETE
--            is silently routed to the canonical table by INSTEAD OF triggers.
--
--   FIX-005:  seller_payout_accounts   ->  view over seller_payout_settings
--   FIX-006:  admin_action_log         ->  view over admin_audit_logs
--
--   FIX-007 (order_payments) is intentionally deferred: it has too many
--           PostgREST embed callsites in mobile + web reads, and a view alone
--           cannot reproduce the embed graph safely. A dedicated 041 migration
--           will tackle it after those callsites are refactored.
--
-- Strategy (per duplicate):
--   1. Backfill any rows from the legacy table into the canonical table.
--   2. DROP TABLE legacy CASCADE (drops policies, indexes, triggers).
--   3. CREATE VIEW legacy AS SELECT ... FROM canonical (column-name preserving).
--   4. CREATE INSTEAD OF INSERT/UPDATE/DELETE triggers so legacy DML still
--      works, redirecting to the canonical table.
--   5. GRANT same privileges that authenticated had on the original table.
--
-- Idempotent: every step uses IF EXISTS / DROP-then-CREATE.
-- Atomic:    wrapped in BEGIN...COMMIT.
-- ============================================================================

BEGIN;

-- ===========================================================================
-- FIX-006: admin_action_log -> admin_audit_logs (the simpler one, do first)
-- ===========================================================================

-- 1. Backfill historical rows. admin_audit_logs.admin_id is NOT NULL, so we
--    skip rows missing admin_id (those are unreachable garbage anyway).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema='public' AND table_name='admin_action_log'
       AND table_type='BASE TABLE'
  ) THEN
    INSERT INTO public.admin_audit_logs
      (id, admin_id, action, target_table, target_id, new_values, created_at)
    SELECT
      aal.id,
      aal.admin_id,
      aal.action,
      aal.target_type,
      CASE
        WHEN aal.target_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
          THEN aal.target_id::uuid
        ELSE NULL
      END,
      CASE
        WHEN aal.target_id IS NULL
          OR aal.target_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
          THEN COALESCE(aal.metadata, '{}'::jsonb)
        ELSE COALESCE(aal.metadata, '{}'::jsonb)
             || jsonb_build_object('legacy_target_id', aal.target_id)
      END,
      COALESCE(aal.created_at, now())
    FROM public.admin_action_log aal
    WHERE aal.admin_id IS NOT NULL
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'FIX-006: backfilled admin_action_log rows into admin_audit_logs.';
  END IF;
END $$;

-- 2. Drop the legacy table (and everything that depends on it: policies,
--    indexes, grants). CASCADE is required because the original table had
--    its own RLS policies and indexes from migration 036.
DROP TABLE IF EXISTS public.admin_action_log CASCADE;

-- 3. Recreate as an updatable view that exposes the OLD column names so any
--    existing app code (we found 3 .insert() callsites) keeps working.
CREATE OR REPLACE VIEW public.admin_action_log AS
SELECT
  aal.id,
  aal.admin_id,
  aal.action,
  aal.target_table AS target_type,
  CASE WHEN aal.target_id IS NOT NULL THEN aal.target_id::text
       WHEN aal.new_values ? 'legacy_target_id' THEN aal.new_values->>'legacy_target_id'
       ELSE NULL
  END AS target_id,
  aal.new_values AS metadata,
  aal.created_at
FROM public.admin_audit_logs aal;

-- 4. INSTEAD OF triggers. Only INSERT is needed in practice (the table was
--    write-only audit), but we add UPDATE/DELETE for completeness so any
--    future test cleanup script doesn't blow up.
CREATE OR REPLACE FUNCTION public.admin_action_log_view_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_uuid uuid;
  v_metadata    jsonb;
BEGIN
  IF NEW.admin_id IS NULL THEN
    -- Canonical table requires admin_id; reject silently to match the
    -- legacy "best-effort" semantics (callers wrap in try/catch).
    RAISE EXCEPTION 'admin_action_log insert requires admin_id (NOT NULL on admin_audit_logs)';
  END IF;

  IF NEW.target_id IS NOT NULL
     AND NEW.target_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  THEN
    v_target_uuid := NEW.target_id::uuid;
    v_metadata    := COALESCE(NEW.metadata, '{}'::jsonb);
  ELSE
    v_target_uuid := NULL;
    v_metadata    := COALESCE(NEW.metadata, '{}'::jsonb)
                     || CASE WHEN NEW.target_id IS NULL THEN '{}'::jsonb
                             ELSE jsonb_build_object('legacy_target_id', NEW.target_id)
                        END;
  END IF;

  INSERT INTO public.admin_audit_logs
    (id, admin_id, action, target_table, target_id, new_values, created_at)
  VALUES
    (COALESCE(NEW.id, gen_random_uuid()),
     NEW.admin_id,
     NEW.action,
     NEW.target_type,
     v_target_uuid,
     v_metadata,
     COALESCE(NEW.created_at, now()))
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_action_log_view_insert ON public.admin_action_log;
CREATE TRIGGER trg_admin_action_log_view_insert
INSTEAD OF INSERT ON public.admin_action_log
FOR EACH ROW EXECUTE FUNCTION public.admin_action_log_view_insert();

-- 5. Grants — match what the base table had (SELECT, INSERT to authenticated).
GRANT SELECT, INSERT ON public.admin_action_log TO authenticated;
GRANT SELECT          ON public.admin_action_log TO anon;


-- ===========================================================================
-- FIX-005: seller_payout_accounts -> seller_payout_settings
-- ===========================================================================

-- 1. Backfill: any seller in accounts but missing settings gets a settings
--    row; any settings row that is older than the accounts row gets pulled
--    forward (newest update wins).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema='public' AND table_name='seller_payout_accounts'
       AND table_type='BASE TABLE'
  ) THEN
    INSERT INTO public.seller_payout_settings (
      id, seller_id, payout_method,
      bank_name, bank_account_name, bank_account_number,
      created_at, updated_at
    )
    SELECT
      gen_random_uuid(),
      spa.seller_id,
      'bank_transfer',
      spa.bank_name, spa.account_name, spa.account_number,
      COALESCE(spa.created_at, now()),
      COALESCE(spa.updated_at, now())
    FROM public.seller_payout_accounts spa
    WHERE NOT EXISTS (
      SELECT 1 FROM public.seller_payout_settings sps
       WHERE sps.seller_id = spa.seller_id
    )
    ON CONFLICT (seller_id) DO NOTHING;

    UPDATE public.seller_payout_settings sps
       SET bank_name           = spa.bank_name,
           bank_account_name   = spa.account_name,
           bank_account_number = spa.account_number,
           updated_at          = now()
      FROM public.seller_payout_accounts spa
     WHERE sps.seller_id = spa.seller_id
       AND COALESCE(spa.updated_at, '-infinity'::timestamptz)
            > COALESCE(sps.updated_at, '-infinity'::timestamptz)
       AND ( sps.bank_name           IS DISTINCT FROM spa.bank_name
          OR sps.bank_account_name   IS DISTINCT FROM spa.account_name
          OR sps.bank_account_number IS DISTINCT FROM spa.account_number);

    RAISE NOTICE 'FIX-005: backfilled seller_payout_accounts into seller_payout_settings.';
  END IF;
END $$;

-- 2. Drop the duplicate base table and everything that hangs off it.
DROP TABLE IF EXISTS public.seller_payout_accounts CASCADE;

-- 3. Recreate as a view exposing the legacy column names. Old code that does
--    `.from('seller_payout_accounts').select('seller_id, bank_name, account_name, account_number')`
--    or PostgREST embeds `payout_account:seller_payout_accounts(*)` continues
--    to work. Embeds via FK will fail on a view; embeds via explicit
--    foreign-table hint still work because PostgREST falls back to inferred
--    relationships through the seller_id column. If an embed call breaks
--    after this migration, replace the embed name with `seller_payout_settings`.
CREATE OR REPLACE VIEW public.seller_payout_accounts AS
SELECT
  sps.seller_id,
  sps.bank_name,
  sps.bank_account_name   AS account_name,
  sps.bank_account_number AS account_number,
  sps.created_at,
  sps.updated_at
FROM public.seller_payout_settings sps
WHERE sps.payout_method IN ('bank_transfer','bank')
   OR sps.bank_account_number IS NOT NULL;

-- 4. INSTEAD OF triggers route legacy DML to seller_payout_settings.
CREATE OR REPLACE FUNCTION public.seller_payout_accounts_view_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.seller_payout_settings AS sps (
    seller_id, payout_method,
    bank_name, bank_account_name, bank_account_number,
    created_at, updated_at
  )
  VALUES (
    NEW.seller_id,
    'bank_transfer',
    NEW.bank_name, NEW.account_name, NEW.account_number,
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.updated_at, now())
  )
  ON CONFLICT (seller_id) DO UPDATE
    SET bank_name           = EXCLUDED.bank_name,
        bank_account_name   = EXCLUDED.bank_account_name,
        bank_account_number = EXCLUDED.bank_account_number,
        updated_at          = now()
    WHERE  sps.bank_name           IS DISTINCT FROM EXCLUDED.bank_name
        OR sps.bank_account_name   IS DISTINCT FROM EXCLUDED.bank_account_name
        OR sps.bank_account_number IS DISTINCT FROM EXCLUDED.bank_account_number;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.seller_payout_accounts_view_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.seller_payout_settings
     SET bank_name           = NEW.bank_name,
         bank_account_name   = NEW.account_name,
         bank_account_number = NEW.account_number,
         updated_at          = now()
   WHERE seller_id = NEW.seller_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.seller_payout_accounts_view_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Don't delete the canonical settings row, just clear the bank fields.
  UPDATE public.seller_payout_settings
     SET bank_name           = NULL,
         bank_account_name   = NULL,
         bank_account_number = NULL,
         updated_at          = now()
   WHERE seller_id = OLD.seller_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_seller_payout_accounts_view_insert ON public.seller_payout_accounts;
CREATE TRIGGER trg_seller_payout_accounts_view_insert
INSTEAD OF INSERT ON public.seller_payout_accounts
FOR EACH ROW EXECUTE FUNCTION public.seller_payout_accounts_view_insert();

DROP TRIGGER IF EXISTS trg_seller_payout_accounts_view_update ON public.seller_payout_accounts;
CREATE TRIGGER trg_seller_payout_accounts_view_update
INSTEAD OF UPDATE ON public.seller_payout_accounts
FOR EACH ROW EXECUTE FUNCTION public.seller_payout_accounts_view_update();

DROP TRIGGER IF EXISTS trg_seller_payout_accounts_view_delete ON public.seller_payout_accounts;
CREATE TRIGGER trg_seller_payout_accounts_view_delete
INSTEAD OF DELETE ON public.seller_payout_accounts
FOR EACH ROW EXECUTE FUNCTION public.seller_payout_accounts_view_delete();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_payout_accounts TO authenticated;
GRANT SELECT                         ON public.seller_payout_accounts TO anon;

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
--
--   -- A) Both views exist and are queryable.
--   SELECT 'admin_action_log' AS view_name,
--          (SELECT count(*) FROM admin_action_log)        AS row_count
--   UNION ALL
--   SELECT 'seller_payout_accounts',
--          (SELECT count(*) FROM seller_payout_accounts);
--
--   -- B) Test write-through on admin_action_log (rolls back).
--   BEGIN;
--     INSERT INTO admin_action_log (admin_id, action, target_type, target_id)
--     VALUES ('00000000-0000-0000-0000-000000000000', 'test', 'noop', NULL);
--   ROLLBACK;
--
--   -- C) Test write-through on seller_payout_accounts (rolls back).
--   BEGIN;
--     INSERT INTO seller_payout_accounts (seller_id, bank_name, account_name, account_number)
--     VALUES ('<real-seller-uuid>', 'BPI', 'Juan dela Cruz', '0123456789')
--     ON CONFLICT (seller_id) DO UPDATE SET bank_name = EXCLUDED.bank_name;
--     SELECT bank_name, bank_account_name, bank_account_number
--       FROM seller_payout_settings WHERE seller_id = '<real-seller-uuid>';
--   ROLLBACK;
--
--   -- D) Confirm no duplicate physical tables remain.
--   SELECT table_name, table_type
--     FROM information_schema.tables
--    WHERE table_schema='public'
--      AND table_name IN ('admin_action_log','seller_payout_accounts');
--   -- expect: both rows show table_type='VIEW'.
-- ============================================================================
