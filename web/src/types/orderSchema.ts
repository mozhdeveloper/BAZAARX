// Shared types for Cart and Order management across the entire BazaarPH system
// This schema is used by both mobile and web platforms, and shared between buyer, seller, and admin interfaces

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  categoryId: string;
  brand?: string;
  sellerId: string;
  sellerName: string;
  sellerBusinessName?: string;
  stock: number;
  sku?: string;
  weight?: number; // in grams
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  isActive: boolean;
  tags?: string[];
  attributes?: ProductAttribute[];
  rating?: number;
  reviewCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductAttribute {
  name: string;
  value: string;
  type?: 'text' | 'number' | 'boolean' | 'select';
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  selectedVariant?: ProductVariant;
  personalizedOptions?: PersonalizationOption[];
  addedAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id: string;
  name: string;
  options: VariantOption[];
  priceAdjustment?: number;
  stockAdjustment?: number;
  sku?: string;
}

export interface VariantOption {
  id: string;
  name: string;
  value: string;
  priceAdjustment?: number;
  stockAdjustment?: number;
}

export interface PersonalizationOption {
  id: string;
  name: string;
  value: string;
  additionalCost?: number;
}

export interface Cart {
  id: string;
  buyerId: string;
  items: CartItem[];
  subtotal: number;
  totalItems: number;
  discount?: Discount;
  discountAmount: number;
  shippingAddress?: Address;
  shippingMethod?: ShippingMethod;
  shippingCost: number;
  taxAmount: number;
  totalAmount: number;
  currency: 'PHP';
  promoCode?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date; // For guest carts
}

export interface Discount {
  id: string;
  code: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  minimumPurchase?: number;
  maximumDiscount?: number;
  description: string;
  isActive: boolean;
  validFrom: Date;
  validUntil: Date;
  usageLimit?: number;
  usedCount: number;
  applicableCategories?: string[];
  applicableProducts?: string[];
  firstTimeUserOnly?: boolean;
}

export interface Address {
  id: string;
  userId: string;
  label: string; // e.g., "Home", "Office", "Parents' House"
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  barangay?: string;
  city: string;
  province: string;
  region: string;
  zipCode: string;
  landmark?: string;
  deliveryInstructions?: string;
  isDefault: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
  addressType: 'residential' | 'commercial';
  createdAt: Date;
  updatedAt: Date;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  provider: string; // e.g., "LBC", "J&T", "Grab", "Lalamove"
  type: 'standard' | 'express' | 'same_day' | 'next_day';
  cost: number;
  estimatedDeliveryDays: {
    min: number;
    max: number;
  };
  availableRegions?: string[];
  weightLimit?: number; // in grams
  sizeLimit?: {
    maxLength: number;
    maxWidth: number;
    maxHeight: number;
  };
  insuranceIncluded: boolean;
  trackingIncluded: boolean;
  isActive: boolean;
  icon?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'debit_card' | 'gcash' | 'paymaya' | 'bank_transfer' | 'cod' | 'installment';
  name: string;
  description?: string;
  provider?: string; // e.g., "GCash", "PayMaya", "BPI", "BDO"
  isDigitalWallet: boolean;
  processingFee?: number; // percentage or fixed amount
  minimumAmount?: number;
  maximumAmount?: number;
  currency: 'PHP';
  isActive: boolean;
  icon?: string;
  instructions?: string;
}

export type OrderStatus = 
  | 'pending_payment'     // Order created, awaiting payment
  | 'payment_failed'      // Payment attempt failed
  | 'paid'               // Payment successful, order confirmed
  | 'processing'         // Seller is preparing the order
  | 'ready_to_ship'      // Order is packed and ready for pickup
  | 'shipped'            // Order has been shipped/picked up by courier
  | 'out_for_delivery'   // Order is with the courier for delivery
  | 'delivered'          // Order successfully delivered
  | 'failed_delivery'    // Delivery attempt failed
  | 'cancelled'          // Order cancelled by buyer or seller
  | 'refunded'           // Order refunded
  | 'disputed'           // Order is under dispute
  | 'returned'           // Order returned by buyer
  | 'completed';         // Order completed successfully

export interface Order {
  id: string;
  orderNumber: string; // User-friendly order number (e.g., "BZR-2024-001234")
  buyerId: string;
  buyerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  
  // Seller information
  sellerId: string;
  sellerInfo: {
    businessName: string;
    contactEmail: string;
    contactPhone: string;
  };

