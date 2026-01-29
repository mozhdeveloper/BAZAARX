-- ============================================================================
-- Migration: Create Reviews Table & Rating System
-- Description: Adds review capability per product item, RLS, and auto-aggregation
-- ============================================================================

-- 1. Create Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Foreign Keys
  order_id uuid REFERENCES public.orders(id) NOT NULL,
  product_id uuid REFERENCES public.products(id) NOT NULL,
  buyer_id uuid REFERENCES public.profiles(id) NOT NULL,
  seller_id uuid REFERENCES public.profiles(id) NOT NULL,
  
  -- Content
  rating smallint CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment text,
  images text[] DEFAULT '{}'::text[],
  
  -- Engagement
  helpful_count int DEFAULT 0,
  
  -- Seller Interaction
  seller_reply text,
  seller_reply_at timestamptz,
  
  -- Status / Moderation
  is_verified_purchase boolean DEFAULT true,
  is_hidden boolean DEFAULT false,
  is_edited boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Constraints
  UNIQUE(order_id, product_id) -- One review per product per order
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_seller_id ON public.reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_reviews_buyer_id ON public.reviews(buyer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies

-- Policy: Public Read
CREATE POLICY "Public reviews are viewable by everyone" 
ON public.reviews FOR SELECT 
USING (is_hidden = false);

-- Policy: Buyers Create (Must have delivered order)
CREATE POLICY "Buyers can create reviews for their own delivered purchases" 
ON public.reviews FOR INSERT 
WITH CHECK (
  auth.uid() = buyer_id AND
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.order_items oi ON o.id = oi.order_id
    WHERE o.id = reviews.order_id
    AND oi.product_id = reviews.product_id
    AND o.buyer_id = auth.uid()
    AND o.status = 'delivered'
  )
);

-- Policy: Buyers Update Own
CREATE POLICY "Buyers can update their own reviews" 
ON public.reviews FOR UPDATE
USING (auth.uid() = buyer_id)
WITH CHECK (auth.uid() = buyer_id);

-- Policy: Sellers Reply
CREATE POLICY "Sellers can add replies to reviews" 
ON public.reviews FOR UPDATE
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

-- 3. Auto-Aggregation Trigger (Average Rating)

CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update product rating and count
  UPDATE public.products
  SET 
    rating = (
      SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)
      FROM public.reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
      AND is_hidden = false
    ),
    review_count = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
      AND is_hidden = false
    )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS tr_update_product_rating ON public.reviews;

CREATE TRIGGER tr_update_product_rating
AFTER INSERT OR UPDATE OF rating, is_hidden OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_product_rating();
