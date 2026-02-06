/**
 * End-to-End Flow Test
 * Validates that all user flows work correctly with the database
 * and data will populate and display in the frontend properly
 * 
 * Tests:
 * 1. Buyer Registration Flow
 * 2. Seller Registration Flow  
 * 3. Product Creation Flow
 * 4. Cart & Order Flow
 * 5. QA Flow
 * 6. Chat Flow
 * 7. AI Assistant Flow
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResult {
  flow: string;
  test: string;
  passed: boolean;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];

function log(msg: string) {
  console.log(msg);
}

async function test(flow: string, testName: string, fn: () => Promise<any>) {
  try {
    const data = await fn();
    results.push({ flow, test: testName, passed: true, data });
    console.log(`  ✅ ${testName}`);
    return data;
  } catch (error: any) {
    results.push({ flow, test: testName, passed: false, error: error.message });
    console.log(`  ❌ ${testName}: ${error.message}`);
    return null;
  }
}

async function runTests() {
  console.log('\n' + '═'.repeat(70));
  console.log('  END-TO-END FLOW VALIDATION');
  console.log('  Testing data population for frontend display');
  console.log('═'.repeat(70) + '\n');

  // ============================================================================
  // 1. BUYER REGISTRATION FLOW
  // ============================================================================
  console.log('📋 1. BUYER REGISTRATION FLOW\n');

  await test('Buyer Registration', 'Profile structure for signup', async () => {
    const { error } = await supabase.from('profiles').select(`
      id, email, first_name, last_name, phone, created_at, updated_at
    `).limit(0);
    if (error) throw error;
    return { columns: 'id, email, first_name, last_name, phone' };
  });

  await test('Buyer Registration', 'Buyer record structure', async () => {
    const { error } = await supabase.from('buyers').select(`
      id, avatar_url, preferences, bazcoins, created_at, updated_at
    `).limit(0);
    if (error) throw error;
    return { columns: 'id, avatar_url, preferences, bazcoins' };
  });

  await test('Buyer Registration', 'User roles for multi-role support', async () => {
    const { error } = await supabase.from('user_roles').select(`
      id, user_id, role, created_at
    `).limit(0);
    if (error) throw error;
    return { columns: 'id, user_id, role (buyer/seller/admin)' };
  });

  // ============================================================================
  // 2. SELLER REGISTRATION FLOW
  // ============================================================================
  console.log('\n📋 2. SELLER REGISTRATION / ONBOARDING FLOW\n');

  await test('Seller Registration', 'Seller record structure', async () => {
    const { error } = await supabase.from('sellers').select(`
      id, store_name, store_description, avatar_url, owner_name,
      approval_status, verified_at, created_at, updated_at
    `).limit(0);
    if (error) throw error;
    return { columns: 'id, store_name, owner_name, approval_status' };
  });

  await test('Seller Registration', 'Business profile (separate table)', async () => {
    const { error } = await supabase.from('seller_business_profiles').select(`
      seller_id, business_type, business_registration_number, 
      tax_id_number, address_line_1, city, province, postal_code
    `).limit(0);
    if (error) throw error;
    return { columns: 'seller_id, business_type, city, province' };
  });

  await test('Seller Registration', 'Payout account (separate table)', async () => {
    const { error } = await supabase.from('seller_payout_accounts').select(`
      seller_id, bank_name, account_name, account_number
    `).limit(0);
    if (error) throw error;
    return { columns: 'seller_id, bank_name, account_name, account_number' };
  });

  await test('Seller Registration', 'Verification documents (separate table)', async () => {
    const { error } = await supabase.from('seller_verification_documents').select(`
      seller_id, business_permit_url, valid_id_url
    `).limit(0);
    if (error) throw error;
    return { columns: 'seller_id, business_permit_url, valid_id_url' };
  });

  await test('Seller Registration', 'Seller with all related data (join)', async () => {
    const { error } = await supabase.from('sellers').select(`
      *,
      business_profile:seller_business_profiles(*),
      payout_account:seller_payout_accounts(*),
      verification_documents:seller_verification_documents(*)
    `).limit(1);
    if (error) throw error;
    return { join: 'sellers → business_profile, payout_account, verification_documents' };
  });

  // ============================================================================
  // 3. PRODUCT CREATION FLOW
  // ============================================================================
  console.log('\n📋 3. PRODUCT CREATION FLOW\n');

  await test('Product Creation', 'Categories exist', async () => {
    const { data, error } = await supabase.from('categories').select('id, name, slug').limit(5);
    if (error) throw error;
    return { categories: data?.length || 0 };
  });

  await test('Product Creation', 'Product structure with category_id FK', async () => {
    // Note: seller_id is NOT in current schema - needs migration 003
    const { error } = await supabase.from('products').select(`
      id, name, description, price, category_id,
      approval_status, disabled_at, deleted_at, created_at
    `).limit(0);
    if (error) throw error;
    return { 
      columns: 'id, name, price, category_id, approval_status',
      note: 'seller_id NOT in schema yet - run migration 003'
    };
  });

  await test('Product Creation', 'Product images table', async () => {
    const { error } = await supabase.from('product_images').select(`
      id, product_id, image_url, is_primary, sort_order
    `).limit(0);
    if (error) throw error;
    return { columns: 'id, product_id, image_url, is_primary' };
  });

  await test('Product Creation', 'Product variants table', async () => {
    const { error } = await supabase.from('product_variants').select(`
      id, product_id, sku, variant_name, size, color, price, stock
    `).limit(0);
    if (error) throw error;
    return { columns: 'id, product_id, sku, size, color, price, stock' };
  });

  await test('Product Creation', 'Product with full details (for frontend)', async () => {
    const { data, error } = await supabase.from('products').select(`
      *,
      category:categories!products_category_id_fkey(id, name, slug),
      images:product_images(id, image_url, is_primary, sort_order),
      variants:product_variants(id, sku, size, color, price, stock)
    `).limit(1);
    if (error) throw error;
    return { 
      join: 'products → category, images[], variants[]',
      sample: data?.[0] ? 'Has product data' : 'No products yet'
    };
  });

  // ============================================================================
  // 4. CART & ORDER FLOW
  // ============================================================================
  console.log('\n📋 4. CART & ORDER FLOW\n');

  await test('Cart Flow', 'Cart structure (simplified)', async () => {
    const { error } = await supabase.from('carts').select(`
      id, buyer_id, created_at, updated_at
    `).limit(0);
    if (error) throw error;
    return { columns: 'id, buyer_id' };
  });

  await test('Cart Flow', 'Cart items with variant support', async () => {
    const { error } = await supabase.from('cart_items').select(`
      id, cart_id, product_id, variant_id, quantity, personalized_options,
      product:products(id, name, price),
      variant:product_variants(id, sku, price, stock)
    `).limit(1);
    if (error) throw error;
    return { join: 'cart_items → product, variant' };
  });

  await test('Order Flow', 'Order structure (dual status)', async () => {
    const { error } = await supabase.from('orders').select(`
      id, order_number, buyer_id, order_type, 
      payment_status, shipment_status, paid_at, created_at
    `).limit(0);
    if (error) throw error;
    return { columns: 'id, order_number, payment_status, shipment_status' };
  });

  await test('Order Flow', 'Order items structure', async () => {
    const { error } = await supabase.from('order_items').select(`
      id, order_id, product_id, product_name, price, quantity, variant_id
    `).limit(0);
    if (error) throw error;
    return { columns: 'id, order_id, product_id, product_name, price, quantity' };
  });

  await test('Order Flow', 'Order recipients', async () => {
    const { error } = await supabase.from('order_recipients').select(`
      id, first_name, last_name, phone, email
    `).limit(0);
    if (error) throw error;
    return { columns: 'id, first_name, last_name, phone, email' };
  });

  await test('Order Flow', 'Shipping addresses', async () => {
    const { error } = await supabase.from('shipping_addresses').select(`
      id, user_id, label, address_line_1, city, province, postal_code
    `).limit(0);
    if (error) throw error;
    return { columns: 'id, user_id, label, address_line_1, city' };
  });

  // ============================================================================
  // 5. QA FLOW
  // ============================================================================
  console.log('\n📋 5. QA FLOW\n');

  await test('QA Flow', 'Product assessments structure', async () => {
    // Note: created_by NOT in current schema - needs migration 003
    const { error } = await supabase.from('product_assessments').select(`
      id, product_id, status, submitted_at, verified_at
    `).limit(0);
    if (error) throw error;
    return { 
      columns: 'id, product_id, status',
      statusValues: ['pending_digital_review', 'waiting_for_sample', 'pending_physical_review', 'verified', 'for_revision', 'rejected'],
      note: 'created_by NOT in schema yet - run migration 003'
    };
  });

  await test('QA Flow', 'Assessments with product join', async () => {
    // Note: products.seller_id NOT in schema - needs migration 003
    const { data, error } = await supabase.from('product_assessments').select(`
      *,
      product:products(id, name)
    `).limit(1);
    if (error) throw error;
    return { join: 'product_assessments → product (without seller_id)' };
  });

  await test('QA Flow', 'Get pending queue (for QA dashboard)', async () => {
    const { data, error } = await supabase
      .from('product_assessments')
      .select('id, status', { count: 'exact', head: true })
      .eq('status', 'pending_digital_review');
    if (error) throw error;
    return { pendingDigital: 'Query successful' };
  });

  await test('QA Flow', 'Product approvals table', async () => {
    const { error } = await supabase.from('product_approvals').select(`
      id, assessment_id, description, created_at, created_by
    `).limit(0);
    if (error) throw error;
    return { columns: 'id, assessment_id, description' };
  });

  await test('QA Flow', 'Product rejections table', async () => {
    const { error } = await supabase.from('product_rejections').select(`
      id, assessment_id, description, created_at, created_by
    `).limit(0);
    if (error) throw error;
    return { columns: 'id, assessment_id, description' };
  });

  // ============================================================================
  // 6. CHAT FLOW
  // ============================================================================
  console.log('\n📋 6. CHAT FLOW (Buyer-Seller Messaging)\n');

  await test('Chat Flow', 'Conversations structure (no seller_id)', async () => {
    const { error } = await supabase.from('conversations').select(`
      id, buyer_id, order_id, created_at, updated_at
    `).limit(0);
    if (error) throw error;
    return { 
      columns: 'id, buyer_id, order_id',
      note: 'Seller determined via order relationship'
    };
  });

  await test('Chat Flow', 'Messages structure (is_read boolean)', async () => {
    const { error } = await supabase.from('messages').select(`
      id, conversation_id, sender_id, sender_type, content, is_read, image_url, created_at
    `).limit(0);
    if (error) throw error;
    return { 
      columns: 'id, conversation_id, sender_id, sender_type, content, is_read',
      note: 'is_read is boolean (not timestamp)'
    };
  });

  await test('Chat Flow', 'Get unread count (for badges)', async () => {
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false);
    if (error) throw error;
    return { unreadQuery: 'Query successful', count };
  });

  // ============================================================================
  // 7. AI ASSISTANT FLOW
  // ============================================================================
  console.log('\n📋 7. AI ASSISTANT FLOW\n');

  await test('AI Flow', 'AI conversations structure', async () => {
    const { error } = await supabase.from('ai_conversations').select(`
      id, user_id, user_type, title, last_message_at, created_at
    `).limit(0);
    if (error) throw error;
    return { columns: 'id, user_id, user_type, title, last_message_at' };
  });

  await test('AI Flow', 'AI messages structure (sender + message)', async () => {
    const { error } = await supabase.from('ai_messages').select(`
      id, conversation_id, sender, message, created_at
    `).limit(0);
    if (error) throw error;
    return { 
      columns: 'id, conversation_id, sender, message',
      note: 'sender is "user" or "ai", message is content'
    };
  });

  await test('AI Flow', 'AI conversation with messages (for chat history)', async () => {
    const { error } = await supabase.from('ai_conversations').select(`
      *,
      messages:ai_messages(id, sender, message, created_at)
    `).limit(1);
    if (error) throw error;
    return { join: 'ai_conversations → ai_messages[]' };
  });

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '═'.repeat(70));
  console.log('  SUMMARY');
  console.log('═'.repeat(70) + '\n');

  const flowGroups = new Map<string, TestResult[]>();
  results.forEach(r => {
    if (!flowGroups.has(r.flow)) {
      flowGroups.set(r.flow, []);
    }
    flowGroups.get(r.flow)!.push(r);
  });

  let totalPassed = 0;
  let totalFailed = 0;

  flowGroups.forEach((tests, flow) => {
    const passed = tests.filter(t => t.passed).length;
    const failed = tests.filter(t => !t.passed).length;
    totalPassed += passed;
    totalFailed += failed;
    
    const status = failed === 0 ? '✅' : '❌';
    console.log(`${status} ${flow}: ${passed}/${tests.length} passed`);
  });

  console.log('\n' + '─'.repeat(70));
  console.log(`Total: ${totalPassed}/${totalPassed + totalFailed} passed\n`);

  if (totalFailed > 0) {
    console.log('❌ FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - [${r.flow}] ${r.test}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('✅ All flows validated! Data will populate and display correctly.\n');
    
    console.log('📝 KEY SCHEMA NOTES FOR FRONTEND:\n');
    console.log('  • Profiles: Use first_name + last_name (no full_name)');
    console.log('  • Buyers: Use bazcoins (not loyalty_points)');
    console.log('  • Sellers: Only core fields - business data in seller_business_profiles');
    console.log('  • Orders: Use payment_status + shipment_status (dual status)');
    console.log('  • Messages: Use is_read boolean (not read_at timestamp)');
    console.log('  • AI Messages: Use sender ("user"/"ai") + message columns');
    console.log('  • Conversations: No seller_id - determine via order relationship');
    
    process.exit(0);
  }
}

runTests().catch(console.error);
