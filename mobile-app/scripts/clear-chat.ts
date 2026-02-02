/**
 * Clear all chat messages and conversations for clean testing
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearChat() {
  console.log('🧹 Clearing all chat data...\n');

  // Clear messages first (due to foreign key)
  console.log('Clearing messages...');
  const { error: msgErr } = await supabase
    .from('messages')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (msgErr) {
    console.log('❌ Messages error:', msgErr.message);
  } else {
    console.log(`✅ Messages cleared`);
  }

  // Clear conversations
  console.log('Clearing conversations...');
  const { error: convErr } = await supabase
    .from('conversations')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (convErr) {
    console.log('❌ Conversations error:', convErr.message);
  } else {
    console.log(`✅ Conversations cleared`);
  }

  // Verify
  const { count: msgCount } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true });
  
  const { count: convCount } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true });

  console.log('\n📊 Final state:');
  console.log(`   Messages remaining: ${msgCount}`);
  console.log(`   Conversations remaining: ${convCount}`);
  console.log('\n✨ Chat data cleared! Ready for clean testing.');
}

clearChat().catch(console.error);
