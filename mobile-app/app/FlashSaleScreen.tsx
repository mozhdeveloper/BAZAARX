import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, FunnelIcon, Search, SlidersHorizontal, Timer, X, Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../App';
import { ProductCard } from '../src/components/ProductCard';
import ProductFilterModal from '../src/components/ProductFilterModal';
import SortModal from '../src/components/SortModal';
import { COLORS } from '../src/constants/theme';
import { discountService } from '../src/services/discountService';
import type { Product } from '../src/types';
import type { ProductFilters, SortOption } from '../src/types/filter.types';
import { DEFAULT_FILTERS } from '../src/types/filter.types';

type Props = NativeStackScreenProps<RootStackParamList, 'FlashSale'>;

const { width } = Dimensions.get('window');

interface BadgeGroup {
    badge: string;
    products: Product[];
    color: string;
    campaignName?: string;
    seller?: string;
}

export default function FlashSaleScreen({ navigation, route }: Props) {
    const insets = useSafeAreaInsets();
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [badgeGroups, setBadgeGroups] = useState<BadgeGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Search, sort, filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState<SortOption>('relevance');
    const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);
    const [showSortModal, setShowSortModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);

    // Countdown timer
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        if (allProducts.length === 0) return;

        const updateTimer = () => {
            const now = new Date().getTime();
            const endTimes = allProducts
                .map(p => new Date((p as any).campaignEndsAt).getTime())
                .filter(t => t > now)
                .sort((a, b) => a - b);

            if (endTimes.length === 0) {
                setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
                return;
            }

            const diff = endTimes[0] - now;
            setTimeLeft({
                hours: Math.floor(diff / (1000 * 60 * 60)),
                minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((diff % (1000 * 60)) / 1000)
            });
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [allProducts]);

    const loadProducts = async () => {
        try {
            const data = await discountService.getGlobalFlashSaleProducts();

            // Deduplicate by product ID
            const seen = new Set<string>();
            const uniqueData = (data || []).filter((p: any) => {
                if (seen.has(p.id)) return false;
                seen.add(p.id);
                return true;
            }).filter((p: any) => {
                const variants = p.variants || [];
                if (variants.length > 0) {
                    const totalVariantStock = variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
                    return totalVariantStock > 0;
                }
                return (p.stock || 0) > 0;
            });

            setAllProducts(uniqueData);

            const groups = uniqueData.reduce((acc: any, product: any) => {
                const badge = product.campaignBadge || 'Flash Sale';
                if (!acc[badge]) {
                    acc[badge] = {
                        badge,
                        color: product.campaignBadgeColor || COLORS.primary,
                        campaignName: product.campaignName,
                        seller: product.seller,
                        products: []
                    };
                }
                acc[badge].products.push(product);
                return acc;
            }, {} as Record<string, BadgeGroup>);

            const sortedGroups = Object.values(groups)
                .filter((g: any) => g.products.length > 0)
                .sort((a: any, b: any) => b.products.length - a.products.length) as BadgeGroup[];

            setBadgeGroups(sortedGroups);
        } catch (err) {
            console.error('Failed to load flash sale products:', err);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await loadProducts();
        setIsRefreshing(false);
    }, []);

    // Extract unique categories from flash sale products for the filter modal
    const availableCategories = useMemo(() => {
        const catMap = new Map<string, string>();
        allProducts.forEach((p: any) => {
            const catName = p.category || '';
            if (catName && !catMap.has(catName)) {
                catMap.set(catName, catName);
            }
        });
        return Array.from(catMap.entries()).map(([name]) => ({
            id: name,
            name,
            path: [name],
            hasChildren: false,
        }));
    }, [allProducts]);

    // Filtered + sorted products
    const filteredProducts = useMemo(() => {
        let result = [...allProducts];

        // Search filter
        const query = searchQuery.trim().toLowerCase();
        if (query) {
            result = result.filter(p => {
                const name = ((p as any).name || '').toLowerCase();
                const category = ((p as any).category || '').toLowerCase();
                const seller = ((p as any).seller || '').toLowerCase();
                return name.includes(query) || category.includes(query) || seller.includes(query);
            });
        }

        // Category filter (from filter modal)
        if (filters.categoryId) {
            result = result.filter(p => {
                const cat = ((p as any).category || '').toLowerCase();
                return cat === filters.categoryId!.toLowerCase();
            });
        }

        // Price range filter
        const min = filters.priceRange.min ?? 0;
        const max = filters.priceRange.max ?? Infinity;
        result = result.filter(p => {
            const price = Number((p as any).price) || 0;
            return price >= min && price <= max;
        });

        // Rating filter
        if (filters.minRating) {
            result = result.filter(p => ((p as any).rating ?? 0) >= filters.minRating!);
        }

        // Free shipping filter
        if (filters.freeShipping) {
            result = result.filter(p => !!(p as any).isFreeShipping || !!(p as any).is_free_shipping);
        }

        // Sort
        switch (sortOption) {
            case 'price-low':
                result.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
                break;
            case 'price-high':
                result.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
                break;
            case 'rating-high':
                result.sort((a, b) => ((b as any).rating ?? 0) - ((a as any).rating ?? 0));
                break;
            case 'newest':
                result.sort((a, b) => new Date((b as any).created_at || 0).getTime() - new Date((a as any).created_at || 0).getTime());
                break;
            case 'best-selling':
                result.sort((a, b) => ((b as any).sold ?? 0) - ((a as any).sold ?? 0));
                break;
            case 'relevance':
            default:
                // Keep original order (biggest discount first is a good default for flash sales)
                result.sort((a, b) => {
                    const discA = (a as any).originalPrice > 0 ? ((a as any).originalPrice - Number(a.price)) / (a as any).originalPrice : 0;
                    const discB = (b as any).originalPrice > 0 ? ((b as any).originalPrice - Number(b.price)) / (b as any).originalPrice : 0;
                    return discB - discA;
                });
                break;
        }

        return result;
    }, [allProducts, searchQuery, sortOption, filters]);

    // Group filtered products by badge for display
    const filteredBadgeGroups = useMemo((): BadgeGroup[] => {
        const groups = filteredProducts.reduce((acc: Record<string, BadgeGroup>, product: any) => {
            const badge = product.campaignBadge || 'Flash Sale';
            if (!acc[badge]) {
                acc[badge] = {
                    badge,
                    color: product.campaignBadgeColor || COLORS.primary,
                    campaignName: product.campaignName,
                    seller: product.seller,
                    products: []
                };
            }
            acc[badge].products.push(product);
            return acc;
        }, {});

        return Object.values(groups)
            .filter(g => g.products.length > 0)
            .sort((a, b) => b.products.length - a.products.length);
    }, [filteredProducts]);

    // Active filter count
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.categoryId) count++;
        if (filters.priceRange.min !== null || filters.priceRange.max !== null) count++;
        if (filters.minRating !== null) count++;
        if (filters.freeShipping) count++;
        if (filters.withVouchers) count++;
        return count;
    }, [filters]);

    // Only show chips row when sort or filter is active (search alone doesn't count)
    const hasChipsToShow = sortOption !== 'relevance' || activeFilterCount > 0;

    const handleFilterApply = useCallback((newFilters: ProductFilters) => {
        setFilters(newFilters);
    }, []);

    const handleSortSelect = useCallback((newSort: SortOption) => {
        setSortOption(newSort);
    }, []);

    const handleClearAll = useCallback(() => {
        setSearchQuery('');
        setSortOption('relevance');
        setFilters({ ...DEFAULT_FILTERS });
    }, []);

    const pad = (n: number) => n.toString().padStart(2, '0');

    return (
        <View style={styles.container}>
            <View style={{ flex: 1, paddingTop: insets.top }}>
                <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

                {/* Header */}
                <LinearGradient
                    colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <View style={styles.headerLeft}>
                        <Pressable
                            style={styles.backIconButton}
                            onPress={() => navigation.goBack()}
                            hitSlop={15}
                        >
                            <ChevronLeft size={28} color={COLORS.textHeadline} strokeWidth={2.5} />
                        </Pressable>
                        <View style={styles.titleWrapper}>
                            <Zap size={18} color={COLORS.primary} fill={COLORS.primary} />
                            <Text style={styles.headerTitle}>Flash Sale</Text>
                        </View>
                    </View>

                    <View style={styles.timerRow}>
                        <Timer size={16} color={COLORS.primary} strokeWidth={2.5} />
                        <View style={styles.timerBox}>
                            <Text style={styles.timerDigit}>{pad(timeLeft.hours)}</Text>
                        </View>
                        <Text style={styles.timerSep}>:</Text>
                        <View style={styles.timerBox}>
                            <Text style={styles.timerDigit}>{pad(timeLeft.minutes)}</Text>
                        </View>
                        <Text style={styles.timerSep}>:</Text>
                        <View style={styles.timerBox}>
                            <Text style={styles.timerDigit}>{pad(timeLeft.seconds)}</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Search bar */}
                <View style={styles.searchRow}>
                    <View style={styles.searchBarInner}>
                        <Search size={16} color={COLORS.gray400} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search flash sale deals..."
                            placeholderTextColor={COLORS.gray400}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                                <X size={16} color={COLORS.gray400} />
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Sort & Filter toolbar */}
                <View style={styles.toolbar}>
                    <Text style={styles.toolbarCount}>
                        {loading ? 'Loading...' : `${filteredProducts.length} deal${filteredProducts.length !== 1 ? 's' : ''}`}
                    </Text>
                    <View style={{ flex: 1 }} />
                    <View style={styles.toolbarButtons}>
                        <Pressable
                            style={[styles.toolbarIconButton, sortOption !== 'relevance' && styles.toolbarIconButtonActive]}
                            onPress={() => setShowSortModal(true)}
                        >
                            <FunnelIcon size={18} color={sortOption !== 'relevance' ? COLORS.primary : COLORS.textPrimary} />
                            {sortOption !== 'relevance' && <View style={styles.toolbarIconBadge} />}
                        </Pressable>
                        <Pressable
                            style={[styles.toolbarIconButton, activeFilterCount > 0 && styles.toolbarIconButtonActive]}
                            onPress={() => setShowFilterModal(true)}
                        >
                            <SlidersHorizontal size={18} color={activeFilterCount > 0 ? COLORS.primary : COLORS.textPrimary} />
                            {activeFilterCount > 0 && (
                                <View style={styles.toolbarIconBadgeCount}>
                                    <Text style={styles.toolbarIconBadgeCountText}>{activeFilterCount}</Text>
                                </View>
                            )}
                        </Pressable>
                    </View>
                </View>

                {/* Products Area — adjust contentContainerStyle paddingTop to control gap between chips/toolbar and first product */}
                <ScrollView
                    style={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40, paddingTop: (searchQuery.trim() || hasChipsToShow) ? 0 : 0 }}
                    bounces={!(searchQuery.trim() || hasChipsToShow)}
                    overScrollMode="never"
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={onRefresh}
                            colors={[COLORS.primary]}
                            tintColor={COLORS.primary}
                            progressViewOffset={0}
                        />
                    }
                >
                    {/* Active filter/sort chips — rendered inside ScrollView so no layout gap */}
                    {hasChipsToShow && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.chipsScroll}>
                            {sortOption !== 'relevance' && (
                                <Pressable onPress={() => setSortOption('relevance')} style={styles.chipPill}>
                                    <Text style={styles.chipPillText}>Sorted</Text>
                                    <X size={10} color="#B45309" />
                                </Pressable>
                            )}
                            {filters.categoryId && (
                                <Pressable
                                    onPress={() => setFilters(prev => ({ ...prev, categoryId: null, categoryPath: [] }))}
                                    style={[styles.chipPill, { backgroundColor: '#EDE9FE', borderColor: '#8B5CF6' }]}
                                >
                                    <Text style={[styles.chipPillText, { color: '#6D28D9' }]}>{filters.categoryId}</Text>
                                    <X size={10} color="#6D28D9" />
                                </Pressable>
                            )}
                            {(filters.priceRange.min !== null || filters.priceRange.max !== null) && (
                                <Pressable
                                    onPress={() => setFilters(prev => ({ ...prev, priceRange: { min: null, max: null } }))}
                                    style={[styles.chipPill, { backgroundColor: '#D1FAE5', borderColor: '#10B981' }]}
                                >
                                    <Text style={[styles.chipPillText, { color: '#065F46' }]}>
                                        ₱{(filters.priceRange.min ?? 0).toLocaleString()} – ₱{(filters.priceRange.max ?? '∞').toLocaleString()}
                                    </Text>
                                    <X size={10} color="#065F46" />
                                </Pressable>
                            )}
                            {filters.minRating !== null && (
                                <Pressable
                                    onPress={() => setFilters(prev => ({ ...prev, minRating: null }))}
                                    style={[styles.chipPill, { backgroundColor: '#FEF9C3', borderColor: '#EAB308' }]}
                                >
                                    <Text style={[styles.chipPillText, { color: '#854D0E' }]}>{filters.minRating}★ & up</Text>
                                    <X size={10} color="#854D0E" />
                                </Pressable>
                            )}
                            {filters.freeShipping && (
                                <Pressable
                                    onPress={() => setFilters(prev => ({ ...prev, freeShipping: false }))}
                                    style={[styles.chipPill, { backgroundColor: '#ECFDF5', borderColor: '#059669' }]}
                                >
                                    <Text style={[styles.chipPillText, { color: '#059669' }]}>Free Shipping</Text>
                                    <X size={10} color="#059669" />
                                </Pressable>
                            )}
                            <Pressable onPress={handleClearAll} style={styles.clearAllChip}>
                                <Text style={styles.clearAllChipText}>Clear all</Text>
                            </Pressable>
                        </ScrollView>
                    )}
                    {/* Hero — hidden when searching, sorting, or filtering so results appear right away */}
                    {!searchQuery.trim() && !hasChipsToShow && (
                        <View style={styles.heroBox}>
                            <Zap size={40} color="#EA580C" fill="#EA580C" style={styles.heroZap} />
                            <Text style={styles.heroTitle}>Limited Time Deals!</Text>
                            <Text style={styles.heroSub}>Exclusive offers created directly by verified sellers.</Text>
                        </View>
                    )}

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text style={styles.loadingText}>Loading deals...</Text>
                        </View>
                    ) : filteredProducts.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Zap size={48} color="#D1D5DB" />
                            <Text style={styles.emptyText}>
                                {allProducts.length === 0
                                    ? 'No flash sale products at the moment'
                                    : 'No deals match your filters'}
                            </Text>
                            {(searchQuery.trim() || hasChipsToShow) && (
                                <Pressable onPress={handleClearAll} style={styles.clearFiltersButton}>
                                    <Text style={styles.clearFiltersButtonText}>Clear All Filters</Text>
                                </Pressable>
                            )}
                        </View>
                    ) : (
                        (searchQuery.trim() || hasChipsToShow) ? (
                            /* Flat grid when searching/filtering — no group headers, products appear right away */
                            /* ── Adjust paddingTop below to control gap between toolbar and first product row ── */
                            <View style={{ paddingHorizontal: CONTAINER_PADDING, paddingTop: 2, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                                {filteredProducts.map((product) => (
                                    <View key={product.id} style={{ width: ITEM_WIDTH, marginBottom: 12 }}>
                                        <ProductCard
                                            product={product}
                                            variant="flash"
                                            onPress={() => navigation.navigate('ProductDetail', { product })}
                                        />
                                    </View>
                                ))}
                            </View>
                        ) : (
                            /* Grouped layout when browsing */
                            <View style={styles.groupsWrapper}>
                                {filteredBadgeGroups.map((group) => (
                                    <View key={group.badge} style={styles.badgeSection}>
                                        <View style={styles.sectionHeader}>
                                            <View style={[styles.badgeIndicator, { backgroundColor: group.color }]} />
                                            <Text style={styles.sectionTitle} numberOfLines={1}>
                                                {group.campaignName && (
                                                    <Text style={{ color: group.color }}>
                                                        {group.campaignName}
                                                    </Text>
                                                )}
                                            </Text>
                                            <View style={styles.sectionLine} />
                                        </View>

                                        <View style={styles.productGrid}>
                                            {group.products.map((product) => (
                                                <View key={product.id} style={styles.productItem}>
                                                    <ProductCard
                                                        product={product}
                                                        variant="flash"
                                                        onPress={() => navigation.navigate('ProductDetail', { product })}
                                                    />
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )
                    )}
                </ScrollView>
            </View>

            {/* Sort Modal */}
            <SortModal
                visible={showSortModal}
                onClose={() => setShowSortModal(false)}
                onSelect={handleSortSelect}
                selectedSort={sortOption}
            />

            {/* Filter Modal */}
            <ProductFilterModal
                visible={showFilterModal}
                onClose={() => setShowFilterModal(false)}
                onApply={handleFilterApply}
                initialFilters={filters}
                hideCategoryFilter={false}
                availableCategories={availableCategories}
                availableBrands={[]}
                hidePromoOptions={['onSale']}
                hideShippingFilter={true}
            />
        </View>
    );
}

const COLUMN_GAP = 16;
const CONTAINER_PADDING = 20;
const ITEM_WIDTH = (width - (CONTAINER_PADDING * 2) - COLUMN_GAP) / 2;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF9F6' },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 15,
        paddingTop: 15,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.3)',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backIconButton: {
        marginLeft: -8,
    },
    titleWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginLeft: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: COLORS.textHeadline,
        letterSpacing: 0.3
    },
    timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF8F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#FDE68A' },
    timerBox: {
        backgroundColor: COLORS.primary,
        borderRadius: 4,
        width: 22,
        height: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerDigit: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
    timerSep: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold', paddingBottom: 2 },

    // Search bar
    searchRow: {
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 2,
        backgroundColor: '#FAF9F6',
    },
    searchBarInner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingHorizontal: 10,
        height: 36,
        gap: 6,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: COLORS.textPrimary,
        paddingVertical: 0,
    },

    // Toolbar
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        backgroundColor: '#FAF9F6',
    },
    toolbarCount: {
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    toolbarButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    toolbarIconButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    toolbarIconButtonActive: {
        backgroundColor: `${COLORS.primary}12`,
    },
    toolbarIconBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
    },
    toolbarIconBadgeCount: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: COLORS.primary,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toolbarIconBadgeCountText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // Filter chips
    // ── Filter chip sizing — adjust padding/fontSize here to resize chips ──
    chipsScroll: {
        paddingHorizontal: 20,
        paddingVertical: 3,   // vertical space around the chip row
        gap: 5,               // horizontal gap between chips
    },
    chipPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        borderWidth: 0.5,
        borderColor: '#F59E0B',
        borderRadius: 10,     // roundness of chip corners
        paddingHorizontal: 6, // left/right inner space
        paddingVertical: 1,   // top/bottom inner space — main height driver
        gap: 2,               // space between label and X icon
        height: 25,           // explicit cap so chips stay tiny
    },
    chipPillText: {
        fontSize: 10,         // chip label size
        fontWeight: '600',
        color: '#B45309',
        lineHeight: 13,       // keep text vertically tight
    },
    clearAllChip: {
        paddingHorizontal: 4,
        paddingVertical: 1,
        justifyContent: 'center',
        height: 22,
    },
    clearAllChipText: {
        fontSize: 10,
        fontWeight: '500',
        color: COLORS.textMuted,
        textDecorationLine: 'underline',
        lineHeight: 13,
    },

    // Content
    scrollContent: { flex: 1 },
    heroBox: {
        padding: 30,
        alignItems: 'center',
        paddingTop: 10,
    },
    heroZap: { marginBottom: 12, shadowColor: '#EA580C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10 },
    heroTitle: { fontSize: 26, fontWeight: '900', color: '#7C2D12', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
    heroSub: { fontSize: 14, color: '#9A3412', textAlign: 'center', paddingHorizontal: 20, fontWeight: '500' },
    loadingContainer: { alignItems: 'center', paddingVertical: 60, flex: 1 },
    loadingText: { fontSize: 16, color: '#6B7280', marginTop: 12 },
    emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyText: { fontSize: 16, color: '#6B7280', textAlign: 'center', paddingHorizontal: 20 },
    clearFiltersButton: {
        marginTop: 12,
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: COLORS.primary,
        borderRadius: 8,
    },
    clearFiltersButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    groupsWrapper: { paddingHorizontal: 0 },
    badgeSection: { marginBottom: 32 },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: CONTAINER_PADDING,
        marginBottom: 16,
        gap: 12,
    },
    badgeIndicator: {
        width: 4,
        height: 20,
        borderRadius: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.textHeadline,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
        marginLeft: 8,
    },
    productGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: CONTAINER_PADDING,
        justifyContent: 'space-between',
    },
    productItem: {
        width: ITEM_WIDTH,
        marginBottom: 20,
        
    },
});
