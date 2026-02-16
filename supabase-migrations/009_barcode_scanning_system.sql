-- ============================================================================
-- BAZAAR POS BARCODE SCANNING SYSTEM
-- Migration: 009_barcode_scanning_system.sql
-- Date: 2026-02-16
-- Description: Enhances existing barcode_scans table and adds barcode functions
-- Note: This database uses vendor_id (not seller_id)
-- ============================================================================

-- ============================================================================
-- 1. ADD BARCODE COLUMN TO PRODUCT_VARIANTS (if not exists)
-- ============================================================================

ALTER TABLE public.product_variants 
ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;

-- Index for fast barcode lookups
CREATE INDEX IF NOT EXISTS idx_product_variants_barcode 
  ON public.product_variants(barcode) 
  WHERE barcode IS NOT NULL;

-- ============================================================================
-- 2. ADD VARIANT_ID TO BARCODE_SCANS (if not exists)
-- ============================================================================
-- Note: barcode_scans table already exists in this database

ALTER TABLE public.barcode_scans 
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id);

-- Index for variant lookups
CREATE INDEX IF NOT EXISTS idx_barcode_scans_variant 
  ON public.barcode_scans(variant_id);

-- Additional index for SKU lookups
CREATE INDEX IF NOT EXISTS idx_product_variants_sku 
  ON public.product_variants(sku) 
  WHERE sku IS NOT NULL;

-- ============================================================================
-- 3. BARCODE GENERATION FUNCTION
-- ============================================================================

