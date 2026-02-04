# 🗄️ Supabase Database Integration Plan - BazaarX

**Status**: Planning Phase  
**Date**: January 13, 2026  
**Platform**: Supabase (PostgreSQL + Real-time + Auth + Storage)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Row Level Security (RLS)](#row-level-security)
4. [Supabase Features to Use](#supabase-features)
5. [Migration Strategy](#migration-strategy)
6. [Environment Setup](#environment-setup)
7. [API Integration](#api-integration)
8. [Real-time Features](#real-time-features)
9. [Storage Strategy](#storage-strategy)
10. [Implementation Phases](#implementation-phases)

---

## 🎯 Overview

### Current State
- **Frontend**: React (Web) + React Native (Mobile)
- **State Management**: Zustand with localStorage persistence
- **Data**: Mock data in stores (buyerStore, sellerStore, productQAStore, etc.)

### Target State
- **Backend**: Supabase PostgreSQL database
- **Auth**: Supabase Authentication
- **Storage**: Supabase Storage for images
- **Real-time**: Supabase Realtime for live updates
- **State Management**: Zustand + Supabase client (hybrid approach)

---

## 🗃️ Database Schema

### 1. Users & Authentication

```sql
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
```

### 2. Products

```sql
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
```

### 3. Product QA Workflow

```sql
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
```

### 4. Orders

```sql
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
```

### 5. Order Items

```sql
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
```

### 6. Order Status History

```sql
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
```

### 7. Cart

```sql
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
```

### 8. Reviews

```sql
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
```

### 9. Vouchers

```sql
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
```

### 10. Inventory Ledger

```sql
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
```

### 11. Low Stock Alerts

```sql
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
```

### 12. Notifications

```sql
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
```

### 13. Categories

```sql
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
```

### 14. Addresses

```sql
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
```

---

## 🔒 Row Level Security (RLS)

Enable RLS on all tables and define policies:

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- ... and so on for all tables

-- Example: Profiles Policy
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Example: Products Policy
CREATE POLICY "Anyone can view approved products"
  ON public.products FOR SELECT
  USING (approval_status = 'approved' AND is_active = true);

CREATE POLICY "Sellers can view their own products"
  ON public.products FOR SELECT
  USING (seller_id IN (
    SELECT id FROM public.sellers WHERE id = auth.uid()
  ));

CREATE POLICY "Sellers can insert their own products"
  ON public.products FOR INSERT
  WITH CHECK (seller_id IN (
    SELECT id FROM public.sellers WHERE id = auth.uid()
  ));

CREATE POLICY "Sellers can update their own products"
  ON public.products FOR UPDATE
  USING (seller_id IN (
    SELECT id FROM public.sellers WHERE id = auth.uid()
  ));

-- Example: Orders Policy
CREATE POLICY "Buyers can view their own orders"
  ON public.orders FOR SELECT
  USING (buyer_id IN (
    SELECT id FROM public.buyers WHERE id = auth.uid()
  ));

CREATE POLICY "Sellers can view orders for their products"
  ON public.orders FOR SELECT
  USING (seller_id IN (
    SELECT id FROM public.sellers WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE id = auth.uid()
    )
  );

-- Example: Cart Policy
CREATE POLICY "Buyers can manage their own cart"
  ON public.carts FOR ALL
  USING (buyer_id IN (
    SELECT id FROM public.buyers WHERE id = auth.uid()
  ));
```

---

## ✨ Supabase Features to Use

### 1. Authentication
- **Email/Password**: Primary auth method
- **Social OAuth**: Google, Facebook for buyers
- **Magic Link**: Passwordless login option
- **Phone Auth**: SMS OTP for Philippines users

### 2. Storage
- **Buckets**:
  - `product-images`: Product photos
  - `profile-avatars`: User profile pictures
  - `review-images`: Review photos
  - `seller-documents`: Business registration documents
  - `voucher-images`: Voucher banners

```sql
-- Storage policies example
CREATE POLICY "Anyone can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Sellers can upload their product images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images' AND
    auth.uid() IN (SELECT id FROM public.sellers)
  );
```

### 3. Real-time Subscriptions
- **Order Status Updates**: Live tracking for buyers
- **New Orders**: Real-time notifications for sellers
- **Chat Messages**: Customer support
- **Inventory Alerts**: Low stock notifications
- **Admin Dashboard**: Live stats

```typescript
// Example: Subscribe to order status changes
supabase
  .channel('order-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
      filter: `buyer_id=eq.${userId}`
    },
    (payload) => {
      console.log('Order updated:', payload.new);
      // Update UI
    }
  )
  .subscribe();
```

### 4. Edge Functions
- **Order Processing**: Create order + send notifications
- **Payment Webhooks**: Handle GCash/PayMaya callbacks
- **Email Notifications**: Order confirmations
- **Inventory Sync**: Stock reservation logic
- **Analytics**: Daily sales reports

### 5. Database Functions

```sql
-- Function: Create order with items
CREATE OR REPLACE FUNCTION create_order_with_items(
  p_buyer_id UUID,
  p_seller_id UUID,
  p_order_data JSONB,
  p_items JSONB
) RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
BEGIN
  -- Insert order
  INSERT INTO public.orders (buyer_id, seller_id, ...)
  VALUES (p_buyer_id, p_seller_id, ...)
  RETURNING id INTO v_order_id;
  
  -- Insert order items
  INSERT INTO public.order_items (order_id, ...)
  SELECT v_order_id, ... FROM jsonb_to_recordset(p_items) ...;
  
  -- Deduct stock and create ledger entries
  -- ...
  
  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update product rating
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET 
    rating = (
      SELECT AVG(rating)::DECIMAL(2,1)
      FROM public.reviews
      WHERE product_id = NEW.product_id
    ),
    review_count = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE product_id = NEW.product_id
    )
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_product_rating
AFTER INSERT OR UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_rating();
```

---

## 🚀 Migration Strategy

### Phase 1: Setup (Week 1)
1. **Create Supabase Project**
   - Set up project on supabase.com
   - Configure database region (Singapore for Philippines)
   - Enable required extensions

2. **Install Dependencies**
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-react
```

3. **Environment Configuration**
```env
# .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Phase 2: Schema Creation (Week 1)
1. Run SQL migrations in Supabase Dashboard
2. Create all tables in order (respecting foreign keys)
3. Set up indexes
4. Enable RLS policies
5. Create database functions and triggers

### Phase 3: Storage Setup (Week 1)
1. Create storage buckets
2. Set up storage policies
3. Configure CDN settings
4. Test image uploads

### Phase 4: Authentication Migration (Week 2)
1. Set up Supabase Auth
2. Create auth helper utilities
3. Migrate existing user data (if any)
4. Update login/signup flows
5. Test authentication across web and mobile

### Phase 5: Data Migration (Week 2-3)
1. **Products First**
   - Migrate seller products
   - Upload product images to storage
   - Update image URLs

2. **Orders**
   - Migrate order history
   - Preserve order numbers
   - Link to products

3. **Users**
   - Create buyer/seller profiles
   - Migrate cart data
   - Transfer preferences

### Phase 6: API Integration (Week 3-4)
1. Create Supabase client utilities
2. Update Zustand stores to use Supabase
3. Implement optimistic updates
4. Add error handling
5. Set up retry logic

### Phase 7: Real-time Features (Week 4)
1. Order tracking subscriptions
2. Notification system
3. Live inventory updates
4. Admin dashboard real-time stats

### Phase 8: Testing & Optimization (Week 5)
1. Load testing
2. Query optimization
3. Index tuning
4. Cache strategy
5. Performance monitoring

---

## ⚙️ Environment Setup

### Development
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types'; // Generated types

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
```

### Type Generation
```bash
# Generate TypeScript types from database schema
npx supabase gen types typescript --project-id your-project-id > src/lib/database.types.ts
```

---

## 🔌 API Integration

### Example: Product Store with Supabase

```typescript
// src/stores/productStore.ts
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Product = Database['public']['Tables']['products']['Row'];

interface ProductStore {
  products: Product[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchProducts: (filters?: any) => Promise<void>;
  addProduct: (product: Partial<Product>) => Promise<Product | null>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  deductStock: (productId: string, quantity: number, reason: string, orderId: string) => Promise<void>;
}

export const useProductStore = create<ProductStore>((set, get) => ({
  products: [],
  loading: false,
  error: null,

  fetchProducts: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      let query = supabase
        .from('products')
        .select('*, seller:sellers(business_name)')
        .eq('is_active', true)
        .eq('approval_status', 'approved');

      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      
      if (filters.sellerId) {
        query = query.eq('seller_id', filters.sellerId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      set({ products: data || [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  addProduct: async (product) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();

      if (error) throw error;
      
      set((state) => ({
        products: [data, ...state.products]
      }));
      
      return data;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    }
  },

  updateProduct: async (id, updates) => {
    try {
      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      set((state) => ({
        products: state.products.map(p => 
          p.id === id ? { ...p, ...updates } : p
        )
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  deductStock: async (productId, quantity, reason, orderId) => {
    try {
      // Call database function to handle stock deduction atomically
      const { data, error } = await supabase.rpc('deduct_product_stock', {
        p_product_id: productId,
        p_quantity: quantity,
        p_reason: reason,
        p_reference_id: orderId
      });

      if (error) throw error;
      
      // Refresh product data
      await get().fetchProducts();
    } catch (error: any) {
      console.error('Stock deduction failed:', error);
      throw error;
    }
  }
}));
```

### Example: Order Creation

```typescript
// src/stores/orderStore.ts
export const createOrder = async (orderData: CreateOrderInput) => {
  try {
    // Call edge function or database function
    const { data, error } = await supabase.rpc('create_order_with_items', {
      p_buyer_id: orderData.buyerId,
      p_seller_id: orderData.sellerId,
      p_order_data: orderData.order,
      p_items: orderData.items
    });

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Order creation failed:', error);
    throw error;
  }
};
```

---

## 📡 Real-time Features

### 1. Order Status Tracking
```typescript
// Subscribe to order updates
useEffect(() => {
  const channel = supabase
    .channel('order-updates')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `buyer_id=eq.${userId}`
      },
      (payload) => {
        // Update local state
        updateOrderInStore(payload.new);
        
        // Show notification
        toast.success(`Order ${payload.new.order_number} status updated!`);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [userId]);
```

### 2. New Order Notifications (Seller)
```typescript
useEffect(() => {
  const channel = supabase
    .channel('new-orders')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `seller_id=eq.${sellerId}`
      },
      (payload) => {
        // Play notification sound
        playNotificationSound();
        
        // Show toast
        toast.info('New order received!');
        
        // Refresh orders
        fetchOrders();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [sellerId]);
```

### 3. Live Inventory Alerts
```typescript
useEffect(() => {
  const channel = supabase
    .channel('inventory-alerts')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'low_stock_alerts',
        filter: `product_id=in.(${productIds.join(',')})`
      },
      (payload) => {
        showLowStockAlert(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [productIds]);
```

---

## 📦 Storage Strategy

### Image Upload Utility

```typescript
// src/utils/storage.ts
export async function uploadProductImage(
  file: File,
  sellerId: string,
  productId: string
): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${sellerId}/${productId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Image upload failed:', error);
    return null;
  }
}

export async function deleteProductImage(url: string): Promise<boolean> {
  try {
    // Extract path from URL
    const path = url.split('/product-images/')[1];
    
    const { error } = await supabase.storage
      .from('product-images')
      .remove([path]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Image deletion failed:', error);
    return false;
  }
}
```

---

## 📊 Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create Supabase project
- [ ] Set up database schema
- [ ] Configure authentication
- [ ] Set up storage buckets
- [ ] Create RLS policies
- [ ] Generate TypeScript types

### Phase 2: Core Features (Week 2-3)
- [ ] Migrate products system
- [ ] Implement cart functionality
- [ ] Set up order processing
- [ ] Integrate payment webhooks
- [ ] Implement inventory ledger
- [ ] Add review system

### Phase 3: Advanced Features (Week 4)
- [ ] Real-time notifications
- [ ] Product QA workflow
- [ ] Voucher system
- [ ] Analytics dashboard
- [ ] Admin panel integration
- [ ] Seller dashboard

### Phase 4: Mobile App (Week 5)
- [ ] Integrate Supabase in React Native
- [ ] Sync authentication
- [ ] Implement offline support
- [ ] Add push notifications
- [ ] Test on iOS and Android

### Phase 5: Testing & Optimization (Week 6)
- [ ] Load testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] Database indexing
- [ ] Query optimization
- [ ] Documentation

---

## 🛡️ Security Checklist

- [ ] Enable RLS on all tables
- [ ] Validate user permissions in policies
- [ ] Sanitize user inputs
- [ ] Use prepared statements (Supabase does this)
- [ ] Implement rate limiting
- [ ] Set up database backups
- [ ] Monitor suspicious activity
- [ ] Encrypt sensitive data
- [ ] Use environment variables for keys
- [ ] Implement CORS policies
- [ ] Set up audit logging

---

## 📈 Monitoring & Analytics

### Database Metrics to Track
- Query performance
- Connection pool usage
- Storage usage
- API request count
- Error rates
- Real-time connection count

### Business Metrics
- Daily active users
- Orders per day
- Revenue tracking
- Product views
- Cart abandonment rate
- Conversion rate

---

## 🎯 Next Steps

1. **Review this plan** with your team
2. **Create Supabase project** and note credentials
3. **Run initial migrations** to create schema
4. **Set up development environment** with Supabase CLI
5. **Start with Phase 1**: Authentication & Product migration
6. **Test thoroughly** at each phase
7. **Deploy incrementally** to production

---

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase TypeScript Guide](https://supabase.com/docs/guides/api/typescript-support)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase Storage](https://supabase.com/docs/guides/storage)

---

**Ready to migrate to Supabase! 🚀**
