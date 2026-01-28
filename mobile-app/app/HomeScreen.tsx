import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Bell, Camera, Bot, X, Package, Timer, MapPin, ChevronDown, ArrowLeft, Clock, MessageSquare, MessageCircle } from 'lucide-react-native';
import { ProductCard } from '../src/components/ProductCard';
import CameraSearchModal from '../src/components/CameraSearchModal';
import AIChatModal from '../src/components/AIChatModal';
import LocationModal from '../src/components/LocationModal';
import ProductRequestModal from '../src/components/ProductRequestModal';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList } from '../App';
import type { Product } from '../src/types';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/stores/authStore';
import { useSellerStore } from '../src/stores/sellerStore';
import { GuestLoginModal } from '../src/components/GuestLoginModal';
import { COLORS } from '../src/constants/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

const { width } = Dimensions.get('window');

const categories = [
  { id: 'electronics', name: 'Electronics', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300' },
  { id: 'fashion', name: 'Fashion', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=300' },
  { id: 'home-garden', name: 'Home & Living', image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=300' },
  { id: 'beauty', name: 'Beauty', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300' },
  { id: 'sports', name: 'Sports', image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=300' },
];

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const BRAND_COLOR = COLORS.primary;
  const { user, isGuest } = useAuthStore(); // Use global auth store

  const [activeTab, setActiveTab] = useState<'Home' | 'Category'>('Home');
  const [showAIChat, setShowAIChat] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showCameraSearch, setShowCameraSearch] = useState(false);
  const [showProductRequest, setShowProductRequest] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('123 Main St, Manila');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [recentSearches] = useState(['wireless earbuds', 'leather bag']);
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

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
      color: '#059669' // Green
    },
    {
      id: '3',
      title: 'Get 50% Off on Selected Electronics',
      brand: 'TechZone',
      tag: 'FLASH DEAL',
      image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400',
      color: '#DC2626' // Red
    }
  ];

  // Fetch seller products and convert to buyer Product format
  const sellerProducts = useSellerStore((state) => state.products);
  const seller = useSellerStore((state) => state.seller);

  const convertedSellerProducts: Product[] = sellerProducts
    .filter(p => p.isActive) // Only show active products
    .map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      originalPrice: p.originalPrice,
      image: p.image,
      images: p.images,
      rating: 4.5, // Default rating for new products
      sold: p.sold,
      seller: seller.storeName,
      sellerId: seller.id,
      sellerRating: 4.9,
      sellerVerified: true,
      isFreeShipping: p.price >= 1000, // Free shipping for orders over 1000
      isVerified: true,
      location: `${seller.city}, ${seller.province}`,
      description: p.description,
      category: p.category,
      stock: p.stock,
    }));

  // Display name logic
  const username = user?.name ? user.name.split(' ')[0] : 'Guest';

  const notifications = [
    { id: '1', title: 'Order Shipped! 📦', message: 'Your order #A238567K has been shipped!', time: '2h ago', read: false, icon: Package, color: '#3B82F6' },
  ];

  const filteredProducts = searchQuery.trim()
    ? dbProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoadingProducts(true);
      setFetchError(null);
      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            seller:sellers!products_seller_id_fkey (
              business_name,
              store_name,
              rating,
              business_address,
              id,
              is_verified
            )
          `)
          .eq('is_active', true)
          .eq('approval_status', 'pending')
          .order('created_at', { ascending: false });
        if (error) {
          setFetchError(error.message);
          setDbProducts([]);
          return;
        }
        const mapped: Product[] = (data || []).map((row: any) => {
          const imageUrl =
            row.primary_image ||
            (Array.isArray(row.images) && row.images.length > 0 ? row.images[0] : '');
          const priceNum = typeof row.price === 'number' ? row.price : parseFloat(row.price || '0');
          const originalNum = row.original_price != null
            ? (typeof row.original_price === 'number' ? row.original_price : parseFloat(row.original_price))
            : undefined;
          const ratingNum = typeof row.rating === 'number' ? row.rating : parseFloat(row.rating || '4.5') || 4.5;
          const sellerName = row.seller?.store_name || row.seller?.business_name || 'Verified Seller';
          const sellerRating = typeof row.seller?.rating === 'number'
            ? row.seller.rating
            : parseFloat(row.seller?.rating || '4.8') || 4.8;
          const sellerVerified = !!row.seller?.is_verified;
          const location = row.seller?.business_address || 'Philippines';
          return {
            id: row.id,
            name: row.name,
            price: priceNum,
            originalPrice: originalNum,
            image: imageUrl || '',
            images: Array.isArray(row.images) ? row.images : undefined,
            rating: ratingNum,
            sold: row.sales_count || 0,
            seller: sellerName,
            sellerId: row.seller?.id || undefined,
            sellerRating,
            sellerVerified,
            isFreeShipping: !!row.is_free_shipping,
            isVerified: true,
            location,
            description: row.description || '',
            category: row.category || '',
            stock: row.stock,
          } as Product;
        });
        // Deduplicate
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

  // Auto-scroll logic
  useEffect(() => {
    const interval = setInterval(() => {
      let nextSlide = activeSlide + 1;
      if (nextSlide >= promoSlides.length) nextSlide = 0;
      
      scrollRef.current?.scrollTo({ x: nextSlide * width, animated: true });
      setActiveSlide(nextSlide);
    }, 4000); // 4 seconds interval

    return () => clearInterval(interval);
  }, [activeSlide]);

  const flashSaleProducts = dbProducts
    .filter(p => typeof p.originalPrice === 'number' && (p.originalPrice as number) > p.price)
    .sort((a, b) => ((b.originalPrice || 0) - b.price) - ((a.originalPrice || 0) - a.price))
    .slice(0, 10);

  const popularProducts = [...dbProducts].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 6);

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetail', { product });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 1. BRANDED HEADER */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: BRAND_COLOR }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            {/* PROFILE AVATAR CLICKABLE LOGIC */}
            <Pressable onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}>
              <Image
                source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100' }}
                style={styles.avatar}
              />
            </Pressable>

            <View style={styles.greetingContainer}>
              <Text style={[styles.greetingTitle, { color: '#FFF' }]}>Hi, {username}</Text>
              <Text style={[styles.greetingSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>Let's go shopping</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable onPress={() => setIsSearchFocused(true)} style={styles.headerIconButton}><Search size={24} color="#FFF" /></Pressable>
            <Pressable
              onPress={() => {
                if (isGuest) {
                  setShowGuestModal(true);
                } else {
                  setShowNotifications(true);
                }
              }}
              style={styles.headerIconButton}
            >
              <Bell size={24} color="#FFF" />
              {!isGuest && notifications.some(n => !n.read) && <View style={[styles.notifBadge, { backgroundColor: '#FFF' }]} />}
            </Pressable>
          </View>
        </View>

        {isSearchFocused && (
          <View style={styles.searchBarWrapper}>
            <Pressable onPress={() => { setIsSearchFocused(false); setSearchQuery(''); }} style={styles.searchBackBtn}>
              <ArrowLeft size={20} color="#FFF" />
            </Pressable>
            <View style={[styles.searchBarInner, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Search size={18} color="#FFF" />
              <TextInput
                style={[styles.searchInput, { color: '#FFF' }]}
                placeholder="Search products..."
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <Pressable onPress={() => setShowCameraSearch(true)}><Camera size={18} color="#FFF" /></Pressable>
            </View>
          </View>
        )}

        {!isSearchFocused && (
          <View style={styles.tabBarCenter}>
            <Pressable style={styles.tabItem} onPress={() => setActiveTab('Home')}>
              <Text style={[styles.tabLabel, activeTab === 'Home' && { color: '#FFF', fontWeight: '800' }]}>Home</Text>
              <View style={[styles.tabIndicator, activeTab === 'Home' && { backgroundColor: '#FFF' }]} />
            </Pressable>
            <Pressable style={styles.tabItem} onPress={() => setActiveTab('Category')}>
              <Text style={[styles.tabLabel, activeTab === 'Category' && { color: '#FFF', fontWeight: '800' }]}>Category</Text>
              <View style={[styles.tabIndicator, activeTab === 'Category' && { backgroundColor: '#FFF' }]} />
            </Pressable>
          </View>
        )}
      </View>

      {!isSearchFocused && activeTab === 'Home' && (
        <Pressable style={styles.deliveryBarVisible} onPress={() => setShowLocationModal(true)}>
          <View style={styles.deliveryContent}>
            <MapPin size={16} color={BRAND_COLOR} />
            <Text style={styles.deliveryText} numberOfLines={1}>Deliver to: <Text style={styles.deliveryAddressBold}>{deliveryAddress}</Text></Text>
            <ChevronDown size={16} color="#9CA3AF" />
          </View>
        </Pressable>
      )}

      <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
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
                <Text style={styles.discoveryTitle}>{filteredProducts.length} results found</Text>
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
        ) : activeTab === 'Home' ? (
          <>
            {/* SPECIAL OFFER CAROUSEL */}
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
                  <View key={slide.id} style={[styles.promoBox, { width: width - 40 }]}>
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
                  </View>
                ))}
              </ScrollView>
              
              {/* Pagination Dots */}
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

            <View style={styles.flashSaleSection}>
              <View style={styles.flashHeader}>
                <View style={styles.row}>
                  <Text style={[styles.gridTitleText, { color: BRAND_COLOR }]}>FLASH SALE</Text>
                  <View style={[styles.timerBox, { backgroundColor: '#333' }]}>
                    <Timer size={14} color="#FFF" /><Text style={styles.timerText}>02:15:45</Text>
                  </View>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20, paddingBottom: 10 }}>
                {flashSaleProducts.map(p => (
                  <View key={p.id} style={styles.itemBoxContainerHorizontal}>
                    <ProductCard product={p} onPress={() => handleProductPress(p)} />
                    <View style={[styles.discountTag, { backgroundColor: BRAND_COLOR }]}>
                      <Text style={styles.discountTagText}>
                        {p.originalPrice && p.originalPrice > p.price
                          ? `-${Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}%`
                          : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
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
          </>
        ) : (
          <View style={styles.categoryExpandedContent}>
            <Text style={styles.categorySectionTitle}>Shop by Category</Text>
            <View style={styles.categoryGrid}>
              {categories.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.categoryCardBox}
                  onPress={() => navigation.navigate('Shop', { category: item.id })}
                >
                  <Image source={{ uri: item.image }} style={styles.categoryCardImage} />
                  <View style={styles.categoryCardOverlay} />
                  <Text style={styles.categoryCardText}>{item.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <Pressable style={[styles.aiFloatingButton, { backgroundColor: BRAND_COLOR, bottom: 90 }]} onPress={() => navigation.navigate('Messages')}>
        <MessageCircle size={28} color="#FFF" />
      </Pressable>

      <ProductRequestModal visible={showProductRequest} onClose={() => setShowProductRequest(false)} />
      <AIChatModal visible={showAIChat} onClose={() => setShowAIChat(false)} />
      <CameraSearchModal visible={showCameraSearch} onClose={() => setShowCameraSearch(false)} />
      <LocationModal visible={showLocationModal} onClose={() => setShowLocationModal(false)} onSelectLocation={setDeliveryAddress} currentAddress={deliveryAddress} />

      {showGuestModal && (
        <GuestLoginModal
          visible={true}
          onClose={() => setShowGuestModal(false)}
          message="Sign up to view your notifications."
        />
      )}

      <Modal visible={showNotifications} animationType="slide" transparent={true} onRequestClose={() => setShowNotifications(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.notificationModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <Pressable onPress={() => setShowNotifications(false)}><X size={24} color="#1F2937" /></Pressable>
            </View>
            <ScrollView style={{ padding: 20 }}>
              {notifications.map((n) => (
                <View key={n.id} style={styles.notificationItem}>
                  <View style={[styles.notificationIcon, { backgroundColor: `${n.color}15` }]}><n.icon size={24} color={n.color} /></View>
                  <View style={{ flex: 1 }}><Text style={styles.notifItemTitle}>{n.title}</Text><Text style={styles.notifItemMsg}>{n.message}</Text></View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  headerContainer: { paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.3)', borderWidth: 1, borderColor: '#FFF' },
  greetingContainer: { justifyContent: 'center' },
  greetingTitle: { fontSize: 16, fontWeight: '700' },
  greetingSubtitle: { fontSize: 13 },
  headerRight: { flexDirection: 'row', gap: 16 },
  headerIconButton: { padding: 4 },
  notifBadge: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: COLORS.primary },
  searchBarWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  searchBarInner: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 15, height: 48, gap: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  searchBackBtn: { padding: 4 },
  tabBarCenter: { flexDirection: 'row', justifyContent: 'center', gap: 40, marginBottom: 10 },
  tabItem: { paddingVertical: 10, alignItems: 'center' },
  tabLabel: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  tabIndicator: { marginTop: 4, height: 3, width: 30, borderRadius: 2 },
  deliveryBarVisible: { backgroundColor: '#FFF', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  deliveryContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deliveryText: { fontSize: 13, color: '#4B5563', flex: 1 },
  deliveryAddressBold: { fontWeight: '700', color: '#1F2937' },

  contentScroll: { flex: 1 },
  carouselContainer: { marginVertical: 15 },
  promoWrapper: { marginVertical: 15 },
  promoBox: { 
    height: 160, 
    backgroundColor: '#FFF', 
    borderRadius: 20, 
    padding: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    elevation: 4, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8,
    marginHorizontal: 20, // Add spacing for carousel items if we use padding logic? No, width is specific.
    // Wait, ScrollView with pagingEnabled needs exact width match.
    // Width is set inline to (width - 40).
    overflow: 'hidden',
    position: 'relative'
  },
  promoBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  promoTextPart: { flex: 0.65 },
  promoBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 8 },
  promoBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  promoHeadline: { fontSize: 18, fontWeight: '800', color: '#1F2937', lineHeight: 24 },
  promoBrandName: { fontSize: 12, fontWeight: '700', color: '#666', marginTop: 4 },
  promoImgPart: { width: 80, height: 100, borderRadius: 12, overflow: 'hidden' },
  promoImg: { width: '100%', height: '100%' },
  flashSaleSection: { marginVertical: 15 },
  flashHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timerBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  timerText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  itemBoxContainerHorizontal: { width: 160, marginRight: 15, backgroundColor: '#FFF', borderRadius: 18, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6 },
  itemBoxContainerVertical: { width: (width - 55) / 2, marginBottom: 20, backgroundColor: '#FFF', borderRadius: 18, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6 },
  section: { paddingHorizontal: 20, marginVertical: 15 },
  productRequestButton: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  productRequestButtonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  productRequestContent: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  productRequestIconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  productRequestText: { flex: 1 },
  productRequestTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937' },
  productRequestSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  discountTag: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, zIndex: 1 },
  discountTagText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  gridContainer: { paddingHorizontal: 20, marginBottom: 20 },
  gridHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  gridTitleText: { fontSize: 18, fontWeight: '900', color: '#1F2937' },
  gridSeeAll: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  gridBody: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  aiFloatingButton: { position: 'absolute', right: 20, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6 },
  searchDiscovery: { padding: 20 },
  discoveryTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 15 },
  recentSection: { marginBottom: 20 },
  searchRecentItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  searchRecentText: { fontSize: 15, color: '#4B5563' },
  resultsSection: { flex: 1 },
  categoryExpandedContent: { padding: 20 },
  categorySectionTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 15 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryCardBox: {
    width: (width - 55) / 2,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    backgroundColor: '#FFF'
  },
  categoryCardImage: { ...StyleSheet.absoluteFillObject },
  categoryCardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  categoryCardText: { color: '#FFF', fontWeight: '800', fontSize: 15, zIndex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  notificationModalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 24, fontWeight: '800', color: '#1F2937' },
  notificationItem: { flexDirection: 'row', padding: 18 },
  notificationIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  notifItemTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  notifItemMsg: { fontSize: 14, color: '#4B5563' },
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
