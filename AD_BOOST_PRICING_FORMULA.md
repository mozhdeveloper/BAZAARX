# BazaarX Ad Boost — Dynamic Pricing Formula

> **Version:** 1.0  
> **Date:** February 27, 2026  
> **Status:** Beta (FREE period — all prices simulated)  
> **Currency:** PHP (₱)

---

## Overview

BazaarX's Ad Boost system uses a **dynamic, marketplace-driven pricing model** inspired by **Shopee Ads** and **Lazada Sponsored Discovery**. Instead of flat-rate pricing, costs are computed in real-time based on marketplace health metrics — ensuring prices are **fair**, **competitive**, and **responsive to supply & demand**.

---

## Core Formula

```
CostPerDay = BaseRate × CategoryDemandMultiplier × CompetitionFactor × SeasonalIndex × (1 − DurationDiscount)
```

```
TotalCost = CostPerDay × DurationDays
```

---

## Variable Definitions

### 1. Base Rate (₱/day)

Fixed platform rate per boost placement type. These represent the **minimum floor price** before any dynamic multipliers.

| Boost Type | Base Rate | Description |
|---|---|---|
| **Featured Products** | ₱12/day | Product appears in the "Featured Products" sponsored section on `/shop` |
| **Search Priority** | ₱20/day | Product ranks higher in search results and category listings |
| **Homepage Banner** | ₱45/day | Premium placement on the homepage hero area |
| **Category Spotlight** | ₱28/day | Highlighted at the top of its category page |

**Benchmark:** Shopee Ads charge ₱0.30–₱2.00 per click (roughly ₱10–₱50/day). Lazada Sponsored Products charge ₱0.50–₱3.00 per click.

---

### 2. Category Demand Multiplier (×0.80 – ×2.00)

Measures how "hot" a category is based on the ratio of active buyers to available products.

```
demandRatio = activeUsersInCategory / productsInCategory
multiplier  = clamp(demandRatio / baselineDemand, 0.80, 2.00)
```

Where `baselineDemand = 4.0` (expected healthy ratio: 4 users per product).

| Scenario | Users | Products | Ratio | Multiplier | Effect |
|---|---|---|---|---|---|
| Low Demand | 50 | 100 | 0.5 | ×0.80 | 20% discount — encourage sellers to boost |
| Normal | 180 | 45 | 4.0 | ×1.00 | Baseline pricing |
| High Demand | 400 | 30 | 13.3 | ×2.00 | 2× premium — scarce supply, many buyers |

**Rationale:** When demand is high (many buyers, few products), ad space is more valuable. When demand is low, pricing drops to incentivize seller advertising and boost marketplace activity.

---

### 3. Competition Factor (×1.00 – ×1.50)

When more sellers are actively competing for the same boost slot type, prices increase.

```
occupancyRate = activeBoostsForType / maxSlotsForType
factor        = 1.0 + (occupancyRate × 0.5)
```

| Boost Type | Max Slots | Active Boosts | Occupancy | Factor |
|---|---|---|---|---|
| Featured Products | 6 | 0 | 0% | ×1.00 |
| Featured Products | 6 | 3 | 50% | ×1.25 |
| Featured Products | 6 | 6 | 100% | ×1.50 |
| Homepage Banner | 3 | 2 | 67% | ×1.33 |
| Search Priority | 20 | 5 | 25% | ×1.13 |

**Max Slots per Type:**

| Type | Max Slots | Reason |
|---|---|---|
| Featured Products | 6 | 6-card grid on shop page |
| Search Priority | 20 | Top 20 search positions |
| Homepage Banner | 3 | 3 hero banner slots |
| Category Spotlight | 8 | 8 positions per category |

**Rationale:** Like Google Ads and Shopee's CPC model, ad space is auction-driven. When slots fill up, remaining slots become more expensive — encouraging sellers to act early and creating urgency.

---

### 4. Seasonal Index (×0.90 – ×1.80)

Adjusts pricing based on temporal purchasing patterns.

```
seasonalIndex = dayOfWeekMultiplier × paydayBonus × holidayBonus
```

**Day-of-Week Multipliers:**

| Day | Multiplier | Reason |
|---|---|---|
| Monday–Thursday | ×1.00 | Baseline weekday traffic |
| Friday | ×1.10 | Pre-weekend shopping surge |
| Saturday | ×1.20 | Peak shopping day |
| Sunday | ×1.15 | Moderate weekend shopping |

**Payday Period Bonus (+20%):**
- Triggered around the 1st, 15th, and 30th of each month (±2 days)
- Filipino consumers typically shop more during payday periods

**Holiday Season Bonus (+15%):**
- Active during November and December
- Accounts for 11.11, Black Friday, 12.12, Christmas shopping

**Combined Example:**
```
Saturday (×1.20) × Payday (×1.20) × December (×1.15) = ×1.66
```

**Rationale:** Aligned with Filipino e-commerce purchasing behavior. Shopee and Lazada both charge higher CPCs during sale events (11.11, 12.12, payday sales).

---

### 5. Duration Discount

Incentivizes longer commitments with tiered discounts.

| Duration | Discount | Effective Multiplier |
|---|---|---|
| 3 Days | 0% | ×1.00 |
| 7 Days | 0% | ×1.00 |
| 14 Days | 15% | ×0.85 |
| 30 Days | 25% | ×0.75 |

**Rationale:** Matches Shopee's campaign discount model — longer campaigns get better rates. This also improves ad inventory planning and seller retention.

---

## Performance Estimates

