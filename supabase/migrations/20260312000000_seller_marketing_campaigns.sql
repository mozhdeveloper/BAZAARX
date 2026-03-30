-- ============================================================================
-- Migration: Add seller_id to marketing_campaigns + seller RLS policies
-- Description: Enables sellers to create and manage their own marketing campaigns
-- ============================================================================

-- 1. Add seller_id column to marketing_campaigns
ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.sellers(id);

-- 2. Make created_by nullable (sellers aren't in admins table)
ALTER TABLE public.marketing_campaigns
  ALTER COLUMN created_by DROP NOT NULL;

-- 3. Drop the admin-only FK constraint if it exists, re-add it as nullable
ALTER TABLE public.marketing_campaigns
  DROP CONSTRAINT IF EXISTS marketing_campaigns_created_by_fkey;

-- 4. Index for seller campaign lookups
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_seller
  ON public.marketing_campaigns (seller_id, created_at DESC)
  WHERE seller_id IS NOT NULL;

-- 5. RLS policy: Sellers can manage their own campaigns
CREATE POLICY "Sellers can manage own campaigns"
  ON public.marketing_campaigns
  FOR ALL
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- 6. Allow sellers to read active email templates (for template browsing)
CREATE POLICY "Sellers can view active email templates"
  ON public.email_templates
  FOR SELECT
  USING (is_active = true);
