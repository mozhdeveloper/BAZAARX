CREATE TYPE user_role AS ENUM ('buyer', 'seller');
CREATE TYPE message_type_enum AS ENUM ('user', 'system');
CREATE TYPE order_event_enum AS ENUM ('placed', 'confirmed', 'shipped', 'delivered');
CREATE TYPE presence_status AS ENUM ('online', 'offline');
CREATE TYPE platform_type AS ENUM ('mobile', 'web', 'both');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role user_role NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    last_message_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(buyer_id, seller_id)
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message_type message_type_enum DEFAULT 'user',
    message_content TEXT NOT NULL,
    order_event_type order_event_enum,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_presence (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    status presence_status DEFAULT 'offline',
    active_platform platform_type,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    event_type order_event_enum NOT NULL,
    message_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(order_id, event_type) 
);

-- Idempotency Backend Logic via Postgres Function
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
    INSERT INTO order_events (order_id, conversation_id, event_type)
    VALUES (p_order_id, p_conv_id, p_event_type)
    ON CONFLICT (order_id, event_type) DO NOTHING
    RETURNING id INTO v_event_id;

    IF v_event_id IS NULL THEN
        RETURN NULL; 
    END IF;

    INSERT INTO messages (conversation_id, sender_id, message_type, message_content, order_event_type)
    VALUES (p_conv_id, NULL, 'system', p_content, p_event_type)
    RETURNING id INTO v_message_id;

    UPDATE order_events SET message_generated = true WHERE id = v_event_id;
    UPDATE conversations SET last_message_id = v_message_id, updated_at = NOW() WHERE id = p_conv_id;

    RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;