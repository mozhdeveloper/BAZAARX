/**
 * Fix Data Issues
 * 1. Assign Home & Living products to a seller
 * 2. Re-create vouchers
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('\n=== FIXING DATA ISSUES ===\n');

  // Get sellers
  const { data: sellers } = await supabase.from('sellers').select('id, store_name');
  console.log('Sellers:', sellers?.map(s => s.store_name).join(', '));

  // Find TechHub Manila (assign Home & Living products to them for now)
  const techHub = sellers?.find(s => s.store_name === 'TechHub Manila');
  
  if (techHub) {
    // Fix products with null seller_id
    const { data: orphanProducts } = await supabase
      .from('products')
      .select('id, name')
      .is('seller_id', null);
    
    console.log(`\n📦 Products without seller: ${orphanProducts?.length || 0}`);
    
    if (orphanProducts && orphanProducts.length > 0) {
      const { error } = await supabase
        .from('products')
        .update({ seller_id: techHub.id })
        .is('seller_id', null);
      
      console.log(error ? `❌ ${error.message}` : `✅ Assigned ${orphanProducts.length} products to TechHub Manila`);
    }
  }

  // Re-create vouchers
  console.log('\n🎫 Creating vouchers...');
  
  const vouchers = [
    {
      code: 'WELCOME10',
      discount_type: 'percentage',
      value: 10,
      min_purchase: 500,
      max_discount: 200,
      is_active: true,
      valid_from: new Date().toISOString(),
      valid_until: new Date('2025-12-31').toISOString(),
      usage_limit: 1000,
      usage_count: 0,
    },
    {
      code: 'BAZAAR50',
      discount_type: 'fixed',
      value: 50,
      min_purchase: 1000,
      is_active: true,
      valid_from: new Date().toISOString(),
      valid_until: new Date('2025-12-31').toISOString(),
      usage_limit: 500,
      usage_count: 0,
    },
    {
      code: 'SAVE20',
      discount_type: 'percentage',
      value: 20,
      min_purchase: 2000,
      max_discount: 500,
      is_active: true,
      valid_from: new Date().toISOString(),
      valid_until: new Date('2025-12-31').toISOString(),
      usage_limit: 200,
      usage_count: 0,
    },
  ];

  for (const voucher of vouchers) {
    const { error } = await supabase.from('vouchers').upsert(voucher, { onConflict: 'code' });
    console.log(error ? `❌ ${voucher.code}: ${error.message}` : `✅ ${voucher.code}: Created`);
  }

  // Verify
  console.log('\n=== VERIFICATION ===\n');
  
  const { data: allProducts } = await supabase.from('products').select('name, seller:sellers(store_name)');
  console.log('Products with sellers:');
  allProducts?.forEach((p: any) => console.log(`  • ${p.name}: ${p.seller?.store_name || 'NONE'}`));

  const { data: allVouchers } = await supabase.from('vouchers').select('code, value, discount_type');
  console.log('\nVouchers:');
  allVouchers?.forEach(v => console.log(`  • ${v.code}: ${v.discount_type === 'percentage' ? v.value + '%' : '₱' + v.value}`));

  console.log('\n✅ Done!\n');
}

main();
