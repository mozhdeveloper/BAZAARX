-- BX-09-001: Add GPS origin columns for seller shipping zone detection
-- These columns allow coordinate-based zone resolution (NCR/Luzon/Visayas/Mindanao)
-- via the getZoneFromCoords() bounding-box function in shippingService.ts.
-- When null, the system falls back to seller_business_profiles.province for text-based detection.

ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS shipping_origin_lat double precision,
  ADD COLUMN IF NOT EXISTS shipping_origin_lng double precision;

COMMENT ON COLUMN sellers.shipping_origin_lat IS 'GPS latitude for shipping zone detection (from react-native-maps)';
COMMENT ON COLUMN sellers.shipping_origin_lng IS 'GPS longitude for shipping zone detection (from react-native-maps)';
