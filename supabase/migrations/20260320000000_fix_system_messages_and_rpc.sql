-- Fix messages table to support system messages (sender_id nullable, sender_type allows 'system')
-- Also fix the process_idempotent_order_message function to match actual table constraints

-- 1. Make sender_id nullable for system messages
ALTER TABLE public.messages ALTER COLUMN sender_id DROP NOT NULL;

-- 2. Drop the old sender_type check constraint and add one that includes 'system'
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_type_check
  CHECK (sender_type = ANY (ARRAY['buyer'::text, 'seller'::text, 'system'::text]));

-- 3. Allow sender_type to be nullable (system messages may not have one)
ALTER TABLE public.messages ALTER COLUMN sender_type DROP NOT NULL;

-- 4. Fix the RPC function to populate required columns correctly
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
    -- Idempotent insert: if (order_id, event_type) already exists, skip
    INSERT INTO order_events (order_id, conversation_id, event_type)
    VALUES (p_order_id, p_conv_id, p_event_type)
    ON CONFLICT (order_id, event_type) DO NOTHING
    RETURNING id INTO v_event_id;

    IF v_event_id IS NULL THEN
        RETURN NULL;  -- Already processed
    END IF;

    -- Insert system message with all required columns populated
    INSERT INTO messages (
        conversation_id,
        sender_id,
        sender_type,
        content,
        message_type,
        message_content,
        order_event_type
    )
    VALUES (
        p_conv_id,
        NULL,           -- system messages have no sender
        'system',       -- new sender_type value
        p_content,      -- content (NOT NULL column - use the message text)
        'system',       -- message_type enum
        p_content,      -- message_content (duplicate for compatibility)
        p_event_type
    )
    RETURNING id INTO v_message_id;

    UPDATE order_events SET message_generated = true WHERE id = v_event_id;
    UPDATE conversations SET updated_at = NOW() WHERE id = p_conv_id;

    RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;
