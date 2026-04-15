import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Dimensions,
  Modal,
  ScrollView,
  FlatList,
  StatusBar,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, SlidersHorizontal, X, Check, Camera, Star, CheckCircle2, Bell, MapPin, ChevronDown } from 'lucide-react-native';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import CameraSearchModal from '../src/components/CameraSearchModal';
import LocationModal from '../src/components/LocationModal';
import { GuestLoginModal } from '../src/components/GuestLoginModal';
import { FlashList } from "@shopify/flash-list";
import { ProductCard, MasonryProductCard } from '../src/components/ProductCard';
import { productService } from '../src/services/productService';
import { categoryService } from '../src/services/categoryService';
import { addressService } from '../src/services/addressService';
import { notificationService } from '../src/services/notificationService';
import { featuredProductService, type FeaturedProductMobile } from '../src/services/featuredProductService';
import { adBoostService, type AdBoostMobile } from '../src/services/adBoostService';
import { useAuthStore } from '../src/stores/authStore';
import { useSellerStore } from '../src/stores/sellerStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../src/lib/supabase';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList } from '../App';
import type { Product } from '../src/types';
import { COLORS } from '../src/constants/theme';

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

const sortOptions = [
  { value: 'default', label: 'Default' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Rating' },
  { value: 'popularity', label: 'Popularity' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'price-low', label: 'Price: Low to High' },
];

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
  const [selectedSort, setSelectedSort] = useState(route.params?.view === 'featured' ? 'default' : 'default');
  const [isFeaturedView, setIsFeaturedView] = useState(route.params?.view === 'featured');
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const shuffledIdsRef = useRef<string[]>([]);
  const flashListRef = useRef<any>(null);

  // Featured products state
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProductMobile[]>([]);
  const [boostedProducts, setBoostedProducts] = useState<AdBoostMobile[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);

  const [minPrice, setMinPrice] = useState('0');
  const [maxPrice, setMaxPrice] = useState('100000');
  const [multiSliderValue, setMultiSliderValue] = useState([0, 100000]);
  const [minInput, setMinInput] = useState('0');
  const [maxInput, setMaxInput] = useState('100000');

  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showCameraSearch, setShowCameraSearch] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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
          categoryService.getActiveCategories(),
        ]);

        if (productsResult.status === 'fulfilled') {
          const mapped: Product[] = (productsResult.value || []).map((row: any) => normalizeProductForShop(row));
          const uniqueMapped = Array.from(new Map(mapped.map((item) => [item.id, item])).values());
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
    flashListRef.current?.scrollToOffset({ animated: false, offset: 0 });

    shuffledIdsRef.current = [];

    try {
      const [productsResult, categoriesResult] = await Promise.allSettled([
        productService.getProducts({
          isActive: true,
          approvalStatus: 'approved',
          limit: SHOP_SCREEN_FETCH_LIMIT,
        }),
        categoryService.getActiveCategories(),
      ]);

      if (productsResult.status === 'fulfilled') {
        const mapped: Product[] = (productsResult.value || []).map((row: any) => normalizeProductForShop(row));
        const uniqueMapped = Array.from(new Map(mapped.map((item) => [item.id, item])).values());
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
      }

    } catch (err) {
      console.error('[ShopScreen] Error refreshing data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedSort, isFeaturedView, selectedCategory, searchQuery, minPrice, maxPrice]);

  useEffect(() => {
    const resetAllFilters = async () => {
      setSelectedSort('default');
      setIsFeaturedView(false);
      setSelectedCategory('all');
      setSearchQuery('');
      setMinPrice('0');
      setMaxPrice('100000');
      setMinInput('0');
      setMaxInput('100000');
      setMultiSliderValue([0, 100000]);
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

  const handleSelectLocation = async (address: string, coords?: any, details?: any) => {
    setDeliveryAddress(address);
    if (coords) setDeliveryCoordinates(coords);
    try {
      await AsyncStorage.setItem('currentDeliveryAddress', address);
      if (coords) await AsyncStorage.setItem('currentDeliveryCoordinates', JSON.stringify(coords));
      if (user?.id) await addressService.saveCurrentDeliveryLocation(user.id, address, coords || null, details);
    } catch (e) { console.error(e); }
  };

  const handleSliderChange = (values: number[]) => {
    setMultiSliderValue(values);
    setMinInput(values[0].toString());
    setMaxInput(values[1].toString());
    if (selectedSort === 'price-high' || selectedSort === 'price-low') {
      setSelectedSort('default');
    }
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
    let sourceProducts = dbProducts;

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const min = toNumber(minPrice, 0);
    const max = toNumber(maxPrice, 100000);

    let filtered = sourceProducts.filter((product) => {
      const productName = (product.name || '').toLowerCase();
      const productCategory = product.category || '';
      const productSeller = (product.seller || '').toLowerCase();
      const productPrice = toNumber(product.price, 0);

      const searchMatch =
        normalizedQuery.length === 0 ||
        productName.includes(normalizedQuery) ||
        productCategory.toLowerCase().includes(normalizedQuery) ||
        productSeller.includes(normalizedQuery);

      const categoryMatch =
        selectedCategory === 'all' ||
        product.category_id === selectedCategory ||
        (typeof product.category === 'string' && (
          product.category.toLowerCase() === selectedCategory.toLowerCase() ||
          normalizeCategoryKey(product.category) === normalizeCategoryKey(selectedCategory)
        ));
      const priceMatch = productPrice >= min && productPrice <= max;

      return searchMatch && categoryMatch && priceMatch;
    });

    if (isFeaturedView) {
      const featuredProductIds = new Set([
        ...featuredProducts.map(fp => fp.product_id),
        ...boostedProducts.map(bp => bp.product_id)
      ]);
      filtered = filtered.filter(p => featuredProductIds.has(p.id));
    }

    switch (selectedSort) {
      case 'rating':
        filtered.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case 'popularity':
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
      case 'default':
      default: {
        const order = shuffledIdsRef.current;
        if (order.length > 0) {
          const indexMap = new Map(order.map((id, i) => [id, i]));
          filtered.sort((a, b) => (indexMap.get(a.id) ?? 9999) - (indexMap.get(b.id) ?? 9999));
        }
        break;
      }
    }

    return filtered;
  }, [dbProducts, searchQuery, selectedCategory, selectedSort, isFeaturedView, minPrice, maxPrice, categoryChips, featuredProducts, boostedProducts]);

  useEffect(() => {
    setIsProductsLoading(true);
    const timer = setTimeout(() => {
      setIsProductsLoading(false);
      flashListRef.current?.scrollToOffset({ animated: false, offset: 0 });
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedCategory, selectedSort, isFeaturedView, minPrice, maxPrice, searchQuery]);


  const handleProductPress = useCallback((product: Product) => {
    navigation.navigate('ProductDetail', { product });
  }, [navigation]);

  const keyExtractor = useCallback((item: Product) => item.id, []);

  // renderProductItem removed in favor of inline renderItem in MasonryFlashList constants

  const listEmptyComponent = useMemo(() => {
    if (isLoading) return <ActivityIndicator color={BRAND_COLOR} style={{ marginTop: 50 }} />;
    return (
      <View style={[styles.productsSection, { marginTop: 20 }]}>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptyText}>Try adjusting your filters or search terms.</Text>
          {(selectedCategory !== 'all' || searchQuery !== '' || selectedSort !== 'default' ||
            isFeaturedView || minPrice !== '0' || maxPrice !== '100000') && (
            <Pressable
              onPress={async () => {
                setSelectedSort('default');
                setIsFeaturedView(false);
                setSelectedCategory('all');
                setSearchQuery('');
                setMinPrice('0');
                setMaxPrice('100000');
                setMinInput('0');
                setMaxInput('100000');
                setMultiSliderValue([0, 100000]);
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
  }, [isLoading, selectedCategory, searchQuery, selectedSort, isFeaturedView, minPrice, maxPrice, navigation]);

  const listHeaderComponent = useMemo(() => (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
        {categoryChips.map((cat) => (
          <Pressable
            key={cat.id}
            style={[styles.chip, selectedCategory === cat.id && { backgroundColor: BRAND_COLOR, borderColor: BRAND_COLOR }]}
            onPress={async () => {
              setSelectedCategory(cat.id);
            }}
          >
            <Text style={[styles.chipText, selectedCategory === cat.id && { color: '#FFF' }]}>{cat.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {(selectedSort !== 'default' || isFeaturedView || minPrice !== '0' || maxPrice !== '100000') && (
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
          {selectedSort !== 'default' && (
            <Pressable
              onPress={async () => {
                setSelectedSort('default');
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
                {sortOptions.find((o: { value: string; label: string }) => o.value === selectedSort)?.label || selectedSort}
              </Text>
              <X size={12} color="#B45309" />
            </Pressable>
          )}
          {(minPrice !== '0' || maxPrice !== '100000') && (
            <Pressable
              onPress={() => {
                setMinPrice('0'); setMaxPrice('100000');
                setMinInput('0'); setMaxInput('100000');
                setMultiSliderValue([0, 100000]);
              }}
              style={{
                flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5',
                borderWidth: 1, borderColor: '#10B981', borderRadius: 20,
                paddingHorizontal: 12, paddingVertical: 6,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#065F46', marginRight: 4 }}>
                ₱{Number(minPrice).toLocaleString()} – ₱{Number(maxPrice).toLocaleString()}
              </Text>
              <X size={12} color="#065F46" />
            </Pressable>
          )}
          <Pressable
            onPress={async () => {
              setSelectedSort('default');
              setIsFeaturedView(false);
              setSelectedCategory('all');
              setSearchQuery('');
              setMinPrice('0'); setMaxPrice('100000');
              setMinInput('0'); setMaxInput('100000');
              setMultiSliderValue([0, 100000]);
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
  ), [categoryChips, selectedCategory, selectedSort, isFeaturedView, minPrice, maxPrice]);

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
          <View style={[styles.searchBarWrapper, (isSearchFocused || !showFiltersModal) && { marginRight: 0 }]}>
            <View style={[styles.searchBarInner, { backgroundColor: '#FFFFFF', borderRadius: 24, shadowColor: COLORS.primary, shadowOpacity: 0.1, shadowRadius: 15, elevation: 4 }]}>
              <Search size={18} color={COLORS.primary} />
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
            </View>
          </View>

          {isSearchFocused ? (
            <Pressable onPress={() => { setIsSearchFocused(false); setSearchQuery(''); }} style={{ paddingLeft: 10 }}>
              <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
          ) : (
            <View style={styles.headerRight}>
              <Pressable style={styles.headerIconButton} onPress={() => setShowFiltersModal(true)}>
                <SlidersHorizontal size={24} color={COLORS.textHeadline} />
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* Featured Sort Indicator — replaced by filter chips above */}

      {/* Skeleton overlay for filter/sort changes and pull-to-refresh */}
      {(isProductsLoading || isRefreshing) && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, backgroundColor: COLORS.background, paddingHorizontal: 20, paddingTop: insets.top + 110 }}>
          {[...Array(3)].map((_, row) => (
            <View key={`skel-row-${row}`} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              {[0, 1].map((col) => (
                <View key={`skel-${row}-${col}`} style={{ width: (width - 40 - 12) / 2, backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6' }}>
                  <View style={{ aspectRatio: 1, backgroundColor: '#E5E7EB' }} />
                  <View style={{ padding: 12, gap: 8 }}>
                    <View style={{ height: 14, backgroundColor: '#E5E7EB', borderRadius: 6, width: '85%' }} />
                    <View style={{ height: 12, backgroundColor: '#E5E7EB', borderRadius: 6, width: '60%' }} />
                    <View style={{ height: 16, backgroundColor: '#E5E7EB', borderRadius: 6, width: '40%' }} />
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Product list as root scroll — enables virtualization */}
      <FlashList
        ref={flashListRef}
        data={isLoading ? [] : filteredProducts}
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

      <Modal visible={showFiltersModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter & Sort</Text>
              <Pressable onPress={() => setShowFiltersModal(false)}><X size={24} color={COLORS.textHeadline} /></Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.filterSectionTitle}>Price Range</Text>
              <View style={styles.priceInputsRow}>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceInputLabel}>Min (₱)</Text>
                  <TextInput
                    style={styles.priceTextInput}
                    value={minInput}
                    onChangeText={setMinInput}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceInputLabel}>Max (₱)</Text>
                  <TextInput
                    style={styles.priceTextInput}
                    value={maxInput}
                    onChangeText={setMaxInput}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.sliderContainer}>
                <MultiSlider
                  values={[multiSliderValue[0], multiSliderValue[1]]}
                  sliderLength={width - 80}
                  onValuesChange={handleSliderChange}
                  min={0}
                  max={100000}
                  step={500}
                  selectedStyle={{ backgroundColor: BRAND_COLOR }}
                  markerStyle={{ backgroundColor: '#FFF', borderColor: BRAND_COLOR, borderWidth: 2 }}
                />
              </View>

              <Text style={styles.filterSectionTitle}>Sort By</Text>
              {sortOptions.map((opt: { value: string; label: string }) => (
                <Pressable
                  key={opt.value}
                  style={styles.filterOption}
                  onPress={async () => {
                    setSelectedSort(opt.value);
                    try {
                      if (opt.value === 'default') {
                        await AsyncStorage.removeItem('shopSortState');
                      } else {
                        await AsyncStorage.setItem('shopSortState', opt.value);
                      }
                    } catch (error) {
                      console.error('[ShopScreen] Error saving sort state:', error);
                    }
                  }}
                >
                  <Text style={[styles.filterText, selectedSort === opt.value && { color: BRAND_COLOR }]}>{opt.label}</Text>
                  {selectedSort === opt.value && <Check size={20} color={BRAND_COLOR} />}
                </Pressable>
              ))}

              <Pressable
                style={[styles.applyButton, { backgroundColor: BRAND_COLOR }]}
                onPress={() => {
                  setMinPrice(minInput);
                  setMaxPrice(maxInput);
                  setShowFiltersModal(false);
                }}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  headerIconButton: { padding: 4, position: 'relative' },
  badge: { position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 9, fontWeight: '900' },
  scrollView: { flex: 1 },
  categoryScroll: { paddingHorizontal: 20, paddingVertical: 8, gap: 10 },
  chip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 25, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  productsSection: { paddingHorizontal: 20, marginTop: 15 },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 0 },
  cardWrapper: { width: (width - 48) / 2, marginBottom: 12 },
  emptyBox: { width: '100%', alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textHeadline },
  emptyText: { fontSize: 13, color: COLORS.textMuted, marginTop: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalBody: { padding: 24 },
  filterSectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 15 },
  priceInputsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  priceInputContainer: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  priceInputLabel: { fontSize: 10, color: COLORS.textMuted },
  priceTextInput: { fontSize: 14, fontWeight: '700', marginTop: 2, color: COLORS.textHeadline },
  sliderContainer: { alignItems: 'center', marginVertical: 10 },
  filterOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  filterText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  applyButton: { marginTop: 25, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  applyButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
