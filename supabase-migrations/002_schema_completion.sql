-- ============================================================================
-- BAZAAR DATABASE SCHEMA COMPLETION
-- February 2026
-- 
-- This migration adds any missing tables to complete the normalized schema.
-- Run this after verifying your existing tables.
-- ============================================================================

-- ============================================================================
-- 1. SELLER RELATED TABLES (if not exist)
-- ============================================================================

-- Seller Business Information
CREATE TABLE IF NOT EXISTS seller_business_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    business_name VARCHAR(255),
    business_type VARCHAR(100),
    business_registration_number VARCHAR(100),
    tax_id VARCHAR(100),
    business_address TEXT,
    business_phone VARCHAR(50),
    business_email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(seller_id)
);

-- Seller Store Information
CREATE TABLE IF NOT EXISTS seller_store_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    store_name VARCHAR(255),
    store_description TEXT,
    store_logo_url TEXT,
    store_banner_url TEXT,
    store_slug VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(seller_id)
);

-- Seller Documents
CREATE TABLE IF NOT EXISTS seller_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_url TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. ENSURE PROFILES HAS CORRECT COLUMNS
-- ============================================================================

-- Add first_name if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'first_name') THEN
        ALTER TABLE profiles ADD COLUMN first_name VARCHAR(100);
    END IF;
END $$;

-- Add last_name if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'last_name') THEN
        ALTER TABLE profiles ADD COLUMN last_name VARCHAR(100);
    END IF;
END $$;

-- Migrate full_name to first_name/last_name if needed
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        -- Split full_name into first_name and last_name
        UPDATE profiles 
        SET first_name = SPLIT_PART(full_name, ' ', 1),
            last_name = SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)
        WHERE full_name IS NOT NULL 
          AND first_name IS NULL;
    END IF;
END $$;

-- ============================================================================
-- 3. ENSURE MESSAGES TABLE HAS CORRECT STRUCTURE
-- ============================================================================

-- Add sender_type if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'sender_type') THEN
        ALTER TABLE messages ADD COLUMN sender_type VARCHAR(20) DEFAULT 'buyer';
    END IF;
END $$;

-- Add read_at if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'read_at') THEN
        ALTER TABLE messages ADD COLUMN read_at TIMESTAMPTZ;
    END IF;
END $$;

-- ============================================================================
-- 4. ENSURE AI_MESSAGES HAS CORRECT STRUCTURE
-- ============================================================================

-- Add role column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ai_messages' AND column_name = 'role') THEN
        ALTER TABLE ai_messages ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user';
    END IF;
END $$;

-- ============================================================================
-- 5. ENSURE ORDER_RECIPIENTS EXISTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(order_id)
);

-- ============================================================================
-- 6. ENSURE SHIPPING_ADDRESSES HAS CORRECT STRUCTURE
-- ============================================================================

-- Add buyer_id if it references profiles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipping_addresses' AND column_name = 'buyer_id') THEN
        ALTER TABLE shipping_addresses ADD COLUMN buyer_id UUID REFERENCES buyers(id);
    END IF;
END $$;

-- ============================================================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_seller_business_info_seller_id ON seller_business_info(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_store_info_seller_id ON seller_store_info(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_documents_seller_id ON seller_documents(seller_id);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_order_recipients_order_id ON order_recipients(order_id);

-- ============================================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE seller_business_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_store_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_recipients ENABLE ROW LEVEL SECURITY;

-- Policies for seller_business_info
CREATE POLICY IF NOT EXISTS "Sellers can view own business info" 
    ON seller_business_info FOR SELECT 
    USING (seller_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Sellers can update own business info" 
    ON seller_business_info FOR UPDATE 
    USING (seller_id = auth.uid());

-- Policies for seller_store_info
CREATE POLICY IF NOT EXISTS "Anyone can view store info" 
    ON seller_store_info FOR SELECT 
    TO PUBLIC
    USING (true);

CREATE POLICY IF NOT EXISTS "Sellers can update own store info" 
    ON seller_store_info FOR UPDATE 
    USING (seller_id = auth.uid());

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Run this to verify all tables exist:
/*
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'profiles', 'user_roles', 'buyers', 'sellers',
    'seller_business_info', 'seller_store_info', 'seller_documents',
    'categories', 'products', 'product_images', 'product_variants',
    'product_assessments', 'product_approvals', 'product_rejections', 'product_revisions',
    'carts', 'cart_items',
    'orders', 'order_items', 'order_recipients', 'shipping_addresses',
    'conversations', 'messages',
    'ai_conversations', 'ai_messages'
  )
ORDER BY table_name;
*/
