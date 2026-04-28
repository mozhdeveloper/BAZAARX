-- Migration: Add 'draft' and 'disabled' values to products.approval_status
-- Purpose: Support Save as Draft workflow and explicit Disabled status for products
-- Related UAT: BX-03-006 #4 (status enum coverage), BX-03-006 #7 (Disabled status), BX-03-006 #8 (Draft status)
--
-- Current CHECK constraint (from 009_qa_team_separation.sql):
--   CHECK (approval_status = ANY (ARRAY['pending','accepted','approved','rejected','reclassified']))
-- New constraint adds: 'draft', 'disabled'

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_approval_status_check;

-- Step 2: Add the updated CHECK constraint with 'draft' and 'disabled'
ALTER TABLE public.products ADD CONSTRAINT products_approval_status_check
  CHECK (approval_status = ANY (ARRAY[
    'pending'::text,
    'accepted'::text,
    'approved'::text,
    'rejected'::text,
    'reclassified'::text,
    'draft'::text,
    'disabled'::text
  ]));

-- Step 3: Index for efficient draft filtering in seller dashboard
CREATE INDEX IF NOT EXISTS idx_products_approval_status_draft
  ON products(seller_id)
  WHERE approval_status = 'draft';

COMMENT ON INDEX idx_products_approval_status_draft IS
  'Optimizes seller dashboard draft product queries';
