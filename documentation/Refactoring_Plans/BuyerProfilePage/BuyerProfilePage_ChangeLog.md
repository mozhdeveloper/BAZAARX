# Buyer Profile Page Change Log

Date: February 11, 2026

## Scope
Web app buyer profile details and related profile management flows.

## Summary of changes
- Notifications preferences now persist to the buyer profile instead of being no-ops.
- Payment method add flow now uses the store manager for IDs, default handling, and toast feedback.
- Avatar upload modal now delegates upload to the profile manager to avoid double uploads and type mismatch.
- Removed unused modal wiring and duplicate hook calls to prevent conflicting state.
- Simplified address management wiring to avoid conflicting modal state.
- Aligned modal prop types with the profile/store hooks to ensure correct data flow.

## Updated files
- web/src/pages/BuyerProfilePage.tsx
- web/src/components/profile/PaymentMethodsSection.tsx
- web/src/components/profile/PaymentMethodModal.tsx
- web/src/components/profile/AvatarUploadModal.tsx

## Detailed changes
### BuyerProfilePage
- Removed unused address and payment modal state and the duplicate hook instances.
- Settings tab now calls updateProfile with preferences payload.
- Avatar upload modal now calls the profile manager with the file object.

### PaymentMethodsSection
- Added addPaymentMethod wiring so the modal can persist to the store.

### PaymentMethodModal
- Switched to using the store manager for adding methods; removed local ID generation and toast duplication.
- Added return handling so the modal closes only on successful add.

### AvatarUploadModal
- Delegated file upload to the profile manager and removed direct storage calls.
- Only closes the modal when the upload succeeds.

## Functional verification checklist
- Personal info and summary sections render without errors.
- Notification toggles persist and reflect updated preferences.
- Add payment method succeeds and appears in the list.
- Update profile avatar succeeds and updates the header image.

## Additional verification
- Payment method default toggling works and only one method is default.
- Address list loads and update/delete operations work without duplicate modals.
- Buyer mode switch button routes correctly based on seller status.

## Notes
- No database schema changes were required.
- Payment method persistence uses the buyer store only; no server write is performed here.
- Avatar uploads rely on the profile manager hook to update storage and profile state.
