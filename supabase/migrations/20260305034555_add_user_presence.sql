-- 1. Safely create Enums
DO $$ BEGIN
    CREATE TYPE message_type_enum AS ENUM ('user', 'system');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE order_event_enum AS ENUM ('placed', 'confirmed', 'shipped', 'delivered');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE presence_status AS ENUM ('online', 'offline');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE platform_type AS ENUM ('mobile', 'web', 'both');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Add new columns to the EXISTING messages table safely
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS message_type message_type_enum DEFAULT 'user',
ADD COLUMN IF NOT EXISTS message_content TEXT,
ADD COLUMN IF NOT EXISTS order_event_type order_event_enum;

-- 3. Create the NEW user_presence table (Matching our React Code)
CREATE TABLE IF NOT EXISTS public.user_presence (
    user_id UUID PRIMARY KEY,
    status presence_status DEFAULT 'offline',
    active_platform platform_type,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Security (RLS) for user_presence (From your old file!)
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.user_presence FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.user_presence FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.user_presence FOR UPDATE USING (true);

-- 5. Enable Real-Time Broadcasting (From your old file!)
-- Note: If this line throws an error saying it's already in the publication, you can just delete it!
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;

-- 6. Create the NEW order_events table for tracking system messages
CREATE TABLE IF NOT EXISTS public.order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    event_type order_event_enum NOT NULL,
    message_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(order_id, event_type) 
);

-- 7. Create the secure function to trigger system messages
CREATE OR REPLACE FUNCTION process_idempotent_order_message(
    p_order_id UUID,
    p_conv_id UUID,
    p_event_type order_event_enum,
    p_content TEXT
) RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
    v_message_id UUID;
BEGIN
    -- Try to record the event. If it exists, do nothing (this prevents duplicates)
    INSERT INTO public.order_events (order_id, conversation_id, event_type)
    VALUES (p_order_id, p_conv_id, p_event_type)
    ON CONFLICT (order_id, event_type) DO NOTHING
    RETURNING id INTO v_event_id;

    -- If no event was inserted, it means we already generated this message. Stop here.
    IF v_event_id IS NULL THEN
        RETURN NULL; 
    END IF;

    -- Insert the actual system message into the chat
    INSERT INTO public.messages (conversation_id, sender_id, sender_type, content, message_type, message_content, order_event_type, is_read)
    VALUES (p_conv_id, NULL, 'seller', p_content, 'system', p_content, p_event_type, false)
    RETURNING id INTO v_message_id;

    -- Mark as generated and bump the conversation updated_at time
    UPDATE public.order_events SET message_generated = true WHERE id = v_event_id;
    UPDATE public.conversations SET updated_at = NOW() WHERE id = p_conv_id;

    RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Force schema reload so the API updates immediately
NOTIFY pgrst, 'reload schema';