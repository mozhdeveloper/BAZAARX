import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Order } from '@/types';
import { orderNotificationService } from './orderNotificationService';
import { notificationService } from './notificationService';

export class OrderService {
    private static instance: OrderService;

    private constructor() { }

    public static getInstance(): OrderService {
        if (!OrderService.instance) {
            OrderService.instance = new OrderService();
        }
        return OrderService.instance;
    }

    /**
     * Identifies if a string is a valid UUID or an Order Number (ORD-...)
     */
    private isUUID(id: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
    }

    async getOrders(userId: string): Promise<Order[]> {
        if (!isSupabaseConfigured()) return [];

        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
            *,
            items:order_items (
              *,
              product:products (
                *,
                seller:sellers!products_seller_id_fkey (
                  business_name,
                  store_name,
                  business_address,
                  rating,
                  is_verified
                )
              )
            )
          `)
                .eq('buyer_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []).map(this.mapFromDB.bind(this));
        } catch (error) {
            console.error('Error fetching orders:', error);
            throw new Error('Failed to load your orders.');
        }
    }

    async getOrderById(orderId: string): Promise<Order | null> {
        if (!isSupabaseConfigured()) return null;

        try {
            let query = supabase
                .from('orders')
                .select(`
          *,
          items:order_items (
              *,
              product:products (
                *,
                seller:sellers!products_seller_id_fkey (
                  business_name,
                  store_name,
                  business_address,
                  rating,
                  is_verified
                )
              )
            )
        `);

            if (this.isUUID(orderId)) {
                query = query.eq('id', orderId);
            } else {
                query = query.eq('order_number', orderId);
            }

            const { data, error } = await query.single();

            if (error) throw error;
            return data ? this.mapFromDB(data) : null;
        } catch (error) {
            console.error('Error fetching order by ID:', error);
            throw new Error('Could not find order details.');
        }
    }

    async updateOrderStatus(orderId: string, status: string, trackingNumber?: string): Promise<void> {
        if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

        try {
            // First fetch order to get buyer_id and seller_id for notification
            const { data: orderData, error: fetchError } = await supabase
                .from('orders')
                .select('id, order_number, buyer_id, seller_id, status')
                .eq('id', orderId)
                .single();

            if (fetchError) throw fetchError;

            const { error } = await supabase
                .from('orders')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', orderId);

            if (error) throw error;

            // Send notifications to buyer about status change
            if (orderData) {
                // 💬 Send chat message notification
                orderNotificationService.sendStatusUpdateNotification(
                    orderId,
                    status,
                    orderData.seller_id,
                    orderData.buyer_id,
                    trackingNumber
                ).catch(err => {
                    console.error('[OrderService] ❌ Failed to send status notification:', err);
                });

                // 🔔 Send bell notification based on status
                const statusMessages: Record<string, string> = {
                    confirmed: `Your order #${orderData.order_number} has been confirmed by the seller.`,
                    processing: `Your order #${orderData.order_number} is now being prepared.`,
                    shipped: `Your order #${orderData.order_number} has been shipped!${trackingNumber ? ` Tracking: ${trackingNumber}` : ''}`,
                    delivered: `Your order #${orderData.order_number} has been delivered! Enjoy your purchase!`,
                    cancelled: `Your order #${orderData.order_number} has been cancelled.`
                };

