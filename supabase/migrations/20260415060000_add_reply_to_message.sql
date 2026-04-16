-- ============================================================
-- Reply-to-Message Support
--
-- Adds a self-referencing FK on messages so users can reply
-- to a specific message in a conversation thread.
-- ============================================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID
    REFERENCES public.messages(id) ON DELETE SET NULL;

-- Index for efficient lookup of replies to a given message
CREATE INDEX IF NOT EXISTS idx_messages_reply_to
  ON public.messages(reply_to_message_id)
  WHERE reply_to_message_id IS NOT NULL;
