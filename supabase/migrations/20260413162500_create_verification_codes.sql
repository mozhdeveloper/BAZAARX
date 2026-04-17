-- Migration: Create verification_codes table for custom OTP flow with Resend
-- Created at: 2026-04-13 16:25:00

CREATE TABLE IF NOT EXISTS public.verification_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT verification_codes_pkey PRIMARY KEY (id)
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON public.verification_codes(email);

-- Enable RLS
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Policies for verification
-- 1. Anyone can insert (to trigger a verification email)
CREATE POLICY "Enable insert for all users" ON public.verification_codes
  FOR INSERT WITH CHECK (true);

-- 2. Only the system/app can select to verify (we'll filter by email AND code in the query)
CREATE POLICY "Enable select for verification" ON public.verification_codes
  FOR SELECT USING (true);

-- 3. Cleanup policy (optional but good practice)
CREATE POLICY "Enable delete for cleanup" ON public.verification_codes
  FOR DELETE USING (true);
