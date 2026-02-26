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
  order_item_id uuid null,
  variant_snapshot jsonb null,
  constraint reviews_pkey primary key (id),
  constraint reviews_order_id_fkey foreign KEY (order_id) references orders (id) on delete set null,
  constraint reviews_order_item_id_fkey foreign KEY (order_item_id) references order_items (id) on delete set null,
  constraint reviews_buyer_id_fkey foreign KEY (buyer_id) references buyers (id) on delete CASCADE,
  constraint reviews_product_id_fkey foreign KEY (product_id) references products (id) on delete CASCADE,
  constraint reviews_variant_snapshot_object_check check (
    (
      (variant_snapshot is null)
      or (jsonb_typeof(variant_snapshot) = 'object'::text)
    )
  ),
  constraint reviews_rating_check check (
    (
      (rating >= 1)
      and (rating <= 5)
    )
  ),
  constraint reviews_helpful_count_check check ((helpful_count >= 0))
) TABLESPACE pg_default;

create index IF not exists idx_reviews_order_item_id on public.reviews using btree (order_item_id) TABLESPACE pg_default;

create unique INDEX IF not exists reviews_uq_buyer_order_item on public.reviews using btree (buyer_id, order_item_id) TABLESPACE pg_default
where
  (order_item_id is not null);

create unique INDEX IF not exists reviews_uq_order_buyer_product_legacy on public.reviews using btree (order_id, buyer_id, product_id) TABLESPACE pg_default
where
  (
    (order_item_id is null)
    and (order_id is not null)
  );

create trigger trg_reviews_updated_at BEFORE
update on reviews for EACH row
execute FUNCTION update_updated_at_column ();