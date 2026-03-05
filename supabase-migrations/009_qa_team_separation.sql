-- ============================================================================
-- QA TEAM SEPARATION MIGRATION (REVISED)
-- Run this migration to set up QA team separation from admin approval
-- 
-- Fixes: missing tables, CHECK constraints, FK constraints
-- NOTE: After running this, create the QA user via Supabase Dashboard
--       (see instructions at bottom of file)
-- ============================================================================

-- 1. Add 'qa_team' role to user_roles CHECK constraint
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role = ANY (ARRAY['buyer'::text, 'seller'::text, 'admin'::text, 'qa_team'::text]));

-- 2. Create qa_team_members table
CREATE TABLE IF NOT EXISTS public.qa_team_members (
  id uuid NOT NULL,
  display_name text,
  specialization text,
  is_active boolean NOT NULL DEFAULT true,
  max_concurrent_reviews integer NOT NULL DEFAULT 10,
  permissions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT qa_team_members_pkey PRIMARY KEY (id),
  CONSTRAINT qa_team_members_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id)
);
CREATE INDEX IF NOT EXISTS idx_qa_team_members_active ON public.qa_team_members (is_active) WHERE is_active = true;

-- 3. Add 'accepted' to products.approval_status CHECK
--    (used when admin accepts a listing before QA review)
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_approval_status_check;
ALTER TABLE public.products ADD CONSTRAINT products_approval_status_check
  CHECK (approval_status = ANY (ARRAY['pending'::text, 'accepted'::text, 'approved'::text, 'rejected'::text, 'reclassified'::text]));

-- 4. Add admin tracking columns to product_assessments
--    NOTE: We use existing "assigned_to" column (already refs auth.users) — NOT adding qa_assigned_to
ALTER TABLE public.product_assessments
  ADD COLUMN IF NOT EXISTS admin_accepted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS admin_accepted_by uuid;

-- Add FK for admin_accepted_by → admins (only admins accept listings)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'product_assessments_admin_accepted_by_fkey'
  ) THEN
    ALTER TABLE public.product_assessments
      ADD CONSTRAINT product_assessments_admin_accepted_by_fkey
      FOREIGN KEY (admin_accepted_by) REFERENCES public.admins(id);
  END IF;
END $$;

-- 5. Update assessment status CHECK to include pending_admin_review
ALTER TABLE public.product_assessments DROP CONSTRAINT IF EXISTS product_assessments_status_check;
ALTER TABLE public.product_assessments ADD CONSTRAINT product_assessments_status_check
  CHECK (status = ANY (ARRAY[
    'pending_admin_review'::text, 'pending_digital_review'::text, 'waiting_for_sample'::text,
    'pending_physical_review'::text, 'verified'::text, 'for_revision'::text, 'rejected'::text
  ]));

-- 6. Create qa_review_logs table (audit trail)
--    reviewer_id refs auth.users so both admins and QA can log actions
CREATE TABLE IF NOT EXISTS public.qa_review_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.product_assessments(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  reviewer_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  notes text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT qa_review_logs_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_qa_review_logs_assessment ON public.qa_review_logs (assessment_id);
CREATE INDEX IF NOT EXISTS idx_qa_review_logs_reviewer ON public.qa_review_logs (reviewer_id);

-- 7. Fix FK constraints on product_approvals, product_rejections, product_revisions
--    Change created_by FK from admins(id) → auth.users(id) so QA team members can also create records

-- product_approvals
ALTER TABLE public.product_approvals DROP CONSTRAINT IF EXISTS product_approvals_created_by_fkey;
ALTER TABLE public.product_approvals
  ADD CONSTRAINT product_approvals_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- product_rejections
ALTER TABLE public.product_rejections DROP CONSTRAINT IF EXISTS product_rejections_created_by_fkey;
ALTER TABLE public.product_rejections
  ADD CONSTRAINT product_rejections_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- product_revisions
ALTER TABLE public.product_revisions DROP CONSTRAINT IF EXISTS product_revisions_created_by_fkey;
ALTER TABLE public.product_revisions
  ADD CONSTRAINT product_revisions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- product_assessment_logistics (same issue)
ALTER TABLE public.product_assessment_logistics DROP CONSTRAINT IF EXISTS product_assessment_logistics_created_by_fkey;
ALTER TABLE public.product_assessment_logistics
  ADD CONSTRAINT product_assessment_logistics_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- 8. RLS: Enable RLS on new tables
ALTER TABLE public.qa_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_review_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read qa_team_members
DROP POLICY IF EXISTS qa_team_members_select ON public.qa_team_members;
CREATE POLICY qa_team_members_select ON public.qa_team_members
  FOR SELECT TO authenticated USING (true);

-- QA team members can update their own record
DROP POLICY IF EXISTS qa_team_members_update_own ON public.qa_team_members;
CREATE POLICY qa_team_members_update_own ON public.qa_team_members
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- QA team can read all review logs
DROP POLICY IF EXISTS qa_review_logs_select ON public.qa_review_logs;
CREATE POLICY qa_review_logs_select ON public.qa_review_logs
  FOR SELECT TO authenticated USING (true);

-- Authenticated users can insert review logs
DROP POLICY IF EXISTS qa_review_logs_insert ON public.qa_review_logs;
CREATE POLICY qa_review_logs_insert ON public.qa_review_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- AFTER RUNNING THIS MIGRATION:
--
-- Step 1: Create a QA user in Supabase Auth
--   Go to Supabase Dashboard → Authentication → Users → Add User
--   Email: qa@gmail.com
--   Password: password
--   (Or any credentials you prefer)
--
-- Step 2: Once the user is created, note the user's UUID from the dashboard
--   Then run these SQL statements (replace 'THE_QA_USER_UUID' with actual UUID):
--
--   -- Create profile
--   INSERT INTO public.profiles (id, email, first_name, last_name)
--   VALUES ('THE_QA_USER_UUID', 'qa@gmail.com', 'QA', 'Team')
--   ON CONFLICT (id) DO NOTHING;
--
--   -- Create user_role
--   INSERT INTO public.user_roles (user_id, role)
--   VALUES ('THE_QA_USER_UUID', 'qa_team')
--   ON CONFLICT DO NOTHING;
--
--   -- Create qa_team_members record
--   INSERT INTO public.qa_team_members (id, display_name, specialization, is_active)
--   VALUES ('THE_QA_USER_UUID', 'QA Team Member', 'digital_review', true);
--
-- ============================================================================
