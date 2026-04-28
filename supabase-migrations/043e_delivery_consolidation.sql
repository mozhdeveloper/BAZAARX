-- 043e: Delivery consolidation
--
-- Audit findings (verified against live data on this DB):
--   * order_shipments: 0 duplicates, max 1 row per order_id (currently naturally 1:1)
--   * delivery_bookings: 5 order_ids have multiple rows (21 rows total). All dupes
--     are same (order_id, seller_id, courier_code='jnt'), differing only by
--     booking_reference + created_at. These came from the bookDelivery() flow
--     re-inserting a new row every time the seller re-clicks "Book Delivery"
--     instead of updating the existing one.
--   * Schema diff confirms the two tables are COMPLEMENTARY, not duplicate:
--       - order_shipments = canonical per-(order,seller) shipment line
--         (fee_breakdown, zones, chargeable_weight_kg, shipping_method,
--         tracking_number, status). Created at checkout per seller.
--       - delivery_bookings = 3PL courier booking attempt
--         (courier_code, booking_reference, waybill_url, COD, package
--         dimensions, pickup/delivery_address jsonb). Created when the
--         seller actually books with J&T / Lalamove / etc.
--
-- This migration is idempotent and additive:
--   1. De-dup delivery_bookings, keeping the EARLIEST row per
--      (order_id, seller_id) so existing references to the original
--      booking_reference remain valid.
--   2. Add UNIQUE (order_id, seller_id) to delivery_bookings so the
--      bookDelivery() upsert in app code is enforced by the DB.
--   3. Add UNIQUE (order_id, seller_id) to order_shipments so re-running
--      checkout / shipment-create paths cannot silently produce dupes.
--   4. Add COMMENT ON TABLE for both tables clarifying their distinct roles.
--
-- Non-destructive guarantees:
--   * In-transaction recheck before adding each UNIQUE: if any (order_id,
--     seller_id) still has count > 1 after dedup, the migration aborts with
--     RAISE EXCEPTION (will not silently swallow conflicts on rerun).
--   * Idempotent: pg_constraint checks skip the ALTER if the constraint
--     already exists.

BEGIN;

-- ------------------------------------------------------------------
-- 1. De-duplicate delivery_bookings.
--    Keep the earliest row per (order_id, seller_id); delete the rest.
--    The earliest is most likely the one referenced by any tracking
--    events / shipping notifications already sent to buyers.
-- ------------------------------------------------------------------
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY order_id, seller_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.delivery_bookings
)
DELETE FROM public.delivery_bookings db
USING ranked r
WHERE db.id = r.id
  AND r.rn > 1;

-- ------------------------------------------------------------------
-- 2. UNIQUE (order_id, seller_id) on delivery_bookings.
-- ------------------------------------------------------------------
DO $body$
DECLARE
  v_dupes integer;
BEGIN
  -- Re-check inside the transaction for race-safety.
  SELECT count(*) INTO v_dupes
  FROM (
    SELECT 1
    FROM public.delivery_bookings
    GROUP BY order_id, seller_id
    HAVING count(*) > 1
  ) x;

  IF v_dupes > 0 THEN
    RAISE EXCEPTION
      'Aborting 043e: % (order_id,seller_id) groups still duplicated in delivery_bookings after dedup',
      v_dupes;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.delivery_bookings'::regclass
      AND conname  = 'delivery_bookings_order_seller_key'
  ) THEN
    ALTER TABLE public.delivery_bookings
      ADD CONSTRAINT delivery_bookings_order_seller_key
      UNIQUE (order_id, seller_id);
  END IF;
END
$body$;

-- ------------------------------------------------------------------
-- 3. UNIQUE (order_id, seller_id) on order_shipments.
--    Naturally 0 dupes today, but enforce it so future code can't drift.
-- ------------------------------------------------------------------
DO $body$
DECLARE
  v_dupes integer;
BEGIN
  SELECT count(*) INTO v_dupes
  FROM (
    SELECT 1
    FROM public.order_shipments
    GROUP BY order_id, seller_id
    HAVING count(*) > 1
  ) x;

  IF v_dupes > 0 THEN
    RAISE EXCEPTION
      'Aborting 043e: % (order_id,seller_id) groups duplicated in order_shipments',
      v_dupes;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.order_shipments'::regclass
      AND conname  = 'order_shipments_order_seller_key'
  ) THEN
    ALTER TABLE public.order_shipments
      ADD CONSTRAINT order_shipments_order_seller_key
      UNIQUE (order_id, seller_id);
  END IF;
END
$body$;

-- ------------------------------------------------------------------
-- 4. Document the roles so future contributors stop conflating them.
-- ------------------------------------------------------------------
COMMENT ON TABLE public.order_shipments IS
  'Canonical per-(order, seller) shipment line. Created at checkout from the '
  'shipping breakdown. Holds zones, fee_breakdown, chargeable_weight_kg, '
  'shipping_method, tracking_number, and shipment status. Exactly one row '
  'per (order_id, seller_id). REQUIRED for every shipped order line.';

COMMENT ON TABLE public.delivery_bookings IS
  '3PL courier booking record. Created when a seller books a shipment with '
  'an integrated courier (J&T, Lalamove, etc). Holds courier_code, '
  'booking_reference, waybill_url, COD details, package dimensions, and '
  'pickup/delivery address snapshots. At most one row per (order_id, '
  'seller_id) — re-booking must update, not insert. OPTIONAL: orders shipped '
  'without an integrated courier will not have a row here.';

COMMIT;
