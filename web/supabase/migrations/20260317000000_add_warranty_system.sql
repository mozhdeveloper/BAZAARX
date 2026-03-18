-- Migration: Add warranty system for products and orders
-- Created: 2026-03-17
-- Description: Implements dynamic warranty tracking for products and order items

-- ============================================================================
-- STEP 1: Create warranty-related enums
-- ============================================================================

-- Warranty type enum for different warranty categories
DO $$ BEGIN
  CREATE TYPE warranty_type_enum AS ENUM (
    'local_manufacturer',
    'international_manufacturer',
    'shop_warranty',
    'no_warranty'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 2: Add warranty columns to products table
-- ============================================================================

-- Add warranty fields to products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS has_warranty BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS warranty_type warranty_type_enum DEFAULT 'no_warranty',
ADD COLUMN IF NOT EXISTS warranty_duration_months INTEGER DEFAULT 0 CHECK (warranty_duration_months >= 0),
ADD COLUMN IF NOT EXISTS warranty_policy TEXT,
ADD COLUMN IF NOT EXISTS warranty_provider_name TEXT,
ADD COLUMN IF NOT EXISTS warranty_provider_contact TEXT,
ADD COLUMN IF NOT EXISTS warranty_provider_email TEXT,
ADD COLUMN IF NOT EXISTS warranty_terms_url TEXT;

-- Create index for warranty-enabled products
CREATE INDEX IF NOT EXISTS idx_products_has_warranty ON public.products(has_warranty) WHERE has_warranty = true;
CREATE INDEX IF NOT EXISTS idx_products_warranty_type ON public.products(warranty_type);

-- ============================================================================
-- STEP 3: Add warranty columns to order_items table
-- ============================================================================

-- Add warranty tracking to order items
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS warranty_expiration_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS warranty_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS warranty_type warranty_type_enum,
ADD COLUMN IF NOT EXISTS warranty_duration_months INTEGER,
ADD COLUMN IF NOT EXISTS warranty_provider_name TEXT,
ADD COLUMN IF NOT EXISTS warranty_provider_contact TEXT,
ADD COLUMN IF NOT EXISTS warranty_provider_email TEXT,
ADD COLUMN IF NOT EXISTS warranty_terms_url TEXT,
ADD COLUMN IF NOT EXISTS warranty_claimed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS warranty_claimed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS warranty_claim_reason TEXT,
ADD COLUMN IF NOT EXISTS warranty_claim_status TEXT CHECK (warranty_claim_status IN ('pending', 'approved', 'rejected', 'resolved', 'cancelled') OR warranty_claim_status IS NULL),
ADD COLUMN IF NOT EXISTS warranty_claim_notes TEXT;

-- Create indexes for warranty queries
CREATE INDEX IF NOT EXISTS idx_order_items_warranty_expiration ON public.order_items(warranty_expiration_date) WHERE warranty_expiration_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_warranty_claimed ON public.order_items(warranty_claimed) WHERE warranty_claimed = true;
CREATE INDEX IF NOT EXISTS idx_order_items_warranty_claim_status ON public.order_items(warranty_claim_status) WHERE warranty_claim_status IS NOT NULL;

-- ============================================================================
-- STEP 4: Create warranty_claims table for detailed claim tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.warranty_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  
  -- Claim details
  claim_number TEXT UNIQUE NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('repair', 'replacement', 'refund', 'technical_support')),
  
  -- Evidence
  evidence_urls TEXT[],
  diagnostic_report_url TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'repair_in_progress', 'replacement_sent', 'refund_processed', 'resolved', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Resolution
  resolution_type TEXT CHECK (resolution_type IN ('repair', 'replacement', 'refund', 'technical_support', 'rejected')),
  resolution_description TEXT,
  resolution_amount NUMERIC(12, 2),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.admins(id),
  
  -- Seller response
  seller_response TEXT,
  seller_response_at TIMESTAMPTZ,
  
  -- Admin notes
  admin_notes TEXT,
  
  -- Shipping for returns
  return_tracking_number TEXT,
  return_shipping_carrier TEXT,
  replacement_tracking_number TEXT,
  replacement_shipping_carrier TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_claim_dates CHECK (
    (resolved_at IS NULL) OR (resolved_at >= created_at)
  )
);

