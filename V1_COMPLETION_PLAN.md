# V1 Completion Plan — BazaarX (Mobile + Web)

> Generated from audit of phase1.md checklist against live codebase + database schema.
> **Status: 140/155 items passing (90%) — 15 items remaining.**
> **Database: No new migrations required.** All tables needed already exist.

---

## Database Tables Referenced by This Plan

| Table | Purpose | Already Exists |
|-------|---------|:-:|
| `store_followers` | Follow/unfollow shops (buyer_id → sellers.id) | ✅ |
| `conversations` | Order-scoped chat (buyer_id, order_id, seller_id) | ✅ |
| `messages` | Chat messages (conversation_id, sender_id, sender_type, content) | ✅ |
| `discount_campaigns` | Flash sales / campaigns (seller_id, campaign_type='flash_sale', starts_at, ends_at) | ✅ |
| `product_discounts` | Products in a campaign (campaign_id → discount_campaigns, product_id, discount_value) | ✅ |
| `sellers` | Seller storefront data (store_name, avatar_url, approval_status) | ✅ |
| `products` | Product catalog (name, price, category_id, seller_id) | ✅ |
| `product_variants` | Variant pricing (sku UNIQUE, price, stock) | ✅ |
| `reviews` | Product reviews (rating, comment) | ✅ |

> **No `product_requests` table exists in DB.** The Product Request feature currently uses mock/local data only. A new migration will be needed if we want this to be real. See Item #12 below.

---

## Priority 1 — CRITICAL (Blocks core V1 flows)

### Item #1: Admin Flash Sale — Product Picker + Flash Price Input
**Platforms:** Web Admin
**Effort:** Medium (1-2 hrs)
**Files:**
- `web/src/pages/AdminFlashSales.tsx` — create modal

**What's Wrong:**
- "Add Products" button is a non-functional stub
- No flash price input per product in the create modal
- Schedule (start/end) already works ✅

**Database Mapping:**
```
discount_campaigns → { seller_id, campaign_type: 'flash_sale', starts_at, ends_at, discount_type, discount_value }
product_discounts  → { campaign_id, product_id, discount_type, discount_value }
```
The admin creates a `discount_campaigns` row with `campaign_type = 'flash_sale'`, then links products via `product_discounts`.

**Implementation Steps:**
1. Add a product search/picker modal inside the flash sale create dialog
   - Query `products` table with search by name
   - Display product image, name, price, seller
   - Allow multi-select with checkboxes
2. For each selected product, show an inline `flashPrice` input
   - Compute `discount_value = product.price - flashPrice`
   - Set `discount_type = 'fixed_amount'`
3. On save:
   - INSERT into `discount_campaigns` (the campaign row)
   - INSERT into `product_discounts` (one row per product with its discount)
4. Replace mock data with real Supabase queries
5. Wire the edit flow to update existing `product_discounts` rows

**Validation:**
- `discount_campaigns.discount_value > 0` (CHECK constraint)
- `product_discounts.discount_value > 0` (CHECK constraint)
- `discount_campaigns.starts_at < ends_at`

---

### Item #2: Order-Based Chat — Seller Side (Web + Mobile)
**Platforms:** Seller Web + Seller Mobile
**Effort:** Medium (2-3 hrs)
**Files:**
- `web/src/components/OrderDetailsModal.tsx` — add chat section
- `web/src/pages/SellerOrders.tsx` — wire chat from order detail
- `mobile-app/app/seller/OrderDetailScreen.tsx` — replace simulated chat with real service

**What's Wrong:**
- **Web buyer** → Order chat works via `chatService` + `conversations` table ✅
- **Web seller** → `OrderDetailsModal` has NO chat section. `SellerMessages` is standalone.
- **Mobile seller** → `OrderDetailScreen` chat is local `useState` simulation — messages are NOT persisted

**Database Mapping:**
```
conversations → { id, buyer_id, order_id, seller_id }
messages      → { conversation_id, sender_id, sender_type: 'buyer'|'seller', content, is_read }
```
The `conversations` table already has `order_id` FK → scoped to a specific order.
`seller_id` column exists on `conversations` (added in migration 008).