  // Order items
  items: OrderItem[];
  itemCount: number;
  
  // Pricing
  subtotal: number;
  discountAmount: number;
  discount?: Discount;
  shippingCost: number;
  taxAmount: number;
  totalAmount: number;
  currency: 'PHP';
  
  // Status and tracking
  status: OrderStatus;
  statusHistory: OrderStatusHistory[];
  
  // Shipping information
  shippingAddress: Address;
  shippingMethod: ShippingMethod;
  trackingNumber?: string;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  deliveryInstructions?: string;
  
  // Payment information
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  paymentReference?: string;
  paymentDate?: Date;
  
  // Additional information
  notes?: string;
  specialInstructions?: string;
  promoCode?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date;
  completedAt?: Date;
  
  // Reviews and ratings
  isReviewed: boolean;
  rating?: number;
  review?: string;
  reviewDate?: Date;
  
  // Return and refund
  isReturnable: boolean;
  returnWindow: number; // days
  returnReason?: string;
  returnStatus?: 'requested' | 'approved' | 'denied' | 'completed';
  refundAmount?: number;
  refundDate?: Date;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImages: string[];
  price: number;
  originalPrice?: number;
  quantity: number;
  selectedVariant?: ProductVariant;
  personalizedOptions?: PersonalizationOption[];
  subtotal: number;
  sellerId: string;
  sellerName: string;
  sku?: string;
  
  // Item-specific status for partial fulfillment
  status: 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  trackingNumber?: string;
  
  // Reviews and ratings
  isReviewed: boolean;
  rating?: number;
  review?: string;
  reviewDate?: Date;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  description: string;
  notes?: string;
  timestamp: Date;
  updatedBy: string; // user ID who updated the status
  updatedByRole: 'buyer' | 'seller' | 'admin' | 'system';
  location?: string; // for tracking updates
  images?: string[]; // proof photos for delivery, etc.
}

// Cart Store State Management
export interface CartStore {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;
  
  // Cart actions
  loadCart: (buyerId: string) => Promise<void>;
  addToCart: (productId: string, quantity: number, variant?: ProductVariant, personalization?: PersonalizationOption[]) => Promise<void>;
  updateCartItem: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  
  // Pricing calculations
  calculateSubtotal: () => number;
  calculateShipping: (shippingMethodId: string, address: Address) => Promise<number>;
  calculateTax: () => number;
  calculateTotal: () => number;
  applyDiscount: (promoCode: string) => Promise<boolean>;
  removeDiscount: () => void;
  
  // Checkout process
  updateShippingAddress: (address: Address) => void;
  updateShippingMethod: (method: ShippingMethod) => void;
  updatePaymentMethod: (method: PaymentMethod) => void;
  
  // Validation
  validateCart: () => Promise<CartValidation>;
  
  clearError: () => void;
}

export interface CartValidation {
  isValid: boolean;
  errors: CartValidationError[];
  warnings: CartValidationWarning[];
}

export interface CartValidationError {
  type: 'out_of_stock' | 'price_changed' | 'product_unavailable' | 'seller_inactive' | 'shipping_unavailable';
  itemId?: string;
  message: string;
  affectedItems?: string[];
}

export interface CartValidationWarning {
  type: 'low_stock' | 'price_increase' | 'delivery_delay';
  itemId?: string;
  message: string;
}

// Order Store State Management
export interface OrderStore {
  orders: Order[];
  selectedOrder: Order | null;
  isLoading: boolean;
  error: string | null;
  
  // Order actions
  loadOrders: (userId: string, role: 'buyer' | 'seller' | 'admin') => Promise<void>;
  loadOrder: (orderId: string) => Promise<void>;
  createOrder: (cartId: string, paymentMethodId: string) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus, notes?: string) => Promise<void>;
  cancelOrder: (orderId: string, reason: string) => Promise<void>;
  
  // Tracking and shipping
  updateTrackingNumber: (orderId: string, trackingNumber: string) => Promise<void>;
  updateShippingInfo: (orderId: string, updates: Partial<Order>) => Promise<void>;
  
  // Reviews
  addReview: (orderId: string, itemId: string, rating: number, review: string) => Promise<void>;
  
  // Returns and refunds
  requestReturn: (orderId: string, itemIds: string[], reason: string) => Promise<void>;
  processRefund: (orderId: string, amount: number, reason: string) => Promise<void>;
  
  // Admin functions
  loadAllOrders: (filters?: OrderFilters) => Promise<void>;
  exportOrders: (filters?: OrderFilters) => Promise<string>; // Returns CSV/Excel data
  
  clearError: () => void;
  selectOrder: (order: Order | null) => void;
}

