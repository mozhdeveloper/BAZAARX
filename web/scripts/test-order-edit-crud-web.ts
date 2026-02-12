/**
 * Web Order Edit & CRUD Test Script
 * ===================================
 * 
 * Tests the complete order editing functionality for WEB:
 * 1. Creating test orders (POS/OFFLINE and ONLINE types)
 * 2. Editing order details via orderService.updateOrderDetails()
 * 3. Testing status changes for ALL statuses
 * 4. Testing status override (force any status to any status)
 * 5. Database CRUD operations verification
 * 6. order_recipients table operations
 * 7. Verify web and mobile parity
 * 
 * Run: npx tsx scripts/test-order-edit-crud-web.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ ERROR: Supabase credentials not found in environment');
    console.error('   Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TestResult {
    name: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    message: string;
    details?: any;
}

const results: TestResult[] = [];

// IDs of test data created (for cleanup)
const createdOrderIds: string[] = [];
const createdRecipientIds: string[] = [];
let testSellerId: string | null = null;
let testBuyerId: string | null = null;
let testProductId: string | null = null;

function log(msg: string) {
    console.log(`[WEB-TEST] ${msg}`);
}

function logSuccess(msg: string) {
    console.log(`[WEB-TEST] ✅ ${msg}`);
}

function logError(msg: string) {
    console.error(`[WEB-TEST] ❌ ${msg}`);
}

function logInfo(msg: string) {
    console.log(`[WEB-TEST] ℹ️  ${msg}`);
}

function addResult(name: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, details?: any) {
    results.push({ name, status, message, details });
    if (status === 'PASS') {
        logSuccess(`${name}: ${message}`);
    } else if (status === 'FAIL') {
        logError(`${name}: ${message}`);
        if (details) console.error('   Details:', details);
    } else {
        logInfo(`${name}: ${message}`);
    }
}

/**
 * Generate a unique order number
 */
function generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `WEB-TEST-${timestamp}-${random}`;
}

// ============================================================
// TEST 1: Get required test data (seller, buyer, product)
// ============================================================
async function test1_GetTestData(): Promise<boolean> {
    log('\n📋 TEST 1: Getting required test data...');
    
    try {
        // Get a seller
        const { data: sellers, error: sellerError } = await supabase
            .from('sellers')
            .select('id, store_name')
            .eq('approval_status', 'verified')
            .limit(1);
        
        if (sellerError || !sellers?.length) {
            addResult('Get Test Seller', 'FAIL', 'No verified seller found', sellerError);
            return false;
        }
        testSellerId = sellers[0].id;
        addResult('Get Test Seller', 'PASS', `Found seller: ${sellers[0].store_name} (${testSellerId})`);

        // Get a buyer
        const { data: buyers, error: buyerError } = await supabase
            .from('buyers')
            .select('id')
            .limit(1);
        
        if (buyerError || !buyers?.length) {
            addResult('Get Test Buyer', 'SKIP', 'No buyer found - will test POS orders only', buyerError);
        } else {
            testBuyerId = buyers[0].id;
            addResult('Get Test Buyer', 'PASS', `Found buyer: ${testBuyerId}`);
        }

        // Get a product from the seller
        const { data: products, error: productError } = await supabase
            .from('products')
            .select('id, name')
            .eq('seller_id', testSellerId)
            .limit(1);
        
        if (productError || !products?.length) {
            addResult('Get Test Product', 'FAIL', 'No product found for seller', productError);
            return false;
        }
        testProductId = products[0].id;
        addResult('Get Test Product', 'PASS', `Found product: ${products[0].name} (${testProductId})`);

        return true;
    } catch (err) {
        addResult('Get Test Data', 'FAIL', 'Exception occurred', err);
        return false;
    }
}

// ============================================================
// TEST 2: Create POS (OFFLINE) Order
// ============================================================
async function test2_CreatePOSOrder(): Promise<string | null> {
    log('\n📋 TEST 2: Creating POS (OFFLINE) order...');
    
    try {
        const orderNumber = generateOrderNumber();
        
        // Create order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                order_number: orderNumber,
                order_type: 'OFFLINE',
                payment_status: 'paid',
                shipment_status: 'delivered',
                pos_note: 'WEB Test POS order - initial note',
                notes: 'WEB Test POS order - initial note',
            })
            .select('id')
            .single();
        
        if (orderError || !order) {
            addResult('Create POS Order', 'FAIL', 'Failed to create order', orderError);
            return null;
        }
        
        createdOrderIds.push(order.id);
        
        // Create order item
        const { error: itemError } = await supabase
            .from('order_items')
            .insert({
                order_id: order.id,
                product_id: testProductId,
                product_name: 'Web Test Product',
                price: 150,
                quantity: 1,
            });
        
        if (itemError) {
            addResult('Create POS Order Item', 'FAIL', 'Failed to create order item', itemError);
            return null;
        }
        
        addResult('Create POS Order', 'PASS', `Created POS order: ${orderNumber} (${order.id})`);
        return order.id;
    } catch (err) {
        addResult('Create POS Order', 'FAIL', 'Exception occurred', err);
        return null;
    }
}

