# EPIC 9 General Initial Test Checklist (Mobile Only)

## Purpose
Use this checklist before fixing anything.
It helps you see the current system behavior for BX-09-001 to BX-09-004.
It also helps you understand what needs to be changed.

## Scope
- [ ] Mobile-app view only
- [ ] Android tested
- [ ] iOS tested
- [ ] Responsive behavior checked on small and large phone screens
- [ ] Existing modals and current feature surfaces reviewed first for reuse
- [ ] New modal or page is proposed only when current UI cannot support the required flow

## How To Use This File
1. Run each checklist item in order.
2. Mark each line when done.
3. Add notes for anything broken, confusing, or inconsistent.
4. Capture screenshots for important failures.

## A. Test Environment Readiness
- [ ] Test account is ready with buyer role
- [ ] At least two sellers have active products
- [ ] Cart can contain multi-seller items
- [ ] At least two buyer addresses are available (one valid, one incomplete or invalid)
- [ ] Android device or emulator is ready
- [ ] iOS device or simulator is ready
- [ ] Network can be switched between stable and unstable for retry testing

## B. Quick System Health Check (Mobile)
- [ ] App launches and user can log in on Android
- [ ] App launches and user can log in on iOS
- [ ] Cart page loads without layout break
- [ ] Checkout page opens from cart
- [ ] Seller group sections are visible in checkout

## C. BX-09-004 — Validate Delivery Address Before Order Placement
> All tests below are run inside the **Checkout screen**.
> Open checkout from the cart. Do not navigate away unless the test says so.

### C-1. No Address Scenario
- [ ] Open checkout with no saved addresses
- [ ] Confirm the shipping section shows "Add Shipping Information" prompt (dashed button)
- [ ] Confirm "Place Order" button is disabled when no address is selected
- [ ] Tap the dashed button — confirm the address selection modal opens inside checkout
- [ ] Add a new address from the modal — confirm it appears selected in checkout

### C-2. Invalid Address — Inline Banner (Checkout Screen)
> Select an existing address that has missing or bad data. The banner should appear
> directly under the address tile without tapping anything extra.

- [ ] Select an address with a missing barangay — confirm amber banner appears under address tile with bullet: "Barangay is required"
- [ ] Select an address with a missing street — confirm banner shows "Street / house number is required"
- [ ] Select an address with a missing province — confirm banner shows "Province is required"
- [ ] Select an address with multiple empty fields — confirm banner lists ALL missing fields, not just one
- [ ] Confirm banner header reads **⚠ Address needs attention**
- [ ] Confirm "Fix Address" button is visible inside the banner
- [ ] Tap "Fix Address" — confirm address selection modal opens inside checkout
- [ ] Fix the address and re-select it — confirm banner disappears immediately without page reload

### C-3. Phone Number Format (Checkout Screen)
> These are tested by selecting an address that has the given phone value already saved.

- [ ] Select address with phone `09171234567` — no phone error shown
- [ ] Select address with phone `+639171234567` — no phone error shown
- [ ] Select address with phone `9171234567` (no leading 0) — banner shows: "Enter a valid PH mobile number (e.g. 09XXXXXXXXX or +639XXXXXXXXX)"
- [ ] Select address with phone `12345` (too short) — banner shows phone format error
- [ ] Select address with spaces in phone (e.g. `0917 123 4567`) — banner shows phone format error

### C-4. Postal Code Format (Checkout Screen)
- [ ] Select address with zip `1000` — no zip error shown
- [ ] Select address with zip `600` (3 digits) — banner shows "Enter a valid 4-digit postal code"
- [ ] Select address with zip `ABCD` (letters) — banner shows zip format error
- [ ] Select address with empty zip — banner shows "Postal code is required"

### C-5. Serviceability Check (Checkout Screen)
- [ ] Select an address that was pinned on the map inside the Philippines — no serviceability error
- [ ] Select an address with no GPS coordinates (`coordinates = null`) — no serviceability block, checkout allowed
- [ ] If possible, select an address whose saved coordinates are outside the PH bounding box — confirm "Area Not Serviceable" alert appears when tapping "Place Order"

### C-6. Place Order Guard (Checkout Screen)
> These tests tap "Place Order" directly. All blocks happen without leaving checkout.

- [ ] With no address selected — tap "Place Order" — confirm alert: **"No Address Selected"** with "Add Address" button
- [ ] With incomplete address (missing fields) — tap "Place Order" — confirm alert: **"Address Incomplete"** with bullet list of missing fields and "Fix Address" button
- [ ] With non-serviceable address — tap "Place Order" — confirm alert: **"Area Not Serviceable"** with "Change Address" button
- [ ] Tap "Fix Address" inside the alert — confirm address modal opens in checkout
- [ ] Tap "Cancel" inside any alert — confirm alert closes and user stays on checkout, no order placed
- [ ] With a fully valid address — tap "Place Order" — confirm order proceeds normally

