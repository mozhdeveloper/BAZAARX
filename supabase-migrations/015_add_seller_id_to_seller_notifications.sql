-- Add seller_id column to seller_notifications table (if not already exists)
-- This is required for realtime subscriptions to work correctly

DO $$ 
BEGIN
  -- Check if column already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'seller_notifications' 
    AND column_name = 'seller_id'
  ) THEN
    ALTER TABLE public.seller_notifications
    ADD COLUMN seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE;
    
    -- Create indexes only if column was just added
    CREATE INDEX idx_seller_notifications_seller_id ON public.seller_notifications(seller_id);
    CREATE INDEX idx_seller_notifications_created_at ON public.seller_notifications(created_at DESC);
    CREATE INDEX idx_seller_notifications_seller_id_created_at 
    ON public.seller_notifications(seller_id, created_at DESC);
    
    COMMENT ON COLUMN public.seller_notifications.seller_id IS 'References the seller who owns this notification. Required for realtime subscriptions.';
  ELSE
    -- Column already exists, ensure indexes exist
    -- (Indexes created if not already present)
    CREATE INDEX IF NOT EXISTS idx_seller_notifications_seller_id ON public.seller_notifications(seller_id);
    CREATE INDEX IF NOT EXISTS idx_seller_notifications_created_at ON public.seller_notifications(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_seller_notifications_seller_id_created_at 
    ON public.seller_notifications(seller_id, created_at DESC);
  END IF;
END $$;
