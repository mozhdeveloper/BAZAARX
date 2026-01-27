/**
 * Review Service
 * Handles database operations for the reviews table
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type Review = Database['public']['Tables']['reviews']['Row'];
type ReviewInsert = Database['public']['Tables']['reviews']['Insert'];

// Mock data for development when Supabase is not connected
let mockReviews: Review[] = [];

/**
 * Create a new review
 */
export const createReview = async (reviewData: ReviewInsert): Promise<Review | null> => {
    if (!isSupabaseConfigured()) {
        const newReview = {
            ...reviewData,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            helpful_count: 0,
            is_hidden: false,
            is_edited: false,
            images: reviewData.images || [],
        } as Review;
        mockReviews.push(newReview);
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
        return null;
    }
};

/**
 * Get reviews for a specific product
 */
export const getProductReviews = async (
    productId: string,
    page: number = 1,
    limit: number = 5
): Promise<{ reviews: (Review & { buyer?: { full_name: string | null; avatar_url: string | null } })[]; total: number }> => {
    if (!isSupabaseConfigured()) {
        const productReviews = mockReviews.filter(r => r.product_id === productId && !r.is_hidden);
        const start = (page - 1) * limit;
        return {
            reviews: productReviews.slice(start, start + limit),
            total: productReviews.length
        };
    }

    try {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Fetch reviews with total count and buyer profile
        const { data, error, count } = await supabase
            .from('reviews')
            .select('*, buyer:profiles!buyer_id(full_name, avatar_url)', { count: 'exact' })
            .eq('product_id', productId)
            .eq('is_hidden', false)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        return {
            // @ts-ignore - Supabase types might not fully infer the joined relation
            reviews: data || [],
            total: count || 0
        };
    } catch (error) {
        console.error('Error fetching product reviews:', error);
        return { reviews: [], total: 0 };
    }
};

/**
 * Get reviews created by a specific buyer (My Reviews)
 */
export const getBuyerReviews = async (buyerId: string): Promise<Review[]> => {
    if (!isSupabaseConfigured()) {
        return mockReviews.filter(r => r.buyer_id === buyerId);
    }

    try {
        const { data, error } = await supabase
            .from('reviews')
            .select('*, products(name, images)') // Join with products to show item details
            .eq('buyer_id', buyerId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching buyer reviews:', error);
        return [];
    }
};

/**
 * Get reviews for a seller's products (Seller Dashboard)
 */
export const getSellerReviews = async (sellerId: string): Promise<Review[]> => {
    if (!isSupabaseConfigured()) {
        return mockReviews.filter(r => r.seller_id === sellerId);
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
        console.error('Error fetching seller reviews:', error);
        return [];
    }
};

/**
 * Check if a buyer has already reviewed a specific product in an order
 */
export const hasReviewForProduct = async (orderId: string, productId: string): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
        return mockReviews.some(r => r.order_id === orderId && r.product_id === productId);
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
        console.error('Error checking review existence:', error);
        return false;
    }
};
