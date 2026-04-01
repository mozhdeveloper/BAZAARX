/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Payout } from './adminTypes';
interface PayoutsState {
  payouts: Payout[];
  isLoading: boolean;
  error: string | null;
  loadPayouts: () => Promise<void>;
  markAsPaid: (id: string, referenceNumber: string) => Promise<void>;
  processBatch: (ids: string[]) => Promise<void>;
}

export const useAdminPayouts = create<PayoutsState>((set) => ({
  payouts: [],
  isLoading: false,
  error: null,

  loadPayouts: async () => {
    set({ isLoading: true, error: null });

    try {
      // Compute payouts from order_items joined with seller info and payout accounts
      // Group by seller, aggregate their earnings from paid orders
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          id, price, price_discount, quantity, created_at,
          product:products!inner(seller_id, sellers:sellers(id, store_name)),
          order:orders!inner(id, payment_status, shipment_status, paid_at, created_at)
        `)
        .in('order.payment_status', ['paid', 'refunded'])
        .limit(1000);

      if (itemsError) throw itemsError;

      // Get seller payout accounts
      const { data: payoutAccounts } = await supabase
        .from('seller_payout_accounts')
        .select('seller_id, bank_name, account_name, account_number');

      const accountMap = new Map<string, { bankName: string; accountNumber: string }>();
      for (const acc of (payoutAccounts || [])) {
        accountMap.set(acc.seller_id, {
          bankName: acc.bank_name || 'Not set',
          accountNumber: acc.account_number || 'N/A',
        });
      }

      // Group by seller
      const sellerPayouts = new Map<string, {
        sellerId: string;
        sellerName: string;
        totalPaid: number;
        totalPending: number;
        latestDate: string;
        earliestDate: string;
      }>();

      for (const item of (orderItems || []) as any[]) {
        const sellerId = item.product?.seller_id;
        const sellerName = item.product?.sellers?.store_name || 'Unknown Store';
        if (!sellerId) continue;

        const lineTotal = (item.price - item.price_discount) * item.quantity;
        const existing = sellerPayouts.get(sellerId) || {
          sellerId,
          sellerName,
          totalPaid: 0,
          totalPending: 0,
          latestDate: item.order?.created_at || item.created_at,
          earliestDate: item.order?.created_at || item.created_at,
        };

        if (item.order?.payment_status === 'paid') {
          if (['delivered', 'received'].includes(item.order?.shipment_status)) {
            existing.totalPaid += lineTotal;
          } else {
            existing.totalPending += lineTotal;
          }
        }

        const dateStr = item.order?.created_at || item.created_at;
        if (dateStr > existing.latestDate) existing.latestDate = dateStr;
        if (dateStr < existing.earliestDate) existing.earliestDate = dateStr;

        sellerPayouts.set(sellerId, existing);
      }

      // Convert to Payout records
      const payouts: Payout[] = [];
      let idx = 1;
      for (const [sellerId, info] of sellerPayouts.entries()) {
        const account = accountMap.get(sellerId);
        const total = info.totalPaid + info.totalPending;
        if (total <= 0) continue;

        payouts.push({
          id: sellerId,
          referenceNumber: `PAY-${new Date().getFullYear()}-${String(idx).padStart(3, '0')}`,
          sellerId,
          sellerName: info.sellerName,
          amount: Math.round(total * 100) / 100,
          status: info.totalPending > 0 ? 'pending' : 'paid',
          periodStart: new Date(info.earliestDate),
          periodEnd: new Date(info.latestDate),
          payoutDate: info.totalPending === 0 ? new Date(info.latestDate) : undefined,
          bankName: account?.bankName || 'Not set',
          accountNumber: account?.accountNumber || 'N/A',
        });
        idx++;
      }

      set({ payouts, isLoading: false });
    } catch (error: any) {
      console.error('Failed to load payouts:', error);
      set({ error: error.message || 'Failed to load payouts', isLoading: false });
    }
  },

  markAsPaid: async (id, referenceNumber) => {
    set({ isLoading: true });
    // In the current schema there's no seller_payouts table to update,
    // so we update local state and log the action. When seller_payouts
    // table is added, this should INSERT/UPDATE there.
    set(state => ({
      payouts: state.payouts.map(p =>
        p.id === id
          ? { ...p, status: 'paid' as const, referenceNumber, payoutDate: new Date() }
          : p
      ),
      isLoading: false
    }));
  },

  processBatch: async (ids) => {
    set({ isLoading: true });
    // Same note as markAsPaid — update local state for now
    set(state => ({
      payouts: state.payouts.map(p =>
        ids.includes(p.id)
          ? { ...p, status: 'processing' as const }
          : p
      ),
      isLoading: false
    }));
  }
}));