-- Create indexes for warranty claims
CREATE INDEX IF NOT EXISTS idx_warranty_claims_order_item_id ON public.warranty_claims(order_item_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_buyer_id ON public.warranty_claims(buyer_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_seller_id ON public.warranty_claims(seller_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_status ON public.warranty_claims(status);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_claim_number ON public.warranty_claims(claim_number);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_created_at ON public.warranty_claims(created_at DESC);

-- ============================================================================
-- STEP 5: Create warranty_actions_log for audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.warranty_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_claim_id UUID REFERENCES public.warranty_claims(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
  
  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN (
    'claim_created',
    'claim_submitted',
    'claim_reviewed',
    'claim_approved',
    'claim_rejected',
    'repair_started',
    'repair_completed',
    'replacement_shipped',
    'refund_initiated',
    'refund_completed',
    'claim_resolved',
    'claim_cancelled',
    'evidence_added',
    'seller_responded',
    'admin_note_added'
  )),
  
  -- Actor
  actor_id UUID,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('buyer', 'seller', 'admin', 'system')),
  
  -- Details
  description TEXT,
  metadata JSONB,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for warranty actions log
CREATE INDEX IF NOT EXISTS idx_warranty_actions_claim_id ON public.warranty_actions_log(warranty_claim_id);
CREATE INDEX IF NOT EXISTS idx_warranty_actions_order_item_id ON public.warranty_actions_log(order_item_id);
CREATE INDEX IF NOT EXISTS idx_warranty_actions_actor_id ON public.warranty_actions_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_warranty_actions_created_at ON public.warranty_actions_log(created_at DESC);

-- ============================================================================
-- STEP 6: Create trigger function to auto-generate claim numbers
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_warranty_claim_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Format: WRN-YYYYMMDD-XXXXX (Warranty Claim Number)
  NEW.claim_number := 'WRN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger for claim number generation
DROP TRIGGER IF EXISTS trg_generate_warranty_claim_number ON public.warranty_claims;
CREATE TRIGGER trg_generate_warranty_claim_number
  BEFORE INSERT ON public.warranty_claims
  FOR EACH ROW
  WHEN (NEW.claim_number IS NULL)
  EXECUTE FUNCTION generate_warranty_claim_number();

-- ============================================================================
-- STEP 7: Create trigger function for updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_warranty_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers for updated_at
DROP TRIGGER IF EXISTS trg_warranty_claims_updated_at ON public.warranty_claims;
CREATE TRIGGER trg_warranty_claims_updated_at
  BEFORE UPDATE ON public.warranty_claims
  FOR EACH ROW
  EXECUTE FUNCTION update_warranty_updated_at_column();

-- ============================================================================
-- STEP 8: Create function to calculate warranty expiration from order delivery
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_warranty_expiration(
  p_order_item_id UUID,
  p_warranty_duration_months INTEGER
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_delivered_at TIMESTAMPTZ;
BEGIN
  -- Get the delivered_at timestamp from the order
  SELECT o.completed_at INTO v_delivered_at
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  WHERE oi.id = p_order_item_id;
  
  -- If order is not delivered yet, return NULL
  IF v_delivered_at IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Calculate expiration date
  RETURN v_delivered_at + (p_warranty_duration_months || ' months')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 9: Create function to activate warranty when order is delivered
-- ============================================================================

CREATE OR REPLACE FUNCTION activate_order_item_warranty(
  p_order_item_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_warranty_duration INTEGER;
  v_warranty_type warranty_type_enum;
  v_expiration_date TIMESTAMPTZ;
BEGIN
  -- Get warranty details from the order item
  SELECT warranty_duration_months, warranty_type
  INTO v_warranty_duration, v_warranty_type
  FROM public.order_items
  WHERE id = p_order_item_id;
  
  -- If no warranty, exit
  IF v_warranty_duration IS NULL OR v_warranty_duration <= 0 THEN
    RETURN;
  END IF;
  
  -- Calculate expiration date
  SELECT calculate_warranty_expiration(p_order_item_id, v_warranty_duration)
  INTO v_expiration_date;
  
  -- Update the order item with warranty dates
  UPDATE public.order_items
  SET 
    warranty_start_date = (SELECT completed_at FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE oi.id = p_order_item_id),
    warranty_expiration_date = v_expiration_date
  WHERE id = p_order_item_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 10: Create trigger to auto-activate warranty when order status changes to delivered
-- ============================================================================

CREATE OR REPLACE FUNCTION check_and_activate_warranties()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to 'delivered' or 'received'
  IF (NEW.shipment_status = 'delivered' OR NEW.shipment_status = 'received') 
     AND (OLD.shipment_status IS DISTINCT FROM NEW.shipment_status) THEN
    
    -- Activate warranties for all items in this order
    PERFORM activate_order_item_warranty(oi.id)
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to orders table
DROP TRIGGER IF EXISTS trg_activate_warranty_on_delivery ON public.orders;
CREATE TRIGGER trg_activate_warranty_on_delivery
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION check_and_activate_warranties();

-- ============================================================================
-- STEP 11: Enable Row Level Security (RLS) for warranty_claims
-- ============================================================================

ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_actions_log ENABLE ROW LEVEL SECURITY;

-- Policy: Buyers can view their own warranty claims
CREATE POLICY "buyers_view_own_warranty_claims" ON public.warranty_claims
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.buyers b
      WHERE b.id = auth.uid() AND b.id = warranty_claims.buyer_id
    )
  );

-- Policy: Buyers can create warranty claims for their order items
CREATE POLICY "buyers_create_warranty_claims" ON public.warranty_claims
  FOR INSERT
  TO authenticated
  WITH CHECK (
    buyer_id = auth.uid()
  );

-- Policy: Buyers can update their own claims (add evidence, update description)
CREATE POLICY "buyers_update_own_warranty_claims" ON public.warranty_claims
  FOR UPDATE
  TO authenticated
  USING (buyer_id = auth.uid())
  WITH CHECK (
    buyer_id = auth.uid()
  );

-- Policy: Sellers can view claims for their products
CREATE POLICY "sellers_view_related_warranty_claims" ON public.warranty_claims
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = auth.uid() AND s.id = warranty_claims.seller_id
    )
  );

