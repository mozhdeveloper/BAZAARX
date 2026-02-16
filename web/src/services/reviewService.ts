/**
 * Review Service
 * Handles database operations for the reviews table
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type Review = Database['public']['Tables']['reviews']['Row'];
export type ReviewInsert = Database['public']['Tables']['reviews']['Insert'];

export class ReviewService {
    private mockReviews: Review[] = [];

    /**
     * Create a new review
     */
    async createReview(reviewData: ReviewInsert): Promise<Review | null> {
        if (!isSupabaseConfigured()) {
            const newReview = {
                ...reviewData,
                id: crypto.randomUUID(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                helpful_count: 0,
                is_hidden: false,
                is_edited: false,
            } as Review;
            this.mockReviews.push(newReview);
            return newReview;
        }

        try {
            const { data, error } = await supabase
                .from('reviews')
                .insert(reviewData)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating review:', error);
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
    ): Promise<{
        reviews: (Review & {
            buyer?: { full_name: string | null; avatar_url: string | null };
            review_images?: {
                id: string;
                image_url: string;
                sort_order: number;
                uploaded_at: string;
            }[];
        })[];
        total: number;
    }> {
        if (!isSupabaseConfigured()) {
            const productReviews = this.mockReviews.filter(r => r.product_id === productId && !r.is_hidden);
            const start = (page - 1) * limit;
            return {
                reviews: productReviews.slice(start, start + limit),
                total: productReviews.length
            };
        }

        try {
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            // First try with buyer profile join
            let { data, error, count } = await supabase
                .from('reviews')
                .select('*, review_images(id, image_url, sort_order, uploaded_at)', {
                    count: 'exact',
                })
                .eq('product_id', productId)
                .eq('is_hidden', false)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) {
                console.warn('Error fetching product reviews:', error);
                return { reviews: [], total: 0 };
            }

            return {
                reviews: data || [],
                total: count || 0
            };
        } catch (error) {
            console.error('Error fetching product reviews:', error);
            return { reviews: [], total: 0 };
        }
    }

    /**
     * Get reviews created by a specific buyer (My Reviews)
     */
    async getBuyerReviews(buyerId: string): Promise<Review[]> {
        if (!isSupabaseConfigured()) {
            return this.mockReviews.filter(r => r.buyer_id === buyerId);
        }

        try {
            const { data, error } = await supabase
                .from('reviews')
                .select(`
                    *,
                    product:products!reviews_product_id_fkey (
                        name
                    ),
                    review_images (
                        id,
                        image_url,
                        sort_order,
                        uploaded_at
                    )
                `)
                .eq('buyer_id', buyerId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching buyer reviews:', error);
            throw new Error('Failed to fetch your reviews');
        }
    }

    /**
     * Get reviews for a seller's products (Seller Dashboard & Storefront)
     */
    async getSellerReviews(sellerId: string): Promise<(Review & { 
        buyer?: { full_name: string | null; avatar_url: string | null };
        product?: { id?: string; seller_id?: string | null; name: string | null };
        review_images?: {
            id: string;
            image_url: string;
            sort_order: number;
            uploaded_at: string;
        }[];
    })[]> {
        if (!isSupabaseConfigured()) {
            return this.mockReviews;
        }

        try {
            const { data, error } = await supabase
                .from('reviews')
                .select(`
                    *,
                    review_images (
                        id,
                        image_url,
                        sort_order,
                        uploaded_at
                    ),
                    product:products!reviews_product_id_fkey (
                        id,
                        seller_id,
                        name
                    )
                `)
                .eq('is_hidden', false)
                .eq('product.seller_id', sellerId)
                .order('created_at', { ascending: false });

            if (error) {
                console.warn('Error fetching seller reviews:', error);
                return [];
            }
            return data || [];
        } catch (error) {
            console.error('Error fetching seller reviews:', error);
            throw new Error('Failed to fetch store reviews');
        }
    }

    /**
     * Check if a buyer has already reviewed a specific product in an order
     */
    async hasReviewForProduct(
        orderId: string,
        productId: string,
        buyerId?: string,
    ): Promise<boolean> {
        if (!isSupabaseConfigured()) {
            return this.mockReviews.some((r) =>
                r.order_id === orderId &&
                r.product_id === productId &&
                (!buyerId || r.buyer_id === buyerId),
            );
        }

        try {
            let query = supabase
                .from('reviews')
                .select('id', { count: 'exact', head: true })
                .eq('order_id', orderId)
                .eq('product_id', productId);

            if (buyerId) {
                query = query.eq('buyer_id', buyerId);
            }

            const { count, error } = await query;

            if (error) throw error;
            return (count || 0) > 0;
        } catch (error) {
            console.error('Error checking review existence:', error);
            throw new Error('Failed to check review status');
        }
    }
}

export const reviewService = new ReviewService();
