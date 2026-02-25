-- ============================================================================
-- BazaarX Supabase Database Schema Migration
-- Created: January 15, 2026
-- Description: Complete database schema for BazaarX e-commerce platform
-- ============================================================================

-- ============================================================================
-- 1. USERS & AUTHENTICATION TABLES
-- ============================================================================

-- Extends Supabase auth.users with custom profile data
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  user_type TEXT NOT NULL CHECK (user_type IN ('buyer', 'seller', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Buyer-specific data
CREATE TABLE public.buyers (
  id UUID REFERENCES public.profiles(id) PRIMARY KEY,
  shipping_addresses JSONB DEFAULT '[]',
  payment_methods JSONB DEFAULT '[]',
  preferences JSONB DEFAULT '{}',
  followed_shops UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seller-specific data
CREATE TABLE public.sellers (
  id UUID REFERENCES public.profiles(id) PRIMARY KEY,
  
  -- Business Information
  business_name TEXT NOT NULL,
  store_name TEXT NOT NULL UNIQUE,
  store_description TEXT,
  store_category TEXT[] DEFAULT ARRAY[]::TEXT[],
  business_type TEXT,
  business_registration_number TEXT,
  tax_id_number TEXT,
  
  -- Address
  business_address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  
  -- Banking
  bank_name TEXT,
  account_name TEXT,
  account_number TEXT,
  
  -- Status
  is_verified BOOLEAN DEFAULT FALSE,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  rating DECIMAL(2,1) DEFAULT 0.0,
  total_sales INTEGER DEFAULT 0,
  
  -- Timestamps
  join_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin-specific data
CREATE TABLE public.admins (
  id UUID REFERENCES public.profiles(id) PRIMARY KEY,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'moderator')),
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. CATEGORIES TABLE
-- ============================================================================

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES public.categories(id),
  icon TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON public.categories(parent_id);
CREATE INDEX idx_categories_active ON public.categories(is_active);

-- ============================================================================
-- 3. PRODUCTS TABLE
-- ============================================================================

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE NOT NULL,
  
  -- Product Info
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  category_id TEXT,
  brand TEXT,
  sku TEXT UNIQUE,
  
  -- Pricing
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  original_price DECIMAL(10,2) CHECK (original_price >= price),
  
  -- Inventory
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  low_stock_threshold INTEGER DEFAULT 10,
  
  -- Media
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  primary_image TEXT,
  
  -- Variants & Options
  sizes TEXT[] DEFAULT ARRAY[]::TEXT[],
  colors TEXT[] DEFAULT ARRAY[]::TEXT[],
  variants JSONB DEFAULT '[]',
  specifications JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'reclassified')),
  rejection_reason TEXT,
  vendor_submitted_category TEXT,
  admin_reclassified_category TEXT,
  
  -- Metrics
  rating DECIMAL(2,1) DEFAULT 0.0,
  review_count INTEGER DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  
  -- Shipping
  weight DECIMAL(10,2), -- in kg
  dimensions JSONB, -- {length, width, height}
  is_free_shipping BOOLEAN DEFAULT FALSE,
  
  -- Tags
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT fk_seller FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);

CREATE INDEX idx_products_seller ON public.products(seller_id);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_status ON public.products(approval_status);
CREATE INDEX idx_products_active ON public.products(is_active);
CREATE INDEX idx_products_created ON public.products(created_at DESC);

-- ============================================================================
-- 4. PRODUCT QA WORKFLOW TABLE
-- ============================================================================

CREATE TABLE public.product_qa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- Vendor Info
  vendor TEXT NOT NULL,
  
  -- QA Status
  status TEXT NOT NULL DEFAULT 'PENDING_DIGITAL_REVIEW' 
    CHECK (status IN (
      'PENDING_DIGITAL_REVIEW',
      'WAITING_FOR_SAMPLE',
      'IN_QUALITY_REVIEW',
      'ACTIVE_VERIFIED',
      'FOR_REVISION',
      'REJECTED'
    )),
  
  -- Logistics
  logistics TEXT,
  
  -- Rejection Details
  rejection_reason TEXT,
  rejection_stage TEXT CHECK (rejection_stage IN ('digital', 'physical')),
  
  -- Timestamps
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  revision_requested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qa_status ON public.product_qa(status);
CREATE INDEX idx_qa_product ON public.product_qa(product_id);

-- ============================================================================
-- 5. ADDRESSES TABLE
-- ============================================================================

CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  label TEXT NOT NULL, -- 'Home', 'Office', etc.
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  
  street TEXT NOT NULL,
  barangay TEXT,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  region TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  
  landmark TEXT,
  delivery_instructions TEXT,
  
  is_default BOOLEAN DEFAULT FALSE,
  address_type TEXT DEFAULT 'residential' CHECK (address_type IN ('residential', 'commercial')),
  
  coordinates JSONB, -- {lat, lng}
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_addresses_user ON public.addresses(user_id);
CREATE INDEX idx_addresses_default ON public.addresses(is_default);

-- ============================================================================
-- 6. ORDERS TABLE
-- ============================================================================

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL, -- BZR-2026-001234
  
  -- Parties
  buyer_id UUID REFERENCES public.buyers(id) NOT NULL,
  seller_id UUID REFERENCES public.sellers(id) NOT NULL,
  
  -- Buyer Info (denormalized for historical record)
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT,
  
  -- Order Type
  order_type TEXT DEFAULT 'ONLINE' CHECK (order_type IN ('ONLINE', 'OFFLINE')),
  pos_note TEXT, -- For POS Lite offline sales
  
  -- Pricing
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
  shipping_cost DECIMAL(10,2) DEFAULT 0 CHECK (shipping_cost >= 0),
  tax_amount DECIMAL(10,2) DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  currency TEXT DEFAULT 'PHP',
  
  -- Status
  status TEXT DEFAULT 'pending_payment' CHECK (status IN (
    'pending_payment', 'payment_failed', 'paid', 'processing',
    'ready_to_ship', 'shipped', 'out_for_delivery', 'delivered',
    'failed_delivery', 'cancelled', 'refunded', 'disputed', 'returned', 'completed'
  )),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  
  -- Shipping Address (JSONB for flexibility)
  shipping_address JSONB NOT NULL,
  
  -- Shipping Info
  shipping_method JSONB,
  tracking_number TEXT,
  estimated_delivery_date TIMESTAMPTZ,
  actual_delivery_date TIMESTAMPTZ,
  delivery_instructions TEXT,
  
  -- Payment Info
  payment_method JSONB NOT NULL,
  payment_reference TEXT,
  payment_date TIMESTAMPTZ,
  
  -- Discount/Promo
  promo_code TEXT,
  voucher_id UUID,
  
  -- Notes
  notes TEXT,
  special_instructions TEXT,
  
  -- Review
  is_reviewed BOOLEAN DEFAULT FALSE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_comment TEXT,
  review_images TEXT[] DEFAULT ARRAY[]::TEXT[],
  review_date TIMESTAMPTZ,
  
  -- Return/Refund
  is_returnable BOOLEAN DEFAULT TRUE,
  return_window INTEGER DEFAULT 7, -- days
  return_reason TEXT,
  return_status TEXT CHECK (return_status IN ('requested', 'approved', 'denied', 'completed')),
  refund_amount DECIMAL(10,2),
  refund_date TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX idx_orders_seller ON public.orders(seller_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX idx_orders_number ON public.orders(order_number);

-- ============================================================================
-- 7. ORDER ITEMS TABLE
-- ============================================================================

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id),
  
  -- Product Info (denormalized for historical record)
  product_name TEXT NOT NULL,
  product_images TEXT[] DEFAULT ARRAY[]::TEXT[],
  sku TEXT,
  
  -- Pricing
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal DECIMAL(10,2) NOT NULL,
  
  -- Variant Info
  selected_variant JSONB,
  personalized_options JSONB,
  
  -- Seller Info
  seller_id UUID REFERENCES public.sellers(id),
  seller_name TEXT,
  
  -- Item Status (for partial fulfillment)
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled', 'returned'
  )),
  tracking_number TEXT,
  
  -- Review
  is_reviewed BOOLEAN DEFAULT FALSE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_comment TEXT,
  review_date TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_product ON public.order_items(product_id);

-- ============================================================================
-- 8. ORDER STATUS HISTORY TABLE
-- ============================================================================

CREATE TABLE public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  
  status TEXT NOT NULL,
  note TEXT,
  changed_by UUID REFERENCES public.profiles(id),
  changed_by_role TEXT, -- 'buyer', 'seller', 'admin', 'system'
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_history_order ON public.order_status_history(order_id);
CREATE INDEX idx_order_history_created ON public.order_status_history(created_at DESC);

