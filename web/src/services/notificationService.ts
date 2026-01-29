/**
 * Notification Service
 * Handles all notification-related database operations
 * Adheres to the Class-based Service Layer Architecture
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
      if (!data) throw new Error('No data returned upon notification creation');

      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create notification.');
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
      console.error('Error fetching notifications:', error);
      throw new Error('Failed to fetch notifications.');
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
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('user_type', userType)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw new Error('Failed to get unread count.');
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot mark as read');
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;
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
      throw new Error('Supabase not configured - cannot mark all as read');
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('user_type', userType)
        .eq('is_read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read.');
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot delete notification');
    }

    try {
      const { error } = await supabase
        .from('notifications')
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
      confirmed: { icon: 'CheckCircle', bg: 'bg-blue-500' },
      shipped: { icon: 'Truck', bg: 'bg-orange-500' },
      delivered: { icon: 'Package', bg: 'bg-green-500' },
      cancelled: { icon: 'XCircle', bg: 'bg-red-500' }
    };

    const iconInfo = iconMap[params.status] || { icon: 'Bell', bg: 'bg-gray-500' };

    return this.createNotification({
      userId: params.buyerId,
      userType: 'buyer',
      type: `order_${params.status}`,
      title: `Order ${params.status.charAt(0).toUpperCase() + params.status.slice(1)}`,
      message: params.message,
      icon: iconInfo.icon,
      iconBg: iconInfo.bg,
      actionUrl: `/orders/${params.orderId}`,
      actionData: { orderId: params.orderId },
      priority: 'normal'
    });
  }
}

export const notificationService = NotificationService.getInstance();
