-- Clean up duplicate match_products functions
-- Drop all variants to start fresh

-- Drop all potential function signatures
DROP FUNCTION IF EXISTS match_products(vector, int, float);
DROP FUNCTION IF EXISTS match_products(vector, float, int);
DROP FUNCTION IF EXISTS match_products(vector(1024), int, float);
DROP FUNCTION IF EXISTS match_products(vector(1024), float, int);
DROP FUNCTION IF EXISTS match_products(vector(1152), int, float);
DROP FUNCTION IF EXISTS match_products(vector(512), int, float);

-- Create single canonical function with named parameters
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
    (1 - (p.image_embedding <=> query_embedding))::float AS similarity
  FROM products p
  WHERE p.image_embedding IS NOT NULL
    AND p.deleted_at IS NULL
    AND p.disabled_at IS NULL
    AND (1 - (p.image_embedding <=> query_embedding)) > match_threshold
  ORDER BY p.image_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION match_products(vector(1024), int, float) TO service_role;
GRANT EXECUTE ON FUNCTION match_products(vector(1024), int, float) TO anon;
GRANT EXECUTE ON FUNCTION match_products(vector(1024), int, float) TO authenticated;

-- Create index for faster vector search if not exists
CREATE INDEX IF NOT EXISTS idx_products_image_embedding 
ON products USING ivfflat (image_embedding vector_cosine_ops) 
WHERE image_embedding IS NOT NULL;
