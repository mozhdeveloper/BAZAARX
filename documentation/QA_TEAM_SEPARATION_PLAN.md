# QA Team Separation Plan

## Overview

Separate the Quality Assurance (QA) product assessment process from the Admin product approval process. QA team members will have their own accounts, role, and dedicated web portal. The admin approves/rejects the product listing; the QA team handles the physical/digital quality inspection independently.

---

## Current Flow (Before)

```
Seller adds product
       │
       ▼
Admin reviews listing ──► Approve / Reject / Revise
       │ (if approved)
       ▼
Admin handles QA assessment (same person)
  ├─ Digital review
  ├─ Request sample from seller
  ├─ Physical review
  └─ Verify / Reject / Request Revision
       │
       ▼
Product goes live (approval_status = 'approved')
```

**Problem**: The admin does both the listing approval AND the quality assessment. There is no separate QA team role in the system.

---

## New Flow (After)

```
Seller adds product
       │
       ▼
┌──────────────────────────────────────┐
│  ADMIN PORTAL (existing)             │
│  Admin reviews the LISTING only      │
│  ├─ Accept listing  ─────────────────┼──► Goes to QA queue
│  ├─ Reject listing                   │
│  └─ Request revision                 │
└──────────────────────────────────────┘
       │ (accepted)
       ▼
┌──────────────────────────────────────┐
│  QA PORTAL (new)                     │
│  QA team handles quality assessment  │
│  ├─ Digital review (photos, specs)   │
│  ├─ Request sample from seller       │
│  │   ├─ Seller ships sample          │
│  │   └─ Seller drops off at store    │
│  ├─ Physical review                  │
│  └─ Verify / Reject / Request Rev    │
└──────────────────────────────────────┘
       │ (verified)
       ▼
Product goes live (approval_status = 'approved')
```

**Key change**: Product listing acceptance by admin sets `approval_status = 'accepted'` (new intermediate status). Product only becomes `'approved'` (live) after QA team verifies it.

---

## Database Changes

### 1. Add `qa_team` role to `user_roles` CHECK constraint

```sql
-- Alter the CHECK constraint on user_roles.role to include 'qa_team'
ALTER TABLE public.user_roles
  DROP CONSTRAINT user_roles_role_check;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_role_check
  CHECK (role = ANY (ARRAY['buyer'::text, 'seller'::text, 'admin'::text, 'qa_team'::text]));
```

### 2. Create `qa_team_members` table

```sql
-- QA team member profile (parallel to admins table)
CREATE TABLE public.qa_team_members (
  id uuid NOT NULL,
  display_name text,
  specialization text,                    -- e.g. 'electronics', 'fashion', 'food'
  is_active boolean NOT NULL DEFAULT true,
  max_concurrent_reviews integer NOT NULL DEFAULT 10,
  permissions jsonb DEFAULT '{}'::jsonb,   -- granular permissions
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT qa_team_members_pkey PRIMARY KEY (id),
  CONSTRAINT qa_team_members_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id)
);

-- Index for active QA members
CREATE INDEX idx_qa_team_members_active ON public.qa_team_members (is_active) WHERE is_active = true;
```

### 3. Add `accepted` to `products.approval_status`

```sql
-- Add 'accepted' as intermediate status between admin accept and QA verify
ALTER TABLE public.products
  DROP CONSTRAINT products_approval_status_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_approval_status_check
  CHECK (approval_status = ANY (ARRAY[
    'pending'::text,
    'accepted'::text,     -- NEW: admin approved listing, awaiting QA
    'approved'::text,     -- QA verified, product is live
    'rejected'::text,
    'reclassified'::text
  ]));
```

### 4. Add `qa_assigned_to` and `qa_status` to `product_assessments`

