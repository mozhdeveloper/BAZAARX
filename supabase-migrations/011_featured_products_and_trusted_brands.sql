-- Migration: Featured Products table + Trusted Brand tier
-- Adds featured_products table for seller product advertising
-- Extends seller_tiers to support trusted_brand tier level

-- =============================================
-- 1. Create featured_products table
-- =============================================
CREATE TABLE IF NOT EXISTS public.featured_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  featured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT featured_products_product_id_unique UNIQUE (product_id)
);

CREATE INDEX IF NOT EXISTS idx_featured_products_seller_id ON public.featured_products(seller_id);
CREATE INDEX IF NOT EXISTS idx_featured_products_is_active ON public.featured_products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_featured_products_priority ON public.featured_products(priority DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_featured_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_featured_products_updated_at
  BEFORE UPDATE ON public.featured_products
  FOR EACH ROW
  EXECUTE FUNCTION update_featured_products_updated_at();

-- =============================================
-- 2. Extend seller_tiers to include trusted_brand
-- =============================================
ALTER TABLE public.seller_tiers 
  DROP CONSTRAINT IF EXISTS seller_tiers_tier_level_check;

ALTER TABLE public.seller_tiers 
  ADD CONSTRAINT seller_tiers_tier_level_check 
  CHECK (tier_level IN ('standard', 'premium_outlet', 'trusted_brand'));

-- =============================================
-- 3. RLS Policies for featured_products
-- =============================================
ALTER TABLE public.featured_products ENABLE ROW LEVEL SECURITY;

-- Anyone can read active featured products (public storefront)
CREATE POLICY "Anyone can view active featured products"
  ON public.featured_products FOR SELECT
  USING (is_active = true);

-- Sellers can manage their own featured products
CREATE POLICY "Sellers can insert their own featured products"
  ON public.featured_products FOR INSERT
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can update their own featured products"
  ON public.featured_products FOR UPDATE
  USING (seller_id = auth.uid());

CREATE POLICY "Sellers can delete their own featured products"
  ON public.featured_products FOR DELETE
  USING (seller_id = auth.uid());
