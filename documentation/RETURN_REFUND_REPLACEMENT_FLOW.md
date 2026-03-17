# BAZAAR — Return, Refund & Replacement Flow

> **Standard**: Aligned with Lazada PH return/refund policies and Philippine consumer protection rules (RA 7394).  
> **Last Updated**: 2026-03-14

---

## Table of Contents

1. [Overview](#overview)
2. [Return Options (Buyer)](#return-options-buyer)
3. [Resolution Paths](#resolution-paths)
4. [Complete Flowchart](#complete-flowchart)
5. [Buyer Flow](#buyer-flow)
6. [Seller Flow](#seller-flow)
7. [Admin Flow](#admin-flow)
8. [Status Lifecycle](#status-lifecycle)
9. [Database Schema](#database-schema)
10. [Business Rules](#business-rules)
11. [File Map](#file-map)

---

## Overview

BAZAAR offers a **2-option return system** aligned with Philippine e-commerce standards:

| Option | What Buyer Gets | Money Movement |
|--------|----------------|----------------|
| **Return & Refund** | Money back to original payment method | Seller → Buyer refund |
| **Return & Replace** | Brand-new replacement item shipped | No money movement — seller ships new item |

**Key Principles:**
- 7-day return window from delivery
- 48-hour seller response deadline (auto-escalates to admin)
- Evidence required for damage/defect claims
- Seller's balance is held during active refund disputes
- Replacement returns have no refund amount — seller ships a new item instead

---

## Return Options (Buyer)

### Option 1: Return & Refund
- Buyer returns item → receives full refund
- Refund amount = item price × quantity
- Seller's balance is held until resolved
- Counter-offer available (seller can propose partial refund)

### Option 2: Return & Replace
- Buyer returns item → seller ships a new replacement
- No refund amount displayed
- No counter-offer (irrelevant for replacement)
- Order goes back to "processing" for re-shipment

---

## Resolution Paths

The system automatically determines the resolution path based on the return:

| Path | Criteria | Timeline |
|------|----------|----------|
| **Instant** | Amount < ₱500 + reason is `wrong_item`, `not_as_described`, or `missing_parts` + evidence uploaded | Auto-approved in 2 hours |
| **Seller Review** | Default for most returns | 48 hours (auto-escalates if no action) |
| **Return Required** | Amount ≥ ₱2,000 | 7 days for buyer to ship item back |

> **Note:** Replacement requests always go through **Seller Review** (never instant), since the seller must confirm they can ship a new item.

---

## Complete Flowchart

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BAZAAR RETURN/REFUND FLOW                           │
│                    (Lazada PH Standard — 2 Options)                        │
└─────────────────────────────────────────────────────────────────────────────┘

BUYER SUBMITS RETURN REQUEST
│
├── Step 1: Select Reason
│   ├── Damaged in transit
│   ├── Wrong item received
│   ├── Not as described
│   ├── Defective/malfunction
│   ├── Missing parts/accessories
│   ├── Changed my mind
│   ├── Duplicate order
│   └── Other
│
├── Step 2: Preferred Solution
│   ├── 🔶 Return & Refund (money back)
│   └── 🔵 Return & Replace (new item shipped)
│
├── Step 3: Select Items (per-item return)
│
├── Step 4: Upload Evidence (required for damage/defect reasons)
│
└── Step 5: Review & Submit
    │
    ▼
┌──────────────────────────────────────┐
│  SYSTEM DETERMINES RESOLUTION PATH   │
├──────────────────────────────────────┤
│                                      │
│  Amount < ₱500                       │
│  + qualifying reason                 │──► INSTANT PATH (auto 2h)
│  + evidence uploaded                 │    │
│  + NOT replacement                   │    ▼
│                                      │    Auto-approved → Refund processed
│  Amount ≥ ₱2,000                     │
│  + any type                          │──► RETURN REQUIRED PATH (7 days)
│                                      │    │
│                                      │    ▼
│  Everything else                     │    Buyer must ship item back first
│  + ALL replacements                  │──► SELLER REVIEW PATH (48h)
│                                      │
└──────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        SELLER REVIEW                                 │
│                  (48-hour deadline to respond)                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  REFUND REQUEST                         REPLACEMENT REQUEST          │
│  ┌─────────────────────┐                ┌─────────────────────┐     │
│  │ ✅ Approve & Refund  │                │ ✅ Approve & Ship    │     │
│  │    → Refund processed│                │    Replacement       │     │
│  │    → payment_status  │                │    → shipment_status │     │
│  │      = "refunded"    │                │      = "processing"  │     │
│  ├─────────────────────┤                ├─────────────────────┤     │
│  │ 💰 Counter Offer    │                │ ❌ (not available)   │     │
│  │    → Reduced amount  │                │                     │     │
│  │    → Buyer accepts/  │                │                     │     │
│  │      declines        │                │                     │     │
│  ├─────────────────────┤                ├─────────────────────┤     │
│  │ 📦 Request Item Back│                │ 📦 Request Item Back│     │
│  │    → Buyer ships     │                │    → Buyer ships     │     │
│  │    → Seller confirms │                │    → Seller confirms │     │
│  │    → Then refund     │                │    → Then ships new  │     │
│  ├─────────────────────┤                ├─────────────────────┤     │
│  │ ❌ Reject           │                │ ❌ Reject           │     │
│  │    → With reason     │                │    → With reason     │     │
│  │    → Buyer can       │                │    → Buyer can       │     │
│  │      escalate        │                │      escalate        │     │
│  └─────────────────────┘                └─────────────────────┘     │
│                                                                      │
│  ⏰ NO ACTION IN 48h → AUTO-ESCALATE TO ADMIN                       │
└──────────────────────────────────────────────────────────────────────┘
    │
    ▼ (if escalated or admin override needed)
┌──────────────────────────────────────────────────────────────────────┐
│                        ADMIN RESOLUTION                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ✅ Approve (override seller decision)                               │
│     → Refund: processes refund + sets refund_date                    │
│     → Replacement: marks order for re-shipping                      │
│                                                                      │
│  ❌ Reject (deny buyer's request)                                    │
│     → With admin note explaining reasoning                           │
│                                                                      │
│  🪙 Award BazCoins (goodwill compensation)                           │
│     → Credits buyer's BazCoin wallet                                 │
│     → Amount = refund value + 10% bonus                              │
│     → Available as admin-only resolution tool                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Buyer Flow

### How to Request a Return

1. **Navigate** to "My Orders" → find the delivered order
2. **Click** "Return/Refund" button (visible within 7-day return window)
3. **Complete 5-step form:**
   - **Reason**: Select from 8 return reasons
   - **Solution**: Choose "Return & Refund" or "Return & Replace"
   - **Items**: Select which items to return (supports partial returns)
   - **Evidence**: Upload photos (required for damage/defect claims)
   - **Review**: Confirm all details and submit
4. **Track** return status in "My Returns" page

### Buyer Actions During Process

| Status | What Buyer Can Do |
|--------|------------------|
| Pending / Under Review | Wait for seller response |
| Counter Offered | **Accept** (refund at reduced amount) or **Decline** (escalate) |
| Return In Transit | Ship item back using provided label/tracking |
| Approved | Wait for refund processing or replacement shipment |
| Refunded/Replaced | Done — check payment or track new shipment |
| Rejected | Escalate to admin within 3 days |

### What Buyer Sees

- **Return & Refund**: Refund amount displayed (₱ total), status updates, refund confirmation
- **Return & Replace**: "Replacement Item" badge, no refund amount shown, shipment tracking for new item

---

## Seller Flow

### Seller Dashboard (`/seller/returns`)

Sellers see all return requests in a table with:
- Return ID, Order ID, Buyer name
- Item thumbnail and name
- **Type badge**: 🔶 Refund or 🔵 Replacement
- **Amount**: ₱ value (refund) or "—" (replacement)
- Resolution path, date, status
- Action button to view details

### Seller Actions

| Action | Available For | What It Does |
|--------|--------------|--------------|
| **Approve & Refund** | Refund requests | Processes refund, releases held balance |
| **Approve & Ship Replacement** | Replacement requests | Sets order to "processing" for new shipment |
| **Counter Offer** | Refund requests only | Proposes reduced refund amount with note |
| **Request Item Back** | Both types | Asks buyer to ship item for inspection |
| **Confirm Received & Refund** | Refund + item back | After receiving returned item, processes refund |
| **Confirm Received & Ship Replacement** | Replacement + item back | After receiving item, ships replacement |
| **Reject** | Both types | Denies request with mandatory reason |

### Seller Deadline System

- **48-hour deadline** starts when request is submitted
- Countdown timer visible in return detail dialog
- If seller takes no action → **auto-escalated to admin**
- PostgreSQL cron job checks every 15 minutes

### What Seller Sees per Type

**Refund Request:**
- Orange "Refund" badge
- ₱ amount with "Held from balance" warning
- Counter-offer option available
- Approve button: "Approve & Refund"

**Replacement Request:**
- Blue "Replacement" badge  
- No refund amount (shows "—")
- No counter-offer option
- Approve button: "Approve & Ship Replacement"

---

## Admin Flow

### Admin Dashboard (`/admin/returns`)

Admins see ALL platform return requests with:
- Stats cards: Total, Escalated, Pending, Refunded
- Full table with buyer, seller, type, amounts, dates
- Priority sorting: escalated requests shown first

### Admin Actions

| Action | Description |
|--------|-------------|
| **Approve** | Override seller — process refund or approve replacement |
| **Reject** | Deny buyer request with admin note |
| **Award BazCoins** | Goodwill compensation (refund value + 10% bonus) |

### Admin Approve Logic

- **For Refund**: Sets `refund_date`, `payment_status: "refunded"`, status history: "refund_approved"
- **For Replacement**: Sets `shipment_status: "processing"`, status history: "replacement_approved"
- **Both**: Records `resolved_by: "admin"` and `resolved_at` timestamp

---

## Status Lifecycle

```
                    ┌──────────┐
                    │ PENDING  │  (Just submitted)
                    └────┬─────┘
                         │
                    ┌────▼──────────┐
              ┌─────┤ SELLER_REVIEW │──────────────────┐
              │     └────┬──────────┘                   │
              │          │                              │
              │    ┌─────▼───────────┐           ┌─────▼──────┐
              │    │ COUNTER_OFFERED │           │  APPROVED  │
              │    │ (refund only)   │           │            │
              │    └─────┬───────────┘           └─────┬──────┘
              │          │                              │
              │     Accept / Decline              ┌─────▼──────┐
              │          │                        │  REFUNDED  │
              │          ▼                        │(or Replaced)│
              │    If decline →                   └────────────┘
              │    ESCALATED
              │
         ┌────▼──────────────┐
         │ RETURN_IN_TRANSIT │  (Buyer shipping item back)
         └────┬──────────────┘
              │
         ┌────▼──────────────┐
         │ RETURN_RECEIVED   │  (Seller confirmed receipt)
         └────┬──────────────┘
              │
         ┌────▼──────────────┐
         │ REFUNDED/REPLACED │  (Terminal state)
         └───────────────────┘

    ┌────────────┐
    │  REJECTED  │  (Seller or admin denied)
    └────────────┘

    ┌────────────┐
    │  ESCALATED │  (Admin review needed — timeout or buyer appeal)
    └────────────┘
```

### Status Definitions

| Status | DB Value | Description |
|--------|----------|-------------|
| Pending | `pending` | Just submitted, awaiting initial review |
| Under Seller Review | `seller_review` | Seller has 48h to respond |
| Counter Offered | `counter_offered` | Seller proposed reduced refund (refund type only) |
| Approved | `approved` | Seller/admin approved the return |
| Rejected | `rejected` | Return denied with reason |
| Escalated | `escalated` | Auto-escalated (48h timeout) or buyer appealed |
| Return In Transit | `return_in_transit` | Buyer shipping item back to seller |
| Return Received | `return_received` | Seller confirmed they got the item back |
| Refunded | `refunded` | Terminal — refund processed or replacement shipped |

---

## Database Schema

### Table: `refund_return_periods`

```sql
-- Core fields
id              UUID PRIMARY KEY
order_id        UUID REFERENCES orders(id)
is_returnable   BOOLEAN DEFAULT true
return_window_days INT DEFAULT 7

-- Return details
return_reason   TEXT
return_type     TEXT CHECK (return_type IN ('return_refund','refund_only','replacement'))
resolution_path TEXT CHECK (resolution_path IN ('instant','seller_review','return_required'))
description     TEXT
items_json      JSONB          -- Array of {productId, productName, quantity, price, image}
evidence_urls   TEXT[]         -- Photo evidence URLs

-- Status tracking
status          TEXT DEFAULT 'pending'
                CHECK (status IN ('pending','seller_review','counter_offered',
                'approved','rejected','escalated','return_in_transit',
                'return_received','refunded'))

-- Refund
refund_amount   NUMERIC(12,2)  -- NULL for replacements
refund_date     TIMESTAMPTZ    -- NULL for replacements

-- Seller response
seller_note         TEXT
rejected_reason     TEXT
counter_offer_amount NUMERIC(12,2)
seller_deadline     TIMESTAMPTZ  -- 48h from creation

-- Return shipping
return_label_url         TEXT
return_tracking_number   TEXT
buyer_shipped_at         TIMESTAMPTZ
return_received_at       TIMESTAMPTZ

-- Resolution
escalated_at    TIMESTAMPTZ
resolved_at     TIMESTAMPTZ
resolved_by     TEXT           -- 'seller', 'admin', 'system'

-- Timestamps
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

### Key Indexes
```sql
idx_return_seller_deadline  -- Powers 15-min auto-escalation cron
idx_return_status           -- Status filtering
idx_return_order_id         -- Order lookups
```

### Related Tables
- `orders` — `payment_status` updated on refund, `shipment_status` updated on replacement
- `order_status_history` — Audit trail of all status changes
- `bazcoin_transactions` — Admin-awarded BazCoin compensation

---

## Business Rules

### Philippine Consumer Protection (RA 7394)

| Rule | Implementation |
|------|---------------|
| Right to return defective goods | 7-day return window from delivery |
| Right to refund or replacement | 2 options: Return & Refund, Return & Replace |
| Seller must respond promptly | 48-hour deadline with auto-escalation |
| Evidence for claims | Photo upload required for damage/defect reasons |
| Fair resolution | Admin escalation as safety net |

### Lazada PH Alignment

| Feature | Lazada Standard | BAZAAR Implementation |
|---------|----------------|----------------------|
| Return window | 7-15 days | 7 days |
| Return options | Return/Refund, Return/Exchange | Return & Refund, Return & Replace |
| Evidence upload | Required for damage | Required for 5 damage/defect reasons |
| Seller response time | 2-3 business days | 48 hours (auto-escalate) |
| Resolution paths | Instant/Review | Instant (< ₱500) / Seller Review / Return Required (≥ ₱2,000) |
| Admin escalation | Available | Auto on timeout + buyer appeal |

### Key Differences: Refund vs Replacement

| Aspect | Return & Refund | Return & Replace |
|--------|----------------|------------------|
| Money movement | Seller → Buyer refund | None |
| `refund_amount` | Set to item total | NULL (not applicable) |
| `refund_date` | Set on approval | Not set |
| `payment_status` | → "refunded" | Unchanged |
| `shipment_status` | Unchanged | → "processing" |
| Counter-offer | Available | Not available |
| Instant path | Eligible (< ₱500) | Not eligible |
| Seller balance hold | Yes | No |
| Order status history | `refund_approved` | `replacement_approved` |
| Terminal status badge | "Refunded" | "Replaced" |

---

## File Map

### Web (React + TypeScript)

| File | Purpose |
|------|---------|
| `web/src/pages/BuyerReturnRequestPage.tsx` | 5-step return request form (2 options) |
| `web/src/pages/BuyerReturnsListPage.tsx` | Buyer's return tracking list |
| `web/src/pages/SellerReturns.tsx` | Seller return management dashboard |
| `web/src/pages/AdminReturns.tsx` | Admin return oversight + actions |
| `web/src/services/returnService.ts` | Core return business logic (800+ lines) |
| `web/src/stores/sellerReturnStore.ts` | Zustand state for seller returns |
| `web/src/components/ReturnRefundModal.tsx` | Legacy return modal (deprecated) |

### Mobile (React Native + Expo)

| File | Purpose |
|------|---------|
| `mobile-app/app/ReturnRequestScreen.tsx` | Buyer return request (2 options) |
| `mobile-app/app/seller/ReturnDetailScreen.tsx` | Seller return detail + actions |
| `mobile-app/src/services/returnService.ts` | Mobile return service |
| `mobile-app/src/stores/returnStore.ts` | Mobile return state management |

### Database

| File | Purpose |
|------|---------|
| `supabase-migrations/013_return_refund_redesign.sql` | Schema migration for return system |

---

## Summary

```
BUYER                    SELLER                    ADMIN
─────                    ──────                    ─────
Request Return           See return in dashboard    See ALL returns
 ├─ Return & Refund      ├─ Approve & Refund       ├─ Override approve
 └─ Return & Replace     ├─ Approve & Ship Replace ├─ Override reject
                         ├─ Counter Offer (refund)  └─ Award BazCoins
Upload Evidence          ├─ Request Item Back
                         ├─ Confirm Received
Track in My Returns      └─ Reject with reason      Escalated returns
                                                     prioritized
Accept/Decline Offer     48h deadline auto-escal.
                                                    Platform-wide
Ship item back           Differentiated actions      oversight
                         per return type
```
