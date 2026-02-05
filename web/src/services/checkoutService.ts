/**
 * Checkout Service
 * Handles the checkout process, order creation, and stock management
 * Adheres to the Class-based Service Layer Architecture
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { CartItem } from '@/types/database.types';
import { notificationService } from './notificationService';
import { orderNotificationService } from './orderNotificationService';

// Define the payload for the checkout process
export interface CheckoutPayload {
    userId: string;
    items: (CartItem & {
        product?: {
            price?: number;
            seller_id?: string;
            name?: string;
            images?: string[];
            primary_image?: string | null;
        } | null
    })[];
    totalAmount: number;
    shippingAddress: any; // Using any for now to match flexible address structure
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
    error?: string;
    newBazcoinsBalance?: number;
}

export class CheckoutService {
    private static instance: CheckoutService;

    private constructor() { }

    public static getInstance(): CheckoutService {
        if (!CheckoutService.instance) {
            CheckoutService.instance = new CheckoutService();
        }
        return CheckoutService.instance;
    }

    /**
     * Generate a unique order number with format: ORD-(YEAR)029283
     * Example: ORD-2025029283
     */
    private generateOrderNumber(): string {
        const year = new Date().getFullYear();
        const randomNum = Math.floor(100000 + Math.random() * 900000); // 6 digits
        return `ORD-${year}${randomNum}`;
    }

    /**
     * Process the checkout
     */
    async processCheckout(payload: CheckoutPayload): Promise<CheckoutResult> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured - cannot process checkout');
        }

        const {
            userId,
            items,
            shippingAddress,
            paymentMethod,
            usedBazcoins,
            earnedBazcoins,
            email
        } = payload;

        console.log("Starting checkout process...", payload);

        try {
            // 1. Validate Stock
            for (const item of items) {
                if (!item.product_id) continue;

                const { data: product, error: productError } = await supabase
                    .from('products')
                    .select('stock, variants')
                    .eq('id', item.product_id)
                    .single();

                if (productError || !product) {
                    throw new Error(`Product not found for item ${item.product_id}`);
                }

                if (item.selected_variant) {
                    const selectedVar = item.selected_variant as any;
                    const variantsList = Array.isArray(product.variants) ? product.variants : [];
                    
                    // If product has no variants, treat as regular product
                    if (variantsList.length === 0) {
                        console.warn(`Product ${item.product_id} has selected_variant in cart but no variants in database. Using product stock.`);
                        if ((product.stock || 0) < item.quantity) {
                            throw new Error(`Insufficient stock for product. Available: ${product.stock || 0}, Requested: ${item.quantity}`);
                        }
                    } else {
                        // Try multiple matching strategies
                        let variant = null;
                        
                        // Strategy 1: Match by ID (if both exist)
                        if (selectedVar.id) {
                            variant = variantsList.find((v: any) => v.id === selectedVar.id);
                        }
                        
                        // Strategy 2: Match by SKU (if both exist)
                        if (!variant && selectedVar.sku) {
                            variant = variantsList.find((v: any) => v.sku === selectedVar.sku);
                        }
                        
                        // Strategy 3: Match by name
                        if (!variant && selectedVar.name) {
                            variant = variantsList.find((v: any) => v.name === selectedVar.name);
                        }
                        
                        // Strategy 4: Match by price + name combination
                        if (!variant && selectedVar.price && selectedVar.name) {
                            variant = variantsList.find((v: any) => 
                                v.price === selectedVar.price && v.name === selectedVar.name
                            );
                        }
                        
                        // Strategy 5: Match by color field (extract from name if needed)
                        if (!variant && selectedVar.name) {
                            // Try to extract color from name like "Color: Classic Blue"
                            const colorMatch = selectedVar.name.match(/Color:\s*(.+)/i);
                            const colorToFind = selectedVar.color || (colorMatch ? colorMatch[1] : null);
                            
                            if (colorToFind) {
                                // Find first variant with matching color
                                variant = variantsList.find((v: any) => 
                                    v.color && v.color.toLowerCase() === colorToFind.toLowerCase()
                                );
                            }
                        }
                        
                        // Strategy 6: Match by size field (extract from name if needed)
                        if (!variant && selectedVar.name) {
                            const sizeMatch = selectedVar.name.match(/Size:\s*(.+)/i);
                            const sizeToFind = selectedVar.size || (sizeMatch ? sizeMatch[1] : null);
                            
                            if (sizeToFind) {
                                variant = variantsList.find((v: any) => 
                                    v.size && v.size.toString() === sizeToFind.toString()
                                );
                            }
                        }
                        
                        // Strategy 7: Match by price alone (last resort for same-priced variants)
                        if (!variant && selectedVar.price) {
                            const samePrice = variantsList.filter((v: any) => v.price === selectedVar.price);
                            if (samePrice.length === 1) {
                                variant = samePrice[0];
                                console.warn(`Matched variant by price alone for product ${item.product_id}`);
                            }
                        }
                        
                        if (!variant) {
                            console.error('Variant matching failed:', {
                                productId: item.product_id,
                                selectedVariant: selectedVar,
                                availableVariants: variantsList
                            });
                            console.log('Selected variant structure:', JSON.stringify(selectedVar, null, 2));
                            console.log('Available variants structure:', JSON.stringify(variantsList, null, 2));
                            
                            // Build a readable error message
                            const variantDescriptions = variantsList.map((v: any) => {
                                // Try to describe the variant by whatever fields it has
                                return v.name || v.color || v.size || v.sku || JSON.stringify(v);
                            }).join(', ');
                            
                            throw new Error(
                                `Variant not found for product ${item.product_id}. ` +
                                `Looking for: ${JSON.stringify(selectedVar)}. ` +
                                `Available: ${variantDescriptions || 'No variants'}`
                            );
                        }

                        if (variant.stock < item.quantity) {
                            throw new Error(`Insufficient stock for ${selectedVar.name || 'variant'}. Available: ${variant.stock}, Requested: ${item.quantity}`);
                        }
                    }
                } else {
                    if ((product.stock || 0) < item.quantity) {
                        throw new Error(`Insufficient stock for product. Available: ${product.stock || 0}, Requested: ${item.quantity}`);
                    }
                }
            }

            // 2. Create Order Records
            const itemsBySeller: Record<string, typeof items> = {};
            items.forEach(item => {
                const sellerId = item.product?.seller_id;
                if (!sellerId) {
                    throw new Error("Missing seller information for some items.");
                }
                if (!itemsBySeller[sellerId]) {
                    itemsBySeller[sellerId] = [];
                }
                itemsBySeller[sellerId].push(item);
            });

            const createdOrderNumbers: string[] = [];
            const sharedBaseNumber = this.generateOrderNumber();
            let sellerIndex = 1;

            // Process per seller
            for (const [sellerId, sellerItems] of Object.entries(itemsBySeller)) {
                const orderNumber = `${sharedBaseNumber}#${sellerIndex++}`;

                // Calculate subtotals for this specific order
                const orderSubtotal = sellerItems.reduce((sum, item) =>
                    sum + (item.quantity * ((item.selected_variant as any)?.price || item.product?.price || 0)), 0);

                const { data: orderData, error: orderError } = await supabase
                    .from('orders')
                    .insert({
                        order_number: orderNumber,
                        buyer_id: userId,
                        seller_id: sellerId,
                        buyer_name: shippingAddress.fullName,
                        buyer_email: email,
                        shipping_address: shippingAddress,
                        payment_method: { type: paymentMethod },
                        status: 'pending_payment',
                        payment_status: 'pending',
                        subtotal: orderSubtotal,
                        total_amount: orderSubtotal,
                        currency: 'PHP',
                        shipping_cost: 0,
                        discount_amount: 0,
                        tax_amount: 0,
                        is_reviewed: false,
                        is_returnable: true,
                        return_window: 7,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (orderError) throw orderError;
                createdOrderNumbers.push(orderData.order_number);

                console.log(`✅ Order created: ${orderData.order_number} for seller ${sellerId}`);

                // 🔔 Create seller notification for new order
                notificationService.notifySellerNewOrder({
                    sellerId: sellerId,
                    orderId: orderData.id,
                    orderNumber: orderData.order_number,
                    buyerName: shippingAddress.fullName,
                    total: orderSubtotal
                }).catch(err => {
                    console.error('❌ Failed to create seller notification:', err);
                });

                // � Create buyer notification for order placed
                notificationService.notifyBuyerOrderStatus({
                    buyerId: orderData.buyer_id,
                    orderId: orderData.id,
                    orderNumber: orderData.order_number,
                    status: 'placed',
                    message: `Your order #${orderData.order_number} has been placed successfully! The seller will confirm it shortly.`
                }).catch(err => {
                    console.error('❌ Failed to create buyer notification:', err);
                });

                // �💬 Send order confirmation chat message to buyer
                orderNotificationService.sendStatusUpdateNotification(
                    orderData.id,
                    'pending',
                    sellerId,
                    orderData.buyer_id
                ).catch(err => {
                    console.error('❌ Failed to send order confirmation chat:', err);
                });

                // Create Order Items
                const orderItemsData = sellerItems.map(item => ({
                    order_id: orderData.id,
                    product_id: item.product_id,
                    product_name: (item.selected_variant as any)?.name || item.product?.name || 'Unknown Product',
                    product_images: item.product?.images || [],
                    quantity: item.quantity,
                    price: (item.selected_variant as any)?.price || item.product?.price || 0,
                    subtotal: item.quantity * ((item.selected_variant as any)?.price || item.product?.price || 0),
                    selected_variant: item.selected_variant,
                    status: 'pending',
                    is_reviewed: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }));

                const { error: itemsError } = await supabase
                    .from('order_items')
                    .insert(orderItemsData);

                if (itemsError) throw itemsError;

                // Update Stock & Sales Count
                for (const item of sellerItems) {
                    if (!item.product_id) continue;

                    if (item.selected_variant) {
                        const { data: currentProd } = await supabase
                            .from('products')
                            .select('variants, stock, sales_count')
                            .eq('id', item.product_id)
                            .single();

                        if (currentProd) {
                            const variantsList = Array.isArray(currentProd.variants) ? currentProd.variants : [];
                            
                            // If product has no variants, treat as regular product
                            if (variantsList.length === 0) {
                                console.warn(`Product ${item.product_id} has selected_variant in order but no variants in database. Updating main stock.`);
                                await supabase
                                    .from('products')
                                    .update({
                                        stock: (currentProd.stock || 0) - item.quantity,
                                        sales_count: (currentProd.sales_count || 0) + item.quantity
                                    })
                                    .eq('id', item.product_id);
                            } else {
                                const updatedVariants = variantsList.map((v: any) => {
                                    if (v.id === (item.selected_variant as any)?.id) {
                                        return { ...v, stock: v.stock - item.quantity };
                                    }
                                    return v;
                                });

                                await supabase
                                    .from('products')
                                    .update({
                                        variants: updatedVariants,
                                        sales_count: (currentProd.sales_count || 0) + item.quantity
                                    })
                                    .eq('id', item.product_id);
                            }
                        }
                    } else {
                        const { data: currentProd } = await supabase
                            .from('products')
                            .select('stock, sales_count')
                            .eq('id', item.product_id)
                            .single();

                        if (currentProd) {
                            await supabase
                                .from('products')
                                .update({
                                    stock: (currentProd.stock || 0) - item.quantity,
                                    sales_count: (currentProd.sales_count || 0) + item.quantity
                                })
                                .eq('id', item.product_id);
                        }
                    }
                }
            }

            // 3. Handle Bazcoins (Buyer Update)
            let newBalance: number | undefined;
            if (usedBazcoins > 0 || earnedBazcoins > 0) {
                const { data: buyer } = await supabase
                    .from('buyers')
                    .select('bazcoins')
                    .eq('id', userId)
                    .single();

                const currentCoins = buyer?.bazcoins || 0;
                newBalance = currentCoins - usedBazcoins + earnedBazcoins;

                await supabase
                    .from('buyers')
                    .update({ bazcoins: newBalance })
                    .eq('id', userId);
            }

            // 4. Clear Cart
            const itemIdsToRemove = items.map(i => i.id);
            if (itemIdsToRemove.length > 0) {
                await supabase
                    .from('cart_items')
                    .delete()
                    .in('id', itemIdsToRemove);
            }

            return {
                success: true,
                orderIds: createdOrderNumbers,
                newBazcoinsBalance: newBalance
            };

        } catch (error: any) {
            console.error("Checkout processing failed:", error);
            throw new Error(error.message || 'Checkout process failed.');
        }
    }
}

export const checkoutService = CheckoutService.getInstance();
