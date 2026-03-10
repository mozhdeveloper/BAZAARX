-- Migration: 016_seller_verification_document_drafts.sql
-- Description: Stage seller verification documents until resubmission
-- Date: 2026-03-10

CREATE TABLE IF NOT EXISTS seller_verification_document_drafts (
  seller_id UUID PRIMARY KEY REFERENCES sellers(id) ON DELETE CASCADE,
  business_permit_url TEXT,
  business_permit_updated_at TIMESTAMPTZ,
  valid_id_url TEXT,
  valid_id_updated_at TIMESTAMPTZ,
  proof_of_address_url TEXT,
  proof_of_address_updated_at TIMESTAMPTZ,
  dti_registration_url TEXT,
  dti_registration_updated_at TIMESTAMPTZ,
  tax_id_url TEXT,
  tax_id_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_verification_document_drafts_seller_id
  ON seller_verification_document_drafts (seller_id);
