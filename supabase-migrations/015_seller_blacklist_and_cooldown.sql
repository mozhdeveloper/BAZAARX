-- Migration: 015_seller_blacklist_and_cooldown.sql
-- Description: Add columns for reapplication tracking, cooldown, and blacklist system
-- Date: 2026-03-10
-- Version: 2.0 (Multi-level blacklist system)

-- Add columns to sellers table (ADD ONLY - no deletions)
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS reapplication_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cooldown_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS temp_blacklist_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS blacklisted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cool_down_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS temp_blacklist_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_permanently_blacklisted BOOLEAN DEFAULT FALSE;

-- Update CHECK constraint to include 'blacklisted' status
ALTER TABLE sellers 
DROP CONSTRAINT IF EXISTS sellers_approval_status_check,
ADD CONSTRAINT sellers_approval_status_check 
CHECK (approval_status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text, 'needs_resubmission'::text, 'blacklisted'::text]));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sellers_blacklist 
ON sellers(blacklisted_at, cool_down_until, temp_blacklist_until) 
WHERE blacklisted_at IS NOT NULL OR cool_down_until IS NOT NULL OR temp_blacklist_until IS NOT NULL;
