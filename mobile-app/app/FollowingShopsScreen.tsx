import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Image, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Store, MapPin, Star, Users } from 'lucide-react-native';
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
            <LinearGradient
                colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']} // Soft Parchment Header
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}
            >
                <View style={styles.headerTop}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                        <ArrowLeft size={24} color={COLORS.textHeadline} strokeWidth={2.5} />
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: COLORS.textHeadline }]}>Following Shops</Text>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>

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
            <LinearGradient
                colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']} // Soft Parchment Header
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}
            >
                <View style={styles.headerTop}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                        <ArrowLeft size={24} color={COLORS.textHeadline} strokeWidth={2.5} />
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: COLORS.textHeadline }]}>Following Shops</Text>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>

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
                    followingShops.map((shop) => (
                        <Pressable key={shop.id} style={styles.shopCard} onPress={() => handleVisitShop(shop)}>
                            <Image source={{ uri: safeImageUri(shop.banner, PLACEHOLDER_BANNER) }} style={styles.shopImage} />
                            <View style={styles.overlay} />
                            <View style={styles.logoContainer}>
                                <Text style={{ fontSize: 24 }}>{shop.logo}</Text>
                            </View>
                            <View style={styles.shopInfo}>
                                <View style={styles.shopHeader}>
                                    <Text style={styles.shopName}>{shop.name}</Text>
                                    <View style={styles.ratingBadge}>
                                        <Star size={14} color="#FBBF24" fill="#FBBF24" />
                                        <Text style={styles.ratingText}>{shop.rating}</Text>
                                    </View>
                                </View>

                                <View style={styles.locationRow}>
                                    <MapPin size={14} color="#6B7280" />
                                    <Text style={styles.locationText}>{shop.location}</Text>
                                </View>

                                <View style={styles.statsRow}>
                                    <View style={styles.statItem}>
                                        <Users size={14} color="#6B7280" />
                                        <Text style={styles.statText}>{shop.followers_count > 1000 ? (shop.followers_count / 1000).toFixed(1) + 'k' : shop.followers_count} followers</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Store size={14} color="#6B7280" />
                                        <Text style={styles.statText}>{shop.products_count} products</Text>
                                    </View>
                                </View>

                                <View style={styles.buttonRow}>
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.visitButton,
                                            pressed && styles.visitButtonPressed,
                                        ]}
                                        onPress={() => handleVisitShop(shop)}
                                    >
                                        <Text style={styles.visitButtonText}>Visit Shop</Text>
                                    </Pressable>
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.unfollowButton,
                                            pressed && styles.unfollowButtonPressed,
                                        ]}
                                        onPress={() => handleUnfollow(shop.id)}
                                    >
                                        <Text style={styles.unfollowButtonText}>Unfollow</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </Pressable>
                    ))
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
        paddingBottom: 25,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerIconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
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
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
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
