create table public.order_shipments (
  id uuid not null default gen_random_uuid (),
  order_id uuid not null,
  status text not null,
  shipping_method jsonb null,
  tracking_number text null,
  shipped_at timestamp with time zone null,
  delivered_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  constraint order_shipments_pkey primary key (id),
  constraint order_shipments_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE
) TABLESPACE pg_default;