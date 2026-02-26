import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../types';

// Enhanced Wishlist Item with Registry Features
export interface WishlistItem extends Product {
    priority: 'low' | 'medium' | 'high';
    desiredQty: number;
    purchasedQty: number; // For registry logic
    addedAt: string;
    categoryId?: string; // Link to a specific list
    isPrivate?: boolean; // Item-level privacy
}

export interface WishlistCategory {
    id: string;
    name: string;
    description?: string;
    image?: string;
    privacy: 'private' | 'shared'; // PER CATEGORY SETTING
    occasion?: string;
}

// Removed global WishlistSettings interface as requested

interface WishlistState {
    items: WishlistItem[];
    categories: WishlistCategory[];

    addItem: (product: Product, priority?: 'low' | 'medium' | 'high', desiredQty?: number, categoryId?: string) => void;
    removeItem: (productId: string) => void;
    updateItem: (productId: string, updates: Partial<WishlistItem>) => void;

    // Category Management
    createCategory: (name: string, privacy: 'private' | 'shared', occasion?: string, description?: string) => string;
    deleteCategory: (categoryId: string) => void;
    updateCategory: (categoryId: string, updates: Partial<WishlistCategory>) => void;

    isInWishlist: (productId: string) => boolean;
    clearWishlist: () => void;
    shareWishlist: (categoryId: string) => Promise<string>; // Share specific list

    // Registry Logic
    markAsPurchased: (productId: string, qty: number) => void;
}

export const useWishlistStore = create<WishlistState>()(
    persist(
        (set, get) => ({
            items: [],
            categories: [
                { id: 'default', name: 'General Favorites', description: 'My favorite items.', privacy: 'private' },
            ],

            addItem: (product, priority = 'medium', desiredQty = 1, categoryId = 'default') => {
                const { items } = get();
                const existing = items.find(item => item.id === product.id);

                if (!existing) {
                    const newItem: WishlistItem = {
                        ...product,
                        priority,
                        desiredQty,
                        purchasedQty: 0,
                        addedAt: new Date().toISOString(),
                        categoryId
                    };
                    set({ items: [...items, newItem] });
                }
            },

            removeItem: (productId) => {
                const { items } = get();
                set({ items: items.filter(item => item.id !== productId) });
            },

            updateItem: (productId, updates) => {
                const { items } = get();
                set({
                    items: items.map(item =>
                        item.id === productId ? { ...item, ...updates } : item
                    )
                });
            },

            createCategory: (name, privacy, occasion, description) => {
                const { categories } = get();
                const newId = 'list_' + Date.now();
                // Force private
                const newCategory: WishlistCategory = { id: newId, name, privacy: 'private' as const, occasion, description };
                set({ categories: [...categories, newCategory] });
                return newId;
            },

            deleteCategory: (categoryId) => {
                const { categories, items } = get();
                // Move items from deleted category to default
                if (categoryId === 'default') return; // Cannot delete default

                const updatedItems = items.map(item =>
                    item.categoryId === categoryId ? { ...item, categoryId: 'default' } : item
                );

                set({
                    categories: categories.filter(c => c.id !== categoryId),
                    items: updatedItems
                });
            },

            updateCategory: (categoryId, updates) => {
                const { categories } = get();
                set({
                    categories: categories.map(c =>
                        c.id === categoryId ? { ...c, ...updates, privacy: 'private' as const } : c
                    )
                });
            },

            isInWishlist: (productId) => {
                const { items } = get();
                return !!items.find(item => item.id === productId);
            },

            clearWishlist: () => {
                set({ items: [] });
            },

            shareWishlist: async (categoryId) => {
                return `https://bazaarx.app/wishlist/${categoryId}`;
            },



            markAsPurchased: (productId, qty) => {
                const { items } = get();
                set({
                    items: items.map(item =>
                        item.id === productId
                            ? { ...item, purchasedQty: (item.purchasedQty || 0) + qty }
                            : item
                    )
                });
            }
        }),
        {
            name: 'wishlist-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
