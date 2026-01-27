import { supabase } from '@/lib/supabase';

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
 * Create a new notification in the database
 */
export async function createNotification(params: {
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
  try {
    // Validate required parameters
    if (!params.userId) {
      console.error('❌ createNotification: userId is required', { params });
      return null;
    }
    if (!params.userType) {
      console.error('❌ createNotification: userType is required', { params });
      return null;
    }
    if (!params.type) {
      console.error('❌ createNotification: type is required', { params });
      return null;
    }
    if (!params.title) {
      console.error('❌ createNotification: title is required', { params });
      return null;
    }
    if (!params.message) {
      console.error('❌ createNotification: message is required', { params });
      return null;
    }

    console.log(`📢 Creating ${params.userType} notification:`, {
      userId: params.userId,
      userType: params.userType,
      type: params.type,
      title: params.title,
      message: params.message,
      priority: params.priority || 'normal'
    });

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

    if (error) {
      console.error('❌ Supabase error creating notification:', {
        code: (error as any).code,
        message: error.message,
        details: (error as any).details,
        params: params
      });
      return null;
    }

    console.log('✅ Notification created successfully:', data?.id);
    return data;
  } catch (error) {
    console.error('❌ Exception creating notification:', {
      error,
      params,
      stack: (error as any)?.stack
    });
    return null;
  }
}

/**
 * Get notifications for a user
 */
export async function getNotifications(
  userId: string,
  userType: 'buyer' | 'seller' | 'admin',
  limit: number = 50
): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('user_type', userType)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching notifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Exception fetching notifications:', error);
    return [];
  }
}

/**
 * Get unread notifications count
 */
export async function getUnreadCount(
  userId: string,
  userType: 'buyer' | 'seller' | 'admin'
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('user_type', userType)
      .eq('is_read', false);

    if (error) {
      console.error('❌ Error fetching unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('❌ Exception fetching unread count:', error);
    return 0;
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (error) {
      console.error('❌ Error marking notification as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Exception marking notification as read:', error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(
  userId: string,
  userType: 'buyer' | 'seller' | 'admin'
): Promise<boolean> {
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

    if (error) {
      console.error('❌ Error marking all notifications as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Exception marking all notifications as read:', error);
    return false;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('❌ Error deleting notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Exception deleting notification:', error);
    return false;
  }
}

/**
 * Helper function to create an order notification for seller
 */
export async function notifySellerNewOrder(params: {
  sellerId: string;
  orderId: string;
  orderNumber: string;
  buyerName: string;
  total: number;
}): Promise<Notification | null> {
  console.log('📦 notifySellerNewOrder called with:', {
    sellerId: params.sellerId,
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    buyerName: params.buyerName,
    total: params.total
  });

  if (!params.sellerId) {
    console.error('❌ notifySellerNewOrder: sellerId is missing!', { params });
    return null;
  }

  const result = await createNotification({
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

  if (!result) {
    console.error('❌ notifySellerNewOrder: Failed to create notification', { params });
  }
  return result;
}

/**
 * Helper function to create order status notification for buyer
 */
export async function notifyBuyerOrderStatus(params: {
  buyerId: string;
  orderId: string;
  orderNumber: string;
  status: string;
  message: string;
}): Promise<Notification | null> {
  console.log('🚀 notifyBuyerOrderStatus called with:', {
    buyerId: params.buyerId,
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    status: params.status,
    message: params.message
  });

  if (!params.buyerId) {
    console.error('❌ notifyBuyerOrderStatus: buyerId is missing!', { params });
    return null;
  }

  const iconMap: Record<string, { icon: string; bg: string }> = {
    confirmed: { icon: 'CheckCircle', bg: 'bg-blue-500' },
    shipped: { icon: 'Truck', bg: 'bg-orange-500' },
    delivered: { icon: 'Package', bg: 'bg-green-500' },
    cancelled: { icon: 'XCircle', bg: 'bg-red-500' }
  };

  const iconInfo = iconMap[params.status] || { icon: 'Bell', bg: 'bg-gray-500' };

  console.log(`📋 Creating buyer notification for status '${params.status}'`, { iconInfo });

  const result = await createNotification({
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

  if (!result) {
    console.error('❌ notifyBuyerOrderStatus: Failed to create notification', { params });
  }
  return result;
}
