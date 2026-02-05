import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
     * Fetch all sellers with pending registration
     */
    async getPendingSellers(): Promise<any[]> {
        if (!isSupabaseConfigured()) return [];

        try {
            const { data, error } = await supabase
                .from('sellers')
                .select('*')
                .eq('approval_status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching pending sellers:', error);
            throw new Error('Failed to load pending seller registrations.');
        }
    }

    /**
     * Get platform-wide statistics for admin dashboard
     */
    async getPlatformStats(): Promise<any> {
        if (!isSupabaseConfigured()) return null;

        try {
            // Assuming a database function exists for summary
            const { data, error } = await supabase.rpc('get_admin_dashboard_summary');

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching platform stats:', error);
            // Fallback or error
            return null;
        }
    }

    /**
     * Ban or unban a user
     */
    async toggleUserBan(userId: string, isBanned: boolean): Promise<void> {
        if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

        try {
            const { error } = await supabase
                .from('profiles') // Or wherever the ban status is stored
                .update({ is_banned: isBanned, updated_at: new Date().toISOString() })
                .eq('id', userId);

            if (error) throw error;
        } catch (error) {
            console.error('Error toggling user ban:', error);
            throw new Error(`Failed to ${isBanned ? 'ban' : 'unban'} user.`);
        }
    }

    /**
     * Approve or reject a product
     */
    async updateProductApproval(productId: string, status: 'approved' | 'rejected', reason?: string): Promise<void> {
        if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

        try {
            const { error } = await supabase
                .from('products')
                .update({
                    approval_status: status,
                    rejection_reason: reason || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', productId);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating product approval:', error);
            throw new Error('Failed to update product approval status.');
        }
    }
}

export const adminService = AdminService.getInstance();
