# Implementation Plan: Seller Reapplication Controls

## Overview
This plan addresses two related issues:
1. **Cool-down/Blacklist System**: After N failed reapplication attempts, sellers are temporarily blocked or permanently blacklisted
2. **Validation Fix**: Prevent sellers from resubmitting when partially rejected documents haven't been updated

**Partial Rejection Behavior (Admin Policy)**
- When multiple documents are incorrect, the admin must select **all rejected documents in a single partial rejection**.
- The seller UI only evaluates the **latest** partial rejection record. If that record has one item, reuploading it will allow resubmission.
- Admin-side warning is shown if submitting a partial rejection with only one document while the seller is already in `needs_resubmission`.

**Draft Staging Behavior (Resubmission)**
- During `needs_resubmission` (or `rejected` + partial), uploads go to `seller_verification_document_drafts` (not live docs).
- Admin sees updated docs only after the seller clicks **Resubmit Application**.
- Per-document draft timestamps (`*_updated_at`) are used to confirm each rejected document was updated.

---

## New Logic Flow

```
REATTEMPT LIMIT: 3 attempts
    │
    ▼
[Submit Application] ──▶ [Admin Rejects]
    │                           │
    │                           ▼
    │                    [attempts + 1]
    │                           │
    │                           ▼
    │                    attempts >= 3?
    │                      │       │
    │                     Yes      No
    │                      │       │
    │                      ▼       ▼
    │              [COOLDOWN]    [Can Resubmit]
    │                  │
    │                  ▼
    │         [cooldown_count + 1]
    │                  │
    │                  ▼
    │         cooldown_count >= 3?
    │            │           │
    │           Yes          No
    │            │           │
    │            ▼           ▼
    │    [TEMP BLACKLIST]  [Wait 1 hour]
    │            │           │
    │            ▼           ▼
    │    [temp_blacklist_count + 1]
    │            │
    │            ▼
    │    temp_blacklist_count >= 3?
    │            │           │
    │           Yes          No (can resubmit after 1 day)
    │            │
    │            ▼
    │    [PERMANENTLY BLACKLISTED]
    │
    ▼
[Approved] ──▶ [RESET ALL COUNTERS]
```

### Constants
| Name | Value | Description |
|------|-------|-------------|
EMP| MAX_REATTTS | 3 | Max attempts before cooldown |
| COOLDOWN_DURATION_MS | 1 hour | Time to wait after 3 attempts |
| MAX_COOLDOWNS | 3 | Cooldowns before temp blacklist |
| TEMP_BLACKLIST_DURATION_MS | 1 day | Time in temp blacklist |
| MAX_TEMP_BLACKLISTS | 3 | Temp blacklists before permanent |

---

## Part 1: Database Schema Changes

### Migration File: `supabase-migrations/015_seller_blacklist_and_cooldown.sql`

```sql
-- Add columns to sellers table (ADD ONLY - no deletions)
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS reapplication_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cooldown_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS temp_blacklist_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS blacklisted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cool_down_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS temp_blacklist_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_permanently_blacklisted BOOLEAN DEFAULT FALSE;

-- Update CHECK constraint to include 'blacklisted' status
ALTER TABLE sellers 
DROP CONSTRAINT IF EXISTS sellers_approval_status_check,
ADD CONSTRAINT sellers_approval_status_check 
CHECK (approval_status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text, 'needs_resubmission'::text, 'blacklisted'::text]));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sellers_blacklist 
ON sellers(blacklisted_at, cool_down_until, temp_blacklist_until) 
WHERE blacklisted_at IS NOT NULL OR cool_down_until IS NOT NULL OR temp_blacklist_until IS NOT NULL;
```

### Migration File: `supabase-migrations/016_seller_verification_document_drafts.sql`

```sql
CREATE TABLE IF NOT EXISTS seller_verification_document_drafts (
  seller_id UUID PRIMARY KEY REFERENCES sellers(id) ON DELETE CASCADE,
  business_permit_url TEXT,
  business_permit_updated_at TIMESTAMPTZ,
  valid_id_url TEXT,
  valid_id_updated_at TIMESTAMPTZ,
  proof_of_address_url TEXT,
  proof_of_address_updated_at TIMESTAMPTZ,
  dti_registration_url TEXT,
  dti_registration_updated_at TIMESTAMPTZ,
  tax_id_url TEXT,
  tax_id_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_verification_document_drafts_seller_id
  ON seller_verification_document_drafts (seller_id);
```

If the table already existed without the per-document timestamps, run:
```sql
ALTER TABLE seller_verification_document_drafts
ADD COLUMN IF NOT EXISTS business_permit_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS valid_id_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS proof_of_address_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dti_registration_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tax_id_updated_at TIMESTAMPTZ;
```

---

## Part 2: Backend/Store Changes

### File: `web/src/stores/adminStore.ts`

#### 2.1 Update Seller Interface
```typescript
// Add to Seller interface
export interface Seller {
  // ... existing fields
  reapplicationAttempts?: number;
  cooldownCount?: number;
  tempBlacklistCount?: number;
  blacklistedAt?: Date;
  coolDownUntil?: Date;
  tempBlacklistUntil?: Date;
  isPermanentlyBlacklisted?: boolean;
}
```

