-- ============================================================================
-- Migration: Reviews uniqueness + review-images storage policies (final)
-- Description:
--   1) Deduplicate existing order-linked reviews and enforce one review per
--      (order_id, buyer_id, product_id)
--   2) Provision review-images bucket and storage RLS policies
--
-- Required object key format:
--   <buyer_id>/<review_id>/<filename>
--
-- Notes:
--   - storage.foldername(name) excludes filename and returns [buyer_id, review_id]
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1) Reviews deduplication and uniqueness hardening
-- --------------------------------------------------------------------------

WITH ranked_reviews AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY order_id, buyer_id, product_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.reviews
  WHERE order_id IS NOT NULL
)
DELETE FROM public.reviews r
USING ranked_reviews rr
WHERE r.id = rr.id
  AND rr.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_uq_order_buyer_product
ON public.reviews (order_id, buyer_id, product_id)
WHERE order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS review_images_uq_review_url
ON public.review_images (review_id, image_url);

-- --------------------------------------------------------------------------
-- 2) Storage bucket + object policies for review images
-- --------------------------------------------------------------------------

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'review-images',
  'review-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS review_images_read_public ON storage.objects;
CREATE POLICY review_images_read_public
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'review-images');

DROP POLICY IF EXISTS review_images_insert_own_review ON storage.objects;
CREATE POLICY review_images_insert_own_review
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'review-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND array_length(storage.foldername(name), 1) >= 2
);

DROP POLICY IF EXISTS review_images_update_own_review ON storage.objects;
CREATE POLICY review_images_update_own_review
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'review-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'review-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS review_images_delete_own_review ON storage.objects;
CREATE POLICY review_images_delete_own_review
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'review-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
