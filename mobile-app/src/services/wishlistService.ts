import { supabase } from '../lib/supabase';

export interface DbRegistry {
    id: string;
    buyer_id: string;
    title: string;
    event_type: string;
    category?: string | null;
    privacy?: string | null;
    delivery?: any | null;
    created_at: string;
    updated_at: string;
}

export interface DbRegistryItem {
    id: string;
    registry_id: string;
    product_id?: string | null;
    product_name?: string | null;
    quantity_desired: number;
    requested_qty?: number | null;
    received_qty?: number | null;
    priority?: string | null;
    notes?: string | null;
    product_snapshot?: any | null;
    is_most_wanted?: boolean | null;
    selected_variant?: any | null;
    created_at: string;
    updated_at?: string;
}

export interface PublicRegistrySearchResult {
    id: string;
    title: string;
    event_type?: string | null;
    category?: string | null;
    created_at: string;
    itemCount: number;
}

export const wishlistService = {
    async existsInRegistry(registryId: string, productId: string): Promise<boolean> {
        if (!registryId || !productId) return false;
        const { data, error } = await supabase
            .from('registry_items')
            .select('id')
            .eq('registry_id', registryId)
            .eq('product_id', productId)
            .limit(1)
            .maybeSingle();

        if (error) {
            if ((error as any).code === 'PGRST116') return false;
            throw error;
        }

        return !!data;
    },
    async getRegistries(buyerId: string): Promise<(DbRegistry & { registry_items: DbRegistryItem[] })[]> {
        const { data, error } = await supabase
            .from('registries')
            .select('*, registry_items(*)')
            .eq('buyer_id', buyerId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async createRegistry(
        buyerId: string,
        name: string,
        occasion: string,
        delivery?: {
            addressId?: string;
            showAddress?: boolean;
            instructions?: string;
        },
    ): Promise<DbRegistry & { registry_items: DbRegistryItem[] }> {
        const { data, error } = await supabase
            .from('registries')
            .insert({
                buyer_id: buyerId,
                title: name,
                event_type: occasion,
                category: occasion,
                privacy: 'private',
                delivery: delivery ?? { showAddress: false },
            })
            .select('*, registry_items(*)')
            .single();

        if (error) throw error;
        return data;
    },

    async updateRegistry(
        registryId: string,
        updates: {
            title?: string;
            event_type?: string;
            category?: string;
            privacy?: 'private' | 'shared';
            delivery?: {
                addressId?: string;
                showAddress?: boolean;
                instructions?: string;
            };
        },
    ): Promise<void> {
        const { error } = await supabase
            .from('registries')
            .update(updates)
            .eq('id', registryId);

        if (error) throw error;
    },

    async deleteRegistry(registryId: string): Promise<void> {
        const { error } = await supabase
            .from('registries')
            .delete()
            .eq('id', registryId);

        if (error) throw error;
    },

    async addItem(registryId: string, product: any, desiredQty = 1, priority = 'medium'): Promise<DbRegistryItem> {
        const { data, error } = await supabase
            .from('registry_items')
            .insert({
                registry_id: registryId,
                product_id: product.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id)
                    ? product.id
                    : null,
                product_name: product.name,
                quantity_desired: desiredQty,
                requested_qty: desiredQty,
                received_qty: 0,
                priority,
                product_snapshot: product,
                is_most_wanted: false,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateItem(itemId: string, updates: { quantity_desired?: number; requested_qty?: number; priority?: string; notes?: string }): Promise<void> {
        const dbUpdates: any = { ...updates };
        if (updates.quantity_desired !== undefined) {
            dbUpdates.requested_qty = updates.quantity_desired;
        }
        const { error } = await supabase
            .from('registry_items')
            .update(dbUpdates)
            .eq('id', itemId);

        if (error) throw error;
    },

    async deleteItem(itemId: string): Promise<void> {
        const { error } = await supabase
            .from('registry_items')
            .delete()
            .eq('id', itemId);

        if (error) throw error;
    },

    async moveItemsToRegistry(fromRegistryId: string, toRegistryId: string): Promise<void> {
        const { error } = await supabase
            .from('registry_items')
            .update({ registry_id: toRegistryId })
            .eq('registry_id', fromRegistryId);

        if (error) throw error;
    },

    async searchPublicRegistries(query: string): Promise<PublicRegistrySearchResult[]> {
        const trimmed = query.trim();
        if (!trimmed) return [];

        const { data, error } = await supabase
            .from('registries')
            .select('id, title, event_type, category, created_at, registry_items(id)')
            .eq('privacy', 'link')
            .ilike('title', `%${trimmed}%`)
            .order('created_at', { ascending: false })
            .limit(30);

        if (error) throw error;

        return (data || []).map((row: any) => ({
            id: row.id,
            title: row.title,
            event_type: row.event_type,
            category: row.category,
            created_at: row.created_at,
            itemCount: Array.isArray(row.registry_items) ? row.registry_items.length : 0,
        }));
    },

    async getPublicRegistry(registryId: string): Promise<(DbRegistry & { registry_items: DbRegistryItem[] }) | null> {
        const { data, error } = await supabase
            .from('registries')
            .select('*, registry_items(*)')
            .eq('id', registryId)
            .eq('privacy', 'link')
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return data;
    },
};
