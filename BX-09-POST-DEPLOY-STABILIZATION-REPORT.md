# BX-09 Post-Deploy Stabilization Report

Date: April 16, 2026  
Scope: Buyer checkout shipping rollout (BX-09-001 to BX-09-004) and post-deploy production stabilization

---

## 1. Executive Summary

After BX-09 checkout shipping features were implemented, three production-impacting issues surfaced during migration execution and buyer order retrieval:

1. SQL type mismatch during migration (uuid vs text)
2. Missing PostgREST relationship between orders and order_shipments
3. Policy dependency blocking order_id type conversion

All three issues were diagnosed, patch scripts were prepared, and app-side resiliency was added so buyer orders can still load if the database relationship is temporarily unavailable.

Current state:
- Code and migration fixes are prepared in repository
- Final environment rollout requires running the hotfix migration and schema cache reload in Supabase

---

## 2. Incident Summary

| Incident | Error | User Impact | Severity | Status |
|---|---|---|---|---|
| Migration policy/type mismatch | ERROR 42883: operator does not exist: uuid = text | order_shipments migration failed | High | Fixed in migration script |
| Missing relation in schema cache | PGRST200: no relationship between orders and order_shipments | Buyer Orders screen failed to load, profile showed no orders/details | Critical | Fixed via DB hotfix migration + app fallback |
| Policy dependency on column type | ERROR 0A000: cannot alter type of a column used in a policy definition | Blocked order_id conversion to uuid in hotfix run | High | Fixed by policy drop/recreate around ALTER TYPE |

---

## 3. Root Cause Analysis

### 3.1 42883 (uuid = text)
Root cause:
- order_shipments.order_id was created as text in some environments.
- Policy and relation logic compared UUID and text paths inconsistently.

Contributing factors:
- Schema drift between intended generated types and runtime table definition.
- Mixed assumptions across migration and policy layers.

### 3.2 PGRST200 (missing orders <-> order_shipments relationship)
Root cause:
- Orders query used embedded relationship fetch (orders with shipments:order_shipments(...)).
- PostgREST requires a real FK relationship to resolve embedded relations.
- Without FK, query fails even if both tables exist.

Contributing factors:
- order_shipments.order_id was not enforced as UUID FK to orders.id in the affected environment.

### 3.3 0A000 (cannot alter type due to policy dependency)
Root cause:
- order_shipments policies referenced order_id.
- PostgreSQL blocks ALTER COLUMN TYPE while dependent policies exist.

Contributing factors:
- Hotfix initially altered type before policy teardown/rebuild sequence.

---

## 4. Implemented Fixes

### 4.1 Base Migration Hardening
File: supabase-migrations/034_order_shipments.sql

Changes:
- Declared order_id as uuid with FK to public.orders(id)
- Added idempotent policy cleanup before create
- Kept RLS checks type-safe with explicit casts where needed
- Included cleanup for legacy typo-named policy

Result:
- New environments provision table with correct relation shape from the start.

### 4.2 Existing Environment Hotfix Migration
File: supabase-migrations/035_order_shipments_order_fk_hotfix.sql

Changes:
- Added preflight checks for table/column presence
- Dropped dependent policies before ALTER COLUMN TYPE
- Validated order_id values are UUID-compatible before cast
- Converted order_id from text to uuid when required
- Validated no orphan shipment rows before FK creation
- Added/repaired FK constraint order_shipments_order_id_fkey
- Re-enabled and recreated required RLS policies after schema changes

Result:
- Existing production-like environments can be migrated safely to relationship-correct schema.

### 4.3 Application Resilience in Buyer Orders
File: mobile-app/app/OrdersScreen.tsx

Changes:
- Added two-phase query strategy:
  1) attempt with embedded shipments
  2) if PGRST200 relation error occurs, retry without shipments embed
- Normalized fallback response by injecting shipments as empty array

Result:
- Buyer order list does not fully fail when relationship metadata is temporarily missing.

### 4.4 QA Artifact for Regression Coverage
File: BX-09-CHECKOUT-FLOW-TEST-CHECKLIST.md

Changes:
- Added comprehensive Happy Path and Edge Case checklist for BX-09-001 to BX-09-004
- Included cross-platform (Android/iOS) validation scope

Result:
- Standardized verification flow for post-fix retesting.

---

## 5. Files Updated in This Stabilization Cycle

| File | Change Type | Purpose |
|---|---|---|
| supabase-migrations/034_order_shipments.sql | Modified | Harden base migration and policy behavior |
| supabase-migrations/035_order_shipments_order_fk_hotfix.sql | New | Repair existing DB schema and FK relationship |
| mobile-app/app/OrdersScreen.tsx | Modified | Prevent buyer order list hard failure on missing relation |
| BX-09-CHECKOUT-FLOW-TEST-CHECKLIST.md | New | Structured test artifact for flow validation |
| bxdsu_april15.md.resolved | Modified | Day-end summary updated with incident and fix timeline |

---

## 6. Deployment Runbook (Required)

1. Run migration:
   supabase-migrations/035_order_shipments_order_fk_hotfix.sql

2. Reload PostgREST schema cache:
   select pg_notify('pgrst', 'reload schema');

3. Restart or reload mobile session and open Orders screen.

4. Execute BX-09 checklist subset for regression:
   - BX-09-001 shipping per seller
   - BX-09-002 shipping method selection
   - BX-09-003 ETA rendering
   - BX-09-004 address validation guards

---

## 7. Verification Checklist (Post-Run)

### Database Verification
- Confirm public.order_shipments.order_id data type is uuid
- Confirm FK order_shipments_order_id_fkey exists and references public.orders(id)
- Confirm policies exist on public.order_shipments:
  - Buyers can read own order shipments
  - Sellers can read own shipments
  - Sellers can update own shipments
  - Authenticated users can insert shipments

### Application Verification
- Buyer can open Orders screen without PGRST200 failure
- Buyer can see existing orders in profile
- Buyer can open order details
- Shipment/ETA fields render where available

### Regression Verification
- Checkout placement still succeeds for valid orders
- Shipment insert from checkoutService remains non-blocking
- No new RLS access regressions for buyer/seller reads

---

## 8. Risk Assessment and Remaining Actions

| Risk | Current Mitigation | Remaining Action |
|---|---|---|
| Environment not yet migrated | Hotfix migration prepared | Run 035 on target Supabase project |
| Schema cache stale after migration | Reload statement documented | Execute pg_notify reload immediately after 035 |
| Shipping pricing placeholders still in use | Not part of this hotfix scope | Replace with official J&T tariff data |
| Seller GPS and product weight coverage incomplete | Fallback logic in place | Backfill seller coords and product weights |

---

## 9. Lessons Learned

1. Embedded PostgREST relations are contract-critical and require explicit FK constraints.
2. Policy dependencies must be considered in all type-altering migrations.
3. Migration scripts should be idempotent and resilient to partial prior runs.
4. App-side query fallback can protect user experience during transient schema drift.

---

## 10. Recommended Next Step Sequence

1. Execute 035 hotfix migration in Supabase
2. Reload PostgREST schema cache
3. Retest buyer Orders and Order Details
4. Run BX-09 checklist artifact and capture evidence
5. Close incident and mark stabilization complete
