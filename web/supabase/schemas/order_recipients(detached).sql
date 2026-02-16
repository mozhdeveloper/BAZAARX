create table public.order_recipients (
  id uuid not null default gen_random_uuid (),
  first_name text null,
  last_name text null,
  phone text null,
  email text null,
  created_at timestamp with time zone not null default now(),
  constraint order_recipients_pkey primary key (id)
) TABLESPACE pg_default;