import { ArrowLeft, Search, MoreHorizontal, CheckCircle2, Star, MapPin, Grid, Heart, MessageCircle, UserPlus, Check, X, Share2, Flag, Info, Loader2, MoreVertical } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ProductCard } from '../src/components/ProductCard';
import { trendingProducts } from '../src/data/products'; // Placeholder products
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, StatusBar, Dimensions, Alert, LayoutAnimation, Platform, UIManager, Modal, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import StoreChatModal from '../src/components/StoreChatModal';
import { COLORS } from '../src/constants/theme';

import { useAuthStore } from '../src/stores/authStore';
import { GuestLoginModal } from '../src/components/GuestLoginModal';
import { sellerService } from '../src/services/sellerService';
import { productService } from '../src/services/productService';
import { safeImageUri, PLACEHOLDER_BANNER } from '../src/utils/imageUtils';

const { width } = Dimensions.get('window');

export default function StoreDetailScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { store } = route.params || {};

    if (!store) {
        return (
            <LinearGradient
                colors={['#FFE5CC', '#FFE5CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.container}
            >
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text>Store information not available</Text>
                    <Pressable onPress={() => navigation.goBack()} style={{ padding: 10, marginTop: 10 }}>
                        <Text style={{ color: COLORS.primary }}>Go Back</Text>
                    </Pressable>
                </View>
            </LinearGradient>
        );
    }
    const BRAND_COLOR = COLORS.primary;

    const { isGuest, user } = useAuthStore();

    // State
    const [storeData, setStoreData] = useState<any>(store);
    const [followerCount, setFollowerCount] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);

    const [activeTab, setActiveTab] = useState('Shop');
    const [searchVisible, setSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [menuVisible, setMenuVisible] = useState(false);
    const [chatVisible, setChatVisible] = useState(false);
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [guestModalMessage, setGuestModalMessage] = useState('');

    // Real products state
    const [realProducts, setRealProducts] = useState<any[]>([]);
    const [productsLoading, setProductsLoading] = useState(true);

    const [vouchers, setVouchers] = useState([
        { id: '1', amount: '₱50 OFF', min: 'Min. Spend ₱500', claimed: false },
        { id: '2', amount: '10% OFF', min: 'Min. Spend ₱1k', claimed: false },
        { id: '3', amount: 'Free Shipping', min: 'Min. Spend ₱300', claimed: false },
    ]);

    // Fetch real store data
    useEffect(() => {
        const fetchStoreData = async () => {
            if (!store?.id) return;
            try {
                // Fetch fresh seller data
                const seller = await sellerService.getSellerById(store.id);
                if (seller) {
                    setStoreData({
                        ...store,
                        ...seller,
                        name: seller.store_name || seller.business_name || store.name,
                        location: seller.city ? `${seller.city}, ${seller.province}` : (seller.business_profile?.address_line_1 || store.location),
                        description: seller.store_description || store.description,
                        rating: seller.rating || store.rating || 0,
                        logo: seller.store_name?.substring(0, 2).toUpperCase() || store.logo
                    });
                }

                // Fetch follower count (non-critical, don't throw)
                try {
                    const count = await sellerService.getFollowerCount(store.id);
                    setFollowerCount(count);
                } catch (e) {
                    console.warn('Could not fetch follower count:', e);
                }

                // Check if following (only for logged-in buyers)
                if (user?.id && !isGuest) {
                    try {
                        const following = await sellerService.checkIsFollowing(user.id, store.id);
                        setIsFollowing(following);
                    } catch (e) {
                        console.warn('Could not check follow status:', e);
                    }
                }
            } catch (error) {
                console.error('Error fetching store data:', error);
            }
        };
        fetchStoreData();
    }, [store?.id, user?.id, isGuest]);

    // Fetch real products for this store
    useEffect(() => {
        const fetchProducts = async () => {
            if (!store?.id) return;

            setProductsLoading(true);
            try {
                // Fetch products for this seller from the database
                const products = await productService.getProducts({
                    sellerId: store.id,
                    approvalStatus: 'approved',
                    isActive: true
                });

                if (products && products.length > 0) {
                    // Map database products to display format
                    const mappedProducts = products.map(p => {
                        // Get primary image or first image
                        const primaryImage = (p as any).images?.find((img: any) => img.is_primary)?.image_url 
                            || (p as any).images?.[0]?.image_url 
                            || (p as any).images?.[0] 
                            || 'https://placehold.co/400?text=Product';
                        
                        // Get category name from join
                        const categoryName = typeof (p as any).category === 'object' 
                            ? (p as any).category?.name 
                            : ((p as any).category || 'General');
                        
                        return {
                            id: p.id,
                            name: p.name,
                            price: p.price,
                            originalPrice: (p as any).original_price || p.price,
                            image: primaryImage,
                            rating: (p as any).rating || 5.0,
                            sold: (p as any).sales_count || 0,
                            category: categoryName,
                            sellerId: (p as any).seller_id,
                            sellerName: storeData.name,
                            sellerLocation: storeData.location
                        };
                    });
                    setRealProducts(mappedProducts);
                } else {
                    setRealProducts([]);
                }
            } catch (error) {
                console.error('Error fetching store products:', error);
                setRealProducts([]); // Set empty on error instead of leaving stale data
            } finally {
                setProductsLoading(false);
            }
        };

        fetchProducts();
    }, [store?.id, storeData.name]);

    // Use real products if available, otherwise fallback to trending products (only if disabled)
    // Actually for store detail we should probably only show real products or empty
    const availableProducts = realProducts;

    // Filter products by search query
    const storeProducts = availableProducts.filter((p: any) =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (Platform.OS === 'android') {
        if (UIManager.setLayoutAnimationEnabledExperimental) {
            UIManager.setLayoutAnimationEnabledExperimental(true);
        }
    }

    const handleFollow = async () => {
        if (isGuest || !user?.id) {
            setGuestModalMessage("Sign up to follow stores.");
            setShowGuestModal(true);
            return;
        }

        // Optimistic update
        const prevFollowing = isFollowing;
        const prevCount = followerCount;

        setIsFollowing(!prevFollowing);
        setFollowerCount(prev => prevFollowing ? prev - 1 : prev + 1);

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        try {
            if (prevFollowing) {
                await sellerService.unfollowSeller(user.id, store.id);
            } else {
                await sellerService.followSeller(user.id, store.id);
            }
        } catch (error) {
            // Revert on error
            setIsFollowing(prevFollowing);
            setFollowerCount(prevCount);
            Alert.alert('Error', 'Failed to update follow status');
        }
    };

    const handleChat = () => {
        if (isGuest) {
            setGuestModalMessage("Sign up to chat with sellers.");
            setShowGuestModal(true);
            return;
        }
        setChatVisible(true);
    };

    const handleClaimVoucher = (id: string) => {
        setVouchers(prev => prev.map(v => v.id === id ? { ...v, claimed: true } : v));
        Alert.alert('Success', 'Voucher claimed! It will be applied at checkout.');
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Shop':
                return (
                    <>
                        {/* Featured / Coupon Section */}
                        <View style={styles.couponSection}>
                            <Text style={styles.sectionTitle}>Vouchers from {store.name}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 16 }}>
                                {vouchers.map((voucher) => (
                                    <View key={voucher.id} style={[styles.couponCard, voucher.claimed && styles.couponCardClaimed]}>
                                        <View style={styles.couponLeft}>
                                            <Text style={[styles.couponAmount, voucher.claimed && { color: '#9CA3AF' }]}>{voucher.amount}</Text>
                                            <Text style={styles.couponMin}>{voucher.min}</Text>
                                        </View>
                                        <Pressable
                                            style={[styles.claimButton, voucher.claimed && { backgroundColor: '#F3F4F6' }]}
                                            onPress={() => !voucher.claimed && handleClaimVoucher(voucher.id)}
                                            disabled={voucher.claimed}
                                        >
                                            <Text style={[styles.claimText, voucher.claimed && { color: '#9CA3AF' }]}>
                                                {voucher.claimed ? 'Claimed' : 'Claim'}
                                            </Text>
                                        </Pressable>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Products Grid */}
                        <View style={styles.productsContainer}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Featured Products</Text>
                                <Text style={styles.seeAllText}>See All</Text>
                            </View>
                            <View style={styles.grid}>
                                {storeProducts.slice(0, 4).map((p) => (
                                    <View key={p.id} style={styles.productWrapper}>
                                        <ProductCard product={p} onPress={() => navigation.navigate('ProductDetail', { product: p })} />
                                    </View>
                                ))}
                            </View>
                        </View>
                    </>
                );
            case 'Products':
                return (
                    <View style={styles.productsContainer}>
                        <Text style={styles.sectionTitle}>All Products ({storeProducts.length})</Text>
                        {productsLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={BRAND_COLOR} />
                                <Text style={styles.loadingText}>Loading products...</Text>
                            </View>
                        ) : storeProducts.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No products available yet</Text>
                            </View>
                        ) : (
                            <View style={styles.grid}>
                                {storeProducts.map((p) => (
                                    <View key={p.id} style={styles.productWrapper}>
                                        <ProductCard product={p} onPress={() => navigation.navigate('ProductDetail', { product: p })} />
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                );
            case 'Categories':
                return (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Store Categories</Text>
                        <View style={styles.categoriesList}>
                            {(store.categories || []).map((cat: string, index: number) => (
                                <Pressable key={index} style={styles.categoryRow}>
                                    <Text style={styles.categoryName}>{cat}</Text>
                                    <Grid size={20} color="#9CA3AF" />
                                </Pressable>
                            ))}
                            {['Sale', 'New Arrivals', 'Bundles'].map((cat, index) => (
                                <Pressable key={`extra-${index}`} style={styles.categoryRow}>
                                    <Text style={styles.categoryName}>{cat}</Text>
                                    <Grid size={20} color="#9CA3AF" />
                                </Pressable>
                            ))}
                        </View>
                    </View>
                );
            case 'About':
                return (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>About {store.name}</Text>
                        <View style={styles.aboutCard}>
                            <Text style={styles.aboutDescription}>{store.description}</Text>

                            <View style={styles.divider} />

                            <View style={styles.infoRow}>
                                <MapPin size={18} color="#6B7280" />
                                <Text style={styles.infoText}>
                                    {[
                                        storeData.business_profile?.address_line_1,
                                        storeData.city || storeData.business_profile?.city,
                                        storeData.province || storeData.business_profile?.province
                                    ].filter(Boolean).join(', ') || storeData.location || "Address not available"}
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Star size={18} color="#F59E0B" fill="#F59E0B" />
                                <Text style={styles.infoText}>{storeData.rating} ({followerCount} Followers)</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <CheckCircle2 size={18} color={BRAND_COLOR} />
                                <Text style={styles.infoText}>Verified Official Store</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Joined:</Text>
                                <Text style={styles.infoText}>January 2023</Text>
                            </View>
                        </View>
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <LinearGradient
            colors={['#FFE5CC', '#FFE5CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.container}
        >
            <StatusBar barStyle="light-content" />

            {/* Custom Header */}
            <View style={[styles.header, { paddingTop: insets.top }, searchVisible && { backgroundColor: BRAND_COLOR, paddingBottom: 12 }]}>
                {searchVisible ? (
                    <View style={styles.searchHeader}>
                        <View style={styles.searchBar}>
                            <Search size={18} color="#9CA3AF" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder={`Search in ${store.name}`}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                                placeholderTextColor="#9CA3AF"
                            />
                            {searchQuery.length > 0 && <Pressable onPress={() => setSearchQuery('')}><X size={18} color="#9CA3AF" /></Pressable>}
                        </View>
                        <Pressable onPress={() => { setSearchVisible(false); setSearchQuery(''); }} style={styles.cancelSearch}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </Pressable>
                    </View>
                ) : (
                    /* Store Header - Standardized */
                    <View style={styles.headerTop}>
                        <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                            <ArrowLeft size={24} color="#1F2937" strokeWidth={2.5} />
                        </Pressable>
                        <View style={styles.headerRight}>
                            <Pressable style={styles.headerIconButton} onPress={() => { }}>
                                <Share2 size={24} color="#1F2937" />
                            </Pressable>
                            <Pressable style={styles.headerIconButton} onPress={() => { }}>
                                <MoreVertical size={24} color="#1F2937" />
                            </Pressable>
                        </View>
                    </View>
                )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Profile Banner Section */}
                <View style={styles.profileSection}>
                    <Image source={{ uri: safeImageUri(store.banner, PLACEHOLDER_BANNER) }} style={styles.bannerImage} resizeMode="cover" />
                    <View style={styles.overlay} />

                    <View style={styles.storeInfoContent}>
                        <View style={styles.mainInfo}>
                            <View style={styles.logoContainer}>
                                <Text style={styles.logoText}>{store.logo}</Text>
                            </View>
                            <View style={styles.textInfo}>
                                <View style={styles.nameLockup}>
                                    <Text style={styles.storeName}>{storeData.name}</Text>
                                    {storeData.verified && <CheckCircle2 size={16} color="#3B82F6" fill="#FFF" />}
                                </View>
                                <View style={styles.locationRow}>
                                    <MapPin size={12} color="#FFF" />
                                    <Text style={styles.locationText} numberOfLines={1}>
                                        {[
                                            storeData.business_profile?.address_line_1,
                                            storeData.city || storeData.business_profile?.city,
                                            storeData.province || storeData.business_profile?.province
                                        ].filter(Boolean).join(', ') || storeData.location || "Address not available"}
                                    </Text>
                                </View>
                                <View style={styles.metricsRow}>
                                    <Text style={styles.metricText}><Text style={styles.metricBold}>{storeData.rating}</Text> Rating</Text>
                                    <View style={styles.divider} />
                                    <Text style={styles.metricText}><Text style={styles.metricBold}>{followerCount > 1000 ? (followerCount / 1000).toFixed(1) + 'k' : followerCount}</Text> Followers</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.actionButtons}>
                            <Pressable
                                style={[styles.followButton, isFollowing && styles.followingButton]}
                                onPress={handleFollow}
                            >
                                {isFollowing ? (
                                    <>
                                        <Check size={16} color="#FFF" style={{ marginRight: 4 }} />
                                        <Text style={styles.followButtonText}>Following</Text>
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={16} color="#FFF" style={{ marginRight: 4 }} />
                                        <Text style={styles.followButtonText}>Follow</Text>
                                    </>
                                )}
                            </Pressable>
                            <Pressable style={styles.chatButton} onPress={handleChat}>
                                <MessageCircle size={18} color="#FFF" style={{ marginRight: 6 }} />
                                <Text style={styles.chatButtonText}>Chat</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* Categories / Tabs simulation */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
                    {['Shop', 'Products', 'Categories', 'About'].map((tab, i) => (
                        <Pressable
                            key={tab}
                            style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                            {activeTab === tab && <View style={styles.activeIndicator} />}
                        </Pressable>
                    ))}
                </ScrollView>

                {/* Dynamic Content */}
                {renderTabContent()}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Store Chat Modal */}
            <StoreChatModal
                visible={chatVisible}
                onClose={() => setChatVisible(false)}
                storeName={store.name}
                sellerId={store.id || store.seller_id}
            />

            {/* Menu Modal */}
            <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
                <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
                    <View style={[styles.menuContainer, { top: insets.top + 60 }]}>
                        <Pressable style={styles.menuItem} onPress={() => { setMenuVisible(false); Alert.alert('Shared', 'Store link copied to clipboard'); }}>
                            <Share2 size={20} color="#374151" />
                            <Text style={styles.menuText}>Share this store</Text>
                        </Pressable>
                        <Pressable style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('HelpSupport'); }}>
                            <Info size={20} color="#374151" />
                            <Text style={styles.menuText}>Store Info</Text>
                        </Pressable>
                        <View style={styles.menuDivider} />
                        <Pressable style={styles.menuItem} onPress={() => { setMenuVisible(false); Alert.alert('Report', 'Store reported to admins.'); }}>
                            <Flag size={20} color="#EF4444" />
                            <Text style={[styles.menuText, { color: '#EF4444' }]}>Report Store</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            {showGuestModal && (
                <GuestLoginModal
                    visible={true}
                    onClose={() => setShowGuestModal(false)}
                    message={guestModalMessage || "Please log in to continue."}
                />
            )}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, zIndex: 10, paddingBottom: 10 },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 0,
        paddingBottom: 10,
        alignItems: 'center',
    },
    headerIconButton: { padding: 4 },
    headerRight: { flexDirection: 'row', gap: 10 },
    searchHeader: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginRight: 0,
        padding: 0,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 100,
        paddingHorizontal: 16,
        height: 40,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#1F2937',
        padding: 0,
    },
    cancelSearch: {
        padding: 4,
    },
    cancelText: {
        color: '#FFF',
        fontWeight: '600',
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
        backgroundColor: COLORS.primary,
        paddingVertical: 10,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    followButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
    followingButton: {
        backgroundColor: '#6B7280', // Gray when following
    },
    chatButton: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 10,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
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
        color: COLORS.primary,
        fontWeight: '700',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 16,
        right: 16,
        height: 3,
        backgroundColor: COLORS.primary,
        borderRadius: 3,
    },
    couponSection: {
        marginTop: 12,
        backgroundColor: '#FFF',
        paddingVertical: 16,
    },
    sectionContainer: {
        marginTop: 12,
        backgroundColor: '#FFF',
        padding: 16,
        minHeight: 300,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    seeAllText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 13,
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
        color: COLORS.primary,
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
        color: COLORS.primary,
        fontWeight: '700',
        fontSize: 12,
    },
    couponCardClaimed: {
        backgroundColor: '#F3F4F6',
        borderColor: '#E5E7EB',
    },
    categoriesList: {
        marginTop: 8,
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    categoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    categoryName: {
        fontSize: 15,
        color: '#374151',
        fontWeight: '500',
    },
    aboutCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        marginTop: 8,
    },
    aboutDescription: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 22,
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    infoText: {
        fontSize: 14,
        color: '#374151',
        flex: 1,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
        width: 60,
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
    },
    // Menu Styles
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    menuContainer: {
        position: 'absolute',
        right: 16,
        backgroundColor: '#FFF',
        borderRadius: 12,
        width: 200,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    menuText: {
        fontSize: 15,
        color: '#374151',
        fontWeight: '500',
    },
    menuDivider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
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
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 14,
        color: '#9CA3AF',
    },
});
