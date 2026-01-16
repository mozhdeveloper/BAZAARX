-- ============================================================================
-- BazaarX Supabase Database Rollback Script
-- Created: January 15, 2026
-- Description: Complete rollback to revert all database migrations
-- WARNING: This script will DELETE ALL DATA. Use with extreme caution!
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL TRIGGERS (must be done before dropping functions)
-- ============================================================================

DROP TRIGGER IF EXISTS trg_update_product_rating ON public.reviews;
DROP TRIGGER IF EXISTS trg_update_seller_rating ON public.reviews;
DROP TRIGGER IF EXISTS trg_check_low_stock ON public.products;
DROP TRIGGER IF EXISTS trg_update_order_timestamp ON public.orders;

-- ============================================================================
-- STEP 2: DROP ALL FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS update_product_rating();
DROP FUNCTION IF EXISTS update_seller_rating();
DROP FUNCTION IF EXISTS check_low_stock();
DROP FUNCTION IF EXISTS update_order_timestamp();
DROP FUNCTION IF EXISTS create_order_with_items(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, JSONB, JSONB, JSONB);
DROP FUNCTION IF EXISTS deduct_product_stock(UUID, INTEGER, TEXT, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS add_product_stock(UUID, INTEGER, TEXT, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS get_seller_sales_summary(UUID);
DROP FUNCTION IF EXISTS get_buyer_order_summary(UUID);

-- ============================================================================
-- STEP 3: DISABLE ROW LEVEL SECURITY (must be done before dropping policies)
-- ============================================================================

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_qa DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_usage DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.low_stock_alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: DROP ALL RLS POLICIES
-- ============================================================================

-- Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Buyers
DROP POLICY IF EXISTS "Buyers can view their own data" ON public.buyers;
DROP POLICY IF EXISTS "Buyers can update their own data" ON public.buyers;

-- Sellers
DROP POLICY IF EXISTS "Sellers can view their own data" ON public.sellers;
DROP POLICY IF EXISTS "Sellers can update their own data" ON public.sellers;
DROP POLICY IF EXISTS "Approved sellers are visible to everyone" ON public.sellers;

-- Admins
DROP POLICY IF EXISTS "Admins can view their own data" ON public.admins;

-- Categories
DROP POLICY IF EXISTS "Anyone can view active categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

-- Products
DROP POLICY IF EXISTS "Anyone can view approved products" ON public.products;
DROP POLICY IF EXISTS "Sellers can view their own products" ON public.products;
DROP POLICY IF EXISTS "Sellers can insert their own products" ON public.products;
DROP POLICY IF EXISTS "Sellers can update their own products" ON public.products;
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;

-- Product QA
DROP POLICY IF EXISTS "Sellers can view their own product QA" ON public.product_qa;
DROP POLICY IF EXISTS "Admins can view all product QA" ON public.product_qa;
DROP POLICY IF EXISTS "Admins can manage product QA" ON public.product_qa;

-- Addresses
DROP POLICY IF EXISTS "Users can view their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can manage their own addresses" ON public.addresses;

-- Orders
DROP POLICY IF EXISTS "Buyers can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Sellers can view orders for their products" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;

-- Order Items
DROP POLICY IF EXISTS "Buyers can view their order items" ON public.order_items;
DROP POLICY IF EXISTS "Sellers can view order items for their products" ON public.order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;

-- Order Status History
DROP POLICY IF EXISTS "Buyers can view their order status history" ON public.order_status_history;
DROP POLICY IF EXISTS "Sellers can view status history for their orders" ON public.order_status_history;
DROP POLICY IF EXISTS "Admins can view all status history" ON public.order_status_history;

-- Carts
DROP POLICY IF EXISTS "Buyers can manage their own cart" ON public.carts;

-- Cart Items
DROP POLICY IF EXISTS "Buyers can manage their cart items" ON public.cart_items;

-- Reviews
DROP POLICY IF EXISTS "Anyone can view non-hidden reviews" ON public.reviews;
DROP POLICY IF EXISTS "Buyers can manage their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Sellers can view reviews for their products" ON public.reviews;
DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.reviews;

-- Vouchers
DROP POLICY IF EXISTS "Anyone can view active vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Sellers can view their own vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Admins can manage all vouchers" ON public.vouchers;

-- Voucher Usage
DROP POLICY IF EXISTS "Buyers can view their own voucher usage" ON public.voucher_usage;
DROP POLICY IF EXISTS "Admins can view all voucher usage" ON public.voucher_usage;

-- Inventory Ledger
DROP POLICY IF EXISTS "Sellers can view their product ledger" ON public.inventory_ledger;
DROP POLICY IF EXISTS "Admins can view all ledger entries" ON public.inventory_ledger;
DROP POLICY IF EXISTS "Admins can manage ledger" ON public.inventory_ledger;

-- Low Stock Alerts
DROP POLICY IF EXISTS "Sellers can view alerts for their products" ON public.low_stock_alerts;
DROP POLICY IF EXISTS "Sellers can acknowledge their alerts" ON public.low_stock_alerts;
DROP POLICY IF EXISTS "Admins can view all alerts" ON public.low_stock_alerts;

-- Notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can manage their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- ============================================================================
-- STEP 5: DROP ALL TABLES (in reverse dependency order)
-- ============================================================================

DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.low_stock_alerts;
DROP TABLE IF EXISTS public.inventory_ledger;
DROP TABLE IF EXISTS public.voucher_usage;
DROP TABLE IF EXISTS public.vouchers;
DROP TABLE IF EXISTS public.reviews;
DROP TABLE IF EXISTS public.cart_items;
DROP TABLE IF EXISTS public.carts;
DROP TABLE IF EXISTS public.order_status_history;
DROP TABLE IF EXISTS public.order_items;
DROP TABLE IF EXISTS public.orders;
DROP TABLE IF EXISTS public.addresses;
DROP TABLE IF EXISTS public.product_qa;
DROP TABLE IF EXISTS public.products;
DROP TABLE IF EXISTS public.categories;
DROP TABLE IF EXISTS public.admins;
DROP TABLE IF EXISTS public.sellers;
DROP TABLE IF EXISTS public.buyers;
DROP TABLE IF EXISTS public.profiles;

-- ============================================================================
-- ROLLBACK COMPLETE
-- All tables, functions, triggers, and policies have been removed.
-- The database is now clean and ready for a fresh migration if needed.
-- ============================================================================
