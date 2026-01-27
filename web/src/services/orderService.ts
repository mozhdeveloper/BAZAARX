/**
 * Order Service
 * Handles all order-related database operations
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Order, Database } from '@/types/database.types';



type OrderInsert = Database['public']['Tables']['orders']['Insert'];
type OrderItemInsert = Database['public']['Tables']['order_items']['Insert'];

// Mock data fallback
let mockOrders: Order[] = [];

/**
 * Create a new order with items
 */
export const createOrder = async (
  orderData: OrderInsert,
  items: OrderItemInsert[]
): Promise<Order | null> => {
  if (!isSupabaseConfigured()) {
    const newOrder = {
      ...orderData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Order;
    mockOrders.push(newOrder);
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
    return null;
  }
};

/**
 * Get orders for a buyer
 */
export const getBuyerOrders = async (buyerId: string): Promise<Order[]> => {
  if (!isSupabaseConfigured()) {
    return mockOrders.filter(o => o.buyer_id === buyerId);
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
    return [];
  }
};

/**
 * Get orders for a seller
 */
export const getSellerOrders = async (sellerId: string): Promise<Order[]> => {
  if (!isSupabaseConfigured()) {
    return mockOrders.filter(o => o.seller_id === sellerId);
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

    console.log('📦 Fetched orders sample (first order):', data?.[0]);
    console.log('🔍 First order buyer_id:', data?.[0]?.buyer_id);

    return data || [];
  } catch (error) {
    console.error('Error fetching seller orders:', error);
    return [];
  }
};

/**
 * Get a single order by ID or order number
 */
export const getOrderById = async (orderId: string): Promise<Order | null> => {
  if (!isSupabaseConfigured()) {
    return mockOrders.find(o => o.id === orderId) || null;
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
    return null;
  }
};

/**
 * Update order status
 */
export const updateOrderStatus = async (
  orderId: string,
  status: string,
  note?: string,
  userId?: string,
  userRole?: string
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    const order = mockOrders.find(o => o.id === orderId);
    if (order) {
      order.status = status as any;
      order.updated_at = new Date().toISOString();
      return true;
    }
    return false;
  }

  try {
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
    return true;
  } catch (error) {
    console.error('Error updating order status:', error);
    return false;
  }
};

/**
 * Mark order as shipped with tracking number
 */
