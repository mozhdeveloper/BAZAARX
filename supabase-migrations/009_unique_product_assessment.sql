-- Migration: Add unique constraint on product_assessments.product_id
-- This prevents duplicate QA assessments per product and ensures .maybeSingle()/.single()
-- calls succeed when looking up an assessment by product_id.
--
-- Background:
--   Previously, product_assessments had no unique constraint on product_id.
--   This could lead to duplicate rows, causing PostgREST .single() calls to return 406.
--   The application code has been updated to use .maybeSingle() + .order().limit(1)
--   as a safe fallback, but adding this constraint enforces correctness at the DB level.
--
-- NOTE: If duplicate rows exist, this migration will fail.
--   Run the dedup step first, or handle manually before applying.

-- Step 1: Remove duplicate assessments (keep the most recent per product_id)
-- Safe to run even if no duplicates exist.
DELETE FROM public.product_assessments
WHERE id NOT IN (
  SELECT DISTINCT ON (product_id) id
  FROM public.product_assessments
  ORDER BY product_id, created_at DESC
);

-- Step 2: Add unique constraint
ALTER TABLE public.product_assessments
  ADD CONSTRAINT unique_product_assessment UNIQUE (product_id);

-- Verify
-- SELECT COUNT(*), product_id FROM product_assessments GROUP BY product_id HAVING COUNT(*) > 1;