**Implementation Steps:**

**Web Seller:**
1. In `OrderDetailsModal`, add a collapsible "Chat with Buyer" section at the bottom
2. Query: `conversations` WHERE `order_id = {orderId}` to get or create conversation
3. Fetch `messages` WHERE `conversation_id = {conv.id}` ORDER BY `created_at`
4. Render messages with same bubble style as buyer side (`ChatBubble` component)
5. Send: INSERT into `messages` with `sender_type = 'seller'`
6. Subscribe to realtime channel for new messages

**Mobile Seller:**
1. In `OrderDetailScreen.tsx`, replace local `chatMessages` state with real service
2. Import/create a `chatService` (or reuse from buyer) that queries `conversations` + `messages`
3. On mount: find/create conversation for this order + seller
4. Render with existing bubble UI (already styled)
5. Send: INSERT into `messages` with `sender_type = 'seller'`, `sender_id = seller.id`

**Validation:**
- `messages.sender_type` CHECK constraint: `'buyer'` or `'seller'` ✅
- `messages.content` is NOT NULL ✅
- `conversations.order_id` FK → `orders.id` ✅

---

## Priority 2 — HIGH (Visible to buyers on every visit)

### Item #3: Follow Shop Button on Product Detail Page
**Platforms:** Web + Mobile
**Effort:** Small (30 min)
**Files:**
- `web/src/pages/ProductDetailPage.tsx` — seller info section
- `mobile-app/app/ProductDetailScreen.tsx` — seller info section

**What's Wrong:**
- Web PDP: seller section has name/rating/chat but NO Follow button
- Mobile PDP: seller section has "Visit Store" but NO Follow button
- Follow works on `SellerStorefrontPage` (web) and `StoreDetailScreen` (mobile) ✅

**Database Mapping:**
```
store_followers → { buyer_id, seller_id, created_at }
```
The `store_followers` table is already used by `StoreDetailScreen` / `SellerStorefrontPage`.

**Implementation Steps:**

**Web:**
1. In the seller info section (~line 660-700), add a Follow/Following button
2. Query `store_followers` WHERE `buyer_id = currentUser.id AND seller_id = product.seller.id`
3. Toggle: INSERT or DELETE from `store_followers`
4. Use same orange button style as `SellerStorefrontPage`

**Mobile:**
1. In the seller info section (~line 982-1006), add a Follow button next to "Visit Store"
2. Use `sellerService.followShop()` / `sellerService.unfollowShop()` (already exists)
3. Show Heart or UserPlus icon (same as `StoreDetailScreen`)

**Validation:**
- `store_followers.buyer_id` FK → `buyers.id` ✅
- `store_followers.seller_id` FK → `sellers.id` ✅

---

### Item #4: "Request Product" CTA on Search No-Results
**Platforms:** Web
**Effort:** Small (15 min)
**Files:**
- `web/src/pages/SearchPage.tsx` — no-results block (~line 673)

**What's Wrong:**
- No-results state shows "No products found" text only
- `ProductRequestModal` is already wired to the page but only opens from `VisualSearchModal`

**Database Note:**
- No `product_requests` table exists. The modal submits to `console.log`. This is an existing limitation.
- For V1 launch, showing the UI/CTA is enough. Backend can be added post-launch.

**Implementation Steps:**
1. In the no-results `<div>`, add a "Can't find what you need?" heading + "Request Product" button
2. Set `showProductRequestModal(true)` on click (state already exists)
3. Pass `searchQuery` as `initialSearchTerm` prop to `ProductRequestModal`

---

### Item #5: Featured Stores Section on Mobile Homepage
**Platforms:** Mobile
**Effort:** Small (30 min)
**Files:**
- `mobile-app/app/HomeScreen.tsx`

**What's Wrong:**
- Stores are fetched (`sellerService.getAllSellers()`) but only surface in search results
- No dedicated "Featured Stores" horizontal rail on the homepage

**Database Mapping:**
```
sellers → { id, store_name, avatar_url, approval_status = 'verified' }
```

