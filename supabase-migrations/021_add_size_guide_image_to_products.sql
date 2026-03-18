-- Add size_guide_image column to products table for apparel size guides

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS size_guide_image TEXT;

-- Create comment for documentation
COMMENT ON COLUMN public.products.size_guide_image IS 'URL to the size guide image for apparel products';
