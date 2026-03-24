-- ============================================================================
-- QA User Role Fix Script
-- Purpose: Update qa.admin@bazaarph.com from admin role to qa_team role
-- Created: 2026-03-23
-- ============================================================================

-- STEP 1: Find the QA user's UUID
-- Run this first to get the user ID
SELECT 
  id,
  email,
  raw_user_meta_data,
  user_metadata,
  created_at
FROM auth.users 
WHERE email = 'qa.admin@bazaarph.com';

-- Copy the 'id' value from the result above, then use it in STEP 2

-- ============================================================================
-- STEP 2: Add/Update QA user in qa_team_members table
-- Replace 'YOUR_USER_UUID_HERE' with the actual UUID from STEP 1
-- ============================================================================

-- Insert or update QA team member record
INSERT INTO public.qa_team_members (
  id,
  display_name,
  is_active,
  max_concurrent_reviews,
  permissions
)
VALUES (
  'YOUR_USER_UUID_HERE',  -- ← Replace with UUID from STEP 1
  'QA Reviewer',
  true,
  10,
  '{"products": ["read", "approve", "reject"]}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  display_name = 'QA Reviewer',
  is_active = true,
  max_concurrent_reviews = 10,
  permissions = '{"products": ["read", "approve", "reject"]}'::jsonb,
  updated_at = NOW();

-- ============================================================================
-- STEP 3: Update user metadata in auth.users (fallback method)
-- This ensures the role is set even if qa_team_members table check fails
-- ============================================================================

UPDATE auth.users 
SET 
  raw_user_meta_data = raw_user_meta_data || '{"user_type": "qa_team"}'::jsonb,
  user_metadata = user_metadata || '{"user_type": "qa_team"}'::jsonb
WHERE email = 'qa.admin@bazaarph.com';

-- ============================================================================
-- STEP 4: Remove from admins table (if exists) to prevent conflicts
-- This ensures QA user is not mistakenly identified as admin
-- ============================================================================

DELETE FROM public.admins 
WHERE id = (SELECT id FROM auth.users WHERE email = 'qa.admin@bazaarph.com');

-- ============================================================================
-- STEP 5: Verification - Check the updated configuration
-- Run this to confirm the changes were applied successfully
-- ============================================================================

SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'user_type' as user_type_in_raw_meta,
  u.user_metadata->>'user_type' as user_type_in_meta,
  CASE WHEN a.id IS NOT NULL THEN 'YES' ELSE 'NO' END as in_admins_table,
  CASE WHEN q.id IS NOT NULL THEN 'YES (QA Team)' ELSE 'NO' END as in_qa_table,
  q.display_name as qa_display_name,
  q.is_active as qa_is_active
FROM auth.users u
LEFT JOIN public.admins a ON a.id = u.id
LEFT JOIN public.qa_team_members q ON q.id = u.id
WHERE u.email = 'qa.admin@bazaarph.com';

-- ============================================================================
-- Expected Result:
-- - user_type_in_raw_meta: 'qa_team'
-- - user_type_in_meta: 'qa_team'
-- - in_admins_table: 'NO'
-- - in_qa_table: 'YES (QA Team)'
-- - qa_display_name: 'QA Reviewer'
-- - qa_is_active: true (or t)
-- ============================================================================

-- STEP 6: Test login (optional - run after completing steps above)
-- The QA user should now be able to login and be redirected to /admin/qa-dashboard
