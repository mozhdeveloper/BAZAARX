-- Migration: Add missing override columns to product_discounts

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_discounts' AND column_name='override_discount_type') THEN
    ALTER TABLE public.product_discounts ADD COLUMN override_discount_type TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_discounts' AND column_name='override_discount_value') THEN
    ALTER TABLE public.product_discounts ADD COLUMN override_discount_value DECIMAL(10,2);
  END IF;
END $$;
