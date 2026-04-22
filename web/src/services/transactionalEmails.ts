/**
 * Transactional Email Helper
 *
 * Provides ready-to-use functions for sending transactional emails
 * on key order lifecycle events. Uses the emailService with template slugs.
 */

import { emailService } from '@/services/emailService';

/**
 * Send order receipt email to buyer after placing an order.
 */
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

/**
 * Send order confirmed email.
 */
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

/**
 * Send order shipped email with tracking info.
 */
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

/**
 * Send order delivered email.
 */
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

/**
 * Send order cancelled email.
 */
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

/**
 * Send payment received email.
 */
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

/**
 * Send refund processed email.
 */
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

/**
 * Send order ready-to-ship email.
 */
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

/**
 * Send order out-for-delivery email.
 */
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

/**
 * Send failed-delivery email.
 */
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

/**
 * Send return-confirmed email.
 */
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

/**
 * Send digital receipt email when payment_status transitions to 'paid'.
 * This is the buyer's official proof of payment and includes a full itemized receipt.
 */
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

/**
 * Send partial-refund email.
 */
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

/**
 * Send payment-failed email.
 */
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

/**
 * Send welcome email to new buyer.
 */
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

// ─────────────────────────────────────────────────────────────────────────────
// Return / Refund lifecycle emails
// ─────────────────────────────────────────────────────────────────────────────

/** Buyer: confirmation that their return request was received. */
export async function sendReturnRequestedEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  returnReason: string;
  resolutionPath: string;
}) {
  return emailService.sendTemplatedEmail({
    templateSlug: 'return_requested',
    to: params.buyerEmail,
    eventType: 'return_requested',
    recipientId: params.buyerId,
    variables: {
      buyer_name: params.buyerName,
      order_number: params.orderNumber,
      return_reason: params.returnReason,
      resolution_path: params.resolutionPath,
    },
    metadata: { order_number: params.orderNumber },
  });
}

/** Buyer: return was approved, ship the item back. */
export async function sendReturnApprovedEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  returnLabelUrl?: string;
}) {
  return emailService.sendTemplatedEmail({
    templateSlug: 'return_approved',
    to: params.buyerEmail,
    eventType: 'return_approved',
    recipientId: params.buyerId,
    variables: {
      buyer_name: params.buyerName,
      order_number: params.orderNumber,
      return_label_url: params.returnLabelUrl ?? '',
    },
    metadata: { order_number: params.orderNumber },
  });
}

/** Buyer: return was rejected. */
export async function sendReturnRejectedEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  rejectReason: string;
}) {
  return emailService.sendTemplatedEmail({
    templateSlug: 'return_rejected',
    to: params.buyerEmail,
    eventType: 'return_rejected',
    recipientId: params.buyerId,
    variables: {
      buyer_name: params.buyerName,
      order_number: params.orderNumber,
      reject_reason: params.rejectReason,
    },
    metadata: { order_number: params.orderNumber },
  });
}

/** Buyer: seller sent a counter-offer. */
export async function sendReturnCounterOfferedEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  offerDetails: string;
}) {
  return emailService.sendTemplatedEmail({
    templateSlug: 'return_counter_offered',
    to: params.buyerEmail,
    eventType: 'return_counter_offered',
    recipientId: params.buyerId,
    variables: {
      buyer_name: params.buyerName,
      order_number: params.orderNumber,
      offer_details: params.offerDetails,
    },
    metadata: { order_number: params.orderNumber },
  });
}

/** Seller: buyer has shipped the return item — please confirm receipt. */
export async function sendSellerReturnShippedEmail(params: {
  sellerEmail: string;
  sellerId: string;
  orderNumber: string;
  sellerName: string;
  trackingNumber: string;
}) {
  return emailService.sendTemplatedEmail({
    templateSlug: 'seller_return_shipped',
    to: params.sellerEmail,
    eventType: 'return_shipped_to_seller',
    recipientId: params.sellerId,
    variables: {
      seller_name: params.sellerName,
      order_number: params.orderNumber,
      tracking_number: params.trackingNumber,
    },
    metadata: { order_number: params.orderNumber },
  });
}

/** Seller: new return request from a buyer. */
export async function sendSellerReturnRequestEmail(params: {
  sellerEmail: string;
  sellerId: string;
  orderNumber: string;
  sellerName: string;
  buyerName: string;
  returnReason: string;
}) {
  return emailService.sendTemplatedEmail({
    templateSlug: 'seller_return_request',
    to: params.sellerEmail,
    eventType: 'seller_return_request',
    recipientId: params.sellerId,
    variables: {
      seller_name: params.sellerName,
      order_number: params.orderNumber,
      buyer_name: params.buyerName,
      return_reason: params.returnReason,
    },
    metadata: { order_number: params.orderNumber },
  });
}
