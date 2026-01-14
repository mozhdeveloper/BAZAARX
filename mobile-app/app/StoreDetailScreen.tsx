import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, StatusBar, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, MoreHorizontal, CheckCircle2, Star, MapPin, Grid, Heart } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ProductCard } from '../src/components/ProductCard';
import { trendingProducts } from '../src/data/products'; // Placeholder products

const { width } = Dimensions.get('window');

export default function StoreDetailScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { store } = route.params;
    const BRAND_COLOR = '#FF5722';

    // Filter products for this store (simulated)
    const storeProducts = trendingProducts;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Custom Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <ArrowLeft size={24} color="#FFF" />
                </Pressable>
                <View style={styles.headerRight}>
                    <Pressable style={styles.iconButton}>
                        <Search size={24} color="#FFF" />
                    </Pressable>
                    <Pressable style={styles.iconButton}>
                        <MoreHorizontal size={24} color="#FFF" />
                    </Pressable>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Profile Banner Section */}
                <View style={styles.profileSection}>
                    <Image source={{ uri: store.banner }} style={styles.bannerImage} resizeMode="cover" />
                    <View style={styles.overlay} />

                    <View style={styles.storeInfoContent}>
                        <View style={styles.mainInfo}>
                            <View style={styles.logoContainer}>
                                <Text style={styles.logoText}>{store.logo}</Text>
                            </View>
                            <View style={styles.textInfo}>
                                <View style={styles.nameLockup}>
                                    <Text style={styles.storeName}>{store.name}</Text>
                                    {store.verified && <CheckCircle2 size={16} color="#3B82F6" fill="#FFF" />}
                                </View>
                                <View style={styles.locationRow}>
                                    <MapPin size={12} color="#FFF" />
                                    <Text style={styles.locationText}>{store.location}</Text>
                                </View>
                                <View style={styles.metricsRow}>
                                    <Text style={styles.metricText}><Text style={styles.metricBold}>{store.rating}</Text> Rating</Text>
                                    <View style={styles.divider} />
                                    <Text style={styles.metricText}><Text style={styles.metricBold}>{store.followers > 1000 ? (store.followers / 1000).toFixed(1) + 'k' : store.followers}</Text> Followers</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.actionButtons}>
                            <Pressable style={styles.followButton}>
                                <Text style={styles.followButtonText}>+ Follow</Text>
                            </Pressable>
                            <Pressable style={styles.chatButton}>
                                <Text style={styles.chatButtonText}>Chat</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* Categories / Tabs simulation */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
                    {['Shop', 'Products', 'Categories', 'About'].map((tab, i) => (
                        <Pressable key={tab} style={[styles.tabItem, i === 0 && styles.activeTabItem]}>
                            <Text style={[styles.tabText, i === 0 && styles.activeTabText]}>{tab}</Text>
                            {i === 0 && <View style={styles.activeIndicator} />}
                        </Pressable>
                    ))}
                </ScrollView>

                {/* Featured / Coupon Section */}
                <View style={styles.couponSection}>
                    <Text style={styles.sectionTitle}>Vouchers</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16 }}>
                        <View style={styles.couponCard}>
                            <View style={styles.couponLeft}>
                                <Text style={styles.couponAmount}>₱50 OFF</Text>
                                <Text style={styles.couponMin}>Min. Spend ₱500</Text>
                            </View>
                            <Pressable style={styles.claimButton}><Text style={styles.claimText}>Claim</Text></Pressable>
                        </View>
                        <View style={styles.couponCard}>
                            <View style={styles.couponLeft}>
                                <Text style={styles.couponAmount}>10% OFF</Text>
                                <Text style={styles.couponMin}>Min. Spend ₱1k</Text>
                            </View>
                            <Pressable style={styles.claimButton}><Text style={styles.claimText}>Claim</Text></Pressable>
                        </View>
                    </ScrollView>
                </View>

                {/* Products Grid */}
                <View style={styles.productsContainer}>
                    <Text style={styles.sectionTitle}>All Products</Text>
                    <View style={styles.grid}>
                        {storeProducts.map((p) => (
                            <View key={p.id} style={styles.productWrapper}>
                                <ProductCard product={p} onPress={() => navigation.navigate('ProductDetail', { product: p })} />
                            </View>
                        ))}
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    headerRight: {
        flexDirection: 'row',
        gap: 8,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileSection: {
        height: 280,
        justifyContent: 'flex-end',
    },
    bannerImage: {
        ...StyleSheet.absoluteFillObject,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    storeInfoContent: {
        padding: 16,
        paddingBottom: 20,
    },
    mainInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    logoText: {
        fontSize: 32,
    },
    textInfo: {
        marginLeft: 12,
        flex: 1,
    },
    nameLockup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    storeName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFF',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    locationText: {
        color: '#FFF',
        fontSize: 12,
        opacity: 0.9,
    },
    metricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    metricText: {
        color: '#FFF',
        fontSize: 13,
    },
    metricBold: {
        fontWeight: '700',
    },
    divider: {
        width: 1,
        height: 12,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    followButton: {
        flex: 1,
        backgroundColor: '#FF5722',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    followButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
    chatButton: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFF',
    },
    chatButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
    tabsScroll: {
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    tabsContent: {
        paddingHorizontal: 8,
    },
    tabItem: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        position: 'relative',
    },
    activeTabItem: {

    },
    tabText: {
        fontSize: 15,
        color: '#666',
        fontWeight: '600',
    },
    activeTabText: {
        color: '#FF5722',
        fontWeight: '700',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 16,
        right: 16,
        height: 3,
        backgroundColor: '#FF5722',
        borderRadius: 3,
    },
    couponSection: {
        marginTop: 12,
        backgroundColor: '#FFF',
        paddingVertical: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    couponCard: {
        flexDirection: 'row',
        backgroundColor: '#FFF5F0',
        borderWidth: 1,
        borderColor: '#FFCCBC',
        borderRadius: 8,
        marginRight: 10,
        width: 200,
        overflow: 'hidden',
    },
    couponLeft: {
        flex: 1,
        padding: 10,
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: '#FFCCBC',
        borderStyle: 'dashed',
    },
    couponAmount: {
        color: '#FF5722',
        fontWeight: '800',
        fontSize: 16,
    },
    couponMin: {
        color: '#FF8A65',
        fontSize: 10,
    },
    claimButton: {
        width: 50,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },
    claimText: {
        color: '#FF5722',
        fontWeight: '700',
        fontSize: 12,
    },
    productsContainer: {
        marginTop: 12,
        backgroundColor: '#FFF',
        paddingVertical: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        justifyContent: 'space-between',
    },
    productWrapper: {
        width: (width - 48) / 2,
        marginBottom: 16,
    }
});
