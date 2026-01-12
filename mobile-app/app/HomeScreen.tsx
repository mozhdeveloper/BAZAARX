import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Bell, ShoppingBag, Coffee, Apple, Utensils, Carrot, Camera, Bot, X, Home, Store, User, Package, Timer, CheckCircle, MessageSquare, MapPin, ChevronDown, ArrowLeft, Clock, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ProductCard } from '../src/components/ProductCard';
import CameraSearchModal from '../src/components/CameraSearchModal';
import AIChatModal from '../src/components/AIChatModal';
import ProductRequestModal from '../src/components/ProductRequestModal';
import LocationModal from '../src/components/LocationModal';
import { trendingProducts, bestSellerProducts } from '../src/data/products';
import { useCartStore } from '../src/stores/cartStore';
import { useOrderStore } from '../src/stores/orderStore';
import { useAdminProductQA } from '../src/stores/adminStore';
import { useProductQAStore } from '../src/stores/productQAStore';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList } from '../App';
import type { Product } from '../src/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

const categories = [
  { id: 'all', name: 'All', icon: ShoppingBag },
  { id: 'coffee', name: 'Coffee & Tea', icon: Coffee },
  { id: 'fruits', name: 'Fruits', icon: Apple },
  { id: 'fastfood', name: 'Fast Food', icon: Utensils },
  { id: 'vegetables', name: 'Vegetables', icon: Carrot },
];

