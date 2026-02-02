/**
 * Order Service
 * Handles all order-related database operations
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Order, Database } from '@/types/database.types';
import { reviewService } from './reviewService';
import { orderNotificationService } from './orderNotificationService';
import { notificationService } from './notificationService';

export type OrderInsert = Database['public']['Tables']['orders']['Insert'];
export type OrderItemInsert = Database['public']['Tables']['order_items']['Insert'];

export class OrderService {
  private mockOrders: Order[] = [];

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
    const orderId = crypto.randomUUID();

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
    const orderItems = items.map((item, index) => ({
      id: crypto.randomUUID(),
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
      // Mock mode
      const mockOrder = {
        ...orderData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as Order;
      this.mockOrders.push(mockOrder);
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
          console.warn('Stock deduction failed for:', item.productName, stockError);
        }
      }

      console.log('✅ POS order saved to Supabase:', orderNumber);
      return { orderId, orderNumber };
    } catch (error) {
      console.error('Failed to create POS order:', error);
      throw new Error('Failed to create POS order. Please try again.');
    }
  }

  /**
   * Create a new order with items
   */
  async createOrder(
    orderData: OrderInsert,
    items: OrderItemInsert[]
  ): Promise<Order | null> {
    if (!isSupabaseConfigured()) {
      const newOrder = {
        ...orderData,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Order;
      this.mockOrders.push(newOrder);
      return newOrder;
    }

    try {
      // Call database function to create order with items atomically
      const { data, error } = await supabase.rpc('create_order_with_items', {
        p_buyer_id: orderData.buyer_id,
        p_seller_id: orderData.seller_id,
        p_order_data: orderData,
        p_items: items,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw new Error('Failed to create order. Please try again.');
    }
  }

  /**
   * Get orders for a buyer
   */
  async getBuyerOrders(buyerId: string): Promise<Order[]> {
    if (!isSupabaseConfigured()) {
      return this.mockOrders.filter(o => o.buyer_id === buyerId);
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching buyer orders:', error);
      throw new Error('Failed to fetch orders');
    }
  }

  /**
   * Get orders for a seller
   */
  async getSellerOrders(sellerId: string): Promise<Order[]> {
    if (!isSupabaseConfigured()) {
      return this.mockOrders.filter(o => o.seller_id === sellerId);
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*)
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching seller orders:', error);
      throw new Error('Failed to fetch orders');
    }
  }

  /**
   * Get a single order by ID or order number
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    if (!isSupabaseConfigured()) {
      return this.mockOrders.find(o => o.id === orderId) || null;
    }

    try {
      // Check if orderId is a UUID or order_number
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);

      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq(isUuid ? 'id' : 'order_number', orderId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw new Error('Failed to fetch order details');
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: string,
    note?: string,
    userId?: string,
    userRole?: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      const order = this.mockOrders.find(o => o.id === orderId);
      if (order) {
        order.status = status as any;
        order.updated_at = new Date().toISOString();
        return true;
      }
      return false;
    }

    try {
      // Get order first to get buyer/seller info
      const order = await this.getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Update order
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Create status history entry
      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          status,
          note: note || null,
          changed_by: userId || null,
          changed_by_role: userRole as any || null,
          metadata: null,
        });

      if (historyError) throw historyError;

      // Send notification to buyer if seller made the update
      if (userRole === 'seller' && order.buyer_id && order.seller_id) {
        // Send chat message
        await orderNotificationService.sendStatusUpdateNotification(
          orderId,
          status,
          order.seller_id,
          order.buyer_id
        );

        // Send proper notification (shows in notification bell)
        const statusMessages: Record<string, string> = {
          confirmed: `Your order #${(order as any).order_number || orderId.substring(0, 8)} has been confirmed by the seller.`,
          processing: `Your order #${(order as any).order_number || orderId.substring(0, 8)} is now being prepared.`,
          shipped: `Your order #${(order as any).order_number || orderId.substring(0, 8)} has been shipped!`,
          delivered: `Your order #${(order as any).order_number || orderId.substring(0, 8)} has been delivered!`,
          cancelled: `Your order #${(order as any).order_number || orderId.substring(0, 8)} has been cancelled.`,
        };

        const message = statusMessages[status] || `Your order status has been updated to ${status}.`;

        await notificationService.notifyBuyerOrderStatus({
          buyerId: order.buyer_id,
          orderId: orderId,
          orderNumber: (order as any).order_number || orderId.substring(0, 8),
          status: status,
          message: message,
        }).catch(err => {
          console.error('Failed to send buyer notification:', err);
        });
      }

      return true;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw new Error('Failed to update order status');
    }
  }

  /**
   * Mark order as shipped with tracking number
   */
  async markOrderAsShipped(
    orderId: string,
    trackingNumber: string,
    sellerId: string
  ): Promise<boolean> {
    if (!trackingNumber?.trim()) {
      throw new Error('Tracking number is required');
    }

    if (!isSupabaseConfigured()) {
      const order = this.mockOrders.find(o => o.id === orderId && o.seller_id === sellerId);
      if (order) {
        if (!['pending_payment', 'pending', 'confirmed', 'processing'].includes(order.status)) {
          return false;
        }
        order.status = 'shipped';
        order.tracking_number = trackingNumber;
        order.updated_at = new Date().toISOString();
        return true;
      }
      return false;
    }

    try {
      const order = await this.getOrderById(orderId);
      if (!order || order.seller_id !== sellerId) {
        throw new Error('Order not found or access denied');
      }

      if (!['pending_payment', 'pending', 'confirmed', 'processing'].includes(order.status)) {
        throw new Error(`Cannot ship order with status: ${order.status}`);
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'shipped',
          tracking_number: trackingNumber,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('seller_id', sellerId);

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          status: 'shipped',
          note: `Order shipped with tracking number: ${trackingNumber}`,
          changed_by: sellerId,
          changed_by_role: 'seller',
          metadata: { tracking_number: trackingNumber },
        });

      if (historyError) {
        console.warn('Failed to create status history:', historyError);
      }

      // Send notification to buyer with tracking number
      if (order.buyer_id) {
        // Send chat message
        await orderNotificationService.sendStatusUpdateNotification(
          orderId,
          'shipped',
          sellerId,
          order.buyer_id,
          trackingNumber
        );

        // Send proper notification (shows in notification bell)
        await notificationService.notifyBuyerOrderStatus({
          buyerId: order.buyer_id,
          orderId: orderId,
          orderNumber: (order as any).order_number || orderId.substring(0, 8),
          status: 'shipped',
          message: `Your order #${(order as any).order_number || orderId.substring(0, 8)} has been shipped! Tracking: ${trackingNumber}`,
        }).catch(err => {
          console.error('Failed to send shipped notification:', err);
        });
      }

      return true;
    } catch (error) {
      console.error('Error marking order as shipped:', error);
      throw new Error('Failed to mark order as shipped');
    }
  }

  /**
   * Mark order as delivered and release payout
   */
  async markOrderAsDelivered(
    orderId: string,
    sellerId: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      const order = this.mockOrders.find(o => o.id === orderId && o.seller_id === sellerId);
      if (order) {
        if (order.status !== 'shipped') {
          return false;
        }
        order.status = 'delivered';
        order.completed_at = new Date().toISOString();
        order.updated_at = new Date().toISOString();
        return true;
      }
      return false;
    }

    try {
      const order = await this.getOrderById(orderId);
      if (!order || order.seller_id !== sellerId) {
        throw new Error('Order not found or access denied');
      }

      if (order.status !== 'shipped') {
        throw new Error(`Cannot mark as delivered. Current status: ${order.status}`);
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'delivered',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('seller_id', sellerId);

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          status: 'delivered',
          note: 'Order delivered and completed',
          changed_by: sellerId,
          changed_by_role: 'seller',
          metadata: { completed_at: new Date().toISOString() },
        });

      if (historyError) {
        console.warn('Failed to create status history:', historyError);
      }

      // Send delivery notification to buyer
      if (order.buyer_id) {
        // Send chat message
        await orderNotificationService.sendStatusUpdateNotification(
          orderId,
          'delivered',
          sellerId,
          order.buyer_id
        );

        // Send proper notification (shows in notification bell)
        await notificationService.notifyBuyerOrderStatus({
          buyerId: order.buyer_id,
          orderId: orderId,
          orderNumber: (order as any).order_number || orderId.substring(0, 8),
          status: 'delivered',
          message: `Your order #${(order as any).order_number || orderId.substring(0, 8)} has been delivered! Enjoy your purchase!`,
        }).catch(err => {
          console.error('Failed to send delivered notification:', err);
        });
      }

      return true;
    } catch (error) {
      console.error('Error marking order as delivered:', error);
      throw new Error('Failed to mark order as delivered');
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, reason?: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      const order = this.mockOrders.find(o => o.id === orderId);
      if (order) {
        order.status = 'cancelled';
        order.cancelled_at = new Date().toISOString();
        return true;
      }
      return false;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          notes: reason,
        })
        .eq('id', orderId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw new Error('Failed to cancel order');
    }
  }

  /**
   * Submit order review and rating
   */
  async submitOrderReview(
    orderId: string,
    buyerId: string,
    rating: number,
    comment: string,
    images?: string[]
  ): Promise<boolean> {
    if (!orderId || !buyerId) {
      throw new Error('Order ID and Buyer ID are required');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    if (!comment?.trim()) {
      throw new Error('Review comment is required');
    }

    if (!isSupabaseConfigured()) {
      const order = this.mockOrders.find(o => o.id === orderId && o.buyer_id === buyerId);
      if (order) {
        order.is_reviewed = true;
        order.rating = rating;
        order.review_comment = comment;
        order.review_images = images || [];
        order.review_date = new Date().toISOString();
        return true;
      }
      return false;
    }

    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            product_id
          )
        `)
        .eq('id', orderId)
        .eq('buyer_id', buyerId)
        .maybeSingle();

      if (orderError || !order) {
        throw new Error('Order not found or access denied');
      }

      if (order.status !== 'delivered' && order.status !== 'completed') {
        throw new Error('Cannot review order that is not delivered or completed');
      }

      const orderItems = order.order_items || [];
      let successCount = 0;

      for (const item of orderItems) {
        const exists = await reviewService.hasReviewForProduct(orderId, item.product_id);
        if (exists) continue;

        const reviewPayload = {
          order_id: orderId,
          product_id: item.product_id,
          buyer_id: buyerId,
          seller_id: order.seller_id,
          rating: rating,
          comment: comment.trim(),
          images: images || [],
          is_verified_purchase: true,
          helpful_count: 0,
          seller_reply: null,
          is_hidden: false,
          is_edited: false
        };

        const review = await reviewService.createReview(reviewPayload);
        if (review) successCount++;
      }

      if (successCount === 0) {
        return false;
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          is_reviewed: true,
          rating,
          review_comment: comment.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) throw updateError;
      return true;
    } catch (error) {
      console.error('Error submitting review:', error);
      throw new Error('Failed to submit review');
    }
  }

  /**
   * Get order statistics for seller dashboard
   */
  async getSellerOrderStats(sellerId: string) {
    if (!isSupabaseConfigured()) {
      return {
        total: this.mockOrders.filter(o => o.seller_id === sellerId).length,
        pending: this.mockOrders.filter(o => o.seller_id === sellerId && o.status === 'pending_payment').length,
        processing: this.mockOrders.filter(o => o.seller_id === sellerId && o.status === 'processing').length,
        completed: this.mockOrders.filter(o => o.seller_id === sellerId && o.status === 'completed').length,
      };
    }

    try {
      const { data, error } = await supabase.rpc('get_seller_order_stats', {
        p_seller_id: sellerId,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching order stats:', error);
      throw new Error('Failed to fetch order statistics');
    }
  }
}

export const orderService = new OrderService();
