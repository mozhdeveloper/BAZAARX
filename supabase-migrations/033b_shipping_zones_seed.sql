-- 033b: Seed shipping_zones for live DB
-- Run in Supabase SQL Editor.

-- Step 1: Add the missing unique constraint (safe if it already exists)
ALTER TABLE shipping_zones
  DROP CONSTRAINT IF EXISTS shipping_zones_origin_zone_destination_zone_shipping_method_key;

ALTER TABLE shipping_zones
  ADD CONSTRAINT shipping_zones_origin_zone_destination_zone_shipping_method_key
  UNIQUE (origin_zone, destination_zone, shipping_method);

-- Step 2: Seed shipping_config (if empty)
INSERT INTO shipping_config (
  volumetric_divisor, per_kg_increment, insurance_rate,
  free_shipping_threshold, bulky_weight_threshold, same_day_zones
) VALUES (3500, 15, 0.01, 0, 50, '{NCR}')
ON CONFLICT DO NOTHING;

-- Step 3: Seed all zone pairs
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
  ('Visayas', 'NCR',      'economy',   130, 0, 7, 14),
  ('Visayas', 'Luzon',    'standard',  175, 0, 5, 8),
  ('Visayas', 'Luzon',    'economy',   140, 0, 8, 14),
  ('Visayas', 'Visayas',  'standard',  120, 0, 2, 5),
  ('Visayas', 'Visayas',  'economy',    95, 0, 4, 8),
  ('Visayas', 'Mindanao', 'standard',  155, 0, 4, 7),
  ('Visayas', 'Mindanao', 'economy',   125, 0, 6, 10)
ON CONFLICT (origin_zone, destination_zone, shipping_method) DO NOTHING;

-- Mindanao origins
INSERT INTO shipping_zones (origin_zone, destination_zone, shipping_method, base_rate, odz_fee, estimated_days_min, estimated_days_max) VALUES
  ('Mindanao', 'NCR',      'standard',  185, 0, 5, 8),
  ('Mindanao', 'NCR',      'economy',   150, 0, 8, 14),
  ('Mindanao', 'Luzon',    'standard',  200, 0, 6, 9),
  ('Mindanao', 'Luzon',    'economy',   160, 0, 9, 15),
  ('Mindanao', 'Visayas',  'standard',  155, 0, 4, 7),
  ('Mindanao', 'Visayas',  'economy',   125, 0, 6, 10),
  ('Mindanao', 'Mindanao', 'standard',  130, 0, 2, 5),
  ('Mindanao', 'Mindanao', 'economy',   100, 0, 4, 7)
ON CONFLICT (origin_zone, destination_zone, shipping_method) DO NOTHING;
