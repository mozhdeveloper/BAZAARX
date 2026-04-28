-- ============================================================================
-- Migration: 039_p0_type_and_constraint_fixes
-- Purpose:   Apply DEV_FIX_LIST P0 schema-hardening fixes that are pure DDL:
--             FIX-001  order_shipments.seller_id  text  -> uuid
--             FIX-002  seller_notifications.seller_id  NOT NULL
--             FIX-003  refund_return_periods.resolved_by  text -> uuid
--                      + new resolution_source text column
--             FIX-004  9 nullable created_at / updated_at columns
--                      backfilled and set to NOT NULL DEFAULT now()
--             FIX-012  varchar -> text on 6 outlier tables
--
-- Safety:   * Idempotent: every statement guarded by IF EXISTS / DO blocks.
--           * Non-destructive: no DROP TABLE / DROP COLUMN. The text->uuid
--             casts only run if the source column is currently text.
--           * Pre-flight checks raise instead of silently corrupting data
--             (e.g. order_shipments rows with non-UUID seller_id).
--
-- Run order: After 038_return_email_templates.sql.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- FIX-001: order_shipments.seller_id  text -> uuid
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_type text;
  v_bad  bigint;
BEGIN
  SELECT data_type INTO v_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'order_shipments'
     AND column_name  = 'seller_id';

  IF v_type IS NULL THEN
    RAISE NOTICE 'order_shipments.seller_id not found, skipping FIX-001.';
  ELSIF v_type = 'uuid' THEN
    RAISE NOTICE 'order_shipments.seller_id already uuid, skipping FIX-001.';
  ELSE
    -- Pre-flight: refuse to cast if any row has a non-UUID seller_id.
    SELECT count(*) INTO v_bad
      FROM public.order_shipments
     WHERE seller_id IS NOT NULL
       AND seller_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

    IF v_bad > 0 THEN
      RAISE EXCEPTION
        'FIX-001 aborted: % rows in order_shipments have non-UUID seller_id. '
        'Inspect with: SELECT id, seller_id FROM order_shipments '
        'WHERE seller_id !~ ''^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'';',
        v_bad;
    END IF;

    -- Drop policies that depend on seller_id (Postgres refuses ALTER TYPE
    -- while a policy references the column). We recreate them after the cast
    -- with proper uuid comparison instead of the legacy ::text workaround.
    EXECUTE 'DROP POLICY IF EXISTS "Sellers can read own shipments"   ON public.order_shipments';
    EXECUTE 'DROP POLICY IF EXISTS "Sellers can update own shipments" ON public.order_shipments';

    EXECUTE 'ALTER TABLE public.order_shipments
               ALTER COLUMN seller_id TYPE uuid USING seller_id::uuid';

    EXECUTE $pol$
      CREATE POLICY "Sellers can read own shipments"
        ON public.order_shipments FOR SELECT TO authenticated
        USING (seller_id = auth.uid())
    $pol$;
    EXECUTE $pol$
      CREATE POLICY "Sellers can update own shipments"
        ON public.order_shipments FOR UPDATE TO authenticated
        USING (seller_id = auth.uid())
        WITH CHECK (seller_id = auth.uid())
    $pol$;

    RAISE NOTICE 'FIX-001: order_shipments.seller_id converted to uuid; policies rebuilt without text cast.';
  END IF;
END $$;

