---
description: 
globs: 
alwaysApply: false
---
You are a world-class software engineer with decades of experience. You are given a task that is related to the current project. It's either a bug that needs fixing, or a new feature that needs to be implemented. Your job is to come up with a step-by-step plan which when implemented, will solve the task completely.

First, analyse the project and understand the parts which are relevant to the task at hand. Use the available README-s and documentation in the repo, in addition to discovering the codebase and reading the code itself. Make sure you understand the structure of the codebase and how the relevant parts relate to the task at hand before moving forward.

Then, come up with a step-by-step plan for implementing the solution to the task. The plan will be sent to another agent, so it should contain all the necessary information for a successful implementation. Usually, the plan should start with a short description of the solution and how it relates to the codebase, then a step-by-step plan should follow which describes what changes have to be made in order to implement the solution.

Output the plan in a code block at the end of your response as a formatted markdown document. Do not implement any changes. Another agent will take over from there.

This is the task that needs to be solved: 

# BX-03 User Stories — Requirements Analysis (Web Only)

> **Last Updated:** April 23, 2026  
> Gap analysis of user stories BX-03-002 through BX-03-006 against the existing BAZAARX web codebase.

---

## BX-03-002 — Edit Product Listings ✅ IMPLEMENTED (April 23, 2026)

| # | Acceptance Criteria | Status | Evidence / Gap |
|---|---|---|---|
| 1-4 | Seller Dashboard → select product → Edit → editable form | ✅ Implemented | `handleEditClick` opens tabbed `Dialog` with 4 tabs: Details, Images, Inventory, Warranty |
| 5 | Edit Name | ✅ | Details tab — `edit-name` input with inline validation |
| 5 | Edit Description | ✅ **Fixed** | Details tab — textarea with 1000 char counter, amber warning at 900+ |
| 5 | Edit Price | ✅ | Details tab — `edit-price` input with inline validation |
| 5 | Edit Images | ✅ **Fixed** | Images tab — 3-col grid, primary badge, ×-remove, +Add slot, max 5. PNG/JPEG only, HEIC→JPEG auto-conversion for iOS |
| 5 | Edit Inventory | ✅ | Inventory tab — stock field (simple) or variant price/stock grid |
| 6 | Real-time input validation | ✅ **Fixed** | `validateEditForm()` — name non-empty, price > 0, stock ≥ 0, variant checks. Inline red errors below each field. |
| 7 | Invalid → error + prevent save | ✅ **Fixed** | Save blocked when invalid. Red dot error indicators on tabs with issues. Auto-switches to errored tab. |
| 8 | Quality feedback / improvement warnings | ✅ **Fixed** | "QA Result" button opens sample QA certificate modal (hardcoded placeholder, comment-wrapped for easy replacement) |
| 9-10 | Save + re-validate | ✅ **Fixed** | `handleSaveEdit` calls `validateEditForm()` first. Loading spinner during save. |
| 11 | Product remains Active after update | ✅ | `updateProduct` does not change `disabled_at` or `approval_status` |
| 12-13 | Policy violation / duplicate check post-edit | ❌ Missing | No policies exist in system. Documented as out-of-scope for this iteration. |
| 14 | Audit log of update activity | ✅ **Fixed** | Inserts into `admin_audit_logs` on save. Seller info embedded in `new_values` JSONB (seller_id, seller_name, seller_store_name). |

### Summary — BX-03-002
> **12 of 14 criteria met.** Only remaining gap: automated policy/duplicate scanning (requires new subsystem, out of scope). Up from 36% → **86%** coverage.

---

## BX-03-003 — Product Variations

| # | Acceptance Criteria | Status | Evidence / Gap |
|---|---|---|---|
| 1-2 | Seller opens create/edit → enables variations | ✅ | Add Product page has AttributesTab with variant toggling. Edit dialog shows variants if they exist. |
| 3 | Define variation types (Size, Color, Model) | ✅ | DB supports `variant_label_1`, `variant_label_2`. AttributesTab lets seller define two variant axes. |
| 4-5 | Add variation options with unique price, stock, SKU + generate combinations | ✅ | AttributesTab uses Cartesian generation. Each variant row has `price`, `stock`, `sku`. |
| 6 | Assign price and inventory per variation | ✅ | Both add (AttributesTab) and edit (Inventory tab) allow per-variant price/stock editing. |
| 7 | Validate each variation | ✅ **Improved** | Edit dialog now validates variant prices > 0 and stock ≥ 0 via `validateEditForm()`. |
| 8-9 | Save + product remains Active | ✅ | `handleSaveEdit` calls `productService.updateVariants` then `updateProduct`. Status unchanged. |
| 10-11 | Monitoring for invalid/restricted content | ❌ Missing | Same as BX-03-002 #12-13. No post-save content scan. |
| 12-13 | Buyer selects variation → price/availability updates dynamically | ✅ | ProductDetailPage `getSelectedVariant` updates price, stock, thumbnail on variant selection. |
| 14-15 | Add variations to existing non-variant product | ❌ Missing | Edit dialog only shows **existing** variants. No UI to add new variants or convert simple → variant. |
| 16 | Must define price/stock for all generated variations before saving | ⚠️ Partial | Enforced on create. Not on edit (no way to add variants). |
| 17 | Existing product stock not used unless reassigned to variations | ❌ Missing | No conversion logic for simple → variant products. |

