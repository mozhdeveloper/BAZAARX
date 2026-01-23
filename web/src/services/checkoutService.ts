import { supabase } from '@/lib/supabase';
import type { CartItem, ProductVariant } from '@/types/database.types';

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

/**
 * Generate a unique order number with format: ORD-(YEAR)029283
 * Example: ORD-2025029283
 */
const generateOrderNumber = (): string => {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(100000 + Math.random() * 900000); // 6 digits
    return `ORD-${year}${randomNum}`;
};

/**
 * Group items by seller to create separate orders if needed
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
                const variantId = item.selected_variant.id;
                // Check if variants is an array or JSON object that needs parsing
                const variantsList = Array.isArray(product.variants) ? product.variants : [];
                const variant = variantsList.find((v: any) => v.id === variantId);

                if (!variant) {
                    throw new Error(`Variant not found for product ${item.product_id}`);
                }

                if (variant.stock < item.quantity) {
                    throw new Error(`Insufficient stock for ${item.selected_variant.name}`);
                }
            } else {
                if ((product.stock || 0) < item.quantity) {
                    throw new Error(`Insufficient stock for product`);
                }
            }
        }

        // 2. Create Order Record
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

        const createdOrderIds: string[] = [];

        const sharedBaseNumber = generateOrderNumber();
        let sellerIndex = 1;

        // Process per seller
        for (const [sellerId, sellerItems] of Object.entries(itemsBySeller)) {
            const orderNumber = `${sharedBaseNumber}#${sellerIndex++}`;

            // Calculate subtotals for this specific order
            const orderSubtotal = sellerItems.reduce((sum, item) => sum + (item.quantity * (item.selected_variant?.price || item.product?.price || 0)), 0);

            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert({
                    order_number: orderNumber,
                    buyer_id: userId,
                    seller_id: sellerId,
                    buyer_name: shippingAddress.fullName,
                    buyer_email: email,
                    shipping_address: shippingAddress,
                    payment_method: { type: paymentMethod, details: {} },
                    status: 'pending_payment',
                    payment_status: 'pending',
                    subtotal: orderSubtotal,
                    total_amount: orderSubtotal, // Simplified
                    currency: 'PHP',
                    shipping_cost: 0, // Simplified
                    discount_amount: 0, // Simplified
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
            createdOrderIds.push(orderData.order_number);

            // Create Order Items
            const orderItemsData = sellerItems.map(item => ({
                order_id: orderData.id,
                product_id: item.product_id,
                product_name: item.selected_variant?.name || item.product?.name || 'Unknown Product',
                product_images: item.product?.images || [],
                quantity: item.quantity,
                price: item.selected_variant?.price || item.product?.price || 0,
                subtotal: item.quantity * (item.selected_variant?.price || item.product?.price || 0),
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
                        const updatedVariants = (currentProd.variants as any[]).map((v: any) => {
                            if (v.id === item.selected_variant?.id) {
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

        // 3. Handle Bazcoins (Profile Update)
        if (usedBazcoins > 0 || earnedBazcoins > 0) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('bazcoins')
                .eq('id', userId)
                .single();

            const currentCoins = profile?.bazcoins || 0;
            const newBalance = currentCoins - usedBazcoins + earnedBazcoins;

            await supabase
                .from('profiles')
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
            orderIds: createdOrderIds
        };

    } catch (error: any) {
        console.error("Checkout processing failed:", error);
        return { success: false, error: error.message };
    }
};
