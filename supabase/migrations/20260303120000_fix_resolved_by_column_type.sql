-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Fix resolved_by column type in refund_return_periods
--
-- The resolved_by column already existed as uuid with a foreign key.
-- The v2 returnService.ts stores role strings ('seller', 'buyer', 'system')
-- instead of UUIDs, so we drop the FK constraint and change to text.
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop the foreign key constraint that prevents the type change
ALTER TABLE public.refund_return_periods
  DROP CONSTRAINT IF EXISTS refund_return_periods_resolved_by_fkey;

-- Change column from uuid to text so role strings can be stored
ALTER TABLE public.refund_return_periods
  ALTER COLUMN resolved_by TYPE text USING resolved_by::text;
