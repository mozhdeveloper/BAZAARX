create table public.sellers (
  id uuid not null,
  store_name text not null,
  store_description text null,
  avatar_url text null,
  owner_name text null,
  approval_status text not null default 'pending'::text,
  verified_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint sellers_pkey primary key (id),
  constraint sellers_store_name_key unique (store_name),
  constraint sellers_id_fkey foreign KEY (id) references profiles (id) on delete CASCADE,
  constraint sellers_approval_status_check check (
    (
      approval_status = any (
        array[
          'pending'::text,
          'verified'::text,
          'rejected'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create trigger trg_sellers_updated_at BEFORE
update on sellers for EACH row
execute FUNCTION update_updated_at_column ();