-- Migration 007: Add unique indexes to order views for concurrent refresh
-- Problem: REFRESH MATERIALIZED VIEW CONCURRENTLY requires a unique index
-- Error: "cannot refresh materialized view \"public.buyer_orders_view\" concurrently"

-- Drop existing non-unique indexes first
DROP INDEX IF EXISTS idx_buyer_orders_view_id;
DROP INDEX IF EXISTS idx_seller_orders_view_id;
DROP INDEX IF EXISTS idx_order_details_view_id;

-- Create UNIQUE indexes on id column (order.id is the primary key, so it's unique)
CREATE UNIQUE INDEX idx_buyer_orders_view_id 
    ON buyer_orders_view (id);

CREATE UNIQUE INDEX idx_seller_orders_view_id 
    ON seller_orders_view (id);

CREATE UNIQUE INDEX idx_order_details_view_id 
    ON order_details_view (id);

-- Manually refresh all views once to ensure they're up to date
REFRESH MATERIALIZED VIEW CONCURRENTLY buyer_orders_view;
REFRESH MATERIALIZED VIEW CONCURRENTLY seller_orders_view;
REFRESH MATERIALIZED VIEW CONCURRENTLY order_details_view;
