-- Migration 051: Add original_price column to products table
-- BX-03-002 / SCRUM2-195 – Seller web: original price not persisting on edit
--
-- original_price is the "was" / compare-at price shown as strikethrough.
-- It is optional (NULL = no strikethrough shown).
-- CHECK: when set, must be >= price (can't show a "was" price lower than current).

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS original_price numeric
    CHECK (original_price IS NULL OR original_price >= 0);

COMMENT ON COLUMN public.products.original_price IS
  'Compare-at / strikethrough price. Optional. When set and > price, buyers see the savings badge.';
