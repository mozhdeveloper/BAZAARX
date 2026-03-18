/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Buyer, BuyerAddress, BuyerMetrics } from './adminTypes';
export const useAdminBuyers = create<BuyersState>((set) => ({
  buyers: [],
  selectedBuyer: null,
  isLoading: false,
  error: null,

  loadBuyers: async () => {
    set({ isLoading: true });

    try {
      if (!isSupabaseConfigured()) {
        set({ isLoading: false });
        return;
      }

      // Fetch buyers with profiles and addresses
      const { data: buyersData, error } = await supabase
        .from('buyers')
        .select(`
          id,
          avatar_url,
          bazcoins,
          created_at,
          updated_at,
          profiles!inner(email, first_name, last_name, phone, last_login_at)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch addresses for all buyers
      const buyerIds = (buyersData || []).map((b: any) => b.id);
      const { data: addresses } = buyerIds.length > 0
        ? await supabase
            .from('shipping_addresses')
            .select('id, user_id, label, address_line_1, city, province, postal_code, is_default')
            .in('user_id', buyerIds)
        : { data: [] };

      // Fetch order metrics per buyer
      const { data: orderMetrics } = buyerIds.length > 0
        ? await supabase
            .from('orders')
            .select('buyer_id, payment_status, shipment_status, order_items(price, quantity, price_discount)')
            .in('buyer_id', buyerIds)
        : { data: [] };

      // Build metrics map
      const metricsMap: Record<string, BuyerMetrics> = {};
      (orderMetrics || []).forEach((o: any) => {
        if (!o.buyer_id) return;
        if (!metricsMap[o.buyer_id]) {
          metricsMap[o.buyer_id] = { totalOrders: 0, totalSpent: 0, averageOrderValue: 0, cancelledOrders: 0, returnedOrders: 0, bazcoins: 0 };
        }
        metricsMap[o.buyer_id].totalOrders += 1;
        const orderTotal = (o.order_items || []).reduce((sum: number, item: any) =>
          sum + ((Number(item.price) - Number(item.price_discount || 0)) * Number(item.quantity)), 0);
        metricsMap[o.buyer_id].totalSpent += orderTotal;
        if (o.shipment_status === 'returned') metricsMap[o.buyer_id].returnedOrders += 1;
      });

      // Build addresses map
      const addrMap: Record<string, BuyerAddress[]> = {};
      (addresses || []).forEach((a: any) => {
        if (!addrMap[a.user_id]) addrMap[a.user_id] = [];
        addrMap[a.user_id].push({
          id: a.id,
          label: a.label || 'Address',
          street: a.address_line_1 || '',
          city: a.city || '',
          province: a.province || '',
          zipCode: a.postal_code || '',
          isDefault: a.is_default || false,
        });
      });

      const buyers: Buyer[] = (buyersData || []).map((b: any) => {
        const profile = b.profiles;
        const metrics = metricsMap[b.id] || { totalOrders: 0, totalSpent: 0, averageOrderValue: 0, cancelledOrders: 0, returnedOrders: 0, bazcoins: 0 };
        metrics.bazcoins = b.bazcoins || 0;
        if (metrics.totalOrders > 0) metrics.averageOrderValue = Math.round(metrics.totalSpent / metrics.totalOrders);

        return {
          id: b.id,
          email: profile?.email || '',
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          phone: profile?.phone || undefined,
          avatar: b.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((profile?.first_name || '') + '+' + (profile?.last_name || ''))}&background=FF6A00&color=fff`,
          isEmailVerified: true,
          isPhoneVerified: !!profile?.phone,
          status: 'active' as const,
          addresses: addrMap[b.id] || [],
          metrics,
          joinDate: new Date(b.created_at),
          lastActivity: profile?.last_login_at ? new Date(profile.last_login_at) : undefined,
        };
      });

      set({ buyers, isLoading: false });
    } catch (error) {
      console.error('Error loading buyers:', error);
      set({ error: 'Failed to load buyers', isLoading: false });
    }
  },

  suspendBuyer: async (id, _reason) => {
    set({ isLoading: true });
    // Note: buyers table doesn't have a status column in current schema
    // We update local state; a migration would be needed for DB-backed status
    set(state => ({
      buyers: state.buyers.map(buyer =>
        buyer.id === id
          ? { ...buyer, status: 'suspended' as const }
          : buyer
      ),
      isLoading: false
    }));
  },

  activateBuyer: async (id) => {
    set({ isLoading: true });
    set(state => ({
      buyers: state.buyers.map(buyer =>
        buyer.id === id
          ? { ...buyer, status: 'active' as const }
          : buyer
      ),
      isLoading: false
    }));
  },

  selectBuyer: (buyer) => set({ selectedBuyer: buyer }),
  clearError: () => set({ error: null })
}));

// Admin Dashboard Stats Store
interface AdminStatsState {
  stats: {
    totalRevenue: number;
    totalOrders: number;
    totalSellers: number;
    totalBuyers: number;
    pendingApprovals: number;
    revenueGrowth: number;
    ordersGrowth: number;
    sellersGrowth: number;
    buyersGrowth: number;
    productRequests: number;
    productRequestsGrowth: string;
  };
  recentActivity: Array<{
    id: string;
    type: 'order' | 'seller_registration' | 'product_listing' | 'dispute';
    description: string;
    timestamp: Date;
    status: 'success' | 'warning' | 'error';
  }>;
  revenueChart: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  topCategories: Array<{
    name: string;
    revenue: number;
    growth: number;
  }>;
  isLoading: boolean;
  loadDashboardData: () => Promise<void>;
}