### C-7. Payload Verification (After Successful Order)
- [ ] Place a successful order — open Supabase and inspect the `orders` row
- [ ] Confirm `shipping_address.city` matches the actual city selected (not `"Manila"`)
- [ ] Confirm `shipping_address.postalCode` matches actual zip (not `"0000"`)
- [ ] Confirm `shipping_address.phone` matches actual phone (not empty string fallback)

### C-8. Address Switch Behavior (Checkout Screen)
- [ ] Select Address A (valid) → shipping fee shown → switch to Address B (also valid)
- [ ] Confirm shipping section refreshes for Address B (no stale values from Address A)
- [ ] Select a valid address → switch to an invalid address → confirm banner appears immediately
- [ ] Switch back to valid address → confirm banner disappears immediately

### C-9. Cross-Platform — Android & iOS
- [ ] Android: Amber validation banner is readable and not clipped
- [ ] Android: "Fix Address" and "Place Order" buttons are visible with keyboard open
- [ ] Android: Place Order alert with bullet list is fully readable
- [ ] iOS: Amber validation banner is readable and not clipped
- [ ] iOS: "Fix Address" and "Place Order" buttons are visible with keyboard open
- [ ] iOS: Place Order alert with bullet list is fully readable

### C-10. Responsiveness
- [ ] On a small phone screen (360 dp wide) — banner text wraps cleanly, no overflow
- [ ] Multiple error bullets in banner — content stays within card, does not push "Place Order" off screen


## D. BX-09-001 Per-Seller Shipping Fee Baseline
- [ ] Add items from at least two different sellers
- [ ] Open checkout and check shipping display per seller section
- [ ] Confirm if shipping is incorrectly shown as one combined fee
- [ ] Change address and check if shipping recalculates
- [ ] Change quantity and check if shipping recalculates
- [ ] Confirm if checkout total updates after shipping updates
- [ ] Confirm if one seller shipping failure blocks whole order with clear seller-level error

## E. BX-09-002 Shipping Method Per Seller Baseline
- [ ] Check if each seller section has shipping method selector
- [ ] Open selector and check method list per seller
- [ ] Confirm if methods are filtered by selected address
- [ ] Select one method for seller A and another for seller B
- [ ] Confirm each selection stays under correct seller
- [ ] Confirm shipping fee and total change after method change
- [ ] Try placing order without selecting required method and check if blocked
- [ ] Simulate method fetch failure and check if retry is available

## F. BX-09-003 ETA Baseline
- [ ] Check ETA visibility near selected shipping method in checkout
- [ ] Confirm ETA is shown per seller group in multi-seller checkout
- [ ] Change address and confirm ETA refresh behavior
- [ ] Change shipping method and confirm ETA refresh behavior
- [ ] Place order and check ETA in order confirmation screen
- [ ] Open order details and check ETA visibility
- [ ] If ETA missing, check if fallback text is shown clearly

## G. Cross-Platform and Responsiveness Baseline

### Android
- [ ] Checkout screen is readable and usable
- [ ] Seller shipping sections do not overlap
- [ ] Buttons are tap-friendly and visible
- [ ] Keyboard does not hide critical address inputs

### iOS
- [ ] Checkout screen is readable and usable
- [ ] Seller shipping sections do not overlap
- [ ] Buttons are tap-friendly and visible
- [ ] Keyboard does not hide critical address inputs

### Responsive Layout
- [ ] Test on a smaller phone screen
- [ ] Test on a larger phone screen
- [ ] Confirm text does not clip or overflow in shipping and ETA rows
- [ ] Confirm error messages remain readable

## H. Loading, Error, and Retry Baseline
- [ ] Shipping loading state is shown while fees are being calculated
- [ ] Method loading state is shown while options are being fetched
- [ ] Seller-level errors are clear and actionable
- [ ] Retry action works for shipping or method fetch failures
- [ ] Place-order remains blocked when critical shipping errors are unresolved

## I. Evidence Checklist
- [ ] Screenshot: missing required address field handling
- [ ] Screenshot: multi-seller shipping section behavior
- [ ] Screenshot: shipping method selector behavior
- [ ] Screenshot: ETA display and fallback behavior
- [ ] Screenshot: Android layout sample
- [ ] Screenshot: iOS layout sample
- [ ] Screenshot: any critical failure

## J. Result Summary

### Story Status
- [ ] BX-09-001 baseline understood
- [ ] BX-09-002 baseline understood
- [ ] BX-09-003 baseline understood
- [ ] BX-09-004 baseline understood

### Platform Status
- [ ] Android baseline completed
- [ ] iOS baseline completed
- [ ] Responsive baseline completed

### Final Notes
- [ ] High-priority issues listed
- [ ] Risks listed
- [ ] Implementation starting point is clear

## K. Reuse and UX Constraints for Implementation
- [ ] Reuse-first approach is documented for each BX story before coding starts
- [ ] Any proposed new modal or page has a clear necessity note
- [ ] Planned flow reduces taps and keeps actions predictable
- [ ] Planned labels, errors, and loading states are easy to understand
- [ ] UI ease of use is balanced with strict validation and accurate checkout results
