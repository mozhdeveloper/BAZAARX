-- 037_returns_security_and_messaging.sql
-- P0 hardening for the return/refund system.
--
-- Adds:
--   1. RLS on refund_return_periods (buyer / seller / admin).
--   2. return_messages table for buyer<->seller conversation about a return.
--   3. Auto-escalation: SQL function + (best-effort) pg_cron schedule that
--      flips stale pending/seller_review returns to 'escalated' once
--      seller_deadline passes.
--   4. Helpful indexes used by the new RLS policies.
--
-- Idempotent and safe to re-run.
-- Depends on: 013_return_refund_redesign.sql, 036_admin_settings.sql
--             (uses public.is_admin_user()).

-- ============================================================================
-- 1. Row Level Security on refund_return_periods
-- ============================================================================

ALTER TABLE public.refund_return_periods ENABLE ROW LEVEL SECURITY;

-- Drop any prior copies so we can update them safely.
DROP POLICY IF EXISTS "returns_buyer_select" ON public.refund_return_periods;
DROP POLICY IF EXISTS "returns_seller_select" ON public.refund_return_periods;
DROP POLICY IF EXISTS "returns_admin_select" ON public.refund_return_periods;
DROP POLICY IF EXISTS "returns_buyer_insert" ON public.refund_return_periods;
DROP POLICY IF EXISTS "returns_buyer_update" ON public.refund_return_periods;
DROP POLICY IF EXISTS "returns_seller_update" ON public.refund_return_periods;
DROP POLICY IF EXISTS "returns_admin_all" ON public.refund_return_periods;

-- Buyers may read returns for orders they placed.
CREATE POLICY "returns_buyer_select"
  ON public.refund_return_periods FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = refund_return_periods.order_id
        AND o.buyer_id = auth.uid()
    )
  );

-- Sellers may read returns whose order contains at least one of their items.
CREATE POLICY "returns_seller_select"
  ON public.refund_return_periods FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = refund_return_periods.order_id
        AND p.seller_id = auth.uid()
    )
  );

-- Admins can read everything.
CREATE POLICY "returns_admin_select"
  ON public.refund_return_periods FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

-- Buyers may create a return for their own orders.
CREATE POLICY "returns_buyer_insert"
  ON public.refund_return_periods FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = refund_return_periods.order_id
        AND o.buyer_id = auth.uid()
    )
  );

-- Buyers may update their own returns (e.g. accept counter-offer, mark shipped).
CREATE POLICY "returns_buyer_update"
  ON public.refund_return_periods FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = refund_return_periods.order_id
        AND o.buyer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = refund_return_periods.order_id
        AND o.buyer_id = auth.uid()
    )
  );

-- Sellers may update returns that include their items
-- (approve / reject / counter-offer / mark received).
CREATE POLICY "returns_seller_update"
  ON public.refund_return_periods FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = refund_return_periods.order_id
        AND p.seller_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = refund_return_periods.order_id
        AND p.seller_id = auth.uid()
    )
  );

-- Admins can do anything (insert/update/delete) on returns.
CREATE POLICY "returns_admin_all"
  ON public.refund_return_periods FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

GRANT SELECT, INSERT, UPDATE ON public.refund_return_periods TO authenticated;

-- Index hints used by the policies above.
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders (buyer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_product
  ON public.order_items (order_id, product_id);
CREATE INDEX IF NOT EXISTS idx_products_seller_id
  ON public.products (seller_id);

-- ============================================================================
-- 2. return_messages: buyer<->seller<->admin conversation thread
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.return_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.refund_return_periods(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('buyer', 'seller', 'admin', 'system')),
  body text NOT NULL,
  attachments text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_return_messages_return_created
  ON public.return_messages (return_id, created_at);
CREATE INDEX IF NOT EXISTS idx_return_messages_sender
  ON public.return_messages (sender_id, created_at DESC);

ALTER TABLE public.return_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "return_messages_select" ON public.return_messages;
DROP POLICY IF EXISTS "return_messages_insert" ON public.return_messages;

-- A user may read messages for any return they can read.
CREATE POLICY "return_messages_select"
  ON public.return_messages FOR SELECT
  TO authenticated
  USING (
    public.is_admin_user()
    OR EXISTS (
      SELECT 1 FROM public.refund_return_periods r
      JOIN public.orders o ON o.id = r.order_id
      WHERE r.id = return_messages.return_id
        AND o.buyer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.refund_return_periods r
      JOIN public.order_items oi ON oi.order_id = r.order_id
      JOIN public.products p ON p.id = oi.product_id
      WHERE r.id = return_messages.return_id
        AND p.seller_id = auth.uid()
    )
  );

-- Same predicate for inserts: must be a participant in the return.
CREATE POLICY "return_messages_insert"
  ON public.return_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      public.is_admin_user()
      OR EXISTS (
        SELECT 1 FROM public.refund_return_periods r
        JOIN public.orders o ON o.id = r.order_id
        WHERE r.id = return_messages.return_id
          AND o.buyer_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.refund_return_periods r
        JOIN public.order_items oi ON oi.order_id = r.order_id
        JOIN public.products p ON p.id = oi.product_id
        WHERE r.id = return_messages.return_id
          AND p.seller_id = auth.uid()
      )
    )
  );

GRANT SELECT, INSERT ON public.return_messages TO authenticated;

-- ============================================================================
-- 3. Auto-escalation: function + scheduled job
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_escalate_overdue_returns()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.refund_return_periods
     SET status = 'escalated',
         escalated_at = now()
   WHERE status IN ('pending', 'seller_review')
     AND seller_deadline IS NOT NULL
     AND seller_deadline < now()
     AND escalated_at IS NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END
$$;

-- Try to schedule via pg_cron. If the extension isn't enabled in this project
-- we just log a notice and continue — the migration must remain idempotent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('auto-escalate-returns')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-escalate-returns');

    PERFORM cron.schedule(
      'auto-escalate-returns',
      '*/15 * * * *',
      $cmd$ SELECT public.auto_escalate_overdue_returns(); $cmd$
    );
    RAISE NOTICE 'auto-escalate-returns scheduled every 15 minutes';
  ELSE
    RAISE NOTICE 'pg_cron not installed; call public.auto_escalate_overdue_returns() from an external scheduler instead';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron schedule attempt failed (%): run public.auto_escalate_overdue_returns() externally', SQLERRM;
END
$$;
