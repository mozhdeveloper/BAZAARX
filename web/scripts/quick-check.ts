/**
 * Quick Description Check
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function quickCheck() {
  const { data: seller } = await supabase
    .from('sellers')
    .select('id, store_name, store_description')
    .eq('store_name', 'MariaBoutiquePH')
    .single();

  console.log('\n🏪 STORE:', seller?.store_name);
  console.log('Description exists:', !!seller?.store_description);
  console.log('Description length:', seller?.store_description?.length || 0);
  
  const { data: products, error } = await supabase
    .from('products')
    .select('name, description')
    .eq('seller_id', seller?.id || '');

  console.log('\n📦 PRODUCTS:', products?.length);
  
  if (products && products.length > 0) {
    for (const p of products) {
      console.log(`\n  ✓ ${p.name}`);
      console.log(`    Description: ${p.description ? 'YES (' + p.description.length + ' chars)' : 'NO'}`);
      if (p.description) {
        console.log(`    Preview: ${p.description.substring(0, 80)}...`);
      }
    }
  }
  
  if (error) {
    console.error('Error:', error);
  }
}

quickCheck().catch(console.error);