```sql
-- Add QA-specific columns to product_assessments
ALTER TABLE public.product_assessments
  ADD COLUMN qa_assigned_to uuid REFERENCES public.qa_team_members(id),
  ADD COLUMN admin_accepted_at timestamp with time zone,
  ADD COLUMN admin_accepted_by uuid REFERENCES public.admins(id);

-- Add new assessment statuses for the separated flow
ALTER TABLE public.product_assessments
  DROP CONSTRAINT product_assessments_status_check;

ALTER TABLE public.product_assessments
  ADD CONSTRAINT product_assessments_status_check
  CHECK (status = ANY (ARRAY[
    'pending_admin_review'::text,     -- NEW: waiting for admin to accept listing
    'pending_digital_review'::text,   -- QA: digital review queue
    'waiting_for_sample'::text,       -- QA: waiting for seller to send sample
    'pending_physical_review'::text,  -- QA: physical inspection
    'verified'::text,                 -- QA: passed, product goes live
    'for_revision'::text,             -- QA: needs changes from seller
    'rejected'::text                  -- Admin or QA rejected
  ]));
```

### 5. Create `qa_sample_submissions` table (seller delivery options)

```sql
-- Track how seller submits physical samples for QA
CREATE TABLE public.qa_sample_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  product_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  delivery_method text NOT NULL CHECK (delivery_method = ANY (ARRAY[
    'courier_delivery'::text,         -- seller ships via courier
    'in_store_dropoff'::text,         -- seller goes to QA store/office
    'scheduled_pickup'::text          -- QA team picks up from seller
  ])),
  tracking_number text,               -- for courier delivery
  dropoff_location text,              -- for in-store dropoff
  dropoff_scheduled_at timestamp with time zone, -- scheduled date
  pickup_address text,                -- for scheduled pickup
  pickup_scheduled_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY[
    'pending'::text,
    'in_transit'::text,
    'received'::text,
    'inspecting'::text,
    'returned'::text,
    'disposed'::text
  ])),
  received_at timestamp with time zone,
  received_by uuid REFERENCES public.qa_team_members(id),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT qa_sample_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT qa_sample_submissions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.product_assessments(id),
  CONSTRAINT qa_sample_submissions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT qa_sample_submissions_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);

CREATE INDEX idx_qa_sample_submissions_status ON public.qa_sample_submissions (status);
CREATE INDEX idx_qa_sample_submissions_assessment ON public.qa_sample_submissions (assessment_id);
```

### 6. Create `qa_review_logs` table (audit trail)

```sql
-- Audit log for all QA actions
CREATE TABLE public.qa_review_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  product_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,           -- qa_team_member id
  action text NOT NULL CHECK (action = ANY (ARRAY[
    'assigned'::text,
    'digital_review_started'::text,
    'digital_review_passed'::text,
    'digital_review_failed'::text,
    'sample_requested'::text,
    'sample_received'::text,
    'physical_review_started'::text,
    'physical_review_passed'::text,
    'physical_review_failed'::text,
    'revision_requested'::text,
    'verified'::text,
    'rejected'::text,
    'reassigned'::text,
    'note_added'::text
  ])),
  notes text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT qa_review_logs_pkey PRIMARY KEY (id),
  CONSTRAINT qa_review_logs_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.product_assessments(id),
  CONSTRAINT qa_review_logs_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT qa_review_logs_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.qa_team_members(id)
);

CREATE INDEX idx_qa_review_logs_assessment ON public.qa_review_logs (assessment_id);
CREATE INDEX idx_qa_review_logs_reviewer ON public.qa_review_logs (reviewer_id);
```

### 7. Create `qa_notifications` table

```sql
-- Notifications for QA team members
CREATE TABLE public.qa_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  qa_member_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  action_url text,
  action_data jsonb,
  read_at timestamp with time zone,
  priority text NOT NULL DEFAULT 'normal'::text CHECK (priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT qa_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT qa_notifications_qa_member_id_fkey FOREIGN KEY (qa_member_id) REFERENCES public.qa_team_members(id)
);

CREATE INDEX idx_qa_notifications_unread ON public.qa_notifications (qa_member_id) WHERE read_at IS NULL;
```

