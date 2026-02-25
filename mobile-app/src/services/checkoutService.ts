import { supabase } from '../lib/supabase';
import type { CartItem } from '../types';
import { cartService } from './cartService';
import { orderNotificationService } from './orderNotificationService';
import { notificationService } from './notificationService';

// Define the payload for the checkout process
export interface CheckoutPayload {
    userId: string;
    items: CartItem[];
    totalAmount: number;
    shippingAddress: {
        fullName: string;
        street: string;
        barangay: string;
        city: string;
        province: string;
        region: string;
        postalCode: string;
        phone: string;
        country?: string;
    };
    paymentMethod: string;
    usedBazcoins: number;
    earnedBazcoins: number;
    shippingFee: number;
    discount: number;
    email: string;
}

export interface CheckoutResult {
    success: boolean;
    orderIds?: string[];
    orderUuids?: string[];
    error?: string;
    newBazcoinsBalance?: number;
}

/**
 * Generate a unique order number with format: ORD-(YEAR)029283
 * Example: ORD-2026029283
 */
const generateOrderNumber = (): string => {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(100000 + Math.random() * 900000); // 6 digits
    return `ORD-${year}${randomNum}`;
};

/**
 * Process checkout for mobile app
 * - Validates stock
 * - Creates orders (grouped by seller)
 * - Creates order items
 * - Updates product stock and sales count
 * - Updates Bazcoins balance
 * - Clears cart items
 */
