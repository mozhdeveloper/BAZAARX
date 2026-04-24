-- 044: Notifications hardening (NON-DESTRUCTIVE consolidation)
--
-- Decision: KEEP the per-role 3-table layout (buyer_notifications,
-- seller_notifications, admin_notifications). Audit findings:
--   * Schemas are intentionally identical except for the recipient FK column
--     name. The split exists for RLS isolation — each table can be policed
--     against the corresponding role table (buyers/sellers/admins) without
--     a discriminator column or polymorphic JOIN.
--   * Code already abstracts writes behind notificationService.notifyBuyer*,
--     notifySeller*, notifyAdmin*. There is no overlap concern.
--   * Unifying into a single `notifications` table would require touching
--     100+ web + mobile call sites and rewriting all RLS policies — a
--     destructive risk the user explicitly forbade.
--
-- This migration only fixes the *real* problems found in the audit:
--   1. seller_notifications.seller_id_fkey lacks ON DELETE CASCADE (buyer
--      and admin both have it) — inconsistent. Verified 0 orphans first.
--   2. Redundant duplicate index idx_seller_notifications_seller_id_created_at
--      (identical to idx_seller_notifications_seller_id) — wasted disk +
--      write overhead.
--   3. admin_notifications has NO index on admin_id — every "my admin
--      notifications" query is a full scan. Currently 0 rows so harmless,
--      but a production trap.
--   4. No partial unread index on any of the three. Every unread-badge
--      count query (the most frequent notification query in the UI) hits
--      a full pkey scan on a (potentially large) table. Adding a partial
--      index `WHERE read_at IS NULL` makes badge counts O(unread), not
--      O(total).
--   5. No table comments documenting the per-role split — future
--      contributors keep proposing to unify them.
--
-- Idempotent + additive. No data is rewritten or deleted.

BEGIN;

-- ------------------------------------------------------------------
-- 1. Rebuild seller_notifications FK with ON DELETE CASCADE.
--    Re-verify 0 orphans inside the transaction (race protection).
-- ------------------------------------------------------------------
DO $body$
DECLARE
  v_orphans integer;
  v_def     text;
BEGIN
  SELECT count(*) INTO v_orphans
  FROM public.seller_notifications n
  WHERE NOT EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = n.seller_id);

  IF v_orphans > 0 THEN
    RAISE EXCEPTION
      'Aborting 044: % orphan seller_notifications rows; cannot add CASCADE FK',
      v_orphans;
  END IF;

  SELECT pg_get_constraintdef(oid) INTO v_def
  FROM pg_constraint
  WHERE conrelid = 'public.seller_notifications'::regclass
    AND conname  = 'seller_notifications_seller_id_fkey';

  IF v_def IS NOT NULL AND v_def NOT LIKE '%ON DELETE CASCADE%' THEN
    ALTER TABLE public.seller_notifications
      DROP CONSTRAINT seller_notifications_seller_id_fkey;
    ALTER TABLE public.seller_notifications
      ADD CONSTRAINT seller_notifications_seller_id_fkey
      FOREIGN KEY (seller_id) REFERENCES public.sellers(id) ON DELETE CASCADE;
  END IF;
END
$body$;

-- ------------------------------------------------------------------
-- 2. Drop the redundant duplicate index on seller_notifications.
--    idx_seller_notifications_seller_id and
--    idx_seller_notifications_seller_id_created_at have IDENTICAL
--    definitions (btree (seller_id, created_at DESC)). Keep the
--    shorter-named one.
-- ------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_seller_notifications_seller_id_created_at;

-- ------------------------------------------------------------------
-- 3. Add missing index on admin_notifications(admin_id, created_at DESC)
--    matching the buyer/seller pattern.
-- ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin_id
  ON public.admin_notifications (admin_id, created_at DESC);

-- ------------------------------------------------------------------
-- 4. Partial unread indexes for fast badge-count queries.
--    The unread-badge query is `SELECT count(*) WHERE recipient=? AND
--    read_at IS NULL`. A partial index keyed on the recipient column
--    keeps this O(unread) instead of O(total).
-- ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_buyer_notifications_unread
  ON public.buyer_notifications (buyer_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_seller_notifications_unread
  ON public.seller_notifications (seller_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread
  ON public.admin_notifications (admin_id, created_at DESC)
  WHERE read_at IS NULL;

-- ------------------------------------------------------------------
-- 5. Document the deliberate per-role split.
-- ------------------------------------------------------------------
COMMENT ON TABLE public.buyer_notifications IS
  'In-app notifications for buyer role. Schema is intentionally identical to '
  'seller_notifications and admin_notifications; the split is for RLS '
  'isolation against buyers(id). Write via notificationService.notifyBuyer* '
  '(web/mobile). Do NOT query across notification tables; use the role-'
  'specific service method.';

COMMENT ON TABLE public.seller_notifications IS
  'In-app notifications for seller role. Schema is intentionally identical to '
  'buyer_notifications and admin_notifications; the split is for RLS '
  'isolation against sellers(id). Write via notificationService.notifySeller* '
  '(web/mobile). Do NOT query across notification tables; use the role-'
  'specific service method.';

COMMENT ON TABLE public.admin_notifications IS
  'In-app notifications for admin role. Schema is intentionally identical to '
  'buyer_notifications and seller_notifications; the split is for RLS '
  'isolation against admins(id). Write via notificationService.notifyAdmin* '
  '(web/mobile). Do NOT query across notification tables; use the role-'
  'specific service method.';

COMMIT;
