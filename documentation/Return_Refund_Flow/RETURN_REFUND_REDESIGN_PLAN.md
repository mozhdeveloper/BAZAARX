# BAZAAR — Return & Refund Redesign Plan

> Inspired by Lazada & Shopee, built to be faster, clearer, and less frustrating.  
> Current date: March 2, 2026

---

## The Problem With Lazada / Shopee

| Pain Point | Lazada | Shopee |
|---|---|---|
| Too many steps | 6–8 screens just to submit | 5–7 screens |
| Proof upload is confusing | Modal overlaid on modal | Separate page, easy to miss |
| Return window unclear | Hidden in fine print | Small text banner |
| Buyer ships item first, waits | Always required | Always required |
| Seller unresponsive = stuck | Manual escalation | Manual escalation |
| Refund timeline unknown | "3–14 business days" | "3–10 business days" |
| All-or-nothing return | Whole order only | Whole order only |
| No in-app status updates | Email only | Push + email |

**BAZAAR's goal**: Cut the buyer's effort in half, protect sellers from abuse, and process refunds in 48 hours for clear-cut cases.

---

## BAZAAR's Improved Return Flow — Overview

```
Buyer taps "Return/Refund"
        │
        ▼
Step 1 — Select Items to Return
        │
        ▼
Step 2 — Choose Reason + Upload Evidence (if required)
        │
        ▼
Step 3 — Smart Resolution Path (auto-determined)
        │
        ├── PATH A: Instant Refund (low-value / obvious damage)
        ├── PATH B: Seller Review (48h window → approve or counter-offer)
        └── PATH C: Return Shipping (seller approves → print label → ship → refund)
        │
        ▼
Refund issued to original payment method or BAZAAR wallet
```

---

## Step-by-Step Flow

### BUYER SIDE

---

#### Step 1 — Item Selection

**Screen**: `ReturnRequestScreen` (redesigned)

- Show all items from the order as a **selectable list** with product thumbnails
- Buyer checks which specific items they want to return (partial order return allowed)
- Each item shows: Name, variant, qty, price, and a quantity picker (e.g. "returning 1 of 2")
- Bottom banner shows: `Return window closes in X days` (countdown based on `delivered_at`)
- If return window expired → show locked state with "Return window closed" and support chat option

> **Improvement over Lazada/Shopee**: Per-item return selection. You bought 3 items, only 1 is broken — return just that one.

---

#### Step 2 — Reason + Evidence

**Screen**: Same screen, Step 2 (wizard-style, scrolls down in-place — no new screen navigation)

**Reason categories** (tap to expand):

| Category | Sub-reasons | Evidence Required? |
|---|---|---|
| Item arrived damaged | Broken, crushed, shattered, dented | ✅ Photo required |
| Wrong item sent | Different color, different size, different product | ✅ Photo required |
| Item not as described | Misleading photos, missing features | ✅ Photo required |
| Defective / not working | Does not power on, malfunction | ✅ Photo or video |
| Missing parts / accessories | Incomplete package | ✅ Photo of box contents |
| Changed my mind | No longer needed, bought by mistake | ❌ No evidence needed |
| Duplicate order | Accidentally ordered twice | ❌ No evidence needed |

**Photo/video upload**:
- Tap `+ Add Photo` inline (no separate screen)
- Max 5 photos or 1 short video (under 30s)
- Images shown as thumbnails immediately
- Required for damage/wrong item reasons — cannot proceed without at least 1 photo

**Description field** (optional free text, max 300 chars):
- Pre-filled suggestion text based on selected reason to lower friction
- e.g. "Received item was cracked on the lower left corner..."

---

#### Step 3 — Confirm & Smart Path Preview

**Screen**: Summary card before final submit

Shows:
- Items being returned + quantities
- Reason + evidence count
- **Estimated resolution path** (computed before submit):
  - 🟢 **Instant Refund Eligible** — refund amount, no shipping needed
  - 🟡 **Seller Review** — seller has 48h to respond
  - 🔵 **Return Required** — free shipping label provided (if approved)
- **Refund amount** breakdown (item price × qty, minus any discount already applied)
- Refund destination: original payment method or "BAZAAR Wallet (faster)"
- Estimated timeline: `Refund expected by [date]`

Buyer taps **Submit Request**.

---

### RESOLUTION PATHS (Auto-Determined)

#### Path A — Instant Refund (No Return Needed)

**Triggered when ALL of:**
- Item value < ₱500
- Reason: "wrong item" or "item not as described" or "missing parts"
- Photo evidence uploaded

**What happens:**
1. Refund issued within **2 business hours** to BAZAAR Wallet (or 1–3 days to original method)
2. Buyer keeps the item — no return shipping
3. Seller is notified and can dispute within 24h through admin escalation (not by blocking refund)

> **Better than Lazada/Shopee**: Low-value items don't require return shipping. It protects buyers and is cost-effective for sellers (return shipping often costs more than the item).

---

