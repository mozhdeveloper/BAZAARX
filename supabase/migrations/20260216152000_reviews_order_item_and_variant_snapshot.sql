-- ============================================================================
-- Migration: Link reviews to purchased order items + immutable variant snapshot
-- Description:
--   1) Add reviews.order_item_id (FK -> order_items.id)
--   2) Add reviews.variant_snapshot (immutable JSONB purchase context)
--   3) Backfill order_item_id/variant_snapshot where match is unambiguous
--   4) Move uniqueness from order-level product to order-item level
-- ============================================================================

ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS order_item_id uuid NULL;

ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS variant_snapshot jsonb NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reviews_order_item_id_fkey'
  ) THEN
    ALTER TABLE public.reviews
    ADD CONSTRAINT reviews_order_item_id_fkey
    FOREIGN KEY (order_item_id)
    REFERENCES public.order_items(id)
    ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reviews_variant_snapshot_object_check'
  ) THEN
    ALTER TABLE public.reviews
    ADD CONSTRAINT reviews_variant_snapshot_object_check
    CHECK (
      variant_snapshot IS NULL
      OR jsonb_typeof(variant_snapshot) = 'object'
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reviews_order_item_id
ON public.reviews (order_item_id);

-- --------------------------------------------------------------------------
-- Backfill order_item_id when the order/product match is unambiguous
-- --------------------------------------------------------------------------

WITH matched AS (
  SELECT
    r.id AS review_id,
    oi.id AS order_item_id,
    row_number() OVER (
      PARTITION BY r.id
      ORDER BY oi.created_at DESC, oi.id DESC
    ) AS row_num,
    count(*) OVER (PARTITION BY r.id) AS candidate_count
  FROM public.reviews r
  JOIN public.order_items oi
    ON oi.order_id = r.order_id
   AND oi.product_id = r.product_id
  WHERE r.order_item_id IS NULL
    AND r.order_id IS NOT NULL
    AND r.product_id IS NOT NULL
)
UPDATE public.reviews r
SET order_item_id = m.order_item_id
FROM matched m
WHERE r.id = m.review_id
  AND m.row_num = 1
  AND m.candidate_count = 1;

-- --------------------------------------------------------------------------
-- Backfill variant_snapshot from linked order_item + variant/product labels
-- --------------------------------------------------------------------------

UPDATE public.reviews r
SET variant_snapshot = jsonb_strip_nulls(
  jsonb_build_object(
    'order_item_id', oi.id,
    'product_id', oi.product_id,
    'product_name', oi.product_name,
    'variant_id', oi.variant_id,
    'variant_name', pv.variant_name,
    'sku', pv.sku,
    'option_1_label', p.variant_label_1,
    'option_1_value', COALESCE(pv.option_1_value, pv.size),
    'option_2_label', p.variant_label_2,
    'option_2_value', COALESCE(pv.option_2_value, pv.color),
    'display', NULLIF(
      concat_ws(
        ' / ',
        NULLIF(pv.variant_name, ''),
        CASE
          WHEN COALESCE(pv.option_1_value, pv.size) IS NOT NULL AND p.variant_label_1 IS NOT NULL
            THEN p.variant_label_1 || ': ' || COALESCE(pv.option_1_value, pv.size)
          ELSE COALESCE(pv.option_1_value, pv.size)
        END,
        CASE
          WHEN COALESCE(pv.option_2_value, pv.color) IS NOT NULL AND p.variant_label_2 IS NOT NULL
            THEN p.variant_label_2 || ': ' || COALESCE(pv.option_2_value, pv.color)
          ELSE COALESCE(pv.option_2_value, pv.color)
        END
      ),
      ''
    )
  )
)
FROM public.order_items oi
LEFT JOIN public.product_variants pv
  ON pv.id = oi.variant_id
LEFT JOIN public.products p
  ON p.id = oi.product_id
WHERE r.order_item_id = oi.id
  AND (r.variant_snapshot IS NULL OR r.variant_snapshot = '{}'::jsonb);

-- --------------------------------------------------------------------------
-- Deduplicate before enforcing new uniqueness constraints
-- --------------------------------------------------------------------------

WITH ranked_item_reviews AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY buyer_id, order_item_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.reviews
  WHERE order_item_id IS NOT NULL
)
DELETE FROM public.reviews r
USING ranked_item_reviews rir
WHERE r.id = rir.id
  AND rir.rn > 1;

WITH ranked_legacy_reviews AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY order_id, buyer_id, product_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.reviews
  WHERE order_item_id IS NULL
    AND order_id IS NOT NULL
)
DELETE FROM public.reviews r
USING ranked_legacy_reviews rlr
WHERE r.id = rlr.id
  AND rlr.rn > 1;

DROP INDEX IF EXISTS public.reviews_uq_order_buyer_product;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_uq_buyer_order_item
ON public.reviews (buyer_id, order_item_id)
WHERE order_item_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_uq_order_buyer_product_legacy
ON public.reviews (order_id, buyer_id, product_id)
WHERE order_item_id IS NULL
  AND order_id IS NOT NULL;
