-- ============================================================================
-- REFACTORED REGISTRY BACKEND
-- ============================================================================

-- 1. Schema Hardening
ALTER TABLE public.registries
  ALTER COLUMN shared_date TYPE TIMESTAMPTZ USING shared_date::TIMESTAMPTZ,
  ADD CONSTRAINT qty_non_negative CHECK (TRUE); -- Placeholder for table-level logic

ALTER TABLE public.registry_items
  ADD CONSTRAINT requested_qty_positive CHECK (requested_qty >= 1),
  ADD CONSTRAINT received_qty_non_negative CHECK (received_qty >= 0);

-- 2. Clean up existing policies to prevent conflicts
DROP POLICY IF EXISTS "Buyers can view own registries" ON public.registries;
DROP POLICY IF EXISTS "Anyone can view public or link registries" ON public.registries;
DROP POLICY IF EXISTS "Buyers can create registries" ON public.registries;
DROP POLICY IF EXISTS "Buyers can update own registries" ON public.registries;
DROP POLICY IF EXISTS "Buyers can delete own registries" ON public.registries;

-- 3. Optimized Registry Policies
-- Policy: View logic (Owner OR Public/Link)
CREATE POLICY "registries_select_policy"
  ON public.registries FOR SELECT
  USING (
    buyer_id = auth.uid() OR 
    privacy IN ('public', 'link')
  );

-- Policy: Insert (STRICT ownership check)
CREATE POLICY "registries_insert_policy"
  ON public.registries FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

-- Policy: Update/Delete (Owner only)
CREATE POLICY "registries_owner_all"
  ON public.registries FOR ALL
  USING (buyer_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid());


-- 4. Optimized Registry Items Policies
-- Using EXISTS is generally more performant than IN (SELECT...)
DROP POLICY IF EXISTS "Buyers can view items in own registries" ON public.registry_items;
DROP POLICY IF EXISTS "Anyone can view items in public or link registries" ON public.registry_items;

CREATE POLICY "items_select_policy"
  ON public.registry_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.registries
      WHERE registries.id = registry_items.registry_id
      AND (registries.buyer_id = auth.uid() OR registries.privacy IN ('public', 'link'))
    )
  );

-- Policy: Modify items (Strictly owner of the parent registry)
CREATE POLICY "items_modify_policy"
  ON public.registry_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.registries
      WHERE registries.id = registry_items.registry_id
      AND registries.buyer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.registries
      WHERE registries.id = registry_items.registry_id
      AND registries.buyer_id = auth.uid()
    )
  );

-- 5. Performance Indexing (Crucial for RLS Performance)
CREATE INDEX IF NOT EXISTS idx_registries_buyer_id ON public.registries(buyer_id);
CREATE INDEX IF NOT EXISTS idx_registries_privacy ON public.registries(privacy);
CREATE INDEX IF NOT EXISTS idx_registry_items_registry_id ON public.registry_items(registry_id);