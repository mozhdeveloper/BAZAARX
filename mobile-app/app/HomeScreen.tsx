import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Modal,
  Image,
  Dimensions,
  StatusBar,
  Alert,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search, Bell, Camera, Bot, X, Package, Timer, MapPin, ChevronDown, ArrowLeft, Clock,
  MessageSquare, MessageCircle, CheckCircle2, ShoppingBag, Truck, XCircle,
  Shirt, Smartphone, Sparkles, Sofa, Dumbbell, Gamepad2, Apple, Watch, Car, BookOpen, Armchair, SprayCan,
} from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { LucideIcon } from 'lucide-react-native';
import { ProductCard } from '../src/components/ProductCard';
import CameraSearchModal from '../src/components/CameraSearchModal';
import AIChatModal from '../src/components/AIChatModal';
import LocationModal from '../src/components/LocationModal';
import ProductRequestModal from '../src/components/ProductRequestModal';
// Removed NotificationsModal import
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList } from '../App';
import type { Product } from '../src/types';
import { productService } from '../src/services/productService';
import { sellerService } from '../src/services/sellerService';
import { addressService } from '../src/services/addressService';
import { notificationService, Notification } from '../src/services/notificationService';
import { useAuthStore } from '../src/stores/authStore';
import { useSellerStore } from '../src/stores/sellerStore';
import { GuestLoginModal } from '../src/components/GuestLoginModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../src/constants/theme';
import { discountService } from '../src/services/discountService';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

const { width } = Dimensions.get('window');

const categories: { id: string; name: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { id: 'fashion', name: 'Fashion', icon: 'tshirt-crew' },
  { id: 'electronics', name: 'Electronics', icon: 'cellphone' },
  { id: 'beauty', name: 'Health &\nBeauty', icon: 'bottle-tonic-plus' },
  { id: 'home-garden', name: 'Home &\nLiving', icon: 'sofa' },
  { id: 'sports', name: 'Sports', icon: 'dumbbell' },
  { id: 'toys', name: 'Toys &\nGames', icon: 'duck' },
  { id: 'groceries', name: 'Groceries', icon: 'food-apple' },
  { id: 'watches', name: 'Watches', icon: 'watch' },
  { id: 'automotive', name: 'Automotive', icon: 'car' },
  { id: 'books', name: 'Books', icon: 'book-open-variant' },
];

const CATEGORY_ITEM_WIDTH = (width - 40 - 40) / 5; // 5 columns, 20px padding each side, 10px gaps

