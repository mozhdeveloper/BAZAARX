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
     * Filters reviews by first getting all product IDs for the seller,
     * then fetching reviews for those products only.
     */
    async getSellerReviews(sellerId: string): Promise<Review[]> {
        if (!isSupabaseConfigured()) {
            return [];
        }

        try {
            // Step 1: Get all product IDs for this seller
            const { data: sellerProducts, error: productsError } = await supabase
                .from('products')
                .select('id')
                .eq('seller_id', sellerId);

            if (productsError) {
                console.warn('[ReviewService] Error fetching seller products:', productsError);
                return [];
            }

            if (!sellerProducts || sellerProducts.length === 0) {
                console.log('[ReviewService] No products found for seller:', sellerId);
                return [];
            }

            const productIds = sellerProducts.map(p => p.id);
            console.log(`[ReviewService] Found ${productIds.length} products for seller ${sellerId}`);

            // Step 2: Get reviews for these products only
            const { data, error } = await supabase
                .from('reviews')
                .select('*')
                .in('product_id', productIds)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[ReviewService] Error fetching seller reviews:', error);
                throw error;
            }

            console.log(`[ReviewService] Found ${data?.length || 0} reviews for seller ${sellerId}'s products`);
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

    /**
     * Check if a buyer can vote on a review (not the product seller)
     * Uses Option A: Compare buyer_id with product.seller_id
     */
    async canVoteOnReview(reviewId: string, buyerId: string): Promise<boolean> {
        if (!isSupabaseConfigured()) {
            return true;
        }

        try {
            const { data, error } = await supabase
                .from('reviews')
                .select(`
                    product:products!reviews_product_id_fkey (
                        seller_id
                    )
                `)
                .eq('id', reviewId)
                .single();

            if (error) {
                console.warn('[ReviewService] Error checking vote eligibility:', error);
                return false;
            }

            const product = data?.product as { seller_id: string } | null;
            const sellerId = product?.seller_id;

            // Block if buyer is the seller of this product
            if (sellerId && sellerId === buyerId) {
                return false;
            }

            return true;
        } catch (error) {
            console.error('[ReviewService] Error checking vote eligibility:', error);
            return false;
        }
    }

    /**
     * Check if a user has voted on a specific review
     */
    async hasUserVoted(reviewId: string, buyerId: string): Promise<boolean> {
        if (!isSupabaseConfigured()) {
            return false;
        }

        try {
            const { data, error } = await supabase
                .from('review_votes')
                .select('review_id')
                .eq('review_id', reviewId)
                .eq('buyer_id', buyerId)
                .maybeSingle();

            if (error) {
                console.warn('[ReviewService] Error checking user vote:', error);
                return false;
            }

            return !!data;
        } catch (error) {
            console.error('[ReviewService] Error checking user vote:', error);
            return false;
        }
    }

    /**
     * Toggle vote on a review (vote if not voted, unvote if already voted)
     * Returns true if voted, false if unvoted
     */
    async toggleReviewVote(reviewId: string, buyerId: string): Promise<boolean> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
        }

        // Check if user can vote (not seller)
        const canVote = await this.canVoteOnReview(reviewId, buyerId);
        if (!canVote) {
            throw new Error('Sellers cannot vote on reviews of their own products');
        }

        try {
            // Check if already voted
            const hasVoted = await this.hasUserVoted(reviewId, buyerId);

            if (hasVoted) {
                // Remove vote
                const { error } = await supabase
                    .from('review_votes')
                    .delete()
                    .eq('review_id', reviewId)
                    .eq('buyer_id', buyerId);

                if (error) throw error;

                return false; // Unvoted
            } else {
                // Add vote
                const { error } = await supabase
                    .from('review_votes')
                    .insert({
                        review_id: reviewId,
                        buyer_id: buyerId,
                    });

                if (error) throw error;

                return true; // Voted
            }
        } catch (error) {
            console.error('[ReviewService] Error toggling review vote:', error);
            throw new Error('Failed to update vote');
        }
    }

    /**
     * Get list of voters for a review (max 20 + count of remaining)
     * Returns voters with their profile info
     */
    async getReviewVoters(
        reviewId: string,
        limit: number = 20
    ): Promise<{
        voters: Array<{
            buyerId: string;
            username: string;
            avatarUrl: string;
            votedAt: string;
        }>;
        totalCount: number;
    }> {
        if (!isSupabaseConfigured()) {
            return { voters: [], totalCount: 0 };
        }

        try {
            // Get total count first
            const { count, error: countError } = await supabase
                .from('review_votes')
                .select('*', { count: 'exact', head: true })
                .eq('review_id', reviewId);

            if (countError) {
                console.warn('[ReviewService] Error counting review voters:', countError);
            }

            const totalCount = count || 0;

            // Get voters (limited)
            const { data, error } = await supabase
                .from('review_votes')
                .select('buyer_id, created_at')
                .eq('review_id', reviewId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.warn('[ReviewService] Error fetching review voters:', error);
                return { voters: [], totalCount };
            }

            // Fetch buyer and profile info for each voter
            const voters = await Promise.all((data || []).map(async (vote: any) => {
                // Get buyer info
                const { data: buyerData } = await supabase
                    .from('buyers')
                    .select('avatar_url')
                    .eq('id', vote.buyer_id)
                    .maybeSingle();

                // Get profile info for name
                let username = 'Anonymous';
                try {
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('first_name, last_name')
                        .eq('id', vote.buyer_id)
                        .maybeSingle();
                    
                    if (profileData) {
                        const fullName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
                        if (fullName) username = fullName;
                    }
                } catch {
                    // Use default "Anonymous"
                }

                const avatarUrl = buyerData?.avatar_url || 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=FF6A00&color=fff`;

                return {
                    buyerId: vote.buyer_id,
                    username,
                    avatarUrl,
                    votedAt: vote.created_at,
                };
            }));

            return { voters, totalCount };
        } catch (error) {
            console.error('[ReviewService] Error fetching review voters:', error);
            return { voters: [], totalCount: 0 };
        }
    }

    /**
     * Add or update a seller reply to a review
     * @param reviewId - The review ID to reply to
     * @param sellerId - The seller ID (for authorization)
     * @param message - The reply message
     * @returns The updated review
     */
    async addSellerReply(
        reviewId: string,
        sellerId: string,
        message: string,
    ): Promise<Review | null> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
        }

        try {
            // Verify the seller owns the product being reviewed
            // First, get the product_id from the review
            const { data: reviewBasic, error: reviewBasicError } = await supabase
                .from('reviews')
                .select('product_id')
                .eq('id', reviewId)
                .single();

            if (reviewBasicError || !reviewBasic) {
                console.error('[ReviewService] Review not found:', reviewBasicError);
                throw new Error('Review not found');
            }

            // Then, get the seller_id from the product directly
            const { data: productData, error: productError } = await supabase
                .from('products')
                .select('seller_id')
                .eq('id', reviewBasic.product_id)
                .single();

            if (productError || !productData) {
                console.error('[ReviewService] Product not found for review:', productError);
                throw new Error('Product not found for this review');
            }

            if (!productData.seller_id) {
                console.error('[ReviewService] Product has no seller_id:', reviewBasic.product_id);
                throw new Error('Product has no associated seller');
            }

            if (productData.seller_id !== sellerId) {
                console.error('[ReviewService] Seller authorization failed:', {
                    productSellerId: productData.seller_id,
                    requestingSellerId: sellerId,
                    reviewId,
                    productId: reviewBasic.product_id
                });
                throw new Error('You can only reply to reviews for your own products');
            }

            // Update the review with seller reply
            const sellerReply = {
                message: message.trim(),
                replied_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('reviews')
                .update({
                    seller_reply: sellerReply,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', reviewId)
                .select()
                .single();

            if (error) {
                console.error('[ReviewService] Error adding seller reply:', error);
                throw new Error('Failed to submit reply');
            }

            return data;
        } catch (error) {
            console.error('[ReviewService] Error in addSellerReply:', error);
            throw error;
        }
    }

    /**
     * Delete a seller reply from a review
     * @param reviewId - The review ID
     * @param sellerId - The seller ID (for authorization)
     * @returns The updated review without seller reply
     */
    async deleteSellerReply(
        reviewId: string,
        sellerId: string,
    ): Promise<Review | null> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
        }

        try {
            // Verify ownership using the same approach as addSellerReply
            const { data: reviewBasic, error: reviewBasicError } = await supabase
                .from('reviews')
                .select('product_id')
                .eq('id', reviewId)
                .single();

            if (reviewBasicError || !reviewBasic) {
                console.error('[ReviewService] Review not found:', reviewBasicError);
                throw new Error('Review not found');
            }

            const { data: productData, error: productError } = await supabase
                .from('products')
                .select('seller_id')
                .eq('id', reviewBasic.product_id)
                .single();

            if (productError || !productData) {
                console.error('[ReviewService] Product not found for review:', productError);
                throw new Error('Product not found for this review');
            }

            if (!productData.seller_id) {
                console.error('[ReviewService] Product has no seller_id:', reviewBasic.product_id);
                throw new Error('Product has no associated seller');
            }

            if (productData.seller_id !== sellerId) {
                console.error('[ReviewService] Seller authorization failed:', {
                    productSellerId: productData.seller_id,
                    requestingSellerId: sellerId,
                    reviewId,
                    productId: reviewBasic.product_id
                });
                throw new Error('Unauthorized');
            }

            const { data, error } = await supabase
                .from('reviews')
                .update({
                    seller_reply: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', reviewId)
                .select()
                .single();

            if (error) {
                console.error('[ReviewService] Error deleting seller reply:', error);
                throw new Error('Failed to delete reply');
            }

            return data;
        } catch (error) {
            console.error('[ReviewService] Error in deleteSellerReply:', error);
            throw error;
        }
    }
}

export const reviewService = ReviewService.getInstance();
