-- Seller Chat Requests Table
-- Stores requests from buyers who want to chat directly with sellers
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.seller_chat_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES public.buyers(id) ON DELETE CASCADE NOT NULL,
  buyer_name TEXT,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_seller_chat_requests_seller ON public.seller_chat_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_chat_requests_buyer ON public.seller_chat_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_seller_chat_requests_status ON public.seller_chat_requests(status);
CREATE INDEX IF NOT EXISTS idx_seller_chat_requests_created ON public.seller_chat_requests(created_at DESC);

-- Composite index for finding buyer-seller conversations
CREATE INDEX IF NOT EXISTS idx_seller_chat_requests_buyer_seller ON public.seller_chat_requests(buyer_id, seller_id, status);

-- Optional: Prevent duplicate pending requests for the same buyer-seller-product combination
-- Uncomment if you want to enforce uniqueness:
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_chat_requests_unique_pending 
-- ON public.seller_chat_requests(buyer_id, seller_id, product_id, status) 
-- WHERE status = 'pending';

-- Grant permissions (adjust as needed for your RLS setup)
-- Note: RLS is not enabled yet as per user request

COMMENT ON TABLE public.seller_chat_requests IS 'Stores chat requests from buyers to sellers for the AI chat feature';
