/**
 * Ad Boost Service (Mobile)
 * Handles fetching boosted products for buyer display + seller boost management
 *
 * Dynamic Pricing Formula (matches web — see AD_BOOST_PRICING_FORMULA.md):
 *   CostPerDay = BaseRate × CategoryDemand × Competition × Seasonal × (1 − DurationDiscount)
 *   Currently FREE during beta.
 */

import { supabase } from '../lib/supabase';
import { supabaseAdmin } from '../lib/supabase';

// Helper: prefer supabaseAdmin if available, otherwise supabase
const getClient = () => supabaseAdmin || supabase;

// ─── Types ───────────────────────────────────────────────────────────────────

export type BoostType = 'featured' | 'search_priority' | 'homepage_banner' | 'category_spotlight';
export type BoostStatus = 'draft' | 'active' | 'paused' | 'ended' | 'cancelled';

export interface AdBoostMobile {
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

// ─── Dynamic Pricing ─────────────────────────────────────────────────────────

const BOOST_BASE_RATES: Record<BoostType, number> = {
  featured: 12,
  search_priority: 20,
  homepage_banner: 45,
  category_spotlight: 28,
};

const MAX_SLOTS: Record<BoostType, number> = {
  featured: 6,
  search_priority: 20,
  homepage_banner: 3,
  category_spotlight: 8,
};

const AVG_DAILY_IMPRESSIONS: Record<BoostType, number> = {
  featured: 800,
  search_priority: 500,
  homepage_banner: 2000,
  category_spotlight: 600,
};

const AVG_CTR: Record<BoostType, number> = {
  featured: 0.025,
  search_priority: 0.035,
  homepage_banner: 0.018,
  category_spotlight: 0.030,
};

export const BOOST_TYPE_LABELS: Record<BoostType, string> = {
  featured: 'Featured Products',
  search_priority: 'Search Priority',
  homepage_banner: 'Homepage Banner',
  category_spotlight: 'Category Spotlight',
};

export const BOOST_TYPE_DESCRIPTIONS: Record<BoostType, string> = {
  featured: 'Your product appears in the Featured Products section on the shop page.',
  search_priority: 'Your product ranks higher in search results and category listings.',
  homepage_banner: 'Your product gets premium placement on the homepage hero area.',
  category_spotlight: 'Your product is highlighted at the top of its category page.',
};

export const DURATION_OPTIONS = [
  { days: 3,  label: '3 Days',  discount: 0 },
  { days: 7,  label: '7 Days',  discount: 0 },
  { days: 14, label: '14 Days', discount: 15 },
  { days: 30, label: '30 Days', discount: 25 },
];

const IS_FREE_PERIOD = true;

function getMarketplaceMetrics() {
  return {
    totalActiveUsers: 1200,
    totalProducts: 350,
    activeBoostsByType: { featured: 2, search_priority: 5, homepage_banner: 1, category_spotlight: 3 },
    categoryProductCount: 45,
    categoryActiveUsers: 180,
  };
}

export function calculateBoostPrice(
  boostType: BoostType,
  durationDays: number,
  dailyBudget: number = 0
) {
  const metrics = getMarketplaceMetrics();
  const baseRate = BOOST_BASE_RATES[boostType];

  // Category demand
  const demandRatio = metrics.categoryActiveUsers / Math.max(metrics.categoryProductCount, 1);
  const categoryDemandMultiplier = Math.min(2.0, Math.max(0.8, demandRatio / 4.0));

  // Competition
  const occupancy = Math.min((metrics.activeBoostsByType[boostType] || 0) / MAX_SLOTS[boostType], 1.0);
  const competitionFactor = 1.0 + (occupancy * 0.5);

  // Seasonal
  const now = new Date();
  const dayMultipliers = [1.15, 1.0, 1.0, 1.0, 1.0, 1.1, 1.2];
  let seasonalIndex = dayMultipliers[now.getDay()];
  if ([1,2,3,14,15,16,29,30,31].includes(now.getDate())) seasonalIndex *= 1.20;
  if (now.getMonth() === 10 || now.getMonth() === 11) seasonalIndex *= 1.15;
  seasonalIndex = Math.min(1.8, Math.max(0.9, Math.round(seasonalIndex * 100) / 100));

  // Duration discount
  let discountPercent = 0;
  if (durationDays >= 30) discountPercent = 25;
  else if (durationDays >= 14) discountPercent = 15;

  let costPerDay = baseRate * categoryDemandMultiplier * competitionFactor * seasonalIndex * (1 - discountPercent / 100);
  if (dailyBudget > 200) costPerDay += 5;
  costPerDay = Math.round(costPerDay * 100) / 100;
  const totalCost = Math.round(costPerDay * durationDays * 100) / 100;

  // Performance estimates
  const estimatedImpressions = AVG_DAILY_IMPRESSIONS[boostType] * durationDays;
  const estimatedClicks = Math.round(estimatedImpressions * AVG_CTR[boostType]);
  const estimatedCPM = totalCost > 0 ? Math.round(((totalCost / estimatedImpressions) * 1000) * 100) / 100 : 0;
  const estimatedCPC = estimatedClicks > 0 ? Math.round((totalCost / estimatedClicks) * 100) / 100 : 0;
  const estimatedROAS = totalCost > 0 ? Math.round(((Math.round(estimatedClicks * 0.035) * 850) / totalCost) * 10) / 10 : 0;

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
    estimatedCPM,
    estimatedClicks,
    estimatedCPC,
    estimatedROAS,
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

class AdBoostServiceMobile {
  /**
   * Get active boosted products for buyer display (HomeScreen)
   */
  async getActiveBoostedProducts(boostType?: BoostType, limit = 12): Promise<AdBoostMobile[]> {
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
        .limit(limit);

      if (boostType) {
        query = query.eq('boost_type', boostType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[AdBoostMobile] getActiveBoostedProducts error:', error);
        return [];
      }

      return (data || []) as AdBoostMobile[];
    } catch (err) {
      console.error('[AdBoostMobile] getActiveBoostedProducts exception:', err);
      return [];
    }
  }

  /**
   * Get seller's boosts
   */
  async getSellerBoosts(sellerId: string): Promise<AdBoostMobile[]> {
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
        console.error('[AdBoostMobile] getSellerBoosts error:', error);
        return [];
      }

      return (data || []) as AdBoostMobile[];
    } catch (err) {
      console.error('[AdBoostMobile] getSellerBoosts exception:', err);
      return [];
    }
  }

