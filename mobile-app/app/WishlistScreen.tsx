import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, Dimensions, Share, Alert, Pressable, Modal, TextInput, Image, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, ShoppingBag, Share2, MoreVertical, Edit2, Search, FolderHeart, Plus, Lock, Globe, User, X, Store, ChevronRight, Trash2, Eye } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { ProductCard } from '../src/components/ProductCard';
import { useWishlistStore, WishlistItem } from '../src/stores/wishlistStore';
import { useAuthStore } from '../src/stores/authStore';
import { GuestLoginModal } from '../src/components/GuestLoginModal';
import { COLORS } from '../src/constants/theme';
import { BuyerBottomNav } from '../src/components/BuyerBottomNav';

const { width } = Dimensions.get('window');

// Create List Modal (Bottom Sheet Style)
const CreateListModal = ({ visible, onClose, onCreate }: any) => {
    const [name, setName] = useState('');
    const [isPrivate, setIsPrivate] = useState(true);
    const insets = useSafeAreaInsets();

    const handleCreate = () => {
        if (!name.trim()) return;
        onCreate(name, 'private');
        setName('');
        setIsPrivate(true);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.bottomSheetOverlay}>
                <Pressable style={styles.backdrop} onPress={onClose} />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ width: '100%' }}
                >
                    <View style={[styles.bottomSheetContent, { paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.bsHeader}>
                            <Text style={styles.bsTitle}>Create a new list</Text>
                            <Pressable onPress={onClose} style={styles.closeBtn}>
                                <X size={24} color="#374151" />
                            </Pressable>
                        </View>

                        <Text style={styles.inputLabel}>List Name</Text>
                        <TextInput
                            style={styles.bsInput}
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. Birthday Wishlist"
                            placeholderTextColor="#9CA3AF"
                            autoFocus
                        />

                        <Pressable onPress={handleCreate} style={[styles.createBtn, !name.trim() && styles.disabledBtn]}>
                            <Text style={styles.createBtnText}>Create Private List</Text>
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

// Item Edit Modal Component (Kept for Item View)
const ItemEditModal = ({ visible, onClose, item, onSave }: any) => {
    const [qty, setQty] = useState(item?.desiredQty?.toString() || '1');


    useEffect(() => {
        if (item) {

            setQty(item.desiredQty?.toString() || '1');
        }
    }, [item]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Edit Item</Text>



                    <Text style={styles.inputLabel}>Desired Quantity</Text>
                    <View style={styles.qtyContainer}>
                        <Pressable onPress={() => setQty(Math.max(1, parseInt(qty || '1') - 1).toString())} style={styles.qtyBtn}><Text>-</Text></Pressable>
                        <TextInput style={styles.qtyInput} value={qty} onChangeText={setQty} keyboardType="numeric" />
                        <Pressable onPress={() => setQty((parseInt(qty || '1') + 1).toString())} style={styles.qtyBtn}><Text>+</Text></Pressable>
                    </View>



                    <View style={styles.modalActions}>
                        <Pressable style={styles.modalBtn} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></Pressable>
                        <Pressable
                            style={[styles.modalBtn, styles.primaryBtn]}
                            onPress={() => {
                                onSave(item.id, { desiredQty: parseInt(qty) });
                                onClose();
                            }}
                        >
                            <Text style={styles.primaryBtnText}>Save</Text>
                        </Pressable>
                    </View>

                    <Pressable
                        style={{ position: 'absolute', top: 20, right: 16, padding: 4 }}
                        onPress={() => {
                            Alert.alert(
                                'Remove Item',
                                'Are you sure you want to remove this item?',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Remove', style: 'destructive', onPress: () => {
                                            onSave(item.id, null, true);
                                            onClose();
                                        }
                                    }
                                ]
                            );
                        }}
                    >
                        <Trash2 size={20} color="#EF4444" />
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
};

