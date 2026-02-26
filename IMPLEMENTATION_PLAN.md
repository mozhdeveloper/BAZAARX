# BAZAARX — Missing Deliverables Implementation Plan

> Created: Feb 26, 2026 | Focus: Web first, then mobile parity

---

## Overview

| # | Feature | Current Status | DB Table | Effort |
|---|---------|---------------|----------|--------|
| **P1-A** | Admin Categories CRUD | UI_ONLY (mock) | `categories` EXISTS | Low |
| **P1-B** | Admin Reviews Moderation | UI_ONLY (mock) | `reviews` EXISTS | Low |
| **P2-A** | Admin Flash Sale List/Edit/Delete | CREATE only wired | `discount_campaigns` EXISTS | Medium |
| **P2-B** | Buyer Return & Refund (Web) | UI_ONLY (mock) | `refund_return_periods` EXISTS | Medium |
| **P2-C** | Seller Return & Refund (Web) | UI_ONLY (mock) | `refund_return_periods` EXISTS | Medium |
| **P3-A** | Seller Earnings Dashboard (Web) | UI_ONLY (mock) | **NEEDS `seller_payouts` table** | High |
| **P3-B** | Admin Payout Management | UI_ONLY (mock) | **NEEDS `seller_payouts` table** | High |
| **P3-C** | Admin Product Requests Dashboard | UI_ONLY (mock) | **NEEDS `product_requests` table** | High |

---

## P1-A: Admin Categories CRUD

**What exists:** `AdminCategories.tsx` (614 lines) + `useAdminCategories` store + `categories` DB table  
**Problem:** Store uses `demoCategories[]` + `setTimeout` fakes — no Supabase calls  

### Changes:
1. **`adminStore.ts` — `useAdminCategories` section** (~lines 442–570)
   - `loadCategories()` → `supabase.from('categories').select('*, products(count)').order('sort_order')`
   - `addCategory()` → `supabase.from('categories').insert({name, slug, description, parent_id, icon, image_url, sort_order})`
   - `updateCategory()` → `supabase.from('categories').update({...}).eq('id', id)`
   - `deleteCategory()` → `supabase.from('categories').delete().eq('id', id)`
   - Map DB row → store `Category` interface (add `parent_id` support)
   - Remove all `setTimeout` + `demoCategories` mock data

2. **`AdminCategories.tsx`** — Add parent category selector dropdown (optional, DB supports `parent_id`)

### DB: No migration needed — `categories` table has all required columns

---

## P1-B: Admin Reviews Moderation

**What exists:** `AdminReviewModeration.tsx` (577 lines) + `useAdminReviews` store + `reviewService.ts` (1283 lines) + `reviews` DB table  
**Problem:** Store uses `demoReviews[]` + `setTimeout` fakes. `reviewService` is never imported by admin flow  

### Changes:
1. **`adminStore.ts` — `useAdminReviews` section** (~lines 2099–2320)
   - `loadReviews()` → `supabase.from('reviews').select('*, product:products(name, product_images(image_url)), buyer:buyers(id, profiles(first_name, last_name, email))')` — fetch real reviews with joins
   - `approveReview(id)` → `supabase.from('reviews').update({ is_hidden: false }).eq('id', id)` (approve = unhide)
   - `rejectReview(id, reason)` → `supabase.from('reviews').update({ is_hidden: true }).eq('id', id)` (reject = hide)
   - `deleteReview(id)` → `supabase.from('reviews').delete().eq('id', id)`
   - `flagReview(id)` → `supabase.from('reviews').update({ is_hidden: true }).eq('id', id)` (flag = hide)
   - Map DB `is_hidden` boolean ↔ store's `status` string (`is_hidden=false` → approved, `is_hidden=true` → rejected/flagged)
   - Remove all `setTimeout` + `demoReviews` mock data

2. **Review model mapping:** DB `reviews` doesn't have `status` column — derive it:
   - `is_hidden = false` → "approved"
   - `is_hidden = true` → "flagged" or "rejected" (can track via admin_audit_logs or just use "hidden")

### DB: No migration needed — `reviews` table has `is_hidden` boolean

---

## P2-A: Admin Flash Sale List/Edit/Delete

**What exists:** `AdminFlashSales.tsx` (722 lines) with CREATE wired to `discountService`. But LIST is hardcoded, EDIT button is dead, DELETE/TOGGLE are local-only  
**`discountService.ts` already has:** `getCampaignsBySeller()`, `updateCampaign()`, `deleteCampaign()`, `toggleCampaignStatus()`, `getProductsInCampaign()`  

