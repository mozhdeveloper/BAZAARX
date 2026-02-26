create table public.profiles (
  id uuid not null,
  email text not null,
  first_name text null,
  last_name text null,
  phone text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  last_login_at timestamp with time zone null,
  constraint profiles_pkey primary key (id),
  constraint profiles_email_key unique (email),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint valid_email check (
    (
      email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text
    )
  )
) TABLESPACE pg_default;

create trigger trg_profiles_updated_at BEFORE
update on profiles for EACH row
execute FUNCTION update_updated_at_column ();