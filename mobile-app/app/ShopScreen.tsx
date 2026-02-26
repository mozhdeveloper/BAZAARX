import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Dimensions,
  Modal,
  ScrollView,
  Image,
  StatusBar,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, SlidersHorizontal, X, Check, Camera, Star, CheckCircle2, Bell, MapPin, ChevronDown } from 'lucide-react-native';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import CameraSearchModal from '../src/components/CameraSearchModal';
import { ProductCard } from '../src/components/ProductCard';
import LocationModal from '../src/components/LocationModal';
import { GuestLoginModal } from '../src/components/GuestLoginModal';
// Use the service you provided
import { productService } from '../src/services/productService';
import { addressService } from '../src/services/addressService';
import { notificationService } from '../src/services/notificationService';
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
  slug: string;
  key: string;
  matchKeys: string[];
};

const PLACEHOLDER_IMAGE = 'https://placehold.co/400x400/e5e7eb/6b7280?text=Product';

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

const buildCategoryChip = (raw: { id: string; name: string; slug?: string | null }): CategoryChip => {
  const normalizedSlug = normalizeCategoryKey(raw.slug || raw.name);
  const normalizedName = normalizeCategoryKey(raw.name);
  const key = normalizedSlug || normalizedName || 'all';

  const matchSet = new Set<string>([key, normalizedName].filter(Boolean));
  [key, normalizedName].forEach((seed) => {
    expandCategoryAliases(seed).forEach((alias) => matchSet.add(alias));
  });

  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug || key,
    key,
    matchKeys: Array.from(matchSet),
  };
};

const DEFAULT_CATEGORY_CHIPS: CategoryChip[] = FALLBACK_CATEGORY_DATA.map(buildCategoryChip);

const resolveCategoryKey = (input: string | undefined, chips: CategoryChip[]): string => {
  const normalizedInput = normalizeCategoryKey(input);
  if (!normalizedInput || normalizedInput === 'all') return 'all';

  const exact = chips.find((chip) => chip.matchKeys.includes(normalizedInput));
  if (exact) return exact.key;

  const expandedInput = expandCategoryAliases(normalizedInput);
  const aliased = chips.find((chip) => expandedInput.some((candidate) => chip.matchKeys.includes(candidate)));

  return aliased?.key || 'all';
};

const categoryMatches = (
  selectedKey: string,
  productCategory: string | undefined,
  chips: CategoryChip[],
): boolean => {
  if (selectedKey === 'all') return true;

  const productKey = normalizeCategoryKey(productCategory);
  if (!productKey) return false;

  const selectedChip = chips.find((chip) => chip.key === selectedKey);
  if (!selectedChip) return productKey === selectedKey;

  if (selectedChip.matchKeys.includes(productKey)) return true;

  const productAliases = expandCategoryAliases(productKey);
  return productAliases.some((alias) => selectedChip.matchKeys.includes(alias));
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

  const categoryName = typeof row.category === 'string' ? row.category : row.category?.name || '';

  return {
    ...row,
    id: row.id,
    name: row.name ?? 'Unknown Product',
    price: toNumber(row.price, 0),
    originalPrice: originalPrice > 0 ? originalPrice : row.originalPrice,
    image: primaryImage,
    images: imageUrls.length > 0 ? imageUrls : [primaryImage],
    category: categoryName,
    seller: row.seller?.store_name || row.sellerName || 'Verified Seller',
    isFreeShipping: !!(row.is_free_shipping ?? row.isFreeShipping),
  };
};

