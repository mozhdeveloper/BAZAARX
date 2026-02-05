/**
 * Seed Chat Messages Script
 * Creates conversations and messages tables, then populates with sample data
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

// Sample conversation starters and messages
const conversationTemplates = [
  {
    topic: 'product_inquiry',
    messages: [
      { sender: 'buyer', text: 'Hi! Is this item still available?' },
      { sender: 'seller', text: 'Yes, it\'s in stock! Would you like to order?' },
      { sender: 'buyer', text: 'Great! Does it come in other colors?' },
      { sender: 'seller', text: 'We have Black, White, and Navy Blue. Which one would you prefer?' },
      { sender: 'buyer', text: 'I\'ll take the Navy Blue. Thanks!' },
    ]
  },
  {
    topic: 'shipping',
    messages: [
      { sender: 'buyer', text: 'Hello! When can you ship my order?' },
      { sender: 'seller', text: 'Hi! Orders placed before 4PM ship the same day. 📦' },
      { sender: 'buyer', text: 'Perfect! I just placed an order.' },
      { sender: 'seller', text: 'We\'ve received it! It will be shipped today. You\'ll get a tracking number soon.' },
      { sender: 'buyer', text: 'Thank you so much! 😊' },
    ]
  },
  {
    topic: 'discount',
    messages: [
      { sender: 'buyer', text: 'Do you have any discounts for bulk orders?' },
      { sender: 'seller', text: 'Yes! Orders of 5+ items get 10% off, and 10+ items get 15% off.' },
      { sender: 'buyer', text: 'That\'s great! I need 8 pieces for my team.' },
      { sender: 'seller', text: 'Wonderful! Use code TEAM10 at checkout for your 10% discount.' },
      { sender: 'buyer', text: 'Applied it. Thanks for the help!' },
      { sender: 'seller', text: 'You\'re welcome! Let us know if you need anything else. 🙌' },
    ]
  },
  {
    topic: 'delivery',
    messages: [
      { sender: 'buyer', text: 'Hi, I received my order but one item is missing.' },
      { sender: 'seller', text: 'We\'re so sorry about that! Can you tell me which item is missing?' },
      { sender: 'buyer', text: 'The blue phone case. I ordered 2 but only got 1.' },
      { sender: 'seller', text: 'Let me check... You\'re right! We\'ll ship the missing item today with express delivery, no extra charge.' },
      { sender: 'buyer', text: 'Thank you for the quick response!' },
      { sender: 'seller', text: 'We apologize for the inconvenience. As a token, here\'s a ₱50 voucher: SORRY50' },
    ]
  },
  {
    topic: 'product_question',
    messages: [
      { sender: 'buyer', text: 'Is this product authentic/original?' },
      { sender: 'seller', text: 'Yes, 100% authentic! We\'re an authorized retailer. All items come with official warranty.' },
      { sender: 'buyer', text: 'Do you have a certificate of authenticity?' },
      { sender: 'seller', text: 'Absolutely! Every purchase includes the original certificate and receipt.' },
      { sender: 'buyer', text: 'Perfect, I\'ll order now.' },
    ]
  },
  {
    topic: 'thank_you',
    messages: [
      { sender: 'buyer', text: 'Just received my order! It\'s beautiful! 💕' },
      { sender: 'seller', text: 'Thank you so much! We\'re glad you love it! 🎉' },
      { sender: 'buyer', text: 'Already wore it today. Got so many compliments!' },
      { sender: 'seller', text: 'That makes us so happy! Would you mind leaving a review? It really helps our small business.' },
      { sender: 'buyer', text: 'Of course! 5 stars coming your way! ⭐⭐⭐⭐⭐' },
      { sender: 'seller', text: 'You\'re the best! Here\'s 10% off your next order: THANKS10' },
    ]
  },
  {
    topic: 'size_inquiry',
    messages: [
      { sender: 'buyer', text: 'What size should I get? I\'m usually Medium in other brands.' },
      { sender: 'seller', text: 'Our sizing runs slightly small. I\'d recommend going one size up!' },
      { sender: 'buyer', text: 'So Large would be good?' },
      { sender: 'seller', text: 'Yes, Large should be perfect for you. We also have a size chart in the product description.' },
      { sender: 'buyer', text: 'Got it, ordering Large now. Thanks!' },
    ]
  },
  {
    topic: 'return_policy',
    messages: [
      { sender: 'buyer', text: 'What\'s your return policy?' },
      { sender: 'seller', text: 'We accept returns within 7 days of delivery. Items must be unused with tags attached.' },
      { sender: 'buyer', text: 'Is return shipping free?' },
      { sender: 'seller', text: 'Yes, we provide free return labels for all orders!' },
      { sender: 'buyer', text: 'That\'s reassuring. I\'ll place my order.' },
    ]
  },
];

async function seedChatMessages() {
  console.log('============================================================');
  console.log('SEEDING CHAT MESSAGES');
  console.log('============================================================\n');

  // Check if tables exist
  const { error: convCheckError } = await supabase
    .from('conversations')
    .select('id')
    .limit(1);

  if (convCheckError) {
    console.log('⚠️  Conversations table does not exist. Please create it in Supabase dashboard.');
    console.log('\n📋 Run this SQL in Supabase SQL Editor:\n');
    console.log(`
-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  last_message TEXT DEFAULT '',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  buyer_unread_count INTEGER DEFAULT 0,
  seller_unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(buyer_id, seller_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('buyer', 'seller')),
  content TEXT NOT NULL,
  image_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id ON public.conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id ON public.conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view their own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can update their own conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can delete their own conversations"
  ON public.conversations FOR DELETE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  USING (sender_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    `);
    return;
  }

  // Get buyers and sellers
  console.log('📥 Fetching buyers and sellers...\n');

  const { data: buyers, error: buyersError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('user_type', 'buyer')
    .limit(8);

  if (buyersError || !buyers?.length) {
    console.error('❌ No buyers found:', buyersError?.message);
    return;
  }

  const { data: sellers, error: sellersError } = await supabase
    .from('sellers')
    .select('id, store_name')
    .eq('approval_status', 'approved')
    .limit(8);

  if (sellersError || !sellers?.length) {
    console.error('❌ No sellers found:', sellersError?.message);
    return;
  }

  console.log(`👤 Found ${buyers.length} buyers`);
  console.log(`🏪 Found ${sellers.length} sellers\n`);

  let conversationsCreated = 0;
  let messagesCreated = 0;

  // Create conversations between buyers and sellers
  for (let i = 0; i < buyers.length; i++) {
    const buyer = buyers[i];
    
    // Each buyer chats with 2-3 random sellers
    const numSellers = 2 + Math.floor(Math.random() * 2);
    const shuffledSellers = [...sellers].sort(() => Math.random() - 0.5).slice(0, numSellers);

    for (const seller of shuffledSellers) {
      // Check if conversation exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('buyer_id', buyer.id)
        .eq('seller_id', seller.id)
        .single();

      let conversationId: string;

      if (existing) {
        conversationId = existing.id;
        console.log(`  ↳ Conversation exists: ${buyer.full_name || buyer.email} ↔ ${seller.store_name}`);
      } else {
        // Create conversation
        const template = conversationTemplates[Math.floor(Math.random() * conversationTemplates.length)];
        const lastMessage = template.messages[template.messages.length - 1];

        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            buyer_id: buyer.id,
            seller_id: seller.id,
            last_message: lastMessage.text,
            last_message_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            buyer_unread_count: lastMessage.sender === 'seller' ? Math.floor(Math.random() * 2) : 0,
            seller_unread_count: lastMessage.sender === 'buyer' ? Math.floor(Math.random() * 2) : 0,
          })
          .select()
          .single();

        if (convError) {
          console.error(`  ❌ Error creating conversation:`, convError.message);
          continue;
        }

        conversationId = newConv.id;
        conversationsCreated++;
        console.log(`  ✅ Created: ${buyer.full_name || buyer.email} ↔ ${seller.store_name}`);

        // Add messages
        const baseTime = Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000; // Within last 5 days
        
        for (let j = 0; j < template.messages.length; j++) {
          const msg = template.messages[j];
          const msgTime = new Date(baseTime + j * (Math.random() * 30 + 5) * 60 * 1000); // 5-35 min apart

          const { error: msgError } = await supabase
            .from('messages')
            .insert({
              conversation_id: conversationId,
              sender_id: msg.sender === 'buyer' ? buyer.id : seller.id,
              sender_type: msg.sender,
              content: msg.text,
              is_read: j < template.messages.length - 1, // Last message might be unread
              created_at: msgTime.toISOString(),
            });

          if (!msgError) {
            messagesCreated++;
          }
        }
      }
    }
  }

  console.log('\n============================================================');
  console.log('SEEDING COMPLETE');
  console.log('============================================================');
  console.log(`✅ Conversations created: ${conversationsCreated}`);
  console.log(`✅ Messages created: ${messagesCreated}`);

  // Final stats
  const { count: totalConversations } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true });

  const { count: totalMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true });

  console.log('\n📊 DATABASE STATS');
  console.log(`💬 Total conversations: ${totalConversations}`);
  console.log(`📝 Total messages: ${totalMessages}`);
  console.log('============================================================\n');
}

seedChatMessages().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
