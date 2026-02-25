/**
 * End-to-End Test: Seller Add Product → Admin QA Process
 * 
 * Tests the COMPLETE lifecycle:
 *   1. Seller creates a product (product, images, variants, inventory)
 *   2. QA assessment entry is auto-created (pending_digital_review)
 *   3. Admin digitally approves → waiting_for_sample
 *   4. Seller submits sample with logistics → pending_physical_review
 *   5. Admin verifies → verified (product.approval_status = approved)
 *   6. Alternate paths: rejection, revision, re-submission
 *   7. Seller-filtered view correctness
 *   8. Enriched query validation (no N+1, seller.store_name, logistics, etc.)
 *   9. Duplicate assessment guard
 *  10. Frontend data shape validation (QAProduct interface)
 * 
 * Usage:
 *   node test-add-product-qa-e2e.mjs
 * 
 * Runs against live Supabase (no RLS enforced).
 * All test data is cleaned up after each run.
 */

import { createClient } from '@supabase/supabase-js';

// ─── Config ───────────────────────────────────────────────────────────────────