#### 2.2 Constants (in rejectSeller function)
```typescript
const MAX_REATTEMPTS = 3;                    // Max attempts before cooldown
const COOLDOWN_DURATION_MS = 60 * 60 * 1000; // 1 hour in ms
const MAX_COOLDOWNS = 3;                     // Cooldowns before temp blacklist
const TEMP_BLACKLIST_DURATION_MS = 24 * 60 * 60 * 1000; // 1 day in ms
const MAX_TEMP_BLACKLISTS = 3;              // Temp blacklists before permanent
```

#### 2.3 Logic in rejectSeller

**Step 1: Check if permanently blacklisted**
```typescript
if (seller.is_permanently_blacklisted) {
  // Already permanently blacklisted, just update status
  await supabase.from('sellers').update({ approval_status: 'blacklisted' }).eq('id', id);
  return;
}
```

**Step 2: Check temp blacklist**
```typescript
if (seller.temp_blacklist_until && new Date(seller.temp_blacklist_until) > new Date()) {
  // Still in temp blacklist period
  // Just increment temp_blacklist_count after it expires would be handled separately
}
```

**Step 3: Normal rejection flow**
```typescript
// Get current state from DB
const currentAttempts = sellerData?.reapplication_attempts || 0;
const currentCooldownCount = sellerData?.cooldown_count || 0;
const currentTempBlacklistCount = sellerData?.temp_blacklist_count || 0;

let newAttempts = currentAttempts + 1;
let newCooldownCount = currentCooldownCount;
let newTempBlacklistCount = currentTempBlacklistCount;
let coolDownUntil = null;
let tempBlacklistUntil = null;
let isBlacklisted = false;
let isTempBlacklist = false;
let newStatus = 'rejected';

if (newAttempts > MAX_REATTEMPTS) {
  // Reset attempts, increment cooldown count
  newAttempts = 0;
  newCooldownCount = currentCooldownCount + 1;
  
  if (newCooldownCount >= MAX_COOLDOWNS) {
    // Trigger temp blacklist
    newCooldownCount = 0;
    newTempBlacklistCount = currentTempBlacklistCount + 1;
    
    if (newTempBlacklistCount >= MAX_TEMP_BLACKLISTS) {
      // Permanent blacklist!
      isBlacklisted = true;
      newTempBlacklistCount = 0;
      newAttempts = 0;
      newCooldownCount = 0;
    } else {
      // Temp blacklist
      isTempBlacklist = true;
      tempBlacklistUntil = new Date(Date.now() + TEMP_BLACKLIST_DURATION_MS).toISOString();
    }
  } else {
    // Cooldown
    coolDownUntil = new Date(Date.now() + COOLDOWN_DURATION_MS).toISOString();
  }
}

await supabase.from('sellers').update({
  approval_status: isBlacklisted ? 'blacklisted' : newStatus,
  reapplication_attempts: newAttempts,
  cooldown_count: newCooldownCount,
  temp_blacklist_count: newTempBlacklistCount,
  blacklisted_at: isBlacklisted ? nowIso : null,
  cool_down_until: coolDownUntil,
  temp_blacklist_until: tempBlacklistUntil,
  is_permanently_blacklisted: isBlacklisted,
}).eq('id', id);
```

#### 2.4 Update approveSeller Function
On approval, reset ALL counters:
```typescript
await supabase.from('sellers').update({
  reapplication_attempts: 0,
  cooldown_count: 0,
  temp_blacklist_count: 0,
  blacklisted_at: null,
  cool_down_until: null,
  temp_blacklist_until: null,
  is_permanently_blacklisted: false,
}).eq('id', sellerId);
```

---

## Part 3: Seller-Side Validation Fix

### File: `web/src/pages/SellerStoreProfile.tsx`

#### 3.1 Add Rejected Documents Check
```typescript
const getRejectedDocuments = () => {
  if (!latestRejection || latestRejection.rejectionType !== 'partial') {
    return [];
  }
  return latestRejection.items || [];
};

const hasUpdatedRejectedDocs = () => {
  const rejectedDocs = getRejectedDocuments();
  if (rejectedDocs.length === 0) return true;
  return latestRejection.items.length === 0;
};
```

#### 3.2 Add State for Restrictions
```typescript
const [sellerRestrictions, setSellerRestrictions] = useState<{
  isPermanentlyBlacklisted: boolean;
  isTemporarilyBlacklisted: boolean;
  coolDownUntil: Date | null;
  attempts: number;
  cooldownCount: number;
  tempBlacklistCount: number;
}>({ 
  isPermanentlyBlacklisted: false,
  isTemporarilyBlacklisted: false,
  coolDownUntil: null, 
  attempts: 0,
  cooldownCount: 0,
  tempBlacklistCount: 0
});
```

#### 3.3 Fetch Restrictions on Mount
```typescript
const { data: restrictionsData } = await supabase
  .from("sellers")
  .select("reapplication_attempts, cooldown_count, temp_blacklist_count, blacklisted_at, cool_down_until, temp_blacklist_until, is_permanently_blacklisted")
  .eq("id", sellerId)
  .single();

if (restrictionsData) {
  const now = new Date();
  const isTempBlacklisted = restrictionsData.temp_blacklist_until && 
    new Date(restrictionsData.temp_blacklist_until) > now;
  
  setSellerRestrictions({
    isPermanentlyBlacklisted: restrictionsData.is_permanently_blacklisted || false,
    isTemporarilyBlacklisted: isTempBlacklisted,
    coolDownUntil: restrictionsData.cool_down_until ? new Date(restrictionsData.cool_down_until) : null,
    attempts: restrictionsData.reapplication_attempts || 0,
    cooldownCount: restrictionsData.cooldown_count || 0,
    tempBlacklistCount: restrictionsData.temp_blacklist_count || 0,
  });
}
```

