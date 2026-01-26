/**
 * Database Types for Supabase Integration
 * Generated from the Supabase schema plan
 * This file will be replaced with auto-generated types once Supabase is set up
 */

// ============================================================================
// ENUMS
// ============================================================================

export type UserType = 'buyer' | 'seller' | 'admin';
export type AdminRole = 'admin' | 'super_admin' | 'moderator';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'reclassified';
export type OrderType = 'ONLINE' | 'OFFLINE';
export type OrderStatus =
  | 'pending_payment'
  | 'payment_failed'
  | 'paid'
  | 'processing'
  | 'ready_to_ship'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed_delivery'
  | 'cancelled'
  | 'refunded'
  | 'disputed'
  | 'returned'
  | 'completed';

export type ProductWithSeller = Product & {
  seller?: {
    business_name: string;
    store_name: string;
    rating: number;
    business_address: string;
  }
};

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type ReturnStatus = 'requested' | 'approved' | 'denied' | 'completed';
export type VoucherType = 'percentage' | 'fixed' | 'shipping';
export type AddressType = 'residential' | 'commercial';

export type ProductQAStatus =
  | 'PENDING_DIGITAL_REVIEW'
  | 'WAITING_FOR_SAMPLE'
  | 'IN_QUALITY_REVIEW'
  | 'ACTIVE_VERIFIED'
  | 'FOR_REVISION'
  | 'REJECTED';

export type RejectionStage = 'digital' | 'physical';

export type InventoryChangeType =
  | 'DEDUCTION'
  | 'ADDITION'
  | 'ADJUSTMENT'
  | 'RESERVATION'
  | 'RELEASE';

export type InventoryChangeReason =
  | 'ONLINE_SALE'
  | 'OFFLINE_SALE'
  | 'MANUAL_ADJUSTMENT'
  | 'STOCK_REPLENISHMENT'
  | 'ORDER_CANCELLATION'
  | 'RESERVATION';

export type OrderItemStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export type NotificationType = 'order' | 'product' | 'review' | 'system' | 'payment' | 'inventory';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// ============================================================================
// DATABASE TABLES
// ============================================================================

// ----------------------------------------------------------------------------
// Users & Authentication
// ----------------------------------------------------------------------------

export interface Profile {
  id: string; // UUID
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  user_type: UserType;
  bazcoins: number; // Added bazcoins field
  created_at: string; // ISO timestamp
  updated_at: string;
  last_login_at: string | null;
}

export interface Buyer {
  id: string; // UUID, references Profile
  shipping_addresses: ShippingAddress[];
  payment_methods: PaymentMethod[];
  preferences: Record<string, unknown>;
  followed_shops: string[]; // UUID[]
  created_at: string;
  updated_at: string;
}

export interface Seller {
  id: string; // UUID, references Profile
  // Business Information
  business_name: string;
  store_name: string;
  store_description: string | null;
  store_category: string[];
  business_type: string | null;
  business_registration_number: string | null;
  tax_id_number: string | null;
  // Address
  business_address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  // Banking
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  // Document URLs
  business_permit_url: string | null;
  valid_id_url: string | null;
  proof_of_address_url: string | null;
  dti_registration_url: string | null;
  tax_id_url: string | null;
  // Status
  is_verified: boolean;
  approval_status: ApprovalStatus;
  rejection_reason: string | null;
  rating: number;
  total_sales: number;
  // Timestamps
  join_date: string;
  created_at: string;
  updated_at: string;
}

export interface Admin {
  id: string; // UUID, references Profile
  role: AdminRole;
  permissions: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// Products
// ----------------------------------------------------------------------------

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
  sellerRating?: number;
  sellerVerified?: boolean;
  sold?: number;
  location?: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
  sku?: string;
}

