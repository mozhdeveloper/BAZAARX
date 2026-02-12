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
  Shirt, Smartphone, Sparkles, Sofa, Dumbbell, Gamepad2, Apple, Watch, Car, BookOpen,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { ProductCard } from '../src/components/ProductCard';
import CameraSearchModal from '../src/components/CameraSearchModal';
import AIChatModal from '../src/components/AIChatModal';
import LocationModal from '../src/components/LocationModal';
import ProductRequestModal from '../src/components/ProductRequestModal';
// REMOVED: import { NotificationsModal } from '../src/components/NotificationsModal';
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

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

const { width } = Dimensions.get('window');

const categories: { id: string; name: string; Icon: LucideIcon }[] = [
  { id: 'fashion', name: 'Fashion', Icon: Shirt },
  { id: 'electronics', name: 'Electronics', Icon: Smartphone },
  { id: 'beauty', name: 'Health &\nBeauty', Icon: Sparkles },
  { id: 'home-garden', name: 'Home &\nLiving', Icon: Sofa },
  { id: 'sports', name: 'Sports', Icon: Dumbbell },
  { id: 'toys', name: 'Toys &\nGames', Icon: Gamepad2 },
  { id: 'groceries', name: 'Groceries', Icon: Apple },
  { id: 'watches', name: 'Watches', Icon: Watch },
  { id: 'automotive', name: 'Automotive', Icon: Car },
  { id: 'books', name: 'Books', Icon: BookOpen },
];

const CATEGORY_ITEM_WIDTH = (width - 40 - 40) / 5;

