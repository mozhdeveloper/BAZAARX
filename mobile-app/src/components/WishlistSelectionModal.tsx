import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Modal,
    Dimensions,
    Animated,
    Platform,
    Alert,
    TextInput,
    KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { X, PlusCircle, Heart, ChevronRight, Gift } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import { LABELS } from '../constants/labels';
import { useWishlistStore } from '../stores/wishlistStore';
import { useAddressStore } from '../stores/addressStore';
import { useAuthStore } from '../stores/authStore';
import { safeImageUri, PLACEHOLDER_PRODUCT } from '../utils/imageUtils';

const { height } = Dimensions.get('window');

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

interface WishlistSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    product: any;
    onItemAdded?: () => void;
}

/**
 * Sub-component for individual Wishlist Cards
 */
const WishlistCard = ({ wishlist, items, onPress }: { wishlist: any; items: any[]; onPress: () => void }) => {
    const itemCount = items.filter(i => i.categoryId === wishlist.id || (wishlist.id === 'default' && !i.categoryId)).length;
    const formattedDate = wishlist.created_at ? new Date(wishlist.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }) : 'Just now';

    // Get a thumbnail from the items in this wishlist
    const item = items.find(i => i.categoryId === wishlist.id || (wishlist.id === 'default' && !i.categoryId));
    const thumbnail = item?.primary_image || item?.image || (item?.images && item.images[0]);

    return (
        <Pressable
            style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed
            ]}
            onPress={onPress}
        >
            <View style={styles.cardContent}>
                <View style={styles.thumbnailContainer}>
                    {thumbnail ? (
                        <Image
                            source={{ uri: safeImageUri(thumbnail, PLACEHOLDER_PRODUCT) }}
                            style={styles.thumbnail}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                        />
                    ) : (
                        <View style={styles.thumbnailEmpty}>
                            <Gift size={20} color="#D1D5DB" strokeWidth={1.5} />
                        </View>
                    )}
                </View>

                <View style={styles.infoContainer}>
                    <Text style={styles.wishlistTitle} numberOfLines={1}>{wishlist.name}</Text>
                    <Text style={styles.wishlistSubline}>
                        {itemCount} {itemCount === 1 ? 'item' : 'items'} • Shared {formattedDate}
                    </Text>
                </View>

                {wishlist.occasion && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{getOccasionLabel(wishlist.occasion)}</Text>
                    </View>
                )}
            </View>
        </Pressable>
    );
};

