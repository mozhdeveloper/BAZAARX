import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    StatusBar,
    Alert,
    Dimensions,
    TextInput,
    Modal,
    Animated,
    Platform,
    Keyboard,
    TouchableOpacity,
    Share as ShareApi,
    KeyboardAvoidingView,
    BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    ChevronLeft,
    PlusCircle,
    Gift,
    Share,
    Edit2,
    Trash2,
    Lock,
    Globe,
    ChevronRight,
    Search,
    Heart,
    MoreHorizontal,
    X
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { COLORS } from '../src/constants/theme';
import { LABELS } from '../src/constants/labels';
import { useWishlistStore, WishlistItem } from '../src/stores/wishlistStore';
import { useAuthStore } from '../src/stores/authStore';
import { useAddressStore } from '../src/stores/addressStore';
import { GuestLoginModal } from '../src/components/GuestLoginModal';
import { safeImageUri, PLACEHOLDER_PRODUCT } from '../src/utils/imageUtils';

const { width, height } = Dimensions.get('window');

const OCCASIONS = [
    { id: 'wedding', label: 'Wedding' },
    { id: 'baby', label: 'Baby Shower' },
    { id: 'birthday', label: 'Birthday' },
    { id: 'graduation', label: 'Graduation' },
    { id: 'housewarming', label: 'Housewarming' },
    { id: 'christmas', label: 'Christmas' },
    { id: 'other', label: 'Other' },
];

const getOccasionLabel = (id: string | undefined | null) => {
    if (!id) return '';
    if (id === 'baby') return 'BABY SHOWER';
    const occ = OCCASIONS.find(o => o.id === id);
    if (occ) return occ.label.toUpperCase();
    return id.replace('_', ' ').toUpperCase();
};

interface CreateRegistryPayload {
    name: string;
    privacy: 'private' | 'public' | 'link';
    occasion: string;
    delivery?: {
        showAddress: boolean;
        addressId?: string;
        instructions?: string;
    };
}

// Reuse Subcomponents from RegistryScreen logic but renamed
const ProductThumbnails = ({ items, totalCount }: { items: any[], totalCount: number }) => {
    const displayItems = items.slice(0, 3);
    return (
        <View style={styles.avatarStack}>
            {displayItems.map((item, i) => (
                <View key={i} style={[styles.avatarCircleImage, { marginLeft: i === 0 ? 0 : -12, zIndex: 10 - i }]}>
                    <Image
                        source={{ uri: item.product_image || item.image }}
                        style={styles.avatarCircleImage}
                        contentFit="cover"
                    />
                </View>
            ))}
            {totalCount > 3 && (
                <View style={[styles.avatarCircle, { backgroundColor: '#FEB92E', marginLeft: -12, zIndex: 0 }]}>
                    <Text style={styles.avatarInitial}>+{totalCount - 3}</Text>
                </View>
            )}
            <Text style={styles.itemCountText}>{totalCount} {totalCount === 1 ? 'item' : 'items'}</Text>
        </View>
    );
};

const WishlistListItem = ({ item, onProductPress, onDelete, onQuantityChange }: any) => {
    return (
        <Pressable
            style={({ pressed }) => [styles.listItemCard, pressed && styles.listItemCardPressed]}
            onPress={onProductPress}
        >
            <View style={styles.listItemImageContainer}>
                <Image
                    source={{ uri: item.product_image || item.image }}
                    style={styles.listItemImage}
                    contentFit="cover"
                />
            </View>
            <View style={styles.listItemDetails}>
                <View>
                    <Text style={styles.listItemProductName} numberOfLines={2}>{item.product_name || item.name}</Text>
                    <View style={styles.listItemPriceRow}>
                        <Text style={styles.listItemPrice}>₱{Number(item.price || 0).toLocaleString()}</Text>
                    </View>
                </View>

                <View style={styles.listItemFooter}>
                    <View style={styles.listItemQtyContainer}>
                        <Pressable style={styles.listItemQtyBtn} onPress={() => onQuantityChange(item.id, Math.max(1, (item.desiredQty || 1) - 1))}>
                            <Text style={{ fontSize: 18, color: COLORS.primary }}>-</Text>
                        </Pressable>
                        <Text style={styles.listItemQtyValue}>{item.desiredQty || 1}</Text>
                        <Pressable style={styles.listItemQtyBtn} onPress={() => onQuantityChange(item.id, (item.desiredQty || 1) + 1)}>
                            <Text style={{ fontSize: 18, color: COLORS.primary }}>+</Text>
                        </Pressable>
                    </View>
                    <Pressable style={styles.listItemDeleteBtn} onPress={onDelete}>
                        <Trash2 size={16} color="#DC2626" />
                    </Pressable>
                </View>
            </View>
        </Pressable>
    );
};

