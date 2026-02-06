-- Add missing seller_id column to products table
-- This is essential for the seller flow to work properly

-- Add seller_id to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);

-- Add created_by to product_assessments (for QA tracking)
ALTER TABLE public.product_assessments
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

ALTER TABLE public.product_assessments
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

ALTER TABLE public.product_assessments
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Comment
COMMENT ON COLUMN public.products.seller_id IS 'The seller who owns this product';
COMMENT ON COLUMN public.product_assessments.created_by IS 'The user who created this assessment';
COMMENT ON COLUMN public.product_assessments.assigned_to IS 'The QA user assigned to this assessment';
