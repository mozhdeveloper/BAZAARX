/**
 * Flow Validation Test
 * Validates that all major flows work with the actual database schema
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

async function runTests() {
  console.log('\n🔍 FLOW VALIDATION TESTS\n');
  console.log('='.repeat(60) + '\n');

  // ============================================================================
  // 1. AUTH FLOW - User registration and role assignment
  // ============================================================================
  console.log('📋 1. AUTH FLOW\n');

  await test('Can query profiles table with correct columns', async () => {
    const { error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, phone, created_at, updated_at')
      .limit(0);
    if (error) throw error;
  });

  await test('Can query user_roles for multi-role support', async () => {
    const { error } = await supabase
      .from('user_roles')
      .select('id, user_id, role, created_at')
      .limit(0);
    if (error) throw error;
  });

  await test('Can query buyers table with bazcoins', async () => {
    const { error } = await supabase
      .from('buyers')
      .select('id, avatar_url, preferences, bazcoins, created_at, updated_at')
      .limit(0);
    if (error) throw error;
  });

  await test('Can query sellers table with approval_status', async () => {
    const { error } = await supabase
      .from('sellers')
      .select('id, store_name, store_description, avatar_url, owner_name, approval_status, verified_at')
      .limit(0);
    if (error) throw error;
  });

  // ============================================================================
  // 2. PRODUCT FLOW - Product creation and management
  // ============================================================================
  console.log('\n📋 2. PRODUCT FLOW\n');

  await test('Can query products with category join', async () => {
    const { error } = await supabase
      .from('products')
      .select(`
        id, name, description, price, category_id, approval_status,
        category:categories(id, name, slug)
      `)
      .limit(1);
    if (error) throw error;
  });

  await test('Can query product_images', async () => {
    const { error } = await supabase
      .from('product_images')
      .select('id, product_id, image_url, is_primary, sort_order')
      .limit(0);
    if (error) throw error;
  });

  await test('Can query product_variants', async () => {
    const { error } = await supabase
      .from('product_variants')
      .select('id, product_id, sku, variant_name, size, color, price, stock')
      .limit(0);
    if (error) throw error;
  });

  await test('Can query products with images and variants', async () => {
    const { error } = await supabase
      .from('products')
      .select(`
        *,
        images:product_images(id, image_url, is_primary),
        variants:product_variants(id, sku, size, color, price, stock)
      `)
      .limit(1);
    if (error) throw error;
  });

  // ============================================================================
  // 3. CART FLOW
  // ============================================================================
  console.log('\n📋 3. CART FLOW\n');

  await test('Can query carts table', async () => {
    const { error } = await supabase
      .from('carts')
      .select('id, buyer_id, created_at, updated_at')
      .limit(0);
    if (error) throw error;
  });

  await test('Can query cart_items with product join', async () => {
    const { error } = await supabase
      .from('cart_items')
      .select(`
        id, cart_id, product_id, variant_id, quantity, personalized_options,
        product:products(id, name, price),
        variant:product_variants(id, sku, price, stock)
      `)
      .limit(1);
    if (error) throw error;
  });

  // ============================================================================
  // 4. ORDER FLOW
  // ============================================================================
  console.log('\n📋 4. ORDER FLOW\n');

  await test('Can query orders with payment_status and shipment_status', async () => {
    const { error } = await supabase
      .from('orders')
      .select('id, order_number, buyer_id, payment_status, shipment_status, order_type, paid_at')
      .limit(0);
    if (error) throw error;
  });

  await test('Can query order_items with product info', async () => {
    const { error } = await supabase
      .from('order_items')
      .select(`
        id, order_id, product_id, product_name, price, quantity, variant_id,
        product:products(id, name)
      `)
      .limit(1);
    if (error) throw error;
  });

  await test('Can query order_recipients', async () => {
    const { error } = await supabase
      .from('order_recipients')
      .select('id, first_name, last_name, phone, email')
      .limit(0);
    if (error) throw error;
  });

  await test('Can query shipping_addresses with user_id', async () => {
    const { error } = await supabase
      .from('shipping_addresses')
      .select('id, user_id, label, address_line_1, city, province, region, postal_code')
      .limit(0);
    if (error) throw error;
  });

  // ============================================================================
  // 5. QA FLOW
  // ============================================================================
  console.log('\n📋 5. QA FLOW\n');

  await test('Can query product_assessments with status values', async () => {
    const { error } = await supabase
      .from('product_assessments')
      .select('id, product_id, status, submitted_at, verified_at')
      .limit(0);
    if (error) throw error;
  });

  await test('Can query assessments by status', async () => {
    const { error } = await supabase
      .from('product_assessments')
      .select('*')
      .eq('status', 'pending_digital_review')
      .limit(1);
    if (error) throw error;
  });

  await test('Can query product_approvals', async () => {
    const { error } = await supabase
      .from('product_approvals')
      .select('id, assessment_id, description, created_at, created_by')
      .limit(0);
    if (error) throw error;
  });

  await test('Can query product_rejections', async () => {
    const { error } = await supabase
      .from('product_rejections')
      .select('id, assessment_id, description, created_at, created_by')
      .limit(0);
    if (error) throw error;
  });

  // ============================================================================
  // 6. CHAT FLOW (Buyer-Seller Messaging)
  // ============================================================================
  console.log('\n📋 6. CHAT FLOW\n');

  await test('Can query conversations (buyer_id, no seller_id)', async () => {
    const { error } = await supabase
      .from('conversations')
      .select('id, buyer_id, order_id, created_at, updated_at')
      .limit(0);
    if (error) throw error;
  });

  await test('Can query messages with is_read', async () => {
    const { error } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, sender_type, content, is_read, image_url')
      .limit(0);
    if (error) throw error;
  });

  await test('Can query unread messages', async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false);
    if (error) throw error;
  });

  // ============================================================================
  // 7. AI ASSISTANT FLOW
  // ============================================================================
  console.log('\n📋 7. AI ASSISTANT FLOW\n');

  await test('Can query ai_conversations', async () => {
    const { error } = await supabase
      .from('ai_conversations')
      .select('id, user_id, user_type, title, last_message_at, created_at')
      .limit(0);
    if (error) throw error;
  });

  await test('Can query ai_messages with sender column', async () => {
    const { error } = await supabase
      .from('ai_messages')
      .select('id, conversation_id, sender, message, created_at')
      .limit(0);
    if (error) throw error;
  });

  await test('Can join ai_conversations with ai_messages', async () => {
    const { error } = await supabase
      .from('ai_conversations')
      .select(`
        *,
        messages:ai_messages(id, sender, message, created_at)
      `)
      .limit(1);
    if (error) throw error;
  });

  // ============================================================================
  // 8. SELLER BUSINESS FLOW
  // ============================================================================
  console.log('\n📋 8. SELLER BUSINESS FLOW\n');

  await test('Can query seller_business_profiles', async () => {
    const { error } = await supabase
      .from('seller_business_profiles')
      .select('seller_id, business_type, business_registration_number')
      .limit(0);
    if (error) throw error;
  });

  await test('Can query seller_payout_accounts', async () => {
    const { error } = await supabase
      .from('seller_payout_accounts')
      .select('seller_id, bank_name, account_name, account_number')
      .limit(0);
    if (error) throw error;
  });

  await test('Can query seller_verification_documents', async () => {
    const { error } = await supabase
      .from('seller_verification_documents')
      .select('seller_id, business_permit_url, valid_id_url')
      .limit(0);
    if (error) throw error;
  });

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 SUMMARY\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total: ${passed}/${results.length} passed`);

  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All flows validated successfully!');
    process.exit(0);
  }
}

runTests().catch(console.error);
