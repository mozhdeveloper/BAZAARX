-- Messaging performance indexes (Step 1)
-- Targets slow chatlist/thread read paths in mobile chatService.

-- Buyer chatlist fetch: WHERE buyer_id = ? ORDER BY updated_at DESC LIMIT 50
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_updated_at
  ON public.conversations (buyer_id, updated_at DESC);

-- Seller conversation discovery and conversation lookup via sender participation.
CREATE INDEX IF NOT EXISTS idx_messages_sender_type_conversation
  ON public.messages (sender_id, sender_type, conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_conversation
  ON public.messages (sender_id, conversation_id);

-- Fast unread counts and mark-as-read filters by conversation and sender side.
CREATE INDEX IF NOT EXISTS idx_messages_unread_seller_by_conversation
  ON public.messages (conversation_id, created_at DESC)
  WHERE sender_type = 'seller' AND is_read = false;

CREATE INDEX IF NOT EXISTS idx_messages_unread_buyer_by_conversation
  ON public.messages (conversation_id, created_at DESC)
  WHERE sender_type = 'buyer' AND is_read = false;

-- Buyer quick-reply cooldown lookup:
-- WHERE conversation_id = ? AND sender_id = ? AND sender_type = 'buyer'
--   AND created_at >= ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_messages_buyer_cooldown_lookup
  ON public.messages (conversation_id, sender_id, created_at DESC)
  WHERE sender_type = 'buyer';
