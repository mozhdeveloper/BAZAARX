import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function cleanupFunctions() {
  console.log('Cleaning up duplicate match_products functions...\n')

  // List all existing match_products function signatures
  const { data: functions, error } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT 
        pg_get_function_identity_arguments(p.oid) as args,
        p.proname
      FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE p.proname = 'match_products' 
        AND n.nspname = 'public'
    `
  })

  if (error) {
    console.log('Cannot query functions directly, will try DROP CASCADE\n')
  } else {
    console.log('Found functions:', functions)
  }
  
  // We need to run this SQL in the database to clean up
  console.log('Please run this SQL in Supabase Dashboard SQL Editor:')
  console.log('https://supabase.com/dashboard/project/ijdpbfrcvdflzwytxncj/sql/new\n')
  
  console.log(`-- Run this SQL to fix the issue:

-- Drop ALL match_products functions (all signatures)
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
        EXECUTE r.drop_stmt;
    END LOOP;
END $$;

-- Recreate single function with explicit parameter order
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
    AND (1 - (p.image_embedding <=> query_embedding)) > match_threshold
  ORDER BY p.image_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION match_products TO service_role, anon, authenticated;
`)
}

cleanupFunctions()
