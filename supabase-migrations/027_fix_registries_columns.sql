-- ============================================================================
-- FIX REGISTRIES TABLE COLUMNS
-- ============================================================================
-- This migration ensures the registries table has the correct columns for
-- privacy and delivery preferences.

-- First, let's check what exists
DO $$
BEGIN
    -- Add privacy column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'registries'
        AND column_name = 'privacy'
    ) THEN
        ALTER TABLE public.registries
        ADD COLUMN privacy VARCHAR(20) NOT NULL DEFAULT 'link' CHECK (privacy IN ('public', 'link', 'private'));
        
        RAISE NOTICE 'Added privacy column to registries table';
    ELSE
        -- Make sure privacy column has no default to prevent override
        ALTER TABLE public.registries ALTER COLUMN privacy DROP DEFAULT;
        RAISE NOTICE 'privacy column already exists - dropped default';
    END IF;

    -- Add delivery column (JSONB) if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'registries'
        AND column_name = 'delivery'
    ) THEN
        ALTER TABLE public.registries
        ADD COLUMN delivery JSONB NOT NULL DEFAULT '{"showAddress": false}'::jsonb;
        
        RAISE NOTICE 'Added delivery column to registries table';
    ELSE
        -- Make sure delivery column has no default to prevent override
        ALTER TABLE public.registries ALTER COLUMN delivery DROP DEFAULT;
        RAISE NOTICE 'delivery column already exists - dropped default';
    END IF;

    -- Add category column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'registries'
        AND column_name = 'category'
    ) THEN
        ALTER TABLE public.registries
        ADD COLUMN category VARCHAR(100);
        
        RAISE NOTICE 'Added category column to registries table';
    ELSE
        RAISE NOTICE 'category column already exists';
    END IF;
END $$;

-- Update existing NULL rows only
UPDATE public.registries
SET privacy = 'link'
WHERE privacy IS NULL;

UPDATE public.registries
SET delivery = '{"showAddress": false}'::jsonb
WHERE delivery IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_registries_privacy ON public.registries(privacy);
CREATE INDEX IF NOT EXISTS idx_registries_category ON public.registries(category);

-- Add comments
COMMENT ON COLUMN public.registries.privacy IS 'Privacy level: public (anyone can view), link (only with link), private (owner only)';
COMMENT ON COLUMN public.registries.delivery IS 'JSONB object with delivery preferences: {showAddress: boolean, addressId?: string, instructions?: string}';
COMMENT ON COLUMN public.registries.category IS 'Event category: wedding, baby, birthday, graduation, housewarming, christmas, other';

-- Verify the final state
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'registries'
  AND column_name IN ('privacy', 'delivery', 'category')
ORDER BY ordinal_position;