export const processCheckout = async (payload: CheckoutPayload): Promise<CheckoutResult> => {
    const {
        userId,
        items,
        totalAmount,
        shippingAddress,
        paymentMethod,
        usedBazcoins,
        earnedBazcoins,
        shippingFee,
        discount,
        email
    } = payload;

    try {
        // 1. Validate Stock (non-blocking — skips items with missing products)
        // Stock is stored in product_variants table, not products table
        for (const item of items) {
            if (!item.id) continue;

            // Get total stock from all variants for this product
            const { data: variants, error: variantError } = await supabase
                .from('product_variants')
                .select('id, stock')
                .eq('product_id', item.id);

            if (variantError) {
                console.warn(`[Checkout] Stock check error for ${item.id}:`, variantError.message);
                continue; // Skip validation but allow checkout
            }
            
            if (!variants || variants.length === 0) {
                console.warn(`[Checkout] No variants found for product ${item.id}, skipping stock check`);
                continue;
            }

            // If specific variant selected, check that variant's stock
            // Otherwise check total stock across all variants
            let availableStock = 0;
            if (item.selectedVariant?.variantId) {
                const selectedVariant = variants.find(v => v.id === item.selectedVariant?.variantId);
                availableStock = selectedVariant?.stock || 0;
            } else {
                availableStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
            }

            if (availableStock < item.quantity) {
                throw new Error(`Insufficient stock for ${item.name}. Only ${availableStock} available.`);
            }
        }

        // 2. Group items by seller (robust to legacy fields and quick orders)
        const itemsBySeller: Record<string, typeof items> = {};
        for (const item of items) {
            let sellerId: string | undefined = (item as any).seller_id || (item as any).sellerId;

            if (!sellerId && item.id) {
                // Fallback: fetch seller_id from products table
                const { data: prod, error: prodErr } = await supabase
                    .from('products')
                    .select('seller_id')
                    .eq('id', item.id)
                    .maybeSingle();
                if (!prodErr && prod?.seller_id) {
                    sellerId = prod.seller_id as string;
                }
            }

            if (!sellerId) {
                throw new Error(`Missing seller information for product: ${item.name}`);
            }

            if (!itemsBySeller[sellerId]) {
                itemsBySeller[sellerId] = [];
            }
            itemsBySeller[sellerId].push(item);
        }

        const createdOrderIds: string[] = [];
        const createdOrderUuids: string[] = [];
        const sharedBaseNumber = generateOrderNumber();
        let sellerIndex = 1;

        // 3. Process orders per seller
        for (const [sellerId, sellerItems] of Object.entries(itemsBySeller)) {
            const orderNumber = `${sharedBaseNumber}#${sellerIndex++}`;

            // Calculate subtotal for this specific order
            const orderSubtotal = sellerItems.reduce(
                (sum, item) => sum + (item.quantity * (item.price || 0)),
                0
            );

            // First, create a shipping address record
            // Build address_line_1 properly - filter out empty values
            const addressParts = [
                shippingAddress.fullName || '',
                shippingAddress.phone || '',
                shippingAddress.street || ''
            ].filter(Boolean);
            const addressLine1 = addressParts.length > 0 ? addressParts.join(', ') : shippingAddress.street || 'Address';

            const { data: addressData, error: addressError } = await supabase
                .from('shipping_addresses')
                .insert({
                    user_id: userId,
                    label: 'Checkout Address',
                    address_line_1: addressLine1,
                    barangay: shippingAddress.barangay || '',
                    city: shippingAddress.city || 'Manila',
                    province: shippingAddress.province || 'Metro Manila',
                    region: shippingAddress.region || 'NCR',
                    postal_code: shippingAddress.postalCode || '0000',
                    is_default: false,
                    address_type: 'residential',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (addressError) throw addressError;

            // Create order with multiple fallback strategies for robustness
            let orderData: { id: string; order_number: string; buyer_id: string } | null = null;
            
            // Strategy 1: Try the safe RPC function (if it exists in the database)
            // This function has built-in exception handling for trigger errors
            const { data: rpcResult, error: rpcError } = await supabase
                .rpc('create_order_safe', {
                    p_order_number: orderNumber,
                    p_buyer_id: userId,
                    p_order_type: 'ONLINE',
                    p_address_id: addressData.id,
                    p_payment_status: 'pending_payment',
                    p_shipment_status: 'waiting_for_seller',
                    p_notes: `Order from ${shippingAddress.fullName}`
                });

            if (!rpcError && rpcResult && rpcResult.success) {
                // RPC function worked
                console.log('[Checkout] ✅ Order created via safe RPC:', orderNumber);
                if (rpcResult.warning) {
                    console.warn('[Checkout] ⚠️ RPC warning:', rpcResult.warning);
                }
                orderData = {
                    id: rpcResult.order_id,
                    order_number: rpcResult.order_number,
                    buyer_id: rpcResult.buyer_id
                };
            } else {
                // Strategy 2: Fall back to direct insert (RPC might not exist yet)
                console.log('[Checkout] RPC not available or failed, using direct insert...');
                
                const { data: insertedOrder, error: orderError } = await supabase
                    .from('orders')
                    .insert({
                        order_number: orderNumber,
                        buyer_id: userId,
                        order_type: 'ONLINE',
                        address_id: addressData.id,
                        payment_status: 'pending_payment',
                        shipment_status: 'waiting_for_seller',
                        notes: `Order from ${shippingAddress.fullName}`,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (orderError) {
                    const isMaterializedViewError = orderError.message?.includes('materialized view') ||
                                                     orderError.message?.includes('concurrently') ||
                                                     orderError.code === '55000';
                    
                    if (isMaterializedViewError) {
                        console.warn('[Checkout] ⚠️ Materialized view error detected, attempting recovery...');
                        
                        // Wait a moment for any async operations to complete
                        await new Promise(resolve => setTimeout(resolve, 200));
                        
                        // Try to fetch the order with retry logic
                        let retryCount = 0;
                        const maxRetries = 3;
                        
                        while (retryCount < maxRetries && !orderData) {
                            const { data: existingOrder } = await supabase
                                .from('orders')
                                .select('id, order_number, buyer_id')
                                .eq('order_number', orderNumber)
                                .eq('buyer_id', userId)
                                .maybeSingle();
                            
                            if (existingOrder) {
                                console.log('[Checkout] ✅ Order found on retry', retryCount + 1, ':', orderNumber);
                                orderData = existingOrder;
                            } else {
                                retryCount++;
                                if (retryCount < maxRetries) {
                                    await new Promise(resolve => setTimeout(resolve, 300 * retryCount));
                                }
                            }
                        }
                        
                        if (!orderData) {
                            // Order wasn't created - need database fix
                            console.error('[Checkout] ❌ Order not found after retries. Database fix required.');
                            console.error('[Checkout] Please run the SQL migration: 004_fix_buyer_orders_view.sql');
                            throw new Error(
                                'Order creation blocked by database trigger. ' +
                                'Please contact support or run the database migration to fix this issue.'
                            );
                        }
                    } else {
                        throw orderError;
                    }
                } else {
                    orderData = insertedOrder;
                }
            }
            
            if (!orderData) {
                throw new Error('Failed to create order - no order data returned');
            }

            createdOrderIds.push(orderData.order_number);
            createdOrderUuids.push(orderData.id);

            console.log(`[Checkout] ✅ Order created: ${orderData.order_number} for seller ${sellerId}`);

            // 💬 Send order confirmation chat message to buyer
            orderNotificationService.sendStatusUpdateNotification(
                orderData.id,
                'pending',
                sellerId,
                orderData.buyer_id
            ).catch(err => {
                console.error('[Checkout] ❌ Failed to send order confirmation chat:', err);
            });

            // 🔔 Send bell notification to buyer about order placed
            notificationService.notifyBuyerOrderStatus({
                buyerId: orderData.buyer_id,
                orderId: orderData.id,
                orderNumber: orderData.order_number,
                status: 'placed',
                message: `Your order #${orderData.order_number} has been placed successfully!`
            }).catch(err => {
                console.error('[Checkout] ❌ Failed to send order placed notification:', err);
            });

            // 🔔 Send bell notification to seller about new order
            notificationService.notifySellerNewOrder({
                sellerId: sellerId,
                orderId: orderData.id,
                orderNumber: orderData.order_number,
                buyerName: shippingAddress.fullName,
                total: orderSubtotal
            }).catch(err => {
                console.error('[Checkout] ❌ Failed to send seller notification:', err);
            });

            // Create order items
            const orderItemsData = sellerItems.map(item => {
                // Build personalized options with dynamic labels and legacy support
                let personalizedOptions: Record<string, any> | null = null;
                
                if (item.selectedVariant) {
                    personalizedOptions = {};
                    
                    // Store dynamic variant labels and values
                    if (item.selectedVariant.option1Value) {
                        personalizedOptions.option1Label = item.selectedVariant.option1Label || 'Option 1';
                        personalizedOptions.option1Value = item.selectedVariant.option1Value;
                    }
                    if (item.selectedVariant.option2Value) {
                        personalizedOptions.option2Label = item.selectedVariant.option2Label || 'Option 2';
                        personalizedOptions.option2Value = item.selectedVariant.option2Value;
                    }
                    
                    // Legacy support for color/size
                    if (item.selectedVariant.size) {
                        personalizedOptions.size = item.selectedVariant.size;
                    }
                    if (item.selectedVariant.color) {
                        personalizedOptions.color = item.selectedVariant.color;
                    }
                    
                    // Store variant ID if available
                    if (item.selectedVariant.variantId) {
                        personalizedOptions.variantId = item.selectedVariant.variantId;
                    }
                    
                    // Build display name
                    const displayParts: string[] = [];
                    if (personalizedOptions.option1Value) {
                        displayParts.push(`${personalizedOptions.option1Label}: ${personalizedOptions.option1Value}`);
                    }
                    if (personalizedOptions.option2Value) {
                        displayParts.push(`${personalizedOptions.option2Label}: ${personalizedOptions.option2Value}`);
                    }
                    // Fallback to legacy
                    if (displayParts.length === 0) {
                        if (personalizedOptions.size) displayParts.push(`Size: ${personalizedOptions.size}`);
                        if (personalizedOptions.color) displayParts.push(`Color: ${personalizedOptions.color}`);
                    }
                    
                    if (displayParts.length > 0) {
                        personalizedOptions.name = displayParts.join(', ');
                    }
                }
                
                return {
                    order_id: orderData.id,
                    product_id: item.id,
                    product_name: item.name,
                    primary_image_url: item.image, // Use primary image URL field
                    price: item.price || 0,
                    price_discount: 0, // No discount initially
                    shipping_price: 0, // No shipping price initially
                    shipping_discount: 0, // No shipping discount initially
                    quantity: item.quantity,
                    variant_id: item.selectedVariant?.variantId || null,
                    personalized_options: personalizedOptions,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
            });

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItemsData);

            // Handle materialized view error on order_items - the insert might have succeeded
            if (itemsError) {
                const isMaterializedViewError = itemsError.message?.includes('materialized view') ||
                                                 itemsError.message?.includes('concurrently') ||
                                                 itemsError.code === '55000';
                
                if (isMaterializedViewError) {
                    console.warn('[Checkout] ⚠️ Materialized view error on order_items, checking if items were created...');
                    
                    // Wait briefly and check if items exist
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    const { data: existingItems } = await supabase
                        .from('order_items')
                        .select('id')
                        .eq('order_id', orderData.id);
                    
                    if (existingItems && existingItems.length > 0) {
                        console.log('[Checkout] ✅ Order items found despite trigger error');
                        // Items were created - continue
                    } else {
                        // Items weren't created - try one more time without the trigger issue
                        console.warn('[Checkout] Order items not found, retrying insert...');
                        
                        const { error: retryError } = await supabase
                            .from('order_items')
                            .insert(orderItemsData);
                        
                        if (retryError && !retryError.message?.includes('materialized view')) {
                            throw retryError; // Real error
                        }
                        
                        // Check again
                        const { data: retryItems } = await supabase
                            .from('order_items')
                            .select('id')
                            .eq('order_id', orderData.id);
                        
                        if (!retryItems || retryItems.length === 0) {
                            console.error('[Checkout] ❌ Failed to create order items. Database fix required.');
                            throw new Error(
                                'Order items creation blocked by database trigger. ' +
                                'Please contact support or run the database migration.'
                            );
                        }
                        console.log('[Checkout] ✅ Order items created on retry');
                    }
                } else {
                    throw itemsError;
                }
            }

            // Create payment record
            const { error: paymentError } = await supabase
                .from('order_payments')
                .insert({
                    order_id: orderData.id,
                    payment_method: { type: paymentMethod }, // Store payment method as JSON
                    amount: orderSubtotal,
                    status: 'pending', // Payment status
                    created_at: new Date().toISOString()
                });

            if (paymentError) throw paymentError;

            // Update stock in product_variants table (not products table)
            for (const item of sellerItems) {
                if (!item.id) continue;

                try {
                    // If specific variant was selected, update that variant's stock
                    if (item.selectedVariant?.variantId) {
                        const { data: currentVariant } = await supabase
                            .from('product_variants')
                            .select('stock')
                            .eq('id', item.selectedVariant.variantId)
                            .single();

                        if (currentVariant) {
                            await supabase
                                .from('product_variants')
                                .update({
                                    stock: Math.max(0, (currentVariant.stock || 0) - item.quantity)
                                })
                                .eq('id', item.selectedVariant.variantId);
                        }
                    } else {
                        // No specific variant selected - update the first/primary variant
                        const { data: variants } = await supabase
                            .from('product_variants')
                            .select('id, stock')
                            .eq('product_id', item.id)
                            .order('created_at', { ascending: true })
                            .limit(1);

                        if (variants && variants.length > 0) {
                            await supabase
                                .from('product_variants')
                                .update({
                                    stock: Math.max(0, (variants[0].stock || 0) - item.quantity)
                                })
                                .eq('id', variants[0].id);
                        }
                    }
                } catch (stockErr) {
                    console.warn(`[Checkout] Failed to update stock for ${item.name}:`, stockErr);
                    // Continue - don't fail checkout for stock update issues
                }
            }
        }

        // 4. Handle Bazcoins (Buyer Update)
        if (usedBazcoins > 0 || earnedBazcoins > 0) {
            const { data: buyer, error: fetchError } = await supabase
                .from('buyers')
                .select('bazcoins')
                .eq('id', userId)
                .single();

            if (fetchError) {
                console.error('[Checkout] Error fetching buyer for Bazcoins:', fetchError);
                throw new Error('Failed to fetch user profile for Bazcoins update');
            }

            const currentCoins = buyer?.bazcoins || 0;
            const newBalance = currentCoins - usedBazcoins + earnedBazcoins;

            const { error: updateError } = await supabase
                .from('buyers')
                .update({ bazcoins: newBalance })
                .eq('id', userId);

            if (updateError) {
                console.error('[Checkout] Error updating Bazcoins:', updateError);
                throw new Error('Failed to update Bazcoins balance');
            }

        }

        // 5. Clear checked-out items from cart
        const productIdsToRemove = items.map(i => i.id).filter(Boolean);
        if (productIdsToRemove.length > 0) {
            // Get cart for this user (simple query without expires_at filter)
            const { data: cart } = await supabase
                .from('carts')
                .select('id')
                .eq('buyer_id', userId)
                .maybeSingle();

            if (cart) {
                const { error: deleteError } = await supabase
                    .from('cart_items')
                    .delete()
                    .eq('cart_id', cart.id)
                    .in('product_id', productIdsToRemove);

                if (deleteError) {
                    console.warn('[Checkout] Failed to clear cart items:', deleteError.message);
                } else {
                    console.log('[Checkout] ✅ Cleared', productIdsToRemove.length, 'items from cart');
                }
            }
        }


        return {
            success: true,
            orderIds: createdOrderIds,
            orderUuids: createdOrderUuids
        };

    } catch (error: any) {
        console.error('[Checkout] ❌ Checkout processing failed:', error);
        return { success: false, error: error.message || 'Unknown error occurred' };
    }
};
