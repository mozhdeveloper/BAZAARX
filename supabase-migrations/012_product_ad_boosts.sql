-- Migration: Product Ad Boosts (Seller Advertisement System)
-- Sellers can boost products with paid placement (Shopee/Lazada style)
-- Currently free (simulated pricing in PHP)

-- =============================================
-- 1. Create product_ad_boosts table
-- =============================================
CREATE TABLE IF NOT EXISTS public.product_ad_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,

  -- Boost configuration
  boost_type TEXT NOT NULL DEFAULT 'featured' CHECK (boost_type IN ('featured', 'search_priority', 'homepage_banner', 'category_spotlight')),
  duration_days INTEGER NOT NULL DEFAULT 7 CHECK (duration_days > 0),
  daily_budget NUMERIC NOT NULL DEFAULT 0 CHECK (daily_budget >= 0),
  total_budget NUMERIC NOT NULL DEFAULT 0 CHECK (total_budget >= 0),

  -- Pricing (PHP, simulated — free for now)
  cost_per_day NUMERIC NOT NULL DEFAULT 0 CHECK (cost_per_day >= 0),
  total_cost NUMERIC NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  currency TEXT NOT NULL DEFAULT 'PHP',

  -- Status & lifecycle
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'ended', 'cancelled')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  paused_at TIMESTAMPTZ,

  -- Performance metrics
  impressions INTEGER NOT NULL DEFAULT 0 CHECK (impressions >= 0),
  clicks INTEGER NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  orders_generated INTEGER NOT NULL DEFAULT 0 CHECK (orders_generated >= 0),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ad_boosts_seller_id ON public.product_ad_boosts(seller_id);
CREATE INDEX IF NOT EXISTS idx_ad_boosts_product_id ON public.product_ad_boosts(product_id);
CREATE INDEX IF NOT EXISTS idx_ad_boosts_status ON public.product_ad_boosts(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_ad_boosts_ends_at ON public.product_ad_boosts(ends_at);
CREATE INDEX IF NOT EXISTS idx_ad_boosts_boost_type ON public.product_ad_boosts(boost_type);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_ad_boosts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ad_boosts_updated_at
  BEFORE UPDATE ON public.product_ad_boosts
  FOR EACH ROW
  EXECUTE FUNCTION update_ad_boosts_updated_at();

-- =============================================
-- 2. RLS Policies
-- =============================================
ALTER TABLE public.product_ad_boosts ENABLE ROW LEVEL SECURITY;

-- Buyers/public can see active boosts (for display purposes)
CREATE POLICY "Anyone can view active boosts"
  ON public.product_ad_boosts FOR SELECT
  USING (status = 'active');

-- Sellers can view ALL of their own boosts (any status)
CREATE POLICY "Sellers can view their own boosts"
  ON public.product_ad_boosts FOR SELECT
  USING (seller_id = auth.uid());

-- Sellers can manage their own boosts
CREATE POLICY "Sellers can insert their own boosts"
  ON public.product_ad_boosts FOR INSERT
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can update their own boosts"
  ON public.product_ad_boosts FOR UPDATE
  USING (seller_id = auth.uid());

CREATE POLICY "Sellers can delete their own boosts"
  ON public.product_ad_boosts FOR DELETE
  USING (seller_id = auth.uid());
