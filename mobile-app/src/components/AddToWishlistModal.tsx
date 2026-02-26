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
} from 'react-native';
import { X, FolderHeart, PlusCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { useWishlistStore } from '../stores/wishlistStore';

const { height } = Dimensions.get('window');

const OCCASIONS = [
    { id: 'wedding', label: 'Wedding' },
    { id: 'baby_shower', label: 'Baby Shower' },
    { id: 'birthday', label: 'Birthday' },
    { id: 'graduation', label: 'Graduation' },
    { id: 'housewarming', label: 'Housewarming' },
    { id: 'christmas', label: 'Christmas' },
    { id: 'other', label: 'Other' },
];

interface AddToWishlistModalProps {
    visible: boolean;
    onClose: () => void;
    product: any;
}

export const AddToWishlistModal = ({ visible, onClose, product }: AddToWishlistModalProps) => {
    const insets = useSafeAreaInsets();
    const { categories, addItem, createCategory } = useWishlistStore();

    const [isCreatingList, setIsCreatingList] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [selectedOccasion, setSelectedOccasion] = useState(OCCASIONS[2].id);
    const [customOccasion, setCustomOccasion] = useState('');

    const slideAnim = useRef(new Animated.Value(height)).current;
    const keyboardOffset = useRef(new Animated.Value(0)).current;

    // Slide animation
    useEffect(() => {
        if (visible) {
            if (categories.length === 0) {
                setIsCreatingList(true);
            } else {
                setIsCreatingList(false);
            }
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: false,
            }).start();
        } else {
            slideAnim.setValue(height);
        }
    }, [visible, categories.length]);

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
        addItem(product, 'medium', 1, categoryId);
        handleCloseInternal();
    };

    const handleCreateAndAdd = () => {
        if (!newListName.trim()) return;
        const occasionValue = selectedOccasion === 'other' ? (customOccasion.trim() || 'other') : selectedOccasion;
        const newId = createCategory(newListName, 'private', occasionValue);
        addItem(product, 'medium', 1, newId);
        setNewListName('');
        setCustomOccasion('');
        setSelectedOccasion(OCCASIONS[2].id);
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
                            {isCreatingList ? 'Create New Wishlist' : 'Save to Wishlist'}
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
                                <Text style={styles.inputLabel}>Wishlist Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., Sarah's Wedding, New Home 2026"
                                    placeholderTextColor="#9CA3AF"
                                    value={newListName}
                                    onChangeText={setNewListName}
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
                                            <FolderHeart size={20} color={COLORS.primary} />
                                        </View>
                                        <View style={styles.listInfo}>
                                            <Text style={styles.listName}>{cat.name}</Text>
                                            <Text style={styles.listOccasion}>
                                                {cat.occasion || 'General'} List
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
                                <Text style={styles.createNewText}>Create New Wishlist</Text>
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
});
