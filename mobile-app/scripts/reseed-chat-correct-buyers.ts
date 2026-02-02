/**
 * Reseed Chat Messages with CORRECT Buyer Accounts
 * Clears existing conversations and creates new ones with the seeded buyer accounts
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

// Correct buyer emails from our seed script
const BUYER_EMAILS = [
  'anna.cruz@gmail.com',
  'miguel.santos@gmail.com',
  'sofia.reyes@gmail.com',
  'carlos.garcia@gmail.com',
  'isabella.fernandez@gmail.com',
  'rafael.mendoza@gmail.com',
  'gabriela.torres@gmail.com',
  'daniel.villanueva@gmail.com',
];

// Sample messages
const MESSAGE_TEMPLATES = [
  { sender: 'buyer', text: 'Hi! Is this item still available?' },
  { sender: 'seller', text: 'Yes, it\'s in stock! Would you like to order?' },
  { sender: 'buyer', text: 'Great! Can you ship today?' },
  { sender: 'seller', text: 'Yes! Orders before 4PM ship same day. 📦' },
  { sender: 'buyer', text: 'Perfect! I\'ll order now. Thanks!' },
];

async function reseedConversations() {
  console.log('============================================================');
  console.log('RESEEDING CONVERSATIONS WITH CORRECT BUYERS');
  console.log('============================================================\n');

  // 1. Clear existing conversations
  console.log('🗑️  Clearing old conversations...');
  const { error: deleteError } = await supabase
    .from('conversations')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.log('⚠️  Error clearing conversations:', deleteError.message);
  } else {
    console.log('✅ Old conversations cleared\n');
  }

  // 2. Get buyers from profiles
  console.log('📥 Fetching buyer profiles...');
  const { data: buyers, error: buyerError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('email', BUYER_EMAILS);

  if (buyerError || !buyers) {
    console.error('❌ Error fetching buyers:', buyerError?.message);
    return;
  }

  console.log(`✅ Found ${buyers.length} buyers\n`);

  // 3. Get sellers
  console.log('📥 Fetching sellers...');
  const { data: sellers, error: sellerError } = await supabase
    .from('sellers')
    .select('id, store_name')
    .eq('approval_status', 'approved')
    .limit(5);

  if (sellerError || !sellers) {
    console.error('❌ Error fetching sellers:', sellerError?.message);
    return;
  }

  console.log(`✅ Found ${sellers.length} sellers\n`);

  // 4. Create conversations
  let conversationCount = 0;
  let messageCount = 0;

  for (const buyer of buyers) {
    // Each buyer gets 2-3 random sellers
    const numConvs = Math.floor(Math.random() * 2) + 2; // 2 or 3
    const shuffled = [...sellers].sort(() => 0.5 - Math.random());
    const selectedSellers = shuffled.slice(0, numConvs);

    for (const seller of selectedSellers) {
      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          buyer_id: buyer.id,
          seller_id: seller.id,
          last_message: MESSAGE_TEMPLATES[MESSAGE_TEMPLATES.length - 1].text,
          last_message_at: new Date().toISOString(),
          buyer_unread_count: Math.floor(Math.random() * 2), // 0 or 1
          seller_unread_count: Math.floor(Math.random() * 2), // 0 or 1
        })
        .select()
        .single();

      if (convError) {
        console.log(`  ❌ Error creating conversation: ${buyer.email} ↔ ${seller.store_name}`);
        continue;
      }

      console.log(`  ✅ Created: ${buyer.full_name || buyer.email} ↔ ${seller.store_name}`);
      conversationCount++;

      // Create messages
      for (const template of MESSAGE_TEMPLATES) {
        const { error: msgError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            sender_id: template.sender === 'buyer' ? buyer.id : seller.id,
            sender_type: template.sender,
            content: template.text,
            is_read: true,
          });

        if (!msgError) {
          messageCount++;
        }
      }
    }
  }

  console.log('\n============================================================');
  console.log('RESEEDING COMPLETE');
  console.log('============================================================');
  console.log(`✅ Conversations created: ${conversationCount}`);
  console.log(`✅ Messages created: ${messageCount}`);
  console.log('\n📊 DATABASE STATS');
  
  const { count: totalConvs } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true });
  
  const { count: totalMsgs } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true });

  console.log(`💬 Total conversations: ${totalConvs}`);
  console.log(`📝 Total messages: ${totalMsgs}`);
  console.log('============================================================');
}

reseedConversations().catch(console.error);
