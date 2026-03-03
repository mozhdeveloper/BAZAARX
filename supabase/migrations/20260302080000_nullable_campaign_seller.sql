-- Allow admin-created platform-wide flash sales without a specific seller
-- discount_campaigns.seller_id is now optional (NULL = platform-level campaign)
ALTER TABLE public.discount_campaigns
  ALTER COLUMN seller_id DROP NOT NULL;
