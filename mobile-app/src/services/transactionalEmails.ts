/**
 * Transactional Email Helpers (Mobile)
 *
 * DISABLED: Email service has been removed.
 * These functions are now no-ops that return false.
 */

export async function sendOrderConfirmedEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  estimatedDelivery: string;
}): Promise<boolean> {
  console.warn('Email service disabled - sendOrderConfirmedEmail called');
  return false;
}

export async function sendOrderShippedEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  trackingNumber: string;
  courierName: string;
  trackingUrl: string;
}): Promise<boolean> {
  console.warn('Email service disabled - sendOrderShippedEmail called');
  return false;
}

export async function sendOrderDeliveredEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
}): Promise<boolean> {
  console.warn('Email service disabled - sendOrderDeliveredEmail called');
  return false;
}

export async function sendOrderCancelledEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  cancelReason: string;
}): Promise<boolean> {
  console.warn('Email service disabled - sendOrderCancelledEmail called');
  return false;
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
}): Promise<boolean> {
  console.warn('Email service disabled - sendOrderReceiptEmail called');
  return false;
}

export async function sendRefundProcessedEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  refundAmount: string;
  refundMethod: string;
}): Promise<boolean> {
  console.warn('Email service disabled - sendRefundProcessedEmail called');
  return false;
}

export async function sendPaymentReceivedEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  paymentMethod: string;
  amountPaid: string;
}): Promise<boolean> {
  console.warn('Email service disabled - sendPaymentReceivedEmail called');
  return false;
}

export async function sendOrderReadyToShipEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  estimatedPickup: string;
  trackUrl: string;
}): Promise<boolean> {
  console.warn('Email service disabled - sendOrderReadyToShipEmail called');
  return false;
}

export async function sendOrderOutForDeliveryEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  courierName: string;
  trackUrl: string;
}): Promise<boolean> {
  console.warn('Email service disabled - sendOrderOutForDeliveryEmail called');
  return false;
}

export async function sendOrderFailedDeliveryEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  failureReason: string;
  rescheduleUrl: string;
}): Promise<boolean> {
  console.warn('Email service disabled - sendOrderFailedDeliveryEmail called');
  return false;
}

export async function sendOrderReturnedEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  refundAmount: string;
  refundMethod: string;
  trackUrl: string;
}): Promise<boolean> {
  console.warn('Email service disabled - sendOrderReturnedEmail called');
  return false;
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
}): Promise<boolean> {
  console.warn('Email service disabled - sendDigitalReceiptEmail called');
  return false;
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
}): Promise<boolean> {
  console.warn('Email service disabled - sendPartialRefundEmail called');
  return false;
}

export async function sendPaymentFailedEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  retryUrl: string;
}): Promise<boolean> {
  console.warn('Email service disabled - sendPaymentFailedEmail called');
  return false;
}

export async function sendWelcomeEmail(params: {
  buyerEmail: string;
  buyerId: string;
  buyerName: string;
}): Promise<boolean> {
  console.warn('Email service disabled - sendWelcomeEmail called');
  return false;
}
