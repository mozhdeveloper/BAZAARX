import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  Pressable,
  Dimensions,
  TextInput,
  StatusBar,
  Alert,
  Share,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ShoppingCart,
  Star,
  BadgeCheck,
  Search,
  Camera,
  Share2,
  Heart,
  Plus,
  Minus,

  MessageCircle,
  Truck,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react-native';
import { ProductCard } from '../src/components/ProductCard';
import CameraSearchModal from '../src/components/CameraSearchModal';
import StoreChatModal from '../src/components/StoreChatModal';
import { useCartStore } from '../src/stores/cartStore';
import { useWishlistStore } from '../src/stores/wishlistStore';
import { trendingProducts } from '../src/data/products';
import { COLORS } from '../src/constants/theme';
import { useAuthStore } from '../src/stores/authStore';
import { GuestLoginModal } from '../src/components/GuestLoginModal';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

const { width } = Dimensions.get('window');
const BRAND_COLOR = COLORS.primary;

// Standardized Mock Data
const mockVariants = {
  colors: [
    { name: 'Graphite Black', value: '#374151' },
    { name: 'Pearl White', value: '#F9FAFB' },
    { name: 'Deep Navy', value: '#1E3A8A' },
  ],
  options: ['Single', 'Bundle Pack', 'Pro Edition'],
};

const demoReviews = [
  {
    id: '1',
    buyerName: 'Maria Santos',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b5e5?w=150',
    rating: 5,
    comment: 'Amazing product! Fast delivery.',
    date: '2 days ago',
  },
  {
    id: '2',
    buyerName: 'Juan Dela Cruz',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    rating: 4,
    comment: 'Great quality for the price.',
    date: '1 week ago',
  },
   {
    id: '3',
    buyerName: 'Anna Reyes',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    rating: 5,
    comment: 'Highly recommended! Will order again.',
    date: '2 weeks ago',
  },
];