### 8. RLS Policies for QA team

```sql
-- QA team can read products in their queue
CREATE POLICY qa_read_assessments ON public.product_assessments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.qa_team_members qm
      WHERE qm.id = auth.uid() AND qm.is_active = true
    )
  );

-- QA team can update assessments assigned to them
CREATE POLICY qa_update_assessments ON public.product_assessments
  FOR UPDATE TO authenticated
  USING (
    qa_assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.qa_team_members qm
      WHERE qm.id = auth.uid()
      AND qm.is_active = true
      AND (qm.permissions->>'can_manage_all')::boolean = true
    )
  );

-- QA team can read their own notifications
CREATE POLICY qa_read_notifications ON public.qa_notifications
  FOR SELECT TO authenticated
  USING (qa_member_id = auth.uid());

-- QA team can read sample submissions for their assigned products
CREATE POLICY qa_read_samples ON public.qa_sample_submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.qa_team_members qm
      WHERE qm.id = auth.uid() AND qm.is_active = true
    )
  );

-- QA team can insert review logs
CREATE POLICY qa_insert_review_logs ON public.qa_review_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.qa_team_members qm
      WHERE qm.id = auth.uid() AND qm.is_active = true
    )
  );
```

---

## Complete Migration SQL (run in order)

```sql
-- ============================================================================
-- QA TEAM SEPARATION MIGRATION
-- ============================================================================

-- 1. Add 'qa_team' role
ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role = ANY (ARRAY['buyer'::text, 'seller'::text, 'admin'::text, 'qa_team'::text]));

-- 2. Create qa_team_members table
CREATE TABLE public.qa_team_members (
  id uuid NOT NULL,
  display_name text,
  specialization text,
  is_active boolean NOT NULL DEFAULT true,
  max_concurrent_reviews integer NOT NULL DEFAULT 10,
  permissions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT qa_team_members_pkey PRIMARY KEY (id),
  CONSTRAINT qa_team_members_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id)
);
CREATE INDEX idx_qa_team_members_active ON public.qa_team_members (is_active) WHERE is_active = true;

-- 3. Add 'accepted' to products.approval_status
ALTER TABLE public.products DROP CONSTRAINT products_approval_status_check;
ALTER TABLE public.products ADD CONSTRAINT products_approval_status_check
  CHECK (approval_status = ANY (ARRAY['pending'::text, 'accepted'::text, 'approved'::text, 'rejected'::text, 'reclassified'::text]));

-- 4. Add QA columns to product_assessments
ALTER TABLE public.product_assessments
  ADD COLUMN qa_assigned_to uuid REFERENCES public.qa_team_members(id),
  ADD COLUMN admin_accepted_at timestamp with time zone,
  ADD COLUMN admin_accepted_by uuid REFERENCES public.admins(id);

ALTER TABLE public.product_assessments DROP CONSTRAINT product_assessments_status_check;
ALTER TABLE public.product_assessments ADD CONSTRAINT product_assessments_status_check
  CHECK (status = ANY (ARRAY[
    'pending_admin_review'::text, 'pending_digital_review'::text, 'waiting_for_sample'::text,
    'pending_physical_review'::text, 'verified'::text, 'for_revision'::text, 'rejected'::text
  ]));

-- 5. Create qa_sample_submissions
CREATE TABLE public.qa_sample_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.product_assessments(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  seller_id uuid NOT NULL REFERENCES public.sellers(id),
  delivery_method text NOT NULL CHECK (delivery_method = ANY (ARRAY['courier_delivery'::text, 'in_store_dropoff'::text, 'scheduled_pickup'::text])),
  tracking_number text,
  dropoff_location text,
  dropoff_scheduled_at timestamp with time zone,
  pickup_address text,
  pickup_scheduled_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'in_transit'::text, 'received'::text, 'inspecting'::text, 'returned'::text, 'disposed'::text])),
  received_at timestamp with time zone,
  received_by uuid REFERENCES public.qa_team_members(id),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT qa_sample_submissions_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_qa_sample_submissions_status ON public.qa_sample_submissions (status);
CREATE INDEX idx_qa_sample_submissions_assessment ON public.qa_sample_submissions (assessment_id);

-- 6. Create qa_review_logs
CREATE TABLE public.qa_review_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.product_assessments(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  reviewer_id uuid NOT NULL REFERENCES public.qa_team_members(id),
  action text NOT NULL CHECK (action = ANY (ARRAY[
    'assigned'::text, 'digital_review_started'::text, 'digital_review_passed'::text,
    'digital_review_failed'::text, 'sample_requested'::text, 'sample_received'::text,
    'physical_review_started'::text, 'physical_review_passed'::text,
    'physical_review_failed'::text, 'revision_requested'::text,
    'verified'::text, 'rejected'::text, 'reassigned'::text, 'note_added'::text
  ])),
  notes text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT qa_review_logs_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_qa_review_logs_assessment ON public.qa_review_logs (assessment_id);
CREATE INDEX idx_qa_review_logs_reviewer ON public.qa_review_logs (reviewer_id);

-- 7. Create qa_notifications
CREATE TABLE public.qa_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  qa_member_id uuid NOT NULL REFERENCES public.qa_team_members(id),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  action_url text,
  action_data jsonb,
  read_at timestamp with time zone,
  priority text NOT NULL DEFAULT 'normal'::text CHECK (priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT qa_notifications_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_qa_notifications_unread ON public.qa_notifications (qa_member_id) WHERE read_at IS NULL;
```

