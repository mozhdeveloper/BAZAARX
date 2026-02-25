-- ============================================================================
-- FIX: buyer_orders_view Materialized View Refresh Error
-- Created: February 12, 2026
-- Issue: "cannot refresh materialized view 'public.buyer_orders_view' concurrently"
-- 
-- Root Cause: The trigger uses REFRESH MATERIALIZED VIEW CONCURRENTLY but:
--   1. The view might not have a UNIQUE index (required for CONCURRENTLY)
--   2. Or the trigger doesn't handle errors gracefully
--
-- This migration provides multiple fix options. Run the one that fits your needs.
-- ============================================================================

-- ============================================================================
-- OPTION 1: DROP THE PROBLEMATIC TRIGGER (RECOMMENDED - SIMPLEST FIX)
-- This removes the trigger entirely. The view can be refreshed manually or via cron.
-- ============================================================================

-- First, find and drop the trigger on the orders table
DROP TRIGGER IF EXISTS refresh_buyer_orders_view_trigger ON orders;
DROP TRIGGER IF EXISTS trigger_refresh_buyer_orders ON orders;
DROP TRIGGER IF EXISTS tr_refresh_buyer_orders_view ON orders;
DROP TRIGGER IF EXISTS update_buyer_orders_view ON orders;

-- Also drop the trigger function if it only serves this purpose
-- Uncomment the specific function name if you know it:
-- DROP FUNCTION IF EXISTS refresh_buyer_orders_view() CASCADE;
-- DROP FUNCTION IF EXISTS trigger_refresh_buyer_orders_view() CASCADE;


-- ============================================================================
-- OPTION 2: ADD UNIQUE INDEX TO THE MATERIALIZED VIEW
-- This allows CONCURRENTLY to work. Use if you need real-time view updates.
-- Uncomment and adjust the column names based on your view structure.
-- ============================================================================

-- First, check the view structure:
-- SELECT * FROM buyer_orders_view LIMIT 1;

-- Then create a unique index on the primary key column(s):
-- CREATE UNIQUE INDEX IF NOT EXISTS buyer_orders_view_unique_idx 
--   ON buyer_orders_view (order_id);  -- Adjust column name as needed

-- If the view has no natural unique column, you might need to recreate it with one:
-- DROP MATERIALIZED VIEW IF EXISTS buyer_orders_view CASCADE;
-- CREATE MATERIALIZED VIEW buyer_orders_view AS 
--   SELECT ... your view query with a unique column ...
-- WITH DATA;
-- CREATE UNIQUE INDEX buyer_orders_view_unique_idx ON buyer_orders_view (order_id);


-- ============================================================================
-- OPTION 3: RECREATE THE TRIGGER WITH ERROR HANDLING
-- This makes the trigger fault-tolerant - it won't fail if refresh errors occur.
-- ============================================================================

-- Create a safer refresh function that handles errors
CREATE OR REPLACE FUNCTION safe_refresh_buyer_orders_view()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to refresh the materialized view, but don't fail the transaction if it errors
  BEGIN
    -- Use non-concurrent refresh (safer, though briefly locks the view)
    REFRESH MATERIALIZED VIEW buyer_orders_view;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the transaction
    RAISE WARNING 'Failed to refresh buyer_orders_view: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger with the safe function
-- Uncomment to enable:
-- DROP TRIGGER IF EXISTS refresh_buyer_orders_view_trigger ON orders;
-- CREATE TRIGGER refresh_buyer_orders_view_trigger
--   AFTER INSERT OR UPDATE OR DELETE ON orders
--   FOR EACH STATEMENT
--   EXECUTE FUNCTION safe_refresh_buyer_orders_view();


-- ============================================================================
-- OPTION 4: USE NON-CONCURRENT REFRESH IN EXISTING TRIGGER
-- If you have an existing trigger function, modify it to not use CONCURRENTLY
-- ============================================================================

-- Example: If your trigger function is named 'refresh_buyer_orders_view'
-- CREATE OR REPLACE FUNCTION refresh_buyer_orders_view()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   -- Changed from: REFRESH MATERIALIZED VIEW CONCURRENTLY buyer_orders_view;
--   REFRESH MATERIALIZED VIEW buyer_orders_view;  -- Remove CONCURRENTLY
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;


-- ============================================================================
-- DIAGNOSTIC QUERIES - Run these to understand your current setup
-- ============================================================================

-- List all triggers on the orders table:
-- SELECT trigger_name, event_manipulation, action_statement 
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'orders';

-- Check if buyer_orders_view exists and has indexes:
-- SELECT * FROM pg_matviews WHERE matviewname = 'buyer_orders_view';
-- SELECT indexname FROM pg_indexes WHERE tablename = 'buyer_orders_view';

-- View the trigger function source:
-- SELECT prosrc FROM pg_proc WHERE proname = 'your_trigger_function_name';


-- ============================================================================
-- RECOMMENDED: Run this to quickly fix the immediate issue
-- ============================================================================

-- This drops any trigger that might be trying to refresh the view on order insert
DO $$
DECLARE
  trig RECORD;
BEGIN
  FOR trig IN 
    SELECT tgname, tgrelid::regclass AS table_name
    FROM pg_trigger 
    WHERE tgrelid = 'orders'::regclass 
      AND NOT tgisinternal
      AND tgname ILIKE '%buyer%order%view%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', trig.tgname, trig.table_name);
    RAISE NOTICE 'Dropped trigger: % on %', trig.tgname, trig.table_name;
  END LOOP;
END $$;

-- Also try dropping common trigger names
DROP TRIGGER IF EXISTS refresh_buyer_orders_view ON orders;
DROP TRIGGER IF EXISTS tr_buyer_orders_view ON orders;
DROP TRIGGER IF EXISTS buyer_orders_view_refresh ON orders;

-- If the view itself is causing issues (no unique index), consider dropping it
-- and relying on direct queries instead. Uncomment if needed:
-- DROP MATERIALIZED VIEW IF EXISTS buyer_orders_view CASCADE;

-- Trigger cleanup complete

-- ============================================================================
-- SAFE ORDER CREATION FUNCTION
-- This function creates orders with built-in exception handling for triggers
-- ============================================================================

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
  -- Insert the order
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
  
  -- Build result JSON
  SELECT json_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', p_order_number,
    'buyer_id', p_buyer_id
  ) INTO v_result;
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  -- If there's a trigger error (like materialized view), check if order was created anyway
  SELECT id INTO v_order_id 
  FROM public.orders 
  WHERE order_number = p_order_number 
    AND buyer_id = p_buyer_id
  LIMIT 1;
  
  IF v_order_id IS NOT NULL THEN
    -- Order exists despite error - return success
    RETURN json_build_object(
      'success', true,
      'order_id', v_order_id,
      'order_number', p_order_number,
      'buyer_id', p_buyer_id,
      'warning', SQLERRM
    );
  ELSE
    -- Real failure - return error
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_order_safe TO authenticated;

-- Migration complete. Safe order function created.
