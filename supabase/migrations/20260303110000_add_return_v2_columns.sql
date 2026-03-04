-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add v2 columns to refund_return_periods
--
-- The table was created with only legacy columns. The v2 Return Service
-- (returnService.ts) requires additional columns for status tracking,
-- v2 resolution paths, counter-offers, and return-in-transit flows.
-- All columns are nullable/have defaults so existing rows are unaffected.
-- ─────────────────────────────────────────────────────────────────────────────

-- Status tracking (replaces old is_returnable boolean logic)
ALTER TABLE public.refund_return_periods
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending'
    CHECK (status = ANY (ARRAY[
      'pending', 'seller_review', 'counter_offered', 'approved',
      'rejected', 'escalated', 'return_in_transit', 'return_received', 'refunded'
    ]));

-- Resolution context
ALTER TABLE public.refund_return_periods
  ADD COLUMN IF NOT EXISTS return_type text
    CHECK (return_type IS NULL OR return_type = ANY (ARRAY[
      'return_refund', 'refund_only', 'replacement'
    ]));

ALTER TABLE public.refund_return_periods
  ADD COLUMN IF NOT EXISTS resolution_path text
    CHECK (resolution_path IS NULL OR resolution_path = ANY (ARRAY[
      'instant', 'seller_review', 'return_required'
    ]));

-- Buyer submission details
ALTER TABLE public.refund_return_periods
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.refund_return_periods
  ADD COLUMN IF NOT EXISTS items_json jsonb;

ALTER TABLE public.refund_return_periods
  ADD COLUMN IF NOT EXISTS evidence_urls text[];

-- Seller action fields
ALTER TABLE public.refund_return_periods
  ADD COLUMN IF NOT EXISTS seller_note text;

ALTER TABLE public.refund_return_periods
  ADD COLUMN IF NOT EXISTS rejected_reason text;

ALTER TABLE public.refund_return_periods
  ADD COLUMN IF NOT EXISTS counter_offer_amount numeric
    CHECK (counter_offer_amount IS NULL OR counter_offer_amount >= 0);

ALTER TABLE public.refund_return_periods
  ADD COLUMN IF NOT EXISTS seller_deadline timestamp with time zone;

-- Resolution metadata
ALTER TABLE public.refund_return_periods
  ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone;

ALTER TABLE public.refund_return_periods
  ADD COLUMN IF NOT EXISTS resolved_by text;

ALTER TABLE public.refund_return_periods
  ADD COLUMN IF NOT EXISTS escalated_at timestamp with time zone;

-- Return-in-transit tracking
ALTER TABLE public.refund_return_periods
  ADD COLUMN IF NOT EXISTS return_tracking_number text;

ALTER TABLE public.refund_return_periods
  ADD COLUMN IF NOT EXISTS return_label_url text;

ALTER TABLE public.refund_return_periods
  ADD COLUMN IF NOT EXISTS buyer_shipped_at timestamp with time zone;

ALTER TABLE public.refund_return_periods
  ADD COLUMN IF NOT EXISTS return_received_at timestamp with time zone;

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill: migrate existing rows to the new status column so existing
-- records still display correctly after the migration.
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.refund_return_periods
SET status = CASE
  WHEN refund_date IS NOT NULL     THEN 'refunded'
  WHEN is_returnable = false       THEN 'rejected'
  ELSE                                  'pending'
END
WHERE status = 'pending';  -- only rows not yet set by INSERT
