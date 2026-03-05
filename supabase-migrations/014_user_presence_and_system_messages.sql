-- User Presence Tracking System
-- Tracks online/offline status for real-time messaging

-- Create user_presence table
CREATE TABLE IF NOT EXISTS user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('buyer', 'seller')),
  seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_online BOOLEAN NOT NULL DEFAULT TRUE,
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, user_type, seller_id)
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_user_type ON user_presence(user_type);
CREATE INDEX IF NOT EXISTS idx_user_presence_seller_id ON user_presence(seller_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_active ON user_presence(last_active_at);

-- Create message_deduplication_log table (prevents duplicate system messages)
CREATE TABLE IF NOT EXISTS message_deduplication_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  status VARCHAR(50) NOT NULL,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(order_id, status, conversation_id)
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_dedup_log_order_id ON message_deduplication_log(order_id);
CREATE INDEX IF NOT EXISTS idx_dedup_log_conversation_id ON message_deduplication_log(conversation_id);
CREATE INDEX IF NOT EXISTS idx_dedup_log_sent_at ON message_deduplication_log(sent_at);

-- Modify messages table to support system messages
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS is_system_message BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_messages_is_system ON messages(is_system_message);
CREATE INDEX IF NOT EXISTS idx_messages_metadata ON messages USING GIN(metadata);

-- RLS Policies for user_presence
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Users can view their own presence
DROP POLICY IF EXISTS "user_presence_select_own" ON user_presence;
CREATE POLICY "user_presence_select_own" ON user_presence
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert/update their own presence
DROP POLICY IF EXISTS "user_presence_insert_own" ON user_presence;
CREATE POLICY "user_presence_insert_own" ON user_presence
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_presence_update_own" ON user_presence;
CREATE POLICY "user_presence_update_own" ON user_presence
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can insert/update (for admin operations)
DROP POLICY IF EXISTS "user_presence_service_role" ON user_presence;
CREATE POLICY "user_presence_service_role" ON user_presence
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for message_deduplication_log
ALTER TABLE message_deduplication_log ENABLE ROW LEVEL SECURITY;

-- Users can view dedup logs for their conversations
DROP POLICY IF EXISTS "dedup_log_select_own" ON message_deduplication_log;
CREATE POLICY "dedup_log_select_own" ON message_deduplication_log
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE buyer_id = auth.uid()
    )
    OR
    message_id IN (
      SELECT id FROM messages 
      WHERE sender_id = auth.uid()
    )
  );

-- Service role can insert (for system message tracking)
DROP POLICY IF EXISTS "dedup_log_service_role" ON message_deduplication_log;
CREATE POLICY "dedup_log_service_role" ON message_deduplication_log
  FOR ALL USING (auth.role() = 'service_role');

-- Update function to auto-update updated_at on user_presence
CREATE OR REPLACE FUNCTION update_user_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_presence_timestamp ON user_presence;
CREATE TRIGGER trigger_user_presence_timestamp
  BEFORE UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_user_presence_timestamp();

-- Function to auto-mark users offline after 2 minutes of inactivity
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  UPDATE user_presence
  SET is_online = FALSE
  WHERE last_active_at < NOW() - INTERVAL '2 minutes'
    AND is_online = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get seller online status for a conversation
CREATE OR REPLACE FUNCTION get_seller_presence(conv_id UUID)
RETURNS TABLE(seller_id UUID, is_online BOOLEAN, last_active_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    COALESCE(up.is_online, FALSE),
    up.last_active_at
  FROM conversations c
  LEFT JOIN order_items oi ON c.order_id = oi.order_id
  LEFT JOIN products p ON oi.product_id = p.id
  LEFT JOIN sellers s ON p.seller_id = s.id
  LEFT JOIN user_presence up ON s.id = up.seller_id AND up.user_type = 'seller'
  WHERE c.id = conv_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;