const CategoryItem = ({ label, Icon }: { label: string; Icon: LucideIcon }) => (
  <View style={styles.categoryItm}>
    <View style={styles.categoryIconBox}>
      <Icon size={24} color={COLORS.primary} />
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
  // REMOVED: const [showNotifications, setShowNotifications] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showCameraSearch, setShowCameraSearch] = useState(false);
  const [showProductRequest, setShowProductRequest] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sellers, setSellers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Only track count for badge
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
  const scrollRef = useRef<ScrollView>(null);
  const scrollAnchor = useRef(0);
  const [showLocationRow, setShowLocationRow] = useState(true);

  const promoSlides = [
    {
      id: '1',
      title: '24% off shipping today on all purchases',
      brand: 'Official BazaarX Store',
      tag: 'SPECIAL OFFER',
      image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400',
      color: BRAND_COLOR
    },
    {
      id: '2',
      title: 'New Summer Collection Available Now',
      brand: 'Fashion Hub',
      tag: 'NEW ARRIVAL',
      image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400',
      color: '#059669'
    },
    {
      id: '3',
      title: 'Get 50% Off on Selected Electronics',
      brand: 'TechZone',
      tag: 'FLASH DEAL',
      image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400',
      color: '#DC2626'
    }
  ];

  const { products: sellerProducts = [], seller } = useSellerStore();
  const PLACEHOLDER_IMAGE = 'https://placehold.co/400x400/e5e7eb/6b7280?text=No+Image';

  // Product Loading Logic (kept same as before)
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

          return {
            id: row.id,
            name: row.name,
            price: typeof row.price === 'number' ? row.price : parseFloat(row.price || '0'),
            originalPrice: row.original_price,
            image: primaryImage,
            images: images.length > 0 ? images : [primaryImage],
            rating: ratingNum,
            reviewCount: reviewCount,
            sold: row.sold || 0, // Sold count calculated from order_items in productService
            seller: sellerName,
            sellerId: row.seller_id || row.seller?.id,
            isVerified: true,
            description: row.description || '',
            category: row.category?.name || row.category || '',
            stock: row.stock || 0,
          } as Product;
        });
        // Remove duplicates if any
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
    const fetchSellers = async () => {
      const data = await sellerService.getAllSellers();
      if (data) setSellers(data);
    };
    fetchSellers();
  }, []);

  // LOAD NOTIFICATIONS (Badge Count Only)
  const loadNotificationCount = useCallback(async () => {
    if (!user?.id || isGuest) return;
    try {
      // Just fetch recent ones to count unread or create a specific count method
      const data = await notificationService.getNotifications(user.id, 'buyer', 20);
      const unread = data.filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('[HomeScreen] Error loading notifications:', error);
    }
  }, [user?.id, isGuest]);

  // Refresh badge on focus (optional but good UX)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadNotificationCount();
    });
    loadNotificationCount();
    return unsubscribe;
  }, [navigation, loadNotificationCount]);

  // Location Loading Logic (kept same)
  useEffect(() => {
    const loadSavedLocation = async () => {
      try {
        const savedAddress = await AsyncStorage.getItem('currentDeliveryAddress');
        const savedCoords = await AsyncStorage.getItem('currentDeliveryCoordinates');

        if (savedAddress) setDeliveryAddress(savedAddress);
        if (savedCoords) setDeliveryCoordinates(JSON.parse(savedCoords));
      } catch (e) {
        console.error('[HomeScreen] Error loading from AsyncStorage:', e);
      }
    };
    loadSavedLocation();
  }, [user]);

  const handleSelectLocation = async (address: string, coords?: { latitude: number; longitude: number }, details?: any) => {
    setDeliveryAddress(address);
    if (coords) setDeliveryCoordinates(coords);
    await AsyncStorage.setItem('currentDeliveryAddress', address);
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

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetail', { product });
  };

  return (
    <LinearGradient
      colors={['#FFE5CC', '#FFE5CC']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
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
                <Text numberOfLines={1} style={[styles.locationText, { maxWidth: 200, color: '#1F2937', fontWeight: 'bold', fontSize: 16 }]}>{deliveryAddress}</Text>
                <ChevronDown size={16} color="#1F2937" />
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
              <Bell size={24} color="#1F2937" />
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

        {/* 2. SEARCH BAR */}
        <View style={styles.searchBarWrapper}>
          <View style={[styles.searchBarInner, { backgroundColor: '#FFFFFF' }]}>
            <Search size={18} color="#9CA3AF" />
            <TextInput
              style={[styles.searchInput, { color: '#1F2937' }]}
              placeholder="Search products..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
            />
            <Pressable onPress={() => setShowCameraSearch(true)}><Camera size={18} color="#9CA3AF" /></Pressable>
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
                    onPress={() => navigation.navigate('FlashSale' as any)}
                  >
                    <View style={[styles.promoBorder, { backgroundColor: slide.color }]} />
                    <View style={styles.promoTextPart}>
                      <View style={[styles.promoBadge, { backgroundColor: slide.color }]}>
                        <Text style={styles.promoBadgeText}>{slide.tag}</Text>
                      </View>
                      <Text style={styles.promoHeadline}>{slide.title}</Text>
                      <Text style={styles.promoBrandName}>{slide.brand}</Text>
                    </View>
                    <View style={styles.promoImgPart}>
                      <Image source={{ uri: slide.image }} style={styles.promoImg} />
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
                      { backgroundColor: i === activeSlide ? BRAND_COLOR : '#E5E7EB', width: i === activeSlide ? 20 : 8 }
                    ]}
                  />
                ))}
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Category</Text>
              <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
            </View>
            <View style={styles.categoryGrid}>
              {categories.map((item) => (
                <Pressable key={item.id} style={styles.categoryGridItem} onPress={() => navigation.navigate('Shop', { category: item.id })}>
                  <CategoryItem label={item.name} Icon={item.Icon} />
                </Pressable>
              ))}
            </View>

            <View style={styles.gridContainer}>
              <View style={styles.gridHeader}>
                <Text style={styles.gridTitleText}>Popular Items</Text>
                <Pressable onPress={() => navigation.navigate('Shop', {})}><Text style={styles.gridSeeAll}>View All</Text></Pressable>
              </View>
              <View style={styles.gridBody}>
                {popularProducts.map((product) => (
                  <View key={product.id} style={styles.itemBoxContainerVertical}>
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
            <Text style={styles.categorySectionTitle}>Shop by Category</Text>
            <View style={styles.categoryGrid}>
              {categories.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.categoryGridItem}
                  onPress={() => navigation.navigate('Shop', { category: item.id })}
                >
                  <CategoryItem label={item.name} Icon={item.Icon} />
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* --- MODALS --- */}
      {/* REMOVED: NotificationsModal */}

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
    </LinearGradient >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, borderBottomLeftRadius: 30, borderBottomRightRadius: 20 },
  locationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  locationLabel: { color: '#6B7280', fontSize: 14, paddingBottom: 5 },
  locationSelector: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { color: '#1F2937', fontWeight: 'bold', fontSize: 16 },
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
    borderColor: '#FFE5CC'
  },
  notifBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  searchBarWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  searchBarInner: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 15, height: 48, gap: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  contentScroll: { flex: 1 },
  carouselContainer: { marginVertical: 10 },
  promoBox: {
    height: 160,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginHorizontal: 20,
    overflow: 'hidden',
    position: 'relative'
  },
  promoBorder: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
  promoTextPart: { flex: 0.65 },
  promoBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 8 },
  promoBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  promoHeadline: { fontSize: 18, fontWeight: '800', color: '#1F2937', lineHeight: 24 },
  promoBrandName: { fontSize: 12, fontWeight: '700', color: '#666', marginTop: 4 },
  promoImgPart: { width: 80, height: 100, borderRadius: 6, overflow: 'hidden' },
  promoImg: { width: '100%', height: '100%' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, paddingTop: 5 },
  sectionTitle: { fontSize: 19, fontWeight: 'bold', color: '#1F2937' },
  seeAll: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginBottom: 10, gap: 10 },
  categoryGridItem: { width: CATEGORY_ITEM_WIDTH, alignItems: 'center' },
  categoryItm: { alignItems: 'center', gap: 6 },
  categoryIconBox: { width: CATEGORY_ITEM_WIDTH - 4, height: CATEGORY_ITEM_WIDTH - 4, borderRadius: 16, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  categoryLabel: { fontSize: 11, color: '#4B5563', fontWeight: '600', textAlign: 'center', lineHeight: 14 },
  itemBoxContainerVertical: { width: (width - 48) / 2, marginBottom: 12 },
  section: { paddingHorizontal: 20, marginVertical: 5 },
  productRequestButton: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  productRequestButtonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  productRequestContent: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  productRequestIconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  productRequestText: { flex: 1 },
  productRequestTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937' },
  productRequestSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  gridContainer: { paddingHorizontal: 20, marginBottom: 20 },
  gridHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  gridTitleText: { fontSize: 18, fontWeight: '900', color: '#1F2937' },
  gridSeeAll: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  gridBody: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  searchDiscovery: { padding: 20 },
  discoveryTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 15 },
  recentSection: { marginBottom: 20 },
  searchRecentItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  searchRecentText: { fontSize: 15, color: '#4B5563' },
  resultsSection: { flex: 1 },
  categoryExpandedContent: { padding: 20 },
  categorySectionTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 15 },
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
  storeSearchName: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  storeSearchLocation: { fontSize: 12, color: '#6B7280' },
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