-- ============================================================
-- Migration: partial_seller_rejections
-- Created:   2026-02-24
-- Description:
--   Extends seller_rejections to support partial rejections —
--   rejecting only specific verification documents rather than
--   the entire seller application.
--
--   Changes:
--   1. Alter public.seller_rejections
--        - Add seller_id FK (links rejection to a seller)
--        - Add rejection_type ('full' | 'partial')
--        - Make description nullable (optional overall note)
--   2. Create public.seller_rejection_items
--        - One row per rejected document field
--        - Constrained to known document field names
--   3. Alter public.sellers
--        - Add 'needs_resubmission' to approval_status check
-- ============================================================


-- ------------------------------------------------------------
-- 1. Alter public.seller_rejections
-- ------------------------------------------------------------

-- Link each rejection to the seller being rejected
alter table public.seller_rejections
  add column seller_id uuid null,
  add constraint seller_rejections_seller_id_fkey
    foreign key (seller_id) references public.sellers (id) on delete cascade;

-- Make seller_id required going forward (after back-fill if needed)
-- If there is no existing data you can make it NOT NULL immediately:
alter table public.seller_rejections
  alter column seller_id set not null;

-- Distinguish all-or-nothing rejections from document-level ones
alter table public.seller_rejections
  add column rejection_type text not null default 'full'::text,
  add constraint seller_rejections_type_check check (
    rejection_type = any (
      array['full'::text, 'partial'::text]
    )
  );

-- description was NOT NULL — relax it so partial rejections can
-- omit a top-level note and rely solely on per-item reasons
alter table public.seller_rejections
  alter column description drop not null;


-- ------------------------------------------------------------
-- 2. Create public.seller_rejection_items
--    One row per rejected document within a partial rejection
-- ------------------------------------------------------------

create table public.seller_rejection_items (
  id             uuid        not null default gen_random_uuid(),
  rejection_id   uuid        not null,
  document_field text        not null,
  reason         text        null,
  created_at     timestamp with time zone not null default now(),

  constraint seller_rejection_items_pkey
    primary key (id),

  constraint seller_rejection_items_rejection_id_fkey
    foreign key (rejection_id)
    references public.seller_rejections (id)
    on delete cascade,

  -- Constrained to the actual column names in seller_verification_documents
  -- so the application can map a rejection item directly to the field to highlight
  constraint seller_rejection_items_document_field_check check (
    document_field = any (
      array[
        'business_permit_url'::text,
        'valid_id_url'::text,
        'proof_of_address_url'::text,
        'dti_registration_url'::text,
        'tax_id_url'::text
      ]
    )
  )
) tablespace pg_default;


-- ------------------------------------------------------------
-- 3. Alter public.sellers — add needs_resubmission status
--    Used when a partial rejection is issued so the seller knows
--    they must resubmit specific documents (not fully rejected)
-- ------------------------------------------------------------

alter table public.sellers
  drop constraint sellers_approval_status_check;

alter table public.sellers
  add constraint sellers_approval_status_check check (
    approval_status = any (
      array[
        'pending'::text,
        'verified'::text,
        'rejected'::text,
        'needs_resubmission'::text
      ]
    )
  );