#### 3.4 Update handleReapply Validation
```typescript
// Check permanently blacklisted
if (sellerRestrictions.isPermanentlyBlacklisted) {
  toast({ variant: "destructive", title: "Blacklisted", description: "You have been permanently blacklisted." });
  return;
}

// Check temporarily blacklisted
if (sellerRestrictions.isTemporarilyBlacklisted) {
  const remainingTime = Math.ceil((new Date(sellerRestrictions.coolDownUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  toast({ variant: "destructive", title: "Temporarily Blacklisted", description: `You can resubmit in ${remainingTime} day(s).` });
  return;
}

// Check cooldown
if (sellerRestrictions.coolDownUntil && new Date(sellerRestrictions.coolDownUntil) > new Date()) {
  const remainingMinutes = Math.ceil((new Date(sellerRestrictions.coolDownUntil).getTime() - Date.now()) / (1000 * 60));
  toast({ variant: "destructive", title: "Cooldown Period", description: `You can resubmit in ${remainingMinutes} minute(s).` });
  return;
}

// Check missing items
if (getMissingItems().length > 0) {
  toast({ variant: "destructive", title: "Incomplete Profile", description: "Please complete missing items before reapplying." });
  return;
}

// Check rejected documents
if (!hasUpdatedRejectedDocs()) {
  toast({ variant: "destructive", title: "Documents Need Updates", description: "Please re-upload rejected documents." });
  return;
}
```

#### 3.5 Update UI
```typescript
{/* Permanently Blacklisted */}
{sellerRestrictions.isPermanentlyBlacklisted && (
  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
    <h4 className="font-bold text-red-700">Permanently Blacklisted</h4>
    <p className="text-sm text-red-600">Contact support for assistance.</p>
  </div>
)}

{/* Temporarily Blacklisted */}
{sellerRestrictions.isTemporarilyBlacklisted && (
  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
    <h4 className="font-bold text-red-700">Temporarily Blacklisted</h4>
    <p className="text-sm text-red-600">You can resubmit after 1 day.</p>
  </div>
)}

{/* Cooldown */}
{sellerRestrictions.coolDownUntil && new Date(sellerRestrictions.coolDownUntil) > new Date() && (
  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
    <h4 className="font-bold text-yellow-700">Cooldown Period</h4>
    <p className="text-sm text-yellow-600">
      Attempts: {sellerRestrictions.attempts}/3 | Cooldowns: {sellerRestrictions.cooldownCount}/3
    </p>
  </div>
)}

{/* Normal - Show attempt counter */}
{!sellerRestrictions.isPermanentlyBlacklisted && !sellerRestrictions.isTemporarilyBlacklisted && 
 (!sellerRestrictions.coolDownUntil || new Date(sellerRestrictions.coolDownUntil) <= new Date()) && (
  <Button disabled={reapplyLoading || getMissingItems().length > 0 || !hasUpdatedRejectedDocs()}>
    Resubmit ({sellerRestrictions.attempts}/3)
  </Button>
)}
```

#### 3.6 Draft Staging for Resubmission (New)
- If status is `needs_resubmission` (or `rejected` + partial), uploads are stored in `seller_verification_document_drafts`.
- Each updated document sets its own `*_updated_at` timestamp in the draft row.
- On **Resubmit Application**, draft docs are copied into `seller_verification_documents`, the draft row is deleted, then `approval_status` is set to `pending`.
- Rejected items are considered resolved only if the draft `*_updated_at` is later than the rejection item `created_at`.

---

## Part 4: Admin Side Updates

### File: `web/src/pages/AdminSellers.tsx`

#### 4.1 Display Status with Counters
```typescript
const getRestrictionBadge = (seller: Seller) => {
  if (seller.isPermanentlyBlacklisted) {
    return <Badge className="bg-red-600 text-white">Permanently Blacklisted</Badge>;
  }
  if (seller.tempBlacklistUntil && new Date(seller.tempBlacklistUntil) > new Date()) {
    return <Badge className="bg-red-400 text-white">Temp Blacklisted ({seller.tempBlacklistCount}/3)</Badge>;
  }
  if (seller.coolDownUntil && new Date(seller.coolDownUntil) > new Date()) {
    return <Badge className="bg-yellow-500 text-white">Cooling Down ({seller.cooldownCount}/3)</Badge>;
  }
  if (seller.reapplicationAttempts && seller.reapplicationAttempts > 0) {
    return <Badge className="bg-blue-100 text-blue-700">Attempts: {seller.reapplicationAttempts}/3</Badge>;
  }
  return null;
};
```

#### 4.2 Warn on Single-Doc Partial Rejection (New)
When the seller is already in `needs_resubmission` and only one document is selected, show a confirmation warning to prevent incomplete resubmissions.

---

## Part 5: Testing Checklist

- [ ] Rejection increments attempts
- [ ] After 3 attempts → cooldown 1 hour
- [ ] After 3 cooldowns → temp blacklist 1 day
- [ ] After 3 temp blacklists → permanent blacklist
- [ ] Approval resets all counters
- [ ] Validation blocks resubmit when docs not updated
- [ ] Admin sees all counter badges
- [ ] Seller UI shows correct state
- [ ] Draft uploads do not change live documents while in `needs_resubmission`
- [ ] Resubmit copies drafts to live docs and clears draft row
- [ ] Reapply blocked until all rejected docs have updated draft timestamps

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| DB migration | Low | Only ADD columns, no deletions |
| Breaking changes | Low | Null defaults preserve existing data |
| Logic complexity | Medium | Thorough testing required |
| Draft staging | Medium | Resubmit gate + per-document timestamps |