  /**
   * Get seller's approved products available for boosting
   */
  async getBoostableProducts(sellerId: string): Promise<any[]> {
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
        console.error('[AdBoostMobile] getBoostableProducts error:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[AdBoostMobile] getBoostableProducts exception:', err);
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
  }): Promise<AdBoostMobile | null> {
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
        console.error('[AdBoostMobile] createBoost error:', error);
        return null;
      }

      return data as AdBoostMobile;
    } catch (err) {
      console.error('[AdBoostMobile] createBoost exception:', err);
      return null;
    }
  }

  /**
   * Pause a boost
   */
  async pauseBoost(boostId: string, sellerId: string): Promise<boolean> {
    try {
      const { error } = await getClient()
        .from('product_ad_boosts')
        .update({ status: 'paused', paused_at: new Date().toISOString() })
        .eq('id', boostId)
        .eq('seller_id', sellerId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Resume a paused boost
   */
  async resumeBoost(boostId: string, sellerId: string): Promise<boolean> {
    try {
      const { error } = await getClient()
        .from('product_ad_boosts')
        .update({ status: 'active', paused_at: null })
        .eq('id', boostId)
        .eq('seller_id', sellerId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Cancel a boost
   */
  async cancelBoost(boostId: string, sellerId: string): Promise<boolean> {
    try {
      const { error } = await getClient()
        .from('product_ad_boosts')
        .update({ status: 'cancelled' })
        .eq('id', boostId)
        .eq('seller_id', sellerId);

      return !error;
    } catch {
      return false;
    }
  }
}

export const adBoostService = new AdBoostServiceMobile();
