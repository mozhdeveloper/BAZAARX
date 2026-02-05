/**
 * Enums 
 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'reclassified';

/**
 * Interfaces
 */
export interface Product {
  id: string; // UUID
  seller_id?: string;
  // Product Info
  name?: string;
  description?: string | null;
  category?: string;
  category_id?: string | null;
  brand?: string | null;
  sku?: string | null;
  // Pricing
  price?: number;
  original_price?: number | null;
  // Inventory
  stock?: number;
  low_stock_threshold?: number;
  // Media
  images?: string[];
  primary_image?: string | null;
  // Variants & Options
  sizes?: string[];
  colors?: string[];
  variants?: ProductVariant[];
  specifications?: Record<string, unknown>;
  // Status
  is_active?: boolean;
  approval_status?: ApprovalStatus;
  rejection_reason?: string | null;
  vendor_submitted_category?: string | null;
  admin_reclassified_category?: string | null;
  // Metrics
  rating?: number;
  review_count?: number;
  sales_count?: number;
  view_count?: number;
  // Shipping
  weight?: number | null;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  } | null;
  is_free_shipping?: boolean;
  // Tags
  tags?: string[];
  // Timestamps
  created_at?: string;
  updated_at?: string;
  // Legacy / UI Fields
  originalPrice?: number;
  image?: string;
  isFreeShipping?: boolean;
  isVerified?: boolean;
  seller?: string;
  sellerId?: string; // Alias for seller_id
  sellerRating?: number;
  sellerVerified?: boolean;
  sold?: number;
  location?: string;
  // Selected variant for cart/checkout
  selectedVariant?: {
    color?: string;
    size?: string;
  } | null;
  quantity?: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
  sku?: string;
}

export interface CartItem extends Product {
  quantity: number;
  selectedVariant?: {
    color?: string;
    size?: string;
  } | null;
}

export interface Order {
  id: string;
  transactionId: string;
  items: CartItem[];
  total: number;
  shippingFee: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  isPaid: boolean;
  scheduledDate: string;
  deliveryDate?: string;
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  createdAt: string;
  isGift?: boolean;
  isAnonymous?: boolean;
  recipientId?: string;
  sellerInfo?: {
    id?: string;
    store_name?: string;
    business_name?: string;
    rating?: number;
    is_verified?: boolean;
    business_address?: string;
  };
}

export interface ShippingAddress {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export type ReturnStatus =
  | 'pending_review'
  | 'seller_response_required'
  | 'approved'
  | 'rejected'
  | 'item_returned'
  | 'refund_processing'
  | 'refunded'
  | 'escalated';

export type ReturnReason =
  | 'defective'
  | 'damaged'
  | 'incorrect'
  | 'not_as_described'
  | 'other';

export type ReturnType = 'refund_only' | 'return_refund' | 'replacement';

export interface ReturnRequest {
  id: string;
  orderId: string;
  userId: string;
  sellerId: string; // In case of multi-seller orders, returns might be per seller, but current Order structure seems to group items. Wait, Order has `items`, each item has `seller`. But the Order itself doesn't explicitly have `sellerId` at top level in the interface provided above, but the dummy data shows items have seller info. 
  // Looking at dummy data: items have 'seller' field. 
  // Let's assume an order can be mixed? 
  // The dummy data shows `items` array. 
  // Usually returns are per order or per item. The user flow says "Select Item(s)".
  items: {
    itemId: string;
    quantity: number;
  }[];
  reason: ReturnReason;
  description: string;
  images: string[];
  type: ReturnType;
  status: ReturnStatus;
  amount: number;
  createdAt: string;
  updatedAt: string;
  history: {
    status: ReturnStatus;
    timestamp: string;
    note?: string;
    by: 'buyer' | 'seller' | 'admin';
  }[];
}