---

## Rollback Plan

App rollback:
- Revert draft staging logic in `web/src/pages/SellerStoreProfile.tsx` so uploads write directly to `seller_verification_documents`.
- Remove the admin confirmation warning in `web/src/pages/AdminSellers.tsx` if desired.
- Remove `seller_verification_document_drafts` from types and DB optional checks.

DB rollback:
```sql
DROP TABLE IF EXISTS seller_verification_document_drafts;

ALTER TABLE sellers 
DROP COLUMN IF EXISTS reapplication_attempts,
DROP COLUMN IF EXISTS cooldown_count,
DROP COLUMN IF EXISTS temp_blacklist_count,
DROP COLUMN IF EXISTS blacklisted_at,
DROP COLUMN IF EXISTS cool_down_until,
DROP COLUMN IF EXISTS temp_blacklist_until,
DROP COLUMN IF EXISTS is_permanently_blacklisted;

ALTER TABLE sellers 
DROP CONSTRAINT IF EXISTS sellers_approval_status_check,
ADD CONSTRAINT sellers_approval_status_check 
CHECK (approval_status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text, 'needs_resubmission'::text]));
```

---

## Part 2: Backend/Store Changes

### File: `web/src/stores/adminStore.ts`

#### 2.1 Update Seller Interface
```typescript
// Add to Seller interface (around line 56)
export interface Seller {
  // ... existing fields
  reapplicationAttempts?: number;
  blacklistedAt?: Date;
  coolDownUntil?: Date;
}
```

#### 2.2 Add Configuration Constants
```typescript
// Add constants
const MAX_REAPPLICATION_ATTEMPTS = 3;  // N attempts before blacklist
const COOLDOWN_DAYS = 7;              // Days to wait after each rejection
```

#### 2.3 Update rejectSeller Function
When admin rejects a seller:
```typescript
// In rejectSeller function, increment attempts and set cooldown/blacklist
const newAttempts = (seller.reapplicationAttempts || 0) + 1;
const isBlacklisted = newAttempts >= MAX_REAPPLICATION_ATTEMPTS;

await supabase.from('sellers').update({
  reapplication_attempts: newAttempts,
  blacklisted_at: isBlacklisted ? new Date().toISOString() : null,
  cool_down_until: isBlacklisted ? null : new Date(Date.now() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString()
}).eq('id', sellerId);
```

#### 2.4 Update partiallyRejectSeller Function
Same logic for partial rejections.

#### 2.5 Update approveSeller Function
On approval, reset counters:
```typescript
await supabase.from('sellers').update({
  reapplication_attempts: 0,
  blacklisted_at: null,
  cool_down_until: null
}).eq('id', sellerId);
```

---

## Part 3: Seller-Side Validation Fix (FINALIZED)

### File: `web/src/pages/SellerStoreProfile.tsx`

The implementation uses **draft staging** with per-document timestamp tracking for partial rejection resubmission.

#### 3.1 State Management (around line 250-275)

```typescript
const [reapplyLoading, setReapplyLoading] = useState(false);
const [latestRejection, setLatestRejection] = useState<{
  rejectionType: "full" | "partial";
  description?: string;
  createdAt: string;
  items: { documentField: string; reason?: string; createdAt?: string }[];
} | null>(null);
const [documentsUpdatedAt, setDocumentsUpdatedAt] = useState<string | null>(null);
const [refreshKey, setRefreshKey] = useState(0);

// Draft staging state for partial rejection resubmission
const [draftDocuments, setDraftDocuments] = useState<{
  businessPermitUrl?: string;
  validIdUrl?: string;
  proofOfAddressUrl?: string;
  dtiRegistrationUrl?: string;
  taxIdUrl?: string;
}>({});
const [draftDocumentFieldUpdatedAt, setDraftDocumentFieldUpdatedAt] = useState<Record<string, string | null>>({
  business_permit_url: null,
  valid_id_url: null,
  proof_of_address_url: null,
  dti_registration_url: null,
  tax_id_url: null,
});
```

#### 3.2 Draft Mode Detection (around line 338-346)

```typescript
// Determine if we should use draft documents (during partial rejection resubmission)
const useDraftDocuments =
  approvalStatus === "needs_resubmission" ||
  (approvalStatus === "rejected" && latestRejection?.rejectionType === "partial");

// Compute displayed documents (drafts during resubmission, live otherwise)
const displayedDocuments = useDraftDocuments
  ? { ...documents, ...draftDocuments }
  : documents;
```

#### 3.3 Missing Items Check - Partial Rejection Aware (around line 348-406)

