-- ============================================================================
-- Seller Orders Performance Indexes
-- Created: February 12, 2026
-- Purpose: speed up seller order listing query path
-- (order_items -> products -> orders + order_shipments)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_order_items_product_id
  ON public.order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON public.order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_order
  ON public.order_items(product_id, order_id);

CREATE INDEX IF NOT EXISTS idx_order_shipments_order_id
  ON public.order_shipments(order_id);

CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc
  ON public.orders(created_at DESC);

-- Performance indexes for order read and mutation flows.
-- These target seller/buyer order list refreshes and shipment/cancellation lookups.

create index if not exists idx_orders_buyer_created_at
  on public.orders (buyer_id, created_at desc);

create index if not exists idx_orders_shipment_payment_status
  on public.orders (shipment_status, payment_status);

create index if not exists idx_order_items_order_id
  on public.order_items (order_id);

create index if not exists idx_order_items_product_order
  on public.order_items (product_id, order_id);

create index if not exists idx_order_shipments_order_created_at
  on public.order_shipments (order_id, created_at desc);

create index if not exists idx_order_cancellations_order_cancelled_at
  on public.order_cancellations (order_id, cancelled_at desc);

-- Existing idx_products_seller_id is already present; keep this composite index
-- to help planner with seller filter + id lookup.
CREATE INDEX IF NOT EXISTS idx_products_seller_id_id
  ON public.products(seller_id, id);
