create table public.product_variants (
  id uuid not null default gen_random_uuid (),
  product_id uuid not null,
  sku text not null,
  barcode text null,
  variant_name text not null,
  size text null,
  color text null,
  option_1_value text null,
  option_2_value text null,
  price numeric not null,
  stock integer not null default 0,
  thumbnail_url text null,
  embedding public.vector null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint product_variants_pkey primary key (id),
  constraint product_variants_barcode_key unique (barcode),
  constraint product_variants_sku_key unique (sku),
  constraint product_variants_product_id_fkey foreign KEY (product_id) references products (id) on delete CASCADE,
  constraint product_variants_price_check check ((price >= (0)::numeric)),
  constraint product_variants_stock_check check ((stock >= 0))
) TABLESPACE pg_default;

create trigger trg_check_low_stock
after INSERT
or DELETE
or
update on product_variants for EACH row
execute FUNCTION check_product_low_stock ();

create trigger trg_product_variants_updated_at BEFORE
update on product_variants for EACH row
execute FUNCTION update_updated_at_column ();