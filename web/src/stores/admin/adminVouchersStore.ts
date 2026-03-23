/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Voucher } from './adminTypes';
// Voucher Management Store
interface VouchersState {
  vouchers: Voucher[];
  selectedVoucher: Voucher | null;
  isLoading: boolean;
  error: string | null;
  loadVouchers: () => Promise<void>;
  addVoucher: (voucher: Omit<Voucher, 'id' | 'usedCount' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateVoucher: (id: string, updates: Partial<Voucher>) => Promise<void>;
  deleteVoucher: (id: string) => Promise<void>;
  toggleVoucherStatus: (id: string) => Promise<void>;
  selectVoucher: (voucher: Voucher | null) => void;
  clearError: () => void;
}

export const useAdminVouchers = create<VouchersState>((set, get) => ({
  vouchers: [],
  selectedVoucher: null,
  isLoading: false,
  error: null,

  loadVouchers: async () => {
    set({ isLoading: true, error: null });

    try {
      const { voucherService } = await import('@/services/voucherService');
      const dbVouchers = await voucherService.getAllVouchers();

      // Map database vouchers to admin store format
      const mappedVouchers: Voucher[] = dbVouchers.map(v => ({
        id: v.id,
        code: v.code,
        title: v.title,
        description: v.description || '',
        type: v.voucher_type === 'shipping' ? 'free_shipping' : v.voucher_type as 'percentage' | 'fixed',
        value: v.value,
        minPurchase: v.min_order_value,
        maxDiscount: v.max_discount || undefined,
        usageLimit: v.usage_limit || 0,
        claimLimit: v.claim_limit ?? null,
        usedCount: 0,
        startDate: new Date(v.claimable_from),
        endDate: new Date(v.claimable_until),
        isActive: v.is_active,
        applicableTo: v.seller_id ? 'seller' : 'all',
        targetIds: v.seller_id ? [v.seller_id] : undefined,
        createdAt: new Date(v.created_at),
        updatedAt: new Date(v.updated_at)
      }));

      set({ vouchers: mappedVouchers, isLoading: false });
    } catch (error) {
      console.error('Error loading vouchers:', error);
      set({ error: 'Failed to load vouchers', isLoading: false, vouchers: [] });
    }
  },

  addVoucher: async (voucherData) => {
    set({ isLoading: true, error: null });

    try {
      const { voucherService } = await import('@/services/voucherService');

      // Map admin store format to database format
      const dbVoucherData = {
        code: voucherData.code.toUpperCase(),
        title: voucherData.title,
        description: voucherData.description,
        voucher_type: (voucherData.type === 'free_shipping' ? 'shipping' : voucherData.type) as 'percentage' | 'fixed' | 'shipping',
        value: voucherData.value,
        min_order_value: voucherData.minPurchase,
        max_discount: voucherData.maxDiscount || null,
        seller_id: voucherData.applicableTo === 'seller' && voucherData.targetIds?.[0] ? voucherData.targetIds[0] : null,
        claimable_from: voucherData.startDate.toISOString(),
        claimable_until: voucherData.endDate.toISOString(),
        usage_limit: voucherData.usageLimit || null,
        claim_limit: voucherData.claimLimit ?? null,
        duration: null,
        is_active: voucherData.isActive
      };

      const newDbVoucher = await voucherService.createVoucher(dbVoucherData);

      // Map back to admin store format
      const newVoucher: Voucher = {
        id: newDbVoucher.id,
        code: newDbVoucher.code,
        title: newDbVoucher.title,
        description: newDbVoucher.description || '',
        type: newDbVoucher.voucher_type === 'shipping' ? 'free_shipping' : newDbVoucher.voucher_type as 'percentage' | 'fixed',
        value: newDbVoucher.value,
        minPurchase: newDbVoucher.min_order_value,
        maxDiscount: newDbVoucher.max_discount || undefined,
        usageLimit: newDbVoucher.usage_limit || 0,
        claimLimit: newDbVoucher.claim_limit ?? null,
        usedCount: 0,
        startDate: new Date(newDbVoucher.claimable_from),
        endDate: new Date(newDbVoucher.claimable_until),
        isActive: newDbVoucher.is_active,
        applicableTo: newDbVoucher.seller_id ? 'seller' : 'all',
        targetIds: newDbVoucher.seller_id ? [newDbVoucher.seller_id] : undefined,
        createdAt: new Date(newDbVoucher.created_at),
        updatedAt: new Date(newDbVoucher.updated_at)
      };

      set(state => ({
        vouchers: [...state.vouchers, newVoucher],
        isLoading: false
      }));
    } catch (error) {
      console.error('Error adding voucher:', error);
      set({ error: 'Failed to create voucher', isLoading: false });
    }
  },

  updateVoucher: async (id, updates) => {
    set({ isLoading: true, error: null });

    try {
      const { voucherService } = await import('@/services/voucherService');

      // Map admin store updates to database format
      const dbUpdates: any = {};
      if (updates.code) dbUpdates.code = updates.code.toUpperCase();
      if (updates.title) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.type) dbUpdates.voucher_type = updates.type === 'free_shipping' ? 'shipping' : updates.type;
      if (updates.value !== undefined) dbUpdates.value = updates.value;
      if (updates.minPurchase !== undefined) dbUpdates.min_order_value = updates.minPurchase;
      if (updates.maxDiscount !== undefined) dbUpdates.max_discount = updates.maxDiscount || null;
      if (updates.usageLimit !== undefined) dbUpdates.usage_limit = updates.usageLimit || null;
      if (updates.claimLimit !== undefined) dbUpdates.claim_limit = updates.claimLimit ?? null;
      if (updates.startDate) dbUpdates.claimable_from = updates.startDate.toISOString();
      if (updates.endDate) dbUpdates.claimable_until = updates.endDate.toISOString();
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

      const updatedDbVoucher = await voucherService.updateVoucher(id, dbUpdates);

      set(state => ({
        vouchers: state.vouchers.map(voucher =>
          voucher.id === id
            ? {
              ...voucher,
              code: updatedDbVoucher.code,
              title: updatedDbVoucher.title,
              description: updatedDbVoucher.description || '',
              type: updatedDbVoucher.voucher_type === 'shipping' ? 'free_shipping' : updatedDbVoucher.voucher_type as 'percentage' | 'fixed',
              value: updatedDbVoucher.value,
              minPurchase: updatedDbVoucher.min_order_value,
              maxDiscount: updatedDbVoucher.max_discount || undefined,
              usageLimit: updatedDbVoucher.usage_limit || 0,
              claimLimit: updatedDbVoucher.claim_limit ?? null,
              startDate: new Date(updatedDbVoucher.claimable_from),
              endDate: new Date(updatedDbVoucher.claimable_until),
              isActive: updatedDbVoucher.is_active,
              updatedAt: new Date(updatedDbVoucher.updated_at)
            }
            : voucher
        ),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error updating voucher:', error);
      set({ error: 'Failed to update voucher', isLoading: false });
    }
  },

  deleteVoucher: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const { voucherService } = await import('@/services/voucherService');
      await voucherService.deleteVoucher(id);

      set(state => ({
        vouchers: state.vouchers.filter(voucher => voucher.id !== id),
        selectedVoucher: state.selectedVoucher?.id === id ? null : state.selectedVoucher,
        isLoading: false
      }));
    } catch (error) {
      console.error('Error deleting voucher:', error);
      set({ error: 'Failed to delete voucher', isLoading: false });
    }
  },

  toggleVoucherStatus: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const { voucherService } = await import('@/services/voucherService');
      const currentVoucher = get().vouchers.find(v => v.id === id);

      if (!currentVoucher) {
        throw new Error('Voucher not found');
      }

      const updatedDbVoucher = await voucherService.updateVoucher(id, {
        is_active: !currentVoucher.isActive
      });

      set(state => ({
        vouchers: state.vouchers.map(voucher =>
          voucher.id === id
            ? { ...voucher, isActive: updatedDbVoucher.is_active, updatedAt: new Date(updatedDbVoucher.updated_at) }
            : voucher
        ),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error toggling voucher status:', error);
      set({ error: 'Failed to toggle voucher status', isLoading: false });
    }
  },

  selectVoucher: (voucher) => set({ selectedVoucher: voucher }),
  clearError: () => set({ error: null })
}));
