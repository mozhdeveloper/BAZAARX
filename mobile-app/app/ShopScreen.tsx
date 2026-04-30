import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlashList } from "@shopify/flash-list";
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Camera, ChevronDown, ChevronRight, FunnelIcon, MapPin, Search, ShoppingBag, SlidersHorizontal, Star, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
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
import type { RootStackParamList, TabParamList } from '../App';
import CameraSearchModal from '../src/components/CameraSearchModal';
import { MasonryProductCard } from '../src/components/ProductCard';
import ProductFilterModal from '../src/components/ProductFilterModal';
import SortModal from '../src/components/SortModal';
import { COLORS } from '../src/constants/theme';
import { adBoostService, type AdBoostMobile } from '../src/services/adBoostService';
import { addressService } from '../src/services/addressService';
import { featuredProductService, type FeaturedProductMobile } from '../src/services/featuredProductService';
import { notificationService } from '../src/services/notificationService';
import { productService } from '../src/services/productService';
import { useAuthStore } from '../src/stores/authStore';
import type { Product } from '../src/types';
import type { ProductFilters, SortOption } from '../src/types/filter.types';
import { DEFAULT_FILTERS } from '../src/types/filter.types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Shop'>,
  NativeStackScreenProps<RootStackParamList>
>;

const { width } = Dimensions.get('window');

type CategoryChip = {
  id: string;
  name: string;
};

const PLACEHOLDER_IMAGE = 'https://placehold.co/400x400/e5e7eb/6b7280?text=Product';

const DEFAULT_CATEGORY_CHIPS: CategoryChip[] = [
  { id: 'all', name: 'All' }
];

const SHOP_SCREEN_FETCH_LIMIT = 200;

const CATEGORY_ALIAS_MAP: Record<string, string[]> = {
  'home-living': ['home-garden', 'home-and-garden'],
  'home-garden': ['home-living', 'home-and-living'],
  'beauty-health': ['beauty', 'beauty-personal', 'health-beauty'],
  'beauty-personal': ['beauty', 'beauty-health', 'beauty-and-health'],
  'sports-outdoors': ['sports'],
  'toys-games': ['toys', 'games'],
  'books-stationery': ['books', 'books-media'],
  'books-media': ['books', 'books-stationery'],
  'food-beverages': ['food', 'food-beverage', 'food-drinks'],
  'food-drinks': ['food', 'food-beverage', 'food-beverages'],
};

const FALLBACK_CATEGORY_DATA = [
  { id: 'all', name: 'All', slug: 'all' },
  { id: 'electronics', name: 'Electronics', slug: 'electronics' },
  { id: 'fashion', name: 'Fashion', slug: 'fashion' },
  { id: 'home-living', name: 'Home & Living', slug: 'home-living' },
  { id: 'beauty', name: 'Beauty', slug: 'beauty' },
  { id: 'sports', name: 'Sports', slug: 'sports' },
];