### Changes:
1. **`AdminFlashSales.tsx`**
   - **Load flash sales from DB:** Add `useEffect` → `discountService.getAllFlashSales()` (need to add this method — or list all campaigns where `campaign_type = 'flash_sale'`)
   - **Wire DELETE:** `handleDeleteFlashSale(id)` → `discountService.deleteCampaign(id)` then re-fetch
   - **Wire TOGGLE:** `handleToggleStatus(id)` → `discountService.toggleCampaignStatus(id, isPaused)` then re-fetch
   - **Wire EDIT:** Open create form pre-populated with existing sale data → `discountService.updateCampaign(id, updates)`
   - Remove hardcoded `flashSales` array (3 mock items)
   - Each sale should also load its products via `discountService.getProductsInCampaign(campaignId)`

2. **`discountService.ts`** — Add `getAllFlashSales()` method:
   ```ts
   async getAllFlashSales(): Promise<DiscountCampaign[]> {
     const { data } = await supabase.from('discount_campaigns')
       .select('*, product_discounts(*, product:products(name, price, product_images(image_url)))')
       .eq('campaign_type', 'flash_sale')
       .order('created_at', { ascending: false });
     return data || [];
   }
   ```

### DB: No migration needed — `discount_campaigns` + `product_discounts` tables exist

---

## P2-B: Buyer Return & Refund (Web)

**What exists:** `ReturnRefundModal.tsx` (UI complete), `OrdersPage.tsx` has `handleReturnSubmit` (local-only), `refund_return_periods` DB table  
**Problem:** `handleReturnSubmit` says "In a real app, this would submit to an API" — just does console.log  

### Changes:
1. **Create `web/src/services/returnService.ts`** — new service:
   - `submitReturnRequest(orderId, reason, description, refundAmount, images?)` →
     - INSERT into `refund_return_periods` (order_id, return_reason, refund_amount, is_returnable: true)
     - UPDATE `orders` SET `shipment_status = 'returned'`
     - INSERT into `order_status_history` (order_id, status: 'return_requested', note: reason)
     - Upload evidence images to Supabase Storage if provided
   - `getReturnRequests(buyerId)` → SELECT from `refund_return_periods` with order joins
   - `getReturnWindow(orderId)` → Check if within return window

2. **`OrdersPage.tsx`**
   - `handleReturnSubmit()` → call `returnService.submitReturnRequest()` instead of local state update
   - Show return status from DB on orders list

### DB: No migration needed — `refund_return_periods` + `order_status_history` exist

---

## P2-C: Seller Return & Refund Management (Web)

**What exists:** `SellerReturns.tsx` (290 lines) + `sellerReturnStore.ts` (111 lines) — all dummy data  
**Problem:** Store uses `dummyRequests[]` + local persist only  

### Changes:
1. **`sellerReturnStore.ts`** — Rewrite to use Supabase:
   - `loadRequests(sellerId)` → Query `refund_return_periods` joined with `orders` → `order_items` → `products` WHERE product seller_id = sellerId
   - `approveRequest(id)` → UPDATE `refund_return_periods` SET refund_date = now(). UPDATE `orders` SET `payment_status = 'refunded'`
   - `rejectRequest(id)` → UPDATE `refund_return_periods` SET is_returnable = false
   - Remove `dummyRequests` + `persist` middleware

2. **`SellerReturns.tsx`** — Call `loadRequests` on mount with real seller ID

### DB: No migration needed

---

## P3-A: Seller Earnings Dashboard (Web)

**What exists:** `SellerEarnings.tsx` (366 lines) — all hardcoded numbers. `sellerService.ts` has `updatePayoutAccount()` already wired  
**Problem:** No `seller_payouts` table. Earnings not computed from orders.  

### Changes:
1. **New migration: `seller_payouts` table**
   ```sql
   CREATE TABLE public.seller_payouts (
     id uuid NOT NULL DEFAULT gen_random_uuid(),
     seller_id uuid NOT NULL REFERENCES public.sellers(id),
     amount numeric NOT NULL CHECK (amount > 0),
     status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed')),
     reference_number text,
     bank_name text,
     account_number text,
     period_start timestamp with time zone NOT NULL,
     period_end timestamp with time zone NOT NULL,
     paid_at timestamp with time zone,
     created_at timestamp with time zone NOT NULL DEFAULT now(),
     PRIMARY KEY (id)
   );
   ```

2. **Create `web/src/services/earningsService.ts`**:
   - `getSellerEarnings(sellerId)` → Aggregate from `order_items` joined with `orders` (WHERE `payment_status = 'paid'` AND product seller_id matches):
     - Total earnings: SUM of (price - price_discount) * quantity
     - Pending payout: Orders paid but not yet disbursed
     - Available balance: Total - already paid out
   - `getPayoutHistory(sellerId)` → SELECT from `seller_payouts` WHERE seller_id
   - `requestPayout(sellerId, amount)` → INSERT into `seller_payouts` with status 'pending'