// Edit Category Modal
const EditCategoryModal = ({ visible, onClose, category, onSave, onDelete }: any) => {
    const [name, setName] = useState(category?.name || '');

    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (category) {
            setName(category.name);
        }
    }, [category]);

    const handleSave = () => {
        if (!name.trim()) return;
        onSave(category.id, { name, privacy: 'private' });
        onClose();
    };

    const handleDelete = () => {
        if (category.id === 'default') {
            Alert.alert('Cannot Delete', 'The default list cannot be deleted.');
            return;
        }
        Alert.alert(
            'Delete List',
            'Are you sure? Items will be moved to your default list.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive', onPress: () => {
                        onDelete(category.id);
                        onClose();
                    }
                }
            ]
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.bottomSheetOverlay}>
                <Pressable style={styles.backdrop} onPress={onClose} />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ width: '100%' }}
                >
                    <View style={[styles.bottomSheetContent, { paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.bsHeader}>
                            <Text style={styles.bsTitle}>Edit List</Text>
                            <Pressable onPress={onClose} style={styles.closeBtn}>
                                <X size={24} color="#374151" />
                            </Pressable>
                        </View>

                        <Text style={styles.inputLabel}>List Name</Text>
                        <TextInput
                            style={styles.bsInput}
                            value={name}
                            onChangeText={setName}
                            placeholder="List Name"
                        />



                        <View style={{ gap: 12 }}>
                            <Pressable onPress={handleSave} style={[styles.createBtn, !name.trim() && styles.disabledBtn]}>
                                <Text style={styles.createBtnText}>Save Changes</Text>
                            </Pressable>

                            {category?.id !== 'default' && (
                                <Pressable onPress={handleDelete} style={[styles.createBtn, { backgroundColor: '#FEE2E2' }]}>
                                    <Text style={[styles.createBtnText, { color: '#DC2626' }]}>Delete List</Text>
                                </Pressable>
                            )}
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

export default function WishlistScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();

    const { items, categories, createCategory, updateItem, removeItem, shareWishlist, updateCategory, deleteCategory } = useWishlistStore();
    const { isGuest } = useAuthStore();

    // UI State
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
    const [editingCategory, setEditingCategory] = useState<any>(null);

    // Navigation State
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    useEffect(() => {
        if (isGuest) {
            setShowGuestModal(true);
        }
    }, [isGuest]);

    const handleProductPress = (product: any) => {
        navigation.navigate('ProductDetail', { product });
    };

    const handleShare = async () => {
        try {
            // Share current category or default
            const catId = selectedCategoryId || 'default';
            const url = await shareWishlist(catId);
            await Share.share({
                message: `Check out my registry on BazaarX! ${url}`,
                url: url
            });
        } catch (error) {
            Alert.alert('Error', 'Failed to share wishlist');
        }
    };

    const handleCreateList = (name: string, privacy: 'private' | 'shared') => {
        createCategory(name, privacy);
        // Optional: Auto-select new category? For now just stay on list
    };

    // Filter items based on selected category
    const displayedItems = selectedCategoryId
        ? items.filter(item => item.categoryId === selectedCategoryId || (selectedCategoryId === 'default' && !item.categoryId))
        : items;

    const currentCategoryName = categories.find(c => c.id === selectedCategoryId)?.name || 'All Items';

    return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

            {/* Header */}
            <LinearGradient
                colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']} // Soft Parchment Header
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}
            >
                <View style={styles.headerTop}>
                    <Pressable
                        onPress={() => {
                            if (selectedCategoryId) {
                                setSelectedCategoryId(null); // Go back to categories
                            } else {
                                navigation.goBack();
                            }
                        }}
                        style={styles.headerIconButton}
                    >
                        <ArrowLeft size={24} color="#7C2D12" strokeWidth={2.5} />
                    </Pressable>

                    <View style={styles.titleContainer}>
                        <Text style={styles.headerTitle}>
                            {selectedCategoryId ? currentCategoryName : 'My Wishlists'}
                        </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>


                        {selectedCategoryId && (
                            <Pressable onPress={() => {
                                // Simulate sharing view
                                const cat = categories.find(c => c.id === selectedCategoryId);
                                const catItems = items.filter(i => i.categoryId === selectedCategoryId || (selectedCategoryId === 'default' && !i.categoryId));

                                const previewData = {
                                    name: "You", // Or user's real name via auth
                                    avatar: "https://ui-avatars.com/api/?name=You&background=random",
                                    registryAddress: { city: "Makati", province: "MM" }, // Mock or fetch from profile
                                    items: catItems.map(i => ({ ...i, status: 'active', priority: 'medium' }))
                                };

                                navigation.navigate('SharedWishlist', { wishlistData: previewData });
                            }} style={styles.headerIconButton}>
                                <Eye size={24} color="#7C2D12" />
                            </Pressable>
                        )}

                        {selectedCategoryId && (
                            <Pressable onPress={handleShare} style={styles.headerIconButton}>
                                <Share2 size={24} color="#7C2D12" />
                            </Pressable>
                        )}

                        {!selectedCategoryId && (
                            <Pressable onPress={() => setShowCreateModal(true)} style={[styles.createHeaderBtn]}>
                                <Plus size={20} color="#FB8C00" strokeWidth={3} />
                            </Pressable>
                        )}

                        {selectedCategoryId && (
                            <Pressable onPress={() => {
                                const cat = categories.find(c => c.id === selectedCategoryId);
                                setEditingCategory(cat);
                            }} style={styles.headerIconButton}>
                                <MoreVertical size={24} color="#7C2D12" />
                            </Pressable>
                        )}
                    </View>
                </View>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>



                {/* --- CATEGORIES VIEW (1 COLUMN VERTICAL) --- */}
                {!selectedCategoryId && (
                    <View>
                        {/* No "Create New List" card here anymore, moved to header */}

                        <View style={styles.categoriesList}>
                            {categories.map((cat) => {
                                const categoryItems = items.filter(i => i.categoryId === cat.id || (cat.id === 'default' && !i.categoryId));
                                const itemCount = categoryItems.length;
                                // Use first item image as cover, or fallback
                                const coverImage = cat.image || categoryItems[0]?.image;

                                return (
                                    <Pressable key={cat.id} style={styles.cardContainer} onPress={() => setSelectedCategoryId(cat.id)}>
                                        {/* Banner Image */}
                                        <View style={styles.cardBanner}>
                                            {coverImage ? (
                                                <Image source={{ uri: coverImage }} style={styles.bannerImage} resizeMode="cover" />
                                            ) : (
                                                <View style={styles.placeholderBanner}>
                                                    <FolderHeart size={48} color="#9CA3AF" />
                                                </View>
                                            )}
                                        </View>

                                        {/* Profile Content */}
                                        <View style={styles.cardContent}>
                                            <View style={styles.cardProfileContainer}>
                                                <View style={styles.cardProfile}>
                                                    <User size={24} color={COLORS.primary} strokeWidth={2.5} />
                                                </View>
                                            </View>

                                            <View style={styles.cardHeader}>
                                                <View style={{ flex: 1, paddingRight: 10 }}>
                                                    <Text style={styles.cardTitle}>{cat.name}</Text>
                                                    <View style={styles.cardRatingRow}>
                                                        <View style={styles.privacyTag}>
                                                            <Lock size={10} color="#6B7280" />
                                                            <Text style={styles.privacyTagText}>Private</Text>
                                                        </View>
                                                        <Text style={styles.itemCountDetail}>{itemCount} items</Text>
                                                    </View>
                                                </View>

                                                <View style={styles.visitShopBtn}>
                                                    <Text style={styles.visitShopText}>View List</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* --- ITEMS VIEW --- */}
                {selectedCategoryId && (
                    <View>
                        {displayedItems.length === 0 ? (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconContainer}>
                                    <Heart size={48} color="#D1D5DB" fill="#D1D5DB" />
                                </View>
                                <Text style={styles.emptyTitle}>This list is empty</Text>
                                <Text style={styles.emptyText}>Go add some items to it!</Text>
                                <Pressable style={styles.shopNowButton} onPress={() => navigation.navigate('MainTabs', { screen: 'Shop' })}>
                                    <ShoppingBag size={20} color="#FFF" />
                                    <Text style={styles.shopNowText}>Start Shopping</Text>
                                </Pressable>
                            </View>
                        ) : (
                            <View style={styles.itemsGrid}>
                                {displayedItems.map((item) => (
                                    <View key={item.id} style={styles.listItem}>
                                        <View style={styles.itemCardContainer}>
                                            <ProductCard
                                                product={item}
                                                onPress={() => handleProductPress(item)}
                                            />


                                            {/* Overlay Controls */}
                                            <View style={styles.itemControls}>
                                                <Pressable style={styles.editIconBtn} onPress={() => setEditingItem(item)}>
                                                    <Edit2 size={16} color="#FFF" />
                                                </Pressable>
                                            </View>
                                        </View>


                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

            </ScrollView>

            <GuestLoginModal
                visible={showGuestModal}
                onClose={() => {
                    navigation.navigate('MainTabs', { screen: 'Home' });
                }}
                message="Sign up to create a registry."
                hideCloseButton={true}
                cancelText="Go back to Home"
            />

            <CreateListModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreateList}
            />

            <ItemEditModal
                visible={!!editingItem}
                item={editingItem}
                onClose={() => setEditingItem(null)}
                onSave={(itemId: string, updates: any, shouldDelete: boolean) => {
                    if (shouldDelete) {
                        removeItem(itemId);
                    } else {
                        updateItem(itemId, updates);
                    }
                }}
            />

            <EditCategoryModal
                visible={!!editingCategory}
                category={editingCategory}
                onClose={() => setEditingCategory(null)}
                onSave={updateCategory}
                onDelete={(id: string) => {
                    deleteCategory(id);
                    setSelectedCategoryId(null); // Go back home
                }}
            />

            {/* Bottom Navigation */}
            <BuyerBottomNav />
    </View>
);
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    headerContainer: {
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 20,
        paddingBottom: 20,
        marginBottom: 10,
        elevation: 0,
        zIndex: 10,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'relative' },
    headerIconButton: { padding: 4, zIndex: 10 },
    createHeaderBtn: { backgroundColor: '#FFF', padding: 6, borderRadius: 20 },
    titleContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textHeadline },
    scrollContent: { padding: 20, paddingBottom: 40, minHeight: '100%' },

    // Categories List (Card Style)
    categoriesList: { gap: 20, paddingBottom: 20 },
    cardContainer: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 6,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12,
        marginBottom: 4,
    },
    cardBanner: {
        height: 140,
        width: '100%',
        backgroundColor: '#E5E7EB',
    },
    bannerImage: { width: '100%', height: '100%' },
    placeholderBanner: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
    cardContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 8,
        position: 'relative',
    },
    cardProfileContainer: {
        position: 'absolute',
        top: -24,
        left: 16,
        zIndex: 10,
    },
    cardProfile: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 24, // Clear the profile pic
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.primary,
        marginBottom: 4,
    },
    cardRatingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    privacyTag: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 6, paddingVertical: 2,
        backgroundColor: '#F3F4F6', borderRadius: 4,
    },
    privacyTagText: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted },
    itemCountDetail: { fontSize: 12, color: COLORS.textMuted },

    visitShopBtn: {
        backgroundColor: '#FB8C00', // Warm Orange
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    visitShopText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },

    // Items Grid
    itemsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    listItem: { width: (width - 48) / 2, marginBottom: 12 },
    itemCardContainer: { position: 'relative' },
    itemControls: {
        position: 'absolute', top: 8, right: 8,
        flexDirection: 'row', gap: 8,
    },
    itemPrivacyBadge: {
        position: 'absolute', top: 8, left: 8,
        backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 20,
    },
    editIconBtn: {
        backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 20,
    },
    registryDetails: {
        marginTop: 8,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 4
    },
    priorityBadge: {
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    },
    priorityText: { fontSize: 10, fontWeight: '700' },
    qtyText: { fontSize: 11, color: COLORS.textHeadline },

    // Find Registry Banner
    findRegistryContainer: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 24,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2
    },
    findRegistryContent: { flex: 1 },
    findRegistryTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textHeadline },
    findRegistrySubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    findRegistryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
    findRegistryBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

    // Empty State
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
    emptyIconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textHeadline, marginBottom: 8 },
    emptyText: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', marginBottom: 32 },
    shopNowButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, elevation: 4 },
    shopNowText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: '#FFF', width: '85%', padding: 20, borderRadius: 16, elevation: 5 },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
    inputLabel: { fontSize: 14, color: COLORS.textMuted, marginBottom: 8, fontWeight: '600' },
    modalInput: { borderBottomWidth: 1, borderColor: '#E5E7EB', paddingVertical: 8, marginBottom: 20, fontSize: 16 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 10 },
    modalBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
    primaryBtn: { backgroundColor: '#FB8C00' },
    cancelText: { color: COLORS.textMuted, fontWeight: '600' },
    primaryBtnText: { color: '#FFF', fontWeight: '700' },

    // Switch
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    switchLabel: { fontSize: 16, fontWeight: '600', color: COLORS.textHeadline },
    switchSub: { fontSize: 12, color: COLORS.textMuted },

    // New Bottom Sheet Styles
    bottomSheetOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    bottomSheetContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        elevation: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10,
    },
    bsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    bsTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.textHeadline,
    },
    closeBtn: {
        padding: 4,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
    },
    bsInput: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: COLORS.textHeadline,
        marginTop: 8,
        marginBottom: 24,
        backgroundColor: '#F9FAFB',
    },
    bsSwitchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    createBtn: {
        backgroundColor: '#FB8C00', // Warm Orange
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        elevation: 2,
    },
    disabledBtn: {
        backgroundColor: '#D1D5DB',
        elevation: 0,
    },
    createBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    },

    // Item Edit Specific
    priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    priorityOption: { flex: 1, padding: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, alignItems: 'center' },
    selectedPriority: { backgroundColor: '#FB8C00', borderColor: '#FB8C00' },
    priorityOptionText: { fontSize: 12, color: COLORS.textHeadline },
    qtyContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
    qtyBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
    qtyInput: { width: 60, textAlign: 'center', fontSize: 16, fontWeight: '700', borderBottomWidth: 1, borderColor: '#E5E7EB' },
});
