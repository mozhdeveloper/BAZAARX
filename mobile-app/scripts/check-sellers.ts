/**
 * Check sellers in database
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

async function check() {
  console.log('📋 Checking sellers in database...\n');

  // Get sellers
  const { data: sellers } = await supabase
    .from('sellers')
    .select('id, store_name, business_name')
    .limit(10);
  
  console.log('Sellers table:');
  if (sellers) {
    for (let i = 0; i < sellers.length; i++) {
      const s = sellers[i];
      console.log(`  ${i+1}. ${s.store_name} (ID: ${s.id})`);
    }
  }

  // Get profiles that are sellers
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('role', 'seller')
    .limit(10);
  
  console.log('\nSeller profiles (auth users):');
  if (profiles) {
    for (let i = 0; i < profiles.length; i++) {
      const p = profiles[i];
      console.log(`  ${i+1}. ${p.email} - ${p.full_name} (auth ID: ${p.id})`);
    }
  }

  // Get buyer profiles
  const { data: buyers } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('role', 'buyer')
    .limit(5);
  
  console.log('\nBuyer profiles:');
  if (buyers) {
    for (let i = 0; i < buyers.length; i++) {
      const b = buyers[i];
      console.log(`  ${i+1}. ${b.email} - ${b.full_name} (ID: ${b.id})`);
    }
  }
}

check().catch(console.error);
