-- Migration: add image_url column to product_requests for buyer-uploaded reference images
ALTER TABLE public.product_requests
  ADD COLUMN IF NOT EXISTS image_url TEXT;
