-- Migration: Add store_contact_number to sellers table
-- Created: 2026-02-25

alter table public.sellers
  add column store_contact_number text null;
