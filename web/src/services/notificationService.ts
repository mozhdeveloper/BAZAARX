/**
 * Notification Service
 * Handles all notification-related database operations
 * Adheres to the Class-based Service Layer Architecture
 * 
 * Database Tables:
 * - buyer_notifications (buyer_id, type, title, message, action_url, action_data, read_at, priority, created_at)
 * - seller_notifications (type, title, message, action_url, action_data, read_at, priority, created_at)
 * - admin_notifications (admin_id, type, title, message, action_url, action_data, read_at, priority, created_at)
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface Notification {
  id: string;
  user_id?: string;
  buyer_id?: string;
  admin_id?: string;
  type: string;
  title: string;
  message: string;
  icon?: string;
  icon_bg?: string;
  action_url?: string;
  action_data?: any;
  is_read?: boolean;
  read_at?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
}

export class NotificationService {
  private static instance: NotificationService;

  private constructor() { }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Get the table name based on user type
   */
  private getTableName(userType: 'buyer' | 'seller' | 'admin'): string {
    switch (userType) {
      case 'buyer': return 'buyer_notifications';
      case 'seller': return 'seller_notifications';
      case 'admin': return 'admin_notifications';
      default: return 'buyer_notifications';
    }
  }

  /**
   * Get the user ID column name based on user type
   */
  private getUserIdColumn(userType: 'buyer' | 'seller' | 'admin'): string {
    switch (userType) {
      case 'buyer': return 'buyer_id';
      case 'admin': return 'admin_id';
      default: return 'buyer_id'; // seller_notifications doesn't have a seller_id column in the schema
    }
  }

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
  }): Promise<Notification> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot create notification');
      throw new Error('Supabase not configured');
    }

    try {
      // Validate required parameters
      if (!params.userId) throw new Error('userId is required');
      if (!params.userType) throw new Error('userType is required');
      if (!params.type) throw new Error('type is required');
      if (!params.title) throw new Error('title is required');
      if (!params.message) throw new Error('message is required');

      const tableName = this.getTableName(params.userType);
      const userIdColumn = this.getUserIdColumn(params.userType);
      
      // Build the insert data based on user type
      const insertData: any = {
        type: params.type,
        title: params.title,
        message: params.message,
        action_url: params.actionUrl,
        action_data: params.actionData,
        priority: params.priority || 'normal',
      };

      // Only add user ID column for buyer and admin (seller_notifications doesn't have seller_id)
      if (params.userType !== 'seller') {
        insertData[userIdColumn] = params.userId;
      }

      const { data, error } = await supabase
        .from(tableName)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        // Handle table not existing gracefully
        if (error.code === '42P01' || error.code === 'PGRST204' || error.code === 'PGRST205') {
          console.warn(`Notifications table ${tableName} does not exist`);
          // Return a mock notification
          return {
            id: crypto.randomUUID(),
            type: params.type,
            title: params.title,
            message: params.message,
            priority: params.priority || 'normal',
            created_at: new Date().toISOString()
          };
        }
        throw error;
      }
      if (!data) throw new Error('No data returned upon notification creation');

      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      // Return mock notification instead of throwing
      return {
        id: crypto.randomUUID(),
        type: params.type,
        title: params.title,
        message: params.message,
        priority: params.priority || 'normal',
        created_at: new Date().toISOString()
      };
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
      console.warn('Supabase not configured - cannot fetch notifications');
      return [];
    }

    try {
      const tableName = this.getTableName(userType);
      const userIdColumn = this.getUserIdColumn(userType);
      
      let query = supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      // Only filter by user ID for buyer and admin (seller_notifications doesn't have seller_id)
      if (userType !== 'seller') {
        query = query.eq(userIdColumn, userId);
      }

      const { data, error } = await query;

      // Handle table not existing (404) or other errors gracefully
      if (error) {
        // 42P01 = table doesn't exist, PGRST116 = no rows, PGRST205 = table not found, 404 = not found
        if (error.code === '42P01' || error.code === 'PGRST116' || error.code === 'PGRST205' || (error as any).status === 404) {
          console.warn(`Notifications table ${tableName} not available, returning empty array`);
          return [];
        }
        console.error('Error fetching notifications:', error);
        return [];
      }
      
      // Map the data to include is_read field (based on read_at being null or not)
      return (data || []).map(n => ({
        ...n,
        is_read: !!n.read_at
      }));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(
    userId: string,
    userType: 'buyer' | 'seller' | 'admin'
  ): Promise<number> {
    if (!isSupabaseConfigured()) {
      return 0;
    }

    try {
      const tableName = this.getTableName(userType);
      const userIdColumn = this.getUserIdColumn(userType);
      
      let query = supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .is('read_at', null); // Unread = read_at is null

      // Only filter by user ID for buyer and admin
      if (userType !== 'seller') {
        query = query.eq(userIdColumn, userId);
      }

      const { count, error } = await query;

      if (error) {
        console.warn('Error fetching unread count:', error);
        return 0;
      }
      return count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userType: 'buyer' | 'seller' | 'admin' = 'buyer'): Promise<void> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot mark as read');
      return;
    }

    try {
      const tableName = this.getTableName(userType);
      
      const { error } = await supabase
        .from(tableName)
        .update({
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        console.warn('Error marking notification as read:', error);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read.');
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(
    userId: string,
    userType: 'buyer' | 'seller' | 'admin'
  ): Promise<void> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot mark all as read');
      return;
    }

    try {
      const tableName = this.getTableName(userType);
      const userIdColumn = this.getUserIdColumn(userType);
      
      let query = supabase
        .from(tableName)
        .update({
          read_at: new Date().toISOString()
        })
        .is('read_at', null); // Only update unread ones
      
      // Only filter by user ID for buyer and admin
      if (userType !== 'seller') {
        query = query.eq(userIdColumn, userId);
      }

      const { error } = await query;

      if (error) {
        console.warn('Error marking all notifications as read:', error);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userType: 'buyer' | 'seller' | 'admin' = 'buyer'): Promise<void> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot delete notification');
      return;
    }

    try {
      const tableName = this.getTableName(userType);
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw new Error('Failed to delete notification.');
    }
  }

  /**
   * Helper function to create an order notification for seller
   */
  async notifySellerNewOrder(params: {
    sellerId: string;
    orderId: string;
    orderNumber: string;
    buyerName: string;
    total: number;
  }): Promise<Notification> {
    if (!params.sellerId) throw new Error('sellerId is missing');

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
   * Helper function to create order status notification for buyer
   */
  async notifyBuyerOrderStatus(params: {
    buyerId: string;
    orderId: string;
    orderNumber: string;
    status: string;
    message: string;
  }): Promise<Notification> {
    if (!params.buyerId) throw new Error('buyerId is missing');

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
    const title = titleMap[params.status] || `Order ${params.status.charAt(0).toUpperCase() + params.status.slice(1)}`;

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
  }): Promise<Notification> {
    if (!params.sellerId) throw new Error('sellerId is missing');

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
  }): Promise<Notification> {
    if (!params.sellerId) throw new Error('sellerId is missing');

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
  }): Promise<Notification> {
    if (!params.sellerId) throw new Error('sellerId is missing');

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
  }): Promise<Notification> {
    if (!params.sellerId) throw new Error('sellerId is missing');

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
  }): Promise<Notification> {
    if (!params.sellerId) throw new Error('sellerId is missing');

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

export const notificationService = NotificationService.getInstance();
