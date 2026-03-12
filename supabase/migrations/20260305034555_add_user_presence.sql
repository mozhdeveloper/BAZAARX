-- 1. Safely create Enums
DO $$ BEGIN
    CREATE TYPE message_type_enum AS ENUM ('user', 'system');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE order_event_enum AS ENUM ('placed', 'confirmed', 'shipped', 'delivered');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Add new columns to the EXISTING messages table safely
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS message_type message_type_enum DEFAULT 'user',
ADD COLUMN IF NOT EXISTS message_content TEXT,
ADD COLUMN IF NOT EXISTS order_event_type order_event_enum;

-- 3. Recreate user_presence to perfectly match your React app
DROP TABLE IF EXISTS public.user_presence CASCADE;

CREATE TABLE public.user_presence (
    user_id UUID PRIMARY KEY,
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Security (RLS) for user_presence
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.user_presence FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.user_presence FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.user_presence FOR UPDATE USING (true);

-- 5. Enable Real-Time Broadcasting
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;

-- 6. Create the NEW order_events table
CREATE TABLE IF NOT EXISTS public.order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    event_type order_event_enum NOT NULL,
    message_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(order_id, event_type) 
);

-- 7. ENABLE RLS for order_events (Copilot Fix)
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.order_events FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.order_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.order_events FOR UPDATE USING (true);

-- 8. Create the secure function (Copilot Fixes Applied)
CREATE OR REPLACE FUNCTION process_idempotent_order_message(
    p_order_id UUID,
    p_conv_id UUID,
    p_event_type order_event_enum,
    p_content TEXT
) RETURNS UUID 
SECURITY DEFINER -- Runs with elevated privileges to bypass RLS blocks
SET search_path = public
AS $$
DECLARE
    v_event_id UUID;
    v_message_id UUID;
BEGIN
    -- Try to record the event. If it exists, do nothing
    INSERT INTO public.order_events (order_id, conversation_id, event_type)
    VALUES (p_order_id, p_conv_id, p_event_type)
    ON CONFLICT (order_id, event_type) DO NOTHING
    RETURNING id INTO v_event_id;

    -- If no event was inserted, it means we already generated this message
    IF v_event_id IS NULL THEN
        RETURN NULL; 
    END IF;

    -- Insert the actual system message into the chat
    -- Note: Copilot warned about sender_id=NULL. If this throws an error, we will need to provide a dummy UUID here.
    INSERT INTO public.messages (conversation_id, sender_id, sender_type, content, message_type, message_content, order_event_type, is_read)
    VALUES (p_conv_id, NULL, 'system', p_content, 'system', p_content, p_event_type, false)
    RETURNING id INTO v_message_id;

    -- Mark as generated and bump the conversation updated_at time
    UPDATE public.order_events SET message_generated = true WHERE id = v_event_id;
    UPDATE public.conversations SET updated_at = NOW() WHERE id = p_conv_id;

    RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Force schema reload
NOTIFY pgrst, 'reload schema';