/**
 * Notification Service
 * Handles all notification-related database operations for mobile app
 * 
 * NOTE: Database has separate notification tables:
 * - buyer_notifications (has buyer_id)
 * - seller_notifications (MISSING seller_id - needs schema fix!)
 * - admin_notifications (has admin_id)
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

/**
 * Get the correct notification table name based on user type
 */
function getNotificationTable(userType: 'buyer' | 'seller' | 'admin'): string {
  switch (userType) {
    case 'buyer': return 'buyer_notifications';
    case 'seller': return 'seller_notifications';
    case 'admin': return 'admin_notifications';
    default: return 'buyer_notifications';
  }
}

/**
 * Get the correct user ID column name based on user type
 */
function getUserIdColumn(userType: 'buyer' | 'seller' | 'admin'): string {
  switch (userType) {
    case 'buyer': return 'buyer_id';
    case 'admin': return 'admin_id';
    case 'seller': return 'seller_id';
    default: return 'buyer_id';
  }
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
      const table = getNotificationTable(params.userType);
      const userIdColumn = getUserIdColumn(params.userType);
      
      const insertData: any = {
        type: params.type,
        title: params.title,
        message: params.message,
        action_url: params.actionUrl,
        action_data: params.actionData,
        priority: params.priority || 'normal'
      };

      insertData[userIdColumn] = params.userId;
      
      const { data, error } = await supabase
        .from(table)
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      
      // Map database response to Notification interface
      const notification: Notification = {
        id: data.id,
        user_id: params.userId,
        user_type: params.userType,
        type: data.type,
        title: data.title,
        message: data.message,
        action_url: data.action_url,
        action_data: data.action_data,
        is_read: !!data.read_at,
        read_at: data.read_at,
        priority: data.priority,
        created_at: data.created_at
      };
      
      return notification;
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
      const table = getNotificationTable(userType);
      const userIdColumn = getUserIdColumn(userType);
      
      let query = supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      query = query.eq(userIdColumn, userId);
      
      const { data, error } = await query;

      if (error) throw error;
      
      // Map database response to Notification interface
      const notifications: Notification[] = (data || []).map((item: any) => ({
        id: item.id,
        user_id: userId,
        user_type: userType,
        type: item.type,
        title: item.title,
        message: item.message,
        action_url: item.action_url,
        action_data: item.action_data,
        is_read: !!item.read_at,
        read_at: item.read_at,
        priority: item.priority,
        created_at: item.created_at
      }));
      
      return notifications;
    } catch (error) {
      console.error('[NotificationService] Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Mark a notification as read
   * Note: We need userType to know which table to update
   */
  async markAsRead(notificationId: string, userType: 'buyer' | 'seller' | 'admin' = 'buyer'): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      const table = getNotificationTable(userType);
      await supabase
        .from(table)
        .update({ read_at: new Date().toISOString() })
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
      const table = getNotificationTable(userType);
      const userIdColumn = getUserIdColumn(userType);
      
      let query = supabase
        .from(table)
        .update({ read_at: new Date().toISOString() })
        .is('read_at', null);
      
      query = query.eq(userIdColumn, userId);
      
      await query;
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
      const table = getNotificationTable(userType);
      const userIdColumn = getUserIdColumn(userType);
      
      let query = supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .is('read_at', null);
      
      query = query.eq(userIdColumn, userId);
      
      const { count, error } = await query;

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
      actionData: { orderId: params.orderId, orderNumber: params.orderNumber },
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
