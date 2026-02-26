-- Migration: Create product_requests table for buyer product request feature
-- This table stores product requests from buyers that admins can review/approve

CREATE TABLE IF NOT EXISTS public.product_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_name text NOT NULL,
  description text,
  category text,
  requested_by_name text,
  requested_by_id uuid,
  votes integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'in_progress'::text])),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
  estimated_demand integer DEFAULT 0,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_requests_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.product_requests ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read product requests
CREATE POLICY "Anyone can view product requests"
  ON public.product_requests FOR SELECT
  USING (true);

-- Allow authenticated users to insert their own requests
CREATE POLICY "Authenticated users can create requests"
  ON public.product_requests FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow admins (service role) to update/delete
CREATE POLICY "Service role can manage requests"
  ON public.product_requests FOR ALL
  USING (auth.role() = 'service_role');

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_product_requests_status ON public.product_requests(status);
CREATE INDEX IF NOT EXISTS idx_product_requests_created ON public.product_requests(created_at DESC);
