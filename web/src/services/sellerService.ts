/**
 * Seller Service
 * Handles all seller-related database operations
 * Updated for new normalized database schema (February 2026)
 * 
 * Actual sellers table columns:
 * - id, store_name, store_description, avatar_url, owner_name
 * - approval_status ('pending' | 'verified' | 'rejected'), verified_at
 * - created_at, updated_at
 * 
 * Extended data is in related tables:
 * - seller_business_profiles: business_type, registration_number, address, etc.
 * - seller_payout_accounts: bank_name, account_name, account_number
 * - seller_verification_documents: permit_url, id_url, etc.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Matches actual sellers table structure
export interface SellerCoreData {
    id: string;
    store_name: string;
    store_description: string | null;
    avatar_url: string | null;
    owner_name: string | null;
    approval_status: 'pending' | 'verified' | 'rejected';
    verified_at: string | null;
    created_at: string;
    updated_at: string;
}

// Extended seller data with joins
export interface SellerData extends SellerCoreData {
    // Computed/joined fields (not in sellers table)
    business_profile?: {
        business_type: string | null;
        business_registration_number: string | null;
        tax_id_number: string | null;
        address_line_1: string | null;
        city: string | null;
        province: string | null;
        postal_code: string | null;
    };
    payout_account?: {
        bank_name: string | null;
        account_name: string | null;
        account_number: string | null;
    };
    verification_documents?: {
        business_permit_url: string | null;
        valid_id_url: string | null;
    };
    // Legacy compatibility (computed)
    business_name?: string;
    is_verified?: boolean;
    rating?: number;
    total_reviews?: number;
    review_count?: number;
    products_count?: number;
    total_sales?: number;
    rejection_reason?: string;
    // Legacy aliases
    city?: string;
    province?: string;
    postal_code?: string;
    business_type?: string;
    bank_name?: string;
    account_name?: string;
    account_number?: string;
}

export type SellerInsert = {
    id: string;
    store_name: string;
    store_description?: string | null;
    avatar_url?: string | null;
    owner_name?: string | null;
    approval_status?: 'pending' | 'verified' | 'rejected';
};

export type SellerUpdate = Partial<Omit<SellerInsert, 'id'>>;

export class SellerService {
    private static instance: SellerService;

    private constructor() {
        if (SellerService.instance) {
            throw new Error('Use SellerService.getInstance() instead of new SellerService()');
        }
    }

    public static getInstance(): SellerService {
        if (!SellerService.instance) {
            SellerService.instance = new SellerService();
        }
        return SellerService.instance;
    }

    /**
     * Transform raw seller data to include computed legacy fields
     */
    private transformSeller(seller: any): SellerData {
        const bp = seller.business_profile;
        const pa = seller.payout_account;
        const normalizedRating = Number(seller.rating || 0);
        const normalizedTotalReviews = Number(
            seller.total_reviews || seller.review_count || 0,
        );

        return {
            ...seller,
            // Legacy compatibility fields
            business_name: seller.store_name,
            is_verified: seller.approval_status === 'verified',
            rating: Number.isFinite(normalizedRating) ? normalizedRating : 0,
            total_reviews: Number.isFinite(normalizedTotalReviews)
                ? normalizedTotalReviews
                : 0,
            review_count: Number.isFinite(normalizedTotalReviews)
                ? normalizedTotalReviews
                : 0,
            total_sales: 0, // Would need to be computed from orders
            rejection_reason: null, // Not in current schema
            // Flatten business profile for legacy code
            city: bp?.city || null,
            province: bp?.province || null,
            postal_code: bp?.postal_code || null,
            business_type: bp?.business_type || null,
            // Flatten payout account for legacy code
            bank_name: pa?.bank_name || null,
            account_name: pa?.account_name || null,
            account_number: pa?.account_number || null,
        };
    }

    private async getSellerReviewMetrics(sellerIds: string[]): Promise<Map<string, {
        rating: number;
        total_reviews: number;
        products_count: number;
    }>> {
        const metrics = new Map<string, {
            rating: number;
            total_reviews: number;
            products_count: number;
            rating_sum: number;
        }>();

        sellerIds.forEach((sellerId) => {
            metrics.set(sellerId, {
                rating: 0,
                total_reviews: 0,
                products_count: 0,
                rating_sum: 0,
            });
        });

        if (sellerIds.length === 0) {
            return new Map();
        }

        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, seller_id')
            .in('seller_id', sellerIds)
            .is('deleted_at', null)
            .is('disabled_at', null)
            .eq('approval_status', 'approved');

        if (productsError) {
            throw productsError;
        }

        const productToSeller = new Map<string, string>();

        (products || []).forEach((product: any) => {
            if (!product?.id || !product?.seller_id) {
                return;
            }

            productToSeller.set(product.id, product.seller_id);

            const sellerMetrics = metrics.get(product.seller_id);
            if (sellerMetrics) {
                sellerMetrics.products_count += 1;
            }
        });

        const productIds = Array.from(productToSeller.keys());

        if (productIds.length > 0) {
            const { data: reviews, error: reviewsError } = await supabase
                .from('reviews')
                .select('product_id, rating')
                .eq('is_hidden', false)
                .in('product_id', productIds);

            if (reviewsError) {
                throw reviewsError;
            }

            (reviews || []).forEach((review: any) => {
                const sellerId = review?.product_id
                    ? productToSeller.get(review.product_id)
                    : null;

                if (!sellerId) {
                    return;
                }

                const sellerMetrics = metrics.get(sellerId);
                if (!sellerMetrics) {
                    return;
                }

                const normalizedRating = Number(review?.rating || 0);
                if (!Number.isFinite(normalizedRating) || normalizedRating <= 0) {
                    return;
                }

                sellerMetrics.total_reviews += 1;
                sellerMetrics.rating_sum += normalizedRating;
            });
        }

        const finalized = new Map<string, {
            rating: number;
            total_reviews: number;
            products_count: number;
        }>();

        metrics.forEach((metric, sellerId) => {
            finalized.set(sellerId, {
                rating:
                    metric.total_reviews > 0
                        ? Number((metric.rating_sum / metric.total_reviews).toFixed(1))
                        : 0,
                total_reviews: metric.total_reviews,
                products_count: metric.products_count,
            });
        });

        return finalized;
    }

    /**
     * Get seller by ID with related data
     */
    async getSellerById(sellerId: string): Promise<SellerData | null> {
        if (!isSupabaseConfigured()) {
            console.warn('Supabase not configured - cannot fetch seller');
            return null;
        }

        try {
            const { data, error } = await supabase
                .from('sellers')
                .select(`
                    *,
                    business_profile:seller_business_profiles(*),
                    payout_account:seller_payout_accounts(*),
                    verification_documents:seller_verification_documents(*)
                `)
                .eq('id', sellerId)
                .single();

            if (error) throw error;
            return this.transformSeller(data);
        } catch (error) {
            console.error('Error fetching seller:', error);
            throw new Error('Failed to fetch seller information.');
        }
    }

    /**
     * Create or update seller profile (core fields only)
     */
    async upsertSeller(seller: SellerInsert): Promise<SellerData> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured - cannot upsert seller');
        }

        try {
            const { data, error } = await supabase
                .from('sellers')
                .upsert({
                    id: seller.id,
                    store_name: seller.store_name,
                    store_description: seller.store_description || null,
                    avatar_url: seller.avatar_url || null,
                    owner_name: seller.owner_name || null,
                    approval_status: seller.approval_status || 'pending',
                }, {
                    onConflict: 'id',
                    ignoreDuplicates: false,
                })
                .select()
                .single();

            if (error) throw error;
            if (!data) throw new Error('No data returned upon seller upsert');

            return this.transformSeller(data);
        } catch (error) {
            console.error('Error upserting seller:', error);
            throw new Error('Failed to save seller profile.');
        }
    }

    /**
     * Update seller profile (core fields only)
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

            return this.transformSeller(data);
        } catch (error) {
            console.error('Error updating seller:', error);
            throw new Error('Failed to update seller profile.');
        }
    }

    /**
     * Get all sellers (admin use)
     */
    async getAllSellers(): Promise<SellerData[]> {
        if (!isSupabaseConfigured()) {
            console.warn('Supabase not configured - cannot fetch sellers');
            return [];
        }

        try {
            const { data, error } = await supabase
                .from('sellers')
                .select(`
                    *,
                    business_profile:seller_business_profiles(*)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []).map(s => this.transformSeller(s));
        } catch (error) {
            console.error('Error fetching sellers:', error);
            throw new Error('Failed to fetch all sellers.');
        }
    }

    /**
     * Approve seller (set approval_status to 'verified')
     */
    async approveSeller(sellerId: string): Promise<void> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
        }

        try {
            const { error } = await supabase
                .from('sellers')
                .update({
                    approval_status: 'verified',
                    verified_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', sellerId);

            if (error) throw error;
        } catch (error) {
            console.error('Error approving seller:', error);
            throw new Error('Failed to approve seller.');
        }
    }

    /**
     * Reject seller (set approval_status to 'rejected')
     */
    async rejectSeller(sellerId: string, _reason?: string): Promise<void> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
        }

        try {
            const { error } = await supabase
                .from('sellers')
                .update({
                    approval_status: 'rejected',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', sellerId);

            if (error) throw error;
        } catch (error) {
            console.error('Error rejecting seller:', error);
            throw new Error('Failed to reject seller.');
        }
    }

    /**
     * Get seller statistics
     */
    async getSellerStats(sellerId: string): Promise<any> {
        if (!isSupabaseConfigured()) {
            return { total_orders: 0, total_sales: 0, average_rating: 0 };
        }

        try {
            // Try RPC first
            const { data, error } = await supabase.rpc('get_seller_sales_summary', {
                p_seller_id: sellerId,
            });

            if (!error && data) return data;

            // Fallback: return defaults
            return { total_orders: 0, total_sales: 0, average_rating: 0 };
        } catch (error) {
            console.error('Error fetching seller stats:', error);
            return { total_orders: 0, total_sales: 0, average_rating: 0 };
        }
    }

    /**
     * Update seller rating - rating not stored in sellers table in current schema
     * This is a no-op for now, rating would be computed from reviews on-demand
     */
    async updateSellerRating(_sellerId: string): Promise<void> {
        // Rating not stored in sellers table - computed from reviews
        console.log('updateSellerRating: Rating is computed from reviews, not stored');
    }

    /**
     * Get approved/verified stores for public display
     */
    async getPublicStores(filters?: {
        category?: string;
        location?: string;
        searchQuery?: string;
        sortBy?: 'featured' | 'rating' | 'newest' | 'popular';
        limit?: number;
        ids?: string[];
        includeUnverified?: boolean;
    }): Promise<(SellerData & { products_count?: number })[]> {
        if (!isSupabaseConfigured()) {
            console.warn('Supabase not configured - cannot fetch stores');
            return [];
        }

        try {
            let query = supabase
                .from('sellers')
                .select(`
                    *,
                    business_profile:seller_business_profiles(
                        city,
                        province,
                        postal_code,
                        business_type
                    )
                `);

            // Only filter by verified if not explicitly requested to include unverified
            if (!filters?.includeUnverified) {
                query = query.eq('approval_status', 'verified');
            }

            // Apply ID filter if provided
            if (filters?.ids && filters.ids.length > 0) {
                query = query.in('id', filters.ids);
            }

            // Apply search filter
            if (filters?.searchQuery) {
                query = query.or(`store_name.ilike.%${filters.searchQuery}%,store_description.ilike.%${filters.searchQuery}%`);
            }

            query = query.order('created_at', { ascending: false });

            const { data: sellers, error } = await query;

            if (error) throw error;
            if (!sellers || sellers.length === 0) return [];

            const sellerIds = sellers.map((seller: any) => seller.id);
            const metricsMap = await this.getSellerReviewMetrics(sellerIds);

            let enriched = sellers.map((seller: any) => {
                const metrics = metricsMap.get(seller.id) || {
                    rating: 0,
                    total_reviews: 0,
                    products_count: 0,
                };

                return this.transformSeller({
                    ...seller,
                    rating: metrics.rating,
                    total_reviews: metrics.total_reviews,
                    review_count: metrics.total_reviews,
                    products_count: metrics.products_count,
                });
            });

            if (filters?.location) {
                const normalizedLocation = filters.location.toLowerCase();
                enriched = enriched.filter((seller) => {
                    const city = (seller.city || '').toLowerCase();
                    const province = (seller.province || '').toLowerCase();
                    const joinedLocation = `${city} ${province}`.trim();
                    return joinedLocation.includes(normalizedLocation);
                });
            }

            if (filters?.sortBy === 'rating') {
                enriched = enriched.sort((a, b) => {
                    const ratingDiff = Number(b.rating || 0) - Number(a.rating || 0);
                    if (ratingDiff !== 0) {
                        return ratingDiff;
                    }
                    return Number(b.total_reviews || 0) - Number(a.total_reviews || 0);
                });
            } else if (filters?.sortBy === 'popular' || filters?.sortBy === 'featured') {
                enriched = enriched.sort((a, b) => {
                    const reviewDiff = Number(b.total_reviews || 0) - Number(a.total_reviews || 0);
                    if (reviewDiff !== 0) {
                        return reviewDiff;
                    }
                    return Number(b.rating || 0) - Number(a.rating || 0);
                });
            }

            if (filters?.limit) {
                enriched = enriched.slice(0, filters.limit);
            }

            return enriched;
        } catch (error) {
            console.error('Error fetching public stores:', error);
            return [];
        }
    }

    /**
     * Get a single store by ID with product count
     */
    async getStoreById(storeId: string): Promise<(SellerData & { products_count?: number }) | null> {
        if (!isSupabaseConfigured()) {
            return null;
        }

        try {
            const { data: seller, error } = await supabase
                .from('sellers')
                .select(`
                    *,
                    business_profile:seller_business_profiles(*),
                    payout_account:seller_payout_accounts(*)
                `)
                .eq('id', storeId)
                .single();

            if (error) throw error;
            if (!seller) return null;

            const metricsMap = await this.getSellerReviewMetrics([storeId]);
            const metrics = metricsMap.get(storeId) || {
                rating: 0,
                total_reviews: 0,
                products_count: 0,
            };

            return this.transformSeller({
                ...seller,
                rating: metrics.rating,
                total_reviews: metrics.total_reviews,
                review_count: metrics.total_reviews,
                products_count: metrics.products_count,
            });
        } catch (error) {
            console.error('Error fetching store:', error);
            return null;
        }
    }

    /**
     * Update business profile (in seller_business_profiles table)
     */
    async updateBusinessProfile(sellerId: string, businessData: {
        business_type?: string;
        business_registration_number?: string;
        tax_id_number?: string;
        address_line_1?: string;
        address_line_2?: string;
        city?: string;
        province?: string;
        postal_code?: string;
    }): Promise<void> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
        }

        try {
            const { error } = await supabase
                .from('seller_business_profiles')
                .upsert({
                    seller_id: sellerId,
                    ...businessData,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'seller_id',
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error updating business profile:', error);
            throw new Error('Failed to update business profile.');
        }
    }

    /**
     * Update payout account (in seller_payout_accounts table)
     */
    async updatePayoutAccount(sellerId: string, payoutData: {
        bank_name?: string;
        account_name?: string;
        account_number?: string;
    }): Promise<void> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
        }

        try {
            const { error } = await supabase
                .from('seller_payout_accounts')
                .upsert({
                    seller_id: sellerId,
                    ...payoutData,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'seller_id',
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error updating payout account:', error);
            throw new Error('Failed to update payout account.');
        }
    }
}

export const sellerService = SellerService.getInstance();
