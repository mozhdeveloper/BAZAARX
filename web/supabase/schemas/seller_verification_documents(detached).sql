create table public.seller_verification_documents (
  seller_id uuid not null,
  business_permit_url text null,
  valid_id_url text null,
  proof_of_address_url text null,
  dti_registration_url text null,
  tax_id_url text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint seller_verification_documents_pkey primary key (seller_id),
  constraint seller_verification_documents_seller_id_fkey foreign KEY (seller_id) references sellers (id) on delete CASCADE
) TABLESPACE pg_default;
