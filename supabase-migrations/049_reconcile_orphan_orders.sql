-- ============================================================================
-- Migration 049: Reconcile orphan orders flagged by migration 046
-- ----------------------------------------------------------------------------
-- Migration 046 (2026-04-24) archived 54 orphan orders and flagged the 37
-- survivors with [ORPHAN_NEEDS_REVIEW_2026-04-24] in orders.notes:
--
--   • 17  REFUNDED_ORPHAN_HISTORICAL  — payment was refunded; money trail
--          exists in order_payments. Safe to clear the flag because the
--          financial record is intact — there is nothing more for an admin
--          to do for these rows.
--
--   • 20  PAID_ORPHAN_NEEDS_REVIEW    — buyer was charged, no items ever
--          recorded. Admin must inspect each one and decide: manual refund
--          or close-out. This migration does NOT clear their flag; they stay
--          marked until an admin signs off.
--
-- What this migration does:
--   1) Removes the review tag from the 17 REFUNDED orphans.
--   2) Records the count of remaining PAID orphans as a verification step.
--   3) Permanently documents the _orphan_orders_audit_20260424 table so it
--      is never accidentally dropped.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) Clear the review flag from REFUNDED orphans.
--    These orders have no items and payment_status = 'refunded'.  The financial
--    trail is in order_payments / payment_transactions. The flag is cosmetic
--    noise that pollutes admin dashboards — safe to remove.
-- ----------------------------------------------------------------------------
UPDATE public.orders
   SET notes      = TRIM(
                      REGEXP_REPLACE(
                        COALESCE(notes, ''),
                        '(\s*\|\s*)?(\[ORPHAN_NEEDS_REVIEW_2026-04-24\][^|]*)',
                        '',
                        'g'
                      )
                    ),
       updated_at = now()
 WHERE payment_status = 'refunded'
   AND notes LIKE '%ORPHAN_NEEDS_REVIEW_2026-04-24%'
   AND NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = orders.id);

-- ----------------------------------------------------------------------------
-- 2) Verification: confirm PAID orphans still carry the flag and are visible
--    to admins.  This DO block raises a NOTICE (visible in migration logs)
--    but never raises an EXCEPTION, so it is always non-blocking.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_paid_count     integer;
  v_refunded_count integer;
BEGIN
  SELECT count(*) INTO v_paid_count
    FROM public.orders
   WHERE payment_status IN ('paid', 'partially_refunded')
     AND notes LIKE '%ORPHAN_NEEDS_REVIEW_2026-04-24%'
     AND NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = orders.id);

  SELECT count(*) INTO v_refunded_count
    FROM public.orders
   WHERE payment_status = 'refunded'
     AND notes LIKE '%ORPHAN_NEEDS_REVIEW_2026-04-24%'
     AND NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = orders.id);

  RAISE NOTICE 'orphan-reconcile: % PAID orphan(s) still flagged for admin review, % REFUNDED orphan flag(s) remaining (should be 0 after this migration)',
    v_paid_count, v_refunded_count;

  IF v_refunded_count > 0 THEN
    RAISE NOTICE 'WARNING: % refunded orphan(s) still carry the flag — manual check required.', v_refunded_count;
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3) Reinforce the forensic table documentation so it survives future schema
--    diffs and never gets dropped.
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public._orphan_orders_audit_20260424 IS
  'PERMANENT FORENSIC RECORD — do not drop. '
  'Archived snapshot of all 54 orders that had no order_items rows as of 2026-04-24. '
  '17 pending_payment rows were hard-deleted by migration 046 (abandoned carts). '
  '20 paid + 17 refunded rows survived in public.orders. '
  'Migration 049 cleared the review flag from the 17 refunded rows (money-trail intact). '
  'The ~20 paid rows remain flagged with [ORPHAN_NEEDS_REVIEW_2026-04-24] in orders.notes '
  'until an admin manually reviews and closes each one.';

COMMIT;
