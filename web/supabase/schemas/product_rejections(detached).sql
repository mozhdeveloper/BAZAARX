create table public.product_rejections (
  id uuid not null default gen_random_uuid (),
  assessment_id uuid null,
  product_id uuid null,
  description text null,
  vendor_submitted_category text null,
  admin_reclassified_category text null,
  created_at timestamp with time zone not null default now(),
  created_by uuid null,
  constraint product_rejections_pkey primary key (id),
  constraint product_rejections_assessment_id_fkey foreign KEY (assessment_id) references product_assessments (id) on delete CASCADE,
  constraint product_rejections_created_by_fkey foreign KEY (created_by) references admins (id) on delete set null,
  constraint product_rejections_product_id_fkey foreign KEY (product_id) references products (id) on delete CASCADE,
  constraint product_rejection_subject check (
    (
      (assessment_id is not null)
      or (product_id is not null)
    )
  )
) TABLESPACE pg_default;