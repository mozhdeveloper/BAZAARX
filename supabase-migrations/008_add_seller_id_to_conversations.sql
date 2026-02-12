-- Add seller_id to conversations for easier lookup and non-order chats
ALTER TABLE public.conversations 
ADD COLUMN seller_id uuid REFERENCES public.sellers(id);

-- Backfill seller_id from orders (where order_id exists)
UPDATE public.conversations c
SET seller_id = (
  SELECT p.seller_id
  FROM public.order_items oi
  JOIN public.products p ON p.id = oi.product_id
  WHERE oi.order_id = c.order_id
  LIMIT 1
)
WHERE c.seller_id IS NULL AND c.order_id IS NOT NULL;

-- Backfill seller_id from messages (where seller replied)
UPDATE public.conversations c
SET seller_id = (
  SELECT m.sender_id
  FROM public.messages m
  WHERE m.conversation_id = c.id
  AND m.sender_type = 'seller'
  LIMIT 1
)
WHERE c.seller_id IS NULL;

-- Add index for performance
CREATE INDEX idx_conversations_seller_id ON public.conversations(seller_id);
