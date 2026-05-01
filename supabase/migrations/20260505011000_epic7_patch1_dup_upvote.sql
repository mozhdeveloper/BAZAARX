-- ───────────────────────────────────────────────────────────────────────────
-- EPIC 7 — Patch 1 — Fix duplicate-upvote handling in support_product_request
-- Apply BEFORE re-running scripts/test-epic7-product-requests.mjs
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.support_product_request(
  p_request_id      uuid,
  p_support_type    text,                              -- 'upvote' | 'pledge' | 'stake'
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
