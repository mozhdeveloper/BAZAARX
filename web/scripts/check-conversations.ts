/**
 * Quick script to check conversations in Supabase
 * Run with: npx tsx web/scripts/check-conversations.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from web/.env
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConversations() {
  console.log('🔍 Checking conversations in Supabase...\n');

  try {
    // Get all conversations
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false });

    if (convError) {
      console.error('❌ Error fetching conversations:', convError);
      return;
    }

    if (!conversations || conversations.length === 0) {
      console.log('⚠️  No conversations found in database');
      console.log('💡 Run the seed script first: npx tsx mobile-app/scripts/seed-chat-messages.ts');
      return;
    }

    console.log(`✅ Found ${conversations.length} conversation(s):\n`);

    for (const conv of conversations) {
      console.log(`📧 Conversation ID: ${conv.id}`);
      console.log(`   Buyer ID: ${conv.buyer_id}`);
      console.log(`   Seller ID: ${conv.seller_id}`);
      console.log(`   Last Message: "${conv.last_message}"`);
      console.log(`   Last Message At: ${conv.last_message_at}`);
      console.log(`   Seller Unread: ${conv.seller_unread_count}`);
      console.log(`   Buyer Unread: ${conv.buyer_unread_count}`);

      // Get messages for this conversation
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });

      if (msgError) {
        console.error(`   ❌ Error fetching messages:`, msgError);
      } else {
        console.log(`   💬 Messages: ${messages?.length || 0}`);
        if (messages && messages.length > 0) {
          messages.slice(0, 3).forEach((msg, idx) => {
            console.log(`      ${idx + 1}. [${msg.sender_type}] ${msg.content.substring(0, 50)}...`);
          });
        }
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkConversations();
