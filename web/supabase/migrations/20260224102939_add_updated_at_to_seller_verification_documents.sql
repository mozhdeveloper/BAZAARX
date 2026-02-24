-- Migration: Add updated_at column to seller_verification_documents
-- Created: 2026-02-24

-- Step 1: Add the updated_at column
ALTER TABLE public.seller_verification_documents
  ADD COLUMN updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Step 2: Create or replace the trigger function (safe to reuse across tables)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Attach the trigger so updated_at is refreshed on every row update
CREATE TRIGGER set_seller_verification_documents_updated_at
  BEFORE UPDATE ON public.seller_verification_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