```typescript
// Compute list of missing required items (fields + documents)
const getMissingItems = () => {
  const missing: string[] = [];

  // Basic + contact fields
  if (isEmptyField(seller?.ownerName)) missing.push("Owner Name");
  if (isEmptyField(seller?.email)) missing.push("Email Address");
  if (isEmptyField(seller?.phone)) missing.push("Phone Number");
  if (isEmptyField(seller?.storeName)) missing.push("Store Name");

  // Business info fields
  if (isEmptyField(seller?.businessName)) missing.push("Business Name");
  if (isEmptyField(seller?.businessType)) missing.push("Business Type");
  if (isEmptyField(seller?.businessRegistrationNumber))
    missing.push("Business Registration Number");
  if (isEmptyField(seller?.taxIdNumber)) missing.push("Tax ID Number (TIN)");
  if (
    isEmptyField(seller?.businessAddress) ||
    isEmptyField(seller?.city) ||
    isEmptyField(seller?.province) ||
    isEmptyField(seller?.postalCode)
  ) {
    missing.push("Business Address (address, city, province, postal code)");
  }

  // Documents - during partial rejection, ONLY check rejected documents
  // During normal flow, check all documents
  if (useDraftDocuments && latestRejection?.rejectionType === "partial") {
    // Only require the rejected documents to be updated
    const rejectedDocFields = latestRejection.items.map(item => item.documentField);
    
    if (rejectedDocFields.includes("business_permit_url") && !displayedDocuments.businessPermitUrl) 
      missing.push("Business Permit");
    if (rejectedDocFields.includes("valid_id_url") && !displayedDocuments.validIdUrl) 
      missing.push("Government-Issued ID");
    if (rejectedDocFields.includes("proof_of_address_url") && !displayedDocuments.proofOfAddressUrl) 
      missing.push("Proof of Address");
    if (rejectedDocFields.includes("dti_registration_url") && !displayedDocuments.dtiRegistrationUrl) 
      missing.push("DTI/SEC Registration");
    if (rejectedDocFields.includes("tax_id_url") && !displayedDocuments.taxIdUrl) 
      missing.push("BIR Tax ID (TIN)");
  } else {
    // Normal flow - check all documents
    if (!displayedDocuments.businessPermitUrl) missing.push("Business Permit");
    if (!displayedDocuments.validIdUrl) missing.push("Government-Issued ID");
    if (!displayedDocuments.proofOfAddressUrl) missing.push("Proof of Address");
    if (!displayedDocuments.dtiRegistrationUrl) missing.push("DTI/SEC Registration");
    if (!displayedDocuments.taxIdUrl) missing.push("BIR Tax ID (TIN)");
  }

  return missing;
};
```

#### 3.4 Rejected Documents Check (around line 410-423)

```typescript
// Check if there are rejected documents that haven't been re-uploaded
const getRejectedDocuments = () => {
  if (!latestRejection || latestRejection.rejectionType !== "partial") {
    return [];
  }
  // Check each rejected item against draft uploads
  return latestRejection.items.filter((item) => {
    const draftUpdatedAt = draftDocumentFieldUpdatedAt[item.documentField];
    // If no draft upload timestamp, document hasn't been updated
    if (!draftUpdatedAt || !item.createdAt) return true;
    // Check if draft is newer than rejection
    return new Date(draftUpdatedAt).getTime() <= new Date(item.createdAt).getTime();
  });
};

// Check if all rejected documents have been updated
const hasUpdatedRejectedDocs = () => {
  const rejectedDocs = getRejectedDocuments();
  return rejectedDocs.length === 0;
};
```

#### 3.5 Document Rejection Reason with Draft Check (around line 834-871)

```typescript
const getDocumentRejectionReason = (columnName: string) => {
  if (latestRejection?.rejectionType !== "partial") return undefined;

  const item = latestRejection.items.find(
    (entry) => entry.documentField === columnName,
  );

  if (!item) return undefined;

  // During partial rejection, check draft upload timestamp
  if (useDraftDocuments) {
    const draftUpdatedAt = draftDocumentFieldUpdatedAt[columnName];
    if (draftUpdatedAt && item.createdAt) {
      const draftTime = new Date(draftUpdatedAt).getTime();
      const rejectionTime = new Date(item.createdAt).getTime();
      if (Number.isFinite(draftTime) && Number.isFinite(rejectionTime) && draftTime > rejectionTime) {
        // Document has been re-uploaded, no longer show rejection
        return undefined;
      }
    }
  } else {
    // Normal flow - check live document timestamp
    if (documentsUpdatedAt && item.createdAt) {
      const docUpdatedAtValue = new Date(documentsUpdatedAt).getTime();
      const itemCreatedAtValue = new Date(item.createdAt).getTime();

      if (
        Number.isFinite(docUpdatedAtValue) &&
        Number.isFinite(itemCreatedAtValue) &&
        docUpdatedAtValue > itemCreatedAtValue
      ) {
        return undefined;
      }
    }
  }

  return item.reason || latestRejection.description;
};
```

#### 3.6 Document Upload Handler with Draft Staging (around line 616-764)

