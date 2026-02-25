-- ============================================================================
-- BazaarX Supabase Database Functions
-- Created: January 15, 2026
-- Description: Custom PL/pgSQL functions for business logic
-- ============================================================================

-- ============================================================================
-- FUNCTION: Create order with items
-- Purpose: Atomically create an order with its line items
-- ============================================================================

CREATE OR REPLACE FUNCTION create_order_with_items(
  p_buyer_id UUID,
  p_seller_id UUID,
  p_order_number TEXT,
  p_buyer_name TEXT,
  p_buyer_email TEXT,
  p_buyer_phone TEXT,
  p_order_type TEXT,
  p_subtotal DECIMAL,
  p_discount_amount DECIMAL,
  p_shipping_cost DECIMAL,
  p_tax_amount DECIMAL,
  p_total_amount DECIMAL,
  p_shipping_address JSONB,
  p_payment_method JSONB,
  p_items JSONB
) RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
BEGIN
  -- Insert order
  INSERT INTO public.orders (
    order_number,
    buyer_id,
    seller_id,
    buyer_name,
    buyer_email,
    buyer_phone,
    order_type,
    subtotal,
    discount_amount,
    shipping_cost,
    tax_amount,
    total_amount,
    shipping_address,
    payment_method
  ) VALUES (
    p_order_number,
    p_buyer_id,
    p_seller_id,
    p_buyer_name,
    p_buyer_email,
    p_buyer_phone,
    p_order_type,
    p_subtotal,
    p_discount_amount,
    p_shipping_cost,
    p_tax_amount,
    p_total_amount,
    p_shipping_address,
    p_payment_method
  )
  RETURNING id INTO v_order_id;
  
  -- Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      product_images,
      sku,
      price,
      original_price,
      quantity,
      subtotal,
      selected_variant,
      personalized_options,
      seller_id,
      seller_name
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      v_item->>'product_name',
      (v_item->'product_images')::TEXT[],
      v_item->>'sku',
      (v_item->>'price')::DECIMAL,
      (v_item->>'original_price')::DECIMAL,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'subtotal')::DECIMAL,
      v_item->'selected_variant',
      v_item->'personalized_options',
      (v_item->>'seller_id')::UUID,
      v_item->>'seller_name'
    );
  END LOOP;
  
  -- Create initial order status history entry
  INSERT INTO public.order_status_history (
    order_id,
    status,
    note,
    changed_by_role,
    metadata
  ) VALUES (
    v_order_id,
    'pending_payment',
    'Order created',
    'system',
    jsonb_build_object('order_type', p_order_type)
  );
  
  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Deduct product stock
-- Purpose: Deduct inventory and create ledger entry atomically
-- ============================================================================

