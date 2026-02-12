-- Migration 006: Order Query Optimization Views
-- Creates materialized views to optimize frequently-used complex order queries
-- Benefits: Reduces 6-7 table joins to single SELECT, improves query performance

-- ============================================================================
-- CLEANUP: Drop existing views, triggers, and function if they exist
-- ============================================================================

-- Drop triggers first (they depend on the function)
DROP TRIGGER IF EXISTS trg_refresh_order_views_on_order_change ON orders;
DROP TRIGGER IF EXISTS trg_refresh_order_views_on_item_change ON order_items;
DROP TRIGGER IF EXISTS trg_refresh_order_views_on_shipment_change ON order_shipments;
DROP TRIGGER IF EXISTS trg_refresh_order_views_on_cancellation_change ON order_cancellations;

-- Drop refresh function
DROP FUNCTION IF EXISTS refresh_order_views();

-- Drop materialized views (CASCADE will drop dependent indexes)
DROP MATERIALIZED VIEW IF EXISTS buyer_orders_view CASCADE;
DROP MATERIALIZED VIEW IF EXISTS seller_orders_view CASCADE;
DROP MATERIALIZED VIEW IF EXISTS order_details_view CASCADE;

-- ============================================================================
-- 1. BUYER ORDERS VIEW
-- ============================================================================
-- Used by: orderService.getBuyerOrders()
-- Joins: orders, order_items, product_variants, products, sellers, 
--        order_recipients, shipping_addresses, order_shipments, order_cancellations
-- Purpose: Buyer order list with all related data pre-joined

CREATE MATERIALIZED VIEW buyer_orders_view AS
SELECT
    o.id,
    o.order_number,
    o.buyer_id,
    o.order_type,
    o.payment_status,
    o.shipment_status,
    o.paid_at,
    o.notes,
    o.created_at,
    o.updated_at,
    
    -- Aggregated order items with variant and seller info
    COALESCE(
        (
            SELECT json_agg(
                json_build_object(
                    'id', oi.id,
                    'product_id', oi.product_id,
                    'product_name', oi.product_name,
                    'primary_image_url', oi.primary_image_url,
                    'quantity', oi.quantity,
                    'price', oi.price,
                    'price_discount', oi.price_discount,
                    'shipping_price', oi.shipping_price,
                    'shipping_discount', oi.shipping_discount,
                    'variant_id', oi.variant_id,
                    'personalized_options', oi.personalized_options,
                    'rating', oi.rating,
                    'variant', CASE 
                        WHEN pv.id IS NOT NULL THEN json_build_object(
                            'id', pv.id,
                            'variant_name', pv.variant_name,
                            'size', pv.size,
                            'color', pv.color,
                            'sku', pv.sku,
                            'price', pv.price,
                            'thumbnail_url', pv.thumbnail_url
                        )
                        ELSE NULL
                    END,
                    'seller_id', p.seller_id,
                    'seller_name', s.store_name
                )
            )
            FROM order_items oi
            LEFT JOIN product_variants pv ON oi.variant_id = pv.id
            LEFT JOIN products p ON oi.product_id = p.id
            LEFT JOIN sellers s ON p.seller_id = s.id
            WHERE oi.order_id = o.id
        ),
        '[]'::json
    ) AS order_items,
    
    -- Recipient info
    CASE 
        WHEN r.id IS NOT NULL THEN json_build_object(
            'first_name', r.first_name,
            'last_name', r.last_name,
            'phone', r.phone,
            'email', r.email
        )
        ELSE NULL
    END AS recipient,
    
    -- Shipping address
    CASE 
        WHEN sa.id IS NOT NULL THEN json_build_object(
            'label', sa.label,
            'address_line_1', sa.address_line_1,
            'address_line_2', sa.address_line_2,
            'barangay', sa.barangay,
            'city', sa.city,
            'province', sa.province,
            'region', sa.region,
            'postal_code', sa.postal_code,
            'landmark', sa.landmark,
            'delivery_instructions', sa.delivery_instructions
        )
        ELSE NULL
    END AS shipping_address,
    
    -- Shipments (all records for history)
    COALESCE(
        (
            SELECT json_agg(
                json_build_object(
                    'id', sh.id,
                    'status', sh.status,
                    'tracking_number', sh.tracking_number,
                    'shipped_at', sh.shipped_at,
                    'delivered_at', sh.delivered_at,
                    'created_at', sh.created_at
                ) ORDER BY sh.created_at DESC
            )
            FROM order_shipments sh
            WHERE sh.order_id = o.id
        ),
        '[]'::json
    ) AS shipments,
    
    -- Cancellations (all records for history)
    COALESCE(
        (
            SELECT json_agg(
                json_build_object(
                    'id', c.id,
                    'reason', c.reason,
                    'cancelled_at', c.cancelled_at,
                    'cancelled_by', c.cancelled_by,
                    'created_at', c.created_at
                ) ORDER BY c.created_at DESC
            )
            FROM order_cancellations c
            WHERE c.order_id = o.id
        ),
        '[]'::json
    ) AS cancellations,
    
    -- Computed fields for convenience
    (
        SELECT COALESCE(SUM(
            (oi.price - oi.price_discount) * oi.quantity + 
            (oi.shipping_price - oi.shipping_discount)
        ), 0)
        FROM order_items oi
        WHERE oi.order_id = o.id
    ) AS total_amount,
    
    -- First seller info (for backwards compatibility)
    (
        SELECT p.seller_id
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = o.id AND p.seller_id IS NOT NULL
        LIMIT 1
    ) AS seller_id,
    
    (
        SELECT s.store_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN sellers s ON p.seller_id = s.id
        WHERE oi.order_id = o.id AND s.store_name IS NOT NULL
        LIMIT 1
    ) AS store_name

