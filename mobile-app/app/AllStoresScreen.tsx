import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, StatusBar, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Store, MapPin, Star, Users } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { officialStores } from '../src/data/stores';
import { COLORS } from '../src/constants/theme';
import { sellerService } from '../src/services/sellerService';

export default function AllStoresScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const BRAND_COLOR = COLORS.primary;

    // Real stores state
    const [realStores, setRealStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch real stores on mount
    useEffect(() => {
        const fetchStores = async () => {
            setLoading(true);
            try {
                const stores = await sellerService.getPublicStores({ sortBy: 'rating' });
                if (stores && stores.length > 0) {
                    // Map database stores to display format
                    const mappedStores = stores.map(s => ({
                        id: s.id,
                        name: s.business_name || s.store_name || 'Store',
                        logo: '🏪',
                        banner: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=300&fit=crop',
                        rating: s.rating || 5.0,
                        location: s.city || s.province || 'Philippines',
                        followers: 0,
                        products: Array(s.products_count || 0).fill({}),
                        categories: s.store_category || [],
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

    // Use real stores if available, fallback to official stores
    const displayStores = realStores.length > 0 ? realStores : officialStores;

    const renderStoreItem = ({ item }: { item: any }) => (
        <Pressable 
            style={styles.shopCard} 
            onPress={() => navigation.navigate('StoreDetail', { store: item })}
        >
            <Image source={{ uri: item.banner }} style={styles.shopImage} />
            <View style={styles.overlay} />
            <View style={styles.logoContainer}>
                <Text style={{ fontSize: 24 }}>{item.logo}</Text>
            </View>
            <View style={styles.shopInfo}>
                <View style={styles.shopHeader}>
                    <Text style={styles.shopName}>{item.name}</Text>
                    <View style={styles.ratingBadge}>
                        <Star size={14} color="#FBBF24" fill="#FBBF24" />
                        <Text style={styles.ratingText}>{item.rating}</Text>
                    </View>
                </View>

                <View style={styles.locationRow}>
                    <MapPin size={14} color="#6B7280" />
                    <Text style={styles.locationText}>{item.location}</Text>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Users size={14} color="#6B7280" />
                        <Text style={styles.statText}>{item.followers > 1000 ? (item.followers / 1000).toFixed(1) + 'k' : item.followers} followers</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Store size={14} color="#6B7280" />
                        <Text style={styles.statText}>{item.products.length} products</Text>
                    </View>
                </View>

                <Pressable
                    style={({ pressed }) => [
                        styles.visitButton,
                        { backgroundColor: BRAND_COLOR },
                        pressed && styles.visitButtonPressed,
                    ]}
                    onPress={() => navigation.navigate('StoreDetail', { store: item })}
                >
                    <Text style={styles.visitButtonText}>Visit Shop</Text>
                </Pressable>
            </View>
        </Pressable>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1F2937" />
                </Pressable>
                <Text style={styles.headerTitle}>Official Stores</Text>
                <View style={{ width: 40 }} />
            </View>

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
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
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
