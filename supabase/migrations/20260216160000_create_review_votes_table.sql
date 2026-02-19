-- Migration: Add Review Voting System
-- Creates review_votes table and trigger for helpful count tracking

-- ============================================================================
-- 1. Create review_votes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.review_votes (
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (review_id, buyer_id)
);

-- Index for efficient lookup of votes by review
CREATE INDEX IF NOT EXISTS idx_review_votes_review_id 
  ON public.review_votes(review_id);

-- Index for efficient lookup of votes by buyer
CREATE INDEX IF NOT EXISTS idx_review_votes_buyer_id 
  ON public.review_votes(buyer_id);

-- ============================================================================
-- 2. Create trigger function for auto-updating helpful_count
-- ============================================================================

CREATE OR REPLACE FUNCTION update_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reviews 
    SET helpful_count = helpful_count + 1 
    WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reviews 
    SET helpful_count = GREATEST(helpful_count - 1, 0) 
    WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS tr_update_helpful_count ON public.review_votes;

CREATE TRIGGER tr_update_helpful_count
  AFTER INSERT OR DELETE ON public.review_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_helpful_count();

-- ============================================================================
-- 3. RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all votes (vote counts are public)
CREATE POLICY "Public can read review votes"
  ON public.review_votes
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert their own votes
-- Note: Additional seller check is handled at application layer
CREATE POLICY "Buyers can vote on reviews"
  ON public.review_votes
  FOR INSERT
  WITH CHECK (
    auth.uid() = buyer_id
  );

-- Policy: Users can only delete their own votes
CREATE POLICY "Buyers can remove their own votes"
  ON public.review_votes
  FOR DELETE
  USING (
    auth.uid() = buyer_id
  );

-- ============================================================================
-- 4. Add helpful_count to review type (already exists, ensure type safety)
-- ============================================================================

COMMENT ON TABLE public.review_votes IS 'Tracks which buyers found reviews helpful';
COMMENT ON COLUMN public.reviews.helpful_count IS 'Auto-updated count of helpful votes (maintained by trigger)';

-- ============================================================================
-- 5. Migration complete
-- ============================================================================
