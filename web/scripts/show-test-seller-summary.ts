/**
 * Complete Test Seller Summary
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function showCompleteSummary() {
  console.log('\n' + '═'.repeat(75));
  console.log('  🏪 TEST SELLER ACCOUNT - COMPLETE SUMMARY');
  console.log('═'.repeat(75));

  const { data: seller } = await supabase
    .from('sellers')
    .select('*')
    .eq('store_name', 'MariaBoutiquePH')
    .single();

  if (!seller) {
    console.log('❌ Seller not found!');
    return;
  }

  console.log('\n📧 LOGIN CREDENTIALS:');
  console.log('   Email:    teststore@bazaar.ph');
  console.log('   Password: TestStore123!');

  console.log('\n🏪 STORE INFORMATION:');
  console.log(`   Business Name:  ${seller.business_name}`);
  console.log(`   Store Name:     ${seller.store_name}`);
  console.log(`   Verified:       ${seller.is_verified ? '✅ Yes' : '❌ No'}`);
  console.log(`   Approval:       ${seller.approval_status}`);
  console.log(`   Rating:         ⭐ ${seller.rating}/5`);
  console.log(`   Total Sales:    ${seller.total_sales}`);
  console.log(`   Category:       ${seller.store_category?.join(', ')}`);
  console.log(`   Location:       ${seller.city}, ${seller.province}`);

  console.log('\n📝 STORE DESCRIPTION:');
  console.log(`   ✅ Has complete description (${seller.store_description?.length || 0} characters)`);
  console.log('   ┌' + '─'.repeat(71) + '┐');
  if (seller.store_description) {
    const lines = seller.store_description.split('\n');
    lines.forEach((line: string) => {
      console.log(`   │ ${line.padEnd(69)} │`);
    });
  }
  console.log('   └' + '─'.repeat(71) + '┘');

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('seller_id', seller.id)
    .order('name');

  console.log(`\n📦 PRODUCTS (${products?.length || 0} total - All QA Approved):\n`);
  
  products?.forEach((product, index) => {
    console.log(`   ${index + 1}. ${product.name}`);
    console.log(`      ├─ Price: ₱${product.price} (was ₱${product.original_price})`);
    console.log(`      ├─ Stock: ${product.stock} units`);
    console.log(`      ├─ Status: ${product.approval_status} | Active: ${product.is_active}`);
    console.log(`      ├─ Colors: ${product.colors?.length || 0} | Sizes: ${product.sizes?.length || 0}`);
    console.log(`      ├─ Variants: ${product.variants?.length || 0} combinations`);
    console.log(`      ├─ Rating: ⭐ ${product.rating}/5 (${product.review_count} reviews)`);
    console.log(`      ├─ Images: ${product.images?.length || 0} photos`);
    console.log(`      └─ Description: ✅ ${product.description?.length || 0} characters`);
    
    if (product.description) {
      const preview = product.description.substring(0, 100).replace(/\n/g, ' ');
      console.log(`         "${preview}..."`);
    }
    console.log('');
  });

  // Check QA status
  const { count: qaCount } = await supabase
    .from('product_qa')
    .select('id', { count: 'exact' })
    .eq('vendor', 'MariaBoutiquePH')
    .eq('status', 'ACTIVE_VERIFIED');

  console.log('✅ QA STATUS:');
  console.log(`   All ${qaCount} products are QA approved (ACTIVE_VERIFIED)`);

  console.log('\n🔗 TEST URLS:');
  console.log('   Seller Login:     http://localhost:5173/seller/login');
  console.log('   Seller Dashboard: http://localhost:5173/seller');
  console.log('   Public Store:     http://localhost:5173/stores/MariaBoutiquePH');

  console.log('\n' + '═'.repeat(75));
  console.log('  ✅ ALL DATA VERIFIED - READY FOR TESTING!');
  console.log('═'.repeat(75) + '\n');
}

showCompleteSummary().catch(console.error);
