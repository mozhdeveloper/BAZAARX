-- Fix vector dimension for Jina CLIP v2 (1024 dimensions)
-- First clear any existing embeddings to allow type change
UPDATE products SET image_embedding = NULL WHERE image_embedding IS NOT NULL;

-- Alter the column to use 1024 dimensions (Jina CLIP v2)
ALTER TABLE products 
ALTER COLUMN image_embedding TYPE vector(1024);

-- Drop old match_products functions with different signatures
DROP FUNCTION IF EXISTS match_products(vector(1152), int, float);
DROP FUNCTION IF EXISTS match_products(vector(512), int, float);

-- Create or replace the match_products function with correct dimensions
CREATE OR REPLACE FUNCTION match_products(
  query_embedding vector(1024),
  match_count int DEFAULT 10,
  match_threshold float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  name text,
  price numeric,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.price,
    1 - (p.image_embedding <=> query_embedding) AS similarity
  FROM products p
  WHERE p.image_embedding IS NOT NULL
    AND 1 - (p.image_embedding <=> query_embedding) > match_threshold
  ORDER BY p.image_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission to all roles
GRANT EXECUTE ON FUNCTION match_products(vector(1024), int, float) TO service_role;
GRANT EXECUTE ON FUNCTION match_products(vector(1024), int, float) TO anon;
GRANT EXECUTE ON FUNCTION match_products(vector(1024), int, float) TO authenticated;
