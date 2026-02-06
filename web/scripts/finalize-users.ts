/**
 * Finalize Users Script
 * After manually creating users in Supabase dashboard, run this to:
 * 1. Set up profiles
 * 2. Assign roles
 * 3. Create seller/buyer records
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface UserConfig {
  email: string;
  password: string;
  role: 'seller' | 'buyer' | 'admin' | 'qa';
  profile: { first_name: string; last_name: string; phone?: string };
  sellerData?: {
    store_name: string;
    store_description: string;
    owner_name: string;
    business_profile?: any;
    payout_account?: any;
  };
  buyerData?: { bazcoins: number };
}

const pendingUsers: UserConfig[] = [
  {
    email: 'seller3@bazaarph.com',
    password: 'Seller123!',
    role: 'seller',
    profile: { first_name: 'Carlos', last_name: 'Dela Cruz', phone: '+639193456789' },
    sellerData: {
      store_name: 'Home & Living Co.',
      store_description: 'Beautiful home decor and furniture to make your house a home.',
      owner_name: 'Carlos Dela Cruz',
      business_profile: {
        business_type: 'corporation',
        city: 'Pasig City',
        province: 'Metro Manila',
        postal_code: '1600',
        address_line_1: '789 Ortigas Ave, Pasig City',
      },
      payout_account: {
        bank_name: 'Metrobank',
        account_name: 'Home & Living Co.',
        account_number: '003456789012',
      },
    },
  },
  {
    email: 'buyer1@bazaarph.com',
    password: 'Buyer123!',
    role: 'buyer',
    profile: { first_name: 'Ana', last_name: 'Santos', phone: '+639201234567' },
    buyerData: { bazcoins: 500 },
  },
  {
    email: 'buyer2@bazaarph.com',
    password: 'Buyer123!',
    role: 'buyer',
    profile: { first_name: 'Juan', last_name: 'Cruz', phone: '+639212345678' },
    buyerData: { bazcoins: 1000 },
  },
  {
    email: 'buyer3@bazaarph.com',
    password: 'Buyer123!',
    role: 'buyer',
    profile: { first_name: 'Maria', last_name: 'Garcia', phone: '+639223456789' },
    buyerData: { bazcoins: 250 },
  },
  {
    email: 'qa@bazaarph.com',
    password: 'QA123456!',
    role: 'qa',
    profile: { first_name: 'QA', last_name: 'Team' },
  },
  {
    email: 'admin@bazaarph.com',
    password: 'Admin123!',
    role: 'admin',
    profile: { first_name: 'Admin', last_name: 'User' },
  },
];

async function finalizeUser(config: UserConfig) {
  console.log(`\n👤 Processing ${config.email}...`);

  // Try to sign in to get the user ID
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: config.email,
    password: config.password,
  });

  if (authError) {
    console.log(`  ❌ Cannot sign in: ${authError.message}`);
    console.log(`  ℹ️  User may not exist yet. Create in Supabase dashboard first.`);
    return false;
  }

  const userId = authData.user.id;
  console.log(`  ✅ Found user: ${userId.substring(0, 8)}...`);

  // Create/update profile
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    email: config.email,
    ...config.profile,
  });
  console.log(`  ${profileError ? '❌' : '✅'} Profile: ${profileError?.message || 'OK'}`);

  // Set role
  const { error: roleError } = await supabase.from('user_roles').upsert({
    user_id: userId,
    role: config.role,
  });
  console.log(`  ${roleError ? '❌' : '✅'} Role (${config.role}): ${roleError?.message || 'OK'}`);

  // Create seller record if needed
  if (config.sellerData) {
    const { error: sellerError } = await supabase.from('sellers').upsert({
      id: userId,
      store_name: config.sellerData.store_name,
      store_description: config.sellerData.store_description,
      owner_name: config.sellerData.owner_name,
      approval_status: 'verified',
      verified_at: new Date().toISOString(),
    });
    console.log(`  ${sellerError ? '❌' : '✅'} Seller: ${sellerError?.message || 'OK'}`);

    if (!sellerError && config.sellerData.business_profile) {
      const { error: bpError } = await supabase.from('seller_business_profiles').upsert({
        seller_id: userId,
        ...config.sellerData.business_profile,
      });
      console.log(`  ${bpError ? '❌' : '✅'} Business Profile: ${bpError?.message || 'OK'}`);
    }

    if (!sellerError && config.sellerData.payout_account) {
      const { error: paError } = await supabase.from('seller_payout_accounts').upsert({
        seller_id: userId,
        ...config.sellerData.payout_account,
      });
      console.log(`  ${paError ? '❌' : '✅'} Payout Account: ${paError?.message || 'OK'}`);
    }
  }

  // Create buyer record if needed
  if (config.buyerData) {
    const { error: buyerError } = await supabase.from('buyers').upsert({
      id: userId,
      bazcoins: config.buyerData.bazcoins,
      preferences: { notifications: true },
    });
    console.log(`  ${buyerError ? '❌' : '✅'} Buyer: ${buyerError?.message || 'OK'}`);
  }

  // Sign out
  await supabase.auth.signOut();
  return true;
}

async function main() {
  console.log('\n=== FINALIZE USERS SCRIPT ===');
  console.log('This script sets up profiles/roles for users created in Supabase dashboard.\n');

  let success = 0;
  let failed = 0;

  for (const user of pendingUsers) {
    const result = await finalizeUser(user);
    if (result) success++;
    else failed++;
  }

  console.log('\n=== SUMMARY ===');
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n📋 To create missing users:');
    console.log('1. Go to: https://app.supabase.io/project/ijdpbfrcvdflzwytxncj/auth/users');
    console.log('2. Click "Add user" → "Create new user"');
    console.log('3. Enter email and password (check box to confirm email)');
    console.log('4. Run this script again\n');
  }
}

main();
