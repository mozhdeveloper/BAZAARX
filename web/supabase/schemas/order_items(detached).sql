create table public.order_items (
  id uuid not null default gen_random_uuid (),
  order_id uuid not null,
  product_id uuid null,
  product_name text not null,
  primary_image_url text null,
  price numeric not null,
  price_discount numeric not null default 0,
  shipping_price numeric not null default 0,
  shipping_discount numeric not null default 0,
  quantity integer not null,
  variant_id uuid null,
  personalized_options jsonb null,
  rating integer null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint order_items_pkey primary key (id),
  constraint order_items_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE,
  constraint order_items_product_id_fkey foreign KEY (product_id) references products (id) on delete set null,
  constraint order_items_variant_id_fkey foreign KEY (variant_id) references product_variants (id) on delete set null,
  constraint order_items_shipping_price_check check ((shipping_price >= (0)::numeric)),
  constraint order_items_quantity_check check ((quantity > 0)),
  constraint order_items_rating_check check (
    (
      (rating >= 1)
      and (rating <= 5)
    )
  ),
  constraint order_items_shipping_discount_check check ((shipping_discount >= (0)::numeric)),
  constraint order_items_price_check check ((price >= (0)::numeric)),
  constraint order_items_price_discount_check check ((price_discount >= (0)::numeric))
) TABLESPACE pg_default;

create trigger trg_order_items_updated_at BEFORE
update on order_items for EACH row
execute FUNCTION update_updated_at_column ();