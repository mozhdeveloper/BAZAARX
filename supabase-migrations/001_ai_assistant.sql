-- ============================================================================
-- Migration 001: AI Assistant System
-- Date: 2026-02-05
-- Status: ALREADY APPLIED - This file documents the current database state
-- ============================================================================

-- AI Conversations (Chat Sessions with AI)
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_type text NOT NULL CHECK (user_type = ANY (ARRAY['buyer'::text, 'seller'::text])),
  title text,
  last_message_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_conversations_pkey PRIMARY KEY (id),
  CONSTRAINT ai_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.ai_conversations IS 'AI chat conversation sessions';
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- AI Messages (Individual messages in AI chats)
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender text NOT NULL CHECK (sender = ANY (ARRAY['user'::text, 'ai'::text])),
  message text NOT NULL,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_messages_pkey PRIMARY KEY (id),
  CONSTRAINT ai_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.ai_conversations(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.ai_messages IS 'Messages within AI conversations';
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- Seller Chat Requests (AI connects buyers to sellers)
CREATE TABLE IF NOT EXISTS public.seller_chat_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  buyer_name text,
  product_id uuid,
  product_name text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'expired'::text])),
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone,
  CONSTRAINT seller_chat_requests_pkey PRIMARY KEY (id),
  CONSTRAINT seller_chat_requests_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id) ON DELETE CASCADE,
  CONSTRAINT seller_chat_requests_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.buyers(id) ON DELETE CASCADE,
  CONSTRAINT seller_chat_requests_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL
);
COMMENT ON TABLE public.seller_chat_requests IS 'Chat requests from AI-assisted buyers to sellers';
ALTER TABLE public.seller_chat_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_type ON public.ai_conversations(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON public.ai_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created ON public.ai_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_chat_requests_seller ON public.seller_chat_requests(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_chat_requests_buyer ON public.seller_chat_requests(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_chat_requests_status ON public.seller_chat_requests(status);
CREATE INDEX IF NOT EXISTS idx_seller_chat_requests_buyer_seller ON public.seller_chat_requests(buyer_id, seller_id, status);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update last_message_at in AI conversations
CREATE OR REPLACE FUNCTION update_ai_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ai_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ai_conversation_timestamp ON public.ai_messages;
CREATE TRIGGER trigger_update_ai_conversation_timestamp
  AFTER INSERT ON public.ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_conversation_timestamp();

-- Auto-update seller_chat_requests timestamps
CREATE OR REPLACE FUNCTION update_chat_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status != OLD.status AND NEW.status IN ('accepted', 'declined') THEN
    NEW.responded_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_chat_request_timestamp ON public.seller_chat_requests;
CREATE TRIGGER trigger_update_chat_request_timestamp
  BEFORE UPDATE ON public.seller_chat_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_request_timestamp();

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
