-- ============================================================
-- CHAT/MESSAGING TABLES FOR BAZAARPH
-- Run this SQL in Supabase SQL Editor to create chat functionality
-- ============================================================

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  last_message TEXT DEFAULT '',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  buyer_unread_count INTEGER DEFAULT 0,
  seller_unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(buyer_id, seller_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('buyer', 'seller')),
  content TEXT NOT NULL,
  image_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id ON public.conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id ON public.conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- DISABLE Row Level Security for now (enables seeding and open access)
-- You can enable RLS later with the policies below if needed
ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- Grant access to authenticated and anon users
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO anon;
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.messages TO anon;

-- Enable Realtime for live chat updates
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ============================================================
-- DONE! Chat tables are now ready for use (RLS disabled)
-- ============================================================

-- ============================================================
-- OPTIONAL: RLS POLICIES (Run later if you want to enable security)
-- ============================================================
-- To enable RLS later, run:
-- ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
--
-- Then create these policies:
--
-- CREATE POLICY "Users can view their own conversations"
--   ON public.conversations FOR SELECT
--   USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
--
-- CREATE POLICY "Buyers can create conversations"
--   ON public.conversations FOR INSERT
--   WITH CHECK (auth.uid() = buyer_id);
--
-- CREATE POLICY "Users can update their own conversations"
--   ON public.conversations FOR UPDATE
--   USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
--
-- CREATE POLICY "Users can delete their own conversations"
--   ON public.conversations FOR DELETE
--   USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
--
-- CREATE POLICY "Users can view messages in their conversations"
--   ON public.messages FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.conversations c
--       WHERE c.id = conversation_id
--       AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
--     )
--   );
--
-- CREATE POLICY "Users can send messages in their conversations"
--   ON public.messages FOR INSERT
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM public.conversations c
--       WHERE c.id = conversation_id
--       AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
--     )
--   );
--
-- CREATE POLICY "Users can update messages in their conversations"
--   ON public.messages FOR UPDATE
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.conversations c
--       WHERE c.id = conversation_id
--       AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
--     )
--   );
