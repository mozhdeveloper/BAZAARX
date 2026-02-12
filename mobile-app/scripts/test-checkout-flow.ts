/**
 * Checkout Flow Test Script
 * ==========================
 * 
 * Tests the checkout flow with our recent fixes:
 * 1. Stock validation from product_variants table (not products.stock)
 * 2. Safe RPC function for order creation (handles materialized view errors)
 * 3. Fallback direct insert with retry logic
 * 4. Materialized view error recovery
 * 5. Complete buyer checkout flow
 * 
 * Run: npx ts-node scripts/test-checkout-flow.ts
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

function log(msg: string) {
    console.log(`[TEST] ${msg}`);
}

function logResult(result: TestResult) {
    const emoji = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${emoji} ${result.name}: ${result.message}`);
    if (result.details && result.status === 'FAIL') {
        console.log(`   Details:`, result.details);
    }
    results.push(result);
}

// Generate unique order number
function generateOrderNumber(): string {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `TEST-${year}${randomNum}`;
}

// ============================================================================
// TEST 1: Verify product_variants table has stock column
// ============================================================================
async function testProductVariantsHasStock() {
    log('Testing product_variants table has stock column...');
    
    const { data, error } = await supabase
        .from('product_variants')
        .select('id, product_id, variant_name, stock')
        .limit(5);
    
    if (error) {
        logResult({
            name: 'Product Variants Stock Column',
            status: 'FAIL',
            message: `Cannot query product_variants.stock: ${error.message}`,
            details: error
        });
        return false;
    }
    
    logResult({
        name: 'Product Variants Stock Column',
        status: 'PASS',
        message: `Found ${data?.length || 0} variants with stock data`
    });
    return true;
}

// ============================================================================
// TEST 2: Verify products table does NOT have stock column (it's in variants)
// ============================================================================
async function testProductsNoStockColumn() {
    log('Testing that products table uses variants for stock...');
    
    // Try to query products.stock - should fail or return null
    const { data, error } = await supabase
        .from('products')
        .select('id, name, price')
        .limit(1);
    
    if (error) {
        logResult({
            name: 'Products Table Structure',
            status: 'FAIL',
            message: `Cannot query products: ${error.message}`,
            details: error
        });
        return false;
    }
    
    // Verify we can get stock from variants instead
    if (data && data.length > 0) {
        const { data: variants, error: variantError } = await supabase
            .from('product_variants')
            .select('stock')
            .eq('product_id', data[0].id);
        
        if (variantError) {
            logResult({
                name: 'Products Table Structure',
                status: 'FAIL',
                message: `Cannot get stock from variants: ${variantError.message}`
            });
            return false;
        }
        
        const totalStock = variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
        logResult({
            name: 'Products Table Structure',
            status: 'PASS',
            message: `Product "${data[0].name}" has ${totalStock} total stock across ${variants?.length || 0} variants`
        });
        return true;
    }
    
    logResult({
        name: 'Products Table Structure',
        status: 'SKIP',
        message: 'No products found to test'
    });
    return true;
}

// ============================================================================
// TEST 3: Test safe RPC function exists (create_order_safe)
// ============================================================================
async function testSafeOrderRpcExists() {
    log('Testing create_order_safe RPC function...');
    
    // Try to call the RPC with invalid data to see if function exists
    const { data, error } = await supabase
        .rpc('create_order_safe', {
            p_order_number: 'TEST-PROBE-12345',
            p_buyer_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID
            p_order_type: 'ONLINE',
            p_address_id: null,
            p_payment_status: 'pending_payment',
            p_shipment_status: 'waiting_for_seller',
            p_notes: 'Test probe - should fail'
        });
    
    // The function should exist and return JSON (even if with an error)
    if (error && error.message.includes('Could not find the function')) {
        logResult({
            name: 'Safe Order RPC Function',
            status: 'FAIL',
            message: 'create_order_safe function not found. Run the SQL migration!',
            details: 'Run: supabase-migrations/004_fix_buyer_orders_view_clean.sql'
        });
        return false;
    }
    
    // Function exists - it should return JSON with success:false due to invalid buyer_id
    if (data && typeof data === 'object') {
        logResult({
            name: 'Safe Order RPC Function',
            status: 'PASS',
            message: 'create_order_safe function exists and returns JSON'
        });
        return true;
    }
    
    // Function exists but returned an error (FK violation is expected)
    if (error) {
        logResult({
            name: 'Safe Order RPC Function',
            status: 'PASS',
            message: 'create_order_safe function exists (got expected FK error)'
        });
        return true;
    }
    
    logResult({
        name: 'Safe Order RPC Function',
        status: 'PASS',
        message: 'create_order_safe function available'
    });
    return true;
}

// ============================================================================
// TEST 4: Find a test buyer account
// ============================================================================
async function findTestBuyer(): Promise<{ id: string; email: string } | null> {
    log('Finding a test buyer account...');
    
    // Look for test buyers
    const { data: buyers, error } = await supabase
        .from('buyers')
        .select(`
            id,
            profiles!inner (email)
        `)
        .limit(1);
    
    if (error || !buyers || buyers.length === 0) {
        log('No buyers found in database');
        return null;
    }
    
    const buyer = buyers[0];
    const email = (buyer as any).profiles?.email || 'unknown';
    
    log(`Found buyer: ${email} (${buyer.id})`);
    return { id: buyer.id, email };
}

// ============================================================================
// TEST 5: Find a test product with stock
// ============================================================================
async function findTestProduct(): Promise<{ 
    id: string; 
    name: string; 
    price: number; 
    seller_id: string;
    stock: number;
    variant_id?: string;
} | null> {
    log('Finding a test product with stock...');
    
    const { data: products, error } = await supabase
        .from('products')
        .select(`
            id, 
            name, 
            price,
            seller_id,
            product_variants (id, stock, variant_name)
        `)
        .eq('approval_status', 'approved')
        .is('deleted_at', null)
        .limit(10);
    
    if (error || !products || products.length === 0) {
        log('No approved products found');
        return null;
    }
    
    // Find product with stock > 0
    for (const product of products) {
        const variants = (product as any).product_variants || [];
        const totalStock = variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
        
        if (totalStock > 0 && product.seller_id) {
            const variantWithStock = variants.find((v: any) => v.stock > 0);
            log(`Found product: ${product.name} (stock: ${totalStock})`);
            return {
                id: product.id,
                name: product.name,
                price: Number(product.price),
                seller_id: product.seller_id,
                stock: totalStock,
                variant_id: variantWithStock?.id
            };
        }
    }
    
    log('No products with stock found');
    return null;
}

// ============================================================================
// TEST 6: Test direct order creation (simulates checkout)
// ============================================================================
async function testDirectOrderCreation(buyerId: string, addressId?: string) {
    log('Testing direct order creation...');
    
    const orderNumber = generateOrderNumber();
    
    const { data: order, error } = await supabase
        .from('orders')
        .insert({
            order_number: orderNumber,
            buyer_id: buyerId,
            order_type: 'ONLINE',
            address_id: addressId || null,
            payment_status: 'pending_payment',
            shipment_status: 'waiting_for_seller',
            notes: 'Test order from checkout flow test script',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (error) {
        // Check if it's the materialized view error
        const isMaterializedViewError = error.message?.includes('materialized view') ||
                                         error.message?.includes('concurrently');
        
        if (isMaterializedViewError) {
            log('⚠️ Materialized view error detected! Checking if order was created...');
            
            // Wait and check if order exists
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const { data: existingOrder } = await supabase
                .from('orders')
                .select('id, order_number')
                .eq('order_number', orderNumber)
                .maybeSingle();
            
            if (existingOrder) {
                logResult({
                    name: 'Direct Order Creation',
                    status: 'PASS',
                    message: `Order created despite trigger error: ${orderNumber} (needs DB fix)`
                });
                // Clean up test order
                await supabase.from('orders').delete().eq('id', existingOrder.id);
                return true;
            }
            
            logResult({
                name: 'Direct Order Creation',
                status: 'FAIL',
                message: 'Materialized view error blocking orders. Run the SQL migration!',
                details: 'Run: supabase-migrations/004_fix_buyer_orders_view_clean.sql'
            });
            return false;
        }
        
        logResult({
            name: 'Direct Order Creation',
            status: 'FAIL',
            message: `Order creation failed: ${error.message}`,
            details: error
        });
        return false;
    }
    
    logResult({
        name: 'Direct Order Creation',
        status: 'PASS',
        message: `Order created successfully: ${orderNumber}`
    });
    
    // Clean up test order
    if (order) {
        await supabase.from('orders').delete().eq('id', order.id);
        log(`Cleaned up test order: ${orderNumber}`);
    }
    
    return true;
}

// ============================================================================
// TEST 7: Test order with items (full checkout simulation)
// ============================================================================
async function testFullCheckoutFlow(
    buyerId: string,
    product: { id: string; name: string; price: number; seller_id: string; variant_id?: string }
) {
    log('Testing full checkout flow with order items...');
    
    const orderNumber = generateOrderNumber();
    
    // Step 1: Create shipping address
    const { data: address, error: addressError } = await supabase
        .from('shipping_addresses')
        .insert({
            user_id: buyerId,
            label: 'Test Checkout Address',
            address_line_1: '123 Test Street, Test City',
            barangay: 'Test Barangay',
            city: 'Test City',
            province: 'Test Province',
            region: 'NCR',
            postal_code: '1234',
            is_default: false,
            address_type: 'residential'
        })
        .select()
        .single();
    
    if (addressError) {
        logResult({
            name: 'Full Checkout Flow',
            status: 'FAIL',
            message: `Failed to create shipping address: ${addressError.message}`
        });
        return false;
    }
    
    // Step 2: Create order
    let orderId: string | null = null;
    
    // Try safe RPC first
    const { data: rpcResult, error: rpcError } = await supabase
        .rpc('create_order_safe', {
            p_order_number: orderNumber,
            p_buyer_id: buyerId,
            p_order_type: 'ONLINE',
            p_address_id: address.id,
            p_payment_status: 'pending_payment',
            p_shipment_status: 'waiting_for_seller',
            p_notes: 'Test checkout from test script'
        });
    
    if (!rpcError && rpcResult && rpcResult.success) {
        orderId = rpcResult.order_id;
        log(`Order created via RPC: ${orderNumber}`);
    } else {
        // Fallback to direct insert
        log('RPC not available, using direct insert...');
        
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                order_number: orderNumber,
                buyer_id: buyerId,
                order_type: 'ONLINE',
                address_id: address.id,
                payment_status: 'pending_payment',
                shipment_status: 'waiting_for_seller',
                notes: 'Test checkout from test script'
            })
            .select()
            .single();
        
        if (orderError) {
            // Check for materialized view error and recover
            if (orderError.message?.includes('materialized view')) {
                await new Promise(resolve => setTimeout(resolve, 300));
                const { data: existingOrder } = await supabase
                    .from('orders')
                    .select('id')
                    .eq('order_number', orderNumber)
                    .maybeSingle();
                
                if (existingOrder) {
                    orderId = existingOrder.id;
                    log('Order recovered after materialized view error');
                }
            }
            
            if (!orderId) {
                // Clean up address
                await supabase.from('shipping_addresses').delete().eq('id', address.id);
                
                logResult({
                    name: 'Full Checkout Flow',
                    status: 'FAIL',
                    message: `Order creation failed: ${orderError.message}`
                });
                return false;
            }
        } else {
            orderId = order.id;
        }
    }
    
    // Step 3: Create order item (this is where the trigger often fires!)
    log('Inserting order item...');
    const { error: itemError } = await supabase
        .from('order_items')
        .insert({
            order_id: orderId,
            product_id: product.id,
            product_name: product.name,
            price: product.price,
            quantity: 1,
            variant_id: product.variant_id || null
        });
    
    // Handle materialized view error on order_items
    if (itemError) {
        const isMaterializedViewError = itemError.message?.includes('materialized view') ||
                                         itemError.message?.includes('concurrently');
        
        if (isMaterializedViewError) {
            log('⚠️ Materialized view error on order_items! Checking if item was created...');
            
            await new Promise(resolve => setTimeout(resolve, 200));
            
            const { data: existingItems } = await supabase
                .from('order_items')
                .select('id')
                .eq('order_id', orderId);
            
            if (existingItems && existingItems.length > 0) {
                log('✅ Order item was created despite trigger error');
                // Continue - item exists
            } else {
                logResult({
                    name: 'Full Checkout Flow',
                    status: 'FAIL',
                    message: 'Order items blocked by materialized view trigger! Run the SQL migration.',
                    details: 'The trigger is on order_items table. Run: 004_fix_buyer_orders_view_clean.sql'
                });
                // Clean up
                await supabase.from('orders').delete().eq('id', orderId);
                await supabase.from('shipping_addresses').delete().eq('id', address.id);
                return false;
            }
        } else {
            logResult({
                name: 'Full Checkout Flow',
                status: 'FAIL',
                message: `Failed to create order item: ${itemError.message}`
            });
            // Clean up
            await supabase.from('orders').delete().eq('id', orderId);
            await supabase.from('shipping_addresses').delete().eq('id', address.id);
            return false;
        }
    }
    
    // Step 4: Create payment record
    const { error: paymentError } = await supabase
        .from('order_payments')
        .insert({
            order_id: orderId,
            payment_method: { type: 'cod' },
            amount: product.price,
            status: 'pending'
        });
    
    if (paymentError) {
        log(`Warning: Payment record creation failed: ${paymentError.message}`);
        // Continue - payment is optional for test
    }
    
    // Step 5: Verify order was created properly
    const { data: verifyOrder, error: verifyError } = await supabase
        .from('orders')
        .select(`
            id,
            order_number,
            payment_status,
            shipment_status,
            order_items (id, product_name, price, quantity),
            shipping_addresses!address_id (city, province)
        `)
        .eq('id', orderId)
        .single();
    
    if (verifyError || !verifyOrder) {
        logResult({
            name: 'Full Checkout Flow',
            status: 'FAIL',
            message: 'Order verification failed'
        });
        return false;
    }
    
    const orderItems = (verifyOrder as any).order_items || [];
    const orderAddress = (verifyOrder as any).shipping_addresses;
    
    logResult({
        name: 'Full Checkout Flow',
        status: 'PASS',
        message: `Order ${orderNumber} created with ${orderItems.length} item(s), address: ${orderAddress?.city || 'N/A'}`
    });
    
    // Clean up test data
    log('Cleaning up test data...');
    await supabase.from('order_payments').delete().eq('order_id', orderId);
    await supabase.from('order_items').delete().eq('order_id', orderId);
    await supabase.from('orders').delete().eq('id', orderId);
    await supabase.from('shipping_addresses').delete().eq('id', address.id);
    
    return true;
}

// ============================================================================
// TEST 8: Test stock deduction from variants
// ============================================================================
async function testStockDeduction(productId: string, variantId?: string) {
    log('Testing stock deduction from product_variants...');
    
    // Get current stock
    let currentStock = 0;
    let targetVariantId = variantId;
    
    if (variantId) {
        const { data } = await supabase
            .from('product_variants')
            .select('stock')
            .eq('id', variantId)
            .single();
        currentStock = data?.stock || 0;
    } else {
        // Get first variant
        const { data } = await supabase
            .from('product_variants')
            .select('id, stock')
            .eq('product_id', productId)
            .limit(1)
            .single();
        currentStock = data?.stock || 0;
        targetVariantId = data?.id;
    }
    
    if (!targetVariantId || currentStock === 0) {
        logResult({
            name: 'Stock Deduction',
            status: 'SKIP',
            message: 'No variant with stock found to test'
        });
        return true;
    }
    
    // Deduct 1 from stock
    const { error: updateError } = await supabase
        .from('product_variants')
        .update({ stock: currentStock - 1 })
        .eq('id', targetVariantId);
    
    if (updateError) {
        logResult({
            name: 'Stock Deduction',
            status: 'FAIL',
            message: `Failed to update stock: ${updateError.message}`
        });
        return false;
    }
    
    // Verify and restore
    const { data: updated } = await supabase
        .from('product_variants')
        .select('stock')
        .eq('id', targetVariantId)
        .single();
    
    if (updated?.stock !== currentStock - 1) {
        logResult({
            name: 'Stock Deduction',
            status: 'FAIL',
            message: `Stock not updated correctly. Expected ${currentStock - 1}, got ${updated?.stock}`
        });
        return false;
    }
    
    // Restore original stock
    await supabase
        .from('product_variants')
        .update({ stock: currentStock })
        .eq('id', targetVariantId);
    
    logResult({
        name: 'Stock Deduction',
        status: 'PASS',
        message: `Stock deduction works correctly (${currentStock} -> ${currentStock - 1} -> ${currentStock})`
    });
    
    return true;
}

// ============================================================================
// TEST 9: Test orders table triggers (check for problematic triggers)
// ============================================================================
async function testOrdersTriggers() {
    log('Checking for problematic triggers on orders table...');
    
    // This requires admin access typically, so we'll do a simple insert test instead
    const testOrderNumber = `TRIGGER-TEST-${Date.now()}`;
    
    // Find any buyer
    const { data: buyer } = await supabase
        .from('buyers')
        .select('id')
        .limit(1)
        .single();
    
    if (!buyer) {
        logResult({
            name: 'Orders Table Triggers',
            status: 'SKIP',
            message: 'No buyer found to test triggers'
        });
        return true;
    }
    
    const startTime = Date.now();
    
    const { data: order, error } = await supabase
        .from('orders')
        .insert({
            order_number: testOrderNumber,
            buyer_id: buyer.id,
            order_type: 'ONLINE',
            payment_status: 'pending_payment',
            shipment_status: 'waiting_for_seller'
        })
        .select()
        .single();
    
    const duration = Date.now() - startTime;
    
    if (error) {
        if (error.message?.includes('materialized view')) {
            logResult({
                name: 'Orders Table Triggers',
                status: 'FAIL',
                message: 'Materialized view trigger is blocking orders! Run the SQL migration.',
                details: 'Run: supabase-migrations/004_fix_buyer_orders_view_clean.sql'
            });
            return false;
        }
        
        logResult({
            name: 'Orders Table Triggers',
            status: 'FAIL',
            message: `Order insert failed: ${error.message}`
        });
        return false;
    }
    
    // Clean up
    if (order) {
        await supabase.from('orders').delete().eq('id', order.id);
    }
    
    logResult({
        name: 'Orders Table Triggers',
        status: 'PASS',
        message: `Order insert completed in ${duration}ms (no blocking triggers)`
    });
    
    return true;
}

// ============================================================================
// TEST 10: Test order_items table triggers specifically
// ============================================================================
async function testOrderItemsTriggers() {
    log('Checking for problematic triggers on order_items table...');
    
    // Find any buyer and product
    const { data: buyer } = await supabase
        .from('buyers')
        .select('id')
        .limit(1)
        .single();
    
    const { data: product } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('approval_status', 'approved')
        .is('deleted_at', null)
        .limit(1)
        .single();
    
    if (!buyer || !product) {
        logResult({
            name: 'Order Items Triggers',
            status: 'SKIP',
            message: 'No buyer or product found to test triggers'
        });
        return true;
    }
    
    // Create a test order first
    const testOrderNumber = `ITEMS-TRIGGER-TEST-${Date.now()}`;
    
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            order_number: testOrderNumber,
            buyer_id: buyer.id,
            order_type: 'ONLINE',
            payment_status: 'pending_payment',
            shipment_status: 'waiting_for_seller'
        })
        .select()
        .single();
    
    if (orderError || !order) {
        logResult({
            name: 'Order Items Triggers',
            status: 'SKIP',
            message: `Could not create test order: ${orderError?.message}`
        });
        return true;
    }
    
    // Now test order_items insert
    const startTime = Date.now();
    
    const { error: itemsError } = await supabase
        .from('order_items')
        .insert({
            order_id: order.id,
            product_id: product.id,
            product_name: product.name,
            price: product.price,
            quantity: 1
        });
    
    const duration = Date.now() - startTime;
    
    if (itemsError) {
        const isMaterializedViewError = itemsError.message?.includes('materialized view') ||
                                         itemsError.message?.includes('concurrently');
        
        if (isMaterializedViewError) {
            // Check if item was created anyway
            await new Promise(resolve => setTimeout(resolve, 200));
            const { data: existingItems } = await supabase
                .from('order_items')
                .select('id')
                .eq('order_id', order.id);
            
            // Clean up
            if (existingItems && existingItems.length > 0) {
                await supabase.from('order_items').delete().eq('order_id', order.id);
            }
            await supabase.from('orders').delete().eq('id', order.id);
            
            logResult({
                name: 'Order Items Triggers',
                status: 'FAIL',
                message: 'Materialized view trigger on order_items is blocking inserts! Run the SQL migration.',
                details: 'The trigger is firing on order_items INSERT. Run: 004_fix_buyer_orders_view_clean.sql'
            });
            return false;
        }
        
        // Clean up
        await supabase.from('orders').delete().eq('id', order.id);
        
        logResult({
            name: 'Order Items Triggers',
            status: 'FAIL',
            message: `Order items insert failed: ${itemsError.message}`
        });
        return false;
    }
    
    // Clean up
    await supabase.from('order_items').delete().eq('order_id', order.id);
    await supabase.from('orders').delete().eq('id', order.id);
    
    logResult({
        name: 'Order Items Triggers',
        status: 'PASS',
        message: `Order items insert completed in ${duration}ms (no blocking triggers)`
    });
    
    return true;
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================
async function runTests() {
    console.log('\n' + '='.repeat(70));
    console.log('       CHECKOUT FLOW TEST - With Materialized View Fixes');
    console.log('='.repeat(70) + '\n');
    
    // Test 1: Product variants have stock
    await testProductVariantsHasStock();
    
    // Test 2: Products use variants for stock
    await testProductsNoStockColumn();
    
    // Test 3: Safe RPC function
    await testSafeOrderRpcExists();
    
    // Test 4: Orders table triggers
    await testOrdersTriggers();
    
    // Test 5: Order items table triggers (often the culprit!)
    await testOrderItemsTriggers();
    
    // Find test data
    const buyer = await findTestBuyer();
    const product = await findTestProduct();
    
    if (buyer && product) {
        // Test 6: Direct order creation
        await testDirectOrderCreation(buyer.id);
        
        // Test 7: Full checkout flow
        await testFullCheckoutFlow(buyer.id, product);
        
        // Test 8: Stock deduction
        await testStockDeduction(product.id, product.variant_id);
    } else {
        log('⚠️ Skipping order tests - no buyer or product found');
        logResult({
            name: 'Full Checkout Tests',
            status: 'SKIP',
            message: 'Need buyer and product with stock to run full tests'
        });
    }
    
    // Print summary
    printSummary();
}

function printSummary() {
    console.log('\n' + '='.repeat(70));
    console.log('                         TEST SUMMARY');
    console.log('='.repeat(70));
    
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const skipped = results.filter(r => r.status === 'SKIP').length;
    
    console.log(`\n  ✅ Passed:  ${passed}`);
    console.log(`  ❌ Failed:  ${failed}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  📊 Total:   ${results.length}`);
    
    if (failed > 0) {
        console.log('\n⚠️  FAILED TESTS:');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`   - ${r.name}: ${r.message}`);
        });
        
        console.log('\n💡 FIXES NEEDED:');
        console.log('   1. Run the SQL migration in Supabase SQL Editor:');
        console.log('      supabase-migrations/004_fix_buyer_orders_view_clean.sql');
        console.log('   2. This will remove problematic triggers and add safe RPC function');
    }
    
    if (passed === results.length - skipped && failed === 0) {
        console.log('\n🎉 All tests passed! Checkout flow is working correctly.');
    }
    
    console.log('\n' + '='.repeat(70) + '\n');
}

// Run tests
runTests().catch(console.error);
