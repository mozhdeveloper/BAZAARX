/**
 * Seller Service
 * Handles all seller-related database operations
 * Adheres to the Class-based Service Layer Architecture
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
    business_permit_url?: string | null;
    valid_id_url?: string | null;
    proof_of_address_url?: string | null;
    dti_registration_url?: string | null;
    tax_id_url?: string | null;
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
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching sellers:', error);
            throw new Error('Failed to fetch all sellers.');
        }
    }

    /**
     * Approve seller
     */
    async approveSeller(sellerId: string): Promise<void> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
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
        } catch (error) {
            console.error('Error approving seller:', error);
            throw new Error('Failed to approve seller.');
        }
    }

    /**
     * Reject seller with reason
     */
    async rejectSeller(sellerId: string, reason: string): Promise<void> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
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
            // This is handled by trigger in database, but can be called explicitly
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
}

export const sellerService = SellerService.getInstance();