const { width } = Dimensions.get('window');
const GAP = 12;
const PADDING = 20;
const ITEM_WIDTH = (width - (PADDING * 2) - GAP) / 2;

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [showAIChat, setShowAIChat] = useState(false);
  const [showCameraSearch, setShowCameraSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProductRequest, setShowProductRequest] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState(['wireless earbuds', 'water bottle', 'leather bag']);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('123 Main St, Manila');
  const cartItemCount = useCartStore((state) => state.getItemCount());
  const getOrderById = useOrderStore((state) => state.getOrderById);
  const username = 'John';

  // Recent & Trending Searches
  const trendingSearches = [
    'holiday gifts',
    'gaming accessories',
    'smart watch',
    'portable speaker',
    'fitness tracker',
  ];

  // Popular Categories (for search)
  const popularCategories = [
    { id: '1', name: 'Headphones', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300' },
    { id: '2', name: 'Dress', image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300' },
    { id: '3', name: 'Sneakers', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300' },
    { id: '4', name: 'Watch', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300' },
    { id: '5', name: 'Laptop', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300' },
  ];

  // Browse by Category data
  const browseCategories = [
    { id: '1', name: 'Electronics', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300' },
    { id: '2', name: 'Fashion', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=300' },
    { id: '3', name: 'Home & Living', image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=300' },
    { id: '4', name: 'Beauty', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300' },
    { id: '5', name: 'Sports', image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=300' },
    { id: '6', name: 'Books', image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=300' },
  ];

  // Official Stores/Brands data
  const officialBrands = [
    { id: '1', name: 'Nike', logo: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200' },
    { id: '2', name: 'Apple', logo: 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=200' },
    { id: '3', name: 'Samsung', logo: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=200' },
    { id: '4', name: 'Adidas', logo: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=200' },
    { id: '5', name: 'Sony', logo: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200' },
    { id: '6', name: 'Dell', logo: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=200' },
  ];

  // Get QA-verified products from productQAStore
  const qaProducts = useProductQAStore((state) => state.products);
  const verifiedQAProducts = qaProducts
    .filter(qp => qp.status === 'ACTIVE_VERIFIED')
    .map(qp => ({
      id: qp.id,
      name: qp.name,
      price: qp.price,
      originalPrice: qp.originalPrice,
      image: qp.image,
      images: qp.images || [qp.image],
      rating: 4.5,
      sold: 0,
      seller: qp.vendor,
      sellerRating: 4.7,
      sellerVerified: true,
      isFreeShipping: qp.logistics === 'Drop-off / Courier',
      isVerified: true,
      location: 'Philippines',
      category: qp.category,
    } as Product));

  // Combine all products for search
  const allProducts = [...verifiedQAProducts, ...trendingProducts, ...bestSellerProducts];

  // Filter products based on search query
  const filteredProducts = searchQuery.trim()
    ? allProducts.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.seller.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSearchTerm = (term: string) => {
    setSearchQuery(term);
    // Add to recent searches if not already there
    if (!recentSearches.includes(term)) {
      setRecentSearches([term, ...recentSearches.slice(0, 4)]);
    }
  };

  const removeRecentSearch = (term: string) => {
    setRecentSearches(recentSearches.filter(item => item !== term));
  };

  const clearAllRecentSearches = () => {
    setRecentSearches([]);
  };

  // Notification dummy data - matches orderStore dummy orders
  // Order ID '1': A238567K - Premium Wireless Earbuds (shipped)
  // Order ID '2': B892341M - Sustainable Water Bottle (delivered)
  const notifications = [
    {
      id: '1',
      title: 'Order Shipped! 📦',
      message: 'Your Premium Wireless Earbuds order (#A238567K) has been shipped and is on the way!',
      time: '2h ago',
      read: false,
      icon: Package,
      color: '#3B82F6',
      type: 'order_tracking' as const,
      orderId: '1', // Links to orderStore dummy order
      transactionId: 'A238567K'
    },
    {
      id: '2',
      title: 'Flash Sale Alert! ⚡',
      message: 'Electronics Flash Sale is LIVE! Up to 50% off on selected items. Don\'t miss out!',
      time: '5h ago',
      read: false,
      icon: Timer,
      color: '#FF6A00',
      type: 'flash_sale' as const, // → Navigates to Shop tab
      category: 'Electronics'
    },
    {
      id: '3',
      title: 'Order Delivered ✓',
      message: 'Your Sustainable Water Bottle order (#B892341M) has been delivered. Enjoy!',
      time: '1d ago',
      read: true,
      icon: CheckCircle,
      color: '#22C55E',
      type: 'order_detail' as const, // → Navigates to OrderDetail screen
      orderId: '2', // Links to orderStore dummy order
      transactionId: 'B892341M'
    },
    {
      id: '4',
      title: 'New Message from Seller',
      message: 'TechStore Official sent you a message about your recent purchase.',
      time: '3d ago',
      read: true,
      icon: MessageSquare,
      color: '#8B5CF6',
      type: 'message' as const, // → Navigates to Shop tab (placeholder)
      shopName: 'TechStore Official'
    },
    {
      id: '5',
      title: 'Order Confirmed',
      message: 'Your order (#A238567K) has been confirmed. Preparing for shipment...',
      time: '2d ago',
      read: true,
      icon: CheckCircle,
      color: '#10B981',
      type: 'order_detail' as const, // → Navigates to OrderDetail screen
      orderId: '1', // Links to orderStore dummy order
      transactionId: 'A238567K'
    },
  ];

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetail', { product });
  };

  const handleNotificationPress = (notification: typeof notifications[0]) => {
    setShowNotifications(false);
    
    // Small delay to allow modal to close smoothly before navigation
    setTimeout(() => {
      // Navigate based on notification type
      switch (notification.type) {
        case 'order_tracking':
          // Navigate to delivery tracking screen with mock order data
          const trackingOrder = {
            id: '1',
            transactionId: 'A238567K',
            items: [
              {
                id: '1',
                name: 'Premium Wireless Earbuds - Noise Cancelling',
                price: 2499,
                originalPrice: 3999,
                image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
                rating: 4.8,
                sold: 15234,
                seller: 'TechStore Official',
                sellerRating: 4.9,
                sellerVerified: true,
                isFreeShipping: true,
                isVerified: true,
                location: 'Manila',
                category: 'Electronics',
                quantity: 1,
              },
            ],
            total: 2499,
            shippingFee: 0,
            status: 'shipped' as const,
            scheduledDate: '12/21/2025',
            shippingAddress: {
              name: 'John Doe',
              email: 'john@example.com',
              phone: '+63 912 345 6789',
              address: '123 Main St, Brgy. San Antonio',
              city: 'Manila',
              region: 'Metro Manila',
              postalCode: '1000',
            },
            paymentMethod: 'Cash on Delivery',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          };
          console.log('✅ Navigating to DeliveryTracking for order:', trackingOrder.transactionId);
          navigation.getParent()?.navigate('DeliveryTracking', { order: trackingOrder });
          break;
          
        case 'order_detail':
          // Navigate to order detail screen with mock order data
          const detailOrder = {
            id: notification.orderId === '1' ? '1' : '2',
            transactionId: notification.orderId === '1' ? 'A238567K' : 'B892341M',
            items: notification.orderId === '1' ? [
              {
                id: '1',
                name: 'Premium Wireless Earbuds - Noise Cancelling',
                price: 2499,
                originalPrice: 3999,
                image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
                rating: 4.8,
                sold: 15234,
                seller: 'TechStore Official',
                sellerRating: 4.9,
                sellerVerified: true,
                isFreeShipping: true,
                isVerified: true,
                location: 'Manila',
                category: 'Electronics',
                quantity: 1,
              },
            ] : [
              {
                id: '2',
                name: 'Sustainable Water Bottle - BPA Free',
                price: 899,
                image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400',
                rating: 4.6,
                sold: 8921,
                seller: 'EcoLife Store',
                sellerRating: 4.7,
                sellerVerified: true,
                isFreeShipping: true,
                isVerified: true,
                location: 'Quezon City',
                category: 'Home & Living',
                quantity: 2,
              },
            ],
            total: notification.orderId === '1' ? 2499 : 1848,
            shippingFee: notification.orderId === '1' ? 0 : 50,
            status: notification.orderId === '1' ? ('processing' as const) : ('delivered' as const),
            scheduledDate: notification.orderId === '1' ? '12/21/2025' : '12/10/2025',
            deliveryDate: notification.orderId === '1' ? undefined : '12/10/2025',
            shippingAddress: {
              name: 'John Doe',
              email: 'john@example.com',
              phone: '+63 912 345 6789',
              address: '123 Main St, Brgy. San Antonio',
              city: 'Manila',
              region: 'Metro Manila',
              postalCode: '1000',
            },
            paymentMethod: notification.orderId === '1' ? 'Cash on Delivery' : 'Credit Card',
            createdAt: new Date(Date.now() - (notification.orderId === '1' ? 2 : 5) * 24 * 60 * 60 * 1000).toISOString(),
          };
          console.log('✅ Navigating to OrderDetail for order:', detailOrder.transactionId);
          navigation.getParent()?.navigate('OrderDetail', { order: detailOrder });
          break;
          
        case 'flash_sale':
          // Navigate to shop tab
          console.log('✅ Navigating to Shop tab with category:', notification.category);
          navigation.navigate('Shop', { category: notification.category });
          break;
          
        case 'message':
          // Navigate to shop screen (placeholder for messages feature)
          console.log('✅ Navigating to Shop tab (messages placeholder)');
          navigation.navigate('Shop', {});
          break;
      }
    }, 300);
  };

  const renderCategoryIcon = ({ item }: any) => {
    const Icon = item.icon;
    return (
      <Pressable style={styles.categoryItem}>
        <View style={styles.categoryIconContainer}>
          <Icon size={28} color="#1F2937" strokeWidth={2} />
        </View>
        <Text style={styles.categoryText}>{item.name}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tall Orange Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        {/* Row 1: Greeting + Icons */}
        <View style={styles.headerTop}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>Good Morning, Welcome</Text>
            <Text style={styles.userName}>{username}</Text>
          </View>
          <View style={styles.headerIcons}>
            <Pressable onPress={() => setShowAIChat(true)} style={styles.iconButton}>
              <Bot size={22} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
            <Pressable onPress={() => setShowNotifications(true)} style={styles.iconButton}>
              <Bell size={22} color="#FFFFFF" strokeWidth={2.5} />
              {notifications.filter(n => !n.read).length > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {notifications.filter(n => !n.read).length}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Row 2: Search Bar with Camera Inside + Cancel */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            {isSearchFocused && (
              <Pressable onPress={() => {
                setIsSearchFocused(false);
                setSearchQuery('');
              }} style={styles.backIcon}>
                <ArrowLeft size={20} color="#1F2937" strokeWidth={2.5} />
              </Pressable>
            )}
            <Search size={20} color="#9CA3AF" strokeWidth={2.5} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
            />
            <Pressable
              onPress={() => setShowCameraSearch(true)}
              style={styles.cameraIcon}
            >
              <Camera size={20} color="#1F2937" strokeWidth={2.5} />
            </Pressable>
          </View>
          {isSearchFocused && (
            <Pressable 
              onPress={() => {
                setIsSearchFocused(false);
                setSearchQuery('');
              }}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          )}
        </View>

        {/* Row 3: Location Bar */}
        {!isSearchFocused && (
          <Pressable style={styles.locationBar} onPress={() => setShowLocationModal(true)}>
            <MapPin size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.locationText}>Delivery to: {deliveryAddress}</Text>
            <ChevronDown size={16} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        )}
      </View>

      {/* Categories Grid (Below Header) */}
      {!isSearchFocused && (
        <View style={styles.categoriesSection}>
          <FlatList
            data={categories}
            renderItem={renderCategoryIcon}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>
      )}

      {/* Search Discovery View */}
      {isSearchFocused ? (
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {searchQuery.trim() === '' ? (
            <>
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <View style={styles.searchActiveSection}>
                  <View style={styles.searchActiveSectionHeader}>
                    <Text style={styles.searchActiveSectionTitle}>Recent Searches</Text>
                    <Pressable onPress={clearAllRecentSearches}>
                      <Text style={styles.clearAllText}>Clear All</Text>
                    </Pressable>
                  </View>
                  {recentSearches.map((term, index) => (
                    <Pressable
                      key={`recent-${index}`}
                      style={styles.searchItem}
                      onPress={() => handleSearchTerm(term)}
                    >
                      <Clock size={20} color="#9CA3AF" strokeWidth={2} />
                      <Text style={styles.searchItemText}>{term}</Text>
                      <Pressable
                        onPress={() => removeRecentSearch(term)}
                        style={styles.removeButton}
                      >
                        <X size={16} color="#9CA3AF" strokeWidth={2.5} />
                      </Pressable>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Trending Searches */}
              <View style={styles.searchActiveSection}>
                <Text style={styles.searchActiveSectionTitle}>Trending Searches</Text>
                {trendingSearches.map((term, index) => (
                  <Pressable
                    key={`trending-${index}`}
                    style={styles.searchItem}
                    onPress={() => handleSearchTerm(term)}
                  >
                    <TrendingUp size={20} color="#FF5722" strokeWidth={2.5} />
                    <Text style={styles.searchItemText}>{term}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Popular Categories */}
              <View style={styles.searchActiveSection}>
                <Text style={styles.searchActiveSectionTitle}>Popular Categories</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.popularCategoriesScroll}
                >
                  {popularCategories.map((category) => (
                    <Pressable
                      key={category.id}
                      style={styles.popularCategoryCard}
                      onPress={() => {
                        handleSearchTerm(category.name);
                      }}
                    >
                      <Image
                        source={{ uri: category.image }}
                        style={styles.popularCategoryImage}
                        resizeMode="cover"
                      />
                      <View style={styles.popularCategoryOverlay} />
                      <Text style={styles.popularCategoryText}>{category.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </>
          ) : (
            /* Search Results */
            <View style={styles.searchResultsSection}>
              <Text style={styles.searchResultsTitle}>
                {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''} found
              </Text>
              <View style={styles.productsGrid}>
                {filteredProducts.map((product) => (
                  <View key={product.id} style={styles.productCardWrapper}>
                    <ProductCard
                      product={product}
                      onPress={() => handleProductPress(product)}
                    />
                  </View>
                ))}
              </View>
              {filteredProducts.length === 0 && (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>No products found</Text>
                  <Text style={styles.noResultsSubtext}>Try different keywords</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
        {/* Special Offer Card */}
        <View style={styles.promoCard}>
          <LinearGradient
            colors={['#FF5722', '#FF7043']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 20, padding: 4, marginBottom: -4 }}
          >
            <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 18, padding: 20 }}>
              <View style={styles.promoContent}>
                <View style={styles.promoTextContainer}>
                  <Text style={[styles.promoTitle, { color: '#FFFFFF' }]}>35% Discount</Text>
                  <Text style={[styles.promoDescription, { color: 'rgba(255, 255, 255, 0.95)' }]}>
                    100% Guaranteed all Fresh{'\n'}Grocery Items
                  </Text>
                  <Pressable style={[styles.promoButton, { backgroundColor: '#FFFFFF' }]}>
                    <Text style={[styles.promoButtonText, { color: '#FF5722' }]}>Shop Now</Text>
                  </Pressable>
                </View>
                <View style={styles.promoImagePlaceholder} />
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Flash Sale Section */}
        <View style={styles.section}>
          <View style={styles.flashSaleBanner}>
            <View style={styles.flashSaleHeader}>
              <View style={styles.flashSaleTitleRow}>
                <Text style={styles.flashSaleTitle}>Flash Sale</Text>
                <View style={styles.timerContainer}>
                  <Timer size={16} color="#FFFFFF" />
                  <Text style={styles.timerText}>02:15:45</Text>
                </View>
              </View>
              <Pressable onPress={() => navigation.navigate('Shop', {})}>
                <Text style={styles.flashSaleViewAll}>View All</Text>
              </Pressable>
            </View>
            
            <FlatList
              data={trendingProducts.slice(0, 4)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.flashSaleList}
              keyExtractor={(item) => `flash-${item.id}`}
              renderItem={({ item }) => (
                <View style={styles.flashSaleItem}>
                  <ProductCard
                    product={item}
                    onPress={() => handleProductPress(item)}
                  />
                </View>
              )}
            />
          </View>
        </View>

        {/* Product Request Button */}
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [
              styles.productRequestButton,
              pressed && styles.productRequestButtonPressed,
            ]}
            onPress={() => setShowProductRequest(true)}
          >
            <View style={styles.productRequestContent}>
              <View style={styles.productRequestIconContainer}>
                <MessageSquare size={24} color="#FF6A00" />
              </View>
              <View style={styles.productRequestText}>
                <Text style={styles.productRequestTitle}>Can't Find What You Need?</Text>
                <Text style={styles.productRequestSubtitle}>Request a product and we'll find it for you</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Popular Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Items</Text>
            <Pressable onPress={() => navigation.navigate('Shop', {})}>
              <Text style={styles.viewAllText}>View All</Text>
            </Pressable>
          </View>

          <View style={styles.productsGrid}>
            {trendingProducts.slice(0, 4).map((product) => (
              <View key={product.id} style={styles.productCardWrapper}>
                <ProductCard
                  product={product}
                  onPress={() => handleProductPress(product)}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Best Sellers */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Best Sellers</Text>
            <Pressable onPress={() => navigation.navigate('Shop', {})}>
              <Text style={styles.viewAllText}>View All</Text>
            </Pressable>
          </View>

          <View style={styles.productsGrid}>
            {bestSellerProducts.slice(0, 4).map((product) => (
              <View key={product.id} style={styles.productCardWrapper}>
                <ProductCard
                  product={product}
                  onPress={() => handleProductPress(product)}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      )}

      {/* Modals */}
      <AIChatModal visible={showAIChat} onClose={() => setShowAIChat(false)} />
      <CameraSearchModal visible={showCameraSearch} onClose={() => setShowCameraSearch(false)} />
      <ProductRequestModal visible={showProductRequest} onClose={() => setShowProductRequest(false)} />
      <LocationModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSelectLocation={(address) => setDeliveryAddress(address)}
        currentAddress={deliveryAddress}
      />

      {/* Notifications Modal */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notificationModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <Pressable onPress={() => setShowNotifications(false)} style={styles.closeButton}>
                <X size={24} color="#1F2937" />
              </Pressable>
            </View>
            <ScrollView style={styles.notificationsList} contentContainerStyle={{ padding: 20 }}>
              {notifications.map((notification) => {
                const Icon = notification.icon;
                return (
                  <Pressable 
                    key={notification.id} 
                    style={({ pressed }) => [
                      styles.notificationItem, 
                      !notification.read && styles.unreadNotification,
                      pressed && styles.notificationPressed
                    ]}
                    onPress={() => handleNotificationPress(notification)}
                  >
                    <View style={[styles.notificationIcon, { backgroundColor: `${notification.color}15` }]}>
                      <Icon size={24} color={notification.color} />
                    </View>
                    <View style={styles.notificationContent}>
                      <View style={styles.notificationHeader}>
                        <Text style={styles.notificationTitle}>{notification.title}</Text>
                        <Text style={styles.notificationTime}>{notification.time}</Text>
                      </View>
                      <Text style={styles.notificationMessage}>{notification.message}</Text>
                    </View>
                    {!notification.read && <View style={styles.unreadDot} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FF5722',
    fontSize: 10,
    fontWeight: '800',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingLeft: 20,
    paddingRight: 12,
    paddingVertical: 14,
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 4,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  backIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    padding: 0,
  },
  cameraIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  categoriesSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  categoriesList: {
    gap: 20,
  },
  categoryItem: {
    alignItems: 'center',
    gap: 8,
  },
  categoryIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryText: {
    fontSize: 12,
    color: '#1F2937',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  promoCard: {
    margin: 20,
    marginBottom: 0,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  promoContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  promoTextContainer: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
    letterSpacing: -1,
  },
  promoDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
    fontWeight: '500',
  },
  promoButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
    alignSelf: 'flex-start',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  promoButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  promoImagePlaceholder: {
    width: 110,
    height: 110,
    backgroundColor: 'rgba(255, 87, 34, 0.1)',
    borderRadius: 24,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF5722',
    letterSpacing: 0.3,
  },
  aiIconButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FF5722',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#FF5722',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  flashSaleBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
  },
  flashSaleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  flashSaleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flashSaleTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5722',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  timerText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  flashSaleViewAll: {
    color: '#FF5722',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  flashSaleList: {
    paddingRight: 16,
  },
  flashSaleItem: {
    width: 160,
    marginRight: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  notificationModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 4,
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationPressed: {
    backgroundColor: '#F9FAFB',
    opacity: 0.7,
  },
  unreadNotification: {
    backgroundColor: '#FFF5F0',
    shadowColor: '#FF5722',
    shadowOpacity: 0.08,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 0.1,
  },
  notificationTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5722',
    position: 'absolute',
    top: 16,
    right: 16,
  },
  productRequestButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  productRequestButtonPressed: {
    backgroundColor: '#FFF5F0',
    shadowColor: '#FF5722',
    shadowOpacity: 0.12,
  },
  productRequestContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  productRequestIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productRequestText: {
    flex: 1,
  },
  productRequestTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  productRequestSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  // Search Discovery Styles
  discoverySection: {
    padding: 20,
  },
  discoverySectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  categoryImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#F5F5F7',
  },
  categoryCardText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    padding: 16,
    letterSpacing: -0.2,
  },
  brandsScrollContent: {
    gap: 16,
    paddingRight: 20,
  },
  brandCard: {
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  brandName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  searchResultsSection: {
    padding: 20,
  },
  searchResultsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCardWrapper: {
    width: (width - 52) / 2,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#888888',
  },
  // Search Active Styles
  searchActiveSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  searchActiveSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchActiveSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF5722',
    letterSpacing: 0.2,
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  searchItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    letterSpacing: -0.1,
  },
  removeButton: {
    padding: 4,
  },
  popularCategoriesScroll: {
    gap: 12,
    paddingRight: 20,
  },
  popularCategoryCard: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popularCategoryImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  popularCategoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  popularCategoryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    textAlign: 'center',
    zIndex: 1,
  },
});
