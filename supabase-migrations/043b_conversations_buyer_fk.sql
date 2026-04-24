-- =====================================================================
-- 043b_conversations_buyer_fk.sql
-- Purpose: Standardize conversations.buyer_id FK target.
--
-- Current state:
--   FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE CASCADE
--
-- Problem:
--   * Only table in public schema with an FK to auth.users (every other
--     user-referencing table targets public.profiles).
--   * ON DELETE CASCADE silently nukes conversation history when an
--     auth user is deleted — destroys evidence for disputes/refunds.
--
-- Target state:
--   FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE SET NULL
--
-- Safety:
--   * Audit (2026-04-24) confirmed 0 orphan rows where buyer_id has no
--     matching profiles row, so the new FK is satisfiable.
--   * Re-checked inside this migration before the swap; aborts if any
--     orphan appears (race with another writer).
--   * Single transaction: DROP + ADD are atomic.
--   * Idempotent: skips if already pointing at profiles.
-- =====================================================================

BEGIN;

DO $$
DECLARE
  v_current_def text;
  v_orphans     integer;
BEGIN
  SELECT pg_get_constraintdef(oid)
    INTO v_current_def
    FROM pg_constraint
   WHERE conrelid = 'public.conversations'::regclass
     AND conname  = 'conversations_buyer_id_fkey';

  IF v_current_def IS NULL THEN
    RAISE NOTICE '[043b] conversations_buyer_id_fkey not found — skipping';
    RETURN;
  END IF;

  IF v_current_def ILIKE '%REFERENCES profiles%' THEN
    RAISE NOTICE '[043b] FK already targets profiles — skipping';
    RETURN;
  END IF;

  -- Re-verify no orphans right before the swap.
  SELECT count(*)
    INTO v_orphans
    FROM public.conversations c
   WHERE c.buyer_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = c.buyer_id);

  IF v_orphans > 0 THEN
    RAISE EXCEPTION '[043b] ABORT: % conversations.buyer_id rows have no matching profile', v_orphans;
  END IF;

  ALTER TABLE public.conversations
    DROP CONSTRAINT conversations_buyer_id_fkey;

  ALTER TABLE public.conversations
    ADD CONSTRAINT conversations_buyer_id_fkey
    FOREIGN KEY (buyer_id)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;

  RAISE NOTICE '[043b] conversations.buyer_id FK swapped to profiles ON DELETE SET NULL';
END $$;

COMMENT ON CONSTRAINT conversations_buyer_id_fkey
  ON public.conversations IS
  'Standardized in 043b: targets public.profiles with ON DELETE SET NULL to preserve dispute/refund history when a user is deleted.';

COMMIT;
