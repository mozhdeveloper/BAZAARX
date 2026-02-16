import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fixVectorDimension() {
  console.log('🔧 Fixing vector dimension for Jina CLIP v2 (1024)...\n')
  
  // Step 1: Clear existing embeddings
  console.log('1. Clearing existing embeddings...')
  await supabase
    .from('products')
    .update({ image_embedding: null })
    .not('image_embedding', 'is', null)
  console.log('   ✅ Done')

  // Step 2: Alter column type using raw SQL via pg_net or admin API
  // Since we can't run DDL directly, we'll call the Supabase REST API
  const projectRef = 'ijdpbfrcvdflzwytxncj'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const sql = `
    -- Change vector column to 1024 dimensions
    ALTER TABLE products ALTER COLUMN image_embedding TYPE vector(1024);
    
    -- Drop old functions
    DROP FUNCTION IF EXISTS match_products(vector(1152), int, float);
    DROP FUNCTION IF EXISTS match_products(vector(1024), int, float);
    DROP FUNCTION IF EXISTS match_products(vector(512), int, float);
    
    -- Create new function with 1024 dimensions
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
  `
  
  console.log('2. Executing SQL to alter vector dimension...')
  
  // Use the Supabase SQL API
  const response = await fetch(`https://${projectRef}.supabase.co/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    },
    body: JSON.stringify({ sql_query: sql })
  })
  
  if (!response.ok) {
    // Try the pg_query endpoint
    console.log('   Trying alternative method...')
    
    // Execute via edge function
    const edgeResponse = await fetch(`https://${projectRef}.supabase.co/functions/v1/execute-sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({ sql })
    })
    
    if (!edgeResponse.ok) {
      console.log('\n❌ Cannot execute DDL via API. Please run the following SQL manually:')
      console.log('   Dashboard: https://supabase.com/dashboard/project/ijdpbfrcvdflzwytxncj/sql/new')
      console.log('\n' + sql)
      return false
    }
  }
  
  console.log('   ✅ Vector dimension updated to 1024')
  return true
}

fixVectorDimension().then(success => {
  if (success) {
    console.log('\n✅ Ready to backfill embeddings!')
  }
  process.exit(success ? 0 : 1)
})
