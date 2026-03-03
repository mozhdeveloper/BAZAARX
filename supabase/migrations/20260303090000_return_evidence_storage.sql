-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Create return-evidence storage bucket
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'return-evidence',
  'return-evidence',
  true,
  10485760, -- 10 MB per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE
SET
  public            = EXCLUDED.public,
  file_size_limit   = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── RLS Policies ────────────────────────────────────────────────────────────

-- Authenticated buyers can upload their own evidence
CREATE POLICY "Buyers can upload return evidence"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'return-evidence'
    AND (storage.foldername(name))[1] = 'returns'
  );

-- Authenticated users can read evidence (sellers need to view buyer evidence)
CREATE POLICY "Authenticated users can view return evidence"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'return-evidence');

-- Owners can delete their own evidence
CREATE POLICY "Buyers can delete own return evidence"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'return-evidence'
    AND auth.uid()::text = owner::text
  );
