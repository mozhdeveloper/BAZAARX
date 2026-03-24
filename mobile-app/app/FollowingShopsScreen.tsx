import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Store, MapPin, Star, Users } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useAuthStore } from '../src/stores/authStore';
import { GuestLoginModal } from '../src/components/GuestLoginModal';
import { COLORS } from '../src/constants/theme';

import { sellerService } from '../src/services/sellerService';
import { safeImageUri, PLACEHOLDER_BANNER } from '../src/utils/imageUtils';

type Props = NativeStackScreenProps<RootStackParamList, 'FollowingShops'>;

export default function FollowingShopsScreen({ navigation }: Props) {
    const { isGuest, user } = useAuthStore();
    const insets = useSafeAreaInsets();

    // State
    const [followingShops, setFollowingShops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch followed shops
    const fetchFollowedShops = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const shops = await sellerService.getFollowedShops(user.id);
            setFollowingShops(shops);
        } catch (error) {
            console.error('Error fetching followed shops:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isGuest) return;

        // Fetch initially
        fetchFollowedShops();

        // Add focus listener to refresh when coming back
        const unsubscribe = navigation.addListener('focus', () => {
            fetchFollowedShops();
        });

        return unsubscribe;
    }, [isGuest, user?.id, navigation]);

    const handleUnfollow = async (shopId: string) => {
        if (!user?.id) return;

        // Optimistic update
        setFollowingShops(prev => prev.filter(s => s.id !== shopId));

        try {
            await sellerService.unfollowSeller(user.id, shopId);
        } catch (error) {
            console.error('Error unfollowing shop:', error);
            // Re-fetch on error to restore state
            fetchFollowedShops();
        }
    };

    const handleVisitShop = (shop: any) => {
        // Ensure we pass the minimal required store object
        navigation.navigate('StoreDetail', { store: shop });
    };

    if (isGuest) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" />
                {/* Header - Guest View */}
                <View
                    style={[styles.headerContainer, { paddingTop: insets.top + 5, backgroundColor: COLORS.background }]}
                >
                    <View style={styles.headerTop}>
                        <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                            <ChevronLeft size={28} color={COLORS.textHeadline} strokeWidth={2.5} />
                        </Pressable>
                        <Text style={styles.headerTitle}>Following Shops</Text>
                        <View style={{ width: 40 }} />
                    </View>
                </View>

                <GuestLoginModal
                    visible={true}
                    onClose={() => {
                        navigation.navigate('MainTabs', { screen: 'Home' });
                    }}
                    message="Sign up to follow stores."
                    hideCloseButton={true}
                    cancelText="Go back to Home"
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View
                style={[styles.headerContainer, { paddingTop: insets.top + 5, backgroundColor: COLORS.background }]}
            >
                <View style={styles.headerTop}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                        <ChevronLeft size={28} color={COLORS.textHeadline} strokeWidth={2.5} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Following Shops</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {followingShops.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Store size={64} color="#D1D5DB" />
                        <Text style={styles.emptyTitle}>No Shops Yet</Text>
                        <Text style={styles.emptyText}>
                            Start following your favorite shops to see them here
                        </Text>
                    </View>
                ) : (
                    followingShops.map((shop) => {
                        const shopName = shop.store_name || shop.name || 'Shop';
                        const bannerUri = safeImageUri(shop.banner_url || shop.avatar_url, PLACEHOLDER_BANNER);
                        const avatarUri = safeImageUri(shop.avatar_url, PLACEHOLDER_BANNER);
                        const location = [shop.city, shop.province].filter(Boolean).join(', ') || shop.location || 'Philippines';
                        
                        return (
                            <Pressable key={shop.id} style={styles.storeVerticalCard} onPress={() => handleVisitShop(shop)}>
                                <View style={styles.storeBannerContainer}>
                                    <Image 
                                        source={{ uri: bannerUri }} 
                                        style={styles.storeBannerImage} 
                                        contentFit="cover" 
                                    />
                                    <LinearGradient
                                        colors={['transparent', 'rgba(255,255,255,0.8)', '#FFFFFF']}
                                        style={styles.storeBannerGradient}
                                    />
                                    <View style={styles.storeAvatarOverlap}>
                                        <View style={styles.storeAvatarBorder}>
                                            <Image 
                                                source={{ uri: avatarUri }} 
                                                style={styles.storeAvatarImage} 
                                                contentFit="cover" 
                                            />
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.storeCardBody}>
                                    <Text style={styles.storeCardName} numberOfLines={1}>{shopName}</Text>
                                    <Text style={styles.storeCardSubtitle} numberOfLines={1}>
                                        {(shop.rating ?? 0).toFixed(1)} ★ Rating • {location}
                                    </Text>

                                    <View style={styles.buttonRow}>
                                        <Pressable
                                            style={({ pressed }) => [
                                                styles.visitShopButton,
                                                pressed && { opacity: 0.85 },
                                            ]}
                                            onPress={() => handleVisitShop(shop)}
                                        >
                                            <Text style={styles.visitShopText}>Visit Shop</Text>
                                        </Pressable>
                                        <Pressable
                                            style={({ pressed }) => [
                                                styles.unfollowActionBtn,
                                                pressed && { opacity: 0.7 },
                                            ]}
                                            onPress={() => handleUnfollow(shop.id)}
                                        >
                                            <Text style={styles.unfollowActionText}>Unfollow</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </Pressable>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerContainer: {
        paddingHorizontal: 20,
        paddingBottom: 4,
        zIndex: 10,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        height: 40,
    },
    headerIconButton: { padding: 4, minWidth: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textHeadline },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    storeVerticalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
    },
    storeBannerContainer: {
        height: 120,
        width: '100%',
        position: 'relative',
        backgroundColor: '#F3F4F6',
    },
    storeBannerImage: {
        width: '100%',
        height: '100%',
    },
    storeBannerGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 50,
    },
    storeAvatarOverlap: {
        position: 'absolute',
        bottom: -25,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 10,
    },
    storeAvatarBorder: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#FFFFFF',
        padding: 3,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    storeAvatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 32,
    },
    storeCardBody: {
        paddingTop: 32,
        paddingHorizontal: 16,
        paddingBottom: 24,
        alignItems: 'center',
    },
    storeCardName: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 4,
        textAlign: 'center',
    },
    storeCardSubtitle: {
        fontSize: 14,
        color: '#9CA3AF',
        marginBottom: 20,
        textAlign: 'center',
        fontWeight: '500',
    },
    visitShopButton: {
        backgroundColor: '#FDE1D3',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        flex: 2,
        alignItems: 'center',
    },
    visitShopText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#4B2C20',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
        marginTop: 5,
    },
    unfollowActionBtn: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        flex: 1,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
    },
    unfollowActionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#374151',
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 32,
    },
    shopCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    shopImage: {
        width: '100%',
        height: 120,
        backgroundColor: '#F3F4F6',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.05)',
        height: 120,
    },
    logoContainer: {
        position: 'absolute',
        top: 80,
        left: 16,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
        zIndex: 10,
        overflow: 'hidden',
    },
    logoImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    shopInfo: {
        padding: 16,
        paddingTop: 24,
    },
    shopHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    shopName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        flex: 1,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEF3E8',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FB8C00', // Warm Orange
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    locationText: {
        fontSize: 13,
        color: '#6B7280',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statText: {
        fontSize: 13,
        color: '#6B7280',
    },
    visitButton: {
        flex: 1,
        backgroundColor: '#FB8C00', // Warm Orange
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    visitButtonPressed: {
        backgroundColor: '#E67E00',
    },
    visitButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    unfollowButton: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    unfollowButtonPressed: {
        backgroundColor: '#E5E7EB',
    },
    unfollowButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
});
