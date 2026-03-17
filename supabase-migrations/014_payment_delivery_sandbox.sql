-- ============================================================================
-- 014: Payment Gateway & Delivery Sandbox Tables
-- PayMongo integration + PH courier delivery system
-- ============================================================================

-- ─── Payment Transactions ───────────────────────────────────────────────────
-- Tracks every payment attempt through PayMongo
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id),
  seller_id UUID NOT NULL REFERENCES profiles(id),

  -- PayMongo fields
  gateway VARCHAR(20) NOT NULL DEFAULT 'paymongo',
  gateway_payment_intent_id VARCHAR(255),      -- PayMongo pi_xxx
  gateway_payment_method_id VARCHAR(255),      -- PayMongo pm_xxx
  gateway_source_id VARCHAR(255),              -- PayMongo src_xxx (for GCash/Maya)
  gateway_checkout_url TEXT,                   -- Redirect URL for e-wallet payments

  -- Payment details
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'PHP',
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('card', 'gcash', 'maya', 'grab_pay', 'bank_transfer', 'cod')),
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'awaiting_payment', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded'
  )),

  -- Metadata
  description TEXT,
  statement_descriptor VARCHAR(22),
  metadata JSONB DEFAULT '{}',
  failure_reason TEXT,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Seller Payouts ─────────────────────────────────────────────────────────
-- Tracks money flowing from PayMongo to sellers
CREATE TABLE IF NOT EXISTS seller_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id),
  order_id UUID REFERENCES orders(id),
  payment_transaction_id UUID REFERENCES payment_transactions(id),

  -- Payout details
  gross_amount NUMERIC(12,2) NOT NULL,
  platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'PHP',

  -- Payout method
  payout_method VARCHAR(20) NOT NULL CHECK (payout_method IN ('bank_transfer', 'gcash', 'maya')),
  payout_account_details JSONB NOT NULL DEFAULT '{}',

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'on_hold'
  )),
  processed_at TIMESTAMPTZ,
  failure_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Seller Payout Settings ────────────────────────────────────────────────
-- Where sellers want to receive their money
CREATE TABLE IF NOT EXISTS seller_payout_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,

  -- Default payout method
  payout_method VARCHAR(20) NOT NULL DEFAULT 'bank_transfer' CHECK (payout_method IN ('bank_transfer', 'gcash', 'maya')),

  -- Bank details (encrypted in production)
  bank_name VARCHAR(100),
  bank_account_name VARCHAR(200),
  bank_account_number VARCHAR(50),

  -- E-wallet details
  ewallet_provider VARCHAR(20) CHECK (ewallet_provider IN ('gcash', 'maya')),
  ewallet_number VARCHAR(20),

  -- Settings
  auto_payout BOOLEAN DEFAULT true,
  min_payout_amount NUMERIC(12,2) DEFAULT 100.00,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Delivery Bookings ─────────────────────────────────────────────────────
-- Tracks courier bookings for order delivery
CREATE TABLE IF NOT EXISTS delivery_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id),
  buyer_id UUID NOT NULL REFERENCES profiles(id),

  -- Courier info
  courier_code VARCHAR(20) NOT NULL CHECK (courier_code IN ('jnt', 'lbc', 'flash', 'ninjavan', 'grabexpress', 'lalamove')),
  courier_name VARCHAR(50) NOT NULL,
  service_type VARCHAR(30) NOT NULL DEFAULT 'standard',

  -- Booking reference
  booking_reference VARCHAR(100),
  tracking_number VARCHAR(100),
  waybill_url TEXT,

  -- Addresses
  pickup_address JSONB NOT NULL,
  delivery_address JSONB NOT NULL,

  -- Package details
  package_weight NUMERIC(8,2),
  package_dimensions JSONB,
  package_description TEXT,
  declared_value NUMERIC(12,2),

  -- Pricing
  shipping_fee NUMERIC(12,2) NOT NULL,
  insurance_fee NUMERIC(12,2) DEFAULT 0,
  cod_amount NUMERIC(12,2) DEFAULT 0,
  is_cod BOOLEAN DEFAULT false,

  -- Status tracking
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'booked', 'pickup_scheduled', 'picked_up', 'in_transit',
    'out_for_delivery', 'delivered', 'failed', 'returned_to_sender', 'cancelled'
  )),

  -- Timestamps
  booked_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  estimated_delivery TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Delivery Tracking Events ──────────────────────────────────────────────
-- History of delivery status changes (from courier webhooks/polling)
CREATE TABLE IF NOT EXISTS delivery_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_booking_id UUID NOT NULL REFERENCES delivery_bookings(id) ON DELETE CASCADE,
  
  status VARCHAR(30) NOT NULL,
  description TEXT,
  location VARCHAR(200),
  courier_status_code VARCHAR(50),
  
  event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Courier Rate Cache ────────────────────────────────────────────────────
-- Cache shipping rates to avoid repeated API calls
CREATE TABLE IF NOT EXISTS courier_rate_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_code VARCHAR(20) NOT NULL,
  origin_city VARCHAR(100) NOT NULL,
  destination_city VARCHAR(100) NOT NULL,
  weight_kg NUMERIC(8,2) NOT NULL,
  service_type VARCHAR(30) NOT NULL DEFAULT 'standard',
  rate NUMERIC(12,2) NOT NULL,
  estimated_days INT,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_buyer ON payment_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_seller ON payment_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_intent ON payment_transactions(gateway_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_seller_payouts_seller ON seller_payouts(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_status ON seller_payouts(status);

CREATE INDEX IF NOT EXISTS idx_delivery_bookings_order ON delivery_bookings(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_bookings_seller ON delivery_bookings(seller_id);
CREATE INDEX IF NOT EXISTS idx_delivery_bookings_tracking ON delivery_bookings(tracking_number);
CREATE INDEX IF NOT EXISTS idx_delivery_bookings_status ON delivery_bookings(status);

CREATE INDEX IF NOT EXISTS idx_delivery_tracking_booking ON delivery_tracking_events(delivery_booking_id);

CREATE INDEX IF NOT EXISTS idx_courier_rate_cache_lookup ON courier_rate_cache(courier_code, origin_city, destination_city, weight_kg);