export interface ProductQA {
  id: string; // UUID
  product_id: string | null;
  vendor: string;
  status: ProductQAStatus;
  logistics: string | null;
  rejection_reason: string | null;
  rejection_stage: RejectionStage | null;
  submitted_at: string;
  approved_at: string | null;
  verified_at: string | null;
  rejected_at: string | null;
  revision_requested_at: string | null;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// Orders
// ----------------------------------------------------------------------------

export interface Order {
  id: string; // UUID
  order_number: string;
  // Parties
  buyer_id: string;
  seller_id: string;
  // Buyer Info (denormalized)
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  // Order Type
  order_type: OrderType;
  pos_note: string | null;
  // Pricing
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  // Status
  status: OrderStatus;
  payment_status: PaymentStatus;
  // Shipping
  shipping_address: ShippingAddress;
  shipping_method: ShippingMethod | null;
  tracking_number: string | null;
  estimated_delivery_date: string | null;
  actual_delivery_date: string | null;
  delivery_instructions: string | null;
  // Payment
  payment_method: PaymentMethod;
  payment_reference: string | null;
  payment_date: string | null;
  // Discount/Promo
  promo_code: string | null;
  voucher_id: string | null;
  // Notes
  notes: string | null;
  special_instructions: string | null;
  // Review
  is_reviewed: boolean;
  rating: number | null;
  review_comment: string | null;
  review_images: string[];
  review_date: string | null;
  // Return/Refund
  is_returnable: boolean;
  return_window: number;
  return_reason: string | null;
  return_status: ReturnStatus | null;
  refund_amount: number | null;
  refund_date: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  completed_at: string | null;
}

export interface OrderItem {
  id: string; // UUID
  order_id: string;
  product_id: string | null;
  // Product Info (denormalized)
  product_name: string;
  product_images: string[];
  sku: string | null;
  // Pricing
  price: number;
  original_price: number | null;
  quantity: number;
  subtotal: number;
  // Variant Info
  selected_variant: ProductVariant | null;
  personalized_options: Record<string, unknown> | null;
  // Seller Info
  seller_id: string | null;
  seller_name: string | null;
  // Item Status
  status: OrderItemStatus;
  tracking_number: string | null;
  // Review
  is_reviewed: boolean;
  rating: number | null;
  review_comment: string | null;
  review_date: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface OrderStatusHistory {
  id: string; // UUID
  order_id: string;
  status: string;
  note: string | null;
  changed_by: string | null; // UUID
  changed_by_role: 'buyer' | 'seller' | 'admin' | 'system' | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ----------------------------------------------------------------------------
// Cart
// ----------------------------------------------------------------------------

export interface Cart {
  id: string; // UUID
  buyer_id: string | null;
  // Pricing
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  tax_amount: number;
  total_amount: number;
  // Applied Discounts
  promo_code: string | null;
  voucher_id: string | null;
  // Shipping
  shipping_address_id: string | null;
  shipping_method: ShippingMethod | null;
  // Notes
  notes: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface CartItem {
  id: string; // UUID
  cart_id: string;
  product_id: string;
  quantity: number;
  selected_variant: ProductVariant | null;
  personalized_options: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// Reviews
// ----------------------------------------------------------------------------

export interface Review {
  id: string; // UUID
  product_id: string;
  seller_id: string;
  buyer_id: string;
  order_id: string | null;
  // Review Content
  rating: number; // 1-5
  comment: string | null;
  images: string[];
  // Engagement
  helpful_count: number;
  // Seller Reply
  seller_reply: {
    comment: string;
    date: string;
  } | null;
  // Status
  is_verified_purchase: boolean;
  is_hidden: boolean;
  // Timestamps
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// Vouchers
// ----------------------------------------------------------------------------

export interface Voucher {
  id: string; // UUID
  code: string;
  title: string;
  description: string | null;
  // Type & Value
  voucher_type: VoucherType;
  value: number;
  // Restrictions
  min_order_value: number;
  max_discount: number | null;
  seller_id: string | null; // null for platform vouchers
  // Validity
  valid_from: string;
  valid_to: string;
  // Usage
  usage_limit: number | null;
  used_count: number;
  per_user_limit: number;
  // Status
  is_active: boolean;
  // Applicability
  applicable_categories: string[];
  applicable_products: string[];
  first_time_user_only: boolean;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface VoucherUsage {
  id: string; // UUID
  voucher_id: string;
  buyer_id: string;
  order_id: string | null;
  discount_amount: number;
  used_at: string;
}

// ----------------------------------------------------------------------------
// Inventory
// ----------------------------------------------------------------------------

export interface InventoryLedger {
  id: string; // UUID
  product_id: string;
  product_name: string;
  // Change Details
  change_type: InventoryChangeType;
  quantity_before: number;
  quantity_change: number;
  quantity_after: number;
  // Reason & Reference
  reason: InventoryChangeReason;
  reference_id: string | null;
  // User
  user_id: string | null;
  notes: string | null;
  // Timestamp
  timestamp: string;
}

export interface LowStockAlert {
  id: string; // UUID
  product_id: string;
  product_name: string;
  current_stock: number;
  threshold: number;
  acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
}

// ----------------------------------------------------------------------------
// Notifications
// ----------------------------------------------------------------------------

export interface Notification {
  id: string; // UUID
  user_id: string;
  user_type: UserType;
  // Notification Details
  type: NotificationType;
  title: string;
  message: string;
  icon: string | null;
  icon_bg: string | null;
  // Action
  action_url: string | null;
  action_data: Record<string, unknown> | null;
  // Status
  is_read: boolean;
  read_at: string | null;
  // Priority
  priority: NotificationPriority;
  // Timestamps
  created_at: string;
}

// ----------------------------------------------------------------------------
// Categories
// ----------------------------------------------------------------------------

export interface Category {
  id: string; // UUID
  name: string;
  slug?: string;
  description?: string | null;
  parent_id?: string | null;
  icon?: string | null;
  image_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  // Legacy
  count?: number;
}

// ----------------------------------------------------------------------------
// Addresses
// ----------------------------------------------------------------------------

export interface Address {
  id: string; // UUID
  user_id: string;
  label: string;
  first_name: string;
  last_name: string;
  phone: string;
  street: string;
  barangay: string | null;
  city: string;
  province: string;
  region: string;
  zip_code: string;
  landmark: string | null;
  delivery_instructions: string | null;
  is_default: boolean;
  address_type: AddressType;
  coordinates: {
    lat: number;
    lng: number;
  } | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface ShippingAddress {
  first_name: string;
  last_name: string;
  phone: string;
  street: string;
  barangay?: string;
  city: string;
  province: string;
  region: string;
  zip_code: string;
  landmark?: string;
  delivery_instructions?: string;
}

export interface ShippingMethod {
  carrier: string;
  service: string;
  cost: number;
  estimated_days: number;
}

export interface PaymentMethod {
  type: 'gcash' | 'paymaya' | 'cod' | 'bank_transfer' | 'card';
  details: Record<string, unknown>;
}

// ============================================================================
// DATABASE TYPE
// ============================================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      buyers: {
        Row: Buyer;
        Insert: Omit<Buyer, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Buyer, 'id' | 'created_at'>>;
      };
      sellers: {
        Row: Seller;
        Insert: Omit<Seller, 'created_at' | 'updated_at' | 'join_date'>;
        Update: Partial<Omit<Seller, 'id' | 'created_at' | 'join_date'>>;
      };
      admins: {
        Row: Admin;
        Insert: Omit<Admin, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Admin, 'id' | 'created_at'>>;
      };
      products: {
        Row: Product;
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Product, 'id' | 'created_at'>>;
      };
      product_qa: {
        Row: ProductQA;
        Insert: Omit<ProductQA, 'id' | 'created_at' | 'updated_at' | 'submitted_at'>;
        Update: Partial<Omit<ProductQA, 'id' | 'created_at' | 'submitted_at'>>;
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Order, 'id' | 'created_at'>>;
      };
      order_items: {
        Row: OrderItem;
        Insert: Omit<OrderItem, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<OrderItem, 'id' | 'created_at'>>;
      };
      order_status_history: {
        Row: OrderStatusHistory;
        Insert: Omit<OrderStatusHistory, 'id' | 'created_at'>;
        Update: Partial<Omit<OrderStatusHistory, 'id' | 'created_at'>>;
      };
      carts: {
        Row: Cart;
        Insert: Omit<Cart, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Cart, 'id' | 'created_at'>>;
      };
      cart_items: {
        Row: CartItem;
        Insert: Omit<CartItem, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CartItem, 'id' | 'created_at'>>;
      };
      reviews: {
        Row: Review;
        Insert: Omit<Review, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Review, 'id' | 'created_at'>>;
      };
      vouchers: {
        Row: Voucher;
        Insert: Omit<Voucher, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Voucher, 'id' | 'created_at'>>;
      };
      voucher_usage: {
        Row: VoucherUsage;
        Insert: Omit<VoucherUsage, 'id' | 'used_at'>;
        Update: Partial<Omit<VoucherUsage, 'id' | 'used_at'>>;
      };
      inventory_ledger: {
        Row: InventoryLedger;
        Insert: Omit<InventoryLedger, 'id' | 'timestamp'>;
        Update: never; // Ledger entries are immutable
      };
      low_stock_alerts: {
        Row: LowStockAlert;
        Insert: Omit<LowStockAlert, 'id' | 'created_at'>;
        Update: Partial<Omit<LowStockAlert, 'id' | 'created_at'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'>;
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Category, 'id' | 'created_at'>>;
      };
      addresses: {
        Row: Address;
        Insert: Omit<Address, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Address, 'id' | 'created_at'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
