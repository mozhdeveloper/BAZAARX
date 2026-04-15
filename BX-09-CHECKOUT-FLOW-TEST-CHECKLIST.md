# BX-09 Checkout Flow Test Checklist

## Purpose
Use this checklist to validate BX-09-001 to BX-09-004 end-to-end in the mobile app.

## Test Scope
- [ ] Mobile app only
- [ ] Android execution completed
- [ ] iOS execution completed
- [ ] Multi-seller checkout scenario used
- [ ] Evidence captured for key pass/fail outcomes

## Test Data Readiness
- [ ] Buyer account with at least two saved addresses (one valid, one edge-case)
- [ ] Cart with at least three items from at least two sellers
- [ ] At least one seller with a normal shipping route
- [ ] At least one seller with an edge-case route or availability condition

---

## BX-09-001: Calculate shipping fees per seller

### Happy Path Tests
- [ ] Buyer selects multi-seller cart items and proceeds to checkout.
- [ ] System loads selected delivery address (or prompts if none selected).
- [ ] Items are grouped by seller in checkout.
- [ ] Shipping fee is calculated separately per seller group.
- [ ] Shipping fee is displayed under each corresponding seller section.
- [ ] Checkout total updates using sum of seller-level shipping fees.
- [ ] Place order succeeds when all seller shipping groups are valid.

### Edge Case Tests
- [ ] Shipping calculation fails for one seller group: seller-level error is shown and place order is blocked.
- [ ] No address selected: user is prompted to add/select address before shipping calculation.
- [ ] Item cannot be shipped to destination: affected seller group is clearly identified and checkout is blocked.
- [ ] Address changed to invalid after prior valid calculation: stale shipping values are cleared and recalculation waits for valid address.
- [ ] Android and iOS behavior match for blocking and error messaging.

---

## BX-09-002: Choose shipping method per seller

### Happy Path Tests
- [ ] Buyer opens checkout and sees shipping section under each seller group.
- [ ] Buyer opens shipping method selector for a seller group.
- [ ] System displays methods available for that seller and destination.
- [ ] Buyer selects method per seller group.
- [ ] System applies selected method to correct seller group.
- [ ] Shipping fee updates for that seller group after method selection.
- [ ] Overall total updates after method changes.
- [ ] Place order succeeds when all groups have valid selected methods.

### Edge Case Tests
- [ ] Previously selected method becomes unavailable before place order: user is forced to reselect.
- [ ] No shipping method available for a seller group: clear cannot-proceed message is shown for that group.
- [ ] Shipping methods fail to load: clear error and retry action are shown.
- [ ] Retry action succeeds: methods reload and selection can continue.
- [ ] Place order is blocked if any seller group has missing/invalid method selection.
- [ ] Android and iOS method picker behavior is consistent.

---

## BX-09-003: View estimated delivery time

### Happy Path Tests
- [ ] Buyer selects a shipping method in checkout.
- [ ] System calculates or retrieves estimated delivery window per seller group.
- [ ] ETA is shown near selected shipping option.
- [ ] Buyer can review ETA before placing order.
- [ ] ETA refreshes immediately when shipping method changes.
- [ ] ETA refreshes immediately when address changes.

### Edge Case Tests
- [ ] ETA unavailable: fallback text "Delivery estimate unavailable" is shown.
- [ ] Missing ETA does not break checkout when shipping is otherwise valid.
- [ ] ETA changes after address/method update: displayed ETA is updated immediately (no stale value).
- [ ] Multi-seller mixed ETA availability: each seller group shows correct ETA or fallback independently.
- [ ] Android and iOS ETA visibility and layout remain readable.

---

## BX-09-004: Validate delivery address before order placement

### Happy Path Tests
- [ ] Buyer selects or adds delivery address during checkout.
- [ ] System validates required address details.
- [ ] Buyer reviews validated shipping information before placing order.
- [ ] Serviceable valid address allows shipping calculation and order continuation.
- [ ] Place order succeeds with valid address and resolved shipping groups.

### Edge Case Tests
- [ ] Address becomes invalid after editing: stale shipping values are not retained.
- [ ] Selected area is not serviceable: clear delivery-unavailable message is shown and order is blocked.
- [ ] Buyer has no saved address: system prompts to add/select address before proceeding.
- [ ] Invalid phone or postal format: clear field-level error is shown and progression is blocked.
- [ ] Android and iOS validation prompts and error states are consistent.

---

## Execution Log
- [ ] Record result for each test: Pass / Partial / Fail
- [ ] Capture screenshot for each failed or partial test
- [ ] Note expected result vs actual result for mismatches
- [ ] Record device/OS used for each run
- [ ] Summarize blockers before re-test cycle