---

## Create QA Test Account Query

```sql
-- ============================================================================
-- CREATE QA TEST ACCOUNTS
-- Run AFTER the migration above
-- ============================================================================

-- Step 1: Create auth user (do this via Supabase Dashboard or supabase.auth.admin.createUser)
-- Email: qa1@bazaarx.com / Password: QATeam2026!
-- Email: qa2@bazaarx.com / Password: QATeam2026!

-- Step 2: After auth user is created, get the user UUID and run:
-- Replace <QA_USER_UUID> with the actual UUID from Step 1

-- Create profile
INSERT INTO public.profiles (id, email, first_name, last_name)
VALUES ('<QA_USER_UUID>', 'qa1@bazaarx.com', 'QA', 'Reviewer 1')
ON CONFLICT (id) DO NOTHING;

-- Add qa_team role
INSERT INTO public.user_roles (user_id, role)
VALUES ('<QA_USER_UUID>', 'qa_team');

-- Create QA team member record
INSERT INTO public.qa_team_members (id, display_name, specialization, is_active, permissions)
VALUES (
  '<QA_USER_UUID>',
  'QA Reviewer 1',
  'general',
  true,
  '{"can_digital_review": true, "can_physical_review": true, "can_verify": true, "can_reject": true, "can_manage_all": false}'
);

-- Repeat for qa2@bazaarx.com with a different UUID
```

---

## New Process Flow (Detailed)

### Step 1: Seller Submits Product
- Product created with `approval_status = 'pending'`
- Assessment created with `status = 'pending_admin_review'` (was `pending_digital_review`)

### Step 2: Admin Reviews Listing
- Admin sees product in **Admin Portal** → Product Approvals
- Admin checks: product name, description, images, pricing, category correctness
- Admin actions:
  - **Accept Listing** → `approval_status = 'accepted'`, assessment `status = 'pending_digital_review'`, sets `admin_accepted_at`, `admin_accepted_by`. Product enters QA queue.
  - **Reject Listing** → `approval_status = 'rejected'`, assessment `status = 'rejected'`
  - **Request Revision** → assessment `status = 'for_revision'` (goes back to seller)
- **Note**: Admin no longer handles any QA steps after this point.

