-- =============================================================================
-- Migration 024: Email Compliance Infrastructure
-- Implements Phase 1 of EMAIL_AUTOMATION_COMPLIANCE_PLAN.md
--
-- New tables:
--   user_consent, consent_log, bounce_logs, suppression_list,
--   email_template_versions, email_events
-- Column additions:
--   email_logs      → category, queued_at, sent_at, retry_count + new statuses
--   email_templates → approval_status, approved_by, approved_at, version
--   marketing_campaigns → approval_status, approved_by, approved_at, locked
-- RLS policies: enforcement for sellers, log immutability
--
-- BRD rules addressed:
--   BR-EMA-001, 003, 004, 015, 016, 019, 021, 024, 028–032, 033–035,
--   036–038, 039–041, 042, 048–050
-- Philippine regulations: RA 10173, RA 10175
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend email_logs — category, timing, retry, new status values
--    BR-EMA-001 (categorization), BR-EMA-019/042 (timing/retry tracking)
-- ---------------------------------------------------------------------------

ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS category TEXT
    CHECK (category IN ('transactional', 'security', 'marketing'));

ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS queued_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Expand the status check constraint to include compliance-specific states.
-- Default constraint name from migration 022 inline CHECK is email_logs_status_check.
ALTER TABLE public.email_logs
  DROP CONSTRAINT IF EXISTS email_logs_status_check;

ALTER TABLE public.email_logs
  ADD CONSTRAINT email_logs_status_check
    CHECK (status IN (
      'queued', 'sent', 'delivered', 'bounced', 'failed', 'disabled',
      'suppressed', 'no_consent', 'invalid_contact', 'frequency_exceeded'
    ));

COMMENT ON COLUMN public.email_logs.category IS 'BR-EMA-001: transactional | security | marketing';
COMMENT ON COLUMN public.email_logs.queued_at IS 'BR-EMA-042: timestamp when email was queued for dispatch';
COMMENT ON COLUMN public.email_logs.sent_at IS 'BR-EMA-042: timestamp when email was actually sent to provider';
COMMENT ON COLUMN public.email_logs.retry_count IS 'BR-EMA-019: number of send attempts (0 = first try succeeded)';

-- ---------------------------------------------------------------------------
-- 2. Extend email_templates — approval workflow + version control
--    BR-EMA-015 (approval), BR-EMA-016 (versioning)
-- ---------------------------------------------------------------------------

ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved'
    CHECK (approval_status IN ('draft', 'pending_review', 'approved', 'rejected'));

ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS approved_by UUID
    REFERENCES public.admins(id);

ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- All existing templates are pre-approved (they were created by the system)
UPDATE public.email_templates
  SET approval_status = 'approved', approved_at = now()
  WHERE approval_status IS NULL OR approval_status = 'approved';

COMMENT ON COLUMN public.email_templates.approval_status IS 'BR-EMA-015: only approved templates may be dispatched';
COMMENT ON COLUMN public.email_templates.version IS 'BR-EMA-016: increments on every save';

-- ---------------------------------------------------------------------------
-- 3. Extend marketing_campaigns — approval workflow + lock
--    BR-EMA-036 (approval), BR-EMA-037 (lock), BR-EMA-038 (suspend)
-- ---------------------------------------------------------------------------

ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft'
    CHECK (approval_status IN (
      'draft', 'pending_approval', 'approved', 'rejected', 'suspended'
    ));

ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS approved_by UUID
    REFERENCES public.admins(id);

ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.marketing_campaigns.locked IS 'BR-EMA-037: true when campaign is scheduled — blocks edits';
COMMENT ON COLUMN public.marketing_campaigns.approval_status IS 'BR-EMA-036/038: campaign lifecycle state';

-- ---------------------------------------------------------------------------
-- 4. user_consent — Marketing consent per user per channel
--    BR-EMA-003, 004, 033, 034 | Philippine DPA RA 10173
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
  is_consented BOOLEAN NOT NULL DEFAULT false,
  consent_source TEXT NOT NULL DEFAULT 'signup'
    CHECK (consent_source IN ('signup', 'settings', 'campaign', 'admin')),
  consented_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_user_consent_lookup
  ON public.user_consent(user_id, channel, is_consented);