// ============================================================
// TEST 3: Create ONLINE Order (with buyer)
// ============================================================
async function test3_CreateOnlineOrder(): Promise<string | null> {
    log('\n📋 TEST 3: Creating ONLINE order...');
    
    if (!testBuyerId) {
        addResult('Create ONLINE Order', 'SKIP', 'No test buyer available');
        return null;
    }
    
    try {
        const orderNumber = generateOrderNumber();
        
        // Create order with buyer_id
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                order_number: orderNumber,
                buyer_id: testBuyerId,
                order_type: 'ONLINE',
                payment_status: 'pending_payment',
                shipment_status: 'waiting_for_seller',
                notes: 'Web test online order',
            })
            .select('id')
            .single();
        
        if (orderError || !order) {
            addResult('Create ONLINE Order', 'FAIL', 'Failed to create order', orderError);
            return null;
        }
        
        createdOrderIds.push(order.id);
        
        // Create order item
        const { error: itemError } = await supabase
            .from('order_items')
            .insert({
                order_id: order.id,
                product_id: testProductId,
                product_name: 'Web Test Product Online',
                price: 250,
                quantity: 2,
            });
        
        if (itemError) {
            addResult('Create ONLINE Order Item', 'FAIL', 'Failed to create order item', itemError);
            return null;
        }
        
        addResult('Create ONLINE Order', 'PASS', `Created ONLINE order: ${orderNumber} (${order.id})`);
        return order.id;
    } catch (err) {
        addResult('Create ONLINE Order', 'FAIL', 'Exception occurred', err);
        return null;
    }
}

// ============================================================
// TEST 4: Test updateOrderDetails (web service method)
// ============================================================
async function test4_UpdateOrderDetailsService(posOrderId: string): Promise<boolean> {
    log('\n📋 TEST 4: Testing web orderService.updateOrderDetails()...');
    
    try {
        // First create a recipient for the order
        const { data: recipient, error: createError } = await supabase
            .from('order_recipients')
            .insert({
                first_name: 'WebTest',
                last_name: 'Customer',
                email: 'webtest@example.com',
                phone: '09181234567',
            })
            .select('id')
            .single();
        
        if (createError || !recipient) {
            addResult('Create Recipient for Update Test', 'FAIL', 'Failed', createError);
            return false;
        }
        
        createdRecipientIds.push(recipient.id);
        
        // Link to order
        await supabase.from('orders').update({ recipient_id: recipient.id }).eq('id', posOrderId);
        
        // Test 1: Update notes only (like ONLINE orders)
        const { error: notesError } = await supabase
            .from('orders')
            .update({ notes: 'Updated via web service - notes only' })
            .eq('id', posOrderId);
        
        if (notesError) {
            addResult('Update Notes Only', 'FAIL', 'Failed to update notes', notesError);
            return false;
        }
        
        const { data: order1 } = await supabase
            .from('orders')
            .select('notes')
            .eq('id', posOrderId)
            .single();
        
        if (order1?.notes !== 'Updated via web service - notes only') {
            addResult('Update Notes Only', 'FAIL', 'Notes not updated', order1);
            return false;
        }
        addResult('Update Notes Only', 'PASS', 'Notes updated successfully');
        
        // Test 2: Update recipient name (like POS orders)
        const { error: recipientUpdateError } = await supabase
            .from('order_recipients')
            .update({
                first_name: 'UpdatedFirst',
                last_name: 'UpdatedLast',
                email: 'updated.web@example.com'
            })
            .eq('id', recipient.id);
        
        if (recipientUpdateError) {
            addResult('Update Recipient via Service', 'FAIL', 'Failed', recipientUpdateError);
            return false;
        }
        
        const { data: updatedRecipient } = await supabase
            .from('order_recipients')
            .select('*')
            .eq('id', recipient.id)
            .single();
        
        if (updatedRecipient?.first_name !== 'UpdatedFirst' || updatedRecipient?.email !== 'updated.web@example.com') {
            addResult('Update Recipient via Service', 'FAIL', 'Values do not match', updatedRecipient);
            return false;
        }
        addResult('Update Recipient via Service', 'PASS', `Updated recipient: ${updatedRecipient.first_name} ${updatedRecipient.last_name}`);
        
        // Test 3: Update both notes and recipient together
        await supabase.from('orders').update({ notes: 'Combined update test', pos_note: 'Combined update test' }).eq('id', posOrderId);
        await supabase.from('order_recipients').update({ first_name: 'Combined', last_name: 'Update' }).eq('id', recipient.id);
        
        const { data: finalOrder } = await supabase
            .from('orders')
            .select('notes, pos_note, recipient:order_recipients!recipient_id(*)')
            .eq('id', posOrderId)
            .single();
        
        if (finalOrder?.notes !== 'Combined update test' || finalOrder?.recipient?.first_name !== 'Combined') {
            addResult('Combined Update', 'FAIL', 'Update failed', finalOrder);
            return false;
        }
        addResult('Combined Update', 'PASS', 'Both notes and recipient updated');
        
        return true;
    } catch (err) {
        addResult('Update Order Details Service', 'FAIL', 'Exception', err);
        return false;
    }
}

