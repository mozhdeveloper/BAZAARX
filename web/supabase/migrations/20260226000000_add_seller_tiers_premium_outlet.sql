-- Migration: Add seller_tiers table for Premium Outlet feature
-- Created: 2026-02-26

-- Step 1: Create seller_tiers table
CREATE TABLE public.seller_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  tier_level TEXT NOT NULL DEFAULT 'standard' CHECK (tier_level IN ('standard', 'premium_outlet')),
  bypasses_assessment BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT seller_tiers_seller_id_unique UNIQUE (seller_id)
);

-- Step 2: Create indexes for quick lookups
CREATE INDEX idx_seller_tiers_seller_id ON public.seller_tiers(seller_id);
CREATE INDEX idx_seller_tiers_tier_level ON public.seller_tiers(tier_level);

-- Step 3: Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_seller_tiers_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Attach trigger
CREATE TRIGGER trg_seller_tiers_updated_at
  BEFORE UPDATE ON public.seller_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_tiers_updated_at_column();

-- Step 5: Add Row Level Security (RLS) - optional, enable if needed
-- ALTER TABLE public.seller_tiers ENABLE ROW LEVEL SECURITY;
-- 
-- Create policy for admins to manage all tiers
-- CREATE POLICY "Admins can manage all seller tiers" ON public.seller_tiers
--   FOR ALL
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM user_roles
--       WHERE user_id = auth.uid() AND role = 'admin'
--     )
--   );
