create table public.product_images (
  id uuid not null default gen_random_uuid (),
  product_id uuid not null,
  image_url text not null,
  alt_text text null,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  uploaded_at timestamp with time zone not null default now(),
  constraint product_images_pkey primary key (id),
  constraint product_images_product_id_fkey foreign KEY (product_id) references products (id) on delete CASCADE,
  constraint valid_url check ((image_url ~ '^https?://'::text))
) TABLESPACE pg_default;