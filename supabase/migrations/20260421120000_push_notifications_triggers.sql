-- =============================================================================
-- Push Notifications: auto-dispatch on buyer/seller notification insert
--
-- When a row is inserted into buyer_notifications or seller_notifications,
-- we asynchronously POST to the `send-push-notification` Edge Function which
-- looks up the user's push_tokens and delivers via the Expo Push API
-- (Expo proxies to APNs on iOS and FCM on Android).
--
-- Requires:
--   - extension `pg_net`              (enabled below if missing)
--   - GUC `app.settings.supabase_url` set to your project URL
--   - GUC `app.settings.service_role_key` set to your service role key
--     (Set both via Supabase dashboard → Database → Settings → Custom config,
--      or `ALTER DATABASE postgres SET app.settings.x = '...';`)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Helper: fire-and-forget HTTP call to the edge function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._dispatch_push_notification(
  p_user_id   uuid,
  p_title     text,
  p_body      text,
  p_type      text,
  p_data      jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url            text;
  v_service_key    text;
  v_payload        jsonb;
BEGIN
  -- Skip silently if config is missing (so inserts never fail)
  BEGIN
    v_url         := current_setting('app.settings.supabase_url', true);
    v_service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    RETURN;
  END;

  IF v_url IS NULL OR v_url = '' OR v_service_key IS NULL OR v_service_key = '' THEN
    RETURN;
  END IF;

  v_payload := jsonb_build_object(
    'userId', p_user_id,
    'title',  p_title,
    'body',   p_body,
    'data',   COALESCE(p_data, '{}'::jsonb) || jsonb_build_object('type', p_type)
  );

  PERFORM net.http_post(
    url     := v_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body    := v_payload,
    timeout_milliseconds := 5000
  );
EXCEPTION WHEN OTHERS THEN
  -- Never break the originating insert because of push-side failures
  RAISE WARNING '[push] dispatch failed for user %: %', p_user_id, SQLERRM;
END;
$$;

-- ---------------------------------------------------------------------------
-- Buyer notifications trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._buyer_notification_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- buyers.id == profiles.id == push_tokens.user_id
  PERFORM public._dispatch_push_notification(
    NEW.buyer_id,
    NEW.title,
    NEW.message,
    COALESCE(NEW.type, 'notification'),
    COALESCE(NEW.action_data, '{}'::jsonb)
      || jsonb_build_object('notificationId', NEW.id, 'actionUrl', NEW.action_url)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_buyer_notifications_push ON public.buyer_notifications;
CREATE TRIGGER trg_buyer_notifications_push
AFTER INSERT ON public.buyer_notifications
FOR EACH ROW EXECUTE FUNCTION public._buyer_notification_push();

-- ---------------------------------------------------------------------------
-- Seller notifications trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._seller_notification_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.seller_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- sellers.id == profiles.id == push_tokens.user_id
  PERFORM public._dispatch_push_notification(
    NEW.seller_id,
    NEW.title,
    NEW.message,
    COALESCE(NEW.type, 'seller_notification'),
    COALESCE(NEW.action_data, '{}'::jsonb)
      || jsonb_build_object('notificationId', NEW.id, 'actionUrl', NEW.action_url)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seller_notifications_push ON public.seller_notifications;
CREATE TRIGGER trg_seller_notifications_push
AFTER INSERT ON public.seller_notifications
FOR EACH ROW EXECUTE FUNCTION public._seller_notification_push();

-- ---------------------------------------------------------------------------
-- Helpful index for token lookup by user
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens (user_id);