**Implementation Steps:**
1. After the Flash Sale section (~line 577), add a "Featured Stores" section
2. Query `sellers` WHERE `approval_status = 'verified'` LIMIT 10
3. Render as horizontal `ScrollView` with store cards (avatar, name, "Visit" button)
4. Each card navigates to `StoreDetail` screen
5. Add "See All" → navigate to `AllStores` screen

---

## Priority 3 — MEDIUM (Polish + Parity)

### Item #6: Mobile Product Request — Confirmation State
**Platforms:** Mobile
**Effort:** Small (20 min)
**Files:**
- `mobile-app/src/components/ProductRequestModal.tsx`

**What's Wrong:**
- `handleSubmit` calls `onClose()` immediately — no visible success feedback
- Web version has an animated CheckCircle success screen with auto-close

**Implementation Steps:**
1. Add `isSubmitted` state
2. After submit, set `isSubmitted = true` instead of `onClose()`
3. Render success view: CheckCircle icon + "Request Submitted!" + auto-close after 2 seconds
4. Use same color scheme as web (`#22C55E` green + tip text)

---

### Item #7: Mobile Cart — Per-Seller Subtotals
**Platforms:** Mobile
**Effort:** Small (20 min)
**Files:**
- `mobile-app/app/CartScreen.tsx`

**What's Wrong:**
- Items grouped by seller ✅, but only a global subtotal at the bottom
- Web has per-seller subtotal + shipping fee per group ✅

**Implementation Steps:**
1. In the seller group rendering block (~line 258-275), after the last item in each group:
2. Compute `groupSubtotal = group.items.reduce((sum, item) => sum + item.price * item.quantity, 0)`
3. Render a footer row: `"Seller Total: ₱{groupSubtotal}"` with muted styling
4. Keep the existing global total at bottom for overall

---

### Item #8: Seller Web — Flash Sale Per Product
**Platforms:** Seller Web
**Effort:** Medium (1 hr)
**Files:**
- `web/src/pages/SellerProducts.tsx` — product card/edit dialog
- OR use existing `web/src/pages/SellerDiscounts.tsx` campaign flow

**What's Wrong:**
- Flash sales only exist at campaign level in `SellerDiscounts.tsx`
- No per-product flash sale toggle in the product editor

**Database Mapping:**
```
discount_campaigns → { seller_id, campaign_type: 'flash_sale', starts_at, ends_at }
product_discounts  → { campaign_id, product_id, discount_value }
```

**Implementation Steps:**
Option A — Quick link from product to SellerDiscounts:
1. In product card actions, add "Add to Flash Sale" button
2. Opens `SellerDiscounts` page pre-filtered to flash_sale campaigns
3. Auto-selects the product in the campaign product picker

Option B — Inline flash sale in product edit:
1. Add "Flash Sale" toggle in product edit dialog
2. When enabled, show flash price + start/end date inputs
3. On save: CREATE a `discount_campaigns` row + `product_discounts` row for this product
4. Load existing flash sale data when editing (query `product_discounts` → `discount_campaigns`)

**Recommended: Option A** — less code, leverages existing campaign management.

---

### Item #9: Seller Web — "Orders Today" Dashboard Stat
**Platforms:** Seller Web
**Effort:** Small (15 min)
**Files:**
- `web/src/pages/SellerDashboard.tsx`

**What's Wrong:**
- Uses "Total Orders" for selected date range (default "All Time")
- No dedicated "today" counter

**Implementation Steps:**
1. Add computed `ordersToday` from `orders.filter(o => isToday(o.created_at)).length`
2. Add a 5th stat card: "Orders Today" with CalendarCheck icon
3. OR change the "Total Orders" subtitle from `${pending} pending` to `${todayCount} today, ${pending} pending`

---

### Item #10: Web ShopPage — Rating Filter Widget
**Platforms:** Web
**Effort:** Small (20 min)
**Files:**
- `web/src/pages/ShopPage.tsx`

**What's Wrong:**
- Rating exists only as a sort option, not as a minimum-rating filter
- Checklist requires: Price filter ✅, Category filter ✅, Rating filter ❌

