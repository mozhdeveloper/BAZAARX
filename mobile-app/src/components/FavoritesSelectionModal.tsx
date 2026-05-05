import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Pressable,
    Modal,
    Dimensions,
    Animated,
    TextInput,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { X, Plus, Heart, Folder, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFavorites } from '../hooks/useFavorites';
import { safeImageUri, PLACEHOLDER_PRODUCT } from '../utils/imageUtils';
import { COLORS } from '../constants/theme';
import { AddedToCartModal } from './AddedToCartModal';

const { height, width } = Dimensions.get('window');

interface FavoritesSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    product: any;
}

export const FavoritesSelectionModal = ({ visible, onClose, product }: FavoritesSelectionModalProps) => {
    const insets = useSafeAreaInsets();
    const { folders, loading, createCollection, addToFavorites } = useFavorites();
    const slideAnim = useRef(new Animated.Value(height)).current;
    
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [successModal, setSuccessModal] = useState<{ visible: boolean; message: string } | null>(null);

    const showSuccess = (message: string) => {
        setSuccessModal({ visible: true, message });
    };

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }).start();
        } else {
            slideAnim.setValue(height);
            setIsCreating(false);
            setNewFolderName('');
        }
    }, [visible]);

    const handleClose = () => {
        Animated.timing(slideAnim, {
            toValue: height,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    const handleSelectFolder = async (folderId: string) => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            await addToFavorites(product.id, folderId);
            showSuccess('Saved to favorites!');
            setTimeout(handleClose, 1000); 
        } catch (error) {
            Alert.alert('Error', 'Failed to save product');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateCollectionOnly = async () => {
        if (!newFolderName.trim() || isSaving) return;
        setIsSaving(true);
        try {
            const newFolder = await createCollection(newFolderName);
            if (newFolder) {
                showSuccess(`Collection "${newFolderName}" created!`);
                setNewFolderName('');
                setIsCreating(false); // Switch back to list view
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to create collection');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <Pressable style={styles.dismissArea} onPress={handleClose} />
                
                <Animated.View 
                    style={[styles.content, { transform: [{ translateY: slideAnim }], paddingBottom: Math.max(insets.bottom, 20) }]}
                >
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.keyboardAvoidingView}
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerTop}>
                                <Text style={styles.title}>
                                    {isCreating ? 'Create Collection' : 'Save to Favorites'}
                                </Text>
                                <Pressable onPress={handleClose} style={styles.closeBtn}>
                                    <X size={20} color="#374151" />
                                </Pressable>
                            </View>

                            {/* Product Preview */}
                            <View style={styles.productPreview}>
                                <Image
                                    source={{ uri: safeImageUri(product?.primary_image || product?.image || product?.images?.[0], PLACEHOLDER_PRODUCT) }}
                                    style={styles.previewImage}
                                    contentFit="cover"
                                />
                                <View style={styles.previewInfo}>
                                    <Text style={styles.previewName} numberOfLines={1}>{product?.name}</Text>
                                    <Text style={styles.previewPrice}>
                                        ₱{product?.price?.toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <ScrollView 
                            style={styles.scrollArea} 
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {isCreating ? (
                                <View style={styles.createForm}>
                                    <Text style={styles.inputLabel}>Collection Name</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g., Summer Outfits, Home Decor"
                                        value={newFolderName}
                                        onChangeText={setNewFolderName}
                                        autoFocus
                                        maxLength={30}
                                    />
                                    <View style={styles.formButtons}>
                                        <Pressable 
                                            onPress={() => setIsCreating(false)}
                                            style={styles.cancelBtn}
                                        >
                                            <Text style={styles.cancelBtnText}>Cancel</Text>
                                        </Pressable>
                                        <Pressable 
                                            onPress={handleCreateCollectionOnly}
                                            disabled={!newFolderName.trim() || isSaving}
                                            style={[styles.confirmBtn, (!newFolderName.trim() || isSaving) && styles.disabledBtn]}
                                        >
                                            {isSaving ? (
                                                <ActivityIndicator color="white" />
                                            ) : (
                                                <Text style={styles.confirmBtnText}>Create Collection</Text>
                                            )}
                                        </Pressable>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.listContainer}>
                                    <Text style={styles.sectionTitle}>Your Collections</Text>
                                    
                                    {folders.map((folder) => (
                                        <Pressable
                                            key={folder.id}
                                            onPress={() => handleSelectFolder(folder.id)}
                                            disabled={isSaving}
                                            style={[styles.folderRow, isSaving && { opacity: 0.5 }]}
                                        >
                                            <View style={[styles.folderIcon, folder.is_default ? styles.defaultFolderIcon : styles.customFolderIcon]}>
                                                {folder.is_default ? (
                                                    <Heart size={22} color={COLORS.primary} fill={COLORS.primary} />
                                                ) : (
                                                    <Folder size={22} color="#6B7280" />
                                                )}
                                            </View>
                                            <View style={styles.folderInfo}>
                                                <Text style={styles.folderName}>{folder.name}</Text>
                                                <Text style={styles.itemCount}>{folder.item_count} items</Text>
                                            </View>
                                            <Check size={20} color="#D1D5DB" />
                                        </Pressable>
                                    ))}

                                    <Pressable 
                                        onPress={() => setIsCreating(true)}
                                        style={styles.newCollectionBtn}
                                    >
                                        <View style={styles.plusIconContainer}>
                                            <Plus size={22} color={COLORS.primary} />
                                        </View>
                                        <Text style={styles.newCollectionText}>Create New Collection</Text>
                                    </Pressable>
                                </View>
                            )}
                        </ScrollView>
                    </KeyboardAvoidingView>

                    {/* Saving Overlay */}
                    {isSaving && !isCreating && (
                        <View style={styles.savingOverlay}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text style={styles.savingText}>Saving to Favorites...</Text>
                        </View>
                    )}
                </Animated.View>

                {/* Unified Success Modal */}
                <AddedToCartModal
                    visible={!!successModal?.visible}
                    onClose={() => setSuccessModal(null)}
                    productName={product?.name || 'Product'}
                    productImage={safeImageUri(product?.primary_image || product?.image || product?.images?.[0], PLACEHOLDER_PRODUCT)}
                    message={successModal?.message}
                />
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    dismissArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    content: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        width: '100%',
        maxHeight: height * 0.85,
        marginTop: 'auto',
        overflow: 'hidden',
    },
    keyboardAvoidingView: {
        flexShrink: 1,
    },
    header: {
        padding: 24,
        paddingBottom: 8,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    closeBtn: {
        padding: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 999,
    },
    productPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    previewImage: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: 'white',
    },
    previewInfo: {
        marginLeft: 16,
        flex: 1,
    },
    previewName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    previewPrice: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: 'bold',
        marginTop: 4,
    },
    scrollArea: {
        flexShrink: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 24,
    },
    createForm: {
        marginTop: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4B5563',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        color: '#111827',
    },
    formButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
        marginBottom: 32,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
    },
    cancelBtnText: {
        fontWeight: '600',
        color: '#6B7280',
    },
    confirmBtn: {
        flex: 2,
        paddingVertical: 16,
        borderRadius: 999,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
    },
    confirmBtnText: {
        fontWeight: 'bold',
        color: 'white',
    },
    disabledBtn: {
        backgroundColor: '#D1D5DB',
    },
    listContainer: {
        paddingBottom: 8,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 16,
    },
    folderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
    },
    folderIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    defaultFolderIcon: {
        backgroundColor: '#FFF7ED',
    },
    customFolderIcon: {
        backgroundColor: '#F3F4F6',
    },
    folderInfo: {
        marginLeft: 16,
        flex: 1,
    },
    folderName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    itemCount: {
        fontSize: 12,
        color: '#6B7280',
    },
    newCollectionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 20,
        marginTop: 8,
    },
    plusIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FFF7ED',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#FED7AA',
        alignItems: 'center',
        justifyContent: 'center',
    },
    newCollectionText: {
        marginLeft: 16,
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    savingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    savingText: {
        marginTop: 12,
        fontSize: 14,
        fontWeight: '600',
        color: '#4B5563',
    },
});
