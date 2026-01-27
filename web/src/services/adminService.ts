/**
 * Admin Service
 * Handles all admin-related database operations
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
    /**
     * Get admin by ID
     */
    async getAdminById(adminId: string): Promise<AdminData | null> {
        if (!isSupabaseConfigured()) {
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
            return null;
        }
    }

    /**
     * Get all pending sellers
     */
    async getPendingSellers(): Promise<SellerData[]> {
        if (!isSupabaseConfigured()) {
            return [];
        }

        try {
            const { data, error } = await supabase
                .from('sellers')
                .select('*')
                .eq('approval_status', 'pending')
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching pending sellers:', error);
            return [];
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
                supabase.from('sellers').select('*', { count: 'exact', head: true }),
                supabase.from('buyers').select('*', { count: 'exact', head: true }),
                supabase.from('orders').select('*', { count: 'exact', head: true }),
                supabase.from('products').select('*', { count: 'exact', head: true }),
            ]);

            return {
                totalSellers: sellersCount.count || 0,
                totalBuyers: buyersCount.count || 0,
                totalOrders: ordersCount.count || 0,
                totalProducts: productsCount.count || 0,
            };
        } catch (error) {
            console.error('Error fetching platform stats:', error);
            return null;
        }
    }

    /**
     * Get all buyers
     */
    async getAllBuyers(): Promise<any[]> {
        if (!isSupabaseConfigured()) {
            return [];
        }

        try {
            const { data, error } = await supabase
                .from('buyers')
                .select('*, profiles(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching buyers:', error);
            return [];
        }
    }

    /**
     * Get all orders (admin view)
     */
    async getAllOrders(): Promise<any[]> {
        if (!isSupabaseConfigured()) {
            return [];
        }

        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching orders:', error);
            return [];
        }
    }

    /**
     * Ban/Suspend user
     */
    async banUser(userId: string, userType: 'buyer' | 'seller'): Promise<boolean> {
        if (!isSupabaseConfigured()) {
            return false;
        }

        try {
            // This would typically involve updating a status field
            // For now, we'll update the profile or respective table
            const table = userType === 'buyer' ? 'buyers' : 'sellers';

            const { error } = await supabase
                .from(table)
                .update({
                    // Add a status field in your schema if needed
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error banning user:', error);
            return false;
        }
    }
}

// Export singleton instance
export const adminService = new AdminService();