const CategoryItem = ({ label, iconName }: { label: string; iconName: keyof typeof MaterialCommunityIcons.glyphMap }) => (
  <View style={styles.categoryItm}>
    <View style={[styles.categoryIconBox, { 
      backgroundColor: '#FFFBF5', // Lighter Parchment
      shadowColor: COLORS.primary, // Amber Glow
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 5,
      borderWidth: 1,
      borderColor: '#FFE0A3' // Soft Gold
    }]}>
      <MaterialCommunityIcons name={iconName} size={28} color={COLORS.primary} />
    </View>
    <Text style={styles.categoryLabel}>{label}</Text>
  </View>
);

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const BRAND_COLOR = COLORS.primary;
  const { user, isGuest } = useAuthStore();

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

  // LOCATION STATE
  const [deliveryAddress, setDeliveryAddress] = useState('Select Location');
  const [deliveryCoordinates, setDeliveryCoordinates] = useState<{ latitude: number, longitude: number } | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const [recentSearches] = useState(['wireless earbuds', 'leather bag']);
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [flashSaleProducts, setFlashSaleProducts] = useState<any[]>([]);
  const [flashTimer, setFlashTimer] = useState('00:00:00');
  const scrollRef = useRef<ScrollView>(null);
  const scrollAnchor = useRef(0);
  const [showLocationRow, setShowLocationRow] = useState(true);

  const promoSlides = [
    {
      id: '1',
      title: 'Super Deals',
      subtitle: 'Big savings on\ntop products!',
      buttonText: 'Shop Now',
      image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400', // Yellow Bag placeholder
      gradient: ['#FFFBF0', '#FFE0A3'], // Soft Amber Theme
      screen: 'Shop',
      params: { category: 'electronics' }
    },
    {
      id: '2',
      title: 'New Arrivals',
      subtitle: 'Summer Collection\nAvailable Now',
      buttonText: 'View All',
      image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400',
      gradient: ['#FFF9F0', '#FFEDD5'], // Soft Orange/Amber
      screen: 'Shop',
      params: { category: 'fashion' }
    },
    {
      id: '3',
      title: 'Flash Sale',
      subtitle: '50% Off Selected\nElectronics',
      buttonText: 'Shop Now',
      image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400',
      gradient: ['#FFF7ED', '#FFDBBB'], // Peach/Amber
      screen: 'FlashSale',
      params: undefined
    }
  ];

  const { products: sellerProducts = [], seller } = useSellerStore();
  const PLACEHOLDER_IMAGE = 'https://placehold.co/400x400/e5e7eb/6b7280?text=No+Image';

  // Display name logic
  const username = user?.name ? user.name.split(' ')[0] : 'Guest';

  const filteredProducts = searchQuery.trim()
    ? dbProducts.filter(p => (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const filteredStores = searchQuery.trim()
    ? (sellers || []).filter((s: any) =>
      (s.store_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.business_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    : [];

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoadingProducts(true);
      setFetchError(null);
      try {
        const data = await productService.getProducts({
          isActive: true,
          approvalStatus: 'approved'
        });

        const mapped: Product[] = (data || []).map((row: any) => {
          const images = row.images?.map((img: any) =>
            typeof img === 'string' ? img : img.image_url
          ).filter(Boolean) || [];
          const primaryImage = row.images?.find((img: any) => img.is_primary)?.image_url
            || images[0]
            || row.primary_image
            || '';

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
            thumbnail_url: v.thumbnail_url,
          }));

          const colors = Array.from(new Set(variants.map((v: any) => v.color).filter(Boolean))) as string[];
          const sizes = Array.from(new Set(variants.map((v: any) => v.size).filter(Boolean))) as string[];
          const option1Values = Array.from(new Set(variants.map((v: any) => v.option_1_value || v.color).filter(Boolean))) as string[];
          const option2Values = Array.from(new Set(variants.map((v: any) => v.option_2_value || v.size).filter(Boolean))) as string[];

          return {
            ...row,
            price: typeof row.price === 'number' ? row.price : parseFloat(row.price || '0'),
            image: primaryImage,
            images: images.length > 0 ? images : [primaryImage],
            seller: row.seller?.store_name || row.sellerName || 'Verified Seller',
          } as Product;
        });
        const uniqueMapped = Array.from(new Map(mapped.map(item => [item.id, item])).values());
        setDbProducts(uniqueMapped);
      } catch (e: any) {
        setFetchError(e?.message || 'Failed to load products');
        setDbProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    loadProducts();
  }, []);

  useEffect(() => {
    const loadFlashSales = async () => {
      try {
        const data = await discountService.getFlashSaleProducts();
        // Deduplicate by product ID — a product can belong to multiple campaigns
        const seen = new Set<string>();
        const unique = (data || []).filter((p: any) => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
        setFlashSaleProducts(unique);
      } catch (e) {
        console.error('Error loading flash sales:', e);
      }
    };
    loadFlashSales();
  }, []);

  useEffect(() => {
    if (flashSaleProducts.length === 0) return;

    const updateTimer = () => {
      // Find the soonest ending campaign
      const now = new Date().getTime();
      const endTiems = flashSaleProducts
        .map(p => new Date(p.campaignEndsAt).getTime())
        .filter(t => t > now)
        .sort((a, b) => a - b);

      if (endTiems.length === 0) {
        setFlashTimer('00:00:00');
        return;
      }

      const diff = endTiems[0] - now;
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setFlashTimer(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [flashSaleProducts]);

  useEffect(() => {
    const fetchSellers = async () => {
      const data = await sellerService.getAllSellers();
      if (data) setSellers(data);
    };
    fetchSellers();
  }, []);

  // --- FETCH NOTIFICATIONS ---
  const loadNotifications = useCallback(async () => {
    if (!user?.id || isGuest) return;
    try {
      const data = await notificationService.getNotifications(user.id, 'buyer', 20);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('[HomeScreen] Error loading notifications:', error);
    }
  }, [user?.id, isGuest]);

  useEffect(() => {
    // Refresh count on focus
    const unsubscribe = navigation.addListener('focus', () => {
      loadNotifications();
    });
    loadNotifications();
    return unsubscribe;
  }, [navigation, loadNotifications]);

  // ... (Location logic skipped for brevity, keeping existing) ...
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

  useEffect(() => {
    const interval = setInterval(() => {
      let nextSlide = activeSlide + 1;
      if (nextSlide >= promoSlides.length) nextSlide = 0;
      scrollRef.current?.scrollTo({ x: nextSlide * width, animated: true });
      setActiveSlide(nextSlide);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeSlide]);

  const popularProducts = useMemo(() => {
    return [...dbProducts].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 8);
  }, [dbProducts]);

  // Flash sale live countdown — rolling 3-hour window
  const [flashCountdown, setFlashCountdown] = useState('00:00:00');
  useEffect(() => {
    const getEndTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const nextBlock = Math.ceil((hours + 1) / 3) * 3;
      const end = new Date(now);
      end.setHours(nextBlock, 0, 0, 0);
      if (end.getTime() <= now.getTime()) end.setHours(end.getHours() + 3);
      return end.getTime();
    };
    const endTime = getEndTime();
    const tick = () => {
      const diff = endTime - Date.now();
      if (diff <= 0) { setFlashCountdown('00:00:00'); return; }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setFlashCountdown(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetail', { product });
  };

  return (
    <LinearGradient
      colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']} // Soft Parchment / Light Amber sweep
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" />

      {/* 1. BRANDED HEADER */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
        {showLocationRow && (
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
        )}

        {/* 2. PERSISTENT SEARCH BAR */}
        <View style={styles.searchBarWrapper}>
          <View style={[styles.searchBarInner, { backgroundColor: '#FFFFFF', borderRadius: 24, shadowColor: COLORS.primary, shadowOpacity: 0.1, shadowRadius: 15, elevation: 4 }]}>
            <Search size={18} color={COLORS.primary} />
            <TextInput
              style={[styles.searchInput, { color: COLORS.textHeadline }]}
              placeholder="Search products..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
            />
            <Pressable onPress={() => setShowCameraSearch(true)}><Camera size={18} color={COLORS.primary} /></Pressable>
          </View>
          {isSearchFocused && (
            <Pressable onPress={() => { setIsSearchFocused(false); setSearchQuery(''); }} style={{ paddingLeft: 10 }}>
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Cancel</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.contentScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        scrollEventThrottle={16}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const y = e.nativeEvent.contentOffset.y;
          if (y > scrollAnchor.current + 15 && y > 50) {
            if (showLocationRow) {
              setShowLocationRow(false);
              scrollAnchor.current = y;
            }
          } else if (y < scrollAnchor.current - 15) {
            if (!showLocationRow) {
              setShowLocationRow(true);
              scrollAnchor.current = y;
            }
          }
        }}
      >
        {isSearchFocused ? (
          <View style={styles.searchDiscovery}>
            {searchQuery.trim() === '' ? (
              <View style={styles.recentSection}>
                <Text style={styles.discoveryTitle}>Recent Searches</Text>
                {recentSearches.map((term, i) => (
                  <Pressable key={i} style={styles.searchRecentItem} onPress={() => setSearchQuery(term)}>
                    <Clock size={16} color="#9CA3AF" />
                    <Text style={styles.searchRecentText}>{term}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.resultsSection}>
                <Text style={styles.discoveryTitle}>{filteredProducts.length + filteredStores.length} results found</Text>
                {filteredProducts.length === 0 && filteredStores.length === 0 && (
                  <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 }}>
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
                          onPress={() => navigation.navigate('StoreDetail', { store: { ...s, name: s.store_name, verified: !!s.is_verified } })}
                        >
                          <View style={styles.storeSearchIcon}><Text style={{ fontSize: 20 }}>🏬</Text></View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Text style={styles.storeSearchName} numberOfLines={1}>{s.store_name}</Text>
                              {s.is_verified && <CheckCircle2 size={14} color={BRAND_COLOR} fill="#FFF" />}
                            </View>
                            <Text style={styles.storeSearchLocation}>{s.city}, {s.province}</Text>
                          </View>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
                {filteredProducts.length > 0 && (
                  <View>
                    <Text style={styles.sectionHeader}>Products</Text>
                    <View style={styles.gridBody}>
                      {filteredProducts.map(p => (
                        <View key={p.id} style={styles.itemBoxContainerVertical}>
                          <ProductCard product={p} onPress={() => handleProductPress(p)} />
                        </View>
                      ))}
                    </View>
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
                onScroll={(e) => {
                  const x = e.nativeEvent.contentOffset.x;
                  const index = Math.round(x / width);
                  if (index !== activeSlide) setActiveSlide(index);
                }}
                scrollEventThrottle={16}
              >
                {promoSlides.map((slide) => (
                  <Pressable
                    key={slide.id}
                    style={[styles.promoBox, { width: width - 40 }]}
                    onPress={() => {
                      if (slide.screen) {
                        navigation.navigate(slide.screen as any, slide.params);
                      }
                    }}
                  >
                    <LinearGradient
                      colors={slide.gradient as [string, string]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.promoTextPart}>
                      <Text style={[styles.promoHeadline, { color: '#D97706', fontSize: 24 }]}>{slide.title}</Text>
                      <Text style={[styles.promoBrandName, { color: '#92400E', fontSize: 14, fontWeight: '500', marginTop: 4 }]}>{slide.subtitle}</Text>
                      <View style={styles.shopNowButton}>
                        <Text style={styles.shopNowText}>{slide.buttonText}</Text>
                      </View>
                    </View>
                    <View style={styles.promoImgPart}>
                      <Image source={{ uri: slide.image }} style={styles.promoImg} resizeMode="contain" />
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.paginationContainer}>
                {promoSlides.map((_, i) => (
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


            <View style={styles.categoryGrid}>
              {categories.map((item) => (
                <Pressable key={item.id} style={styles.categoryGridItem} onPress={() => navigation.navigate('Shop', { category: item.id })}>
                  <CategoryItem label={item.name} iconName={item.icon} />
                </Pressable>
              ))}
            </View>

            {/* FLASH SALE SECTION (No Container) */}
            <LinearGradient
              colors={['#FFF9F9', '#FFF3F3', '#FFF9F9']} // Very light red tint for Flash Sale
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.flashSaleContainer}
            >
              <View style={styles.flashSaleHeader}>
                <View style={styles.flashSaleTitleRow}>
                  <Text style={styles.flashSaleTitle}>Flash Sale</Text>
                  <View style={styles.timerBadge}>
                    <Timer size={14} color="#FFF" />
                    <Text style={styles.timerText}>{flashTimer}</Text>
                  </View>
                </View>
                <Pressable onPress={() => navigation.navigate('FlashSale')}>
                  <Text style={[styles.gridSeeAll, { color: COLORS.primary }]}>See More</Text>
                </Pressable>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 15, gap: 12 }}
              >
                {flashSaleProducts.length > 0 ? (
                  Array.from(new Map(flashSaleProducts.slice(0, 10).map(p => [p.id, p])).values()).map((product) => (
                    <View key={product.id} style={{ width: 150 }}>
                      <ProductCard product={product} onPress={() => handleProductPress(product)} variant="flash" />
                    </View>
                  ))
                ) : (
                  popularProducts.slice(0, 5).map((product, i) => (
                    <View key={`popular-fallback-${product.id}-${i}`} style={{ width: 150 }}>
                      <ProductCard product={product} onPress={() => handleProductPress(product)} variant="flash" />
                    </View>
                  ))
                )}
              </ScrollView>
            </LinearGradient>

            {/* FEATURED STORES SECTION */}
            {sellers.length > 0 && (
              <View style={{ marginTop: 20, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, marginBottom: 12 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.textHeadline }}>Featured Stores</Text>
                  <Pressable onPress={() => navigation.navigate('Shop', {})}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.primary }}>View All</Text>
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 12 }}>
                  {sellers.slice(0, 8).map((store: any) => (
                    <Pressable
                      key={store.id}
                      onPress={() => navigation.push('StoreDetail', {
                        store: {
                          id: store.id,
                          name: store.store_name || store.storeName || 'Store',
                          image: store.avatar || store.logo || null,
                          rating: store.rating || 0,
                          verified: store.approval_status === 'verified',
                        }
                      })}
                      style={{
                        width: 100, alignItems: 'center', backgroundColor: '#FFF',
                        borderRadius: 16, padding: 12, elevation: 1,
                        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
                      }}
                    >
                      <Image
                        source={{ uri: store.avatar || store.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(store.store_name || store.storeName || 'S')}&background=FFD89A&color=78350F` }}
                        style={{ width: 56, height: 56, borderRadius: 28, marginBottom: 8, borderWidth: 1, borderColor: '#F3F4F6' }}
                      />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textHeadline, textAlign: 'center' }} numberOfLines={1}>{store.store_name || store.storeName || 'Store'}</Text>
                      {store.approval_status === 'verified' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
                          <CheckCircle2 size={10} color={COLORS.primary} />
                          <Text style={{ fontSize: 10, color: COLORS.primary, fontWeight: '600' }}>Verified</Text>
                        </View>
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.gridContainer}>
              <View style={styles.gridHeader}>
                <Text style={[styles.gridTitleText, { color: COLORS.primary }]}>Popular Items</Text>
                <Pressable onPress={() => navigation.navigate('Shop', {})}><Text style={[styles.gridSeeAll, { color: COLORS.primary }]}>View All</Text></Pressable>
              </View>
              <View style={styles.gridBody}>
                {popularProducts.map((product, i) => (
                  <View key={`pop-${product.id}-${i}`} style={styles.itemBoxContainerVertical}>
                    <ProductCard product={product} onPress={() => handleProductPress(product)} />
                  </View>
                ))}
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
            <Text style={[styles.categorySectionTitle, { color: COLORS.textHeadline }]}>Shop by Category</Text>
            <View style={styles.categoryGrid}>
              {categories.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.categoryGridItem}
                  onPress={() => navigation.navigate('Shop', { category: item.id })}
                >
                  <CategoryItem label={item.name} iconName={item.icon} />
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

      {/* Modal code removed */}
    </LinearGradient >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, borderBottomLeftRadius: 30, borderBottomRightRadius: 20 },
  locationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  locationLabel: { color: COLORS.textMuted, fontSize: 14, paddingBottom: 5 },
  locationSelector: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { color: COLORS.textHeadline, fontWeight: 'bold', fontSize: 16 },
  headerIconButton: { padding: 4 },
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
  searchBarWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingHorizontal: 0 },
  searchBarInner: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 15, height: 48, gap: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  searchBackBtn: { padding: 4 },
  contentScroll: { flex: 1 },
  // FLASH SALE STYLES
  flashSaleContainer: {
    marginHorizontal: 0, // Edge-to-edge scroll
    marginTop: 15,
    marginBottom: 5,
    paddingVertical: 20, // Add padding for the gradient backdrop
    // Removed container styling (bg, shadow, border)
  },
  flashSaleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, marginBottom: 15 },
  flashSaleTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flashSaleTitle: { fontSize: 18, fontWeight: '800', color: '#D97706' },
  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  timerText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  
  carouselContainer: { marginVertical: 10 },
  promoBox: {
    height: 180,
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 15, // High elevation for pop
    shadowColor: COLORS.primary, // Soft Amber Glow
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3, // Softened from 0.5
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: '#FFE0A3', // Soft Gold Border
    marginHorizontal: 20,
    overflow: 'hidden',
    position: 'relative'
  },
  shopNowButton: {
    backgroundColor: COLORS.primary, // Soft Amber
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    alignSelf: 'flex-start',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4
  },
  shopNowText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700'
  },
  promoTextPart: { flex: 0.55, paddingRight: 10 },
  promoHeadline: { fontSize: 26, fontWeight: '800', color: COLORS.textHeadline, lineHeight: 30 },
  promoBrandName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginTop: 8, lineHeight: 20 },
  promoImgPart: { flex: 0.45, height: 140, alignItems: 'center', justifyContent: 'center' },
  promoImg: { width: '100%', height: '100%' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, paddingTop: 5 },
  sectionTitle: { fontSize: 19, fontWeight: 'bold', color: COLORS.textHeadline },
  seeAll: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginBottom: 10, gap: 10 },
  categoryGridItem: { width: CATEGORY_ITEM_WIDTH, alignItems: 'center' },
  categoryItm: { alignItems: 'center', gap: 6 },
  categoryIconBox: { width: CATEGORY_ITEM_WIDTH - 4, height: CATEGORY_ITEM_WIDTH - 4, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  categoryLabel: { fontSize: 11, color: COLORS.textPrimary, fontWeight: '600', textAlign: 'center', lineHeight: 14, marginTop: 6 },
  itemBoxContainerVertical: { width: (width - 48) / 2, marginBottom: 12 },
  section: { paddingHorizontal: 20, marginVertical: 5 },
  productRequestButton: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  productRequestButtonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  productRequestContent: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  productRequestIconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  productRequestText: { flex: 1 },
  productRequestTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textHeadline },
  productRequestSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  gridContainer: { paddingHorizontal: 20, marginBottom: 20 },
  gridHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingTop: 20 },
  gridTitleText: { fontSize: 18, fontWeight: '900', color: '#D97706' },
  gridSeeAll: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  gridBody: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  searchDiscovery: { padding: 20 },
  discoveryTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textHeadline, marginBottom: 15 },
  recentSection: { marginBottom: 20 },
  searchRecentItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  searchRecentText: { fontSize: 15, color: COLORS.textMuted },
  resultsSection: { flex: 1 },
  categoryExpandedContent: { padding: 20 },
  categorySectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textHeadline, marginBottom: 15 },
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
  }
});