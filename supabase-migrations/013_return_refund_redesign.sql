-- ============================================================================
-- Return & Refund Redesign Migration
-- Adds new columns to refund_return_periods for:
--   - Per-item returns (items_json)
--   - Evidence uploads (evidence_urls)
--   - Smart resolution paths (resolution_path)
--   - Seller counter-offer flow
--   - 48h seller deadline + auto-escalation
--   - Return shipping tracking
--   - Admin escalation resolution
-- ============================================================================

-- New columns on refund_return_periods
ALTER TABLE public.refund_return_periods
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'seller_review',
      'counter_offered',
      'approved',
      'rejected',
      'escalated',
      'return_in_transit',
      'return_received',
      'refunded'
    )),
  ADD COLUMN IF NOT EXISTS return_type text NOT NULL DEFAULT 'return_refund'
    CHECK (return_type IN ('return_refund', 'refund_only', 'replacement')),
  ADD COLUMN IF NOT EXISTS resolution_path text NOT NULL DEFAULT 'seller_review'
    CHECK (resolution_path IN ('instant', 'seller_review', 'return_required')),
  ADD COLUMN IF NOT EXISTS items_json jsonb,
  ADD COLUMN IF NOT EXISTS evidence_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS seller_note text,
  ADD COLUMN IF NOT EXISTS rejected_reason text,
  ADD COLUMN IF NOT EXISTS counter_offer_amount numeric CHECK (counter_offer_amount >= 0),
  ADD COLUMN IF NOT EXISTS seller_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES public.admins(id),
  ADD COLUMN IF NOT EXISTS return_label_url text,
  ADD COLUMN IF NOT EXISTS return_tracking_number text,
  ADD COLUMN IF NOT EXISTS buyer_shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS return_received_at timestamptz;

-- Set seller_deadline = created_at + 48h for any existing pending rows
UPDATE public.refund_return_periods
SET seller_deadline = created_at + interval '48 hours',
    status = CASE
      WHEN refund_date IS NOT NULL THEN 'refunded'
      WHEN is_returnable = false THEN 'rejected'
      ELSE 'pending'
    END
WHERE seller_deadline IS NULL;

-- Index for seller deadline auto-escalation cron
CREATE INDEX IF NOT EXISTS idx_return_seller_deadline
  ON public.refund_return_periods (seller_deadline)
  WHERE status IN ('pending', 'seller_review');

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_return_status
  ON public.refund_return_periods (status);

-- Index for order lookup
CREATE INDEX IF NOT EXISTS idx_return_order_id
  ON public.refund_return_periods (order_id);

-- ============================================================================
-- Supabase Edge Function: Auto-escalate expired seller deadlines
-- This should be deployed separately and triggered by pg_cron every 15 minutes
-- ============================================================================
-- Example cron SQL (run in Supabase SQL editor once):
--
-- SELECT cron.schedule(
--   'auto-escalate-returns',
--   '*/15 * * * *',
--   $$
--     UPDATE public.refund_return_periods
--     SET status = 'escalated',
--         escalated_at = now()
--     WHERE status IN ('pending', 'seller_review')
--       AND seller_deadline < now()
--       AND escalated_at IS NULL;
--   $$
-- );
