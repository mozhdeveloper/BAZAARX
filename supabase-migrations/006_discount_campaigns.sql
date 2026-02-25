-- ============================================================================
-- DISCOUNT CAMPAIGNS SYSTEM
-- Shopify-inspired discount management for sellers
-- ============================================================================

-- ============================================================================
-- 1. DISCOUNT CAMPAIGNS TABLE
-- Main table for campaign management (Flash Sales, Seasonal Sales, etc.)
-- ============================================================================

CREATE TABLE public.discount_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Campaign Ownership
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE NOT NULL,
  
  -- Campaign Info
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN (
    'flash_sale',
    'seasonal_sale',
    'clearance',
    'buy_more_save_more',
    'limited_time_offer',
    'new_arrival_promo',
    'bundle_deal'
  )),
  
  -- Discount Configuration
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  
  -- Additional discount rules
  max_discount_amount DECIMAL(10,2), -- For percentage discounts
  min_purchase_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Validity Period
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'paused', 'ended', 'cancelled')),
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Display Settings
  badge_text TEXT, -- e.g., "FLASH SALE", "50% OFF"
  badge_color TEXT DEFAULT '#FF6A00',
  priority INTEGER DEFAULT 0, -- Higher priority campaigns shown first
  
  -- Usage Limits
  total_usage_limit INTEGER, -- Max number of times this campaign can be used across all products
  per_customer_limit INTEGER DEFAULT 1,
  usage_count INTEGER DEFAULT 0,
  
  -- Applicability
  applies_to TEXT DEFAULT 'specific_products' CHECK (applies_to IN ('all_products', 'specific_products', 'specific_categories')),
  applicable_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_date_range CHECK (ends_at > starts_at)
);

-- ============================================================================
-- 2. PRODUCT DISCOUNTS TABLE
-- Links products to campaigns with product-specific discount overrides
-- ============================================================================

CREATE TABLE public.product_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  campaign_id UUID REFERENCES public.discount_campaigns(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE NOT NULL,
  
  -- Product-Specific Override (optional)
  -- If set, overrides campaign discount for this specific product
  override_discount_type TEXT CHECK (override_discount_type IN ('percentage', 'fixed_amount')),
  override_discount_value DECIMAL(10,2) CHECK (override_discount_value > 0),
  
  -- Inventory Management
  discounted_stock INTEGER, -- How many units are available at this discount
  sold_count INTEGER DEFAULT 0,
  
  -- Priority (if product is in multiple campaigns)
  priority INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate product in same campaign
  UNIQUE(campaign_id, product_id)
);

-- ============================================================================
-- 3. DISCOUNT USAGE TRACKING
-- Track which customers used which discounts
-- ============================================================================

CREATE TABLE public.discount_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  campaign_id UUID REFERENCES public.discount_campaigns(id) ON DELETE CASCADE NOT NULL,
  product_discount_id UUID REFERENCES public.product_discounts(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES public.buyers(id) NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  product_id UUID REFERENCES public.products(id) NOT NULL,
  
  -- Discount Applied
  discount_amount DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2) NOT NULL,
  discounted_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  
  -- Metadata
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Discount Campaigns Indexes
CREATE INDEX idx_campaigns_seller ON public.discount_campaigns(seller_id);
CREATE INDEX idx_campaigns_status ON public.discount_campaigns(status);
CREATE INDEX idx_campaigns_dates ON public.discount_campaigns(starts_at, ends_at);
CREATE INDEX idx_campaigns_type ON public.discount_campaigns(campaign_type);
CREATE INDEX idx_campaigns_active ON public.discount_campaigns(is_active) WHERE is_active = TRUE;

-- Product Discounts Indexes
CREATE INDEX idx_product_discounts_campaign ON public.product_discounts(campaign_id);
CREATE INDEX idx_product_discounts_product ON public.product_discounts(product_id);
CREATE INDEX idx_product_discounts_seller ON public.product_discounts(seller_id);
CREATE INDEX idx_product_discounts_active ON public.product_discounts(is_active) WHERE is_active = TRUE;

