/**
 * Verify Test Seller Account
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function verify() {
  console.log('\n🔍 VERIFYING TEST SELLER ACCOUNT\n');
  console.log('='.repeat(60));

  // Check seller
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id, store_name, store_description, is_verified, approval_status, rating, total_sales')
    .eq('store_name', 'MariaBoutiquePH')
    .single();
  
  if (sellerError || !seller) {
    console.log('❌ Seller not found');
    return;
  }

  console.log('\n🏪 SELLER STORE:');
  console.log(`   Store Name: ${seller.store_name}`);
  console.log(`   Verified: ${seller.is_verified ? '✅ Yes' : '❌ No'}`);
  console.log(`   Approval: ${seller.approval_status}`);
  console.log(`   Rating: ⭐ ${seller.rating}/5`);
  console.log(`   Total Sales: ${seller.total_sales}`);
  console.log(`   Description: ${seller.store_description?.substring(0, 80)}...`);

  // Check products
  const { data: products, count } = await supabase
    .from('products')
    .select('id, name, approval_status, is_active, colors, sizes, variants, price, original_price, stock, rating, review_count', { count: 'exact' })
    .eq('seller_id', seller.id);
  
  console.log(`\n📦 PRODUCTS (${count} total):`);
  products?.forEach((p, i) => {
    console.log(`\n   ${i + 1}. ${p.name}`);
    console.log(`      Status: ${p.approval_status === 'approved' ? '✅ Approved' : p.approval_status}`);
    console.log(`      Active: ${p.is_active ? '✅ Yes' : '❌ No'}`);
    console.log(`      Price: ₱${p.price} (was ₱${p.original_price})`);
    console.log(`      Stock: ${p.stock} units`);
    console.log(`      Colors: ${p.colors?.length || 0} | Sizes: ${p.sizes?.length || 0} | Variants: ${p.variants?.length || 0}`);
    console.log(`      Rating: ⭐ ${p.rating}/5 (${p.review_count} reviews)`);
  });

  // Check QA records
  const { data: qa, count: qaCount } = await supabase
    .from('product_qa')
    .select('status, product_id', { count: 'exact' })
    .eq('vendor', 'MariaBoutiquePH');
  
  console.log(`\n✅ QA RECORDS (${qaCount} total):`);
  const statusCounts: Record<string, number> = {};
  qa?.forEach(q => {
    statusCounts[q.status] = (statusCounts[q.status] || 0) + 1;
  });
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ VERIFICATION COMPLETE\n');
}

verify();
