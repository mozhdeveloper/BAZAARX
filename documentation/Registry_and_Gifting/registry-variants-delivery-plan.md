# Buyer Registry: Variants + Delivery Implementation Plan

## Goal

Enable buyers to manage product variants, requested quantities, delivery preferences, and privacy for registry items, and ensure shared registries reflect accurate details end-to-end (add → view/share → purchase).

## Current gaps (condensed)

- Registry items lack variant selection, requested/received tracking, and delivery/privacy fields.
- Add-to-registry flow accepts products without enforcing variant choice.
- Shared view cannot show variant/delivery details; checkout does not respect registry delivery or privacy.

## Scope

- Web buyer experience (create/edit registry, shared registry view, checkout). Mobile parity noted but out-of-scope for this slice unless quick wins emerge.
- Store state + API/DB contracts for registry items.

## Success criteria

- Buyer can pick and edit a variant + requested qty per registry item.
- Registry has privacy setting (public/link/private) and delivery preference (address selection + visibility toggle).
- Shared registry displays selected variant details and hides address when privacy requires.
- Checkout from a registry uses the selected variant and prefilled registry delivery (when allowed) and blocks disallowed methods (e.g., COD when hidden/private).

## Data model changes

- Registry item: `selectedVariant` (id, label/options, price delta optional), `requestedQty`, `receivedQty`, `note`, `priority`, `delivery` { addressId, showAddress: boolean, instructions? }, `privacy` at registry level: `public | link | private`.
- Persist in store; align DTOs if/when backed by API. Add lightweight type guards to avoid breaking existing items.

## Feature plan

1. **Store/types**
   - Extend buyer store registry types to include selectedVariant, requestedQty, delivery, privacy.
   - Add migrations/defaults for existing persisted registries (fallback values).

2. **Create/Edit registry**
   - Update create modal to capture privacy + delivery address (from buyer addresses) and a toggle for showing address on shared view.
   - Add edit controls in registry detail modal for privacy/delivery updates.

3. **Add-to-registry flow**
   - On product detail, require variant selection before adding to registry; capture requested qty and note.
   - Normalize stored item (variant id + display labels) to keep shared pages stable if variant names change.

4. **Registry detail management**
   - In RegistryDetailModal: show selected variant, allow edit of variant, requested qty, note, and mark most-wanted.
   - Handle receivedQty updates after purchase webhook/hook (stub: mark as purchased when quick-order completes).

5. **Shared registry page**
   - Render variant info and requested vs received counts.
   - Respect privacy: hide address when `showAddress` is false; show “contact owner” CTA.
   - Disable purchase button when requestedQty reached.

6. **Checkout integration**
   - When launched from registry, pass variant + registryId to `setQuickOrder` and checkout payload.
   - Prefill shipping with registry delivery if `showAddress`; otherwise prompt selection and note privacy.
   - Enforce payment/shipping rules (e.g., block COD for hidden/private registry deliveries).

7. **QA & instrumentation**
   - Add unit tests for store mutations (add/update/remove with variant/delivery fields).
   - Add UI tests for: create registry with privacy, add variant item, shared view hide/show address, checkout prefill.
   - Smoke shared link: public vs link-only vs private (private should redirect/deny).

## Risks / mitigations

- Missing backend support: keep feature behind store-only mock but shape DTOs for future API; guard API calls with feature flag.
- Variant drift (product updated): store variant label snapshot; fallback text when variant id not found.
- Address privacy leaks: centralize a helper to strip address before rendering shared view.

## Milestones (suggested)

- Day 1: Store/type extensions + defaults, create/edit registry privacy & delivery UI.
- Day 2: Add-to-registry variant+qty enforcement; registry detail edits.
- Day 3: Shared registry rendering with privacy, checkout prefill/guards; targeted tests.

## Definition of done

- All success criteria met on web.
- Tests for store + key UI flows passing.
- Shared registry links honor privacy; address only shown when allowed.
- Checkout uses selected variant and registry delivery when permitted.
