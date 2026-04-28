/**
 * Featured Product Service
 * Handles seller product advertising / featured products
 */

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface FeaturedProduct {
  id: string;
  product_id: string;
  seller_id: string;
  is_active: boolean;
  priority: number;
  featured_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeaturedProductWithDetails extends FeaturedProduct {
  product: {
    id: string;
    name: string;
    price: number;
    description: string;
    seller_id: string;
    approval_status: string;
    disabled_at: string | null;
    images: { id: string; image_url: string; is_primary: boolean }[];
    category: { id: string; name: string } | null;
    seller: {
      id: string;
      store_name: string;
      avatar_url: string | null;
      is_vacation_mode?: boolean;
    } | null;
    reviews: { rating: number }[];
    variants: { stock: number }[];
  };
}

const MAX_FEATURED_PER_SELLER = 6;

// ---------------------------------------------------------------------------
// TTL cache (60 s) — avoids redundant Supabase round-trips for featured products
// ---------------------------------------------------------------------------
const FEATURED_CACHE_TTL = 60_000;
interface FeaturedCacheEntry<T> { data: T; expiresAt: number; }
const _featuredCache = new Map<string, FeaturedCacheEntry<unknown>>();

function _getFeaturedCache<T>(key: string): T | null {
  const entry = _featuredCache.get(key) as FeaturedCacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _featuredCache.delete(key); return null; }
  return entry.data;
}

function _setFeaturedCache<T>(key: string, data: T): void {
  _featuredCache.set(key, { data, expiresAt: Date.now() + FEATURED_CACHE_TTL });
}

/**
 * Invalidate entries in the featured-products TTL cache.
 *
 * - If called with no arguments, clears the entire cache.
 * - If called with a string, treats it as a key prefix and removes matching entries.
 * - If called with a RegExp, removes entries whose keys match the pattern.
 */
export function invalidateFeaturedCache(pattern?: string | RegExp): void {
  if (pattern === undefined) {
    _featuredCache.clear();
    return;
  }

  const isRegExp = pattern instanceof RegExp;

  for (const key of _featuredCache.keys()) {
    if (
      (isRegExp && (pattern as RegExp).test(key)) ||
      (!isRegExp && key.startsWith(pattern as string))
    ) {
      _featuredCache.delete(key);
    }
  }
}
// ---------------------------------------------------------------------------

