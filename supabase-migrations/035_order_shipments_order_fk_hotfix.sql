-- BX-09 hotfix: restore orders <-> order_shipments relationship for PostgREST embeds.
-- This fixes PGRST200 errors like:
-- "Could not find a relationship between 'orders' and 'order_shipments' in the schema cache".

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'order_shipments'
  ) THEN
    RAISE NOTICE 'order_shipments table does not exist. Skipping hotfix.';
    RETURN;
  END IF;
END $$;

-- Drop policies that may depend on order_id type before ALTER COLUMN TYPE.
-- They will be recreated at the end of this migration.
DROP POLICY IF EXISTS "Buyers can read own order sahipments" ON public.order_shipments;
DROP POLICY IF EXISTS "Buyers can read own order shipments" ON public.order_shipments;
DROP POLICY IF EXISTS "Sellers can read own shipments" ON public.order_shipments;
DROP POLICY IF EXISTS "Sellers can update own shipments" ON public.order_shipments;
DROP POLICY IF EXISTS "Authenticated users can insert shipments" ON public.order_shipments;

DO $$
DECLARE
  v_data_type text;
BEGIN
  SELECT c.data_type
  INTO v_data_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'order_shipments'
    AND c.column_name = 'order_id';

  IF v_data_type IS NULL THEN
    RAISE EXCEPTION 'order_shipments.order_id column does not exist';
  END IF;

  -- 034 initially created order_id as text in some environments.
  -- Convert to uuid so we can add a proper FK and enable relation embeds.
  IF v_data_type IN ('text', 'character varying') THEN
    IF EXISTS (
      SELECT 1
      FROM public.order_shipments s
      WHERE s.order_id IS NULL
         OR btrim(s.order_id) = ''
         OR s.order_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    ) THEN
      RAISE EXCEPTION 'Cannot cast order_shipments.order_id to uuid because non-UUID values exist';
    END IF;

    ALTER TABLE public.order_shipments
      ALTER COLUMN order_id TYPE uuid USING order_id::uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.order_shipments s
    LEFT JOIN public.orders o ON o.id = s.order_id
    WHERE o.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add FK: order_shipments has rows with order_id not found in orders.id';
  END IF;
END $$;

ALTER TABLE public.order_shipments
  ALTER COLUMN order_id SET NOT NULL;

ALTER TABLE public.order_shipments
  DROP CONSTRAINT IF EXISTS order_shipments_order_id_fkey;

ALTER TABLE public.order_shipments
  ADD CONSTRAINT order_shipments_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_order_shipments_order_id
  ON public.order_shipments (order_id);

ALTER TABLE public.order_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can read own order shipments"
  ON public.order_shipments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id::text = public.order_shipments.order_id::text
        AND o.buyer_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Sellers can read own shipments"
  ON public.order_shipments FOR SELECT TO authenticated
  USING (public.order_shipments.seller_id::text = auth.uid()::text);

CREATE POLICY "Sellers can update own shipments"
  ON public.order_shipments FOR UPDATE TO authenticated
  USING (public.order_shipments.seller_id::text = auth.uid()::text)
  WITH CHECK (public.order_shipments.seller_id::text = auth.uid()::text);

CREATE POLICY "Authenticated users can insert shipments"
  ON public.order_shipments FOR INSERT TO authenticated
  WITH CHECK (true);
