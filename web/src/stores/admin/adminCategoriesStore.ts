/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { categoryService } from '@/services/categoryService';
import type { Category } from './adminTypes';

export const useAdminCategories = create<CategoriesState>((set) => ({
  categories: [],
  selectedCategory: null,
  isLoading: false,
  error: null,

  loadCategories: async () => {
    set({ isLoading: true, error: null });

    try {
      if (!isSupabaseConfigured()) {
        set({ isLoading: false, error: 'Supabase not configured' });
        return;
      }
      const data = await categoryService.getAllCategories();

      const categories: Category[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description || '',
        image: row.image_url || '',
        icon: row.icon || '',
        parentId: row.parent_id || undefined,
        slug: row.slug,
        isActive: row.is_active,
        sortOrder: row.sort_order || 0,
        productsCount: Array.isArray(row.products) ? row.products[0]?.count || 0 : row.products?.count || 0,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));

      set({ categories, isLoading: false });
    } catch (err: any) {
      console.error('Failed to load categories:', err);
      set({ isLoading: false, error: err.message || 'Failed to load categories' });
    }
  },

  addCategory: async (categoryData) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: categoryData.name,
          slug: categoryData.slug,
          description: categoryData.description || null,
          image_url: categoryData.image || null,
          icon: categoryData.icon || null,
          parent_id: categoryData.parentId || null,
          sort_order: categoryData.sortOrder || 0,
          is_active: categoryData.isActive
        })
        .select()
        .single();

      if (error) throw error;

      const newCategory: Category = {
        id: data.id,
        name: data.name,
        description: data.description || '',
        image: data.image_url || '',
        icon: data.icon || '',
        parentId: data.parent_id || undefined,
        slug: data.slug,
        isActive: data.is_active,
        sortOrder: data.sort_order || 0,
        productsCount: 0,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      set(state => ({
        categories: [...state.categories, newCategory],
        isLoading: false
      }));
    } catch (err: any) {
      console.error('Failed to add category:', err);
      set({ isLoading: false, error: err.message || 'Failed to add category' });
    }
  },

  updateCategory: async (id, updates) => {
    set({ isLoading: true, error: null });

    try {
      const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.slug !== undefined) dbUpdates.slug = updates.slug;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.image !== undefined) dbUpdates.image_url = updates.image || null;
      if (updates.icon !== undefined) dbUpdates.icon = updates.icon || null;
      if (updates.parentId !== undefined) dbUpdates.parent_id = updates.parentId || null;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

      const { error } = await supabase
        .from('categories')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        categories: state.categories.map(cat =>
          cat.id === id
            ? { ...cat, ...updates, updatedAt: new Date() }
            : cat
        ),
        isLoading: false
      }));
    } catch (err: any) {
      console.error('Failed to update category:', err);
      set({ isLoading: false, error: err.message || 'Failed to update category' });
    }
  },

  toggleCategoryStatus: async (id, isActive) => {
    set({ isLoading: true, error: null });
    try {
      await categoryService.updateCategoryStatus(id, isActive);
      
      set(state => ({
        categories: state.categories.map(cat =>
          cat.id === id
            ? { ...cat, isActive, updatedAt: new Date() }
            : cat
        ),
        isLoading: false
      }));
    } catch (err: any) {
      console.error('Failed to toggle category status:', err);
      set({ isLoading: false, error: err.message || 'Failed to toggle status' });
    }
  },

  deleteCategory: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        categories: state.categories.filter(cat => cat.id !== id),
        selectedCategory: state.selectedCategory?.id === id ? null : state.selectedCategory,
        isLoading: false
      }));
    } catch (err: any) {
      console.error('Failed to delete category:', err);
      set({ isLoading: false, error: err.message || 'Failed to delete category' });
    }
  },

  selectCategory: (category) => set({ selectedCategory: category }),
  clearError: () => set({ error: null })
}));

// Seller Management Store
interface SellersState {
  sellers: Seller[];
  selectedSeller: Seller | null;
  pendingSellers: Seller[];
  isLoading: boolean;
  error: string | null;
  loadSellers: () => Promise<void>;
  approveSeller: (id: string) => Promise<void>;
  rejectSeller: (id: string, reason?: string) => Promise<void>;
  partiallyRejectSeller: (id: string, payload: PartialSellerRejectionInput) => Promise<void>;
  suspendSeller: (id: string, reason: string) => Promise<void>;
  selectSeller: (seller: Seller | null) => void;
  addSeller: (seller: Seller) => void;
  clearError: () => void;
  hasCompleteRequirements: (seller: Seller) => boolean;
  updateSellerTier: (sellerId: string, tierLevel: 'standard' | 'premium_outlet') => Promise<void>;
  getSellerTier: (sellerId: string) => Promise<'standard' | 'premium_outlet' | null>;
}
