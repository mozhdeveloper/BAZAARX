# Seller Onboarding Document URLs Implementation

**Date:** January 19, 2026  
**Status:** Complete

## Overview

Updated seller onboarding to accept document URLs as text input instead of file uploads. Documents are now optional and can be provided later. Prepared database schema for document storage without implementing file upload infrastructure yet.

## Database Changes

### SQL Migration Applied

Added 5 new TEXT columns to `sellers` table:

```sql
ALTER TABLE sellers
ADD COLUMN business_permit_url TEXT,
ADD COLUMN valid_id_url TEXT,
ADD COLUMN proof_of_address_url TEXT,
ADD COLUMN dti_registration_url TEXT,
ADD COLUMN tax_id_url TEXT;
```

**Rationale:**

- TEXT columns store document URLs (strings), not files
- Fixed document types → multiple columns cleaner than JSONB
- Better performance and explicit schema
- Can accept URLs from any storage service (Supabase Storage, S3, Cloudinary, etc.)

**Current State:** All columns are nullable; existing sellers unaffected

## Frontend Changes

### 1. SellerOnboarding.tsx (`web/src/pages/SellerOnboarding.tsx`)

#### Form State Update

- **Removed:** `documents` object with File types
- **Added:** 5 individual text fields for document URLs:
  - `businessPermitUrl: string`
  - `validIdUrl: string`
  - `proofOfAddressUrl: string`
  - `dtiRegistrationUrl: string`
  - `taxIdUrl: string`

#### Validation Update

- **Step 5:** Documents now optional (no validation errors)
- Sellers can complete onboarding without providing document URLs
- Documents can be added later from seller profile

#### Step 5 UI Refactor

- **Changed from:** File upload dropzones with drag-and-drop
- **Changed to:** Text input fields with URL placeholders
- Placeholder text: `https://example.com/document.pdf`
- Optional fields marked clearly with info banner

#### Form Submission Update

- Document URLs now included in `updateSellerDetails()` call
- Admin store document creation conditional on URL availability
- Only creates document entries if URLs are provided

#### Testing Feature Added

- **New Function:** `fillTestData()`
- **Purpose:** Quickly populate all form fields with realistic test data
- **Location:** Purple button below header: "🧪 Fill Test Data"
- **Test Data Includes:**
  - Owner: Juan Dela Cruz / 09123456789
  - Store: Test Store PH / Electronics, Fashion
  - Address: Quezon City, Metro Manila
  - Bank: BDO / Sample account details
  - Documents: Sample URLs (`https://example.com/*.pdf`)
- **Behavior:** Resets to Step 1 after filling

### 2. sellerStore.ts (`web/src/stores/sellerStore.ts`)

#### Seller Interface Update

Added optional document URL fields to match database schema:

```typescript
// Document URLs
businessPermitUrl?: string;
validIdUrl?: string;
proofOfAddressUrl?: string;
dtiRegistrationUrl?: string;
taxIdUrl?: string;
```

**Optional (?)** because documents aren't required for initial registration.

## User Flow

### Current Registration Flow

1. `/seller/register` - Email/password + store name (SellerAuth.tsx)
2. `/seller/onboarding` - 5-step detailed profile collection
   - Step 1: Personal info (owner name, phone)
   - Step 2: Business info (name, category, type)
   - Step 3: Address (full address details)
   - Step 4: Banking info (bank, account)
   - Step 5: Documents (optional URL fields)
3. `/seller/pending-approval` - Waiting for admin review

### Document Collection

- **For Now:** Optional; sellers can skip
- **In Future:** When file storage is ready:
  1. Implement Supabase Storage bucket
  2. Add file upload UI to SellerSettings or SellerProfile
  3. Upload files → get public URLs
  4. Save URLs to database

## Testing

### Manual Testing Steps

1. Navigate to `/seller/onboarding`
2. Click "🧪 Fill Test Data" button
3. Verify all fields populated with test data
4. Click "Next" through all 5 steps
5. Verify no validation errors on Step 5
6. Submit form
7. Confirm redirect to `/seller/pending-approval`
8. Verify seller appears in admin store with pending status

### Test Data

```
Owner Name: Juan Dela Cruz
Phone: 09123456789
Business Name: Test Store PH
Store Description: Premium quality products at affordable prices
Categories: Electronics, Fashion
Business Type: Sole Proprietorship
Business Registration: DTI-2024-001234
Tax ID: 123-456-789-012
Address: 123 Main Street, Barangay San Antonio
City: Quezon City
Province: Metro Manila
Postal Code: 1100
Bank: BDO
Account Name: Juan Dela Cruz
Account Number: 0123456789012345
Document URLs: https://example.com/{permit,id,proof,dti,tax}.pdf
```

## Future Implementation

### When Ready to Store Files

1. **Set up storage service** (recommend Supabase Storage):

   ```typescript
   // Upload to Supabase Storage
   const { data, error } = await supabase.storage
     .from("seller-documents")
     .upload(`${sellerId}/business-permit.pdf`, file);

   // Get public URL
   const {
     data: { publicUrl },
   } = supabase.storage
     .from("seller-documents")
     .getPublicUrl(`${sellerId}/business-permit.pdf`);

   // Save URL to database
   await updateSellerDocumentUrls(sellerId, {
     businessPermitUrl: publicUrl,
   });
   ```

2. **Add file upload UI** to SellerSettings or SellerProfile with:
   - File input fields for each document type
   - Progress indicators during upload
   - Validation (file size, type)
   - Display current URLs if already uploaded

3. **Update admin review panel** to:
   - Display document URLs as clickable links
   - Mark documents as verified/rejected
   - Add verification notes

## Files Modified

1. **Database:**
   - Supabase: `sellers` table (5 new TEXT columns)

2. **Frontend:**
   - `web/src/pages/SellerOnboarding.tsx` (form state, validation, UI, test button)
   - `web/src/stores/sellerStore.ts` (Seller interface)

## TypeScript Status

✅ No errors in modified files
✅ All types properly aligned with database schema
✅ Form state fully typed

## Notes

- Documents are completely optional at registration
- URL placeholders provided for testing without file storage
- Design prepared for future integration with any file storage service
- Admin approval flow unaffected; documents optional for approval
- Can be enhanced with actual file uploads later without breaking changes

## References

**SQL Schema:** `supabase-migrations/001_initial_schema.sql`  
**Sample Data:** JSON extract from sellers table shows all 5 new columns populated as `null`  
**Related Pages:** SellerAuth.tsx, SellerPendingApproval, AdminSellers