```typescript
// Handle document upload - saves to drafts during partial rejection
const handleDocumentUpload = async (
  file: File,
  docKey: string,
  columnName: string,
) => {
  const sellerId = getSellerId();
  if (!sellerId) return;

  // Validate file type and size
  const validation = validateDocumentFile(file);
  if (!validation.valid) {
    toast({
      variant: "destructive",
      title: "Invalid File",
      description: validation.error,
    });
    return;
  }

  setUploadingDoc(docKey);

  try {
    // Upload to Supabase Storage
    const documentUrl = await uploadSellerDocument(file, sellerId, docKey);

    if (!documentUrl) {
      throw new Error("Upload failed");
    }

    const uploadTimestamp = new Date().toISOString();

    // During partial rejection, save to draft table instead of live table
    if (useDraftDocuments) {
      // Save to draft staging table
      const { data: existingDraft } = await supabase
        .from("seller_verification_document_drafts")
        .select("seller_id")
        .eq("seller_id", sellerId)
        .maybeSingle();

      const draftUpdatedAtColumn = {
        business_permit_url: "business_permit_updated_at",
        valid_id_url: "valid_id_updated_at",
        proof_of_address_url: "proof_of_address_updated_at",
        dti_registration_url: "dti_registration_updated_at",
        tax_id_url: "tax_id_updated_at",
      }[columnName];

      const draftUpdateData: Record<string, string> = {
        [columnName]: documentUrl,
        updated_at: uploadTimestamp,
        ...(draftUpdatedAtColumn && { [draftUpdatedAtColumn]: uploadTimestamp }),
      };

      let error;
      if (existingDraft) {
        const result = await supabase
          .from("seller_verification_document_drafts")
          .update(draftUpdateData)
          .eq("seller_id", sellerId);
        error = result.error;
      } else {
        const result = await supabase
          .from("seller_verification_document_drafts")
          .insert({
            seller_id: sellerId,
            ...draftUpdateData,
          });
        error = result.error;
      }

      if (error) throw error;

      // Update local draft state
      setDraftDocuments((prev) => ({
        ...prev,
        [docKey]: documentUrl,
      }));
      if (draftUpdatedAtColumn) {
        setDraftDocumentFieldUpdatedAt((prev) => ({
          ...prev,
          [columnName]: uploadTimestamp,
        }));
      }

      toast({
        title: "Document Updated",
        description: "Document saved as draft. Click 'Resubmit Application' when all documents are updated.",
      });
    } else {
      // Normal upload - save to live documents table
      const { data: existingDoc } = await supabase
        .from("seller_verification_documents")
        .select("seller_id")
        .eq("seller_id", sellerId)
        .maybeSingle();

      const updateData: Record<string, string> = {
        [columnName]: documentUrl,
        updated_at: uploadTimestamp,
      };

      let error;
      if (existingDoc) {
        const result = await supabase
          .from("seller_verification_documents")
          .update(updateData)
          .eq("seller_id", sellerId);
        error = result.error;
      } else {
        const result = await supabase
          .from("seller_verification_documents")
          .insert({
            seller_id: sellerId,
            ...updateData,
          });
        error = result.error;
      }

      if (error) throw error;

      // Update local live documents state
      setDocuments((prev) => ({
        ...prev,
        [docKey]: documentUrl,
      }));
      setDocumentsUpdatedAt(uploadTimestamp);
      updateSellerDetails({ [docKey]: documentUrl });

      toast({
        title: "Document Uploaded",
        description: "Your file has been uploaded and marked for review.",
      });
    }

    // Refresh data to ensure UI is in sync
    setRefreshKey((prev) => prev + 1);
  } catch (error) {
    console.error("Error uploading document:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to upload document. Please try again.";
    toast({
      variant: "destructive",
      title: "Upload Failed",
      description: errorMessage,
    });
  } finally {
    setUploadingDoc(null);
  }
};
```

#### 3.7 Handle Reapply with Draft Copy (around line 370-484)

```typescript
// Handler: reapply for verification (set approval_status back to pending)
const handleReapply = async () => {
  const sellerId = getSellerId();
  if (!sellerId) {
    toast({ variant: "destructive", title: "Error", description: "Unable to reapply: seller ID missing." });
    return;
  }

  const missing = getMissingItems();
  if (missing.length > 0) {
    toast({
      variant: "destructive",
      title: "Incomplete Profile",
      description: `Please complete missing items before reapplying.`,
    });
    return;
  }

  // Check if partially rejected documents have been updated
  const rejectedDocs = getRejectedDocuments();
  if (rejectedDocs.length > 0) {
    const rejectedDocNames = rejectedDocs
      .map(d => documentFieldLabels[d.documentField] || d.documentField.replace(/_/g, ' '))
      .join(', ');
    toast({
      variant: "destructive",
      title: "Documents Need Updates",
      description: `Please re-upload the following rejected documents: ${rejectedDocNames}`,
    });
    return;
  }

  try {
    setReapplyLoading(true);
    const supabaseClient: any = supabase;

    // If we have draft documents, copy them to live documents before submitting
    if (useDraftDocuments && Object.keys(draftDocuments).length > 0) {
      // First, get or create the live document record
      const { data: existingLiveDoc } = await supabaseClient
        .from("seller_verification_documents")
        .select("seller_id")
        .eq("seller_id", sellerId)
        .maybeSingle();

      const draftToLiveData: Record<string, string> = {};
      if (draftDocuments.businessPermitUrl) draftToLiveData.business_permit_url = draftDocuments.businessPermitUrl;
      if (draftDocuments.validIdUrl) draftToLiveData.valid_id_url = draftDocuments.validIdUrl;
      if (draftDocuments.proofOfAddressUrl) draftToLiveData.proof_of_address_url = draftDocuments.proofOfAddressUrl;
      if (draftDocuments.dtiRegistrationUrl) draftToLiveData.dti_registration_url = draftDocuments.dtiRegistrationUrl;
      if (draftDocuments.taxIdUrl) draftToLiveData.tax_id_url = draftDocuments.taxIdUrl;

      if (Object.keys(draftToLiveData).length > 0) {
        draftToLiveData.updated_at = new Date().toISOString();

        if (existingLiveDoc) {
          await supabaseClient
            .from("seller_verification_documents")
            .update(draftToLiveData)
            .eq("seller_id", sellerId);
        } else {
          await supabaseClient
            .from("seller_verification_documents")
            .insert({
              seller_id: sellerId,
              ...draftToLiveData,
            });
        }
      }

      // Clear the draft documents after copying
      await supabaseClient
        .from("seller_verification_document_drafts")
        .delete()
        .eq("seller_id", sellerId);

      // Update local state
      setDocuments((prev) => ({
        ...prev,
        ...draftDocuments,
      }));
      setDraftDocuments({});
      setDraftDocumentFieldUpdatedAt({
        business_permit_url: null,
        valid_id_url: null,
        proof_of_address_url: null,
        dti_registration_url: null,
        tax_id_url: null,
      });
    }

    const { error } = await supabaseClient
      .from("sellers")
      .update({ approval_status: "pending" })
      .eq("id", sellerId);

    if (error) throw error;

    setApprovalStatus("pending");
    setLatestRejection(null);
    toast({
      title: "Reapplication Submitted",
      description: "Your profile is now pending review.",
    });
  } catch (err) {
    console.error("Failed to set approval_status to pending:", err);
    toast({
      variant: "destructive",
      title: "Submission Failed",
      description: "Failed to submit reapplication. Please try again later.",
    });
  } finally {
    setReapplyLoading(false);
  }
};
```

