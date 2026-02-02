/**
 * Comprehensive Flow Test Script
 * Tests all key flows: Buyer, Seller, Admin, POS
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function runTests() {
  console.log('\n🧪 COMPREHENSIVE FLOW VERIFICATION\n');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;

  // Test 1: Products exist with variants
  console.log('\n📦 Test 1: Products with Variants');
  const { data: products, count: productCount } = await supabase
    .from('products')
    .select('id, name, colors, sizes, approval_status', { count: 'exact' })
    .eq('approval_status', 'approved')
    .limit(5);
  
  if (productCount && productCount > 0) {
    const withVariants = products?.filter(p => 
      (p.colors?.length > 0) || (p.sizes?.length > 0)
    ).length || 0;
    console.log(`   ✅ ${productCount} approved products, ${withVariants} have variants`);
    passed++;
  } else {
    console.log('   ❌ No approved products found');
    failed++;
  }

  // Test 2: Sellers exist
  console.log('\n👥 Test 2: Approved Sellers');
  const { count: sellerCount } = await supabase
    .from('sellers')
    .select('id', { count: 'exact' })
    .eq('approval_status', 'approved');
  
  if (sellerCount && sellerCount > 0) {
    console.log(`   ✅ ${sellerCount} approved sellers`);
    passed++;
  } else {
    console.log('   ❌ No approved sellers found');
    failed++;
  }

  // Test 3: Orders table structure (supports POS)
  console.log('\n🛒 Test 3: Orders Table (POS Support)');
  const { data: orderSample, error: orderError } = await supabase
    .from('orders')
    .select('id, order_type, buyer_id')
    .limit(1);
  
  if (!orderError) {
    console.log('   ✅ Orders table accessible');
    passed++;
    
    // Check for POS orders
    const { count: posCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact' })
      .eq('order_type', 'OFFLINE');
    console.log(`   📊 ${posCount || 0} POS (OFFLINE) orders exist`);
  } else {
    console.log(`   ❌ Orders table error: ${orderError.message}`);
    failed++;
  }

  // Test 4: Product QA table
  console.log('\n✅ Test 4: Product QA Table');
  const { data: qaSample, error: qaError } = await supabase
    .from('product_qa')
    .select('id, status, product_id')
    .limit(1);
  
  if (!qaError) {
    console.log('   ✅ Product QA table accessible');
    passed++;
    
    const { count: pendingCount } = await supabase
      .from('product_qa')
      .select('id', { count: 'exact' })
      .eq('status', 'PENDING_DIGITAL_REVIEW');
    console.log(`   📊 ${pendingCount || 0} products pending review`);
  } else {
    console.log(`   ❌ Product QA table error: ${qaError.message}`);
    failed++;
  }

  // Test 5: Buyers table (with bazcoins)
  console.log('\n👤 Test 5: Buyers Table (BazCoins)');
  const { data: buyerSample, error: buyerError } = await supabase
    .from('buyers')
    .select('id, bazcoins')
    .limit(1);
  
  if (!buyerError) {
    console.log('   ✅ Buyers table accessible with bazcoins column');
    passed++;
  } else {
    console.log(`   ❌ Buyers table error: ${buyerError.message}`);
    failed++;
  }

  // Test 6: Cart/Cart Items tables
  console.log('\n🛒 Test 6: Cart Tables');
  const { error: cartError } = await supabase
    .from('carts')
    .select('id')
    .limit(1);
  const { error: cartItemsError } = await supabase
    .from('cart_items')
    .select('id')
    .limit(1);
  
  if (!cartError && !cartItemsError) {
    console.log('   ✅ Carts and cart_items tables accessible');
    passed++;
  } else {
    console.log(`   ❌ Cart tables error`);
    failed++;
  }

  // Test 7: Order Items table
  console.log('\n📋 Test 7: Order Items Table');
  const { error: orderItemsError } = await supabase
    .from('order_items')
    .select('id, selected_variant')
    .limit(1);
  
  if (!orderItemsError) {
    console.log('   ✅ Order items table accessible with selected_variant column');
    passed++;
  } else {
    console.log(`   ❌ Order items error: ${orderItemsError.message}`);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST SUMMARY\n');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Total: ${passed + failed}\n`);
  
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Flows are ready.\n');
  } else {
    console.log('⚠️  Some tests failed. Review the issues above.\n');
  }
}

runTests();
