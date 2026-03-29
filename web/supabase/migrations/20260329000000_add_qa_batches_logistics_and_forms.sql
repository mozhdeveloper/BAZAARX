-- ============================================================================
-- QA FLOW ENHANCEMENTS (NO SIGNATURES)
-- Date: 2026-03-29
--
-- Adds:
-- 1) Structured logistics fields on product_assessment_logistics
-- 2) Batch submission tables for grouped sample submissions
-- 3) QA form tables for persisted inspection data + evidence
--
-- Notes:
-- - Keeps existing details text column for backward compatibility
-- - Excludes e-signature tables by request
-- - Uses guarded/IF NOT EXISTS patterns where possible
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) STRUCTURED LOGISTICS ON EXISTING TABLE
-- ----------------------------------------------------------------------------

ALTER TABLE public.product_assessment_logistics
  ADD COLUMN IF NOT EXISTS logistics_method text,
  ADD COLUMN IF NOT EXISTS courier_service text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS dropoff_date date,
  ADD COLUMN IF NOT EXISTS dropoff_time time,
  ADD COLUMN IF NOT EXISTS dropoff_slot text,
  ADD COLUMN IF NOT EXISTS batch_id uuid,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'product_assessment_logistics'
      AND constraint_name = 'product_assessment_logistics_method_check'
  ) THEN
    ALTER TABLE public.product_assessment_logistics
      ADD CONSTRAINT product_assessment_logistics_method_check
      CHECK (logistics_method IS NULL OR logistics_method IN ('courier', 'dropoff'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pal_assessment_id
  ON public.product_assessment_logistics (assessment_id);

CREATE INDEX IF NOT EXISTS idx_pal_batch_id
  ON public.product_assessment_logistics (batch_id);

CREATE INDEX IF NOT EXISTS idx_pal_method
  ON public.product_assessment_logistics (logistics_method);

-- ----------------------------------------------------------------------------
-- 2) BATCH TABLES (GROUPED SAMPLE SUBMISSIONS)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.qa_submission_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  batch_code text NOT NULL UNIQUE,
  submission_type text NOT NULL DEFAULT 'sample',
  status text NOT NULL DEFAULT 'submitted',
  notes text,
  created_by uuid REFERENCES auth.users(id),
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT qa_submission_batches_status_check
    CHECK (status IN ('draft', 'submitted', 'in_review', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_qsb_seller_id
  ON public.qa_submission_batches (seller_id);

CREATE INDEX IF NOT EXISTS idx_qsb_status
  ON public.qa_submission_batches (status);

CREATE TABLE IF NOT EXISTS public.qa_submission_batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.qa_submission_batches(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES public.product_assessments(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (batch_id, assessment_id),
  UNIQUE (batch_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_qsbi_batch_id
  ON public.qa_submission_batch_items (batch_id);

CREATE INDEX IF NOT EXISTS idx_qsbi_assessment_id
  ON public.qa_submission_batch_items (assessment_id);

CREATE INDEX IF NOT EXISTS idx_qsbi_product_id
  ON public.qa_submission_batch_items (product_id);

-- Link logistics.batch_id -> qa_submission_batches.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'product_assessment_logistics'
      AND constraint_name = 'product_assessment_logistics_batch_id_fkey'
  ) THEN
    ALTER TABLE public.product_assessment_logistics
      ADD CONSTRAINT product_assessment_logistics_batch_id_fkey
      FOREIGN KEY (batch_id)
      REFERENCES public.qa_submission_batches(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3) QA FORM TABLES (PERSISTENT INSPECTION REPORT)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.qa_assessment_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL UNIQUE REFERENCES public.product_assessments(id) ON DELETE CASCADE,
  batch_id uuid NULL REFERENCES public.qa_submission_batches(id) ON DELETE SET NULL,

  qc_method text,
  qc_agent_name text,
  qc_date date,

  serial_number text,
  product_tier text,

  packaging_condition text,
  product_appearance text,
  label_accuracy_verified boolean NOT NULL DEFAULT false,

  power_test text,
  functional_test text,
  stress_test text,

  general_notes text,
  defects_identified text,
  recommendations text,

  final_decision text NOT NULL,
  decision_reason text,

  reviewed_by uuid NOT NULL REFERENCES auth.users(id),
  reviewed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT qa_assessment_forms_final_decision_check
    CHECK (final_decision IN ('approved', 'revision', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_qaf_assessment_id
  ON public.qa_assessment_forms (assessment_id);

CREATE INDEX IF NOT EXISTS idx_qaf_batch_id
  ON public.qa_assessment_forms (batch_id);

CREATE INDEX IF NOT EXISTS idx_qaf_reviewed_by
  ON public.qa_assessment_forms (reviewed_by);

CREATE TABLE IF NOT EXISTS public.qa_assessment_form_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.qa_assessment_forms(id) ON DELETE CASCADE,
  evidence_type text NOT NULL,
  file_url text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT qa_assessment_form_evidence_type_check
    CHECK (evidence_type IN ('photo', 'video', 'document'))
);

CREATE INDEX IF NOT EXISTS idx_qafe_form_id
  ON public.qa_assessment_form_evidence (form_id);

CREATE INDEX IF NOT EXISTS idx_qafe_type
  ON public.qa_assessment_form_evidence (evidence_type);

COMMIT;

-- ============================================================================
-- OPTIONAL NEXT STEPS (NOT APPLIED HERE)
-- - Add RLS policies for qa_submission_batches, qa_submission_batch_items,
--   qa_assessment_forms, qa_assessment_form_evidence
-- - Add updated_at triggers for new tables if your project standard requires it
-- ============================================================================