### Step 3: QA Digital Review
- QA team sees product in **QA Portal** → Digital Review queue
- QA member claims or is auto-assigned the product (`qa_assigned_to`)
- Reviews: image quality, description accuracy, specs completeness
- QA actions:
  - **Pass Digital Review** → assessment `status = 'waiting_for_sample'`
  - **Fail / Request Revision** → assessment `status = 'for_revision'`
  - **Reject** → assessment `status = 'rejected'`

### Step 4: Seller Submits Sample
- Seller is notified that sample is needed
- Seller chooses delivery method:
  - **Courier Delivery**: seller ships via courier, enters tracking number
  - **In-Store Dropoff**: seller goes to QA office/store, selects date
  - **Scheduled Pickup**: QA team picks up from seller location
- Creates `qa_sample_submissions` row
- Assessment updates to `status = 'waiting_for_sample'` (stays until received)

### Step 5: QA Physical Review
- QA receives sample → marks `qa_sample_submissions.status = 'received'`
- Assessment updates to `status = 'pending_physical_review'`
- QA inspects product quality, authenticity, packaging
- QA actions:
  - **Verify (Pass)** → assessment `status = 'verified'`, product `approval_status = 'approved'` → **PRODUCT GOES LIVE**
  - **Fail / Request Revision** → assessment `status = 'for_revision'`
  - **Reject** → assessment `status = 'rejected'`, product `approval_status = 'rejected'`

---

## QA Portal (Web) — Implementation Plan

### Route: `/qa/*`

| Route | Page | Description |
|-------|------|-------------|
| `/qa/login` | QALogin | Auto-login for test accounts, standard login for production |
| `/qa/dashboard` | QADashboard | Overview: pending counts, assigned to me, recently verified |
| `/qa/digital-review` | QADigitalReview | Queue of products pending digital review |
| `/qa/physical-review` | QAPhysicalReview | Queue of products pending physical review |
| `/qa/sample-tracking` | QASampleTracking | Track incoming samples from sellers |
| `/qa/review/:productId` | QAReviewDetail | Full product review page with actions |
| `/qa/history` | QAHistory | Completed reviews audit log |
| `/qa/settings` | QASettings | Profile, specialization, notification prefs |

### Auto-Login for Testing

```typescript
// web/src/pages/QALogin.tsx
// If URL has ?auto=true&email=qa1@bazaarx.com&pass=QATeam2026!
// automatically signs in and redirects to /qa/dashboard
// Only enabled in development/staging environments

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const auto = params.get('auto');
  const email = params.get('email');
  const pass = params.get('pass');

  if (auto === 'true' && email && pass && import.meta.env.DEV) {
    supabase.auth.signInWithPassword({ email, password: pass })
      .then(({ data }) => {
        if (data.session) navigate('/qa/dashboard');
      });
  }
}, []);
```

**Auto-login URL**: `http://localhost:5173/qa/login?auto=true&email=qa1@bazaarx.com&pass=QATeam2026!`

---

## Code Changes Required

### Web

| File | Change |
|------|--------|
| `web/src/types/database.types.ts` | Add `UserRole = 'buyer' \| 'seller' \| 'admin' \| 'qa_team'`, add `QATeamMember` interface |
| `web/src/services/authService.ts` | Add `isQATeam()` role check, detect `qa_team` role on login |
| `web/src/services/qaService.ts` | Split into `qaAdminService.ts` (admin accept/reject listing) and `qaTeamService.ts` (QA review actions). Keep backward compat. |
| `web/src/App.tsx` | Add `/qa/*` routes behind QA role guard |
| `web/src/pages/QALogin.tsx` | **NEW** — Login page with auto-login for testing |
| `web/src/pages/QADashboard.tsx` | **NEW** — QA dashboard with queue counts |
| `web/src/pages/QADigitalReview.tsx` | **NEW** — Digital review queue |
| `web/src/pages/QAPhysicalReview.tsx` | **NEW** — Physical review queue |
| `web/src/pages/QASampleTracking.tsx` | **NEW** — Sample delivery tracking |
| `web/src/pages/QAReviewDetail.tsx` | **NEW** — Per-product review page |
| `web/src/pages/AdminProductApprovals.tsx` | Remove QA steps; admin only accepts/rejects the listing now |
| `web/src/components/QASidebar.tsx` | **NEW** — QA portal sidebar navigation |
| `web/src/stores/qaStore.ts` | **NEW** — Zustand store for QA portal state |

