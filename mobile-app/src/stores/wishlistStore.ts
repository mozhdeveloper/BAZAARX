import { create } from 'zustand';
import { Product } from '../types';
import { wishlistService } from '../services/wishlistService';
import { supabase } from '../lib/supabase';

export interface WishlistDeliveryPreference {
    addressId?: string;
    showAddress: boolean;
    instructions?: string;
}

export interface WishlistItem extends Product {
    priority: 'low' | 'medium' | 'high';
    desiredQty: number;
    purchasedQty: number;
    addedAt: string;
    categoryId?: string;
    isPrivate?: boolean;
    // DB registry_items.id — used for update/delete
    registryItemId?: string;
    status?: 'available' | 'out_of_stock' | 'seller_on_vacation' | 'restricted' | 'deleted';
}

export interface WishlistCategory {
    id: string;
    name: string;
    description?: string;
    image?: string;
    privacy: 'private' | 'shared';
    occasion?: string;
    delivery?: WishlistDeliveryPreference;
    created_at?: string;
}

interface WishlistState {
    items: WishlistItem[];
    categories: WishlistCategory[];
    _buyerId: string | null;
    _loaded: boolean;

    // Load from Supabase (call after auth)
    loadWishlist: (buyerId: string) => Promise<void>;
    reset: () => void;

    addItem: (product: Product, priority?: 'low' | 'medium' | 'high', desiredQty?: number, categoryId?: string) => Promise<void>;
    removeItem: (registryItemId: string) => Promise<void>;
    updateItem: (registryItemId: string, updates: Partial<WishlistItem>) => Promise<void>;

    createCategory: (name: string, privacy: 'private' | 'shared', occasion?: string, description?: string, delivery?: WishlistDeliveryPreference) => Promise<string>;
    deleteCategory: (categoryId: string) => Promise<void>;
    updateCategory: (categoryId: string, updates: Partial<WishlistCategory>) => Promise<void>;

    isInWishlist: (productId: string) => boolean;
    clearWishlist: () => void;
    shareWishlist: (categoryId: string) => Promise<string>;
    markAsPurchased: (registryItemId: string, qty: number) => Promise<void>;
}

const DEFAULT_CATEGORY: WishlistCategory = {
    id: 'default',
    name: 'General Favorites',
    privacy: 'private',
    occasion: 'general',
};

function mapDbRowToCategory(row: any): WishlistCategory {
    return {
        id: row.id,
        name: row.title,
        privacy: 'private',
        occasion: row.category || row.event_type || 'general',
        delivery: row.delivery
            ? {
                addressId: row.delivery.addressId,
                showAddress: row.delivery.showAddress ?? false,
                instructions: row.delivery.instructions,
            }
            : undefined,
        created_at: row.created_at,
    };
}

