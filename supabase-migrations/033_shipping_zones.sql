-- BX-09-001: Shipping zones rate table
-- One row per (origin_zone, destination_zone, shipping_method) triple.
-- base_rate = courier-published first-kg rate for this zone pair + method.
-- Zones are geographic: NCR, Luzon, Visayas, Mindanao.
-- Zone detection is done at runtime via GPS bounding boxes in shippingService.ts.
--
-- NOTE: The base_rate values below are PLACEHOLDER ESTIMATES.
-- Replace them with your actual J&T Express contract rates before going live.

CREATE TABLE IF NOT EXISTS shipping_zones (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_zone          text    NOT NULL CHECK (origin_zone IN ('NCR', 'Luzon', 'Visayas', 'Mindanao')),
  destination_zone     text    NOT NULL CHECK (destination_zone IN ('NCR', 'Luzon', 'Visayas', 'Mindanao')),
  shipping_method      text    NOT NULL CHECK (shipping_method IN ('standard', 'economy', 'same_day', 'bulky')),
  base_rate            numeric NOT NULL,
  odz_fee              numeric NOT NULL DEFAULT 0,
  estimated_days_min   int     NOT NULL,
  estimated_days_max   int     NOT NULL,
  is_active            boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (origin_zone, destination_zone, shipping_method)
);

COMMENT ON TABLE  shipping_zones                        IS 'Courier rate matrix: base rate per zone pair + method. Values from J&T rate card.';
COMMENT ON COLUMN shipping_zones.origin_zone            IS 'Seller shipping zone (NCR/Luzon/Visayas/Mindanao). Resolved at runtime from GPS.';
COMMENT ON COLUMN shipping_zones.destination_zone       IS 'Buyer delivery zone (NCR/Luzon/Visayas/Mindanao). Resolved at runtime from GPS.';
COMMENT ON COLUMN shipping_zones.shipping_method        IS 'Shipping method: standard, economy, same_day, bulky.';
COMMENT ON COLUMN shipping_zones.base_rate              IS 'First-kg base rate (₱). From J&T published tariff. REPLACE WITH REAL RATES.';
COMMENT ON COLUMN shipping_zones.odz_fee                IS 'Out-of-delivery-zone surcharge (₱). 0 for standard zones.';
COMMENT ON COLUMN shipping_zones.estimated_days_min     IS 'Minimum estimated delivery days for this route + method.';
COMMENT ON COLUMN shipping_zones.estimated_days_max     IS 'Maximum estimated delivery days for this route + method.';

-- Enable RLS but allow authenticated reads
ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read shipping_zones"
  ON shipping_zones FOR SELECT TO authenticated USING (true);

-- =============================================================================
-- SEED DATA — PLACEHOLDER RATES (replace with actual J&T contract rates)
-- =============================================================================

-- NCR origins
INSERT INTO shipping_zones (origin_zone, destination_zone, shipping_method, base_rate, odz_fee, estimated_days_min, estimated_days_max) VALUES
  ('NCR', 'NCR',      'standard',   85, 0, 1, 2),
  ('NCR', 'NCR',      'economy',    65, 0, 2, 4),
  ('NCR', 'NCR',      'same_day',  150, 0, 0, 0),
  ('NCR', 'Luzon',    'standard',  115, 0, 2, 4),
  ('NCR', 'Luzon',    'economy',    90, 0, 4, 7),
  ('NCR', 'Visayas',  'standard',  160, 0, 4, 7),
  ('NCR', 'Visayas',  'economy',   130, 0, 7, 14),
  ('NCR', 'Mindanao', 'standard',  185, 0, 5, 8),
  ('NCR', 'Mindanao', 'economy',   150, 0, 8, 14)
ON CONFLICT (origin_zone, destination_zone, shipping_method) DO NOTHING;

-- Luzon origins
INSERT INTO shipping_zones (origin_zone, destination_zone, shipping_method, base_rate, odz_fee, estimated_days_min, estimated_days_max) VALUES
  ('Luzon', 'NCR',      'standard',  115, 0, 2, 4),
  ('Luzon', 'NCR',      'economy',    90, 0, 4, 7),
  ('Luzon', 'Luzon',    'standard',  130, 0, 3, 5),
  ('Luzon', 'Luzon',    'economy',   100, 0, 5, 8),
  ('Luzon', 'Visayas',  'standard',  175, 0, 5, 8),
  ('Luzon', 'Visayas',  'economy',   140, 0, 8, 14),
  ('Luzon', 'Mindanao', 'standard',  200, 0, 6, 9),
  ('Luzon', 'Mindanao', 'economy',   160, 0, 9, 15)
ON CONFLICT (origin_zone, destination_zone, shipping_method) DO NOTHING;

-- Visayas origins
INSERT INTO shipping_zones (origin_zone, destination_zone, shipping_method, base_rate, odz_fee, estimated_days_min, estimated_days_max) VALUES
  ('Visayas', 'NCR',      'standard',  160, 0, 4, 7),
  ('Visayas', 'Luzon',    'standard',  175, 0, 5, 8),
  ('Visayas', 'Visayas',  'standard',  120, 0, 2, 5),
  ('Visayas', 'Mindanao', 'standard',  155, 0, 4, 7)
ON CONFLICT (origin_zone, destination_zone, shipping_method) DO NOTHING;

-- Mindanao origins
INSERT INTO shipping_zones (origin_zone, destination_zone, shipping_method, base_rate, odz_fee, estimated_days_min, estimated_days_max) VALUES
  ('Mindanao', 'NCR',      'standard',  185, 0, 5, 8),
  ('Mindanao', 'Luzon',    'standard',  200, 0, 6, 9),
  ('Mindanao', 'Visayas',  'standard',  155, 0, 4, 7),
  ('Mindanao', 'Mindanao', 'standard',  130, 0, 2, 5)
ON CONFLICT (origin_zone, destination_zone, shipping_method) DO NOTHING;
