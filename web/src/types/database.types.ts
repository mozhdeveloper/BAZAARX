/**
 * Database Types for Supabase Integration
 * Updated to match the new normalized database schema (February 2026)
 */

// ============================================================================
// ENUMS
// ============================================================================

export type UserRole = 'buyer' | 'seller' | 'admin';
export type ApprovalStatus =
  | 'pending'
  | 'verified'
  | 'approved'
  | 'rejected'
  | 'needs_resubmission';
export type ProductApprovalStatus = 'pending' | 'approved' | 'rejected' | 'reclassified';
export type OrderType = 'ONLINE' | 'OFFLINE';

export type PaymentStatus = 'pending_payment' | 'paid' | 'refunded' | 'partially_refunded';

export type ShipmentStatus =
  | 'waiting_for_seller'
  | 'processing'
  | 'ready_to_ship'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed_to_deliver'
  | 'received'
  | 'returned';

export type ProductAssessmentStatus =
  | 'pending_digital_review'
  | 'waiting_for_sample'
  | 'pending_physical_review'
  | 'verified'
  | 'for_revision'
  | 'rejected';

export type VoucherType = 'percentage' | 'fixed' | 'shipping';
export type AddressType = 'residential' | 'commercial';
export type BusinessType = 'sole_proprietor' | 'partnership' | 'corporation';
export type PaymentType = 'card' | 'bank_transfer' | 'e_wallet' | 'cod';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed';
export type ChatRequestStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export type DiscountCampaignType =
  | 'flash_sale'
  | 'seasonal_sale'
  | 'clearance'
  | 'buy_more_save_more'
  | 'limited_time_offer'
  | 'new_arrival_promo'
  | 'bundle_deal';

export type DiscountType = 'percentage' | 'fixed_amount';

export type CampaignStatus = 'scheduled' | 'active' | 'paused' | 'ended' | 'cancelled';

// ============================================================================
// CORE IDENTITY TABLES
// ============================================================================

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface Buyer {
  id: string;
  avatar_url: string | null;
  preferences: Record<string, unknown>;
  bazcoins: number;
  created_at: string;
  updated_at: string;
}

export interface Seller {
  id: string;
  store_name: string;
  store_description: string | null;
  avatar_url: string | null;
  owner_name: string | null;
  approval_status: ApprovalStatus;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  // Extended joins
  business_profile?: SellerBusinessProfile;
  payout_account?: SellerPayoutAccount;
  verification_documents?: SellerVerificationDocuments;
}

