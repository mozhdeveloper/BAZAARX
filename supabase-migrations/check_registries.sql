-- Run this to check your registries table structure
-- =====================================================

-- 1. Check all columns in registries table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'registries'
ORDER BY ordinal_position;

-- 2. Check the actual data with full JSONB
SELECT 
    id, 
    title, 
    privacy, 
    delivery,
    delivery::text as delivery_text,
    jsonb_typeof(delivery) as delivery_type,
    jsonb_object_keys(delivery) as delivery_keys,
    created_at 
FROM public.registries 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Check if there are any triggers on the table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' 
  AND event_object_table = 'registries';

-- 4. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'registries';

-- 5. Try a direct insert to test (replace YOUR_USER_ID with your actual user ID)
-- Uncomment and run this to test:
/*
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
    'YOUR_USER_ID'::uuid,
    'Test Registry',
    'test',
    'test_category',
    '/test.jpg',
    NOW(),
    'public',
    '{"showAddress": true, "addressId": "test-123", "instructions": "test instructions"}'::jsonb
) RETURNING *;
*/
