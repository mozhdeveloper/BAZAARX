create table public.order_cancellations (
  id uuid not null default gen_random_uuid (),
  order_id uuid not null,
  reason text null,
  cancelled_at timestamp with time zone null,
  cancelled_by uuid null,
  created_at timestamp with time zone not null default now(),
  constraint order_cancellations_pkey primary key (id),
  constraint order_cancellations_cancelled_by_fkey foreign KEY (cancelled_by) references profiles (id) on delete set null,
  constraint order_cancellations_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE
) TABLESPACE pg_default;