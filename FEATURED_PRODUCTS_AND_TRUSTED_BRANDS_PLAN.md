# Featured Products Advertising & Trusted Brands QA Bypass

## Overview
Two interconnected features:
1. **Seller Featured Products** — Sellers can advertise/promote their products to appear in a "Featured Products" section on the Shop page (web) and Home screen (mobile), displayed below Flash Sales.
2. **Admin Trusted Brands / QA Bypass** — Admin can designate sellers as "Trusted Brands" so their products automatically bypass the QA assessment process and are instantly verified.

---

## Current Database State

### Existing Tables Used
| Table | Purpose |
|-------|---------|
| `products` | All products, has `approval_status` column |
| `sellers` | Seller accounts |
| `seller_tiers` | Existing tier system (`standard`, `premium_outlet`), has `bypasses_assessment` boolean |
| `product_assessments` | QA workflow: `pending_digital_review` → `verified` |
| `product_discounts` / `discount_campaigns` | Flash sale system (for reference) |

### Existing QA Bypass Logic
- `seller_tiers` table already exists with `tier_level` and `bypasses_assessment` columns
- `qaService.isPremiumOutlet()` checks if seller has `premium_outlet` tier with `bypasses_assessment = true`
- `qaService.createQAEntry()` auto-sets status to `verified` if `isPremiumOutlet()` returns true
- **Gap:** No admin UI to manage this. No "Trusted Brand" concept yet — only `premium_outlet` tier exists.

---

## Database Changes

### New Table: `featured_products`
```sql
CREATE TABLE public.featured_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  featured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT featured_products_product_id_unique UNIQUE (product_id)
);
```

### Alter Table: `seller_tiers`
Add `trusted_brand` tier level to the existing check constraint:
```sql
ALTER TABLE public.seller_tiers 
  DROP CONSTRAINT IF EXISTS seller_tiers_tier_level_check;
ALTER TABLE public.seller_tiers 
  ADD CONSTRAINT seller_tiers_tier_level_check 
  CHECK (tier_level IN ('standard', 'premium_outlet', 'trusted_brand'));
```

---

## Implementation Plan

### Phase 1: Database Migration
- File: `supabase-migrations/011_featured_products_and_trusted_brands.sql`
- Creates `featured_products` table
- Updates `seller_tiers` tier_level check to include `trusted_brand`
- Adds indexes and RLS policies

### Phase 2: Web — Seller Featured Products Management
- **Where:** Seller Dashboard → Products page (`SellerProducts.tsx`)
- **What:** Add a "Feature" / "Unfeature" action in each product's dropdown menu
- **Service:** New `featuredProductService.ts` with `featureProduct()`, `unfeatureProduct()`, `getSellerFeaturedProducts()`, `getFeaturedProducts()`

### Phase 3: Web — Shop Page Featured Products Section
- **Where:** `ShopPage.tsx`, below Flash Sale section, above `#shop-content`
- **What:** New "Featured Products" section showing featured products in a grid
- **Data:** Fetched via `featuredProductService.getFeaturedProducts()`

### Phase 4: Mobile — Home Screen Featured Products Section
- **Where:** `HomeScreen.tsx`, between "Featured Stores" and "Popular Items"
- **What:** Horizontal scroll of featured products with "Featured" badge
- **Data:** Same `getFeaturedProducts()` from mobile `featuredProductService`

### Phase 5: Admin — Trusted Brands Management
- **Where:** New admin page `AdminTrustedBrands.tsx` at `/admin/trusted-brands`
- **What:** List all sellers, toggle "Trusted Brand" status, shows QA bypass indicator
- **Logic:** When admin marks seller as trusted brand → upserts `seller_tiers` with `tier_level = 'trusted_brand'` and `bypasses_assessment = true`
- **Effect:** All new products from trusted brands auto-verify (uses existing `qaService.createQAEntry()` logic)
- Also add sidebar link in `AdminSidebar.tsx`

### Phase 6: QA Bypass Wiring
- Update `qaService.isPremiumOutlet()` → `qaService.isTrustedSeller()` to also check for `trusted_brand` tier
- Both `premium_outlet` and `trusted_brand` tiers bypass assessment

---

## UI Specifications

### Seller Products — Feature Toggle
- Product dropdown menu: "⭐ Feature Product" / "Remove from Featured"
- Max 6 featured products per seller (configurable)
- Only approved products can be featured

### Shop Page — Featured Products Section
- Appears below Flash Sale, above main product grid
- Header: "⭐ Featured Products" with "View All" link
- Grid: 2-6 products, same `ProductCard` as other sections
- "Featured" badge on cards

### Mobile Home — Featured Products Section
- Between "Featured Stores" and "Popular Items"
- Horizontal scroll carousel
- "Featured" badge overlay on product cards

### Admin Trusted Brands Page
- Table of all sellers with columns: Store Name, Status, Products Count, Trusted Brand toggle
- Search/filter functionality
- Toggle switch to mark/unmark trusted brands
- Info banner explaining QA bypass behavior