// Modals
/**
 * Sub-component for individual Wishlist Folders (Cards)
 * Replicates the premium Web UI design
 */
const WishlistFolderCard = ({ cat, items, onPress }: { cat: any; items: any[]; onPress: () => void }) => {
    const catItems = items.filter(i => i.categoryId === cat.id || (cat.id === 'default' && !i.categoryId));
    const itemCount = catItems.length;

    // Format date as "MMM DD, YYYY" (e.g., APR 27, 2026)
    const formattedDate = cat.created_at ? new Date(cat.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
    }).toUpperCase() : 'JUST NOW';

    // Get thumbnail from first item in this category
    const thumbnail = catItems[0]?.primary_image || catItems[0]?.image || (catItems[0]?.images && catItems[0].images[0]);

    const getOccasionLabel = (id: string | undefined | null) => {
        if (!id || id === 'general') return '';
        const occ = OCCASIONS.find(o => o.id === id);
        return (occ ? occ.label : id).toUpperCase();
    };

    return (
        <Pressable
            style={({ pressed }) => [
                styles.folderCard,
                pressed && styles.folderCardPressed
            ]}
            onPress={onPress}
        >
            <View style={styles.folderCardContent}>
                <View style={styles.folderThumbnailContainer}>
                    {thumbnail ? (
                        <Image
                            source={{ uri: safeImageUri(thumbnail, PLACEHOLDER_PRODUCT) }}
                            style={styles.folderThumbnail}
                            contentFit="cover"
                        />
                    ) : (
                        <View style={styles.folderThumbnailEmpty}>
                            <Gift size={24} color="#D1D5DB" strokeWidth={1.5} />
                        </View>
                    )}
                </View>

                <View style={styles.folderInfo}>
                    <View style={styles.folderHeaderRow}>
                        <Text style={styles.folderTitle} numberOfLines={1}>{cat.name}</Text>
                        {cat.occasion && cat.occasion !== 'general' && (
                            <Text style={styles.folderCategoryBadge}>{getOccasionLabel(cat.occasion)}</Text>
                        )}
                    </View>
                    <Text style={styles.folderMetadata}>
                        {itemCount} {itemCount === 1 ? 'ITEM' : 'ITEMS'} - {formattedDate}
                    </Text>
                </View>
            </View>
        </Pressable>
    );
};