function mapDbItemToWishlistItem(item: any, registryId: string): WishlistItem {
    const snapshot = item.product_snapshot || {};
    return {
        ...snapshot,
        id: snapshot.id || item.product_id || item.id,
        name: item.product_name || snapshot.name || '',
        price: snapshot.price || 0,
        priority: (item.priority as 'low' | 'medium' | 'high') || 'medium',
        desiredQty: item.requested_qty ?? item.quantity_desired ?? 1,
        purchasedQty: item.received_qty ?? 0,
        addedAt: item.created_at || new Date().toISOString(),
        categoryId: registryId,
        registryItemId: item.id,
        status: item.product?.approval_status === 'suspended' ? 'restricted' : 
                item.product?.seller?.on_vacation ? 'seller_on_vacation' :
                (item.product?.stock ?? snapshot.stock ?? 0) <= 0 ? 'out_of_stock' : 
                !item.product_id ? 'deleted' : 'available',
    };
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
    items: [],
    categories: [],
    _buyerId: null,
    _loaded: false,

    loadWishlist: async (buyerId: string) => {
        try {
            const rows = await wishlistService.getRegistries(buyerId);

            // Find the default registry (event_type = 'general') if it exists
            const defaultRow = rows.find(
                (r) => r.event_type === 'general' || r.category === 'general'
            );

            const categories: WishlistCategory[] = rows.map((row) => ({
                ...mapDbRowToCategory(row),
                id: defaultRow && row.id === defaultRow.id ? 'default' : row.id,
            }));

            // Ensure default category is always first if present
            const defaultIdx = categories.findIndex((c) => c.id === 'default');
            if (defaultIdx > 0) {
                const [def] = categories.splice(defaultIdx, 1);
                categories.unshift(def);
            }

            const items: WishlistItem[] = rows.flatMap((row) =>
                (row.registry_items || []).map((item: any) => {
                    const catId = defaultRow && row.id === defaultRow.id ? 'default' : row.id;
                    return mapDbItemToWishlistItem(item, catId);
                })
            );

            set({
                categories,
                items,
                _buyerId: buyerId,
                _loaded: true,
                ...(defaultRow ? ({ _defaultDbId: defaultRow.id } as any) : {}),
            });
        } catch (err) {
            console.error('[wishlistStore] loadWishlist error:', err);
        }
    },

    reset: () => set({ items: [], categories: [], _buyerId: null, _loaded: false }),

    addItem: async (product, priority = 'medium', desiredQty = 1, categoryId = 'default') => {
        const { _buyerId, categories, items } = get();

        // Prevent duplicates
        if (items.find((i) => i.id === product.id && i.categoryId === categoryId)) return;

        // Resolve the real DB registry id
        const realRegistryId = await resolveWishlistId(categoryId, _buyerId, categories);
        if (!realRegistryId) return;

        // Optimistic update
        const tempItem: WishlistItem = {
            ...product,
            priority,
            desiredQty,
            purchasedQty: 0,
            addedAt: new Date().toISOString(),
            categoryId,
            registryItemId: `temp-${Date.now()}`,
        };
        set({ items: [...items, tempItem] });

        try {
            const dbItem = await wishlistService.addItem(realRegistryId, product, desiredQty, priority);
            // Replace temp with real
            set((state) => ({
                items: state.items.map((i) =>
                    i.registryItemId === tempItem.registryItemId
                        ? { ...i, registryItemId: dbItem.id }
                        : i
                ),
            }));
        } catch (err) {
            console.error('[wishlistStore] addItem error:', err);
            // Rollback
            set((state) => ({
                items: state.items.filter((i) => i.registryItemId !== tempItem.registryItemId),
            }));
        }
    },

    removeItem: async (registryItemId: string) => {
        const prev = get().items;
        set({ items: prev.filter((i) => i.registryItemId !== registryItemId) });
        try {
            await wishlistService.deleteItem(registryItemId);
        } catch (err) {
            console.error('[wishlistStore] removeItem error:', err);
            set({ items: prev });
        }
    },

    updateItem: async (registryItemId: string, updates: Partial<WishlistItem>) => {
        set((state) => ({
            items: state.items.map((i) =>
                i.registryItemId === registryItemId ? { ...i, ...updates } : i
            ),
        }));
        try {
            const dbUpdates: any = {};
            if (updates.desiredQty !== undefined) {
                dbUpdates.quantity_desired = updates.desiredQty;
                dbUpdates.requested_qty = updates.desiredQty;
            }
            if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
            await wishlistService.updateItem(registryItemId, dbUpdates);
        } catch (err) {
            console.error('[wishlistStore] updateItem error:', err);
        }
    },

    createCategory: async (name, privacy, occasion = 'other', description, delivery) => {
        const { _buyerId, categories } = get();
        if (!_buyerId) return 'default';

        try {
            const row = await wishlistService.createRegistry(_buyerId, name, occasion, delivery);
            const newCat: WishlistCategory = {
                id: row.id,
                name,
                privacy: 'private',
                occasion,
                description,
                delivery: delivery ?? (row.delivery
                    ? {
                        addressId: row.delivery.addressId,
                        showAddress: row.delivery.showAddress ?? false,
                        instructions: row.delivery.instructions,
                    }
                    : undefined),
                created_at: row.created_at || new Date().toISOString(),
            };
            set({ categories: [...categories, newCat] });
            return row.id;
        } catch (err) {
            console.error('[wishlistStore] createCategory error:', err);
            return 'default';
        }
    },

    deleteCategory: async (categoryId: string) => {
        if (categoryId === 'default') return;
        const { categories, items, _buyerId } = get();

        // Move items to default before deleting
        const defaultCat = categories.find((c) => c.id === 'default');
        const defaultDbId = defaultCat ? await resolveWishlistId('default', _buyerId, categories) : null;

        if (defaultDbId) {
            try {
                await wishlistService.moveItemsToRegistry(categoryId, defaultDbId);
            } catch (err) {
                console.error('[wishlistStore] moveItems error:', err);
            }
        }

        set({
            categories: categories.filter((c) => c.id !== categoryId),
            items: items.map((i) =>
                i.categoryId === categoryId ? { ...i, categoryId: 'default' } : i
            ),
        });

        try {
            await wishlistService.deleteRegistry(categoryId);
        } catch (err) {
            console.error('[wishlistStore] deleteCategory error:', err);
        }
    },

    updateCategory: async (categoryId: string, updates: Partial<WishlistCategory>) => {
        set((state) => ({
            categories: state.categories.map((c) =>
                c.id === categoryId ? { ...c, ...updates, privacy: 'private' as const } : c
            ),
        }));
        try {
            const dbUpdates: any = {};
            if (updates.name !== undefined) dbUpdates.title = updates.name;
            if (updates.occasion !== undefined) {
                dbUpdates.event_type = updates.occasion;
                dbUpdates.category = updates.occasion;
            }
            if (updates.privacy !== undefined) dbUpdates.privacy = updates.privacy;

            if (updates.delivery !== undefined) {
                dbUpdates.delivery = {
                    showAddress: updates.delivery.showAddress ?? false,
                    ...(updates.delivery.addressId ? { addressId: updates.delivery.addressId } : {}),
                    ...(updates.delivery.instructions?.trim()
                        ? { instructions: updates.delivery.instructions.trim() }
                        : {}),
                };
            }
            await wishlistService.updateRegistry(categoryId, dbUpdates);
        } catch (err) {
            console.error('[wishlistStore] updateCategory error:', err);
        }
    },

    isInWishlist: (productId: string) => {
        return !!get().items.find((i) => i.id === productId);
    },

    clearWishlist: () => set({ items: [] }),

    shareWishlist: async (categoryId: string) => {
        const realId = categoryId === 'default'
            ? await resolveWishlistId('default', get()._buyerId, get().categories)
            : categoryId;
        return `https://bazaarx.app/registry/${realId || categoryId}`;
    },

    markAsPurchased: async (registryItemId: string, qty: number) => {
        set((state) => ({
            items: state.items.map((i) =>
                i.registryItemId === registryItemId
                    ? { ...i, purchasedQty: (i.purchasedQty || 0) + qty }
                    : i
            ),
        }));
        try {
            const item = get().items.find((i) => i.registryItemId === registryItemId);
            if (item) {
                await wishlistService.updateItem(registryItemId, {
                    quantity_desired: item.desiredQty,
                } as any);
            }
        } catch (err) {
            console.error('[wishlistStore] markAsPurchased error:', err);
        }
    },
}));

// Helper: resolve the real Supabase registry UUID from a categoryId
// 'default' maps to the first registry with event_type='general'
async function resolveWishlistId(
    categoryId: string,
    buyerId: string | null,
    categories: WishlistCategory[]
): Promise<string | null> {
    if (!buyerId) return null;

    if (categoryId === 'default') {
        // The default category's real DB id is stored as the category with id='default'
        // We need to look it up from the DB
        const { data } = await supabase
            .from('registries')
            .select('id')
            .eq('buyer_id', buyerId)
            .in('event_type', ['general'])
            .limit(1)
            .single();
        return data?.id || null;
    }

    // For non-default categories, the id IS the real DB UUID
    return categoryId;
}
