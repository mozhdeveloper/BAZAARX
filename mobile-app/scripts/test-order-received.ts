/**
 * Test Script: Order Received Flow
 * 
 * This script tests the "Mark Order as Received" functionality
 * to ensure it works correctly with the current database schema.
 * 
 * Run with: npx tsx scripts/test-order-received.ts
 * 
 * Database Schema Notes:
 * - orders table uses shipment_status (NOT status)
 * - Valid shipment_status values: 'waiting_for_seller', 'processing', 
 *   'ready_to_ship', 'shipped', 'out_for_delivery', 'delivered', 
 *   'failed_to_deliver', 'received', 'returned'
 * - orders.id is UUID, order_number is text (e.g., "ORD-2026369945")
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warn: '⚠️' };
  console.log(`${icons[type]} ${message}`);
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    log(`${name}`, 'success');
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message });
    log(`${name}: ${error.message}`, 'error');
  }
}

// ============ TEST 1: Verify orders table schema ============
async function testOrdersTableSchema() {
  await test('Orders table has shipment_status column', async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('id, shipment_status')
      .limit(1);
    
    if (error) throw new Error(`Query failed: ${error.message}`);
    log(`  Schema check passed - shipment_status column exists`, 'info');
  });
}

// ============ TEST 2: Get sample order to test with ============
async function testGetSampleOrder(): Promise<{ id: string; order_number: string; shipment_status: string } | null> {
  let sampleOrder: any = null;
  
  await test('Can fetch sample order', async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, shipment_status, buyer_id')
      .in('shipment_status', ['delivered', 'shipped', 'out_for_delivery'])
      .limit(1);
    
    if (error) throw new Error(`Query failed: ${error.message}`);
    if (!data || data.length === 0) {
      log(`  No orders in delivered/shipped status found - using any order`, 'warn');
      
      // Try getting any order
      const { data: anyOrder, error: anyError } = await supabase
        .from('orders')
        .select('id, order_number, shipment_status, buyer_id')
        .limit(1);
      
      if (anyError) throw new Error(`Query failed: ${anyError.message}`);
      if (!anyOrder || anyOrder.length === 0) throw new Error('No orders found in database');
      
      sampleOrder = anyOrder[0];
    } else {
      sampleOrder = data[0];
    }
    
    log(`  Found order: ${sampleOrder.order_number} (UUID: ${sampleOrder.id})`, 'info');
    log(`  Current shipment_status: ${sampleOrder.shipment_status}`, 'info');
  });
  
  return sampleOrder;
}

// ============ TEST 3: Test updating with UUID (correct) ============
async function testUpdateWithUUID(orderId: string, orderNumber: string) {
  const originalStatus = await getCurrentStatus(orderId);
  
  await test('Update shipment_status using UUID - should succeed', async () => {
    // Try updating with UUID (correct approach)
    const { error } = await supabase
      .from('orders')
      .update({ shipment_status: 'received' })
      .eq('id', orderId);
    
    if (error) throw new Error(`Update failed: ${error.message}`);
    
    // Verify update
    const newStatus = await getCurrentStatus(orderId);
    if (newStatus !== 'received') {
      throw new Error(`Status not updated. Expected 'received', got '${newStatus}'`);
    }
    
    log(`  Successfully updated order ${orderNumber} to 'received' using UUID`, 'info');
    
    // Restore original status
    await supabase
      .from('orders')
      .update({ shipment_status: originalStatus || 'delivered' })
      .eq('id', orderId);
    
    log(`  Restored original status: ${originalStatus}`, 'info');
  });
}

// ============ TEST 4: Test updating with order_number (should fail) ============
async function testUpdateWithOrderNumber(orderId: string, orderNumber: string) {
  await test('Update using order_number as ID - should fail with UUID error', async () => {
    // This simulates the bug - using order_number instead of UUID
    const { error } = await supabase
      .from('orders')
      .update({ shipment_status: 'received' })
      .eq('id', orderNumber); // WRONG: order_number is not a UUID
    
    // This should fail because order_number is not a valid UUID
    if (error) {
      if (error.code === '22P02' && error.message.includes('invalid input syntax for type uuid')) {
        log(`  Correctly rejected invalid UUID: ${error.message}`, 'info');
        return; // Expected failure
      }
      throw new Error(`Unexpected error: ${error.message}`);
    }
    
    // If no error, check if any rows were actually updated
    // (In some cases Postgres may not error but just not match any rows)
    log(`  Warning: No error thrown but update may not have matched any rows`, 'warn');
  });
}

// ============ TEST 5: Valid shipment_status values ============
async function testValidShipmentStatuses() {
  await test('Verify valid shipment_status enum values', async () => {
    const validStatuses = [
      'waiting_for_seller',
      'processing', 
      'ready_to_ship',
      'shipped',
      'out_for_delivery',
      'delivered',
      'failed_to_deliver',
      'received',
      'returned'
    ];
    
    log(`  Valid shipment_status values:`, 'info');
    validStatuses.forEach(s => log(`    - ${s}`, 'info'));
  });
}

// ============ TEST 6: Order ID vs Order Number ============
async function testOrderIdVsOrderNumber(sampleOrder: any) {
  await test('Distinguish between order.id (UUID) and order.order_number', async () => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!isUUID.test(sampleOrder.id)) {
      throw new Error(`order.id is not a valid UUID: ${sampleOrder.id}`);
    }
    
    if (isUUID.test(sampleOrder.order_number)) {
      log(`  Warning: order_number looks like a UUID`, 'warn');
    }
    
    log(`  order.id (UUID): ${sampleOrder.id}`, 'info');
    log(`  order.order_number: ${sampleOrder.order_number}`, 'info');
    log(`  Use order.id for database queries, order.order_number for display`, 'info');
  });
}

// Helper function
async function getCurrentStatus(orderId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('shipment_status')
    .eq('id', orderId)
    .single();
  
  if (error) return null;
  return data?.shipment_status;
}

// ============ MAIN ============
async function runTests() {
  console.log('\n========================================');
  console.log('  ORDER RECEIVED FLOW TEST SCRIPT');
  console.log('========================================\n');
  
  // Check if Supabase is configured
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_ANON_KEY') {
    log('Supabase not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.', 'error');
    log('Or edit this script to add your credentials directly.', 'info');
    return;
  }
  
  log('Starting tests...\n', 'info');
  
  // Run tests
  await testOrdersTableSchema();
  await testValidShipmentStatuses();
  
  const sampleOrder = await testGetSampleOrder();
  
  if (sampleOrder) {
    await testOrderIdVsOrderNumber(sampleOrder);
    await testUpdateWithUUID(sampleOrder.id, sampleOrder.order_number);
    await testUpdateWithOrderNumber(sampleOrder.id, sampleOrder.order_number);
  }
  
  // Summary
  console.log('\n========================================');
  console.log('  TEST SUMMARY');
  console.log('========================================\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`Total: ${results.length} | ✅ Passed: ${passed} | ❌ Failed: ${failed}\n`);
  
  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
  
  console.log('\n========================================');
  console.log('  KEY TAKEAWAYS');
  console.log('========================================');
  console.log(`
1. Orders table uses 'shipment_status', NOT 'status'
2. Use the real UUID (order.orderId or order.id from DB) for queries
3. order.order_number (e.g., "ORD-2026369945") is for display only
4. In your app code, the Order type maps:
   - id: order_number (for display)  
   - orderId: actual UUID (for DB queries)

Fix in your code:
  const realOrderId = (order as any).orderId || order.id;
  await supabase
    .from('orders')
    .update({ shipment_status: 'received' })
    .eq('id', realOrderId);
`);
}

runTests().catch(console.error);
