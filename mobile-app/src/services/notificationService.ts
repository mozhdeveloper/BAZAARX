/**
 * Notification Service
 * Handles all notification-related database operations for mobile app
 * * NOTE: Database has separate notification tables:
 * - buyer_notifications (has buyer_id)
 * - seller_notifications (has seller_id) // UPDATED: Column exists!
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
      
      const { data, error } = await (supabase as any)
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

      // Also fire a push notification for high-priority or all non-admin notifications
      if (params.userType !== 'admin') {
        this._sendPush(params.userId, params.title, params.message, {
          type: params.type,
          ...params.actionData,
        }).catch(() => { /* non-critical */ });
      }
      
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
      
      const { data, error } = await (supabase as any)
        .from(table)
        .select('*')
        .eq(userIdColumn, userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        // Suppress AbortError — it's expected when requests overlap or component unmounts
        if (error.message?.includes('Aborted') || error.code === 'ABORT_ERR') {
          return [];
        }
        
        // Suppress "Network request failed" during session restoration or connection loss
        if (error.message?.includes('Network request failed')) {
          console.warn('[NotificationService] Connection unstable: Network request failed');
          return [];
        }

        // Log other Supabase errors
        console.error(`[NotificationService] Supabase Error: ${error.message}`);
        throw error;
      }
      
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
    } catch (error: any) {
      // Suppress AbortError — expected during component lifecycle
      if (error?.message?.includes('Aborted')) {
        console.debug('[NotificationService] Fetch aborted (expected)');
        return [];
      }
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
      await (supabase as any)
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
      
      const { error: updateError } = await (supabase as any)
        .from(table)
        .update({ read_at: new Date().toISOString() })
        .eq(userIdColumn, userId)
        .is('read_at', null);

      if (updateError) throw updateError;
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
      
      // Change: Select only the ID to reduce data transfer/overhead
      const { count, error } = await (supabase as any)
        .from(table)
        .select('id', { count: 'exact' })
        .eq(userIdColumn, userId)
        .is('read_at', null);

      if (error) {
        // Suppress AbortError — expected during component lifecycle
        if (error.message?.includes('Aborted') || error.code === 'ABORT_ERR') {
          console.debug('[NotificationService] Count query aborted (expected)');
          return 0;
        }
        // Log other database errors
        console.error(`[NotificationService] DB Error ${error.code}: ${error.message}`);
        throw error;
      }
      return count || 0;
    } catch (error: any) {
      // Suppress AbortError — expected during component lifecycle
      if (error?.message?.includes('Aborted')) {
        console.debug('[NotificationService] Count query aborted (expected)');
        return 0;
      }
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

  async notifySellerOrderCancelled(params: {
    sellerId: string;
    orderId: string;
    orderNumber: string;
    buyerName?: string;
    reason?: string | null;
  }): Promise<Notification | null> {
    const buyerLabel = params.buyerName?.trim() || 'A buyer';
    const reasonSuffix = params.reason?.trim()
      ? ` Reason: ${params.reason.trim()}`
      : '';

    return this.createNotification({
      userId: params.sellerId,
      userType: 'seller',
      type: 'seller_order_cancelled',
      title: 'Order Cancelled by Buyer',
      message: `${buyerLabel} cancelled order #${params.orderNumber}.${reasonSuffix}`,
      icon: 'XCircle',
      iconBg: 'bg-red-500',
      actionUrl: `/seller/orders/${params.orderId}`,
      actionData: { orderId: params.orderId, orderNumber: params.orderNumber },
      priority: 'high'
    });
  }

  async notifySellerOrderReceived(params: {
    sellerId: string;
    orderId: string;
    orderNumber: string;
    buyerName?: string;
  }): Promise<Notification | null> {
    const buyerLabel = params.buyerName?.trim() || 'A buyer';

    return this.createNotification({
      userId: params.sellerId,
      userType: 'seller',
      type: 'seller_order_received',
      title: 'Order Received by Buyer',
      message: `${buyerLabel} confirmed receipt of order #${params.orderNumber}`,
      icon: 'CheckCircle',
      iconBg: 'bg-green-500',
      actionUrl: `/seller/orders/${params.orderId}`,
      actionData: { orderId: params.orderId, orderNumber: params.orderNumber },
      priority: 'normal'
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
      placed: 'Your Order is Placed',
      confirmed: 'Order Confirmed by Seller',
      processing: 'Being Prepared',
      shipped: 'Order is on the Way',
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
      actionData: { 
        orderId: params.orderId, 
        orderNumber: params.orderNumber,
        tab: params.status === 'confirmed' ? 'processing' : undefined
      },
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

  // ═══════════════════════════════════════════════════════════════════════════
  //  BUYER — Chat & Support Notifications
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Notify buyer when seller sends a chat message
   */
  async notifyBuyerNewMessage(params: {
    buyerId: string;
    sellerName: string;
    conversationId: string;
    messagePreview: string;
  }): Promise<Notification | null> {
    return this.createNotification({
      userId: params.buyerId,
      userType: 'buyer',
      type: 'buyer_new_message',
      title: 'New Message',
      message: `${params.sellerName}: ${params.messagePreview.substring(0, 100)}${params.messagePreview.length > 100 ? '...' : ''}`,
      icon: 'MessageSquare',
      iconBg: 'bg-blue-500',
      actionUrl: '/messages',
      actionData: { conversationId: params.conversationId },
      priority: 'normal'
    });
  }

  /**
   * Notify buyer when an admin/agent replies to their support ticket
   */
  async notifyBuyerTicketReply(params: {
    buyerId: string;
    ticketId: string;
    ticketSubject: string;
    replyPreview: string;
  }): Promise<Notification | null> {
    return this.createNotification({
      userId: params.buyerId,
      userType: 'buyer',
      type: 'ticket_reply',
      title: 'Support Agent Replied',
      message: `Re: ${params.ticketSubject} — "${params.replyPreview.substring(0, 80)}${params.replyPreview.length > 80 ? '...' : ''}"`,
      icon: 'Headphones',
      iconBg: 'bg-purple-500',
      actionUrl: `/tickets/${params.ticketId}`,
      actionData: { ticketId: params.ticketId },
      priority: 'high'
    });
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  SELLER — Review & Return Notifications
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Notify seller when a buyer posts a new review on their product
   */
  async notifySellerNewReview(params: {
    sellerId: string;
    productId: string;
    productName: string;
    rating: number;
    buyerName: string;
  }): Promise<Notification | null> {
    const stars = '★'.repeat(Math.round(params.rating)) + '☆'.repeat(5 - Math.round(params.rating));
    return this.createNotification({
      userId: params.sellerId,
      userType: 'seller',
      type: 'seller_new_review',
      title: 'New Review',
      message: `${params.buyerName} rated "${params.productName}" ${stars} (${params.rating}/5)`,
      icon: 'Star',
      iconBg: params.rating >= 4 ? 'bg-green-500' : params.rating >= 3 ? 'bg-yellow-500' : 'bg-red-500',
      actionUrl: '/seller/reviews',
      actionData: { productId: params.productId },
      priority: 'normal'
    });
  }

  /**
   * Notify seller when a buyer submits a return request
   */
  async notifySellerReturnRequest(params: {
    sellerId: string;
    orderId: string;
    returnId: string;
    orderNumber: string;
    buyerName: string;
    reason: string;
  }): Promise<Notification | null> {
    return this.createNotification({
      userId: params.sellerId,
      userType: 'seller',
      type: 'seller_return_request',
      title: 'Return Request',
      message: `${params.buyerName} requested a return for order #${params.orderNumber}. Reason: ${params.reason}`,
      icon: 'RotateCcw',
      iconBg: 'bg-orange-500',
      actionUrl: '/seller/returns',
      actionData: { orderId: params.orderId, returnId: params.returnId },
      priority: 'high'
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  ADMIN — Support & Moderation Notifications
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Notify all admins when a buyer escalates to a support agent
   */
  async notifyAdminNewTicket(params: {
    adminId: string;
    ticketId: string;
    ticketSubject: string;
    buyerName: string;
  }): Promise<Notification | null> {
    return this.createNotification({
      userId: params.adminId,
      userType: 'admin',
      type: 'admin_new_ticket',
      title: 'New Support Ticket',
      message: `${params.buyerName} opened: "${params.ticketSubject}"`,
      icon: 'Headphones',
      iconBg: 'bg-red-500',
      actionUrl: `/admin/support/${params.ticketId}`,
      actionData: { ticketId: params.ticketId },
      priority: 'high'
    });
  }

  /**
   * Notify admin when a new seller application is submitted
   */
  async notifyAdminNewSeller(params: {
    adminId: string;
    sellerId: string;
    storeName: string;
  }): Promise<Notification | null> {
    return this.createNotification({
      userId: params.adminId,
      userType: 'admin',
      type: 'admin_new_seller',
      title: 'New Seller Application',
      message: `"${params.storeName}" submitted a seller application for review.`,
      icon: 'Store',
      iconBg: 'bg-blue-500',
      actionUrl: '/admin/sellers',
      actionData: { sellerId: params.sellerId },
      priority: 'normal'
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Real-time Subscription for Live Badge Updates
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Subscribe to real-time notifications for live badge count updates.
   * Returns an unsubscribe function.
   */
  subscribeToNotifications(
    userId: string,
    userType: 'buyer' | 'seller' | 'admin',
    onNewNotification: (notification: any) => void
  ): () => void {
    if (!isSupabaseConfigured()) return () => {};

    const table = getNotificationTable(userType);
    const userIdColumn = getUserIdColumn(userType);
    const channelName = `${table}_${userId}_${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: table,
          filter: `${userIdColumn}=eq.${userId}`,
        },
        (payload) => {
          console.log(`[NotificationService] Real-time ${userType} notification:`, payload.new?.type);
          onNewNotification(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: table,
          filter: `${userIdColumn}=eq.${userId}`,
        },
        (payload) => {
          console.log(`[NotificationService] Real-time ${userType} notification update:`, payload.new?.type);
          onNewNotification(payload.new);
        }
      )
      .subscribe((status) => {
        console.log(`[NotificationService] Realtime subscription status for ${channelName}:`, status);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[NotificationService] Realtime subscription ${status} for ${channelName}`);
        }
      });

    return () => {
      console.log(`[NotificationService] Removing realtime channel ${channelName}`);
      supabase.removeChannel(channel);
    };
  }

  /**
   * Notify buyer when their return request status changes
   */
  async notifyBuyerReturnStatus(params: {
    buyerId: string;
    orderId: string;
    returnId: string;
    orderNumber: string;
    status: 'approved' | 'rejected' | 'refunded' | 'counter_offered';
    message?: string;
  }): Promise<Notification | null> {
    const titleMap: Record<string, string> = {
      approved: 'Return Approved',
      rejected: 'Return Rejected',
      refunded: 'Refund Processed',
      counter_offered: 'New Counter Offer',
    };
    
    return this.createNotification({
      userId: params.buyerId,
      userType: 'buyer',
      type: `return_${params.status}`,
      title: titleMap[params.status] || 'Return Update',
      message: params.message || `Your return for order #${params.orderNumber} has been ${params.status.replace('_', ' ')}.`,
      icon: params.status === 'rejected' ? 'XCircle' : 'CheckCircle',
      iconBg: params.status === 'rejected' ? 'bg-red-500' : 'bg-green-500',
      actionUrl: '/ReturnDetail',
      actionData: { returnId: params.returnId },
      priority: 'high'
    });
  }

  /**
   * Fire a push notification via the send-push-notification Edge Function.
   * Non-critical — failures are swallowed.
   */
  private async _sendPush(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await supabase.functions.invoke('send-push-notification', {
        body: { userId, title, body, data: data ?? {} },
      });
    } catch {
      // silent — push is best-effort
    }
  }

  async notifyBuyerOrderAutoCancelled(params: {
    buyerId: string;
    orderId: string;
    orderNumber: string;
    reason: string;
  }): Promise<Notification | null> {
    return this.createNotification({
      userId: params.buyerId,
      userType: 'buyer',
      type: 'buyer_order_auto_cancelled',
      title: 'Order Auto-Cancelled',
      message: `Your order #${params.orderNumber} was automatically cancelled. ${params.reason}`,
      icon: 'XCircle',
      iconBg: 'bg-red-500',
      actionUrl: `/orders/${params.orderId}`,
      actionData: { orderId: params.orderId, orderNumber: params.orderNumber },
      priority: 'high'
    });
  }

  async notifySellerOrderAutoCancelled(params: {
    sellerId: string;
    orderId: string;
    orderNumber: string;
    reason: string;
  }): Promise<Notification | null> {
    return this.createNotification({
      userId: params.sellerId,
      userType: 'seller',
      type: 'seller_order_auto_cancelled',
      title: 'Order Auto-Cancelled',
      message: `Your order #${params.orderNumber} was automatically cancelled because you did not confirm in time. ${params.reason}`,
      icon: 'XCircle',
      iconBg: 'bg-red-500',
      actionUrl: `/seller/orders/${params.orderId}`,
      actionData: { orderId: params.orderId, orderNumber: params.orderNumber },
      priority: 'high'
    });
  }
}

export const notificationService = new NotificationService();