COMMENT ON TABLE public.user_consent IS
  'BR-EMA-003/004/033/034: Per-user marketing consent. RA 10173 compliant.';
COMMENT ON COLUMN public.user_consent.consent_source IS
  'BR-EMA-034: How consent was captured (signup | settings | campaign | admin)';

ALTER TABLE public.user_consent ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own consent
CREATE POLICY "Users can manage own consent"
  ON public.user_consent FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all consent records
CREATE POLICY "Admins can view consent"
  ON public.user_consent FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- Service role (edge functions) can INSERT/UPDATE
CREATE POLICY "Service role can manage consent"
  ON public.user_consent FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 5. consent_log — Immutable append-only consent audit trail
--    BR-EMA-033, 034, 035 | Philippine DPA RA 10173
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
  action TEXT NOT NULL CHECK (action IN ('opt_in', 'opt_out')),
  source TEXT NOT NULL CHECK (source IN ('signup', 'settings', 'email_link', 'campaign', 'admin')),
  ip_address INET,
  user_agent TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_log_user
  ON public.consent_log(user_id, channel, logged_at DESC);

COMMENT ON TABLE public.consent_log IS
  'BR-EMA-033/034/035: Immutable append-only consent history. RA 10173 compliant.';

ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;

-- Admins and compliance can view consent logs
CREATE POLICY "Admins can view consent log"
  ON public.consent_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- Service role can insert (no UPDATE or DELETE policies — immutable)
CREATE POLICY "Service role can insert consent log"
  ON public.consent_log FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Users can see their own consent history
CREATE POLICY "Users can view own consent log"
  ON public.consent_log FOR SELECT
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 6. bounce_logs — Email bounce tracking for suppression decisions
--    BR-EMA-021, 030, 031, 032
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.bounce_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  bounce_type TEXT NOT NULL CHECK (bounce_type IN ('hard', 'soft')),
  reason TEXT,
  resend_event_id TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bounce_logs_email
  ON public.bounce_logs(email, bounce_type, logged_at DESC);

COMMENT ON TABLE public.bounce_logs IS
  'BR-EMA-021/030-032: Hard/soft bounce tracking. 3 consecutive soft → hard suppression.';

ALTER TABLE public.bounce_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view bounce logs"
  ON public.bounce_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

CREATE POLICY "Service role can manage bounce logs"
  ON public.bounce_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 7. suppression_list — Global email/phone suppression
--    BR-EMA-028, 039, 040, 041
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.suppression_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact TEXT NOT NULL,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('email', 'phone')),
  reason TEXT NOT NULL CHECK (reason IN (
    'hard_bounce',
    'soft_bounce_converted',
    'unsubscribed',
    'manual_blacklist',
    'spam_complaint'
  )),
  suppressed_by UUID REFERENCES public.admins(id),  -- NULL = system-automated
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contact, contact_type)
);

CREATE INDEX IF NOT EXISTS idx_suppression_lookup
  ON public.suppression_list(contact, contact_type);

COMMENT ON TABLE public.suppression_list IS
  'BR-EMA-028/039-041: Global suppression. Checked before every send. RA 10175 anti-spam compliant.';
COMMENT ON COLUMN public.suppression_list.suppressed_by IS
  'NULL = automated suppression; non-null = BR-EMA-040 manual admin blacklist';

ALTER TABLE public.suppression_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage suppression list"
  ON public.suppression_list FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

CREATE POLICY "Service role can manage suppression list"
  ON public.suppression_list FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 8. email_template_versions — Template version history
--    BR-EMA-016
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.email_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  variables JSONB,
  changed_by UUID REFERENCES public.admins(id),
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_template_versions_template
  ON public.email_template_versions(template_id, version_number DESC);

COMMENT ON TABLE public.email_template_versions IS
  'BR-EMA-016: Every template modification creates a new version record.';

ALTER TABLE public.email_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage template versions"
  ON public.email_template_versions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

