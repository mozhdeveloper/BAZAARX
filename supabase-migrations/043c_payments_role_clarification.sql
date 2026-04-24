-- =====================================================================
-- 043c_payments_role_clarification.sql
-- Purpose: Clarify roles of order_payments vs payment_transactions and
--          enforce the 1-per-order invariant on order_payments.
--
-- Decision (after audit on 2026-04-24):
--   * order_payments        = canonical 1-per-order payment record
--                             (POS + ONLINE, all channels, mobile + web).
--   * payment_transactions  = gateway-attempt log (PayMongo/etc).
--                             0..N per order, only created when an
--                             external gateway is actually invoked.
--
-- Audit numbers driving this decision:
--   * order_payments:        562 rows  (518 unique orders only there)
--   * payment_transactions:  96  rows  (43  unique orders only there)
--   * 44 orders have both    (gateway-paid online orders)
--   * OFFLINE/POS orders:    23 in OP, 0 in PT  (correct — no gateway)
--   * ONLINE orders:         539 in OP, 77 in PT (gateway only when used)
--   * 0 duplicate order_id rows in order_payments (UNIQUE is safe)
--
-- Safety: 100% additive. UNIQUE add only — no drops, no NOT NULL flips.
-- =====================================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.order_payments'::regclass
       AND conname  = 'order_payments_order_id_key'
  ) THEN
    ALTER TABLE public.order_payments
      ADD CONSTRAINT order_payments_order_id_key UNIQUE (order_id);
    RAISE NOTICE '[043c] added UNIQUE on order_payments.order_id';
  ELSE
    RAISE NOTICE '[043c] order_payments_order_id_key already exists';
  END IF;
END $$;

COMMENT ON TABLE public.order_payments IS
  'Canonical 1-per-order payment record. Required for ALL orders (POS + ONLINE). Mobile and web checkout both insert here. UNIQUE(order_id) enforces the 1-per-order invariant. For external gateway tracking (PayMongo etc), see payment_transactions.';

COMMENT ON TABLE public.payment_transactions IS
  'Gateway-attempt log. 0..N per order. Only created when an external payment gateway (PayMongo etc) is invoked. Contains gateway_*_id, escrow_status, gateway-specific metadata. Optional — not required for OFFLINE/POS or COD orders.';

COMMENT ON CONSTRAINT order_payments_order_id_key
  ON public.order_payments IS
  'Enforces 1-per-order payment record. Added in 043c after audit confirmed 0 existing duplicates.';

COMMIT;
