-- Migration: Update Promotional System Logic for Global Flash Sales
-- 1. Create global flash sale tables & add campaign_scope
-- 2. get_active_product_discount priority rule: Global > Store
-- 3. atomic decrement_product_stock to handle submitted_stock for active global flash sales

-- ============================================================================
-- 1. Schema Updates
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='discount_campaigns' AND column_name='campaign_scope') THEN
    ALTER TABLE public.discount_campaigns ADD COLUMN campaign_scope TEXT DEFAULT 'store' CHECK (campaign_scope IN ('store', 'global'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.global_flash_sale_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  min_discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'ended', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.flash_sale_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID REFERENCES public.global_flash_sale_slots(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  submitted_price DECIMAL(10,2) NOT NULL,
  submitted_stock INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(slot_id, product_id)
);
-- ============================================================================
-- 1. get_active_product_discount (Global > Store)
-- ============================================================================
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
    sub.campaign_id,
    sub.campaign_name,
    sub.discount_type,
    sub.discount_value,
    sub.discounted_price,
    sub.original_price,
    sub.badge_text,
    sub.badge_color,
    sub.ends_at
  FROM (
    -- Priority 2: Global Flash Sales
    SELECT 
      g.id AS campaign_id,
      g.name AS campaign_name,
      'fixed_amount'::TEXT AS discount_type,
      (p.price - f.submitted_price)::DECIMAL AS discount_value,
      f.submitted_price::DECIMAL AS discounted_price,
      p.price AS original_price,
      'GLOBAL FLASH SALE'::TEXT AS badge_text,
      '#FF0000'::TEXT AS badge_color,
      g.end_time AS ends_at,
      2 AS source_priority
    FROM public.products p
    JOIN public.flash_sale_submissions f ON f.product_id = p.id
    JOIN public.global_flash_sale_slots g ON g.id = f.slot_id
    WHERE p.id = p_product_id
      AND f.status = 'approved'
      AND g.status = 'active'
      AND NOW() BETWEEN g.start_time AND g.end_time

    UNION ALL

    -- Priority 1: Store Campaigns
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
      dc.ends_at,
      1 AS source_priority
    FROM public.products p
    JOIN public.product_discounts pd ON pd.product_id = p.id
    JOIN public.discount_campaigns dc ON dc.id = pd.campaign_id
    WHERE p.id = p_product_id
      AND pd.is_active = TRUE
      AND dc.is_active = TRUE
      AND dc.status = 'active'
      AND NOW() BETWEEN dc.starts_at AND dc.ends_at
  ) sub
  ORDER BY sub.source_priority DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. decrement_product_stock logic
-- Decrements main stock (product_variants) AND promotional stock if active
-- ============================================================================
CREATE OR REPLACE FUNCTION decrement_product_stock(
    p_product_id UUID,
    p_quantity INT,
    p_variant_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_discount RECORD;
  v_variant_id UUID;
BEGIN
  IF p_quantity <= 0 THEN
    RETURN;
  END IF;

  -- 1. Deduct from promotional/flash sale stock if applicable
  
  -- Check Global Flash Sale first (highest priority)
  SELECT f.id INTO v_active_discount
  FROM public.flash_sale_submissions f
  JOIN public.global_flash_sale_slots g ON g.id = f.slot_id
  WHERE f.product_id = p_product_id
    AND f.status = 'approved'
    AND g.status = 'active'
    AND NOW() BETWEEN g.start_time AND g.end_time
    AND f.submitted_stock >= p_quantity
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.flash_sale_submissions
    SET submitted_stock = submitted_stock - p_quantity
    WHERE id = v_active_discount.id;
  ELSE
    -- Check Store Campaign
    SELECT pd.id INTO v_active_discount
    FROM public.product_discounts pd
    JOIN public.discount_campaigns dc ON dc.id = pd.campaign_id
    WHERE pd.product_id = p_product_id
      AND pd.is_active = TRUE
      AND dc.status = 'active'
      AND NOW() BETWEEN dc.starts_at AND dc.ends_at
      AND (pd.discounted_stock IS NULL OR pd.discounted_stock >= p_quantity + pd.sold_count)
    ORDER BY dc.priority DESC
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.product_discounts
      SET sold_count = sold_count + p_quantity
      WHERE id = v_active_discount.id;
    END IF;
  END IF;

  -- 2. Deduct from base product stock
  -- Identify variant to deduct from
  IF p_variant_id IS NOT NULL THEN
    v_variant_id := p_variant_id;
  ELSE
    -- Find the single/default variant if variant_id not provided
    SELECT id INTO v_variant_id
    FROM public.product_variants
    WHERE product_id = p_product_id
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_variant_id IS NOT NULL THEN
    UPDATE public.product_variants
    SET stock = stock - p_quantity
    WHERE id = v_variant_id AND stock >= p_quantity;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient stock for product_id %', p_product_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'No variants found for product_id %', p_product_id;
  END IF;
END;
$$;