CREATE OR REPLACE FUNCTION deduct_product_stock(
  p_product_id UUID,
  p_quantity INTEGER,
  p_reason TEXT,
  p_reference_id TEXT,
  p_user_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_product_name TEXT;
  v_quantity_before INTEGER;
  v_quantity_after INTEGER;
  v_result JSONB;
BEGIN
  -- Get product info
  SELECT name, stock INTO v_product_name, v_quantity_before
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  
  -- Check if sufficient stock
  IF v_quantity_before < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_quantity_before, p_quantity;
  END IF;
  
  -- Calculate new quantity
  v_quantity_after := v_quantity_before - p_quantity;
  
  -- Update product stock
  UPDATE public.products
  SET stock = v_quantity_after, updated_at = NOW()
  WHERE id = p_product_id;
  
  -- Create ledger entry
  INSERT INTO public.inventory_ledger (
    product_id,
    product_name,
    change_type,
    quantity_before,
    quantity_change,
    quantity_after,
    reason,
    reference_id,
    user_id,
    notes
  ) VALUES (
    p_product_id,
    v_product_name,
    'DEDUCTION',
    v_quantity_before,
    -p_quantity,
    v_quantity_after,
    p_reason,
    p_reference_id,
    p_user_id,
    p_notes
  );
  
  -- Build response
  v_result := jsonb_build_object(
    'product_id', p_product_id,
    'quantity_before', v_quantity_before,
    'quantity_after', v_quantity_after,
    'quantity_deducted', p_quantity,
    'timestamp', NOW()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Add product stock
-- Purpose: Add inventory and create ledger entry
-- ============================================================================

CREATE OR REPLACE FUNCTION add_product_stock(
  p_product_id UUID,
  p_quantity INTEGER,
  p_reason TEXT,
  p_reference_id TEXT,
  p_user_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_product_name TEXT;
  v_quantity_before INTEGER;
  v_quantity_after INTEGER;
  v_result JSONB;
BEGIN
  -- Get product info
  SELECT name, stock INTO v_product_name, v_quantity_before
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  
  -- Calculate new quantity
  v_quantity_after := v_quantity_before + p_quantity;
  
  -- Update product stock
  UPDATE public.products
  SET stock = v_quantity_after, updated_at = NOW()
  WHERE id = p_product_id;
  
  -- Create ledger entry
  INSERT INTO public.inventory_ledger (
    product_id,
    product_name,
    change_type,
    quantity_before,
    quantity_change,
    quantity_after,
    reason,
    reference_id,
    user_id,
    notes
  ) VALUES (
    p_product_id,
    v_product_name,
    'ADDITION',
    v_quantity_before,
    p_quantity,
    v_quantity_after,
    p_reason,
    p_reference_id,
    p_user_id,
    p_notes
  );
  
  -- Build response
  v_result := jsonb_build_object(
    'product_id', p_product_id,
    'quantity_before', v_quantity_before,
    'quantity_after', v_quantity_after,
    'quantity_added', p_quantity,
    'timestamp', NOW()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Update product rating
-- Purpose: Automatically update product rating when reviews are added/updated
-- ============================================================================

CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET 
    rating = COALESCE((
      SELECT AVG(rating)::DECIMAL(2,1)
      FROM public.reviews
      WHERE product_id = NEW.product_id AND is_hidden = FALSE
    ), 0.0),
    review_count = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE product_id = NEW.product_id AND is_hidden = FALSE
    ),
    updated_at = NOW()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_product_rating ON public.reviews;
CREATE TRIGGER trg_update_product_rating
AFTER INSERT OR UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_rating();

-- ============================================================================
-- TRIGGER: Update seller rating
-- Purpose: Automatically update seller rating when reviews are added
-- ============================================================================

CREATE OR REPLACE FUNCTION update_seller_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.sellers
  SET 
    rating = COALESCE((
      SELECT AVG(rating)::DECIMAL(2,1)
      FROM public.reviews
      WHERE seller_id = NEW.seller_id AND is_hidden = FALSE
    ), 0.0),
    updated_at = NOW()
  WHERE id = NEW.seller_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_seller_rating ON public.reviews;
CREATE TRIGGER trg_update_seller_rating
AFTER INSERT OR UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION update_seller_rating();

-- ============================================================================
-- TRIGGER: Check low stock and create alert
-- Purpose: Create alert when product stock falls below threshold
-- ============================================================================

CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock < NEW.low_stock_threshold THEN
    -- Delete previous unacknowledged alerts
    DELETE FROM public.low_stock_alerts
    WHERE product_id = NEW.id AND acknowledged = FALSE;
    
    -- Create new alert
    INSERT INTO public.low_stock_alerts (
      product_id,
      product_name,
      current_stock,
      threshold
    ) VALUES (
      NEW.id,
      NEW.name,
      NEW.stock,
      NEW.low_stock_threshold
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_low_stock ON public.products;
CREATE TRIGGER trg_check_low_stock
AFTER UPDATE OF stock ON public.products
FOR EACH ROW
EXECUTE FUNCTION check_low_stock();

-- ============================================================================
-- TRIGGER: Update order status timestamp
-- Purpose: Update updated_at when order status changes
-- ============================================================================

CREATE OR REPLACE FUNCTION update_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_order_timestamp ON public.orders;
CREATE TRIGGER trg_update_order_timestamp
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION update_order_timestamp();

-- ============================================================================
-- FUNCTION: Get seller sales summary
-- Purpose: Get sales stats for a seller
-- ============================================================================

CREATE OR REPLACE FUNCTION get_seller_sales_summary(p_seller_id UUID)
RETURNS TABLE (
  total_orders BIGINT,
  total_revenue DECIMAL,
  completed_orders BIGINT,
  pending_orders BIGINT,
  average_rating DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT o.id)::BIGINT as total_orders,
    COALESCE(SUM(o.total_amount), 0::DECIMAL)::DECIMAL as total_revenue,
    COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END)::BIGINT as completed_orders,
    COUNT(DISTINCT CASE WHEN o.status IN ('pending_payment', 'processing') THEN o.id END)::BIGINT as pending_orders,
    COALESCE(AVG(s.rating), 0::DECIMAL)::DECIMAL as average_rating
  FROM public.orders o
  LEFT JOIN public.sellers s ON o.seller_id = s.id
  WHERE o.seller_id = p_seller_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Get buyer order summary
-- Purpose: Get order stats for a buyer
-- ============================================================================

CREATE OR REPLACE FUNCTION get_buyer_order_summary(p_buyer_id UUID)
RETURNS TABLE (
  total_orders BIGINT,
  total_spent DECIMAL,
  pending_orders BIGINT,
  completed_orders BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_orders,
    COALESCE(SUM(total_amount), 0::DECIMAL)::DECIMAL as total_spent,
    COUNT(CASE WHEN status IN ('pending_payment', 'processing', 'ready_to_ship') THEN 1 END)::BIGINT as pending_orders,
    COUNT(CASE WHEN status = 'completed' THEN 1 END)::BIGINT as completed_orders
  FROM public.orders
  WHERE buyer_id = p_buyer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Database Functions Created Successfully
-- ============================================================================
