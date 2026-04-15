-- BX-09-002 + BX-09-003: Per-seller shipment records
-- One row per seller per order. Created at checkout time with shipping details.
-- Updated by seller when shipment is dispatched (tracking_number, status).

CREATE TABLE IF NOT EXISTS order_shipments (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id               text NOT NULL,
  seller_id              text NOT NULL,
  shipping_method        text NOT NULL CHECK (shipping_method IN ('standard', 'economy', 'same_day', 'bulky')),
  shipping_method_label  text NOT NULL,
  calculated_fee         numeric NOT NULL,
  fee_breakdown          jsonb  NOT NULL DEFAULT '{}',
  origin_zone            text NOT NULL,
  destination_zone       text NOT NULL,
  estimated_days_text    text NOT NULL,
  chargeable_weight_kg   numeric NOT NULL DEFAULT 0,
  tracking_number        text,
  status                 text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'shipped', 'in_transit', 'delivered', 'returned')),
  shipped_at             timestamptz,
  delivered_at           timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE order_shipments IS 'BX-09-002/003: Per-seller shipment records with method, fee breakdown, ETA, and tracking.';

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_order_shipments_order_id  ON order_shipments (order_id);
CREATE INDEX IF NOT EXISTS idx_order_shipments_seller_id ON order_shipments (seller_id);
CREATE INDEX IF NOT EXISTS idx_order_shipments_tracking  ON order_shipments (tracking_number) WHERE tracking_number IS NOT NULL;

-- RLS
ALTER TABLE order_shipments ENABLE ROW LEVEL SECURITY;

-- Buyers can read shipments for their own orders
CREATE POLICY "Buyers can read own order sahipments"
  ON order_shipments FOR SELECT TO authenticated
  USING (
    order_id::uuid IN (SELECT id FROM orders WHERE buyer_id = auth.uid())
  );

-- Sellers can read their own shipments
CREATE POLICY "Sellers can read own shipments"
  ON order_shipments FOR SELECT TO authenticated
  USING (seller_id = auth.uid()::text);

-- Sellers can update their own shipments (tracking number, status)
CREATE POLICY "Sellers can update own shipments"
  ON order_shipments FOR UPDATE TO authenticated
  USING (seller_id = auth.uid()::text);

-- Authenticated users can insert (checkout flow)
CREATE POLICY "Authenticated users can insert shipments"
  ON order_shipments FOR INSERT TO authenticated
  WITH CHECK (true);