const CreateListModal = ({ visible, onClose, onCreate, userId }: any) => {
    const navigation = useNavigation<any>();
    const { savedAddresses, defaultAddress, loadSavedAddresses } = useAddressStore();
    const [name, setName] = useState('');
    const [occasion, setOccasion] = useState(OCCASIONS[2].id);
    const [customOccasion, setCustomOccasion] = useState('');
    const [showAddress, setShowAddress] = useState(false);
    const [selectedAddressId, setSelectedAddressId] = useState('');
    const [deliveryInstructions, setDeliveryInstructions] = useState('');

    const slideAnim = useRef(new Animated.Value(height)).current;
    const keyboardOffset = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            if (userId) loadSavedAddresses(userId);
            setName('');
            setOccasion(OCCASIONS[2].id);
            setCustomOccasion('');
            setShowAddress(false);
            setSelectedAddressId(defaultAddress?.id || '');
            setDeliveryInstructions('');

            Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }).start();
        } else {
            slideAnim.setValue(height);
        }
    }, [visible, userId, defaultAddress?.id, loadSavedAddresses]);

    useEffect(() => {
        if (visible && savedAddresses.length > 0 && !selectedAddressId) {
            setSelectedAddressId(defaultAddress?.id || savedAddresses[0].id);
        }
    }, [visible, selectedAddressId, savedAddresses, defaultAddress?.id]);

    useEffect(() => {
        const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
            Animated.timing(keyboardOffset, { toValue: e.endCoordinates.height, duration: 200, useNativeDriver: false }).start();
        });
        const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', (e) => {
            Animated.timing(keyboardOffset, { toValue: 0, duration: 200, useNativeDriver: false }).start();
        });
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    const handleCreate = () => {
        if (!name.trim()) return;
        onCreate({
            name: name.trim(),
            privacy: 'private',
            occasion: occasion === 'other' ? customOccasion : occasion,
            delivery: {
                showAddress,
                addressId: showAddress ? selectedAddressId : undefined,
                instructions: showAddress ? deliveryInstructions : undefined
            }
        });
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.bottomSheetOverlay}>
                <Pressable style={styles.backdrop} onPress={onClose} />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ width: '100%' }}
                >
                    <Animated.View style={[styles.bottomSheetContent, { transform: [{ translateY: slideAnim }] }]}>
                        <View style={styles.bsHeader}>
                            <Text style={styles.bsTitle}>{LABELS.CREATE_NEW_WISHLIST}</Text>
                            <Pressable onPress={onClose} style={styles.closeBtn}><X size={24} color="#374151" /></Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <Text style={styles.inputLabel}>{LABELS.WISHLIST_NAME}</Text>
                            <TextInput
                                style={styles.bsInput}
                                placeholder="e.g., Sarah's Wedding"
                                placeholderTextColor="#9CA3AF"
                                value={name}
                                onChangeText={setName}
                                maxLength={25}
                            />

                            <Text style={styles.inputLabel}>{LABELS.GIFT_CATEGORY}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.occasionScroll} contentContainerStyle={styles.occasionContainer}>
                                {OCCASIONS.map(occ => (
                                    <Pressable
                                        key={occ.id}
                                        style={[styles.occasionChip, occasion === occ.id && styles.occasionChipActive]}
                                        onPress={() => setOccasion(occ.id)}
                                    >
                                        <Text style={[styles.occasionText, occasion === occ.id && styles.occasionTextActive]}>{occ.label}</Text>
                                    </Pressable>
                                ))}
                            </ScrollView>

                            {occasion === 'other' && (
                                <TextInput
                                    style={[styles.bsInput, { marginTop: 12 }]}
                                    placeholder="Specify Occasion"
                                    placeholderTextColor="#9CA3AF"
                                    value={customOccasion}
                                    onChangeText={setCustomOccasion}
                                />
                            )}

                            <View style={styles.deliverySection}>
                                <Text style={styles.inputLabel}>{LABELS.DELIVERY_PREFERENCE}</Text>
                                <Pressable
                                    style={styles.deliveryToggleRow}
                                    onPress={() => {
                                        if (!savedAddresses.length) return;
                                        setShowAddress(!showAddress);
                                        if (!showAddress && !selectedAddressId) {
                                            setSelectedAddressId(defaultAddress?.id || savedAddresses[0].id);
                                        }
                                    }}
                                    disabled={savedAddresses.length === 0}
                                >
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={[styles.checkbox, showAddress && styles.checkboxActive, !savedAddresses.length && styles.checkboxDisabled]}>
                                            {showAddress && <View style={styles.checkboxDot} />}
                                        </View>
                                        <Text style={styles.deliveryToggleText}>{LABELS.SHARE_ADDRESS_WITH_GIFTERS}</Text>
                                    </View>
                                    <Pressable
                                        onPress={() => {
                                            onClose();
                                            navigation.navigate('Addresses');
                                        }}
                                    >
                                        <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>{LABELS.MANAGE}</Text>
                                    </Pressable>
                                </Pressable>
                                <Text style={styles.deliveryHint}>
                                    {savedAddresses.length
                                        ? LABELS.ADDRESS_HINT
                                        : LABELS.ADDRESS_EMPTY_HINT}
                                </Text>

                                {showAddress && savedAddresses.length > 0 && (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.addressChipRow}>
                                        {savedAddresses.map((address) => {
                                            const isSelected = selectedAddressId === address.id;
                                            return (
                                                <Pressable
                                                    key={address.id}
                                                    style={[styles.addressChip, isSelected && styles.addressChipActive]}
                                                    onPress={() => setSelectedAddressId(address.id)}
                                                >
                                                    <Text style={[styles.addressChipText, isSelected && styles.addressChipTextActive]}>
                                                        {address.label || `${address.firstName} ${address.lastName}`}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </ScrollView>
                                )}

                                {showAddress && (
                                    <TextInput
                                        style={[styles.bsInput, { marginTop: 12 }]}
                                        placeholder={LABELS.DELIVERY_INSTRUCTIONS}
                                        placeholderTextColor="#9CA3AF"
                                        value={deliveryInstructions}
                                        onChangeText={setDeliveryInstructions}
                                        editable={savedAddresses.length > 0}
                                    />
                                )}
                            </View>

                            <Pressable style={[styles.createBtn, !name.trim() && styles.disabledBtn]} onPress={handleCreate}>
                                <Text style={styles.createBtnText}>Create Wishlist</Text>
                            </Pressable>
                        </ScrollView>
                    </Animated.View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const EditCategoryModal = ({ visible, category, onClose, onSave, onDelete }: any) => {
    const navigation = useNavigation<any>();
    const { savedAddresses, defaultAddress, loadSavedAddresses } = useAddressStore();
    const { user } = useAuthStore();
    const [name, setName] = useState('');
    const [occasion, setOccasion] = useState('');
    const [customOccasion, setCustomOccasion] = useState('');
    const [showAddress, setShowAddress] = useState(false);
    const [selectedAddressId, setSelectedAddressId] = useState('');
    const [deliveryInstructions, setDeliveryInstructions] = useState('');

    const slideAnim = useRef(new Animated.Value(height)).current;
    const keyboardOffset = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible && category) {
            if (user?.id) loadSavedAddresses(user.id);
            setName(category.name || '');
            const isPredefined = OCCASIONS.some(o => o.id === category.occasion);
            setOccasion(isPredefined ? category.occasion : 'other');
            setCustomOccasion(isPredefined ? '' : (category.occasion || ''));
            setShowAddress(!!category.delivery?.showAddress);
            setSelectedAddressId(category.delivery?.addressId || defaultAddress?.id || '');
            setDeliveryInstructions(category.delivery?.instructions || '');

            Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }).start();
        } else {
            slideAnim.setValue(height);
        }
    }, [visible, category, user?.id, defaultAddress?.id, loadSavedAddresses]);

    useEffect(() => {
        if (visible && savedAddresses.length > 0 && !selectedAddressId) {
            setSelectedAddressId(category?.delivery?.addressId || defaultAddress?.id || savedAddresses[0].id);
        }
    }, [visible, selectedAddressId, savedAddresses, defaultAddress?.id, category]);

    const handleSave = () => {
        if (!name.trim()) return;
        onSave(category.id, {
            name: name.trim(),
            occasion: occasion === 'other' ? customOccasion : occasion,
            delivery: {
                showAddress,
                addressId: showAddress ? selectedAddressId : undefined,
                instructions: showAddress ? deliveryInstructions : undefined
            }
        });
        onClose();
    };

    const handleDelete = () => {
        Alert.alert(LABELS.DELETE_LIST, LABELS.DELETE_CONFIRMATION, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => { onDelete(category.id); onClose(); } }
        ]);
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.bottomSheetOverlay}>
                <Pressable style={styles.backdrop} onPress={onClose} />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ width: '100%' }}
                >
                    <Animated.View style={[styles.bottomSheetContent, { transform: [{ translateY: slideAnim }] }]}>
                        <View style={styles.bsHeader}>
                            <Text style={styles.bsTitle}>{LABELS.EDIT_LIST}</Text>
                            <Pressable onPress={onClose} style={styles.closeBtn}><X size={24} color="#374151" /></Pressable>
                        </View>

                        <Text style={styles.inputLabel}>{LABELS.WISHLIST_NAME}</Text>
                        <TextInput style={styles.bsInput} value={name} onChangeText={setName} maxLength={20} />

                        <View style={styles.editListButtonRow}>
                            <Pressable onPress={onClose} style={[styles.editListBtn, styles.editListCancelBtn]}>
                                <Text style={styles.editListCancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable onPress={handleSave} style={[styles.editListBtn, styles.editListSaveBtn]}>
                                <Text style={styles.editListSaveText}>{LABELS.SAVE_CHANGES}</Text>
                            </Pressable>
                        </View>

                        {category?.id !== 'default' && (
                            <Pressable onPress={handleDelete} style={[styles.deleteListBtn, { marginTop: 12 }]}>
                                <Text style={styles.deleteListBtnText}>{LABELS.DELETE_LIST}</Text>
                            </Pressable>
                        )}
                    </Animated.View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

export default function WishlistScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { items, categories, createCategory, updateItem, removeItem, shareWishlist, updateCategory, deleteCategory, loadWishlist } = useWishlistStore();
    const { isGuest, user } = useAuthStore();

    const [showGuestModal, setShowGuestModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [activeOccasion, setActiveOccasion] = useState('all');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    useEffect(() => {
        if (isGuest) setShowGuestModal(true);
    }, [isGuest]);

    useEffect(() => {
        if (user?.id && !isGuest) loadWishlist(user.id);
    }, [user?.id]);

    // Handle hardware back button when inside a wishlist folder
    useEffect(() => {
        const onBackPress = () => {
            if (selectedCategoryId) {
                setSelectedCategoryId(null);
                return true; // Prevent default behavior (navigating back to Profile)
            }
            return false; // Use default behavior
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
    }, [selectedCategoryId]);

    const handleShare = useCallback(async () => {
        try {
            const catId = selectedCategoryId || 'default';
            const url = await shareWishlist(catId);
            await ShareApi.share({
                message: `Check out my wishlist on BazaarX! ${url}`,
                url: url
            });
        } catch (error) {
            Alert.alert('Error', 'Failed to share wishlist');
        }
    }, [selectedCategoryId, shareWishlist]);

    const currentCategoryName = useMemo(() =>
        categories.find(c => c.id === selectedCategoryId)?.name || LABELS.MY_WISHLISTS,
        [categories, selectedCategoryId]);

    const filteredCategories = useMemo(() => categories.filter(c => {
        if (activeOccasion === 'all') return true;
        if (c.occasion === activeOccasion) return true;
        if (activeOccasion === 'other') {
            return !OCCASIONS.some(o => o.id === c.occasion) && c.id !== 'default';
        }
        return false;
    }), [categories, activeOccasion]);

    const displayedItems = useMemo(() => selectedCategoryId
        ? items.filter(item => item.categoryId === selectedCategoryId || (selectedCategoryId === 'default' && !item.categoryId))
        : items,
        [items, selectedCategoryId]);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']}
                style={styles.container}
            >
                <StatusBar barStyle="dark-content" />
                <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
                    {!selectedCategoryId ? (
                        <View style={styles.headerTop}>
                            <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                                <ChevronLeft size={24} color={COLORS.textHeadline} strokeWidth={2.5} />
                            </Pressable>
                            <Text style={styles.headerTitle}>{LABELS.MY_WISHLISTS}</Text>
                            <Pressable onPress={() => setShowCreateModal(true)} style={styles.headerIconButton}>
                                <PlusCircle size={24} color={COLORS.primary} strokeWidth={2.25} />
                            </Pressable>
                        </View>
                    ) : (
                        <View style={styles.headerTop}>
                            <Pressable onPress={() => setSelectedCategoryId(null)} style={styles.headerIconButton}>
                                <ChevronLeft size={24} color={COLORS.textHeadline} strokeWidth={2.5} />
                            </Pressable>
                            <Text style={[styles.headerTitle, { flex: 1 }]}>{currentCategoryName}</Text>
                            <View style={styles.headerActionsRight}>
                                <Pressable onPress={() => setEditingCategory(categories.find(c => c.id === selectedCategoryId))} style={styles.headerIconBtn}>
                                    <Edit2 size={20} color={COLORS.primary} />
                                </Pressable>
                                <Pressable onPress={handleShare} style={styles.headerIconBtn}>
                                    <Share size={20} color={COLORS.primary} />
                                </Pressable>
                            </View>
                        </View>
                    )}
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {!selectedCategoryId && (
                        <View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContainer}>
                                <Pressable style={[styles.tab, activeOccasion === 'all' && styles.tabActive]} onPress={() => setActiveOccasion('all')}>
                                    <Text style={[styles.tabText, activeOccasion === 'all' && styles.tabTextActive]}>All</Text>
                                </Pressable>
                                {OCCASIONS.map(occ => (
                                    <Pressable key={occ.id} style={[styles.tab, activeOccasion === occ.id && styles.tabActive]} onPress={() => setActiveOccasion(occ.id)}>
                                        <Text style={[styles.tabText, activeOccasion === occ.id && styles.tabTextActive]}>{occ.label}</Text>
                                    </Pressable>
                                ))}
                            </ScrollView>


                            <View style={styles.folderListContainer}>
                                {filteredCategories.length === 0 ? (
                                    <View style={styles.emptyContainer}>
                                        <Heart size={48} color={COLORS.primary} strokeWidth={1.5} />
                                        <Text style={styles.emptyTitle}>{LABELS.WISHLIST_EMPTY}</Text>
                                        <Pressable
                                            style={[styles.shopNowButton, { marginTop: 12 }]}
                                            onPress={() => setShowCreateModal(true)}
                                        >
                                            <Text style={styles.shopNowText}>Create Your First List</Text>
                                        </Pressable>
                                    </View>
                                ) : (
                                    filteredCategories.map((cat) => (
                                        <WishlistFolderCard
                                            key={cat.id}
                                            cat={cat}
                                            items={items}
                                            onPress={() => setSelectedCategoryId(cat.id)}
                                        />
                                    ))
                                )}
                            </View>
                        </View>
                    )}

                    {selectedCategoryId && (
                        <View style={styles.itemsListContainer}>
                            {displayedItems.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <View style={styles.emptyIconContainer}>
                                        <Gift size={48} color="#D1D5DB" strokeWidth={1.5} />
                                        <View style={styles.emptyIconBadge}>
                                            <X size={12} color="#FFF" strokeWidth={3} />
                                        </View>
                                    </View>
                                    <Text style={styles.emptyTitle}>This wishlist is empty</Text>
                                    <Text style={styles.emptySubtitle}>Explore products and add them to your collection!</Text>
                                    <Pressable style={styles.shopNowButton} onPress={() => navigation.navigate('MainTabs', { screen: 'Shop' })}>
                                        <Text style={styles.shopNowText}>Explore Products</Text>
                                    </Pressable>
                                </View>
                            ) : (
                                displayedItems.map(item => (
                                    <WishlistListItem
                                        key={item.id}
                                        item={item}
                                        onProductPress={() => navigation.navigate('ProductDetail', { product: item })}
                                        onDelete={() => removeItem(item.registryItemId || item.id)}
                                        onQuantityChange={(id: string, qty: number) => updateItem(item.registryItemId || id, { desiredQty: qty })}
                                    />
                                ))
                            )}
                        </View>
                    )}
                </ScrollView>

                <CreateListModal visible={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={(p: any) => createCategory(p.name, p.privacy, p.occasion, undefined, p.delivery)} userId={user?.id} />
                <EditCategoryModal visible={!!editingCategory} category={editingCategory} onClose={() => setEditingCategory(null)} onSave={updateCategory} onDelete={(id: string) => { deleteCategory(id); setSelectedCategoryId(null); }} />
                <GuestLoginModal visible={showGuestModal} onClose={() => navigation.navigate('MainTabs', { screen: 'Home' })} message="Sign up to create a wishlist." hideCloseButton={true} cancelText="Go back to Home" />
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    headerContainer: { paddingHorizontal: 20, paddingBottom: 20 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerIconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textHeadline, textAlign: 'center' },
    headerActionsRight: { flexDirection: 'row', gap: 8 },
    headerIconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 16, paddingBottom: 40 },
    groupedCardContainer: { backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 8 },
    groupedCardItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    groupedCardItemLast: { borderBottomWidth: 0 },
    groupedCardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textHeadline, marginBottom: 4 },
    avatarStack: { flexDirection: 'row', alignItems: 'center', height: 28 },
    avatarCircleImage: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#FFF', overflow: 'hidden', backgroundColor: '#FFF' },
    avatarCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
    avatarInitial: { fontSize: 12, fontWeight: '700', color: '#FFF' },
    itemCountText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginLeft: 8 },
    listItemCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, padding: 12, gap: 12, marginBottom: 12, elevation: 2 },
    listItemCardPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
    listItemImageContainer: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F3F4F6' },
    listItemImage: { width: '100%', height: '100%' },
    listItemDetails: { flex: 1, justifyContent: 'space-between' },
    listItemProductName: { fontSize: 15, fontWeight: '600', color: COLORS.textHeadline },
    listItemPriceRow: { marginTop: 4 },
    listItemPrice: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
    listItemFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    listItemQtyContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    listItemQtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFF9F5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FEE2E2' },
    listItemQtyValue: { fontSize: 16, fontWeight: '700' },
    listItemDeleteBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
    itemsListContainer: {
        paddingBottom: 20,
    },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textHeadline, marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, paddingHorizontal: 40, lineHeight: 20 },
    emptyIconContainer: { position: 'relative' },
    emptyIconBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#D1D5DB', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
    shopNowButton: { marginTop: 24, backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 30 },
    shopNowText: { color: '#FFF', fontWeight: '700' },
    tabScroll: { marginBottom: 16 },
    tabContainer: { gap: 8 },
    tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB' },
    tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    tabText: { fontSize: 12, color: '#6B7280' },
    tabTextActive: { color: '#FFF', fontWeight: '700' },

    // Folder Card Styles
    folderListContainer: {
        gap: 12,
        paddingBottom: 20,
    },
    folderCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    folderCardPressed: {
        transform: [{ scale: 0.98 }],
        backgroundColor: '#FAFAFA',
    },
    folderCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    folderThumbnailContainer: {
        width: 64,
        height: 64,
        borderRadius: 12,
        overflow: 'hidden',
    },
    folderThumbnail: {
        width: '100%',
        height: '100%',
        backgroundColor: '#F9FAFB',
    },
    folderThumbnailEmpty: {
        width: '100%',
        height: '100%',
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        borderRadius: 12,
    },
    folderInfo: {
        flex: 1,
        marginLeft: 16,
    },
    folderHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    folderTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.primary, // Orange as requested
        flex: 1,
        marginRight: 8,
    },
    folderCategoryBadge: {
        fontSize: 10,
        fontWeight: '800',
        color: '#9CA3AF', // Subtle gray font
        letterSpacing: 0.5,
    },
    folderMetadata: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6B7280', // Gray text
        letterSpacing: 0.8,
    },

    bottomSheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    backdrop: { ...StyleSheet.absoluteFillObject },
    bottomSheetContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    bsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    bsTitle: { fontSize: 20, fontWeight: '800' },
    closeBtn: { padding: 4 },
    inputLabel: { fontSize: 14, fontWeight: '700', color: '#4B5563', marginBottom: 8 },
    bsInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 14, fontSize: 16, marginBottom: 20, color: '#1F2937' },
    occasionScroll: { marginBottom: 8 },
    occasionContainer: { gap: 8, paddingBottom: 10 },
    occasionChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
    occasionChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    occasionText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
    occasionTextActive: { color: '#FFF', fontWeight: '700' },
    deliverySection: { marginBottom: 24 },
    deliveryToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
    deliveryToggleText: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
    deliveryHint: { fontSize: 12, color: '#6B7280', marginTop: 8, lineHeight: 18 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
    checkboxActive: { borderColor: COLORS.primary, backgroundColor: '#FFF7ED' },
    checkboxDisabled: { opacity: 0.5 },
    checkboxDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
    addressChipRow: { gap: 8, paddingVertical: 12 },
    addressChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8 },
    addressChipActive: { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' },
    addressChipText: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
    addressChipTextActive: { color: COLORS.primary },
    createBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 30, alignItems: 'center', marginTop: 8 },
    createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    disabledBtn: { backgroundColor: '#D1D5DB' },
    editListButtonRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
    editListBtn: { flex: 1, padding: 16, borderRadius: 30, alignItems: 'center' },
    editListCancelBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB' },
    editListCancelText: { color: '#6B7280', fontWeight: '700', fontSize: 16 },
    editListSaveBtn: { backgroundColor: COLORS.primary },
    editListSaveText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
    deleteListBtn: { padding: 16, borderRadius: 30, alignItems: 'center', backgroundColor: '#FEF2F2' },
    deleteListBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 16 },
});
