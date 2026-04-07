-- ============================================================
-- Chat Image Attachment — Add Columns & Extend Enum
--
-- IMAGE ATTACHMENTS ONLY in this release.
-- SAFE ADDITIVE MIGRATION — no existing columns are renamed,
-- dropped, or modified. image_url is preserved as legacy fallback.
--
-- ============================================================
-- PART A — Schema changes (DDL)
-- Copy from here to the PART A END marker → click RUN
-- ============================================================

-- Add new columns to the messages table
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS media_url  text,
  ADD COLUMN IF NOT EXISTS media_type text
    CHECK (media_type IS NULL OR media_type IN ('image', 'video', 'document'));
-- Note: CHECK constraint includes 'video' and 'document' for future extensibility,
-- but only 'image' will be written by the frontend in this release.

-- Extend the message_type enum (safe — existing rows are unaffected)
ALTER TYPE message_type_enum ADD VALUE IF NOT EXISTS 'text';
ALTER TYPE message_type_enum ADD VALUE IF NOT EXISTS 'image';

-- ============================================================
-- PART A END — Click RUN now, then open a new query for PART B
-- ============================================================


-- ============================================================
-- PART B — Data backfill (DML)
-- Open a NEW query in the SQL Editor → paste from here → RUN
-- ============================================================

-- Backfill: copy existing image_url data into the new media_url column
-- (image_url itself is NOT modified or removed)
UPDATE public.messages
SET
  media_url    = image_url,
  media_type   = 'image',
  message_type = 'image'
WHERE image_url IS NOT NULL
  AND media_url IS NULL;

-- Backfill: mark existing plain-text user messages as 'text'
UPDATE public.messages
SET message_type = 'text'
WHERE message_type = 'user'
  AND image_url IS NULL
  AND media_url IS NULL;

-- ============================================================
-- PART B END
-- ============================================================

ALTER TYPE message_type_enum ADD VALUE IF NOT EXISTS 'video';
ALTER TYPE message_type_enum ADD VALUE IF NOT EXISTS 'document';
