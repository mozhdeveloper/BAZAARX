/**
 * Verify which accounts exist in Supabase Auth
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BUYER_TEST_ACCOUNTS = [
  { email: 'zoe@gmail.com', password: 'Buyer123!' },
  { email: 'kenziecerenio@gmail.com', password: 'Buyer123!' },
  { email: 'apvida@gmaul.com', password: 'Buyer123!' },
  { email: 'cheaper@gmail.com', password: 'Buyer123!' },
  { email: 'walterwhite@gmail.com', password: 'Buyer123!' },
  { email: 'mcstuffins@gmail.com', password: 'Buyer123!' },
  { email: 'nexshop@gmail.com', password: 'Buyer123!' },
  { email: 'mrbrown@gmail.com', password: 'Buyer123!' },
];

const SELLER_TEST_ACCOUNTS = [
  { email: 'maria.santos@bazaarph.com', password: 'Seller123!' },
  { email: 'juan.tech@bazaarph.com', password: 'Seller123!' },
  { email: 'wellness.haven@bazaarph.com', password: 'Seller123!' },
  { email: 'home.essentials@bazaarph.com', password: 'Seller123!' },
  { email: 'active.sports@bazaarph.com', password: 'Seller123!' },
];

async function verifyAccounts() {
  console.log('============================================================');
  console.log('VERIFYING AUTH ACCOUNTS');
  console.log('============================================================\n');

  console.log('🔵 BUYER ACCOUNTS\n');
  for (const account of BUYER_TEST_ACCOUNTS) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });

      if (error) {
        console.log(`❌ ${account.email} - ${error.message}`);
      } else if (data.user) {
        // Check profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, user_type')
          .eq('id', data.user.id)
          .single();
        
        console.log(`✅ ${account.email}`);
        console.log(`   Name: ${profile?.full_name || 'N/A'}`);
        console.log(`   Type: ${profile?.user_type || 'N/A'}`);
        
        // Sign out
        await supabase.auth.signOut();
      }
    } catch (err: any) {
      console.log(`❌ ${account.email} - ${err.message}`);
    }
    console.log();
  }

  console.log('\n🟠 SELLER ACCOUNTS\n');
  for (const account of SELLER_TEST_ACCOUNTS) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });

      if (error) {
        console.log(`❌ ${account.email} - ${error.message}`);
      } else if (data.user) {
        // Check seller
        const { data: seller } = await supabase
          .from('sellers')
          .select('store_name, approval_status')
          .eq('id', data.user.id)
          .single();
        
        console.log(`✅ ${account.email}`);
        console.log(`   Store: ${seller?.store_name || 'N/A'}`);
        console.log(`   Status: ${seller?.approval_status || 'N/A'}`);
        
        // Sign out
        await supabase.auth.signOut();
      }
    } catch (err: any) {
      console.log(`❌ ${account.email} - ${err.message}`);
    }
    console.log();
  }

  console.log('============================================================');
}

verifyAccounts().catch(console.error);