export interface SellerBusinessProfile {
  seller_id: string;
  business_type: BusinessType | null;
  business_registration_number: string | null;
  tax_id_number: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface SellerPayoutAccount {
  seller_id: string;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface SellerVerificationDocuments {
  seller_id: string;
  business_permit_url: string | null;
  valid_id_url: string | null;
  proof_of_address_url: string | null;
  dti_registration_url: string | null;
  tax_id_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Admin {
  id: string;
  permissions: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// USER-RELATED TABLES
// ============================================================================

export interface ShippingAddress {
  id: string;
  user_id: string;
  label: string;
  address_line_1: string;
  address_line_2: string | null;
  barangay: string | null;
  city: string;
  province: string;
  region: string;
  postal_code: string;
  landmark: string | null;
  delivery_instructions: string | null;
  is_default: boolean;
  address_type: AddressType;
  coordinates: { lat: number; lng: number } | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodRecord {
  id: string;
  user_id: string;
  payment_type: PaymentType;
  label: string;
  is_default: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodCard {
  payment_method_id: string;
  card_last4: string | null;
  card_brand: string | null;
  expiry_month: number | null;
  expiry_year: number | null;
}

export interface PaymentMethodBank {
  payment_method_id: string;
  bank_name: string | null;
  account_number_last4: string | null;
}

export interface PaymentMethodWallet {
  payment_method_id: string;
  e_wallet_provider: string | null;
  e_wallet_account_number: string | null;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export interface BuyerNotification {
  id: string;
  buyer_id: string;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
  action_data: Record<string, unknown> | null;
  read_at: string | null;
  priority: TicketPriority;
  created_at: string;
}

export interface SellerNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
  action_data: Record<string, unknown> | null;
  read_at: string | null;
  priority: TicketPriority;
  created_at: string;
}

export interface AdminNotification {
  id: string;
  admin_id: string;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
  action_data: Record<string, unknown> | null;
  read_at: string | null;
  priority: TicketPriority;
  created_at: string;
}

// ============================================================================
// CATEGORY SYSTEM
// ============================================================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  icon: string | null;
  image_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SellerCategory {
  id: string;
  seller_id: string;
  category_id: string;
  created_at: string;
}

// ============================================================================
// PRODUCT SYSTEM
// ============================================================================

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  brand: string | null;
  sku: string | null;
  specifications: Record<string, unknown>;
  approval_status: ProductApprovalStatus;
  variant_label_1: string | null;
  variant_label_2: string | null;
  price: number;
  low_stock_threshold: number;
  weight: number | null;
  dimensions: { length: number; width: number; height: number } | null;
  is_free_shipping: boolean;
  disabled_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  image_embedding: number[] | null;
  // Joined fields (not in DB directly)
  seller_id?: string;
  images?: ProductImage[];
  variants?: ProductVariant[];
  category?: Category;
  seller?: Seller;
  // Calculated metrics
  stock?: number;
  rating?: number;
  review_count?: number;
  sales_count?: number;
  // Legacy compatibility
  is_active?: boolean;
  original_price?: number;
  originalPrice?: number;
  campaignBadge?: string;
  campaignBadgeColor?: string;
  campaignEndsAt?: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  uploaded_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  barcode: string | null;
  variant_name: string;
  size: string | null;
  color: string | null;
  option_1_value: string | null;
  option_2_value: string | null;
  price: number;
  stock: number;
  thumbnail_url: string | null;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface ProductTag {
  id: string;
  product_id: string;
  tag: string;
  created_at: string;
}

export interface LowStockAlert {
  id: string;
  product_id: string;
  threshold: number;
  acknowledged: boolean;
  acknowledged_by: string | null;
  created_at: string;
}

// ============================================================================
// PRODUCT ASSESSMENT (QA) SYSTEM
// ============================================================================

export interface ProductAssessment {
  id: string;
  product_id: string;
  status: ProductAssessmentStatus;
  submitted_at: string;
  verified_at: string | null;
  revision_requested_at: string | null;
  created_at: string;
  product?: Product;
}

export interface ProductAssessmentLogistics {
  id: string;
  assessment_id: string;
  details: string | null;
  created_at: string;
  created_by: string | null;
}

export interface ProductApprovalRecord {
  id: string;
  assessment_id: string;
  description: string | null;
  created_at: string;
  created_by: string | null;
}

export interface ProductRejection {
  id: string;
  assessment_id: string | null;
  product_id: string | null;
  description: string | null;
  vendor_submitted_category: string | null;
  admin_reclassified_category: string | null;
  created_at: string;
  created_by: string | null;
}

export interface ProductRevision {
  id: string;
  assessment_id: string;
  description: string | null;
  created_at: string;
  created_by: string | null;
}

// ============================================================================
// REVIEWS SYSTEM
// ============================================================================

export interface Review {
  id: string;
  product_id: string;
  buyer_id: string;
  order_id: string | null;
  order_item_id: string | null;
  variant_snapshot: Record<string, unknown> | null;
  rating: number;
  comment: string | null;
  helpful_count: number;
  seller_reply: Record<string, unknown> | null;
  is_verified_purchase: boolean;
  is_hidden: boolean;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  buyer?: Buyer & { profile?: Profile };
  images?: ReviewImage[];
}

export interface ReviewImage {
  id: string;
  review_id: string;
  image_url: string;
  sort_order: number;
  uploaded_at: string;
}

// ============================================================================
// SHOPPING CART SYSTEM
// ============================================================================

export interface Cart {
  id: string;
  buyer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  personalized_options: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  product?: Product;
  variant?: ProductVariant;
}

// ============================================================================
// GIFT REGISTRY SYSTEM
// ============================================================================

export interface Registry {
  id: string;
  buyer_id: string;
  title: string;
  description: string | null;
  event_type: string;
  created_at: string;
  updated_at: string;
}

export interface RegistryItem {
  id: string;
  registry_id: string;
  product_id: string;
  quantity_desired: number;
  priority: 'low' | 'medium' | 'high';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// VOUCHER SYSTEM
// ============================================================================

export interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string | null;
  voucher_type: VoucherType;
  value: number;
  min_order_value: number;
  max_discount: number | null;
  seller_id: string | null;
  claimable_from: string;
  claimable_until: string;
  usage_limit: number | null;
  claim_limit: number | null;
  duration: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BuyerVoucher {
  id: string;
  buyer_id: string;
  voucher_id: string;
  valid_from: string | null;
  valid_until: string | null;
  usage_count: number;
  created_at: string;
}

// ============================================================================
// ORDER SYSTEM
// ============================================================================

export interface OrderRecipient {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export interface Order {
  tracking_number?: string | null;
  cancelled_at?: string | null;
  is_reviewed?: boolean;
  rating?: number | null;
  review_comment?: string | null;
  review_images?: string[] | null;
  review_date?: string | null;
  completed_at?: string | null;
  id: string;
  order_number: string;
  buyer_id: string;
  order_type: OrderType;
  pos_note: string | null;
  recipient_id: string | null;
  address_id: string | null;
  payment_status: PaymentStatus;
  shipment_status: ShipmentStatus;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  buyer?: Buyer & { profile?: Profile };
  recipient?: OrderRecipient;
  address?: ShippingAddress;
  items?: OrderItem[];
  subtotal?: number;
  total_amount?: number;
  // Legacy compatibility
  status?: string;
  seller_id?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  primary_image_url: string | null;
  price: number;
  price_discount: number;
  shipping_price: number;
  shipping_discount: number;
  quantity: number;
  variant_id: string | null;
  personalized_options: Record<string, unknown> | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
  product?: Product;
  variant?: ProductVariant;
}

export interface OrderShipment {
  id: string;
  order_id: string;
  status: string;
  shipping_method: Record<string, unknown> | null;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface OrderPayment {
  id: string;
  order_id: string;
  payment_method: Record<string, unknown> | null;
  payment_reference: string | null;
  payment_date: string | null;
  amount: number;
  status: string;
  created_at: string;
}

export interface OrderPromo {
  id: string;
  order_id: string;
  promo_code: string;
  created_at: string;
}

export interface OrderVoucher {
  id: string;
  buyer_id: string;
  order_id: string;
  voucher_id: string;
  discount_amount: number;
  created_at: string;
}

export interface RefundReturnPeriod {
  id: string;
  order_id: string;
  is_returnable: boolean;
  return_window_days: number;
  return_reason: string | null;
  refund_amount: number | null;
  refund_date: string | null;
  created_at: string;
}

export interface OrderCancellation {
  id: string;
  order_id: string;
  reason: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: string;
  note: string | null;
  changed_by: string | null;
  changed_by_role: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ============================================================================
// MESSAGING SYSTEM
// ============================================================================

export interface Conversation {
  id: string;
  buyer_id: string;
  order_id: string | null;
  created_at: string;
  updated_at: string;
  buyer?: Buyer & { profile?: Profile };
  messages?: Message[];
  last_message?: Message;
  // Legacy compatibility for chat service
  seller_id?: string;
  seller_store_name?: string;
  last_message_text?: string;
  last_message_at?: string;
  buyer_unread_count?: number;
  seller_unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'buyer' | 'seller';
  content: string;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
}

// ============================================================================
// AI ASSISTANT SYSTEM
// ============================================================================

export interface AIConversation {
  id: string;
  user_id: string;
  user_type: 'buyer' | 'seller';
  title: string | null;
  last_message_at: string;
  created_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  sender: 'user' | 'ai';
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface SellerChatRequest {
  id: string;
  seller_id: string;
  buyer_id: string;
  buyer_name: string | null;
  product_id: string | null;
  product_name: string | null;
  status: ChatRequestStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
  seller?: Seller;
  buyer?: Buyer & { profile?: Profile };
  product?: Product;
}

// ============================================================================
// SUPPORT TICKETING SYSTEM
// ============================================================================

export interface TicketCategory {
  id: string;
  name: string;
  parent_id: string | null;
  description: string | null;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  category_id: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  order_id: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: 'user' | 'admin';
  message: string;
  is_internal_note: boolean;
  created_at: string;
}

// ============================================================================
// SOCIAL FEATURES
// ============================================================================

export interface StoreFollower {
  id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
}

// ============================================================================
// DISCOUNT CAMPAIGNS
// ============================================================================

export interface DiscountCampaign {
  id: string;
  seller_id: string;
  name: string;
  description: string | null;
  campaign_type: DiscountCampaignType;
  discount_type: DiscountType;
  discount_value: number;
  max_discount_amount: number | null;
  min_purchase_amount: number;
  starts_at: string;
  ends_at: string;
  status: CampaignStatus;
  badge_text: string | null;
  badge_color: string;
  priority: number;
  claim_limit: number | null;
  per_customer_limit: number;
  applies_to: 'all_products' | 'specific_products' | 'specific_categories';
  created_at: string;
  updated_at: string;
}

export interface ProductDiscount {
  id: string;
  campaign_id: string;
  product_id: string;
  discount_type: DiscountType | null;
  discount_value: number | null;
  sold_count: number;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface OrderDiscount {
  id: string;
  buyer_id: string;
  order_id: string;
  campaign_id: string | null;
  discount_amount: number;
  created_at: string;
}

// ============================================================================
// AUDIT LOGS
// ============================================================================

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_table: string | null;
  target_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface SellerRejection {
  id: string;
  seller_id: string;
  description: string | null;
  rejection_type: 'full' | 'partial';
  created_by: string | null;
  created_at: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type ProductWithSeller = Product & {
  seller?: Seller;
  category?: Category;
  images?: ProductImage[];
  variants?: ProductVariant[];
};

export type FullProfile = Profile & {
  roles?: UserRoleRecord[];
  buyer?: Buyer;
  seller?: Seller;
  admin?: Admin;
};

// Legacy payment method type (for compatibility)
export interface PaymentMethod {
  type: 'gcash' | 'paymaya' | 'cod' | 'bank_transfer' | 'card';
  details: Record<string, unknown>;
}

// Legacy shipping method (for compatibility)
export interface ShippingMethod {
  carrier: string;
  service: string;
  cost: number;
  estimated_days: number;
}

// ============================================================================
// DATABASE TYPE (for Supabase client)
// ============================================================================

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      user_roles: { Row: UserRoleRecord; Insert: Partial<UserRoleRecord>; Update: Partial<UserRoleRecord> };
      buyers: { Row: Buyer; Insert: Partial<Buyer>; Update: Partial<Buyer> };
      sellers: { Row: Seller; Insert: Partial<Seller>; Update: Partial<Seller> };
      seller_business_profiles: { Row: SellerBusinessProfile; Insert: Partial<SellerBusinessProfile>; Update: Partial<SellerBusinessProfile> };
      seller_payout_accounts: { Row: SellerPayoutAccount; Insert: Partial<SellerPayoutAccount>; Update: Partial<SellerPayoutAccount> };
      seller_verification_documents: { Row: SellerVerificationDocuments; Insert: Partial<SellerVerificationDocuments>; Update: Partial<SellerVerificationDocuments> };
      admins: { Row: Admin; Insert: Partial<Admin>; Update: Partial<Admin> };
      shipping_addresses: { Row: ShippingAddress; Insert: Partial<ShippingAddress>; Update: Partial<ShippingAddress> };
      payment_methods: { Row: PaymentMethodRecord; Insert: Partial<PaymentMethodRecord>; Update: Partial<PaymentMethodRecord> };
      categories: { Row: Category; Insert: Partial<Category>; Update: Partial<Category> };
      products: { Row: Product; Insert: Partial<Product>; Update: Partial<Product> };
      product_images: { Row: ProductImage; Insert: Partial<ProductImage>; Update: Partial<ProductImage> };
      product_variants: { Row: ProductVariant; Insert: Partial<ProductVariant>; Update: Partial<ProductVariant> };
      product_tags: { Row: ProductTag; Insert: Partial<ProductTag>; Update: Partial<ProductTag> };
      product_assessments: { Row: ProductAssessment; Insert: Partial<ProductAssessment>; Update: Partial<ProductAssessment> };
      reviews: { Row: Review; Insert: Partial<Review>; Update: Partial<Review> };
      review_images: { Row: ReviewImage; Insert: Partial<ReviewImage>; Update: Partial<ReviewImage> };
      carts: { Row: Cart; Insert: Partial<Cart>; Update: Partial<Cart> };
      cart_items: { Row: CartItem; Insert: Partial<CartItem>; Update: Partial<CartItem> };
      vouchers: { Row: Voucher; Insert: Partial<Voucher>; Update: Partial<Voucher> };
      orders: { Row: Order; Insert: Partial<Order>; Update: Partial<Order> };
      order_items: { Row: OrderItem; Insert: Partial<OrderItem>; Update: Partial<OrderItem> };
      order_cancellations: { Row: OrderCancellation; Insert: Partial<OrderCancellation>; Update: Partial<OrderCancellation> };
      order_status_history: { Row: OrderStatusHistory; Insert: Partial<OrderStatusHistory>; Update: Partial<OrderStatusHistory> };
      conversations: { Row: Conversation; Insert: Partial<Conversation>; Update: Partial<Conversation> };
      messages: { Row: Message; Insert: Partial<Message>; Update: Partial<Message> };
      ai_conversations: { Row: AIConversation; Insert: Partial<AIConversation>; Update: Partial<AIConversation> };
      ai_messages: { Row: AIMessage; Insert: Partial<AIMessage>; Update: Partial<AIMessage> };
      seller_chat_requests: { Row: SellerChatRequest; Insert: Partial<SellerChatRequest>; Update: Partial<SellerChatRequest> };
      support_tickets: { Row: SupportTicket; Insert: Partial<SupportTicket>; Update: Partial<SupportTicket> };
      ticket_messages: { Row: TicketMessage; Insert: Partial<TicketMessage>; Update: Partial<TicketMessage> };
      discount_campaigns: { Row: DiscountCampaign; Insert: Partial<DiscountCampaign>; Update: Partial<DiscountCampaign> };
      product_discounts: { Row: ProductDiscount; Insert: Partial<ProductDiscount>; Update: Partial<ProductDiscount> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// ============================================================================
// LEGACY COMPATIBILITY TYPES
// ============================================================================

/** @deprecated Use UserRole instead */
export type UserType = 'buyer' | 'seller' | 'admin';

/** @deprecated Use ProductAssessmentStatus */
export type ProductQAStatus =
  | 'PENDING_DIGITAL_REVIEW'
  | 'WAITING_FOR_SAMPLE'
  | 'IN_QUALITY_REVIEW'
  | 'ACTIVE_VERIFIED'
  | 'FOR_REVISION'
  | 'REJECTED';

/** @deprecated Use PaymentStatus + ShipmentStatus */
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

/** @deprecated Use ProductAssessment table */
export interface ProductQA {
  id: string;
  product_id: string | null;
  vendor: string;
  status: ProductQAStatus;
  logistics: string | null;
  rejection_reason: string | null;
  rejection_stage: 'digital' | 'physical' | null;
  submitted_at: string;
  approved_at: string | null;
  verified_at: string | null;
  rejected_at: string | null;
  revision_requested_at: string | null;
  created_at: string;
  updated_at: string;
}

/** @deprecated Use InventoryLedger from sellerStore */
export type InventoryChangeType = 'DEDUCTION' | 'ADDITION' | 'ADJUSTMENT' | 'RESERVATION' | 'RELEASE';
export type InventoryChangeReason = 'ONLINE_SALE' | 'OFFLINE_SALE' | 'MANUAL_ADJUSTMENT' | 'STOCK_REPLENISHMENT' | 'ORDER_CANCELLATION' | 'RESERVATION';

export interface InventoryLedger {
  id: string;
  product_id: string;
  product_name: string;
  change_type: InventoryChangeType;
  quantity_before: number;
  quantity_change: number;
  quantity_after: number;
  reason: InventoryChangeReason;
  reference_id: string | null;
  user_id: string | null;
  notes: string | null;
  timestamp: string;
}

/** @deprecated Use ShippingAddress table */
export interface Address {
  id: string;
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
  coordinates: { lat: number; lng: number } | null;
  created_at: string;
  updated_at: string;
}

/** @deprecated Use Notification types (Buyer/Seller/Admin) */
export interface Notification {
  id: string;
  user_id: string;
  user_type: UserType;
  type: string;
  title: string;
  message: string;
  icon: string | null;
  icon_bg: string | null;
  action_url: string | null;
  action_data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  priority: TicketPriority;
  created_at: string;
}

export type NotificationType = 'order' | 'product' | 'review' | 'system' | 'payment' | 'inventory';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type RejectionStage = 'digital' | 'physical';
export type OrderItemStatus = 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
export type AdminRole = 'admin' | 'super_admin' | 'moderator';
export type ReturnStatus = 'requested' | 'approved' | 'denied' | 'completed';