#### Path B — Seller Review (Standard)

**Triggered for items ≥ ₱500 with "changed mind" or ambiguous damage.**

**Seller has 48 hours to:**

| Action | Result |
|---|---|
| ✅ Approve Refund | Buyer refunded, seller ships label if return needed |
| 🔄 Counter-offer | Seller proposes partial refund (buyer accepts/declines) |
| 🏷️ Request Return First | Seller approves but needs item back — label generated |
| ❌ Reject | Buyer can escalate to BAZAAR admin within 24h |

**If seller does not respond in 48h → auto-escalate to admin.**

> **Better than Lazada/Shopee**: Sellers cannot stall indefinitely. 48h hard deadline prevents buyers from being stuck in limbo for weeks.

---

#### Path C — Return + Refund

**Triggered when:**
- Seller requests the item back, OR
- High-value item (≥ ₱2,000) regardless of reason

**Steps:**
1. BAZAAR generates a **pre-paid return shipping label** (PDF, shareable link, or QR code)
2. Buyer has **5 days** to ship the item
3. System tracks the return shipment (tracking number attached to order)
4. Upon delivery confirmed → refund issued within **24 hours**

> **Better than Lazada/Shopee**: Buyer doesn't pay return shipping. Label is generated inside the app — no printing needed if QR code drop-off is used.

---

### SELLER SIDE

**Screen**: `SellerOrderDetailScreen` — Return/Refund card (already added in code)

Seller sees:
- Return reason + submitted evidence (photo gallery)
- Item(s) being returned + quantities
- Requested refund amount
- **48-hour countdown timer** (shows hours remaining)
- Action buttons:
  - **Approve Refund** (full) → confirms refund immediately
  - **Make Counter-offer** → input partial refund amount + message to buyer
  - **Request Item Back** → seller gets return, refund held until item arrives
  - **Reject** → must enter rejection reason (goes to admin review)

New **Seller Returns Tab** (separate tab in seller order screen):
- Filterable list: Pending / Approved / Rejected
- Past 30 days, sortable by date / value

---

### ADMIN SIDE (Escalation)

**Triggered by:**
- Seller rejects → buyer escalates
- Seller does not respond in 48h (auto-escalate)
- Buyer disputes seller counter-offer

**Admin panel view** (web):
- All escalated cases with evidence
- Quick actions: Side with buyer / Side with seller / Request more info
- Resolution SLA: 24h from escalation receipt

---

## Refund Timeline by Path

| Path | Type | Timeline |
|---|---|---|
| Path A (Instant) | BAZAAR Wallet | Under 2 hours |
| Path A (Instant) | Original payment | 1–3 business days |
| Path B (Seller approves same day) | BAZAAR Wallet | Same day |
| Path B (Seller approves same day) | Original payment | 1–3 business days |
| Path C (Return shipping) | Any | 24h after item received |
| Escalated (Admin) | Any | 24–48h after admin decision |

---

## Database Changes Required

### `refund_return_periods` — Add Columns

```sql
ALTER TABLE public.refund_return_periods
  ADD COLUMN IF NOT EXISTS return_type      text DEFAULT 'full'
    CHECK (return_type IN ('full', 'partial', 'no_return')),
  ADD COLUMN IF NOT EXISTS resolution_path  text DEFAULT 'seller_review'
    CHECK (resolution_path IN ('instant', 'seller_review', 'return_required')),
  ADD COLUMN IF NOT EXISTS items_json       jsonb,           -- selected items + qtys
  ADD COLUMN IF NOT EXISTS evidence_urls    text[],          -- photo/video URLs
  ADD COLUMN IF NOT EXISTS seller_note      text,            -- seller counter-offer note
  ADD COLUMN IF NOT EXISTS rejected_reason  text,
  ADD COLUMN IF NOT EXISTS escalated_at     timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at      timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by      uuid REFERENCES public.admins(id),
  ADD COLUMN IF NOT EXISTS return_label_url text,            -- pre-paid shipping label
  ADD COLUMN IF NOT EXISTS tracking_number  text,            -- return shipment tracking
  ADD COLUMN IF NOT EXISTS buyer_shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS counter_offer_amount numeric CHECK (counter_offer_amount >= 0),
  ADD COLUMN IF NOT EXISTS seller_deadline  timestamptz;     -- 48h from submission
```

### New `return_status` Derived Logic

Rather than a separate `status` column (to avoid conflicting with `is_returnable` + `refund_date`), status is derived:

```
pending   → is_returnable = true  AND refund_date IS NULL AND rejected_reason IS NULL AND resolved_at IS NULL
approved  → refund_date IS NOT NULL
rejected  → rejected_reason IS NOT NULL OR is_returnable = false
escalated → escalated_at IS NOT NULL AND resolved_at IS NULL
resolved  → resolved_at IS NOT NULL
counter   → counter_offer_amount IS NOT NULL AND refund_date IS NULL
```