const normalizeCategoryKey = (value?: string | null): string => {
  if (!value) return '';
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

const expandCategoryAliases = (key: string): string[] => {
  if (!key) return [];

  const expanded = new Set<string>([key]);
  const directAliases = CATEGORY_ALIAS_MAP[key] || [];
  directAliases.forEach((alias) => expanded.add(normalizeCategoryKey(alias)));

  Object.entries(CATEGORY_ALIAS_MAP).forEach(([canonical, aliases]) => {
    const normalizedAliases = aliases.map((alias) => normalizeCategoryKey(alias));
    if (normalizedAliases.includes(key)) {
      expanded.add(normalizeCategoryKey(canonical));
      normalizedAliases.forEach((alias) => expanded.add(alias));
    }
  });

  return Array.from(expanded).filter(Boolean);
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const normalizeProductForShop = (row: any): Product => {
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

  const rawVariants: any[] = Array.isArray(row.variants) ? row.variants : [];
  const variants = rawVariants.map((v: any) => ({
    id: v.id,
    product_id: row.id,
    sku: v.sku,
    variant_name:
      v.variant_name ||
      `${v.option_1_value || v.color || ''} ${v.option_2_value || v.size || ''}`.trim() ||
      'Variant',
    size: v.size,
    color: v.color,
    option_1_value: v.option_1_value,
    option_2_value: v.option_2_value,
    price: toNumber(v.price, toNumber(row.price, 0)),
    stock: toNumber(v.stock, 0),
    thumbnail_url: v.thumbnail_url,
  }));

  const colors = Array.from(new Set(variants.map((v: any) => v.color).filter(Boolean))) as string[];
  const sizes = Array.from(new Set(variants.map((v: any) => v.size).filter(Boolean))) as string[];
  const option1Values = Array.from(
    new Set(variants.map((v: any) => v.option_1_value || v.color).filter(Boolean)),
  ) as string[];
  const option2Values = Array.from(
    new Set(variants.map((v: any) => v.option_2_value || v.size).filter(Boolean)),
  ) as string[];

  const originalPriceRaw = row.originalPrice ?? row.original_price;
  const originalPrice = toNumber(originalPriceRaw, 0);

  const categoryName = typeof row.category === 'string' ? row.category : (row.category?.name || '');
  const categoryId = row.category_id || (row.category && typeof row.category === 'object' ? row.category.id : undefined);

  // Note: if ProductService already transformed it, category is a string.
  // We want to ensure category_id is always available from the source row.

  return {
    ...row,
    id: row.id,
    name: row.name ?? 'Unknown Product',
    price: toNumber(row.price, 0),
    originalPrice: originalPrice > 0 ? originalPrice : row.originalPrice,
    image: primaryImage,
    images: imageUrls.length > 0 ? imageUrls : [primaryImage],
    category: categoryName,
    category_id: categoryId,
    seller: row.seller?.store_name || row.sellerName || 'Verified Seller',
    isFreeShipping: !!(row.is_free_shipping ?? row.isFreeShipping),
  };
};

// Extracted component so the ScrollView instance persists across category changes
// and doesn't reset its horizontal scroll position.
const CategoryChipsBar = React.memo(function CategoryChipsBar({
  chips,
  selectedId,
  onSelect,
  brandColor,
}: {
  chips: CategoryChip[];
  selectedId: string;
  onSelect: (id: string) => void;
  brandColor: string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={styles.categoryScroll}
      onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.x; }}
      scrollEventThrottle={16}
      onLayout={() => {
        if (scrollOffsetRef.current > 0 && scrollRef.current) {
          scrollRef.current.scrollTo({ x: scrollOffsetRef.current, animated: false });
        }
      }}
    >
      {chips.map((cat) => {
        const isSelected = selectedId === cat.id;
        return (
          <Pressable
            key={cat.id}
            style={[styles.chip, isSelected && { backgroundColor: brandColor, borderColor: brandColor }]}
            onPress={() => onSelect(cat.id)}
          >
            <Text style={[styles.chipText, isSelected && { color: '#FFF' }]}>{cat.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});

export default function ShopScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const BRAND_COLOR = COLORS.primary;
  const { user, isGuest } = useAuthStore();

  // Header State from HomeScreen
  const [deliveryAddress, setDeliveryAddress] = useState('Select Location');
  const [deliveryCoordinates, setDeliveryCoordinates] = useState<{ latitude: number, longitude: number } | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const unsubRealtimeRef = useRef<(() => void) | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryChips, setCategoryChips] = useState<CategoryChip[]>(DEFAULT_CATEGORY_CHIPS);

  const { searchQuery: initialSearchQuery, category: initialCategory } = route.params || {};
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'all');
  const [sortOption, setSortOption] = useState<SortOption>('relevance');
  const [isFeaturedView, setIsFeaturedView] = useState(route.params?.view === 'featured');
  const shuffledIdsRef = useRef<string[]>([]);
  const flashListRef = useRef<any>(null);

  // Featured products state
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProductMobile[]>([]);
  const [boostedProducts, setBoostedProducts] = useState<AdBoostMobile[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);

  // Filter state (matching ProductListingScreen)
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [availableBrands, setAvailableBrands] = useState<any[]>([]);

  // Category-specific products fetched from server (like ProductListingScreen)
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showCameraSearch, setShowCameraSearch] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Counter to force FlashList remount when category changes, ensuring scroll resets to top
  const [listKey, setListKey] = useState(0);

  useEffect(() => {
    if (typeof route.params?.searchQuery === 'string') {
      setSearchQuery(route.params.searchQuery);
    }
  }, [route.params?.searchQuery]);

  useEffect(() => {
    if (route.params?.category) {
      setSelectedCategory(route.params.category);
    }
  }, [route.params?.category]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [productsResult, categoriesResult] = await Promise.allSettled([
          productService.getProducts({
            isActive: true,
            approvalStatus: 'approved',
            limit: SHOP_SCREEN_FETCH_LIMIT,
          }),
          productService.getCategoriesWithProducts(),
        ]);

        if (productsResult.status === 'fulfilled') {
          const mapped: Product[] = (productsResult.value || []).map((row: any) => normalizeProductForShop(row));
          const uniqueMapped = Array.from(new Map(mapped.map((item) => [item.id, item])).values())
            .filter(p => {
              // Filter out products with no available stock
              const variants = Array.isArray((p as any).variants) ? (p as any).variants : [];
              if (variants.length > 0) return variants.some((v: any) => Number(v.stock || 0) > 0);
              return Number(p.stock || 0) > 0;
            });
          setDbProducts(uniqueMapped);
        } else {
          console.error('[ShopScreen] Failed loading products:', productsResult.reason);
          setDbProducts([]);
        }

        if (categoriesResult.status === 'fulfilled') {
          const mappedChips = (categoriesResult.value || []).map((category: any) => ({
            id: category.id,
            name: category.name,
          }));
          setCategoryChips([DEFAULT_CATEGORY_CHIPS[0], ...mappedChips]);
          // Also populate filter modal categories
          setAvailableCategories((categoriesResult.value || []).map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            path: cat.path || [cat.name],
            hasChildren: false,
          })));
        } else {
          console.error('[ShopScreen] Failed loading categories:', categoriesResult.reason);
          setCategoryChips(DEFAULT_CATEGORY_CHIPS);
        }

      } catch (err) {
        console.error('[ShopScreen] Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    console.log('[ShopScreen] Pull-to-refresh started');
    setIsRefreshing(true);

    shuffledIdsRef.current = [];

    try {
      const [productsResult, categoriesResult] = await Promise.allSettled([
        productService.getProducts({
          isActive: true,
          approvalStatus: 'approved',
          limit: SHOP_SCREEN_FETCH_LIMIT,
        }),
        productService.getCategoriesWithProducts(),
      ]);

      if (productsResult.status === 'fulfilled') {
        const mapped: Product[] = (productsResult.value || []).map((row: any) => normalizeProductForShop(row));
        const uniqueMapped = Array.from(new Map(mapped.map((item) => [item.id, item])).values())
          .filter(p => {
            // Filter out products with no available stock
            const variants = Array.isArray((p as any).variants) ? (p as any).variants : [];
            if (variants.length > 0) return variants.some((v: any) => Number(v.stock || 0) > 0);
            return Number(p.stock || 0) > 0;
          });
        setDbProducts(uniqueMapped);

        if (uniqueMapped.length > 0) {
          const ids = uniqueMapped.map(p => p.id);
          for (let i = ids.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [ids[i], ids[j]] = [ids[j], ids[i]];
          }
          shuffledIdsRef.current = ids;
        }
      }

      if (categoriesResult.status === 'fulfilled') {
        const mappedChips = (categoriesResult.value || []).map((category: any) => ({ id: category.id, name: category.name }));
        setCategoryChips([DEFAULT_CATEGORY_CHIPS[0], ...mappedChips]);
        setAvailableCategories((categoriesResult.value || []).map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          path: cat.path || [cat.name],
          hasChildren: false,
        })));
      }

    } catch (err) {
      console.error('[ShopScreen] Error refreshing data:', err);
    } finally {
      setIsRefreshing(false);
      // Scroll to top after data is set and list will re-render
      setTimeout(() => {
        if (flashListRef.current) {
          console.log('[ShopScreen] Scrolling to top after refresh');
          flashListRef.current.scrollToOffset({ animated: false, offset: 0 });
        }
      }, 50);
    }
  }, [sortOption, isFeaturedView, selectedCategory, searchQuery, filters]);

  useEffect(() => {
    const resetAllFilters = async () => {
      setSortOption('relevance');
      setIsFeaturedView(false);
      setSelectedCategory('all');
      setSearchQuery('');
      setFilters({ ...DEFAULT_FILTERS });
      try {
        await AsyncStorage.removeItem('shopSortState');
      } catch (e) { /* ignore */ }
      navigation.setParams({ searchQuery: undefined, category: undefined, view: undefined });
    };

    const unsubBlur = navigation.addListener('blur', resetAllFilters);
    return () => unsubBlur();
  }, [navigation]);

  useEffect(() => {
    mountedRef.current = true;

    const loadNotifications = async () => {
      if (!user?.id || isGuest) return;
      try {
        const data = await notificationService.getNotifications(user.id, 'buyer', 20);
        if (mountedRef.current) {
          setUnreadCount(data.filter(n => !n.is_read).length);
        }
      } catch (error) {
        console.error('[ShopScreen] Error loading notifications:', error);
      }
    };

    const unsubFocus = navigation.addListener('focus', loadNotifications);
    loadNotifications();

    if (user?.id && !isGuest && !unsubRealtimeRef.current) {
      console.log('[ShopScreen] Setting up real-time subscription for buyer:', user.id);
      unsubRealtimeRef.current = notificationService.subscribeToNotifications(
        user.id,
        'buyer',
        (newNotification) => {
          console.log('[ShopScreen] New notification received:', newNotification);
          if (mountedRef.current) {
            setUnreadCount((prev) => prev + 1);
            loadNotifications();
          }
        }
      );
    }

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (user?.id && !isGuest) {
      pollIntervalRef.current = setInterval(() => {
        if (mountedRef.current && user?.id) {
          loadNotifications();
        }
      }, 30000);
    }

    return () => {
      unsubFocus();
    };
  }, [navigation, user?.id, isGuest]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (unsubRealtimeRef.current) {
        console.log('[ShopScreen] Cleaning up real-time subscription');
        unsubRealtimeRef.current();
        unsubRealtimeRef.current = null;
      }
      if (pollIntervalRef.current) {
        console.log('[ShopScreen] Cleaning up polling interval');
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const loadSavedLocation = async () => {
      try {
        const savedAddress = await AsyncStorage.getItem('currentDeliveryAddress');
        const savedCoords = await AsyncStorage.getItem('currentDeliveryCoordinates');
        if (savedAddress) setDeliveryAddress(savedAddress);
        if (savedCoords) setDeliveryCoordinates(JSON.parse(savedCoords));
      } catch (e) { console.error(e); }

      if (user?.id) {
        try {
          const savedLocation = await addressService.getCurrentDeliveryLocation(user.id);
          if (savedLocation) {
            const formatted = savedLocation.city ? `${savedLocation.street}, ${savedLocation.city}` : savedLocation.street;
            setDeliveryAddress(formatted);
            if (savedLocation.coordinates) setDeliveryCoordinates(savedLocation.coordinates);
          }
        } catch (e) { console.error(e); }
      }
    };
    loadSavedLocation();
  }, [user]);

  useEffect(() => {
    if (!isFeaturedView) return;

    const loadFeaturedProducts = async () => {
      setFeaturedLoading(true);
      try {
        const [featuredData, boostedData] = await Promise.all([
          featuredProductService.getFeaturedProducts(100),
          adBoostService.getActiveBoostedProducts('featured', 100),
        ]);
        setFeaturedProducts(featuredData || []);
        setBoostedProducts(boostedData || []);
      } catch (error) {
        console.error('[ShopScreen] Error loading featured products:', error);
      } finally {
        setFeaturedLoading(false);
      }
    };

    loadFeaturedProducts();
  }, [isFeaturedView]);

  useEffect(() => {
    const unsubFocus = navigation.addListener('focus', async () => {
      try {
        if (route.params?.view === 'featured') {
          setIsFeaturedView(true);
        }
        // Scroll to top when returning to this screen (e.g. from ProductListingScreen)
        setTimeout(() => {
          if (flashListRef.current) {
            console.log('[ShopScreen] Scrolling to top on screen focus');
            flashListRef.current.scrollToOffset({ offset: 0, animated: false });
          }
        }, 100);
        setSearchQuery('');
      } catch (error) {
        console.error('[ShopScreen] Error loading sort state:', error);
      }
    });
    return unsubFocus;
  }, [navigation, route.params?.view]);

  useEffect(() => {
    if (dbProducts.length > 0 && shuffledIdsRef.current.length === 0) {
      const ids = dbProducts.map(p => p.id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      shuffledIdsRef.current = ids;
    }
  }, [dbProducts]);

  // Scroll to top whenever category changes
  useEffect(() => {
    console.log('[ShopScreen] Category changed to:', selectedCategory);

    // Force FlashList remount to guarantee scroll position resets to top
    setListKey(prev => prev + 1);
  }, [selectedCategory]);

  // Fetch category-specific products from server (matching ProductListingScreen behavior)
  useEffect(() => {
    if (selectedCategory === 'all') {
      setCategoryProducts([]);
      return;
    }

    const fetchCategoryProducts = async () => {
      setIsCategoryLoading(true);
      try {
        // Find the category name from chips for the search query
        const categoryChip = categoryChips.find(c => c.id === selectedCategory);
        const categoryName = categoryChip?.name || '';

        // Use getFilteredProducts like ProductListingScreen does — server-side query
        // with proper deleted_at IS NULL and disabled_at IS NULL filtering
        const results = await productService.getFilteredProducts(categoryName, {
          categoryId: selectedCategory,
          sortBy: 'relevance',
          limit: SHOP_SCREEN_FETCH_LIMIT,
          offset: 0,
        });

        const mapped: Product[] = (results || []).map((row: any) => normalizeProductForShop(row));
        const uniqueMapped = Array.from(new Map(mapped.map((item) => [item.id, item])).values())
          .filter(p => {
            const variants = Array.isArray((p as any).variants) ? (p as any).variants : [];
            if (variants.length > 0) return variants.some((v: any) => Number(v.stock || 0) > 0);
            return Number(p.stock || 0) > 0;
          });
        setCategoryProducts(uniqueMapped);
      } catch (error) {
        console.error('[ShopScreen] Error fetching category products:', error);
        setCategoryProducts([]);
      } finally {
        setIsCategoryLoading(false);
      }
    };

    fetchCategoryProducts();
  }, [selectedCategory, categoryChips]);

  const handleSelectLocation = async (address: string, coords?: any, details?: any) => {
    setDeliveryAddress(address);
    if (coords) setDeliveryCoordinates(coords);
    try {
      await AsyncStorage.setItem('currentDeliveryAddress', address);
      if (coords) await AsyncStorage.setItem('currentDeliveryCoordinates', JSON.stringify(coords));
      if (user?.id) await addressService.saveCurrentDeliveryLocation(user.id, address, coords || null, details);
    } catch (e) { console.error(e); }
  };

  const productsBySeller = useMemo(() => {
    const map = new Map<string, Product[]>();
    dbProducts.forEach(p => {
      const sid = (p as any).seller_id || '';
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid)!.push(p);
    });
    return map;
  }, [dbProducts]);

  const filteredProducts = useMemo(() => {
    // When a specific category is selected, use server-fetched category products
    let sourceProducts = selectedCategory !== 'all' && categoryProducts.length > 0
      ? categoryProducts
      : dbProducts;

    // Safety net: filter out products from non-verified, blacklisted, or suspended sellers
    sourceProducts = sourceProducts.filter(p => {
      const seller = (p as any).seller;
      // If seller data is not available (already transformed), skip this check
      // since the service layer already filtered
      if (!seller || typeof seller === 'string') return true;
      if (seller.approval_status && seller.approval_status !== 'verified') return false;
      if (seller.suspended_at) return false;
      if (seller.blacklisted_at) return false;
      if (seller.is_permanently_blacklisted) return false;
      if (seller.temp_blacklist_until && new Date(seller.temp_blacklist_until) > new Date()) return false;
      return true;
    });

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const min = filters.priceRange.min ?? 0;
    const max = filters.priceRange.max ?? Infinity;

    let filtered = sourceProducts.filter((product) => {
      const productName = (product.name || '').toLowerCase();
      const productDescription = (product.description || '').toLowerCase();
      const productPrice = toNumber(product.price, 0);

      const searchMatch =
        normalizedQuery.length === 0 ||
        productName.includes(normalizedQuery) ||
        productDescription.includes(normalizedQuery);

      // When using server-fetched category products, skip client-side category filtering
      // When "All" chip is selected, also check the modal's category filter (filters.categoryId)
      const chipCategoryMatch =
        selectedCategory === 'all' ||
        categoryProducts.length > 0 ||
        product.category_id === selectedCategory ||
        (typeof product.category === 'string' && (
          product.category.toLowerCase() === selectedCategory.toLowerCase() ||
          normalizeCategoryKey(product.category) === normalizeCategoryKey(selectedCategory)
        ));

      // Modal category filter: when user picks a category from the filter modal
      const modalCategoryMatch =
        !filters.categoryId ||
        product.category_id === filters.categoryId;

      const categoryMatch = chipCategoryMatch && modalCategoryMatch;
      const priceMatch = productPrice >= min && productPrice <= max;

      // Rating filter
      const ratingMatch = !filters.minRating || (product.rating ?? 0) >= filters.minRating;

      // Free shipping filter
      const shippingMatch = !filters.freeShipping || !!(product as any).isFreeShipping || !!(product as any).is_free_shipping;

      return searchMatch && categoryMatch && priceMatch && ratingMatch && shippingMatch;
    });

    if (isFeaturedView) {
      const featuredProductIds = new Set([
        ...featuredProducts.map(fp => fp.product_id),
        ...boostedProducts.map(bp => bp.product_id)
      ]);
      filtered = filtered.filter(p => featuredProductIds.has(p.id));
    }

    // Map SortOption values to sorting logic
    switch (sortOption) {
      case 'rating-high':
        filtered.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case 'best-selling':
        filtered.sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      case 'price-low':
        filtered.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case 'price-high':
        filtered.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      case 'relevance':
      default: {
        const order = shuffledIdsRef.current;
        if (order.length > 0) {
          const indexMap = new Map(order.map((id, i) => [id, i]));
          filtered.sort((a, b) => (indexMap.get(a.id) ?? 9999) - (indexMap.get(b.id) ?? 9999));
        }
        break;
      }
    }

    // Final safety: filter out products with no available stock
    filtered = filtered.filter(p => {
      const variants = Array.isArray((p as any).variants) ? (p as any).variants : [];
      if (variants.length > 0) return variants.some((v: any) => Number(v.stock || 0) > 0);
      return Number(p.stock || 0) > 0;
    });

    return filtered;
  }, [dbProducts, categoryProducts, searchQuery, selectedCategory, sortOption, isFeaturedView, filters, categoryChips, featuredProducts, boostedProducts]);

  const handleProductPress = useCallback((product: Product) => {
    navigation.navigate('ProductDetail', { product });
  }, [navigation]);

  const keyExtractor = useCallback((item: Product) => item.id, []);

  // renderProductItem removed in favor of inline renderItem in MasonryFlashList constants

  const listEmptyComponent = useMemo(() => {
    if (isLoading || isCategoryLoading) return <ActivityIndicator color={BRAND_COLOR} style={{ marginTop: 50 }} />;
    return (
      <View style={[styles.productsSection, { marginTop: 20 }]}>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptyText}>Try adjusting your filters or search terms.</Text>
          {(selectedCategory !== 'all' || searchQuery !== '' || sortOption !== 'relevance' ||
            isFeaturedView || filters.priceRange.min !== null || filters.priceRange.max !== null ||
            filters.minRating !== null || filters.freeShipping || filters.onSale) && (
              <Pressable
                onPress={async () => {
                  setSortOption('relevance');
                  setIsFeaturedView(false);
                  setSelectedCategory('all');
                  setSearchQuery('');
                  setFilters({ ...DEFAULT_FILTERS });
                  try {
                    await AsyncStorage.removeItem('shopSortState');
                  } catch (e) { /* ignore */ }
                  navigation.setParams({ searchQuery: undefined, category: undefined, view: undefined });
                }}
                style={{
                  marginTop: 16,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  backgroundColor: BRAND_COLOR,
                  borderRadius: 8,
                  alignSelf: 'center'
                }}
              >
                <Text style={{
                  color: '#FFF',
                  fontWeight: '600',
                  fontSize: 14
                }}>
                  Clear All Filters
                </Text>
              </Pressable>
            )}
        </View>
      </View>
    );
  }, [isLoading, isCategoryLoading, selectedCategory, searchQuery, sortOption, isFeaturedView, filters, navigation]);

  const handleCategorySelect = useCallback((id: string) => {
    setSelectedCategory(id);
    // Clear category filter when switching chips, since the filter is hidden for non-"All" chips
    if (id !== 'all') {
      setFilters(prev => ({ ...prev, categoryId: null, categoryPath: [] }));
    }
  }, []);

  // Count active filters for badge
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

  const activeFilterCount = getActiveFilterCount();

  // Handle filter apply
  const handleFilterApply = useCallback((newFilters: ProductFilters) => {
    setFilters(newFilters);
  }, []);

  // Handle sort select
  const handleSortSelect = useCallback((newSort: SortOption) => {
    setSortOption(newSort);
  }, []);

  const { isAuthenticated, hasCompletedOnboarding } = useAuthStore();

  const listHeaderComponent = useMemo(() => (
    <View>
      {(sortOption !== 'relevance' || isFeaturedView || activeFilterCount > 0) && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, gap: 8 }}>
          {isFeaturedView && (
            <Pressable
              onPress={() => {
                setIsFeaturedView(false);
                navigation.setParams({ view: undefined });
              }}
              style={{
                flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7',
                borderWidth: 1, borderColor: '#F59E0B', borderRadius: 20,
                paddingHorizontal: 12, paddingVertical: 6,
              }}
            >
              <Star size={12} color="#B45309" fill="#B45309" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#B45309', marginRight: 4 }}>
                Featured Products
              </Text>
              <X size={12} color="#B45309" />
            </Pressable>
          )}
          {sortOption !== 'relevance' && (
            <Pressable
              onPress={async () => {
                setSortOption('relevance');
                try { await AsyncStorage.removeItem('shopSortState'); } catch (e) { /* ignore */ }
              }}
              style={{
                flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7',
                borderWidth: 1, borderColor: '#F59E0B', borderRadius: 20,
                paddingHorizontal: 12, paddingVertical: 6,
              }}
            >
              <Star size={12} color="#B45309" fill="#B45309" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#B45309', marginRight: 4 }}>
                Sorted
              </Text>
              <X size={12} color="#B45309" />
            </Pressable>
          )}
          {(filters.priceRange.min !== null || filters.priceRange.max !== null) && (
            <Pressable
              onPress={() => setFilters(prev => ({ ...prev, priceRange: { min: null, max: null } }))}
              style={{
                flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5',
                borderWidth: 1, borderColor: '#10B981', borderRadius: 20,
                paddingHorizontal: 12, paddingVertical: 6,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#065F46', marginRight: 4 }}>
                ₱{(filters.priceRange.min ?? 0).toLocaleString()} – ₱{(filters.priceRange.max ?? '∞').toLocaleString()}
              </Text>
              <X size={12} color="#065F46" />
            </Pressable>
          )}
          {filters.minRating !== null && (
            <Pressable
              onPress={() => setFilters(prev => ({ ...prev, minRating: null }))}
              style={{
                flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF9C3',
                borderWidth: 1, borderColor: '#EAB308', borderRadius: 20,
                paddingHorizontal: 12, paddingVertical: 6,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#854D0E', marginRight: 4 }}>
                {filters.minRating}★ & up
              </Text>
              <X size={12} color="#854D0E" />
            </Pressable>
          )}
          <Pressable
            onPress={async () => {
              setSortOption('relevance');
              setIsFeaturedView(false);
              setSelectedCategory('all');
              setSearchQuery('');
              setFilters({ ...DEFAULT_FILTERS });
              try { await AsyncStorage.removeItem('shopSortState'); } catch (e) { /* ignore */ }
              navigation.setParams({ searchQuery: undefined, category: undefined, view: undefined });
            }}
            style={{ paddingHorizontal: 8, paddingVertical: 6, justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.textMuted, textDecorationLine: 'underline' }}>Clear all</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  ), [sortOption, isFeaturedView, filters, activeFilterCount]);

  return (
    <View
      style={[styles.container, { backgroundColor: COLORS.background }]}
    >
      <StatusBar barStyle="dark-content" />

      <View
        style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: COLORS.background }]}
      >
        <View style={styles.locationRow}>
          <Pressable onPress={() => setShowLocationModal(true)}>
            <Text style={styles.locationLabel}>Location</Text>
            <View style={styles.locationSelector}>
              <MapPin size={16} color={COLORS.primary} fill={COLORS.primary} />
              <Text numberOfLines={1} style={[styles.locationText, { maxWidth: 200, color: COLORS.textHeadline }]}>{deliveryAddress}</Text>
              <ChevronDown size={16} color={COLORS.textHeadline} />
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              if (isGuest) {
                setShowGuestModal(true);
              } else {
                navigation.navigate('Notifications' as any);
              }
            }}
            style={styles.headerIconButton}

          >
            <Bell size={24} color={COLORS.primary} />
            {!isGuest && unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.headerTop}>
          <View style={styles.searchBarWrapper}>
            <View style={[styles.searchBarInner, { backgroundColor: '#FFFFFF', borderRadius: 24, shadowColor: COLORS.primary, shadowOpacity: 0.1, shadowRadius: 15, elevation: 4 }]}>

              <TextInput
                style={[styles.searchInput, { color: COLORS.textHeadline }]}
                placeholder="Search products..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={COLORS.textMuted}
                onFocus={() => setIsSearchFocused(true)}
                onSubmitEditing={() => {
                  const trimmedQuery = searchQuery.trim();
                  if (trimmedQuery) {
                    setIsSearchFocused(false);
                    navigation.navigate('ProductListing', { searchQuery: trimmedQuery });
                  }
                }}
              />

              <Pressable onPress={() => setShowCameraSearch(true)}>
                <Camera size={18} color={COLORS.primary} />
              </Pressable>

              <Pressable
                onPress={() => {
                  const trimmedQuery = searchQuery.trim();
                  if (trimmedQuery) {
                    setIsSearchFocused(false);
                    navigation.navigate('ProductListing', { searchQuery: trimmedQuery });
                  }
                }}
              >
                <Search size={18} color={COLORS.primary} />
              </Pressable>
            </View>
          </View>

          {isSearchFocused ? (
            <Pressable onPress={() => { Keyboard.dismiss(); setIsSearchFocused(false); setSearchQuery(''); }} style={{ paddingLeft: 10 }}>
              <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Sort & Filter toolbar — separate row below search for breathing room */}
      {!isSearchFocused && (
        <View style={styles.filterToolbar}>
          <Text style={styles.filterToolbarCount}>
            {(isLoading || isCategoryLoading) ? 'Loading...' : `${filteredProducts.length} products`}
          </Text>
          <View style={{ flex: 1 }} />
          <View style={styles.filterToolbarButtons}>
            {/* SORT ICON — change the icon component below to customize */}
            <Pressable
              style={[styles.toolbarIconButton, sortOption !== 'relevance' && styles.toolbarIconButtonActive]}
              onPress={() => setShowSortModal(true)}
            >
              {/* Replace ChevronDown with your preferred sort icon */}
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
      )}

      {/* Featured Sort Indicator — replaced by filter chips above */}

      {/* Category chips rendered outside FlashList to preserve scroll position */}
      <CategoryChipsBar
        chips={categoryChips}
        selectedId={selectedCategory}
        onSelect={handleCategorySelect}
        brandColor={BRAND_COLOR}
      />

      {/* Product list as root scroll — enables virtualization */}
      <FlashList
        key={`shop-list-${listKey}`}
        ref={flashListRef}
        data={(isLoading || isCategoryLoading) ? [] : filteredProducts}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeaderComponent}
        ListFooterComponent={<View style={{ height: 60 }} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[BRAND_COLOR]}
            tintColor={BRAND_COLOR}
          />
        }
        ListEmptyComponent={listEmptyComponent}
        numColumns={2}
        masonry={true}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingTop: 15, paddingHorizontal: 14, paddingBottom: 60 }}
        renderItem={({ item }: { item: Product }) => (
          <View style={{ paddingHorizontal: 6, paddingVertical: 6 }}>
            <MasonryProductCard
              product={item}
              onPress={() => handleProductPress(item)}
              width={(width - 40 - 12) / 2}
            />
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />

      <CameraSearchModal visible={showCameraSearch} onClose={() => setShowCameraSearch(false)} />

      <ProductFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleFilterApply}
        initialFilters={filters}
        hideCategoryFilter={selectedCategory !== 'all'}
        availableCategories={
          // Exclude the currently selected category chip from filter options
          // since the user is already viewing that category's products
          selectedCategory !== 'all'
            ? availableCategories.filter(cat => cat.id !== selectedCategory)
            : availableCategories
        }
        availableBrands={availableBrands}
      />

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
  container: { flex: 1 },
  headerContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, borderBottomLeftRadius: 30, borderBottomRightRadius: 20 },
  locationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  locationLabel: { color: COLORS.textMuted, fontSize: 14, paddingBottom: 5 },
  locationSelector: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { color: COLORS.textHeadline, fontWeight: 'bold', fontSize: 16 },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFE5CC'
  },
  notifBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  searchBarWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  searchBarInner: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 24, paddingHorizontal: 15, height: 48, gap: 10 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textHeadline },
  headerRight: { flexDirection: 'row', gap: 10, paddingLeft: 5 },
  headerIconButton: { padding: 4, position: 'relative', marginTop: 15 },
  badge: { position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 9, fontWeight: '900' },
  scrollView: { flex: 1 },
  categoryScroll: { paddingHorizontal: 20, paddingVertical: 10, gap: 8, },
  chip: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  productsSection: { paddingHorizontal: 20, marginTop: 12 },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 0 },
  cardWrapper: { width: (width - 48) / 2, marginBottom: 12 },
  emptyBox: { width: '100%', alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textHeadline },
  emptyText: { fontSize: 13, color: COLORS.textMuted, marginTop: 5 },
  // Filter toolbar row (between search and category chips)
  filterToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: COLORS.background,
  },
  filterToolbarCount: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  filterToolbarButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolbarIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  onboardingBanner: {
    marginHorizontal: 12,
    marginTop: 0,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  onboardingGradient: {
    padding: 20,
    position: 'relative',
  },
  onboardingGlowTop: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  onboardingGlowBottom: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  onboardingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  onboardingLeft: {
    flex: 1,
  },
  onboardingEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  onboardingTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 6,
  },
  onboardingSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
    marginBottom: 16,
    fontWeight: '500',
  },
  onboardingButton: {
    backgroundColor: '#7C2D12',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  onboardingButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  onboardingRight: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  onboardingIconWrapper: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  onboardingMiniFloating: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
});