#### 3.8 Action Required Banner - Dynamic List (around line 1957-1977)

```typescript
{/* Document-Level Rejection Banner */}
{requiresResubmission && getRejectedDocuments().length > 0 && (
  <div className="mb-8 p-5 bg-red-50 border-2 border-red-200 rounded-xl space-y-3">
    <p className="text-base font-bold text-red-900 flex items-center gap-2">
      <AlertCircle className="h-5 w-5" />
      Action Required: Update Highlighted Documents
    </p>
    {latestRejection?.description && (
      <p className="text-sm text-red-800">{latestRejection.description}</p>
    )}
    <div className="space-y-1 mt-2 p-3 bg-white/50 rounded-lg">
      {getRejectedDocuments().map((item) => (
        <p key={item.documentField} className="text-sm text-red-900 font-medium flex items-start gap-2">
          <span className="text-red-500">•</span>
          {documentFieldLabels[item.documentField] || item.documentField}
          {item.reason ? `: ${item.reason}` : ""}
        </p>
      ))}
    </div>
  </div>
)}
```

#### 3.9 Data Fetching with Draft Support (around line 487-612)

```typescript
// Fetch documents and verification status from Supabase on mount
React.useEffect(() => {
  const fetchSellerData = async () => {
    const sellerId = getSellerId();
    if (!sellerId) return;

    try {
      // Fetch seller approval status
      const { data: sellerData, error: sellerError } = await supabase
        .from("sellers")
        .select("approval_status")
        .eq("id", sellerId)
        .single();

      if (sellerError) {
        console.error("Error fetching seller status:", sellerError);
      } else if (sellerData) {
        const normalizedStatus = (sellerData.approval_status || "pending") as
          | "pending"
          | "approved"
          | "verified"
          | "rejected"
          | "needs_resubmission";

        setApprovalStatus(normalizedStatus);
        setIsVerified(
          normalizedStatus === "verified" || normalizedStatus === "approved",
        );
      }

      // Fetch verification documents from separate table
      const { data: docData, error: docError } = await supabase
        .from("seller_verification_documents")
        .select(
          "business_permit_url, valid_id_url, proof_of_address_url, dti_registration_url, tax_id_url, updated_at",
        )
        .eq("seller_id", sellerId)
        .maybeSingle();

      if (docError && docError.code !== 'PGRST116') {
        console.error("Error fetching seller documents:", docError);
      } else if (docData) {
        setDocumentsUpdatedAt(docData.updated_at || null);
        setDocuments({
          businessPermitUrl: docData.business_permit_url || undefined,
          validIdUrl: docData.valid_id_url || undefined,
          proofOfAddressUrl: docData.proof_of_address_url || undefined,
          dtiRegistrationUrl: docData.dti_registration_url || undefined,
          taxIdUrl: docData.tax_id_url || undefined,
        });
      }

      // Fetch draft documents for resubmission staging
      const { data: draftData, error: draftError } = await supabase
        .from("seller_verification_document_drafts")
        .select(
          "business_permit_url, valid_id_url, proof_of_address_url, dti_registration_url, tax_id_url, updated_at, business_permit_updated_at, valid_id_updated_at, proof_of_address_updated_at, dti_registration_updated_at, tax_id_updated_at",
        )
        .eq("seller_id", sellerId)
        .maybeSingle();

      if (draftError && draftError.code !== "PGRST116") {
        console.error("Error fetching draft seller documents:", draftError);
      } else if (draftData) {
        setDraftDocuments({
          businessPermitUrl: draftData.business_permit_url || undefined,
          validIdUrl: draftData.valid_id_url || undefined,
          proofOfAddressUrl: draftData.proof_of_address_url || undefined,
          dtiRegistrationUrl: draftData.dti_registration_url || undefined,
          taxIdUrl: draftData.tax_id_url || undefined,
        });
        setDraftDocumentFieldUpdatedAt({
          business_permit_url: draftData.business_permit_updated_at || null,
          valid_id_url: draftData.valid_id_updated_at || null,
          proof_of_address_url: draftData.proof_of_address_updated_at || null,
          dti_registration_url: draftData.dti_registration_updated_at || null,
          tax_id_url: draftData.tax_id_updated_at || null,
        });
      } else {
        setDraftDocuments({});
        setDraftDocumentFieldUpdatedAt({
          business_permit_url: null,
          valid_id_url: null,
          proof_of_address_url: null,
          dti_registration_url: null,
          tax_id_url: null,
        });
      }

      // Fetch latest rejection details
      const { data: rejectionData, error: rejectionError } = await supabase
        .from("seller_rejections")
        .select(
          "description, rejection_type, created_at, items:seller_rejection_items(document_field, reason, created_at)",
        )
        .eq("seller_id", seller.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (rejectionError && rejectionError.code !== "PGRST116") {
        console.warn("Unable to load rejection details:", rejectionError.message);
      } else if (rejectionData) {
        setLatestRejection({
          rejectionType: (rejectionData.rejection_type || "full") as
            | "full"
            | "partial",
          description: rejectionData.description || undefined,
          createdAt: rejectionData.created_at,
          items: (rejectionData.items || []).map((item: {
            document_field: string;
            reason: string | null;
            created_at: string | null;
          }) => ({
            documentField: item.document_field,
            reason: item.reason || undefined,
            createdAt: item.created_at || undefined,
          })),
        });
      } else {
        setLatestRejection(null);
      }
    } catch (error) {
      console.error("Error fetching seller data:", error);
    }
  };

  fetchSellerData();
}, [seller?.id, refreshKey]);
```

