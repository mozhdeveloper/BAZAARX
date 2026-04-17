-- Step 3: Replace message_content text scan with indexed seller hint column.
-- Existing table remains compatible; this adds one nullable column.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS target_seller_id UUID
    REFERENCES public.sellers(id) ON DELETE SET NULL;

-- Safe parser for legacy JSON metadata payloads in message_content.
CREATE OR REPLACE FUNCTION public.safe_extract_target_seller_id(p_content TEXT)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_target UUID;
BEGIN
  IF p_content IS NULL OR p_content = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_target := NULLIF(
      COALESCE(
        p_content::jsonb ->> 'targetSellerId',
        p_content::jsonb ->> 'target_seller_id'
      ),
      ''
    )::UUID;
    RETURN v_target;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
END;
$$;

-- Backfill existing buyer metadata rows in batches.
-- This avoids rewriting unrelated rows and reduces long-lock risk on large tables.
DO $$
DECLARE
  v_rows_updated INTEGER := 0;
BEGIN
  LOOP
    WITH candidates AS (
      SELECT
        id,
        public.safe_extract_target_seller_id(message_content) AS parsed_target_seller_id
      FROM public.messages
      WHERE sender_type = 'buyer'
        AND target_seller_id IS NULL
        AND message_content IS NOT NULL
        AND (
          message_content ILIKE '%"targetSellerId"%'
          OR message_content ILIKE '%"target_seller_id"%'
        )
        AND public.safe_extract_target_seller_id(message_content) IS NOT NULL
      LIMIT 5000
    ),
    updated AS (
      UPDATE public.messages m
      SET target_seller_id = c.parsed_target_seller_id
      FROM candidates c
      WHERE m.id = c.id
      RETURNING 1
    )
    SELECT COUNT(*) INTO v_rows_updated FROM updated;

    EXIT WHEN v_rows_updated = 0;
  END LOOP;
END;
$$;

-- Index for fast seller-hint resolution by buyer messages.
CREATE INDEX IF NOT EXISTS idx_messages_target_seller_conversation_created
  ON public.messages (target_seller_id, conversation_id, created_at DESC)
  WHERE sender_type = 'buyer' AND target_seller_id IS NOT NULL;

DROP FUNCTION IF EXISTS public.safe_extract_target_seller_id(TEXT);
