import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Edit2, Gift, PlusCircle, Share, Star, Trash2, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share as ShareApi, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GuestLoginModal } from '../src/components/GuestLoginModal';
import { COLORS } from '../src/constants/theme';
import { useAuthStore } from '../src/stores/authStore';
import { useAddressStore } from '../src/stores/addressStore';
import { useWishlistStore, WishlistItem } from '../src/stores/wishlistStore';

const { width } = Dimensions.get('window');

const OCCASIONS = [
    { id: 'wedding', label: 'Wedding', icon: 'Gift' },
    { id: 'baby_shower', label: 'Baby Shower', icon: 'Baby' },
    { id: 'birthday', label: 'Birthday', icon: 'Cake' },
    { id: 'graduation', label: 'Graduation', icon: 'GraduationCap' },
    { id: 'housewarming', label: 'Housewarming', icon: 'Home' },
    { id: 'christmas', label: 'Christmas', icon: 'Tree' },
    { id: 'other', label: 'Other', icon: 'MoreHorizontal' },
];

const BRAND_COLOR = COLORS.primary;

type RegistryDeliveryPreference = {
    addressId?: string;
    showAddress: boolean;
    instructions?: string;
};

type CreateRegistryPayload = {
    name: string;
    privacy: 'private' | 'shared';
    occasion: string;
    delivery: RegistryDeliveryPreference;
};

// Delete Confirmation Modal
const DeleteConfirmationModal = ({ visible, onClose, onConfirm, itemName }: {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName: string;
}) => {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.deleteModalOverlay}>
                <View style={styles.deleteModalContent}>
                    <View style={styles.deleteIconContainer}>
                        <Trash2 size={32} color="#DC2626" />
                    </View>
                    <Text style={styles.deleteModalTitle}>Remove Item?</Text>
                    <Text style={styles.deleteModalMessage}>
                        Are you sure you want to remove "{itemName}" from your registry?
                    </Text>
                    <View style={styles.deleteModalActions}>
                        <Pressable style={[styles.deleteModalBtn, styles.deleteModalCancelBtn]} onPress={onClose}>
                            <Text style={styles.deleteModalCancelText}>Cancel</Text>
                        </Pressable>
                        <Pressable style={[styles.deleteModalBtn, styles.deleteModalConfirmBtn]} onPress={onConfirm}>
                            <Text style={styles.deleteModalConfirmText}>Remove</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// Wishlist List Item Card Component - Horizontal list view