export const WishlistSelectionModal = ({ visible, onClose, product, onItemAdded }: WishlistSelectionModalProps) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { categories, items, addItem, createCategory } = useWishlistStore();
    const { user } = useAuthStore();
    const { savedAddresses, defaultAddress, loadSavedAddresses } = useAddressStore();

    const slideAnim = useRef(new Animated.Value(height)).current;

    const [isCreating, setIsCreating] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [selectedOccasion, setSelectedOccasion] = useState(OCCASIONS[2].id);
    const [customOccasion, setCustomOccasion] = useState('');
    const [showAddress, setShowAddress] = useState(false);
    const [selectedAddressId, setSelectedAddressId] = useState('');
    const [deliveryInstructions, setDeliveryInstructions] = useState('');

    useEffect(() => {
        if (visible) {
            if (user?.id) {
                loadSavedAddresses(user.id);
            }

            setShowAddress(false);
            setSelectedAddressId(defaultAddress?.id || '');
            setDeliveryInstructions('');

            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }).start();
        } else {
            slideAnim.setValue(height);
        }
    }, [visible, user?.id, loadSavedAddresses, defaultAddress?.id]);

    useEffect(() => {
        if (visible && savedAddresses.length > 0 && !selectedAddressId) {
            setSelectedAddressId(defaultAddress?.id || savedAddresses[0].id);
        }
    }, [visible, selectedAddressId, savedAddresses, defaultAddress?.id]);

    const handleCloseInternal = () => {
        Animated.timing(slideAnim, {
            toValue: height,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    const handleSelectWishlist = async (categoryId: string) => {
        const normalizedProductId = String(product.id);
        const alreadyInFolder = items.some(
            (item) => String(item.id) === normalizedProductId && item.categoryId === categoryId,
        );

        if (alreadyInFolder) {
            Alert.alert(LABELS.ALREADY_ADDED_TO_WISHLIST, 'This product is already in that wishlist.');
            return;
        }

        const folderName = categories.find((cat) => cat.id === categoryId)?.name || LABELS.WISHLIST;
        await addItem(product, 'medium', 1, categoryId);

        if (onItemAdded) onItemAdded();
        handleCloseInternal();
    };
    const handleCreateAndAdd = async () => {
        if (!newListName.trim()) return;
        const occasionValue = selectedOccasion === 'other' ? (customOccasion.trim() || 'other') : selectedOccasion;
        const createdName = newListName.trim();

        const newId = await createCategory(newListName.trim(), 'private', occasionValue, undefined, {
            showAddress,
            addressId: showAddress ? selectedAddressId || undefined : undefined,
            instructions: showAddress ? deliveryInstructions.trim() || undefined : undefined,
        });
        await addItem(product, 'medium', 1, newId);

        Alert.alert(LABELS.ADDED_TO_WISHLIST, `Successfully added to "${createdName}".`);
        setNewListName('');
        setCustomOccasion('');
        setSelectedOccasion(OCCASIONS[2].id);
        setShowAddress(false);
        setSelectedAddressId('');
        setDeliveryInstructions('');
        setIsCreating(false);
        handleCloseInternal();
    };


    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleCloseInternal}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <Pressable style={styles.backdrop} onPress={handleCloseInternal} />

                <Animated.View style={[
                    styles.content,
                    {
                        paddingBottom: Math.max(insets.bottom, 20),
                        transform: [{ translateY: slideAnim }],
                    }
                ]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTop}>
                            <Text style={styles.headerTitle}>
                                {isCreating ? LABELS.CREATE_NEW_WISHLIST : LABELS.ADD_TO_WISHLIST}
                            </Text>
                            <Pressable
                                onPress={() => isCreating ? setIsCreating(false) : handleCloseInternal()}
                                style={styles.closeBtn}
                            >
                                <X size={24} color="#374151" />
                            </Pressable>
                        </View>

                        {/* Product Preview */}
                        <View style={styles.productPreview}>
                            <Image
                                source={{ uri: safeImageUri(product?.primary_image || product?.image || (product?.images && product.images[0])) }}
                                style={styles.productThumbnail}
                                contentFit="cover"
                            />
                            <View style={styles.productInfo}>
                                <Text style={styles.productName} numberOfLines={1}>{product?.name}</Text>
                                <Text style={styles.productPrice}>₱{product?.price?.toLocaleString()}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Content Section */}
                    <ScrollView
                        style={styles.scrollArea}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {isCreating ? (
                            <View style={styles.creationForm}>
                                <Text style={styles.inputLabel}>{LABELS.WISHLIST_NAME}</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., Sarah's Wedding, New Home 2026"
                                    placeholderTextColor="#9CA3AF"
                                    value={newListName}
                                    onChangeText={setNewListName}
                                    maxLength={25}
                                    autoFocus
                                />

                                <Text style={styles.inputLabel}>{LABELS.GIFT_CATEGORY}</Text>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.occasionScroll}
                                    contentContainerStyle={styles.occasionContainer}
                                >
                                    {OCCASIONS.map((occ) => (
                                        <Pressable
                                            key={occ.id}
                                            style={[
                                                styles.occasionChip,
                                                selectedOccasion === occ.id && styles.occasionChipActive
                                            ]}
                                            onPress={() => setSelectedOccasion(occ.id)}
                                        >
                                            <Text style={[
                                                styles.occasionText,
                                                selectedOccasion === occ.id && styles.occasionTextActive
                                            ]}>{occ.label}</Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>

                                {selectedOccasion === 'other' && (
                                    <View style={{ marginTop: 12 }}>
                                        <Text style={styles.inputLabel}>{LABELS.SPECIFY_OCCASION}</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="e.g. Anniversary, Graduation"
                                            placeholderTextColor="#9CA3AF"
                                            value={customOccasion}
                                            onChangeText={setCustomOccasion}
                                        />
                                    </View>
                                )}

                                <View style={styles.deliverySection}>
                                    <Text style={styles.inputLabel}>{LABELS.DELIVERY_PREFERENCE}</Text>
                                    <Pressable
                                        style={styles.deliveryToggleRow}
                                        onPress={() => {
                                            if (!savedAddresses.length) return;
                                            setShowAddress((value) => {
                                                const next = !value;
                                                if (next && !selectedAddressId) {
                                                    setSelectedAddressId(defaultAddress?.id || savedAddresses[0].id);
                                                }
                                                return next;
                                            });
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
                                                handleCloseInternal();
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
                                            style={[styles.input, styles.deliveryInstructionsInput]}
                                            placeholder={LABELS.DELIVERY_INSTRUCTIONS}
                                            placeholderTextColor="#9CA3AF"
                                            value={deliveryInstructions}
                                            onChangeText={setDeliveryInstructions}
                                            editable={savedAddresses.length > 0}
                                        />
                                    )}
                                </View>

                                <View style={styles.formFooter}>
                                    <Pressable
                                        style={styles.cancelBtn}
                                        onPress={() => setIsCreating(false)}
                                    >
                                        <Text style={styles.cancelBtnText}>Cancel</Text>
                                    </Pressable>
                                    <Pressable
                                        style={[styles.confirmCreateBtn, !newListName.trim() && styles.disabledBtn]}
                                        onPress={handleCreateAndAdd}
                                        disabled={!newListName.trim()}
                                    >
                                        <Text style={styles.confirmCreateBtnText}>Create & Add</Text>
                                    </Pressable>
                                </View>
                            </View>
                        ) : (
                            <>
                                {categories.map((cat) => (
                                    <WishlistCard
                                        key={cat.id}
                                        wishlist={cat}
                                        items={items}
                                        onPress={() => handleSelectWishlist(cat.id)}
                                    />
                                ))}

                                <Pressable
                                    style={styles.createBtn}
                                    onPress={() => setIsCreating(true)}
                                >
                                    <PlusCircle size={20} color={COLORS.primary} />
                                    <Text style={styles.createBtnText}> CREATE NEW WISHLIST</Text>
                                </Pressable>
                            </>
                        )}
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    content: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        width: '100%',
        paddingTop: 20,
        marginTop: 'auto', // Pushes to bottom
    },
    header: {
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
    },
    productPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    productThumbnail: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: '#FFF',
    },
    productInfo: {
        marginLeft: 12,
        flex: 1,
    },
    productName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
    },
    productPrice: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.primary,
        marginTop: 2,
    },
    closeBtn: {
        padding: 4,
    },
    scrollArea: {
        paddingHorizontal: 20,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        // Shadow for premium feel
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    cardPressed: {
        backgroundColor: '#F9FAFB',
        transform: [{ scale: 0.98 }],
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    thumbnailContainer: {
        width: 52,
        height: 52,
        borderRadius: 10,
        overflow: 'hidden',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
        backgroundColor: '#F3F4F6',
    },
    thumbnailEmpty: {
        width: '100%',
        height: '100%',
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        borderRadius: 10,
    },
    infoContainer: {
        flex: 1,
        marginLeft: 16,
    },
    wishlistTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    wishlistSubline: {
        fontSize: 12,
        color: '#6B7280',
    },
    badge: {
        backgroundColor: '#FFF7ED',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#FFEDD5',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: COLORS.primary,
    },
    createBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 8,
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#D1D5DB',
        backgroundColor: '#F9FAFB',
    },
    createBtnText: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.primary,
    },
    creationForm: {
        paddingTop: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#4B5563',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1F2937',
        marginBottom: 20,
    },
    occasionScroll: {
        marginBottom: 8,
    },
    occasionContainer: {
        gap: 8,
        paddingBottom: 4,
    },
    occasionChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    occasionChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    occasionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4B5563',
    },
    occasionTextActive: {
        color: '#FFFFFF',
    },
    formFooter: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
        marginBottom: 8,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 30,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        alignItems: 'center',
    },
    cancelBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6B7280',
    },
    confirmCreateBtn: {
        flex: 2,
        paddingVertical: 16,
        borderRadius: 30,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
    },
    confirmCreateBtnText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    disabledBtn: {
        backgroundColor: '#D1D5DB',
    },
    deliverySection: {
        marginTop: 2,
        marginBottom: 8,
    },
    deliveryToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 2,
    },
    deliveryToggleText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1F2937',
    },
    deliveryHint: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 8,
        lineHeight: 18,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF',
    },
    checkboxActive: {
        borderColor: COLORS.primary,
        backgroundColor: '#FFF7ED',
    },
    checkboxDisabled: {
        opacity: 0.5,
    },
    checkboxDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.primary,
    },
    addressChipRow: {
        gap: 8,
        paddingVertical: 12,
    },
    addressChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginRight: 8,
    },
    addressChipActive: {
        backgroundColor: '#FFF7ED',
        borderColor: '#FDBA74',
    },
    addressChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4B5563',
    },
    addressChipTextActive: {
        color: COLORS.primary,
    },
    deliveryInstructionsInput: {
        marginTop: 0,
        marginBottom: 0,
    },
});