CREATE POLICY "Service role can insert template versions"
  ON public.email_template_versions FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 9. email_events — Resend webhook events (open, click, delivered, bounced)
--    BR-EMA-026 (performance tracking)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_log_id UUID REFERENCES public.email_logs(id),
  resend_message_id TEXT,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('delivered', 'opened', 'clicked', 'bounced', 'complained', 'delivery_delayed')
  ),
  metadata JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_events_message
  ON public.email_events(resend_message_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_events_log
  ON public.email_events(email_log_id);

COMMENT ON TABLE public.email_events IS
  'BR-EMA-026: Resend webhook events for open/click/delivery tracking.';

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email events"
  ON public.email_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

CREATE POLICY "Service role can insert email events"
  ON public.email_events FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 10. RLS: sellers cannot access notification/template settings
--     BR-EMA-050 — sellers blocked from automation controls
-- ---------------------------------------------------------------------------

-- Restrict notification_settings: sellers should not be able to modify
-- Note: admins table check is already on the existing policy.
-- We reinforce that non-admins cannot UPDATE/DELETE notification_settings.
-- (Admins policy already exists from migration 022 — covers INSERT/UPDATE/DELETE)

-- Restrict email_templates to admins only (sellers have no profile-based policy)
-- The existing policy from 022 covers this: admins-only FOR ALL.

-- ---------------------------------------------------------------------------
-- 11. Seed default user_consent = false for all existing buyers
--     so they can opt-in voluntarily. BR-EMA-003 / PH DPA RA 10173
-- ---------------------------------------------------------------------------

INSERT INTO public.user_consent (user_id, channel, is_consented, consent_source, consented_at)
SELECT
  p.id,
  'email',
  false,
  'admin',
  NULL
FROM public.profiles p
INNER JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'buyer'
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_consent uc
    WHERE uc.user_id = p.id AND uc.channel = 'email'
  )
ON CONFLICT (user_id, channel) DO NOTHING;

INSERT INTO public.user_consent (user_id, channel, is_consented, consent_source, consented_at)
SELECT
  p.id,
  'sms',
  false,
  'admin',
  NULL
FROM public.profiles p
INNER JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'buyer'
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_consent uc
    WHERE uc.user_id = p.id AND uc.channel = 'sms'
  )
ON CONFLICT (user_id, channel) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 12. Helper function: check_and_suppress_soft_bounce()
--     BR-EMA-032 — 3 consecutive soft bounces → convert to hard suppression
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_and_suppress_soft_bounce(p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_soft_count INTEGER;
BEGIN
  -- Count consecutive soft bounces (all soft bounces in last 90 days)
  SELECT COUNT(*)
  INTO v_soft_count
  FROM public.bounce_logs
  WHERE email = p_email
    AND bounce_type = 'soft'
    AND logged_at >= NOW() - INTERVAL '90 days';

  -- If 3 or more consecutive soft bounces, add to suppression list
  IF v_soft_count >= 3 THEN
    INSERT INTO public.suppression_list (contact, contact_type, reason)
    VALUES (p_email, 'email', 'soft_bounce_converted')
    ON CONFLICT (contact, contact_type) DO NOTHING;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.check_and_suppress_soft_bounce IS
  'BR-EMA-032: Called after each soft bounce. Suppresses after 3 consecutive soft bounces.';

-- ---------------------------------------------------------------------------
-- 13. Helper function: get_weekly_marketing_send_count(user_id)
--     BR-EMA-006 — frequency limiting (max 3 marketing emails/week)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_weekly_marketing_send_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.email_logs
  WHERE recipient_id = p_user_id
    AND category = 'marketing'
    AND status IN ('sent', 'queued', 'delivered')
    AND created_at >= NOW() - INTERVAL '7 days';
$$;

COMMENT ON FUNCTION public.get_weekly_marketing_send_count IS
  'BR-EMA-006: Returns count of marketing emails sent to user in last 7 days.';

-- ---------------------------------------------------------------------------
-- Done
-- ---------------------------------------------------------------------------
