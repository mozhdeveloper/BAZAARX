-- ============================================================================
-- BazaarX Supabase Row Level Security (RLS) Policies
-- Created: January 15, 2026
-- Description: RLS policies for data access control
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_qa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.low_stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- BUYERS POLICIES
-- ============================================================================

CREATE POLICY "Buyers can view their own data"
  ON public.buyers FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Buyers can update their own data"
  ON public.buyers FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- SELLERS POLICIES
-- ============================================================================

CREATE POLICY "Sellers can view their own data"
  ON public.sellers FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Sellers can update their own data"
  ON public.sellers FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Approved sellers are visible to everyone"
  ON public.sellers FOR SELECT
  USING (approval_status = 'approved');

-- ============================================================================
-- ADMINS POLICIES
-- ============================================================================

CREATE POLICY "Admins can view their own data"
  ON public.admins FOR SELECT
  USING (auth.uid() = id);

-- ============================================================================
-- CATEGORIES POLICIES
-- ============================================================================

CREATE POLICY "Anyone can view active categories"
  ON public.categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- PRODUCTS POLICIES
-- ============================================================================

CREATE POLICY "Anyone can view approved products"
  ON public.products FOR SELECT
  USING (approval_status = 'approved' AND is_active = true);

CREATE POLICY "Sellers can view their own products"
  ON public.products FOR SELECT
  USING (seller_id IN (
    SELECT id FROM public.sellers WHERE id = auth.uid()
  ));

CREATE POLICY "Sellers can insert their own products"
  ON public.products FOR INSERT
  WITH CHECK (seller_id IN (
    SELECT id FROM public.sellers WHERE id = auth.uid()
  ));

CREATE POLICY "Sellers can update their own products"
  ON public.products FOR UPDATE
  USING (seller_id IN (
    SELECT id FROM public.sellers WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can view all products"
  ON public.products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all products"
  ON public.products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- PRODUCT QA POLICIES
-- ============================================================================

CREATE POLICY "Sellers can view their own product QA"
  ON public.product_qa FOR SELECT
  USING (
    product_id IN (
      SELECT id FROM public.products 
      WHERE seller_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all product QA"
  ON public.product_qa FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage product QA"
  ON public.product_qa FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- ADDRESSES POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own addresses"
  ON public.addresses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own addresses"
  ON public.addresses FOR ALL
  USING (user_id = auth.uid());

-- ============================================================================
-- ORDERS POLICIES
-- ============================================================================

CREATE POLICY "Buyers can view their own orders"
  ON public.orders FOR SELECT
  USING (buyer_id IN (
    SELECT id FROM public.buyers WHERE id = auth.uid()
  ));

CREATE POLICY "Sellers can view orders for their products"
  ON public.orders FOR SELECT
  USING (seller_id IN (
    SELECT id FROM public.sellers WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all orders"
  ON public.orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- ORDER ITEMS POLICIES
-- ============================================================================

CREATE POLICY "Buyers can view their order items"
  ON public.order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders 
      WHERE buyer_id = (SELECT id FROM public.buyers WHERE id = auth.uid())
    )
  );

CREATE POLICY "Sellers can view order items for their products"
  ON public.order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders 
      WHERE seller_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- ORDER STATUS HISTORY POLICIES
-- ============================================================================

CREATE POLICY "Buyers can view their order status history"
  ON public.order_status_history FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders 
      WHERE buyer_id = (SELECT id FROM public.buyers WHERE id = auth.uid())
    )
  );

CREATE POLICY "Sellers can view status history for their orders"
  ON public.order_status_history FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders 
      WHERE seller_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all status history"
  ON public.order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- CARTS POLICIES
-- ============================================================================

CREATE POLICY "Buyers can manage their own cart"
  ON public.carts FOR ALL
  USING (buyer_id IN (
    SELECT id FROM public.buyers WHERE id = auth.uid()
  ));

-- ============================================================================
-- CART ITEMS POLICIES
-- ============================================================================

CREATE POLICY "Buyers can manage their cart items"
  ON public.cart_items FOR ALL
  USING (
    cart_id IN (
      SELECT id FROM public.carts 
      WHERE buyer_id = (SELECT id FROM public.buyers WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- REVIEWS POLICIES
-- ============================================================================

CREATE POLICY "Anyone can view non-hidden reviews"
  ON public.reviews FOR SELECT
  USING (is_hidden = false);

CREATE POLICY "Buyers can manage their own reviews"
  ON public.reviews FOR ALL
  USING (buyer_id IN (
    SELECT id FROM public.buyers WHERE id = auth.uid()
  ));

CREATE POLICY "Sellers can view reviews for their products"
  ON public.reviews FOR SELECT
  USING (seller_id IN (
    SELECT id FROM public.sellers WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage all reviews"
  ON public.reviews FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- VOUCHERS POLICIES
-- ============================================================================

CREATE POLICY "Anyone can view active vouchers"
  ON public.vouchers FOR SELECT
  USING (is_active = true AND valid_from <= NOW() AND valid_to >= NOW());

CREATE POLICY "Sellers can view their own vouchers"
  ON public.vouchers FOR SELECT
  USING (seller_id = auth.uid() OR seller_id IS NULL);

CREATE POLICY "Admins can manage all vouchers"
  ON public.vouchers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- VOUCHER USAGE POLICIES
-- ============================================================================

CREATE POLICY "Buyers can view their own voucher usage"
  ON public.voucher_usage FOR SELECT
  USING (buyer_id IN (
    SELECT id FROM public.buyers WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can view all voucher usage"
  ON public.voucher_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- INVENTORY LEDGER POLICIES
-- ============================================================================

CREATE POLICY "Sellers can view their product ledger"
  ON public.inventory_ledger FOR SELECT
  USING (
    product_id IN (
      SELECT id FROM public.products 
      WHERE seller_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all ledger entries"
  ON public.inventory_ledger FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage ledger"
  ON public.inventory_ledger FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- LOW STOCK ALERTS POLICIES
-- ============================================================================

CREATE POLICY "Sellers can view alerts for their products"
  ON public.low_stock_alerts FOR SELECT
  USING (
    product_id IN (
      SELECT id FROM public.products 
      WHERE seller_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can acknowledge their alerts"
  ON public.low_stock_alerts FOR UPDATE
  USING (
    product_id IN (
      SELECT id FROM public.products 
      WHERE seller_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all alerts"
  ON public.low_stock_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- RLS Policies Applied Successfully
-- ============================================================================
