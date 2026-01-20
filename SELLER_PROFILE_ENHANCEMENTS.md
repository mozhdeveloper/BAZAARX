# Seller Profile Enhancements - Branch: feat/preview-seller-document

## Overview

This document outlines all changes made to the Seller Store Profile page to improve user experience, data completeness visibility, and enable comprehensive profile editing.

## Changes Summary

### 1. Missing Field Indicators

**Purpose**: Help sellers identify incomplete required fields for approval readiness

**Implementation**:

- Added `isEmptyField()` helper function to detect empty fields and placeholder text
- Added `AlertCircle` icons next to field labels when data is missing
- Treats placeholder values ("Not provided", "No description added") as empty
- Provides `aria-label` for accessibility

**Affected Sections**:

- Owner & Contact Information: `ownerName`, `email`, `phone`, `storeName`
- Business Information: `businessName`, `businessType`, `businessRegistrationNumber`, `taxIdNumber`, complete address
- Banking Information: `bankName`, `accountName`, `accountNumber`

**Files Modified**:

- `web/src/pages/SellerStoreProfile.tsx`

---

### 2. Reapply for Verification Feature

**Purpose**: Allow rejected sellers to resubmit their profile for verification after completing all requirements

**Implementation**:

- Added "Reapply" button next to the "Rejected" status badge in header
- Implemented `getMissingItems()` function to validate all required fields and documents
- Implemented `handleReapply()` function to:
  - Check completeness of all required fields
  - Display missing items in an alert if incomplete
  - Update `approval_status` to 'pending' in Supabase if complete
  - Show success confirmation

**Required Completeness Check**:

- Owner/Contact: ownerName, email, phone, storeName
- Business: businessName, businessType, businessRegistrationNumber, taxIdNumber, full address
- Banking: bankName, accountName, accountNumber
- Documents: All 5 verification documents (Business Permit, Valid ID, Proof of Address, DTI/SEC Registration, BIR Tax ID)

**Files Modified**:

- `web/src/pages/SellerStoreProfile.tsx`

---

### 3. Editable Profile Sections

**Purpose**: Enable sellers to update their profile information directly from the Store Profile page

#### 3.1 Owner & Contact Information (Basic Info)

**Editable Fields**:

- Owner Name
- Email Address
- Phone Number
- Store Name
- Store Description

**Database Mapping**:

- Updates `store_name` and `store_description` in Supabase `sellers` table
- Other fields managed through local state

**Handler**: `handleSaveBasic()`

#### 3.2 Business Information

**Editable Fields**:

- Business Name
- Business Type
- Business Registration Number
- Tax ID Number (TIN)
- Business Address (street, city, province, postal code)

**Database Mapping**:

- `business_name`
- `business_type`
- `business_registration_number`
- `tax_id_number`
- `business_address`
- `city`
- `province`
- `postal_code`

**Handler**: `handleSaveBusiness()`

**Restrictions**: Edit button only visible when seller is NOT verified (`!isVerified`)

#### 3.3 Banking Information

**Editable Fields**:

- Bank Name
- Account Name
- Account Number

**Database Mapping**:

- `bank_name`
- `account_name`
- `account_number`

**Handler**: `handleSaveBanking()`

**Restrictions**: Edit button only visible when seller is NOT verified (`!isVerified`)

#### 3.4 Store Categories

**Editable Fields**:

- Store Categories (comma-separated list)

**Database Mapping**:

- `store_category` (stored as text array in Supabase)

**Handler**: `handleSaveCategories()`

**UI Features**:

- Textarea input for comma-separated categories
- Auto-parsing and trimming of category entries
- Display as badge chips in read-only mode

**Files Modified**:

- `web/src/pages/SellerStoreProfile.tsx`

---

## State Management Updates

### New State Variables

```typescript
// Form states for each editable section
const [formData, setFormData] = useState({...});  // Basic info
const [businessForm, setBusinessForm] = useState({...});  // Business info
const [bankingForm, setBankingForm] = useState({...});  // Banking info
const [categoriesForm, setCategoriesForm] = useState<string[]>([...]);  // Categories

// Edit mode tracking
const [editSection, setEditSection] = useState<
  "basic" | "business" | "banking" | "categories" | null
>(null);

// Reapply feature
const [reapplyLoading, setReapplyLoading] = useState(false);
```

---

## UI/UX Improvements

### Edit Mode Flow

1. User clicks "Edit" button on a section
2. Section switches to edit mode with input fields
3. User can modify values
4. User clicks "Save Changes" → Updates Supabase → Updates local state → Exits edit mode
5. User clicks "Cancel" → Exits edit mode without saving

### Visual Indicators

- **Missing Fields**: Amber AlertCircle icon next to labels
- **Verified Sections**: Green "Verified & Locked" badge, edit button hidden
- **Pending Verification**: Business and Banking sections show edit capability
- **Approval Status**: Header badges (Verified, Pending, Approved, Rejected)

---

## Database Schema Reference

### Sellers Table Updates

```sql
-- Fields modified through edit functionality
store_name TEXT
store_description TEXT
business_name TEXT
business_type TEXT
business_registration_number TEXT
tax_id_number TEXT
business_address TEXT
city TEXT
province TEXT
postal_code TEXT
bank_name TEXT
account_name TEXT
account_number TEXT
store_category TEXT[]
approval_status TEXT  -- Modified by reapply feature
```

---

## Error Handling

### Save Operations

- Validates seller ID exists before Supabase update
- Uses type-safe Supabase client casting for dynamic updates
- Displays user-friendly alerts on success/failure
- Logs errors to console for debugging

### Reapply Validation

- Comprehensive validation of all required fields
- Clear feedback listing specific missing items
- Prevents submission if incomplete

---

## Technical Notes

### TypeScript Compatibility

- Used `aria-label` instead of `title` prop on Lucide icons (TypeScript compliance)
- Type-safe state management with proper interfaces
- Dynamic Supabase client casting to handle column-specific updates

### Component Structure

- Conditional rendering for edit vs. read-only modes
- Consistent button styling across all sections
- Responsive grid layouts for form inputs

---

## Testing Recommendations

1. **Edit Functionality**: Test each section's save/cancel flow
2. **Validation**: Verify missing field indicators appear correctly
3. **Reapply**: Test with various completion states (some missing, all complete)
4. **Database Sync**: Confirm all changes persist in Supabase
5. **Verification Lock**: Ensure edit buttons hidden when `isVerified = true`
6. **Categories**: Test comma-separated input parsing and display

---

## Future Enhancements (Potential)

- Real-time validation during input
- Inline edit mode instead of section-wide edit mode
- Auto-save drafts
- Change history/audit trail
- Upload validation for document types beyond PDF
- Batch edit capability
- Visual checklist UI for missing items (instead of alert)

---

## Files Changed

- `web/src/pages/SellerStoreProfile.tsx` (primary changes)

## Related Issues/Features

- Document verification system (already implemented)
- Approval status workflow (enhanced with reapply feature)
- Seller onboarding completeness tracking
