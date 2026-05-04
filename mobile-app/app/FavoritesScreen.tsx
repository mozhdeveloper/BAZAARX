import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Pressable,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Alert,
    ScrollView,
    StyleSheet,
    Modal,
    TextInput,
    Image,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, PlusCircle, Ghost, Heart, Trash2, Edit2, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useFavorites, FavoritesFolder } from '../src/hooks/useFavorites';
import { FolderCard } from '../src/components/favorites/FolderCard';
import { FavoriteProductCard } from '../src/components/favorites/FavoriteProductCard';
import { COLORS } from '../src/constants/theme';
import { discountService } from '../src/services/discountService';
import { ActiveDiscount } from '../src/types/discount';
import { useCartStore } from '../src/stores/cartStore';
import { AddedToCartModal } from '../src/components/AddedToCartModal';

type TabType = 'all' | 'collections';

export default function FavoritesScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { folders, loading, fetchFolders, fetchItemsByFolder, removeFromFolder, createCollection, updateCollection, deleteCollection } = useFavorites();

    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [items, setItems] = useState<any[]>([]);
    const [discounts, setDiscounts] = useState<Record<string, ActiveDiscount>>({});
    const [refreshing, setRefreshing] = useState(false);
    const [contentLoading, setContentLoading] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<FavoritesFolder | null>(null);
    const [isCartInitialized, setIsCartInitialized] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editCollectionName, setEditCollectionName] = useState('');
    const [showAddedToCartModal, setShowAddedToCartModal] = useState(false);
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [addedProductInfo, setAddedProductInfo] = useState({ name: '', image: '' });
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [pendingProduct, setPendingProduct] = useState<any>(null);
    const [pendingQuantity, setPendingQuantity] = useState(1);

    const cartItems = useCartStore(state => state.items);
    const addItemToCart = useCartStore(state => state.addItem);
    const initializeCart = useCartStore(state => state.initializeForCurrentUser);

    const loadContent = useCallback(async () => {
        setContentLoading(true);
        try {
            let fetchedItems: any[] = [];
            if (activeTab === 'all') {
                const allFolder = folders.find(f => f.is_default);
                if (allFolder) {
                    fetchedItems = await fetchItemsByFolder(allFolder.id);
                }
            } else if (selectedFolder) {
                fetchedItems = await fetchItemsByFolder(selectedFolder.id);
            }
            setItems(fetchedItems || []);

            // Fetch discounts for the items
            if (fetchedItems && fetchedItems.length > 0) {
                const productIds = fetchedItems.map(i => i.product_id).filter(Boolean);
                const discountMap = await discountService.getActiveDiscountsForProducts(productIds);
                setDiscounts(discountMap);
            }
        } finally {
            setContentLoading(false);
        }
    }, [activeTab, folders, selectedFolder, fetchItemsByFolder]);

    useEffect(() => {
        const init = async () => {
            await initializeCart();
            setIsCartInitialized(true);
        };
        init();
        fetchFolders();
    }, [initializeCart, fetchFolders]);

    useEffect(() => {
        loadContent();
    }, [loadContent]);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            fetchFolders(),
            loadContent(),
            initializeCart()
        ]);
        setRefreshing(false);
    };

    const handleRemove = (productId: string) => {
        const targetFolderId = activeTab === 'all' 
            ? folders.find(f => f.is_default)?.id 
            : selectedFolder?.id;

        if (!targetFolderId) return;

        Alert.alert(
            'Remove Item',
            activeTab === 'all' 
                ? 'Remove this item from all collections?' 
                : `Remove this item from ${selectedFolder?.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Remove', 
                    style: 'destructive',
                    onPress: async () => {
                        await removeFromFolder(productId, targetFolderId);
                        loadContent();
                    }
                }
            ]
        );
    };

    const handleAddToCart = async (product: any, quantity: number) => {
        const isInCart = cartItems.some(ci => ci.id === product.id);
        
        if (isInCart) {
            setPendingProduct(product);
            setPendingQuantity(quantity);
            setShowDuplicateModal(true);
        } else {
            await executeAdd(product, quantity);
        }
    };

    const executeAdd = async (product: any, quantity: number) => {
        try {
            setIsAddingToCart(true);
            const productForCart = {
                ...product,
                quantity: quantity,
                activeCampaignDiscount: discounts[product.id]
            };
            
            const success = await addItemToCart(productForCart);
            if (success) {
                setAddedProductInfo({
                    name: product.name,
                    image: product.images?.[0]?.image_url || product.primary_image || product.image
                });
                setShowAddedToCartModal(true);
            }
        } catch (error) {
            console.error('[FavoritesScreen] Add to cart error:', error);
            Alert.alert('Error', 'Failed to add item to cart');
        } finally {
            setIsAddingToCart(false);
            setShowDuplicateModal(false);
            setPendingProduct(null);
        }
    };

    const handleCreateCollection = () => {
        setIsCreateModalVisible(true);
    };

    const confirmCreateCollection = async () => {
        if (newCollectionName.trim()) {
            await createCollection(newCollectionName.trim());
            setNewCollectionName('');
            setIsCreateModalVisible(false);
            setActiveTab('collections');
        }
    };

    const handleEditFolder = () => {
        if (!selectedFolder) return;
        setEditCollectionName(selectedFolder.name);
        setIsEditModalVisible(true);
    };

    const confirmEditFolder = async () => {
        if (selectedFolder && editCollectionName.trim()) {
            await updateCollection(selectedFolder.id, editCollectionName.trim());
            setIsEditModalVisible(false);
            setSelectedFolder(prev => prev ? { ...prev, name: editCollectionName.trim() } : null);
            fetchFolders();
        }
    };

    const handleDeleteFolder = () => {
        if (!selectedFolder) return;
        Alert.alert(
            'Delete Collection',
            `Are you sure you want to delete "${selectedFolder.name}"? All items inside will be removed from this collection.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: async () => {
                        await deleteCollection(selectedFolder.id);
                        setSelectedFolder(null);
                        fetchFolders();
                    }
                }
            ]
        );
    };

    const ProductSkeleton = () => (
        <View style={styles.skeletonProductCard}>
            <View style={styles.skeletonProductImage} />
            <View style={styles.skeletonProductInfo}>
                <View style={styles.skeletonProductTitle} />
                <View style={styles.skeletonProductSeller} />
                <View style={styles.skeletonProductFooter}>
                    <View style={styles.skeletonProductPrice} />
                    <View style={styles.skeletonProductActions} />
                </View>
            </View>
        </View>
    );

    const FolderSkeleton = () => (
        <View style={styles.skeletonFolderCard}>
            <View style={styles.skeletonFolderIcon} />
            <View style={styles.skeletonFolderInfo}>
                <View style={styles.skeletonFolderName} />
                <View style={styles.skeletonFolderMetadata} />
            </View>
        </View>
    );



    const showSkeletons = (loading || contentLoading) && !refreshing;

    const renderEmptyState = () => {
        if (showSkeletons) return null;
        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                    <Ghost size={40} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyTitle}>Your list is empty</Text>
                <Text style={styles.emptySubtitle}>
                    Save products you love to keep track of them here.
                </Text>
                {activeTab === 'collections' && (
                    <Pressable 
                        onPress={handleCreateCollection}
                        style={styles.createBtn}
                    >
                        <Text style={styles.createBtnText}>Create Collection</Text>
                    </Pressable>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']} style={styles.container}>
                {selectedFolder ? (
                    <>
                        <View style={styles.headerContainer}>
                            <View style={[styles.headerTitleRow, { paddingTop: insets.top + 10 }]}>
                                <Pressable onPress={() => setSelectedFolder(null)} style={styles.headerIconButton}>
                                    <ChevronLeft size={24} color="#111827" strokeWidth={2.5} />
                                </Pressable>
                                <View style={styles.selectedFolderInfo}>
                                    <Text style={styles.selectedFolderName}>{selectedFolder.name}</Text>
                                    <Text style={styles.selectedFolderCount}>{items.length} {items.length === 1 ? 'ITEM' : 'ITEMS'}</Text>
                                </View>
                                <View style={styles.headerActionsRow}>
                                    {!selectedFolder.is_default && (
                                        <>
                                            <Pressable onPress={handleEditFolder} style={styles.headerEditButton}>
                                                <Edit2 size={18} color={COLORS.primary} />
                                            </Pressable>
                                            <Pressable onPress={handleDeleteFolder} style={styles.headerDeleteButton}>
                                                <Trash2 size={18} color="#DC2626" />
                                            </Pressable>
                                        </>
                                    )}
                                </View>
                            </View>
                        </View>

                        <FlatList
                            data={showSkeletons ? [1, 2, 3, 4] : items}
                            keyExtractor={(item, index) => (showSkeletons ? `skeleton-${index}` : (item.id || String(index)))}
                            renderItem={({ item }) => (
                                showSkeletons ? (
                                    <ProductSkeleton />
                                ) : (
                                    <FavoriteProductCard
                                        product={item.product}
                                        discount={discounts[item.product_id]}
                                        onPress={() => navigation.navigate('ProductDetail', { product: item.product })}
                                        onRemove={() => handleRemove(item.product_id)}
                                        onAddToCart={(qty) => handleAddToCart(item.product, qty)}
                                        isInCart={cartItems.some(ci => ci.id === item.product_id)}
                                    />
                                )
                            )}
                            contentContainerStyle={styles.listContent}
                            ListEmptyComponent={renderEmptyState}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
                        />
                    </>
                ) : (
                    <>
                        <View style={styles.headerContainer}>
                            <View style={[styles.headerTitleRow, { paddingTop: insets.top + 10 }]}>
                                <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                                    <ChevronLeft size={24} color="#111827" strokeWidth={2.5} />
                                </Pressable>
                                <Text style={styles.headerTitle}>My Favorites</Text>
                                {activeTab === 'collections' ? (
                                    <Pressable 
                                        onPress={() => setIsCreateModalVisible(true)} 
                                        style={styles.headerIconButton}
                                    >
                                        <PlusCircle size={24} color={COLORS.primary} strokeWidth={2.25} />
                                    </Pressable>
                                ) : (
                                    <Pressable 
                                        onPress={() => navigation.navigate('MainTabs', { screen: 'Shop' })} 
                                        style={styles.headerIconButton}
                                    >
                                        <PlusCircle size={24} color={COLORS.primary} strokeWidth={2.25} />
                                    </Pressable>
                                )}
                            </View>

                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false} 
                                style={styles.tabsScroll}
                                contentContainerStyle={styles.tabsContainer}
                            >
                                {(['all', 'collections'] as const).map((tab) => (
                                    <Pressable
                                        key={tab}
                                        onPress={() => setActiveTab(tab)}
                                        style={[
                                            styles.tab,
                                            activeTab === tab && styles.activeTab
                                        ]}
                                    >
                                        <Text style={[
                                            styles.tabText,
                                            activeTab === tab && styles.activeTabText
                                        ]}>
                                            {tab === 'all' ? 'All Items' : 'Collections'}
                                        </Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>

                        <FlatList
                            data={showSkeletons ? [1, 2, 3, 4] : (activeTab === 'all' ? items : folders.filter(f => !f.is_default))}
                            keyExtractor={(item, index) => (showSkeletons ? `skeleton-${index}` : (item.id || String(index)))}
                            renderItem={({ item }) => (
                                showSkeletons ? (
                                    <ProductSkeleton />
                                ) : (
                                    activeTab === 'all' ? (
                                        <FavoriteProductCard
                                            product={item.product}
                                            discount={discounts[item.product_id]}
                                            onPress={() => navigation.navigate('ProductDetail', { product: item.product })}
                                            onRemove={() => handleRemove(item.product_id)}
                                            onAddToCart={(qty) => handleAddToCart(item.product, qty)}
                                            isInCart={cartItems.some(ci => ci.id === item.product_id)}
                                        />
                                    ) : (
                                        <FolderCard
                                            name={item.name}
                                            itemCount={item.item_count}
                                            thumbnailUrl={item.thumbnail_url}
                                            isDefault={item.is_default}
                                            onPress={() => setSelectedFolder(item)}
                                        />
                                    )
                                )
                            )}
                            contentContainerStyle={styles.listContent}
                            ListEmptyComponent={renderEmptyState}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
                        />
                    </>
                )}
            </LinearGradient>

            {/* Create Collection Modal */}
            <Modal
                visible={isCreateModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsCreateModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalContent}
                    >
                        <Text style={styles.modalTitle}>New Collection</Text>
                        <Text style={styles.modalSubtitle}>Enter a name for your collection</Text>
                        
                        <TextInput
                            style={styles.modalInput}
                            placeholder="e.g., Summer Outfits"
                            value={newCollectionName}
                            onChangeText={setNewCollectionName}
                            autoFocus
                            maxLength={30}
                        />

                        <View style={styles.modalButtons}>
                            <Pressable 
                                style={[styles.modalButton, { flex: 1 }, styles.cancelButton]} 
                                onPress={() => {
                                    setIsCreateModalVisible(false);
                                    setNewCollectionName('');
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </Pressable>
                            <Pressable 
                                style={[styles.modalButton, { flex: 1 }, styles.confirmButton, !newCollectionName.trim() && styles.disabledButton]} 
                                onPress={confirmCreateCollection}
                                disabled={!newCollectionName.trim()}
                            >
                                <Text style={styles.confirmButtonText}>Create</Text>
                            </Pressable>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Edit Collection Modal */}
            <Modal
                visible={isEditModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalContent}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Collection</Text>
                            <Pressable onPress={() => setIsEditModalVisible(false)}>
                                <X size={20} color="#6B7280" />
                            </Pressable>
                        </View>
                        
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Collection Name"
                            value={editCollectionName}
                            onChangeText={setEditCollectionName}
                            autoFocus
                        />
                        
                        <Pressable 
                            style={[styles.modalButton, styles.confirmButton, !editCollectionName.trim() && styles.disabledButton]}
                            onPress={confirmEditFolder}
                            disabled={!editCollectionName.trim()}
                        >
                            <Text style={styles.confirmButtonText}>Save Changes</Text>
                        </Pressable>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            <AddedToCartModal
                visible={showAddedToCartModal}
                onClose={() => setShowAddedToCartModal(false)}
                productName={addedProductInfo.name}
                productImage={addedProductInfo.image}
            />

            {/* Duplicate Item Alert Modal */}
            <Modal
                visible={showDuplicateModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDuplicateModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Already in Cart</Text>
                            <Pressable onPress={() => setShowDuplicateModal(false)}>
                                <X size={20} color="#6B7280" />
                            </Pressable>
                        </View>
                        
                        <Text style={styles.modalSubtitle}>
                            This item is already in your cart. Do you want to add it again?
                        </Text>

                        {pendingProduct && (
                            <View style={styles.duplicateProductPreview}>
                                <Image 
                                    source={{ uri: pendingProduct.images?.[0]?.image_url || pendingProduct.primary_image || pendingProduct.image }} 
                                    style={styles.duplicateImage}
                                />
                                <View style={styles.duplicateInfo}>
                                    <Text style={styles.duplicateName} numberOfLines={1}>{pendingProduct.name}</Text>
                                    <Text style={styles.duplicateQty}>Quantity: {pendingQuantity}</Text>
                                </View>
                            </View>
                        )}
                        
                        <View style={styles.modalButtons}>
                            <Pressable 
                                style={[styles.modalButton, styles.cancelButton, { flex: 1 }]} 
                                onPress={() => setShowDuplicateModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </Pressable>
                            <Pressable 
                                style={[styles.modalButton, styles.confirmButton, { flex: 1 }]} 
                                onPress={() => executeAdd(pendingProduct, pendingQuantity)}
                            >
                                <Text style={styles.confirmButtonText}>Add Again</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Adding to Cart Loading Overlay */}
            <Modal
                visible={isAddingToCart}
                transparent={true}
                animationType="fade"
            >
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Adding to cart...</Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerContainer: {
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    headerIconButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#111827',
        textAlign: 'center',
    },
    tabsScroll: {
        marginBottom: 8,
    },
    tabsContainer: {
        gap: 8,
        paddingHorizontal: 4,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginRight: 8,
    },
    activeTab: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
    },
    activeTabText: {
        color: '#FFF',
        fontWeight: '800',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 40,
        lineHeight: 20,
    },
    createBtn: {
        marginTop: 24,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 30,
    },
    createBtnText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 15,
    },
    selectedFolderInfo: {
        flex: 1,
        alignItems: 'center',
    },
    headerActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        width: 100,
        justifyContent: 'flex-end',
    },
    headerEditButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFF7ED',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFEDD5',
    },
    headerDeleteButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    selectedFolderName: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
    },
    selectedFolderCount: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '700',
        letterSpacing: 0.5,
        marginTop: 2,
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    skeletonProductCard: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    skeletonProductImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
    },
    skeletonProductInfo: {
        marginLeft: 16,
        flex: 1,
        justifyContent: 'space-between',
    },
    skeletonProductTitle: {
        width: '80%',
        height: 16,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
    },
    skeletonProductSeller: {
        width: '50%',
        height: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
        marginTop: 6,
    },
    skeletonProductFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    skeletonProductPrice: {
        width: 60,
        height: 18,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
    },
    skeletonProductActions: {
        width: 70,
        height: 32,
        backgroundColor: '#F3F4F6',
        borderRadius: 16,
    },
    skeletonFolderCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    skeletonFolderIcon: {
        width: 64,
        height: 64,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
    },
    skeletonFolderInfo: {
        flex: 1,
        marginLeft: 16,
    },
    skeletonFolderName: {
        width: '60%',
        height: 18,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
        marginBottom: 8,
    },
    skeletonFolderMetadata: {
        width: '40%',
        height: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 20,
    },
    modalInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#111827',
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
    },
    cancelButton: {
        backgroundColor: '#F3F4F6',
    },
    confirmButton: {
        backgroundColor: COLORS.primary,
    },
    disabledButton: {
        backgroundColor: '#D1D5DB',
    },
    cancelButtonText: {
        color: '#4B5563',
        fontWeight: '600',
    },
    confirmButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    loadingOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        gap: 12,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    loadingText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#374151',
    },
    duplicateProductPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        gap: 12,
    },
    duplicateImage: {
        width: 48,
        height: 48,
        borderRadius: 8,
    },
    duplicateInfo: {
        flex: 1,
    },
    duplicateName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },
    duplicateQty: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
});
