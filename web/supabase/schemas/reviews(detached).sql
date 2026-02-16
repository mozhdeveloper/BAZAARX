create table public.reviews (
  id uuid not null default gen_random_uuid (),
  product_id uuid not null,
  buyer_id uuid not null,
  order_id uuid null,
  rating integer not null,
  comment text null,
  helpful_count integer not null default 0,
  seller_reply jsonb null,
  is_verified_purchase boolean not null default false,
  is_hidden boolean not null default false,
  is_edited boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint reviews_pkey primary key (id),
  constraint reviews_buyer_id_fkey foreign KEY (buyer_id) references buyers (id) on delete CASCADE,
  constraint reviews_order_id_fkey foreign KEY (order_id) references orders (id) on delete set null,
  constraint reviews_product_id_fkey foreign KEY (product_id) references products (id) on delete CASCADE,
  constraint reviews_helpful_count_check check ((helpful_count >= 0)),
  constraint reviews_rating_check check (
    (
      (rating >= 1)
      and (rating <= 5)
    )
  )
) TABLESPACE pg_default;

create trigger trg_reviews_updated_at BEFORE
update on reviews for EACH row
execute FUNCTION update_updated_at_column ();