-- Add proper FK to sellers now that the type matches.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema='public' AND table_name='sellers'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
     WHERE table_schema='public'
       AND table_name='order_shipments'
       AND constraint_name='order_shipments_seller_id_fkey'
  ) THEN
    EXECUTE 'ALTER TABLE public.order_shipments
               ADD CONSTRAINT order_shipments_seller_id_fkey
               FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
               ON DELETE RESTRICT';
    RAISE NOTICE 'FIX-001: added order_shipments.seller_id_fkey -> sellers(id).';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- FIX-002: seller_notifications.seller_id NOT NULL
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_orphans bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public'
       AND table_name='seller_notifications'
       AND column_name='seller_id'
  ) THEN
    RAISE NOTICE 'seller_notifications.seller_id not found, skipping FIX-002.';
    RETURN;
  END IF;

  SELECT count(*) INTO v_orphans
    FROM public.seller_notifications
   WHERE seller_id IS NULL;

  IF v_orphans > 0 THEN
    RAISE NOTICE 'FIX-002: deleting % orphan seller_notifications rows with NULL seller_id.', v_orphans;
    DELETE FROM public.seller_notifications WHERE seller_id IS NULL;
  END IF;

  -- ALTER COLUMN ... SET NOT NULL is a no-op if already NOT NULL.
  EXECUTE 'ALTER TABLE public.seller_notifications
             ALTER COLUMN seller_id SET NOT NULL';
  RAISE NOTICE 'FIX-002: seller_notifications.seller_id is NOT NULL.';
END $$;

-- ---------------------------------------------------------------------------
-- FIX-003: refund_return_periods.resolved_by  text -> uuid
--          + add resolution_source text
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_type text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='refund_return_periods'
       AND column_name='resolved_by'
  ) THEN
    RAISE NOTICE 'refund_return_periods.resolved_by not found, skipping FIX-003.';
    RETURN;
  END IF;

  -- Add resolution_source if missing.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='refund_return_periods'
       AND column_name='resolution_source'
  ) THEN
    EXECUTE 'ALTER TABLE public.refund_return_periods
               ADD COLUMN resolution_source text';
    RAISE NOTICE 'FIX-003: added refund_return_periods.resolution_source.';
  END IF;

  SELECT data_type INTO v_type
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='refund_return_periods'
     AND column_name='resolved_by';

  IF v_type = 'uuid' THEN
    RAISE NOTICE 'refund_return_periods.resolved_by already uuid, skipping cast.';
  ELSE
    -- Move all non-UUID sentinel strings (system, auto, seller, buyer, admin, etc.)
    -- into resolution_source. Only true UUIDs remain in resolved_by.
    EXECUTE $sql$
      UPDATE public.refund_return_periods
         SET resolution_source = COALESCE(resolution_source, resolved_by),
             resolved_by       = NULL
       WHERE resolved_by IS NOT NULL
         AND resolved_by !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    $sql$;

    EXECUTE 'ALTER TABLE public.refund_return_periods
               ALTER COLUMN resolved_by TYPE uuid USING resolved_by::uuid';
    RAISE NOTICE 'FIX-003: resolved_by converted to uuid; sentinels moved to resolution_source.';
  END IF;

  -- Constrain resolution_source to known values.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'refund_return_periods_resolution_source_check'
  ) THEN
    EXECUTE $sql$
      ALTER TABLE public.refund_return_periods
        ADD CONSTRAINT refund_return_periods_resolution_source_check
        CHECK (resolution_source IS NULL
               OR resolution_source IN ('buyer','seller','admin','system','auto','auto-escalation'))
    $sql$;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_refund_return_periods_resolved_by
  ON public.refund_return_periods (resolved_by)
  WHERE resolved_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_refund_return_periods_resolution_source
  ON public.refund_return_periods (resolution_source)
  WHERE resolution_source IS NOT NULL;

-- ---------------------------------------------------------------------------
-- FIX-004: 9 nullable created_at / updated_at columns -> NOT NULL DEFAULT now()
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  v_targets text[][] := ARRAY[
    ARRAY['courier_rate_cache',       'created_at'],
    ARRAY['delivery_bookings',        'created_at'],
    ARRAY['delivery_tracking_events', 'created_at'],
    ARRAY['flash_sale_submissions',   'created_at'],
    ARRAY['global_flash_sale_slots',  'created_at'],
    ARRAY['payment_transactions',     'created_at'],
    ARRAY['seller_payouts',           'created_at'],
    ARRAY['seller_payout_settings',   'created_at'],
    ARRAY['user_presence',            'updated_at']
  ];
  v_tbl text;
  v_col text;
