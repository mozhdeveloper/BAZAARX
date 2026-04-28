-- =====================================================================
-- 042_p0_transactional_hardening.sql
-- Purpose: P0 fixes from the database engineer audit.
--   1. Add transactional tables to supabase_realtime publication.
--   2. Create inventory_movements ledger + decrement_stock_atomic RPC.
--   3. Add nullable address/recipient snapshot jsonb columns to orders
--      with a BEFORE INSERT/UPDATE trigger that auto-populates them
--      from shipping_addresses / order_recipients (no app code change).
--   4. Backfill snapshots for existing orders.
--
-- Safety:
--   * 100% additive. No DROP, no NOT NULL, no destructive ALTER.
--   * All operations idempotent (IF NOT EXISTS / CREATE OR REPLACE /
--     guarded DO blocks) so re-running is safe.
--   * RLS untouched (per current scope).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Realtime publication: add transactional tables (idempotent)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'orders',
    'order_items',
    'order_shipments',
    'order_status_history',
    'order_events',
    'payment_transactions',
    'seller_payouts',
    'refund_return_periods',
    'return_messages',
    'buyer_notifications',
    'seller_notifications',
    'admin_notifications'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Skip if table missing
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relkind = 'r'
    ) THEN
      RAISE NOTICE '[042] skipping realtime add: table public.% missing', t;
      CONTINUE;
    END IF;

    -- Skip if already in publication
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      RAISE NOTICE '[042] realtime: public.% already in supabase_realtime', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    RAISE NOTICE '[042] realtime: added public.%', t;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 2. Inventory ledger + atomic decrement RPC
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  delta integer NOT NULL,
  reason text NOT NULL CHECK (reason IN (
    'order','order_cancel','restock','adjustment',
    'return','pos_sale','pos_refund','manual'
  )),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_variant_created
  ON public.inventory_movements (variant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_order
  ON public.inventory_movements (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_created
  ON public.inventory_movements (product_id, created_at DESC) WHERE product_id IS NOT NULL;

COMMENT ON TABLE public.inventory_movements IS
  'Append-only stock change ledger. Every mutation of product_variants.stock should write a row here via decrement_stock_atomic / increment_stock RPC.';

-- Atomic, race-safe stock decrement.
-- Returns the new stock level. Raises 'INSUFFICIENT_STOCK' if not enough.
CREATE OR REPLACE FUNCTION public.decrement_stock_atomic(
  p_variant_id uuid,
  p_qty integer,
  p_order_id uuid DEFAULT NULL,
  p_reason text DEFAULT 'order',
  p_actor_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_stock integer;
  v_product_id uuid;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'INVALID_QTY: qty must be a positive integer'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_reason NOT IN (
    'order','order_cancel','restock','adjustment',
    'return','pos_sale','pos_refund','manual'
  ) THEN
    RAISE EXCEPTION 'INVALID_REASON: %', p_reason USING ERRCODE = 'P0001';
  END IF;

  -- Atomic conditional decrement; returns NULL if not enough stock.
  UPDATE public.product_variants
     SET stock = stock - p_qty,
         updated_at = now()
   WHERE id = p_variant_id
     AND stock >= p_qty
   RETURNING stock, product_id
        INTO v_new_stock, v_product_id;

  IF v_new_stock IS NULL THEN
    -- Either the variant doesn't exist or stock is insufficient.
    IF NOT EXISTS (SELECT 1 FROM public.product_variants WHERE id = p_variant_id) THEN
      RAISE EXCEPTION 'VARIANT_NOT_FOUND: %', p_variant_id USING ERRCODE = 'P0002';
    END IF;
    RAISE EXCEPTION 'INSUFFICIENT_STOCK: variant %, requested %', p_variant_id, p_qty
      USING ERRCODE = 'P0003';
  END IF;

  INSERT INTO public.inventory_movements (
    variant_id, product_id, delta, reason, order_id, actor_id, notes
  ) VALUES (
    p_variant_id, v_product_id, -p_qty, p_reason, p_order_id, p_actor_id, p_notes
  );

  RETURN v_new_stock;
END $$;

-- Symmetric increment (returns, restocks, cancellations).
CREATE OR REPLACE FUNCTION public.increment_stock_atomic(
  p_variant_id uuid,
  p_qty integer,
  p_order_id uuid DEFAULT NULL,
  p_reason text DEFAULT 'restock',
  p_actor_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_stock integer;
  v_product_id uuid;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'INVALID_QTY: qty must be a positive integer'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_reason NOT IN (
    'order','order_cancel','restock','adjustment',
    'return','pos_sale','pos_refund','manual'
  ) THEN
    RAISE EXCEPTION 'INVALID_REASON: %', p_reason USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.product_variants
     SET stock = stock + p_qty,
         updated_at = now()
   WHERE id = p_variant_id
   RETURNING stock, product_id
        INTO v_new_stock, v_product_id;

  IF v_new_stock IS NULL THEN
    RAISE EXCEPTION 'VARIANT_NOT_FOUND: %', p_variant_id USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.inventory_movements (
    variant_id, product_id, delta, reason, order_id, actor_id, notes
  ) VALUES (
    p_variant_id, v_product_id, p_qty, p_reason, p_order_id, p_actor_id, p_notes
  );

  RETURN v_new_stock;
END $$;

GRANT EXECUTE ON FUNCTION public.decrement_stock_atomic(uuid, integer, uuid, text, uuid, text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_stock_atomic(uuid, integer, uuid, text, uuid, text)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 3. orders snapshot columns + auto-populate trigger
-- ---------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_address_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS recipient_snapshot jsonb;

COMMENT ON COLUMN public.orders.shipping_address_snapshot IS
  'Frozen copy of the shipping_addresses row at the time the order was created. Source of truth for invoices/waybills/BIR receipts. Auto-populated by trg_orders_snapshot_refs.';
COMMENT ON COLUMN public.orders.recipient_snapshot IS
  'Frozen copy of the order_recipients row at the time the order was created. Auto-populated by trg_orders_snapshot_refs.';

-- Trigger: on INSERT or when address_id/recipient_id change AND snapshot is NULL,
-- copy the referenced row into the snapshot column. Never overwrites a
-- non-null snapshot (snapshots are immutable once set).
CREATE OR REPLACE FUNCTION public.fn_orders_snapshot_refs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_addr public.shipping_addresses%ROWTYPE;
  v_rec  public.order_recipients%ROWTYPE;
BEGIN
  -- Address snapshot
  IF NEW.shipping_address_snapshot IS NULL AND NEW.address_id IS NOT NULL THEN
    SELECT * INTO v_addr FROM public.shipping_addresses WHERE id = NEW.address_id;
    IF FOUND THEN
      NEW.shipping_address_snapshot := to_jsonb(v_addr);
    END IF;
  END IF;

  -- Recipient snapshot
  IF NEW.recipient_snapshot IS NULL AND NEW.recipient_id IS NOT NULL THEN
    SELECT * INTO v_rec FROM public.order_recipients WHERE id = NEW.recipient_id;
    IF FOUND THEN
      NEW.recipient_snapshot := to_jsonb(v_rec);
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_orders_snapshot_refs ON public.orders;
CREATE TRIGGER trg_orders_snapshot_refs
  BEFORE INSERT OR UPDATE OF address_id, recipient_id
  ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_orders_snapshot_refs();

-- ---------------------------------------------------------------------
-- 4. Backfill snapshots for existing orders (NULL only — never overwrite)
-- ---------------------------------------------------------------------
UPDATE public.orders o
   SET shipping_address_snapshot = to_jsonb(sa.*)
  FROM public.shipping_addresses sa
 WHERE sa.id = o.address_id
   AND o.shipping_address_snapshot IS NULL
   AND o.address_id IS NOT NULL;

UPDATE public.orders o
   SET recipient_snapshot = to_jsonb(r.*)
  FROM public.order_recipients r
 WHERE r.id = o.recipient_id
   AND o.recipient_snapshot IS NULL
   AND o.recipient_id IS NOT NULL;

COMMIT;

-- =====================================================================
-- POST-MIGRATION VERIFICATION
-- (Run manually; do not include in transaction.)
-- =====================================================================
-- SELECT tablename FROM pg_publication_tables
--  WHERE pubname='supabase_realtime' ORDER BY tablename;
--
-- SELECT proname FROM pg_proc
--  WHERE proname IN ('decrement_stock_atomic','increment_stock_atomic','fn_orders_snapshot_refs');
--
-- SELECT count(*) AS orders_total,
--        count(shipping_address_snapshot) AS with_address_snapshot,
--        count(recipient_snapshot) AS with_recipient_snapshot
--   FROM public.orders;
--
-- -- Smoke test (replace UUIDs with real values from your dev data):
-- -- SELECT public.decrement_stock_atomic(
-- --   '00000000-0000-0000-0000-000000000000'::uuid, 1, NULL, 'manual', NULL, 'smoke test'
-- -- );
