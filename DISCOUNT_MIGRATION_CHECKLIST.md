# Discount System Migration Checklist

## Pre-Migration

- [ ] Backup current database
- [ ] Review current flash sale implementation
- [ ] Note any products with hardcoded discounts
- [ ] Export any existing discount data

---

## Database Migration

### Step 1: Run Migration

```bash
# Connect to your Supabase project
cd supabase-migrations

# Run the discount system migration
psql $DATABASE_URL -f 006_discount_campaigns.sql

# Or using Supabase CLI
supabase db push
```

### Step 2: Verify Tables Created

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('discount_campaigns', 'product_discounts', 'discount_usage');

-- Should return 3 rows
```

### Step 3: Verify Indexes

```sql
-- Check indexes created
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('discount_campaigns', 'product_discounts', 'discount_usage');
```

### Step 4: Verify Functions

```sql
-- Check functions exist
SELECT proname
FROM pg_proc
WHERE proname IN ('update_campaign_status', 'get_active_product_discount');

-- Should return 2 rows
```

### Step 5: Verify Triggers

```sql
-- Check triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('discount_campaigns', 'product_discounts');
```

### Step 6: Test RLS Policies

```sql
-- Check RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('discount_campaigns', 'product_discounts', 'discount_usage');

-- All should have rowsecurity = true
```

---

## Frontend Deployment

### Step 1: Update Dependencies

```bash
cd web
npm install
```

### Step 2: Verify New Files Created

- [ ] `web/src/pages/SellerDiscounts.tsx`
- [ ] `web/src/services/discountService.ts`
- [ ] `web/src/types/discount.ts`

### Step 3: Verify Updated Files

- [ ] `web/src/config/sellerLinks.tsx` (Flash Sales → Discounts)
- [ ] `web/src/App.tsx` (Added /seller/discounts route)

### Step 4: Build and Test

```bash
# Development mode
npm run dev

# Test the discounts page
# Navigate to: http://localhost:5173/seller/discounts

# Production build
npm run build
```

### Step 5: Deploy to Production

```bash
# Example deployment commands (adjust for your platform)
npm run build
# Then deploy the dist/ folder to your hosting
```

---

## Data Migration (Optional)

### Migrate Existing Flash Sales to Campaigns

If you have existing flash sale data to migrate:

```sql
-- Example: Convert hardcoded flash sales to campaigns
-- Adjust based on your current data structure

INSERT INTO public.discount_campaigns (
  seller_id,
  name,
  description,
  campaign_type,
  discount_type,
  discount_value,
  starts_at,
  ends_at,
  status,
  badge_text,
  badge_color
)
SELECT
  seller_id,
  'Migrated Flash Sale',
  'Auto-migrated from previous flash sale system',
  'flash_sale',
  'percentage',
  30, -- Adjust discount value
  NOW(),
  NOW() + INTERVAL '7 days',
  'active',
  'FLASH SALE',
  '#FF6A00'
FROM public.sellers
WHERE has_active_flash_sale = true; -- Adjust condition
```

---

## Testing Checklist

### Database Tests

#### Test 1: Create Campaign

```sql
-- Insert test campaign
INSERT INTO public.discount_campaigns (
  seller_id,
  name,
  campaign_type,
  discount_type,
  discount_value,
  starts_at,
  ends_at
) VALUES (
  (SELECT id FROM public.sellers LIMIT 1),
  'Test Campaign',
  'flash_sale',
  'percentage',
  25,
  NOW(),
  NOW() + INTERVAL '1 day'
);

-- Verify created
SELECT * FROM public.discount_campaigns WHERE name = 'Test Campaign';
```

- [ ] Campaign created successfully
- [ ] Status is 'active' (because NOW() is between starts_at and ends_at)
- [ ] created_at and updated_at are set

#### Test 2: Add Product to Campaign

```sql
-- Add product to campaign
INSERT INTO public.product_discounts (
  campaign_id,
  product_id,
  seller_id
) VALUES (
  (SELECT id FROM public.discount_campaigns WHERE name = 'Test Campaign'),
  (SELECT id FROM public.products LIMIT 1),
  (SELECT id FROM public.sellers LIMIT 1)
);

-- Verify
SELECT * FROM public.product_discounts WHERE campaign_id IN (
  SELECT id FROM public.discount_campaigns WHERE name = 'Test Campaign'
);
```

- [ ] Product discount created
- [ ] is_active is true
- [ ] sold_count is 0

#### Test 3: Get Active Discount

```sql
-- Test the get_active_product_discount function
SELECT * FROM get_active_product_discount(
  (SELECT id FROM public.products LIMIT 1)
);
```

- [ ] Returns discount data
- [ ] discounted_price is calculated correctly
- [ ] badge information is present

#### Test 4: Auto Status Update

```sql
-- Create a future campaign
INSERT INTO public.discount_campaigns (
  seller_id,
  name,
  campaign_type,
  discount_type,
  discount_value,
  starts_at,
  ends_at
) VALUES (
  (SELECT id FROM public.sellers LIMIT 1),
  'Future Campaign',
  'flash_sale',
  'percentage',
  20,
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '2 days'
);

