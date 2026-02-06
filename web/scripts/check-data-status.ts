/**
 * Check Data Status
 * Quick overview of all data in the database
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║              BAZAARPH DATA STATUS                            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Categories
  const { data: categories } = await supabase.from('categories').select('name').order('name');
  console.log(`📁 CATEGORIES (${categories?.length || 0}):`);
  categories?.forEach(c => console.log(`   • ${c.name}`));

  // Sellers
  const { data: sellers } = await supabase
    .from('sellers')
    .select('store_name, owner_name, approval_status');
  console.log(`\n👔 SELLERS (${sellers?.length || 0}):`);
  sellers?.forEach(s => console.log(`   • ${s.store_name} (${s.owner_name}) - ${s.approval_status}`));

  // Products
  const { data: products } = await supabase
    .from('products')
    .select('name, price, approval_status, category:categories(name), seller:sellers(store_name)');
  console.log(`\n📦 PRODUCTS (${products?.length || 0}):`);
  products?.forEach((p: any) => {
    console.log(`   • ₱${p.price} - ${p.name}`);
    console.log(`     Category: ${p.category?.name} | Seller: ${p.seller?.store_name}`);
  });

  // Product Images & Variants
  const { count: imageCount } = await supabase.from('product_images').select('*', { count: 'exact', head: true });
  const { count: variantCount } = await supabase.from('product_variants').select('*', { count: 'exact', head: true });
  console.log(`\n🖼️  PRODUCT IMAGES: ${imageCount}`);
  console.log(`🔀 PRODUCT VARIANTS: ${variantCount}`);

  // Buyers
  const { data: buyers } = await supabase
    .from('buyers')
    .select('id, bazcoins, profile:profiles(first_name, last_name, email)');
  console.log(`\n🛒 BUYERS (${buyers?.length || 0}):`);
  buyers?.forEach((b: any) => {
    console.log(`   • ${b.profile?.first_name} ${b.profile?.last_name} (${b.profile?.email}) - ${b.bazcoins} Bazcoins`);
  });

  // Vouchers
  const { data: vouchers } = await supabase
    .from('vouchers')
    .select('code, discount_type, value, min_purchase, is_active');
  console.log(`\n🎫 VOUCHERS (${vouchers?.length || 0}):`);
  vouchers?.forEach(v => {
    const discount = v.discount_type === 'percentage' ? `${v.value}%` : `₱${v.value}`;
    console.log(`   • ${v.code}: ${discount} off (min ₱${v.min_purchase}) - ${v.is_active ? '✅ Active' : '❌ Inactive'}`);
  });

  // User Roles
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role, user:profiles(email, first_name, last_name)');
  console.log(`\n👥 USER ROLES (${roles?.length || 0}):`);
  const rolesByType: Record<string, any[]> = {};
  roles?.forEach((r: any) => {
    if (!rolesByType[r.role]) rolesByType[r.role] = [];
    rolesByType[r.role].push(r.user);
  });
  Object.entries(rolesByType).forEach(([role, users]) => {
    console.log(`   ${role.toUpperCase()} (${users.length}):`);
    users.forEach(u => console.log(`     • ${u?.first_name} ${u?.last_name} (${u?.email})`));
  });

  // Business Profiles
  const { data: bizProfiles } = await supabase
    .from('seller_business_profiles')
    .select('city, province, seller:sellers(store_name)');
  console.log(`\n🏢 BUSINESS PROFILES (${bizProfiles?.length || 0}):`);
  bizProfiles?.forEach((bp: any) => {
    console.log(`   • ${bp.seller?.store_name}: ${bp.city}, ${bp.province}`);
  });

  console.log('\n══════════════════════════════════════════════════════════════\n');
  
  // Summary
  console.log('📊 SUMMARY:');
  console.log(`   Categories:    ${categories?.length || 0}/8`);
  console.log(`   Sellers:       ${sellers?.length || 0}/3`);
  console.log(`   Products:      ${products?.length || 0}/12`);
  console.log(`   Images:        ${imageCount}/12`);
  console.log(`   Variants:      ${variantCount}/24`);
  console.log(`   Buyers:        ${buyers?.length || 0}/3`);
  console.log(`   Vouchers:      ${vouchers?.length || 0}/3`);
  
  console.log('\n');
}

main();
