-- Migration: Fix column names (g.title -> g.name) and discount properties for global flash sales

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
      AND dc.status = 'active'
      AND NOW() BETWEEN dc.starts_at AND dc.ends_at
  ) sub
  ORDER BY sub.source_priority DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
