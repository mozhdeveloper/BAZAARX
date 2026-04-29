/**
 * Featured Product Service (Mobile)
 * Handles seller product advertising / featured products
 */

import { supabase } from '../lib/supabase';

export interface FeaturedProductMobile {
  id: string;
  product_id: string;
  seller_id: string;
  is_active: boolean;
  priority: number;
  featured_at: string;
  expires_at: string | null;
  product: {
    id: string;
    name: string;
    price: number;
    seller_id: string;
    approval_status: string;
    disabled_at: string | null;
    images: { id: string; image_url: string; is_primary: boolean }[];
    category: { id: string; name: string } | null;
    seller: { id: string; store_name: string; avatar_url: string | null; is_vacation_mode?: boolean; approval_status?: string } | null;
    reviews: { rating: number }[];
    variants: { stock: number }[];
    sold_count?: number;
  };
}

class FeaturedProductService {
  /**
   * Get all active featured products for buyer storefront
   */
  async getFeaturedProducts(limit = 12): Promise<FeaturedProductMobile[]> {
    try {
      const { data, error } = await supabase
        .from('featured_products')
        .select(`
          *,
          product:products!inner(
            id, name, price, seller_id, approval_status, disabled_at,
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

      const now = new Date().toISOString();
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
        // Filter out products with 0 stock (all variants out of stock)
        const variants = fp.product?.variants || [];
        const totalStock = variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
        if (totalStock <= 0) return false;
        return true;
      });

      if (filtered.length === 0) return filtered as unknown as FeaturedProductMobile[];

      // Fetch real sold counts from the product_sold_counts view
      const productIds = filtered.map((fp: any) => fp.product?.id).filter(Boolean);
      const { data: soldCountsData } = await supabase
        .from('product_sold_counts')
        .select('product_id, sold_count')
        .in('product_id', productIds);

      const soldCountsMap = new Map<string, number>();
      (soldCountsData || []).forEach((row: any) => {
        soldCountsMap.set(row.product_id, row.sold_count || 0);
      });

      // Attach sold_count to each product object
      return filtered.map((fp: any) => ({
        ...fp,
        product: {
          ...fp.product,
          sold_count: soldCountsMap.get(fp.product?.id) || 0,
        },
      }));
    } catch (err) {
      console.error('[FeaturedProductService] getFeaturedProducts exception:', err);
      return [];
    }
  }
}

export const featuredProductService = new FeaturedProductService();
