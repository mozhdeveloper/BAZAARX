import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, StatusBar, Dimensions, Alert, LayoutAnimation, Platform, UIManager, Modal, TextInput, ActivityIndicator, Clipboard } from 'react-native';
import {
    ChevronLeft, Share2, MoreVertical, Heart, MessageCircle, Star, Search,
    Filter, ShoppingBag, Info, X, MapPin, ExternalLink, ShieldCheck, Zap,
    Camera, Phone, User, CheckCircle2, Menu, ChevronDown, Check, Flag, Calendar,
    ArrowLeft, MoreHorizontal, Grid, UserPlus, Loader2, Palmtree
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ProductCard } from '../src/components/ProductCard';
import { trendingProducts } from '../src/data/products'; // Placeholder products
import { LinearGradient } from 'expo-linear-gradient';
import StoreChatModal from '../src/components/StoreChatModal';
import { COLORS } from '../src/constants/theme';

import { useAuthStore } from '../src/stores/authStore';
import { GuestLoginModal } from '../src/components/GuestLoginModal';
import { sellerService } from '../src/services/sellerService';
import { productService } from '../src/services/productService';
import { reviewService } from '../src/services/reviewService';
import { DiscountService } from '../src/services/discountService';
import { safeImageUri, PLACEHOLDER_BANNER } from '../src/utils/imageUtils';

const { width } = Dimensions.get('window');

const CountdownTimer = ({ endDate }: { endDate: Date }) => {
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const diff = new Date(endDate).getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft("Ended");
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            if (days > 0) {
                setTimeLeft(`${days}d ${hours}h ${minutes}m`);
            } else {
                const pad = (n: number) => n < 10 ? `0${n}` : n;
                setTimeLeft(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
            }
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(interval);
    }, [endDate]);

    return (
        <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{timeLeft}</Text>
        </View>
    );
};

