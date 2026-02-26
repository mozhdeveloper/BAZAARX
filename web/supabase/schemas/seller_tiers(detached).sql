CREATE TABLE public.seller_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  tier_level TEXT NOT NULL DEFAULT 'standard' CHECK (tier_level IN ('standard', 'premium_outlet')),
  bypasses_assessment BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT seller_tiers_seller_id_unique UNIQUE (seller_id)
);

CREATE INDEX idx_seller_tiers_seller_id ON public.seller_tiers(seller_id);
CREATE INDEX idx_seller_tiers_tier_level ON public.seller_tiers(tier_level);

CREATE OR REPLACE FUNCTION update_seller_tiers_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_seller_tiers_updated_at
  BEFORE UPDATE ON public.seller_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_tiers_updated_at_column();
