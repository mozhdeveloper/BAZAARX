create table public.shipping_addresses (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  label text not null,
  address_line_1 text not null,
  address_line_2 text null,
  barangay text null,
  city text not null,
  province text not null,
  region text not null,
  postal_code text not null,
  landmark text null,
  delivery_instructions text null,
  is_default boolean not null default false,
  address_type text not null default 'residential'::text,
  coordinates jsonb null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint shipping_addresses_pkey primary key (id),
  constraint shipping_addresses_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE,
  constraint shipping_addresses_address_type_check check (
    (
      address_type = any (array['residential'::text, 'commercial'::text])
    )
  )
) TABLESPACE pg_default;

create trigger trg_shipping_addresses_updated_at BEFORE
update on shipping_addresses for EACH row
execute FUNCTION update_updated_at_column ();