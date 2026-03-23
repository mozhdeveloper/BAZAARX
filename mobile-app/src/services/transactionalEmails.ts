/**
 * Transactional Email Helpers (Mobile)
 *
 * Ready-to-use functions for key order lifecycle events.
 * Mirrors web/src/services/transactionalEmails.ts — same template slugs,
 * same variable names, different underlying email service (direct fetch).
 */

import { emailService } from './emailService';

export async function sendOrderConfirmedEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  estimatedDelivery: string;
}) {
  return emailService.sendTemplatedEmail({
    templateSlug: 'order_confirmed',
    to: params.buyerEmail,
    eventType: 'order_confirmed',
    recipientId: params.buyerId,
    variables: {
      buyer_name: params.buyerName,
      order_number: params.orderNumber,
      estimated_delivery: params.estimatedDelivery,
    },
  });
}

export async function sendOrderShippedEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  trackingNumber: string;
  courierName: string;
  trackingUrl: string;
}) {
  return emailService.sendTemplatedEmail({
    templateSlug: 'order_shipped',
    to: params.buyerEmail,
    eventType: 'order_shipped',
    recipientId: params.buyerId,
    variables: {
      buyer_name: params.buyerName,
      order_number: params.orderNumber,
      tracking_number: params.trackingNumber,
      courier_name: params.courierName,
      tracking_url: params.trackingUrl,
    },
  });
}

export async function sendOrderDeliveredEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
}) {
  return emailService.sendTemplatedEmail({
    templateSlug: 'order_delivered',
    to: params.buyerEmail,
    eventType: 'order_delivered',
    recipientId: params.buyerId,
    variables: {
      buyer_name: params.buyerName,
      order_number: params.orderNumber,
    },
  });
}

export async function sendOrderCancelledEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  cancelReason: string;
}) {
  return emailService.sendTemplatedEmail({
    templateSlug: 'order_cancelled',
    to: params.buyerEmail,
    eventType: 'order_cancelled',
    recipientId: params.buyerId,
    variables: {
      buyer_name: params.buyerName,
      order_number: params.orderNumber,
      cancel_reason: params.cancelReason,
    },
  });
}

export async function sendOrderReceiptEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  orderDate: string;
  buyerName: string;
  itemsHtml: string;
  subtotal: string;
  shippingFee: string;
  totalAmount: string;
}) {
  return emailService.sendTemplatedEmail({
    templateSlug: 'order_receipt',
    to: params.buyerEmail,
    eventType: 'order_placed',
    recipientId: params.buyerId,
    variables: {
      buyer_name: params.buyerName,
      order_number: params.orderNumber,
      order_date: params.orderDate,
      items_html: params.itemsHtml,
      subtotal: params.subtotal,
      shipping_fee: params.shippingFee,
      total_amount: params.totalAmount,
    },
    metadata: { order_number: params.orderNumber },
  });
}

export async function sendRefundProcessedEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  refundAmount: string;
  refundMethod: string;
}) {
  return emailService.sendTemplatedEmail({
    templateSlug: 'refund_processed',
    to: params.buyerEmail,
    eventType: 'refund_processed',
    recipientId: params.buyerId,
    variables: {
      buyer_name: params.buyerName,
      order_number: params.orderNumber,
      refund_amount: params.refundAmount,
      refund_method: params.refundMethod,
    },
  });
}