const sortOptions = [
  { value: 'relevance', label: 'Best Match' },
  { value: 'newest', label: 'Newest Arrivals' },
  { value: 'popularity', label: 'Popularity' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
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

  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sellers, setSellers] = useState<any[]>([]);
  const [categoryChips, setCategoryChips] = useState<CategoryChip[]>(DEFAULT_CATEGORY_CHIPS);

  const { searchQuery: initialSearchQuery, customResults, category: initialCategory } = route.params || {};
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [selectedCategory, setSelectedCategory] = useState(() =>
    resolveCategoryKey(initialCategory, DEFAULT_CATEGORY_CHIPS),
  );
  const [selectedSort, setSelectedSort] = useState('relevance');

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
    setSelectedCategory(resolveCategoryKey(route.params?.category, categoryChips));
  }, [route.params?.category, categoryChips]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [productsResult, categoriesResult, sellersResult] = await Promise.allSettled([
          productService.getProducts({
            isActive: true,
            approvalStatus: 'approved',
          }),
          productService.getCategories(),
          supabase
            .from('sellers')
            .select('id, store_name, verified_at, approval_status')
            .order('created_at', { ascending: false }),
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
          const mappedChips = (categoriesResult.value || []).map((category: any) =>
            buildCategoryChip({
              id: category.id,
              name: category.name,
              slug: category.slug,
            }),
          );

          const chipsWithAll = [DEFAULT_CATEGORY_CHIPS[0], ...mappedChips];
          const deduped = Array.from(new Map(chipsWithAll.map((chip) => [chip.key, chip])).values());
          setCategoryChips(deduped.length > 1 ? deduped : DEFAULT_CATEGORY_CHIPS);
        } else {
          console.error('[ShopScreen] Failed loading categories:', categoriesResult.reason);
          setCategoryChips(DEFAULT_CATEGORY_CHIPS);
        }

        if (sellersResult.status === 'fulfilled') {
          if (sellersResult.value.error) {
            console.error('[ShopScreen] Failed loading sellers:', sellersResult.value.error);
            setSellers([]);
          } else {
            setSellers(sellersResult.value.data || []);
          }
        } else {
          console.error('[ShopScreen] Failed loading sellers:', sellersResult.reason);
          setSellers([]);
        }
      } catch (err) {
        console.error('[ShopScreen] Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // --- LOCATION & NOTIFICATION LOGIC ---
  useEffect(() => {
    const loadNotifications = async () => {
      if (!user?.id || isGuest) return;
      try {
        const data = await notificationService.getNotifications(user.id, 'buyer', 20);
        setUnreadCount(data.filter(n => !n.is_read).length);
      } catch (error) {
        console.error('[ShopScreen] Error loading notifications:', error);
      }
    };
    const unsubscribe = navigation.addListener('focus', loadNotifications);
    loadNotifications();
    return unsubscribe;
  }, [navigation, user?.id, isGuest]);

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
  };

  const filteredProducts = useMemo(() => {
    const sourceProducts = customResults && customResults.length > 0 ? customResults : dbProducts;

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

      const categoryMatch = categoryMatches(selectedCategory, productCategory, categoryChips);
      const priceMatch = productPrice >= min && productPrice <= max;

      return searchMatch && categoryMatch && priceMatch;
    });

    // Sort safely
    if (selectedSort === 'price-low') {
      filtered.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    } else if (selectedSort === 'price-high') {
      filtered.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    } else if (selectedSort === 'popularity') {
      filtered.sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0));
    } else if (selectedSort === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }

    return filtered;
  }, [dbProducts, searchQuery, selectedCategory, selectedSort, customResults, minPrice, maxPrice, categoryChips]);

  const verifiedStores = useMemo(() => {
    return (sellers || [])
      .map((seller) => {
        const storeProducts = dbProducts
          .filter((product) => product.seller_id === seller.id || product.sellerId === seller.id)
          .slice(0, 2);

        const productRatings = storeProducts.map((product) => toNumber(product.rating, 0)).filter((rating) => rating > 0);
        const computedRating =
          productRatings.length > 0
            ? Math.round((productRatings.reduce((sum, rating) => sum + rating, 0) / productRatings.length) * 10) / 10
            : 4.8;

        return {
          id: seller.id,
          name: seller.store_name || 'Store',
          verified: !!seller.verified_at || seller.approval_status === 'verified',
          rating: computedRating,
          products: storeProducts
            .map((product) => product.image)
            .filter((image: unknown): image is string => typeof image === 'string' && image.length > 0),
        };
      })
      .filter(s => s.products.length > 0);
  }, [sellers, dbProducts]);

  return (
    <View
      style={[styles.container, { backgroundColor: COLORS.background }]}
    >
      <StatusBar barStyle="dark-content" />

      <View
        style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: COLORS.background }]}
      >
        {/* Location Row */}
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

        {/* Search Row */}
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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categoryChips.map((cat) => (
            <Pressable
              key={cat.key}
              style={[styles.chip, selectedCategory === cat.key && { backgroundColor: BRAND_COLOR, borderColor: BRAND_COLOR }]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text style={[styles.chipText, selectedCategory === cat.key && { color: '#FFF' }]}>{cat.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {isLoading ? (
          <ActivityIndicator color={BRAND_COLOR} style={{ marginTop: 50 }} />
        ) : (
          <>
            {verifiedStores.length > 0 && searchQuery.trim() === '' && (
              <View style={styles.storesSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Featured Stores</Text>
                  <Pressable onPress={() => navigation.navigate('AllStores', { title: 'Verified Shops' })}>
                    <Text style={{ color: BRAND_COLOR, fontWeight: '700' }}>See All</Text>
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storesScroll}>
                  {verifiedStores.map((store) => (
                    <Pressable key={store.id} style={styles.storeCard} onPress={() => navigation.navigate('StoreDetail', { store })}>
                      <View style={styles.storeHeader}>
                        <View style={styles.storeLogo}><Text style={{ fontSize: 20 }}>🏬</Text></View>
                        <View style={styles.storeInfo}>
                          <View style={styles.storeNameRow}>
                            <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
                            {store.verified && <CheckCircle2 size={14} color={BRAND_COLOR} fill="#FFF" />}
                          </View>
                          <View style={styles.ratingRow}>
                            <Star size={10} color={BRAND_COLOR} fill={BRAND_COLOR} />
                            <Text style={styles.ratingText}>{store.rating}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.storeProducts}>
                        {store.products.map((url, i) => (
                          <Image key={i} source={{ uri: url }} style={styles.storeProductThumb} />
                        ))}
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.productsSection}>
              <Text style={styles.sectionTitle}>
                {searchQuery ? `Results for "${searchQuery}"` : 'All Products'}
              </Text>
              <View style={styles.productsGrid}>
                {filteredProducts.map((product) => (
                  <View key={product.id} style={styles.cardWrapper}>
                    <ProductCard product={product} onPress={() => navigation.navigate('ProductDetail', { product })} />
                  </View>
                ))}
                {!isLoading && filteredProducts.length === 0 && (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyTitle}>No products found</Text>
                    <Text style={styles.emptyText}>Try adjusting your filters or search terms.</Text>
                  </View>
                )}
              </View>
            </View>
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

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

              <Text style={[styles.filterSectionTitle, { marginTop: 20 }]}>Sort By</Text>
              {sortOptions.map((opt) => (
                <Pressable key={opt.value} style={styles.filterOption} onPress={() => setSelectedSort(opt.value)}>
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
  storesSection: { marginTop: 5 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#D97706' }, // Amber standard
  storesScroll: { paddingHorizontal: 20, paddingVertical: 15, gap: 15 },
  storeCard: { width: 260, backgroundColor: '#FFF', borderRadius: 16, padding: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  storeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  storeLogo: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  storeInfo: { flex: 1 },
  storeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  storeName: { fontSize: 14, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  storeProducts: { flexDirection: 'row', gap: 8 },
  storeProductThumb: { flex: 1, height: 60, borderRadius: 8, backgroundColor: '#F3F4F6' },
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
