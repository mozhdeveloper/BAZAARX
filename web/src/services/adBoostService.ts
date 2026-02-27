/**
 * Ad Boost Service — Seller Product Advertising
 * Shopee/Lazada-style product boost system
 *
 * ═══ DYNAMIC PRICING MODEL (PHP — Marketplace-Driven) ═══
 *
 * Inspired by Shopee Ads & Lazada Sponsored Discovery, pricing is computed
 * dynamically based on marketplace health metrics:
 *
 *   CostPerDay = BaseRate × CategoryDemandMultiplier × CompetitionFactor × SeasonalIndex × (1 − DurationDiscount)
 *
 * Where:
 *   BaseRate               = Fixed platform rate per boost type (₱12 – ₱45/day)
 *   CategoryDemandMultiplier = fn(activeUsersInCategory / totalProducts) → 0.8 – 2.0
 *   CompetitionFactor      = fn(activeBoostsInSlot / maxSlots)           → 1.0 – 1.5
 *   SeasonalIndex          = Day-of-week / holiday multiplier            → 0.9 – 1.4
 *   DurationDiscount       = 0% (3d), 0% (7d), 15% (14d), 25% (30d)
 *
 * Currently FREE — all orders cost ₱0 but display simulated pricing.
 * See AD_BOOST_PRICING_FORMULA.md for full documentation.
 */