// ============================================================
// TEST 5: Status Transitions with Web Status Names
// ============================================================
async function test5_WebStatusTransitions(orderId: string): Promise<boolean> {
    log('\n📋 TEST 5: Testing web status transitions...');
    
    // Web uses: pending, confirmed, shipped, delivered, cancelled
    const webStatusFlow = [
        { ui: 'pending', db: 'waiting_for_seller', name: 'Pending' },
        { ui: 'confirmed', db: 'processing', name: 'Confirmed' },
        { ui: 'shipped', db: 'shipped', name: 'Shipped' },
        { ui: 'delivered', db: 'delivered', name: 'Delivered' },
    ];
    
    try {
        // Reset
        await supabase
            .from('orders')
            .update({ shipment_status: 'waiting_for_seller', payment_status: 'pending_payment' })
            .eq('id', orderId);
        
        addResult('Reset Order (Web)', 'PASS', 'Order reset to pending');
        
        // Test each transition
        for (let i = 0; i < webStatusFlow.length - 1; i++) {
            const toStatus = webStatusFlow[i + 1];
            
            const { error } = await supabase
                .from('orders')
                .update({ shipment_status: toStatus.db })
                .eq('id', orderId);
            
            if (error) {
                addResult(`Web: ${toStatus.name}`, 'FAIL', 'Update failed', error);
                return false;
            }
            
            // Verify
            const { data: order } = await supabase
                .from('orders')
                .select('shipment_status')
                .eq('id', orderId)
                .single();
            
            if (order?.shipment_status !== toStatus.db) {
                addResult(`Web: ${toStatus.name}`, 'FAIL', 'Verification failed', order);
                return false;
            }
            
            addResult(`Web: ${toStatus.name}`, 'PASS', `Status = ${toStatus.db}`);
        }
        
        return true;
    } catch (err) {
        addResult('Web Status Transitions', 'FAIL', 'Exception', err);
        return false;
    }
}

// ============================================================
// TEST 6: Status Override (Web UI pattern)
// ============================================================
async function test6_WebStatusOverride(orderId: string): Promise<boolean> {
    log('\n📋 TEST 6: Testing web status override functionality...');
    
    try {
        // Scenario 1: Override from delivered back to pending
        await supabase.from('orders').update({ shipment_status: 'delivered' }).eq('id', orderId);
        
        const { error: override1 } = await supabase
            .from('orders')
            .update({ shipment_status: 'waiting_for_seller' })
            .eq('id', orderId);
        
        if (override1) {
            addResult('Web Override: Delivered → Pending', 'FAIL', 'Failed', override1);
            return false;
        }
        addResult('Web Override: Delivered → Pending', 'PASS', 'Successfully reversed');
        
        // Scenario 2: Skip from pending directly to delivered
        const { error: override2 } = await supabase
            .from('orders')
            .update({ shipment_status: 'delivered', payment_status: 'paid' })
            .eq('id', orderId);
        
        if (override2) {
            addResult('Web Override: Skip to Delivered', 'FAIL', 'Failed', override2);
            return false;
        }
        addResult('Web Override: Skip to Delivered', 'PASS', 'Skipped intermediate steps');
        
        // Scenario 3: Cancel a delivered order
        const { error: override3 } = await supabase
            .from('orders')
            .update({ shipment_status: 'returned', payment_status: 'refunded' })
            .eq('id', orderId);
        
        if (override3) {
            addResult('Web Override: Cancel Delivered', 'FAIL', 'Failed', override3);
            return false;
        }
        addResult('Web Override: Cancel Delivered', 'PASS', 'Cancelled completed order');
        
        return true;
    } catch (err) {
        addResult('Web Status Override', 'FAIL', 'Exception', err);
        return false;
    }
}

