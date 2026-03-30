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
      courier: params.courierName,
      track_url: params.trackingUrl,
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
      shipping: params.shippingFee,
      total: params.totalAmount,
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
      amount: params.refundAmount,
      refund_method: params.refundMethod,
    },
  });
}

export async function sendPaymentReceivedEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  paymentMethod: string;
  amountPaid: string;
}) {
  return emailService.sendTemplatedEmail({
    templateSlug: 'payment_received',
    to: params.buyerEmail,
    eventType: 'payment_received',
    recipientId: params.buyerId,
    variables: {
      buyer_name: params.buyerName,
      order_number: params.orderNumber,
      payment_method: params.paymentMethod,
      amount: params.amountPaid,
    },
  });
}

export async function sendOrderReadyToShipEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  estimatedPickup: string;
  trackUrl: string;
}) {
  return emailService.sendTemplatedEmail({
    templateSlug: 'order_ready_to_ship',
    to: params.buyerEmail,
    eventType: 'order_ready_to_ship',
    recipientId: params.buyerId,
    variables: {
      buyer_name: params.buyerName,
      order_number: params.orderNumber,
      estimated_pickup: params.estimatedPickup,
      track_url: params.trackUrl,
    },
    metadata: { order_number: params.orderNumber },
  });
}

export async function sendOrderOutForDeliveryEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  courierName: string;
  trackUrl: string;
}) {
  return emailService.sendTemplatedEmail({
    templateSlug: 'order_out_for_delivery',
    to: params.buyerEmail,
    eventType: 'order_out_for_delivery',
    recipientId: params.buyerId,
    variables: {
      buyer_name: params.buyerName,
      order_number: params.orderNumber,
      courier_name: params.courierName,
      track_url: params.trackUrl,
    },
    metadata: { order_number: params.orderNumber },
  });
}

export async function sendOrderFailedDeliveryEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  failureReason: string;
  rescheduleUrl: string;
}) {
  return emailService.sendTemplatedEmail({
    templateSlug: 'order_failed_delivery',
    to: params.buyerEmail,
    eventType: 'order_failed_delivery',
    recipientId: params.buyerId,
    variables: {
      buyer_name: params.buyerName,
      order_number: params.orderNumber,
      failure_reason: params.failureReason,
      reschedule_url: params.rescheduleUrl,
    },
    metadata: { order_number: params.orderNumber },
  });
}

export async function sendOrderReturnedEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  refundAmount: string;
  refundMethod: string;
  trackUrl: string;
}) {
  return emailService.sendTemplatedEmail({
    templateSlug: 'order_returned',
    to: params.buyerEmail,
    eventType: 'order_returned',
    recipientId: params.buyerId,
    variables: {
      buyer_name: params.buyerName,
      order_number: params.orderNumber,
      refund_amount: params.refundAmount,
      refund_method: params.refundMethod,
      track_url: params.trackUrl,
    },
    metadata: { order_number: params.orderNumber },
  });
}

export async function sendDigitalReceiptEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  receiptNumber: string;
  buyerName: string;
  orderDate: string;
  itemsHtml: string;
  subtotal: string;
  shipping: string;
  discount: string;
  total: string;
  paymentMethod: string;
  transactionId: string;
  transactionDate: string;
  shippingAddress: string;
  trackUrl: string;
}) {
  return emailService.sendTemplatedEmail({
    templateSlug: 'digital_receipt',
    to: params.buyerEmail,
    eventType: 'digital_receipt',
    recipientId: params.buyerId,
    variables: {
      buyer_name: params.buyerName,
      buyer_email: params.buyerEmail,
      receipt_number: params.receiptNumber,
      order_number: params.orderNumber,
      order_date: params.orderDate,
      items_html: params.itemsHtml,
      subtotal: params.subtotal,
      shipping: params.shipping,
      discount: params.discount,
      total: params.total,
      payment_method: params.paymentMethod,
      transaction_id: params.transactionId,
      transaction_date: params.transactionDate,
      shipping_address: params.shippingAddress,
      track_url: params.trackUrl,
    },
    metadata: { order_number: params.orderNumber, receipt_number: params.receiptNumber },
  });
}

export async function sendPartialRefundEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  refundAmount: string;
  remainingTotal: string;
  refundMethod: string;
  trackUrl: string;
}) {
  return emailService.sendTemplatedEmail({
    templateSlug: 'partial_refund_processed',
    to: params.buyerEmail,
    eventType: 'partial_refund',
    recipientId: params.buyerId,
    variables: {
      buyer_name: params.buyerName,
      order_number: params.orderNumber,
      refund_amount: params.refundAmount,
      remaining_total: params.remainingTotal,
      refund_method: params.refundMethod,
      track_url: params.trackUrl,
    },
    metadata: { order_number: params.orderNumber },
  });
}

export async function sendPaymentFailedEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  retryUrl: string;
}) {
  return emailService.sendTemplatedEmail({
    templateSlug: 'payment_failed',
    to: params.buyerEmail,
    eventType: 'payment_failed',
    recipientId: params.buyerId,
    variables: {
      buyer_name: params.buyerName,
      order_number: params.orderNumber,
      retry_url: params.retryUrl,
    },
    metadata: { order_number: params.orderNumber },
  });
}

export async function sendWelcomeEmail(params: {
  buyerEmail: string;
  buyerId: string;
  buyerName: string;
}) {
  return emailService.sendTemplatedEmail({
    templateSlug: 'welcome',
    to: params.buyerEmail,
    eventType: 'welcome',
    recipientId: params.buyerId,
    variables: {
      buyer_name: params.buyerName,
    },
  });
}