export interface OrderFilters {
  status?: OrderStatus[];
  sellerId?: string;
  buyerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  paymentMethod?: string;
  shippingMethod?: string;
  minAmount?: number;
  maxAmount?: number;
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'amount' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// Cross-Platform Integration Types
export interface CrossSystemSync {
  lastSyncAt: Date;
  syncVersion: number;
  pendingActions: SyncAction[];
}

export interface SyncAction {
  id: string;
  type: 'cart_update' | 'order_update' | 'status_change' | 'payment_update';
  entityId: string;
  data: any;
  timestamp: Date;
  isProcessed: boolean;
  platform: 'web' | 'mobile';
}

// Notification Types for Order Updates
export interface OrderNotification {
  id: string;
  orderId: string;
  userId: string;
  userRole: 'buyer' | 'seller' | 'admin';
  type: 'order_placed' | 'payment_confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'status_update';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

// Analytics and Reporting Types
export interface OrderAnalytics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topSellingProducts: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
  }>;
  ordersByStatus: Record<OrderStatus, number>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    orderCount: number;
  }>;
  topCustomers: Array<{
    buyerId: string;
    buyerName: string;
    orderCount: number;
    totalSpent: number;
  }>;
}

// Utility Functions
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Pending Payment',
  payment_failed: 'Payment Failed',
  paid: 'Payment Confirmed',
  processing: 'Processing',
  ready_to_ship: 'Ready to Ship',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  failed_delivery: 'Failed Delivery',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  disputed: 'Disputed',
  returned: 'Returned',
  completed: 'Completed'
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending_payment: 'orange',
  payment_failed: 'red',
  paid: 'blue',
  processing: 'blue',
  ready_to_ship: 'purple',
  shipped: 'purple',
  out_for_delivery: 'purple',
  delivered: 'green',
  failed_delivery: 'red',
  cancelled: 'red',
  refunded: 'gray',
  disputed: 'red',
  returned: 'gray',
  completed: 'green'
};

// Helper functions for order management
export const canCancelOrder = (order: Order): boolean => {
  return ['pending_payment', 'paid', 'processing'].includes(order.status);
};

export const canReturnOrder = (order: Order): boolean => {
  if (!order.isReturnable) return false;
  if (order.status !== 'completed' && order.status !== 'delivered') return false;
  
  const deliveryDate = order.actualDeliveryDate || order.completedAt;
  if (!deliveryDate) return false;
  
  const returnDeadline = new Date(deliveryDate);
  returnDeadline.setDate(returnDeadline.getDate() + order.returnWindow);
  
  return new Date() <= returnDeadline;
};

export const calculateOrderProgress = (status: OrderStatus): number => {
  const statusProgress: Record<OrderStatus, number> = {
    pending_payment: 10,
    payment_failed: 0,
    paid: 20,
    processing: 40,
    ready_to_ship: 50,
    shipped: 70,
    out_for_delivery: 90,
    delivered: 100,
    failed_delivery: 90,
    cancelled: 0,
    refunded: 0,
    disputed: 50,
    returned: 0,
    completed: 100
  };
  
  return statusProgress[status] || 0;
};

export const formatOrderNumber = (order: Order): string => {
  return order.orderNumber || `BZR-${order.createdAt.getFullYear()}-${order.id.slice(-6).toUpperCase()}`;
};

export const calculateEstimatedDelivery = (
  shippingMethod: ShippingMethod,
  orderDate: Date = new Date()
): { min: Date; max: Date } => {
  const minDate = new Date(orderDate);
  const maxDate = new Date(orderDate);
  
  minDate.setDate(minDate.getDate() + shippingMethod.estimatedDeliveryDays.min);
  maxDate.setDate(maxDate.getDate() + shippingMethod.estimatedDeliveryDays.max);
  
  return { min: minDate, max: maxDate };
};