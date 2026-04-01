import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, StatusBar, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Store, MapPin, Star, Users, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { officialStores } from '../src/data/stores';
import { COLORS } from '../src/constants/theme';
import { sellerService } from '../src/services/sellerService';
import { safeImageUri, PLACEHOLDER_BANNER } from '../src/utils/imageUtils';

export default function AllStoresScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const BRAND_COLOR = COLORS.primary;

    const pageTitle = route.params?.title || 'Official Stores';

    // Real stores state
    const [realStores, setRealStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch real stores on mount
    useEffect(() => {
        const fetchStores = async () => {
            setLoading(true);
            try {
                // By default getPublicStores returns approved & verified sellers
                const stores = await sellerService.getPublicStores({ sortBy: 'rating' });
                if (stores && stores.length > 0) {
                    // Map database stores to display format
                    const mappedStores = stores.map(s => ({
                        id: s.id,
                        name: s.store_name || s.business_name || 'Store',
                        logo: s.avatar_url || (s.store_name || s.business_name || 'S').substring(0, 1).toUpperCase(),
                        banner: (s as any).banner_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=300&fit=crop',
                        rating: s.rating || 5.0,
                        location: (() => {
                            const city = (s.city || '').trim();
                            const province = (s.province || '').trim();
                            if (city && province) return `${city}, ${province}`;
                            if (city) return city;
                            if (province) return province;
                            return 'Philippines';
                        })(),
                        followers: 0,
                        products: Array(s.products_count || 0).fill({}),
                        categories: [],
                        isVerified: s.is_verified
                    }));
                    setRealStores(mappedStores);
                }
            } catch (error) {
                console.error('Error fetching stores:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStores();
    }, []);

    // Use real stores if available, fallback to official stores (which might be empty or mock)
    const displayStores = realStores.length > 0 ? realStores : officialStores;

    const renderStoreItem = useCallback(({ item }: { item: any }) => (
        <Pressable 
            style={styles.storeVerticalCard} 
            onPress={() => navigation.navigate('StoreDetail', { store: item })}
        >
            <View style={styles.storeBannerContainer}>
                <Image 
                    source={{ uri: safeImageUri(item.banner, PLACEHOLDER_BANNER) }} 
                    style={styles.storeBannerImage} 
                    contentFit="cover" 
                    cachePolicy="memory-disk" 
                />
                <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,0.8)', '#FFFFFF']}
                    style={styles.storeBannerGradient}
                />
                <View style={styles.storeAvatarOverlap}>
                    <View style={styles.storeAvatarBorder}>
                        {item.logo && item.logo.length > 1 ? (
                            <Image 
                                source={{ uri: safeImageUri(item.logo) }} 
                                style={styles.storeAvatarImage} 
                                contentFit="cover" 
                            />
                        ) : (
                            <View style={[styles.storeAvatarImage, { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }]}>
                                <Text style={{ fontSize: 20, fontWeight: '700', color: BRAND_COLOR }}>{item.logo}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            <View style={styles.storeCardBody}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                    <Text style={styles.storeCardName} numberOfLines={1}>{item.name}</Text>
                    {item.isVerified && (
                        <CheckCircle2 size={16} color={BRAND_COLOR} fill="#FFF" />
                    )}
                </View>
                <Text style={styles.storeCardSubtitle} numberOfLines={1}>
                    {item.rating} ★ Rating • {item.location}
                </Text>

                <Pressable
                    style={({ pressed }) => [
                        styles.visitShopButton,
                        pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => navigation.navigate('StoreDetail', { store: item })}
                >
                    <Text style={styles.visitShopText}>Visit Shop</Text>
                </Pressable>
            </View>
        </Pressable>
    ), [navigation, BRAND_COLOR]);

    const keyExtractor = useCallback((item: any) => item.id, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <LinearGradient
                colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']} // Soft Parchment Header
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top }]}
            >
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={COLORS.textHeadline} strokeWidth={2.5} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: COLORS.textHeadline }]}>{pageTitle}</Text>
                <View style={{ width: 40 }} />
            </LinearGradient>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={BRAND_COLOR} />
                    <Text style={styles.loadingText}>Loading stores...</Text>
                </View>
            ) : displayStores.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Store size={48} color="#9CA3AF" />
                    <Text style={styles.emptyText}>No stores available yet</Text>
                </View>
            ) : (
                <FlatList
                    data={displayStores}
                    renderItem={renderStoreItem}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={6}
                    maxToRenderPerBatch={6}
                    windowSize={5}
                    removeClippedSubviews={true}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
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
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
        width: '100%',
        alignItems: 'center',
    },
    visitShopText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#4B2C20',
    },
    shopCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
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
        color: '#FF6A00',
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
        width: '100%',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    visitButtonPressed: {
        opacity: 0.9,
    },
    visitButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 12,
        fontSize: 14,
        color: '#9CA3AF',
    },
});
