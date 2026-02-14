-- ============================================================================
-- Migration 009: Visual Search Function
-- Date: 2026-02-13
-- Purpose: Add match_products function for CLIP-based visual search
-- ============================================================================

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Ensure the image_embedding column is the correct type (512 dimensions for CLIP)
-- Note: Run this manually if the column doesn't exist or needs resizing
-- ALTER TABLE products DROP COLUMN IF EXISTS image_embedding;
-- ALTER TABLE products ADD COLUMN image_embedding vector(512);

-- Create index for fast similarity search (if not exists)
-- CREATE INDEX IF NOT EXISTS products_image_embedding_idx 
-- ON products USING ivfflat (image_embedding vector_cosine_ops)
-- WITH (lists = 100);

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS match_products(vector(512), float, int);

-- Create the match_products function for visual search
-- Returns products with their primary image from product_images table
CREATE OR REPLACE FUNCTION match_products(
  query_embedding vector(512),
  match_threshold float DEFAULT 0.15,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price numeric,
  primary_image text,
  category_id uuid,
  seller_id uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.price,
    (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS primary_image,
    p.category_id,
    p.seller_id,
    1 - (p.image_embedding <=> query_embedding) AS similarity
  FROM products p
  WHERE 
    p.image_embedding IS NOT NULL
    AND p.deleted_at IS NULL
    AND p.disabled_at IS NULL
    AND 1 - (p.image_embedding <=> query_embedding) > match_threshold
  ORDER BY p.image_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION match_products(vector(512), float, int) TO anon, authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION match_products IS 'Find similar products using CLIP image embeddings (512-dim vectors)';

