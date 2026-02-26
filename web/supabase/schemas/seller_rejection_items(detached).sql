create table public.seller_rejection_items (
  id uuid not null default gen_random_uuid (),
  rejection_id uuid not null,
  document_field text not null,
  reason text null,
  created_at timestamp with time zone not null default now(),
  constraint seller_rejection_items_pkey primary key (id),
  constraint seller_rejection_items_rejection_id_fkey foreign KEY (rejection_id) references seller_rejections (id) on delete CASCADE,
  constraint seller_rejection_items_document_field_check check (
    (
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
  )
) TABLESPACE pg_default;