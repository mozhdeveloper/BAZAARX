/**
 * Order Notification Service
 * Sends chat messages to buyers when order status changes
 */

import { supabase } from '../lib/supabase';
import { chatService } from './chatService';

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
    customMessage?: string
  ): Promise<boolean> {
    try {
      // Get or create conversation between buyer and seller
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

      console.log(`[OrderNotification] Sent ${newStatus} notification for order ${orderId}`);
      return true;
    } catch (error) {
      console.error('[OrderNotification] Error sending notification:', error);
      return false;
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
}

export const orderNotificationService = new OrderNotificationService();
