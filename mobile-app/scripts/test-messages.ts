/**
 * Test Script for Messaging Functionality
 * Tests buyer-seller bidirectional messaging
 * 
 * Test accounts:
 * - Buyer: anna.cruz@gmail.com / Buyer123!
 * - Seller: active.sports@bazaarph.com / Seller123! (ActiveGear Sports)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test accounts - verified to work
const TEST_BUYER = {
  email: 'anna.cruz@gmail.com',
  password: 'Buyer123!',
  name: 'Anna Cruz',
  id: '84a023ea-329d-45d4-884b-709b50df9500'  // Known buyer ID
};

const TEST_SELLER = {
  email: 'active.sports@bazaarph.com',
  password: 'Seller123!',
  name: 'ActiveGear Sports',
  sellerId: 'f6c3b3c1-e674-46ad-b38f-d79b60d14f0f'  // Known seller ID from sellers table
};

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  data?: any;
}

const results: TestResult[] = [];

async function log(test: string, passed: boolean, message: string, data?: any) {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${test}: ${message}`);
  if (data && Object.keys(data).length > 0) {
    console.log('   Data:', JSON.stringify(data, null, 2));
  }
  results.push({ test, passed, message, data });
}

async function authenticateUser(email: string, password: string, role: 'buyer' | 'seller') {
  console.log(`\n🔐 Authenticating ${role}: ${email}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    await log(`${role} Authentication`, false, error?.message || 'No user returned');
    return null;
  }

  await log(`${role} Authentication`, true, `Authenticated as ${email} (ID: ${data.user.id})`);
  return data.user;
}

async function getOrCreateConversation(buyerId: string, sellerId: string) {
  console.log('\n📝 Get/Create Conversation...');
  
  // Check if conversation exists
  const { data: existing, error: findError } = await supabase
    .from('conversations')
    .select('*')
    .eq('buyer_id', buyerId)
    .eq('seller_id', sellerId)
    .maybeSingle();

  if (findError) {
    await log('Get Existing Conversation', false, findError.message);
    return null;
  }

  if (existing) {
    await log('Get Existing Conversation', true, `Found existing conversation: ${existing.id}`);
    return existing;
  }

  // Create new conversation
  const { data: newConv, error: createError } = await supabase
    .from('conversations')
    .insert({
      buyer_id: buyerId,
      seller_id: sellerId,
      last_message: '',
      last_message_at: new Date().toISOString(),
      buyer_unread_count: 0,
      seller_unread_count: 0,
    })
    .select()
    .single();

  if (createError || !newConv) {
    await log('Create Conversation', false, createError?.message || 'No conversation returned');
    return null;
  }

  await log('Create Conversation', true, `Created new conversation: ${newConv.id}`);
  return newConv;
}

async function sendMessage(conversationId: string, senderId: string, senderType: 'buyer' | 'seller', content: string) {
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      sender_type: senderType,
      content: content,
      is_read: false,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !message) {
    await log(`Send Message (${senderType})`, false, error?.message || 'No message returned');
    return null;
  }

  // Update conversation's last message and unread count
  const unreadField = senderType === 'buyer' ? 'seller_unread_count' : 'buyer_unread_count';
  
  // Get current unread count
  const { data: conv } = await supabase
    .from('conversations')
    .select(unreadField)
    .eq('id', conversationId)
    .single();
  
  const currentCount = conv ? (conv as any)[unreadField] || 0 : 0;
  
  await supabase
    .from('conversations')
    .update({
      last_message: content.substring(0, 100),
      last_message_at: new Date().toISOString(),
      [unreadField]: currentCount + 1
    })
    .eq('id', conversationId);

  await log(`Send Message (${senderType})`, true, `Sent: "${content.substring(0, 50)}..."`);
  return message;
}

async function getMessages(conversationId: string) {
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    await log('Get Messages', false, error.message);
    return [];
  }

  await log('Get Messages', true, `Retrieved ${messages?.length || 0} messages`);
  return messages || [];
}

async function getBuyerConversations(buyerId: string) {
  console.log('\n📋 Testing Get Buyer Conversations...');
  
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('buyer_id', buyerId)
    .order('last_message_at', { ascending: false });

  if (error) {
    await log('Get Buyer Conversations', false, error.message);
    return [];
  }

  if (!conversations || conversations.length === 0) {
    await log('Get Buyer Conversations', false, 'No conversations found for buyer');
    return [];
  }

  // Get seller info
  const sellerIds = [...new Set(conversations.map(c => c.seller_id))];
  const { data: sellers } = await supabase
    .from('sellers')
    .select('id, store_name')
    .in('id', sellerIds);

  const sellerMap = new Map((sellers || []).map(s => [s.id, s]));
  
  await log('Get Buyer Conversations', true, `Found ${conversations.length} conversation(s)`);
  
  conversations.forEach((conv: any, idx: number) => {
    const seller = sellerMap.get(conv.seller_id);
    console.log(`   ${idx + 1}. With: ${seller?.store_name || 'Unknown'} | Last: "${conv.last_message?.substring(0, 30) || 'No messages'}..."`);
  });

  return conversations;
}

async function getSellerConversations(sellerId: string) {
  console.log('\n📋 Testing Get Seller Conversations...');
  
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('seller_id', sellerId)
    .order('last_message_at', { ascending: false });

  if (error) {
    await log('Get Seller Conversations', false, error.message);
    return [];
  }

  if (!conversations || conversations.length === 0) {
    await log('Get Seller Conversations', false, 'No conversations found for seller');
    return [];
  }

  // Get buyer profiles
  const buyerIds = [...new Set(conversations.map(c => c.buyer_id))];
  const { data: buyers } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', buyerIds);

  const buyerMap = new Map((buyers || []).map(b => [b.id, b]));
  
  await log('Get Seller Conversations', true, `Found ${conversations.length} conversation(s)`);
  
  conversations.forEach((conv: any, idx: number) => {
    const buyer = buyerMap.get(conv.buyer_id);
    console.log(`   ${idx + 1}. From: ${buyer?.full_name || buyer?.email || 'Unknown Buyer'} | Last: "${conv.last_message?.substring(0, 30) || 'No messages'}..."`);
  });

  return conversations;
}

async function markAsRead(conversationId: string, userId: string, userType: 'buyer' | 'seller') {
  // Mark messages from other party as read
  const otherType = userType === 'buyer' ? 'seller' : 'buyer';
  
  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .eq('sender_type', otherType)
    .eq('is_read', false);

  // Reset unread count
  const unreadField = userType === 'buyer' ? 'buyer_unread_count' : 'seller_unread_count';
  
  const { error } = await supabase
    .from('conversations')
    .update({ [unreadField]: 0 })
    .eq('id', conversationId);

  if (error) {
    await log(`Mark as Read (${userType})`, false, error.message);
    return false;
  }

  await log(`Mark as Read (${userType})`, true, 'Messages marked as read, unread count reset');
  return true;
}

async function runTests() {
  console.log('═'.repeat(60));
  console.log('🧪 MESSAGING SYSTEM TEST SUITE');
  console.log('═'.repeat(60));
  console.log(`\nBuyer: ${TEST_BUYER.email}`);
  console.log(`Seller: ${TEST_SELLER.email} (${TEST_SELLER.name})`);
  console.log('═'.repeat(60));

  let buyerUser = null;
  let sellerUser = null;
  let conversationId: string = '';

  try {
    // ===== PHASE 1: AUTHENTICATION =====
    console.log('\n\n📌 PHASE 1: AUTHENTICATION');
    console.log('-'.repeat(40));

    // Test 1: Authenticate Buyer
    buyerUser = await authenticateUser(TEST_BUYER.email, TEST_BUYER.password, 'buyer');
    if (!buyerUser) {
      console.error('\n❌ Cannot continue without buyer authentication');
      return;
    }

    // Test 2: Authenticate Seller  
    await supabase.auth.signOut();
    sellerUser = await authenticateUser(TEST_SELLER.email, TEST_SELLER.password, 'seller');
    if (!sellerUser) {
      console.error('\n❌ Cannot continue without seller authentication');
      return;
    }

    // Verify seller ID matches expected
    if (sellerUser.id !== TEST_SELLER.sellerId) {
      console.log(`   ⚠️ Note: Auth ID (${sellerUser.id}) differs from seller table ID (${TEST_SELLER.sellerId})`);
    } else {
      console.log(`   ✓ Seller ID matches: ${sellerUser.id}`);
    }

    // ===== PHASE 2: CONVERSATION MANAGEMENT =====
    console.log('\n\n📌 PHASE 2: CONVERSATION MANAGEMENT');
    console.log('-'.repeat(40));

    // Test 3: Create conversation (buyer -> seller)
    await supabase.auth.signOut();
    await supabase.auth.signInWithPassword({
      email: TEST_BUYER.email,
      password: TEST_BUYER.password,
    });

    const conversation = await getOrCreateConversation(buyerUser.id, TEST_SELLER.sellerId);
    if (!conversation) {
      console.error('\n❌ Cannot continue without conversation');
      return;
    }
    conversationId = conversation.id;

    // ===== PHASE 3: MESSAGING =====
    console.log('\n\n📌 PHASE 3: BIDIRECTIONAL MESSAGING');
    console.log('-'.repeat(40));

    // Test 4: Buyer sends first message
    console.log('\n📤 Buyer sending message...');
    await sendMessage(
      conversationId,
      buyerUser.id,
      'buyer',
      `Hello! I'm interested in your sports equipment. Do you have any running shoes available?`
    );

    // Small delay to ensure order
    await new Promise(r => setTimeout(r, 100));

    // Test 5: Seller replies
    console.log('\n📤 Seller sending reply...');
    await supabase.auth.signOut();
    await supabase.auth.signInWithPassword({
      email: TEST_SELLER.email,
      password: TEST_SELLER.password,
    });
    await sendMessage(
      conversationId,
      TEST_SELLER.sellerId,
      'seller',
      `Hi ${TEST_BUYER.name}! Yes, we have a great selection of running shoes. What size are you looking for?`
    );

    await new Promise(r => setTimeout(r, 100));

    // Test 6: Buyer sends follow-up
    console.log('\n📤 Buyer sending follow-up...');
    await supabase.auth.signOut();
    await supabase.auth.signInWithPassword({
      email: TEST_BUYER.email,
      password: TEST_BUYER.password,
    });
    await sendMessage(
      conversationId,
      buyerUser.id,
      'buyer',
      `I'm looking for size 9. Also, do you offer free delivery?`
    );

    await new Promise(r => setTimeout(r, 100));

    // Test 7: Seller sends final reply
    console.log('\n📤 Seller sending final reply...');
    await supabase.auth.signOut();
    await supabase.auth.signInWithPassword({
      email: TEST_SELLER.email,
      password: TEST_SELLER.password,
    });
    await sendMessage(
      conversationId,
      TEST_SELLER.sellerId,
      'seller',
      `Size 9 is available! We offer free delivery for orders over ₱1,500. Would you like to place an order?`
    );

    // ===== PHASE 4: MESSAGE RETRIEVAL =====
    console.log('\n\n📌 PHASE 4: MESSAGE RETRIEVAL & VERIFICATION');
    console.log('-'.repeat(40));

    // Test 8: Get all messages
    console.log('\n📥 Retrieving conversation messages...');
    const messages = await getMessages(conversationId);
    
    if (messages.length >= 4) {
      await log('Message Count', true, `All ${messages.length} messages retrieved correctly`);
      
      console.log('\n💬 Full Conversation Thread:');
      console.log('─'.repeat(50));
      messages.forEach((msg: any, idx: number) => {
        const sender = msg.sender_type === 'buyer' ? `👤 ${TEST_BUYER.name}` : `🏪 ${TEST_SELLER.name}`;
        const time = new Date(msg.created_at).toLocaleTimeString();
        console.log(`${idx + 1}. [${time}] ${sender}:`);
        console.log(`   "${msg.content}"`);
      });
      console.log('─'.repeat(50));
    } else {
      await log('Message Count', false, `Expected 4 messages, got ${messages.length}`);
    }

    // Test 9: Verify buyer messages visible
    const buyerMsgs = messages.filter((m: any) => m.sender_type === 'buyer');
    if (buyerMsgs.length === 2) {
      await log('Buyer Messages Visible', true, `${buyerMsgs.length} buyer messages found`);
    } else {
      await log('Buyer Messages Visible', false, `Expected 2 buyer messages, got ${buyerMsgs.length}`);
    }

    // Test 10: Verify seller messages visible
    const sellerMsgs = messages.filter((m: any) => m.sender_type === 'seller');
    if (sellerMsgs.length === 2) {
      await log('Seller Messages Visible', true, `${sellerMsgs.length} seller messages found`);
    } else {
      await log('Seller Messages Visible', false, `Expected 2 seller messages, got ${sellerMsgs.length}`);
    }

    // ===== PHASE 5: CONVERSATION LISTS =====
    console.log('\n\n📌 PHASE 5: CONVERSATION LISTS');
    console.log('-'.repeat(40));

    // Test 11: Buyer can see their conversations
    await supabase.auth.signOut();
    await supabase.auth.signInWithPassword({
      email: TEST_BUYER.email,
      password: TEST_BUYER.password,
    });
    await getBuyerConversations(buyerUser.id);

    // Test 12: Seller can see their conversations
    await supabase.auth.signOut();
    await supabase.auth.signInWithPassword({
      email: TEST_SELLER.email,
      password: TEST_SELLER.password,
    });
    await getSellerConversations(TEST_SELLER.sellerId);

    // ===== PHASE 6: READ STATUS =====
    console.log('\n\n📌 PHASE 6: READ STATUS MANAGEMENT');
    console.log('-'.repeat(40));

    // Test 13: Seller marks as read
    console.log('\n✓ Seller marking messages as read...');
    await markAsRead(conversationId, TEST_SELLER.sellerId, 'seller');

    // Test 14: Buyer marks as read
    console.log('\n✓ Buyer marking messages as read...');
    await supabase.auth.signOut();
    await supabase.auth.signInWithPassword({
      email: TEST_BUYER.email,
      password: TEST_BUYER.password,
    });
    await markAsRead(conversationId, buyerUser.id, 'buyer');

    // Test 15: Verify unread counts
    const { data: finalConv } = await supabase
      .from('conversations')
      .select('buyer_unread_count, seller_unread_count')
      .eq('id', conversationId)
      .single();

    if (finalConv && finalConv.buyer_unread_count === 0 && finalConv.seller_unread_count === 0) {
      await log('Unread Counts Reset', true, 'Both buyer and seller unread counts are 0');
    } else {
      await log('Unread Counts Reset', false, `Unread counts: buyer=${finalConv?.buyer_unread_count}, seller=${finalConv?.seller_unread_count}`);
    }

  } catch (error: any) {
    console.error('\n💥 Unexpected Error:', error.message);
    await log('Test Suite', false, error.message);
  } finally {
    // Sign out
    await supabase.auth.signOut();
  }

  // ===== SUMMARY =====
  console.log('\n\n' + '═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   • ${r.test}: ${r.message}`);
    });
  } else {
    console.log('\n🎉 All tests passed! Messaging system is working correctly.');
  }

  console.log('\n' + '═'.repeat(60));
  console.log('💡 To test manually:');
  console.log(`   1. Login as buyer: ${TEST_BUYER.email} / ${TEST_BUYER.password}`);
  console.log(`   2. Go to ${TEST_SELLER.name} store and click Chat`);
  console.log(`   3. Login as seller: ${TEST_SELLER.email} / ${TEST_SELLER.password}`);
  console.log(`   4. Go to Messages tab - you should see the conversation`);
  console.log('═'.repeat(60));
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