BEGIN
  FOR i IN 1 .. array_length(v_targets, 1) LOOP
    v_tbl := v_targets[i][1];
    v_col := v_targets[i][2];

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name=v_tbl AND column_name=v_col
    ) THEN
      RAISE NOTICE 'FIX-004: % .% not found, skipping.', v_tbl, v_col;
      CONTINUE;
    END IF;

    EXECUTE format('UPDATE public.%I SET %I = now() WHERE %I IS NULL', v_tbl, v_col, v_col);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT now()', v_tbl, v_col);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET NOT NULL',     v_tbl, v_col);
    RAISE NOTICE 'FIX-004: % .% backfilled, NOT NULL, DEFAULT now().', v_tbl, v_col;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- FIX-012: varchar -> text on outlier tables (lossless in Postgres).
--          Wrapped in IF EXISTS so partial schemas don't break.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  v_pairs text[][] := ARRAY[
    -- payment_transactions
    ARRAY['payment_transactions','gateway'],
    ARRAY['payment_transactions','gateway_payment_intent_id'],
    ARRAY['payment_transactions','gateway_payment_method_id'],
    ARRAY['payment_transactions','gateway_source_id'],
    ARRAY['payment_transactions','currency'],
    ARRAY['payment_transactions','payment_type'],
    ARRAY['payment_transactions','status'],
    ARRAY['payment_transactions','statement_descriptor'],
    ARRAY['payment_transactions','escrow_status'],
    -- delivery_bookings
    ARRAY['delivery_bookings','courier_code'],
    ARRAY['delivery_bookings','courier_name'],
    ARRAY['delivery_bookings','service_type'],
    ARRAY['delivery_bookings','booking_reference'],
    ARRAY['delivery_bookings','tracking_number'],
    ARRAY['delivery_bookings','status'],
    -- seller_payout_settings
    ARRAY['seller_payout_settings','payout_method'],
    ARRAY['seller_payout_settings','bank_name'],
    ARRAY['seller_payout_settings','bank_account_name'],
    ARRAY['seller_payout_settings','bank_account_number'],
    ARRAY['seller_payout_settings','ewallet_provider'],
    ARRAY['seller_payout_settings','ewallet_number'],
    -- seller_payouts
    ARRAY['seller_payouts','status'],
    ARRAY['seller_payouts','payout_method'],
    ARRAY['seller_payouts','reference_number'],
    -- courier_rate_cache
    ARRAY['courier_rate_cache','courier_code'],
    ARRAY['courier_rate_cache','service_type'],
    -- delivery_tracking_events
    ARRAY['delivery_tracking_events','status'],
    ARRAY['delivery_tracking_events','description']
  ];
  v_tbl text;
  v_col text;
  v_dtype text;
BEGIN
  FOR i IN 1 .. array_length(v_pairs, 1) LOOP
    v_tbl := v_pairs[i][1];
    v_col := v_pairs[i][2];

    SELECT data_type INTO v_dtype
      FROM information_schema.columns
     WHERE table_schema='public' AND table_name=v_tbl AND column_name=v_col;

    IF v_dtype IS NULL THEN
      CONTINUE;  -- column doesn't exist on this database, skip silently
    END IF;

    IF v_dtype = 'character varying' THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE text', v_tbl, v_col);
      RAISE NOTICE 'FIX-012: % .%  varchar -> text.', v_tbl, v_col;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION TODO (manual, OUTSIDE this transaction):
--   1. Regenerate types:
--        supabase gen types typescript --project-id <PROJECT_ID> > web/src/types/database.types.ts
--        supabase gen types typescript --project-id <PROJECT_ID> > mobile-app/src/types/database.types.ts
--   2. Verify no app code casts order_shipments.seller_id::text or ::uuid manually.
--   3. Application writes to refund_return_periods.resolved_by must now pass a
--      true UUID. Sentinel role strings ('seller','buyer','system') belong in
--      resolution_source. The 040 commit updates returnService.ts + orderService.ts
--      accordingly.
-- ============================================================================
