-- ============================================================================
-- Migration 046: Order integrity guard — prevent and clean up "orphan" orders
-- ----------------------------------------------------------------------------
-- Issue discovered 2026-04-24:
--   54 orders exist with NO order_items rows. Breakdown:
--     • 17 pending_payment  → abandoned, never paid → safe to delete
--     • 17 refunded          → money trail must be preserved → archive + flag
--     • 20 paid              → REAL ORPHANS (buyer charged, no items recorded) → archive + flag
--
-- Root cause: web/mobile checkout inserts the `orders` row first (auto-commits),
-- then inserts `order_items` in a parallel Promise.all. If items insert fails
-- (RLS, materialized-view trigger, network, etc.) the orders row stays orphan.
--
-- This migration:
--   1) Archives every orphan order to `_orphan_orders_audit_20260424` (jsonb backup)
--   2) Hard-deletes the 17 pending_payment orphans (truly abandoned carts)
--   3) Adds a BEFORE-trigger that prevents transitioning payment_status → 'paid'
--      when an order has zero order_items rows. This is the structural backstop
--      that catches the bug regardless of which client codepath runs.
--   4) Adds a COMMENT documenting the invariant for future maintainers.
--
-- Companion application changes (separate commit):
--   • web/src/services/checkoutService.ts — rollback orders row if items fail
--   • mobile-app/src/services/checkoutService.ts — same rollback
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) Archive every orphan order before touching anything (forensic record).
--    Uses a dated table name so re-running won't clobber an existing archive.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public._orphan_orders_audit_20260424 (
  archived_at      timestamptz NOT NULL DEFAULT now(),
  reason           text        NOT NULL,
  order_id         uuid        NOT NULL,
  order_number     text,
  buyer_id         uuid,
  payment_status   text,
  shipment_status  text,
  order_type       text,
  created_at       timestamptz,
  full_row         jsonb       NOT NULL,
  related_payments jsonb,
  related_shipments jsonb
);

INSERT INTO public._orphan_orders_audit_20260424
  (reason, order_id, order_number, buyer_id, payment_status, shipment_status,
   order_type, created_at, full_row, related_payments, related_shipments)
SELECT
  CASE
    WHEN o.payment_status = 'paid'            THEN 'PAID_ORPHAN_NEEDS_REVIEW'
    WHEN o.payment_status = 'refunded'        THEN 'REFUNDED_ORPHAN_HISTORICAL'
    WHEN o.payment_status = 'pending_payment' THEN 'ABANDONED_CART_DELETED'
    ELSE 'OTHER_ORPHAN'
  END                                                   AS reason,
  o.id,
  o.order_number,
  o.buyer_id,
  o.payment_status,
  o.shipment_status,
  o.order_type,
  o.created_at,
  to_jsonb(o.*)                                          AS full_row,
  (SELECT jsonb_agg(to_jsonb(p.*)) FROM public.order_payments  p WHERE p.order_id = o.id) AS related_payments,
  (SELECT jsonb_agg(to_jsonb(s.*)) FROM public.order_shipments s WHERE s.order_id = o.id) AS related_shipments
FROM public.orders o
WHERE NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id)
  AND NOT EXISTS (
    SELECT 1 FROM public._orphan_orders_audit_20260424 a WHERE a.order_id = o.id
  );

-- ----------------------------------------------------------------------------
-- 2) Hard-delete the truly abandoned carts (pending_payment, never paid).
--    This is safe: no money was charged, no shipment was created, no items exist.
--    We delete dependents first to avoid FK errors.
-- ----------------------------------------------------------------------------
WITH abandoned AS (
  SELECT o.id
    FROM public.orders o
   WHERE o.payment_status = 'pending_payment'
     AND NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id)
)
DELETE FROM public.order_payments  WHERE order_id IN (SELECT id FROM abandoned);

WITH abandoned AS (
  SELECT o.id
    FROM public.orders o
   WHERE o.payment_status = 'pending_payment'
     AND NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id)
)
DELETE FROM public.order_shipments WHERE order_id IN (SELECT id FROM abandoned);

