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
        selected_variant?: any;
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

                // First get product stock
                const { data: product, error: productError } = await supabase
                    .from('products')
                    .select('*')
                    .eq('id', item.product_id)
                    .maybeSingle();

                if (productError || !product) {
                    console.warn(`Product ${item.product_id} not found, skipping stock validation`);
                    continue; // Skip validation but allow checkout
                }
                
                // Get variants from product_variants table if needed
                let variantsList: any[] = [];
                if (item.selected_variant) {
                    const { data: variants } = await supabase
                        .from('product_variants')
                        .select('*')
                        .eq('product_id', item.product_id);
                    variantsList = variants || [];
                }

                if (item.selected_variant) {
                    const selectedVar = item.selected_variant as any;
                    
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
                            variant = variantsList.find((v: any) => v.variant_name === selectedVar.name || v.name === selectedVar.name);
                        }
                        
                        // Strategy 4: Match by size/color combination
                        if (!variant && (selectedVar.size || selectedVar.color)) {
                            variant = variantsList.find((v: any) => 
                                (!selectedVar.size || v.size === selectedVar.size) &&
                                (!selectedVar.color || v.color === selectedVar.color)
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
            let orderIndex = 1;

            // For the normalized schema, we create ONE order and associate items with it
            // Each order can have items from different sellers
            const orderNumber = sharedBaseNumber;

            // Calculate totals (these go on order_items, not orders table)
            const totalAmount = items.reduce((sum, item) =>
                sum + (item.quantity * ((item.selected_variant as any)?.price || item.product?.price || 0)), 0);

            // First, create or find recipient (for shipping info)
            let recipientId: string | null = null;
            try {
                const { data: recipientData, error: recipientError } = await supabase
                    .from('order_recipients')
                    .insert({
                        first_name: shippingAddress.fullName?.split(' ')[0] || '',
                        last_name: shippingAddress.fullName?.split(' ').slice(1).join(' ') || '',
                        phone: shippingAddress.phone || '',
                        email: email || '',
                    })
                    .select()
                    .single();
                
                if (!recipientError && recipientData) {
                    recipientId = recipientData.id;
                }
            } catch (e) {
                console.warn('Could not create recipient:', e);
            }

            // Create shipping address entry
            let shippingAddressId: string | null = null;
            try {
                const { data: addressData, error: addressError } = await supabase
                    .from('shipping_addresses')
                    .insert({
                        user_id: userId,
                        label: 'Order Address',
                        address_line_1: shippingAddress.street || '',
                        address_line_2: '',
                        city: shippingAddress.city || '',
                        province: shippingAddress.province || '',
                        region: shippingAddress.province || '', // Fallback to province
                        postal_code: shippingAddress.postalCode || '',
                        is_default: false
                    })
                    .select()
                    .single();
                
                if (!addressError && addressData) {
                    shippingAddressId = addressData.id;
                }
            } catch (e) {
                console.warn('Could not create shipping address:', e);
            }

            // Create the order with the ACTUAL schema columns
            // Note: orders table doesn't have shipping_address_id - store full address in notes as JSON
            const addressJson = JSON.stringify({
                fullName: shippingAddress.fullName,
                street: shippingAddress.street,
                city: shippingAddress.city,
                province: shippingAddress.province,
                postalCode: shippingAddress.postalCode,
                phone: shippingAddress.phone
            });
            
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert({
                    order_number: orderNumber,
                    buyer_id: userId,
                    order_type: 'ONLINE',
                    payment_status: paymentMethod === 'cod' ? 'pending_payment' : 'pending_payment',
                    shipment_status: 'waiting_for_seller',
                    recipient_id: recipientId,
                    notes: `SHIPPING_ADDRESS:${addressJson}|Payment: ${paymentMethod}`
                })
                .select()
                .single();

            if (orderError) throw orderError;
            createdOrderNumbers.push(orderData.order_number);

            console.log(`✅ Order created: ${orderData.order_number}`);

            // 🔔 Create notifications for sellers (reusing itemsBySeller from above)
            for (const [sellerId, sellerItems] of Object.entries(itemsBySeller)) {
                const sellerTotal = sellerItems.reduce((sum, item) =>
                    sum + (item.quantity * ((item.selected_variant as any)?.price || item.product?.price || 0)), 0);
                
                notificationService.notifySellerNewOrder({
                    sellerId: sellerId,
                    orderId: orderData.id,
                    orderNumber: orderData.order_number,
                    buyerName: shippingAddress.fullName || 'Customer',
                    total: sellerTotal
                }).catch(err => {
                    console.error('❌ Failed to create seller notification:', err);
                });
            }

            // 🔔 Create buyer notification for order placed
            notificationService.notifyBuyerOrderStatus({
                buyerId: orderData.buyer_id,
                orderId: orderData.id,
                orderNumber: orderData.order_number,
                status: 'placed',
                message: `Your order #${orderData.order_number} has been placed successfully! The seller will confirm it shortly.`
            }).catch(err => {
                console.error('❌ Failed to create buyer notification:', err);
            });

            // Create Order Items (using actual schema: order_id, product_id, product_name, price, quantity, variant_id, price_discount, shipping_price, shipping_discount)
            const orderItemsData = items.map(item => ({
                order_id: orderData.id,
                product_id: item.product_id,
                product_name: (item.selected_variant as any)?.name || item.product?.name || 'Unknown Product',
                primary_image_url: (item.selected_variant as any)?.image || 
                                   (item.selected_variant as any)?.thumbnail_url ||
                                   item.product?.primary_image ||
                                   (item.product?.images && item.product.images[0]) ||
                                   null,
                quantity: item.quantity,
                price: (item.selected_variant as any)?.price || item.product?.price || 0,
                variant_id: (item.selected_variant as any)?.id || null,
                price_discount: 0,
                shipping_price: 0,
                shipping_discount: 0
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItemsData);

            if (itemsError) throw itemsError;

            // Update Stock in product_variants (stock is in variants, not products table)
            for (const item of items) {
                if (!item.product_id) continue;

                if (item.selected_variant && (item.selected_variant as any)?.id) {
                    // Update variant stock
                    const variantId = (item.selected_variant as any).id;
                    const { data: currentVariant } = await supabase
                        .from('product_variants')
                        .select('stock')
                        .eq('id', variantId)
                        .single();
                    
                    if (currentVariant) {
                        await supabase
                            .from('product_variants')
                            .update({ stock: Math.max(0, (currentVariant.stock || 0) - item.quantity) })
                            .eq('id', variantId);
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
