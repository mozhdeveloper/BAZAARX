/**
 * Unified Payment Methods Constants
 * Use these constants throughout the app to avoid typos and ensure consistency
 */

// Payment method string constants (lowercase for database consistency)
export const PAYMENT_METHODS = {
  COD: 'cod',
  PAYMONGO: 'paymongo',
  GCASH: 'gcash',
  MAYA: 'maya',
  CARD: 'card',
  GRAB_PAY: 'grab_pay',
  BANK_TRANSFER: 'bank_transfer',
} as const;

// User-friendly display names for payment methods
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  [PAYMENT_METHODS.COD]: 'Cash on Delivery',
  [PAYMENT_METHODS.PAYMONGO]: 'PayMongo',
  [PAYMENT_METHODS.GCASH]: 'GCash',
  [PAYMENT_METHODS.MAYA]: 'Maya',
  [PAYMENT_METHODS.CARD]: 'Card',
  [PAYMENT_METHODS.GRAB_PAY]: 'Grab Pay',
  [PAYMENT_METHODS.BANK_TRANSFER]: 'Bank Transfer',
};

// Order statuses for payment-related transitions
export const ORDER_STATUSES = {
  PENDING: 'pending',           // Initial state - awaiting seller confirmation
  PROCESSING: 'processing',     // Seller confirmed, preparing shipment
  CONFIRMED: 'confirmed',       // Legacy alias for processing
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

// Payment statuses
export const PAYMENT_STATUSES = {
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
} as const;

// Shipment statuses
export const SHIPMENT_STATUSES = {
  WAITING_FOR_SELLER: 'waiting_for_seller',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

/**
 * Get display label for a payment method
 * @param method - The payment method string
 * @returns User-friendly display name
 */
export const getPaymentMethodLabel = (method?: string | null): string => {
  if (!method) return 'Unknown';
  
  const normalized = normalizePaymentMethod(method);
  return PAYMENT_METHOD_LABELS[normalized] || method;
};

/**
 * Normalize payment method string to standard format
 * Handles various input formats: 'PayMongo', 'paymongo', { type: 'paymongo' }
 * @param method - The payment method in any format
 * @returns Normalized payment method string
 */
export const normalizePaymentMethod = (method: any): string => {
  if (!method) return PAYMENT_METHODS.COD;

  // If it's already an object with a 'type' property
  if (typeof method === 'object' && method.type) {
    const type = String(method.type).toLowerCase().trim();
    return type;
  }

  // If it's a string
  if (typeof method === 'string') {
    const normalized = method.toLowerCase().trim();
    return normalized;
  }

  return PAYMENT_METHODS.COD;
};

/**
 * Check if payment method is COD (Cash on Delivery)
 * @param method - The payment method in any format
 * @returns true if the method is COD
 */
export const isCOD = (method: any): boolean => {
  const normalized = normalizePaymentMethod(method);
  return normalized === PAYMENT_METHODS.COD;
};

/**
 * Check if payment method is PayMongo
 * @param method - The payment method in any format
 * @returns true if the method is PayMongo
 */
export const isPayMongo = (method: any): boolean => {
  const normalized = normalizePaymentMethod(method);
  return normalized === PAYMENT_METHODS.PAYMONGO;
};

/**
 * Check if payment method requires immediate payment processing
 * @param method - The payment method in any format
 * @returns true if the method requires online payment
 */
export const isOnlinePayment = (method: any): boolean => {
  const normalized = normalizePaymentMethod(method);
  return ![PAYMENT_METHODS.COD].includes(normalized);
};

/**
 * Determine the initial order status based on payment method
 * - PayMongo (successful): 'processing'
 * - COD: 'pending' (awaiting seller confirmation before shipping)
 * - Others: depends on implementation
 * @param method - The payment method
 * @param isPaid - Whether payment has been successfully processed
 * @returns The initial order status
 */
export const getInitialOrderStatus = (method: any, isPaid: boolean = false): string => {
  const normalized = normalizePaymentMethod(method);
  
  // For paid online payments, mark as processing
  if (isPaid && normalized !== PAYMENT_METHODS.COD) {
    return ORDER_STATUSES.PROCESSING;
  }
  
  // COD and unpaid orders wait for seller confirmation
  return ORDER_STATUSES.PENDING;
};

/**
 * Determine the initial payment status based on payment method
 * @param method - The payment method
 * @param isPaid - Whether payment has been successfully processed
 * @returns The initial payment status
 */
export const getInitialPaymentStatus = (method: any, isPaid: boolean = false): string => {
  const normalized = normalizePaymentMethod(method);
  
  // If payment is marked as paid, use PAID status
  if (isPaid) {
    return PAYMENT_STATUSES.PAID;
  }
  
  // For online payments (not COD), payment is pending
  if (normalized !== PAYMENT_METHODS.COD) {
    return PAYMENT_STATUSES.PENDING_PAYMENT;
  }
  
  // COD is technically pending until paid to driver
  return PAYMENT_STATUSES.PENDING_PAYMENT;
};
