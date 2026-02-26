/**
 * Earnings Service
 * Computes seller earnings from order_items + orders data.
 * Since there's no seller_payouts table, earnings are derived from completed orders.
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface EarningsSummary {
  totalEarnings: number;       // Sum of all paid order items for this seller
  pendingPayout: number;       // Sum of order items in delivered/received orders not yet refunded
  availableBalance: number;    // totalEarnings - refunded amounts
  totalOrders: number;         // Count of orders with seller's products
  ordersThisMonth: number;
  earningsThisMonth: number;
  earningsGrowthPercent: number; // Month-over-month growth
}

export interface PayoutRecord {
  id: string;
  date: string;
  amount: number;
  status: 'completed' | 'pending' | 'processing';
  method: string;
  reference: string;
  orderNumber?: string;
}

export interface EarningsTransaction {
  id: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  date: string;
  buyerName: string;
  status: 'paid' | 'pending' | 'refunded';
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
    image: string | null;
  }>;
}

class EarningsService {
  /**
   * Get seller earnings summary computed from orders
   */
  async getEarningsSummary(sellerId: string): Promise<EarningsSummary> {
    if (!isSupabaseConfigured()) {
      return {
        totalEarnings: 0, pendingPayout: 0, availableBalance: 0,
        totalOrders: 0, ordersThisMonth: 0, earningsThisMonth: 0,
        earningsGrowthPercent: 0,
      };
    }

    try {
      // Get all order items for this seller's products, with order payment status
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select(`
          id, price, price_discount, shipping_price, shipping_discount, quantity, created_at,
          product:products!inner(seller_id),
          order:orders!inner(id, payment_status, shipment_status, paid_at, created_at)
        `)
        .eq('product.seller_id', sellerId);

      if (error) throw error;

      const items = orderItems || [];
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      let totalEarnings = 0;
      let pendingPayout = 0;
      let refundedAmount = 0;
      let earningsThisMonth = 0;
      let earningsLastMonth = 0;
      const uniqueOrders = new Set<string>();
      const uniqueOrdersThisMonth = new Set<string>();

      for (const item of items as any[]) {
        const lineTotal = (item.price - item.price_discount) * item.quantity;
        const order = item.order;
        const itemDate = new Date(order?.created_at || item.created_at);

        uniqueOrders.add(order?.id);

        if (order?.payment_status === 'paid') {
          totalEarnings += lineTotal;

          if (itemDate >= thisMonthStart) {
            earningsThisMonth += lineTotal;
            uniqueOrdersThisMonth.add(order?.id);
          }
          if (itemDate >= lastMonthStart && itemDate <= lastMonthEnd) {
            earningsLastMonth += lineTotal;
          }

          // Pending payout = delivered/received but money not withdrawn
          if (['delivered', 'received'].includes(order?.shipment_status)) {
            pendingPayout += lineTotal;
          }
        } else if (order?.payment_status === 'refunded') {
          refundedAmount += lineTotal;
        }
      }

      const earningsGrowthPercent = earningsLastMonth > 0
        ? ((earningsThisMonth - earningsLastMonth) / earningsLastMonth) * 100
        : earningsThisMonth > 0 ? 100 : 0;

      return {
        totalEarnings,
        pendingPayout,
        availableBalance: totalEarnings - refundedAmount,
        totalOrders: uniqueOrders.size,
        ordersThisMonth: uniqueOrdersThisMonth.size,
        earningsThisMonth,
        earningsGrowthPercent: Math.round(earningsGrowthPercent * 10) / 10,
      };
    } catch (error) {
      console.error('Failed to get earnings summary:', error);
      return {
        totalEarnings: 0, pendingPayout: 0, availableBalance: 0,
        totalOrders: 0, ordersThisMonth: 0, earningsThisMonth: 0,
        earningsGrowthPercent: 0,
      };
    }
  }

  /**
   * Get payout history (derived from paid orders grouped by week)
   */
  async getPayoutHistory(sellerId: string): Promise<PayoutRecord[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      // Get paid orders containing this seller's items
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id, price, price_discount, quantity, created_at,
          product:products!inner(seller_id),
          order:orders!inner(id, order_number, payment_status, paid_at, created_at)
        `)
        .eq('product.seller_id', sellerId)
        .eq('order.payment_status', 'paid')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group payments by week for payout records
      const weeklyPayouts = new Map<string, { amount: number; latestDate: string; orderCount: number }>();

      for (const item of (data || []) as any[]) {
        const orderDate = new Date(item.order?.paid_at || item.order?.created_at || item.created_at);
        // Get the start of the week (Monday)
        const weekStart = new Date(orderDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
        const weekKey = weekStart.toISOString().split('T')[0];

        const lineTotal = (item.price - item.price_discount) * item.quantity;
        const existing = weeklyPayouts.get(weekKey) || { amount: 0, latestDate: orderDate.toISOString(), orderCount: 0 };
        existing.amount += lineTotal;
        existing.orderCount += 1;
        if (orderDate.toISOString() > existing.latestDate) {
          existing.latestDate = orderDate.toISOString();
        }
        weeklyPayouts.set(weekKey, existing);
      }

      // Convert to payout records
      const payouts: PayoutRecord[] = [];
      let index = 1;
      for (const [weekKey, info] of Array.from(weeklyPayouts.entries()).sort((a, b) => b[0].localeCompare(a[0]))) {
        payouts.push({
          id: `pyt-${weekKey}`,
          date: info.latestDate,
          amount: Math.round(info.amount * 100) / 100,
          status: 'completed',
          method: 'Bank Transfer',
          reference: `PYT-${weekKey.replace(/-/g, '')}`,
        });
        index++;
        if (payouts.length >= 20) break; // Limit to 20 most recent weeks
      }

      return payouts;
    } catch (error) {
      console.error('Failed to get payout history:', error);
      return [];
    }
  }

  /**
   * Get recent transactions (individual orders) for the seller
   */
  async getRecentTransactions(sellerId: string, limit = 50): Promise<EarningsTransaction[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id, price, price_discount, quantity, product_name, primary_image_url, created_at,
          product:products!inner(seller_id),
          order:orders!inner(id, order_number, payment_status, buyer_id, created_at,
            buyer:buyers(id, profiles(first_name, last_name))
          )
        `)
        .eq('product.seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Group items by order
      const orderMap = new Map<string, EarningsTransaction>();

      for (const item of (data || []) as any[]) {
        const orderId = item.order?.id;
        if (!orderId) continue;

        const existing = orderMap.get(orderId);
        const lineTotal = (item.price - item.price_discount) * item.quantity;
        const buyer = item.order?.buyer;
        const buyerProfile = buyer?.profiles;
        const buyerName = buyerProfile
          ? `${buyerProfile.first_name || ''} ${buyerProfile.last_name || ''}`.trim()
          : 'Unknown';

        const payStatus = item.order?.payment_status;
        const status: 'paid' | 'pending' | 'refunded' =
          payStatus === 'paid' ? 'paid' :
          payStatus === 'refunded' ? 'refunded' : 'pending';

        if (existing) {
          existing.amount += lineTotal;
          existing.items.push({
            productName: item.product_name,
            quantity: item.quantity,
            price: parseFloat(String(item.price)),
            image: item.primary_image_url,
          });
        } else {
          orderMap.set(orderId, {
            id: orderId,
            orderId,
            orderNumber: item.order?.order_number || '',
            amount: lineTotal,
            date: item.order?.created_at || item.created_at,
            buyerName,
            status,
            items: [{
              productName: item.product_name,
              quantity: item.quantity,
              price: parseFloat(String(item.price)),
              image: item.primary_image_url,
            }],
          });
        }
      }

      return Array.from(orderMap.values());
    } catch (error) {
      console.error('Failed to get recent transactions:', error);
      return [];
    }
  }
}

export const earningsService = new EarningsService();
