import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fixVectorDimension() {
  console.log('Fixing vector dimension for Jina CLIP v2 (1024)...\n')
  
  // Step 1: Clear existing embeddings
  console.log('1. Clearing existing embeddings...')
  const { error: clearError } = await supabase
    .from('products')
    .update({ image_embedding: null })
    .not('image_embedding', 'is', null)
  
  if (clearError) {
    console.log('   (No existing embeddings to clear or already null)')
  } else {
    console.log('   ✅ Cleared existing embeddings')
  }

  // Step 2: The column type change requires raw SQL
  // We'll do this through a SQL edge function or manually in dashboard
  console.log('\n2. To change vector dimension, run this SQL in Supabase Dashboard:')
  console.log('   (Dashboard > SQL Editor > New Query)\n')
  console.log(`
-- Change vector column to 1024 dimensions for Jina CLIP v2
ALTER TABLE products 
ALTER COLUMN image_embedding TYPE vector(1024);

-- Recreate match_products function with correct dimensions
DROP FUNCTION IF EXISTS match_products(vector(1152), int, float);
DROP FUNCTION IF EXISTS match_products(vector(1024), int, float);
DROP FUNCTION IF EXISTS match_products(vector(512), int, float);

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

GRANT EXECUTE ON FUNCTION match_products(vector(1024), int, float) TO service_role;
GRANT EXECUTE ON FUNCTION match_products(vector(1024), int, float) TO anon;
GRANT EXECUTE ON FUNCTION match_products(vector(1024), int, float) TO authenticated;
`)

  console.log('\n3. After running the SQL, run the backfill again:')
  console.log('   npx tsx scripts/test-visual-search-fullstack.ts')
  
  console.log('\n📋 Dashboard URL: https://supabase.com/dashboard/project/ijdpbfrcvdflzwytxncj/sql/new')
}

fixVectorDimension()
