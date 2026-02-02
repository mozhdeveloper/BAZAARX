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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Bell, Camera, Bot, X, Package, Timer, MapPin, ChevronDown, ArrowLeft, Clock, MessageSquare, MessageCircle, CheckCircle2, ShoppingBag, Truck, XCircle } from 'lucide-react-native';
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

const categories = [
  { id: 'electronics', name: 'Electronics', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300', size: '' },
  { id: 'fashion', name: 'Fashion', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=300' },
  { id: 'home-garden', name: 'Home & Living', image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=300' },
  { id: 'beauty', name: 'Beauty', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300' },
  { id: 'sports', name: 'Sports', image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=300' },
];

const CategoryItem = ({ label, image }: { label: string; image: string }) => (
  <View style={styles.categoryItm}>
    <View style={styles.iconCircle}>
      <Image source={{ uri: image }} style={{ width: 60, height: 60, borderRadius: 30 }} />
    </View>
    <Text style={styles.categoryLabel}>{label}</Text>
  </View>
);

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
  const [sellers, setSellers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
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
      image: (p.images && p.images.length > 0) ? p.images[0] : '',
      images: p.images || [],
      rating: 4.5,
      sold: p.sales || 0, // SellerProduct has 'sales', mapping to 'sold'
      seller: seller?.storeName || 'Verified Seller',
      sellerId: seller?.id,
      sellerRating: 4.9,
      sellerVerified: true,
      isFreeShipping: (p.price || 0) >= 1000, // Free shipping for orders over 1000
      isVerified: true,
      location: seller ? `${seller.city}, ${seller.province}` : 'Philippines',
      description: p.description,
      category: p.category,
      stock: p.stock,
    }));

  // Display name logic
  const username = user?.name ? user.name.split(' ')[0] : 'Guest';

  // Helper to get icon component for notification type
  const getNotificationIcon = (type: string) => {
    if (type.includes('shipped')) return Truck;
    if (type.includes('delivered') || type.includes('confirmed')) return CheckCircle2;
    if (type.includes('placed')) return ShoppingBag;
    if (type.includes('cancelled')) return XCircle;
    return Package;
  };

  // Helper to get notification color
  const getNotificationColor = (type: string) => {
    if (type.includes('shipped')) return '#F97316';
    if (type.includes('delivered')) return '#22C55E';
    if (type.includes('confirmed')) return '#3B82F6';
    if (type.includes('placed')) return '#22C55E';
    if (type.includes('cancelled')) return '#EF4444';
    return '#6B7280';
  };

  // Format notification time
  const formatNotificationTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  };

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
        // BUYER VIEW: Only show approved products that passed QA
        const data = await productService.getProducts({
          isActive: true,
          approvalStatus: 'approved'
        });

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
            // Include variant data for ProductDetailScreen
            colors: Array.isArray(row.colors) ? row.colors : [],
            sizes: Array.isArray(row.sizes) ? row.sizes : [],
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

  useEffect(() => {
    const fetchSellers = async () => {
      const data = await sellerService.getSellers();
      if (data) setSellers(data);
    };
    fetchSellers();
  }, []);

  // --- FETCH NOTIFICATIONS ---
  const loadNotifications = useCallback(async () => {
    if (!user?.id || isGuest) return;
    try {
      const data = await notificationService.getNotifications(user.id, 'buyer', 20);
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('[HomeScreen] Error loading notifications:', error);
    }
  }, [user?.id, isGuest]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // --- LOAD SAVED DELIVERY LOCATION ---
  // Priority: 1) "Current Location" from DB, 2) Default address, 3) AsyncStorage fallback
  useEffect(() => {
    const loadSavedLocation = async () => {
      // First try AsyncStorage (works for guests too)
      try {
        const savedAddress = await AsyncStorage.getItem('currentDeliveryAddress');
        const savedCoords = await AsyncStorage.getItem('currentDeliveryCoordinates');
        
        if (savedAddress) {
          setDeliveryAddress(savedAddress);
          console.log('[HomeScreen] Loaded address from AsyncStorage:', savedAddress);
        }
        if (savedCoords) {
          setDeliveryCoordinates(JSON.parse(savedCoords));
        }
      } catch (e) {
        console.error('[HomeScreen] Error loading from AsyncStorage:', e);
      }

      // If user is logged in, prioritize database location
      if (user?.id) {
        try {
          const savedLocation = await addressService.getCurrentDeliveryLocation(user.id);
          
          if (savedLocation) {
            // Format: "Street, City" or full address
            const formatted = savedLocation.city 
              ? `${savedLocation.street}, ${savedLocation.city}`
              : savedLocation.street;
            
            setDeliveryAddress(formatted);
            console.log('[HomeScreen] Loaded location from database:', formatted);

            // Store coordinates if available
            if (savedLocation.coordinates) {
              setDeliveryCoordinates(savedLocation.coordinates);
            }

            // Also sync to AsyncStorage for faster loading next time
            await AsyncStorage.setItem('currentDeliveryAddress', formatted);
            if (savedLocation.coordinates) {
              await AsyncStorage.setItem('currentDeliveryCoordinates', JSON.stringify(savedLocation.coordinates));
            }
          }
        } catch (dbError) {
          console.error('[HomeScreen] Error loading from database:', dbError);
        }
      }
    };

    loadSavedLocation();

    // Subscribe to address changes to update realtime (only for logged in users)
    if (user?.id) {
      const subscription = addressService.subscribeToAddressChanges(user.id, () => {
        loadSavedLocation();
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  // Handle address selection from modal
  const handleSelectLocation = async (address: string, coords?: { latitude: number; longitude: number }) => {
    setDeliveryAddress(address);
    if (coords) setDeliveryCoordinates(coords);

    // Store in AsyncStorage so CartScreen and Checkout can access it
    try {
      await AsyncStorage.setItem('currentDeliveryAddress', address);
      if (coords) {
        await AsyncStorage.setItem('currentDeliveryCoordinates', JSON.stringify(coords));
      }
      console.log('[HomeScreen] Saved delivery address to AsyncStorage:', address);

      // Also save to database if user is logged in
      if (user?.id) {
        try {
          await addressService.saveCurrentDeliveryLocation(user.id, address, coords || null);
          console.log('[HomeScreen] Saved delivery location to database');
        } catch (dbError) {
          console.error('[HomeScreen] Error saving to database (non-critical):', dbError);
        }
      }
    } catch (error) {
      console.error('[HomeScreen] Error saving delivery address:', error);
    }
  };
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
    .filter(p => typeof p.originalPrice === 'number' && typeof p.price === 'number' && (p.originalPrice as number) > p.price)
    .sort((a, b) => (((b.originalPrice || 0) - (b.price || 0)) - ((a.originalPrice || 0) - (a.price || 0))))
    .slice(0, 10);

  const popularProducts = useMemo(() => {
    // Prioritize discounted items even in "Popular Items"
    return [...dbProducts].sort((a, b) => {
      const aIsFlash = (a.originalPrice || 0) > (a.price || 0);
      const bIsFlash = (b.originalPrice || 0) > (b.price || 0);
      if (aIsFlash && !bIsFlash) return -1;
      if (!aIsFlash && bIsFlash) return 1;
      return (b.sold || 0) - (a.sold || 0);
    }).slice(0, 8);
  }, [dbProducts]);

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetail', { product });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 1. BRANDED HEADER */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: BRAND_COLOR }]}>
        <View style={styles.locationRow}>
          <Pressable onPress={() => setShowLocationModal(true)}>
            <Text style={styles.locationLabel}>Location</Text>
            <View style={styles.locationSelector}>
              <MapPin size={16} color="white" fill="white" />
              <Text numberOfLines={1} style={[styles.locationText, { maxWidth: 200, color: 'white', fontWeight: 'bold', fontSize: 16 }]}>{deliveryAddress}</Text>
              <ChevronDown size={16} color="white" />
            </View>
          </Pressable>
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

        {/* 2. PERSISTENT SEARCH BAR */}
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
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Flash Sale</Text>
              <View style={styles.timerContainer}>
                <Text style={styles.timerLabel}>Closing in : </Text>
                <Text style={[styles.timerTime, { color: BRAND_COLOR }]}>02 : 12 : 56</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20, paddingBottom: 10 }}>
              <View style={styles.itemBoxContainerHorizontal}>
                <ProductCard product={{
                  id: 'dummy1',
                  name: 'Wireless Headphones',
                  price: 1299,
                  originalPrice: 2500,
                  image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
                  rating: 4.8,
                  sold: 120,
                  seller: 'TechStore',
                  sellerId: 's1',
                  sellerRating: 4.8,
                  sellerVerified: true,
                  isFreeShipping: true,
                  isVerified: true,
                  location: 'Manila',
                  description: 'Great sound',
                  category: 'Electronics',
                  stock: 50
                }} onPress={() => { }} />
                <View style={[styles.discountTag, { backgroundColor: BRAND_COLOR }]}>
                  <Text style={styles.discountTagText}>-48%</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Category</Text>
              <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow} style={{ flexGrow: 0 }}>
              {categories.map((item) => (
                <View key={item.id} style={{ marginRight: 20 }}>
                  <CategoryItem label={item.name} image={item.image} />
                </View>
              ))}
            </ScrollView>



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
      <LocationModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSelectLocation={handleSelectLocation}
        currentAddress={deliveryAddress}
        initialCoordinates={deliveryCoordinates}
      />

      {
        showGuestModal && (
          <GuestLoginModal
            visible={true}
            onClose={() => setShowGuestModal(false)}
            message="Sign up to view your notifications."
          />
        )
      }

      <Modal visible={showNotifications} animationType="slide" transparent={true} onRequestClose={() => setShowNotifications(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.notificationModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {notifications.length > 0 && (
                  <Pressable onPress={async () => {
                    if (user?.id) {
                      await notificationService.markAllAsRead(user.id, 'buyer');
                      loadNotifications();
                    }
                  }}>
                    <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '600' }}>Mark All Read</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => setShowNotifications(false)}><X size={24} color="#1F2937" /></Pressable>
              </View>
            </View>
            <ScrollView style={{ padding: 20 }}>
              {notifications.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Bell size={48} color="#D1D5DB" />
                  <Text style={{ color: '#6B7280', marginTop: 12, fontSize: 14 }}>No notifications yet</Text>
                </View>
              ) : (
                notifications.map((n) => {
                  const IconComponent = getNotificationIcon(n.type);
                  const color = getNotificationColor(n.type);
                  return (
                    <Pressable
                      key={n.id}
                      style={[styles.notificationItem, !n.is_read && { backgroundColor: '#FFF7ED' }]}
                      onPress={async () => {
                        if (!n.is_read) {
                          await notificationService.markAsRead(n.id);
                          loadNotifications();
                        }
                        // Navigate to orders tab if it's an order notification
                        if (n.action_data?.orderNumber || n.type.includes('order')) {
                          setShowNotifications(false);
                          // Navigate to Orders tab in MainTabs
                          navigation.navigate('MainTabs', { screen: 'Orders' } as any);
                        }
                      }}
                    >
                      <View style={[styles.notificationIcon, { backgroundColor: `${color}15` }]}>
                        <IconComponent size={24} color={color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[styles.notifItemTitle, !n.is_read && { fontWeight: '700' }]}>{n.title}</Text>
                          <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{formatNotificationTime(n.created_at)}</Text>
                        </View>
                        <Text style={styles.notifItemMsg}>{n.message}</Text>
                      </View>
                      {!n.is_read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginLeft: 8 }} />}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  headerContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  locationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  locationLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, paddingBottom: 7 },
  locationSelector: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  headerIconButton: { padding: 4 },
  notifBadge: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: COLORS.primary },
  searchBarWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
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
  carouselContainer: { marginVertical: 10 },
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
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, paddingTop: 5 },
  sectionTitle: { fontSize: 19, fontWeight: 'bold', color: '#333' },
  timerContainer: { flexDirection: 'row', alignItems: 'center' },
  timerLabel: { fontSize: 12, color: '#999' },
  timerTime: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  filterTabs: { paddingLeft: 20 },
  filterTab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F8F8F8', marginRight: 10, borderWidth: 1, borderColor: '#EEE' },
  activeTab: { backgroundColor: '#FF6a00', borderColor: '#FF6a00' },
  filterTabText: { color: '#666', fontWeight: '600' },
  activeTabText: { color: 'white' },
  seeAll: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  categoryRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 },
  categoryItm: { alignItems: 'center', gap: 8 },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  iconText: { fontSize: 24 },
  categoryLabel: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  flashSaleSection: { marginVertical: 15 },
  flashHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timerBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  timerText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
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
  sectionHeader: { fontSize: 16, fontWeight: '800', color: '#1F2937', marginBottom: 12 },
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
