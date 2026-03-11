-- 1. Create submission_status ENUM if not exists
DO $$ BEGIN
    CREATE TYPE public.submission_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create global_flash_sale_slots table
CREATE TABLE IF NOT EXISTS public.global_flash_sale_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  min_discount_percentage integer NOT NULL DEFAULT 10,
  campaign_type text NOT NULL DEFAULT 'flash_sale',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT global_flash_sale_slots_pkey PRIMARY KEY (id)
);

-- 3. Create flash_sale_submissions table
CREATE TABLE IF NOT EXISTS public.flash_sale_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  product_id uuid NOT NULL,
  submitted_price numeric NOT NULL,
  submitted_stock integer NOT NULL,
  status public.submission_status NOT NULL DEFAULT 'pending'::public.submission_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT flash_sale_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT flash_sale_submissions_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.global_flash_sale_slots(id) ON DELETE CASCADE,
  CONSTRAINT flash_sale_submissions_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id) ON DELETE CASCADE,
  CONSTRAINT flash_sale_submissions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE
);

-- 4. Add campaign_scope to discount_campaigns if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='discount_campaigns' AND column_name='campaign_scope'
  ) THEN
    ALTER TABLE public.discount_campaigns ADD COLUMN campaign_scope text NOT NULL DEFAULT 'store';
  END IF;
END $$;

-- 5. Set RLS for global_flash_sale_slots
ALTER TABLE public.global_flash_sale_slots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Admins can manage global_flash_sale_slots"
    ON public.global_flash_sale_slots
    FOR ALL
    USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid()));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Public can view global_flash_sale_slots"
    ON public.global_flash_sale_slots
    FOR SELECT
    USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 6. Set RLS for flash_sale_submissions
ALTER TABLE public.flash_sale_submissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Admins can manage flash_sale_submissions"
    ON public.flash_sale_submissions
    FOR ALL
    USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid()));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Sellers can manage their own flash_sale_submissions"
    ON public.flash_sale_submissions
    FOR ALL
    USING (seller_id = auth.uid());
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Public can view approved flash_sale_submissions"
    ON public.flash_sale_submissions
    FOR SELECT
    USING (status = 'approved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
