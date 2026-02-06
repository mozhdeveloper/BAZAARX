/**
 * Continue Data Population
 * Creates remaining accounts that failed due to rate limiting
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

async function createUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    if (error.message.includes('already registered')) {
      const { data: signIn } = await supabase.auth.signInWithPassword({ email, password });
      return signIn.user?.id;
    }
    console.log(`  ❌ ${email}: ${error.message}`);
    return null;
  }
  return data.user?.id;
}

async function main() {
  console.log('\n=== CONTINUE DATA POPULATION ===\n');
  
  // Get existing seller IDs
  const { data: existingSellers } = await supabase.from('sellers').select('id, store_name');
  console.log('Existing sellers:', existingSellers?.map(s => s.store_name).join(', '));
  
  // Check if seller3 exists
  const seller3Exists = existingSellers?.some(s => s.store_name === 'Home & Living Co.');
  
  if (!seller3Exists) {
    console.log('\n👔 Creating seller3...');
    const userId = await createUser('seller3@bazaarph.com', 'Seller123!');
    if (userId) {
      console.log(`  ✅ Auth user: ${userId.substring(0, 8)}...`);
      
      await supabase.from('profiles').upsert({
        id: userId,
        email: 'seller3@bazaarph.com',
        first_name: 'Carlos',
        last_name: 'Dela Cruz',
        phone: '+639193456789',
      });
      
      await supabase.from('user_roles').upsert({ user_id: userId, role: 'seller' });
      
      const { error: sellerError } = await supabase.from('sellers').insert({
        id: userId,
        store_name: 'Home & Living Co.',
        store_description: 'Beautiful home decor and furniture to make your house a home.',
        owner_name: 'Carlos Dela Cruz',
        approval_status: 'verified',
        verified_at: new Date().toISOString(),
      });
      
      if (!sellerError) {
        console.log('  ✅ Seller created');
        
        await supabase.from('seller_business_profiles').insert({
          seller_id: userId,
          business_type: 'corporation',
          city: 'Pasig City',
          province: 'Metro Manila',
          postal_code: '1600',
          address_line_1: '789 Ortigas Ave, Pasig City',
          business_registration_number: 'SEC-2024-003456',
          tax_id_number: '345-678-901-000',
        });
        
        await supabase.from('seller_payout_accounts').insert({
          seller_id: userId,
          bank_name: 'Metrobank',
          account_name: 'Home & Living Co.',
          account_number: '003456789012',
        });
        console.log('  ✅ Business profile and payout account created');
      } else {
        console.log('  ❌ Seller error:', sellerError.message);
      }
    }
    await delay(2000);
  }
  
  // Create buyers
  const buyers = [
    { email: 'buyer1@bazaarph.com', first_name: 'Ana', last_name: 'Santos', phone: '+639201234567', bazcoins: 500 },
    { email: 'buyer2@bazaarph.com', first_name: 'Juan', last_name: 'Cruz', phone: '+639212345678', bazcoins: 1000 },
    { email: 'buyer3@bazaarph.com', first_name: 'Maria', last_name: 'Garcia', phone: '+639223456789', bazcoins: 250 },
  ];
  
  const { data: existingBuyers } = await supabase.from('buyers').select('id');
  console.log(`\nExisting buyers: ${existingBuyers?.length || 0}`);
  
  if (!existingBuyers?.length) {
    console.log('\n🛒 Creating buyers...');
    for (const buyer of buyers) {
      const userId = await createUser(buyer.email, 'Buyer123!');
      if (userId) {
        console.log(`  ✅ ${buyer.first_name} ${buyer.last_name}: ${userId.substring(0, 8)}...`);
        
        await supabase.from('profiles').upsert({
          id: userId,
          email: buyer.email,
          first_name: buyer.first_name,
          last_name: buyer.last_name,
          phone: buyer.phone,
        });
        
        await supabase.from('user_roles').upsert({ user_id: userId, role: 'buyer' });
        
        await supabase.from('buyers').insert({
          id: userId,
          bazcoins: buyer.bazcoins,
          preferences: { notifications: true },
        });
      }
      await delay(2000);
    }
  }
  
  // Create QA and Admin
  const admins = [
    { email: 'qa@bazaarph.com', password: 'QA123456!', role: 'qa', first_name: 'QA', last_name: 'Team' },
    { email: 'admin@bazaarph.com', password: 'Admin123!', role: 'admin', first_name: 'Admin', last_name: 'User' },
  ];
  
  console.log('\n👮 Creating QA/Admin...');
  for (const admin of admins) {
    const userId = await createUser(admin.email, admin.password);
    if (userId) {
      console.log(`  ✅ ${admin.role}: ${userId.substring(0, 8)}...`);
      
      await supabase.from('profiles').upsert({
        id: userId,
        email: admin.email,
        first_name: admin.first_name,
        last_name: admin.last_name,
      });
      
      await supabase.from('user_roles').upsert({ user_id: userId, role: admin.role });
    }
    await delay(2000);
  }
  
  // Update business profiles for existing sellers
  console.log('\n📝 Updating seller business profiles...');
  const { data: sellers } = await supabase.from('sellers').select('id, store_name');
  
  const bpUpdates = [
    { store_name: 'TechHub Manila', city: 'Makati City', province: 'Metro Manila', address_line_1: '123 Ayala Avenue' },
    { store_name: 'Fashion Forward PH', city: 'Quezon City', province: 'Metro Manila', address_line_1: '456 Commonwealth Ave' },
  ];
  
  for (const update of bpUpdates) {
    const seller = sellers?.find(s => s.store_name === update.store_name);
    if (seller) {
      const { error } = await supabase.from('seller_business_profiles').upsert({
        seller_id: seller.id,
        city: update.city,
        province: update.province,
        address_line_1: update.address_line_1,
      });
      console.log(`  ${error ? '❌' : '✅'} ${update.store_name}: ${error?.message || 'Updated'}`);
    }
  }
  
  // Summary
  console.log('\n=== FINAL STATUS ===\n');
  const { data: finalSellers } = await supabase.from('sellers').select('store_name');
  const { data: finalBuyers } = await supabase.from('buyers').select('id');
  const { data: finalProducts } = await supabase.from('products').select('id');
  const { data: finalCategories } = await supabase.from('categories').select('id');
  
  console.log(`Categories: ${finalCategories?.length || 0}`);
  console.log(`Sellers: ${finalSellers?.length || 0} (${finalSellers?.map(s => s.store_name).join(', ')})`);
  console.log(`Products: ${finalProducts?.length || 0}`);
  console.log(`Buyers: ${finalBuyers?.length || 0}`);
  
  console.log('\n✅ Done!\n');
}

main();
