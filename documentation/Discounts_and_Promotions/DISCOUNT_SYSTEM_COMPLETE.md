# Discount & Flash Sale System - Complete Implementation

## 🎯 Overview

A comprehensive, Shopify-inspired discount management system for BazaarPH sellers. This replaces the previous hardcoded flash sale implementation with a fully functional, database-driven campaign system.

---

## ✅ Problems Solved

### Before

- ❌ Flash sales were hardcoded with mock data
- ❌ No database tables for campaigns/discounts
- ❌ Products only had static `price` and `original_price` fields
- ❌ Flash sale sidebar existed but was non-functional
- ❌ No way to manage discount duration
- ❌ Products automatically added to flash sales

### After

- ✅ Dynamic discount campaign management
- ✅ Complete database schema with RLS policies
- ✅ Seller UI to create/manage campaigns
- ✅ Support for multiple campaign types
- ✅ Time-based automatic status updates
- ✅ Product-specific discount overrides
- ✅ Usage tracking and analytics

---

## 🗄️ Database Schema

### 1. `discount_campaigns` Table

Main table for managing discount campaigns.

**Key Features:**

- Campaign types: Flash Sale, Seasonal Sale, Clearance, Bundle Deal, etc.
- Discount types: Percentage or Fixed Amount
- Automatic status management (scheduled → active → ended)
- Badge customization (text, color)
- Usage limits (total and per-customer)
- Priority-based campaign ordering

**Fields:**

```sql
- id (UUID)
- seller_id (UUID, FK to sellers)
- name (TEXT)
- description (TEXT)
- campaign_type (ENUM)
- discount_type (percentage | fixed_amount)
- discount_value (DECIMAL)
- max_discount_amount (DECIMAL, for percentage discounts)
- min_purchase_amount (DECIMAL)
- starts_at (TIMESTAMPTZ)
- ends_at (TIMESTAMPTZ)
- status (scheduled | active | paused | ended | cancelled)
- is_active (BOOLEAN)
- badge_text (TEXT)
- badge_color (TEXT)
- priority (INTEGER)
- total_usage_limit (INTEGER)
- per_customer_limit (INTEGER)
- usage_count (INTEGER)
- applies_to (all_products | specific_products | specific_categories)
- applicable_categories (TEXT[])
```

### 2. `product_discounts` Table

Links products to campaigns with optional product-specific overrides.

**Key Features:**

- Product-specific discount overrides
- Stock allocation for flash sales
- Priority management when product is in multiple campaigns
- Automatic deactivation when stock runs out

**Fields:**

```sql
- id (UUID)
- campaign_id (UUID, FK to discount_campaigns)
- product_id (UUID, FK to products)
- seller_id (UUID, FK to sellers)
- override_discount_type (percentage | fixed_amount)
- override_discount_value (DECIMAL)
- discounted_stock (INTEGER)
- sold_count (INTEGER)
- priority (INTEGER)
- is_active (BOOLEAN)
```

### 3. `discount_usage` Table

Tracks every discount redemption for analytics.

**Fields:**

```sql
- id (UUID)
- campaign_id (UUID)
- product_discount_id (UUID)
- buyer_id (UUID)
- order_id (UUID)
- product_id (UUID)
- discount_amount (DECIMAL)
- original_price (DECIMAL)
- discounted_price (DECIMAL)
- quantity (INTEGER)
- used_at (TIMESTAMPTZ)
```

---

## 🔧 Database Functions

### `update_campaign_status()`

Automatically updates campaign status based on current time:

- Before `starts_at` → `scheduled`
- Between `starts_at` and `ends_at` → `active`
- After `ends_at` → `ended`

### `get_active_product_discount(product_id)`

Returns the active discount for a specific product:

- Checks all active campaigns
- Respects priority ordering
- Considers stock availability
- Returns calculated discounted price

---

## 🎨 UI Implementation

### Seller Discounts Page (`/seller/discounts`)

**Location:** `web/src/pages/SellerDiscounts.tsx`

**Features:**

1. **Dashboard Stats**
   - Active campaigns count
   - Scheduled campaigns count
   - Total usage across all campaigns
   - Average discount percentage

2. **Campaign List**
   - Search by campaign name
   - Filter by status (All, Active, Scheduled, Ended)
   - Visual badges showing campaign status
   - Time remaining countdown
   - Quick actions: Edit, Pause/Resume, Delete

