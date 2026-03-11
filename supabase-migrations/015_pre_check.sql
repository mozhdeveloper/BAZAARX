-- ============================================================
-- PRE-CHECK: Run these queries BEFORE applying the migration
-- 015_comments_contributor_system.sql
--
-- Purpose: Verify DB state is correct and safe to proceed.
-- All "Expected" comments describe what you should see.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Confirm product_requests exists and check its columns
-- Expected: rows with column_name = id, product_name,
--           requested_by_id, comments_count, status, etc.
-- ------------------------------------------------------------
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'product_requests'
ORDER BY ordinal_position;


-- ------------------------------------------------------------
-- 2. Confirm profiles table exists and check its columns
-- Expected: id, email, first_name, last_name, phone, etc.
-- NOTE: There is NO "role" column on profiles — roles are in
--       admins / qa_team_members / user_roles tables.
-- ------------------------------------------------------------
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'profiles'
ORDER BY ordinal_position;


-- ------------------------------------------------------------
-- 3. Confirm buyers table has bazcoins column
-- Expected: 1 row with column_name = bazcoins, data_type = integer
-- ------------------------------------------------------------
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'buyers'
  AND column_name  = 'bazcoins';


-- ------------------------------------------------------------
-- 4. Confirm bazcoin_transactions does NOT yet exist
-- Expected: 0 rows (table does not exist — migration creates it)
-- If you see 1 row here, the migration will error on CREATE TABLE.
-- ------------------------------------------------------------
SELECT COUNT(*) AS bazcoin_transactions_exists
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name   = 'bazcoin_transactions';


-- ------------------------------------------------------------
-- 5. Confirm new tables do NOT yet exist
-- Expected: 0 rows for each table name
-- If any row appears, that table already exists — skip or
-- adjust the corresponding CREATE TABLE in the migration.
-- ------------------------------------------------------------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'product_request_comments',
    'comment_upvotes',
    'contributor_tiers'
  );


-- ------------------------------------------------------------
-- 6. Confirm admins and qa_team_members tables exist
-- (Used later to scope admin visibility in edge functions)
-- Expected: 2 rows — admins, qa_team_members
-- ------------------------------------------------------------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('admins', 'qa_team_members')
ORDER BY table_name;


-- ------------------------------------------------------------
-- 7. Spot-check: sample product_requests rows to confirm
--    the id column is UUIDs (needed as FK target)
-- Expected: a few UUID rows
-- ------------------------------------------------------------
SELECT id, product_name, status, requested_by_id
FROM public.product_requests
LIMIT 5;


-- ------------------------------------------------------------
-- 8. Confirm user_roles table structure (role col name)
-- Expected: user_id, role columns
-- ------------------------------------------------------------
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'user_roles'
ORDER BY ordinal_position;