WITH abandoned AS (
  SELECT o.id
    FROM public.orders o
   WHERE o.payment_status = 'pending_payment'
     AND NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id)
)
DELETE FROM public.orders WHERE id IN (SELECT id FROM abandoned);

-- ----------------------------------------------------------------------------
-- 3) Flag the surviving orphans (paid + refunded) so dashboards/queries can
--    filter them out and admins know they need manual reconciliation.
--    We append a tag to the notes column rather than mutate any money fields.
-- ----------------------------------------------------------------------------
UPDATE public.orders o
   SET notes = COALESCE(o.notes, '') ||
               CASE WHEN o.notes IS NULL OR o.notes = '' THEN '' ELSE ' | ' END ||
               '[ORPHAN_NEEDS_REVIEW_2026-04-24] No order_items rows. See _orphan_orders_audit_20260424.',
       updated_at = now()
 WHERE NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id)
   AND o.notes IS DISTINCT FROM NULL  -- safety
   AND COALESCE(o.notes, '') NOT LIKE '%ORPHAN_NEEDS_REVIEW_2026-04-24%';

-- Cover the NULL-notes case separately (the IS DISTINCT FROM NULL above guards
-- against a no-op concatenation; this one assigns the tag fresh).
UPDATE public.orders o
   SET notes = '[ORPHAN_NEEDS_REVIEW_2026-04-24] No order_items rows. See _orphan_orders_audit_20260424.',
       updated_at = now()
 WHERE NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id)
   AND o.notes IS NULL;

-- ----------------------------------------------------------------------------
-- 4) Structural backstop: prevent transitioning to payment_status='paid' when
--    the order has zero order_items. This catches the bug regardless of which
--    client codepath runs (web checkout, mobile checkout, admin tooling, etc.).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_paid_order_has_items()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_count integer;
BEGIN
  -- Only fire when payment_status is being set to 'paid'.
  IF NEW.payment_status IS DISTINCT FROM 'paid' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.payment_status = 'paid' THEN
    RETURN NEW;  -- already paid, no transition; allow other field updates
  END IF;

  SELECT count(*) INTO v_count FROM public.order_items WHERE order_id = NEW.id;
  IF v_count = 0 THEN
    RAISE EXCEPTION
      'Cannot mark order % as paid: no order_items rows exist (would create an orphan order). Insert order_items first.',
      NEW.id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_enforce_paid_order_has_items ON public.orders;
CREATE TRIGGER trg_enforce_paid_order_has_items
  BEFORE INSERT OR UPDATE OF payment_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_paid_order_has_items();

COMMENT ON FUNCTION public.enforce_paid_order_has_items() IS
  'Prevents transitioning orders.payment_status to ''paid'' when order_items is empty. Backstop for the orphan-order bug fixed in migration 046 (2026-04-24).';

COMMENT ON TABLE public._orphan_orders_audit_20260424 IS
  'Forensic backup of all orders that had no order_items as of 2026-04-24. The 17 pending_payment rows were hard-deleted (abandoned carts). The 20 paid + 17 refunded rows survive in public.orders flagged with [ORPHAN_NEEDS_REVIEW_2026-04-24] in notes — see migration 046.';

-- ----------------------------------------------------------------------------
-- 5) Verification block — surface that the cleanup achieved its goals
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_remaining_pending integer;
  v_archive_rows      integer;
  v_remaining_total   integer;
BEGIN
  SELECT count(*) INTO v_remaining_pending
    FROM public.orders o
   WHERE o.payment_status = 'pending_payment'
     AND NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id);

  SELECT count(*) INTO v_remaining_total
    FROM public.orders o
   WHERE NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id);

  SELECT count(*) INTO v_archive_rows FROM public._orphan_orders_audit_20260424;

  IF v_remaining_pending <> 0 THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: % pending_payment orphan orders remain after cleanup', v_remaining_pending;
  END IF;

  RAISE NOTICE 'Migration 046: archived=%, deleted abandoned carts (pending_payment with no items)=0 remaining, flagged paid+refunded orphans, total empty-orders surviving (paid+refunded for manual review)=%',
    v_archive_rows, v_remaining_total;
END $$;

COMMIT;
