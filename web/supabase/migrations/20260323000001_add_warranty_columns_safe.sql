-- Migration: Add warranty columns to products table (SAFE VERSION)
-- Created: 2026-03-23
-- Description: Safely adds warranty tracking columns - only if products table exists

-- ============================================================================
-- STEP 1: Create warranty-related enums
-- ============================================================================

-- Warranty type enum for different warranty categories
DO $$ BEGIN
  CREATE TYPE warranty_type_enum AS ENUM (
    'local_manufacturer',
    'international_manufacturer',
    'shop_warranty',
    'no_warranty'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 2: Add warranty columns to products table (ONLY IF TABLE EXISTS)
-- ============================================================================

DO $$
BEGIN
  -- Check if products table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    
    -- Add warranty fields to products
    ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS has_warranty BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS warranty_type warranty_type_enum DEFAULT 'no_warranty',
    ADD COLUMN IF NOT EXISTS warranty_duration_months INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS warranty_policy TEXT,
    ADD COLUMN IF NOT EXISTS warranty_provider_name TEXT,
    ADD COLUMN IF NOT EXISTS warranty_provider_contact TEXT,
    ADD COLUMN IF NOT EXISTS warranty_provider_email TEXT,
    ADD COLUMN IF NOT EXISTS warranty_terms_url TEXT;

    -- Create index for warranty-enabled products
    CREATE INDEX IF NOT EXISTS idx_products_has_warranty ON public.products(has_warranty) WHERE has_warranty = true;
    CREATE INDEX IF NOT EXISTS idx_products_warranty_type ON public.products(warranty_type);
    
    -- Add check constraint
    ALTER TABLE public.products
    DROP CONSTRAINT IF EXISTS warranty_duration_months_check;
    
    ALTER TABLE public.products
    ADD CONSTRAINT warranty_duration_months_check CHECK (warranty_duration_months >= 0);
    
    RAISE NOTICE 'Warranty columns added to products table successfully.';
  ELSE
    RAISE NOTICE 'Products table does not exist. Skipping warranty column additions.';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Add warranty columns to order_items table (if it exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_items') THEN
    -- Add warranty tracking to order items
    ALTER TABLE public.order_items
    ADD COLUMN IF NOT EXISTS warranty_expiration_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS warranty_start_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS warranty_type warranty_type_enum,
    ADD COLUMN IF NOT EXISTS warranty_duration_months INTEGER,
    ADD COLUMN IF NOT EXISTS warranty_provider_name TEXT,
    ADD COLUMN IF NOT EXISTS warranty_provider_contact TEXT,
    ADD COLUMN IF NOT EXISTS warranty_provider_email TEXT,
    ADD COLUMN IF NOT EXISTS warranty_terms_url TEXT,
    ADD COLUMN IF NOT EXISTS warranty_claimed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS warranty_claimed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS warranty_claim_reason TEXT,
    ADD COLUMN IF NOT EXISTS warranty_claim_status TEXT,
    ADD COLUMN IF NOT EXISTS warranty_claim_notes TEXT;

    -- Create indexes for warranty queries
    CREATE INDEX IF NOT EXISTS idx_order_items_warranty_expiration ON public.order_items(warranty_expiration_date) WHERE warranty_expiration_date IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_order_items_warranty_claimed ON public.order_items(warranty_claimed) WHERE warranty_claimed = true;
    CREATE INDEX IF NOT EXISTS idx_order_items_warranty_claim_status ON public.order_items(warranty_claim_status) WHERE warranty_claim_status IS NOT NULL;
    
    RAISE NOTICE 'Warranty columns added to order_items table successfully.';
  ELSE
    RAISE NOTICE 'Order_items table does not exist. Skipping warranty column additions.';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Create warranty_claims table (if order_items exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_items') THEN
    CREATE TABLE IF NOT EXISTS public.warranty_claims (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
      buyer_id UUID NOT NULL,
      seller_id UUID NOT NULL,

      -- Claim details
      claim_number TEXT UNIQUE NOT NULL,
      reason TEXT NOT NULL,
      description TEXT,
      claim_type TEXT NOT NULL,

      -- Evidence
      evidence_urls TEXT[],
      diagnostic_report_url TEXT,

      -- Status tracking
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT DEFAULT 'normal',

      -- Resolution
      resolution_type TEXT,
      resolution_description TEXT,
      resolution_amount NUMERIC(12, 2),
      resolved_at TIMESTAMPTZ,
      resolved_by UUID,

      -- Seller response
      seller_response TEXT,
      seller_response_at TIMESTAMPTZ,

      -- Admin notes
      admin_notes TEXT,

      -- Return/replacement tracking
      return_tracking_number TEXT,
      return_shipping_carrier TEXT,
      replacement_tracking_number TEXT,
      replacement_shipping_carrier TEXT,

      -- Timestamps
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      -- Constraints
      CONSTRAINT claim_type_check CHECK (claim_type IN ('repair', 'replacement', 'refund', 'technical_support')),
      CONSTRAINT status_check CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'repair_in_progress', 'replacement_sent', 'refund_processed', 'resolved', 'cancelled')),
      CONSTRAINT priority_check CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
      CONSTRAINT resolution_type_check CHECK (resolution_type IN ('repair', 'replacement', 'refund', 'technical_support', 'rejected'))
    );

    -- Create indexes for warranty claims
    CREATE INDEX IF NOT EXISTS idx_warranty_claims_order_item ON public.warranty_claims(order_item_id);
    CREATE INDEX IF NOT EXISTS idx_warranty_claims_buyer ON public.warranty_claims(buyer_id);
    CREATE INDEX IF NOT EXISTS idx_warranty_claims_seller ON public.warranty_claims(seller_id);
    CREATE INDEX IF NOT EXISTS idx_warranty_claims_status ON public.warranty_claims(status);
    CREATE INDEX IF NOT EXISTS idx_warranty_claims_claim_number ON public.warranty_claims(claim_number);
    
    RAISE NOTICE 'Warranty claims table created successfully.';
  ELSE
    RAISE NOTICE 'Order_items table does not exist. Skipping warranty_claims table creation.';
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Create warranty_actions_log table (if warranty_claims exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'warranty_claims') THEN
    CREATE TABLE IF NOT EXISTS public.warranty_actions_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      warranty_claim_id UUID REFERENCES public.warranty_claims(id) ON DELETE CASCADE,
      order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
      action_type TEXT NOT NULL,
      actor_id UUID,
      actor_role TEXT NOT NULL,
      description TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT action_type_check CHECK (action_type IN (
        'claim_created', 'claim_submitted', 'claim_reviewed', 'claim_approved', 
        'claim_rejected', 'claim_cancelled', 'claim_resolved', 'repair_started', 
        'replacement_shipped', 'refund_initiated', 'admin_escalated', 'note_added'
      )),
      CONSTRAINT actor_role_check CHECK (actor_role IN ('buyer', 'seller', 'admin', 'system'))
    );

    -- Create indexes for warranty actions
    CREATE INDEX IF NOT EXISTS idx_warranty_actions_claim ON public.warranty_actions_log(warranty_claim_id);
    CREATE INDEX IF NOT EXISTS idx_warranty_actions_order_item ON public.warranty_actions_log(order_item_id);
    CREATE INDEX IF NOT EXISTS idx_warranty_actions_created_at ON public.warranty_actions_log(created_at);
    
    RAISE NOTICE 'Warranty actions log table created successfully.';
  ELSE
    RAISE NOTICE 'Warranty claims table does not exist. Skipping warranty_actions_log table creation.';
  END IF;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================