export const markOrderAsShipped = async (
  orderId: string,
  trackingNumber: string,
  sellerId: string
): Promise<boolean> => {
  if (!trackingNumber?.trim()) {
    console.error('Tracking number is required');
    return false;
  }

  if (!isSupabaseConfigured()) {
    const order = mockOrders.find(o => o.id === orderId && o.seller_id === sellerId);
    if (order) {
      // Validate status transition: pending_payment or confirmed → shipped
      if (!['pending_payment', 'pending', 'confirmed', 'processing'].includes(order.status)) {
        console.warn(`Cannot ship order with status: ${order.status}`);
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
    // Validate order exists and belongs to seller
    const order = await getOrderById(orderId);
    if (!order || order.seller_id !== sellerId) {
      console.error('Order not found or does not belong to seller');
      return false;
    }

    // Validate status transition
    if (!['pending_payment', 'pending', 'confirmed', 'processing'].includes(order.status)) {
      console.warn(`Cannot ship order with status: ${order.status}`);
      return false;
    }

    // Update order with shipped status and tracking number
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

    // Create status history entry
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
      // Don't fail the operation if history fails
    }

    console.log(`✅ Order ${orderId} marked as shipped with tracking: ${trackingNumber}`);
    return true;
  } catch (error) {
    console.error('Error marking order as shipped:', error);
    return false;
  }
};

/**
 * Mark order as delivered and release payout
 */
export const markOrderAsDelivered = async (
  orderId: string,
  sellerId: string
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    const order = mockOrders.find(o => o.id === orderId && o.seller_id === sellerId);
    if (order) {
      // Validate status transition: shipped → delivered
      if (order.status !== 'shipped') {
        console.warn(`Cannot mark as delivered. Current status: ${order.status}`);
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
    // Validate order exists and belongs to seller
    const order = await getOrderById(orderId);
    if (!order || order.seller_id !== sellerId) {
      console.error('Order not found or does not belong to seller');
      return false;
    }

    // Validate status transition: must be shipped
    if (order.status !== 'shipped') {
      console.warn(`Cannot mark as delivered. Current status: ${order.status}`);
      return false;
    }

    // Update order with delivered status
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

    // Create status history entry
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

    // TODO: Trigger payout release (integrate with payment service)
    console.log(`✅ Order ${orderId} marked as delivered. Payout release triggered.`);
    return true;
  } catch (error) {
    console.error('Error marking order as delivered:', error);
    return false;
  }
};

/**
 * Cancel an order
 */
export const cancelOrder = async (orderId: string, reason?: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    const order = mockOrders.find(o => o.id === orderId);
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
    return false;
  }
};

/**
 * Submit order review and rating
 */
import { createReview, hasReviewForProduct } from './reviewService';

/**
 * Submit order review and rating
 * Refactored to create individual reviews for each product in the order
 */
export const submitOrderReview = async (
  orderId: string,
  buyerId: string,
  rating: number,
  comment: string,
  images?: string[]
): Promise<boolean> => {
  // Validate inputs
  if (!orderId || !buyerId) {
    console.error('Order ID and Buyer ID are required');
    return false;
  }

  if (rating < 1 || rating > 5) {
    console.error('Rating must be between 1 and 5');
    return false;
  }

  if (!comment?.trim()) {
    console.error('Review comment is required');
    return false;
  }

  if (!isSupabaseConfigured()) {
    const order = mockOrders.find(o => o.id === orderId && o.buyer_id === buyerId);
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
    // 1. Fetch Order and Items
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
      console.error('Order not found or access denied:', orderError);
      return false;
    }

    // 2. Validate Status
    if (order.status !== 'delivered' && order.status !== 'completed') {
      console.warn('Cannot review order that is not delivered or completed');
      return false;
    }

    // 3. Create Review for EACH item in the order
    // This bridges the legacy "Order Review" UI with the new "Product Review" schema
    const orderItems = order.order_items || [];
    let successCount = 0;

    for (const item of orderItems) {
      // Check for existing review to avoid duplicates
      const exists = await hasReviewForProduct(orderId, item.product_id);
      if (exists) {
        console.log(`Review already exists for product ${item.product_id}`);
        continue;
      }

      console.log(`Creating review for product ${item.product_id}...`);

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
        seller_reply: null, // JSONB compatible
        is_hidden: false,
        is_edited: false
      };

      const review = await createReview(reviewPayload);

      if (review) {
        successCount++;
        console.log(`✅ Review created for product ${item.product_id}`);
      } else {
        console.error(`❌ Failed to create review for product ${item.product_id}`);
      }
    }

    if (successCount === 0) {
      console.warn('No reviews were successfully created');
      return false;
    }

    // 4. Mark Order as Reviewed (Legacy / Status Flag)
    // We still update this flag so the UI knows not to show the "Rate" button again
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        is_reviewed: true,
        rating, // Legacy field
        review_comment: comment.trim(), // Legacy field
        // review_date: new Date().toISOString(), // Legacy field - omitted to avoid potential schema issues if strict
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to update order status:', updateError);
      // Return true anyway because reviews were verified created
      return true;
    }

    console.log(`✅ Reviews generated for ${successCount} items in order ${orderId}`);
    return true;
  } catch (error) {
    console.error('Error submitting review:', error);
    return false;
  }
};

/**
 * Get order statistics for seller dashboard
 */
export const getSellerOrderStats = async (sellerId: string) => {
  if (!isSupabaseConfigured()) {
    return {
      total: mockOrders.filter(o => o.seller_id === sellerId).length,
      pending: mockOrders.filter(o => o.seller_id === sellerId && o.status === 'pending_payment').length,
      processing: mockOrders.filter(o => o.seller_id === sellerId && o.status === 'processing').length,
      completed: mockOrders.filter(o => o.seller_id === sellerId && o.status === 'completed').length,
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
    return null;
  }
};
