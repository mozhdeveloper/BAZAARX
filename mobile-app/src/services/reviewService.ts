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
    seller_id: string;
    order_id: string;
    rating: number;
    comment: string | null;
    images: string[] | null;
    helpful_count: number;
    is_hidden: boolean;
    is_edited: boolean;
    created_at: string;
    updated_at: string;
}

export interface ReviewInsert {
    product_id: string;
    buyer_id: string;
    seller_id: string;
    order_id: string;
    rating: number;
    comment?: string | null;
    images?: string[] | null;
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
                    ...reviewData,
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
     * Update order_items is_reviewed flag after submitting a review
     */
    async markItemAsReviewed(orderId: string, productId: string): Promise<void> {
        if (!isSupabaseConfigured()) return;

        try {
            const { error } = await supabase
                .from('order_items')
                .update({ is_reviewed: true })
                .eq('order_id', orderId)
                .eq('product_id', productId);

            if (error) throw error;

        } catch (error) {
            console.error('[ReviewService] Error marking item as reviewed:', error);
        }
    }

    /**
     * Update order is_reviewed flag when all items are reviewed
     */
    async checkAndUpdateOrderReviewed(orderId: string): Promise<void> {
        if (!isSupabaseConfigured()) return;

        try {
            // Get all items for this order
            const { data: items, error: itemsError } = await supabase
                .from('order_items')
                .select('is_reviewed')
                .eq('order_id', orderId);

            if (itemsError) throw itemsError;

            // Check if all items are reviewed
            const allReviewed = items?.every(item => item.is_reviewed);

            if (allReviewed) {
                const { error: updateError } = await supabase
                    .from('orders')
                    .update({ is_reviewed: true })
                    .eq('id', orderId);

                if (updateError) throw updateError;

            }
        } catch (error) {
            console.error('[ReviewService] Error updating order reviewed status:', error);
        }
    }
}

export const reviewService = ReviewService.getInstance();