-- Discount Usage Indexes
CREATE INDEX idx_discount_usage_campaign ON public.discount_usage(campaign_id);
CREATE INDEX idx_discount_usage_buyer ON public.discount_usage(buyer_id);
CREATE INDEX idx_discount_usage_product ON public.discount_usage(product_id);
CREATE INDEX idx_discount_usage_order ON public.discount_usage(order_id);
CREATE INDEX idx_discount_usage_date ON public.discount_usage(used_at DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update campaign status based on time
CREATE OR REPLACE FUNCTION update_campaign_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status based on current time
  IF NOW() < NEW.starts_at THEN
    NEW.status := 'scheduled';
  ELSIF NOW() BETWEEN NEW.starts_at AND NEW.ends_at AND NEW.is_active = TRUE THEN
    NEW.status := 'active';
  ELSIF NOW() > NEW.ends_at THEN
    NEW.status := 'ended';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get active discount for a product
CREATE OR REPLACE FUNCTION get_active_product_discount(p_product_id UUID)
RETURNS TABLE (
  campaign_id UUID,
  campaign_name TEXT,
  discount_type TEXT,
  discount_value DECIMAL,
  discounted_price DECIMAL,
  original_price DECIMAL,
  badge_text TEXT,
  badge_color TEXT,
  ends_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id AS campaign_id,
    dc.name AS campaign_name,
    COALESCE(pd.override_discount_type, dc.discount_type) AS discount_type,
    COALESCE(pd.override_discount_value, dc.discount_value) AS discount_value,
    CASE 
      WHEN COALESCE(pd.override_discount_type, dc.discount_type) = 'percentage' THEN
        p.price - (p.price * COALESCE(pd.override_discount_value, dc.discount_value) / 100)
      ELSE
        p.price - COALESCE(pd.override_discount_value, dc.discount_value)
    END AS discounted_price,
    p.price AS original_price,
    dc.badge_text,
    dc.badge_color,
    dc.ends_at
  FROM public.products p
  JOIN public.product_discounts pd ON pd.product_id = p.id
  JOIN public.discount_campaigns dc ON dc.id = pd.campaign_id
  WHERE p.id = p_product_id
    AND pd.is_active = TRUE
    AND dc.is_active = TRUE
    AND dc.status = 'active'
    AND NOW() BETWEEN dc.starts_at AND dc.ends_at
    AND (pd.discounted_stock IS NULL OR pd.discounted_stock > pd.sold_count)
  ORDER BY pd.priority DESC, dc.priority DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update campaign status on insert/update
CREATE TRIGGER trg_update_campaign_status
  BEFORE INSERT OR UPDATE ON public.discount_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_status();

-- Update timestamps
CREATE TRIGGER trg_discount_campaigns_updated_at
  BEFORE UPDATE ON public.discount_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_product_discounts_updated_at
  BEFORE UPDATE ON public.product_discounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.discount_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_usage ENABLE ROW LEVEL SECURITY;

-- Discount Campaigns Policies
CREATE POLICY "Sellers can manage their own campaigns"
  ON public.discount_campaigns
  FOR ALL
  USING (seller_id = auth.uid());

CREATE POLICY "Anyone can view active campaigns"
  ON public.discount_campaigns
  FOR SELECT
  USING (is_active = TRUE AND status = 'active');

-- Product Discounts Policies
CREATE POLICY "Sellers can manage their product discounts"
  ON public.product_discounts
  FOR ALL
  USING (seller_id = auth.uid());

CREATE POLICY "Anyone can view active product discounts"
  ON public.product_discounts
  FOR SELECT
  USING (is_active = TRUE);

-- Discount Usage Policies
CREATE POLICY "Buyers can view their own discount usage"
  ON public.discount_usage
  FOR SELECT
  USING (buyer_id = auth.uid());

CREATE POLICY "System can insert discount usage"
  ON public.discount_usage
  FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert a sample flash sale campaign
-- UNCOMMENT TO USE:
-- INSERT INTO public.discount_campaigns (
--   seller_id,
--   name,
--   description,
--   campaign_type,
--   discount_type,
--   discount_value,
--   starts_at,
--   ends_at,
--   badge_text,
--   status
-- ) VALUES (
--   (SELECT id FROM public.sellers LIMIT 1),
--   'Weekend Flash Sale',
--   'Get 30% off on selected products this weekend!',
--   'flash_sale',
--   'percentage',
--   30.00,
--   NOW(),
--   NOW() + INTERVAL '3 days',
--   'FLASH 30% OFF',
--   'active'
-- );
