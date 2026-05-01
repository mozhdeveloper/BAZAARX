-- ============================================================
-- EPIC 7 — Product Request System (BX-07-001 → BX-07-045)
--
-- Adds the missing tables, columns, RPCs, triggers, and RLS
-- required for the full lifecycle:
--   buyer creates request  → upvote / pledge / stake BazCoins
--   admin reviews          → approve / reject / hold / merge / link
--   sourcing workflow      → quoting / sampling / negotiating / verification
--   conversion to listing  → reward stakers, transfer demand
--
-- Idempotent: every CREATE uses IF NOT EXISTS / OR REPLACE.
-- Safe to run multiple times.
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- 1. EXTEND public.product_requests
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.product_requests
  ADD COLUMN IF NOT EXISTS title                   text,
  ADD COLUMN IF NOT EXISTS summary                 text,
  ADD COLUMN IF NOT EXISTS sourcing_stage          text,           -- quoting | sampling | negotiating | ready_for_verification
  ADD COLUMN IF NOT EXISTS demand_count            int             NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS staked_bazcoins         int             NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS linked_product_id       uuid            REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_hold_reason   text,
  ADD COLUMN IF NOT EXISTS merged_into_id          uuid            REFERENCES public.product_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_at            timestamptz,
  ADD COLUMN IF NOT EXISTS reward_amount           int             NOT NULL DEFAULT 50;

-- Backfill title/summary from legacy product_name/description so the new UI never sees nulls
UPDATE public.product_requests
   SET title   = COALESCE(title,   product_name),
       summary = COALESCE(summary, description)
 WHERE title IS NULL OR summary IS NULL;

-- Replace the old narrow status CHECK with the EPIC-7 status set.
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class       cl ON cl.oid = con.conrelid
      JOIN pg_namespace   ns ON ns.oid = cl.relnamespace
     WHERE ns.nspname = 'public'
       AND cl.relname = 'product_requests'
       AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.product_requests DROP CONSTRAINT %I', c);
  END LOOP;
END$$;

ALTER TABLE public.product_requests
  ADD CONSTRAINT product_requests_status_chk
  CHECK (status IN (
    'new', 'under_review', 'already_available', 'approved_for_sourcing',
    'rejected', 'on_hold', 'converted_to_listing',
    -- legacy values kept for backwards-compat with existing rows
    'pending', 'approved', 'in_progress'
  ));

-- Map the legacy "pending" → "new" so all new rows behave consistently
ALTER TABLE public.product_requests
  ALTER COLUMN status SET DEFAULT 'new';

CREATE INDEX IF NOT EXISTS idx_pr_status_demand
  ON public.product_requests (status, demand_count DESC, staked_bazcoins DESC);
CREATE INDEX IF NOT EXISTS idx_pr_linked_product
  ON public.product_requests (linked_product_id) WHERE linked_product_id IS NOT NULL;

