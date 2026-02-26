create table public.review_images (
  id uuid not null default gen_random_uuid (),
  review_id uuid not null,
  image_url text not null,
  sort_order integer not null default 0,
  uploaded_at timestamp with time zone not null default now(),
  constraint review_images_pkey primary key (id),
  constraint review_images_review_id_fkey foreign KEY (review_id) references reviews (id) on delete CASCADE,
  constraint valid_url check ((image_url ~ '^https?://'::text))
) TABLESPACE pg_default;