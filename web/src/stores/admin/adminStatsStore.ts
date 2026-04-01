/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
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

export const useAdminStats = create<AdminStatsState>((set) => ({
  stats: {
    totalRevenue: 0,
    totalOrders: 0,
    totalSellers: 0,
    totalBuyers: 0,
    pendingApprovals: 0,
    revenueGrowth: 0,
    ordersGrowth: 0,
    sellersGrowth: 0,
    buyersGrowth: 0,
    productRequests: 0,
    productRequestsGrowth: '+0%',
  },
  recentActivity: [],
  revenueChart: [],
  topCategories: [],
  isLoading: false,

  loadDashboardData: async () => {
    set({ isLoading: true });

    try {
      if (!isSupabaseConfigured()) {
        set({ isLoading: false });
        return;
      }

      // Fetch counts in parallel
      const [sellersRes, buyersRes, ordersRes, pendingRes, productReqRes] = await Promise.all([
        supabase.from('sellers').select('id', { count: 'exact', head: true }),
        supabase.from('buyers').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('sellers').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending'),
        supabase.from('product_requests').select('id', { count: 'exact', head: true }),
      ]);

      // Fetch revenue from paid orders
      const { data: paidOrders } = await supabase
        .from('order_items')
        .select('price, quantity, price_discount, order_id, orders!inner(payment_status)')
        .eq('orders.payment_status', 'paid')
        .limit(1000);

      const totalRevenue = (paidOrders || []).reduce((sum, item: any) => {
        return sum + ((Number(item.price) - Number(item.price_discount || 0)) * Number(item.quantity));
      }, 0);

      // Recent activity from recent orders and sellers
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, order_number, created_at, buyer_id, buyer:buyer_id(profile:id(first_name, last_name))')
        .order('created_at', { ascending: false })
        .limit(3);

      const { data: recentSellers } = await supabase
        .from('sellers')
        .select('id, store_name, created_at, approval_status')
        .order('created_at', { ascending: false })
        .limit(2);

      const activity: Array<{ id: string; type: 'order' | 'seller_registration' | 'product_listing' | 'dispute'; description: string; timestamp: Date; status: 'success' | 'warning' | 'error' }> = [];

      (recentOrders || []).forEach((o: any) => {
        const profile = o.buyer?.profile;
        const buyerName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Unknown';
        activity.push({
          id: o.id,
          type: 'order',
          description: `New order #${o.order_number} placed by ${buyerName}`,
          timestamp: new Date(o.created_at),
          status: 'success'
        });
      });

      (recentSellers || []).forEach((s: any) => {
        activity.push({
          id: s.id,
          type: 'seller_registration',
          description: `${s.approval_status === 'pending' ? 'New seller application' : 'Seller registered'}: ${s.store_name}`,
          timestamp: new Date(s.created_at),
          status: s.approval_status === 'pending' ? 'warning' : 'success'
        });
      });

      activity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Revenue chart — last 30 days from real orders
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: chartOrders } = await supabase
        .from('orders')
        .select('id, created_at, order_items(price, quantity, price_discount)')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      const dayMap: Record<string, { revenue: number; orders: number }> = {};
      for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - 29 + i);
        dayMap[d.toISOString().split('T')[0]] = { revenue: 0, orders: 0 };
      }

      (chartOrders || []).forEach((o: any) => {
        const day = new Date(o.created_at).toISOString().split('T')[0];
        if (dayMap[day]) {
          dayMap[day].orders += 1;
          (o.order_items || []).forEach((item: any) => {
            dayMap[day].revenue += (Number(item.price) - Number(item.price_discount || 0)) * Number(item.quantity);
          });
        }
      });

      const revenueChart = Object.entries(dayMap).map(([date, val]) => ({
        date,
        revenue: Math.round(val.revenue),
        orders: val.orders,
      }));

      // Top categories from order items
      const { data: catItems } = await supabase
        .from('order_items')
        .select('price, quantity, price_discount, product_id, products!inner(category_id, categories!inner(name))')
        .limit(500);

      const catMap: Record<string, number> = {};
      (catItems || []).forEach((item: any) => {
        const catName = item.products?.categories?.name || 'Other';
        const rev = (Number(item.price) - Number(item.price_discount || 0)) * Number(item.quantity);
        catMap[catName] = (catMap[catName] || 0) + rev;
      });

      const topCategories = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, revenue]) => ({ name, revenue: Math.round(revenue), growth: 0 }));

      set({
        stats: {
          totalRevenue: Math.round(totalRevenue),
          totalOrders: ordersRes.count || 0,
          totalSellers: sellersRes.count || 0,
          totalBuyers: buyersRes.count || 0,
          pendingApprovals: pendingRes.count || 0,
          revenueGrowth: 0,
          ordersGrowth: 0,
          sellersGrowth: 0,
          buyersGrowth: 0,
          productRequests: productReqRes.count || 0,
          productRequestsGrowth: '+0%',
        },
        recentActivity: activity.slice(0, 5),
        revenueChart,
        topCategories,
        isLoading: false
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      set({ isLoading: false });
    }
  }
}));

// Voucher Types
