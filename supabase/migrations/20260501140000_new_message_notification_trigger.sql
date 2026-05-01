-- ============================================================
-- Migration: new_message_notification_trigger
-- Created:   2026-05-01
--
-- When a buyer or seller sends a chat message, automatically
-- insert a row into buyer_notifications (if seller sent) or
-- seller_notifications (if buyer sent).
--
-- The existing Supabase Realtime subscriptions in:
--   web:    useGlobalOrderNotifications  (web/src/hooks/)
--   mobile: useGlobalNotifications       (mobile-app/src/hooks/)
-- already listen for ANY insert on these tables and fire
-- in-app toast / local push notification immediately.
--
-- HOW TO APPLY:
--   Paste this entire file into Supabase Dashboard → SQL Editor → Run
-- ============================================================

CREATE OR REPLACE FUNCTION public._notify_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id          uuid;
  v_seller_id         uuid;
  v_store_name        text;
  v_buyer_name        text;
  v_content_preview   text;
  v_has_recent_notif  boolean;
BEGIN
  -- ── Skip non-user messages ────────────────────────────────────────────
  IF NEW.sender_type = 'system' OR NEW.sender_type IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.sender_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- ── Build a readable content preview (max 80 chars) ──────────────────
  IF NEW.media_type IS NOT NULL THEN
    v_content_preview := CASE NEW.media_type
      WHEN 'image'    THEN '📷 Sent a photo'
      WHEN 'video'    THEN '🎬 Sent a video'
      WHEN 'document' THEN '📄 Sent a document'
      ELSE                 'Sent a file'
    END;
  ELSE
    v_content_preview := LEFT(COALESCE(NEW.content, NEW.message_content, ''), 80);
    IF CHAR_LENGTH(COALESCE(NEW.content, NEW.message_content, '')) > 80 THEN
      v_content_preview := v_content_preview || '…';
    END IF;
  END IF;

  -- Fallback if content is empty (e.g. pure media message)
  IF v_content_preview = '' THEN
    v_content_preview := 'Sent you a message';
  END IF;

  -- ══════════════════════════════════════════════════════════════════════
  -- SELLER sends → notify BUYER
  -- ══════════════════════════════════════════════════════════════════════
  IF NEW.sender_type = 'seller' THEN

    -- Get buyer_id from conversation
    SELECT c.buyer_id INTO v_buyer_id
    FROM public.conversations c
    WHERE c.id = NEW.conversation_id;

    IF v_buyer_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Get seller's store name for the notification header
    SELECT s.store_name INTO v_store_name
    FROM public.sellers s
    WHERE s.id = NEW.sender_id;

    v_store_name := COALESCE(NULLIF(TRIM(v_store_name), ''), 'Seller');

    -- Rate-limit: don't spam if another notification for this conversation
    -- was already created in the last 60 seconds.
    SELECT EXISTS (
      SELECT 1 FROM public.buyer_notifications
      WHERE buyer_id  = v_buyer_id
        AND type      = 'new_message'
        AND (action_data->>'conversation_id') = NEW.conversation_id::text
        AND created_at > now() - INTERVAL '60 seconds'
    ) INTO v_has_recent_notif;

    IF NOT v_has_recent_notif THEN
      INSERT INTO public.buyer_notifications (
        buyer_id, type, title, message,
        action_url, action_data, priority
      ) VALUES (
        v_buyer_id,
        'new_message',
        '💬 ' || v_store_name,
        v_content_preview,
        '/messages',
        jsonb_build_object(
          'conversation_id', NEW.conversation_id::text,
          'sender_id',       NEW.sender_id::text
        ),
        'high'
      );
    END IF;

  END IF;

  -- ══════════════════════════════════════════════════════════════════════
  -- BUYER sends → notify SELLER
  -- ══════════════════════════════════════════════════════════════════════
  IF NEW.sender_type = 'buyer' THEN

    -- 1st: target_seller_id stamped on the message by the client
    v_seller_id := NEW.target_seller_id;

    -- 2nd: trace through order → order_items → products → seller_id
    IF v_seller_id IS NULL THEN
      SELECT p.seller_id INTO v_seller_id
      FROM public.conversations c
      JOIN public.order_items  oi ON oi.order_id = c.order_id
      JOIN public.products     p  ON p.id = oi.product_id
      WHERE c.id = NEW.conversation_id
        AND c.order_id IS NOT NULL
      LIMIT 1;
    END IF;

    -- 3rd: look at previous seller messages in this conversation
    IF v_seller_id IS NULL THEN
      SELECT m.sender_id INTO v_seller_id
      FROM public.messages m
      WHERE m.conversation_id = NEW.conversation_id
        AND m.sender_type     = 'seller'
        AND m.sender_id       IS NOT NULL
      ORDER BY m.created_at DESC
      LIMIT 1;
    END IF;

    -- Cannot identify seller — skip
    IF v_seller_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Get buyer's display name from profiles
    SELECT NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), '')
    INTO v_buyer_name
    FROM public.profiles p
    WHERE p.id = NEW.sender_id;

    v_buyer_name := COALESCE(v_buyer_name, 'A buyer');

    -- Rate-limit
    SELECT EXISTS (
      SELECT 1 FROM public.seller_notifications
      WHERE seller_id = v_seller_id
        AND type      = 'new_message'
        AND (action_data->>'conversation_id') = NEW.conversation_id::text
        AND created_at > now() - INTERVAL '60 seconds'
    ) INTO v_has_recent_notif;

    IF NOT v_has_recent_notif THEN
      INSERT INTO public.seller_notifications (
        seller_id, type, title, message,
        action_url, action_data, priority
      ) VALUES (
        v_seller_id,
        'new_message',
        '💬 ' || v_buyer_name,
        v_content_preview,
        '/seller/messages',
        jsonb_build_object(
          'conversation_id', NEW.conversation_id::text,
          'buyer_id',        NEW.sender_id::text
        ),
        'high'
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Re-create trigger (idempotent)
DROP TRIGGER IF EXISTS trg_new_message_notification ON public.messages;
CREATE TRIGGER trg_new_message_notification
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public._notify_on_new_message();
