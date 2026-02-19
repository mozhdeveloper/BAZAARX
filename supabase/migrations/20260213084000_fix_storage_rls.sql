-- Fix storage bucket RLS for visual search uploads
-- Allow anyone to upload to the visual-search folder in product-images bucket

-- First, ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if they conflict
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow visual search uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to visual-search" ON storage.objects;

-- Create policy for public read access
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Create policy for authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Create policy for anonymous uploads to visual-search folder
CREATE POLICY "Allow public uploads to visual-search"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'product-images' 
  AND (storage.foldername(name))[1] = 'visual-search'
);

-- Allow deletion for cleanup
CREATE POLICY "Allow delete visual-search files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = 'visual-search'
);
