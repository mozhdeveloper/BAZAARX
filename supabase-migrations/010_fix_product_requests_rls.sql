-- Migration: Allow anonymous users to submit product requests
-- The original policy only allowed authenticated users, but product requests
-- should be submittable by anyone (including buyers with expired sessions)

-- Drop the old restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create requests" ON public.product_requests;

-- Create a new policy allowing anyone to insert product requests
CREATE POLICY "Anyone can create product requests"
  ON public.product_requests FOR INSERT
  WITH CHECK (true);

-- Also allow authenticated users to update their own requests (e.g., upvote)
DROP POLICY IF EXISTS "Users can update own requests" ON public.product_requests;
CREATE POLICY "Authenticated users can update own requests"
  ON public.product_requests FOR UPDATE
  USING (auth.uid() = requested_by_id OR auth.role() = 'service_role');