**Implementation Steps:**
1. Add `minRating` state (default 0 = all)
2. Add a "Rating" section in the filter sidebar with clickable stars: ★★★★★ & up, ★★★★ & up, etc.
3. Filter products: `products.filter(p => p.rating >= minRating)`
4. Show active filter count badge

---

### Item #11: Seller Earnings — "Last Payout" Card
**Platforms:** Seller Web + Mobile
**Effort:** Small (10 min)
**Files:**
- `web/src/pages/SellerEarnings.tsx`
- `mobile-app/app/seller/earnings.tsx`

**What's Wrong:**
- 3 cards: Total Earnings, Available Balance, Pending Payout
- No "Last Payout" card — info only in history table

**Database Note:**
- Earnings data is currently **hardcoded mock data** on both platforms
- No `payouts` table exists in DB. This is view-only demo data.
- For V1: Just derive "Last Payout" from the hardcoded `payoutHistory[0]`

**Implementation Steps:**
1. Extract the most recent entry from `payoutHistory` array
2. Replace "Available Balance" with "Last Payout" showing: date + amount
3. OR add a 4th card alongside existing 3

---

### Item #12: Admin Dashboard — Product Requests Metric
**Platforms:** Web Admin
**Effort:** Small (10 min)
**Files:**
- `web/src/pages/AdminDashboard.tsx`

**What's Wrong:**
- 4 stat cards: Revenue, Orders, Sellers, Buyers
- No product requests count

**Database Note:**
- **No `product_requests` table exists.** The feature uses mock data.
- For V1: Add a 5th stat card with hardcoded or mock count to match the checklist UI requirement.
- Post-V1: Create a real `product_requests` table and wire it.

**Implementation Steps:**
1. Add a 5th stat card: "Product Requests" with InboxIcon
2. Use `pendingApprovals` from store (already fetched but not rendered), OR mock count
3. Style same as other stat cards

---

## Priority 4 — LOW (Nice-to-have polish)

### Item #13: Live Flash Sale Countdown on Homepage
**Platforms:** Web + Mobile
**Effort:** Small (30 min)
**Files:**
- `web/src/pages/HomePage.tsx` — flash sale ProductRail
- `mobile-app/app/HomeScreen.tsx` — flash section timer

**What's Wrong:**
- **Web:** FlashSalesPage has a live countdown ✅, but HomePage flash rail has NO timer
- **Mobile:** HomeScreen has a hardcoded static `02:15:40` text, not a ticking countdown

**Database Mapping:**
```
discount_campaigns → { ends_at } WHERE campaign_type = 'flash_sale' AND status = 'active'
```

**Implementation Steps:**
1. Query active flash sale campaign: `discount_campaigns WHERE campaign_type='flash_sale' AND status='active' ORDER BY ends_at LIMIT 1`
2. Calculate remaining time: `ends_at - now()`
3. **Web:** Add countdown component next to "Flash Sales" rail title on HomePage
4. **Mobile:** Replace hardcoded `02:15:40` with `useEffect` + `setInterval` ticker using campaign `ends_at`

---

### Item #14: Mobile Order Chat — Wire to Real Service
**Platforms:** Mobile (Buyer side already works, this is additional cleanup)
**Effort:** Small (20 min)
**Files:**
- `mobile-app/app/OrderDetailScreen.tsx`

**What's Wrong:**
- Buyer mobile order chat uses local simulated responses
- Web buyer order chat uses real `chatService` + Supabase

**Note:** This overlaps with Item #2 (seller chat). Should be done together.

**Implementation Steps:**
1. Import `chatService` (or create a mobile-equivalent)
2. On mount: `conversations` WHERE `order_id = orderId AND buyer_id = userId`
3. If none, create conversation
4. Fetch + render real `messages`
5. Send → INSERT into `messages` with `sender_type = 'buyer'`
6. Subscribe to realtime for incoming seller messages

---

### Item #15: Admin Bulk Actions (Optional/Recommended)
**Platforms:** Web Admin
**Effort:** Medium (1-2 hrs)
**Files:**
- `web/src/pages/AdminOrders.tsx`
- `web/src/pages/AdminProducts.tsx`
- `web/src/pages/AdminSellers.tsx`

