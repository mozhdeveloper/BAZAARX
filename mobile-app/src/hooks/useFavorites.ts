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
    folder?: FavoritesFolder;
}

export const useFavorites = () => {
    const { user } = useAuthStore();
    const [folders, setFolders] = useState<FavoritesFolder[]>([]);
    const [loading, setLoading] = useState(false);
    const [favoritedProductIds, setFavoritedProductIds] = useState<Set<string>>(new Set());
    const [itemFolders, setItemFolders] = useState<Record<string, string[]>>({});
    const [itemFolderIds, setItemFolderIds] = useState<Record<string, string[]>>({});

    const fetchFolders = useCallback(async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
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

            if (!transformedFolders.some(f => f.is_default)) {
                const { data: newFolder, error: createError } = await (supabase as any)
                    .from('favorites_folders')
                    .insert({ user_id: user.id, name: 'All', is_default: true })
                    .select()
                    .single();
                
                if (!createError && newFolder) {
                    transformedFolders = [{
                        ...newFolder,
                        item_count: 0,
                        thumbnail_url: undefined
                    }, ...transformedFolders];
                }
            }
            
            setFolders(transformedFolders);

            const { data: itemData } = await (supabase as any)
                .from('favorites_items')
                .select(`
                    product_id,
                    folder_id,
                    folder:favorites_folders(name, is_default)
                `)
                .eq('user_id', user.id);
            
            if (itemData) {
                const nameMap: Record<string, string[]> = {};
                const idMap: Record<string, string[]> = {};
                const ids = new Set<string>();
                
                (itemData as any[]).forEach(item => {
                    ids.add(item.product_id);
                    if (!idMap[item.product_id]) idMap[item.product_id] = [];
                    idMap[item.product_id].push(item.folder_id);

                    if (item.folder && !item.folder.is_default) {
                        if (!nameMap[item.product_id]) nameMap[item.product_id] = [];
                        if (!nameMap[item.product_id].includes(item.folder.name)) {
                            nameMap[item.product_id].push(item.folder.name);
                        }
                    }
                });
                
                setItemFolders(nameMap);
                setItemFolderIds(idMap);
                setFavoritedProductIds(ids);
            }
        } catch (error) {
            console.error('[useFavorites] Error fetching folders:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    const syncToAllFolder = async (productId: string) => {
        if (!user?.id) return;
        try {
            const allFolder = folders.find(f => f.is_default);
            if (!allFolder) return;

            await (supabase as any)
                .from('favorites_items')
                .upsert({
                    folder_id: allFolder.id,
                    product_id: productId,
                    user_id: user.id
                }, { 
                    onConflict: 'folder_id, product_id',
                    ignoreDuplicates: true 
                });
        } catch (error) {
            console.error('[useFavorites] syncToAllFolder failed:', error);
        }
    };

    const addToFavorites = useCallback(async (productId: string, folderId?: string) => {
        if (!user?.id) throw new Error('User not logged in');
        
        try {
            setLoading(true);
            const allFolder = folders.find(f => f.is_default);
            const targetFolderId = folderId || allFolder?.id;

            if (!targetFolderId) throw new Error('Target collection not found');

            // Scenario A: Selecting existing collection
            const inserts = [];
            
            // Add to selected folder
            inserts.push({
                folder_id: targetFolderId,
                product_id: productId,
                user_id: user.id
            });

            // If selected folder is NOT "All", silently add to "All" too
            if (allFolder && targetFolderId !== allFolder.id) {
                inserts.push({
                    folder_id: allFolder.id,
                    product_id: productId,
                    user_id: user.id
                });
            }

            const { error } = await (supabase as any)
                .from('favorites_items')
                .upsert(inserts, { onConflict: 'folder_id, product_id' });

            if (error) throw error;
            await fetchFolders();
        } catch (error) {
            console.error('[useFavorites] Error adding to favorites:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [user?.id, folders, fetchFolders]);

    const createCollection = async (name: string, productId?: string) => {
        if (!user?.id) throw new Error('User not logged in');
        
        const isDuplicate = folders.some(f => f.name.toLowerCase() === name.trim().toLowerCase());
        if (isDuplicate) {
            Alert.alert('Duplicate Name', 'You already have a collection with this name.');
            return null;
        }

        try {
            setLoading(true);
            const { data: newFolder, error: folderError } = await (supabase as any)
                .from('favorites_folders')
                .insert({ user_id: user.id, name: name.trim(), is_default: false })
                .select().single();

            if (folderError) throw folderError;

            // Scenario B: Creating new collection
            if (productId && newFolder) {
                const allFolder = folders.find(f => f.is_default);
                const inserts = [
                    { folder_id: newFolder.id, product_id: productId, user_id: user.id }
                ];

                if (allFolder) {
                    inserts.push({ folder_id: allFolder.id, product_id: productId, user_id: user.id });
                }

                await (supabase as any)
                    .from('favorites_items')
                    .upsert(inserts, { onConflict: 'folder_id, product_id' });
            }

            await fetchFolders();
            return newFolder;
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
        if (!user?.id) throw new Error('No active session');
        const folderToDelete = folders.find(f => f.id === folderId);
        if (folderToDelete?.is_default) {
            Alert.alert('Protected Folder', 'The default "All" collection is protected.');
            return false;
        }

        try {
            setLoading(true);
            const { data: success, error: rpcError } = await (supabase as any).rpc('delete_favorites_folder', { 
                folder_id_param: folderId 
            });
            if (rpcError) throw rpcError;
            await fetchFolders();
            return success;
        } catch (error) {
            Alert.alert('Deletion Error', 'Failed to delete the collection.');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const moveToFolder = async (productId: string, targetFolderId: string) => {
        if (!user?.id) return false;
        try {
            setLoading(true);
            const { error } = await (supabase as any)
                .from('favorites_items')
                .upsert({ folder_id: targetFolderId, product_id: productId, user_id: user.id }, 
                        { onConflict: 'folder_id, product_id' });
            if (error) throw error;
            await fetchFolders();
            return true;
        } catch (error) {
            Alert.alert('Operation Failed', 'Could not add the item to the collection.');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const removeFromFolder = useCallback(async (productId: string, folderId: string) => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const { error } = await (supabase as any)
                .from('favorites_items')
                .delete()
                .match({ product_id: productId, folder_id: folderId, user_id: user.id });
            if (error) throw error;
            await fetchFolders();
        } catch (error) {
            console.error('[useFavorites] Error removing item:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.id, fetchFolders]);

    const fetchItemsByFolder = useCallback(async (folderId: string) => {
        if (!user?.id) return [];
        try {
            const { data, error } = await (supabase as any)
                .from('favorites_items')
                .select(`*, product:products(*, images:product_images(image_url, is_primary), seller:sellers(store_name)), folder:favorites_folders(*)`)
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
        const channel = (supabase as any)
            .channel('favorites-all')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'favorites_folders', filter: `user_id=eq.${user?.id}` }, () => fetchFolders())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'favorites_items', filter: `user_id=eq.${user?.id}` }, () => fetchFolders())
            .subscribe();
        return () => { channel.unsubscribe(); };
    }, [user?.id, fetchFolders]);

    return {
        folders,
        loading,
        fetchFolders,
        createCollection,
        updateCollection,
        deleteCollection,
        addToFavorites,
        removeFromFolder,
        moveToFolder,
        fetchItemsByFolder,
        isFavorited: (productId: string) => favoritedProductIds.has(productId),
        getItemFolders: (productId: string) => itemFolders[productId] || [],
        getItemFolderIds: (productId: string) => itemFolderIds[productId] || []
    };
};