-- ════════════════════════════════════════════════════════════
-- 2. NEW TABLE — request_attachments  (BX-07-001, BX-07-024)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.request_attachments (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id         uuid        NOT NULL REFERENCES public.product_requests(id) ON DELETE CASCADE,
  uploaded_by        uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_url           text        NOT NULL,
  file_type          text        NOT NULL,           -- image | video | document | link
  caption            text,
  is_supplier_link   boolean     NOT NULL DEFAULT false,  -- admin-only when true
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ra_request    ON public.request_attachments (request_id);
CREATE INDEX IF NOT EXISTS idx_ra_supplier   ON public.request_attachments (request_id) WHERE is_supplier_link = true;

-- ════════════════════════════════════════════════════════════
-- 3. NEW TABLE — request_supports  (BX-07-006, BX-07-007, BX-07-008)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.request_supports (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      uuid        NOT NULL REFERENCES public.product_requests(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  support_type    text        NOT NULL CHECK (support_type IN ('upvote', 'pledge', 'stake')),
  bazcoin_amount  int         NOT NULL DEFAULT 0 CHECK (bazcoin_amount >= 0),
  rewarded        boolean     NOT NULL DEFAULT false,   -- true once converted-to-listing reward paid
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- One upvote/pledge per user per request (multiple stakes allowed)
  CONSTRAINT request_supports_unique_vote UNIQUE (request_id, user_id, support_type)
);
CREATE INDEX IF NOT EXISTS idx_rs_request   ON public.request_supports (request_id);
CREATE INDEX IF NOT EXISTS idx_rs_user      ON public.request_supports (user_id);

-- ════════════════════════════════════════════════════════════
-- 4. NEW TABLE — supplier_offers  (BX-07-039, BX-07-041)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.supplier_offers (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    uuid        NOT NULL REFERENCES public.product_requests(id) ON DELETE CASCADE,
  supplier_id   uuid        NOT NULL REFERENCES public.sellers(id)         ON DELETE CASCADE,
  price         numeric(12,2) NOT NULL CHECK (price >= 0),
  moq           int         NOT NULL DEFAULT 1 CHECK (moq >= 1),
  lead_time_days int        NOT NULL DEFAULT 7 CHECK (lead_time_days >= 0),
  terms         text,
  quality_notes text,
  status        text        NOT NULL DEFAULT 'submitted'
                CHECK (status IN ('submitted', 'shortlisted', 'rejected', 'awarded')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_so_request  ON public.supplier_offers (request_id);
CREATE INDEX IF NOT EXISTS idx_so_supplier ON public.supplier_offers (supplier_id);

-- ════════════════════════════════════════════════════════════
-- 5. NEW TABLE — request_audit_logs  (BX-07-023, BX-07-036)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.request_audit_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid        NOT NULL REFERENCES public.product_requests(id) ON DELETE CASCADE,
  admin_id    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      text        NOT NULL,        -- approve | reject | merge | hold | resolve | link_product | stage_change | convert
  details     jsonb,                       -- arbitrary payload (reason, prev/new status, etc.)
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ral_request ON public.request_audit_logs (request_id, created_at DESC);

-- ════════════════════════════════════════════════════════════
-- 6. NEW TABLE — trust_artifacts  (BX-07-044, BX-07-045)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.trust_artifacts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  request_id  uuid        REFERENCES public.product_requests(id)  ON DELETE SET NULL,
  artifact_type text      NOT NULL CHECK (artifact_type IN ('report', 'test_video', 'true_spec_label', 'certificate')),
  url         text        NOT NULL,
  grade       text        CHECK (grade IN ('A', 'B', 'C')),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ta_product ON public.trust_artifacts (product_id);

-- ════════════════════════════════════════════════════════════
-- 7. RPC — support_product_request  (atomic upvote / pledge / stake)
--    Enforces unique-vote, BazCoin balance, and writes ledger.
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.support_product_request(
  p_request_id      uuid,
  p_support_type    text,
  p_bazcoin_amount  int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_balance  int;
  v_new_bal  int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_support_type NOT IN ('upvote', 'pledge', 'stake') THEN
    RAISE EXCEPTION 'Invalid support_type';
  END IF;

  IF p_support_type IN ('upvote', 'pledge') AND p_bazcoin_amount <> 0 THEN
    p_bazcoin_amount := 0;
  END IF;

  IF p_support_type = 'stake' AND p_bazcoin_amount <= 0 THEN
    RAISE EXCEPTION 'Stake amount must be positive';
  END IF;

  -- BazCoin debit (atomic)
  IF p_bazcoin_amount > 0 THEN
    SELECT COALESCE(bazcoins, 0) INTO v_balance
      FROM public.buyers WHERE id = v_user_id FOR UPDATE;

    IF v_balance < p_bazcoin_amount THEN
      RAISE EXCEPTION 'Insufficient BazCoin balance (have %, need %)', v_balance, p_bazcoin_amount;
    END IF;

    v_new_bal := v_balance - p_bazcoin_amount;

    UPDATE public.buyers SET bazcoins = v_new_bal, updated_at = now()
     WHERE id = v_user_id;

    INSERT INTO public.bazcoin_transactions (user_id, amount, balance_after, reason, reference_id, reference_type)
    VALUES (v_user_id, -p_bazcoin_amount, v_new_bal,
            'product_request_stake', p_request_id, 'product_request');
  END IF;

  -- BX-07-006: one upvote / one pledge per (user, request). Reject duplicates explicitly.
  IF p_support_type IN ('upvote', 'pledge') THEN
    IF EXISTS (
      SELECT 1 FROM public.request_supports
       WHERE request_id = p_request_id AND user_id = v_user_id AND support_type = p_support_type
    ) THEN
      RAISE EXCEPTION 'You already % this request',
        CASE WHEN p_support_type='upvote' THEN 'upvoted' ELSE 'pledged' END
        USING ERRCODE = '23505';
    END IF;
  END IF;

  -- Insert support row (stake additions handled via ON CONFLICT)
  INSERT INTO public.request_supports (request_id, user_id, support_type, bazcoin_amount)
  VALUES (p_request_id, v_user_id, p_support_type, p_bazcoin_amount)
  ON CONFLICT (request_id, user_id, support_type)
  DO UPDATE SET bazcoin_amount = public.request_supports.bazcoin_amount + EXCLUDED.bazcoin_amount;

  -- Recompute denormalised counters
  UPDATE public.product_requests pr SET
    demand_count    = (SELECT COUNT(DISTINCT user_id) FROM public.request_supports WHERE request_id = pr.id),
    staked_bazcoins = (SELECT COALESCE(SUM(bazcoin_amount), 0) FROM public.request_supports WHERE request_id = pr.id),
    votes           = (SELECT COUNT(*) FROM public.request_supports WHERE request_id = pr.id AND support_type IN ('upvote','pledge')),
    updated_at      = now()
   WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'support_type', p_support_type,
    'bazcoin_amount', p_bazcoin_amount,
    'new_balance', COALESCE(v_new_bal, v_balance)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.support_product_request(uuid, text, int) TO authenticated;

-- ════════════════════════════════════════════════════════════
-- 8. RPC — admin_action_product_request  (approve / reject / hold / merge / link)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_action_product_request(
  p_request_id   uuid,
  p_action       text,                                -- approve | reject | hold | merge | link_product | stage_change | resolve
  p_reason       text DEFAULT NULL,
  p_target_id    uuid DEFAULT NULL,                   -- product_id (link) or request_id (merge)
  p_new_stage    text DEFAULT NULL                    -- when action=stage_change
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
  v_prev     record;
  v_new_status text;
BEGIN
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.admins WHERE id = v_admin_id) INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  SELECT * INTO v_prev FROM public.product_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF p_action IN ('reject', 'hold') AND (p_reason IS NULL OR LENGTH(TRIM(p_reason)) = 0) THEN
    RAISE EXCEPTION 'Reason required for % action', p_action;
  END IF;

  CASE p_action
    WHEN 'approve' THEN
      v_new_status := 'approved_for_sourcing';
      UPDATE public.product_requests
         SET status = v_new_status, sourcing_stage = 'quoting', updated_at = now()
       WHERE id = p_request_id;

    WHEN 'reject' THEN
      v_new_status := 'rejected';
      UPDATE public.product_requests
         SET status = v_new_status, rejection_hold_reason = p_reason, updated_at = now()
       WHERE id = p_request_id;

    WHEN 'hold' THEN
      v_new_status := 'on_hold';
      UPDATE public.product_requests
         SET status = v_new_status, rejection_hold_reason = p_reason, updated_at = now()
       WHERE id = p_request_id;

    WHEN 'resolve' THEN
      -- Used to clear hold and put back under review
      v_new_status := 'under_review';
      UPDATE public.product_requests
         SET status = v_new_status, rejection_hold_reason = NULL, updated_at = now()
       WHERE id = p_request_id;

    WHEN 'merge' THEN
      IF p_target_id IS NULL THEN RAISE EXCEPTION 'p_target_id required for merge'; END IF;
      v_new_status := 'rejected';   -- this row is closed; signals frontend to redirect
      UPDATE public.product_requests
         SET status = 'rejected', merged_into_id = p_target_id, rejection_hold_reason = COALESCE(p_reason, 'Merged duplicate'), updated_at = now()
       WHERE id = p_request_id;
      -- Move all supports to the canonical request (manual upsert — ON CONFLICT only works on INSERT)
      -- Step 1: add bazcoin_amount into existing target rows where user already supported the target
      UPDATE public.request_supports AS tgt
         SET bazcoin_amount = tgt.bazcoin_amount + src.bazcoin_amount
        FROM public.request_supports AS src
       WHERE src.request_id   = p_request_id
         AND tgt.request_id   = p_target_id
         AND tgt.user_id      = src.user_id
         AND tgt.support_type = src.support_type;
      -- Step 2: remove the now-merged source rows to avoid UNIQUE violation in step 3
      DELETE FROM public.request_supports
       WHERE request_id = p_request_id
         AND (user_id, support_type) IN (
               SELECT user_id, support_type
                 FROM public.request_supports
                WHERE request_id = p_target_id
             );
      -- Step 3: move remaining (non-duplicate) rows to the target request
      UPDATE public.request_supports SET request_id = p_target_id WHERE request_id = p_request_id;
      -- Recompute target counters
      UPDATE public.product_requests pr SET
        demand_count    = (SELECT COUNT(DISTINCT user_id) FROM public.request_supports WHERE request_id = pr.id),
        staked_bazcoins = (SELECT COALESCE(SUM(bazcoin_amount), 0) FROM public.request_supports WHERE request_id = pr.id),
        votes           = (SELECT COUNT(*) FROM public.request_supports WHERE request_id = pr.id AND support_type IN ('upvote','pledge'))
       WHERE id = p_target_id;

    WHEN 'link_product' THEN
      IF p_target_id IS NULL THEN RAISE EXCEPTION 'p_target_id required for link_product'; END IF;
      v_new_status := 'already_available';
      UPDATE public.product_requests
         SET status = v_new_status, linked_product_id = p_target_id, updated_at = now()
       WHERE id = p_request_id;

    WHEN 'stage_change' THEN
      IF p_new_stage IS NULL THEN RAISE EXCEPTION 'p_new_stage required'; END IF;
      v_new_status := v_prev.status;
      UPDATE public.product_requests
         SET sourcing_stage = p_new_stage, updated_at = now()
       WHERE id = p_request_id;

    ELSE
      RAISE EXCEPTION 'Unknown action: %', p_action;
  END CASE;

  -- Audit log (BX-07-023)
  INSERT INTO public.request_audit_logs (request_id, admin_id, action, details)
  VALUES (p_request_id, v_admin_id, p_action,
    jsonb_build_object(
      'reason',       p_reason,
      'target_id',    p_target_id,
      'prev_status',  v_prev.status,
      'new_status',   v_new_status,
      'new_stage',    p_new_stage
    ));

  RETURN jsonb_build_object('success', true, 'new_status', v_new_status);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_action_product_request(uuid, text, text, uuid, text) TO authenticated;

-- ════════════════════════════════════════════════════════════
-- 9. RPC — convert_request_to_listing  (BX-07-011, BX-07-016, BX-07-022, BX-07-027)
--    Pays out rewards to all stakers and supporters in one transaction.
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.convert_request_to_listing(
  p_request_id  uuid,
  p_product_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id   uuid := auth.uid();
  v_is_admin   boolean;
  v_req        record;
  v_supporter  record;
  v_payout     int;
  v_new_bal    int;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.admins WHERE id = v_admin_id) INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Admin role required'; END IF;

  SELECT * INTO v_req FROM public.product_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_req.status = 'converted_to_listing' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Already converted');
  END IF;

  -- Mark request converted
  UPDATE public.product_requests
     SET status = 'converted_to_listing',
         linked_product_id = p_product_id,
         converted_at = now(),
         updated_at = now()
   WHERE id = p_request_id;

  -- Reward each unique supporter once (creator + stakers)
  FOR v_supporter IN
    SELECT user_id,
           SUM(bazcoin_amount)::int AS total_staked,
           bool_or(support_type = 'stake') AS is_staker
      FROM public.request_supports
     WHERE request_id = p_request_id AND rewarded = false
     GROUP BY user_id
  LOOP
    -- Reward = base reward + bonus for stakers proportional to stake (capped 5x reward)
    v_payout := v_req.reward_amount
              + LEAST(v_supporter.total_staked * 2, v_req.reward_amount * 5);

    SELECT COALESCE(bazcoins, 0) + v_payout INTO v_new_bal
      FROM public.buyers WHERE id = v_supporter.user_id FOR UPDATE;

    UPDATE public.buyers SET bazcoins = v_new_bal, updated_at = now()
     WHERE id = v_supporter.user_id;

    INSERT INTO public.bazcoin_transactions (user_id, amount, balance_after, reason, reference_id, reference_type)
    VALUES (v_supporter.user_id, v_payout, v_new_bal,
            'product_request_reward', p_request_id, 'product_request');

    -- Also notify supporter
    INSERT INTO public.buyer_notifications (buyer_id, type, title, message, action_url, action_data, priority)
    VALUES (v_supporter.user_id, 'product_request_listed',
            '🎉 Your requested product is live!',
            'Your support paid off — earn ' || v_payout || ' BazCoins',
            '/product/' || p_product_id::text,
            jsonb_build_object('product_id', p_product_id, 'request_id', p_request_id, 'reward', v_payout),
            'high');
  END LOOP;

  -- Mark all supports as rewarded so we don't pay twice
  UPDATE public.request_supports SET rewarded = true WHERE request_id = p_request_id;

  -- Audit log
  INSERT INTO public.request_audit_logs (request_id, admin_id, action, details)
  VALUES (p_request_id, v_admin_id, 'convert',
    jsonb_build_object('product_id', p_product_id));

  RETURN jsonb_build_object('success', true, 'product_id', p_product_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.convert_request_to_listing(uuid, uuid) TO authenticated;

-- ════════════════════════════════════════════════════════════
-- 10. TRIGGER — notify creator on status change (BX-07-009, 017, 019)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public._notify_product_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title   text;
  v_msg     text;
  v_url     text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.requested_by_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_url := '/requests/' || NEW.id::text;

  CASE NEW.status
    WHEN 'under_review'           THEN v_title := '👀 Your request is under review';
                                       v_msg := COALESCE(NEW.title, NEW.product_name) || ' is now being evaluated.';
    WHEN 'approved_for_sourcing'  THEN v_title := '✅ Approved for sourcing';
                                       v_msg := 'We are now finding suppliers for ' || COALESCE(NEW.title, NEW.product_name) || '.';
    WHEN 'already_available'      THEN v_title := '🛒 Good news — already available!';
                                       v_msg := 'We found a matching product for your request.';
                                       v_url := CASE WHEN NEW.linked_product_id IS NOT NULL
                                                     THEN '/product/' || NEW.linked_product_id::text
                                                     ELSE v_url END;
    WHEN 'on_hold'                THEN v_title := '⏸ Your request is on hold';
                                       v_msg := COALESCE(NEW.rejection_hold_reason, 'Awaiting more information.');
    WHEN 'rejected'               THEN v_title := '❌ Request not accepted';
                                       v_msg := COALESCE(NEW.rejection_hold_reason, 'Thanks for your suggestion.');
    WHEN 'converted_to_listing'   THEN v_title := '🎉 Your request is now a real product!';
                                       v_msg := COALESCE(NEW.title, NEW.product_name) || ' has been listed in BazaarX.';
                                       v_url := CASE WHEN NEW.linked_product_id IS NOT NULL
                                                     THEN '/product/' || NEW.linked_product_id::text
                                                     ELSE v_url END;
    ELSE RETURN NEW;
  END CASE;

  INSERT INTO public.buyer_notifications (
    buyer_id, type, title, message, action_url, action_data, priority
  ) VALUES (
    NEW.requested_by_id, 'product_request_' || NEW.status,
    v_title, v_msg, v_url,
    jsonb_build_object('request_id', NEW.id, 'status', NEW.status, 'linked_product_id', NEW.linked_product_id),
    CASE WHEN NEW.status IN ('approved_for_sourcing', 'converted_to_listing', 'already_available')
         THEN 'high' ELSE 'normal' END
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pr_status_notification ON public.product_requests;
CREATE TRIGGER trg_pr_status_notification
  AFTER UPDATE OF status ON public.product_requests
  FOR EACH ROW EXECUTE FUNCTION public._notify_product_request_status();

-- ════════════════════════════════════════════════════════════
-- 11. ROW-LEVEL SECURITY
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.request_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_supports    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_offers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_audit_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_artifacts     ENABLE ROW LEVEL SECURITY;

-- request_attachments — public read (except supplier links), authenticated insert
DROP POLICY IF EXISTS ra_select ON public.request_attachments;
CREATE POLICY ra_select ON public.request_attachments FOR SELECT
  USING (
    is_supplier_link = false
    OR EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  );
DROP POLICY IF EXISTS ra_insert ON public.request_attachments;
CREATE POLICY ra_insert ON public.request_attachments FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);
DROP POLICY IF EXISTS ra_delete ON public.request_attachments;
CREATE POLICY ra_delete ON public.request_attachments FOR DELETE
  USING (uploaded_by = auth.uid() OR EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- request_supports — anyone can read aggregated counts (for demand visibility)
DROP POLICY IF EXISTS rs_select ON public.request_supports;
CREATE POLICY rs_select ON public.request_supports FOR SELECT USING (true);
-- Inserts go through RPC (security definer); no direct insert policy

-- supplier_offers — supplier writes their own, admins read all, request creator reads aggregated
DROP POLICY IF EXISTS so_select ON public.supplier_offers;
CREATE POLICY so_select ON public.supplier_offers FOR SELECT
  USING (
    supplier_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  );
DROP POLICY IF EXISTS so_insert ON public.supplier_offers;
CREATE POLICY so_insert ON public.supplier_offers FOR INSERT
  WITH CHECK (supplier_id = auth.uid() AND EXISTS (SELECT 1 FROM public.sellers WHERE id = auth.uid()));
DROP POLICY IF EXISTS so_update ON public.supplier_offers;
CREATE POLICY so_update ON public.supplier_offers FOR UPDATE
  USING (supplier_id = auth.uid() OR EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- request_audit_logs — admin-only
DROP POLICY IF EXISTS ral_select ON public.request_audit_logs;
CREATE POLICY ral_select ON public.request_audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- trust_artifacts — public read
DROP POLICY IF EXISTS ta_select ON public.trust_artifacts;
CREATE POLICY ta_select ON public.trust_artifacts FOR SELECT USING (true);
DROP POLICY IF EXISTS ta_admin ON public.trust_artifacts;
CREATE POLICY ta_admin ON public.trust_artifacts FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- ════════════════════════════════════════════════════════════
-- 12. REALTIME — broadcast supplier_offers + request_audit_logs so admin UI updates live
-- ════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.supplier_offers;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.request_supports;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.product_requests;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END$$;

-- ════════════════════════════════════════════════════════════
-- ✓ EPIC 7 migration complete
-- ════════════════════════════════════════════════════════════
