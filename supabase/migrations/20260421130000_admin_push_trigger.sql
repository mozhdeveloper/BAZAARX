-- =============================================================================
-- Admin Notifications: auto-dispatch push on INSERT
--
-- Adds the matching trigger for admin_notifications (buyer + seller already
-- handled in 20260421120000_push_notifications_triggers.sql).
-- =============================================================================

CREATE OR REPLACE FUNCTION public._admin_notification_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.admin_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- admins.id == profiles.id == push_tokens.user_id
  PERFORM public._dispatch_push_notification(
    NEW.admin_id,
    NEW.title,
    NEW.message,
    COALESCE(NEW.type, 'admin'),
    COALESCE(NEW.action_data, '{}'::jsonb)
      || jsonb_build_object(
        'notificationId', NEW.id,
        'actionUrl', NEW.action_url,
        'priority', NEW.priority
      )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_notifications_push ON public.admin_notifications;
CREATE TRIGGER trg_admin_notifications_push
AFTER INSERT ON public.admin_notifications
FOR EACH ROW EXECUTE FUNCTION public._admin_notification_push();
