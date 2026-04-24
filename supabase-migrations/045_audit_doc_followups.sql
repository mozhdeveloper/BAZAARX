-- ============================================================================
-- Migration 045: Audit-doc follow-ups (final cleanup)
-- ----------------------------------------------------------------------------
-- After live verification of every claim in DEV_FIX_LIST.md / DATABASE_ARCHITECTURE_AUDIT.md,
-- almost all claims were found to be already-fixed (silently resolved by 040–044). Live truth:
--
--   FIX-001 order_shipments.seller_id           : already uuid          (DONE)
--   FIX-002 seller_notifications.seller_id      : already NOT NULL      (DONE)
--   FIX-003 refund_return_periods.resolved_by   : already uuid          (DONE)
--   FIX-004 9 nullable timestamps               : 8 of 9 already NOT NULL  (this migration handles the last one)
--   FIX-005 seller_payout_accounts duplicate    : converted to VIEW in 040 (DONE)
--   FIX-006 admin_action_log duplicate          : converted to VIEW in 040 (DONE)
--   FIX-007 order_payments vs payment_transactions: clarified in 043c+043d (DONE)
--
-- And the pairs the audit doc *suspected* of being duplicates were verified
-- to be COMPLEMENTARY by design (same lesson learned with notifications/payments):
--
--   consent_log (append-only event audit)        + user_consent (current state snapshot)
--   seller_verification_documents (canonical)    + *_drafts (work-in-progress)
--   buyer_/seller_/admin_notifications           (deliberate per-role split, see 044)
--   delivery_bookings (3PL booking)              + order_shipments (canonical shipment line, see 043e)
--   order_payments (per-order receipt)           + payment_transactions (gateway events, see 043c)
--
-- This migration does the remaining tiny cleanup and adds COMMENT ON TABLE
-- documentation so future audits don't re-flag complementary pairs as duplicates.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) FIX-004 final leftover: user_presence.updated_at
-- ----------------------------------------------------------------------------
-- Live audit: 16 rows total, 0 NULL — safe to enforce NOT NULL with default.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'user_presence'
      AND column_name  = 'updated_at'
      AND is_nullable  = 'YES'
  ) THEN
    -- Defensive backfill in case any NULL rows arrive between audit and apply.
    UPDATE public.user_presence
       SET updated_at = COALESCE(updated_at, now())
     WHERE updated_at IS NULL;

    ALTER TABLE public.user_presence
      ALTER COLUMN updated_at SET DEFAULT now(),
      ALTER COLUMN updated_at SET NOT NULL;

    RAISE NOTICE 'FIX-004 leftover: user_presence.updated_at now NOT NULL DEFAULT now()';
  ELSE
    RAISE NOTICE 'FIX-004 leftover: user_presence.updated_at already NOT NULL — skipping';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2) Document deliberate complementary-table designs
--    (Prevents future audits from re-flagging these as "duplicates".)
-- ----------------------------------------------------------------------------

-- Consent: event log + state snapshot (PH Data Privacy Act requirement)
COMMENT ON TABLE public.consent_log IS
  'Append-only audit trail of consent grant/revoke events. Required for PH Data Privacy Act (RA 10173) compliance — proves WHEN a user changed consent and from WHERE (ip_address, user_agent). Complementary to user_consent which holds the CURRENT state per (user_id, channel). Never UPDATE or DELETE rows here.';

COMMENT ON TABLE public.user_consent IS
  'Current consent state per (user_id, channel) — answers "is this user opted-in right now?". Updated when user changes consent; old state is preserved as a new row in consent_log. Complementary to consent_log (event audit trail).';

-- Seller verification: canonical + drafts (lets sellers stage uploads before submission)
COMMENT ON TABLE public.seller_verification_documents IS
  'Canonical/submitted seller verification documents shown to admins for KYC review. Complementary to seller_verification_document_drafts (work-in-progress uploads not yet submitted for review).';

COMMENT ON TABLE public.seller_verification_document_drafts IS
  'Work-in-progress KYC documents the seller is still preparing/replacing. Promoted to seller_verification_documents on submission. Complementary to the canonical table — do NOT merge; this enables "save without submitting" UX.';

-- Re-affirm earlier complementary pairs (idempotent — these were also commented in earlier migrations)
COMMENT ON TABLE public.delivery_bookings IS
  '3PL courier booking record (J&T, Lalamove, etc.) created when seller books a courier pickup. Complementary to order_shipments (the canonical per-(order, seller) shipment line created at checkout). Linked by (order_id, seller_id).';

COMMENT ON TABLE public.order_shipments IS
  'Canonical per-(order, seller) shipment line created at checkout from the buyer''s shipping breakdown. Complementary to delivery_bookings (the optional 3PL booking record added when a courier is engaged).';

-- ----------------------------------------------------------------------------
-- 3) Verification block — proves the migration achieved its goals
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_up_nullable text;
BEGIN
  SELECT is_nullable INTO v_up_nullable
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='user_presence' AND column_name='updated_at';

  IF v_up_nullable <> 'NO' THEN
    RAISE EXCEPTION 'POST-CHECK FAILED: user_presence.updated_at is still nullable (%).', v_up_nullable;
  END IF;

  RAISE NOTICE 'Migration 045 verified: user_presence.updated_at is NOT NULL; complementary-pair COMMENTs applied.';
END $$;

COMMIT;