const WishlistListItem = ({
    item,
    onProductPress,
    onDelete,
    onQuantityChange
}: {
    item: WishlistItem;
    onProductPress: () => void;
    onDelete: () => void;
    onQuantityChange: (itemId: string, newQty: number) => void;
}) => {
    const imageUri = item.image || item.images?.[0];
    const regularPrice = typeof item.price === 'number' ? item.price : parseFloat(String(item.price || 0));
    const pbPrice = item.originalPrice ?? item.original_price;
    const originalPrice = typeof pbPrice === 'number' ? pbPrice : parseFloat(String(pbPrice || 0));
    const hasDiscount = !!(originalPrice > 0 && regularPrice > 0 && originalPrice > regularPrice);
    const discountPercent = hasDiscount ? Math.round(((originalPrice - regularPrice) / originalPrice) * 100) : 0;
    const desiredQty = item.desiredQty || 1;

    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleDeleteConfirm = () => {
        setShowDeleteModal(false);
        onDelete();
    };

    const handleQtyIncrease = () => {
        onQuantityChange(item.id, desiredQty + 1);
    };

    const handleQtyDecrease = () => {
        if (desiredQty > 1) {
            onQuantityChange(item.id, desiredQty - 1);
        }
    };

    return (
        <View style={styles.listItemWrapper}>
            <Pressable
                onPress={onProductPress}
                onLongPress={() => setShowDeleteModal(true)}
                style={({ pressed }) => [
                    styles.listItemCard,
                    pressed && styles.listItemCardPressed,
                ]}
                android_ripple={{ color: '#FFE5D9' }}
            >
                {/* Left: Product Image */}
                <View style={styles.listItemImageContainer}>
                    <Image
                        source={{ uri: imageUri }}
                        style={styles.listItemImage}
                        contentFit="cover"
                        cachePolicy="disk"
                    />
                    {hasDiscount && (
                        <View style={styles.listItemDiscountBadge}>
                            <Text style={styles.listItemDiscountText}>{discountPercent}%</Text>
                        </View>
                    )}
                </View>

                {/* Middle: Product Details */}
                <View style={styles.listItemDetails}>
                    <Text style={styles.listItemProductName} numberOfLines={2}>
                        {item.name}
                    </Text>

                    <View style={styles.listItemTagsRow}>
                        {item.isFreeShipping && (
                            <View style={[styles.listItemTag, { backgroundColor: '#ECFDF5' }]}>
                                <Text style={[styles.listItemTagText, { color: '#059669' }]}>Free Shipping</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.listItemPriceRow}>
                        <Text style={[
                            styles.listItemPrice,
                            hasDiscount && { color: '#DC2626' }
                        ]}>
                            ₱{regularPrice.toLocaleString()}
                        </Text>
                        {hasDiscount && originalPrice > 0 && (
                            <Text style={styles.listItemOriginalPrice}>₱{originalPrice.toLocaleString()}</Text>
                        )}
                    </View>

                    <View style={styles.listItemFooter}>
                        <View style={styles.listItemRatingBox}>
                            <Star size={10} fill="#F59E0B" color="#F59E0B" />
                            <Text style={styles.listItemRatingText}>{item.rating || 5.0} ({item.review_count || 0})</Text>
                        </View>
                        <Text style={styles.listItemSoldText}>{(item.sold || item.sales_count || 0).toLocaleString()} sold</Text>
                    </View>
                </View>

                {/* Right: Desired Quantity with Up/Down Arrows */}
                <View style={styles.listItemQtyContainer}>
                    <Pressable
                        style={styles.listItemQtyBtn}
                        onPress={handleQtyIncrease}
                    >
                        <ChevronUp size={18} color={COLORS.primary} strokeWidth={2.5} />
                    </Pressable>
                    <Text style={styles.listItemQtyValue}>{desiredQty}</Text>
                    <Pressable
                        style={styles.listItemQtyBtn}
                        onPress={handleQtyDecrease}
                    >
                        <ChevronDown size={18} color={desiredQty > 1 ? COLORS.primary : '#D1D5DB'} strokeWidth={2.5} />
                    </Pressable>
                    <Pressable
                        style={styles.listItemDeleteBtn}
                        onPress={() => setShowDeleteModal(true)}
                    >
                        <Trash2 size={15} color="#DC2626" strokeWidth={2.2} />
                    </Pressable>
                </View>
            </Pressable>

            <DeleteConfirmationModal
                visible={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteConfirm}
                itemName={item.name || 'Item'}
            />
        </View>
    );
};

// Product Thumbnails Component - replaces static AvatarStack with actual product images
const ProductThumbnails = ({ items, totalCount }: { items: WishlistItem[]; totalCount: number }) => {
    // Get unique product images from items (max 3)
    const productImages = useMemo(() => {
        const images: string[] = [];
        for (const item of items) {
            const img = item.image || item.images?.[0];
            if (img && !images.includes(img)) {
                images.push(img);
                if (images.length >= 3) break;
            }
        }
        return images;
    }, [items]);

    const remaining = Math.max(0, totalCount - 3);

    if (totalCount === 0) {
        return null;
    }

    const renderImageCircle = (imageUrl: string | undefined, zIndex: number, marginLeft?: number) => {
        return (
            <View style={[styles.avatarCircleImage, marginLeft !== undefined && { marginLeft }, { zIndex }]}>
                {imageUrl ? (
                    <Image
                        source={{ uri: imageUrl }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        cachePolicy="disk"
                    />
                ) : (
                    <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
                        <Gift size={12} color="#9CA3AF" />
                    </View>
                )}
            </View>
        );
    };

    if (totalCount === 1) {
        return renderImageCircle(productImages[0], 1);
    }

    if (totalCount === 2) {
        return (
            <View style={styles.avatarStack}>
                {renderImageCircle(productImages[0], 2)}
                {renderImageCircle(productImages[1], 1, -8)}
            </View>
        );
    }

    // 3 or more items
    return (
        <View style={styles.avatarStack}>
            {renderImageCircle(productImages[0], 3)}
            {renderImageCircle(productImages[1], 2, -8)}
            {renderImageCircle(productImages[2], 1, -8)}
            {remaining > 0 && (
                <View style={[styles.avatarBadge, { marginLeft: -4 }]}>
                    <Text style={styles.avatarBadgeText}>+{remaining}</Text>
                </View>
            )}
        </View>
    );
};

// Create List Modal (Bottom Sheet Style)
const CreateListModal = ({
    visible,
    onClose,
    onCreate,
    userId,
}: {
    visible: boolean;
    onClose: () => void;
    onCreate: (payload: CreateRegistryPayload) => void;
    userId?: string | null;
}) => {
    const { savedAddresses, defaultAddress, loadSavedAddresses } = useAddressStore();
    const [name, setName] = useState('');
    const [selectedOccasion, setSelectedOccasion] = useState(OCCASIONS[2].id); // Default to Birthday
    const [customOccasion, setCustomOccasion] = useState('');
    const [showAddress, setShowAddress] = useState(false);
    const [selectedAddressId, setSelectedAddressId] = useState('');
    const [deliveryInstructions, setDeliveryInstructions] = useState('');
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const keyboardOffset = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible && userId) {
            loadSavedAddresses(userId);
        }

        if (visible) {
            setName('');
            setSelectedOccasion(OCCASIONS[2].id);
            setCustomOccasion('');
            setShowAddress(false);
            setSelectedAddressId(defaultAddress?.id || '');
            setDeliveryInstructions('');
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: false,
            }).start();
        } else {
            slideAnim.setValue(Dimensions.get('window').height);
        }
    }, [visible, userId, loadSavedAddresses, defaultAddress?.id]);

    useEffect(() => {
        if (visible && savedAddresses.length > 0 && !selectedAddressId) {
            setSelectedAddressId(defaultAddress?.id || savedAddresses[0].id);
        }
    }, [visible, showAddress, selectedAddressId, savedAddresses, defaultAddress?.id]);

    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                Animated.timing(keyboardOffset, {
                    toValue: e.endCoordinates.height,
                    duration: Platform.OS === 'ios' ? e.duration : 200,
                    useNativeDriver: false,
                }).start();
            }
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            (e) => {
                Animated.timing(keyboardOffset, {
                    toValue: 0,
                    duration: Platform.OS === 'ios' ? e.duration : 200,
                    useNativeDriver: false,
                }).start();
            }
        );
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    const handleCloseInternal = () => {
        Keyboard.dismiss();
        Animated.timing(slideAnim, {
            toValue: Dimensions.get('window').height,
            duration: 250,
            useNativeDriver: false,
        }).start(() => {
            onClose();
        });
    };

    const handleCreate = () => {
        if (!name.trim()) return;
        const occasionValue = selectedOccasion === 'other' ? (customOccasion.trim() || 'other') : selectedOccasion;
        onCreate({
            name,
            privacy: 'private',
            occasion: occasionValue,
            delivery: {
                showAddress,
                addressId: showAddress ? selectedAddressId || undefined : undefined,
                instructions: showAddress ? deliveryInstructions.trim() || undefined : undefined,
            },
        });
        setName('');
        setSelectedOccasion(OCCASIONS[2].id);
        setCustomOccasion('');
        setShowAddress(false);
        setSelectedAddressId('');
        setDeliveryInstructions('');
        handleCloseInternal();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleCloseInternal}
            statusBarTranslucent={true}
        >
            <View style={styles.bottomSheetOverlay}>
                <Pressable style={styles.backdrop} onPress={handleCloseInternal} />
                <Animated.View style={[
                    styles.bottomSheetContent,
                    {
                        paddingBottom: insets.bottom + 20,
                        transform: [{ translateY: slideAnim }],
                        marginBottom: keyboardOffset,
                    }
                ]}>
                    <View style={styles.bsHeader}>
                        <Text style={styles.bsTitle}>Create a new list</Text>
                        <Pressable onPress={handleCloseInternal} style={styles.closeBtn}>
                            <X size={24} color="#374151" />
                        </Pressable>
                    </View>

                    <Text style={styles.inputLabel}>Registry Name</Text>
                    <TextInput
                        style={styles.bsInput}
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g., Sarah's Wedding, Baby Doe 2026"
                        placeholderTextColor="#9CA3AF"
                        autoFocus
                    />

                    <Text style={styles.inputLabel}>Gift Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.occasionScroll} contentContainerStyle={styles.occasionContainer}>
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
                            <Text style={styles.inputLabel}>Specify Occasion</Text>
                            <TextInput
                                style={styles.bsInput}
                                value={customOccasion}
                                onChangeText={setCustomOccasion}
                                placeholder="e.g. Anniversary, Retirement"
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>
                    )}

                    <View style={styles.deliverySection}>
                        <Text style={styles.inputLabel}>Delivery Preference</Text>
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
                            <View style={[styles.checkbox, showAddress && styles.checkboxActive, !savedAddresses.length && styles.checkboxDisabled]}>
                                {showAddress && <View style={styles.checkboxDot} />}
                            </View>
                            <Text style={styles.deliveryToggleText}>Share address with gifters</Text>
                        </Pressable>
                        <Text style={styles.deliveryHint}>
                            {savedAddresses.length
                                ? 'Choose a saved address to make it visible on this registry.'
                                : 'Add a saved address first to enable address sharing.'}
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
                                style={[styles.bsInput, styles.deliveryInstructionsInput]}
                                value={deliveryInstructions}
                                onChangeText={setDeliveryInstructions}
                                placeholder="Delivery instructions (optional)"
                                placeholderTextColor="#9CA3AF"
                                editable={savedAddresses.length > 0}
                            />
                        )}
                    </View>

                    <Pressable onPress={handleCreate} style={[styles.createBtn, !name.trim() && styles.disabledBtn, { marginTop: selectedOccasion === 'other' ? 0 : 24 }]}>
                        <Text style={styles.createBtnText}>Create Private List</Text>
                    </Pressable>
                </Animated.View>
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
    const { user } = useAuthStore();
    const { savedAddresses, defaultAddress, loadSavedAddresses } = useAddressStore();
    const [name, setName] = useState(category?.name || '');
    const [showAddress, setShowAddress] = useState(false);
    const [selectedAddressId, setSelectedAddressId] = useState('');
    const [deliveryInstructions, setDeliveryInstructions] = useState('');
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const keyboardOffset = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (category) {
            setName(category.name);
            setShowAddress(category.delivery?.showAddress ?? false);
            setSelectedAddressId(category.delivery?.addressId || '');
            setDeliveryInstructions(category.delivery?.instructions || '');
        }
    }, [category]);

    useEffect(() => {
        if (visible) {
            if (user?.id) {
                loadSavedAddresses(user.id);
            }
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: false,
            }).start();
        } else {
            slideAnim.setValue(Dimensions.get('window').height);
        }
    }, [visible, user?.id, loadSavedAddresses]);

    useEffect(() => {
        if (visible && savedAddresses.length > 0 && !selectedAddressId) {
            setSelectedAddressId(defaultAddress?.id || savedAddresses[0].id);
        }
    }, [visible, savedAddresses, selectedAddressId, defaultAddress?.id]);

    // Keyboard handling
    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                Animated.timing(keyboardOffset, {
                    toValue: e.endCoordinates.height,
                    duration: Platform.OS === 'ios' ? e.duration : 200,
                    useNativeDriver: false,
                }).start();
            }
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            (e) => {
                Animated.timing(keyboardOffset, {
                    toValue: 0,
                    duration: Platform.OS === 'ios' ? e.duration : 200,
                    useNativeDriver: false,
                }).start();
            }
        );
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    const handleCloseInternal = () => {
        Keyboard.dismiss();
        Animated.timing(slideAnim, {
            toValue: Dimensions.get('window').height,
            duration: 250,
            useNativeDriver: false,
        }).start(() => {
            onClose();
        });
    };

    const handleSave = () => {
        if (!name.trim()) return;
        onSave(category.id, {
            name,
            privacy: 'private',
            delivery: {
                showAddress,
                addressId: showAddress ? selectedAddressId || undefined : undefined,
                instructions: showAddress ? deliveryInstructions.trim() || undefined : undefined,
            },
        });
        handleCloseInternal();
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
                        handleCloseInternal();
                    }
                }
            ]
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleCloseInternal}
            statusBarTranslucent={true}
        >
            <View style={styles.bottomSheetOverlay}>
                <Pressable style={styles.backdrop} onPress={handleCloseInternal} />
                <Animated.View style={[
                    styles.bottomSheetContent,
                    {
                        paddingBottom: insets.bottom + 20,
                        transform: [{ translateY: slideAnim }],
                        marginBottom: keyboardOffset,
                    }
                ]}>
                    <View style={styles.bsHeader}>
                        <Text style={styles.bsTitle}>Edit List</Text>
                        <Pressable onPress={handleCloseInternal} style={styles.closeBtn}>
                            <X size={24} color="#374151" />
                        </Pressable>
                    </View>

                    <Text style={styles.inputLabel}>List Name</Text>
                    <TextInput
                        style={styles.bsInput}
                        value={name}
                        onChangeText={setName}
                        placeholder="List Name"
                        autoFocus
                    />

                    <View style={styles.deliverySection}>
                        <Text style={styles.inputLabel}>Delivery Preference</Text>
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
                            <View style={[styles.checkbox, showAddress && styles.checkboxActive, !savedAddresses.length && styles.checkboxDisabled]}>
                                {showAddress && <View style={styles.checkboxDot} />}
                            </View>
                            <Text style={styles.deliveryToggleText}>Share address with gifters</Text>
                        </Pressable>
                        <Text style={styles.deliveryHint}>
                            {savedAddresses.length
                                ? 'Choose a saved address to make it visible on this registry.'
                                : 'Add a saved address first to enable address sharing.'}
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
                                style={[styles.bsInput, styles.deliveryInstructionsInput]}
                                value={deliveryInstructions}
                                onChangeText={setDeliveryInstructions}
                                placeholder="Delivery instructions (optional)"
                                placeholderTextColor="#9CA3AF"
                                editable={savedAddresses.length > 0}
                            />
                        )}
                    </View>

                    <View style={{ gap: 12, marginTop: 12 }}>
                        <View style={styles.editListButtonRow}>
                            <Pressable onPress={handleCloseInternal} style={[styles.editListBtn, styles.editListCancelBtn]}>
                                <Text style={styles.editListCancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable onPress={handleSave} style={[styles.editListBtn, styles.editListSaveBtn, !name.trim() && styles.disabledBtn]}>
                                <Text style={[styles.editListSaveText, !name.trim() && styles.disabledBtnText]}>Save Changes</Text>
                            </Pressable>
                        </View>

                        {category?.id !== 'default' && (
                            <Pressable onPress={handleDelete} style={styles.deleteListBtn}>
                                <Text style={styles.deleteListBtnText}>Delete List</Text>
                            </Pressable>
                        )}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

export default function RegistryScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();

    const { items, categories, createCategory, updateItem, removeItem, shareWishlist, updateCategory, deleteCategory, loadWishlist } = useWishlistStore();
    const { isGuest, user } = useAuthStore();

    // UI State
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [activeOccasion, setActiveOccasion] = useState('all');

    // Navigation State
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    useEffect(() => {
        if (isGuest) {
            setShowGuestModal(true);
        }
    }, [isGuest]);

    // Reload wishlist when screen is focused (picks up web changes)
    useEffect(() => {
        if (user?.id && !isGuest) {
            loadWishlist(user.id);
        }
    }, [user?.id]);

    const handleProductPress = useCallback((product: any) => {
        navigation.navigate('ProductDetail', { product });
    }, [navigation]);

    const handleShare = useCallback(async () => {
        try {
            // Share current category or default
            const catId = selectedCategoryId || 'default';
            const url = await shareWishlist(catId);
            await ShareApi.share({
                message: `Check out my registry on BazaarX! ${url}`,
                url: url
            });
        } catch (error) {
            Alert.alert('Error', 'Failed to share registry');
        }
    }, [selectedCategoryId, shareWishlist]);

    const currentCategoryName = useMemo(() =>
        categories.find(c => c.id === selectedCategoryId)?.name || 'My Registry & Gifting',
        [categories, selectedCategoryId]);

    const handleCreateList = useCallback((payload: CreateRegistryPayload) => {
        createCategory(payload.name, payload.privacy, payload.occasion, undefined, payload.delivery);
    }, [createCategory]);

    const BRAND_COLOR = COLORS.primary;

    // List of predefined occasion IDs for filtering
    const predefinedIds = useMemo(() => OCCASIONS.filter(o => o.id !== 'other').map(o => o.id), []);

    // Filter categories based on active occasion
    const filteredCategories = useMemo(() => categories.filter(c => {
        if (activeOccasion === 'all') return true;

        // If exact match
        if (c.occasion === activeOccasion) return true;

        // If 'other' tab, catch everything not predefined
        if (activeOccasion === 'other') {
            return !predefinedIds.includes(c.occasion || '') && c.id !== 'default';
        }

        return false;
    }), [categories, activeOccasion, predefinedIds]);

    const displayedCategories = useMemo(() => selectedCategoryId ? [] : filteredCategories, [selectedCategoryId, filteredCategories]);

    // Filter items based on selected category
    const displayedItems = useMemo(() => selectedCategoryId
        ? items.filter(item => item.categoryId === selectedCategoryId || (selectedCategoryId === 'default' && !item.categoryId))
        : items,
        [items, selectedCategoryId]);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']} // Soft Parchment Header
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.container}
            >
                <StatusBar barStyle="dark-content" />

                {/* Header */}
                <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
                    {/* My Registry & Gifting view - Single row with centered title */}
                    {!selectedCategoryId && (
                        <View style={styles.headerTop}>
                            <Pressable
                                onPress={() => {
                                    navigation.goBack();
                                }}
                                style={styles.headerIconButton}
                            >
                                <ChevronLeft size={24} color={COLORS.textHeadline} strokeWidth={2.5} />
                            </Pressable>

                            <Text style={[styles.headerTitle, { color: COLORS.textHeadline }]}>
                                My Registry & Gifting
                            </Text>

                            <Pressable
                                onPress={() => setShowCreateModal(true)}
                                style={styles.headerIconButton}
                            >
                                <PlusCircle size={24} color={COLORS.primary} strokeWidth={2.25} />
                            </Pressable>
                        </View>
                    )}

                    {/* Category View - Two rows: nav + title below */}
                    {selectedCategoryId && (
                        <>
                            <View style={styles.headerTop}>
                                <Pressable
                                    onPress={() => {
                                        setSelectedCategoryId(null); // Go back to categories
                                    }}
                                    style={styles.headerIconButton}
                                >
                                    <ChevronLeft size={24} color={COLORS.textHeadline} strokeWidth={2.5} />
                                </Pressable>

                                <View style={styles.headerActionsRight}>
                                    <Pressable
                                        style={styles.headerIconBtn}
                                        onPress={() => {
                                            // Edit the current category
                                            const currentCat = categories.find(c => c.id === selectedCategoryId);
                                            if (currentCat) {
                                                setEditingCategory(currentCat);
                                            }
                                        }}
                                    >
                                        <Edit2 size={20} color={COLORS.primary} strokeWidth={2} />
                                    </Pressable>
                                    <Pressable
                                        style={styles.headerIconBtn}
                                        onPress={handleShare}
                                    >
                                        <Share size={20} color={COLORS.primary} strokeWidth={2} />
                                    </Pressable>
                                    {selectedCategoryId !== 'default' && (
                                        <Pressable
                                            style={styles.headerIconBtn}
                                            onPress={() => {
                                                const currentCat = categories.find(c => c.id === selectedCategoryId);
                                                if (!currentCat) return;
                                                Alert.alert(
                                                    'Delete Folder',
                                                    `Delete "${currentCat.name}"? Items will be moved to your default folder.`,
                                                    [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        {
                                                            text: 'Delete',
                                                            style: 'destructive',
                                                            onPress: () => {
                                                                deleteCategory(currentCat.id);
                                                                setSelectedCategoryId(null);
                                                            },
                                                        },
                                                    ],
                                                );
                                            }}
                                        >
                                            <Trash2 size={20} color="#DC2626" strokeWidth={2} />
                                        </Pressable>
                                    )}
                                </View>
                            </View>

                            <View style={styles.headerTitleContainer}>
                                <Text style={[styles.headerSubtitle, { color: COLORS.textHeadline }]}>
                                    {currentCategoryName}
                                </Text>
                            </View>
                        </>
                    )}
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>



                    {/* --- CATEGORIES VIEW (1 COLUMN VERTICAL) --- */}
                    {!selectedCategoryId && (
                        <View>
                            {/* Occasion Tabs */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.tabScroll}
                                contentContainerStyle={styles.tabContainer}
                            >
                                <Pressable
                                    style={[styles.tab, activeOccasion === 'all' && styles.tabActive]}
                                    onPress={() => setActiveOccasion('all')}
                                >
                                    <Text style={[styles.tabText, activeOccasion === 'all' && styles.tabTextActive]}>All</Text>
                                </Pressable>
                                {OCCASIONS.map(occ => (
                                    <Pressable
                                        key={occ.id}
                                        style={[styles.tab, activeOccasion === occ.id && styles.tabActive]}
                                        onPress={() => setActiveOccasion(occ.id)}
                                    >
                                        <Text style={[styles.tabText, activeOccasion === occ.id && styles.tabTextActive]}>{occ.label}</Text>
                                    </Pressable>
                                ))}
                            </ScrollView>

                            <Pressable style={styles.createFolderButton} onPress={() => setShowCreateModal(true)}>
                                <PlusCircle size={18} color={COLORS.primary} />
                                <Text style={styles.createFolderText}>Create Folder</Text>
                            </Pressable>

                            <View style={styles.categoriesList}>
                                {displayedCategories.length === 0 ? (
                                    <View style={styles.emptyContainer}>
                                        <View style={[styles.emptyIconCircle, { backgroundColor: '#F3F4F6' }]}>
                                                <Gift size={48} color={BRAND_COLOR} strokeWidth={1.5} />
                                        </View>
                                        <Text style={styles.emptyTitle}>Your Registry and Gifting is Empty</Text>
                                        <Text style={styles.emptySubtitle}>Start building your Registry collections!</Text>
                                        <TouchableOpacity
                                            style={[styles.shopNowButton, { backgroundColor: BRAND_COLOR }]}
                                            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
                                        >
                                            <Text style={styles.shopNowText}>Continue Shopping</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.groupedCardContainer}>
                                        {displayedCategories.map((cat, index) => {
                                            console.log('Category data:', cat);
                                            const categoryItems = items.filter(i => i.categoryId === cat.id || (cat.id === 'default' && !i.categoryId));
                                            const itemCount = categoryItems.length;
                                            const isLastItem = index === displayedCategories.length - 1;

                                            return (
                                                <Pressable
                                                    key={cat.id}
                                                    style={[styles.groupedCardItem, isLastItem && styles.groupedCardItemLast]}
                                                    onPress={() => setSelectedCategoryId(cat.id)}
                                                >
                                                    {/* Icon */}
                                                    <Gift size={28} color={BRAND_COLOR} strokeWidth={2} />

                                                    {/* Info */}
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.groupedCardTitle}>{cat.name}</Text>
                                                        <View style={styles.groupedCardRatingRow}>
                                                            {cat.occasion && (
                                                                <Text style={styles.groupedCardDetail}>{cat.occasion.replace('_', ' ')}</Text>
                                                            )}
                                                            <ProductThumbnails items={categoryItems} totalCount={itemCount} />
                                                        </View>
                                                    </View>

                                                    {/* Arrow Only */}
                                                    <ChevronRight size={20} color={COLORS.textMuted} strokeWidth={2.5} />
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    {/* --- ITEMS VIEW --- */}
                    {selectedCategoryId && (
                        <View>
                            {displayedItems.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <View style={[styles.emptyIconCircle, { backgroundColor: '#F3F4F6' }]}>
                                        <Gift size={48} color="#D1D5DB" fill="#D1D5DB" />
                                    </View>
                                    <Text style={styles.emptyTitle}>Ready to add items?</Text>
                                    <Text style={styles.emptyText}>Start building your collection here!</Text>
                                    <Pressable style={styles.shopNowButton} onPress={() => navigation.navigate('MainTabs', { screen: 'Shop' })}>
                                        <Text style={styles.shopNowText}>Start Shopping</Text>
                                    </Pressable>
                                    <Pressable style={styles.createEmptyStateButton} onPress={() => setShowCreateModal(true)}>
                                        <PlusCircle size={18} color={COLORS.primary} />
                                        <Text style={styles.createEmptyStateText}>Create Folder</Text>
                                    </Pressable>
                                </View>
                            ) : (
                                <View style={styles.itemsListContainer}>
                                    {displayedItems.map((item) => (
                                        <WishlistListItem
                                            key={item.id}
                                            item={item}
                                            onProductPress={() => handleProductPress(item)}
                                            onDelete={() => {
                                                const target = items.find(i => i.id === item.id || i.registryItemId === item.id);
                                                const rid = target?.registryItemId || item.id;
                                                removeItem(rid);
                                            }}
                                            onQuantityChange={(itemId, newQty) => {
                                                const target = items.find(i => i.id === itemId || i.registryItemId === itemId);
                                                const rid = target?.registryItemId || itemId;
                                                updateItem(rid, { desiredQty: newQty });
                                            }}
                                        />
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
                    userId={user?.id}
                />

                <ItemEditModal
                    visible={!!editingItem}
                    item={editingItem}
                    onClose={() => setEditingItem(null)}
                    onSave={(itemId: string, updates: any, shouldDelete: boolean) => {
                        // itemId here is registryItemId from the editing item
                        const target = items.find(i => i.id === itemId || i.registryItemId === itemId);
                        const rid = target?.registryItemId || itemId;
                        if (shouldDelete) {
                            removeItem(rid);
                        } else {
                            updateItem(rid, updates);
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


            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    // Use BRAND_COLOR from a static source or define a local fallback since styles are outside the component
    container: { flex: 1, backgroundColor: COLORS.background },
    headerContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 0,
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
        color: COLORS.textHeadline,
        flex: 1,
        textAlign: 'center',
    },
    headerTitleContainer: {
        paddingHorizontal: 4,
        paddingTop: 8,
        paddingBottom: 8,
    },
    headerSubtitle: {
        fontSize: 26,
        fontWeight: '800',
        color: COLORS.textHeadline,
        letterSpacing: -0.5,
    },
    headerActionsRight: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    headerIconBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22,
    },
    scrollContent: { padding: 16, paddingTop: 24, paddingBottom: 40, minHeight: '100%' },

    // Categories List (Card Style)
    categoriesList: { gap: 12, paddingBottom: 20 },

    // Grouped Card Layout
    groupedCardContainer: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    groupedCardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    groupedCardItemLast: {
        borderBottomWidth: 0,
    },
    groupedCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textHeadline,
        marginBottom: 4,
    },
    groupedCardRatingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    groupedCardDetail: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    avatarStack: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 28,
    },
    avatarCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    avatarInitial: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFF',
    },
    avatarBadge: {
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 8,
        backgroundColor: '#FEB92E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#FFF',
    },
    avatarCircleImage: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#FFF',
        overflow: 'hidden',
        backgroundColor: '#FFF',
        zIndex: 1,
    },
    itemCountText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textMuted,
        marginLeft: 4,
    },

    cardContainer: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 18,
        marginBottom: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6, paddingVertical: 2,
        backgroundColor: '#F3F4F6', borderRadius: 4,
    },
    privacyTagText: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted },
    itemCountDetail: { fontSize: 12, color: COLORS.textMuted },

    viewListBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    viewListText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.primary,
    },

    // Empty State (Corrected name to match usage)
    emptyContainer: { width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    emptyIconCircle: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10
    },
    createEmptyStateButton: {
        marginTop: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 999,
        backgroundColor: '#FFF7ED',
        borderWidth: 1,
        borderColor: '#FDBA74',
    },
    createEmptyStateText: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.primary,
    },
    emptySubtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginHorizontal: 40, lineHeight: 22 },
    emptyState: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
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
        marginTop: 4,
    },
    // Items List Container
    itemsListContainer: { paddingBottom: 20 },
    listItemCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        gap: 12,
        minHeight: 124,
    },
    listItemCardPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    listItemImageContainer: {
        width: 100,
        height: 100,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#F3F4F6',
        position: 'relative',
    },
    listItemImage: {
        width: '100%',
        height: '100%',
    },
    listItemDiscountBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: '#DC2626',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 4,
    },
    listItemDiscountText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
    },
    listItemDetails: {
        flex: 1,
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    listItemProductName: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textHeadline,
        lineHeight: 18,
        height: 36,
    },
    listItemTagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 4,
    },
    listItemTag: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    listItemTagText: {
        fontSize: 10,
        fontWeight: '600',
    },
    listItemPriceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
        marginTop: 4,
    },
    listItemPrice: {
        fontSize: 18,
        fontWeight: '700',
        color: '#D97706',
    },
    listItemOriginalPrice: {
        fontSize: 12,
        color: '#A8A29E',
        textDecorationLine: 'line-through',
    },
    listItemFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    listItemRatingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    listItemRatingText: {
        fontSize: 11,
        color: '#6B7280',
    },
    listItemSoldText: {
        fontSize: 11,
        color: '#6B7280',
    },
    // List item wrapper
    listItemWrapper: {
        marginBottom: 12,
    },
    // Quantity container (vertical layout with up/down arrows)
    listItemQtyContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 12,
        paddingRight: 8,
        borderLeftWidth: 1,
        borderLeftColor: '#F3F4F6',
        gap: 4,
    },
    listItemQtyBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FFF9F5',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    listItemDeleteBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FECACA',
        marginTop: 4,
    },
    listItemQtyLabel: {
        fontSize: 10,
        color: '#9CA3AF',
        fontWeight: '500',
        marginBottom: 2,
    },
    listItemQtyValue: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textHeadline,
        minWidth: 28,
        textAlign: 'center',
    },

    // Delete Confirmation Modal Styles
    deleteModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteModalContent: {
        backgroundColor: '#FFFFFF',
        width: '85%',
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
    },
    deleteIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    deleteModalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.textHeadline,
        marginBottom: 8,
    },
    deleteModalMessage: {
        fontSize: 14,
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    deleteModalActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    deleteModalBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    deleteModalCancelBtn: {
        backgroundColor: '#F3F4F6',
    },
    deleteModalCancelText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    deleteModalConfirmBtn: {
        backgroundColor: '#DC2626',
    },
    deleteModalConfirmText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // Items Grid (Old - kept for potential future use)
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
    emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textHeadline, marginBottom: 8 },
    emptyText: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', marginBottom: 32 },
    shopNowButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E58C1A', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, elevation: 4 },
    shopNowText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: '#FFF', width: '85%', padding: 20, borderRadius: 16, elevation: 5 },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
    inputLabel: { fontSize: 14, color: COLORS.textMuted, marginBottom: 8, fontWeight: '600' },
    modalInput: { borderBottomWidth: 1, borderColor: '#E5E7EB', paddingVertical: 8, marginBottom: 20, fontSize: 16 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 10 },
    modalBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
    primaryBtn: { backgroundColor: '#E58C1A' },
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
    deliverySection: {
        marginTop: 4,
        marginBottom: 8,
    },
    deliveryToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 10,
    },
    deliveryToggleText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textHeadline,
    },
    deliveryHint: {
        fontSize: 12,
        color: COLORS.textMuted,
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
    bsSwitchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    createBtn: {
        backgroundColor: '#E58C1A',
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
    createFolderButton: {
        alignSelf: 'flex-start',
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: '#FFF7ED',
        borderWidth: 1,
        borderColor: '#FDBA74',
    },
    createFolderText: {
        fontSize: 13,
        fontWeight: '800',
        color: COLORS.primary,
    },

    // Edit List Modal Button Styles (matching Delete Confirmation Modal)
    editListButtonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    editListBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    editListCancelBtn: {
        backgroundColor: '#F3F4F6',
    },
    editListCancelText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    editListSaveBtn: {
        backgroundColor: COLORS.primary,
    },
    editListSaveText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    deleteListBtn: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#FEE2E2',
    },
    deleteListBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#DC2626',
    },
    disabledBtnText: {
        color: '#9CA3AF',
    },

    // Occasion Selection in Modal
    occasionScroll: { marginTop: 4 },
    occasionContainer: { gap: 8, paddingRight: 24, paddingVertical: 4 },
    occasionChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    occasionChipActive: {
        backgroundColor: '#E58C1A',
        borderColor: '#E58C1A',
    },
    occasionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4B5563',
    },
    occasionTextActive: {
        color: '#FFFFFF',
    },

    // Occasion Tabs in main view
    tabScroll: { marginTop: 0, marginBottom: 16 },
    tabContainer: { gap: 8, paddingBottom: 4 },
    tab: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    tabActive: {
        backgroundColor: '#E58C1A',
        borderColor: '#E58C1A',
    },
    tabText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },
    tabTextActive: {
        color: '#FFFFFF',
    },

    // Item Edit Specific
    priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    priorityOption: { flex: 1, padding: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, alignItems: 'center' },
    selectedPriority: { backgroundColor: '#E58C1A', borderColor: '#E58C1A' },
    priorityOptionText: { fontSize: 12, color: COLORS.textHeadline },
    qtyContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
    qtyBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
    qtyInput: { width: 60, textAlign: 'center', fontSize: 16, fontWeight: '700', borderBottomWidth: 1, borderColor: '#E5E7EB' },
});
