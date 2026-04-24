-- =====================================================================
-- Migration 048: Drop confirmed-dead tables + clarify look-alike pairs
-- =====================================================================
-- Strict honest audit verdict (DB_DUPLICATE_AUDIT_REPORT.md, revised after
-- real COUNT(*) verification â€” pg_class.reltuples=-1 was unreliable):
--
-- DROP (verified 0 real rows AND no app code writers):
--   * order_promos                    : 0 rows. Only present in generated types.
--   * qa_assessment_forms             : 0 rows. Un-shipped 23-column inspection-form spec.
--   * qa_assessment_form_evidence     : 0 rows. FK depends on qa_assessment_forms.
--
-- KEEP (verified in active use, despite low row counts):
--   * product_rejections (0)          : qaService.ts in web + mobile inserts on reject.
--   * qa_submission_batch_items (2)   : in use, real rows.
--   * qa_submission_batches (3)       : in use, real rows.
--   * qa_review_logs (10)             : in use.
--   * qa_team_members (1)             : in use.
--
-- Bank "duplication" was already resolved in migration 040.
-- seller_payout_settings is canonical; seller_payout_accounts is a view.
-- =====================================================================

BEGIN;

-- 048a: Defensive guard â€” refuse if anyone slipped data in since audit.
DO $$
DECLARE
  v_count bigint;
BEGIN
  SELECT count(*) INTO v_count FROM public.order_promos;
  IF v_count > 0 THEN RAISE EXCEPTION '048: order_promos has % rows, abort', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.qa_assessment_forms;
  IF v_count > 0 THEN RAISE EXCEPTION '048: qa_assessment_forms has % rows, abort', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.qa_assessment_form_evidence;
  IF v_count > 0 THEN RAISE EXCEPTION '048: qa_assessment_form_evidence has % rows, abort', v_count; END IF;
END$$;

-- 048b: Drop dead tables (CASCADE handles FK from qa_assessment_form_evidence â†’ qa_assessment_forms).
DROP TABLE IF EXISTS public.qa_assessment_form_evidence;
DROP TABLE IF EXISTS public.qa_assessment_forms;
DROP TABLE IF EXISTS public.order_promos;

-- 048c: Add COMMENTs to look-alike tables so future audits self-document.
COMMENT ON TABLE public.discount_campaigns IS
  'Seller PRICE-DISCOUNT campaigns (discount_value, badge, min_purchase_amount). Distinct from marketing_campaigns (email/SMS blasts). Do NOT merge.';

COMMENT ON TABLE public.marketing_campaigns IS
  'Email/SMS MARKETING blasts to buyer_segments (segment_id, template_id, total_opened/clicked). Distinct from discount_campaigns (price reductions). Do NOT merge.';

COMMENT ON TABLE public.order_events IS
  'Drives chat-message generation from order state changes (has conversation_id, message_generated). Distinct from order_status_history (full audit timeline) and delivery_tracking_events (courier scans). All three required.';

COMMENT ON TABLE public.delivery_tracking_events IS
  'Courier-side tracking scans (delivery_booking_id, courier_status_code). Distinct from order_status_history (order-side admin/seller actions).';

COMMENT ON TABLE public.contributor_tiers IS
  'Gamification tiers for product_request comment upvoting (bc_multiplier). Distinct from seller_tiers (QA bypass) and buyer_segments (marketing audience).';

COMMENT ON TABLE public.product_rejections IS
  'Per-assessment rejection record. Currently 0 rows (no products rejected yet) but actively written by qaService in web and mobile when admin rejects. Do NOT drop.';

-- 048d: Post-check â€” tables actually gone.
DO $$
DECLARE
  v_remaining text[];
BEGIN
  SELECT array_agg(table_name) INTO v_remaining
  FROM information_schema.tables
  WHERE table_schema='public'
    AND table_name IN ('order_promos','qa_assessment_forms','qa_assessment_form_evidence');

  IF v_remaining IS NOT NULL THEN
    RAISE EXCEPTION '048: drop incomplete, still present: %', v_remaining;
  END IF;

  RAISE NOTICE '048: dropped 3 dead tables + added 6 documentation comments OK';
END$$;

COMMIT;