FROM orders o
LEFT JOIN order_recipients r ON o.recipient_id = r.id
LEFT JOIN shipping_addresses sa ON o.address_id = sa.id;

-- Index for fast buyer order lookups
CREATE INDEX idx_buyer_orders_view_buyer_created 
    ON buyer_orders_view (buyer_id, created_at DESC);

CREATE INDEX idx_buyer_orders_view_id 
    ON buyer_orders_view (id);


-- ============================================================================
-- 2. SELLER ORDERS VIEW
-- ============================================================================
-- Used by: orderService.getSellerOrders()
-- Joins: orders, order_items (filtered by seller's products), product_variants,
--        order_recipients, shipping_addresses, order_shipments
-- Purpose: Seller order list showing only their products

CREATE MATERIALIZED VIEW seller_orders_view AS
SELECT
    o.id,
    o.order_number,
    o.buyer_id,
    o.order_type,
    o.payment_status,
    o.shipment_status,
    o.paid_at,
    o.notes,
    o.pos_note,
    o.created_at,
    o.updated_at,
    
    -- Seller ID (from first product in order items)
    (
        SELECT p.seller_id
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = o.id AND p.seller_id IS NOT NULL
        LIMIT 1
    ) AS seller_id,
    
    -- Order items for this seller only (computed per seller in query)
    COALESCE(
        (
            SELECT json_agg(
                json_build_object(
                    'id', oi.id,
                    'product_id', oi.product_id,
                    'product_name', oi.product_name,
                    'primary_image_url', oi.primary_image_url,
                    'quantity', oi.quantity,
                    'price', oi.price,
                    'price_discount', oi.price_discount,
                    'shipping_price', oi.shipping_price,
                    'shipping_discount', oi.shipping_discount,
                    'variant_id', oi.variant_id,
                    'personalized_options', oi.personalized_options,
                    'variant', CASE 
                        WHEN pv.id IS NOT NULL THEN json_build_object(
                            'id', pv.id,
                            'variant_name', pv.variant_name,
                            'size', pv.size,
                            'color', pv.color,
                            'thumbnail_url', pv.thumbnail_url,
                            'price', pv.price
                        )
                        ELSE NULL
                    END
                )
            )
            FROM order_items oi
            LEFT JOIN product_variants pv ON oi.variant_id = pv.id
            WHERE oi.order_id = o.id
        ),
        '[]'::json
    ) AS order_items,
    
    -- Recipient info
    CASE 
        WHEN r.id IS NOT NULL THEN json_build_object(
            'id', r.id,
            'first_name', r.first_name,
            'last_name', r.last_name,
            'phone', r.phone,
            'email', r.email
        )
        ELSE NULL
    END AS recipient,
    
    -- Shipping address
    CASE 
        WHEN sa.id IS NOT NULL THEN json_build_object(
            'address_line_1', sa.address_line_1,
            'address_line_2', sa.address_line_2,
            'barangay', sa.barangay,
            'city', sa.city,
            'province', sa.province,
            'region', sa.region,
            'postal_code', sa.postal_code,
            'landmark', sa.landmark,
            'delivery_instructions', sa.delivery_instructions
        )
        ELSE NULL
    END AS shipping_address,
    
    -- Shipments
    COALESCE(
        (
            SELECT json_agg(
                json_build_object(
                    'id', sh.id,
                    'status', sh.status,
                    'tracking_number', sh.tracking_number,
                    'shipped_at', sh.shipped_at,
                    'delivered_at', sh.delivered_at,
                    'created_at', sh.created_at
                ) ORDER BY sh.created_at DESC
            )
            FROM order_shipments sh
            WHERE sh.order_id = o.id
        ),
        '[]'::json
    ) AS shipments,
    
    -- Total amount
    (
        SELECT COALESCE(SUM(
            (oi.price - oi.price_discount) * oi.quantity + 
            (oi.shipping_price - oi.shipping_discount)
        ), 0)
        FROM order_items oi
        WHERE oi.order_id = o.id
    ) AS total_amount

FROM orders o
LEFT JOIN order_recipients r ON o.recipient_id = r.id
LEFT JOIN shipping_addresses sa ON o.address_id = sa.id
WHERE EXISTS (
    SELECT 1 FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = o.id AND p.seller_id IS NOT NULL
);

-- Index for fast seller order lookups
CREATE INDEX idx_seller_orders_view_seller_created 
    ON seller_orders_view (seller_id, created_at DESC);

CREATE INDEX idx_seller_orders_view_id 
    ON seller_orders_view (id);


-- ============================================================================
-- 3. ORDER DETAILS VIEW
-- ============================================================================
-- Used by: orderReadService.getOrderDetail(), orderService.getOrderTrackingSnapshot()
-- Joins: orders, order_items, product_variants, products, sellers,
--        order_recipients, shipping_addresses, order_shipments, order_cancellations
-- Purpose: Complete order detail with all relationships for detail modals

CREATE MATERIALIZED VIEW order_details_view AS
SELECT
    o.id,
    o.order_number,
    o.buyer_id,
    o.order_type,
    o.payment_status,
    o.shipment_status,
    o.paid_at,
    o.notes,
    o.pos_note,
    o.created_at,
    o.updated_at,
    
    -- Complete order items with variant and product info
    COALESCE(
        (
            SELECT json_agg(
                json_build_object(
                    'id', oi.id,
                    'product_id', oi.product_id,
                    'product_name', oi.product_name,
                    'primary_image_url', oi.primary_image_url,
                    'quantity', oi.quantity,
                    'price', oi.price,
                    'price_discount', oi.price_discount,
                    'shipping_price', oi.shipping_price,
                    'shipping_discount', oi.shipping_discount,
                    'variant_id', oi.variant_id,
                    'personalized_options', oi.personalized_options,
                    'rating', oi.rating,
                    'variant', CASE 
                        WHEN pv.id IS NOT NULL THEN json_build_object(
                            'id', pv.id,
                            'variant_name', pv.variant_name,
                            'size', pv.size,
                            'color', pv.color,
                            'sku', pv.sku,
                            'price', pv.price,
                            'thumbnail_url', pv.thumbnail_url
                        )
                        ELSE NULL
                    END,
                    'product', CASE 
                        WHEN p.id IS NOT NULL THEN json_build_object(
                            'id', p.id,
                            'seller_id', p.seller_id
                        )
                        ELSE NULL
                    END
                )
            )
            FROM order_items oi
            LEFT JOIN product_variants pv ON oi.variant_id = pv.id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = o.id
        ),
        '[]'::json
    ) AS order_items,
    
    -- Recipient
    CASE 
        WHEN r.id IS NOT NULL THEN json_build_object(
            'first_name', r.first_name,
            'last_name', r.last_name,
            'phone', r.phone,
            'email', r.email
        )
        ELSE NULL
    END AS recipient,
    
    -- Shipping address
    CASE 
        WHEN sa.id IS NOT NULL THEN json_build_object(
            'label', sa.label,
            'address_line_1', sa.address_line_1,
            'address_line_2', sa.address_line_2,
            'barangay', sa.barangay,
            'city', sa.city,
            'province', sa.province,
            'region', sa.region,
            'postal_code', sa.postal_code,
            'landmark', sa.landmark,
            'delivery_instructions', sa.delivery_instructions
        )
        ELSE NULL
    END AS shipping_address,
    
    -- Shipments
    COALESCE(
        (
            SELECT json_agg(
                json_build_object(
                    'id', sh.id,
                    'status', sh.status,
                    'tracking_number', sh.tracking_number,
                    'shipped_at', sh.shipped_at,
                    'delivered_at', sh.delivered_at,
                    'created_at', sh.created_at
                ) ORDER BY sh.created_at DESC
            )
            FROM order_shipments sh
            WHERE sh.order_id = o.id
        ),
        '[]'::json
    ) AS shipments,
    
    -- Cancellations
    COALESCE(
        (
            SELECT json_agg(
                json_build_object(
                    'id', c.id,
                    'reason', c.reason,
                    'cancelled_at', c.cancelled_at,
                    'cancelled_by', c.cancelled_by,
                    'created_at', c.created_at
                ) ORDER BY c.created_at DESC
            )
            FROM order_cancellations c
            WHERE c.order_id = o.id
        ),
        '[]'::json
    ) AS cancellations,
    
    -- Seller info (from first product)
    (
        SELECT p.seller_id
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = o.id AND p.seller_id IS NOT NULL
        LIMIT 1
    ) AS seller_id,
    
    (
        SELECT s.store_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN sellers s ON p.seller_id = s.id
        WHERE oi.order_id = o.id AND s.store_name IS NOT NULL
        LIMIT 1
    ) AS store_name,
    
    -- Total amount
    (
        SELECT COALESCE(SUM(
            (oi.price - oi.price_discount) * oi.quantity + 
            (oi.shipping_price - oi.shipping_discount)
        ), 0)
        FROM order_items oi
        WHERE oi.order_id = o.id
    ) AS total_amount

FROM orders o
LEFT JOIN order_recipients r ON o.recipient_id = r.id
LEFT JOIN shipping_addresses sa ON o.address_id = sa.id;

-- Indexes for fast order detail lookups
CREATE INDEX idx_order_details_view_id 
    ON order_details_view (id);

CREATE INDEX idx_order_details_view_order_number 
    ON order_details_view (order_number);


-- ============================================================================
-- REFRESH FUNCTION
-- ============================================================================
-- Function to refresh all order views after mutations
-- Called by triggers on orders, order_items, order_shipments, order_cancellations
CREATE OR REPLACE FUNCTION refresh_order_views()
RETURNS TRIGGER AS $$
BEGIN
    -- Refresh all materialized views
    REFRESH MATERIALIZED VIEW CONCURRENTLY buyer_orders_view;
    REFRESH MATERIALIZED VIEW CONCURRENTLY seller_orders_view;
    REFRESH MATERIALIZED VIEW CONCURRENTLY order_details_view;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-refresh views on data changes
-- Note: CONCURRENTLY requires unique indexes (created above)

CREATE TRIGGER trg_refresh_order_views_on_order_change
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_order_views();

CREATE TRIGGER trg_refresh_order_views_on_item_change
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_order_views();

CREATE TRIGGER trg_refresh_order_views_on_shipment_change
AFTER INSERT OR UPDATE OR DELETE ON order_shipments
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_order_views();

CREATE TRIGGER trg_refresh_order_views_on_cancellation_change
AFTER INSERT OR UPDATE OR DELETE ON order_cancellations
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_order_views();


-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON MATERIALIZED VIEW buyer_orders_view IS 
'Pre-joined view for buyer order lists. Combines orders with items, variants, sellers, recipients, addresses, shipments, and cancellations.';

COMMENT ON MATERIALIZED VIEW seller_orders_view IS 
'Pre-joined view for seller order lists. Shows orders containing seller products with all related data.';

COMMENT ON MATERIALIZED VIEW order_details_view IS 
'Complete order details view for detail modals and tracking. Includes all relationships and computed fields.';

COMMENT ON FUNCTION refresh_order_views() IS 
'Refreshes all order materialized views. Called automatically by triggers on order-related table changes.';
