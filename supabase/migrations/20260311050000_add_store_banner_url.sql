-- Add store_banner_url column to sellers table
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS store_banner_url TEXT;

-- Verify column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sellers' AND column_name = 'store_banner_url';
