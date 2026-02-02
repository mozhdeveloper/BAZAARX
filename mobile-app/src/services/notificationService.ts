/**
 * Notification Service
 * Handles all notification-related database operations for mobile app
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface Notification {
  id: string;
  user_id: string;
  user_type: 'buyer' | 'seller' | 'admin';
  type: string;
  title: string;
  message: string;
  icon?: string;
  icon_bg?: string;
  action_url?: string;
  action_data?: any;
  is_read: boolean;
  read_at?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
}

class NotificationService {
  /**
   * Create a new notification in the database
   */
  async createNotification(params: {
    userId: string;
    userType: 'buyer' | 'seller' | 'admin';
    type: string;
    title: string;
    message: string;
    icon?: string;
    iconBg?: string;
    actionUrl?: string;
    actionData?: any;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  }): Promise<Notification | null> {
    if (!isSupabaseConfigured()) {
      console.warn('[NotificationService] Supabase not configured');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: params.userId,
          user_type: params.userType,
          type: params.type,
          title: params.title,
          message: params.message,
          icon: params.icon,
          icon_bg: params.iconBg,
          action_url: params.actionUrl,
          action_data: params.actionData,
          priority: params.priority || 'normal',
          is_read: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[NotificationService] Error creating notification:', error);
      return null;
    }
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    userType: 'buyer' | 'seller' | 'admin',
    limit: number = 50
  ): Promise<Notification[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('user_type', userType)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[NotificationService] Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);
    } catch (error) {
      console.error('[NotificationService] Error marking as read:', error);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string, userType: 'buyer' | 'seller' | 'admin'): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('user_type', userType)
        .eq('is_read', false);
    } catch (error) {
      console.error('[NotificationService] Error marking all as read:', error);
    }
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string, userType: 'buyer' | 'seller' | 'admin'): Promise<number> {
    if (!isSupabaseConfigured()) return 0;

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('user_type', userType)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('[NotificationService] Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Notify seller about new order
   */
  async notifySellerNewOrder(params: {
    sellerId: string;
    orderId: string;
    orderNumber: string;
    buyerName: string;
    total: number;
  }): Promise<Notification | null> {
    return this.createNotification({
      userId: params.sellerId,
      userType: 'seller',
      type: 'seller_new_order',
      title: 'New Order Received',
      message: `New order #${params.orderNumber} from ${params.buyerName}. Total: ₱${params.total.toLocaleString()}`,
      icon: 'ShoppingBag',
      iconBg: 'bg-green-500',
      actionUrl: `/seller/orders/${params.orderId}`,
      actionData: { orderId: params.orderId },
      priority: 'high'
    });
  }

  /**
   * Notify buyer about order status change
   */
  async notifyBuyerOrderStatus(params: {
    buyerId: string;
    orderId: string;
    orderNumber: string;
    status: string;
    message: string;
  }): Promise<Notification | null> {
    const iconMap: Record<string, { icon: string; bg: string }> = {
      placed: { icon: 'ShoppingBag', bg: 'bg-green-500' },
      confirmed: { icon: 'CheckCircle', bg: 'bg-blue-500' },
      processing: { icon: 'Package', bg: 'bg-purple-500' },
      shipped: { icon: 'Truck', bg: 'bg-orange-500' },
      delivered: { icon: 'Package', bg: 'bg-green-500' },
      cancelled: { icon: 'XCircle', bg: 'bg-red-500' }
    };

    const titleMap: Record<string, string> = {
      placed: 'Order Placed',
      confirmed: 'Order Confirmed',
      processing: 'Order Processing',
      shipped: 'Order Shipped',
      delivered: 'Order Delivered',
      cancelled: 'Order Cancelled'
    };

    const iconInfo = iconMap[params.status] || { icon: 'Bell', bg: 'bg-gray-500' };
    const title = titleMap[params.status] || `Order ${params.status}`;

    return this.createNotification({
      userId: params.buyerId,
      userType: 'buyer',
      type: `order_${params.status}`,
      title: title,
      message: params.message,
      icon: iconInfo.icon,
      iconBg: iconInfo.bg,
      actionUrl: `/order/${params.orderNumber}`,
      actionData: { orderId: params.orderId, orderNumber: params.orderNumber },
      priority: params.status === 'delivered' ? 'high' : 'normal'
    });
  }

  /**
   * Notify seller of a new chat message
   */
  async notifySellerNewMessage(params: {
    sellerId: string;
    buyerName: string;
    conversationId: string;
    messagePreview: string;
  }): Promise<Notification | null> {
    return this.createNotification({
      userId: params.sellerId,
      userType: 'seller',
      type: 'seller_new_message',
      title: 'New Message',
      message: `${params.buyerName}: ${params.messagePreview.substring(0, 100)}${params.messagePreview.length > 100 ? '...' : ''}`,
      icon: 'MessageSquare',
      iconBg: 'bg-blue-500',
      actionUrl: '/seller/messages',
      actionData: { conversationId: params.conversationId },
      priority: 'normal'
    });
  }

  /**
   * Notify seller when QA approves their product for sample submission
   */
  async notifySellerSampleRequest(params: {
    sellerId: string;
    productId: string;
    productName: string;
  }): Promise<Notification | null> {
    return this.createNotification({
      userId: params.sellerId,
      userType: 'seller',
      type: 'product_sample_request',
      title: 'Sample Requested',
      message: `Your product "${params.productName}" has been digitally approved. Please submit a physical sample for quality review.`,
      icon: 'Package',
      iconBg: 'bg-purple-500',
      actionUrl: '/seller/product-status-qa',
      actionData: { productId: params.productId },
      priority: 'high'
    });
  }

  /**
   * Notify seller when their product passes QA and is approved
   */
  async notifySellerProductApproved(params: {
    sellerId: string;
    productId: string;
    productName: string;
  }): Promise<Notification | null> {
    return this.createNotification({
      userId: params.sellerId,
      userType: 'seller',
      type: 'product_approved',
      title: 'Product Approved! 🎉',
      message: `Great news! Your product "${params.productName}" has passed quality review and is now live on the marketplace.`,
      icon: 'CheckCircle',
      iconBg: 'bg-green-500',
      actionUrl: '/seller/products',
      actionData: { productId: params.productId },
      priority: 'high'
    });
  }

  /**
   * Notify seller when their product is rejected
   */
  async notifySellerProductRejected(params: {
    sellerId: string;
    productId: string;
    productName: string;
    reason: string;
    stage: 'digital' | 'physical';
  }): Promise<Notification | null> {
    return this.createNotification({
      userId: params.sellerId,
      userType: 'seller',
      type: 'product_rejected',
      title: 'Product Rejected',
      message: `Your product "${params.productName}" was rejected during ${params.stage} review. Reason: ${params.reason}`,
      icon: 'XCircle',
      iconBg: 'bg-red-500',
      actionUrl: '/seller/product-status-qa',
      actionData: { productId: params.productId },
      priority: 'high'
    });
  }

  /**
   * Notify seller when revision is requested for their product
   */
  async notifySellerRevisionRequested(params: {
    sellerId: string;
    productId: string;
    productName: string;
    reason: string;
  }): Promise<Notification | null> {
    return this.createNotification({
      userId: params.sellerId,
      userType: 'seller',
      type: 'product_revision_requested',
      title: 'Revision Requested',
      message: `Please update your product "${params.productName}". Feedback: ${params.reason}`,
      icon: 'AlertCircle',
      iconBg: 'bg-yellow-500',
      actionUrl: '/seller/products',
      actionData: { productId: params.productId },
      priority: 'high'
    });
  }
}

export const notificationService = new NotificationService();
