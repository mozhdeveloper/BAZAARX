-- ============================================================================
-- Migration 021: Payment Escrow System
-- ============================================================================
-- Adds escrow columns to payment_transactions and seller_payouts so that
-- funds are held after a buyer pays and only released to the seller once
-- delivery is confirmed + a 3-day dispute window passes.
--
-- Escrow lifecycle:
--   1. Buyer pays → escrow_status = 'held', escrow_held_at = NOW()
--                   escrow_release_at = NOW() + 3 days (after delivery confirmed)
--   2. Order delivered → escrow_release_at = delivered_at + 3 days
--   3. Dispute window passes → escrow_status = 'released', escrow_released_at = NOW()
--                              seller_payouts.status = 'pending' (ready to pay out)
--   4. Refund/dispute won by buyer → escrow_status = 'refunded'
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. payment_transactions — add escrow tracking columns
-- ----------------------------------------------------------------------------
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS escrow_status  varchar(20)  NOT NULL DEFAULT 'none'
    CHECK (escrow_status IN ('none', 'held', 'released', 'refunded')),
  ADD COLUMN IF NOT EXISTS escrow_held_at      timestamptz,
  ADD COLUMN IF NOT EXISTS escrow_release_at   timestamptz,   -- scheduled release datetime
  ADD COLUMN IF NOT EXISTS escrow_released_at  timestamptz;   -- actual release datetime

-- Index for the release-escrow job: find all held transactions whose window has passed
CREATE INDEX IF NOT EXISTS idx_payment_transactions_escrow
  ON public.payment_transactions (escrow_status, escrow_release_at)
  WHERE escrow_status = 'held';

-- ----------------------------------------------------------------------------
-- 2. seller_payouts — record which escrow transaction backs this payout
--    and when it becomes eligible for processing
-- ----------------------------------------------------------------------------
ALTER TABLE public.seller_payouts
  ADD COLUMN IF NOT EXISTS escrow_transaction_id  uuid  REFERENCES public.payment_transactions(id),
  ADD COLUMN IF NOT EXISTS release_after          timestamptz;  -- payout is locked until this time

-- Index so we can quickly find payouts whose escrow window has passed
CREATE INDEX IF NOT EXISTS idx_seller_payouts_release_after
  ON public.seller_payouts (status, release_after)
  WHERE status = 'on_hold';

-- ----------------------------------------------------------------------------
-- 3. Helper function: schedule_escrow_release
--    Called by the application layer when an order reaches 'delivered' status.
--    Sets escrow_release_at = delivered_at + 3 days on the transaction and
--    puts the matching seller_payout on 'on_hold' until that time.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.schedule_escrow_release(
  p_order_id    uuid,
  p_delivered_at timestamptz DEFAULT NOW()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_release_at  timestamptz := p_delivered_at + interval '3 days';
  v_txn_id      uuid;
BEGIN
  -- Find the paid transaction for this order
  SELECT id INTO v_txn_id
  FROM public.payment_transactions
  WHERE order_id = p_order_id
    AND status = 'paid'
    AND escrow_status = 'held'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_txn_id IS NULL THEN
    RETURN;  -- No held transaction — nothing to schedule
  END IF;

  -- Set the release window on the transaction
  UPDATE public.payment_transactions
  SET escrow_release_at  = v_release_at,
      updated_at         = NOW()
  WHERE id = v_txn_id;

  -- Put the seller payout on hold until the same window
  UPDATE public.seller_payouts
  SET status        = 'on_hold',
      release_after = v_release_at,
      updated_at    = NOW()
  WHERE payment_transaction_id = v_txn_id
    AND status IN ('pending', 'on_hold');
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Helper function: release_escrow_for_order
--    Called by the release-escrow Edge Function (or manually by admin).
--    Marks the transaction as released and makes the seller payout eligible.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_escrow_for_order(
  p_order_id  uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_txn_id  uuid;
BEGIN
  SELECT id INTO v_txn_id
  FROM public.payment_transactions
  WHERE order_id = p_order_id
    AND status = 'paid'
    AND escrow_status = 'held'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_txn_id IS NULL THEN
    RETURN;
  END IF;

  -- Release escrow
  UPDATE public.payment_transactions
  SET escrow_status      = 'released',
      escrow_released_at = NOW(),
      updated_at         = NOW()
  WHERE id = v_txn_id;

  -- Make payout eligible
  UPDATE public.seller_payouts
  SET status     = 'pending',
      updated_at = NOW()
  WHERE payment_transaction_id = v_txn_id
    AND status = 'on_hold';
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Trigger: when an order shipment_status changes to 'delivered',
--    automatically schedule escrow release via DB trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_order_delivered_schedule_escrow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Fire when shipment_status transitions to 'delivered' or 'received'
  IF NEW.shipment_status IN ('delivered', 'received')
     AND (OLD.shipment_status IS DISTINCT FROM NEW.shipment_status) THEN
    PERFORM public.schedule_escrow_release(NEW.id, NOW());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_delivered_schedule_escrow ON public.orders;
CREATE TRIGGER trg_order_delivered_schedule_escrow
  AFTER UPDATE OF shipment_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_order_delivered_schedule_escrow();

-- ----------------------------------------------------------------------------
-- 6. Grant execute rights to service role
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.schedule_escrow_release(uuid, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_escrow_for_order(uuid) TO service_role;
