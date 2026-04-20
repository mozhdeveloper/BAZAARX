-- Messaging chatlist phase 2 indexes
-- Focus: buyer/seller chatlist lookup and latest-message-per-conversation scans.

-- Seller chatlist discovery:
-- WHERE sender_id = ? AND sender_type = 'seller' ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_messages_seller_chatlist_recent
  ON public.messages (sender_id, sender_type, created_at DESC, conversation_id)
  WHERE sender_type = 'seller';

-- Latest message fetch per conversation for chatlist preview:
-- WHERE conversation_id IN (...) ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_desc
  ON public.messages (conversation_id, created_at DESC);

-- Seller-id resolution path on chatlist:
-- WHERE conversation_id IN (...) AND sender_type = 'seller' ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_messages_conversation_sender_created_desc
  ON public.messages (conversation_id, sender_type, created_at DESC, sender_id);