import { supabase, isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';

// Helper: use supabaseAdmin if available, otherwise fall back to supabase (anon)
const getClient = () => supabaseAdmin || supabase;

// ─── Types ───────────────────────────────────────────────────────────────────

export type BoostType = 'featured' | 'search_priority' | 'homepage_banner' | 'category_spotlight';
export type BoostStatus = 'draft' | 'active' | 'paused' | 'ended' | 'cancelled';

export interface AdBoost {
  id: string;
  product_id: string;
  seller_id: string;
  boost_type: BoostType;
  duration_days: number;
  daily_budget: number;
  total_budget: number;
  cost_per_day: number;
  total_cost: number;
  currency: string;
  status: BoostStatus;
  starts_at: string;
  ends_at: string;
  paused_at: string | null;
  impressions: number;
  clicks: number;
  orders_generated: number;
  created_at: string;
  updated_at: string;
}

export interface AdBoostWithProduct extends AdBoost {
  product: {
    id: string;
    name: string;
    price: number;
    approval_status: string;
    disabled_at: string | null;
    images: { id: string; image_url: string; is_primary: boolean }[];
    category: { id: string; name: string } | null;
    seller: { id: string; store_name: string; avatar_url: string | null } | null;
    reviews: { rating: number }[];
    variants: { stock: number }[];
  };
}

export interface BoostPriceEstimate {
  boostType: BoostType;
  boostLabel: string;
  durationDays: number;
  dailyBudget: number;
  costPerDay: number;
  totalCost: number;
  discountPercent: number;
  currency: string;
  isFree: boolean; // Currently always true
  // Dynamic pricing breakdown
  baseRate: number;
  categoryDemandMultiplier: number;
  competitionFactor: number;
  seasonalIndex: number;
  estimatedImpressions: number;
  estimatedCPM: number; // Cost per 1000 impressions
  estimatedClicks: number;
  estimatedCPC: number; // Cost per click
  estimatedROAS: number; // Return on Ad Spend
}

// ─── Dynamic Pricing Constants (PHP) ─────────────────────────────────────────

/**
 * Base rates per boost type — these are the floor prices before multipliers.
 * Benchmarked against Shopee Ads (₱0.30–₱2.00 per click → ₱10–₱50/day)
 * and Lazada Sponsored Products (₱0.50–₱3.00 per click).
 */
const BOOST_BASE_RATES: Record<BoostType, number> = {
  featured:           12,   // ₱12/day — shop page Featured section
  search_priority:    20,   // ₱20/day — higher search ranking
  homepage_banner:    45,   // ₱45/day — premium homepage placement
  category_spotlight: 28,   // ₱28/day — category page highlight
};

/**
 * Maximum slots per boost type — drives competition factor.
 * When more sellers compete for limited slots, price increases.
 */
const MAX_SLOTS: Record<BoostType, number> = {
  featured:           6,    // 6 featured product slots on shop page
  search_priority:    20,   // 20 priority search positions
  homepage_banner:    3,    // 3 homepage banner slots
  category_spotlight: 8,    // 8 spotlight positions per category
};

/**
 * Average daily impressions per slot — used for CPM / CPC estimation.
 * Based on typical marketplace traffic patterns.
 */
const AVG_DAILY_IMPRESSIONS: Record<BoostType, number> = {
  featured:           800,
  search_priority:    500,
  homepage_banner:    2000,
  category_spotlight: 600,
};

/**
 * Average CTR (Click-through rate) per placement type.
 * Industry benchmarks: Shopee Ads ~1.5-3%, Lazada ~1-2.5%
 */
const AVG_CTR: Record<BoostType, number> = {
  featured:           0.025,  // 2.5%
  search_priority:    0.035,  // 3.5% (intent-driven)
  homepage_banner:    0.018,  // 1.8% (awareness)
  category_spotlight: 0.030,  // 3.0%
};

/**
 * Average conversion rate from click to order.
 * Shopee typical: 2-5% conversion rate
 */
const AVG_CONVERSION_RATE = 0.035; // 3.5%

/**
 * Average order value (AOV) for ROAS estimation.
 */
const AVG_ORDER_VALUE = 850; // ₱850

export const BOOST_TYPE_LABELS: Record<BoostType, string> = {
  featured:           'Featured Products',
  search_priority:    'Search Priority',
  homepage_banner:    'Homepage Banner',
  category_spotlight: 'Category Spotlight',
};

export const BOOST_TYPE_DESCRIPTIONS: Record<BoostType, string> = {
  featured:           'Your product appears in the Featured Products section on the shop page.',
  search_priority:    'Your product ranks higher in search results and category listings.',
  homepage_banner:    'Your product gets premium placement on the homepage hero area.',
  category_spotlight: 'Your product is highlighted at the top of its category page.',
};

export const DURATION_OPTIONS = [
  { days: 3,  label: '3 Days',  discount: 0 },
  { days: 7,  label: '7 Days',  discount: 0 },
  { days: 14, label: '14 Days', discount: 15 },
  { days: 30, label: '30 Days', discount: 25 },
];

const IS_FREE_PERIOD = true; // Set to false when ready to charge

// ─── Marketplace Health Metrics (simulated — will be replaced with real DB queries) ──

interface MarketplaceMetrics {
  totalActiveUsers: number;
  totalProducts: number;
  activeBoostsByType: Record<BoostType, number>;
  categoryProductCount: number;
  categoryActiveUsers: number;
}

/**
 * Returns simulated marketplace metrics.
 * In production, these would come from real analytics tables.
 */
function getMarketplaceMetrics(): MarketplaceMetrics {
  return {
    totalActiveUsers: 1200,
    totalProducts: 350,
    activeBoostsByType: {
      featured: 2,
      search_priority: 5,
      homepage_banner: 1,
      category_spotlight: 3,
    },
    categoryProductCount: 45,
    categoryActiveUsers: 180,
  };
}

/**
 * Category Demand Multiplier
 * ──────────────────────────
 * Measures how "hot" a category is based on user-to-product ratio.
 *
 *   demandRatio = activeUsersInCategory / productsInCategory
 *   multiplier  = clamp(demandRatio / baselineDemand, 0.8, 2.0)
 *
 * High demand (many users, few products) → multiplier up to 2.0×
 * Low demand  (few users, many products) → multiplier down to 0.8×
 */
function getCategoryDemandMultiplier(metrics: MarketplaceMetrics): number {
  const baselineDemand = 4.0; // Expected ratio: 4 users per product
  const demandRatio = metrics.categoryActiveUsers / Math.max(metrics.categoryProductCount, 1);
  return Math.min(2.0, Math.max(0.8, demandRatio / baselineDemand));
}

/**
 * Competition Factor
 * ──────────────────
 * When more sellers compete for the same slot type, prices rise.
 *
 *   occupancyRate = activeBoosts / maxSlots
 *   factor = 1.0 + (occupancyRate × 0.5)
 *
 * 0% occupancy → 1.0× (no premium)
 * 50% occupancy → 1.25×
 * 100% occupancy → 1.5× (maximum premium)
 */
function getCompetitionFactor(boostType: BoostType, metrics: MarketplaceMetrics): number {
  const activeBoosts = metrics.activeBoostsByType[boostType] || 0;
  const maxSlots = MAX_SLOTS[boostType];
  const occupancy = Math.min(activeBoosts / maxSlots, 1.0);
  return 1.0 + (occupancy * 0.5);
}

/**
 * Seasonal Index
 * ──────────────
 * Adjusts pricing based on day-of-week and peak periods.
 *
 * Weekdays (Mon–Thu): 1.0× (baseline)
 * Friday:             1.1× (pre-weekend shopping)
 * Saturday:           1.2× (peak shopping day)
 * Sunday:             1.15× (moderate shopping)
 * Payday periods (1st, 15th, 30th of month): +20% bonus
 * Holiday months (Nov, Dec): +15% bonus
 */
function getSeasonalIndex(): number {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
  const dayOfMonth = now.getDate();
  const month = now.getMonth(); // 0=Jan

  // Day-of-week multiplier
  const dayMultipliers = [1.15, 1.0, 1.0, 1.0, 1.0, 1.1, 1.2]; // Sun–Sat
  let index = dayMultipliers[dayOfWeek];

  // Payday period bonus (1st, 15th, 30th ±2 days)
  const isPayday = [1, 2, 3, 14, 15, 16, 29, 30, 31].includes(dayOfMonth);
  if (isPayday) index *= 1.20;

  // Holiday season bonus (November, December)
  if (month === 10 || month === 11) index *= 1.15;

  return Math.min(1.8, Math.max(0.9, Math.round(index * 100) / 100));
}

// ─── Price Calculator ────────────────────────────────────────────────────────

export function calculateBoostPrice(
  boostType: BoostType,
  durationDays: number,
  dailyBudget: number = 0
): BoostPriceEstimate {
  const metrics = getMarketplaceMetrics();
  const baseRate = BOOST_BASE_RATES[boostType];

  // Dynamic multipliers
  const categoryDemandMultiplier = getCategoryDemandMultiplier(metrics);
  const competitionFactor = getCompetitionFactor(boostType, metrics);
  const seasonalIndex = getSeasonalIndex();

  // Duration discount
  let discountPercent = 0;
  if (durationDays >= 30) discountPercent = 25;
  else if (durationDays >= 14) discountPercent = 15;

  const discountMultiplier = 1 - discountPercent / 100;

  // Final cost per day
  let costPerDay = baseRate * categoryDemandMultiplier * competitionFactor * seasonalIndex * discountMultiplier;

  // Budget premium surcharge (if daily budget > ₱200, +₱5/day for priority)
  if (dailyBudget > 200) {
    costPerDay += 5;
  }

  costPerDay = Math.round(costPerDay * 100) / 100;
  const totalCost = Math.round(costPerDay * durationDays * 100) / 100;

  // Performance estimates
  const dailyImpressions = AVG_DAILY_IMPRESSIONS[boostType];
  const estimatedImpressions = dailyImpressions * durationDays;
  const estimatedCPM = totalCost > 0 ? (totalCost / estimatedImpressions) * 1000 : 0;
  const estimatedClicks = Math.round(estimatedImpressions * AVG_CTR[boostType]);
  const estimatedCPC = estimatedClicks > 0 ? totalCost / estimatedClicks : 0;
  const estimatedOrders = Math.round(estimatedClicks * AVG_CONVERSION_RATE);
  const estimatedRevenue = estimatedOrders * AVG_ORDER_VALUE;
  const estimatedROAS = totalCost > 0 ? Math.round((estimatedRevenue / totalCost) * 10) / 10 : 0;

  return {
    boostType,
    boostLabel: BOOST_TYPE_LABELS[boostType],
    durationDays,
    dailyBudget,
    costPerDay,
    totalCost,
    discountPercent,
    currency: 'PHP',
    isFree: IS_FREE_PERIOD,
    baseRate,
    categoryDemandMultiplier: Math.round(categoryDemandMultiplier * 100) / 100,
    competitionFactor: Math.round(competitionFactor * 100) / 100,
    seasonalIndex,
    estimatedImpressions,
    estimatedCPM: Math.round(estimatedCPM * 100) / 100,
    estimatedClicks,
    estimatedCPC: Math.round(estimatedCPC * 100) / 100,
    estimatedROAS,
  };
}

// ─── Service Class ───────────────────────────────────────────────────────────

class AdBoostService {
  /**
   * Get all active boosted products (for buyer storefront display)
   */
  async getActiveBoostedProducts(boostType?: BoostType, limit = 20): Promise<AdBoostWithProduct[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      let query = getClient()
        .from('product_ad_boosts')
        .select(`
          *,
          product:products!inner(
            id, name, price, approval_status, disabled_at,
            images:product_images(id, image_url, is_primary),
            category:categories(id, name),
            seller:sellers(id, store_name, avatar_url),
            reviews(rating),
            variants:product_variants(stock)
          )
        `)
        .eq('status', 'active')
        .is('product.disabled_at', null)
        .eq('product.approval_status', 'approved')
        .gte('ends_at', new Date().toISOString())
        .order('total_budget', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (boostType) {
        query = query.eq('boost_type', boostType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[AdBoostService] getActiveBoostedProducts error:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[AdBoostService] getActiveBoostedProducts exception:', err);
      return [];
    }
  }

  /**
   * Get a seller's boosts (all statuses)
   */
  async getSellerBoosts(sellerId: string): Promise<AdBoostWithProduct[]> {
    if (!isSupabaseConfigured() || !sellerId) return [];

    try {
      const { data, error } = await getClient()
        .from('product_ad_boosts')
        .select(`
          *,
          product:products!inner(
            id, name, price, approval_status, disabled_at,
            images:product_images(id, image_url, is_primary),
            category:categories(id, name),
            seller:sellers(id, store_name, avatar_url),
            reviews(rating),
            variants:product_variants(stock)
          )
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[AdBoostService] getSellerBoosts error:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[AdBoostService] getSellerBoosts exception:', err);
      return [];
    }
  }

  /**
   * Get seller's products available for boosting.
   * Returns ALL non-deleted products so the UI can show them.
   * Products that aren't approved are shown but disabled for selection.
   */
  async getBoostableProducts(sellerId: string): Promise<any[]> {
    if (!isSupabaseConfigured() || !sellerId) return [];

    try {
      const { data, error } = await getClient()
        .from('products')
        .select(`
          id, name, price, approval_status,
          images:product_images(id, image_url, is_primary),
          category:categories(id, name),
          variants:product_variants(stock)
        `)
        .eq('seller_id', sellerId)
        .is('disabled_at', null)
        .is('deleted_at', null)
        .order('name');

      if (error) {
        console.error('[AdBoostService] getBoostableProducts error:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[AdBoostService] getBoostableProducts exception:', err);
      return [];
    }
  }

  /**
   * Create a new boost
   */
  async createBoost(params: {
    productId: string;
    sellerId: string;
    boostType: BoostType;
    durationDays: number;
    dailyBudget?: number;
  }): Promise<AdBoost | null> {
    if (!isSupabaseConfigured()) return null;

    const { productId, sellerId, boostType, durationDays, dailyBudget = 0 } = params;
    const estimate = calculateBoostPrice(boostType, durationDays, dailyBudget);

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

    try {
      const { data, error } = await getClient()
        .from('product_ad_boosts')
        .insert({
          product_id: productId,
          seller_id: sellerId,
          boost_type: boostType,
          duration_days: durationDays,
          daily_budget: dailyBudget,
          total_budget: dailyBudget * durationDays,
          cost_per_day: IS_FREE_PERIOD ? 0 : estimate.costPerDay,
          total_cost: IS_FREE_PERIOD ? 0 : estimate.totalCost,
          currency: 'PHP',
          status: 'active',
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('[AdBoostService] createBoost error:', error);
        return null;
      }

      // Also upsert into featured_products if boost type is 'featured'
      if (boostType === 'featured') {
        await getClient()
          .from('featured_products')
          .upsert({
            product_id: productId,
            seller_id: sellerId,
            is_active: true,
            priority: dailyBudget > 100 ? 2 : 1,
            featured_at: startsAt.toISOString(),
            expires_at: endsAt.toISOString(),
          }, { onConflict: 'product_id' });
      }

      return data;
    } catch (err) {
      console.error('[AdBoostService] createBoost exception:', err);
      return null;
    }
  }

  /**
   * Pause a boost
   */
  async pauseBoost(boostId: string, sellerId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
      const { error } = await getClient()
        .from('product_ad_boosts')
        .update({ status: 'paused', paused_at: new Date().toISOString() })
        .eq('id', boostId)
        .eq('seller_id', sellerId);

      if (error) {
        console.error('[AdBoostService] pauseBoost error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[AdBoostService] pauseBoost exception:', err);
      return false;
    }
  }

  /**
   * Resume a paused boost
   */
  async resumeBoost(boostId: string, sellerId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
      const { error } = await getClient()
        .from('product_ad_boosts')
        .update({ status: 'active', paused_at: null })
        .eq('id', boostId)
        .eq('seller_id', sellerId);

      if (error) {
        console.error('[AdBoostService] resumeBoost error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[AdBoostService] resumeBoost exception:', err);
      return false;
    }
  }

  /**
   * Cancel a boost
   */
  async cancelBoost(boostId: string, sellerId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
      // Get the boost to check if it has a featured_products entry
      const { data: boost } = await getClient()
        .from('product_ad_boosts')
        .select('product_id, boost_type')
        .eq('id', boostId)
        .single();

      const { error } = await getClient()
        .from('product_ad_boosts')
        .update({ status: 'cancelled' })
        .eq('id', boostId)
        .eq('seller_id', sellerId);

      if (error) {
        console.error('[AdBoostService] cancelBoost error:', error);
        return false;
      }

      // Remove from featured_products if it was a featured boost
      if (boost?.boost_type === 'featured' && boost?.product_id) {
        await getClient()
          .from('featured_products')
          .delete()
          .eq('product_id', boost.product_id)
          .eq('seller_id', sellerId);
      }

      return true;
    } catch (err) {
      console.error('[AdBoostService] cancelBoost exception:', err);
      return false;
    }
  }

  /**
   * Increment impressions for a boost (called when product is viewed)
   */
  async trackImpression(boostId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    try {
      await getClient().rpc('increment_boost_impressions', { boost_id: boostId }).maybeSingle();
    } catch {
      // silent — analytics are non-critical
    }
  }

  /**
   * Increment clicks for a boost
   */
  async trackClick(boostId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    try {
      await getClient().rpc('increment_boost_clicks', { boost_id: boostId }).maybeSingle();
    } catch {
      // silent
    }
  }
}

export const adBoostService = new AdBoostService();
