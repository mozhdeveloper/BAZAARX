/**
 * Check Store and Product Descriptions
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkDescriptions() {
  console.log('\n📋 CHECKING DESCRIPTIONS\n');
  console.log('='.repeat(70));

  // Check seller store description
  const { data: seller } = await supabase
    .from('sellers')
    .select('store_name, store_description, business_name')
    .eq('store_name', 'MariaBoutiquePH')
    .single();
  
  console.log('\n🏪 SELLER STORE DESCRIPTION:');
  console.log(`   Store: ${seller?.business_name}`);
  console.log(`   Has Description: ${seller?.store_description ? '✅ YES' : '❌ NO'}`);
  if (seller?.store_description) {
    console.log(`   Length: ${seller.store_description.length} characters`);
    console.log('\n   Full Description:');
    console.log('   ' + '─'.repeat(66));
    console.log(seller.store_description.split('\n').map(line => '   ' + line).join('\n'));
    console.log('   ' + '─'.repeat(66));
  }

  // Check products
  const { data: products } = await supabase
    .from('products')
    .select('name, description')
    .eq('seller_id', seller?.id);
  
  console.log('\n\n📦 PRODUCT DESCRIPTIONS:\n');
  products?.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name}`);
    console.log(`      Has Description: ${p.description ? '✅ YES' : '❌ NO'}`);
    if (p.description) {
      console.log(`      Length: ${p.description.length} characters`);
      console.log('\n      Preview:');
      console.log('      ' + '─'.repeat(62));
      const preview = p.description.substring(0, 200);
      console.log('      ' + preview + (p.description.length > 200 ? '...' : ''));
      console.log('      ' + '─'.repeat(62));
    }
    console.log('');
  });

  console.log('='.repeat(70));
}

checkDescriptions();