-- Check status
SELECT status FROM public.discount_campaigns WHERE name = 'Future Campaign';
-- Should be 'scheduled'
```

- [ ] Status is 'scheduled' (not active yet)

### Frontend Tests

#### Test 1: Access Discounts Page

- [ ] Navigate to `/seller/discounts`
- [ ] Page loads without errors
- [ ] Stats cards display
- [ ] Can see campaign list (empty or with test data)

#### Test 2: Create Campaign via UI

- [ ] Click "Create Campaign" button
- [ ] Dialog opens
- [ ] Fill in all required fields
- [ ] Submit form
- [ ] Campaign appears in list
- [ ] Success toast shown

#### Test 3: Edit Campaign

- [ ] Click edit button on a campaign
- [ ] Form pre-fills with current data
- [ ] Make changes
- [ ] Save
- [ ] Changes reflected in list

#### Test 4: Toggle Campaign Status

- [ ] Click pause button on active campaign
- [ ] Status changes to 'paused'
- [ ] Badge color updates
- [ ] Click play to resume
- [ ] Status returns to 'active'

#### Test 5: Delete Campaign

- [ ] Click delete button
- [ ] Confirmation dialog appears
- [ ] Confirm deletion
- [ ] Campaign removed from list
- [ ] Success toast shown

### API Tests

#### Test 1: discountService.createCampaign()

```typescript
const campaign = await discountService.createCampaign({
  sellerId: "test-seller-id",
  name: "API Test Campaign",
  campaignType: "flash_sale",
  discountType: "percentage",
  discountValue: 30,
  startsAt: new Date(),
  endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  badgeText: "TEST 30% OFF",
  perCustomerLimit: 1,
  appliesTo: "all_products",
});

console.log("Created:", campaign);
```

- [ ] Returns campaign object
- [ ] ID is generated
- [ ] Dates are properly formatted

#### Test 2: discountService.getCampaignsBySeller()

```typescript
const campaigns = await discountService.getCampaignsBySeller("seller-id");
console.log("Campaigns:", campaigns);
```

- [ ] Returns array of campaigns
- [ ] Only returns campaigns for specified seller
- [ ] Sorted by created_at descending

#### Test 3: discountService.getActiveProductDiscount()

```typescript
const discount = await discountService.getActiveProductDiscount("product-id");
console.log("Active Discount:", discount);
```

- [ ] Returns discount object or null
- [ ] Calculated price is correct
- [ ] Badge info is included

---

## Performance Testing

### Database Performance

```sql
-- Test with 1000 campaigns
INSERT INTO public.discount_campaigns (seller_id, name, campaign_type, discount_type, discount_value, starts_at, ends_at)
SELECT
  (SELECT id FROM public.sellers LIMIT 1),
  'Perf Test ' || generate_series,
  'flash_sale',
  'percentage',
  25,
  NOW(),
  NOW() + INTERVAL '7 days'
FROM generate_series(1, 1000);

-- Test query performance
EXPLAIN ANALYZE
SELECT * FROM get_active_product_discount('product-id');
```

- [ ] Query executes in < 50ms
- [ ] Indexes are being used

### Frontend Performance

- [ ] Discounts page loads in < 2 seconds
- [ ] Campaign list renders smoothly (even with 100+ campaigns)
- [ ] Search/filter is responsive
- [ ] No memory leaks when switching between pages

---

## Rollback Plan

If something goes wrong:

### Rollback Database

```sql
-- Drop the new tables
DROP TABLE IF EXISTS public.discount_usage CASCADE;
DROP TABLE IF EXISTS public.product_discounts CASCADE;
DROP TABLE IF EXISTS public.discount_campaigns CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_campaign_status() CASCADE;
DROP FUNCTION IF EXISTS get_active_product_discount(UUID) CASCADE;
```

### Rollback Frontend

```bash
# Revert Git changes
git revert <commit-hash>

# Or checkout previous version
git checkout <previous-commit>

# Redeploy
npm run build
# Deploy dist/
```

---

## Post-Migration

### Monitor for Issues

- [ ] Check error logs for database errors
- [ ] Monitor API response times
- [ ] Watch for RLS policy violations
- [ ] Track user-reported issues

### Communicate to Sellers

- [ ] Announce new discount management feature
- [ ] Provide tutorial/documentation
- [ ] Offer support during transition
- [ ] Gather feedback

### Optimize if Needed

- [ ] Add more indexes if queries are slow
- [ ] Implement caching if needed
- [ ] Adjust RLS policies based on usage patterns

---

## Success Criteria

✅ Migration is successful if:

1. Database:
   - [ ] All tables created
   - [ ] All indexes in place
   - [ ] Functions working correctly
   - [ ] RLS policies enforced
   - [ ] No errors in logs

2. Frontend:
   - [ ] Sellers can create campaigns
   - [ ] Sellers can edit/delete campaigns
   - [ ] Campaign list displays correctly
   - [ ] No console errors
   - [ ] Mobile responsive

3. Integration:
   - [ ] Products can be added to campaigns
   - [ ] Active discounts are retrieved correctly
   - [ ] Pricing displays properly
   - [ ] Usage is tracked

4. Performance:
   - [ ] Page loads < 2 seconds
   - [ ] Queries execute < 50ms
   - [ ] No lag when interacting with UI

---

## Next Steps After Migration

1. **Product Display Integration**
   - Update ProductCard components
   - Add discount badges
   - Show countdown timers

2. **Cart Integration**
   - Apply discounts at checkout
   - Validate discounts before payment
   - Record usage after purchase

3. **Analytics**
   - Add campaign performance dashboard
   - Track conversion rates
   - Monitor discount ROI

4. **Mobile App**
   - Update mobile product cards
   - Add discount management to seller app
   - Test on iOS/Android

5. **Documentation**
   - Create seller guide
   - Add API documentation
   - Write troubleshooting guide

---

**Migration Date:** ******\_******

**Performed By:** ******\_******

**Status:** ⬜ Pending | ⬜ In Progress | ⬜ Complete | ⬜ Rolled Back

**Notes:**

---

---

---
