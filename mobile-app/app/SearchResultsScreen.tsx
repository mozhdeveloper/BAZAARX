import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X, ArrowLeft, BadgeCheck, Star, Store } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import { MasonryProductCard } from '../src/components/ProductCard';
import { productService } from '../src/services/productService';
import { sellerService } from '../src/services/sellerService';
import type { Product } from '../src/types';
import { COLORS } from '../src/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'SearchResults'>;

const PAGE_SIZE = 24;
const PLACEHOLDER_IMAGE = 'https://placehold.co/400x400/e5e7eb/6b7280?text=Product';

export default function SearchResultsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = Dimensions.get('window');
  const initialQuery = route.params?.searchQuery || '';

  // Calculate card width for masonry layout
  const cardWidth = (screenWidth - 24 - 12) / 2; // 24 = horizontal padding (12*2), 12 = gap between columns

  // State
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const flashListRef = useRef<any>(null);
  const offsetRef = useRef(0);
  const productsRef = useRef<Product[]>([]);

  // Matched stores — fetched independently so the card shows even while products load
  const [matchedStores, setMatchedStores] = useState<any[]>([]);

  // Execute search
  const executeSearch = useCallback(async (query: string, reset = true) => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      if (reset) {
        setProducts([]);
        setSearchPerformed(false);
      }
      return;
    }

    try {
      if (reset) {
        setIsLoading(true);
        setOffset(0);
        offsetRef.current = 0;
        setProducts([]);
        productsRef.current = [];
      } else {
        setIsLoadingMore(true);
      }

      const currentOffset = reset ? 0 : offsetRef.current;

      console.log('[SearchResultsScreen] Executing search:', trimmedQuery, 'offset:', currentOffset);

      // Use enhanced search that includes category and seller matching
      const serverResults = await productService.searchProducts(trimmedQuery, {
        limit: PAGE_SIZE,
        offset: currentOffset,
      });

      console.log('[SearchResultsScreen] Server returned', serverResults?.length || 0, 'products for query:', trimmedQuery);

      // Normalize products
      const normalizedProducts = serverResults.map((row: any) => {
        const rawImages: any[] = Array.isArray(row.images) ? row.images : [];
        const imageUrls = rawImages
          .map((img: any) => (typeof img === 'string' ? img : img?.image_url))
          .filter((url: unknown): url is string => typeof url === 'string' && url.length > 0);

        const primaryImage =
          rawImages.find((img: any) => typeof img === 'object' && img?.is_primary)?.image_url ||
          row.primary_image_url ||
          row.primary_image ||
          row.image ||
          imageUrls[0] ||
          PLACEHOLDER_IMAGE;

        return {
          ...row,
          id: row.id,
          name: row.name ?? 'Unknown Product',
          price: typeof row.price === 'number' ? row.price : parseFloat(String(row.price || 0)),
          image: primaryImage,
          images: imageUrls.length > 0 ? imageUrls : [primaryImage],
          category: typeof row.category === 'string' ? row.category : (row.category?.name || ''),
          seller: row.seller?.store_name || row.sellerName || 'Verified Seller',
          isFreeShipping: !!(row.is_free_shipping ?? row.isFreeShipping),
        };
      });

      console.log('[SearchResultsScreen] Normalized', normalizedProducts.length, 'products');
      if (normalizedProducts.length > 0) {
        console.log('[SearchResultsScreen] First product:', {
          id: normalizedProducts[0].id,
          name: normalizedProducts[0].name,
          price: normalizedProducts[0].price,
          image: normalizedProducts[0].image,
        });
      }

      if (reset) {
        setProducts(normalizedProducts);
        productsRef.current = normalizedProducts;
        setOffset(PAGE_SIZE);
        offsetRef.current = PAGE_SIZE;
      } else {
        // Filter out duplicates
        const existingIds = new Set(productsRef.current.map(p => p.id));
        const newProducts = normalizedProducts.filter(p => !existingIds.has(p.id));
        setProducts(prev => [...prev, ...newProducts]);
        productsRef.current = [...productsRef.current, ...newProducts];
        setOffset(prev => prev + PAGE_SIZE);
        offsetRef.current += PAGE_SIZE;
      }

      // Check if there are more results
      setHasMore(serverResults.length === PAGE_SIZE);
      setSearchPerformed(true);
    } catch (error) {
      console.error('[SearchResultsScreen] Error executing search:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial search on mount
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      executeSearch(initialQuery, true);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Store search — runs in parallel with product search
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) { setMatchedStores([]); return; }
    let cancelled = false;

    // Fast path: derive from loaded products immediately
    const lowerQ = q.toLowerCase();
    const derivedNow = (() => {
      const map = new Map<string, any>();
      productsRef.current.forEach((p: any) => {
        const name = p.seller?.store_name || p.sellerName || p.seller;
        if (!name || !(name as string).toLowerCase().includes(lowerQ)) return;
        const key = p.seller_id || p.sellerId || `__name__:${(name as string).toLowerCase()}`;
        if (map.has(key)) return;
        const count = (p.seller_id || p.sellerId)
          ? productsRef.current.filter((pp: any) => (pp.seller_id || pp.sellerId) === key).length
          : 0;
        map.set(key, {
          id: key, store_name: name, avatar_url: p.seller?.avatar_url || null,
          is_verified: p.seller?.approval_status === 'verified', rating: null,
          products_count: count > 0 ? count : null,
        });
      });
      return Array.from(map.values());
    })();
    if (derivedNow.length > 0) setMatchedStores(derivedNow);

    (async () => {
      try {
        const apiStores = await sellerService.getPublicStores({ searchQuery: q, includeUnverified: true, limit: 5 } as any);
        if (cancelled) return;
        const merged = new Map<string, any>(
          (apiStores || []).map((s: any) => [
            String(s.id),
            {
              ...s,
              products_count:
                productsRef.current.filter((p: any) => {
                  const pid = p.seller_id || p.sellerId;
                  return pid && pid === String(s.id);
                }).length || s.products_count || null,
            },
          ])
        );
        derivedNow.forEach((store) => {
          if (!merged.has(String(store.id))) merged.set(String(store.id), store);
        });
        if (!cancelled) setMatchedStores(Array.from(merged.values()));
      } catch { /* derived list remains visible */ }
    })();

    return () => { cancelled = true; };
  }, [searchQuery, products]);

  // Handle search submission
  const handleSearch = () => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      executeSearch(trimmedQuery, true);
    }
  };

  // Handle text input change
  const handleTextChange = (text: string) => {
    setSearchQuery(text);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setProducts([]);
    setSearchPerformed(false);
  };

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await executeSearch(searchQuery, true);
  }, [searchQuery, executeSearch]);

  // Load more products (infinite scroll)
  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore && !isLoading && searchQuery.trim()) {
      executeSearch(searchQuery, false);
    }
  }, [hasMore, isLoadingMore, isLoading, searchQuery, executeSearch]);

  // Navigate to product detail
  const handleProductPress = useCallback((product: Product) => {
    navigation.navigate('ProductDetail', { product });
  }, [navigation]);

  // Key extractor for FlashList
  const keyExtractor = useCallback((item: Product) => item.id, []);

  // Render empty state
  const renderEmptyComponent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    if (searchPerformed && products.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Search size={64} color={COLORS.gray400} />
          <Text style={styles.emptyTitle}>No Results Found</Text>
          <Text style={styles.emptyText}>
            We couldn't find any products matching "{searchQuery}". Try different keywords or check the spelling.
          </Text>
        </View>
      );
    }

    if (!searchPerformed) {
      return (
        <View style={styles.emptyContainer}>
          <Search size={64} color={COLORS.gray400} />
          <Text style={styles.emptyTitle}>Search for Products</Text>
          <Text style={styles.emptyText}>
            Enter keywords to find products you're looking for.
          </Text>
        </View>
      );
    }

    return null;
  };

  // Render item
  const renderItem = useCallback(({ item }: { item: Product }) => {
    console.log('[SearchResultsScreen] Rendering item:', item.id, item.name);
    return (
      <View style={{ paddingHorizontal: 6, paddingVertical: 6 }}>
        <MasonryProductCard
          product={item}
          onPress={() => handleProductPress(item)}
          width={cardWidth}
        />
      </View>
    );
  }, [handleProductPress, cardWidth]);

  // Render footer for loading more
  const renderFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoading}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.footerText}>Loading more products...</Text>
        </View>
      );
    }

    if (!hasMore && products.length > 0) {
      return (
        <View style={styles.footerNoMore}>
          <Text style={styles.footerText}>No more products</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </Pressable>

        <View style={styles.searchContainer}>
          <Search size={20} color={COLORS.gray400} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for products, brands..."
            placeholderTextColor={COLORS.gray400}
            value={searchQuery}
            onChangeText={handleTextChange}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus={!initialQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={handleClearSearch} style={styles.clearButton}>
              <X size={20} color={COLORS.gray400} />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={handleSearch}
          style={[
            styles.searchButton,
            !searchQuery.trim() && styles.searchButtonDisabled
          ]}
          disabled={!searchQuery.trim()}
        >
          <Text style={[
            styles.searchButtonText,
            !searchQuery.trim() && styles.searchButtonTextDisabled
          ]}>
            Search
          </Text>
        </Pressable>
      </View>

      {/* Results Info */}
      {searchPerformed && products.length > 0 && (
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            {products.length} result{products.length !== 1 ? 's' : ''} for "{searchQuery}"
          </Text>
        </View>
      )}

      {/* Product List */}
      <FlashList
        ref={flashListRef}
        data={products}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        masonry={true}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          searchPerformed && matchedStores.length > 0 ? (
            <View style={styles.storeSection}>
              <Text style={styles.storeSectionLabel}>
                SHOPS RELATED TO{' '}
                <Text style={styles.storeSectionQuery}>"{searchQuery}"</Text>
              </Text>
              {matchedStores.map((store) => {
                const isNameKey = typeof store.id === 'string' && store.id.startsWith('__name__:');
                const handleStorePress = () => {
                  navigation.navigate('StoreDetail', {
                    store: {
                      ...store,
                      id: isNameKey ? undefined : store.id,
                      name: store.store_name,
                      verified: !!store.is_verified,
                    },
                  } as any);
                };
                return (
                  <Pressable
                    key={store.id}
                    onPress={handleStorePress}
                    style={({ pressed }) => [styles.storeCard, pressed && { opacity: 0.85 }]}
                  >
                    {/* Avatar */}
                    <View style={styles.storeAvatar}>
                      {store.avatar_url ? (
                        <Image
                          source={{ uri: store.avatar_url }}
                          style={styles.storeAvatarImage}
                        />
                      ) : (
                        <Text style={styles.storeAvatarLetter}>
                          {(store.store_name || '?')[0].toUpperCase()}
                        </Text>
                      )}
                    </View>

                    {/* Info */}
                    <View style={styles.storeInfo}>
                      <View style={styles.storeNameRow}>
                        <Text style={styles.storeName} numberOfLines={1}>{store.store_name}</Text>
                        {store.is_verified && (
                          <View style={styles.verifiedBadge}>
                            <BadgeCheck size={10} color="#15803d" />
                            <Text style={styles.verifiedText}>Verified</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.storeSlug} numberOfLines={1}>
                        {(store.store_name || '').toLowerCase().replace(/\s+/g, '')}
                      </Text>
                      <View style={styles.storeStats}>
                        <Text style={styles.statValue}>
                          {store.products_count != null ? store.products_count : '—'}
                          <Text style={styles.statLabel}> Products</Text>
                        </Text>
                        {store.rating != null && Number(store.rating) > 0 && (
                          <View style={styles.statRating}>
                            <Star size={11} color="#FBBF24" fill="#FBBF24" />
                            <Text style={styles.statValue}>
                              {Number(store.rating).toFixed(1)}
                              <Text style={styles.statLabel}> Ratings</Text>
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* CTA */}
                    <Pressable
                      onPress={handleStorePress}
                      style={styles.viewStoreBtn}
                      hitSlop={8}
                    >
                      <Text style={styles.viewStoreBtnText}>View Store</Text>
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          ) : null
        }
        ListEmptyComponent={renderEmptyComponent}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 8,
  },
  searchButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  searchButtonTextDisabled: {
    color: '#9CA3AF',
  },
  resultsInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  resultsText: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 22,
  },
  footerLoading: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  footerNoMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: COLORS.gray500,
  },
  // Store card styles
  storeSection: {
    paddingHorizontal: 4,
    paddingBottom: 16,
  },
  storeSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  storeSectionQuery: {
    color: COLORS.primary,
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  storeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF5F0',
    borderWidth: 2,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  storeAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  storeAvatarLetter: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
  },
  storeInfo: {
    flex: 1,
    minWidth: 0,
  },
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 20,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803d',
  },
  storeSlug: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  storeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontWeight: '400',
    color: '#9CA3AF',
  },
  statRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewStoreBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexShrink: 0,
  },
  viewStoreBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
