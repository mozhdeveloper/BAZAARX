create table public.review_votes (
  review_id uuid not null,
  buyer_id uuid not null,
  created_at timestamp with time zone not null default now(),
  constraint review_votes_pkey primary key (review_id, buyer_id),
  constraint review_votes_buyer_id_fkey foreign KEY (buyer_id) references profiles (id) on delete CASCADE,
  constraint review_votes_review_id_fkey foreign KEY (review_id) references reviews (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_review_votes_review_id on public.review_votes using btree (review_id) TABLESPACE pg_default;

create index IF not exists idx_review_votes_buyer_id on public.review_votes using btree (buyer_id) TABLESPACE pg_default;

create trigger tr_update_helpful_count
after INSERT
or DELETE on review_votes for EACH row
execute FUNCTION update_helpful_count ();