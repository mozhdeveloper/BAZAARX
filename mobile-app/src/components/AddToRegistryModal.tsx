import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Modal,
    TextInput,
    Dimensions,
    Animated,
    Keyboard,
    Platform,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { X, Gift, PlusCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { useAddressStore } from '../stores/addressStore';
import { useAuthStore } from '../stores/authStore';
import { useWishlistStore } from '../stores/wishlistStore';

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

interface AddToRegistryModalProps {
    visible: boolean;
    onClose: () => void;
    product: any;
}

export const AddToRegistryModal = ({ visible, onClose, product }: AddToRegistryModalProps) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { categories, items, addItem, createCategory } = useWishlistStore();
    const { user } = useAuthStore();
    const { savedAddresses, defaultAddress, loadSavedAddresses } = useAddressStore();

    const [isCreatingList, setIsCreatingList] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [selectedOccasion, setSelectedOccasion] = useState(OCCASIONS[2].id);
    const [customOccasion, setCustomOccasion] = useState('');
    const [showAddress, setShowAddress] = useState(false);
    const [selectedAddressId, setSelectedAddressId] = useState('');
    const [deliveryInstructions, setDeliveryInstructions] = useState('');

    const slideAnim = useRef(new Animated.Value(height)).current;
    const keyboardOffset = useRef(new Animated.Value(0)).current;

    // Slide animation
    useEffect(() => {
        if (visible) {
            if (user?.id) {
                loadSavedAddresses(user.id);
            }

            if (categories.length === 0) {
                setIsCreatingList(true);
            } else {
                setIsCreatingList(false);
            }

            setShowAddress(false);
            setSelectedAddressId(defaultAddress?.id || '');
            setDeliveryInstructions('');
            setDeliveryInstructions('');

            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: false,
            }).start();
        } else {
            slideAnim.setValue(height);
        }
    }, [visible, categories.length, user?.id, loadSavedAddresses, defaultAddress?.id]);

    useEffect(() => {
        if (visible && savedAddresses.length > 0 && !selectedAddressId) {
            setSelectedAddressId(defaultAddress?.id || savedAddresses[0].id);
        }
    }, [visible, selectedAddressId, savedAddresses, defaultAddress?.id]);

    // Keyboard listener — the reliable cross-platform way inside a Modal
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
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const handleCloseInternal = () => {
        Keyboard.dismiss();
        Animated.timing(slideAnim, {
            toValue: height,
            duration: 250,
            useNativeDriver: false,
        }).start(() => {
            onClose();
        });
    };

    const handleAddToCategory = (categoryId: string) => {
        const normalizedProductId = String(product.id);
        const alreadyInFolder = items.some(
            (item) => String(item.id) === normalizedProductId && item.categoryId === categoryId,
        );
        if (alreadyInFolder) {
            Alert.alert('Already Added', 'This product is already in that registry folder.');
            return;
        }

        const folderName = categories.find((cat) => cat.id === categoryId)?.name || 'Registry';
        addItem(product, 'medium', 1, categoryId);
        Alert.alert('Added to Registry', `Successfully added to "${folderName}".`);
        handleCloseInternal();
    };

    const handleCreateAndAdd = async () => {
        if (!newListName.trim()) return;
        const occasionValue = selectedOccasion === 'other' ? (customOccasion.trim() || 'other') : selectedOccasion;
        const createdName = newListName.trim();
        const newId = await createCategory(newListName, 'private', occasionValue, undefined, {
            showAddress,
            addressId: showAddress ? selectedAddressId || undefined : undefined,
            instructions: showAddress ? deliveryInstructions.trim() || undefined : undefined,
        });
        await addItem(product, 'medium', 1, newId);
        Alert.alert('Added to Registry', `Successfully added to "${createdName}".`);
        setNewListName('');
        setCustomOccasion('');
        setSelectedOccasion(OCCASIONS[2].id);
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
            <View style={styles.overlay}>
                <Pressable style={styles.backdrop} onPress={handleCloseInternal} />
                <Animated.View style={[
                    styles.content,
                    {
                        paddingBottom: Math.max(insets.bottom, 20),
                        transform: [{ translateY: slideAnim }],
                        marginBottom: keyboardOffset,
                    }
                ]}>
                    {/* Bottom Background Filler */}
                    <View style={{
                        position: 'absolute',
                        bottom: -100,
                        left: 0,
                        right: 0,
                        height: 100,
                        backgroundColor: COLORS.background,
                    }} />

                    <View style={styles.header}>
                        <Text style={styles.title}>
                            {isCreatingList ? 'Create New Registry' : 'Save to Registry'}
                        </Text>
                        <Pressable onPress={handleCloseInternal} style={styles.closeBtn}>
                            <X size={24} color="#374151" />
                        </Pressable>
                    </View>

                    {isCreatingList ? (
                        <ScrollView
                            style={styles.creationScroll}
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={styles.creationForm}>
                                <Text style={styles.inputLabel}>Registry Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., Sarah's Wedding, New Home 2026"
                                    placeholderTextColor="#9CA3AF"
                                    value={newListName}
                                    onChangeText={setNewListName}
                                    maxLength={50}
                                    autoFocus
                                />



                                <Text style={styles.inputLabel}>Gift Category</Text>
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
                                        <Text style={styles.inputLabel}>Specify Occasion</Text>
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
                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={[styles.checkbox, showAddress && styles.checkboxActive, !savedAddresses.length && styles.checkboxDisabled]}>
                                                {showAddress && <View style={styles.checkboxDot} />}
                                            </View>
                                            <Text style={styles.deliveryToggleText}>Share address with gifters</Text>
                                        </View>
                                        <Pressable 
                                            onPress={() => {
                                                onClose();
                                                navigation.navigate('Addresses');
                                            }}
                                        >
                                            <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>Manage</Text>
                                        </Pressable>
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
                                            style={[styles.input, styles.deliveryInstructionsInput]}
                                            placeholder="Delivery instructions (optional)"
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
                                        onPress={() => {
                                            if (categories.length === 0) {
                                                handleCloseInternal();
                                            } else {
                                                setIsCreatingList(false);
                                            }
                                        }}
                                    >
                                        <Text style={styles.cancelBtnText}>Cancel</Text>
                                    </Pressable>
                                    <Pressable
                                        style={[styles.createBtn, !newListName.trim() && styles.disabledBtn]}
                                        onPress={handleCreateAndAdd}
                                        disabled={!newListName.trim()}
                                    >
                                        <Text style={styles.createBtnText}>Create & Add</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </ScrollView>
                    ) : (
                        <View style={styles.listContainer}>
                            <ScrollView style={{ maxHeight: height * 0.4 }}>
                                {categories.map((cat) => (
                                    <Pressable
                                        key={cat.id}
                                        style={styles.listItem}
                                        onPress={() => handleAddToCategory(cat.id)}
                                    >
                                        <View style={styles.listIconContainer}>
                                            <Gift size={20} color={COLORS.primary} />
                                        </View>
                                        <View style={styles.listInfo}>
                                            <Text style={styles.listName}>{cat.name}</Text>
                                            <Text style={styles.listOccasion}>
                                                {cat.occasion ? getOccasionLabel(cat.occasion) : 'General'} List
                                            </Text>
                                        </View>
                                    </Pressable>
                                ))}
                            </ScrollView>

                            <Pressable
                                style={styles.createNewBtn}
                                onPress={() => setIsCreatingList(true)}
                            >
                                <PlusCircle size={20} color={COLORS.primary} />
                                <Text style={styles.createNewText}>Create New Registry</Text>
                            </Pressable>
                        </View>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    content: {
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        paddingTop: 24,
        paddingHorizontal: 24,
        maxHeight: '90%',
        width: '100%',
    },
    creationScroll: {
        maxHeight: height * 0.6,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1F2937',
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    creationForm: {},
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
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        alignItems: 'center',
    },
    cancelBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6B7280',
    },
    createBtn: {
        flex: 2,
        paddingVertical: 16,
        borderRadius: 30,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
    },
    disabledBtn: {
        backgroundColor: '#D1D5DB',
    },
    createBtnText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    listContainer: {},
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    listIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FFF7ED',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    listInfo: {
        flex: 1,
    },
    listName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    listOccasion: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    createNewBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginVertical: 20,
        paddingVertical: 12,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderRadius: 16,
        justifyContent: 'center',
        backgroundColor: '#FFF7ED',
    },
    createNewText: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.primary,
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
