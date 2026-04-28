-- =====================================================================
-- Migration 047: Final invariant cleanup â€” courier_rate_cache hardening
-- =====================================================================
-- Context: Master 20-check invariant verification (2026-04-24) revealed
-- that prior audits referenced a non-existent `created_at` column on
-- public.courier_rate_cache. The actual cache columns are `cached_at`
-- and `expires_at`, both nullable despite having sane defaults. This
-- migration enforces NOT NULL on both (0 NULL rows verified, 615 total)
-- so the cache invariants match the rest of the schema.
-- =====================================================================

BEGIN;

ALTER TABLE public.courier_rate_cache
  ALTER COLUMN cached_at SET DEFAULT now(),
  ALTER COLUMN cached_at SET NOT NULL,
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '24 hours'),
  ALTER COLUMN expires_at SET NOT NULL;

COMMENT ON COLUMN public.courier_rate_cache.cached_at IS
  'When the rate was cached. NOT NULL with default now() (migration 047).';
COMMENT ON COLUMN public.courier_rate_cache.expires_at IS
  'When the cached rate expires. NOT NULL with default now()+24h (migration 047).';

-- Post-check
DO $$
DECLARE
  cached_nullable text;
  expires_nullable text;
BEGIN
  SELECT is_nullable INTO cached_nullable
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='courier_rate_cache' AND column_name='cached_at';
  SELECT is_nullable INTO expires_nullable
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='courier_rate_cache' AND column_name='expires_at';
  IF cached_nullable <> 'NO' OR expires_nullable <> 'NO' THEN
    RAISE EXCEPTION 'Migration 047 post-check failed: cached_at=% expires_at=%', cached_nullable, expires_nullable;
  END IF;
END $$;

COMMIT;
