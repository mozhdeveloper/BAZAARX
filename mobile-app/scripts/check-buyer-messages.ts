/**
 * Check which buyer accounts have conversations
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

async function checkBuyerMessages() {
  console.log('============================================================');
  console.log('CHECKING BUYER ACCOUNTS WITH CONVERSATIONS');
  console.log('============================================================\n');

  // Get all buyers
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name');

  if (!profiles) {
    console.log('❌ No buyers found');
    return;
  }

  console.log(`👤 Found ${profiles.length} buyer profiles\n`);

  // Check each buyer for conversations
  for (const profile of profiles) {
    const { data: convs } = await supabase
      .from('conversations')
      .select('id, seller_id')
      .eq('buyer_id', profile.id);

    if (convs && convs.length > 0) {
      console.log(`✅ ${profile.email || profile.full_name}`);
      console.log(`   Name: ${profile.full_name || 'N/A'}`);
      console.log(`   Conversations: ${convs.length}`);
      console.log(`   User ID: ${profile.id}\n`);
    }
  }

  console.log('\n============================================================');
  console.log('Suggested login credentials:');
  console.log('Password for all buyers: Buyer123!');
  console.log('============================================================');
}

checkBuyerMessages().catch(console.error);
