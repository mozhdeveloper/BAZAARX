/**
 * Supabase Realtime Subscriptions
 * Utility functions for managing real-time subscriptions
 */

import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Subscribe to order updates for a buyer
 */
export const subscribeToOrderUpdates = (
  buyerId: string,
  onUpdate: (order: any) => void
): RealtimeChannel => {
  const channel = supabase
    .channel('order-updates')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `buyer_id=eq.${buyerId}`,
      },
      (payload) => {
        onUpdate(payload.new);
      }
    )
    .subscribe();

  return channel;
};

/**
 * Subscribe to new orders for a seller
 */
export const subscribeToNewOrders = (
  sellerId: string,
  onNewOrder: (order: any) => void
): RealtimeChannel => {
  const channel = supabase
    .channel('new-orders')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `seller_id=eq.${sellerId}`,
      },
      (payload) => {
        onNewOrder(payload.new);
      }
    )
    .subscribe();

  return channel;
};

/**
 * Subscribe to low stock alerts
 */
export const subscribeToLowStockAlerts = (
  sellerId: string,
  onAlert: (alert: any) => void
): RealtimeChannel => {
  const channel = supabase
    .channel('low-stock-alerts')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'low_stock_alerts',
      },
      (payload) => {
        onAlert(payload.new);
      }
    )
    .subscribe();

  return channel;
};

/**
 * Subscribe to product approval status changes
 */
export const subscribeToProductApprovals = (
  sellerId: string,
  onStatusChange: (product: any) => void
): RealtimeChannel => {
  const channel = supabase
    .channel('product-approvals')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'products',
        filter: `seller_id=eq.${sellerId}`,
      },
      (payload) => {
        if (payload.new.approval_status !== payload.old?.approval_status) {
          onStatusChange(payload.new);
        }
      }
    )
    .subscribe();

  return channel;
};

/**
 * Subscribe to notifications
 */
export const subscribeToNotifications = (
  userId: string,
  onNotification: (notification: any) => void
): RealtimeChannel => {
  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNotification(payload.new);
      }
    )
    .subscribe();

  return channel;
};

/**
 * Unsubscribe from a channel
 */
export const unsubscribe = async (channel: RealtimeChannel): Promise<void> => {
  await supabase.removeChannel(channel);
};

/**
 * Unsubscribe from all channels
 */
export const unsubscribeAll = async (): Promise<void> => {
  await supabase.removeAllChannels();
};