-- Policy: Sellers can respond to warranty claims
CREATE POLICY "sellers_respond_warranty_claims" ON public.warranty_claims
  FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (
    seller_id = auth.uid()
    AND seller_response IS NOT NULL
  );

-- Policy: Admins can manage all warranty claims
CREATE POLICY "admins_manage_all_warranty_claims" ON public.warranty_claims
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Users can view warranty actions for their claims
CREATE POLICY "users_view_own_warranty_actions" ON public.warranty_actions_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.warranty_claims wc
      WHERE wc.id = warranty_actions_log.warranty_claim_id
      AND (wc.buyer_id = auth.uid() OR wc.seller_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: System and admins can create warranty action logs
CREATE POLICY "system_admin_create_warranty_actions" ON public.warranty_actions_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR actor_role = 'system'
  );

-- ============================================================================
-- STEP 12: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE public.warranty_claims IS 'Tracks warranty claims for order items including status, resolution, and communication';
COMMENT ON TABLE public.warranty_actions_log IS 'Audit trail for all warranty-related actions';

COMMENT ON COLUMN public.products.has_warranty IS 'Indicates if the product has any warranty coverage';
COMMENT ON COLUMN public.products.warranty_type IS 'Type of warranty: local_manufacturer, international_manufacturer, shop_warranty, or no_warranty';
COMMENT ON COLUMN public.products.warranty_duration_months IS 'Duration of warranty coverage in months';
COMMENT ON COLUMN public.products.warranty_policy IS 'Detailed warranty terms and conditions';
COMMENT ON COLUMN public.products.warranty_provider_name IS 'Name of the warranty provider (manufacturer or shop)';
COMMENT ON COLUMN public.products.warranty_provider_contact IS 'Contact number for warranty claims';
COMMENT ON COLUMN public.products.warranty_provider_email IS 'Email address for warranty claims';
COMMENT ON COLUMN public.products.warranty_terms_url IS 'URL to detailed warranty terms document';

COMMENT ON COLUMN public.order_items.warranty_start_date IS 'Date when warranty coverage begins (typically order delivery date)';
COMMENT ON COLUMN public.order_items.warranty_expiration_date IS 'Date when warranty coverage expires';
COMMENT ON COLUMN public.order_items.warranty_claimed IS 'Indicates if a warranty claim has been filed for this item';
COMMENT ON COLUMN public.order_items.warranty_claim_status IS 'Current status of the warranty claim';

-- ============================================================================
-- Migration complete
-- ============================================================================
