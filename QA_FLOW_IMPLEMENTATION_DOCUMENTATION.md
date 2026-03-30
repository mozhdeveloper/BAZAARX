# QA Flow Implementation Documentation

## Date
2026-03-29

## Scope
This document summarizes the implemented changes to the Seller -> Admin -> QA product review flow, including status behavior, tab behavior, and batch submission handling.

---

## Final Workflow (Implemented)

### 1) Seller submits product
- Initial status: `pending_admin_review`
- Admin can review listing details before product proceeds.

### 2) Admin listing decision
- Approve -> `waiting_for_sample`
- Reject -> `rejected`
- Request revision -> `for_revision`

### 3) Seller sample submission
- Seller sees approved products under **Awaiting Sample**.
- Seller can:
  - Select submittable products
  - Create new batch folder (custom name) or add/move to existing batch
  - Open folder-level submit flow
  - Choose logistics and complete courier/drop-off details
- After final logistics submission, products move to `pending_physical_review` (QA queue).

### 4) QA review (sample-based)
- QA should review only products in `pending_physical_review`.
- QA reviews by batch:
  - Batch list
  - Expand batch to view submitted products
  - Open product and complete assessment form
- QA outcomes:
  - Approve -> `verified` (goes live)
  - Request revision -> `for_revision`
  - Reject -> `rejected`

---

## Canonical Status Values

- `pending_admin_review`
- `waiting_for_sample`
- `pending_physical_review`
- `for_revision`
- `verified`
- `rejected`

Notes:
- `pending_digital_review` remains in some compatibility paths but is not part of the finalized primary flow.

---

## Role-Based Tabs and Behavior

## Seller
- **Pending**: items under admin review (`pending_admin_review`)
- **Awaiting Sample**: admin-approved items waiting for sample logistics (`waiting_for_sample`)
- **QA Queue**: submitted sample items (`pending_physical_review`)
- **For Revision**: `for_revision`
- **Verified**: `verified`
- **Rejected**: `rejected`

### Seller interaction updates
- In **Awaiting Sample**, when any item is selected:
  - Row-level individual submit buttons are hidden
  - Bottom action becomes batch-first: create/add/move batch
- Products already in a folder can be moved to another folder while still not submitted.

## Admin
- Full visibility across pipeline.
- Actionable only for listing stage:
  - `pending_admin_review`: approve / reject / revise
- Read-only visibility for post-approval QA stages:
  - `waiting_for_sample`
  - `pending_physical_review`
  - final states

## QA Team
- Should not process pre-sample states.
- Primary actionable queue: `pending_physical_review`
- In Sample QA tab:
  - Batch submissions listed first
  - Click batch to expand and view only products in that batch
  - Per-product **Assess Product** action opens assessment form
- Footer action buttons in details are replaced by QAForm-driven decisions during QA assessment flow.

---

## Batch System Changes

## UX changes
- Batch creation supports custom folder naming.
- Add-to-existing and move-between-folder flows are available.
- Folder-level submit flow triggers logistics selection and final submission.

## Data model changes
- Batch actions are wired to normalized tables:
  - `qa_submission_batches`
  - `qa_submission_batch_items`
- Logistics table stores structured batch reference via:
  - `product_assessment_logistics.batch_id`

## Compatibility behavior
- JSON logistics detail parsing is still retained as fallback/compatibility in some UI/service transforms.
- Normalized batch tables are now the primary source for batch identity and relationships.

---

## Files Updated (Implementation)

### Frontend pages
- `web/src/pages/SellerProductStatus.tsx`
  - Awaiting Sample selection and batch-first flow
  - Create/add/move batch UX
  - Folder-level logistics submit behavior
  - Courier and drop-off completion flow
  - Drop-off scheduler constraints (weekdays, 9am-5pm)

- `web/src/pages/QADashboard.tsx`
  - Status/tab enforcement for finalized role flow
  - QA visibility restrictions (hide pre-sample queue for QA role)
  - Sample QA tab refactor to batch list + expandable batches
  - Product-level Assess Product action in sample queue
  - QAForm embedding in product details view

- `web/src/App.tsx`
  - Route mapping updates for QA dashboard usage

### Services / stores
- `web/src/services/qaService.ts`
  - Admin accept transition updated to `waiting_for_sample`
  - Batch assignment wired to normalized tables
  - Structured logistics/batch field support

- `web/src/services/qaTeamService.ts`
  - Dashboard stats expanded (`waitingForSample`, `pendingPhysicalReview`)
  - Logistics transform supports structured `batch_id`

- `web/src/stores/productQAStore.ts`
  - Batch metadata propagated in store model
  - Batch assignment actions integrated with service

- `web/src/components/QAForm.tsx`
  - Stage-aware submit actions (physical vs digital behavior)
  - Integrated for per-product QA assessment flow

### Database migration
- `web/supabase/migrations/20260329000000_add_qa_batches_logistics_and_forms.sql`
  - Structured logistics fields
  - Batch tables and relations
  - QA form tables (without signatures)

---

## Current Operational Result
- Admin approval no longer sends items directly into QA review.
- Seller must submit sample logistics first.
- QA queue now reflects submitted sample products and supports batch-centric review.
- Approved products by QA transition to live (`verified`).

---

## Remaining Optional Cleanup
- Remove legacy `pending_digital_review` compatibility paths if no longer needed.
- Remove JSON logistics fallback once all readers use normalized columns only.
- Add/verify RLS policies for newly added batch and form tables in production.
