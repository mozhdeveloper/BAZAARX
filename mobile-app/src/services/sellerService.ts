/**
 * Seller Service (Mobile)
 * Handles all seller-related database operations
 * Ported from web/src/services/sellerService.ts
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface SellerData {
  id: string;
  business_name: string;
  store_name: string;
  store_description?: string;
  store_category?: string[];
  business_type?: string;
  business_registration_number?: string;
  tax_id_number?: string;
  business_address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  is_verified: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  rating: number;
  total_sales: number;
  join_date: string;
  created_at: string;
  updated_at: string;
}

export type SellerInsert = Omit<SellerData, 'created_at' | 'updated_at' | 'join_date'>;
export type SellerUpdate = Partial<Omit<SellerData, 'id' | 'created_at' | 'join_date'>>;

export class SellerService {
  private static instance: SellerService;

  private constructor() {}

  public static getInstance(): SellerService {
    if (!SellerService.instance) {
      SellerService.instance = new SellerService();
    }
    return SellerService.instance;
  }

  /**
   * Get all sellers (for directory/search)
   */
  async getSellers(): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching sellers:', error);
      throw new Error('Failed to load sellers.');
    }
  }

  /**
   * Get seller by ID
   */
  async getSellerById(sellerId: string): Promise<SellerData | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot fetch seller');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('id', sellerId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching seller:', error);
      throw new Error('Failed to fetch seller information.');
    }
  }

  /**
   * Create or update seller profile
   */
  async upsertSeller(seller: SellerInsert): Promise<SellerData> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot upsert seller');
    }

    try {
      const { data, error } = await supabase
        .from('sellers')
        .upsert(seller, {
          onConflict: 'id',
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned upon seller upsert');

      return data;
    } catch (error) {
      console.error('Error upserting seller:', error);
      throw new Error('Failed to save seller profile.');
    }
  }

  /**
   * Update seller profile
   */
  async updateSeller(sellerId: string, updates: SellerUpdate): Promise<SellerData> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot update seller');
    }

    try {
      const { data, error } = await supabase
        .from('sellers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', sellerId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned upon seller update');

      return data;
    } catch (error) {
      console.error('Error updating seller:', error);
      throw new Error('Failed to update seller profile.');
    }
  }

  /**
   * Get seller statistics
   */
  async getSellerStats(sellerId: string): Promise<any> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    try {
      const { data, error } = await supabase.rpc('get_seller_sales_summary', {
        p_seller_id: sellerId,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching seller stats:', error);
      throw new Error('Failed to fetch seller statistics.');
    }
  }

  /**
   * Update seller rating (called after review)
   */
  async updateSellerRating(sellerId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('seller_id', sellerId)
        .eq('is_hidden', false);

      if (reviewsError) throw reviewsError;

      if (reviews && reviews.length > 0) {
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

        const { error: updateError } = await supabase
          .from('sellers')
          .update({
            rating: Number(avgRating.toFixed(1)),
            updated_at: new Date().toISOString(),
          })
          .eq('id', sellerId);

        if (updateError) throw updateError;
      }
    } catch (error) {
      console.error('Error updating seller rating:', error);
      throw new Error('Failed to update seller rating.');
    }
  }

  /**
   * Get public stores for buyer browsing
   * Only returns approved and verified sellers with their product counts
   */
  async getPublicStores(filters?: {
    category?: string;
    location?: string;
    searchQuery?: string;
    sortBy?: 'featured' | 'rating' | 'newest' | 'popular';
    limit?: number;
  }): Promise<(SellerData & { products_count?: number })[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot fetch public stores');
      return [];
    }

    try {
      // Build base query for approved and verified sellers
      let query = supabase
        .from('sellers')
        .select(`
          *,
          products:products!fk_seller(count)
        `)
        .eq('approval_status', 'approved')
        .eq('is_verified', true);

      // Apply filters
      if (filters?.searchQuery) {
        query = query.or(`business_name.ilike.%${filters.searchQuery}%,store_name.ilike.%${filters.searchQuery}%`);
      }

      if (filters?.location) {
        query = query.or(`city.ilike.%${filters.location}%,province.ilike.%${filters.location}%`);
      }

      // Apply sorting
      switch (filters?.sortBy) {
        case 'rating':
          query = query.order('rating', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'popular':
          query = query.order('total_sales', { ascending: false });
          break;
        default:
          query = query.order('rating', { ascending: false });
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to include products_count
      const stores = (data || []).map(seller => ({
        ...seller,
        products_count: seller.products?.[0]?.count || 0
      }));

      return stores;
    } catch (error) {
      console.error('Error fetching public stores:', error);
      return [];
    }
  }
  /**
   * Get follower count for a seller
   */
  async getFollowerCount(sellerId: string): Promise<number> {
    if (!isSupabaseConfigured()) return 0;

    try {
      const { count, error } = await supabase
        .from('shop_followers')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching follower count:', error);
      return 0;
    }
  }

  /**
   * Check if buyer is following seller
   */
  async checkIsFollowing(buyerId: string, sellerId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !buyerId || !sellerId) return false;

    try {
      const { data, error } = await supabase
        .from('shop_followers')
        .select('id')
        .eq('buyer_id', buyerId)
        .eq('seller_id', sellerId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }

  /**
   * Follow a seller
   */
  async followSeller(buyerId: string, sellerId: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    try {
      const { error } = await supabase
        .from('shop_followers')
        .insert({
          buyer_id: buyerId,
          seller_id: sellerId
        });

      if (error) {
        // Ignore duplicate key errors (already following)
        if (error.code === '23505') return;
        throw error;
      }
    } catch (error) {
      console.error('Error following seller:', error);
      throw new Error('Failed to follow seller');
    }
  }

  /**
   * Unfollow a seller
   */
  async unfollowSeller(buyerId: string, sellerId: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    try {
      const { error } = await supabase
        .from('shop_followers')
        .delete()
        .eq('buyer_id', buyerId)
        .eq('seller_id', sellerId);

      if (error) throw error;
    } catch (error) {
      console.error('Error unfollowing seller:', error);
      throw new Error('Failed to unfollow seller');
    }
  }
  /**
   * Get shops followed by a buyer
   */
  async getFollowedShops(buyerId: string): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('shop_followers')
        .select(`
          *,
          seller:sellers(*)
        `)
        .eq('buyer_id', buyerId);

      if (error) throw error;

      // Transform data to return seller details with products count if possible, 
      // or just the seller details.
      // We might want to fetch product count too.
      // For now, let's just return the seller details.
      
      const sellers = await Promise.all((data || []).map(async (item) => {
          const seller = item.seller;
           // Get verified product count for this seller
           const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('seller_id', item.seller_id)
            .eq('approval_status', 'approved')
            .eq('is_active', true);
            
           // Get follower count
           const { count: followerCount } = await supabase
            .from('shop_followers')
            .select('*', { count: 'exact', head: true })
            .eq('seller_id', item.seller_id);

          return {
              ...seller,
              products_count: count || 0,
              followers_count: followerCount || 0,
              // Map to UI expectations if needed
              name: seller.store_name || seller.business_name,
              location: seller.city ? `${seller.city}, ${seller.province}` : seller.business_address,
              logo: (seller.store_name || seller.business_name || 'S').substring(0, 2).toUpperCase(),
              rating: seller.rating || 0,
              banner: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=400&fit=crop' // Placeholder
          };
      }));

      return sellers;
    } catch (error) {
      console.error('Error fetching followed shops:', error);
      return [];
    }
  }
}

// Export singleton instance
export const sellerService = SellerService.getInstance();
