# Reviews Feature Migration (New Schema)

## Scope

This document describes the implemented migration of order reviews to the new normalized schema and the remaining storage work.

Target schema tables:

- `reviews`
- `review_images`

## What Was Implemented

### 1) Review write flow now uses normalized tables

- Buyer review submission now writes review records to `reviews`.
- For each created review, image metadata is written to `review_images` with:
  - `review_id`
  - `image_url`
  - `sort_order`
- Duplicate review creation is guarded at service level by checking existing rows per:
  - `order_id`
  - `buyer_id`
  - `product_id`

### 2) Buyer order screens now read review state from `reviews`

- Buyer order queries include `reviews` and nested `review_images`.
- Buyer order status (`reviewed`) is derived from joined review rows, not legacy `orders.is_reviewed` columns.
- Buyer order snapshots include review summary data (rating/comment/images/date) sourced from the joined rows.
- Review submission triggers buyer order refresh so reviewed state appears immediately.

### 3) Seller order screens now reflect buyer reviews

- Seller order queries include `reviews` and nested `review_images`.
- Reviews are filtered to seller-relevant products on mixed-seller orders.
- Seller order snapshots expose review summary fields and review list data for UI.
- Seller order UI now surfaces review indicators/details in order views.

### 4) Legacy compatibility kept during transition

- Mapping still hydrates compatibility fields like `rating`, `reviewComment`, `reviewImages`, and `reviewDate` from normalized review rows.
- Existing UI code paths relying on these fields continue to work while using new-source data.

### 5) Seller review query fixes

- Any review lookup that previously assumed `reviews.seller_id` now resolves seller scope via:
  - `reviews.product_id -> products.seller_id`

## Storage Integration Status

Review image upload is now implemented against Supabase Storage and persisted to `review_images`.

### Current behavior with storage

- Buyer-selected review photos are uploaded to the `review-images` bucket on review submit.
- Upload path format is `<buyer_id>/<review_id>/<filename>` to align with storage policies.
- Uploaded public URLs are inserted into `review_images` with deterministic `sort_order`.
- Local preview URLs (for example `blob:`) are never written to the database.
- Review submission remains successful even if image upload partially fails; available uploaded URLs are still saved.

### Operational notes

1. Apply migration:
   - `supabase/migrations/20260216141000_fix_review_images_storage_folder_depth.sql`
2. Bucket is configured as public in the migration; switch to signed URLs if private access is required.
3. Keep object key convention `<buyer_id>/<review_id>/<filename>` for policy compatibility.
4. Optional follow-up: add background cleanup for orphaned files when uploads succeed but metadata insert fails.

## Recommended DB Hardening (Follow-up)

Add a unique constraint to prevent duplicate review rows across race conditions:

- unique (`order_id`, `buyer_id`, `product_id`)

This complements service-level duplicate checks.