3. **`SellerEarnings.tsx`** — Replace hardcoded values with service calls:
   - Wire "Update Account" button → `sellerService.updatePayoutAccount()`
   - Load payout history from DB
   - Compute earnings from real order data

### DB: NEEDS MIGRATION — `seller_payouts` table

---

## P3-B: Admin Payout Management

**What exists:** `AdminPayouts.tsx` (292 lines) + `useAdminPayouts` store — all mock  
**Depends on:** P3-A (needs `seller_payouts` table)  

### Changes:
1. **`adminStore.ts` — `useAdminPayouts` section** (~lines 2462–2528)
   - `loadPayouts()` → `supabase.from('seller_payouts').select('*, seller:sellers(store_name, seller_payout_accounts(bank_name, account_number))')`
   - `markAsPaid(id, referenceNumber)` → `supabase.from('seller_payouts').update({ status: 'paid', reference_number: referenceNumber, paid_at: new Date() })`
   - `processBatch(ids)` → Loop update status to 'processing'
   - Remove `demoPayouts` mock data

2. **`AdminPayouts.tsx`** — Wire export CSV button + add "Generate Payouts" feature:
   - Compute pending payouts for each seller from delivered orders
   - Bulk-insert into `seller_payouts`

### DB: Uses same `seller_payouts` table from P3-A

---

## P3-C: Admin Product Requests Dashboard

**What exists:** `AdminProductRequests.tsx` — full UI shell, all mock  
**Problem:** No `product_requests` DB table  

### Changes:
1. **New migration: `product_requests` table**
   ```sql
   CREATE TABLE public.product_requests (
     id uuid NOT NULL DEFAULT gen_random_uuid(),
     buyer_id uuid NOT NULL REFERENCES public.buyers(id),
     product_name text NOT NULL,
     category text,
     description text,
     budget_min numeric,
     budget_max numeric,
     status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','fulfilled','rejected')),
     admin_notes text,
     reviewed_by uuid REFERENCES public.admins(id),
     reviewed_at timestamp with time zone,
     created_at timestamp with time zone NOT NULL DEFAULT now(),
     updated_at timestamp with time zone NOT NULL DEFAULT now(),
     PRIMARY KEY (id)
   );
   ```

2. **Create `web/src/services/productRequestService.ts`**:
   - `getProductRequests()` → SELECT with buyer profile joins
   - `updateRequestStatus(id, status, adminNotes)` → UPDATE
   - `submitProductRequest(buyerId, data)` → INSERT (buyer-facing)

3. **`AdminProductRequests.tsx`** — Wire to service instead of local state

4. **Mobile `ProductRequestModal`** — Wire submit to `productRequestService.submitProductRequest()` instead of console.log

### DB: NEEDS MIGRATION — `product_requests` table

---

## Implementation Order

```
Phase 1 (Low effort — DB exists, just wire up):
  ├── P1-A: Admin Categories CRUD
  └── P1-B: Admin Reviews Moderation

Phase 2 (Medium — DB exists, need service layer):
  ├── P2-A: Admin Flash Sale List/Edit/Delete
  ├── P2-B: Buyer Return & Refund
  └── P2-C: Seller Return & Refund

Phase 3 (High — need new DB tables + service + rewire):
  ├── P3-A: Seller Earnings Dashboard (create seller_payouts migration)
  ├── P3-B: Admin Payout Management (uses same table)
  └── P3-C: Admin Product Requests (create product_requests migration)
```

## Files to Modify

| File | Changes |
|------|---------|
| `web/src/stores/adminStore.ts` | Rewrite Categories, Reviews, Payouts stores → Supabase |
| `web/src/stores/sellerReturnStore.ts` | Rewrite → Supabase queries |
| `web/src/pages/AdminFlashSales.tsx` | Wire list/edit/delete to discountService |
| `web/src/pages/SellerEarnings.tsx` | Replace hardcoded data with service calls |
| `web/src/pages/OrdersPage.tsx` | Wire handleReturnSubmit to returnService |
| `web/src/pages/AdminProductRequests.tsx` | Wire to productRequestService |
| `web/src/services/discountService.ts` | Add `getAllFlashSales()` method |
| **NEW** `web/src/services/returnService.ts` | Return/refund Supabase operations |
| **NEW** `web/src/services/earningsService.ts` | Earnings aggregation from orders |
| **NEW** `web/src/services/productRequestService.ts` | Product request CRUD |
| **NEW** `supabase-migrations/009_seller_payouts.sql` | seller_payouts table |
| **NEW** `supabase-migrations/010_product_requests.sql` | product_requests table |
