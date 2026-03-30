/**
 * Order Notification Service
 * Sends chat messages to buyers when order status changes,
 * and fires push notifications to both buyer and seller.
 */

import { supabase } from '../lib/supabase';
import { chatService } from './chatService';
import { fetchOrderEmailData } from './receiptService';
import {
  sendOrderConfirmedEmail,
  sendOrderReadyToShipEmail,
  sendOrderShippedEmail,
  sendOrderOutForDeliveryEmail,
  sendOrderDeliveredEmail,
  sendOrderFailedDeliveryEmail,
  sendOrderCancelledEmail,
  sendOrderReturnedEmail,
} from './transactionalEmails';

export interface StatusMessage {
  status: string;
  systemMessage: string;
  sellerMessage?: string;
}

// Status messages for each order status change
export const ORDER_STATUS_MESSAGES: Record<string, StatusMessage> = {
  pending: {
    status: 'pending',
    systemMessage: 'Order confirmed! Your seller will start preparing your items.',
    sellerMessage: 'Thank you for your order! We have received it and will start preparing your items.',
  },
  confirmed: {
    status: 'confirmed',
    systemMessage: 'Your order has been confirmed by the seller.',
    sellerMessage: 'We have confirmed your order and will begin processing it shortly.',
  },
  processing: {
    status: 'processing',
    systemMessage: 'Your order is now being prepared.',
    sellerMessage: 'Good news! We are now preparing your order.',
  },
  shipped: {
    status: 'shipped',
    systemMessage: 'Your order has been shipped! It\'s on its way to you.',
    sellerMessage: 'Great news! Your order has been shipped and is on its way to you.',
  },
  out_for_delivery: {
    status: 'out_for_delivery',
    systemMessage: 'Your order is out for delivery!',
    sellerMessage: 'Exciting! Your order is out for delivery and will arrive soon.',
  },
  delivered: {
    status: 'delivered',
    systemMessage: 'Your order has been delivered. Thank you for shopping with us!',
    sellerMessage: 'Your order has been delivered! Thank you for shopping with us. We hope you enjoy your purchase!',
  },
  cancelled: {
    status: 'cancelled',
    systemMessage: 'Your order has been cancelled.',
    sellerMessage: 'Your order has been cancelled. If you have any questions, please let us know.',
  },
};

class OrderNotificationService {
  /**
   * Send status update notification to buyer via chat
   */
  async sendStatusUpdateNotification(
    orderId: string,
    newStatus: string,
    sellerId: string,
    buyerId: string,
    trackingNumber?: string,
    customMessage?: string,
    emailMetadata?: Record<string, string>
  ): Promise<boolean> {
    try {
      // Get or create conversation between buyer and seller
      // Fire transactional email immediately (non-blocking) — independent of chat success
      console.log(`[OrderNotification] ▶ Dispatching transactional email for order ${orderId}, status: ${newStatus}`);
      this._sendTransactionalEmail(orderId, newStatus, { trackingNumber, ...emailMetadata }).catch(
        (err) => console.error('[OrderNotification] ✖ Email dispatch error:', err)
      );

      const conversation = await chatService.getOrCreateConversation(buyerId, sellerId);
      
      if (!conversation) {
        console.error('[OrderNotification] Failed to get/create conversation');
        return false;
      }

      const statusConfig = ORDER_STATUS_MESSAGES[newStatus];
      
      if (!statusConfig) {
        console.warn(`[OrderNotification] No message config for status: ${newStatus}`);
        return false;
      }

      // Prepare the message content
      let messageContent = customMessage || statusConfig.sellerMessage || statusConfig.systemMessage;
      
      // Add tracking number for shipped status
      if (newStatus === 'shipped' && trackingNumber) {
        messageContent += `\n\n📦 Tracking Number: ${trackingNumber}`;
      }

      // Send message as seller
      const message = await chatService.sendMessage(
        conversation.id,
        sellerId,
        'seller',
        messageContent
      );

      if (!message) {
        console.error('[OrderNotification] Failed to send message');
        return false;
      }

      // Also store in order notification log for tracking
      await this.logNotification(orderId, newStatus, messageContent);

      // Fire push notification to the buyer
      await this.sendPushNotification(buyerId, {
        title: `Order Update`,
        body: statusConfig.systemMessage,
        data: { type: 'order_status', orderId, status: newStatus },
      });

      console.log(`[OrderNotification] Sent ${newStatus} notification for order ${orderId}`);
      return true;
    } catch (error) {
      console.error('[OrderNotification] Error sending notification:', error);
      return false;
    }
  }

