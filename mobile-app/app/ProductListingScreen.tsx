import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlashList } from '@shopify/flash-list';
import { ArrowLeft, BadgeCheck, ChevronDown, FunnelIcon, Search, SlidersHorizontal, Star, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../App';
import { MasonryProductCard } from '../src/components/ProductCard';
import ProductFilterModal from '../src/components/ProductFilterModal';
import SortModal from '../src/components/SortModal';
import { COLORS } from '../src/constants/theme';
import { discountService } from '../src/services/discountService';
import { productService } from '../src/services/productService';
import { sellerService } from '../src/services/sellerService';
import type { Product } from '../src/types';
import type { ActiveFilterChip, ProductFilters, SortOption } from '../src/types/filter.types';
import { DEFAULT_FILTERS } from '../src/types/filter.types';

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
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [matchedCategory, setMatchedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Filter and sort state
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);
  const [sortOption, setSortOption] = useState<SortOption>('relevance');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [availableBrands, setAvailableBrands] = useState<any[]>([]);

  // Discount map: productId → { price, originalPrice, discountPercent }
  // Built from flash sale sources so discount badges show on search results
  // Use a ref so executeSearch always reads the latest value without needing it as a dependency
  const discountMapRef = useRef<Map<string, { price: number; originalPrice: number; discountPercent: number; campaignName?: string }>>(new Map());

  const flashListRef = useRef<ScrollView>(null);

  // Matched stores — shown above products (Shopee-style store card)
  const [matchedStores, setMatchedStores] = useState<any[]>([]);
  const productsRef = useRef<Product[]>([]);
  productsRef.current = products;

  // Helper: build discount map from flash sale data
  const buildDiscountMap = async (): Promise<Map<string, { price: number; originalPrice: number; discountPercent: number; campaignName?: string }>> => {
    try {
      const [globalFlash, sellerFlash] = await Promise.allSettled([
        discountService.getGlobalFlashSaleProducts(),
        discountService.getFlashSaleProducts(),
      ]);
      const dsMap = new Map<string, { price: number; originalPrice: number; discountPercent: number; campaignName?: string }>();
      const addItems = (items: any[]) => {
        (items || []).forEach((fp: any) => {
          if (fp.id && fp.originalPrice > 0 && fp.price < fp.originalPrice) {
            dsMap.set(fp.id, {
              price: fp.price,
              originalPrice: fp.originalPrice,
              discountPercent: fp.discountBadgePercent || Math.round(((fp.originalPrice - fp.price) / fp.originalPrice) * 100),
              campaignName: fp.campaignName,
            });
          }
        });
      };
      if (globalFlash.status === 'fulfilled') addItems(globalFlash.value);
      if (sellerFlash.status === 'fulfilled') addItems(sellerFlash.value);
      discountMapRef.current = dsMap;
      return dsMap;
    } catch (e) {
      console.error('[ProductListingScreen] Error loading discount map:', e);
      return discountMapRef.current;
    }
  };

  // Load available categories and brands
  const loadFilterOptions = useCallback(async (query: string) => {
    if (!query.trim()) return;

    try {
      const [categories, brands] = await Promise.all([
        productService.getCategoriesWithProducts(),
        productService.getBrandsFromResults(query),
      ]);

      const mappedCategories = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        path: cat.path,
        hasChildren: false,
      }));

      setAvailableCategories(mappedCategories);
      setAvailableBrands(brands);

      return mappedCategories;
    } catch (error) {
      console.error('[ProductListingScreen] Error loading filter options:', error);
      return [];
    }
  }, []);

  // Count active filters
  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (filters.categoryId) count++;
    if (filters.priceRange.min !== null || filters.priceRange.max !== null) count++;
    if (filters.minRating !== null) count++;
    if (filters.shippedFrom) count++;
    if (filters.withVouchers) count++;
    if (filters.onSale) count++;
    if (filters.freeShipping) count++;
    if (filters.preferredSeller) count++;
    if (filters.officialStore) count++;
    if (filters.selectedBrands.length > 0) count++;
    if (filters.standardDelivery || filters.sameDayDelivery || filters.cashOnDelivery || filters.pickupAvailable) count++;
    return count;
  }, [filters]);

  // Generate filter chips
  const getActiveFilterChips = useCallback((): ActiveFilterChip[] => {
    const chips: ActiveFilterChip[] = [];

    if (filters.categoryId) {
      chips.push({
        id: 'category',
        label: `Category: ${filters.categoryPath.join(' > ')}`,
        category: 'category',
        onRemove: () => {
          setFilters(prev => ({ ...prev, categoryId: null, categoryPath: [] }));
        },
      });
    }

    if (filters.priceRange.min !== null || filters.priceRange.max !== null) {
      const min = filters.priceRange.min !== null ? `₱${filters.priceRange.min}` : '₱0';
      const max = filters.priceRange.max !== null ? `₱${filters.priceRange.max}` : '∞';
      chips.push({
        id: 'price',
        label: `Price: ${min} - ${max}`,
        category: 'price',
        onRemove: () => {
          setFilters(prev => ({ ...prev, priceRange: { min: null, max: null } }));
        },
      });
    }

    if (filters.minRating !== null) {
      chips.push({
        id: 'rating',
        label: `${filters.minRating}★ & up`,
        category: 'rating',
        onRemove: () => {
          setFilters(prev => ({ ...prev, minRating: null }));
        },
      });
    }

    if (filters.shippedFrom) {
      chips.push({
        id: 'location',
        label: `Shipped from: ${filters.shippedFrom === 'metro_manila' ? 'Metro Manila' : 'Philippines'}`,
        category: 'location',
        onRemove: () => {
          setFilters(prev => ({ ...prev, shippedFrom: null }));
        },
      });
    }

    if (filters.withVouchers) {
      chips.push({
        id: 'vouchers',
        label: 'With Vouchers',
        category: 'promo',
        onRemove: () => {
          setFilters(prev => ({ ...prev, withVouchers: false }));
        },
      });
    }

    if (filters.onSale) {
      chips.push({
        id: 'sale',
        label: 'On Sale',
        category: 'promo',
        onRemove: () => {
          setFilters(prev => ({ ...prev, onSale: false }));
        },
      });
    }

    if (filters.freeShipping) {
      chips.push({
        id: 'freeShipping',
        label: 'Free Shipping',
        category: 'promo',
        onRemove: () => {
          setFilters(prev => ({ ...prev, freeShipping: false }));
        },
      });
    }

    if (filters.preferredSeller) {
      chips.push({
        id: 'preferredSeller',
        label: 'Preferred Seller',
        category: 'promo',
        onRemove: () => {
          setFilters(prev => ({ ...prev, preferredSeller: false }));
        },
      });
    }

    if (filters.officialStore) {
      chips.push({
        id: 'officialStore',
        label: 'Official Store',
        category: 'promo',
        onRemove: () => {
          setFilters(prev => ({ ...prev, officialStore: false }));
        },
      });
    }

    filters.selectedBrands.forEach(brand => {
      chips.push({
        id: `brand-${brand}`,
        label: `Brand: ${brand}`,
        category: 'brand',
        onRemove: () => {
          setFilters(prev => ({
            ...prev,
            selectedBrands: prev.selectedBrands.filter(b => b !== brand),
          }));
        },
      });
    });

    return chips;
  }, [filters]);

  // Execute search with filters
  const executeSearch = useCallback(async (
    query: string,
    reset = true,
    options?: { filters?: ProductFilters; sortOption?: SortOption },
    categoriesOverride?: { id: string; name: string }[]
  ) => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      if (reset) {
        setProducts([]);
        setCategoryProducts([]);
        setRelatedProducts([]);
        setMatchedCategory(null);
        setSearchPerformed(false);
      }
      return;
    }

    const filtersToUse = options?.filters ?? filters;
    const sortToUse = options?.sortOption ?? sortOption;
    const catsToUse = categoriesOverride ?? availableCategories;

    try {
      if (reset) {
        setIsLoading(true);
        setOffset(0);
        setProducts([]);
        setCategoryProducts([]);
        setRelatedProducts([]);
      } else {
        setIsLoadingMore(true);
      }

      const currentOffset = reset ? 0 : offset;

      // Check if query exactly matches a category name
      const normalizedQuery = trimmedQuery.toLowerCase();
      const matched = reset
        ? catsToUse.find(cat => cat.name.toLowerCase() === normalizedQuery) ?? null
        : null;

      if (reset && matched) {
        // Two separate fetches: strict category products (by ID) + text-search related
        const [categoryResults, relatedResults] = await Promise.all([
          productService.getFilteredProducts(trimmedQuery, {
            categoryId: matched.id,
            priceRange: filtersToUse.priceRange,
            minRating: filtersToUse.minRating,
            shippedFrom: filtersToUse.shippedFrom,
            withVouchers: filtersToUse.withVouchers,
            onSale: false, // Handled client-side after normalization so flash sale discounts are included
            freeShipping: filtersToUse.freeShipping,
            preferredSeller: filtersToUse.preferredSeller,
            officialStore: filtersToUse.officialStore,
            selectedBrands: filtersToUse.selectedBrands.length > 0 ? filtersToUse.selectedBrands : undefined,
            sortBy: sortToUse,
            limit: PAGE_SIZE,
            offset: 0,
          }),
          productService.getFilteredProducts(trimmedQuery, {
            priceRange: filtersToUse.priceRange,
            minRating: filtersToUse.minRating,
            shippedFrom: filtersToUse.shippedFrom,
            withVouchers: filtersToUse.withVouchers,
            onSale: false, // Handled client-side after normalization so flash sale discounts are included
            freeShipping: filtersToUse.freeShipping,
            preferredSeller: filtersToUse.preferredSeller,
            officialStore: filtersToUse.officialStore,
            selectedBrands: filtersToUse.selectedBrands.length > 0 ? filtersToUse.selectedBrands : undefined,
            sortBy: sortToUse,
            limit: PAGE_SIZE,
            offset: 0,
          }),
        ]);

        const normalizeProd = (row: any): Product => {
          const rawImages: any[] = Array.isArray(row.images) ? row.images : [];
          const imageUrls = rawImages
            .map((img: any) => (typeof img === 'string' ? img : img?.image_url))
            .filter((url: unknown): url is string => typeof url === 'string' && url.length > 0);
          const primaryImage =
            rawImages.find((img: any) => typeof img === 'object' && img?.is_primary)?.image_url ||
            row.primary_image_url || row.primary_image || row.image || imageUrls[0] || PLACEHOLDER_IMAGE;

          // Check if product already has a discount from transformProduct
          const rowPrice = typeof row.price === 'number' ? row.price : parseFloat(String(row.price || 0));
          const rowOriginalPrice = row.originalPrice ?? row.original_price;
          const hasExistingDiscount = rowOriginalPrice > 0 && rowPrice > 0 && rowOriginalPrice > rowPrice;

          // Cross-reference flash sale discount map
          const flashInfo = discountMapRef.current.get(row.id);
          const finalPrice = (!hasExistingDiscount && flashInfo) ? flashInfo.price : rowPrice;
          const finalOriginalPrice = (!hasExistingDiscount && flashInfo)
            ? flashInfo.originalPrice
            : (hasExistingDiscount ? rowOriginalPrice : row.originalPrice);
          const campaignDiscountType = row.campaignDiscountType || (flashInfo && !hasExistingDiscount ? 'percentage' : undefined);
          const campaignDiscountValue = row.campaignDiscountValue || (flashInfo && !hasExistingDiscount ? flashInfo.discountPercent : undefined);

          return {
            ...row,
            id: row.id,
            name: row.name ?? 'Unknown Product',
            price: finalPrice,
            originalPrice: finalOriginalPrice,
            original_price: finalOriginalPrice,
            image: primaryImage,
            images: imageUrls.length > 0 ? imageUrls : [primaryImage],
            category: typeof row.category === 'string' ? row.category : (row.category?.name || ''),
            seller: row.seller?.store_name || row.sellerName || 'Verified Seller',
            isFreeShipping: !!(row.is_free_shipping ?? row.isFreeShipping),
            campaignDiscountType,
            campaignDiscountValue,
          };
        };

        const catProds = (categoryResults || []).map(normalizeProd).filter(p => {
          const variants = Array.isArray((p as any).variants) ? (p as any).variants : [];
          if (variants.length > 0) return variants.some((v: any) => Number(v.stock || 0) > 0);
          return Number((p as any).stock || 0) > 0;
        }).filter(p => {
          // Client-side "On Sale" filter: keep only discounted products (covers both campaign + flash sale discounts)
          if (!filtersToUse.onSale) return true;
          const orig = Number((p as any).originalPrice || (p as any).original_price || 0);
          const price = Number(p.price || 0);
          return orig > 0 && price > 0 && orig > price;
        });
        const catProdIds = new Set(catProds.map(p => p.id));

        // Related = text search results that are NOT in the category
        const relProds = (relatedResults || [])
          .map(normalizeProd)
          .filter(p => !catProdIds.has(p.id))
          .filter(p => {
            const variants = Array.isArray((p as any).variants) ? (p as any).variants : [];
            if (variants.length > 0) return variants.some((v: any) => Number(v.stock || 0) > 0);
            return Number((p as any).stock || 0) > 0;
          })
          .filter(p => {
            if (!filtersToUse.onSale) return true;
            const orig = Number((p as any).originalPrice || (p as any).original_price || 0);
            const price = Number(p.price || 0);
            return orig > 0 && price > 0 && orig > price;
          });

        setMatchedCategory(matched.name);
        setCategoryProducts(catProds);
        setRelatedProducts(relProds);
        setProducts([...catProds, ...relProds]);
        setOffset(PAGE_SIZE);
        flashListRef.current?.scrollTo({ y: 0, animated: false });
      } else {
        // No category match — plain text search
        const serverResults = await productService.getFilteredProducts(trimmedQuery, {
          categoryId: filtersToUse.categoryId || undefined,
          priceRange: filtersToUse.priceRange,
          minRating: filtersToUse.minRating,
          shippedFrom: filtersToUse.shippedFrom,
          withVouchers: filtersToUse.withVouchers,
          onSale: false, // Handled client-side after normalization so flash sale discounts are included
          freeShipping: filtersToUse.freeShipping,
          preferredSeller: filtersToUse.preferredSeller,
          officialStore: filtersToUse.officialStore,
          selectedBrands: filtersToUse.selectedBrands.length > 0 ? filtersToUse.selectedBrands : undefined,
          sortBy: sortToUse,
          limit: PAGE_SIZE,
          offset: currentOffset,
        });

        const normalizedProducts: Product[] = serverResults.map((row: any) => {
          const rawImages: any[] = Array.isArray(row.images) ? row.images : [];
          const imageUrls = rawImages
            .map((img: any) => (typeof img === 'string' ? img : img?.image_url))
            .filter((url: unknown): url is string => typeof url === 'string' && url.length > 0);
          const primaryImage =
            rawImages.find((img: any) => typeof img === 'object' && img?.is_primary)?.image_url ||
            row.primary_image_url || row.primary_image || row.image || imageUrls[0] || PLACEHOLDER_IMAGE;

          // Check if product already has a discount from transformProduct
          const rowPrice = typeof row.price === 'number' ? row.price : parseFloat(String(row.price || 0));
          const rowOriginalPrice = row.originalPrice ?? row.original_price;
          const hasExistingDiscount = rowOriginalPrice > 0 && rowPrice > 0 && rowOriginalPrice > rowPrice;

          // Cross-reference flash sale discount map
          const flashInfo = discountMapRef.current.get(row.id);
          const finalPrice = (!hasExistingDiscount && flashInfo) ? flashInfo.price : rowPrice;
          const finalOriginalPrice = (!hasExistingDiscount && flashInfo)
            ? flashInfo.originalPrice
            : (hasExistingDiscount ? rowOriginalPrice : row.originalPrice);
          const campaignDiscountType = row.campaignDiscountType || (flashInfo && !hasExistingDiscount ? 'percentage' : undefined);
          const campaignDiscountValue = row.campaignDiscountValue || (flashInfo && !hasExistingDiscount ? flashInfo.discountPercent : undefined);

          return {
            ...row,
            id: row.id,
            name: row.name ?? 'Unknown Product',
            price: finalPrice,
            originalPrice: finalOriginalPrice,
            original_price: finalOriginalPrice,
            image: primaryImage,
            images: imageUrls.length > 0 ? imageUrls : [primaryImage],
            category: typeof row.category === 'string' ? row.category : (row.category?.name || ''),
            seller: row.seller?.store_name || row.sellerName || 'Verified Seller',
            isFreeShipping: !!(row.is_free_shipping ?? row.isFreeShipping),
            campaignDiscountType,
            campaignDiscountValue,
          };
        }).filter(p => {
          const variants = Array.isArray((p as any).variants) ? (p as any).variants : [];
          if (variants.length > 0) return variants.some((v: any) => Number(v.stock || 0) > 0);
          return Number((p as any).stock || 0) > 0;
        }).filter(p => {
          // Client-side "On Sale" filter: keep only discounted products (covers both campaign + flash sale discounts)
          if (!filtersToUse.onSale) return true;
          const orig = Number((p as any).originalPrice || (p as any).original_price || 0);
          const price = Number(p.price || 0);
          return orig > 0 && price > 0 && orig > price;
        });

        if (reset) {
          setMatchedCategory(null);
          setCategoryProducts([]);
          setRelatedProducts(normalizedProducts);
          setProducts(normalizedProducts);
          setOffset(PAGE_SIZE);
          flashListRef.current?.scrollTo({ y: 0, animated: false });
        } else {
          const existingIds = new Set(products.map(p => p.id));
          const newProducts = normalizedProducts.filter(p => !existingIds.has(p.id));
          setProducts(prev => [...prev, ...newProducts]);
          setRelatedProducts(prev => [...prev, ...newProducts]);
          setOffset(prev => prev + PAGE_SIZE);
        }

        setHasMore(serverResults.length === PAGE_SIZE);
      }

      setSearchPerformed(true);
    } catch (error) {
      console.error('[ProductListingScreen] Error executing search:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [offset, products, filters, sortOption, availableCategories]);

  // Initial search on mount — load discount map and categories first so discount badges and separation work
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      const init = async () => {
        // Load discount map before searching so flash sale discounts are available
        const [cats] = await Promise.all([
          loadFilterOptions(initialQuery).then(c => c ?? []),
          buildDiscountMap(),
        ]);
        executeSearch(initialQuery, true, undefined, cats);
      };
      init();
    } else {
      // Still load discount map for later searches
      buildDiscountMap();
      setIsLoading(false);
    }
  }, []);

  // Store search — runs independently so the store card appears immediately
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) { setMatchedStores([]); return; }
    let cancelled = false;
    const lowerQ = q.toLowerCase();

    // Fast path: derive from already-loaded products
    const derivedNow = (() => {
      const map = new Map<string, any>();
      productsRef.current.forEach((p: any) => {
        const name = p.seller?.store_name || p.sellerName || p.seller;
        if (!name || !(name as string).toLowerCase().includes(lowerQ)) return;
        const key = p.seller_id || p.sellerId || `__name__:${(name as string).toLowerCase()}`;
        if (map.has(key)) return;
        map.set(key, {
          id: key, store_name: name,
          avatar_url: p.seller?.avatar_url || null,
          is_verified: p.seller?.approval_status === 'verified',
          rating: null, products_count: null,
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
        if (!cancelled && merged.size > 0) setMatchedStores(Array.from(merged.values()));
      } catch { /* derived list remains visible */ }
    })();

    return () => { cancelled = true; };
  }, [searchQuery, searchPerformed]);

  // Handle search submission
  const handleSearch = () => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      loadFilterOptions(trimmedQuery).then(cats => {
        executeSearch(trimmedQuery, true, undefined, cats ?? []);
      });
    }
  };

  // Handle text input change — clear results immediately so old products don't linger
  const handleTextChange = (text: string) => {
    setSearchQuery(text);
    if (text.trim() !== searchQuery.trim()) {
      setProducts([]);
      setCategoryProducts([]);
      setRelatedProducts([]);
      setMatchedCategory(null);
      setSearchPerformed(false);
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setProducts([]);
    setSearchPerformed(false);
  };

  // Handle filter apply — re-run with category awareness
  const handleFilterApply = useCallback((newFilters: ProductFilters) => {
    setFilters(newFilters);
    loadFilterOptions(searchQuery).then(cats => {
      executeSearch(searchQuery, true, { filters: newFilters }, cats ?? []);
    });
  }, [searchQuery, executeSearch, loadFilterOptions]);

  // Handle sort select — re-run with category awareness
  const handleSortSelect = useCallback((newSort: SortOption) => {
    setSortOption(newSort);
    loadFilterOptions(searchQuery).then(cats => {
      executeSearch(searchQuery, true, { sortOption: newSort }, cats ?? []);
    });
  }, [searchQuery, executeSearch, loadFilterOptions]);

  // Remove individual filter chip
  const handleRemoveFilterChip = useCallback((chipId: string) => {
    const updatedFilters = (() => {
      switch (chipId) {
        case 'category':
          return { ...filters, categoryId: null, categoryPath: [] };
        case 'price':
          return { ...filters, priceRange: { min: null, max: null } };
        case 'rating':
          return { ...filters, minRating: null };
        case 'location':
          return { ...filters, shippedFrom: null };
        case 'vouchers':
          return { ...filters, withVouchers: false };
        case 'sale':
          return { ...filters, onSale: false };
        case 'freeShipping':
          return { ...filters, freeShipping: false };
        case 'preferredSeller':
          return { ...filters, preferredSeller: false };
        case 'officialStore':
          return { ...filters, officialStore: false };
        default:
          if (chipId.startsWith('brand-')) {
            const brand = chipId.replace('brand-', '');
            return {
              ...filters,
              selectedBrands: filters.selectedBrands.filter(b => b !== brand),
            };
          }
          return filters;
      }
    })();

    setFilters(updatedFilters);
    executeSearch(searchQuery, true, { filters: updatedFilters });
  }, [searchQuery, executeSearch, filters]);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await buildDiscountMap();
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

  // Render item for FlashList
  const renderItem = useCallback(({ item }: { item: Product }) => (
    <View style={{ paddingHorizontal: 6, paddingVertical: 6 }}>
      <MasonryProductCard
        product={item}
        onPress={() => handleProductPress(item)}
        width={cardWidth}
      />
    </View>
  ), [handleProductPress, cardWidth]);

  // Render empty / loading state
  const renderEmptyComponent = () => {
    if (isLoading && !isRefreshing) {
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
    return null;
  };

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

  const activeFilterCount = getActiveFilterCount();

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

      {/* Results count + Sort & Filter icon buttons — single row */}
      <View style={styles.filterRow}>
        {searchPerformed && products.length > 0 && (
          <Text style={styles.resultsText}>
            {products.length} result{products.length !== 1 ? 's' : ''}
          </Text>
        )}
        <View style={{ flex: 1 }} />
        <View style={styles.filterSortButtons}>
          {/* SORT ICON — change the icon component below to customize */}
          <Pressable
            style={[styles.iconButton, sortOption !== 'relevance' && styles.iconButtonActive]}
            onPress={() => setShowSortModal(true)}
          >
            {/* Replace ChevronDown with your preferred sort icon */}
            <FunnelIcon size={18} color={sortOption !== 'relevance' ? COLORS.primary : COLORS.textPrimary} />
            {sortOption !== 'relevance' && <View style={styles.iconBadge} />}
          </Pressable>
          <Pressable
            style={[styles.iconButton, activeFilterCount > 0 && styles.iconButtonActive]}
            onPress={() => setShowFilterModal(true)}
          >
            <SlidersHorizontal size={18} color={activeFilterCount > 0 ? COLORS.primary : COLORS.textPrimary} />
            {activeFilterCount > 0 && (
              <View style={styles.iconBadgeCount}>
                <Text style={styles.iconBadgeCountText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Active filter chips — Clear All pinned outside scroll */}
      {getActiveFilterChips().length > 0 && (
        <View style={styles.chipsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsContent}
            style={{ flex: 1 }}
          >
            {getActiveFilterChips().map(chip => (
              <Pressable
                key={chip.id}
                style={styles.filterChip}
                onPress={() => handleRemoveFilterChip(chip.id)}
              >
                <Text style={styles.filterChipText}>{chip.label}</Text>
                <X size={14} color={COLORS.gray500} style={styles.filterChipIcon} />
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            style={styles.clearAllFixed}
            onPress={() => {
              setFilters(DEFAULT_FILTERS);
              executeSearch(searchQuery, true, { filters: DEFAULT_FILTERS });
            }}
          >
            <Text style={styles.clearAllFixedText}>Clear All</Text>
          </Pressable>
        </View>
      )}

      {/* Product List */}
      <ScrollView
        ref={flashListRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Loading / empty state — only show when no products */}
        {(isLoading || products.length === 0) && renderEmptyComponent()}

        {/* Shopee-style store card(s) — shown above products when a store name matches */}
        {searchPerformed && !isLoading && matchedStores.length > 0 && (
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
                      <Image source={{ uri: store.avatar_url }} style={styles.storeAvatarImage} />
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
                  <Pressable onPress={handleStorePress} style={styles.viewStoreBtn} hitSlop={8}>
                    <Text style={styles.viewStoreBtnText}>View Store</Text>
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Category-matched products section */}
        {!isLoading && matchedCategory && categoryProducts.length > 0 && (
          <>
            <View style={styles.sectionHeaderContainer}>
              <Text style={styles.sectionHeaderTitle}>{matchedCategory} Category</Text>
              <Text style={styles.sectionHeaderCount}>{categoryProducts.length} items</Text>
            </View>
            <FlashList
              data={categoryProducts}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              numColumns={2}
              masonry={true}
              scrollEnabled={false}
            />
          </>
        )}

        {/* Related products section */}
        {!isLoading && relatedProducts.length > 0 && (
          <>
            {matchedCategory && categoryProducts.length > 0 && (
              <View style={styles.sectionHeaderContainer}>
                <Text style={styles.sectionHeaderTitle}>Related Products</Text>
                <Text style={styles.sectionHeaderCount}>{relatedProducts.length} items</Text>
              </View>
            )}
            <FlashList
              data={relatedProducts}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              numColumns={2}
              masonry={true}
              scrollEnabled={false}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
            />
          </>
        )}

        {renderFooter()}
      </ScrollView>

      {/* Filter Modal */}
      <ProductFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleFilterApply}
        initialFilters={filters}
        hideCategoryFilter={!!matchedCategory}
        availableCategories={availableCategories}
        availableBrands={availableBrands}
      />

      {/* Sort Modal */}
      <SortModal
        visible={showSortModal}
        onClose={() => setShowSortModal(false)}
        onSelect={handleSortSelect}
        selectedSort={sortOption}
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  filterSortButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconButtonActive: {
    backgroundColor: `${COLORS.primary}12`,
  },
  iconBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  iconBadgeCount: {
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
  iconBadgeCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  filterChipsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    marginRight: 4,
  },
  filterChipIcon: {
    marginLeft: 2,
  },
  clearAllFixed: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#F3F4F6',
    justifyContent: 'center',
  },
  clearAllFixedText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
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
  sectionHeaderContainer: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    marginTop: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    width: '100%',
    marginLeft: 0,
    marginRight: 0,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionHeaderCount: {
    fontSize: 12,
    color: COLORS.gray500,
    fontWeight: '500',
  },
  // Store card styles
  storeSection: {
    paddingHorizontal: 12,
    paddingBottom: 16,
    paddingTop: 4,
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
