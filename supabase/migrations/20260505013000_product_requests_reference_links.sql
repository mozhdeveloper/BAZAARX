-- Migration: add reference_links column to product_requests
-- Allows buyers to attach URLs (product pages, marketplace links, etc.)
-- when submitting a product request.

ALTER TABLE product_requests
  ADD COLUMN IF NOT EXISTS reference_links text[] NOT NULL DEFAULT '{}';