export default function StoreDetailScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { store } = route.params || {};

    if (!store) {
        return (
            <View style={styles.container}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#7C2D12' }}>Store information not available</Text>
                    <Pressable onPress={() => navigation.goBack()} style={{ padding: 10, marginTop: 10 }}>
                        <Text style={{ color: '#FB8C00' }}>Go Back</Text>
                    </Pressable>
                </View>
            </View>
        );
    }
    const BRAND_COLOR = COLORS.primary;

    const { isGuest, user } = useAuthStore();

    // State
    const [storeData, setStoreData] = useState<any>(store);
    const [followerCount, setFollowerCount] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);
    const [storeCategories, setStoreCategories] = useState<string[]>([]);

    const [activeTab, setActiveTab] = useState('Shop');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [sortBy, setSortBy] = useState('Popular');
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    const [searchVisible, setSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [menuVisible, setMenuVisible] = useState(false);
    const [chatVisible, setChatVisible] = useState(false);
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [guestModalMessage, setGuestModalMessage] = useState('');

    // Real products state
    const [realProducts, setRealProducts] = useState<any[]>([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [reviews, setReviews] = useState<any[]>([]);
    const [reviewFilter, setReviewFilter] = useState('All');
    const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);

    // Fetch refreshed store details regularly/on change
    const [refreshing, setRefreshing] = useState(false);

    const [vouchers, setVouchers] = useState([
        { id: '1', amount: '₱50 OFF', min: 'Min. Spend ₱500', claimed: false },
        { id: '2', amount: '10% OFF', min: 'Min. Spend ₱1k', claimed: false },
        { id: '3', amount: 'Free Shipping', min: 'Min. Spend ₱300', claimed: false },
    ]);

    // Fetch active discount campaigns (Flash Sales)
    useEffect(() => {
        const fetchCampaigns = async () => {
            if (!store?.id) return;
            try {
                const campaigns = await DiscountService.getInstance().getCampaignsBySeller(store.id);
                // In this schema, a campaign with status 'active' and startsAt < now < endsAt is a flash sale/discount
                const now = new Date();
                const active = (campaigns || []).filter(c =>
                    c.status === 'active' &&
                    new Date(c.startsAt) <= now &&
                    new Date(c.endsAt) > now
                );
                setActiveCampaigns(active);
            } catch (error) {
                console.error('Error fetching campaigns:', error);
            }
        };
        fetchCampaigns();
    }, [store?.id]);

    const scrollRef = React.useRef<ScrollView | null>(null);

    // Auto-scroll to sticky position when filters/tabs change
    useEffect(() => {
        // Only scroll if we are below the sticky threshold or deep in the content
        // This brings the new content into view at the top of the content area
        scrollRef.current?.scrollTo({ y: 150, animated: true });
    }, [activeTab, selectedCategory, sortBy]);

    // Sticky header detection
    const [isHeaderSticky, setIsHeaderSticky] = useState(false);
    const scrollHandler = (event: any) => {
        const y = event.nativeEvent.contentOffset.y;
        setIsHeaderSticky(y >= 145); // Threshold for profileSection height
    };

    // Fetch real store data
    useEffect(() => {
        const fetchStoreData = async () => {
            if (!store?.id) return;
            try {
                // Fetch fresh seller data
                const seller = await sellerService.getSellerById(store.id);
                if (seller) {
                    const logoUrl = seller.avatar_url || (seller as any).avatar || (seller as any).logo || store.logo;
                    const bp = seller.business_profile;

                    // Construct consistent address from business profile - identical to web logic
                    const addressParts = [
                        bp?.address_line_1,
                        bp?.city || seller.city,
                        bp?.province || seller.province
                    ].filter(part => part && part.trim() !== "");

                    const fullAddress = addressParts.length > 0
                        ? addressParts.join(', ')
                        : (store.location && store.location !== "Address not available") ? store.location : "Philippines";

                    setStoreData({
                        ...store,
                        ...seller,
                        name: seller.store_name || (bp as any)?.business_name || store.name,
                        location: fullAddress,
                        address: fullAddress, // Add explicit address field
                        description: seller.store_description || bp?.business_type || "",
                        rating: seller.rating || store.rating || 0,
                        logo: logoUrl,
                        is_verified: seller.approval_status === 'verified'
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
                        // Get all images
                        const images = (p as any).images?.map((img: any) =>
                            typeof img === 'string' ? img : img.image_url
                        ).filter(Boolean) || [];

                        // Get primary image or first image
                        const primaryImageStr = (p as any).images?.find((img: any) => img.is_primary)?.image_url
                            || images[0]
                            || 'https://placehold.co/400?text=Product';

                        const primaryImage = safeImageUri(primaryImageStr);

                        // Get category name from join
                        const categoryName = typeof (p as any).category === 'object'
                            ? (p as any).category?.name
                            : ((p as any).category || 'General');

                        return {
                            id: p.id,
                            name: p.name,
                            price: p.price,
                            originalPrice: (p as any).originalPrice || (p as any).original_price || p.price,
                            campaignDiscountType: (p as any).campaignDiscountType,
                            campaignDiscountValue: (p as any).campaignDiscountValue,
                            image: primaryImage,
                            images: images.length > 0 ? images.map((img: string) => safeImageUri(img)) : [primaryImage],
                            rating: (p as any).rating || 5.0,
                            sold: (p as any).sold || (p as any).sales_count || 0,
                            category: categoryName,
                            seller_id: (p as any).seller_id,
                            sellerId: (p as any).seller_id,
                            seller: storeData.name,
                            sellerName: storeData.name,
                            sellerLocation: storeData.location
                        };
                    });
                    setRealProducts(mappedProducts);

                    // Extract unique categories from products
                    const categories = Array.from(new Set(mappedProducts.map(p => p.category))).filter((c): c is string => !!c);
                    setStoreCategories(categories);
                } else {
                    setRealProducts([]);
                    setStoreCategories([]);
                }
            } catch (error) {
                console.error('Error fetching store products:', error);
                setRealProducts([]); // Set empty on error instead of leaving stale data
                setStoreCategories([]);
            } finally {
                setProductsLoading(false);
            }
        };

        fetchProducts();
    }, [store?.id, storeData.name, storeData.location]);

    // Fetch real reviews
    useEffect(() => {
        const fetchReviews = async () => {
            if (!store?.id) return;
            try {
                const data = await reviewService.getSellerReviews(store.id);
                if (data) {
                    const mappedReviews = data.map((rev: any) => ({
                        author: rev.buyerName || 'User',
                        content: rev.comment || '',
                        rating: rev.rating || 5,
                        date: rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : 'Just now',
                        productImage: rev.productImage,
                        variantLabel: rev.variantLabel,
                        productName: rev.productName,
                        authorAvatar: rev.buyerAvatar
                    }));
                    setReviews(mappedReviews);
                }
            } catch (error) {
                console.error('Error fetching reviews:', error);
            }
        };
        fetchReviews();
    }, [store?.id]);

    // Calculate actual average rating from reviews
    const averageRating = useMemo(() => {
        if (!reviews || reviews.length === 0) return (storeData.rating || 4.9).toString();
        const total = reviews.reduce((sum, rev) => sum + (rev.rating || 0), 0);
        return (total / reviews.length).toFixed(1);
    }, [reviews, storeData.rating]);

    // Format follower count to K/M
    const formattedFollowers = useMemo(() => {
        if (followerCount >= 1000000) return (followerCount / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (followerCount >= 1000) return (followerCount / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return followerCount.toString();
    }, [followerCount]);

    // Use real products if available, otherwise fallback to trending products (only if disabled)
    // Actually for store detail we should probably only show real products or empty
    const availableProducts = realProducts;

    // Filter products by search query
    const storeProducts = availableProducts.filter((p: any) =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );



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

    // List of sorting options
    const sortOptions = [
        { label: 'Popular', value: 'Popular' },
        { label: 'Latest', value: 'Latest' },
        { label: 'Price: Low to High', value: 'Price Low to High' },
        { label: 'Price: High to Low', value: 'Price High to Low' },
    ];

    const sortProducts = (products: any[]) => {
        let sorted = [...products];

        // Filter by category
        if (selectedCategory !== 'All') {
            sorted = sorted.filter(p => p.category === selectedCategory);
        }

        // Apply sort
        if (sortBy === 'Popular') {
            sorted.sort((a, b) => (b.sold || 0) - (a.sold || 0));
        } else if (sortBy === 'Price Low to High') {
            sorted.sort((a, b) => a.price - b.price);
        } else if (sortBy === 'Price High to Low') {
            sorted.sort((a, b) => b.price - a.price);
        } else if (sortBy === 'Latest') {
            sorted.sort((a, b) => b.id.localeCompare(a.id));
        }
        return sorted;
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Shop':
                const sortedShopProducts = sortProducts(storeProducts);

                // Get products that are part of active campaigns (Flash Sales)
                const flashSaleProducts = storeProducts.filter(p =>
                    p.campaignDiscountType || p.campaignDiscountValue
                );

                return (
                    <View>
                        {/* Vouchers Section */}
                        <View style={styles.vouchersContainer}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vouchersScrollContent}>
                                {vouchers.map((voucher) => (
                                    <View key={voucher.id} style={[styles.couponCard, voucher.claimed && styles.couponCardClaimed]}>
                                        <View style={styles.couponLeft}>
                                            <Text style={[styles.couponAmount, voucher.claimed && { color: COLORS.textMuted }]}>{voucher.amount}</Text>
                                            <Text style={styles.couponMin}>{voucher.min}</Text>
                                        </View>
                                        <Pressable
                                            style={[styles.claimButton, voucher.claimed && { backgroundColor: '#F3F4F6' }]}
                                            onPress={() => !voucher.claimed && handleClaimVoucher(voucher.id)}
                                            disabled={voucher.claimed}
                                        >
                                            <Text style={[styles.claimText, voucher.claimed && { color: COLORS.textMuted }]}>
                                                {voucher.claimed ? 'Claimed' : 'Claim'}
                                            </Text>
                                        </Pressable>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Flash Sales Section */}
                        {activeCampaigns.length > 0 && flashSaleProducts.length > 0 && (
                            <View style={styles.flashSaleSection}>
                                <View style={styles.flashSaleHeader}>
                                    <View style={styles.flashSaleTitleRow}>
                                        <Zap size={20} color={COLORS.primary} fill={COLORS.primary} />
                                        <Text style={styles.flashSaleTitle}>FLASH SALE</Text>
                                        <CountdownTimer endDate={new Date(activeCampaigns[0].endsAt)} />
                                    </View>
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.flashSaleProductsScroll}>
                                    {flashSaleProducts.map((p) => (
                                        <View key={`flash-${p.id}`} style={styles.flashSaleProductItem}>
                                            <ProductCard
                                                product={{ ...p, isFlashSale: true }}
                                                onPress={() => navigation.navigate('ProductDetail', { product: p })}
                                            />
                                            {/* Flash Sale Progress Bar (Optional context) */}
                                            <View style={styles.flashProgressBg}>
                                                <View style={[styles.flashProgressFill, { width: '45%' }]} />
                                                <View style={styles.flashProgressOverlay}>
                                                    <Text style={styles.flashProgressText}>45% SOLD</Text>
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* Products Grid */}
                        <View style={styles.productsContainer}>
                            <View style={styles.grid}>
                                {sortedShopProducts.map((p) => (
                                    <View key={p.id} style={styles.productWrapper}>
                                        <ProductCard product={p} onPress={() => navigation.navigate('ProductDetail', { product: p })} />
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                );
            case 'Products':
                const sortedAllProducts = sortProducts(availableProducts);
                return (
                    <View style={styles.productsContainer}>
                        <Text style={styles.sectionTitle}>All Products ({sortedAllProducts.length})</Text>
                        {productsLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#FB8C00" />
                                <Text style={styles.loadingText}>Loading products...</Text>
                            </View>
                        ) : sortedAllProducts.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No products available under this filter</Text>
                            </View>
                        ) : (
                            <View style={styles.grid}>
                                {sortedAllProducts.map((p) => (
                                    <View key={p.id} style={styles.productWrapper}>
                                        <ProductCard product={p} onPress={() => navigation.navigate('ProductDetail', { product: p })} />
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                );
            case 'Reviews':
                // Calculate rating distribution
                const totalReviews = reviews.length;

                const stats = [5, 4, 3, 2, 1].map(star => {
                    const count = reviews.filter(rev => Math.floor(rev.rating) === star).length;
                    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                    return { star, count, percentage };
                });

                const filteredReviews = reviews.filter(rev => {
                    if (reviewFilter === 'All') return true;
                    return Math.floor(rev.rating) === parseInt(reviewFilter);
                });

                return (
                    <View style={styles.sectionContainer}>
                        {/* Rating Summary Header (Web Parity) */}
                        <View style={styles.ratingSummaryCard}>
                            <View style={styles.ratingOverview}>
                                <Text style={styles.ratingBigNumber}>{averageRating}</Text>
                                <View style={styles.ratingStarsRow}>
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            size={16}
                                            color={i < Math.floor(Number(averageRating)) ? "#FABB18" : COLORS.gray300}
                                            fill={i < Math.floor(Number(averageRating)) ? "#FABB18" : COLORS.gray300}
                                        />
                                    ))}
                                </View>
                                <Text style={styles.ratingCountSub}>{totalReviews} reviews</Text>
                            </View>

                            <View style={styles.ratingBarsColumn}>
                                {stats.map((stat) => (
                                    <View key={stat.star} style={styles.ratingBarRow}>
                                        <Text style={styles.ratingBarLabel}>{stat.star}</Text>
                                        <Star size={10} color="#FABB18" fill="#FABB18" style={{ marginRight: 4 }} />
                                        <View style={styles.ratingBarBg}>
                                            <View style={[styles.ratingBarFill, { width: `${stat.percentage}%` }]} />
                                        </View>
                                        <Text style={styles.ratingBarPercent}>{Math.round(stat.percentage)}%</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Review Filters (Web Parity) */}
                        <View style={styles.reviewFilterGrid}>
                            {['All', '5 Stars', '4 Stars', '3 Stars', '2 Stars', '1 Star'].map((filter) => {
                                const isActive = (filter === 'All' && reviewFilter === 'All') ||
                                    (filter.startsWith(reviewFilter) && filter !== 'All' && reviewFilter !== 'All');

                                let count = totalReviews;
                                if (filter !== 'All') {
                                    const star = parseInt(filter);
                                    count = stats.find(s => s.star === star)?.count || 0;
                                }

                                return (
                                    <Pressable
                                        key={filter}
                                        style={[styles.reviewFilterGridItem, isActive && styles.reviewFilterTagActive]}
                                        onPress={() => {
                                            if (filter === 'All') setReviewFilter('All');
                                            else setReviewFilter(filter[0]);
                                        }}
                                    >
                                        <Text style={[styles.reviewFilterText, isActive && styles.reviewFilterTextActive]}>
                                            {filter} ({count})
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <View style={styles.reviewsList}>
                            {filteredReviews.length > 0 ? (
                                filteredReviews.map((rev, index) => (
                                    <View key={index} style={styles.reviewItem}>
                                        <View style={styles.reviewHeader}>
                                            <View style={styles.reviewAuthorRow}>
                                                <View style={styles.reviewAvatar}>
                                                    {rev.authorAvatar ? (
                                                        <Image
                                                            source={{ uri: rev.authorAvatar }}
                                                            style={styles.reviewAvatarImage}
                                                        />
                                                    ) : (
                                                        <Text style={styles.avatarText}>{rev.author.charAt(0).toUpperCase()}</Text>
                                                    )}
                                                </View>
                                                <View>
                                                    <Text style={styles.reviewAuthor}>{rev.author}</Text>
                                                    <View style={styles.reviewRating}>
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} size={12} color={i < rev.rating ? "#FABB18" : COLORS.gray300} fill={i < rev.rating ? "#FABB18" : COLORS.gray300} />
                                                        ))}
                                                    </View>
                                                </View>
                                            </View>
                                            <Text style={styles.reviewDate}>{rev.date}</Text>
                                        </View>
                                        <Text style={styles.reviewContent}>{rev.content}</Text>

                                        {(rev.productImage || rev.productName || rev.variantLabel) && (
                                            <View style={styles.reviewProductContext}>
                                                {rev.productImage && (
                                                    <Image
                                                        source={{ uri: rev.productImage }}
                                                        style={styles.reviewProductThumb}
                                                        resizeMode="cover"
                                                    />
                                                )}
                                                <View style={{ flex: 1 }}>
                                                    {rev.productName && (
                                                        <Text style={styles.reviewProductName} numberOfLines={1}>
                                                            {rev.productName}
                                                        </Text>
                                                    )}
                                                    {rev.variantLabel && (
                                                        <Text style={styles.reviewVariantLabel} numberOfLines={1}>
                                                            Variation: {rev.variantLabel}
                                                        </Text>
                                                    )}
                                                </View>
                                            </View>
                                        )}

                                        {rev.images && rev.images.length > 0 && (
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImagesScroll}>
                                                {rev.images.map((img: string, i: number) => (
                                                    <Image key={i} source={{ uri: img }} style={styles.reviewImageThumb} />
                                                ))}
                                            </ScrollView>
                                        )}
                                    </View>
                                ))
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <Star size={48} color={COLORS.gray200} />
                                    <Text style={styles.emptyTitle}>No Reviews Yet</Text>
                                    <Text style={styles.emptyText}>Be the first to review products from this store!</Text>
                                </View>
                            )}
                        </View>
                    </View>
                );
            case 'About':
                return (
                    <View style={styles.sectionContainer}>
                        <View style={styles.aboutCard}>
                            {storeData.description ? (
                                <>
                                    <Text style={styles.aboutDescription}>{storeData.description}</Text>
                                    <View style={styles.divider} />
                                </>
                            ) : null}

                            <View style={styles.infoRow}>
                                <MapPin size={16} color={COLORS.gray400} />
                                <Text style={styles.infoLabel}>Location</Text>
                                <Text style={styles.infoText}>{storeData.location || "Philippines"}</Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Star size={16} color={COLORS.gray400} />
                                <Text style={styles.infoLabel}>Ratings</Text>
                                <Text style={styles.infoText}>
                                    {averageRating} out of 5 ({reviews.length} reviews)
                                </Text>
                            </View>

                            <View style={styles.infoRow}>
                                <CheckCircle2 size={16} color={COLORS.gray400} />
                                <Text style={styles.infoLabel}>Verified</Text>
                                <Text style={styles.infoText}>Verified Official Store</Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Calendar size={16} color={COLORS.gray400} />
                                <Text style={styles.infoLabel}>Joined</Text>
                                <Text style={styles.infoText}>
                                    {new Date(storeData.created_at || store.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                </Text>
                            </View>

                            <View style={styles.infoRow}>
                                <ShoppingBag size={16} color={COLORS.gray400} />
                                <Text style={styles.infoLabel}>Products</Text>
                                <Text style={styles.infoText}>{storeProducts.length} Products</Text>
                            </View>

                            <Pressable
                                style={[styles.infoRow, { marginBottom: 0 }]}
                                onPress={() => {
                                    const link = `bazaarx.com/store/${storeData.slug || store.slug || storeData.id}`;
                                    Clipboard.setString(link);
                                    Alert.alert('Link Copied', 'Store link has been copied to your clipboard.');
                                }}
                            >
                                <ExternalLink size={16} color={COLORS.gray400} />
                                <Text style={styles.infoLabel}>Shop Link</Text>
                                <Text style={[styles.infoText, { color: COLORS.primary, textDecorationLine: 'underline' }]} numberOfLines={1}>
                                    bazaarx.com/store/{storeData.slug || store.slug || storeData.name?.toLowerCase().replace(/\s+/g, '-')}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Custom Header */}
            <LinearGradient
                colors={['#FFFBF0', '#FFFDF9']}
                style={[styles.header, { paddingTop: insets.top }, searchVisible && { backgroundColor: COLORS.white, paddingBottom: 12 }]}
            >
                {searchVisible ? (
                    <View style={styles.searchHeader}>
                        <View style={styles.searchBar}>
                            <Search size={18} color={COLORS.gray400} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder={`Search in ${store.name}`}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                                placeholderTextColor={COLORS.gray400}
                            />
                            {searchQuery.length > 0 && <Pressable onPress={() => setSearchQuery('')}><X size={18} color={COLORS.gray400} /></Pressable>}
                        </View>
                        <Pressable onPress={() => { setSearchVisible(false); setSearchQuery(''); }} style={styles.cancelSearch}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.headerTop}>
                        <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                            <ChevronLeft size={24} color={COLORS.textHeadline} strokeWidth={2.5} />
                        </Pressable>
                        <View style={styles.headerRight}>
                            <Pressable style={styles.headerIconButton} onPress={() => { }}>
                                <Share2 size={24} color={COLORS.textHeadline} />
                            </Pressable>
                            <Pressable style={styles.headerIconButton} onPress={() => setMenuVisible(true)}>
                                <MoreVertical size={24} color={COLORS.textHeadline} />
                            </Pressable>
                        </View>
                    </View>
                )}
            </LinearGradient>

            <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[1]}
                scrollEventThrottle={16}
                onScroll={scrollHandler}
                removeClippedSubviews={false}
            >
                {/* Profile Banner Section */}
                <View style={styles.profileSection}>
                    <Image source={{ uri: safeImageUri(store.banner, PLACEHOLDER_BANNER) }} style={styles.bannerImage} resizeMode="cover" />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)']}
                        style={styles.overlay}
                    />

                    <View style={styles.storeInfoContent}>
                        <View style={styles.mainInfo}>
                            <View style={styles.logoContainer}>
                                {storeData.logo ? (
                                    <Image
                                        source={{ uri: safeImageUri(storeData.logo) }}
                                        style={{ width: '100%', height: '100%', borderRadius: 50 }}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <Text style={styles.logoText}>{storeData.name?.substring(0, 1).toUpperCase() || 'S'}</Text>
                                )}
                                {storeData.is_verified && (
                                    <View style={[styles.verifiedBadgeRow, { position: 'absolute', bottom: 0, right: 0, borderRadius: 10, paddingHorizontal: 0, paddingVertical: 0, width: 20, height: 20 }]}>
                                        <CheckCircle2 size={16} color={COLORS.white} fill={COLORS.success} />
                                    </View>
                                )}
                            </View>
                            <View style={styles.textInfo}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                                    <Text style={styles.storeName}>{storeData.name}</Text>

                                </View>

                                <View style={styles.statsRow}>
                                    <Text style={styles.statsText}>{storeData.location || 'Philippines'}</Text>
                                    <Text style={styles.statsText}>   Est. 2026</Text>
                                </View>

                                <View style={[styles.headerStatsButtonsRow, { marginTop: 12 }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Star size={14} color="#FABB18" fill="#FABB18" />
                                        <Text style={styles.ratingNumber}>{averageRating}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 16 }}>
                                        <Text style={styles.ratingNumber}>{formattedFollowers}</Text>
                                        <Text style={styles.ratingLabel}> Followers</Text>
                                    </View>

                                    <View style={styles.rowActionButtons}>
                                        <Pressable
                                            style={[styles.followButtonRow, isFollowing && styles.followingButton]}
                                            onPress={handleFollow}
                                        >
                                            <Text style={styles.followButtonTextRow}>
                                                {isFollowing ? 'Following' : 'Follow'}
                                            </Text>
                                        </Pressable>
                                        <Pressable style={styles.chatButtonRow} onPress={handleChat}>
                                            <Text style={styles.chatButtonTextRow}>Chat</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>

                    {storeData.is_vacation_mode && (
                        <View style={styles.vacationBadgePosition}>
                            <View style={styles.vacationBadge}>
                                <Palmtree size={12} color="#FFFFFF" />
                                <Text style={styles.vacationBadgeText}>ON VACATION</Text>
                            </View>
                        </View>
                    )}
                </View>



                {/* Categories / Tabs simulation */}
                <View style={[
                    styles.stickyHeaderContainer,
                    isHeaderSticky && { elevation: 6 }
                ]}>
                    <View style={[
                        styles.tabsWrapper,
                        isHeaderSticky && { borderBottomWidth: 1, borderBottomColor: COLORS.gray100 }
                    ]}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
                            {['Shop', 'Products', 'Reviews', 'About'].map((tab) => (
                                <Pressable
                                    key={tab}
                                    style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}
                                    onPress={() => {
                                        setActiveTab(tab);
                                        if (tab === 'Shop' || tab === 'Products') {
                                            setSelectedCategory('All');
                                            setSortBy('Popular');
                                        }
                                    }}
                                >
                                    <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Unified Sticky Filter Bar */}
                    {(activeTab === 'Shop' || activeTab === 'Products') && (
                        <View style={[
                            styles.filterBar,
                            {
                                backgroundColor: COLORS.white,
                                borderBottomWidth: isHeaderSticky ? 1 : 0,
                                borderBottomColor: COLORS.gray100,
                                paddingVertical: 10,
                                marginBottom: 0
                            }
                        ]}>
                            <Pressable style={styles.sortButton} onPress={() => setShowCategoryModal(true)}>
                                <Menu size={16} color={COLORS.gray600} />
                                <Text style={styles.sortButtonText}>{selectedCategory}</Text>
                            </Pressable>
                            <View style={{ flex: 1 }}>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={{ flex: 1 }}
                                    contentContainerStyle={styles.filterScroll}
                                    nestedScrollEnabled={true}
                                >
                                    {sortOptions.map((option, index) => (
                                        <Pressable
                                            key={option.value}
                                            onPress={() => setSortBy(option.value)}
                                            style={[
                                                styles.filterTag,
                                                sortBy === option.value && styles.filterTagActive,
                                                index === sortOptions.length - 1 && { borderRightWidth: 0 }
                                            ]}
                                        >
                                            <Text style={[styles.filterTagText, sortBy === option.value && styles.filterTagTextActive]}>{option.label}</Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>
                    )}
                </View>

                {/* Vacation Mode Banner - Below Sticky Header */}
                {storeData.is_vacation_mode && (activeTab === 'Shop' || activeTab === 'Products') && (
                    <View style={styles.vacationBanner}>
                        <Palmtree size={20} color="#EA580C" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.vacationBannerTitle}>This store is currently on vacation</Text>
                            <Text style={styles.vacationBannerSubtitle}>Products are available to view but cannot be purchased at this time.</Text>
                        </View>
                    </View>
                )}

                {/* Dynamic Content */}
                <View style={styles.contentContainer}>
                    {renderTabContent()}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            <StoreChatModal
                visible={chatVisible}
                onClose={() => setChatVisible(false)}
                storeName={storeData.name || store.name}
                sellerId={store.id || store.seller_id}
            />

            {/* Menu Modal */}
            <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
                <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
                    <View style={[styles.menuContainer, { top: insets.top + 60 }]}>
                        <Pressable style={styles.menuItem} onPress={() => { setMenuVisible(false); Alert.alert('Shared', 'Store link copied to clipboard'); }}>
                            <Share2 size={20} color={COLORS.textHeadline} />
                            <Text style={styles.menuText}>Share this store</Text>
                        </Pressable>
                        <Pressable style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('HelpSupport'); }}>
                            <Info size={20} color={COLORS.textHeadline} />
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
            {/* Categories Modal */}
            <Modal visible={showCategoryModal} transparent animationType="fade" statusBarTranslucent={true} onRequestClose={() => setShowCategoryModal(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowCategoryModal(false)} />
            </Modal>

            <Modal visible={showCategoryModal} transparent animationType="slide" statusBarTranslucent={true} onRequestClose={() => setShowCategoryModal(false)}>
                <Pressable style={[styles.modalOverlay, { backgroundColor: 'transparent' }]} onPress={() => setShowCategoryModal(false)}>
                    <View style={styles.sortModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Categories</Text>
                            <Pressable onPress={() => setShowCategoryModal(false)}>
                                <X size={24} color={COLORS.textHeadline} />
                            </Pressable>
                        </View>

                        <View style={styles.optionsList}>
                            {['All', ...storeCategories].map((cat) => (
                                <Pressable
                                    key={cat}
                                    style={styles.optionItem}
                                    onPress={() => {
                                        setSelectedCategory(cat);
                                        setSortBy('Popular');
                                        setShowCategoryModal(false);
                                    }}
                                >
                                    <Text style={[styles.optionText, selectedCategory === cat && styles.optionTextActive]}>
                                        {cat}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { paddingHorizontal: 16, zIndex: 200, paddingBottom: 8 },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 0,
        paddingBottom: 8,
        alignItems: 'center',
    },
    headerIconButton: { padding: 4 },
    headerRight: { flexDirection: 'row', gap: 12 },
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
        backgroundColor: COLORS.gray100,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 40,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: COLORS.textHeadline,
        marginLeft: 8,
    },
    cancelSearch: { paddingVertical: 8 },
    cancelText: { color: COLORS.primary, fontWeight: '600' },

    profileSection: { height: 150, width: '100%', position: 'relative' },
    bannerImage: { width: '100%', height: '100%' },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    storeInfoContent: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
    },
    mainInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    logoContainer: {
        width: 75,
        height: 75,
        borderRadius: 37.5,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.white,
        marginRight: 16,
        position: 'relative'
    },
    logoText: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
    verifiedBadgeRow: {
        backgroundColor: COLORS.white,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    verifiedText: {
        color: COLORS.success,
        fontSize: 10,
        fontWeight: '900',
    },
    vacationBadgePosition: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20
    },
    vacationBadge: {
        backgroundColor: '#EA580C',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 0,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3
    },
    vacationBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
    },
    vacationBanner: {
        backgroundColor: '#FFF7ED',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFEDD5',
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 0,
    },
    vacationBannerTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#C2410C',
    },
    vacationBannerSubtitle: {
        fontSize: 12,
        color: '#EA580C',
        marginTop: 2,
    },
    textInfo: { flex: 1, justifyContent: 'center' },
    storeName: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.white,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    statsText: { fontSize: 13, color: COLORS.white, opacity: 0.9, fontWeight: '500' },
    ratingNumber: { fontSize: 13, color: COLORS.white, opacity: 0.9, fontWeight: '500' },
    ratingLabel: { fontSize: 13, color: COLORS.white, opacity: 0.9, fontWeight: '500' },
    headerStatsButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    rowActionButtons: {
        flexDirection: 'row',
        gap: 8,
        marginLeft: 'auto',
    },
    followButtonRow: {
        backgroundColor: COLORS.accent,
        paddingHorizontal: 12,
        height: 28,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 70,
    },
    followingButton: { backgroundColor: COLORS.accent },
    followButtonTextRow: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: 'bold',
    },
    chatButtonRow: {
        height: 28,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    chatButtonTextRow: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 12,
    },
    shareIconButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    },

    stickyHeaderContainer: {
        zIndex: 100,
        backgroundColor: COLORS.white,
    },
    tabsWrapper: {
        backgroundColor: COLORS.white,
    },
    tabsScroll: {},
    tabsContent: {
        paddingHorizontal: 16,
        flexGrow: 1,
        justifyContent: 'center'
    },
    tabItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        position: 'relative'
    },
    tabText: { fontSize: 14, fontWeight: '600', color: COLORS.gray900 },
    activeTabText: { color: COLORS.primary },
    activeTabItem: {
        borderBottomWidth: 2,
        borderBottomColor: COLORS.primary
    },

    contentContainer: { flex: 1 },
    sectionContainer: { padding: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textHeadline, marginBottom: 8 },

    vouchersContainer: {
        backgroundColor: COLORS.white,
        marginHorizontal: 16,
        marginTop: 12,
        paddingTop: 10,
        paddingBottom: 10,
        borderRadius: 12,
        borderWidth: 0,
        overflow: 'hidden'
    },
    vouchersScrollContent: {
        paddingHorizontal: 16,
    },
    couponSection: { paddingTop: 0, paddingBottom: 0 },
    couponCard: {
        width: width * 0.7,
        flexDirection: 'row',
        backgroundColor: COLORS.primarySoft,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: COLORS.primary,
        marginRight: 12,
        height: 80,
    },
    couponCardClaimed: { backgroundColor: COLORS.gray100, borderColor: COLORS.gray300 },
    couponLeft: { flex: 1, padding: 12, justifyContent: 'center' },
    couponAmount: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
    couponMin: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    claimButton: {
        width: 70,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderTopRightRadius: 10,
        borderBottomRightRadius: 10,
    },
    claimText: { color: COLORS.white, fontWeight: 'bold', fontSize: 12 },

    productsContainer: { padding: 16 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    seeAllText: { color: COLORS.primary, fontWeight: '600' },

    flashSaleSection: {
        backgroundColor: COLORS.white,
        marginTop: 12,
        paddingVertical: 16,
        paddingBottom: 24,
        marginBottom: 0,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray100
    },
    flashSaleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 16
    },
    flashSaleTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    flashSaleTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.primary,
        fontStyle: 'italic',
        letterSpacing: 0.5
    },
    timerContainer: {
        backgroundColor: COLORS.primarySoft,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        marginLeft: 8,
        borderWidth: 1,
        borderColor: COLORS.primary
    },
    timerText: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: '800',
        fontVariant: ['tabular-nums']
    },
    flashSaleProductsScroll: {
        paddingHorizontal: 16,
        gap: 12
    },
    flashSaleProductItem: {
        width: 160,
    },
    flashProgressBg: {
        height: 18,
        backgroundColor: COLORS.primarySoft,
        borderRadius: 10,
        marginTop: 10,
        overflow: 'hidden',
        position: 'relative',
        justifyContent: 'center'
    },
    flashProgressFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        backgroundColor: COLORS.primary,
        borderRadius: 10
    },
    flashProgressOverlay: {
        width: '100%',
        alignItems: 'center'
    },
    flashProgressText: {
        fontSize: 9,
        fontWeight: '900',
        color: COLORS.white,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2
    },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
    productWrapper: { width: (width - 44) / 2 },

    filterBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
    filterScroll: {},
    filterTag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRightWidth: 1,
        borderRightColor: COLORS.gray100,
        backgroundColor: 'transparent',
    },
    filterTagActive: {},
    filterTagText: { fontSize: 13, color: COLORS.gray500, fontWeight: '500' },
    filterTagTextActive: { color: COLORS.primary },
    sortModalContent: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
        maxHeight: '80%'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textHeadline
    },
    optionsList: {
        paddingVertical: 10
    },
    optionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12
    },
    optionText: {
        fontSize: 15,
        color: COLORS.textHeadline,
        fontWeight: '500'
    },
    optionTextActive: {
        color: COLORS.primary,
        fontWeight: '700'
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 0,
        paddingRight: 12,
        paddingVertical: 6,
        borderRightWidth: 1,
        borderRightColor: COLORS.gray100,
        gap: 4
    },
    sortButtonText: { fontSize: 13, color: COLORS.gray900, fontWeight: '500' },
    reviewsList: { gap: 8, marginTop: 8 },
    reviewItem: { padding: 10, borderRadius: 12, backgroundColor: COLORS.white },
    reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    reviewAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    reviewAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.gray100, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    reviewAvatarImage: { width: '100%', height: '100%' },
    avatarText: { fontSize: 12, fontWeight: '700', color: COLORS.gray400 },
    reviewAuthor: { fontSize: 13, fontWeight: '600', color: COLORS.textHeadline },
    reviewRating: { flexDirection: 'row', gap: 2, marginTop: 2 },
    reviewContent: { fontSize: 13, color: COLORS.gray600, lineHeight: 18, marginBottom: 4 },
    reviewDate: { fontSize: 11, color: COLORS.textMuted },
    reviewProductContext: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        padding: 6,
        borderRadius: 8,
        marginTop: 8,
        gap: 10
    },
    reviewProductThumb: { width: 32, height: 32, borderRadius: 4 },
    reviewProductName: { fontSize: 13, color: COLORS.textHeadline, fontWeight: '500' },
    reviewVariantLabel: { fontSize: 11, color: COLORS.gray500, flex: 1 },
    reviewImagesScroll: { marginTop: 8, flexDirection: 'row' },
    reviewImageThumb: { width: 80, height: 80, borderRadius: 8, marginRight: 8 },

    ratingSummaryCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        padding: 20,
        borderRadius: 16,
        marginBottom: 8,
        alignItems: 'center',
        gap: 20
    },
    ratingOverview: { alignItems: 'center', width: 100 },
    ratingBigNumber: { fontSize: 36, fontWeight: '800', color: COLORS.textHeadline },
    ratingStarsRow: { flexDirection: 'row', gap: 2, marginVertical: 4 },
    ratingCountSub: { fontSize: 12, color: COLORS.textMuted },
    ratingBarsColumn: { flex: 1, gap: 4 },
    ratingBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    ratingBarLabel: { fontSize: 12, color: COLORS.gray600, width: 12 },
    ratingBarBg: { flex: 1, height: 8, backgroundColor: COLORS.gray100, borderRadius: 4, overflow: 'hidden' },
    ratingBarFill: { height: '100%', backgroundColor: '#FABB18' },
    ratingBarPercent: { fontSize: 11, color: COLORS.textMuted, width: 30, textAlign: 'right' },

    reviewFilterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 2, paddingHorizontal: 4, justifyContent: 'center' },
    reviewFilterGridItem: { width: '31%', paddingVertical: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: 'white' },
    reviewFilterTagActive: { borderColor: COLORS.primary, borderWidth: 1, backgroundColor: 'white' },
    reviewFilterText: { fontSize: 13, color: COLORS.gray400, fontWeight: '500', textAlign: 'center' },
    reviewFilterTextActive: { color: COLORS.primary, fontWeight: '500' },

    emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textHeadline, marginTop: 12, marginBottom: 4 },

    categoriesList: { backgroundColor: COLORS.white, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.gray100 },
    categoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray100
    },
    categoryName: { fontSize: 15, color: COLORS.textHeadline, fontWeight: '500' },

    aboutCard: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 14,
    },
    aboutDescription: { fontSize: 14, color: COLORS.gray600, lineHeight: 20, marginBottom: 10 },
    divider: { height: 1, backgroundColor: COLORS.gray100, marginVertical: 10 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 4, gap: 12 },
    infoLabel: { fontSize: 13, color: COLORS.gray500, width: 80 },
    infoText: { fontSize: 13, color: COLORS.textHeadline, fontWeight: '400', flex: 1 },

    emptyContainer: { padding: 40, alignItems: 'center' },
    emptyText: { color: COLORS.gray400, fontSize: 15 },
    loadingContainer: { padding: 40, alignItems: 'center' },
    loadingText: { marginTop: 12, color: COLORS.gray400 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },

    menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    menuContainer: {
        position: 'absolute',
        right: 20,
        width: 200,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5
    },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
    menuText: { fontSize: 14, color: COLORS.textHeadline, fontWeight: '500' },
    menuDivider: { height: 1, backgroundColor: COLORS.gray100, marginVertical: 4 },
});
