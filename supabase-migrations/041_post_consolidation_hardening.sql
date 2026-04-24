-- ============================================================================
-- Migration: 041_post_consolidation_hardening
-- Purpose:   Patch issues discovered while validating migration 040 against
--            existing application callsites.
--
--   ISSUE A: admin_action_log_view_insert() raises EXCEPTION when admin_id
--            is NULL. Four legacy callers (adminSellersStore.ts x2 with the
--            literal string 'admin', AdminSettings.tsx, returnService.ts)
--            call this best-effort and previously got silent NULLs accepted.
--            Fix: trigger now coerces non-UUID admin_id to NULL, skips the
--            insert when it would FK-violate, and never raises.
--
--   ISSUE B: admin_audit_logs.admin_id FK -> public.admins(id), not
--            auth.users(id). Audit writes from a session whose admin row
--            doesn't exist in public.admins would FK-violate.
--            Fix: trigger pre-checks membership and silently skips if absent.
--
--   ISSUE C: Make seller_payout_accounts deletes safer — clearing fields
--            should only run when the canonical row exists.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- ISSUE A + B: harden the admin_action_log INSTEAD OF INSERT trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_action_log_view_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_uuid  uuid;
  v_target_uuid uuid;
  v_metadata    jsonb;
  v_is_admin    boolean;
BEGIN
  -- Coerce admin_id; reject anything that isn't a real UUID. Legacy callers
  -- sometimes pass the literal string 'admin' as a fallback — treat as NULL.
  IF NEW.admin_id IS NULL THEN
    v_admin_uuid := NULL;
  ELSE
    BEGIN
      v_admin_uuid := NEW.admin_id::uuid;
    EXCEPTION WHEN invalid_text_representation OR datatype_mismatch THEN
      v_admin_uuid := NULL;
    END;
  END IF;

  -- Best-effort semantics: silently skip when we cannot satisfy
  -- admin_audit_logs.admin_id NOT NULL + FK constraints.
  IF v_admin_uuid IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.admins WHERE id = v_admin_uuid)
    INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN NEW;  -- caller is logged in but not an admin — skip audit row
  END IF;

  -- Coerce target_id; archive non-UUID values into metadata.
  IF NEW.target_id IS NOT NULL
     AND NEW.target_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  THEN
    v_target_uuid := NEW.target_id::uuid;
    v_metadata    := COALESCE(NEW.metadata, '{}'::jsonb);
  ELSE
    v_target_uuid := NULL;
    v_metadata    := COALESCE(NEW.metadata, '{}'::jsonb)
                     || CASE WHEN NEW.target_id IS NULL THEN '{}'::jsonb
                             ELSE jsonb_build_object('legacy_target_id', NEW.target_id)
                        END;
  END IF;

  INSERT INTO public.admin_audit_logs
    (id, admin_id, action, target_table, target_id, new_values, created_at)
  VALUES
    (COALESCE(NEW.id, gen_random_uuid()),
     v_admin_uuid,
     NEW.action,
     NEW.target_type,
     v_target_uuid,
     v_metadata,
     COALESCE(NEW.created_at, now()))
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- ISSUE C: harden seller_payout_accounts INSTEAD OF DELETE
-- (no behavior change other than no-op when the canonical row is gone)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seller_payout_accounts_view_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.seller_payout_settings
     SET bank_name           = NULL,
         bank_account_name   = NULL,
         bank_account_number = NULL,
         updated_at          = now()
   WHERE seller_id = OLD.seller_id;
  RETURN OLD;
END;
$$;

COMMIT;

-- ============================================================================
-- POST-DEPLOY VERIFICATION
--
-- 1. The hardened trigger silently no-ops on bad admin_id (no exception):
--      BEGIN;
--        INSERT INTO admin_action_log (admin_id, action, target_type, target_id)
--        VALUES (NULL, 'noop', 'noop', NULL);                  -- skipped
--        INSERT INTO admin_action_log (admin_id, action, target_type, target_id)
--        VALUES ('not-a-uuid', 'noop', 'noop', NULL);          -- skipped
--        INSERT INTO admin_action_log (admin_id, action, target_type, target_id)
--        VALUES ('00000000-0000-0000-0000-000000000000', 'noop', 'noop', NULL); -- skipped (not an admin)
--      ROLLBACK;
--
-- 2. A real admin's audit insert lands in admin_audit_logs:
--      BEGIN;
--        INSERT INTO admin_action_log (admin_id, action, target_type, target_id)
--        SELECT id, 'verify', 'noop', NULL FROM public.admins LIMIT 1;
--        SELECT count(*) FROM admin_audit_logs WHERE action = 'verify';
--      ROLLBACK;
-- ============================================================================
