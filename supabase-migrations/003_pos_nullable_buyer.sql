-- Migration: Allow NULL buyer_id for POS walk-in orders
-- This allows sellers to create POS orders without requiring a registered buyer account

-- Make buyer_id nullable in orders table for walk-in POS sales
ALTER TABLE orders ALTER COLUMN buyer_id DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN orders.buyer_id IS 'Buyer ID - nullable for POS walk-in orders where customer is not registered';
