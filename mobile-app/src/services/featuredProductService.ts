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
    seller: { id: string; store_name: string; avatar_url: string | null } | null;
    reviews: { rating: number }[];
    variants: { stock: number }[];
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
            seller:sellers(id, store_name, avatar_url),
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
      return (data || []).filter((fp: any) => !fp.expires_at || fp.expires_at > now);
    } catch (err) {
      console.error('[FeaturedProductService] getFeaturedProducts exception:', err);
      return [];
    }
  }
}

export const featuredProductService = new FeaturedProductService();
