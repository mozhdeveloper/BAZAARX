-- =====================================================================
-- 043d_backfill_order_payments.sql
-- Purpose: Create order_payments rows for the 338 historical orders
--          that have no payment record. Closes the data gap caused by
--          the pre-fix web checkout writing to the wrong table.
--
-- Audit (2026-04-24):
--   * 338 orders have no order_payments row
--     - 33 of them have a payment_transactions row -> use that as source
--     - 305 have neither -> use orders.payment_status + sum(order_items)
--   * 284 orders have order_items (amount = SUM(price*quantity))
--   * 54 orders have NO order_items (broken/abandoned -> amount = 0)
--   * orders.payment_status spread:
--     - 206 pending_payment  -> status='pending'
--     - 89  paid             -> status='completed'
--     - 43  refunded         -> status='refunded'
--
-- Mapping rules (strict):
--   * payment_method = {"type":"unknown","backfilled":true,"source":<...>}
--     so future readers can identify backfilled rows.
--   * amount        = SUM(order_items.price * order_items.quantity), else 0
--                     OR payment_transactions.amount when available.
--   * status        = pending | completed | refunded based on
--                     orders.payment_status (no fabrication).
--   * payment_date  = orders.paid_at (NULL when not paid).
--   * created_at    = orders.created_at (preserves timeline; required NOT NULL).
--
-- Safety:
--   * Idempotent via ON CONFLICT (order_id) DO NOTHING — uses the
--     UNIQUE constraint added in 043c.
--   * Single transaction.
--   * Backfilled rows are tagged in payment_method jsonb so they can
--     be filtered out of dashboards if you want strict "real" data only.
--   * No DROP, no UPDATE of existing OP rows, no destructive ops.
-- =====================================================================

BEGIN;

-- Pass 1: Use payment_transactions data when it exists (33 orders)
INSERT INTO public.order_payments
  (order_id, payment_method, amount, status, payment_date, created_at)
SELECT
  pt.order_id,
  jsonb_build_object(
    'type', COALESCE(pt.payment_type, 'unknown'),
    'backfilled', true,
    'source', 'payment_transactions',
    'gateway', pt.gateway
  ),
  pt.amount,
  CASE
    WHEN o.payment_status = 'paid'             THEN 'completed'
    WHEN o.payment_status = 'refunded'         THEN 'refunded'
    WHEN o.payment_status = 'pending_payment'  THEN 'pending'
    ELSE COALESCE(pt.status, 'pending')
  END,
  COALESCE(o.paid_at, pt.paid_at),
  o.created_at
FROM public.orders o
JOIN public.payment_transactions pt ON pt.order_id = o.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.order_payments op WHERE op.order_id = o.id
)
-- If an order has multiple PT rows, pick the most recent successful one
AND pt.id = (
  SELECT id FROM public.payment_transactions pt2
   WHERE pt2.order_id = o.id
   ORDER BY (pt2.status = 'succeeded') DESC NULLS LAST,
            pt2.paid_at DESC NULLS LAST,
            pt2.created_at DESC
   LIMIT 1
)
ON CONFLICT (order_id) DO NOTHING;

-- Pass 2: Synthesize from orders + sum(order_items) for the rest (305 orders)
INSERT INTO public.order_payments
  (order_id, payment_method, amount, status, payment_date, created_at)
SELECT
  o.id,
  jsonb_build_object(
    'type', 'unknown',
    'backfilled', true,
    'source', CASE WHEN items.amount IS NOT NULL
                   THEN 'order_items_sum'
                   ELSE 'no_items_zero' END
  ),
  COALESCE(items.amount, 0),
  CASE
    WHEN o.payment_status = 'paid'             THEN 'completed'
    WHEN o.payment_status = 'refunded'         THEN 'refunded'
    WHEN o.payment_status = 'pending_payment'  THEN 'pending'
    ELSE 'pending'
  END,
  o.paid_at,
  o.created_at
FROM public.orders o
LEFT JOIN LATERAL (
  SELECT SUM(oi.price * oi.quantity)::numeric AS amount
    FROM public.order_items oi
   WHERE oi.order_id = o.id
) items ON TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.order_payments op WHERE op.order_id = o.id
)
ON CONFLICT (order_id) DO NOTHING;

COMMIT;

-- =====================================================================
-- POST-MIGRATION VERIFICATION (run separately, not in transaction)
-- =====================================================================
-- SELECT
--   (SELECT count(*) FROM public.orders) AS total_orders,
--   (SELECT count(*) FROM public.order_payments) AS total_op,
--   (SELECT count(*) FROM public.orders o
--      WHERE NOT EXISTS (SELECT 1 FROM public.order_payments op WHERE op.order_id=o.id)
--   ) AS still_missing,
--   (SELECT count(*) FROM public.order_payments
--      WHERE payment_method->>'backfilled' = 'true') AS backfilled_count;
