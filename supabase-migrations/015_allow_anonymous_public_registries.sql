-- ============================================================================
-- ALLOW ANONYMOUS ACCESS TO PUBLIC REGISTRIES
-- ============================================================================
-- This migration adds policies to allow anonymous users to view public registries.
-- The existing policies already allow viewing public/link registries, but this
-- ensures anonymous (not logged in) users can also access them.

-- Policy: Allow anyone (including anonymous users) to view public and link registries
CREATE POLICY "anonymous_view_public_registries"
  ON public.registries FOR SELECT
  TO anon, authenticated
  USING (
    privacy IN ('public', 'link')
  );

-- Policy: Allow anyone (including anonymous users) to view items in public/link registries
CREATE POLICY "anonymous_view_public_registry_items"
  ON public.registry_items FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.registries
      WHERE registries.id = registry_items.registry_id
      AND registries.privacy IN ('public', 'link')
    )
  );