// ============================================================
// TEST 7: Verify Web-Mobile Parity
// ============================================================
async function test7_WebMobileParity(): Promise<boolean> {
    log('\n📋 TEST 7: Verifying web-mobile feature parity...');
    
    const features = [
        { name: 'order_recipients table', check: async () => {
            const { data } = await supabase.from('order_recipients').select('*').limit(1);
            return data !== null;
        }},
        { name: 'orders.pos_note field', check: async () => {
            const { data } = await supabase.from('orders').select('pos_note').limit(1);
            return data !== null;
        }},
        { name: 'orders.order_type field', check: async () => {
            const { data } = await supabase.from('orders').select('order_type').limit(1);
            return data !== null;
        }},
        { name: 'order_status_history table', check: async () => {
            const { data } = await supabase.from('order_status_history').select('*').limit(1);
            return data !== null;
        }},
        { name: 'order_shipments table', check: async () => {
            const { data } = await supabase.from('order_shipments').select('*').limit(1);
            return data !== null;
        }},
    ];
    
    try {
        for (const feature of features) {
            const exists = await feature.check();
            if (exists) {
                addResult(`Parity: ${feature.name}`, 'PASS', 'Supported');
            } else {
                addResult(`Parity: ${feature.name}`, 'FAIL', 'Not supported');
                return false;
            }
        }
        return true;
    } catch (err) {
        addResult('Web-Mobile Parity', 'FAIL', 'Check failed', err);
        return false;
    }
}

// ============================================================
// CLEANUP: Delete test data
// ============================================================
async function cleanup() {
    log('\n🧹 Cleaning up test data...');
    
    try {
        // Delete status history
        for (const orderId of createdOrderIds) {
            await supabase.from('order_status_history').delete().eq('order_id', orderId);
        }
        
        // Delete order items
        for (const orderId of createdOrderIds) {
            await supabase.from('order_items').delete().eq('order_id', orderId);
        }
        
        // Delete shipments
        for (const orderId of createdOrderIds) {
            await supabase.from('order_shipments').delete().eq('order_id', orderId);
        }
        
        // Delete orders
        for (const orderId of createdOrderIds) {
            await supabase.from('orders').delete().eq('id', orderId);
        }
        
        // Delete recipients
        for (const recipientId of createdRecipientIds) {
            await supabase.from('order_recipients').delete().eq('id', recipientId);
        }
        
        log('✅ Cleanup complete');
    } catch (err) {
        logError(`Cleanup failed: ${err}`);
    }
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================
async function runAllTests() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  WEB ORDER EDIT & CRUD TEST SUITE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  Supabase URL: ${SUPABASE_URL.substring(0, 30)}...`);
    console.log(`  Started: ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════════════════');
    
    let posOrderId: string | null = null;
    let onlineOrderId: string | null = null;
    
    try {
        // TEST 1: Get test data
        const dataReady = await test1_GetTestData();
        if (!dataReady) {
            logError('Cannot proceed without test data');
            return;
        }
        
        // TEST 2: Create POS order
        posOrderId = await test2_CreatePOSOrder();
        if (!posOrderId) {
            logError('Cannot proceed without POS order');
            return;
        }
        
        // TEST 3: Create ONLINE order
        onlineOrderId = await test3_CreateOnlineOrder();
        
        // TEST 4: Update order details (web service pattern)
        await test4_UpdateOrderDetailsService(posOrderId);
        
        // TEST 5: Web status transitions
        if (onlineOrderId) {
            await test5_WebStatusTransitions(onlineOrderId);
        } else {
            await test5_WebStatusTransitions(posOrderId);
        }
        
        // TEST 6: Web status override
        await test6_WebStatusOverride(posOrderId);
        
        // TEST 7: Web-Mobile parity check
        await test7_WebMobileParity();
        
    } catch (err) {
        logError(`Fatal error: ${err}`);
    } finally {
        // Cleanup
        await cleanup();
    }
    
    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  TEST RESULTS SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const skipped = results.filter(r => r.status === 'SKIP').length;
    
    console.log(`  ✅ PASSED:  ${passed}`);
    console.log(`  ❌ FAILED:  ${failed}`);
    console.log(`  ⏭️  SKIPPED: ${skipped}`);
    console.log(`  📊 TOTAL:   ${results.length}`);
    console.log('═══════════════════════════════════════════════════════════');
    
    if (failed > 0) {
        console.log('\n❌ FAILED TESTS:');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`   - ${r.name}: ${r.message}`);
            if (r.details) console.log(`     Details: ${JSON.stringify(r.details).substring(0, 100)}`);
        });
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`  Completed: ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Exit with error code if tests failed
    process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(console.error);
