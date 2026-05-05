-- Enable Supabase Realtime for the messages table.
--
-- This is required for the direct-messages subscription in
-- useGlobalNotifications.ts to receive INSERT events via postgres_changes.
-- Without this, the mobile fallback subscription silently never fires.
--
-- Safe to run multiple times — the DO block handles the case where the table
-- is already in the publication.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- messages was already in the publication — nothing to do.
  NULL;
END;
$$;
