/**
 * Test Messages System - Web Version
 * Tests chat functionality between buyers and sellers
 * Both frontend (chatService) and backend (Supabase)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test accounts
const BUYER = {
  email: 'anna.cruz@gmail.com',
  password: 'Buyer123!',
  id: '84a023ea-329d-45d4-884b-709b50df9500'
};

const SELLER = {
  email: 'active.sports@bazaarph.com',
  password: 'Seller123!',
  authId: '', // Will be filled after auth
  sellerId: 'f6c3b3c1-e674-46ad-b38f-d79b60d14f0f'
};

let testsPassed = 0;
let testsFailed = 0;
let conversationId = '';

function log(emoji: string, message: string) {
  console.log(`${emoji} ${message}`);
}

function pass(test: string) {
  testsPassed++;
  log('✅', test);
}

function fail(test: string, error?: any) {
  testsFailed++;
  log('❌', `${test}${error ? ': ' + error.message : ''}`);
}

async function test1_BuyerAuth() {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: BUYER.email,
      password: BUYER.password
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned');
    if (data.user.id !== BUYER.id) throw new Error('User ID mismatch');

    pass('Test 1: Buyer authentication');
  } catch (error) {
    fail('Test 1: Buyer authentication', error);
  }
}

async function test2_SellerAuth() {
  try {
    // Sign out first
    await supabase.auth.signOut();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: SELLER.email,
      password: SELLER.password
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned');

    SELLER.authId = data.user.id;
    pass('Test 2: Seller authentication');
  } catch (error) {
    fail('Test 2: Seller authentication', error);
  }
}

async function test3_CheckConversationsTable() {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .limit(1);

    if (error) throw error;
    pass('Test 3: Conversations table accessible');
  } catch (error) {
    fail('Test 3: Conversations table accessible', error);
  }
}

async function test4_CheckMessagesTable() {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .limit(1);

    if (error) throw error;
    pass('Test 4: Messages table accessible');
  } catch (error) {
    fail('Test 4: Messages table accessible', error);
  }
}

async function test5_GetOrCreateConversation() {
  try {
    // Sign in as buyer
    await supabase.auth.signOut();
    await supabase.auth.signInWithPassword({
      email: BUYER.email,
      password: BUYER.password
    });

    // Check if conversation exists
    const { data: existing, error: findError } = await supabase
      .from('conversations')
      .select('*')
      .eq('buyer_id', BUYER.id)
      .eq('seller_id', SELLER.sellerId)
      .single();

    if (existing) {
      conversationId = existing.id;
      pass('Test 5: Found existing conversation');
      return;
    }

    // Create new conversation
    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert({
        buyer_id: BUYER.id,
        seller_id: SELLER.sellerId,
        last_message: 'Test conversation',
        last_message_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) throw createError;
    if (!newConv) throw new Error('No conversation created');

    conversationId = newConv.id;
    pass('Test 5: Created new conversation');
  } catch (error) {
    fail('Test 5: Get or create conversation', error);
  }
}

async function test6_BuyerSendMessage() {
  try {
    if (!conversationId) throw new Error('No conversation ID');

    const messageContent = `Test message from buyer at ${new Date().toLocaleTimeString()}`;

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: BUYER.id,
        sender_type: 'buyer',
        content: messageContent
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('No message returned');
    if (data.content !== messageContent) throw new Error('Content mismatch');

    // Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message: messageContent,
        last_message_at: new Date().toISOString(),
        seller_unread_count: 1
      })
      .eq('id', conversationId);

    pass('Test 6: Buyer sends message');
  } catch (error) {
    fail('Test 6: Buyer sends message', error);
  }
}

async function test7_SellerReceivesMessages() {
  try {
    // Sign in as seller
    await supabase.auth.signOut();
    await supabase.auth.signInWithPassword({
      email: SELLER.email,
      password: SELLER.password
    });

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No messages found');

    const hasBuyerMessage = data.some(msg => msg.sender_type === 'buyer');
    if (!hasBuyerMessage) throw new Error('No buyer messages found');

    pass('Test 7: Seller receives buyer messages');
  } catch (error) {
    fail('Test 7: Seller receives buyer messages', error);
  }
}

async function test8_SellerSendMessage() {
  try {
    const messageContent = `Test reply from seller at ${new Date().toLocaleTimeString()}`;

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: SELLER.sellerId,
        sender_type: 'seller',
        content: messageContent
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('No message returned');

    // Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message: messageContent,
        last_message_at: new Date().toISOString(),
        buyer_unread_count: 1
      })
      .eq('id', conversationId);

    pass('Test 8: Seller sends message');
  } catch (error) {
    fail('Test 8: Seller sends message', error);
  }
}

async function test9_BuyerReceivesSellerReply() {
  try {
    // Sign in as buyer
    await supabase.auth.signOut();
    await supabase.auth.signInWithPassword({
      email: BUYER.email,
      password: BUYER.password
    });

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No messages found');

    const hasSellerMessage = data.some(msg => msg.sender_type === 'seller');
    if (!hasSellerMessage) throw new Error('No seller messages found');

    pass('Test 9: Buyer receives seller reply');
  } catch (error) {
    fail('Test 9: Buyer receives seller reply', error);
  }
}

async function test10_GetBuyerConversations() {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        seller:sellers!conversations_seller_id_fkey(
          id,
          store_name,
          business_name
        )
      `)
      .eq('buyer_id', BUYER.id)
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No conversations found');

    const hasTestConv = data.some(conv => conv.id === conversationId);
    if (!hasTestConv) throw new Error('Test conversation not found');

    pass('Test 10: Get buyer conversations with seller info');
  } catch (error) {
    fail('Test 10: Get buyer conversations with seller info', error);
  }
}

async function test11_GetSellerConversations() {
  try {
    // Sign in as seller
    await supabase.auth.signOut();
    await supabase.auth.signInWithPassword({
      email: SELLER.email,
      password: SELLER.password
    });

    // First, just get conversations without joining
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('seller_id', SELLER.sellerId)
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No conversations found');

    const hasTestConv = data.some(conv => conv.id === conversationId);
    if (!hasTestConv) throw new Error('Test conversation not found');

    pass('Test 11: Get seller conversations');
  } catch (error) {
    fail('Test 11: Get seller conversations', error);
  }
}

async function test12_MarkAsRead() {
  try {
    // Mark buyer messages as read by seller
    const { error } = await supabase
      .from('conversations')
      .update({ seller_unread_count: 0 })
      .eq('id', conversationId);

    if (error) throw error;

    // Verify
    const { data, error: verifyError } = await supabase
      .from('conversations')
      .select('seller_unread_count')
      .eq('id', conversationId)
      .single();

    if (verifyError) throw verifyError;
    if (data.seller_unread_count !== 0) throw new Error('Unread count not updated');

    pass('Test 12: Mark messages as read');
  } catch (error) {
    fail('Test 12: Mark messages as read', error);
  }
}

async function test13_RealtimeSubscription() {
  try {
    // This tests that the subscription channel can be created
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        // Callback for new messages
      });

    await channel.subscribe();
    
    // Unsubscribe after test
    setTimeout(() => {
      supabase.removeChannel(channel);
    }, 1000);

    pass('Test 13: Realtime subscription setup');
  } catch (error) {
    fail('Test 13: Realtime subscription setup', error);
  }
}

async function test14_SendMultipleMessages() {
  try {
    const messages = [
      'First test message',
      'Second test message',
      'Third test message'
    ];

    for (const content of messages) {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: SELLER.sellerId,
          sender_type: 'seller',
          content
        });

      if (error) throw error;
    }

    // Verify all messages
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId);

    if (error) throw error;
    if (!data || data.length < 3) throw new Error('Not all messages saved');

    pass('Test 14: Send multiple messages');
  } catch (error) {
    fail('Test 14: Send multiple messages', error);
  }
}

async function test15_MessageOrdering() {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No messages found');

    // Verify chronological order
    for (let i = 1; i < data.length; i++) {
      const prev = new Date(data[i - 1].created_at);
      const curr = new Date(data[i].created_at);
      if (curr < prev) throw new Error('Messages not in chronological order');
    }

    pass('Test 15: Messages in correct chronological order');
  } catch (error) {
    fail('Test 15: Messages in correct chronological order', error);
  }
}

async function test16_ConversationUpdatedAt() {
  try {
    const { data: before, error: beforeError } = await supabase
      .from('conversations')
      .select('last_message_at')
      .eq('id', conversationId)
      .single();

    if (beforeError) throw beforeError;

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Send a message and update conversation
    const newContent = 'Test last_message_at update';
    const newTimestamp = new Date().toISOString();
    
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: SELLER.sellerId,
        sender_type: 'seller',
        content: newContent
      });

    await supabase
      .from('conversations')
      .update({
        last_message: newContent,
        last_message_at: newTimestamp
      })
      .eq('id', conversationId);

    const { data: after, error: afterError } = await supabase
      .from('conversations')
      .select('last_message_at')
      .eq('id', conversationId)
      .single();

    if (afterError) throw afterError;

    const beforeTime = new Date(before.last_message_at);
    const afterTime = new Date(after.last_message_at);

    if (afterTime <= beforeTime) throw new Error('last_message_at not updated');

    pass('Test 16: Conversation last_message_at updates on new message');
  } catch (error) {
    fail('Test 16: Conversation last_message_at updates on new message', error);
  }
}

async function runTests() {
  console.log('\n🧪 Starting Messages System Tests - Web Version\n');
  console.log('================================================\n');

  await test1_BuyerAuth();
  await test2_SellerAuth();
  await test3_CheckConversationsTable();
  await test4_CheckMessagesTable();
  await test5_GetOrCreateConversation();
  await test6_BuyerSendMessage();
  await test7_SellerReceivesMessages();
  await test8_SellerSendMessage();
  await test9_BuyerReceivesSellerReply();
  await test10_GetBuyerConversations();
  await test11_GetSellerConversations();
  await test12_MarkAsRead();
  await test13_RealtimeSubscription();
  await test14_SendMultipleMessages();
  await test15_MessageOrdering();
  await test16_ConversationUpdatedAt();

  console.log('\n================================================');
  console.log(`\n📊 Results: ${testsPassed}/${testsPassed + testsFailed} tests passed`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! Messages system is working correctly.\n');
  } else {
    console.log(`\n⚠️  ${testsFailed} test(s) failed. Please review the errors above.\n`);
  }

  // Sign out
  await supabase.auth.signOut();
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests();
