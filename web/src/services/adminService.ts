/**
 * Admin Service
 * Handles all admin-related database operations
 * Adheres to the Class-based Service Layer Architecture
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { SellerData } from './sellerService';

export interface AdminData {
    id: string;
    role: 'admin' | 'super_admin' | 'moderator';
    permissions: Record<string, boolean>;
    created_at: string;
    updated_at: string;
}

export class AdminService {
    private static instance: AdminService;

    private constructor() { }

    public static getInstance(): AdminService {
        if (!AdminService.instance) {
            AdminService.instance = new AdminService();
        }
        return AdminService.instance;
    }

    /**
     * Get admin by ID
     */
    async getAdminById(adminId: string): Promise<AdminData | null> {
        if (!isSupabaseConfigured()) {
            console.warn('Supabase not configured - cannot fetch admin');
            return null;
        }

        try {
            const { data, error } = await supabase
                .from('admins')
                .select('*')
                .eq('id', adminId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching admin:', error);
            throw new Error('Failed to fetch admin information.');
        }
    }

    /**
     * Get all pending sellers
     */
    async getPendingSellers(): Promise<SellerData[]> {
        if (!isSupabaseConfigured()) {
            console.warn('Supabase not configured - cannot fetch pending sellers');
            return [];
        }

        try {
            const { data, error } = await supabase
                .from('sellers')
                .select('id, store_name, approval_status, created_at, avatar_url')
                .eq('approval_status', 'pending')
                .order('created_at', { ascending: true })
                .limit(50);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching pending sellers:', error);
            throw new Error('Failed to fetch pending sellers.');
        }
    }

    /**
     * Get platform statistics
     */
    async getPlatformStats(): Promise<any> {
        if (!isSupabaseConfigured()) {
            return null;
        }

        try {
            // Get counts for different entities
            const [sellersCount, buyersCount, ordersCount, productsCount] = await Promise.all([
                supabase.from('sellers').select('id', { count: 'exact', head: true }),
                supabase.from('buyers').select('id', { count: 'exact', head: true }),
                supabase.from('orders').select('id', { count: 'exact', head: true }),
                supabase.from('products').select('id', { count: 'exact', head: true }),
            ]);

            return {
                totalSellers: sellersCount.count || 0,
                totalBuyers: buyersCount.count || 0,
                totalOrders: ordersCount.count || 0,
                totalProducts: productsCount.count || 0,
            };
        } catch (error) {
            console.error('Error fetching platform stats:', error);
            throw new Error('Failed to fetch platform statistics.');
        }
    }

    /**
     * Get all buyers
     */
    async getAllBuyers(): Promise<any[]> {
        if (!isSupabaseConfigured()) {
            console.warn('Supabase not configured - cannot fetch buyers');
            return [];
        }

        try {
            const { data, error } = await supabase
                .from('buyers')
                .select('id, created_at, avatar_url, profiles(id, first_name, last_name, email, phone)')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching buyers:', error);
            throw new Error('Failed to fetch all buyers.');
        }
    }

    /**
     * Get all orders (admin view)
     */
    async getAllOrders(): Promise<any[]> {
        if (!isSupabaseConfigured()) {
            console.warn('Supabase not configured - cannot fetch orders');
            return [];
        }

        try {
            const { data, error } = await supabase
                .from('orders')
                .select('id, order_number, buyer_id, payment_status, shipment_status, created_at, order_items(id, product_id, price, price_discount, quantity, product_name)')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching orders:', error);
            throw new Error('Failed to fetch all orders.');
        }
    }

    /**
     * Ban/Suspend user
     */
    async banUser(userId: string, userType: 'buyer' | 'seller'): Promise<void> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
        }

        try {
            const table = userType === 'buyer' ? 'buyers' : 'sellers';

            const { error } = await supabase
                .from(table)
                .update({
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId);

            if (error) throw error;
        } catch (error) {
            console.error('Error banning user:', error);
            throw new Error('Failed to ban user.');
        }
    }
}

export const adminService = AdminService.getInstance();