### Mobile (Admin tab)

| File | Change |
|------|--------|
| `mobile-app/src/stores/adminStore.ts` | Admin `useAdminProductQA` only shows pending_admin_review; remove QA actions |
| `mobile-app/src/stores/productQAStore.ts` | Update status flow to start at `pending_admin_review` |
| `mobile-app/app/admin/(tabs)/product-approvals.tsx` | Admin only sees listing review (accept/reject); no more sample/QA actions |

### Services

| File | Change |
|------|--------|
| `web/src/services/qaTeamService.ts` | **NEW** — All QA-specific actions (digital review, physical review, verify, sample tracking) |
| `web/src/services/qaNotificationService.ts` | **NEW** — Notification helpers for QA team |
| `mobile-app/src/services/qaService.ts` | **NEW** (if mobile QA portal needed later) |

---

## Status Mapping Summary

| Phase | assessment.status | products.approval_status | Who Acts |
|-------|-------------------|--------------------------|----------|
| Seller submits | `pending_admin_review` | `pending` | — |
| Admin accepts listing | `pending_digital_review` | `accepted` | Admin |
| Admin rejects listing | `rejected` | `rejected` | Admin |
| QA digital review | `pending_digital_review` | `accepted` | QA Team |
| QA requests sample | `waiting_for_sample` | `accepted` | QA Team |
| Seller ships sample | `waiting_for_sample` | `accepted` | Seller |
| QA physical review | `pending_physical_review` | `accepted` | QA Team |
| QA verifies | `verified` | `approved` | QA Team |
| QA rejects | `rejected` | `rejected` | QA Team |
| QA requests revision | `for_revision` | `accepted` | QA Team |

---

## Implementation Order

1. **Phase 1 — Database migration** (run SQL above)
2. **Phase 2 — Create QA test accounts** (via Supabase Dashboard + SQL)
3. **Phase 3 — Split qaService.ts** into admin and QA team services
4. **Phase 4 — Build QA Portal pages** (QALogin, QADashboard, QADigitalReview, QAReviewDetail)
5. **Phase 5 — Update AdminProductApprovals** to only handle listing accept/reject
6. **Phase 6 — Build sample submission flow** (seller side + QASampleTracking)
7. **Phase 7 — Build QAPhysicalReview** page
8. **Phase 8 — QA notifications** and audit log
9. **Phase 9 — Mobile admin tab update** (remove QA actions from admin)
10. **Phase 10 — Testing and polish**

---

## Premium Outlet / Trusted Brand Bypass

Products from sellers with `seller_tiers.bypasses_assessment = true` skip BOTH admin listing review AND QA assessment. This behavior is unchanged — `qaService.createQAEntry()` already handles it by setting `status = 'verified'` and `approval_status = 'approved'` immediately.

---

## Seller-Side Delivery Options (Sample Submission)

When QA requests a sample, the seller sees a modal with 3 options:

| Option | Description | Fields |
|--------|-------------|--------|
| **Courier Delivery** | Ship via courier (J&T, LBC, etc.) | Tracking number, courier name |
| **In-Store Dropoff** | Bring to QA office location | Location selection, scheduled date |
| **Scheduled Pickup** | QA team picks up from seller | Pickup address, scheduled date |

The seller's choice creates a `qa_sample_submissions` row. QA team sees it in the Sample Tracking page.
