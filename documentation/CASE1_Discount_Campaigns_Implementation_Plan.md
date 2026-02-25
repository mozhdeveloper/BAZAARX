# CASE 1: Discount Campaigns – Implementation Plan

**Scope:** Creation, storage, and management of discount campaigns (seller-facing).  
**Out of scope for this plan:** Applying discounts at checkout and product listings (CASE 2).
**Decision for CASE 1:** Follow current deployed DB schema only (no DB migration). `specific_categories` is not implemented in this phase.

---

## 1. Objective & Success Criteria

**Goal:** Sellers can create, store, and manage discount campaigns efficiently. Campaign status is visible and changes (edit, pause, deactivate) reflect correctly.

**Test cases to satisfy:**
1. Sellers can create a new discount campaign and set value, duration, and applicable products.
2. Sellers can edit, pause, or deactivate a campaign and changes reflect correctly.
3. *(CASE 2)* Discounts are applied correctly to product prices in listings and checkout.

**Success:** Sellers can manage discount campaigns efficiently, with accurate pricing applied and campaign status visible, helping boost sales and product visibility.

---

## 2. Before vs After

### 2.1 Before (Current State)

| Area | What Exists | Gaps / Risks |
|------|-------------|--------------|
| **Database** | `discount_campaigns` with columns: `id`, `seller_id`, `name`, `description`, `campaign_type`, `discount_type`, `discount_value`, `max_discount_amount`, `min_purchase_amount`, `starts_at`, `ends_at`, `status`, `badge_text`, `badge_color`, `priority`, `claim_limit`, `per_customer_limit`, `applies_to`, `created_at`, `updated_at`. RLS; trigger for status. | **CONFIRMED:** Actual DB uses `claim_limit` (not `total_usage_limit`). No `usage_count`, `is_active`, or `applicable_categories` columns exist. |
| **Service** | `discountService`: create, get by seller, get active, update, delete, toggle pause; add/remove products; get products in campaign; get active product discount; record usage; usage stats. | **ISSUE:** Service uses `total_usage_limit`, `usage_count`, `is_active`, `applicable_categories` which don't exist in actual DB. Should use `claim_limit` instead. Toggle only flips `status` (active ↔ paused). No explicit “deactivate” — could use `status = 'cancelled'`. |
| **Types** | `types/discount.ts`: DiscountCampaign, ProductDiscount, form types, labels. `database.types.ts`: snake_case DB types (uses `claim_limit`). | **CONFIRMED:** `database.types.ts` correctly matches actual DB schema (`claim_limit`). However, `types/discount.ts` and `discountService.ts` use `totalUsageLimit`, `usageCount`, `isActive`, `applicableCategories` which don't match DB. |
| **UI – List** | Seller Discounts page: list campaigns, search, filter by status, stats (active, scheduled, total usage, avg discount), countdown for active. | Status may not refresh immediately after toggle (async/state). “Ended” and “Cancelled” in schema but filter only shows up to “Ended”. |
| **UI – Create** | Dialog: name, description, campaign type, discount type/value, max discount, min purchase, starts/ends, badge text/color, per-customer limit, total usage limit (labeled as "claim limit"), **Apply to** (all / specific products / specific categories). | No category picker when “Specific Categories” is selected (and DB has no `applicable_categories` column to store selections). No way to attach products during create — only “Add Products” after create. Form may be using `totalUsageLimit` which doesn't match DB `claim_limit`. |
| **UI – Edit** | Full edit dialog (same fields as create). | Same gaps: no category selection for “specific_categories” (no DB column to store it). Form may be using wrong field names. |
| **UI – Actions** | Pause/Resume (toggle), Delete, Add Products, View Products (for specific_products). | No explicit “Deactivate” (could use `status = 'cancelled'`). |
| **Product assignment** | `AddProductsToCampaignDialog`: select seller products, optional discounted stock, add to campaign. | Works for “specific_products”; “specific_categories” has no UI to choose categories (and no DB column to store category selections). |

**Summary (before):** Core create/edit/store/pause/delete and product assignment exist. **Critical issues:** (1) `discountService.ts` uses non-existent columns (`total_usage_limit`, `usage_count`, `is_active`, `applicable_categories`) — needs fix to use `claim_limit`. (2) No explicit deactivate (could use `status = 'cancelled'`). (3) "Specific Categories" option exists but no DB column to store selections — feature incomplete. (4) Status refresh and filter coverage need verification.

---

### 2.2 After (Target State)

| Area | What Happens After |
|------|--------------------|
| **Creation** | Seller creates campaign with name, type, value, duration (starts/ends), and applicability (all products / specific products). For specific products: can add products in create flow or right after. Campaign is stored in `discount_campaigns`; product links in `product_discounts` when applicable. |
| **Storage** | All campaign and product-discount data persisted in Supabase; status updated by triggers and API; usage tracked in `discount_usage`. Service correctly uses `claim_limit` (not `total_usage_limit`). |
| **Edit** | Seller can change name, description, type, value, duration, limits (`claim_limit`), applicability. Changes persist; list and detail reflect new data; status recalculated (e.g. scheduled/active/ended) per trigger. |
| **Pause / Deactivate** | **Pause:** campaign stays “on” but temporarily inactive (status = paused). **Deactivate:** campaign turned off using `status = 'cancelled'`, no longer applied anywhere. UI clearly separates Pause vs Deactivate. |
| **Visibility** | List shows all campaigns with correct status (scheduled, active, paused, ended, cancelled). Filter includes all statuses. After any action (create, edit, pause, deactivate), list refreshes and shows updated status. |
| **Applicable products** | For `specific_products`: seller assigns products via “Add Products” (and optionally during create). For CASE 1, `specific_categories` is removed/disabled in UI to match current DB schema. |

