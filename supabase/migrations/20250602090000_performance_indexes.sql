-- Performance Indexes Migration
-- Verified against the real BAZAAR database schema (2026-03-02).
-- All columns below confirmed to exist.

-- ============================================================
-- ORDERS
-- ============================================================

-- Buyer order listing (sorted by date)
CREATE INDEX IF NOT EXISTS idx_orders_buyer_created
  ON orders (buyer_id, created_at DESC);

-- Filter by shipment status (seller/admin dashboards)
CREATE INDEX IF NOT EXISTS idx_orders_shipment_status
  ON orders (shipment_status);

-- Filter by payment status
CREATE INDEX IF NOT EXISTS idx_orders_payment_status
  ON orders (payment_status);

-- ============================================================
-- ORDER_ITEMS
-- ============================================================

-- Join on order_id for order detail loading
CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON order_items (order_id);

-- Sold count aggregation by product
CREATE INDEX IF NOT EXISTS idx_order_items_product_id
  ON order_items (product_id);

-- ============================================================
-- PRODUCTS
-- ============================================================

-- Active product filtering (shop/browse)
CREATE INDEX IF NOT EXISTS idx_products_active_approved
  ON products (approval_status)
  WHERE deleted_at IS NULL;

-- Seller product listing
CREATE INDEX IF NOT EXISTS idx_products_seller_id
  ON products (seller_id);

-- Category browsing
CREATE INDEX IF NOT EXISTS idx_products_category_id
  ON products (category_id);

-- ============================================================
-- PRODUCT_IMAGES: Primary image lookup per product
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_product_images_product_primary
  ON product_images (product_id, is_primary);

-- ============================================================
-- PRODUCT_VARIANTS: Stock checks and variant listing
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id
  ON product_variants (product_id);

-- ============================================================
-- CART_ITEMS: Cart loading
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id
  ON cart_items (cart_id);

-- ============================================================
-- REVIEWS: Review aggregation per product
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_reviews_product_id
  ON reviews (product_id);

-- ============================================================
-- DISCOUNT_CAMPAIGNS: Active campaign lookup
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_discount_campaigns_active
  ON discount_campaigns (status, starts_at, ends_at);

-- ============================================================
-- PRODUCT_DISCOUNTS: Discount lookup by product and campaign
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_product_discounts_product_id
  ON product_discounts (product_id);

CREATE INDEX IF NOT EXISTS idx_product_discounts_campaign_id
  ON product_discounts (campaign_id);

-- ============================================================
-- REFUND_RETURN_PERIODS: Return period lookup by order
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_refund_return_periods_order_id
  ON refund_return_periods (order_id);

-- ============================================================
-- ORDER_STATUS_HISTORY: Status history per order
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id
  ON order_status_history (order_id);

-- ============================================================
-- CONVERSATIONS: Buyer conversation listing
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id
  ON conversations (buyer_id);

-- ============================================================
-- MESSAGES: Chat message loading by conversation
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON messages (conversation_id, created_at);

-- ============================================================
-- NOTIFICATIONS: Buyer & seller notification feeds
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_buyer_notifications_buyer_id
  ON buyer_notifications (buyer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seller_notifications_seller_id
  ON seller_notifications (seller_id, created_at DESC);

-- ============================================================
-- STORE_FOLLOWERS: Follow lookups
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_store_followers_seller_id
  ON store_followers (seller_id);

CREATE INDEX IF NOT EXISTS idx_store_followers_buyer_id
  ON store_followers (buyer_id);