  /**
   * Fetch order/buyer data and dispatch the correct transactional email for
   * the given shipment status. Failures are non-fatal.
   */
  private async _sendTransactionalEmail(
    orderId: string,
    newStatus: string,
    extra: Record<string, string | undefined> = {}
  ): Promise<void> {
    console.log(`[OrderNotification] ▶ _sendTransactionalEmail: orderId=${orderId}, status=${newStatus}`);
    const data = await fetchOrderEmailData(orderId);
    if (!data || !data.buyerEmail) {
      console.warn(`[OrderNotification] ✖ No email data for order ${orderId} — skipping email`, { hasData: !!data, buyerEmail: data?.buyerEmail });
      return;
    }
    console.log(`[OrderNotification] Email data loaded:`, { buyerEmail: data.buyerEmail, buyerName: data.buyerName, orderNumber: data.orderNumber });

    const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://bazaar.ph';
    const trackUrl = `${BASE_URL}/orders/${orderId}`;
    const rescheduleUrl = `${BASE_URL}/orders/${orderId}`;

    const base = {
      buyerEmail: data.buyerEmail,
      buyerId: data.buyerId,
      orderNumber: data.orderNumber,
      buyerName: data.buyerName,
    };

    switch (newStatus) {
      case 'processing':
        await sendOrderConfirmedEmail({
          ...base,
          estimatedDelivery: extra.estimatedDelivery ?? '3–7 business days',
        });
        break;

      case 'ready_to_ship':
        await sendOrderReadyToShipEmail({
          ...base,
          estimatedPickup: extra.estimatedPickup ?? 'within 24 hours',
          trackUrl,
        });
        break;

      case 'shipped':
        await sendOrderShippedEmail({
          ...base,
          trackingNumber: extra.trackingNumber ?? data.trackingNumber ?? 'N/A',
          courierName: extra.courierName ?? 'courier',
          trackingUrl: extra.trackingUrl ?? trackUrl,
        });
        break;

      case 'out_for_delivery':
        await sendOrderOutForDeliveryEmail({
          ...base,
          courierName: extra.courierName ?? 'courier',
          trackUrl,
        });
        break;

      case 'delivered':
        await sendOrderDeliveredEmail(base);
        break;

      case 'failed_to_deliver':
        await sendOrderFailedDeliveryEmail({
          ...base,
          failureReason: extra.failureReason ?? 'Recipient not available',
          rescheduleUrl,
        });
        break;

      case 'cancelled':
        await sendOrderCancelledEmail({
          ...base,
          cancelReason: extra.cancelReason ?? 'Order cancelled',
        });
        break;

      case 'returned':
        await sendOrderReturnedEmail({
          ...base,
          refundAmount: extra.refundAmount ?? data.total,
          refundMethod: extra.refundMethod ?? 'Original payment method',
          trackUrl,
        });
        break;

      default:
        // No email defined for this status
        break;
    }
  }

  /**
   * Send a system message (not from seller)
   */
  async sendSystemNotification(
    orderId: string,
    buyerId: string,
    sellerId: string,
    message: string
  ): Promise<boolean> {
    try {
      const conversation = await chatService.getOrCreateConversation(buyerId, sellerId);
      
      if (!conversation) {
        return false;
      }

      // For system messages, we'll add them to order_messages or use a special sender
      // Since chat is 1:1, we'll send as seller with a system-like format
      const systemMessage = `📋 System: ${message}`;
      
      await chatService.sendMessage(
        conversation.id,
        sellerId,
        'seller',
        systemMessage
      );

      return true;
    } catch (error) {
      console.error('[OrderNotification] Error sending system notification:', error);
      return false;
    }
  }

  /**
   * Log notification for tracking purposes
   */
  private async logNotification(
    orderId: string,
    status: string,
    message: string
  ): Promise<void> {
    try {
      // Check if order_notifications table exists, if not just log to console
      const { error } = await supabase
        .from('order_status_history')
        .update({
          metadata: { notification_sent: true, notification_message: message }
        })
        .eq('order_id', orderId)
        .eq('status', status)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        // Table might not have the right columns, just log
        console.log(`[OrderNotification] Logged notification for order ${orderId}`);
      }
    } catch (error) {
      // Non-critical, just log
      console.log(`[OrderNotification] Could not log notification: ${error}`);
    }
  }

  /**
   * Get status message configuration
   */
  getStatusMessage(status: string): StatusMessage | null {
    return ORDER_STATUS_MESSAGES[status] || null;
  }

  /**
   * Fire a push notification to a user via the send-push-notification Edge Function.
   * Failures are non-fatal — we log but don't throw.
   */
  private async sendPushNotification(
    userId: string,
    payload: { title: string; body: string; data?: Record<string, unknown> }
  ): Promise<void> {
    try {
      console.log('[OrderNotification] ▶ Sending push notification to', userId);

      // Use direct fetch to avoid CORS issues with supabase.functions.invoke
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !anonKey) {
        console.warn('[OrderNotification] Missing env vars — skipping push notification');
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': anonKey,
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          title: payload.title,
          body: payload.body,
          data: payload.data ?? {},
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn('[OrderNotification] Push notification error:', response.status, errText);
        if (response.status === 401) {
          console.warn('[OrderNotification] Deploy with: supabase functions deploy send-push-notification --no-verify-jwt');
        }
      } else {
        const result = await response.json();
        console.log('[OrderNotification] ✔ Push notification response:', result);
      }
    } catch (err) {
      console.warn('[OrderNotification] Push notification failed (non-fatal):', err instanceof Error ? err.message : err);
    }
  }
}

export const orderNotificationService = new OrderNotificationService();