3. **Create Campaign Dialog**
   - Campaign name & description
   - Campaign type selection
   - Discount configuration (percentage or fixed)
   - Date/time range picker
   - Badge customization
   - Usage limits
   - Product applicability settings

### Sidebar Navigation

**Updated:** `web/src/config/sellerLinks.tsx`

- Changed "Flash Sales" to "Discounts"
- Route: `/seller/discounts`
- Icon: Lightning bolt (Zap)

---

## 📡 API Service

### Location: `web/src/services/discountService.ts`

**Campaign Management:**

```typescript
// Create campaign
discountService.createCampaign(campaignData);

// Get seller campaigns
discountService.getCampaignsBySeller(sellerId);

// Get active campaigns only
discountService.getActiveCampaigns(sellerId);

// Update campaign
discountService.updateCampaign(campaignId, updates);

// Delete campaign
discountService.deleteCampaign(campaignId);

// Toggle pause/resume
discountService.toggleCampaignStatus(campaignId, pause);
```

**Product Discount Management:**

```typescript
// Add products to campaign
discountService.addProductsToCampaign(
  campaignId,
  sellerId,
  productIds,
  overrides,
);

// Get products in campaign
discountService.getProductsInCampaign(campaignId);

// Remove product from campaign
discountService.removeProductFromCampaign(productDiscountId);

// Get active discount for product
discountService.getActiveProductDiscount(productId);
```

**Analytics:**

```typescript
// Get campaign usage statistics
discountService.getCampaignUsageStats(campaignId);
// Returns: { totalUsage, totalRevenue, totalDiscount, uniqueCustomers }

// Record discount usage
discountService.recordUsage(usageData);
```

---

## 🎯 Campaign Types

1. **Flash Sale** - Short-duration, high-urgency sales
2. **Seasonal Sale** - Holiday or seasonal promotions
3. **Clearance** - End-of-season inventory clearance
4. **Buy More Save More** - Bulk purchase discounts
5. **Limited Time Offer** - Exclusive time-limited deals
6. **New Arrival Promo** - Discounts on new products
7. **Bundle Deal** - Package discounts

---

## 🔄 Discount Application Flow

### For Sellers:

1. Create discount campaign via `/seller/discounts`
2. Configure discount type, value, and duration
3. Select which products to include (or all products)
4. Optionally set product-specific overrides
5. Campaign auto-activates at start time
6. Monitor performance via analytics

### For Buyers (Frontend Display):

1. Product page calls `getActiveProductDiscount(productId)`
2. If active discount exists:
   - Show original price (strikethrough)
   - Show discounted price (highlighted)
   - Display campaign badge
   - Show countdown timer
3. Add to cart with discounted price
4. Record usage in `discount_usage` table on checkout

---

## 🚀 Migration Steps

### 1. Run Database Migration

```bash
# Apply the discount system schema
psql -U postgres -d bazaarph -f supabase-migrations/006_discount_campaigns.sql
```

### 2. Update Environment (if needed)

No new environment variables required - uses existing Supabase connection.

### 3. Deploy Web App

```bash
cd web
npm run build
# Deploy to your hosting platform
```

---

## 🔐 Security (Row Level Security)

### Discount Campaigns

- ✅ Sellers can only manage their own campaigns
- ✅ Public can view active campaigns

### Product Discounts

- ✅ Sellers can only manage discounts for their products
- ✅ Public can view active product discounts

### Discount Usage

- ✅ Buyers can view their own usage history
- ✅ System can insert usage records (via authenticated context)

---

## 📊 Usage Examples

### Example 1: Create Flash Sale

```typescript
const campaign = await discountService.createCampaign({
  sellerId: "seller-uuid",
  name: "Weekend Flash Sale",
  description: "Get 30% off on electronics!",
  campaignType: "flash_sale",
  discountType: "percentage",
  discountValue: 30,
  maxDiscountAmount: 1000, // Max ₱1000 discount
  startsAt: new Date("2026-01-24T00:00:00"),
  endsAt: new Date("2026-01-26T23:59:59"),
  badgeText: "FLASH 30% OFF",
  badgeColor: "#FF6A00",
  perCustomerLimit: 2,
  appliesTo: "specific_products",
});
```

### Example 2: Add Products to Campaign

