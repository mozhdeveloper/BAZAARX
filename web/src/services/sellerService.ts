/**
 * Seller Service  
 * Handles all seller-related database operations
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

type SellerInsert = Omit<SellerData, 'created_at' | 'updated_at' | 'join_date'>;
type SellerUpdate = Partial<Omit<SellerData, 'id' | 'created_at' | 'join_date'>>;

export class SellerService {
    /**
     * Get seller by ID
     */
    async getSellerById(sellerId: string): Promise<SellerData | null> {
        if (!isSupabaseConfigured()) {
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
            return null;
        }
    }

    /**
     * Create or update seller profile
     */
    async upsertSeller(seller: SellerInsert): Promise<SellerData | null> {
        if (!isSupabaseConfigured()) {
            return null;
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
            return data;
        } catch (error) {
            console.error('Error upserting seller:', error);
            return null;
        }
    }

    /**
     * Update seller profile
     */
    async updateSeller(sellerId: string, updates: SellerUpdate): Promise<SellerData | null> {
        if (!isSupabaseConfigured()) {
            return null;
        }

        try {
            const { data, error } = await supabase
                .from('sellers')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', sellerId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating seller:', error);
            return null;
        }
    }

    /**
     * Get all sellers (admin use)
     */
    async getAllSellers(): Promise<SellerData[]> {
        if (!isSupabaseConfigured()) {
            return [];
        }

        try {
            const { data, error } = await supabase
                .from('sellers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching sellers:', error);
            return [];
        }
    }

    /**
     * Approve seller
     */
    async approveSeller(sellerId: string): Promise<boolean> {
        if (!isSupabaseConfigured()) {
            return false;
        }

        try {
            const { error } = await supabase
                .from('sellers')
                .update({
                    approval_status: 'approved',
                    is_verified: true,
                    rejection_reason: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', sellerId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error approving seller:', error);
            return false;
        }
    }

    /**
     * Reject seller with reason
     */
    async rejectSeller(sellerId: string, reason: string): Promise<boolean> {
        if (!isSupabaseConfigured()) {
            return false;
        }

        try {
            const { error } = await supabase
                .from('sellers')
                .update({
                    approval_status: 'rejected',
                    rejection_reason: reason,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', sellerId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error rejecting seller:', error);
            return false;
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
            return null;
        }
    }

    /**
     * Update seller rating (called after review)
     */
    async updateSellerRating(sellerId: string): Promise<boolean> {
        if (!isSupabaseConfigured()) {
            return false;
        }

        try {
            // This is handled by trigger in database, but can be called explicitly
            const { data: reviews } = await supabase
                .from('reviews')
                .select('rating')
                .eq('seller_id', sellerId)
                .eq('is_hidden', false);

            if (reviews && reviews.length > 0) {
                const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

                const { error } = await supabase
                    .from('sellers')
                    .update({
                        rating: Number(avgRating.toFixed(1)),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', sellerId);

                if (error) throw error;
            }

            return true;
        } catch (error) {
            console.error('Error updating seller rating:', error);
            return false;
        }
    }
}

// Export singleton instance
export const sellerService = new SellerService();
