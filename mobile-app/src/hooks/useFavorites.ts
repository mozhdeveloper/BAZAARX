import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Alert } from 'react-native';

export interface FavoritesFolder {
    id: string;
    user_id: string;
    name: string;
    is_default: boolean;
    created_at: string;
    item_count?: number;
    thumbnail_url?: string;
}

export interface FavoritesItem {
    id: string;
    folder_id: string;
    product_id: string;
    user_id: string;
    created_at: string;
    product?: any; // Joined product data
}

export const useFavorites = () => {
    const { user } = useAuthStore();
    const [folders, setFolders] = useState<FavoritesFolder[]>([]);
    const [loading, setLoading] = useState(false);
    const [favoritedProductIds, setFavoritedProductIds] = useState<Set<string>>(new Set());

    const fetchFolders = useCallback(async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            // Cast to any to bypass missing table definitions in generated types and deep recursion errors
            const { data, error } = await (supabase as any)
                .from('favorites_folders')
                .select(`
                    *,
                    items:favorites_items(count),
                    latest_item:favorites_items(
                        created_at,
                        product:products(
                            product_images(image_url, is_primary)
                        )
                    )
                `)
                .eq('user_id', user.id)
                .order('is_default', { ascending: false })
                .order('name', { ascending: true });

            if (error) throw error;
            
            let transformedFolders = (data as any[]).map(folder => {
                const folderItems = folder.latest_item || [];
                // Sort by created_at descending to get the most recent item
                const latest = folderItems.sort((a: any, b: any) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )[0];

                const product = latest?.product;
                const thumbnailUrl = product?.primary_image || 
                                   product?.image || 
                                   product?.product_images?.find((img: any) => img.is_primary)?.image_url ||
                                   product?.product_images?.[0]?.image_url;

                return {
                    id: folder.id,
                    user_id: folder.user_id,
                    name: folder.name,
                    is_default: folder.is_default,
                    created_at: folder.created_at,
                    item_count: folder.items?.[0]?.count || 0,
                    thumbnail_url: thumbnailUrl
                };
            });

            // If "All" folder is missing, create it and re-fetch
            if (!transformedFolders.some(f => f.is_default)) {
                const { data: newFolder, error: createError } = await (supabase as any)
                    .from('favorites_folders')
                    .insert({
                        user_id: user.id,
                        name: 'All',
                        is_default: true
                    })
                    .select()
                    .single();
                
                if (!createError && newFolder) {
                    transformedFolders = [{
                        id: newFolder.id,
                        user_id: newFolder.user_id,
                        name: newFolder.name,
                        is_default: newFolder.is_default,
                        created_at: newFolder.created_at,
                        item_count: 0,
                        thumbnail_url: undefined
                    }, ...transformedFolders];
                }
            }
            
            setFolders(transformedFolders);

            // Fetch all favorited IDs for the current user to provide a fast isFavorited check
            const { data: itemData } = await (supabase as any)
                .from('favorites_items')
                .select('product_id')
                .eq('user_id', user.id);
            
            if (itemData) {
                setFavoritedProductIds(new Set(itemData.map((i: any) => i.product_id)));
            }
        } catch (error) {
            console.error('[useFavorites] Error fetching folders:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    const createCollection = async (name: string) => {
        if (!user?.id) throw new Error('User not logged in');
        if (!name.trim()) throw new Error('Collection name is required');

        // Check for duplicate names (case-insensitive)
        const isDuplicate = folders.some(f => f.name.toLowerCase() === name.trim().toLowerCase());
        if (isDuplicate) {
            Alert.alert('Duplicate Name', 'You already have a collection with this name.');
            return null;
        }

        try {
            setLoading(true);
            const { data, error } = await (supabase as any)
                .from('favorites_folders')
                .insert({
                    user_id: user.id,
                    name: name.trim(),
                    is_default: false
                })
                .select()
                .single();

            if (error) throw error;
            await fetchFolders();
            return data as FavoritesFolder;
        } catch (error) {
            console.error('[useFavorites] Error creating collection:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const updateCollection = async (folderId: string, name: string) => {
        if (!user?.id) throw new Error('User not logged in');
        if (!name.trim()) throw new Error('Collection name is required');

        try {
            setLoading(true);
            const { error } = await (supabase as any)
                .from('favorites_folders')
                .update({ name: name.trim() })
                .eq('id', folderId)
                .eq('user_id', user.id);

            if (error) throw error;
            await fetchFolders();
            return true;
        } catch (error) {
            console.error('[useFavorites] Error updating collection:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const deleteCollection = async (folderId: string) => {
        if (!user?.id) throw new Error('User not logged in');

        try {
            setLoading(true);
            // Delete folder (favorites_items should have CASCADE delete, or we delete manually)
            const { error } = await (supabase as any)
                .from('favorites_folders')
                .delete()
                .eq('id', folderId)
                .eq('user_id', user.id);

            if (error) throw error;
            await fetchFolders();
            return true;
        } catch (error) {
            console.error('[useFavorites] Error deleting collection:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const addToFavorites = useCallback(async (productId: string, folderId?: string) => {
        if (!user?.id) throw new Error('User not logged in');
        
        try {
            setLoading(true);
            
            // Optimistic update: instantly fill the heart
            setFavoritedProductIds(prev => new Set([...prev, productId]));
            
            // Get default "All" folder
            let defaultFolder = folders.find(f => f.is_default);
            
            if (!defaultFolder) {
                // If not in state, try fetching
                const { data: fetchedDefault } = await (supabase as any)
                    .from('favorites_folders')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('is_default', true)
                    .single();
                
                if (fetchedDefault) {
                    defaultFolder = { id: fetchedDefault.id } as any;
                } else {
                    throw new Error('Default folder not found');
                }
            }

            const inserts = [];

            // Always add to "All" folder
            inserts.push({
                folder_id: defaultFolder!.id,
                product_id: productId,
                user_id: user.id
            });

            // If a specific folder was selected and it's not the "All" folder
            if (folderId && folderId !== defaultFolder!.id) {
                inserts.push({
                    folder_id: folderId,
                    product_id: productId,
                    user_id: user.id
                });
            }

            // Use upsert to handle duplicates gracefully (UNIQUE constraint on folder_id, product_id)
            const { error } = await (supabase as any)
                .from('favorites_items')
                .upsert(inserts, { onConflict: 'folder_id, product_id' });

            if (error) {
                // Rollback on error
                setFavoritedProductIds(prev => {
                    const next = new Set(prev);
                    next.delete(productId);
                    return next;
                });
                throw error;
            }
            
            await fetchFolders();
            return true;
        } catch (error) {
            // Rollback on error
            setFavoritedProductIds(prev => {
                const next = new Set(prev);
                next.delete(productId);
                return next;
            });
            console.error('[useFavorites] Error adding to favorites:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [user?.id, folders, fetchFolders]);

    const removeFromFolder = useCallback(async (productId: string, folderId: string) => {
        if (!user?.id) return;

        // Optimistic update if removing from default (which removes from all)
        const folder = folders.find(f => f.id === folderId);
        const isRemovingFromAll = folder?.is_default;
        
        let previousFavoritedIds: Set<string> | null = null;
        if (isRemovingFromAll) {
            setFavoritedProductIds(prev => {
                previousFavoritedIds = new Set(prev);
                const next = new Set(prev);
                next.delete(productId);
                return next;
            });
        }

        try {
            setLoading(true);
            const { error } = await (supabase as any)
                .from('favorites_items')
                .delete()
                .match({ product_id: productId, folder_id: folderId, user_id: user.id });

            if (error) throw error;

            if (isRemovingFromAll) {
                // Fully delete from all folders
                await (supabase as any)
                    .from('favorites_items')
                    .delete()
                    .match({ product_id: productId, user_id: user.id });
            }

            await fetchFolders();
        } catch (error) {
            // Rollback on error
            if (isRemovingFromAll && previousFavoritedIds) {
                setFavoritedProductIds(previousFavoritedIds);
            }
            console.error('[useFavorites] Error removing item:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.id, folders, fetchFolders]);

    const fetchItemsByFolder = useCallback(async (folderId: string) => {
        if (!user?.id) return [];
        try {
            const { data, error } = await (supabase as any)
                .from('favorites_items')
                .select(`
                    *,
                    product:products(
                        *,
                        images:product_images(image_url, is_primary),
                        seller:sellers(store_name)
                    )
                `)
                .eq('folder_id', folderId)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as FavoritesItem[];
        } catch (error) {
            console.error('[useFavorites] Error fetching items:', error);
            return [];
        }
    }, [user?.id]);

    useEffect(() => {
        fetchFolders();

        // Real-time subscription
        const foldersChannel = (supabase as any)
            .channel('favorites-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'favorites_folders', filter: `user_id=eq.${user?.id}` },
                () => fetchFolders()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'favorites_items', filter: `user_id=eq.${user?.id}` },
                () => fetchFolders()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(foldersChannel);
        };
    }, [fetchFolders, user?.id]);
    return {
        folders,
        loading,
        fetchFolders,
        createCollection,
        updateCollection,
        deleteCollection,
        addToFavorites,
        removeFromFolder,
        fetchItemsByFolder,
        isFavorited: (productId: string) => favoritedProductIds.has(productId)
    };
};
