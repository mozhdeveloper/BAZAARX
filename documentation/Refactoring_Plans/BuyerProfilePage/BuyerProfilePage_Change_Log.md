# BuyerProfilePage Change Log (Feb 10, 2026)

## Summary

- Aligned address data flow to the shipping_addresses schema and centralized parsing/formatting.
- Updated buyer/profile mapping to match the provided schema (profiles first_name/last_name, buyers avatar_url).
- Improved seller role checks with caching and user_roles lookup.
- Fixed address management hook duplication and wiring.

## Key Code Updates

- web/src/services/addressService.ts
  - Uses shipping_addresses table.
  - Maps address_line_1 parsing into name/phone/street.
  - Supports postal_code, landmark, delivery_instructions, coordinates.
- web/src/stores/buyerStore.ts
  - buildAddressLine1 helper added.
  - Address inserts/updates use shipping_addresses fields.
  - initializeBuyerProfile reads profiles.first_name/last_name and buyers.avatar_url.
  - buyers insert payload trimmed to schema fields.
- web/src/hooks/profile/useAddressManager.ts
  - Consolidated single implementation (store + service sync).
  - No direct Supabase access.
- web/src/components/profile/AddressModal.tsx
  - Uses callbacks for add/update, no direct Supabase calls.
- web/src/components/profile/AddressManagementSection.tsx
  - Wires AddressModal callbacks to useAddressManager.
- web/src/hooks/profile/useProfileManager.ts
  - Seller role check uses user_roles and caches for 5 minutes.
  - Profile updates map to profiles schema.
  - Avatar updates stay in buyers table.
- web/src/pages/BuyerProfilePage.tsx
  - Uses cached seller status; forces refresh on action.
- web/src/pages/BuyerProfilePage_Refactored.tsx
  - Updated to match new role check behavior.
- web/src/pages/ProfileComponentsTest.tsx
  - Updated to new component prop shapes.

## Notes

- Payment flows remain deferred by request.
- Vite build still failing prior to this log; see latest console output for remaining errors.