> **Alternatively** (cleaner): Add `status text CHECK (status IN ('pending','seller_review','counter_offered','approved','rejected','escalated','resolved','return_in_transit'))` as a proper column.

---

## New / Changed Screens

| Screen | Status | Changes |
|---|---|---|
| `ReturnRequestScreen` | 🔄 Redesign | Per-item selection, inline photo upload, step wizard, smart path preview |
| `ReturnDetailScreen` | ✅ Done (this session) | Fetches from Supabase, shows status timeline |
| `ReturnOrdersScreen` | ✅ Done (this session) | Null crash fixed |
| `SellerOrderDetailScreen` | ✅ Done (this session) | Approve/Reject card |
| `SellerReturnsScreen` | 🆕 New | Dedicated returns tab for sellers |
| `ReturnCounterOfferScreen` | 🆕 New | Buyer accepts/declines seller's partial offer |
| `AdminEscalationsScreen` (web) | 🆕 New | Admin resolution queue |

---

## New `returnService.ts` Methods Needed

```typescript
// Photo/video upload before submit
uploadReturnEvidence(files: File[]): Promise<string[]>

// Submit with new fields (items, evidence, resolution path)
submitReturnRequest(params: SubmitReturnParamsV2): Promise<MobileReturnRequest>

// Seller counter-offer
counterOfferReturn(returnId: string, amount: number, note: string): Promise<void>

// Buyer accept/decline counter-offer
acceptCounterOffer(returnId: string): Promise<void>
declineCounterOffer(returnId: string): Promise<void>

// Escalate to admin
escalateReturn(returnId: string, reason: string): Promise<void>

// Seller: Get all return requests for their store
getReturnRequestsBySeller(sellerId: string): Promise<MobileReturnRequest[]>

// Generate return shipping label
generateReturnLabel(returnId: string): Promise<{ url: string; trackingNumber: string }>

// Buyer: Confirm item shipped back
confirmReturnShipment(returnId: string, trackingNumber: string): Promise<void>
```

---

## Notifications Needed

| Event | Who Gets Notified | Channel |
|---|---|---|
| Return submitted | Seller | Push + in-app |
| Seller approved | Buyer | Push + in-app |
| Seller rejected | Buyer | Push + in-app |
| Counter-offer received | Buyer | Push + in-app |
| Buyer accepts counter | Seller | Push + in-app |
| Seller doesn't respond in 36h | Seller (reminder) | Push + in-app |
| Auto-escalated to admin | Buyer + Seller | Push + in-app |
| Admin resolves | Buyer + Seller | Push + in-app |
| Refund issued | Buyer | Push + in-app |
| Return shipping label ready | Buyer | Push + in-app |

---

## Implementation Priority

### Phase 1 — Foundation (1–2 weeks)
- [ ] DB migration: add new columns to `refund_return_periods`
- [ ] `returnService.ts`: Update `submitReturnRequest` to accept items + evidence
- [ ] `ReturnRequestScreen`: Per-item selection + inline photo upload
- [ ] `returnService.ts`: `approveReturn`, `rejectReturn` (already done), `counterOfferReturn`

### Phase 2 — Seller Experience (1 week)
- [ ] `SellerReturnsScreen`: Dedicated returns list with status tabs
- [ ] `SellerOrderDetailScreen`: Show evidence photos + counter-offer button
- [ ] `returnService.ts`: `getReturnRequestsBySeller`, seller deadline countdown

### Phase 3 — Smart Paths + Buyer Protections (1 week)
- [ ] Auto-escalation cron job (Supabase Edge Function — fires at `seller_deadline`)
- [ ] `ReturnCounterOfferScreen`: Buyer accept/decline UI
- [ ] `returnService.ts`: `acceptCounterOffer`, `declineCounterOffer`, `escalateReturn`
- [ ] Notification triggers for all events

### Phase 4 — Return Shipping (1–2 weeks)
- [ ] Return shipping label generation (API integration or manual)
- [ ] `returnService.ts`: `generateReturnLabel`, `confirmReturnShipment`
- [ ] Tracking number input on buyer side
- [ ] Auto-refund when return marked received

### Phase 5 — Admin Escalation Panel (1 week)
- [ ] Admin web panel: Escalated returns queue
- [ ] Admin can view evidence, chat with buyer/seller
- [ ] `resolved_by` + `resolved_at` written to DB

---

## Key Design Principles

1. **Evidence first, doubt second** — if a buyer provides clear photos of a broken item, auto-approve for low-value items without burdening the seller.
2. **Sellers get a fair shot** — 48h is enough time; automated escalation keeps buyers from being ghosted.
3. **No dead ends** — every state has a clear next action visible to both parties.
4. **Refund speed = trust** — a buyer who gets a refund in 2 hours becomes a loyal buyer.
5. **Partial returns are normal** — don't force buyers to return 3 items when only 1 is broken.
6. **Transparency at every step** — buyers always see `Estimated refund by [date]` — never "3–14 business days."
