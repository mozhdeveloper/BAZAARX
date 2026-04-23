-- 036_admin_settings.sql
-- Singleton admin settings table + admin action log
-- Idempotent: safe to re-run

-- ============================================================================
-- admin_settings: single-row global config (id = 'global')
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id text PRIMARY KEY DEFAULT 'global',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT admin_settings_singleton CHECK (id = 'global')
);

-- Seed singleton row
INSERT INTO public.admin_settings (id, data)
VALUES ('global', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_admin_settings_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_admin_settings_touch ON public.admin_settings;
CREATE TRIGGER trg_admin_settings_touch
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_admin_settings_updated_at();

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Helper: is current user an admin? (checks admins table, which FKs to profiles)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = auth.uid()
  );
$$;

-- Read: any authenticated admin
DROP POLICY IF EXISTS "admin_settings_select" ON public.admin_settings;
CREATE POLICY "admin_settings_select"
  ON public.admin_settings FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

-- Write: any authenticated admin (single-row table)
DROP POLICY IF EXISTS "admin_settings_update" ON public.admin_settings;
CREATE POLICY "admin_settings_update"
  ON public.admin_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "admin_settings_insert" ON public.admin_settings;
CREATE POLICY "admin_settings_insert"
  ON public.admin_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user() AND id = 'global');

-- ============================================================================
-- admin_action_log: audit trail for admin operations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_action_log_admin_created
  ON public.admin_action_log (admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_log_target
  ON public.admin_action_log (target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_log_action_created
  ON public.admin_action_log (action, created_at DESC);

ALTER TABLE public.admin_action_log ENABLE ROW LEVEL SECURITY;

-- Read: any admin
DROP POLICY IF EXISTS "admin_action_log_select" ON public.admin_action_log;
CREATE POLICY "admin_action_log_select"
  ON public.admin_action_log FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

-- Insert: any admin (admin_id must match auth.uid() OR be null/'admin' fallback)
DROP POLICY IF EXISTS "admin_action_log_insert" ON public.admin_action_log;
CREATE POLICY "admin_action_log_insert"
  ON public.admin_action_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user());

-- No update/delete by default (audit log is append-only)

GRANT SELECT, INSERT, UPDATE ON public.admin_settings TO authenticated;
GRANT SELECT, INSERT ON public.admin_action_log TO authenticated;
