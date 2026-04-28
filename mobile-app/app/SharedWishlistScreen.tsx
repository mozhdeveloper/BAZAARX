import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, Dimensions, Pressable, Image, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Gift, Share2, ShieldCheck, MapPin, CheckCircle } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../src/constants/theme';
import { useCartStore } from '../src/stores/cartStore';
import { safeImageUri, PLACEHOLDER_AVATAR } from '../src/utils/imageUtils';
import { wishlistService } from '../src/services/wishlistService';

const { width } = Dimensions.get('window');

type SharedRegistryItem = {
    id: string;
    name: string;
    price: number;
    image?: string;
    priority: 'low' | 'medium' | 'high';
    desiredQty: number;
    purchasedQty: number;
    isPrivate?: boolean;
    product: any;
    status?: 'available' | 'out_of_stock' | 'seller_on_vacation' | 'restricted' | 'deleted';
};

export default function SharedWishlistScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute();
    const setQuickOrder = useCartStore((state) => state.setQuickOrder);
    const params = route.params as any;
    const [isLoading, setIsLoading] = useState(true);
    const [registry, setRegistry] = useState<any>(null);

    useEffect(() => {
        const load = async () => {
            const registryId = params?.wishlistId;
            if (!registryId) {
                setRegistry(null);
                setIsLoading(false);
                return;
            }

            try {
                const found = await wishlistService.getPublicRegistry(registryId);
                setRegistry(found);
            } catch (error) {
                console.error('[SharedWishlistScreen] load failed:', error);
                setRegistry(null);
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [params?.wishlistId]);

    const wishlistOwner = useMemo(() => {
        if (!registry) return null;

        const delivery = registry.delivery || {};
        return {
            name: registry.title || 'Shared Registry',
            avatar: undefined,
            registryAddress: delivery?.showAddress ? { city: 'Address Shared', province: '' } : null,
        };
    }, [registry]);

    const registryItems: SharedRegistryItem[] = useMemo(() => {
        if (!registry?.registry_items) return [];

        return registry.registry_items
            .map((item: any) => {
                const snapshot = item.product_snapshot || {};
                const requestedQty = item.requested_qty ?? item.quantity_desired ?? 1;
                const receivedQty = item.received_qty ?? 0;
                return {
                    id: item.id,
                    name: item.product_name || snapshot.name || 'Registry Item',
                    price: Number(snapshot.price || snapshot.originalPrice || 0),
                    image: snapshot.image || snapshot.images?.[0],
                    priority: (item.priority || 'medium') as 'low' | 'medium' | 'high',
                    desiredQty: requestedQty,
                    purchasedQty: receivedQty,
                    isPrivate: !!item.is_private,
                    product: {
                        price: Number(snapshot.price || snapshot.originalPrice || 0),
                        image: snapshot.image || snapshot.images?.[0],
                    },
                    status: item.product?.approval_status === 'suspended' ? 'restricted' : 
                            item.product?.seller?.on_vacation ? 'seller_on_vacation' :
                            (item.product?.stock ?? snapshot.stock ?? 0) <= 0 ? 'out_of_stock' : 
                            !item.product_id ? 'deleted' : 'available',
                };
            })
            .filter((item: SharedRegistryItem) => !item.isPrivate);
    }, [registry]);


    const handleBuyAsGift = (product: any) => {
        if (!wishlistOwner) return;

        Alert.alert(
            "Buy as Gift",
            `Do you want to buy "${product.name}" as a gift for ${wishlistOwner.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Proceed to Checkout", 
                    onPress: () => {
                        setQuickOrder({ ...product, isGift: true }, 1);
                        navigation.navigate('Checkout', { 
                            isGift: true, 
                            recipientName: wishlistOwner.name,
                            registryLocation: wishlistOwner.registryAddress ? `${wishlistOwner.registryAddress.city}, ${wishlistOwner.registryAddress.province}` : undefined
                        });
                    } 
                }
            ]
        );
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading shared registry...</Text>
            </View>
        );
    }

    if (!registry || !wishlistOwner) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />
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
                <View style={[styles.scrollContent, { alignItems: 'center', justifyContent: 'center', flex: 1 }]}>
                    <Text style={styles.emptyTitle}>Registry not found</Text>
                    <Text style={styles.emptyText}>This shared registry link may be invalid or private.</Text>
                </View>
            </View>
        );
    }

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
                    <Image source={{ uri: safeImageUri(wishlistOwner.avatar, PLACEHOLDER_AVATAR) }} style={styles.avatar} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.ownerName}>{wishlistOwner.name}</Text>
                        <View style={styles.registryMeta}>
                            <Text style={styles.itemCount}>{registryItems.length} Items</Text>
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
                    {registryItems.map((item) => {
                        const isFullyPurchased = item.purchasedQty >= item.desiredQty;
                        
                        return (
                            <View key={item.id} style={styles.productCard}>
                                <View style={styles.imageContainer}>
                                    <Image source={{ uri: safeImageUri(item.image) }} style={styles.productImage} />
                                    {isFullyPurchased && (
                                        <View style={styles.purchasedOverlay}>
                                            <Gift size={24} color="#FFF" />
                                            <Text style={styles.purchasedText}>FULFILLED</Text>
                                        </View>
                                    )}
                                    <View style={[styles.priorityTag, { backgroundColor: item.priority === 'high' ? '#DC2626' : item.priority === 'medium' ? '#D97706' : '#2563EB' }]}>
                                        <Text style={styles.priorityTagText}>{item.priority.toUpperCase()}</Text>
                                    </View>
                                    {item.status && item.status !== 'available' && (
                                        <View style={[
                                            styles.statusBadge,
                                            { backgroundColor: item.status === 'out_of_stock' ? '#FEE2E2' : item.status === 'seller_on_vacation' ? '#FEF3C7' : '#F3F4F6' }
                                        ]}>
                                            <Text style={[
                                                styles.statusText,
                                                { color: item.status === 'out_of_stock' ? '#DC2626' : item.status === 'seller_on_vacation' ? '#D97706' : '#4B5563' }
                                            ]}>
                                                {item.status.replace(/_/g, ' ').toUpperCase()}
                                            </Text>
                                        </View>
                                    )}
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
                                        item.status && item.status !== 'available' ? (
                                            <View style={styles.unavailableBadge}>
                                                <Text style={styles.unavailableText}>Unavailable</Text>
                                            </View>
                                        ) : (
                                            <Pressable 
                                                style={styles.giftButton}
                                                onPress={() => handleBuyAsGift(item.product)}
                                            >
                                                <Gift size={16} color="#FFF" style={{ marginRight: 6 }} />
                                                <Text style={styles.giftButtonText}>Buy as Gift</Text>
                                            </Pressable>
                                        )
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
                    {registryItems.length === 0 && (
                        <View style={{ width: '100%', paddingVertical: 32, alignItems: 'center' }}>
                            <Text style={styles.emptyTitle}>No items yet</Text>
                            <Text style={styles.emptyText}>This shared registry is currently empty.</Text>
                        </View>
                    )}
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
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
    giftedText: { color: '#059669', fontSize: 12, fontWeight: '700' },
    statusBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '800',
    },
    unavailableBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6',
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    unavailableText: {
        color: '#6B7280',
        fontSize: 12,
        fontWeight: '700',
    },
});
