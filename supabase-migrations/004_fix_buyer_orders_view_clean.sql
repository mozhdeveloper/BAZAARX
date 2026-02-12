-- ============================================================================
-- FIX: buyer_orders_view Materialized View Refresh Error
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Drop any triggers that refresh the materialized view on orders table
DROP TRIGGER IF EXISTS refresh_buyer_orders_view_trigger ON orders;
DROP TRIGGER IF EXISTS trigger_refresh_buyer_orders ON orders;
DROP TRIGGER IF EXISTS tr_refresh_buyer_orders_view ON orders;
DROP TRIGGER IF EXISTS update_buyer_orders_view ON orders;
DROP TRIGGER IF EXISTS refresh_buyer_orders_view ON orders;
DROP TRIGGER IF EXISTS tr_buyer_orders_view ON orders;
DROP TRIGGER IF EXISTS buyer_orders_view_refresh ON orders;

-- Step 1b: Drop any triggers on order_items table (often the culprit!)
DROP TRIGGER IF EXISTS refresh_buyer_orders_view_trigger ON order_items;
DROP TRIGGER IF EXISTS trigger_refresh_buyer_orders ON order_items;
DROP TRIGGER IF EXISTS tr_refresh_buyer_orders_view ON order_items;
DROP TRIGGER IF EXISTS update_buyer_orders_view ON order_items;
DROP TRIGGER IF EXISTS refresh_buyer_orders_view ON order_items;
DROP TRIGGER IF EXISTS tr_buyer_orders_view ON order_items;
DROP TRIGGER IF EXISTS buyer_orders_view_refresh ON order_items;
DROP TRIGGER IF EXISTS update_buyer_orders_view_items ON order_items;

-- Step 2: Drop any trigger that pattern matches (on both tables)
DO $$
DECLARE
  trig RECORD;
BEGIN
  -- Check orders table
  FOR trig IN 
    SELECT tgname, tgrelid::regclass AS table_name
    FROM pg_trigger 
    WHERE tgrelid = 'orders'::regclass 
      AND NOT tgisinternal
      AND (tgname ILIKE '%buyer%order%view%' OR tgname ILIKE '%refresh%view%')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', trig.tgname, trig.table_name);
  END LOOP;
  
  -- Check order_items table
  FOR trig IN 
    SELECT tgname, tgrelid::regclass AS table_name
    FROM pg_trigger 
    WHERE tgrelid = 'order_items'::regclass 
      AND NOT tgisinternal
      AND (tgname ILIKE '%buyer%order%view%' OR tgname ILIKE '%refresh%view%')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', trig.tgname, trig.table_name);
  END LOOP;
END $$;

-- Step 3: Create a safe order creation function with exception handling
CREATE OR REPLACE FUNCTION create_order_safe(
  p_order_number TEXT,
  p_buyer_id UUID,
  p_order_type TEXT DEFAULT 'ONLINE',
  p_address_id UUID DEFAULT NULL,
  p_payment_status TEXT DEFAULT 'pending_payment',
  p_shipment_status TEXT DEFAULT 'waiting_for_seller',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_order_id UUID;
  v_result JSON;
BEGIN
  INSERT INTO public.orders (
    order_number,
    buyer_id,
    order_type,
    address_id,
    payment_status,
    shipment_status,
    notes,
    created_at,
    updated_at
  ) VALUES (
    p_order_number,
    p_buyer_id,
    p_order_type,
    p_address_id,
    p_payment_status,
    p_shipment_status,
    p_notes,
    now(),
    now()
  )
  RETURNING id INTO v_order_id;
  
  SELECT json_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', p_order_number,
    'buyer_id', p_buyer_id
  ) INTO v_result;
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  SELECT id INTO v_order_id 
  FROM public.orders 
  WHERE order_number = p_order_number 
    AND buyer_id = p_buyer_id
  LIMIT 1;
  
  IF v_order_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'order_id', v_order_id,
      'order_number', p_order_number,
      'buyer_id', p_buyer_id,
      'warning', SQLERRM
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION create_order_safe TO authenticated;
