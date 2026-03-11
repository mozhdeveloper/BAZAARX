-- ============================================================
-- Migration 015: Comments & Contributor System
-- ============================================================
-- Run 015_pre_check.sql first and verify all expected outputs
-- before applying this migration.
--
-- Tables created:
--   1. bazcoin_transactions   (new — did not exist before)
--   2. product_request_comments
--   3. comment_upvotes
--   4. contributor_tiers
--
-- RLS: Intentionally omitted — add in a follow-up migration.
-- ============================================================


-- ------------------------------------------------------------
-- 1. bazcoin_transactions
--    Central ledger for all BazCoin credits and debits.
--    Used by the award-bc edge function.
-- ------------------------------------------------------------
CREATE TABLE public.bazcoin_transactions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.profiles(id),
  amount         INTEGER     NOT NULL,          -- positive = credit, negative = debit
  balance_after  INTEGER     NOT NULL,          -- snapshot of buyers.bazcoins after this tx
  reason         TEXT        NOT NULL,          -- e.g. 'comment_sourcing', 'comment_qc', 'order_refund'
  reference_id   UUID,                          -- nullable: comment id, order id, etc.
  reference_type TEXT,                          -- 'product_request_comment' | 'order' | etc.
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bc_tx_user_id      ON public.bazcoin_transactions(user_id);
CREATE INDEX idx_bc_tx_reference_id ON public.bazcoin_transactions(reference_id);
CREATE INDEX idx_bc_tx_created_at   ON public.bazcoin_transactions(created_at DESC);


-- ------------------------------------------------------------
-- 2. product_request_comments
--    Comments attached to product requests.
--    Sourcing type is admin-only (is_admin_only = true).
-- ------------------------------------------------------------
CREATE TABLE public.product_request_comments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID        NOT NULL REFERENCES public.product_requests(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES public.profiles(id),
  type          TEXT        NOT NULL CHECK (type IN ('sourcing', 'qc', 'general')),
  content       TEXT        NOT NULL,
  is_admin_only BOOLEAN     NOT NULL DEFAULT false,  -- always true for type = 'sourcing'
  bc_awarded    INTEGER     NOT NULL DEFAULT 0,
  upvotes       INTEGER     NOT NULL DEFAULT 0,
  admin_upvotes INTEGER     NOT NULL DEFAULT 0,      -- Lab/Admin upvotes tracked separately
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prc_request_id ON public.product_request_comments(request_id);
CREATE INDEX idx_prc_user_id    ON public.product_request_comments(user_id);
CREATE INDEX idx_prc_type       ON public.product_request_comments(type);


-- ------------------------------------------------------------
-- 3. comment_upvotes
--    One row per user per comment.
--    Unique constraint enforces no duplicate upvotes at DB level.
-- ------------------------------------------------------------
CREATE TABLE public.comment_upvotes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID        NOT NULL REFERENCES public.product_request_comments(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_comment_upvotes UNIQUE (comment_id, user_id)
);

CREATE INDEX idx_cu_comment_id ON public.comment_upvotes(comment_id);
CREATE INDEX idx_cu_user_id    ON public.comment_upvotes(user_id);


-- ------------------------------------------------------------
-- 4. contributor_tiers
--    One row per user, upserted every time their upvote count
--    changes. Tier is based on the HIGHEST upvote count on a
--    single comment (not cumulative).
-- ------------------------------------------------------------
CREATE TABLE public.contributor_tiers (
  user_id       UUID        PRIMARY KEY REFERENCES public.profiles(id),
  tier          TEXT        NOT NULL DEFAULT 'none'
                            CHECK (tier IN ('none', 'bronze', 'silver', 'gold')),
  max_upvotes   INTEGER     NOT NULL DEFAULT 0,
  bc_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ------------------------------------------------------------
-- 5. Increment comments_count trigger on product_requests
--    product_requests.comments_count already has this column;
--    keep it in sync automatically.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_increment_request_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.product_requests
  SET    comments_count = comments_count + 1,
         updated_at     = now()
  WHERE  id = NEW.request_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_request_comments_count
AFTER INSERT ON public.product_request_comments
FOR EACH ROW EXECUTE FUNCTION public.fn_increment_request_comments_count();

-- Decrement on delete
CREATE OR REPLACE FUNCTION public.fn_decrement_request_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.product_requests
  SET    comments_count = GREATEST(comments_count - 1, 0),
         updated_at     = now()
  WHERE  id = OLD.request_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_decrement_request_comments_count
AFTER DELETE ON public.product_request_comments
FOR EACH ROW EXECUTE FUNCTION public.fn_decrement_request_comments_count();


-- ------------------------------------------------------------
-- 6. updated_at auto-refresh trigger for product_request_comments
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create this trigger if not already used by another table
-- (function is generic/reusable)
CREATE TRIGGER trg_prc_updated_at
BEFORE UPDATE ON public.product_request_comments
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


-- ============================================================
-- Verification queries — run after applying to confirm success
-- ============================================================

-- Should return 4 rows:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'bazcoin_transactions',
    'product_request_comments',
    'comment_upvotes',
    'contributor_tiers'
  )
ORDER BY table_name;

-- Should return all 9 indexes created above:
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'bazcoin_transactions',
    'product_request_comments',
    'comment_upvotes'
  )
ORDER BY tablename, indexname;