### Summary — BX-03-003
> **7 of 17 criteria met, 1 partial.** Up from 35% → **41%**. Variant validation on edit improved.

---

## BX-03-004 — Product Image Upload

| # | Acceptance Criteria | Status | Evidence / Gap |
|---|---|---|---|
| 1-3 | Open create/edit → click upload → select files | ✅ **Fixed** | Create: GeneralInfoTab. **Edit: Images tab** — 3-col grid with +Add slot, file input accepting PNG/JPEG/HEIC. |
| 4 | Validate file format | ✅ **Enhanced** | `prepareImageForUpload()` in `imageConversion.ts` — PNG/JPEG only, HEIC auto-converted to JPEG. |
| 5 | Validate file size | ✅ | Max 5 MB enforced in `prepareImageForUpload()`. |
| 6 | Invalid file → reject + error message | ✅ | Toast error with specific message ("not a supported format", "exceeds 5MB limit"). |
| 7 | Upload multiple images | ✅ | Up to 5 images in edit dialog grid. Batch upload via `uploadProductImages`. |
| 8 | Preview uploaded images | ✅ | `URL.createObjectURL` preview in image grid. |
| 9-10 | Select primary image + system marks it | ✅ **Improved** | First image marked as primary with orange badge. `is_primary` flag set in `addProductImages`. |
| 11-14 | Save → store images → use primary as default → display correctly | ✅ | Delete-and-reinsert strategy. `deleteProductImages()` → upload → `addProductImages()` with `is_primary` and `sort_order`. |

### Summary — BX-03-004
> **11 of 14 criteria met.** Up from 50% → **79%**. Edit-flow image management fully functional.

---

## BX-03-005 — Product Inventory Management (No changes this iteration)

| # | Acceptance Criteria | Status | Evidence / Gap |
|---|---|---|---|
| 1-4 | Enter stock on create/edit → save → system stores | ✅ | Stock field + per-variant stock in edit dialog Inventory tab. |
| 5-7 | Order placed → validate stock → deduct | ✅ | `productService.deductStock` handles variant and simple products. |
| 8 | Insufficient stock → block order + show message | ✅ | "Out of Stock" toast. Quantity clamped to max stock. |
| 9 | Stock reaches zero → status "Out of Stock" | ⚠️ Partial | `low_stock_alerts` table exists. No auto-status change. |
| 10 | Out of Stock visible on listing + detail page | ⚠️ Partial | Detail page blocks purchase. No "Out of Stock" badge on product cards. |
| 11-13 | Manual stock update from dashboard → save → system updates | ✅ | Edit dialog stock + variants editable. |

### Summary — BX-03-005
> **8 of 13 criteria met, 2 partial.** No changes. Coverage: **62%**.

---

## BX-03-006 — Product Listing Status Visibility (No changes this iteration)

| # | Acceptance Criteria | Status | Evidence / Gap |
|---|---|---|---|
| 1-3 | Dashboard → product listings → show current status | ✅ | Badges for "Pending Approval", "Rejected", warranty. SellerProductStatus page for QA statuses. |
| 4 | Support: Draft, Active, Flagged, Disabled | ⚠️ Partial | Active ✅. Disabled ✅. **Draft** ❌. **Flagged** ❌. |
| 5 | Active → visible in marketplace | ✅ | Filtered by `deleted_at IS NULL`. |
| 6 | Flagged → visible or restricted based on policy | ❌ Missing | No flagged status. |
| 7 | Disabled → hidden from buyer search/listing | ✅ | `disabled_at IS NOT NULL` → filtered out. |
| 8 | Draft → visible only to seller, not to buyers | ❌ Missing | No draft concept. |
| 9 | Seller can identify status without opening detail | ✅ | Status badges on product cards. Toggle switch. |
| 10 | Flagged/Disabled → seller sees issue/restriction | ⚠️ Partial | Rejected shows reason. No "Flagged" or "Disabled by Admin" label. |

### Summary — BX-03-006
> **4 of 10 criteria met, 2 partial.** No changes. Coverage: **40%**.

---

## Overall Gap Summary (Updated April 23, 2026)

| User Story | Criteria Met | Partial | Missing | Coverage | Δ |
|---|---|---|---|---|---|
| BX-03-002 (Edit Product) | 12 | 0 | 2 | **86%** | +50% ↑ |
| BX-03-003 (Variations) | 7 | 1 | 9 | **41%** | +6% ↑ |
| BX-03-004 (Image Upload) | 11 | 0 | 3 | **79%** | +29% ↑ |
| BX-03-005 (Inventory) | 8 | 2 | 3 | **62%** | — |
| BX-03-006 (Status Visibility) | 4 | 2 | 4 | **40%** | — |

## Remaining Critical Gaps

### P0 — Still Missing
| Gap | Story | Effort |
|---|---|---|
| No way to add variants to existing product | BX-03-003 | Medium |

### P1 — Should-Fix
| Gap | Story | Effort |
|---|---|---|
| No "Out of Stock" badge on listings | BX-03-005 | Low |
| No Draft status | BX-03-006 | Medium |
| No Flagged status | BX-03-006 | Medium |
| No "Disabled by Admin" label | BX-03-006 | Low |

### P2 — Nice-to-Have
| Gap | Story | Effort |
|---|---|---|
| Post-edit policy/duplicate scanning | BX-03-002, BX-03-003 | High |
| Auto Out-of-Stock status change | BX-03-005 | Low |
