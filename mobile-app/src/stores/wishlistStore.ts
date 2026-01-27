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
}

export interface WishlistSettings {
    privacy: 'public' | 'shared' | 'private';
    shippingAddressId?: string; // ID of the address to use for gifts
    defaultPriority: 'low' | 'medium' | 'high';
}

interface WishlistState {
    items: WishlistItem[];
    wishlistId: string;
    settings: WishlistSettings;
    
    addItem: (product: Product, priority?: 'low' | 'medium' | 'high', desiredQty?: number) => void;
    removeItem: (productId: string) => void;
    updateItem: (productId: string, updates: Partial<WishlistItem>) => void;
    updateSettings: (settings: Partial<WishlistSettings>) => void;
    
    isInWishlist: (productId: string) => boolean;
    clearWishlist: () => void;
    shareWishlist: () => Promise<string>;
    
    // Registry Logic
    markAsPurchased: (productId: string, qty: number) => void;
}

export const useWishlistStore = create<WishlistState>()(
    persist(
        (set, get) => ({
            items: [],
            wishlistId: 'wishlist_' + Math.random().toString(36).substr(2, 9),
            settings: {
                privacy: 'shared',
                defaultPriority: 'medium'
            },

            addItem: (product, priority = 'medium', desiredQty = 1) => {
                const { items } = get();
                const existing = items.find(item => item.id === product.id);
                
                if (!existing) {
                    const newItem: WishlistItem = {
                        ...product,
                        priority,
                        desiredQty,
                        purchasedQty: 0,
                        addedAt: new Date().toISOString()
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

            updateSettings: (newSettings) => {
                const { settings } = get();
                set({ settings: { ...settings, ...newSettings } });
            },

            isInWishlist: (productId) => {
                const { items } = get();
                return !!items.find(item => item.id === productId);
            },

            clearWishlist: () => {
                set({ items: [] });
            },

            shareWishlist: async () => {
                const { wishlistId } = get();
                return `https://bazaarx.app/wishlist/${wishlistId}`;
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