---

## 3. Why These Changes

| Change | Why |
|--------|-----|
| **Fix discountService column mismatches** | **CRITICAL:** Service uses `total_usage_limit`, `usage_count`, `is_active`, `applicable_categories` which don't exist in actual DB. Must change to `claim_limit` and remove references to non-existent columns. This will cause runtime errors otherwise. |
| **Explicit Deactivate** | Test asks for “deactivate”; today we only have pause and delete. Deactivate using `status = 'cancelled'` lets sellers turn off a campaign without losing it or confusing it with “paused”. |
| **Remove/disable “Specific Categories” in CASE 1** | DB has no `applicable_categories` column. Keeping this option in UI is misleading and non-functional, so it must be removed/disabled for now. |
| **Align app types with DB** | `database.types.ts` is correct (`claim_limit`), but `types/discount.ts` and `discountService.ts` use wrong names. Fix to match actual DB schema to avoid runtime errors. |
| **Reliable status refresh** | After edit/pause/deactivate, list must show the new status so “changes reflect correctly” is satisfied. |
| **Filter: Ended & Cancelled** | So sellers can see and manage all campaign states. |
| **Optional: products during create** | Improves efficiency (create + assign products in one flow); optional enhancement. |

---

## 4. Files to Create or Change

### 4.1 Files to Change

| File | Purpose |
|------|---------|
| `web/src/services/discountService.ts` | **CRITICAL FIX:** Replace `total_usage_limit` with `claim_limit` in create/update/transform. Remove references to `usage_count`, `is_active`, `applicable_categories`. Add `deactivateCampaign(campaignId)` (set `status = 'cancelled'`). Fix `getActiveCampaigns` to not filter by `is_active` (use `status = 'active'` instead). |
| `web/src/pages/SellerDiscounts.tsx` | Add “Deactivate” action and wire to new service method. Remove/disable `specific_categories` option for CASE 1. Add “Ended” and “Cancelled” to status filter. Ensure list refetches after create/edit/pause/deactivate so status updates are visible. Optionally: “Add products” step in create flow. |
| `web/src/types/discount.ts` | **CRITICAL FIX:** Use `claimLimit` (maps to DB `claim_limit`) instead of `totalUsageLimit`. Remove unsupported fields (`usageCount`, `isActive`, `applicableCategories`) if present. |
| `web/src/types/database.types.ts` | **CONFIRMED CORRECT:** Already matches actual DB (`claim_limit`). No changes needed. |
| `web/src/components/AddProductsToCampaignDialog.tsx` | Only if product selection is reused inside create flow; otherwise no change. |

### 4.2 Files to Create (Optional)

None for CASE 1 (DB-first path).

### 4.3 Files to Reference (No Changes)

| File | Purpose |
|------|---------|
| `documentation/Supabase_Migrations/006_discount_campaigns.sql` | **NOTE:** Migration file has extra columns (`total_usage_limit`, `usage_count`, `is_active`, `applicable_categories`) that don't exist in actual deployed DB. Use actual DB schema as source of truth. |

### 4.4 Database

| Item | Action |
|------|--------|
| **New migration** | Not included in CASE 1. We are following current deployed DB schema only. |
| **RLS** | Ensure sellers can only update their own campaigns; “deactivate” is an update to `status = 'cancelled'` (no `is_active` column exists). |

---

## 5. Implementation Order (Recommended)

1. **Fix critical column mismatches**  
   - **CRITICAL:** Fix `discountService.ts` to use `claim_limit` instead of `total_usage_limit`. Remove references to `usage_count`, `is_active`, `applicable_categories`.  
   - Fix `types/discount.ts` to use `claimLimit` instead of `totalUsageLimit`. Remove `usageCount`, `isActive`, `applicableCategories` if present.  
   - `database.types.ts` is already correct — no changes needed.

2. **Service: deactivate**  
   - Add `deactivateCampaign(campaignId)` that sets `status = 'cancelled'`.  
   - Remove/disable `specific_categories` option in the UI for CASE 1.

3. **UI: Deactivate and filter**  
   - Add Deactivate button/action and status filter options “Ended” and “Cancelled”.  
   - Ensure list refetches after create/edit/pause/deactivate.

4. **UI: applicability cleanup**  
   - Keep only `all_products` and `specific_products` options in CASE 1.  
   - Remove/disable `specific_categories` from create/edit forms and payload handling.

5. **Verification**  
   - Run through test cases: create (value, duration, applicable products/categories), edit, pause, deactivate; confirm list and status stay correct.

---

## 6. Summary

| Before | After |
|--------|--------|
| **CRITICAL:** `discountService.ts` uses wrong column names (`total_usage_limit` vs `claim_limit`). Create/edit and product assignment exist; no category picker; only Pause and Delete. | Service fixed to use correct DB columns (`claim_limit`). Full create/edit; explicit Deactivate (`status = 'cancelled'`); status and filter cover all states; changes reflect immediately. |
| “Specific categories” option exists but no DB column to store selections. | For CASE 1, this option is removed/disabled in UI to match current DB schema. |
| Status visibility and refresh may be inconsistent. | List always reflects current status after any action. |

**No code changes are included in this document;** this is a plan only. Implement following the file list and order above, then validate with the CASE 1 test cases.
