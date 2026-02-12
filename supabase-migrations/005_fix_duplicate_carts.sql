-- Migration: Fix Duplicate Carts and Add Unique Constraint
-- Date: February 12, 2026
-- Purpose: Clean up duplicate carts and prevent future duplicates
-- SAFETY: This migration is SAFE - it only removes duplicate empty carts

BEGIN;

-- Step 0: Report what will be affected (informational only)
DO $$ 
DECLARE
  duplicate_count INTEGER;
  buyer_count INTEGER;
BEGIN
  -- Count duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT buyer_id, COUNT(*) as cart_count
    FROM public.carts
    WHERE buyer_id IS NOT NULL
    GROUP BY buyer_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE '⚠️  Found % buyer(s) with duplicate carts', duplicate_count;
  ELSE
    RAISE NOTICE '✅ No duplicate carts found';
  END IF;
END $$;

-- Step 1: SAFELY merge cart items from duplicate carts to the newest cart
-- Before deleting old carts, move any cart_items to the newest cart
WITH ranked_carts AS (
  SELECT 
    id,
    buyer_id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY buyer_id ORDER BY created_at DESC) as rn
  FROM public.carts
  WHERE buyer_id IS NOT NULL
),
newest_carts AS (
  SELECT id, buyer_id FROM ranked_carts WHERE rn = 1
),
old_carts AS (
  SELECT id, buyer_id FROM ranked_carts WHERE rn > 1
)
-- Update cart_items to point to the newest cart
UPDATE public.cart_items
SET cart_id = newest_carts.id
FROM old_carts
JOIN newest_carts ON old_carts.buyer_id = newest_carts.buyer_id
WHERE public.cart_items.cart_id = old_carts.id;

-- Step 2: Now safely delete the old empty duplicate carts
-- These carts have no items anymore (moved to the newest cart above)
WITH ranked_carts AS (
  SELECT 
    id,
    buyer_id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY buyer_id ORDER BY created_at DESC) as rn
  FROM public.carts
  WHERE buyer_id IS NOT NULL
),
duplicates_to_delete AS (
  SELECT id 
  FROM ranked_carts 
  WHERE rn > 1
)
DELETE FROM public.carts
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Step 3: Add unique constraint on buyer_id to prevent future duplicate carts
-- This ensures each buyer can only have one cart going forward
ALTER TABLE public.carts
DROP CONSTRAINT IF EXISTS carts_buyer_id_unique;

ALTER TABLE public.carts
ADD CONSTRAINT carts_buyer_id_unique UNIQUE (buyer_id);

-- Step 4: Create an index for faster cart lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_carts_buyer_id ON public.carts(buyer_id);

-- Step 5: Verify the fix
DO $$ 
DECLARE
  remaining_duplicates INTEGER;
  total_carts INTEGER;
BEGIN
  -- Count remaining duplicates (should be 0)
  SELECT COUNT(*) INTO remaining_duplicates
  FROM (
    SELECT buyer_id, COUNT(*) as cart_count
    FROM public.carts
    WHERE buyer_id IS NOT NULL
    GROUP BY buyer_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  SELECT COUNT(*) INTO total_carts FROM public.carts;
  
  RAISE NOTICE '📊 Migration complete:';
  RAISE NOTICE '   Total carts: %', total_carts;
  RAISE NOTICE '   Remaining duplicates: %', remaining_duplicates;
  
  IF remaining_duplicates = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All duplicate carts cleaned up!';
  ELSE
    RAISE WARNING '⚠️  Still have % duplicate(s) - may need manual review', remaining_duplicates;
  END IF;
END $$;

COMMIT;

-- Note: The constraint will prevent duplicate cart creation going forward
-- The mobile app's getCart() function now also handles duplicates gracefully
-- All cart items have been preserved by moving them to the newest cart
