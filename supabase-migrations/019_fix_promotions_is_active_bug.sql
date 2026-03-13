-- Migration: Remove is_active from get_active_product_discount and decrement_product_stock

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
  ends_at TIMESTAMPTZ,
  source_priority INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    -- Priority 2: Global Flash Sales
    SELECT 
      g.id AS campaign_id,
      g.title AS campaign_name,
      'percentage'::TEXT AS discount_type,
      g.discount_percentage AS discount_value,
      p.price - (p.price * g.discount_percentage / 100) AS discounted_price,
      p.price AS original_price,
      'Flash Sale'::TEXT AS badge_text,
      NULL::TEXT AS badge_color,
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