For each boost, the system provides estimated performance metrics.

### Average Daily Impressions per Slot

| Boost Type | Daily Impressions | Source |
|---|---|---|
| Featured Products | 800 | Shop page traffic |
| Search Priority | 500 | Search result views |
| Homepage Banner | 2,000 | Homepage traffic |
| Category Spotlight | 600 | Category page views |

### Click-Through Rate (CTR)

Industry benchmarks adapted for Philippine marketplace:

| Boost Type | Avg CTR | Benchmark |
|---|---|---|
| Featured Products | 2.5% | Shopee Featured: 2–3% |
| Search Priority | 3.5% | Intent-driven, higher conversion |
| Homepage Banner | 1.8% | Awareness placement, lower CTR |
| Category Spotlight | 3.0% | Category browsing behavior |

### Derived Metrics

```
Estimated Clicks    = Impressions × CTR
Estimated CPM       = (TotalCost / Impressions) × 1,000
Estimated CPC       = TotalCost / Clicks
Estimated Orders    = Clicks × ConversionRate   (ConversionRate = 3.5%)
Estimated Revenue   = Orders × AvgOrderValue    (AOV = ₱850)
Estimated ROAS      = Revenue / TotalCost
```

### Example: Featured Products, 7 Days

| Metric | Value |
|---|---|
| **Base Rate** | ₱12.00/day |
| **Category Demand** | ×1.00 (normal) |
| **Competition** | ×1.17 (2/6 slots filled) |
| **Seasonal** | ×1.00 (weekday, no payday) |
| **Duration Discount** | 0% |
| **Cost Per Day** | ₱14.04 |
| **Total Cost** | ₱98.28 |
| **Impressions** | 5,600 |
| **Est. Clicks** | 140 |
| **CPM** | ₱17.55 |
| **CPC** | ₱0.70 |
| **Est. Orders** | 5 |
| **Est. Revenue** | ₱4,250 |
| **ROAS** | 43.2× |

---

## Pricing Comparison vs. Competitors

| Platform | Model | Typical Daily Cost | CPM Range | CPC Range |
|---|---|---|---|---|
| **Shopee Ads** | CPC Auction | ₱50–₱500 | ₱5–₱30 | ₱0.30–₱2.00 |
| **Lazada Sponsored** | CPC + CPM | ₱100–₱1,000 | ₱10–₱50 | ₱0.50–₱3.00 |
| **BazaarX Boost** | Dynamic Daily Rate | ₱12–₱70 | ₱15–₱30 | ₱0.40–₱1.50 |

**BazaarX is positioned for small-to-medium sellers** with affordable daily rates, transparent pricing, and no minimum spend — making it accessible for new sellers while remaining competitive.

---

## Implementation Details

### Files

| File | Purpose |
|---|---|
| `web/src/services/adBoostService.ts` | Core pricing engine, service methods, Supabase integration |
| `web/src/pages/SellerBoostProduct.tsx` | Seller-facing boost management UI |
| `web/src/pages/ShopPage.tsx` | Buyer-facing Featured Products display |
| `web/src/services/featuredProductService.ts` | Featured products data fetching |
| `mobile-app/src/services/adBoostService.ts` | Mobile boost service (mirrors web) |
| `supabase-migrations/012_product_ad_boosts.sql` | Database schema |

### Database Schema: `product_ad_boosts`

```sql
CREATE TABLE product_ad_boosts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id),
  seller_id       UUID NOT NULL REFERENCES sellers(id),
  boost_type      TEXT NOT NULL,        -- 'featured' | 'search_priority' | 'homepage_banner' | 'category_spotlight'
  duration_days   INT  NOT NULL DEFAULT 7,
  daily_budget    NUMERIC(12,2) DEFAULT 0,
  total_budget    NUMERIC(12,2) DEFAULT 0,
  cost_per_day    NUMERIC(12,2) DEFAULT 0,
  total_cost      NUMERIC(12,2) DEFAULT 0,
  currency        TEXT DEFAULT 'PHP',
  status          TEXT NOT NULL DEFAULT 'draft',  -- 'draft' | 'active' | 'paused' | 'ended' | 'cancelled'
  starts_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at         TIMESTAMPTZ NOT NULL,
  paused_at       TIMESTAMPTZ,
  impressions     INT DEFAULT 0,
  clicks          INT DEFAULT 0,
  orders_generated INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

### Future Enhancements

1. **Real-time marketplace metrics** — Replace simulated `getMarketplaceMetrics()` with live DB queries aggregating actual user traffic, product counts, and active boosts
2. **CPC Auction Model** — Allow sellers to set CPC bids (like Shopee Ads) for search priority placements
3. **Budget Pacing** — Spread daily budget evenly across hours to prevent rapid depletion
4. **A/B Testing** — Auto-optimize ad creative (image, title) based on CTR performance
5. **Seller Analytics Dashboard** — ROI tracking, conversion funnels, audience insights
6. **Category-level base rates** — Higher base rates for competitive categories (Electronics, Fashion)

---

## Beta Period

During the beta period:
- **All boosts are FREE** (₱0.00 charged)
- Simulated pricing is displayed to educate sellers on how pricing will work
- Performance metrics (impressions, clicks, orders) are tracked in real-time
- The `IS_FREE_PERIOD` flag in `adBoostService.ts` controls this behavior

When ready to monetize, set `IS_FREE_PERIOD = false` and connect a payment gateway.

---

*Document generated for BazaarX marketplace — Shopee/Lazada-style ad boost system.*
