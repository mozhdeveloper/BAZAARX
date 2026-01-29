import { supabase } from '../lib/supabase';
import type { CartItem } from '../types';

// Define the payload for the checkout process
export interface CheckoutPayload {
    userId: string;
    items: CartItem[];
    totalAmount: number;
    shippingAddress: {
        fullName: string;
        street: string;
        city: string;
        province: string;
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

    console.log('[Checkout] Starting checkout process...', { userId, itemCount: items.length });

    try {
        // 1. Validate Stock
        for (const item of items) {
            if (!item.id) continue;

            const { data: product, error: productError } = await supabase
                .from('products')
                .select('stock, variants')
                .eq('id', item.id)
                .single();

            if (productError || !product) {
                throw new Error(`Product not found for item ${item.id}`);
            }

            // For now, we're checking base stock (variants support can be added later)
            if ((product.stock || 0) < item.quantity) {
                throw new Error(`Insufficient stock for ${item.name}`);
            }
        }

        // 2. Group items by seller
        const itemsBySeller: Record<string, typeof items> = {};
        items.forEach(item => {
            const sellerId = item.sellerId;
            if (!sellerId) {
                throw new Error(`Missing seller information for product: ${item.name}`);
            }
            if (!itemsBySeller[sellerId]) {
                itemsBySeller[sellerId] = [];
            }
            itemsBySeller[sellerId].push(item);
        });

        const createdOrderIds: string[] = [];
        const sharedBaseNumber = generateOrderNumber();
        let sellerIndex = 1;

        // 3. Process orders per seller
        for (const [sellerId, sellerItems] of Object.entries(itemsBySeller)) {
            const orderNumber = `${sharedBaseNumber}#${sellerIndex++}`;

            // Calculate subtotal for this specific order
            const orderSubtotal = sellerItems.reduce(
                (sum, item) => sum + (item.quantity * item.price),
                0
            );

            // Create order
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
            createdOrderIds.push(orderData.order_number);

            console.log(`[Checkout] ✅ Order created: ${orderData.order_number} for seller ${sellerId}`);

            // Create order items
            const orderItemsData = sellerItems.map(item => ({
                order_id: orderData.id,
                product_id: item.id,
                product_name: item.name,
                product_images: item.images || [item.image],
                quantity: item.quantity,
                price: item.price,
                subtotal: item.quantity * item.price,
                selected_variant: null, // Can be extended for variant support
                status: 'pending',
                is_reviewed: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItemsData);

            if (itemsError) throw itemsError;

            // Update stock & sales count
            for (const item of sellerItems) {
                if (!item.id) continue;

                const { data: currentProd } = await supabase
                    .from('products')
                    .select('stock, sales_count')
                    .eq('id', item.id)
                    .single();

                if (currentProd) {
                    await supabase
                        .from('products')
                        .update({
                            stock: (currentProd.stock || 0) - item.quantity,
                            sales_count: (currentProd.sales_count || 0) + item.quantity
                        })
                        .eq('id', item.id);
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

            console.log(`[Checkout] Bazcoins update: ${currentCoins} - ${usedBazcoins} + ${earnedBazcoins} = ${newBalance}`);

            const { error: updateError } = await supabase
                .from('buyers')
                .update({ bazcoins: newBalance })
                .eq('id', userId);

            if (updateError) {
                console.error('[Checkout] Error updating Bazcoins:', updateError);
                throw new Error('Failed to update Bazcoins balance');
            }

            console.log(`[Checkout] ✅ Updated Bazcoins: ${currentCoins} -> ${newBalance}`);
        }

        // 5. Clear cart items
        const itemIdsToRemove = items.map(i => i.id);
        if (itemIdsToRemove.length > 0) {
            // Get cart ID for the user
            const { data: cart } = await supabase
                .from('carts')
                .select('id')
                .eq('buyer_id', userId)
                .is('expires_at', null)
                .maybeSingle();

            if (cart) {
                await supabase
                    .from('cart_items')
                    .delete()
                    .eq('cart_id', cart.id)
                    .in('product_id', itemIdsToRemove);

                // Update cart total
                await supabase
                    .from('carts')
                    .update({ total_amount: 0 })
                    .eq('id', cart.id);
            }
        }

        console.log('[Checkout] ✅ Checkout completed successfully');

        return {
            success: true,
            orderIds: createdOrderIds
        };

    } catch (error: any) {
        console.error('[Checkout] ❌ Checkout processing failed:', error);
        return { success: false, error: error.message || 'Unknown error occurred' };
    }
};