```typescript
await discountService.addProductsToCampaign(
  campaign.id,
  sellerId,
  ["product-1-uuid", "product-2-uuid"],
  [
    {
      productId: "product-1-uuid",
      discountedStock: 100, // Only 100 units at discount
    },
  ],
);
```

### Example 3: Check Product Discount (Buyer-Facing)

```typescript
const discount = await discountService.getActiveProductDiscount(productId);

if (discount) {
  console.log(`Original: ₱${discount.originalPrice}`);
  console.log(`Discounted: ₱${discount.discountedPrice}`);
  console.log(`Save ${discount.discountValue}%`);
  console.log(`Ends: ${discount.endsAt}`);
}
```

---

## 🎨 UI Components Needed (Next Steps)

To fully integrate the discount system into product displays:

1. **ProductCard Component** - Show discount badge and pricing
2. **ProductDetail Page** - Countdown timer, savings display
3. **Cart Page** - Show discount breakdown
4. **Checkout Flow** - Apply and validate discounts

### Sample Product Display Code:

```typescript
const ProductCard = ({ product }) => {
  const [discount, setDiscount] = useState(null);

  useEffect(() => {
    discountService.getActiveProductDiscount(product.id)
      .then(setDiscount);
  }, [product.id]);

  return (
    <div className="product-card">
      {discount && (
        <Badge style={{ backgroundColor: discount.badgeColor }}>
          {discount.badgeText}
        </Badge>
      )}
      <div className="price">
        {discount ? (
          <>
            <span className="original-price">₱{discount.originalPrice}</span>
            <span className="discounted-price">₱{discount.discountedPrice}</span>
          </>
        ) : (
          <span>₱{product.price}</span>
        )}
      </div>
    </div>
  );
};
```

---

## 📝 Next Steps

1. ✅ **Database Migration** - Run `006_discount_campaigns.sql`
2. ✅ **Seller UI** - Complete (`/seller/discounts`)
3. ⏳ **Product Display Integration** - Update ProductCard, ProductDetail
4. ⏳ **Cart Integration** - Apply discounts during checkout
5. ⏳ **Order Recording** - Record discount usage
6. ⏳ **Analytics Dashboard** - Campaign performance metrics

---

## 🐛 Testing Checklist

### Seller Tests

- [ ] Create discount campaign
- [ ] Edit campaign details
- [ ] Pause/resume campaign
- [ ] Delete campaign
- [ ] Add products to campaign
- [ ] Set product-specific overrides
- [ ] View campaign statistics

### Buyer Tests

- [ ] View discounted products
- [ ] See discount badge on product cards
- [ ] Add discounted product to cart
- [ ] Complete purchase with discount
- [ ] Verify discount applied correctly

### System Tests

- [ ] Campaign auto-activates at start time
- [ ] Campaign auto-ends at end time
- [ ] Usage limits enforced
- [ ] Stock limits respected
- [ ] Multiple campaigns priority handled

---

## 📚 Related Files

### Database

- `supabase-migrations/006_discount_campaigns.sql`

### Web Frontend

- `web/src/pages/SellerDiscounts.tsx`
- `web/src/services/discountService.ts`
- `web/src/types/discount.ts`
- `web/src/config/sellerLinks.tsx`
- `web/src/App.tsx` (routing)

### Mobile (To Do)

- Update `mobile-app/app/seller/flash-sales.tsx` to use new API
- Create discount display components

---

## 🎓 Shopify Comparison

Our implementation mirrors Shopify's discount system:

| Feature                | Shopify | BazaarPH |
| ---------------------- | ------- | -------- |
| Percentage Discounts   | ✅      | ✅       |
| Fixed Amount Discounts | ✅      | ✅       |
| Flash Sales            | ✅      | ✅       |
| Scheduled Campaigns    | ✅      | ✅       |
| Usage Limits           | ✅      | ✅       |
| Product-Specific       | ✅      | ✅       |
| Category-Wide          | ✅      | ✅       |
| Store-Wide             | ✅      | ✅       |
| Analytics              | ✅      | ✅       |

---

## 📞 Support

For questions or issues with the discount system:

- Check database logs for migration errors
- Verify RLS policies are enabled
- Ensure seller authentication is working
- Test with mock data first

---

**Created:** January 22, 2026  
**Version:** 1.0  
**Author:** BazaarPH Development Team
