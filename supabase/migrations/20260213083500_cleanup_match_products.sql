-- Drop ALL match_products functions (all signatures) using dynamic SQL
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT 'DROP FUNCTION IF EXISTS ' || ns.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') CASCADE;' as drop_stmt
        FROM pg_proc p
        JOIN pg_namespace ns ON p.pronamespace = ns.oid
        WHERE p.proname = 'match_products' AND ns.nspname = 'public'
    ) LOOP
        RAISE NOTICE 'Executing: %', r.drop_stmt;
        EXECUTE r.drop_stmt;
    END LOOP;
END $$;

-- Recreate single function with explicit parameter order
CREATE FUNCTION match_products(
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
    AND (1 - (p.image_embedding <=> query_embedding)) > match_threshold
  ORDER BY p.image_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION match_products(vector(1024), int, float) TO service_role;
GRANT EXECUTE ON FUNCTION match_products(vector(1024), int, float) TO anon;
GRANT EXECUTE ON FUNCTION match_products(vector(1024), int, float) TO authenticated;
