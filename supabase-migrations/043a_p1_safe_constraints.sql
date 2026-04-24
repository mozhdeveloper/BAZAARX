-- =====================================================================
-- 043a_p1_safe_constraints.sql
-- Purpose: P1 fixes that are 100% additive and zero-risk based on the
--          live data audit (2026-04-24).
--
-- Audit results that justify each change:
--   * refund_return_periods: 59 rows, 0 duplicate order_id values
--     -> UNIQUE constraint can be added without data cleanup.
--
-- Deliberately NOT in this migration (need separate review):
--   * conversations.buyer_id FK currently points to auth.users
--     ON DELETE CASCADE (not profiles like all other tables). Changing
--     it requires DROP + ADD constraint which is destructive. Will be
--     handled in 043b after explicit approval.
--   * order_payments (562) vs payment_transactions (96): order_payments
--     is the more populated table; consolidation direction must be
--     re-evaluated. Hold for 043c.
--   * delivery_bookings (125) vs order_shipments (177): hold for 043c.
--   * Notifications consolidation: hold for 043d (largest read-site
--     impact).
--
-- Safety:
--   * Single ADD CONSTRAINT, idempotent via guarded DO block.
--   * No DROP, no NOT NULL, no data movement.
-- =====================================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.refund_return_periods'::regclass
       AND conname  = 'refund_return_periods_order_id_key'
  ) THEN
    ALTER TABLE public.refund_return_periods
      ADD CONSTRAINT refund_return_periods_order_id_key UNIQUE (order_id);
    RAISE NOTICE '[043a] added UNIQUE on refund_return_periods.order_id';
  ELSE
    RAISE NOTICE '[043a] refund_return_periods_order_id_key already exists';
  END IF;
END $$;

COMMENT ON CONSTRAINT refund_return_periods_order_id_key
  ON public.refund_return_periods IS
  'One refund/return window per order. Enforces business rule and prevents the duplicate-window bug class. Added in migration 043a after audit confirmed 0 existing duplicates.';

COMMIT;