                if (statusMessages[status]) {
                    notificationService.notifyBuyerOrderStatus({
                        buyerId: orderData.buyer_id,
                        orderId: orderData.id,
                        orderNumber: orderData.order_number,
                        status: status,
                        message: statusMessages[status]
                    }).catch(err => {
                        console.error('[OrderService] ❌ Failed to send bell notification:', err);
                    });
                }
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            throw new Error('Failed to update order status.');
        }
    }

    async cancelOrder(orderId: string): Promise<void> {
        return this.updateOrderStatus(orderId, 'cancelled');
    }

    async createOrder(orderData: any): Promise<any> {
        if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
        const { data, error } = await supabase.from('orders').insert(orderData).select().single();
        if (error) throw error;
        return data;
    }

    async createOrderItems(items: any[]): Promise<void> {
        if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
        const { error } = await supabase.from('order_items').insert(items);
        if (error) throw error;
    }

    /**
     * Create a POS (Point of Sale) offline order
     * This saves directly to Supabase and is used for walk-in customers
     * 
     * IMPORTANT: Run this SQL in Supabase to allow POS orders:
     * ALTER TABLE orders ALTER COLUMN buyer_id DROP NOT NULL;
     */
    async createPOSOrder(
        sellerId: string,
        sellerName: string,
        items: {
            productId: string;
            productName: string;
            quantity: number;
            price: number;
            image: string;
            selectedColor?: string;
            selectedSize?: string;
        }[],
        total: number,
        note?: string
    ): Promise<{ orderId: string; orderNumber: string } | null> {
        // Generate order number
        const orderNumber = `POS-${Date.now().toString().slice(-8)}`;
        const orderId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });

        // Create order data for Supabase
        // buyer_id is NULL for walk-in customers (requires DB to allow NULL)
        const orderData = {
            id: orderId,
            order_number: orderNumber,
            buyer_id: null, // Walk-in customers - NULL for POS orders
            seller_id: sellerId,
            buyer_name: 'Walk-in Customer',
            buyer_email: 'pos@walkin.local',
            buyer_phone: null,
            order_type: 'OFFLINE' as const,
            pos_note: note || 'POS Sale',
            subtotal: total,
            discount_amount: 0,
            shipping_cost: 0,
            tax_amount: 0,
            total_amount: total,
            currency: 'PHP',
            status: 'delivered',
            payment_status: 'paid',
            shipping_address: {
                fullName: 'Walk-in Customer',
                street: 'In-Store Purchase',
                city: sellerName,
                province: 'POS',
                postalCode: '0000',
                phone: 'N/A'
            },
            shipping_method: null,
            tracking_number: null,
            estimated_delivery_date: null,
            actual_delivery_date: new Date().toISOString(),
            delivery_instructions: null,
            payment_method: { type: 'cash', details: 'POS Cash Payment' },
            payment_reference: `CASH-${Date.now()}`,
            payment_date: new Date().toISOString(),
            promo_code: null,
            voucher_id: null,
            notes: note || null,
        };

        // Create order items
        const orderItems = items.map((item) => ({
            id: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            }),
            order_id: orderId,
            product_id: item.productId,
            product_name: item.productName,
            product_images: [item.image],
            price: item.price,
            quantity: item.quantity,
            subtotal: item.price * item.quantity,
            selected_variant: item.selectedColor || item.selectedSize ? {
                color: item.selectedColor,
                size: item.selectedSize
            } : null,
        }));

        if (!isSupabaseConfigured()) {
            console.log('📝 Mock POS order created:', orderNumber);
            return { orderId, orderNumber };
        }

        try {
            // Insert order (buyer_id is NULL for walk-in customers)
            const { error: orderError } = await supabase
                .from('orders')
                .insert(orderData);

            if (orderError) {
                console.error('Error creating POS order:', orderError);
                
                // If error is about buyer_id constraint, provide helpful message
                if (orderError.message?.includes('buyer_id') || orderError.code === '23503') {
                    throw new Error(
                        'Database requires buyer_id. Please run this SQL in Supabase:\n' +
                        'ALTER TABLE orders ALTER COLUMN buyer_id DROP NOT NULL;'
                    );
                }
                throw orderError;
            }

            // Insert order items
            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) {
                console.error('Error creating order items:', itemsError);
                // Rollback: delete the order
                await supabase.from('orders').delete().eq('id', orderId);
                throw itemsError;
            }

            // Deduct stock for each item
            for (const item of items) {
                const { error: stockError } = await supabase.rpc('decrement_product_stock', {
                    p_product_id: item.productId,
                    p_quantity: item.quantity
                });

                if (stockError) {
                    console.warn('Stock deduction failed for product:', item.productId, stockError);
                    // Don't throw - order is already created, just log the warning
                }
            }

            console.log('✅ POS order created:', orderNumber);
            return { orderId, orderNumber };
        } catch (error) {
            console.error('Failed to create POS order:', error);
            return null;
        }
    }

    private mapFromDB(order: any): Order {
        const statusMap: Record<string, Order['status']> = {
            pending_payment: 'pending',
            paid: 'processing',
            processing: 'processing',
            ready_to_ship: 'processing',
            shipped: 'shipped',
            out_for_delivery: 'shipped',
            delivered: 'delivered',
            completed: 'delivered',
            cancelled: 'cancelled',
            canceled: 'cancelled',
            returned: 'delivered',
            refunded: 'delivered',
        };

        const items = (order.items || []).map((it: any) => {
            const p = it.product || {};
            const image = p.primary_image || (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : '');
            const sellerObj = p.seller || {};

            // Extract variant info from selected_variant
            const variant = it.selected_variant ? {
                size: it.selected_variant.size,
                color: it.selected_variant.color,
            } : undefined;

            return {
                id: p.id || it.product_id,
                name: it.product_name || p.name || 'Product',
                price: it.price || it.unit_price || p.price || 0,
                originalPrice: p.original_price,
                image: it.product_images?.[0] || image || '',
                images: it.product_images || (Array.isArray(p.images) ? p.images : []),
                rating: p.rating || 0,
                sold: p.sold || 0,
                seller: sellerObj.store_name || sellerObj.business_name || 'Official Store',
                sellerId: p.seller_id || sellerObj.id,
                sellerRating: sellerObj.rating || 0,
                sellerVerified: !!sellerObj.is_verified,
                isFreeShipping: !!p.is_free_shipping,
                isVerified: !!p.is_verified,
                location: sellerObj.business_address || 'Philippines',
                description: p.description || '',
                category: p.category || 'general',
                stock: p.stock,
                reviews: p.reviews || [],
                quantity: it.quantity || 1,
                variant: variant,
                selectedVariant: variant, // Also set selectedVariant for compatibility
            };
        });

        const shippingFee = typeof order.shipping_cost === 'number' ? order.shipping_cost : parseFloat(order.shipping_cost || '0') || 0;
        const totalNum = typeof order.total_amount === 'number' ? order.total_amount : parseFloat(order.total_amount || '0') || 0;

        return {
            id: order.id,
            transactionId: order.order_number || order.id,
            items: items as any, // Cast to any if item structure doesn't match perfectly
            total: totalNum,
            shippingFee,
            status: statusMap[order.status] || 'pending',
            isPaid: ['paid', 'processing', 'shipped', 'delivered'].includes(order.status),
            scheduledDate: new Date(order.created_at).toLocaleDateString(),
            deliveryDate: order.estimated_delivery_date || undefined,
            shippingAddress: typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address,
            paymentMethod: typeof order.payment_method === 'string' ? order.payment_method : (order.payment_method?.type || 'Payment'),
            createdAt: order.created_at,
            isGift: order.is_gift || false,
            isAnonymous: order.is_anonymous || false,
            recipientId: order.recipient_id,
        };
    }

    /**
     * Get orders for a specific seller (orders containing their products)
     */
    async getSellerOrders(sellerId: string): Promise<any[]> {
        if (!isSupabaseConfigured()) return [];

        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    items:order_items (
                        *,
                        product:products (
                            *,
                            seller:sellers!products_seller_id_fkey (
                                business_name,
                                store_name,
                                business_address,
                                rating,
                                is_verified,
                                id
                            )
                        )
                    )
                `)
                .eq('seller_id', sellerId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map to SellerOrder format used by sellerStore
            return (data || []).map((order: any) => {
                const items = (order.items || []).map((item: any) => {
                    const p = item.product || {};
                    const image = p.primary_image || (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : '');
                    return {
                        productId: p.id || item.product_id,
                        productName: p.name || item.product_name || 'Product',
                        image,
                        quantity: item.quantity || 1,
                        price: item.price || p.price || 0,
                    };
                });

                // Map status from DB format to UI format
                const statusMap: Record<string, string> = {
                    pending_payment: 'pending',
                    pending: 'pending',
                    paid: 'pending',
                    processing: 'to-ship',
                    ready_to_ship: 'to-ship',
                    shipped: 'to-ship',
                    out_for_delivery: 'to-ship',
                    delivered: 'completed',
                    completed: 'completed',
                    cancelled: 'cancelled',
                    canceled: 'cancelled',
                };

                return {
                    id: order.id,
                    orderId: order.order_number || order.id,
                    customerName: order.buyer_name || order.shipping_address?.name || 'Walk-in Customer',
                    customerEmail: order.buyer_email || '',
                    items,
                    total: order.total_amount || 0,
                    status: statusMap[order.status] || 'pending',
                    createdAt: order.created_at,
                    type: order.order_type || 'ONLINE', // Use order_type from database (OFFLINE for POS, ONLINE for app)
                    posNote: order.order_type === 'OFFLINE' ? order.notes : undefined,
                };
            });
        } catch (error) {
            console.error('Error fetching seller orders:', error);
            throw new Error('Failed to load seller orders.');
        }
    }

    /**
     * Subscribe to real-time order updates for a seller
     */
    subscribeToSellerOrders(sellerId: string, callback: (orders: any[]) => void) {
        if (!isSupabaseConfigured()) {
            return { unsubscribe: () => {} };
        }

        const channel = supabase
            .channel(`seller_orders_${sellerId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `seller_id=eq.${sellerId}`,
            }, async () => {
                // Fetch updated orders when any change happens
                try {
                    const orders = await this.getSellerOrders(sellerId);
                    callback(orders);
                } catch (e) {
                    console.error('[OrderService] Error in subscription callback:', e);
                }
            })
            .subscribe();

        return {
            unsubscribe: () => {
                supabase.removeChannel(channel);
            }
        };
    }
}

export const orderService = OrderService.getInstance();
