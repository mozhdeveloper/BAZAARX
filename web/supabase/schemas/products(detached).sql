create table public.products (
  id uuid not null default gen_random_uuid (),
  name text not null,
  description text null,
  category_id uuid not null,
  brand text null,
  sku text null,
  specifications jsonb null default '{}'::jsonb,
  approval_status text not null default 'pending'::text,
  variant_label_1 text null,
  variant_label_2 text null,
  price numeric not null,
  low_stock_threshold integer not null default 10,
  weight numeric null,
  dimensions jsonb null,
  is_free_shipping boolean not null default false,
  disabled_at timestamp with time zone null,
  deleted_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  image_embedding public.vector null,
  seller_id uuid null,
  constraint products_pkey primary key (id),
  constraint products_sku_key unique (sku),
  constraint products_category_id_fkey foreign KEY (category_id) references categories (id) on delete RESTRICT,
  constraint products_seller_id_fkey foreign KEY (seller_id) references sellers (id) on delete set null,
  constraint products_weight_check check ((weight > (0)::numeric)),
  constraint products_low_stock_threshold_check check ((low_stock_threshold >= 0)),
  constraint products_price_check check ((price >= (0)::numeric)),
  constraint products_approval_status_check check (
    (
      approval_status = any (
        array[
          'pending'::text,
          'approved'::text,
          'rejected'::text,
          'reclassified'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_products_seller_id on public.products using btree (seller_id) TABLESPACE pg_default;

create trigger trg_products_updated_at BEFORE
update on products for EACH row
execute FUNCTION update_updated_at_column ();