---

## Part 4: Admin Side Updates

### File: `web/src/pages/AdminSellers.tsx`

#### 4.1 Display Attempts Count
In seller card (around seller status display):
```tsx
// Add attempt count badge
{seller.reapplicationAttempts > 0 && (
  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
    Attempts: {seller.reapplicationAttempts}/3
  </span>
)}

{seller.blacklistedAt && (
  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
    Blacklisted
  </span>
)}
```

#### 4.2 Manual Blacklist/Unblacklist Actions
Add in action buttons section:
```tsx
{seller.blacklistedAt ? (
  <Button
    variant="outline"
    size="sm"
    onClick={() => removeBlacklist(seller.id)}
  >
    Remove Blacklist
  </Button>
) : (
  <Button
    variant="outline"
    size="sm"
    onClick={() => addBlacklist(seller.id)}
  >
    Blacklist
  </Button>
)}
```

#### 4.3 Warn on Single-Doc Partial Rejection (New)
When the seller is already in `needs_resubmission` and only one document is selected, show a confirmation warning to prevent incomplete resubmissions.

---

## Part 5: Testing Checklist (FINALIZED)

### Cooldown/Blacklist System
- [ ] Rejection increments `reapplication_attempts` counter
- [ ] After 3 attempts → 1 hour cooldown period
- [ ] After 3 cooldowns → 1 day temp blacklist
- [ ] After 3 temp blacklists → permanent blacklist
- [ ] Approval resets all counters to 0

### Partial Rejection & Draft Staging
- [ ] Admin partial rejection stores rejected items in `seller_rejection_items`
- [ ] Each rejected item has `document_field`, `reason`, and `created_at`
- [ ] Seller UI shows only the latest partial rejection
- [ ] **Action Required banner shows only documents still needing updates**
- [ ] **Uploading a rejected document saves to `seller_verification_document_drafts`**
- [ ] **Per-document `*_updated_at` timestamps are set in draft table**
- [ ] **Re-uploaded document's red highlight disappears immediately**
- [ ] **Action Required banner disappears when all rejected docs are updated**
- [ ] Non-rejected documents do not need to be re-uploaded
- [ ] Resubmit button is disabled until all rejected docs are updated
- [ ] Clicking Resubmit copies drafts to `seller_verification_documents`
- [ ] Draft row is deleted after successful resubmit
- [ ] `approval_status` changes to `pending` after resubmit

### UI Refresh
- [ ] Auto-refresh triggers after document upload (no manual page refresh needed)
- [ ] UI immediately reflects updated draft state
- [ ] Can upload multiple documents without refreshing

### Admin Features
- [ ] Admin sees attempt count badges on seller cards
- [ ] Warning shown on single-doc partial rejection (if seller already in `needs_resubmission`)
- [ ] Admin sees updated documents only after seller resubmits

---

## Summary of Key Behaviors

1. **Partial Rejection Flow:**
   - Admin selects multiple documents to reject in one action
   - Seller only needs to update the rejected documents
   - Non-rejected documents remain unchanged

2. **Draft Staging:**
   - Uploads go to `seller_verification_document_drafts` table
   - Per-document timestamps track when each doc was updated
   - Live documents remain unchanged until resubmit

3. **UI Feedback:**
   - Red document highlight disappears immediately after re-upload
   - Action Required banner shows only pending documents
   - Banner disappears completely when all docs updated
   - No page refresh needed between uploads

4. **Resubmit Gate:**
   - Validation checks all rejected docs have draft timestamps newer than rejection
   - Drafts copied to live table atomically with status change
   - Prevents partial/incomplete resubmissions

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| DB migration | Low | Only ADD columns, no deletions |
| Breaking changes | Low | Null defaults preserve existing data |
| Performance | Low | Index on new columns |
| Draft staging | Medium | Resubmit gate + per-document timestamps |

---

## Rollback Plan

If issues arise:
```sql
-- Reverse migration
DROP TABLE IF EXISTS seller_verification_document_drafts;

ALTER TABLE sellers 
DROP COLUMN IF EXISTS reapplication_attempts,
DROP COLUMN IF EXISTS blacklisted_at,
DROP COLUMN IF EXISTS cool_down_until;

ALTER TABLE sellers 
DROP CONSTRAINT IF EXISTS sellers_approval_status_check,
ADD CONSTRAINT sellers_approval_status_check 
CHECK (approval_status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text, 'needs_resubmission'::text]));
```
