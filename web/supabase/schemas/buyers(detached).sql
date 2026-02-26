create table public.buyers (
  id uuid not null,
  avatar_url text null,
  preferences jsonb null default '{}'::jsonb,
  bazcoins integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint buyers_pkey primary key (id),
  constraint buyers_id_fkey foreign KEY (id) references profiles (id) on delete CASCADE,
  constraint buyers_bazcoins_check check ((bazcoins >= 0))
) TABLESPACE pg_default;

create trigger trg_buyers_updated_at BEFORE
update on buyers for EACH row
execute FUNCTION update_updated_at_column ();