/**
 * Order Edit & CRUD Test Script
 * ==============================
 * 
 * Tests the complete order editing functionality:
 * 1. Creating test orders (POS/OFFLINE and ONLINE types)
 * 2. Editing order details (customer name, email, notes)
 * 3. Testing status changes for ALL statuses
 * 4. Testing status override (force any status to any status)
 * 5. Database CRUD operations verification
 * 6. order_recipients table operations
 * 
 * Run: npx ts-node scripts/test-order-edit-crud.ts
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

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ ERROR: Supabase credentials not found in environment');
    console.error('   Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set');
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
    console.log(`[TEST] ${msg}`);
}

function logSuccess(msg: string) {
    console.log(`[TEST] ✅ ${msg}`);
}

function logError(msg: string) {
    console.error(`[TEST] ❌ ${msg}`);
}

function logInfo(msg: string) {
    console.log(`[TEST] ℹ️  ${msg}`);
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
    return `TEST-${timestamp}-${random}`;
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
                pos_note: 'Test POS order - initial note',
                notes: 'Test POS order - initial note',
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
                product_name: 'Test Product',
                price: 100,
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
                notes: 'Test online order',
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
                product_name: 'Test Product Online',
                price: 200,
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
// TEST 4: Create and Update Order Recipient (POS order customer info)
// ============================================================
async function test4_CreateUpdateRecipient(posOrderId: string): Promise<boolean> {
    log('\n📋 TEST 4: Create and update order recipient...');
    
    try {
        // Create recipient
        const { data: recipient, error: createError } = await supabase
            .from('order_recipients')
            .insert({
                first_name: 'Test',
                last_name: 'Customer',
                email: 'test@example.com',
                phone: '09171234567',
            })
            .select('id')
            .single();
        
        if (createError || !recipient) {
            addResult('Create Recipient', 'FAIL', 'Failed to create recipient', createError);
            return false;
        }
        
        createdRecipientIds.push(recipient.id);
        addResult('Create Recipient', 'PASS', `Created recipient: ${recipient.id}`);
        
        // Link recipient to order
        const { error: linkError } = await supabase
            .from('orders')
            .update({ recipient_id: recipient.id })
            .eq('id', posOrderId);
        
        if (linkError) {
            addResult('Link Recipient to Order', 'FAIL', 'Failed to link recipient', linkError);
            return false;
        }
        addResult('Link Recipient to Order', 'PASS', 'Recipient linked to POS order');
        
        // Update recipient (simulate edit)
        const { error: updateError } = await supabase
            .from('order_recipients')
            .update({
                first_name: 'Updated',
                last_name: 'Name',
                email: 'updated@example.com',
            })
            .eq('id', recipient.id);
        
        if (updateError) {
            addResult('Update Recipient', 'FAIL', 'Failed to update recipient', updateError);
            return false;
        }
        addResult('Update Recipient', 'PASS', 'Recipient details updated');
        
        // Verify update
        const { data: updated, error: verifyError } = await supabase
            .from('order_recipients')
            .select('*')
            .eq('id', recipient.id)
            .single();
        
        if (verifyError || !updated) {
            addResult('Verify Recipient Update', 'FAIL', 'Failed to verify update', verifyError);
            return false;
        }
        
        if (updated.first_name !== 'Updated' || updated.last_name !== 'Name') {
            addResult('Verify Recipient Update', 'FAIL', 'Update values do not match', updated);
            return false;
        }
        addResult('Verify Recipient Update', 'PASS', `Verified: ${updated.first_name} ${updated.last_name}`);
        
        return true;
    } catch (err) {
        addResult('Recipient CRUD', 'FAIL', 'Exception occurred', err);
        return false;
    }
}

// ============================================================
// TEST 5: Update Order Notes (both POS and ONLINE)
// ============================================================
async function test5_UpdateOrderNotes(orderId: string, orderType: string): Promise<boolean> {
    log(`\n📋 TEST 5: Update order notes (${orderType})...`);
    
    try {
        const newNote = `Updated note - ${new Date().toISOString()}`;
        
        // Which field to update based on order type
        const updateFields = orderType === 'OFFLINE' 
            ? { pos_note: newNote, notes: newNote, updated_at: new Date().toISOString() }
            : { notes: newNote, updated_at: new Date().toISOString() };
        
        const { error: updateError } = await supabase
            .from('orders')
            .update(updateFields)
            .eq('id', orderId);
        
        if (updateError) {
            addResult(`Update ${orderType} Notes`, 'FAIL', 'Failed to update notes', updateError);
            return false;
        }
        
        // Verify
        const { data: order, error: verifyError } = await supabase
            .from('orders')
            .select('notes, pos_note')
            .eq('id', orderId)
            .single();
        
        if (verifyError || !order) {
            addResult(`Verify ${orderType} Notes`, 'FAIL', 'Failed to verify', verifyError);
            return false;
        }
        
        const noteField = orderType === 'OFFLINE' ? order.pos_note : order.notes;
        if (noteField !== newNote) {
            addResult(`Verify ${orderType} Notes`, 'FAIL', 'Note value does not match', order);
            return false;
        }
        
        addResult(`Update ${orderType} Notes`, 'PASS', `Notes updated and verified`);
        return true;
    } catch (err) {
        addResult('Update Notes', 'FAIL', 'Exception occurred', err);
        return false;
    }
}

// ============================================================
// TEST 6: Status Transitions - Normal Flow
// ============================================================
async function test6_StatusTransitions(orderId: string): Promise<boolean> {
    log('\n📋 TEST 6: Testing normal status transitions...');
    
    // Define the status flow: waiting_for_seller → ready_to_ship → shipped → delivered
    const statusFlow = [
        { status: 'waiting_for_seller', name: 'Pending (waiting_for_seller)' },
        { status: 'ready_to_ship', name: 'To-Ship (ready_to_ship)' },
        { status: 'shipped', name: 'Shipped' },
        { status: 'delivered', name: 'Delivered' },
    ];
    
    try {
        // Reset order to initial state
        const { error: resetError } = await supabase
            .from('orders')
            .update({ 
                shipment_status: 'waiting_for_seller',
                payment_status: 'pending_payment'
            })
            .eq('id', orderId);
        
        if (resetError) {
            addResult('Reset Order Status', 'FAIL', 'Failed to reset', resetError);
            return false;
        }
        addResult('Reset Order Status', 'PASS', 'Order reset to waiting_for_seller');
        
        // Test each transition
        for (let i = 0; i < statusFlow.length - 1; i++) {
            const fromStatus = statusFlow[i];
            const toStatus = statusFlow[i + 1];
            
            const { error: updateError } = await supabase
                .from('orders')
                .update({ shipment_status: toStatus.status })
                .eq('id', orderId);
            
            if (updateError) {
                addResult(`Transition ${fromStatus.name} → ${toStatus.name}`, 'FAIL', 'Update failed', updateError);
                return false;
            }
            
            // Verify
            const { data: order, error: verifyError } = await supabase
                .from('orders')
                .select('shipment_status')
                .eq('id', orderId)
                .single();
            
            if (verifyError || order?.shipment_status !== toStatus.status) {
                addResult(`Transition ${fromStatus.name} → ${toStatus.name}`, 'FAIL', 'Verification failed', { expected: toStatus.status, actual: order?.shipment_status });
                return false;
            }
            
            addResult(`Transition ${fromStatus.name} → ${toStatus.name}`, 'PASS', `Status is now ${toStatus.status}`);
            
            // Also create status history entry
            const { error: historyError } = await supabase
                .from('order_status_history')
                .insert({
                    order_id: orderId,
                    status: toStatus.status,
                    note: `Test transition to ${toStatus.name}`,
                });
            
            if (historyError) {
                addResult(`Status History (${toStatus.name})`, 'FAIL', 'Failed to create history', historyError);
            } else {
                addResult(`Status History (${toStatus.name})`, 'PASS', 'History entry created');
            }
        }
        
        return true;
    } catch (err) {
        addResult('Status Transitions', 'FAIL', 'Exception occurred', err);
        return false;
    }
}

// ============================================================
// TEST 7: Status Override - Force Change to Any Status
// ============================================================
async function test7_StatusOverride(orderId: string): Promise<boolean> {
    log('\n📋 TEST 7: Testing status override (force status change)...');
    
    // Test overriding to each status
    const allStatuses = [
        'waiting_for_seller',
        'processing',
        'ready_to_ship',
        'shipped',
        'out_for_delivery',
        'delivered',
        'failed_to_deliver',
        'received',
        'returned',
    ];
    
    try {
        // Start from delivered
        await supabase.from('orders').update({ shipment_status: 'delivered' }).eq('id', orderId);
        
        // Test override: delivered → waiting_for_seller (going backwards!)
        const { error: backwardError } = await supabase
            .from('orders')
            .update({ shipment_status: 'waiting_for_seller' })
            .eq('id', orderId);
        
        if (backwardError) {
            addResult('Override: Delivered → Pending', 'FAIL', 'Failed to override', backwardError);
            return false;
        }
        
        const { data: verified1 } = await supabase
            .from('orders')
            .select('shipment_status')
            .eq('id', orderId)
            .single();
        
        if (verified1?.shipment_status !== 'waiting_for_seller') {
            addResult('Override: Delivered → Pending', 'FAIL', 'Status did not change');
            return false;
        }
        addResult('Override: Delivered → Pending', 'PASS', 'Successfully reversed order status');
        
        // Test override: pending → completed (skipping middle steps)
        const { error: skipError } = await supabase
            .from('orders')
            .update({ shipment_status: 'received' })
            .eq('id', orderId);
        
        if (skipError) {
            addResult('Override: Pending → Completed', 'FAIL', 'Failed to override', skipError);
            return false;
        }
        
        const { data: verified2 } = await supabase
            .from('orders')
            .select('shipment_status')
            .eq('id', orderId)
            .single();
        
        if (verified2?.shipment_status !== 'received') {
            addResult('Override: Pending → Completed', 'FAIL', 'Status did not change');
            return false;
        }
        addResult('Override: Pending → Completed', 'PASS', 'Successfully skipped intermediate statuses');
        
        // Test override: completed → cancelled
        const { error: cancelError } = await supabase
            .from('orders')
            .update({ shipment_status: 'returned', payment_status: 'refunded' })
            .eq('id', orderId);
        
        if (cancelError) {
            addResult('Override: Completed → Cancelled', 'FAIL', 'Failed to override', cancelError);
            return false;
        }
        addResult('Override: Completed → Cancelled', 'PASS', 'Successfully cancelled completed order');
        
        // Test cycling through all statuses
        for (const status of allStatuses) {
            const { error } = await supabase
                .from('orders')
                .update({ shipment_status: status })
                .eq('id', orderId);
            
            if (error) {
                addResult(`Override to ${status}`, 'FAIL', 'Failed', error);
                return false;
            }
        }
        addResult('Override: All Statuses', 'PASS', `Successfully set all ${allStatuses.length} statuses`);
        
        return true;
    } catch (err) {
        addResult('Status Override', 'FAIL', 'Exception occurred', err);
        return false;
    }
}

// ============================================================
// TEST 8: Order Shipments Table Operations
// ============================================================
async function test8_OrderShipments(orderId: string): Promise<boolean> {
    log('\n📋 TEST 8: Testing order_shipments table operations...');
    
    try {
        // Create shipment record
        const { data: shipment, error: createError } = await supabase
            .from('order_shipments')
            .insert({
                order_id: orderId,
                status: 'shipped',
                tracking_number: 'TEST-TRACK-12345',
                shipped_at: new Date().toISOString(),
            })
            .select('id')
            .single();
        
        if (createError) {
            addResult('Create Shipment', 'FAIL', 'Failed to create shipment', createError);
            return false;
        }
        addResult('Create Shipment', 'PASS', `Created shipment: ${shipment?.id}`);
        
        // Update shipment (mark delivered)
        const { error: updateError } = await supabase
            .from('order_shipments')
            .update({
                status: 'delivered',
                delivered_at: new Date().toISOString(),
            })
            .eq('id', shipment?.id);
        
        if (updateError) {
            addResult('Update Shipment', 'FAIL', 'Failed to update', updateError);
            return false;
        }
        addResult('Update Shipment', 'PASS', 'Shipment marked as delivered');
        
        // Query with limit(1) pattern (not .single())
        const { data: shipments, error: queryError } = await supabase
            .from('order_shipments')
            .select('*')
            .eq('order_id', orderId)
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (queryError) {
            addResult('Query Shipment (limit pattern)', 'FAIL', 'Query failed', queryError);
            return false;
        }
        
        const latestShipment = shipments?.[0] || null;
        if (!latestShipment || latestShipment.status !== 'delivered') {
            addResult('Query Shipment (limit pattern)', 'FAIL', 'Wrong status', latestShipment);
            return false;
        }
        addResult('Query Shipment (limit pattern)', 'PASS', `Latest shipment status: ${latestShipment.status}`);
        
        // Clean up shipment
        await supabase.from('order_shipments').delete().eq('id', shipment?.id);
        addResult('Clean Shipment', 'PASS', 'Test shipment deleted');
        
        return true;
    } catch (err) {
        addResult('Order Shipments', 'FAIL', 'Exception occurred', err);
        return false;
    }
}

// ============================================================
// TEST 9: Status History Operations
// ============================================================
async function test9_StatusHistory(orderId: string): Promise<boolean> {
    log('\n📋 TEST 9: Testing status history operations...');
    
    try {
        // Create multiple history entries
        const { error: insertError } = await supabase
            .from('order_status_history')
            .insert([
                { order_id: orderId, status: 'pending', note: 'Order placed' },
                { order_id: orderId, status: 'processing', note: 'Seller processing' },
                { order_id: orderId, status: 'shipped', note: 'Order shipped' },
            ]);
        
        if (insertError) {
            addResult('Create Status History', 'FAIL', 'Failed to insert', insertError);
            return false;
        }
        addResult('Create Status History', 'PASS', 'Created 3 history entries');
        
        // Query history (should be ordered)
        const { data: history, error: queryError } = await supabase
            .from('order_status_history')
            .select('*')
            .eq('order_id', orderId)
            .order('created_at', { ascending: false });
        
        if (queryError) {
            addResult('Query Status History', 'FAIL', 'Query failed', queryError);
            return false;
        }
        
        addResult('Query Status History', 'PASS', `Found ${history?.length || 0} history entries`);
        
        return true;
    } catch (err) {
        addResult('Status History', 'FAIL', 'Exception occurred', err);
        return false;
    }
}

// ============================================================
// TEST 10: Read Order with All Relations
// ============================================================
async function test10_ReadOrderWithRelations(orderId: string): Promise<boolean> {
    log('\n📋 TEST 10: Reading order with all relations...');
    
    try {
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items(*),
                recipient:order_recipients!recipient_id(
                    id,
                    first_name,
                    last_name,
                    phone,
                    email
                )
            `)
            .eq('id', orderId)
            .single();
        
        if (error) {
            addResult('Read Order with Relations', 'FAIL', 'Query failed', error);
            return false;
        }
        
        addResult('Read Order', 'PASS', `Order: ${order.order_number}`);
        addResult('Read Order Items', 'PASS', `Items: ${order.order_items?.length || 0}`);
        
        if (order.recipient) {
            addResult('Read Recipient', 'PASS', `Recipient: ${order.recipient.first_name} ${order.recipient.last_name}`);
        } else {
            addResult('Read Recipient', 'SKIP', 'No recipient linked');
        }
        
        return true;
    } catch (err) {
        addResult('Read Order', 'FAIL', 'Exception occurred', err);
        return false;
    }
}

// ============================================================
// CLEANUP: Delete test data
// ============================================================
async function cleanup() {
    log('\n🧹 Cleaning up test data...');
    
    try {
        // Delete status history for test orders
        for (const orderId of createdOrderIds) {
            await supabase.from('order_status_history').delete().eq('order_id', orderId);
        }
        
        // Delete order items first (FK constraint)
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
    console.log('  ORDER EDIT & CRUD TEST SUITE');
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
        
        // TEST 4: Create and update recipient (for POS order)
        await test4_CreateUpdateRecipient(posOrderId);
        
        // TEST 5a: Update POS order notes
        await test5_UpdateOrderNotes(posOrderId, 'OFFLINE');
        
        // TEST 5b: Update ONLINE order notes
        if (onlineOrderId) {
            await test5_UpdateOrderNotes(onlineOrderId, 'ONLINE');
        }
        
        // TEST 6: Status transitions (normal flow)
        if (onlineOrderId) {
            await test6_StatusTransitions(onlineOrderId);
        } else {
            await test6_StatusTransitions(posOrderId);
        }
        
        // TEST 7: Status override
        await test7_StatusOverride(posOrderId);
        
        // TEST 8: Order shipments
        await test8_OrderShipments(posOrderId);
        
        // TEST 9: Status history
        await test9_StatusHistory(posOrderId);
        
        // TEST 10: Read order with relations
        await test10_ReadOrderWithRelations(posOrderId);
        
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
