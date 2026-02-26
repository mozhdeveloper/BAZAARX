create table public.seller_rejections (
  id uuid not null default gen_random_uuid (),
  description text null,
  created_by uuid null,
  created_at timestamp with time zone not null default now(),
  seller_id uuid not null,
  rejection_type text not null default 'full'::text,
  constraint seller_rejections_pkey primary key (id),
  constraint seller_rejections_created_by_fkey foreign KEY (created_by) references admins (id) on delete set null,
  constraint seller_rejections_seller_id_fkey foreign KEY (seller_id) references sellers (id) on delete CASCADE,
  constraint seller_rejections_type_check check (
    (
      rejection_type = any (array['full'::text, 'partial'::text])
    )
  )
) TABLESPACE pg_default;