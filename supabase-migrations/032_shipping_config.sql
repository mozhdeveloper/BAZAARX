-- BX-09-001: Shipping configuration constants table
-- Single-row table for J&T math model parameters.
-- These are universal across all sellers and orders.
-- Update values here when J&T changes their pricing structure.

CREATE TABLE IF NOT EXISTS shipping_config (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volumetric_divisor      numeric NOT NULL DEFAULT 3500,
  per_kg_increment        numeric NOT NULL DEFAULT 15,
  insurance_rate          numeric NOT NULL DEFAULT 0.01,
  free_shipping_threshold numeric NOT NULL DEFAULT 0,
  bulky_weight_threshold  numeric NOT NULL DEFAULT 50,
  same_day_zones          text[]  NOT NULL DEFAULT '{NCR}',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  shipping_config                          IS 'Global shipping calculation constants (J&T math model). Single-row table.';
COMMENT ON COLUMN shipping_config.volumetric_divisor       IS 'Volumetric divisor: (L×W×H cm³) / divisor = volumetric kg. J&T PH standard = 3500.';
COMMENT ON COLUMN shipping_config.per_kg_increment         IS 'Additional charge per kg after the first kg (₱).';
COMMENT ON COLUMN shipping_config.insurance_rate           IS 'Fraction of declared item value charged as valuation/insurance fee.';
COMMENT ON COLUMN shipping_config.free_shipping_threshold  IS 'Platform-level free shipping threshold (₱). 0 = disabled.';
COMMENT ON COLUMN shipping_config.bulky_weight_threshold   IS 'Chargeable weight (kg) at or above which the bulky/freight method is used.';
COMMENT ON COLUMN shipping_config.same_day_zones           IS 'Array of zone codes where same-day delivery is available.';

-- Seed one config row with J&T PH defaults
-- NOTE: Replace these values with your actual J&T contract rates before production.
INSERT INTO shipping_config (
  volumetric_divisor, per_kg_increment, insurance_rate,
  free_shipping_threshold, bulky_weight_threshold, same_day_zones
) VALUES (3500, 15, 0.01, 0, 50, '{NCR}')
ON CONFLICT DO NOTHING;

-- Enable RLS but allow authenticated reads
ALTER TABLE shipping_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read shipping_config"
  ON shipping_config FOR SELECT TO authenticated USING (true);
