-- Migration: Add seller_id to support_tickets table
-- This allows buyers to report issues about specific stores/sellers

-- Add seller_id column to support_tickets
ALTER TABLE public.support_tickets
ADD COLUMN seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL;

-- Add index for better query performance when filtering by seller_id
CREATE INDEX idx_support_tickets_seller_id ON public.support_tickets(seller_id);

-- Add comment to document the column
COMMENT ON COLUMN public.support_tickets.seller_id IS 'Optional seller/store that this ticket is about (for buyer complaints about specific stores)';
