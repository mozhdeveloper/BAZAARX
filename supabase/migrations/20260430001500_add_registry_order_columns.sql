-- Migration: Add Registry Order Columns & Order Recipients Table
-- Description: Supports privacy-first registry gifting by decoupling delivery info from the main order record.

-- 1. Create order_recipients table
-- This table stores sensitive recipient information, allowing it to be protected via separate RLS policies.
CREATE TABLE IF NOT EXISTS public.order_recipients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name text,
    last_name text,
    phone text,
    email text,
    is_registry_recipient boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- 2. Add columns to orders table
-- Decouple delivery from orders via recipient_id for privacy.
-- Add registry flags for conditional masking in UI and reports.
DO $$ 
BEGIN
    -- Add is_registry_order
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'is_registry_order') THEN
        ALTER TABLE public.orders ADD COLUMN is_registry_order boolean DEFAULT false;
    END IF;

    -- Add registry_id link
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'registry_id') THEN
        ALTER TABLE public.orders ADD COLUMN registry_id uuid REFERENCES public.registries(id);
    END IF;

    -- Add recipient_id link
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'recipient_id') THEN
        ALTER TABLE public.orders ADD COLUMN recipient_id uuid REFERENCES public.order_recipients(id);
    END IF;
END $$;

-- 3. Enable RLS and set policies
ALTER TABLE public.order_recipients ENABLE ROW LEVEL SECURITY;

-- Policy: Buyers can see their own recipients
CREATE POLICY "Users can view their own order recipients" 
ON public.order_recipients FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.recipient_id = order_recipients.id 
    AND orders.buyer_id = auth.uid()
  )
);

-- Policy: Sellers can see recipients for their orders
-- Note: orders table doesn't have seller_id (it's normalized in order_items -> products)
CREATE POLICY "Sellers can view recipients for their orders" 
ON public.order_recipients FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    JOIN public.order_items ON orders.id = order_items.order_id
    JOIN public.products ON order_items.product_id = products.id
    WHERE orders.recipient_id = order_recipients.id 
    AND products.seller_id = auth.uid()
  )
);

-- Policy: Authenticated users can insert (for checkout)
CREATE POLICY "Authenticated users can create order recipients" 
ON public.order_recipients FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_registry_id ON public.orders(registry_id);
CREATE INDEX IF NOT EXISTS idx_orders_recipient_id ON public.orders(recipient_id);
CREATE INDEX IF NOT EXISTS idx_orders_is_registry_order ON public.orders(is_registry_order);
