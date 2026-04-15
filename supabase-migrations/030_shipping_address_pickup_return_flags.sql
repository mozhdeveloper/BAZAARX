-- ============================================================
-- Migration: 030_shipping_address_pickup_return_flags.sql
-- BX-09-004: Add isPickup / isReturn flags to shipping_addresses
--
-- Adds two boolean columns that let users (primarily sellers)
-- designate an address as a shipping-origin / pickup address
-- and/or a return address. Both default to false so all
-- existing rows are unaffected.
-- ============================================================

ALTER TABLE shipping_addresses
  ADD COLUMN IF NOT EXISTS is_pickup boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_return boolean DEFAULT false;

-- Optional: index for seller dashboard queries that filter by
-- pickup or return address (low-cardinality but useful for sellers
-- with many addresses).
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_is_pickup
  ON shipping_addresses (user_id, is_pickup)
  WHERE is_pickup = true;

CREATE INDEX IF NOT EXISTS idx_shipping_addresses_is_return
  ON shipping_addresses (user_id, is_return)
  WHERE is_return = true;

-- Verify
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'shipping_addresses'
--   AND column_name IN ('is_pickup', 'is_return');
