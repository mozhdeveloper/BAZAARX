import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, Dimensions, Share, Alert, Pressable, Modal, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, ShoppingBag, Share2, MoreVertical, Edit2, Check, X, Search } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { ProductCard } from '../src/components/ProductCard';
import { useWishlistStore, WishlistItem } from '../src/stores/wishlistStore';
import { useAuthStore } from '../src/stores/authStore';
import { GuestLoginModal } from '../src/components/GuestLoginModal';
import WishlistSettingsModal from '../src/components/WishlistSettingsModal';
import { COLORS } from '../src/constants/theme';

const { width } = Dimensions.get('window');

// Item Edit Modal Component
const ItemEditModal = ({ visible, onClose, item, onSave }: any) => {
    const [priority, setPriority] = useState(item?.priority || 'medium');
    const [qty, setQty] = useState(item?.desiredQty?.toString() || '1');

    useEffect(() => {
        if (item) {
            setPriority(item.priority || 'medium');
            setQty(item.desiredQty?.toString() || '1');
        }
    }, [item]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.editModalOverlay}>
                <View style={styles.editModalContent}>
                    <Text style={styles.editModalTitle}>Edit Item</Text>
                    
                    <Text style={styles.editLabel}>Priority</Text>
                    <View style={styles.priorityRow}>
                        {(['low', 'medium', 'high'] as const).map((p) => (
                            <Pressable 
                                key={p} 
                                style={[styles.priorityOption, priority === p && styles.selectedPriority]}
                                onPress={() => setPriority(p)}
                            >
                                <Text style={[styles.priorityOptionText, priority === p && { color: '#FFF' }]}>
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <Text style={styles.editLabel}>Desired Quantity</Text>
                    <View style={styles.qtyContainer}>
                        <Pressable onPress={() => setQty(Math.max(1, parseInt(qty || '1') - 1).toString())} style={styles.qtyBtn}><Text>-</Text></Pressable>
                        <TextInput style={styles.qtyInput} value={qty} onChangeText={setQty} keyboardType="numeric" />
                        <Pressable onPress={() => setQty((parseInt(qty || '1') + 1).toString())} style={styles.qtyBtn}><Text>+</Text></Pressable>
                    </View>

                    <View style={styles.editActions}>
                        <Pressable style={styles.cancelBtn} onPress={onClose}><Text>Cancel</Text></Pressable>
                        <Pressable 
                            style={styles.saveBtn} 
                            onPress={() => {
                                onSave(item.id, { priority, desiredQty: parseInt(qty) });
                                onClose();
                            }}
                        >
                            <Text style={{ color: '#FFF' }}>Save</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default function WishlistScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();

    const { items, removeItem, shareWishlist, updateItem } = useWishlistStore();
    const { isGuest } = useAuthStore();
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);

    useEffect(() => {
        if (isGuest) {
            setShowGuestModal(true);
        }
    }, [isGuest]);

    const handleProductPress = (product: any) => {
        navigation.navigate('ProductDetail', { product });
    };

    const handleShare = async () => {
        if (items.length === 0) {
            Alert.alert('Empty Wishlist', 'Add items to your wishlist before sharing.');
            return;
        }
        
        try {
            const url = await shareWishlist();
            await Share.share({
                message: `Check out my registry on BazaarX! ${url}`,
                url: url
            });
        } catch (error) {
            Alert.alert('Error', 'Failed to share wishlist');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: COLORS.primary }]}>
                <View style={styles.headerTop}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                        <ArrowLeft size={24} color="#FFF" strokeWidth={2.5} />
                    </Pressable>
                    
                    <View style={styles.titleContainer}>
                        <Text style={styles.headerTitle}>My Wishlist</Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable onPress={handleShare} style={styles.headerIconButton}>
                            <Share2 size={24} color="#FFF" />
                        </Pressable>
                        <Pressable onPress={() => setShowSettings(true)} style={styles.headerIconButton}>
                            <MoreVertical size={24} color="#FFF" />
                        </Pressable>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {items.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <Heart size={48} color="#D1D5DB" fill="#D1D5DB" />
                        </View>
                        <Text style={styles.emptyTitle}>Your registry is empty</Text>
                        <Text style={styles.emptyText}>Tap the heart icon on products to add them.</Text>
                        <Pressable style={styles.shopNowButton} onPress={() => navigation.navigate('MainTabs', { screen: 'Shop' })}>
                            <ShoppingBag size={20} color="#FFF" />
                            <Text style={styles.shopNowText}>Start Shopping</Text>
                        </Pressable>
                    </View>
                ) : (
                    <>
                        <View style={styles.findRegistryContainer}>
                            <View style={styles.findRegistryContent}>
                                <Text style={styles.findRegistryTitle}>Looking for a friend?</Text>
                                <Text style={styles.findRegistrySubtitle}>Find their registry to send a gift.</Text>
                            </View>
                            <Pressable style={styles.findRegistryBtn} onPress={() => navigation.navigate('FindRegistry')}>
                                <Search size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                                <Text style={styles.findRegistryBtnText}>Find Registry</Text>
                            </Pressable>
                        </View>

                        <Text style={styles.countText}>{items.length} Items Saved</Text>
                        <View style={styles.list}>
                            {items.map((item) => (
                                <View key={item.id} style={styles.listItem}>
                                    <View style={styles.itemCardContainer}>
                                        <ProductCard
                                            product={item}
                                            onPress={() => handleProductPress(item)}
                                            // Compact Mode props if component supported it, using standard for now
                                        />
                                        {/* Overlay Controls */}
                                        <View style={styles.itemControls}>
                                            <Pressable style={styles.editIconBtn} onPress={() => setEditingItem(item)}>
                                                <Edit2 size={16} color="#FFF" />
                                            </Pressable>
                                        </View>
                                    </View>
                                    
                                    {/* Registry Details */}
                                    <View style={styles.registryDetails}>
                                        <View style={[styles.priorityBadge, { 
                                            backgroundColor: item.priority === 'high' ? '#FEE2E2' : item.priority === 'medium' ? '#FEF3C7' : '#E0F2FE'
                                        }]}>
                                            <Text style={[styles.priorityText, {
                                                color: item.priority === 'high' ? '#DC2626' : item.priority === 'medium' ? '#D97706' : '#0284C7'
                                            }]}>
                                                {item.priority?.toUpperCase()}
                                            </Text>
                                        </View>
                                        <Text style={styles.qtyText}>
                                            Needs: <Text style={{fontWeight:'700'}}>{item.desiredQty}</Text> • 
                                            Has: <Text style={{fontWeight:'700', color: COLORS.primary}}>{item.purchasedQty || 0}</Text>
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
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

            <WishlistSettingsModal 
                visible={showSettings}
                onClose={() => setShowSettings(false)}
            />

            <ItemEditModal 
                visible={!!editingItem}
                item={editingItem}
                onClose={() => setEditingItem(null)}
                onSave={updateItem}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    headerContainer: {
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        paddingBottom: 20,
        marginBottom: 10,
        elevation: 4,
        zIndex: 10,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'relative' },
    headerIconButton: { padding: 4, zIndex: 10 },
    titleContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
    scrollContent: { padding: 16, paddingBottom: 40, minHeight: '100%' },
    countText: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 16 },
    list: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    listItem: { width: (width - 48) / 2, marginBottom: 24 },
    itemCardContainer: { position: 'relative' },
    itemControls: {
        position: 'absolute', top: 8, right: 8,
        flexDirection: 'row', gap: 8,
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
    qtyText: { fontSize: 11, color: '#374151' },

    // Find Registry Banner
    findRegistryContainer: { 
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 24,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2
    },
    findRegistryContent: { flex: 1 },
    findRegistryTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
    findRegistrySubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    findRegistryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
    findRegistryBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

    // Empty State
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyIconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
    emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 32 },
    shopNowButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FF5722', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, elevation: 4 },
    shopNowText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

    // Edit Modal
    editModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    editModalContent: { backgroundColor: '#FFF', width: '80%', padding: 20, borderRadius: 16, elevation: 5 },
    editModalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
    editLabel: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
    priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    priorityOption: { flex: 1, padding: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, alignItems: 'center' },
    selectedPriority: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    priorityOptionText: { fontSize: 12, color: '#374151' },
    qtyContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
    qtyBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
    qtyInput: { width: 60, textAlign: 'center', fontSize: 16, fontWeight: '700', borderBottomWidth: 1, borderColor: '#E5E7EB' },
    editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    cancelBtn: { padding: 10 },
    saveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
});
