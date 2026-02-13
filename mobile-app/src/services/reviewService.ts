/**
 * Review Service
 * Handles database operations for the reviews table
 * Mobile App Port of web/src/services/reviewService.ts
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface Review {
    id: string;
    product_id: string;
    buyer_id: string;
    order_id: string | null;
    rating: number;
    comment: string | null;
    helpful_count: number;
    seller_reply: any | null;
    is_verified_purchase: boolean;
    is_hidden: boolean;
    is_edited: boolean;
    created_at: string;
    // Images from review_images table (populated separately if needed)
    images?: string[];
}

export interface ReviewInsert {
    product_id: string;
    buyer_id: string;
    order_id: string;
    rating: number;
    comment?: string | null;
    is_verified_purchase?: boolean;
}

export class ReviewService {
    private static instance: ReviewService;

    private constructor() {}

    public static getInstance(): ReviewService {
        if (!ReviewService.instance) {
            ReviewService.instance = new ReviewService();
        }
        return ReviewService.instance;
    }

    /**
     * Create a new review
     */
    async createReview(reviewData: ReviewInsert): Promise<Review | null> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
        }

        try {
            const { data, error } = await supabase
                .from('reviews')
                .insert({
                    product_id: reviewData.product_id,
                    buyer_id: reviewData.buyer_id,
                    order_id: reviewData.order_id,
                    rating: reviewData.rating,
                    comment: reviewData.comment || null,
                    is_verified_purchase: reviewData.is_verified_purchase ?? true,
                    helpful_count: 0,
                    is_hidden: false,
                    is_edited: false,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[ReviewService] Error creating review:', error);
            throw new Error('Failed to submit review');
        }
    }

    /**
     * Get reviews for a specific product
     */
    async getProductReviews(
        productId: string,
        page: number = 1,
        limit: number = 5
    ): Promise<{ reviews: (Review & { buyer?: { full_name: string | null; avatar_url: string | null } })[]; total: number }> {
        if (!isSupabaseConfigured()) {
            return { reviews: [], total: 0 };
        }

        try {
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            // Fetch reviews with total count
            // Note: We fetch buyer info separately since there's no direct FK to profiles
            const { data, error, count } = await supabase
                .from('reviews')
                .select('*', { count: 'exact' })
                .eq('product_id', productId)
                .eq('is_hidden', false)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;
            
            // Fetch buyer info for each review (from profiles table with first_name/last_name)
            const reviewsWithBuyer = await Promise.all((data || []).map(async (review) => {
                try {
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('first_name, last_name')
                        .eq('id', review.buyer_id)
                        .single();
                    
                    const { data: buyerData } = await supabase
                        .from('buyers')
                        .select('avatar_url')
                        .eq('id', review.buyer_id)
                        .single();
                    
                    const fullName = profileData 
                        ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() 
                        : null;
                    
                    return {
                        ...review,
                        buyer: { full_name: fullName, avatar_url: buyerData?.avatar_url || null }
                    };
                } catch {
                    return {
                        ...review,
                        buyer: { full_name: null, avatar_url: null }
                    };
                }
            }));

            return {
                reviews: reviewsWithBuyer,
                total: count || 0
            };
        } catch (error) {
            console.error('[ReviewService] Error fetching product reviews:', error);
            throw new Error('Failed to fetch reviews');
        }
    }

    /**
     * Get reviews created by a specific buyer (My Reviews)
     */
    async getBuyerReviews(buyerId: string): Promise<Review[]> {
        if (!isSupabaseConfigured()) {
            return [];
        }

        try {
            const { data, error } = await supabase
                .from('reviews')
                .select('*, products(name, images)')
                .eq('buyer_id', buyerId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('[ReviewService] Error fetching buyer reviews:', error);
            throw new Error('Failed to fetch your reviews');
        }
    }

    /**
     * Get reviews for a seller's products (Seller Dashboard)
     */
    async getSellerReviews(sellerId: string): Promise<Review[]> {
        if (!isSupabaseConfigured()) {
            return [];
        }

        try {
            const { data, error } = await supabase
                .from('reviews')
                .select('*, products(name)')
                .eq('seller_id', sellerId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('[ReviewService] Error fetching seller reviews:', error);
            throw new Error('Failed to fetch store reviews');
        }
    }

    /**
     * Check if a buyer has already reviewed a specific product in an order
     */
    async hasReviewForProduct(orderId: string, productId: string): Promise<boolean> {
        if (!isSupabaseConfigured()) {
            return false;
        }

        try {
            const { count, error } = await supabase
                .from('reviews')
                .select('id', { count: 'exact', head: true })
                .eq('order_id', orderId)
                .eq('product_id', productId);

            if (error) throw error;
            return (count || 0) > 0;
        } catch (error) {
            console.error('[ReviewService] Error checking review existence:', error);
            throw new Error('Failed to check review status');
        }
    }

    /**
     * Update order_items rating after submitting a review
     * The order_items table has a rating column to track if item was reviewed
     */
    async markItemAsReviewed(orderId: string, productId: string, rating?: number): Promise<void> {
        if (!isSupabaseConfigured()) return;

        try {
            const updateData: any = {};
            if (rating) {
                updateData.rating = rating;
            }
            
            // Only update if we have data to update
            if (Object.keys(updateData).length > 0) {
                const { error } = await supabase
                    .from('order_items')
                    .update(updateData)
                    .eq('order_id', orderId)
                    .eq('product_id', productId);

                if (error) {
                    console.warn('[ReviewService] Could not update order_item rating:', error.message);
                }
            }
        } catch (error) {
            console.warn('[ReviewService] Error marking item as reviewed:', error);
        }
    }

    /**
     * Check if all items in an order have been reviewed
     * Uses the reviews table to check for existence of reviews
     */
    async checkAndUpdateOrderReviewed(orderId: string): Promise<void> {
        // This function now just checks if reviews exist - no is_reviewed column to update
        // The presence of reviews in the reviews table is the source of truth
        if (!isSupabaseConfigured()) return;
        // No-op since there's no is_reviewed column on orders table
    }
}

export const reviewService = ReviewService.getInstance();
