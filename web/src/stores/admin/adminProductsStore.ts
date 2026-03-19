/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { AdminProduct } from './adminTypes';
interface ProductsState {
  products: AdminProduct[];
  isLoading: boolean;
  error: string | null;
  loadProducts: () => Promise<void>;
  deactivateProduct: (id: string, reason: string) => Promise<void>;
  activateProduct: (id: string) => Promise<void>;
}

export const useAdminProducts = create<ProductsState>((set) => ({
  products: [],
  isLoading: false,
  error: null,

  loadProducts: async () => {
    set({ isLoading: true });

    try {
      if (!isSupabaseConfigured()) {
        set({ isLoading: false });
        return;
      }

      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          category_id,
          seller_id,
          approval_status,
          disabled_at,
          created_at,
          updated_at,
          categories(name),
          sellers(store_name),
          product_images(image_url, is_primary, sort_order)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      // Get stock from product_variants where applicable
      const productIds = (products || []).map((p: any) => p.id);
      const { data: variants } = productIds.length > 0
        ? await supabase
            .from('product_variants')
            .select('product_id, stock')
            .in('product_id', productIds)
        : { data: [] };

      const stockMap: Record<string, number> = {};
      (variants || []).forEach((v: any) => {
        stockMap[v.product_id] = (stockMap[v.product_id] || 0) + (v.stock || 0);
      });

      // Get review averages
      const { data: reviewAvgs } = productIds.length > 0
        ? await supabase
            .from('reviews')
            .select('product_id, rating')
            .in('product_id', productIds)
        : { data: [] };

      const ratingMap: Record<string, { sum: number; count: number }> = {};
      (reviewAvgs || []).forEach((r: any) => {
        if (!ratingMap[r.product_id]) ratingMap[r.product_id] = { sum: 0, count: 0 };
        ratingMap[r.product_id].sum += r.rating;
        ratingMap[r.product_id].count += 1;
      });

      const adminProducts: AdminProduct[] = (products || []).map((p: any) => {
        const images = (p.product_images || [])
          .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
        const primaryImage = images.find((i: any) => i.is_primary) || images[0];
        const rating = ratingMap[p.id] ? Math.round((ratingMap[p.id].sum / ratingMap[p.id].count) * 10) / 10 : 0;

        let status: 'active' | 'inactive' | 'banned' = 'active';
        if (p.disabled_at) status = 'banned';
        else if (p.approval_status === 'rejected') status = 'banned';
        else if (p.approval_status === 'pending') status = 'inactive';

        return {
          id: p.id,
          name: p.name || '',
          description: p.description || '',
          price: Number(p.price) || 0,
          stock: stockMap[p.id] || 0,
          category: p.categories?.name || 'Uncategorized',
          images: primaryImage ? [primaryImage.image_url] : [],
          sellerId: p.seller_id || '',
          sellerName: p.sellers?.store_name || 'Unknown Seller',
          status,
          rating,
          sales: 0,
          createdAt: new Date(p.created_at),
          updatedAt: new Date(p.updated_at),
        };
      });

      set({ products: adminProducts, isLoading: false });
    } catch (error) {
      console.error('Error loading admin products:', error);
      set({ error: 'Failed to load products', isLoading: false });
    }
  },

  deactivateProduct: async (id, _reason) => {
    set({ isLoading: true });
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('products')
          .update({ disabled_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      }
      set(state => ({
        products: state.products.map(p => p.id === id ? { ...p, status: 'banned' as const } : p),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error deactivating product:', error);
      set({ error: 'Failed to deactivate product', isLoading: false });
    }
  },

  activateProduct: async (id) => {
    set({ isLoading: true });
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('products')
          .update({ disabled_at: null, approval_status: 'approved' })
          .eq('id', id);
        if (error) throw error;
      }
      set(state => ({
        products: state.products.map(p => p.id === id ? { ...p, status: 'active' as const } : p),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error activating product:', error);
      set({ error: 'Failed to activate product', isLoading: false });
    }
  }
}));