class FeaturedProductService {
  /**
   * Get all active featured products for the public storefront
   */
  async getFeaturedProducts(limit = 12): Promise<FeaturedProductWithDetails[]> {
    if (!isSupabaseConfigured()) return [];

    // Cache check
    const cacheKey = `featured_products:limit:${limit}`;
    const cached = _getFeaturedCache<FeaturedProductWithDetails[]>(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('featured_products')
        .select(`
          *,
          product:products!inner(
            id, name, price, description, seller_id, approval_status, disabled_at,
            images:product_images(id, image_url, is_primary),
            category:categories(id, name),
            seller:sellers(id, store_name, avatar_url, is_vacation_mode, approval_status, blacklisted_at, suspended_at, is_permanently_blacklisted, temp_blacklist_until),
            reviews(rating),
            variants:product_variants(stock)
          )
        `)
        .eq('is_active', true)
        .is('product.disabled_at', null)
        .eq('product.approval_status', 'approved')
        .order('priority', { ascending: false })
        .order('featured_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[FeaturedProductService] getFeaturedProducts error:', error);
        return [];
      }

      // Filter out expired features and products from non-verified sellers
      const now = new Date().toISOString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filtered = (data || []).filter((fp: any) => {
        if (fp.expires_at && fp.expires_at <= now) return false;
        // Filter out products from non-verified, blacklisted, or suspended sellers
        const seller = fp.product?.seller;
        if (!seller) return false;
        if (seller.approval_status && seller.approval_status !== 'verified') return false;
        if (seller.suspended_at) return false;
        if (seller.blacklisted_at) return false;
        if (seller.is_permanently_blacklisted) return false;
        if (seller.temp_blacklist_until && new Date(seller.temp_blacklist_until) > new Date()) return false;
        return true;
      });

      if (filtered.length === 0) return filtered;

      // Fetch real sold counts from order_items (matches ProductService logic for consistency/speed)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const productIds = filtered.map((fp: any) => fp.product?.id).filter(Boolean);
      
      const { data: soldCountsData, error: soldCountsError } = await supabase
        .from('order_items')
        .select('product_id, quantity, order:orders!inner(shipment_status)')
        .in('product_id', productIds)
        .in('order.shipment_status', ['processing', 'ready_to_ship', 'shipped', 'out_for_delivery', 'delivered', 'received']);

      if (soldCountsError) {
        console.error('[FeaturedProductService] getFeaturedProducts sold counts error:', soldCountsError);
      }

      const soldCountsMap = new Map<string, number>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (soldCountsData || []).forEach((item: any) => {
        const currentCount = soldCountsMap.get(item.product_id) || 0;
        soldCountsMap.set(item.product_id, currentCount + (item.quantity || 0));
      });

      // Attach sold_count to each product object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = filtered.map((fp: any) => ({
        ...fp,
        product: {
          ...fp.product,
          sold_count: soldCountsMap.get(fp.product?.id) || 0,
        },
      }));

      _setFeaturedCache(cacheKey, result);
      return result;
    } catch (err) {
      console.error('[FeaturedProductService] getFeaturedProducts exception:', err);
      return [];
    }
  }

  /**
   * Get a seller's featured products
   */
  async getSellerFeaturedProducts(sellerId: string): Promise<FeaturedProduct[]> {
    if (!isSupabaseConfigured() || !sellerId) return [];

    try {
      const { data, error } = await supabase
        .from('featured_products')
        .select('*')
        .eq('seller_id', sellerId)
        .order('priority', { ascending: false });

      if (error) {
        console.error('[FeaturedProductService] getSellerFeaturedProducts error:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[FeaturedProductService] getSellerFeaturedProducts exception:', err);
      return [];
    }
  }

  /**
   * Feature a product (seller action)
   */
  async featureProduct(productId: string, sellerId: string, priority = 0): Promise<boolean> {
    if (!isSupabaseConfigured() || !productId || !sellerId) return false;

    try {
      // Check seller hasn't exceeded limit
      const existing = await this.getSellerFeaturedProducts(sellerId);
      const activeCount = existing.filter(fp => fp.is_active).length;
      if (activeCount >= MAX_FEATURED_PER_SELLER) {
        console.warn(`[FeaturedProductService] Seller ${sellerId} already has ${MAX_FEATURED_PER_SELLER} featured products`);
        return false;
      }

      const { error } = await supabase
        .from('featured_products')
        .upsert(
          {
            product_id: productId,
            seller_id: sellerId,
            is_active: true,
            priority,
            featured_at: new Date().toISOString(),
          },
          { onConflict: 'product_id' }
        );

      if (error) {
        // Fallback to Edge Function on RLS error
        if (error.message?.includes('row-level security') || error.code === '42501') {
          const { error: fnError } = await supabase.functions.invoke('admin-featured-products', {
            body: { action: 'feature', productId, sellerId, priority },
          });
          if (fnError) {
            console.error('[FeaturedProductService] featureProduct edge fn error:', fnError);
            return false;
          }
          return true;
        }
        console.error('[FeaturedProductService] featureProduct error:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[FeaturedProductService] featureProduct exception:', err);
      return false;
    }
  }

  /**
   * Unfeature a product (seller action)
   */
  async unfeatureProduct(productId: string, sellerId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !productId || !sellerId) return false;

    try {
      const { error } = await supabase
        .from('featured_products')
        .delete()
        .eq('product_id', productId)
        .eq('seller_id', sellerId);

      if (error) {
        if (error.message?.includes('row-level security') || error.code === '42501') {
          const { error: fnError } = await supabase.functions.invoke('admin-featured-products', {
            body: { action: 'unfeature', productId, sellerId },
          });
          if (fnError) {
            console.error('[FeaturedProductService] unfeatureProduct edge fn error:', fnError);
            return false;
          }
          return true;
        }
        console.error('[FeaturedProductService] unfeatureProduct error:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[FeaturedProductService] unfeatureProduct exception:', err);
      return false;
    }
  }

  /**
   * Check if a product is featured
   */
  async isProductFeatured(productId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !productId) return false;

    try {
      const { data, error } = await supabase
        .from('featured_products')
        .select('id')
        .eq('product_id', productId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) return false;
      return !!data;
    } catch {
      return false;
    }
  }
}

export const featuredProductService = new FeaturedProductService();