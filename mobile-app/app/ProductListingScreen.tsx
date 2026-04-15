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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X, ArrowLeft } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import { MasonryProductCard } from '../src/components/ProductCard';
import { productService } from '../src/services/productService';
import type { Product } from '../src/types';
import { COLORS } from '../src/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductListing'>;

const PAGE_SIZE = 24;
const PLACEHOLDER_IMAGE = 'https://placehold.co/400x400/e5e7eb/6b7280?text=Product';

export default function ProductListingScreen({ navigation, route }: Props) {
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
        setProducts([]);
      } else {
        setIsLoadingMore(true);
      }

      const currentOffset = reset ? 0 : offset;

      console.log('[ProductListingScreen] Executing search:', trimmedQuery, 'offset:', currentOffset);

      // Use enhanced search that includes category and seller matching
      const serverResults = await productService.searchProducts(trimmedQuery, {
        limit: PAGE_SIZE,
        offset: currentOffset,
      });

      console.log('[ProductListingScreen] Server returned', serverResults?.length || 0, 'products for query:', trimmedQuery);

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

      console.log('[ProductListingScreen] Normalized', normalizedProducts.length, 'products');
      if (normalizedProducts.length > 0) {
        console.log('[ProductListingScreen] First product:', {
          id: normalizedProducts[0].id,
          name: normalizedProducts[0].name,
          price: normalizedProducts[0].price,
          image: normalizedProducts[0].image,
        });
      }

      if (reset) {
        setProducts(normalizedProducts);
        setOffset(PAGE_SIZE);
      } else {
        // Filter out duplicates
        const existingIds = new Set(products.map(p => p.id));
        const newProducts = normalizedProducts.filter(p => !existingIds.has(p.id));
        setProducts(prev => [...prev, ...newProducts]);
        setOffset(prev => prev + PAGE_SIZE);
      }

      // Check if there are more results
      setHasMore(serverResults.length === PAGE_SIZE);
      setSearchPerformed(true);
    } catch (error) {
      console.error('[ProductListingScreen] Error executing search:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [offset, products]);

  // Initial search on mount
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      executeSearch(initialQuery, true);
    } else {
      setIsLoading(false);
    }
  }, []);

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
    console.log('[ProductListingScreen] Rendering item:', item.id, item.name);
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
});