-- ============================================================================
-- 9. CARTS TABLE
-- ============================================================================

CREATE TABLE public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES public.buyers(id) ON DELETE CASCADE,
  
  -- Pricing
  subtotal DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Applied Discounts
  promo_code TEXT,
  voucher_id UUID,
  
  -- Shipping
  shipping_address_id UUID,
  shipping_method JSONB,
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- For guest carts
);

CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID REFERENCES public.carts(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  selected_variant JSONB,
  personalized_options JSONB,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(cart_id, product_id)
);

CREATE INDEX idx_cart_items_cart ON public.cart_items(cart_id);
CREATE INDEX idx_cart_items_product ON public.cart_items(product_id);

-- ============================================================================
-- 10. REVIEWS TABLE
-- ============================================================================

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES public.sellers(id) NOT NULL,
  buyer_id UUID REFERENCES public.buyers(id) NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  
  -- Review Content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Engagement
  helpful_count INTEGER DEFAULT 0,
  
  -- Seller Reply
  seller_reply JSONB, -- {comment, date}
  
  -- Status
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_product ON public.reviews(product_id);
CREATE INDEX idx_reviews_seller ON public.reviews(seller_id);
CREATE INDEX idx_reviews_buyer ON public.reviews(buyer_id);
CREATE INDEX idx_reviews_created ON public.reviews(created_at DESC);

-- ============================================================================
-- 11. VOUCHERS TABLE
-- ============================================================================

CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Voucher Info
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Type & Value
  voucher_type TEXT NOT NULL CHECK (voucher_type IN ('percentage', 'fixed', 'shipping')),
  value DECIMAL(10,2) NOT NULL CHECK (value > 0),
  
  -- Restrictions
  min_order_value DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2),
  seller_id UUID REFERENCES public.sellers(id), -- NULL for platform vouchers
  
  -- Validity
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ NOT NULL,
  
  -- Usage
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Applicability
  applicable_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
  applicable_products UUID[] DEFAULT ARRAY[]::UUID[],
  first_time_user_only BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.voucher_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID REFERENCES public.vouchers(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES public.buyers(id) NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  discount_amount DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(voucher_id, buyer_id, order_id)
);

CREATE INDEX idx_vouchers_code ON public.vouchers(code);
CREATE INDEX idx_vouchers_seller ON public.vouchers(seller_id);
CREATE INDEX idx_voucher_usage_buyer ON public.voucher_usage(buyer_id);

-- ============================================================================
-- 12. INVENTORY LEDGER TABLE
-- ============================================================================

CREATE TABLE public.inventory_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL, -- Denormalized
  
  -- Change Details
  change_type TEXT NOT NULL CHECK (change_type IN ('DEDUCTION', 'ADDITION', 'ADJUSTMENT', 'RESERVATION', 'RELEASE')),
  quantity_before INTEGER NOT NULL,
  quantity_change INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  
  -- Reason & Reference
  reason TEXT NOT NULL CHECK (reason IN (
    'ONLINE_SALE', 'OFFLINE_SALE', 'MANUAL_ADJUSTMENT',
    'STOCK_REPLENISHMENT', 'ORDER_CANCELLATION', 'RESERVATION'
  )),
  reference_id TEXT, -- Order ID, Adjustment ID, etc.
  
  -- User
  user_id UUID REFERENCES public.profiles(id),
  notes TEXT,
  
  -- Timestamp (immutable)
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_ledger_product ON public.inventory_ledger(product_id);
CREATE INDEX idx_ledger_timestamp ON public.inventory_ledger(timestamp DESC);
CREATE INDEX idx_ledger_reference ON public.inventory_ledger(reference_id);

-- ============================================================================
-- 13. LOW STOCK ALERTS TABLE
-- ============================================================================

CREATE TABLE public.low_stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  current_stock INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(product_id, acknowledged)
);

CREATE INDEX idx_low_stock_product ON public.low_stock_alerts(product_id);
CREATE INDEX idx_low_stock_acknowledged ON public.low_stock_alerts(acknowledged);

-- ============================================================================
-- 14. NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('buyer', 'seller', 'admin')),
  
  -- Notification Details
  type TEXT NOT NULL, -- 'order', 'product', 'review', 'system', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  icon TEXT,
  icon_bg TEXT,
  
  -- Action
  action_url TEXT,
  action_data JSONB,
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Priority
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- ============================================================================
-- Migration completed successfully
-- ============================================================================
