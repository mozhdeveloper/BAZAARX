// Forced sync at 2026-03-12 11:30
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FlashList } from "@shopify/flash-list";
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell, Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Flame,
  FlaskConical,
  MapPin,
  MessageSquare,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Star,
  Timer,
  TrendingUp
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Keyboard,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AIChatModal from '../src/components/AIChatModal';
import CameraSearchModal from '../src/components/CameraSearchModal';
import LocationModal from '../src/components/LocationModal';
import { MasonryProductCard, ProductCard } from '../src/components/ProductCard';
import ProductRequestModal from '../src/components/ProductRequestModal';
// Removed NotificationsModal import
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image as ExpoImage } from 'expo-image';
import type { RootStackParamList, TabParamList } from '../App';
import { GuestLoginModal } from '../src/components/GuestLoginModal';
import { CURATED_CATEGORY_IMAGES } from '../src/constants/categories';
import { COLORS } from '../src/constants/theme';
import { adBoostService, type AdBoostMobile } from '../src/services/adBoostService';
import { categoryService } from '../src/services/categoryService';
import { discountService } from '../src/services/discountService';
import { featuredProductService, type FeaturedProductMobile } from '../src/services/featuredProductService';
import { notificationService } from '../src/services/notificationService';
import { productService } from '../src/services/productService';
import { sellerService } from '../src/services/sellerService';
import { useAddressStore } from '../src/stores/addressStore';
import { useAuthStore } from '../src/stores/authStore';
import { useSellerStore } from '../src/stores/sellerStore';
import type { Product } from '../src/types';
import type { Category } from '../src/types/database.types';
import { PLACEHOLDER_AVATAR, PLACEHOLDER_BANNER, PLACEHOLDER_PRODUCT, safeImageUri } from '../src/utils/imageUtils';
import { useFlashSaleVisibility } from '../src/hooks/useFlashSaleVisibility';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

// 5 columns, 20px padding each side, 10px gaps
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 20;
const GRID_GAP = 10;
const STATIC_CATEGORY_ITEM_WIDTH = (SCREEN_WIDTH - (HORIZONTAL_PADDING * 2) - (GRID_GAP * 4)) / 5;

const PROMO_SLIDES = [
  {
    id: '1',
    badge: 'LIMITED TIME OFFER',
    title: 'Summer Sale',
    highlight: 'Up to 50% Off',
    buttonText: 'Shop Now',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
    gradient: ['rgba(15, 23, 42, 0.4)', 'rgba(15, 23, 42, 0.9)'] as [string, string],
    screen: 'FlashSale',
    params: undefined as any
  },
  {
    id: '2',
    badge: 'NEW ARRIVALS',
    title: 'Premium Sound',
    highlight: 'Experience More',
    buttonText: 'View All',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    gradient: ['rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.8)'] as [string, string],
    screen: 'Shop',
    params: { category: 'electronics' }
  },
  {
    id: '3',
    badge: 'TRENDING NOW',
    title: 'Ergonomic Chair',
    highlight: 'Level Up Your Workspace',
    buttonText: 'Shop Now',
    image: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&q=80',
    gradient: ['rgba(0, 0, 0, 0.2)', 'rgba(0, 0, 0, 0.85)'] as [string, string],
    screen: 'Shop',
    params: { category: 'home-living' }
  }
];

