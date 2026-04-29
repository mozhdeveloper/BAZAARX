-- =====================================================================
-- 050_fix_order_payments_rls.sql
-- Purpose: Add missing RLS SELECT policy on order_payments so buyers can
--          read their own payment records. Without this, all embedded
--          Supabase queries for order_payments return empty, causing the
--          payment method to fall back to "Cash on Delivery" in the UI.
--
-- Root cause: 000_new_database enabled RLS on order_payments but never
--             created any policies. Default deny = buyers see nothing.
-- =====================================================================

-- Buyer: read own order_payments (joined through orders.buyer_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'order_payments'
      AND policyname = 'buyers_can_view_own_order_payments'
  ) THEN
    CREATE POLICY "buyers_can_view_own_order_payments"
      ON public.order_payments
      FOR SELECT
      TO authenticated
      USING (
        order_id IN (
          SELECT id FROM public.orders WHERE buyer_id = auth.uid()
        )
      );
    RAISE NOTICE '[050] created buyers_can_view_own_order_payments policy';
  ELSE
    RAISE NOTICE '[050] buyers_can_view_own_order_payments already exists';
  END IF;
END $$;

-- Seller: read order_payments for orders containing their products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'order_payments'
      AND policyname = 'sellers_can_view_related_order_payments'
  ) THEN
    CREATE POLICY "sellers_can_view_related_order_payments"
      ON public.order_payments
      FOR SELECT
      TO authenticated
      USING (
        order_id IN (
          SELECT DISTINCT oi.order_id
          FROM public.order_items oi
          JOIN public.products p ON p.id = oi.product_id
          WHERE p.seller_id = auth.uid()
        )
      );
    RAISE NOTICE '[050] created sellers_can_view_related_order_payments policy';
  ELSE
    RAISE NOTICE '[050] sellers_can_view_related_order_payments already exists';
  END IF;
END $$;

-- Service role (admins) already bypass RLS; no extra policy needed.