export default function ProductDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { product } = route.params;

  // State
  const [activeTab, setActiveTab] = useState<'details' | 'support' | 'ratings'>('details');
  const [selectedColor, setSelectedColor] = useState(mockVariants.colors[0]);
  const [selectedOption, setSelectedOption] = useState(mockVariants.options[0]);
  const [quantity, setQuantity] = useState(1);
  const [showCameraSearch, setShowCameraSearch] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestModalMessage, setGuestModalMessage] = useState('');

  // Use product images if available, otherwise mock an array with the main image
  const productImages = product.images || [product.image, product.image, product.image, product.image, product.image];

  // Stores
  const addItem = useCartStore((state) => state.addItem);
  const setQuickOrder = useCartStore((state) => state.setQuickOrder);
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
  const isFavorite = isInWishlist(product.id);

  // Constants
  const originalPrice = Math.round(product.price * 1.5); // Mock original price
  const cartItemCount = useCartStore((state) => state.items.length);

  const relatedProducts = trendingProducts.filter((p) => p.id !== product.id).slice(0, 4);

  // Handlers
  const handleAddToCart = () => {
    const { isGuest } = useAuthStore.getState();
    if (isGuest) {
      setGuestModalMessage("Sign up to add items to your cart.");
      setShowGuestModal(true);
      return;
    }
    // Basic fix for adding with variants
    addItem({ ...product, price: product.price }); 
    Alert.alert('Added to Cart', 'Item has been added to your cart.');
  };

  const handleBuyNow = () => {
    const { isGuest } = useAuthStore.getState();
    if (isGuest) {
      setGuestModalMessage("Sign up to buy items.");
      setShowGuestModal(true);
      return;
    }
    setQuickOrder(product, quantity);
    navigation.navigate('Checkout');
  };

  const handleShare = async () => {
    await Share.share({ message: `Check out ${product.name} on BazaarX! ₱${product.price}` });
  };

  const handleChat = () => {
    const { isGuest } = useAuthStore.getState();
    if (isGuest) {
        setGuestModalMessage("Sign up to chat with sellers.");
        setShowGuestModal(true);
        return;
    }
    setShowChat(true);
  }

  const handleVisitStore = () => {
    navigation.push('StoreDetail', { 
      store: { 
        id: product.sellerId || 'store_1', 
        name: product.seller || 'TechHub Manila Official',
        image: 'https://images.unsplash.com/photo-1472851294608-41551b33fcc3?w=150', // Mock Store Image
        rating: product.sellerRating || 4.9,
        followers: 1250,
        description: 'Official distributor of premium tech gadgets.'
      } 
    });
  };



  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND_COLOR} />

      {/* --- HEADER (Matches HomeScreen interaction) --- */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        {!isSearchFocused ? (
          <View style={styles.headerRow}>
            <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
              <ArrowLeft size={24} color="#FFF" />
            </Pressable>

            <View style={{ flex: 1 }} />

            {/* Search Icon */}
            <Pressable onPress={() => setIsSearchFocused(true)} style={styles.iconButton}>
               <Search size={24} color="#FFF" />
            </Pressable>

            {/* Cart Icon */}
            <Pressable onPress={() => navigation.navigate('MainTabs', { screen: 'Cart' })} style={styles.iconButton}>
              <ShoppingCart size={24} color="#FFF" />
              {cartItemCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartItemCount}</Text>
                </View>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.searchBarWrapper}>
             <Pressable onPress={() => setIsSearchFocused(false)} style={styles.iconButton}>
              <ArrowLeft size={24} color="#FFF" />
            </Pressable>
            <View style={styles.searchBarInner}>
               <Search size={20} color="#FFF" />
               <TextInput 
                  style={styles.searchInput}
                  placeholder="Search products..."
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  autoFocus
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={() => navigation.navigate('MainTabs', { screen: 'Shop', params: { searchQuery } } as any)}
               />
               <Pressable onPress={() => setShowCameraSearch(true)}>
                 <Camera size={20} color="#FFF" />
               </Pressable>
            </View>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* --- IMAGE CAROUSEL (Horizontal Scroll) --- */}
        <View style={styles.imageContainer}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const contentOffsetX = e.nativeEvent.contentOffset.x;
              const index = Math.round(contentOffsetX / width);
              setCurrentImageIndex(index);
            }}
            scrollEventThrottle={16}
          >
            {productImages.map((img: string, index: number) => (
              <Image key={index} source={{ uri: img }} style={styles.productImage} />
            ))}
          </ScrollView>
          
          {/* Page Indicator */}
          <View style={styles.pageIndicator}>
            <Text style={styles.pageText}>{currentImageIndex + 1}/{productImages.length}</Text>
          </View>

          {/* Floating Actions */}
          <View style={styles.floatingActions}>
            <Pressable style={styles.fab} onPress={handleShare}>
              <Share2 size={20} color={BRAND_COLOR} />
            </Pressable>
            <Pressable style={styles.fab} onPress={() => {
                const { isGuest } = useAuthStore.getState();
                if (isGuest) {
                    setGuestModalMessage("Sign up to save items.");
                    setShowGuestModal(true);
                    return;
                }
                isFavorite ? removeFromWishlist(product.id) : addToWishlist(product);
            }}>
              <Heart size={20} color={isFavorite ? BRAND_COLOR : '#9CA3AF'} fill={isFavorite ? BRAND_COLOR : 'none'} />
            </Pressable>
          </View>
        </View>

        {/* --- PRODUCT INFO CARD --- */}
        <View style={styles.infoCard}>
          {/* Tags */}
          <View style={styles.tagRow}>
            <View style={[styles.tag, { backgroundColor: '#EDE9FE' }]}>
              <Star size={12} color="#7C3AED" fill="#7C3AED" />
              <Text style={[styles.tagText, { color: '#7C3AED' }]}>Bestseller</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.tagText, { color: '#EF4444' }]}>15% OFF</Text>
            </View>
          </View>

          <Text style={styles.productName}>{product.name}</Text>
          
          <Text style={styles.subInfo}>{product.sold} sold this month • Free Shipping Available</Text>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.currentPrice}>₱{product.price.toLocaleString()}</Text>
            <Text style={styles.originalPrice}>₱{originalPrice.toLocaleString()}</Text>
          </View>

          {/* Stock & Ratings */}
          <View style={styles.metaRow}>
            <Text style={styles.stockText}>In-Stock (12)</Text>
            <View style={styles.ratingRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={14} color={i < 4 ? BRAND_COLOR : '#E5E7EB'} fill={i < 4 ? BRAND_COLOR : '#E5E7EB'} />
              ))}
              <Text style={styles.ratingValue}>4.8 ({product.sold})</Text>
              <Text style={styles.questionsLink}>14 Questions</Text>
            </View>
          </View>
        </View>

        {/* --- SELECTORS (Quantity & Variants) --- */}
        <View style={styles.section}>
          {/* Quantity Selector (Matches Screenshot 1) */}
          <View style={styles.quantityRow}>
             <Pressable 
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                style={styles.qtyBtn}
              >
                <Minus size={20} color={BRAND_COLOR} />
              </Pressable>
              
              <Text style={styles.qtyValue}>{quantity}</Text>
              
              <Pressable 
                onPress={() => setQuantity(quantity + 1)}
                style={styles.qtyBtn}
              >
                <Plus size={20} color={BRAND_COLOR} />
              </Pressable>
          </View>
        </View>

        {/* --- SELLER INFO (Matches Screenshot 1) --- */}
        <Pressable onPress={handleVisitStore} style={styles.sellerSection}>
          <View style={styles.sellerHeader}>
            <Text style={styles.soldByLabel}>Sold by:</Text>
            <View style={styles.sellerNameRow}>
              <Text style={styles.sellerName}>TechHub Manila Official</Text>
              <BadgeCheck size={16} color={BRAND_COLOR} fill="#FFF" />
              <ChevronRight size={16} color="#9CA3AF" />
            </View>
            <View style={styles.sellerRating}>
               <Star size={14} fill={BRAND_COLOR} color={BRAND_COLOR} />
               <Text style={styles.sellerRatingText}>4.9</Text>
            </View>
          </View>
          
          <View style={styles.benefitsRow}>
            <View style={styles.benefitChip}>
              <ShieldCheck size={14} color={BRAND_COLOR} />
              <Text style={styles.benefitText}>Verified Product</Text>
            </View>
            <View style={styles.benefitChip}>
              <Truck size={14} color={BRAND_COLOR} />
              <Text style={styles.benefitText}>Free Shipping</Text>
            </View>
          </View>
        </Pressable>

        {/* --- TABS --- */}
        <View style={styles.tabContainer}>
           <View style={styles.tabHeader}>
              {(['details', 'support', 'ratings'] as const).map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tabBtn, activeTab === tab && styles.activeTabBtn]}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </Pressable>
              ))}
           </View>
           
           <View style={styles.tabContent}>
              {activeTab === 'ratings' && (
                 <View>
                    <Text style={styles.reviewSummary}>4.8 out of 5 stars based on {product.sold} reviews.</Text>
                    <Text style={[styles.reviewSub, { marginBottom: 16 }]}>Customers love this product!</Text>
                    
                    {/* Mock Reviews */}
                    {demoReviews.map((review) => (
                      <View key={review.id} style={styles.reviewCard}>
                        <Image source={{ uri: review.avatar }} style={styles.reviewerAvatar} />
                        <View style={styles.reviewContent}>
                          <Text style={styles.reviewerName}>{review.buyerName}</Text>
                          <View style={styles.reviewRatingRow}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} size={12} color={i < review.rating ? '#FBBF24' : '#E5E7EB'} fill={i < review.rating ? '#FBBF24' : '#E5E7EB'} />
                            ))}
                            <Text style={styles.reviewDate}>{review.date}</Text>
                          </View>
                          <Text style={styles.reviewText}>{review.comment}</Text>
                        </View>
                      </View>
                    ))}
                 </View>
              )}
              {activeTab === 'details' && (
                 <Text style={styles.textContent}>
                   High-fidelity sound with detailed staging. Ergonomic design for long-listening comfort.
                   {'\n\n'}
                   Features:
                   {'\n'}• Active Noise Cancellation
                   {'\n'}• 24-Hour Battery Life
                   {'\n'}• Water Resistant (IPX4)
                   {'\n'}• Bluetooth 5.2
                 </Text>
              )}
              {activeTab === 'support' && (
                 <Text style={styles.textContent}>
                   We offer a 7-day return policy for defective items. Please contact our support team for assistance.
                   {'\n\n'}
                   Warranty: 1 Year Manufacturer Warranty
                 </Text>
              )}
           </View>
        </View>

        {/* --- RECOMMENDATIONS --- */}
        <View style={styles.recommendations}>
           <Text style={styles.sectionTitle}>You Might Also Like</Text>
           <View style={styles.grid}>
             {relatedProducts.map((p) => (
                <View key={p.id} style={styles.gridItem}>
                  <ProductCard product={p} onPress={() => navigation.push('ProductDetail', { product: p })} />
                </View>
             ))}
           </View>
        </View>

      </ScrollView>

      {/* --- BOTTOM ACTIONS --- */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
         {/* Chat Button */}
         <Pressable style={styles.chatBtn} onPress={handleChat}>
            <MessageCircle size={24} color={BRAND_COLOR} />
         </Pressable>
         
         <Pressable style={styles.addToCartBtn} onPress={handleAddToCart}>
            <ShoppingCart size={20} color={BRAND_COLOR} style={{ marginRight: 8 }} />
            <Text style={styles.addToCartText}>Add to Cart</Text>
         </Pressable>

         <Pressable style={styles.buyNowBtn} onPress={handleBuyNow}>
            <Text style={styles.buyNowText}>Buy Now</Text>
         </Pressable>
      </View>
      
      <CameraSearchModal visible={showCameraSearch} onClose={() => setShowCameraSearch(false)} />
      
      <StoreChatModal 
        visible={showChat} 
        onClose={() => setShowChat(false)}
        storeName={product.seller || "TechHub Manila"}
      />

      {showGuestModal && (
        <GuestLoginModal 
            visible={true}
            onClose={() => setShowGuestModal(false)} 
            message={guestModalMessage || "You need an account to buy items."}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  
  // Header
  header: { 
    backgroundColor: BRAND_COLOR,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchBarWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchBarInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    height: '100%',
  },
  iconButton: {
    padding: 4,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFF',
    borderRadius: 10,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: BRAND_COLOR,
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Image Area
  imageContainer: {
    width: width,
    height: width,
    position: 'relative',
    backgroundColor: '#FFF',
  },
  productImage: { width: width, height: width, resizeMode: 'cover' },
  pageIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pageText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  floatingActions: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    gap: 12,
  },
  fab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  // Info Card
  infoCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 8,
  },
  tagRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  tagText: { fontSize: 11, fontWeight: '700' },
  productName: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  subInfo: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8 },
  currentPrice: { fontSize: 24, fontWeight: '900', color: '#111827' },
  originalPrice: { fontSize: 16, color: '#9CA3AF', textDecorationLine: 'line-through' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stockText: { fontSize: 13, color: '#10B981', fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingValue: { fontSize: 13, fontWeight: '600', color: '#111827', marginLeft: 4 },
  questionsLink: { fontSize: 13, color: '#6366F1', fontWeight: '600', marginLeft: 8 },

  // Selectors
  section: { backgroundColor: '#FFF', padding: 16, marginBottom: 8 },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingVertical: 12,
  },
  qtyBtn: {
     width: 44,
     height: 44,
     borderRadius: 22,
     borderWidth: 1.5,
     borderColor: BRAND_COLOR,
     justifyContent: 'center',
     alignItems: 'center',
  },
  qtyValue: { fontSize: 20, fontWeight: '700', color: '#111827' },

  // Seller Info (Matches Screenshot 1)
  sellerSection: {
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 8,
    borderRadius: 16,
    marginHorizontal: 16, // Inset style as per screenshot idea
  },
  sellerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, flexWrap:'wrap' },
  soldByLabel: { fontSize: 13, color: '#6B7280', marginRight: 4 },
  sellerNameRow: { flexDirection: 'row', alignItems: 'center', flex:1, gap:4 },
  sellerName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  sellerRating: { flexDirection:'row', alignItems:'center', gap:4 },
  sellerRatingText: { fontSize: 14, fontWeight:'700', color: '#111827'},
  benefitsRow: { flexDirection:'row', gap:12 },
  benefitChip: { 
     flexDirection:'row', alignItems:'center', gap:6, 
     backgroundColor: '#FFF7ED', paddingHorizontal: 12, paddingVertical:8, borderRadius: 8 
  },
  benefitText: { fontSize: 12, color: BRAND_COLOR, fontWeight:'600' },

  // Tabs
  tabContainer: { backgroundColor: '#FFF', paddingHorizontal:16, paddingTop:16, marginBottom:8 },
  tabHeader: { flexDirection: 'row', gap: 24, marginBottom: 16 },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  activeTabBtn: { backgroundColor: BRAND_COLOR },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  activeTabText: { color: '#FFF' },
  tabContent: { paddingBottom: 16 },
  reviewSummary: { fontSize: 14, color: '#374151', marginBottom: 4 },
  reviewSub: { fontSize: 14, color: '#6B7280' },
  textContent: { fontSize: 14, color: '#374151', lineHeight: 20 }, 

  // Reviews
  reviewCard: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 16,
  },
  reviewerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  reviewContent: { flex: 1 },
  reviewerName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  reviewRatingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 2 },
  reviewDate: { fontSize: 12, color: '#9CA3AF' },
  reviewText: { fontSize: 14, color: '#4B5563', lineHeight: 20 },

  // Recommendations
  recommendations: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: (width - 44) / 2 },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    gap: 12,
    elevation: 8,
  },
  chatBtn: {
     width: 48, height: 48,
     justifyContent: 'center', alignItems: 'center',
     borderRadius: 12,
     borderWidth: 1, borderColor: '#E5E7EB',
  },
  addToCartBtn: {
     flex: 1, height: 48,
     flexDirection: 'row',
     justifyContent: 'center', alignItems: 'center',
     borderRadius: 24, // Pill shape
     borderWidth: 2, borderColor: BRAND_COLOR,
     backgroundColor: '#FFF',
  },
  addToCartText: { color: BRAND_COLOR, fontWeight: '700', fontSize: 15 },
  buyNowBtn: {
     flex: 1, height: 48,
     justifyContent: 'center', alignItems: 'center',
     borderRadius: 24, // Pill shape
     backgroundColor: BRAND_COLOR,
  },
  buyNowText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  
  // Menu Modal
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  menuContainer: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: 200,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  menuText: {
    fontSize: 16,
    color: '#374151',
  },
});