const CategoryItem = React.memo(({ label, iconValue, imageUrl, itemWidth }: { label: string; iconValue: string | null; imageUrl?: string | null; itemWidth: number }) => {
  const [imageError, setImageError] = useState(false);
  const isIconName = iconValue ? /^[a-z0-9-]+$/.test(iconValue) : false;
  const displayValue = iconValue || 'tag';

  // Find a curated fallback based on name or slug if provided imageUrl fails or is missing
  const curatedFallback = useMemo(() => {
    const key = label.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
    return CURATED_CATEGORY_IMAGES[key] || null;
  }, [label]);

  const finalImageUri = (!imageError && (imageUrl || curatedFallback)) ? safeImageUri(imageUrl || curatedFallback, PLACEHOLDER_PRODUCT) : null;

  return (
    <View style={styles.categoryItm}>
      {finalImageUri ? (
        <View style={[styles.categoryIconBox, {
          width: itemWidth - 2,
          height: itemWidth - 2,
          borderRadius: (itemWidth - 2) / 2,
          backgroundColor: 'transparent',
          shadowColor: COLORS.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 4,
          overflow: 'hidden',
        }]}>
          <ExpoImage
            source={{ uri: finalImageUri }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
            onError={() => setImageError(true)}
          />
        </View>
      ) : (
        <LinearGradient
          colors={['#FFFFFF', '#FFFBF0']}
          style={[styles.categoryIconBox, {
            width: itemWidth - 2,
            height: itemWidth - 2,
            borderRadius: (itemWidth - 2) / 2,
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
            elevation: 4,
          }]}
        >
          {isIconName ? (
            <MaterialCommunityIcons
              name={displayValue as keyof typeof MaterialCommunityIcons.glyphMap}
              size={28}
              color={COLORS.textPrimary}
            />
          ) : (
            <Text style={{ fontSize: 24 }}>{displayValue}</Text>
          )}
        </LinearGradient>
      )}
      <Text
        style={styles.categoryLabel}
        numberOfLines={label.trim().includes(' ') ? 2 : 1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {label}
      </Text>
    </View>
  );
});

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const CATEGORY_ITEM_WIDTH = (screenWidth - (HORIZONTAL_PADDING * 2) - (GRID_GAP * 4) - 4) / 5;

  const BRAND_COLOR = COLORS.primary;
  const { user, isGuest, isAuthenticated, hasCompletedOnboarding, sessionVerified } = useAuthStore();

  // Log user data for debugging (moved from render level to avoid repeated logs)
  useEffect(() => {
    if (user?.id) {
      console.log('[HomeScreen] Current User Data:', {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        isGuest
      });
    }
  }, [user?.id, user?.name, user?.email, isGuest]);

  const [activeTab, setActiveTab] = useState<'Home' | 'Category'>('Home');
  const [showAIChat, setShowAIChat] = useState(false);
  // Removed showNotifications state
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showCameraSearch, setShowCameraSearch] = useState(false);
  const [showProductRequest, setShowProductRequest] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sellers, setSellers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // Removed local notifications array state as we only need count here
  const [unreadCount, setUnreadCount] = useState(0);
  const unsubRealtimeRef = useRef<(() => void) | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // LOCATION STATE — from shared store
  const { sessionAddress, setSessionAddress, loadSessionAddress } = useAddressStore();
  const deliveryAddress = sessionAddress.displayAddress;
  const deliveryCoordinates = sessionAddress.coordinates;
  const [showLocationModal, setShowLocationModal] = useState(false);

  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [flashSaleProducts, setFlashSaleProducts] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProductMobile[]>([]);
  const [boostedProducts, setBoostedProducts] = useState<AdBoostMobile[]>([]);

  // Discount map: productId → { price, originalPrice, discountPercent, campaignName }
  // Built from both seller campaign flash sales and global flash sales
  const [discountMap, setDiscountMap] = useState<Map<string, { price: number; originalPrice: number; discountPercent: number; campaignName?: string }>>(new Map());
  const scrollRef = useRef<ScrollView>(null);
  const [showLocationRow, setShowLocationRow] = useState(true); // Keep for future use if needed
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  const [dbCategories, setDbCategories] = useState<Category[]>([]); //

  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [hasDismissedOnboarding, setHasDismissedOnboarding] = useState(false);

  useEffect(() => {
    // Only show the modal after the session has been fully verified from the backend
    if (sessionVerified && isAuthenticated && !hasCompletedOnboarding && !isGuest && !hasDismissedOnboarding) {
      // console.log('[HomeScreen] 🚀 Onboarding modal condition met, waiting 1500ms...');
      const timer = setTimeout(() => {
        // Double check condition before showing
        const currentState = useAuthStore.getState();
        if (currentState.isAuthenticated && !currentState.hasCompletedOnboarding && !currentState.isGuest) {
          setShowOnboardingModal(true);
        }
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setShowOnboardingModal(false);
    }
  }, [sessionVerified, isAuthenticated, hasCompletedOnboarding, isGuest, hasDismissedOnboarding]);

  // Debounce search input to avoid re-filtering on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load recent searches from AsyncStorage on mount
  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        const [saved, savedPrefs] = await Promise.all([
          AsyncStorage.getItem('recentSearches'),
          AsyncStorage.getItem('userPreferences'),
        ]);
        if (saved) {
          setRecentSearches(JSON.parse(saved));
        }
      } catch (e) {
        console.error('[HomeScreen] Failed to load recent searches:', e);
      }
    };
    loadRecentSearches();
  }, []);

  const saveRecentSearch = useCallback(async (term: string) => {
    if (!term.trim()) return;
    const cleanTerm = term.trim();

    setRecentSearches(prev => {
      // Remove term if it already exists, then add to front
      const filtered = prev.filter(t => t.toLowerCase() !== cleanTerm.toLowerCase());
      const updated = [cleanTerm, ...filtered].slice(0, 10);

      // Persist to AsyncStorage
      AsyncStorage.setItem('recentSearches', JSON.stringify(updated)).catch(e => {
        console.error('[HomeScreen] Failed to save recent searches:', e);
      });

      return updated;
    });
  }, []);

  const { products: sellerProducts = [], seller } = useSellerStore();

  // Display name logic
  const username = user?.name ? user.name.split(' ')[0] : 'Guest';

  const [quickSearchProducts, setQuickSearchProducts] = useState<Product[]>([]);
  const [isQuickSearchLoading, setIsQuickSearchLoading] = useState(false);

  const normalizeQuickSearchProduct = useCallback((row: any): Product => {
    const images = Array.isArray(row.images)
      ? row.images.map((img: any) => (typeof img === 'string' ? img : img.image_url)).filter(Boolean)
      : [];

    const primaryImage = safeImageUri(
      row.image || row.primary_image_url || row.primary_image || images[0] || ''
    );

    // Check if product already has a discount from transformProduct (product_discounts campaigns)
    const rowPrice = typeof row.price === 'number' ? row.price : parseFloat(String(row.price || '0'));
    const rowOriginalPrice = row.originalPrice ?? row.original_price;
    const hasExistingDiscount = rowOriginalPrice > 0 && rowPrice > 0 && rowOriginalPrice > rowPrice;

    // Cross-reference flash sale discount map for products not already discounted
    const flashInfo = discountMap.get(row.id);
    const finalPrice = (!hasExistingDiscount && flashInfo) ? flashInfo.price : rowPrice;
    const finalOriginalPrice = (!hasExistingDiscount && flashInfo)
      ? flashInfo.originalPrice
      : (hasExistingDiscount ? rowOriginalPrice : row.originalPrice);
    const campaignDiscountType = row.campaignDiscountType || (flashInfo && !hasExistingDiscount ? 'percentage' : undefined);
    const campaignDiscountValue = row.campaignDiscountValue || (flashInfo && !hasExistingDiscount ? flashInfo.discountPercent : undefined);

    return {
      ...row,
      price: finalPrice,
      originalPrice: finalOriginalPrice,
      original_price: finalOriginalPrice,
      image: primaryImage,
      images: images.length > 0 ? images.map((img: string) => safeImageUri(img)) : [primaryImage],
      seller: row.seller?.store_name || row.sellerName || 'Verified Seller',
      category: typeof row.category === 'string' ? row.category : row.category?.name || '',
      campaignDiscountType,
      campaignDiscountValue,
    } as Product;
  }, [discountMap]);

  useEffect(() => {
    let active = true;
    const loadQuickSearch = async () => {
      const query = debouncedSearchQuery.trim();
      if (!query) {
        setQuickSearchProducts([]);
        setIsQuickSearchLoading(false);
        return;
      }

      setIsQuickSearchLoading(true);
      try {
        const results = await productService.getFilteredProducts(query, { limit: 12, offset: 0 });
        if (!active) return;
        setQuickSearchProducts((results || []).map(normalizeQuickSearchProduct).filter(p => {
          const variants = Array.isArray((p as any).variants) ? (p as any).variants : [];
          if (variants.length > 0) return variants.some((v: any) => Number(v.stock || 0) > 0);
          return Number(p.stock || 0) > 0;
        }));
      } catch (error) {
        if (!active) return;
        console.error('[HomeScreen] Quick search error:', error);
        setQuickSearchProducts([]);
      } finally {
        if (active) setIsQuickSearchLoading(false);
      }
    };

    loadQuickSearch();
    return () => { active = false; };
  }, [debouncedSearchQuery, normalizeQuickSearchProduct]);

  const filteredProducts = quickSearchProducts;

  // API-backed store search — runs in parallel with product quick-search.
  // Supplements the pre-fetched sellers list with a direct Supabase query so
  // stores are found even when the cached list is stale or incomplete.
  const [apiMatchedStores, setApiMatchedStores] = useState<any[]>([]);
  useEffect(() => {
    const q = debouncedSearchQuery.trim();
    if (!q) { setApiMatchedStores([]); return; }
    let active = true;
    (async () => {
      try {
        const results = await sellerService.getPublicStores({ searchQuery: q, limit: 5 });
        if (!active) return;
        setApiMatchedStores(results || []);
      } catch {
        // Pre-fetched list is the fallback — no action needed
      }
    })();
    return () => { active = false; };
  }, [debouncedSearchQuery]);

  // Merge pre-fetched filtered list with API results, de-duplicated by seller ID
  const filteredStores = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return [];
    const q = debouncedSearchQuery.toLowerCase();
    const fromList = (sellers || []).filter((s: any) =>
      (s.store_name || '').toLowerCase().includes(q) ||
      (s.business_name || '').toLowerCase().includes(q)
    );
    // Merge: API results take priority (richer data), fill gaps with list results
    const merged = new Map<string, any>();
    apiMatchedStores.forEach(s => { if (s.id) merged.set(String(s.id), s); });
    fromList.forEach(s => { if (s.id && !merged.has(String(s.id))) merged.set(String(s.id), s); });
    return Array.from(merged.values());
  }, [sellers, debouncedSearchQuery, apiMatchedStores]);

  const loadAllData = useCallback(async () => {
    setIsLoadingProducts(true);
    setFetchError(null);

    const [productsResult, flashResult, sellerFlashResult, featuredResult, boostedResult, sellersResult, categoriesResult] = await Promise.allSettled([
      productService.getProducts({ isActive: true, approvalStatus: 'approved', limit: 20 }),
      discountService.getGlobalFlashSaleProducts(),
      discountService.getFlashSaleProducts(),
      featuredProductService.getFeaturedProducts(50),
      adBoostService.getActiveBoostedProducts('featured', 50),
      sellerService.getAllSellers(),
      categoryService.getActiveCategories(),
    ]);

    // Build discount map from both flash sale sources
    const dsMap = new Map<string, { price: number; originalPrice: number; discountPercent: number; campaignName?: string }>();
    const addToDiscountMap = (items: any[]) => {
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
    if (flashResult.status === 'fulfilled') addToDiscountMap(flashResult.value);
    if (sellerFlashResult.status === 'fulfilled') addToDiscountMap(sellerFlashResult.value);
    setDiscountMap(dsMap);

    if (categoriesResult.status === 'fulfilled') {
      const rawCategories = categoriesResult.value || [];
      const unique = rawCategories.reduce((acc: Category[], curr) => {
        if (!acc.find(c => (c.slug && c.slug === curr.slug) || c.name.toLowerCase() === curr.name.toLowerCase())) {
          acc.push(curr);
        }
        return acc;
      }, []);
      setDbCategories(unique);
    }

    // Products
    if (productsResult.status === 'fulfilled') {
      const mapped: Product[] = (productsResult.value || []).map((row: any) => {
        const images = row.images?.map((img: any) =>
          typeof img === 'string' ? img : img.image_url
        ).filter(Boolean) || [];
        const primaryImage = safeImageUri(
          row.images?.find((img: any) => img.is_primary)?.image_url
          || images[0]
          || row.primary_image
          || ''
        );

        const rawVariants = Array.isArray(row.variants) ? row.variants : [];
        const variants = rawVariants.map((v: any) => ({
          id: v.id,
          product_id: row.id,
          sku: v.sku,
          variant_name: v.variant_name || `${v.option_1_value || v.color || ''} ${v.option_2_value || v.size || ''}`.trim() || 'Variant',
          size: v.size,
          color: v.color,
          option_1_value: v.option_1_value,
          option_2_value: v.option_2_value,
          price: v.price ?? row.price,
          stock: v.stock ?? 0,
          thumbnail_url: v.thumbnail_url ? safeImageUri(v.thumbnail_url) : undefined,
        }));

        // Check if product already has a discount from transformProduct (product_discounts campaigns)
        const rowPrice = typeof row.price === 'number' ? row.price : parseFloat(row.price || '0');
        const rowOriginalPrice = row.originalPrice ?? row.original_price;
        const hasExistingDiscount = rowOriginalPrice > 0 && rowPrice > 0 && rowOriginalPrice > rowPrice;

        // Cross-reference flash sale discount map for products not already discounted
        const flashInfo = dsMap.get(row.id);
        const finalPrice = (!hasExistingDiscount && flashInfo) ? flashInfo.price : rowPrice;
        const finalOriginalPrice = (!hasExistingDiscount && flashInfo)
          ? flashInfo.originalPrice
          : (hasExistingDiscount ? rowOriginalPrice : undefined);
        const campaignDiscountType = row.campaignDiscountType || (flashInfo && !hasExistingDiscount ? 'percentage' : undefined);
        const campaignDiscountValue = row.campaignDiscountValue || (flashInfo && !hasExistingDiscount ? flashInfo.discountPercent : undefined);

        return {
          ...row,
          price: finalPrice,
          originalPrice: finalOriginalPrice,
          original_price: finalOriginalPrice,
          image: primaryImage,
          images: images.length > 0 ? images.map((img: string) => safeImageUri(img)) : [primaryImage],
          seller: row.seller?.store_name || row.sellerName || 'Verified Seller',
          campaignDiscountType,
          campaignDiscountValue,
        } as Product;
      });
      const uniqueMapped = Array.from(new Map(mapped.map(item => [item.id, item])).values())
        .filter(p => {
          // Filter out products with no available stock
          const variants = Array.isArray((p as any).variants) ? (p as any).variants : [];
          if (variants.length > 0) return variants.some((v: any) => Number(v.stock || 0) > 0);
          return Number(p.stock || 0) > 0;
        });
      setDbProducts(uniqueMapped);
    } else {
      setFetchError((productsResult.reason as any)?.message || 'Failed to load products');
      setDbProducts([]);
    }

    // Flash sales — filter out products with 0 stock
    if (flashResult?.status === 'fulfilled') {
      const seen = new Set<string>();
      const unique = (flashResult.value || []).filter((p: any) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      }).filter((p: any) => {
        // Filter out products with 0 stock (all variants out of stock)
        const variants = p.variants || [];
        if (variants.length > 0) {
          const totalVariantStock = variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
          return totalVariantStock > 0;
        }
        return (p.stock || 0) > 0;
      });
      setFlashSaleProducts(unique);
    }

    // Featured + Boosted
    if (featuredResult?.status === 'fulfilled') setFeaturedProducts(featuredResult.value);
    if (boostedResult?.status === 'fulfilled') setBoostedProducts(boostedResult.value);

    if (sellersResult?.status === 'fulfilled' && sellersResult.value) setSellers(sellersResult.value);

    setIsLoadingProducts(false);
  }, []);

  // Use the new custom hook for visibility and countdown logic
  const { isVisible: isFlashSaleVisible, formattedTime: flashSaleTime } = useFlashSaleVisibility(
    flashSaleProducts,
    useCallback(() => {
      setFlashSaleProducts([]); // immediately clear stale data before async reload
      loadAllData();
    }, [loadAllData])
  );

  useEffect(() => { loadAllData(); }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadAllData();
    setIsRefreshing(false);
  }, [loadAllData]);

  // Consolidated flash sale countdown timer removed in favor of useFlashSaleVisibility hook
  // which handles both campaign timer, real-time sync, and auto-hide logic.

  // --- FETCH NOTIFICATIONS ---
  const loadNotifications = useCallback(async () => {
    if (!user?.id || isGuest) return;
    try {
      const data = await notificationService.getNotifications(user.id, 'buyer', 20);
      if (mountedRef.current) {
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (error) {
      console.error('[HomeScreen] Error loading notifications:', error);
    }
  }, [user?.id, isGuest]);

  // Separate effect for focus listener - only depends on navigation and user ID
  useEffect(() => {
    const unsubFocus = navigation.addListener('focus', async () => {
      if (user?.id && !isGuest) {
        try {
          const data = await notificationService.getNotifications(user.id, 'buyer', 20);
          if (mountedRef.current) {
            setUnreadCount(data.filter(n => !n.is_read).length);
          }
        } catch (error) {
          console.error('[HomeScreen] Error loading notifications on focus:', error);
        }
      }
    });
    return () => unsubFocus();
  }, [navigation, user?.id, isGuest]);

  // Separate effect for setting up subscriptions and polling - only depends on user ID and guest status
  useEffect(() => {
    mountedRef.current = true;

    // Initial load
    if (user?.id && !isGuest) {
      loadNotifications();
    }

    // Set up persistent real-time subscription if not already set up
    if (user?.id && !isGuest && !unsubRealtimeRef.current) {
      console.log('[HomeScreen] Setting up real-time subscription for buyer:', user.id);
      unsubRealtimeRef.current = notificationService.subscribeToNotifications(
        user.id,
        'buyer',
        (newNotification) => {
          console.log('[HomeScreen] New notification received:', newNotification);
          // Immediately increment badge
          if (mountedRef.current) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      );
    }

    // Clean up old polling interval if it exists
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // Poll every 30 seconds as fallback — 2s was causing re-renders during scroll
    if (user?.id && !isGuest) {
      pollIntervalRef.current = setInterval(async () => {
        if (mountedRef.current && user?.id && !isGuest) {
          try {
            const data = await notificationService.getNotifications(user.id, 'buyer', 20);
            if (mountedRef.current) {
              setUnreadCount(data.filter(n => !n.is_read).length);
            }
          } catch (error) {
            console.error('[HomeScreen] Error polling notifications:', error);
          }
        }
      }, 30000);
    }

    return () => {
      // Cleanup is handled by the separate unmount effect below
    };
  }, [user?.id, isGuest]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (unsubRealtimeRef.current) {
        console.log('[HomeScreen] Cleaning up real-time subscription');
        unsubRealtimeRef.current();
        unsubRealtimeRef.current = null;
      }
      if (pollIntervalRef.current) {
        console.log('[HomeScreen] Cleaning up polling interval');
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  // ... (Location logic — now via addressStore) ...
  useEffect(() => {
    let isMounted = true;
    if (isMounted) loadSessionAddress(user?.id ?? null);
    return () => { isMounted = false; };
  }, [user]);

  const handleSelectLocation = async (address: string, coords?: any, details?: any) => {
    await setSessionAddress(user?.id ?? null, address, coords, details);
  };

  const activeSlideRef = useRef(activeSlide);
  useEffect(() => { activeSlideRef.current = activeSlide; }, [activeSlide]);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextSlide = (activeSlideRef.current + 1) % PROMO_SLIDES.length;
      scrollRef.current?.scrollTo({ x: nextSlide * SCREEN_WIDTH, animated: true });
      setActiveSlide(nextSlide);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const popularProducts = useMemo(() => {
    return [...dbProducts].filter(p => p && p.name).sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 8);
  }, [dbProducts]);

  // Memoized merge of boosted + featured products (was an IIFE in JSX)
  const mergedFeaturedProducts = useMemo(() => {
    const seenIds = new Set<string>();
    const allItems: { key: string; mapped: any }[] = [];

    // Helper: compute discount pricing from product_discounts (active campaigns)
    const computeDiscountedPrice = (product: any): { price: number; originalPrice?: number; campaignDiscountType?: string; campaignDiscountValue?: number } => {
      const basePrice = Number(product.price) || 0;
      const now = new Date();

      // Check for active discount campaign via product_discounts join
      const activeDiscount = product.product_discounts?.find((pd: any) => {
        const campaign = pd.campaign;
        if (!campaign || campaign.status !== 'active') return false;
        const startsAt = new Date(campaign.starts_at);
        const endsAt = new Date(campaign.ends_at);
        return now >= startsAt && now <= endsAt;
      });

      if (activeDiscount) {
        const campaign = activeDiscount.campaign;
        const dType = activeDiscount.discount_type || campaign.discount_type;
        const dValue = Number(activeDiscount.discount_value || campaign.discount_value);
        let discountedPrice = basePrice;

        if (dType === 'percentage') {
          discountedPrice = Math.round(basePrice * (1 - dValue / 100));
          if (campaign.max_discount_amount) {
            const maxD = parseFloat(String(campaign.max_discount_amount));
            discountedPrice = Math.max(discountedPrice, basePrice - maxD);
          }
        } else if (dType === 'fixed_amount') {
          discountedPrice = Math.max(0, basePrice - dValue);
        }

        return {
          price: discountedPrice,
          originalPrice: basePrice,
          campaignDiscountType: dType === 'percentage' ? 'percentage' : undefined,
          campaignDiscountValue: dType === 'percentage' ? Math.round(dValue) : undefined,
        };
      }

      // Check flash sale discount map
      const flashInfo = discountMap.get(product.id);
      if (flashInfo && flashInfo.originalPrice > 0 && flashInfo.price < flashInfo.originalPrice) {
        return {
          price: flashInfo.price,
          originalPrice: flashInfo.originalPrice,
          campaignDiscountType: 'percentage',
          campaignDiscountValue: flashInfo.discountPercent,
        };
      }

      return { price: basePrice, originalPrice: (product as any).original_price };
    };

    for (const bp of boostedProducts) {
      const product = bp.product;
      if (!product || !product.name || seenIds.has(product.id)) continue;
      const totalStock = product.variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || 0;
      if (totalStock <= 0) continue;
      seenIds.add(product.id);
      const primaryImg = product.images?.find((img: any) => img.is_primary) || product.images?.[0];
      const reviews = product.reviews || [];
      const avgRating = reviews.length > 0 ? Math.round((reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length) * 10) / 10 : 0;
      const discountInfo = computeDiscountedPrice(product);
      allItems.push({
        key: `boost-${bp.id}`, mapped: {
          id: product.id, name: product.name,
          price: discountInfo.price,
          originalPrice: discountInfo.originalPrice,
          original_price: discountInfo.originalPrice,
          campaignDiscountType: discountInfo.campaignDiscountType,
          campaignDiscountValue: discountInfo.campaignDiscountValue,
          primary_image_url: primaryImg?.image_url, primary_image: primaryImg?.image_url,
          image: primaryImg?.image_url,
          images: product.images?.map((img: any) => img.image_url) || [],
          category: product.category?.name, seller: product.seller,
          rating: avgRating, review_count: reviews.length, stock: totalStock,
          sold: (product as any).sold_count ?? (product as any).sold ?? 0,
          is_active: !product.disabled_at,
        }
      });
    }

    for (const fp of featuredProducts) {
      const product = (fp as any).product;
      if (!product || !product.name || seenIds.has(product.id)) continue;
      const totalStock = product.variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || 0;
      if (totalStock <= 0) continue;
      seenIds.add(product.id);
      const primaryImg = product.images?.find((img: any) => img.is_primary) || product.images?.[0];
      const reviews = product.reviews || [];
      const avgRating = reviews.length > 0 ? Math.round((reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length) * 10) / 10 : 0;
      const discountInfo = computeDiscountedPrice(product);
      allItems.push({
        key: `feat-${(fp as any).id}`, mapped: {
          id: product.id, name: product.name,
          price: discountInfo.price,
          originalPrice: discountInfo.originalPrice,
          original_price: discountInfo.originalPrice,
          campaignDiscountType: discountInfo.campaignDiscountType,
          campaignDiscountValue: discountInfo.campaignDiscountValue,
          primary_image_url: primaryImg?.image_url, primary_image: primaryImg?.image_url,
          image: primaryImg?.image_url,
          images: product.images?.map((img: any) => img.image_url) || [],
          category: product.category?.name, seller: product.seller,
          rating: avgRating, review_count: reviews.length, stock: totalStock,
          sold: product.sold_count ?? (product as any).sold ?? 0,
          is_active: !product.disabled_at,
        }
      });
    }

    return allItems.slice(0, 10);
  }, [boostedProducts, featuredProducts, discountMap]);

  // Pre-index products by seller_id for O(n+m) verified stores computation
  const productsBySeller = useMemo(() => {
    const map = new Map<string, Product[]>();
    dbProducts.forEach(product => {
      const sellerId = product.seller_id || product.sellerId;
      if (!sellerId) return;
      if (!map.has(sellerId)) map.set(sellerId, []);
      map.get(sellerId)!.push(product);
    });
    return map;
  }, [dbProducts]);

  const verifiedStores = useMemo(() => {
    return (sellers || [])
      .filter((seller) => {
        // Only show stores from verified sellers (not blacklisted, suspended, etc.)
        if (seller.approval_status !== 'verified') return false;
        // suspended_at is null when not suspended
        if (seller.suspended_at) return false;
        // blacklisted_at is null when not blacklisted
        if (seller.blacklisted_at) return false;
        if (seller.is_permanently_blacklisted) return false;
        if (seller.temp_blacklist_until && new Date(seller.temp_blacklist_until) > new Date()) return false;
        return true;
      })
      .map((seller) => {
        const storeProducts = (productsBySeller.get(seller.id) || []).slice(0, 2);

        const productRatings = storeProducts.map((product) => Number(product.rating || 0)).filter((rating) => rating > 0);
        const computedRating = productRatings.length > 0
          ? Math.round((productRatings.reduce((sum, rating) => sum + rating, 0) / productRatings.length) * 10) / 10
          : 4.8;

        return {
          id: seller.id,
          name: seller.store_name || seller.storeName || 'Store',
          logo: safeImageUri(seller.avatar_url || seller.avatar || seller.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.store_name || seller.storeName || 'S')}&background=FFD89A&color=78350F`),
          verified: seller.approval_status === 'verified' || !!seller.verified_at,
          rating: computedRating,
          location: (() => {
            const city = (seller.business_profile?.city || seller.city || '').trim();
            const province = (seller.business_profile?.province || seller.province || '').trim();
            if (city && province) return `${city}, ${province}`;
            if (city) return city;
            if (province) return province;
            return 'Philippines';
          })(),
          products: storeProducts.map((product) => safeImageUri(product.image)).filter((image: unknown): image is string => typeof image === 'string' && image.length > 0),
        };
      })
      .filter(s => s.products.length > 0)
      .slice(0, 8);
  }, [sellers, productsBySeller]);

  // flashCountdown state is declared above with other state (before the consolidated timer)

  const handleCarouselScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / SCREEN_WIDTH);
    if (index !== activeSlideRef.current) setActiveSlide(index);
  }, []);

  const handleProductPress = useCallback((product: Product) => {
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery);
    }
    navigation.navigate('ProductDetail', { product });
  }, [navigation, searchQuery, saveRecentSearch]);

  const handleCategoryPress = useCallback((item: Category) => {
    // Check if this category has subcategories
    const hasSubcategories = dbCategories.some(c => c.parent_id === item.id);
    if (hasSubcategories) {
      navigation.navigate('Categories', { categoryId: item.id });
    } else {
      // No subcategories — go directly to ProductListing (same as CategoriesScreen)
      navigation.navigate('ProductListing', { searchQuery: item.name });
    }
  }, [dbCategories, navigation]);

  // Memoized scroll handler — avoids re-creating the function on every render
  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Removed location row hide/show logic to prevent layout shifts during scrolling
    // const y = e.nativeEvent.contentOffset.y;
    // if (y > scrollAnchor.current + 15 && y > 50) {
    //   if (showLocationRow) setShowLocationRow(false);
    //   scrollAnchor.current = y;
    // } else if (y < scrollAnchor.current - 15) {
    //   if (!showLocationRow) setShowLocationRow(true);
    //   scrollAnchor.current = y;
    // }
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 1. BRANDED HEADER */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
        <View style={styles.locationRow}>
          <Pressable onPress={() => setShowLocationModal(true)}>
            <Text style={styles.locationLabel}>Location</Text>
            <View style={styles.locationSelector}>
              <MapPin size={16} color={COLORS.primary} fill={COLORS.primary} />
              <Text numberOfLines={1} style={[styles.locationText, { maxWidth: 200, color: COLORS.textHeadline, fontWeight: 'bold', fontSize: 16 }]}>{deliveryAddress}</Text>
              <ChevronDown size={16} color={COLORS.textHeadline} />
            </View>
          </Pressable>

          {/* UPDATED NOTIFICATION BUTTON */}
          <Pressable
            onPress={() => {
              if (isGuest) {
                setShowGuestModal(true);
              } else {
                // Navigate to dedicated screen
                navigation.navigate('Notifications');
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

        {/* 2. PERSISTENT SEARCH BAR */}
        <View style={styles.searchBarWrapper}>
          <View style={[styles.searchBarInner, { backgroundColor: '#FFFFFF', borderRadius: 24, shadowColor: COLORS.primary, shadowOpacity: 0.1, shadowRadius: 15, elevation: 4 }]}>

            <TextInput
              style={[styles.searchInput, { color: COLORS.textHeadline }]}
              placeholder="Search products..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onSubmitEditing={() => {
                const trimmedQuery = searchQuery.trim();
                if (trimmedQuery) {
                  saveRecentSearch(trimmedQuery);
                  setIsSearchFocused(false);
                  navigation.navigate('ProductListing', { searchQuery: trimmedQuery });
                }
              }}
            />

            <Pressable onPress={() => setShowCameraSearch(true)}><Camera size={18} color={COLORS.primary} /></Pressable>
            <Pressable
              onPress={() => {
                const trimmedQuery = searchQuery.trim();
                if (trimmedQuery) {
                  saveRecentSearch(trimmedQuery);
                  setIsSearchFocused(false);
                  navigation.navigate('ProductListing', { searchQuery: trimmedQuery });
                }
              }}
            >
              <Search size={18} color={COLORS.primary} />
            </Pressable>
          </View>
          {isSearchFocused && (
            <Pressable onPress={() => { Keyboard.dismiss(); setIsSearchFocused(false); setSearchQuery(''); }} style={{ paddingLeft: 10 }}>
              <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Cancel</Text>
            </Pressable>

          )}
        </View>
      </View>

      <ScrollView
        style={styles.contentScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {isSearchFocused ? (
          <View style={styles.searchDiscovery}>
            {searchQuery.trim() === '' ? (
              <View style={styles.recentSection}>
                <Text style={styles.discoveryTitle}>Recent Searches</Text>
                {recentSearches.map((term, i) => (
                  <Pressable
                    key={i}
                    style={styles.searchRecentItem}
                    onPress={() => {
                      saveRecentSearch(term);
                      setIsSearchFocused(false);
                      navigation.navigate('ProductListing', { searchQuery: term });
                    }}
                  >
                    <Clock size={16} color="#9CA3AF" />
                    <Text style={styles.searchRecentText}>{term}</Text>
                  </Pressable>
                ))}
                {recentSearches.length === 0 && (
                  <Text style={{ color: '#9CA3AF', fontSize: 14, fontStyle: 'italic', marginTop: 10 }}>No recent searches</Text>
                )}
              </View>
            ) : (
              <View style={styles.resultsSection}>
                <Text style={styles.discoveryTitle}>{filteredProducts.length + filteredStores.length} results found</Text>
                {filteredProducts.length === 0 && filteredStores.length === 0 && (
                  <View style={{ alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 }}>
                    <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFF5F0', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <Search size={32} color="#FF6A00" />
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 6, textAlign: 'center' }}>
                      No results for "{searchQuery}"
                    </Text>
                    <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
                      Can't find what you're looking for? Request it and we'll notify you when a seller offers it!
                    </Text>
                    <Pressable
                      onPress={() => setShowProductRequest(true)}
                      style={({ pressed }) => [
                        {
                          backgroundColor: '#FF6A00',
                          borderRadius: 14,
                          paddingHorizontal: 28,
                          paddingVertical: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          elevation: 3,
                          shadowColor: '#FF6A00',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                        },
                        pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                      ]}
                    >
                      <Package size={18} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>Request This Product</Text>
                    </Pressable>
                  </View>
                )}
                {filteredStores.length > 0 && (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={styles.sectionHeader}>Stores</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                      {filteredStores.map(s => (
                        <Pressable
                          key={s.id}
                          style={styles.storeSearchResultCard}
                          onPress={() => {
                            if (searchQuery.trim()) {
                              saveRecentSearch(searchQuery);
                            }
                            navigation.navigate('StoreDetail', { store: { ...s, name: s.store_name, verified: !!s.is_verified } });
                          }}
                        >
                          <View style={styles.storeSearchIcon}><Text style={{ fontSize: 20 }}>🏬</Text></View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Text style={styles.storeSearchName} numberOfLines={1}>{s.store_name}</Text>
                              {s.is_verified && <CheckCircle2 size={14} color={BRAND_COLOR} fill="#FFF" />}
                            </View>
                            {(() => {
                              const city = (s.business_profile?.city || s.city || '').trim();
                              const province = (s.business_profile?.province || s.province || '').trim();
                              const location = city && province ? `${city}, ${province}` : city || province || 'Philippines';
                              return <Text style={styles.storeSearchLocation}>{location}</Text>;
                            })()}
                          </View>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
                {filteredProducts.length > 0 && (
                  <View style={styles.searchResultsContainer}>
                    <Text style={styles.sectionHeader}>Products</Text>
                    <FlashList
                      data={filteredProducts}
                      renderItem={({ item }: { item: Product }) => (
                        <View style={styles.searchProductCardWrapper}>
                          <MasonryProductCard
                            product={item}
                            onPress={() => handleProductPress(item)}
                            width={(screenWidth - 40 - 32) / 2}
                          />
                        </View>
                      )}
                      keyExtractor={(item: Product) => `search-${item.id}`}
                      numColumns={2}
                      scrollEnabled={false}
                      contentContainerStyle={{ paddingBottom: 2, paddingLeft: 12 }}
                    />
                  </View>
                )}
              </View>
            )}
          </View>
        ) : activeTab === 'Home' ? (
          <>
            {/* CAROUSEL */}
            <View style={styles.carouselContainer}>
              <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleCarouselScroll}
                scrollEventThrottle={16}
              >
                {PROMO_SLIDES.map((slide) => (
                  <Pressable
                    key={slide.id}
                    style={[styles.promoBox, { width: SCREEN_WIDTH - 40 }]}
                    onPress={() => {
                      if (slide.screen) {
                        navigation.navigate(slide.screen as any, slide.params);
                      }
                    }}
                  >
                    <ExpoImage
                      source={{ uri: safeImageUri(slide.image, PLACEHOLDER_BANNER) }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                    />
                    <LinearGradient
                      colors={slide.gradient as [string, string]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0.5 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.promoTextPart}>
                      <Text style={[styles.promoBadge, { color: COLORS.primary }]}>{slide.badge}</Text>
                      <Text style={[styles.promoHeadline, { color: '#FFFFFF' }]}>{slide.title}</Text>
                      <View style={styles.promoBottomRow}>
                        <Text style={[styles.promoHighlight, { color: COLORS.primary }]}>{slide.highlight}</Text>
                        <View style={styles.shopNowButton}>
                          <Text style={styles.shopNowText}>{slide.buttonText}</Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.paginationContainer}>
                {PROMO_SLIDES.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.paginationDot,
                      {
                        backgroundColor: i === activeSlide ? COLORS.primary : '#FDE68A', // Warm Orange vs Pale
                        width: i === activeSlide ? 20 : 8
                      }
                    ]}
                  />
                ))}
              </View>
            </View>


            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 12, marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.textPrimary }}>Categories</Text>
              <Pressable onPress={() => navigation.navigate('Categories' as any)}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.primary }}>See All</Text>
              </Pressable>
            </View>
            <View style={styles.categoryGrid}>
              {dbCategories.filter(item => item && item.name && !item.parent_id).slice(0, 10).map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.categoryGridItem, { width: CATEGORY_ITEM_WIDTH }]}
                  onPress={() => handleCategoryPress(item)}
                >
                  <CategoryItem label={item.name} iconValue={item.icon} imageUrl={item.image_url} itemWidth={CATEGORY_ITEM_WIDTH} />
                </Pressable>
              ))}
            </View>

            {/* ── BAZAARX LAB PIPELINE BANNER ── */}
            <Pressable
              onPress={() => navigation.navigate('LabPipeline')}
              style={({ pressed }) => [styles.labBanner, pressed && { opacity: 0.92 }]}
            >
              <LinearGradient
                colors={['#4C1D95', '#6B46C1', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.labBannerGradient}
              >
                <View style={styles.labBannerGlow} />
                <View style={styles.labBannerLeft}>
                  <View style={styles.labIconBox}>
                    <FlaskConical size={22} color="#E9D5FF" strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.labBannerEyebrow}>BAZAARX</Text>
                    <Text style={styles.labBannerTitle}>Community Request</Text>
                    <Text style={styles.labBannerSub}>Community-requested & tested products</Text>
                  </View>
                </View>
                <View style={styles.labBannerRight}>
                  <View style={styles.labExploreBtn}>
                    <Text style={styles.labExploreBtnText}>Explore →</Text>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>

            {/* Lab Quick Actions */}
            <View style={styles.labActionRow}>
              <Pressable
                onPress={() => setShowProductRequest(true)}
                style={({ pressed }) => [styles.labActionBtn, styles.labRequestBtn, pressed && { opacity: 0.85 }]}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.labActionBtnText}>Request a Product</Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('MyRequests')}
                style={({ pressed }) => [styles.labActionBtn, styles.labMyRequestsBtn, pressed && { opacity: 0.85 }]}
              >
                <Package size={16} color={COLORS.primary} />
                <Text style={[styles.labActionBtnText, { color: COLORS.primary }]}>My Requests</Text>
              </Pressable>
            </View>

            {/* FLASH SALE SECTION (No Container) */}
            {isFlashSaleVisible && (
              <View
                style={[styles.flashSaleContainer, { backgroundColor: '#FFFBF0' }]}
              >
                <View style={styles.flashSaleHeader}>
                  <View style={styles.flashSaleTitleRow}>
                    <Text style={styles.flashSaleTitle}>Flash Sale</Text>
                    <View style={styles.timerBadge}>
                      <Timer size={14} color="#FFF" />
                      <Text style={styles.timerText}>{flashSaleTime}</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => navigation.navigate('FlashSale')}>
                    <Text style={[styles.gridSeeAll, { color: COLORS.primary }]}>See More</Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10, gap: 12 }}
                >
                  {flashSaleProducts.filter(p => p && p.name).length > 0 && (
                    Array.from(new Map(flashSaleProducts.slice(0, 10).map(p => [p.id, p])).values()).map((product) => (
                      <View key={product.id} style={{ width: 150 }}>
                        <ProductCard product={product} onPress={() => handleProductPress(product)} variant="flash" />
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
            )}

            {/* FEATURED STORES SECTION */}
            {verifiedStores.length > 0 && (
              <View style={{ marginTop: 0, marginBottom: 5, paddingVertical: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.textPrimary }}>Featured Stores</Text>
                  <Pressable onPress={() => navigation.navigate('AllStores', { title: 'Featured Stores' })}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.primary }}>View All</Text>
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
                  {verifiedStores.filter(store => store && store.name).map((store) => (
                    <Pressable key={store.id} style={styles.storeVerticalCard} onPress={() => navigation.navigate('StoreDetail', { store })}>
                      <View style={styles.storeBannerContainer}>
                        <ExpoImage
                          source={{ uri: safeImageUri(store.products?.[0], PLACEHOLDER_BANNER) }}
                          style={styles.storeBannerImage}
                          contentFit="cover"
                        />
                        <LinearGradient
                          colors={['transparent', 'rgba(255,255,255,0.8)', '#FFFFFF']}
                          style={styles.storeBannerGradient}
                        />
                        <View style={styles.storeAvatarOverlap}>
                          <View style={styles.storeAvatarBorder}>
                            <ExpoImage
                              source={{ uri: safeImageUri(store.logo, PLACEHOLDER_AVATAR) }}
                              style={styles.storeAvatarImage}
                              contentFit="cover"
                            />
                          </View>
                        </View>
                      </View>

                      <View style={styles.storeCardBody}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                          <Text style={[styles.storeCardName, { marginBottom: 0 }]} numberOfLines={1}>{store.name}</Text>
                          <ChevronRight size={14} color={COLORS.gray400} />
                        </View>
                        <Text style={styles.storeCardSubtitle} numberOfLines={1}>
                          ★ {store.rating} • {store.location}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* FEATURED PRODUCTS SECTION */}
            {(featuredProducts.length > 0 || boostedProducts.length > 0) && (
              <View
                style={{ paddingVertical: 8, backgroundColor: '#FFFBF0' }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.textPrimary }}>Featured Products</Text>
                    <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#B45309' }}>Sponsored</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => navigation.navigate('Shop', { view: 'featured' })}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.primary }}>View All</Text>
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12 }}>
                  {mergedFeaturedProducts.map(({ key, mapped }) => (
                    <View key={key} style={{ width: 155, marginRight: 12 }}>
                      <MasonryProductCard
                        product={mapped as any}
                        onPress={() => handleProductPress(mapped as any)}
                        width={155}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.gridContainer}>
              <View style={styles.gridHeader}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.textPrimary }}>Popular Items</Text>
                <Pressable onPress={() => navigation.navigate('Shop', {})}><Text style={[styles.gridSeeAll, { color: COLORS.primary }]}>View All</Text></Pressable>
              </View>
              <View style={styles.gridBody}>
                <FlashList
                  data={popularProducts.slice(0, 10)}
                  renderItem={({ item }: { item: Product }) => (
                    <View style={{ paddingHorizontal: 6, paddingVertical: 6 }}>
                      <MasonryProductCard
                        product={item}
                        onPress={() => handleProductPress(item)}
                        width={(screenWidth - 40 - 12) / 2}
                      />
                    </View>
                  )}
                  keyExtractor={(item: Product, index: number) => `pop-${item.id}-${index}`}
                  numColumns={2}
                  masonry={true}
                  scrollEnabled={false}
                  contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 20 }}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Pressable
                style={({ pressed }) => [styles.productRequestButton, pressed && styles.productRequestButtonPressed]}
                onPress={() => setShowProductRequest(true)}
              >
                <View style={styles.productRequestContent}>
                  <View style={[styles.productRequestIconContainer, { backgroundColor: '#FFF5F0' }]}>
                    <MessageSquare size={24} color={BRAND_COLOR} />
                  </View>
                  <View style={styles.productRequestText}>
                    <Text style={styles.productRequestTitle}>Can't Find What You Need?</Text>
                    <Text style={styles.productRequestSubtitle}>Request a product and we'll find it for you</Text>
                  </View>
                </View>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.categoryExpandedContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={[styles.categorySectionTitle, { color: COLORS.textHeadline, marginBottom: 0 }]}>Shop by Category</Text>
              <Pressable onPress={() => navigation.navigate('Categories' as any)}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.primary }}>Browse All</Text>
              </Pressable>
            </View>
            <View style={styles.categoryGrid}>
              {dbCategories.filter(item => !item.parent_id).map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.categoryGridItem, { width: CATEGORY_ITEM_WIDTH }]}
                  onPress={() => handleCategoryPress(item)}
                >
                  <CategoryItem label={item.name} iconValue={item.icon} itemWidth={CATEGORY_ITEM_WIDTH} />
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <ProductRequestModal visible={showProductRequest} onClose={() => setShowProductRequest(false)} />
      <AIChatModal visible={showAIChat} onClose={() => setShowAIChat(false)} />
      <CameraSearchModal visible={showCameraSearch} onClose={() => setShowCameraSearch(false)} />
      <LocationModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSelectLocation={handleSelectLocation}
        currentAddress={deliveryAddress}
        initialCoordinates={deliveryCoordinates}
      />

      {showGuestModal && (
        <GuestLoginModal
          visible={true}
          onClose={() => setShowGuestModal(false)}
          message="Sign up to view your notifications."
        />
      )}

      {/* ONBOARDING MODAL */}
      <Modal
        visible={showOnboardingModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setHasDismissedOnboarding(true)}
      >
        <View style={styles.onboardingModalOverlay}>
          <View style={styles.onboardingModalContainer}>
            <Pressable
              onPress={() => {
                setShowOnboardingModal(false);
                setTimeout(() => {
                  navigation.navigate('CategoryPreference', { signupData: undefined });
                }, 300);
              }}
              style={({ pressed }) => [styles.onboardingBanner, pressed && { opacity: 0.95 }, { marginHorizontal: 0, marginTop: 0, marginBottom: 0 }]}
            >
              <LinearGradient
                colors={['#EA580C', '#F59E0B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.onboardingGradient}
              >
                {/* Decorative Elements */}
                <View style={styles.onboardingGlowTop} />
                <View style={styles.onboardingGlowBottom} />

                <View style={styles.onboardingContent}>
                  <View style={styles.onboardingRight}>
                    <View style={styles.onboardingIconWrapper}>
                      <ShoppingBag size={32} color="#FFF" strokeWidth={1.5} />
                    </View>
                    {/* Mini floating elements */}
                    <View style={styles.onboardingMiniFloating}>
                      <Star size={10} color="#FDE68A" fill="#FDE68A" />
                    </View>
                  </View>

                  <View style={styles.onboardingTextContainer}>
                    <Text style={styles.onboardingEyebrow}>ALMOST THERE!</Text>
                    <Text style={styles.onboardingTitle}>Unlock Your BazaarX Experience</Text>
                    <Text style={styles.onboardingSub}>Complete your onboarding to get personalized products.</Text>
                  </View>

                  <View style={styles.onboardingButtonContainer}>
                    <View style={styles.onboardingButton}>
                      <Text style={styles.onboardingButtonText}>Complete Profile</Text>
                      <ChevronRight size={14} color="#FFF" />
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          </View>
          <Pressable
            style={styles.remindMeLaterBtn}
            onPress={() => setHasDismissedOnboarding(true)}
          >
            <Text style={styles.remindMeLaterText}>Remind me later</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Modal code removed */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF0' },
  headerContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, borderBottomLeftRadius: 30, borderBottomRightRadius: 20, backgroundColor: '#FFFBF0', },
  locationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  locationLabel: { color: COLORS.textMuted, fontSize: 14, paddingBottom: 5 },
  locationSelector: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { color: COLORS.textHeadline, fontWeight: 'bold', fontSize: 16 },
  headerIconButton: { padding: 4, marginTop: 15 },
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
    borderColor: '#FFD89A'
  },
  notifBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  searchBarWrapper: { flexDirection: 'row', alignItems: 'center', },
  searchBarInner: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 15, height: 48, gap: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  searchActionButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  searchActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  searchBackBtn: { padding: 4 },
  contentScroll: { flex: 1 },
  // FLASH SALE STYLES
  flashSaleContainer: {
    marginHorizontal: 0, // Edge-to-edge scroll
    marginTop: 0,
    marginBottom: 5,
    paddingVertical: 8, // Further reduced for compact layout
    // Removed container styling (bg, shadow, border)
  },
  flashSaleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  flashSaleTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flashSaleTitle: { fontSize: 18, fontWeight: '800', color: '#D97706' },
  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  timerText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  carouselContainer: { marginVertical: 10 },
  promoBox: {
    height: 190,
    borderRadius: 20,
    marginHorizontal: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  promoBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 2,
  },
  shopNowButton: {
    backgroundColor: COLORS.primary, // Using brand primary color
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'center',
  },
  shopNowText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  promoTextPart: {
    zIndex: 10,
    width: '100%'
  },
  promoBadge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8
  },
  promoHeadline: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 0
  },
  promoHighlight: {
    fontSize: 24, // Slightly smaller to fit button
    fontWeight: '800',
    letterSpacing: -0.5,
    flexShrink: 1, // Allow text to shrink if needed
    paddingRight: 10
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, paddingTop: 5 },
  sectionTitle: { fontSize: 19, fontWeight: 'bold', color: COLORS.textHeadline },
  seeAll: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: HORIZONTAL_PADDING, marginBottom: 10, gap: GRID_GAP },
  categoryGridItem: { alignItems: 'center' },
  categoryItm: { alignItems: 'center', gap: 6 },
  categoryIconBox: { justifyContent: 'center', alignItems: 'center' },
  categoryLabel: { fontSize: 11, color: COLORS.textHeadline, fontWeight: '700', textAlign: 'center', lineHeight: 14, marginTop: 10 },
  itemBoxContainerVertical: { width: (SCREEN_WIDTH - 48) / 2, marginBottom: 12 },
  section: { paddingHorizontal: 20, marginTop: 5, marginBottom: 5, paddingVertical: 4 },
  productRequestButton: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  productRequestButtonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  productRequestContent: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  productRequestIconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  productRequestText: { flex: 1 },
  productRequestTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textHeadline },
  productRequestSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  gridContainer: { paddingHorizontal: 0, marginTop: 0, marginBottom: 5, paddingVertical: 8 },
  gridHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingTop: 0, paddingHorizontal: 20 },
  gridTitleText: { fontSize: 18, fontWeight: '900', color: '#D97706' },
  gridSeeAll: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  gridBody: { paddingHorizontal: 0 },
  searchDiscovery: { padding: 20 },
  discoveryTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textHeadline, marginBottom: 15 },
  recentSection: { marginBottom: 20 },
  searchRecentItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  searchRecentText: { fontSize: 15, color: COLORS.textMuted },
  resultsSection: { flex: 1 },
  searchResultsContainer: { marginTop: 10, },
  searchProductCardWrapper: { flex: 1, padding: 2 },
  categoryExpandedContent: { padding: 20 },
  categorySectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textHeadline, marginBottom: 15 },
  storeCard: { width: 260, marginBottom: 12, backgroundColor: '#FFF', borderRadius: 16, padding: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  storeVerticalCard: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  storeBannerContainer: {
    height: 100,
    width: '100%',
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  storeBannerImage: {
    width: '100%',
    height: '100%',
  },
  storeBannerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  storeAvatarOverlap: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  storeAvatarBorder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    padding: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  storeAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  storeCardBody: {
    paddingTop: 28,
    paddingHorizontal: 16,
    paddingBottom: 20,
    alignItems: 'center',
  },
  storeCardName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  storeCardSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    fontWeight: '500',
  },
  visitShopText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  storeCircleCard: {
    width: 90,
    alignItems: 'center',
    gap: 10,
    marginBottom: 5,
  },
  storeCircleContainer: {
    width: 88,
    height: 88,
    padding: 2,
    borderRadius: 44,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E7DCC5', // Soft beige border as seen in screenshot
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeCircleOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  storeCircleImage: {
    width: '100%',
    height: '100%',
  },
  storeCircleName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5D4037', // Brownish text to match the theme
    textAlign: 'center',
    lineHeight: 16,
  },
  storeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  storeLogo: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  storeInfo: { flex: 1 },
  storeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  storeName: { fontSize: 14, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  storeProducts: { flexDirection: 'row', gap: 8 },
  storeProductThumb: { flex: 1, height: 60, borderRadius: 8, backgroundColor: '#F3F4F6' },
  storeSearchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 16,
    width: 220,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  storeSearchIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' },
  storeSearchName: { fontSize: 14, fontWeight: '700', color: COLORS.textHeadline },
  storeSearchLocation: { fontSize: 12, color: COLORS.textMuted },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 6
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
  },

  /* ── Lab Pipeline Banner ── */
  labBanner: {
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 8,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  labBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    overflow: 'hidden',
  },
  labBannerGlow: {
    position: 'absolute',
    top: -30,
    left: -30,
    width: 100,
    height: 100,
    backgroundColor: 'rgba(233, 213, 255, 0.15)',
    borderRadius: 50,
  },
  labBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  labIconBox: {
    width: 46,
    height: 46,
    backgroundColor: 'rgba(233, 213, 255, 0.2)',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(233, 213, 255, 0.3)',
  },
  labBannerEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    color: '#C4B5FD',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  labBannerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 21,
  },
  labBannerSub: {
    fontSize: 11,
    color: '#DDD6FE',
    marginTop: 2,
    lineHeight: 15,
  },
  labBannerRight: {
    alignItems: 'flex-end',
    gap: 0,
    marginLeft: 10,
  },
  labStatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  labStatText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  labExploreBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  labExploreBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Lab Quick Action Row */
  labActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 8,
  },
  labActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    borderRadius: 14,
  },
  labRequestBtn: {
    backgroundColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  labMyRequestsBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: `${COLORS.primary}60`,
  },
  labActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ── Onboarding Modal & Banner ── */
  onboardingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onboardingModalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  remindMeLaterBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  remindMeLaterText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  onboardingBanner: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
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
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 20,
  },
  onboardingTextContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  onboardingButtonContainer: {
    alignItems: 'center',
    width: '100%',
  },
  onboardingEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  onboardingTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 30,
    marginBottom: 10,
    textAlign: 'center',
  },
  onboardingSub: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  onboardingButton: {
    backgroundColor: '#7C2D12',
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '85%',
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
