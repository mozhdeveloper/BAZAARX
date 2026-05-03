# Mobile UX Enhancements: Flash Sale Visibility and Return Request Validation

This PR introduces critical bug fixes and UX improvements to the mobile application, focusing on real-time Flash Sale visibility and mandatory validation for Return / Refund requests.

---

## What Changed

### 1. Flash Sale Real-Time Visibility
- **`useFlashSaleVisibility` Hook**: Developed a new custom hook to centralize visibility logic based on status and time remaining.
- **Conditional "Gate"**: Implemented a gate in `HomeScreen.tsx` that removes the Flash Sale section when inactive, allowing other content to shift up smoothly.
- **Supabase Realtime**: Added subscriptions to `global_flash_sale_slots` and `discount_campaigns` for instant UI updates when an admin pauses or resumes a sale.
- **Automated Expiry**: The section now hides automatically the moment the countdown hits `00:00:00`.

### 2. Return / Refund Request Refinement
- **Mandatory Fields**: "Description" and "Upload Evidence" are now strictly required for all return reasons to improve the seller review process.
- **Visual Indicators**: Added red asterisks (`*`) to the Description and Evidence labels.
- **Error Highlighting**: Implemented dynamic error states where missing fields are highlighted with red borders and backgrounds if a user attempts to submit an incomplete form.
- **Submission Validation**: Updated the `handleSubmit` logic to block requests and show specific error messages if required fields are empty.

### 3. Backend & Service Layer
- **Strict Filtering**: Updated `DiscountService` to only fetch active and non-expired flash sales.
- **Service Validation**: Modified `ReturnService` to enforce evidence requirements at the logic layer for all return types.

---

## Verification Results

### Manual Testing
- [x] **Flash Sale Expiry**: Verified the section disappears exactly at 00:00:00.
- [x] **Admin Pause**: Confirmed instant hiding when a sale is paused in the Supabase dashboard.
- [x] **Return Validation**: Submission is blocked if description or evidence is missing.
- [x] **Error States**: Verified that red highlights appear on empty fields and clear as the user fills them out.
- [x] **File Limits**: Confirmed image (5MB) and video (20MB) size limits are enforced during selection.

### Screenshots
- [Insert screenshot of Active Flash Sale with Counter]
- [Insert screenshot of Return Form with validation errors]
- [Insert screenshot of Required field indicators (*)]
