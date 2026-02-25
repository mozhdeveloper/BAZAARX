-- Migration: Add missing columns to pos_settings table
-- The pos_settings table already exists, we just need to add missing columns for full functionality

-- Add scanner_type column for hardware scanner support (usb, camera, bluetooth)
ALTER TABLE public.pos_settings 
ADD COLUMN IF NOT EXISTS scanner_type text DEFAULT 'camera'::text 
CHECK (scanner_type = ANY (ARRAY['camera'::text, 'usb'::text, 'bluetooth'::text]));

-- Add auto_add_on_scan column for automatic product addition on barcode scan
ALTER TABLE public.pos_settings 
ADD COLUMN IF NOT EXISTS auto_add_on_scan boolean DEFAULT true;

-- Add logo_url column for custom receipt logos
ALTER TABLE public.pos_settings 
ADD COLUMN IF NOT EXISTS logo_url text;

-- Add printer_name column for specific printer selection
ALTER TABLE public.pos_settings 
ADD COLUMN IF NOT EXISTS printer_name text;

-- Add enable_low_stock_alert column for inventory alerts
ALTER TABLE public.pos_settings 
ADD COLUMN IF NOT EXISTS enable_low_stock_alert boolean DEFAULT true;

-- Add low_stock_threshold column for alert threshold
ALTER TABLE public.pos_settings 
ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 10;

-- Create index on seller_id for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_pos_settings_seller_id ON public.pos_settings(seller_id);

-- Comment on important columns
COMMENT ON COLUMN public.pos_settings.scanner_type IS 'Type of barcode scanner: camera (built-in), usb (hardware), bluetooth';
COMMENT ON COLUMN public.pos_settings.auto_add_on_scan IS 'Automatically add product to cart when barcode is scanned';
COMMENT ON COLUMN public.pos_settings.enable_low_stock_alert IS 'Enable low stock alerts during POS transactions';
COMMENT ON COLUMN public.pos_settings.low_stock_threshold IS 'Stock level below which to show low stock alert';