**What's Wrong:**
- All actions are per-row only — no multi-select or batch operations

**Implementation Steps:**
1. Add checkbox column to each admin table
2. Add "Select All" header checkbox
3. Add bulk action toolbar (appears when items selected):
   - AdminOrders: "Cancel Selected", "Mark as Shipped"
   - AdminProducts: "Deactivate Selected", "Activate Selected"
   - AdminSellers: "Approve Selected"
4. Execute via `Promise.all(selectedIds.map(id => action(id)))`

---

## Priority Summary — Implementation Order

| Order | Item | Platform | Effort | DB Changes |
|:-----:|------|----------|:------:|:----------:|
| 1 | Admin Flash Sale picker + price | Web Admin | Medium | None — uses `discount_campaigns` + `product_discounts` |
| 2 | Order Chat (seller side) | Web + Mobile | Medium | None — uses `conversations` + `messages` |
| 3 | Follow Shop on PDP | Web + Mobile | Small | None — uses `store_followers` |
| 4 | Search no-results CTA | Web | Small | None |
| 5 | Featured Stores on homepage | Mobile | Small | None — queries `sellers` |
| 6 | Product Request confirmation | Mobile | Small | None |
| 7 | Cart per-seller subtotals | Mobile | Small | None |
| 8 | Flash sale per product (seller) | Web | Medium | None — uses `product_discounts` |
| 9 | Orders Today stat | Web | Small | None |
| 10 | Rating filter widget | Web | Small | None |
| 11 | Last Payout card | Web + Mobile | Small | None (mock data) |
| 12 | Admin product requests metric | Web Admin | Small | None (mock data) |
| 13 | Live flash countdown | Web + Mobile | Small | None — reads `discount_campaigns.ends_at` |
| 14 | Mobile order chat real service | Mobile | Small | None — uses `conversations` + `messages` |
| 15 | Admin bulk actions | Web Admin | Medium | None |

---

## Database Migration Status

### Existing Tables — No Changes Needed

All 15 items above use **existing tables**. No ALTER TABLE or new CREATE TABLE is required.

| Feature | Tables Used | Columns Used |
|---------|-------------|-------------|
| Follow Shop | `store_followers` | `buyer_id`, `seller_id` |
| Order Chat | `conversations` | `buyer_id`, `order_id`, `seller_id` |
| Order Chat Messages | `messages` | `conversation_id`, `sender_id`, `sender_type`, `content` |
| Flash Sales | `discount_campaigns` | `seller_id`, `campaign_type`, `starts_at`, `ends_at`, `discount_type`, `discount_value` |
| Flash Sale Products | `product_discounts` | `campaign_id`, `product_id`, `discount_type`, `discount_value` |
| Featured Stores | `sellers` | `id`, `store_name`, `avatar_url`, `approval_status` |

### Post-V1 Migration Needed

| Table | Purpose | When |
|-------|---------|------|
| `product_requests` | Store buyer product requests in DB instead of mock data | Post-V1 |
| `payouts` | Real payout tracking instead of hardcoded earnings | Post-V1 |

**Suggested schema (for reference, NOT needed for V1 launch):**

```sql
-- Post-V1: Product Requests
CREATE TABLE public.product_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  product_name text NOT NULL,
  description text,
  category text,
  image_urls text[],
  vote_count integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','in_progress','fulfilled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_requests_pkey PRIMARY KEY (id),
  CONSTRAINT product_requests_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.buyers(id)
);

-- Post-V1: Payouts
CREATE TABLE public.payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  reference_number text,
  method text NOT NULL DEFAULT 'bank_transfer',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payouts_pkey PRIMARY KEY (id),
  CONSTRAINT payouts_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
```

---

## Estimated Total Effort

| Priority | Items | Est. Time |
|----------|:-----:|:---------:|
| Critical (1-2) | 2 | ~4 hrs |
| High (3-5) | 3 | ~1.5 hrs |
| Medium (6-12) | 7 | ~2.5 hrs |
| Low (13-15) | 3 | ~2 hrs |
| **Total** | **15** | **~10 hrs** |

After completing all 15 items: **155/155 = 100% V1 Complete**.
