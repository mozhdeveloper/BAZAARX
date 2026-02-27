/**
 * Featured Product Service
 * Handles seller product advertising / featured products
 */

import { supabase, isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';

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
    original_price: number | null;
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
    } | null;
    reviews: { rating: number }[];
    variants: { stock: number }[];
  };
}

const MAX_FEATURED_PER_SELLER = 6;

class FeaturedProductService {
  /**
   * Get all active featured products for the public storefront
   */
  async getFeaturedProducts(limit = 12): Promise<FeaturedProductWithDetails[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('featured_products')
        .select(`
          *,
          product:products!inner(
            id, name, price, original_price, description, seller_id, approval_status, disabled_at,
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

      // Filter out expired features
      const now = new Date().toISOString();
      return (data || []).filter((fp: any) => !fp.expires_at || fp.expires_at > now);
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
        // Fallback to admin client on RLS error
        if (error.message?.includes('row-level security') || error.code === '42501') {
          const { error: adminError } = await supabaseAdmin
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
          if (adminError) {
            console.error('[FeaturedProductService] featureProduct admin error:', adminError);
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
          const { error: adminError } = await supabaseAdmin
            .from('featured_products')
            .delete()
            .eq('product_id', productId)
            .eq('seller_id', sellerId);
          if (adminError) {
            console.error('[FeaturedProductService] unfeatureProduct admin error:', adminError);
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
