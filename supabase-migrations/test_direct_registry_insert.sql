-- ============================================================================
-- DIRECT REGISTRY INSERT TEST
-- ============================================================================
-- Run this SQL directly in Supabase SQL Editor to test if the database 
-- accepts the correct values

-- First, get your user ID (replace with your actual buyer_id from registries table)
-- SELECT auth.uid() as my_user_id;

-- Test insert with explicit values
INSERT INTO public.registries (
    buyer_id,
    title,
    event_type,
    category,
    image_url,
    shared_date,
    privacy,
    delivery
) VALUES (
    -- REPLACE THIS WITH YOUR ACTUAL USER ID
    'YOUR_BUYER_ID_HERE'::uuid,
    'Direct SQL Test Registry',
    'test_event',
    'test_category',
    '/test.jpg',
    NOW(),
    'public',  -- Explicitly set to 'public'
    '{"showAddress": true, "addressId": "test-addr-123", "instructions": "test delivery instructions"}'::jsonb
)
RETURNING 
    id,
    title,
    privacy,
    delivery,
    delivery::text as delivery_text;

-- If the above returns privacy='link' and delivery={"showAddress":false},
-- then there's a database trigger or constraint modifying the data.

-- Check for triggers on the registries table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public' 
  AND event_object_table = 'registries';

-- Check the actual column definitions
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'registries'
  AND column_name IN ('privacy', 'delivery', 'category', 'event_type')
ORDER BY ordinal_position;
