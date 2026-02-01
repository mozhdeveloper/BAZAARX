/**
 * Quick verification script to check products have variants
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function verify() {
  const { data, count } = await supabase
    .from('products')
    .select('id, name, colors, sizes, approval_status, seller_id', { count: 'exact' })
    .limit(15);

  console.log('\n✅ Total products:', count);
  console.log('\n📦 Sample products with variants:\n');
  
  data?.forEach((p, i) => {
    const hasColors = p.colors && p.colors.length > 0;
    const hasSizes = p.sizes && p.sizes.length > 0;
    console.log(`${i + 1}. ${p.name}`);
    console.log(`   Colors: ${hasColors ? p.colors.join(', ') : 'None'}`);
    console.log(`   Sizes: ${hasSizes ? p.sizes.join(', ') : 'None'}`);
    console.log(`   Status: ${p.approval_status}\n`);
  });
  
  // Count products with variants
  const { data: withVariants, count: variantCount } = await supabase
    .from('products')
    .select('id', { count: 'exact' })
    .or('colors.neq.{},sizes.neq.{}');
  
  console.log(`\n📊 Products with variants: ${variantCount} / ${count}`);
}

verify();
