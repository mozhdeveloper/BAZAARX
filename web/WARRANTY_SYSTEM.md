# Warranty System Architecture & Implementation Guide

**BazaarX - Dynamic Warranty Management System**  
*Created: March 17, 2026*

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [Data Models](#data-models)
5. [API Reference](#api-reference)
6. [Service Layer](#service-layer)
7. [Frontend Integration](#frontend-integration)
8. [User Flows](#user-flows)
9. [Business Logic](#business-logic)
10. [Testing Guide](#testing-guide)

---

## Overview

The BazaarX Warranty System transforms static warranty text into a **dynamic, lifecycle-managed feature** tied to products, orders, and customer relationships. Warranties are automatically activated upon order delivery and tracked throughout their lifecycle.

### Key Features

- **Dynamic Warranty Data**: Warranties are stored as product attributes (type, duration, provider info)
- **Automatic Activation**: Warranties activate when order status changes to "Delivered"
- **Lifecycle Tracking**: Each order item tracks warranty start/end dates
- **Claim Management**: Full warranty claim workflow with status tracking
- **Multi-Type Support**: Local Manufacturer, International Manufacturer, Shop Warranty
- **Audit Trail**: Complete action logging for compliance and transparency

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Product Page │  │ Order History│  │ Warranty Claims UI   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER (Node.js)                        │
│                    /api/warranty endpoints                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ GET /warranty│  │ POST /warranty│  │ PUT /warranty       │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER (TypeScript)                  │
│                   warrantyService.ts                            │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │ Product Info   │  │ Claim Management│  │ Status Checks    │  │
│  └────────────────┘  └────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (Supabase/PostgreSQL)               │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────────┐  │
│  │ products   │  │ order_items│  │ warranty_claims          │  │
│  │ + warranty │  │ + warranty │  │ + warranty_actions_log   │  │
│  └────────────┘  └────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Migration File
**Location**: `supabase/migrations/20260317000000_add_warranty_system.sql`

### Tables Created

#### 1. `warranty_claims`
Tracks individual warranty claims with full lifecycle management.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| order_item_id | UUID | FK to order_items |
| buyer_id | UUID | FK to buyers |
| seller_id | UUID | FK to sellers |
| claim_number | TEXT | Auto-generated unique claim number (WRN-YYYYMMDD-XXXXX) |
| reason | TEXT | Claim reason |
| description | TEXT | Detailed description |
| claim_type | ENUM | repair, replacement, refund, technical_support |
| evidence_urls | TEXT[] | Array of image/document URLs |
| diagnostic_report_url | TEXT | Optional diagnostic report |
| status | ENUM | pending, under_review, approved, rejected, repair_in_progress, replacement_sent, refund_processed, resolved, cancelled |
| priority | ENUM | low, normal, high, urgent |
| resolution_type | ENUM | repair, replacement, refund, technical_support, rejected |
| resolution_description | TEXT | Resolution details |
| resolution_amount | NUMERIC | Refund amount if applicable |
| resolved_at | TIMESTAMPTZ | When claim was resolved |
| resolved_by | UUID | Admin who resolved (if applicable) |
| seller_response | TEXT | Seller's response |
| seller_response_at | TIMESTAMPTZ | When seller responded |
| admin_notes | TEXT | Internal admin notes |
| return_tracking_number | TEXT | For return shipments |
| return_shipping_carrier | TEXT | Return carrier |
| replacement_tracking_number | TEXT | For replacement shipments |
| replacement_shipping_carrier | TEXT | Replacement carrier |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### 2. `warranty_actions_log`
Audit trail for all warranty-related actions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| warranty_claim_id | UUID | FK to warranty_claims |
| order_item_id | UUID | FK to order_items |
| action_type | ENUM | claim_created, claim_submitted, claim_approved, etc. |
| actor_id | UUID | User who performed action |
| actor_role | ENUM | buyer, seller, admin, system |
| description | TEXT | Action description |
| metadata | JSONB | Additional context |
| created_at | TIMESTAMPTZ | Timestamp |

### Modified Tables

#### `products` - New Columns

| Column | Type | Description |
|--------|------|-------------|
| has_warranty | BOOLEAN | Does product have warranty |
| warranty_type | ENUM | local_manufacturer, international_manufacturer, shop_warranty, no_warranty |
| warranty_duration_months | INTEGER | Warranty duration in months |
| warranty_policy | TEXT | Warranty terms and conditions |
| warranty_provider_name | TEXT | Provider name (manufacturer/shop) |
| warranty_provider_contact | TEXT | Provider phone number |
| warranty_provider_email | TEXT | Provider email |
| warranty_terms_url | TEXT | URL to detailed terms |

#### `order_items` - New Columns

| Column | Type | Description |
|--------|------|-------------|
| warranty_start_date | TIMESTAMPTZ | When warranty begins (delivery date) |
| warranty_expiration_date | TIMESTAMPTZ | When warranty expires |
| warranty_type | ENUM | Copied from product at purchase |
| warranty_duration_months | INTEGER | Copied from product at purchase |
| warranty_provider_name | TEXT | Provider info at time of purchase |
| warranty_provider_contact | TEXT | Contact info at time of purchase |
| warranty_provider_email | TEXT | Email at time of purchase |
| warranty_terms_url | TEXT | Terms URL at time of purchase |
| warranty_claimed | BOOLEAN | Has a claim been filed |
| warranty_claimed_at | TIMESTAMPTZ | When claim was filed |
| warranty_claim_reason | TEXT | Reason for claim |
| warranty_claim_status | ENUM | Status of claim |
| warranty_claim_notes | TEXT | Additional notes |

---

## Data Models

### TypeScript Types

**Location**: `src/types/database.types.ts`

```typescript
// Warranty Types
export type WarrantyType = 
  | 'local_manufacturer'
  | 'international_manufacturer'
  | 'shop_warranty'
  | 'no_warranty';

export type WarrantyClaimStatus = 
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'repair_in_progress'
  | 'replacement_sent'
  | 'refund_processed'
  | 'resolved'
  | 'cancelled';

export type WarrantyClaimType = 
  | 'repair'
  | 'replacement'
  | 'refund'
  | 'technical_support';

// Warranty Claim Interface
export interface WarrantyClaim {
  id: string;
  order_item_id: string;
  buyer_id: string;
  seller_id: string;
  claim_number: string;
  reason: string;
  description: string | null;
  claim_type: WarrantyClaimType;
  evidence_urls: string[] | null;
  status: WarrantyClaimStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  resolution_type: WarrantyResolutionType | null;
  resolution_amount: number | null;
  resolved_at: string | null;
  seller_response: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}
```

---

## API Reference

### Base Endpoint
```
/api/warranty
```

### GET Requests

#### 1. Get Product Warranty Information
```http
GET /api/warranty?endpoint=product&productId={productId}
```

**Response:**
```json
{
  "hasWarranty": true,
  "warrantyType": "local_manufacturer",
  "warrantyDurationMonths": 12,
  "warrantyProviderName": "TechCorp Philippines",
  "warrantyProviderContact": "+63-2-8123-4567",
  "warrantyProviderEmail": "support@techcorp.ph",
  "warrantyTermsUrl": "https://example.com/warranty-terms",
  "warrantyPolicy": "1 year manufacturer warranty covering defects..."
}
```

#### 2. Get Order Item Warranty Status
```http
GET /api/warranty?endpoint=order-item&orderItemId={orderItemId}
```

**Response:**
```json
{
  "isActive": true,
  "isExpired": false,
  "startDate": "2026-02-15T08:00:00Z",
  "expirationDate": "2027-02-15T08:00:00Z",
  "daysRemaining": 340,
  "warrantyType": "local_manufacturer",
  "canClaim": true
}
```

#### 3. Get Warranty Claims
```http
GET /api/warranty?endpoint=claims&buyerId={buyerId}&status=pending&page=1&limit=20
```

**Query Parameters:**
- `buyerId` - Filter by buyer (optional)
- `sellerId` - Filter by seller (optional)
- `status` - Filter by status (optional)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Response:**
```json
{
  "claims": [...],
  "total": 45
}
```

#### 4. Get Expiring Warranties
```http
GET /api/warranty?endpoint=expiring&buyerId={buyerId}&daysThreshold=30
```

**Response:**
```json
{
  "orderItems": [
    {
      "orderItemId": "uuid",
      "productName": "Wireless Headphones",
      "expirationDate": "2026-04-10T08:00:00Z",
      "daysRemaining": 24
    }
  ]
}
```

### POST Requests

#### 1. Create Warranty Claim
```http
POST /api/warranty?action=create-claim
```

**Body:**
```json
{
  "orderItemId": "uuid",
  "reason": "Product stopped working",
  "description": "The device won't turn on after 2 months of use",
  "claimType": "repair",
  "evidenceUrls": ["https://storage.../image1.jpg"],
  "priority": "normal",
  "buyerId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "claim": { ... }
}
```

#### 2. Update Warranty Claim
```http
POST /api/warranty?action=update-claim
```

**Body:**
```json
{
  "claimId": "uuid",
  "updaterId": "uuid",
  "updaterRole": "seller",
  "status": "approved",
  "sellerResponse": "We will process your repair request",
  "resolutionType": "repair"
}
```

#### 3. Cancel Warranty Claim
```http
POST /api/warranty?action=cancel-claim
```

**Body:**
```json
{
  "claimId": "uuid",
  "buyerId": "uuid"
}
```

#### 4. Log Warranty Action
```http
POST /api/warranty?action=log-action
```

**Body:**
```json
{
  "warrantyClaimId": "uuid",
  "actionType": "claim_approved",
  "actorId": "uuid",
  "actorRole": "seller",
  "description": "Claim approved for repair",
  "metadata": { "approvedBy": "John Doe" }
}
```

### PUT Requests

#### Update Product Warranty Information
```http
PUT /api/warranty
```

**Body:**
```json
{
  "productId": "uuid",
  "updaterId": "uuid",
  "updaterRole": "admin",
  "warrantyData": {
    "hasWarranty": true,
    "warrantyType": "local_manufacturer",
    "warrantyDurationMonths": 24,
    "warrantyProviderName": "New Provider Inc.",
    "warrantyProviderContact": "+63-2-8765-4321",
    "warrantyProviderEmail": "support@newprovider.com",
    "warrantyTermsUrl": "https://example.com/new-terms",
    "warrantyPolicy": "Updated warranty policy..."
  }
}
```

---

## Service Layer

**Location**: `src/services/warrantyService.ts`

### Main Functions

#### Product Warranty Information

```typescript
// Get warranty for single product
const warranty = await warrantyService.getProductWarranty(productId);

// Get warranties for multiple products
const warrantyMap = await warrantyService.getProductsWarranty([
  productId1, 
  productId2
]);
```

#### Order Item Warranty Status

```typescript
// Check single item
const status = await warrantyService.getOrderItemWarrantyStatus(orderItemId);

if (status.canClaim) {
  console.log(`Warranty active, ${status.daysRemaining} days remaining`);
}

// Check multiple items
const statusMap = await warrantyService.getOrderItemsWarrantyStatus([
  orderItemId1, 
  orderItemId2
]);
```

#### Create Warranty Claim

```typescript
const result = await warrantyService.createWarrantyClaim({
  orderItemId: 'uuid',
  reason: 'Device malfunction',
  description: 'Detailed description...',
  claimType: 'repair',
  evidenceUrls: ['url1', 'url2'],
  priority: 'normal'
}, buyerId);

if (result.success) {
  console.log('Claim created:', result.claim);
} else {
  console.error('Error:', result.error);
}
```

#### Update Warranty Claim (Seller/Admin)

```typescript
const result = await warrantyService.updateWarrantyClaim({
  claimId: 'uuid',
  status: 'approved',
  sellerResponse: 'Your claim has been approved',
  resolutionType: 'repair'
}, sellerId, 'seller');
```

#### Get Warranty Claims

```typescript
// Get buyer's claims
const { claims, total } = await warrantyService.getWarrantyClaims({
  buyerId: 'uuid',
  status: 'pending',
  page: 1,
  limit: 20
});

// Get seller's claims
const { claims, total } = await warrantyService.getWarrantyClaims({
  sellerId: 'uuid'
});
```

#### Analytics

```typescript
// Get seller warranty statistics
const stats = await warrantyService.getSellerWarrantyStats(sellerId);

console.log(`
  Total Claims: ${stats.totalClaims}
  Pending: ${stats.pendingClaims}
  Approved: ${stats.approvedClaims}
  Avg Resolution: ${stats.avgResolutionDays} days
`);
```

---

## Frontend Integration

### React Component Examples

#### Display Warranty Badge on Product Page

```tsx
import { useEffect, useState } from 'react';
import { warrantyService } from '@/services/warrantyService';

interface WarrantyBadgeProps {
  productId: string;
}

export function WarrantyBadge({ productId }: WarrantyBadgeProps) {
  const [warranty, setWarranty] = useState<any>(null);

  useEffect(() => {
    warrantyService.getProductWarranty(productId).then(setWarranty);
  }, [productId]);

  if (!warranty?.hasWarranty) return null;

  const warrantyLabels = {
    local_manufacturer: 'Local Manufacturer',
    international_manufacturer: 'International',
    shop_warranty: 'Shop Warranty',
  };

  return (
    <div className="warranty-badge">
      <Shield className="w-4 h-4 text-green-600" />
      <span>
        {warranty.warrantyDurationMonths} Months{' '}
        {warrantyLabels[warranty.warrantyType as keyof typeof warrantyLabels]}{' '}
        Warranty
      </span>
    </div>
  );
}
```

#### Order Item Warranty Status

```tsx
import { useEffect, useState } from 'react';
import { warrantyService } from '@/services/warrantyService';

interface WarrantyStatusCardProps {
  orderItemId: string;
}

export function WarrantyStatusCard({ orderItemId }: WarrantyStatusCardProps) {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    warrantyService.getOrderItemWarrantyStatus(orderItemId).then(setStatus);
  }, [orderItemId]);

  if (!status || !status.warrantyType) return null;

  return (
    <div className={`warranty-status ${status.isActive ? 'active' : 'expired'}`}>
      {status.isActive ? (
        <>
          <CheckCircle className="text-green-500" />
          <span>Active Warranty</span>
          <span className="text-sm text-gray-500">
            {status.daysRemaining} days remaining
          </span>
        </>
      ) : (
        <>
          <XCircle className="text-red-500" />
          <span>Warranty Expired</span>
          <span className="text-sm text-gray-500">
            Expired on {new Date(status.expirationDate).toLocaleDateString()}
          </span>
        </>
      )}
    </div>
  );
}
```

#### File Warranty Claim Form

```tsx
import { useState } from 'react';
import { warrantyService } from '@/services/warrantyService';

interface FileClaimFormProps {
  orderItemId: string;
  onSuccess: () => void;
}

export function FileClaimForm({ orderItemId, onSuccess }: FileClaimFormProps) {
  const [formData, setFormData] = useState({
    reason: '',
    description: '',
    claimType: 'repair' as any,
    priority: 'normal' as any,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const buyerId = 'current-user-id'; // Get from auth context

    const result = await warrantyService.createWarrantyClaim(
      {
        orderItemId,
        reason: formData.reason,
        description: formData.description,
        claimType: formData.claimType,
        priority: formData.priority,
      },
      buyerId
    );

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'Failed to file claim');
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <select
        value={formData.claimType}
        onChange={(e) => setFormData({ ...formData, claimType: e.target.value })}
      >
        <option value="repair">Repair</option>
        <option value="replacement">Replacement</option>
        <option value="refund">Refund</option>
        <option value="technical_support">Technical Support</option>
      </select>

      <input
        type="text"
        placeholder="Reason"
        value={formData.reason}
        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
        required
      />

      <textarea
        placeholder="Description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
      />

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'File Claim'}
      </button>

      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

---

## User Flows

### 1. Product Purchase Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Buyer     │     │ Product Page │     │   Checkout  │     │ Order Placed │
│  Browses    │────▶│  Shows       │────▶│  & Payment  │────▶│              │
│  Products   │     │  Warranty    │     │             │     │              │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
                                                                   │
                                                                   ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  Warranty   │     │   Delivered  │     │   Order     │     │   Seller     │
│  Activated  │◀────│   Status     │◀────│  Shipped    │◀────│  Processes   │
│  (Auto)     │     │   Update     │     │             │     │              │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
```

### 2. Warranty Claim Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Buyer     │     │   Submit     │     │   Seller    │     │   Seller     │
│  Files      │────▶│   Claim      │────▶│  Reviews    │────▶│  Responds    │
│  Claim      │     │  (Pending)   │     │  Claim      │     │              │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
                                                                   │
                          ┌────────────────────────────────────────┘
                          ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Buyer     │     │  Resolution  │     │   Admin     │     │   Claim      │
│  Receives   │◀────│  (Repair/    │◀────│  Escalation │◀────│  Approved/   │
│  Resolution │     │  Replace/    │     │  (Optional) │     │  Rejected    │
│             │     │  Refund)     │     │             │     │              │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
```

### 3. Warranty Expiration Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  Warranty   │     │  30 Days     │     │   7 Days    │     │   Warranty   │
│  Active     │────▶│  Before      │────▶│  Before     │────▶│   Expired    │
│             │     │  Expiration  │     │  Expiration │     │              │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
                           │                     │
                           ▼                     ▼
                    ┌─────────────┐       ┌─────────────┐
                    │  Notification│      │  Reminder   │
                    │  (Optional)  │      │  (Optional) │
                    └─────────────┘       └─────────────┘
```

---

## Business Logic

### Warranty Activation

Warranties are **automatically activated** when:
1. Order shipment status changes to `delivered` or `received`
2. Database trigger `trg_activate_warranty_on_delivery` fires
3. `warranty_start_date` = order delivery date
4. `warranty_expiration_date` = delivery date + warranty duration

```sql
-- Automatic calculation
warranty_expiration_date = delivered_at + (warranty_duration_months || ' months')::INTERVAL
```

### Warranty Claim Eligibility

A warranty claim can be filed if:
- ✅ Warranty is active (current date >= start date)
- ✅ Warranty is not expired (current date < expiration date)
- ✅ No previous claim has been filed for this item
- ✅ Order is completed/delivered

### Claim Number Generation

Claim numbers are auto-generated in format:
```
WRN-YYYYMMDD-XXXXX
```
Example: `WRN-20260317-00123`

### Claim Status Workflow

```
pending → under_review → approved → repair_in_progress → replacement_sent → resolved
                      ↘ rejected ↗
                      ↘ cancelled ↗
```

---

## Testing Guide

### Manual Testing Checklist

#### Database Migration
- [ ] Run migration: Apply `20260317000000_add_warranty_system.sql`
- [ ] Verify tables created: `warranty_claims`, `warranty_actions_log`
- [ ] Verify columns added to `products` and `order_items`
- [ ] Test trigger: Update order to "delivered" status
- [ ] Verify warranty dates calculated correctly

#### API Endpoints
- [ ] GET `/api/warranty?endpoint=product&productId=xxx` - Returns warranty info
- [ ] GET `/api/warranty?endpoint=order-item&orderItemId=xxx` - Returns status
- [ ] POST `/api/warranty?action=create-claim` - Creates claim successfully
- [ ] POST `/api/warranty?action=update-claim` - Updates claim (seller/admin)
- [ ] GET `/api/warranty?endpoint=claims&buyerId=xxx` - Returns claims list
- [ ] PUT `/api/warranty` - Updates product warranty (admin)

#### Service Layer
- [ ] `getProductWarranty()` - Returns correct warranty data
- [ ] `getOrderItemWarrantyStatus()` - Calculates days remaining correctly
- [ ] `createWarrantyClaim()` - Creates claim and logs action
- [ ] `updateWarrantyClaim()` - Updates and triggers status change
- [ ] `getSellerWarrantyStats()` - Returns accurate statistics

#### Frontend Integration
- [ ] Product page displays warranty badge
- [ ] Order history shows warranty status
- [ ] "File Claim" button visible for active warranties
- [ ] Claim form submits successfully
- [ ] Claim status updates in real-time

### Example Test Cases

#### Test Case 1: Warranty Activation on Delivery

```typescript
// 1. Create an order with a warranty product
const order = await createTestOrder({
  items: [{ productId: productWithWarranty.id }]
});

// 2. Update order status to delivered
await supabase
  .from('orders')
  .update({ shipment_status: 'delivered', completed_at: new Date() })
  .eq('id', order.id);

// 3. Verify warranty activated
const orderItem = await supabase
  .from('order_items')
  .select('warranty_start_date, warranty_expiration_date')
  .eq('order_id', order.id)
  .single();

expect(orderItem.warranty_start_date).toBeDefined();
expect(orderItem.warranty_expiration_date).toBeDefined();

// 4. Verify expiration is correct (e.g., 12 months)
const startDate = new Date(orderItem.warranty_start_date);
const endDate = new Date(orderItem.warranty_expiration_date);
const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                   (endDate.getMonth() - startDate.getMonth());
expect(monthsDiff).toBe(12);
```

#### Test Case 2: Create Warranty Claim

```typescript
// 1. Get active warranty order item
const status = await warrantyService.getOrderItemWarrantyStatus(orderItemId);
expect(status.canClaim).toBe(true);

// 2. Create claim
const result = await warrantyService.createWarrantyClaim({
  orderItemId,
  reason: 'Device malfunction',
  claimType: 'repair',
}, buyerId);

expect(result.success).toBe(true);
expect(result.claim).toBeDefined();
expect(result.claim.claim_number).toMatch(/WRN-\d{8}-\d{5}/);

// 3. Verify order item updated
const orderItem = await supabase
  .from('order_items')
  .select('warranty_claimed, warranty_claim_status')
  .eq('id', orderItemId)
  .single();

expect(orderItem.warranty_claimed).toBe(true);
expect(orderItem.warranty_claim_status).toBe('pending');
```

#### Test Case 3: Expired Warranty Cannot Claim

```typescript
// 1. Create order item with expired warranty
const expiredDate = new Date();
expiredDate.setMonth(expiredDate.getMonth() - 13); // 13 months ago

await supabase
  .from('order_items')
  .update({
    warranty_start_date: expiredDate.toISOString(),
    warranty_expiration_date: new Date(expiredDate.setMonth(12)).toISOString()
  })
  .eq('id', orderItemId);

// 2. Try to create claim
const result = await warrantyService.createWarrantyClaim({
  orderItemId,
  reason: 'Device broken',
  claimType: 'repair',
}, buyerId);

expect(result.success).toBe(false);
expect(result.error).toBe('Warranty has expired');
```

---

## Next Steps

### Phase 1: Core Implementation ✅
- [x] Database schema migration
- [x] TypeScript type definitions
- [x] Service layer implementation
- [x] API endpoints

### Phase 2: Frontend Integration
- [ ] Product page warranty badge component
- [ ] Order history warranty status display
- [ ] Warranty claim filing form
- [ ] Claim status tracking page

### Phase 3: Notifications
- [ ] Email notifications for claim status changes
- [ ] Push notifications for warranty expiration reminders
- [ ] SMS notifications for urgent claims

### Phase 4: Analytics & Reporting
- [ ] Seller warranty dashboard
- [ ] Claim resolution time tracking
- [ ] Warranty claim rate analytics
- [ ] Product quality insights

---

## Support

For questions or issues regarding the warranty system:
- **Documentation**: This file
- **Service Layer**: `src/services/warrantyService.ts`
- **API**: `api/warranty.ts`
- **Database**: `supabase/migrations/20260317000000_add_warranty_system.sql`
