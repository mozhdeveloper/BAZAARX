-- =====================================================
-- Migration 009: Product Sold Counts View
-- =====================================================
-- Purpose: Create a view that accurately calculates sold counts
-- for products based on COMPLETED orders only (paid + delivered)
-- 
-- This fixes the issue where ALL order_items were being counted,
-- including pending and cancelled orders.
-- =====================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS public.product_sold_counts;

-- Create the view that calculates sold counts from completed orders
CREATE VIEW public.product_sold_counts AS
SELECT 
  p.id AS product_id,
  COALESCE(SUM(oi.quantity), 0)::INTEGER AS sold_count,
  COUNT(DISTINCT o.id)::INTEGER AS order_count,
  MAX(o.created_at) AS last_sold_at
FROM public.products p
LEFT JOIN public.order_items oi ON oi.product_id = p.id
LEFT JOIN public.orders o ON o.id = oi.order_id
  AND o.payment_status = 'paid'
  AND o.shipment_status IN ('delivered', 'received')
WHERE p.deleted_at IS NULL
GROUP BY p.id;

-- Grant permissions
GRANT SELECT ON public.product_sold_counts TO anon, authenticated, service_role;

-- Create index on orders for faster sold count queries
-- (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'orders' 
    AND indexname = 'idx_orders_payment_shipment_status'
  ) THEN
    CREATE INDEX idx_orders_payment_shipment_status 
    ON public.orders(payment_status, shipment_status);
  END IF;
END $$;

-- Create index on order_items for faster product lookups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'order_items' 
    AND indexname = 'idx_order_items_product_id'
  ) THEN
    CREATE INDEX idx_order_items_product_id 
    ON public.order_items(product_id);
  END IF;
END $$;

-- =====================================================
-- Alternative: Create a function to get sold count
-- This can be used if views are difficult with Supabase
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_product_sold_count(product_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  sold_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(oi.quantity), 0)::INTEGER
  INTO sold_total
  FROM public.order_items oi
  INNER JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.product_id = product_uuid
    AND o.payment_status = 'paid'
    AND o.shipment_status IN ('delivered', 'received');
  
  RETURN sold_total;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_product_sold_count(UUID) TO anon, authenticated, service_role;

-- =====================================================
-- Comment explaining usage
-- =====================================================
COMMENT ON VIEW public.product_sold_counts IS 
'View that calculates accurate sold counts from completed orders only.
Query: SELECT * FROM product_sold_counts WHERE product_id = ''uuid''';

COMMENT ON FUNCTION public.get_product_sold_count(UUID) IS 
'Function to get sold count for a single product.
Usage: SELECT get_product_sold_count(''product-uuid'')';
