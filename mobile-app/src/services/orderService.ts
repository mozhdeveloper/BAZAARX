import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Order } from '@/types';

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

    async updateOrderStatus(orderId: string, status: string): Promise<void> {
        if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

        try {
            const { error } = await supabase
                .from('orders')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', orderId);

            if (error) throw error;
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

            return {
                id: p.id || it.product_id,
                name: p.name || 'Product',
                price: it.unit_price || p.price || 0,
                originalPrice: p.original_price,
                image: image || '',
                images: Array.isArray(p.images) ? p.images : [],
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
}

export const orderService = OrderService.getInstance();
