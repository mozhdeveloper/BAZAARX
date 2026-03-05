-- ============================================================================
-- REGISTRY BACKEND INTEGRATION
-- Extends the existing registries and registry_items tables to support
-- the full frontend feature set (privacy, delivery, product snapshots, etc.)
-- and adds RLS policies so buyers can only access their own registries.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extend registries table
-- ----------------------------------------------------------------------------
ALTER TABLE public.registries
  ADD COLUMN IF NOT EXISTS category     TEXT,
  ADD COLUMN IF NOT EXISTS image_url    TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS shared_date  TEXT,
  ADD COLUMN IF NOT EXISTS privacy      TEXT NOT NULL DEFAULT 'link'
    CHECK (privacy IN ('public', 'link', 'private')),
  ADD COLUMN IF NOT EXISTS delivery     JSONB DEFAULT '{"showAddress": false}'::jsonb;

-- ----------------------------------------------------------------------------
-- 2. Extend registry_items table
-- ----------------------------------------------------------------------------
ALTER TABLE public.registry_items
  ALTER COLUMN product_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS product_name     TEXT,
  ADD COLUMN IF NOT EXISTS product_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS is_most_wanted   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS received_qty     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requested_qty    INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS selected_variant JSONB;

UPDATE public.registry_items
  SET requested_qty = quantity_desired
  WHERE requested_qty = 1 AND quantity_desired > 1;

-- ----------------------------------------------------------------------------
-- 3. RLS Policies for registries
-- ----------------------------------------------------------------------------
CREATE POLICY "Buyers can view own registries"
  ON public.registries FOR SELECT
  USING (buyer_id = auth.uid());

CREATE POLICY "Anyone can view public or link registries"
  ON public.registries FOR SELECT
  USING (privacy IN ('public', 'link'));

CREATE POLICY "Buyers can create registries"
  ON public.registries FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Buyers can update own registries"
  ON public.registries FOR UPDATE
  USING (buyer_id = auth.uid());

CREATE POLICY "Buyers can delete own registries"
  ON public.registries FOR DELETE
  USING (buyer_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 4. RLS Policies for registry_items
-- ----------------------------------------------------------------------------
CREATE POLICY "Buyers can view items in own registries"
  ON public.registry_items FOR SELECT
  USING (
    registry_id IN (
      SELECT id FROM public.registries WHERE buyer_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view items in public or link registries"
  ON public.registry_items FOR SELECT
  USING (
    registry_id IN (
      SELECT id FROM public.registries WHERE privacy IN ('public', 'link')
    )
  );

CREATE POLICY "Buyers can insert items into own registries"
  ON public.registry_items FOR INSERT
  WITH CHECK (
    registry_id IN (
      SELECT id FROM public.registries WHERE buyer_id = auth.uid()
    )
  );

CREATE POLICY "Buyers can update items in own registries"
  ON public.registry_items FOR UPDATE
  USING (
    registry_id IN (
      SELECT id FROM public.registries WHERE buyer_id = auth.uid()
    )
  );

CREATE POLICY "Buyers can delete items from own registries"
  ON public.registry_items FOR DELETE
  USING (
    registry_id IN (
      SELECT id FROM public.registries WHERE buyer_id = auth.uid()
    )
  );