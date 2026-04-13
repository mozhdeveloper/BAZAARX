# EPIC 9 Logistics and Shipping - Implementation Roadmap

## Goal
Implement BX-09-001 to BX-09-004 in the safest order, with less rework and fewer blockers.

## Scope Guardrail
1. This roadmap is for mobile-app view only.
2. All phases must include responsiveness checks for common phone sizes.
3. All critical flows must be verified on both Android and iOS.

## Reuse and UX Constraints
1. Reuse current modals, screens, and existing feature surfaces as the default approach.
2. Add a new modal or page only when current UI cannot support the required behavior clearly.
3. Any new UI surface must include a short necessity note and remain consistent with the current app patterns.
4. In every phase, optimize for ease of use: fewer steps, clear actions, visible feedback, and low confusion.
5. Better usability must not reduce validation strictness, shipping accuracy, or checkout safety.

## Why This Order
1. Address validation must come first because shipping fee, shipping method, and ETA all depend on a valid destination.
2. Per-seller shipping fee should come before method selection because method pricing uses seller-level shipping groups.
3. ETA should come after method selection because ETA depends on the selected shipping method.
4. Final hardening and QA should happen last to verify all user stories together.

## Recommended Implementation Sequence

## Phase 0 - Baseline and Test Readiness
Priority: Highest

1. Run initial baseline tests from:
- BX-09-001.md
- BX-09-002.md
- BX-09-003.md
- BX-09-004.md

2. Capture screenshots and logs for current behavior.
3. Mark each test case as Pass, Partial, or Fail.
4. Execute each baseline test on Android and iOS.
5. Record any mobile responsiveness issues as blockers or follow-up tasks.

Phase 0 exit gate:
All current gaps are documented and agreed by the team.

## Phase 1 - Address Foundation (BX-09-004)
Priority: Highest

Implement first:
1. Central address validator in service layer.
2. Required fields, phone format, and postal format checks.
3. Serviceability check and clear field-level error messages.
4. Recalculate and invalidate stale shipping values when address changes.

Why first:
Without valid address logic, shipping fee and shipping method logic will be unstable.

Phase 1 exit gate:
Checkout blocks invalid addresses and shows clear guidance to fix them.

## Phase 2 - Per-Seller Shipping Fee (BX-09-001)
Priority: High

Implement next:
1. Seller-group shipping state and seller-level loading and error states.
2. Backend-calculated per-seller fee request.
3. Per-seller shipping fee display in checkout.
4. Total calculation based on sum of seller fees.

Why second:
This creates the base structure needed for seller-level shipping method selection.

Phase 2 exit gate:
Checkout shows separate shipping fee per seller and blocks unresolved seller-group failures.

## Phase 3 - Shipping Method Per Seller (BX-09-002)
Priority: High

Implement next:
1. Fetch available methods by seller group and address.
2. Method selector UI under each seller group.
3. Save selected method per seller group.
4. Revalidate selected method before place-order.

Why third:
Method selection depends on seller-group shipping structure already built in Phase 2.

Phase 3 exit gate:
Buyer can select method per seller, totals update, and invalid or missing selection blocks checkout.

## Phase 4 - ETA Visibility and Persistence (BX-09-003)
Priority: Medium

Implement next:
1. Show ETA near selected method in checkout.
2. Refresh ETA when address or method changes.
3. Persist ETA into order-related data.
4. Show ETA or fallback in confirmation and detail views.

Why fourth:
ETA is meaningful only when method selection and seller-group shipping are already stable.

Phase 4 exit gate:
ETA is visible, refreshed, and persisted from checkout to post-order screens.

## Phase 5 - Integration Hardening and QA
Priority: Medium

Implement last:
1. End-to-end scenario tests for all four BX stories together.
2. Negative tests for method unavailability, unserviceable address, and missing ETA.
3. Performance and retry behavior checks for shipping calls.
4. Final regression checks on checkout total and order placement.
5. Responsive UI checks on small and large mobile screens.
6. Cross-platform QA pass on Android and iOS.

Why last:
This confirms the full flow works together and prevents rollout surprises.

Phase 5 exit gate:
All acceptance checks for BX-09-001 to BX-09-004 pass in manual and automated testing.
Responsive and cross-platform checks pass for Android and iOS mobile devices.

## Quick Team Checklist
1. Do not implement ETA first.
2. Do not implement method selection before per-seller shipping grouping.
3. Keep one shared validator for address rules.
4. Revalidate shipping data before place-order.
5. Keep fallback messages clear and simple for users.
6. Keep every test and implementation decision inside mobile-only scope.
7. Treat responsiveness and Android/iOS usability as required completion criteria.
8. Reuse current UI surfaces first and avoid creating new modals or pages unless clearly required.
9. Keep every solution easy to use while preserving business and validation correctness.