-- Drop existing function if it exists (parameter names may differ)
DROP FUNCTION IF EXISTS public.generate_product_barcode(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.generate_product_barcode(
  p_vendor_id UUID,
  p_variant_id UUID,
  p_format TEXT DEFAULT 'CODE128'
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vendor_prefix TEXT;
  v_variant_suffix TEXT;
  v_barcode TEXT;
  v_check_digit INT;
BEGIN
  -- Extract first 4 hex chars from vendor ID
  v_vendor_prefix := UPPER(SUBSTRING(REPLACE(p_vendor_id::TEXT, '-', '') FROM 1 FOR 4));
  
  -- Extract 8 hex chars from variant ID
  v_variant_suffix := UPPER(SUBSTRING(REPLACE(p_variant_id::TEXT, '-', '') FROM 1 FOR 8));
  
  IF p_format = 'EAN-13' THEN
    -- EAN-13: Convert to numeric, pad to 12 digits, add check digit
    v_barcode := LPAD(
      regexp_replace(v_vendor_prefix || v_variant_suffix, '[^0-9]', '', 'g'),
      12, '0'
    );
    v_barcode := SUBSTRING(v_barcode FROM 1 FOR 12);
    
    -- Calculate EAN-13 check digit
    v_check_digit := (
      10 - (
        (
          CAST(SUBSTRING(v_barcode FROM 1 FOR 1) AS INT) +
          CAST(SUBSTRING(v_barcode FROM 3 FOR 1) AS INT) +
          CAST(SUBSTRING(v_barcode FROM 5 FOR 1) AS INT) +
          CAST(SUBSTRING(v_barcode FROM 7 FOR 1) AS INT) +
          CAST(SUBSTRING(v_barcode FROM 9 FOR 1) AS INT) +
          CAST(SUBSTRING(v_barcode FROM 11 FOR 1) AS INT)
        ) + 3 * (
          CAST(SUBSTRING(v_barcode FROM 2 FOR 1) AS INT) +
          CAST(SUBSTRING(v_barcode FROM 4 FOR 1) AS INT) +
          CAST(SUBSTRING(v_barcode FROM 6 FOR 1) AS INT) +
          CAST(SUBSTRING(v_barcode FROM 8 FOR 1) AS INT) +
          CAST(SUBSTRING(v_barcode FROM 10 FOR 1) AS INT) +
          CAST(SUBSTRING(v_barcode FROM 12 FOR 1) AS INT)
        )
      ) % 10
    ) % 10;
    
    v_barcode := v_barcode || v_check_digit::TEXT;
  ELSE
    -- CODE128 format
    v_barcode := 'BC' || v_vendor_prefix || v_variant_suffix;
  END IF;
  
  RETURN v_barcode;
END;
$$;

-- ============================================================================
-- 4. RECORD BARCODE SCAN FUNCTION
-- ============================================================================

-- Drop existing function to allow parameter name changes
DROP FUNCTION IF EXISTS public.record_barcode_scan(uuid, text, text, uuid, text);

CREATE OR REPLACE FUNCTION public.record_barcode_scan(
  p_vendor_id UUID,
  p_barcode_value TEXT,
  p_scan_source TEXT DEFAULT 'pos',
  p_order_id UUID DEFAULT NULL,
  p_scanner_type TEXT DEFAULT 'hardware'
) RETURNS TABLE (
  item_type TEXT,
  item_id UUID,
  item_name TEXT,
  item_price NUMERIC,
  item_stock INT,
  is_found BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product_id UUID;
  v_variant_id UUID;
  v_product_name TEXT;
  v_variant_name TEXT;
  v_price NUMERIC;
  v_stock INT;
  v_found BOOLEAN := FALSE;
  v_item_type TEXT;
BEGIN
  -- Normalize barcode
  p_barcode_value := UPPER(TRIM(p_barcode_value));
  
  -- First: Search product_variants by barcode
  SELECT 
    pv.id,
    pv.product_id,
    p.name,
    pv.variant_name,
    pv.price,
    pv.stock
  INTO 
    v_variant_id,
    v_product_id,
    v_product_name,
    v_variant_name,
    v_price,
    v_stock
  FROM public.product_variants pv
  JOIN public.products p ON pv.product_id = p.id
  WHERE pv.barcode = p_barcode_value
    AND p.vendor_id = p_vendor_id
    AND p.deleted_at IS NULL
  LIMIT 1;
  
  IF v_variant_id IS NOT NULL THEN
    v_found := TRUE;
    v_item_type := 'variant';
  ELSE
    -- Second: Search product_variants by SKU
    SELECT 
      pv.id,
      pv.product_id,
      p.name,
      pv.variant_name,
      pv.price,
      pv.stock
    INTO 
      v_variant_id,
      v_product_id,
      v_product_name,
      v_variant_name,
      v_price,
      v_stock
    FROM public.product_variants pv
    JOIN public.products p ON pv.product_id = p.id
    WHERE pv.sku = p_barcode_value
      AND p.vendor_id = p_vendor_id
      AND p.deleted_at IS NULL
    LIMIT 1;
    
    IF v_variant_id IS NOT NULL THEN
      v_found := TRUE;
      v_item_type := 'variant';
    ELSE
      -- Third: Search products by SKU
      SELECT 
        p.id,
        p.name,
        p.price,
        0
      INTO 
        v_product_id,
        v_product_name,
        v_price,
        v_stock
      FROM public.products p
      WHERE p.sku = p_barcode_value
        AND p.vendor_id = p_vendor_id
        AND p.deleted_at IS NULL
      LIMIT 1;
      
      IF v_product_id IS NOT NULL THEN
        v_found := TRUE;
        v_item_type := 'product';
      END IF;
    END IF;
  END IF;
  
  -- Log the scan
  INSERT INTO public.barcode_scans (
    vendor_id,
    product_id,
    variant_id,
    barcode_value,
    is_successful,
    error_message,
    scan_source,
    order_id,
    scanner_type
  ) VALUES (
    p_vendor_id,
    v_product_id,
    v_variant_id,
    p_barcode_value,
    v_found,
    CASE WHEN NOT v_found THEN 'Barcode not found' ELSE NULL END,
    p_scan_source,
    p_order_id,
    p_scanner_type
  );
  
  -- Return result
  RETURN QUERY SELECT
    v_item_type,
    COALESCE(v_variant_id, v_product_id),
    COALESCE(v_variant_name, v_product_name),
    v_price,
    v_stock,
    v_found;
END;
$$;

-- ============================================================================
-- 5. GET TOP SCANNED PRODUCTS FUNCTION
-- ============================================================================

-- Drop existing function to allow parameter name changes
DROP FUNCTION IF EXISTS public.get_top_scanned_products(uuid, int, int);

CREATE OR REPLACE FUNCTION public.get_top_scanned_products(
  p_vendor_id UUID,
  p_limit INT DEFAULT 10,
  p_days INT DEFAULT 30
) RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  scan_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(bs.product_id, pv.product_id) as product_id,
    p.name as product_name,
    COUNT(*) as scan_count
  FROM public.barcode_scans bs
  LEFT JOIN public.product_variants pv ON bs.variant_id = pv.id
  LEFT JOIN public.products p ON COALESCE(bs.product_id, pv.product_id) = p.id
  WHERE bs.vendor_id = p_vendor_id
    AND bs.is_successful = TRUE
    AND bs.scan_timestamp >= NOW() - (p_days || ' days')::INTERVAL
    AND p.id IS NOT NULL
  GROUP BY COALESCE(bs.product_id, pv.product_id), p.name
  ORDER BY COUNT(*) DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- 6. GET DAILY SCAN COUNTS FUNCTION
-- ============================================================================

-- Drop existing function to allow parameter name changes
DROP FUNCTION IF EXISTS public.get_daily_scan_counts(uuid, int);

CREATE OR REPLACE FUNCTION public.get_daily_scan_counts(
  p_vendor_id UUID,
  p_days INT DEFAULT 30
) RETURNS TABLE (
  scan_date DATE,
  scan_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(bs.scan_timestamp) as scan_date,
    COUNT(*) as scan_count
  FROM public.barcode_scans bs
  WHERE bs.vendor_id = p_vendor_id
    AND bs.scan_timestamp >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(bs.scan_timestamp)
  ORDER BY DATE(bs.scan_timestamp);
END;
$$;

-- ============================================================================
-- 7. AUTO-GENERATE BARCODE TRIGGER (OPTIONAL)
-- ============================================================================

-- Trigger function to auto-generate barcodes for new variants
CREATE OR REPLACE FUNCTION public.auto_generate_variant_barcode()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_vendor_id UUID;
BEGIN
  -- Only generate if barcode is null
  IF NEW.barcode IS NULL THEN
    -- Get vendor_id from product
    SELECT p.vendor_id INTO v_vendor_id
    FROM public.products p
    WHERE p.id = NEW.product_id;
    
    IF v_vendor_id IS NOT NULL THEN
      NEW.barcode := public.generate_product_barcode(v_vendor_id, NEW.id, 'CODE128');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger (disabled by default - uncomment to enable auto-generation)
-- DROP TRIGGER IF EXISTS trigger_auto_generate_variant_barcode ON public.product_variants;
-- CREATE TRIGGER trigger_auto_generate_variant_barcode
--   BEFORE INSERT ON public.product_variants
--   FOR EACH ROW
--   EXECUTE FUNCTION public.auto_generate_variant_barcode();

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on functions
GRANT EXECUTE ON FUNCTION public.generate_product_barcode TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_barcode_scan TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_scanned_products TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_scan_counts TO authenticated;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Run this to verify the migration:
-- SELECT 
--   EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'barcode_scans') as barcode_scans_exists,
--   EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'generate_product_barcode') as generate_func_exists,
--   EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'record_barcode_scan') as record_func_exists,
--   EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_top_scanned_products') as stats_func_exists;
