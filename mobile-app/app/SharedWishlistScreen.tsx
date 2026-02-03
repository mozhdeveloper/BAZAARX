import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, Dimensions, Pressable, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Gift, Share2, ShieldCheck, MapPin, CheckCircle } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../src/constants/theme';
import { useCartStore } from '../src/stores/cartStore';

const { width } = Dimensions.get('window');

// Mock data for shared wishlist - Enhanced with registry data
const MOCK_SHARED_USER = {
    name: "Maria Santos",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b5e5?w=150",
    registryAddress: {
        city: "Makati City",
        province: "Metro Manila"
    },
    items: [
        {
            id: "fake_1",
            name: "Premium Wireless Headphones",
            price: 5499,
            image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500",
            seller: "TechHub Manila",
            priority: "high",
            desiredQty: 1,
            purchasedQty: 0,
            status: 'active'
        },
        {
            id: "fake_2",
            name: "Ergonomic Office Chair",
            price: 8999,
            image: "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=500",
            seller: "Home Comforts",
            priority: "medium",
            desiredQty: 2,
            purchasedQty: 1, // 1 bought, 1 still needed
            status: 'active'
        },
        {
            id: "fake_3",
            name: "Ceramic Coffee Set",
            price: 1299,
            image: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500",
            seller: "Home & Hearth",
            priority: "low",
            desiredQty: 1,
            purchasedQty: 1,
            status: 'purchased',
            isPrivate: true // Hidden from shared view
        }
    ]
};

export default function SharedWishlistScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute();
    const setQuickOrder = useCartStore((state) => state.setQuickOrder);
    const params = route.params as any;

    // Use passed preview data if available, otherwise mock
    const wishlistOwner = params?.wishlistData || MOCK_SHARED_USER;


    const handleBuyAsGift = (product: any) => {
        Alert.alert(
            "Buy as Gift",
            `Do you want to buy "${product.name}" as a gift for ${wishlistOwner.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Proceed to Checkout", 
                    onPress: () => {
                        // Mark as gift in cart/checkout
                        setQuickOrder({ ...product, isGift: true }, 1);
                        navigation.navigate('Checkout', { 
                            isGift: true, 
                            recipientName: wishlistOwner.name,
                            // Pass masked address info if available
                            registryLocation: wishlistOwner.registryAddress ? `${wishlistOwner.registryAddress.city}, ${wishlistOwner.registryAddress.province}` : undefined
                        });
                    } 
                }
            ]
        );
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
                        <Text style={styles.headerTitle}>Shared Registry</Text>
                    </View>
                    
                    <View style={{ width: 40 }} /> 
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Profile Info - Moved to Body */}
                <View style={styles.profileSection}>
                    <Image source={{ uri: wishlistOwner.avatar }} style={styles.avatar} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.ownerName}>{wishlistOwner.name}'s Registry</Text>
                        <View style={styles.registryMeta}>
                            <Text style={styles.itemCount}>{wishlistOwner.items.length} Items</Text>
                            {wishlistOwner.registryAddress && (
                                <View style={styles.dotSeparator} />
                            )}
                            {wishlistOwner.registryAddress && (
                                <View style={styles.locationBadge}>
                                    <MapPin size={12} color={COLORS.primary} />
                                    <Text style={styles.locationText}>Ships to {wishlistOwner.registryAddress.city}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
                <View style={styles.grid}>
                    {wishlistOwner.items.filter((item: any) => !item.isPrivate).map((item) => {
                        const isFullyPurchased = item.purchasedQty >= item.desiredQty;
                        
                        return (
                            <View key={item.id} style={styles.productCard}>
                                <View style={styles.imageContainer}>
                                    <Image source={{ uri: item.image }} style={styles.productImage} />
                                    {isFullyPurchased && (
                                        <View style={styles.purchasedOverlay}>
                                            <Gift size={24} color="#FFF" />
                                            <Text style={styles.purchasedText}>FULFILLED</Text>
                                        </View>
                                    )}
                                    <View style={[styles.priorityTag, { backgroundColor: item.priority === 'high' ? '#DC2626' : item.priority === 'medium' ? '#D97706' : '#2563EB' }]}>
                                        <Text style={styles.priorityTagText}>{item.priority.toUpperCase()}</Text>
                                    </View>
                                </View>
                                
                                <View style={styles.cardContent}>
                                    <Text numberOfLines={2} style={styles.productName}>{item.name}</Text>
                                    <Text style={styles.productPrice}>₱{item.price.toLocaleString()}</Text>
                                    
                                    <View style={styles.progressContainer}>
                                        <Text style={styles.progressText}>
                                            Has: <Text style={{fontWeight:'700', color: COLORS.primary}}>{item.purchasedQty}</Text> / {item.desiredQty}
                                        </Text>
                                        <View style={styles.progressBarBg}>
                                            <View style={[styles.progressBarFill, { width: `${Math.min(100, (item.purchasedQty / item.desiredQty) * 100)}%` }]} />
                                        </View>
                                    </View>
                                    
                                    {!isFullyPurchased ? (
                                        <Pressable 
                                            style={styles.giftButton}
                                            onPress={() => handleBuyAsGift(item)}
                                        >
                                            <Gift size={16} color="#FFF" style={{ marginRight: 6 }} />
                                            <Text style={styles.giftButtonText}>Buy as Gift</Text>
                                        </Pressable>
                                    ) : (
                                        <View style={styles.giftedBadge}>
                                            <CheckCircle size={14} color="#059669" style={{ marginRight: 4 }} />
                                            <Text style={styles.giftedText}>Completed</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    headerContainer: {
        paddingHorizontal: 20,
        paddingBottom: 24,
        borderBottomLeftRadius: 24, 
        borderBottomRightRadius: 24,
        zIndex: 10,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'relative' },
    headerIconButton: { padding: 4, zIndex: 10 },
    titleContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    
    // Profile Section (Now plain white style)
    profileSection: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24, paddingHorizontal: 4 },
    avatar: { width: 64, height: 64, borderRadius: 32 },
    ownerName: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 }, // Dark text
    registryMeta: { flexDirection: 'row', alignItems: 'center' },
    itemCount: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
    dotSeparator: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', marginHorizontal: 8 },
    locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
    locationText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

    scrollContent: { padding: 16, paddingBottom: 40 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    productCard: {
        width: (width - 48) / 2,
        backgroundColor: '#FFF',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        // Softer shadow
        elevation: 3,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6,
    },
    imageContainer: { height: 170, width: '100%', position: 'relative', backgroundColor: '#F3F4F6' },
    productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    purchasedOverlay: {
        position: 'absolute', inset: 0,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center', alignItems: 'center',
        gap: 6
    },
    purchasedText: { color: COLORS.primary, fontWeight: '800', letterSpacing: 1.5, fontSize: 12 },
    priorityTag: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, elevation: 1 },
    priorityTagText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
    
    cardContent: { padding: 12, flex: 1, justifyContent: 'space-between' },
    productName: { fontSize: 13, fontWeight: '600', color: '#1F2937', marginBottom: 4, height: 36, lineHeight: 18 },
    productPrice: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 10 },
    
    progressContainer: { marginBottom: 12 },
    progressText: { fontSize: 11, color: '#6B7280', marginBottom: 6, fontWeight: '500' },
    progressBarBg: { height: 6, backgroundColor: '#EFF6FF', borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
    
    giftButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 10, borderRadius: 12,
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 2
    },
    giftButtonText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
    
    giftedBadge: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#ECFDF5',
        paddingVertical: 10, borderRadius: 12,
    },
    giftedText: { color: '#059669', fontSize: 12, fontWeight: '700' },
});
