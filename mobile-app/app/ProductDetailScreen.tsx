import React, { useState, useRef, useEffect } from 'react';
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
  ActivityIndicator,
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
  X,
  MessageCircle,
  Truck,
  ShieldCheck,
  ChevronRight,
  Bookmark, // For Wishlist categories
  FolderHeart,
  PlusCircle,
  Gift,
  Edit3,
} from 'lucide-react-native';
import { ProductCard } from '../src/components/ProductCard';
import CameraSearchModal from '../src/components/CameraSearchModal';
import StoreChatModal from '../src/components/StoreChatModal';
import { AIChatBubble } from '../src/components/AIChatBubble';
import { useCartStore } from '../src/stores/cartStore';
import { useWishlistStore } from '../src/stores/wishlistStore';
import { trendingProducts } from '../src/data/products';
import { COLORS } from '../src/constants/theme';
import { useAuthStore } from '../src/stores/authStore';
import { GuestLoginModal } from '../src/components/GuestLoginModal';
import { reviewService, Review } from '../src/services/reviewService';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

const { width } = Dimensions.get('window');
const BRAND_COLOR = COLORS.primary;

// Color name to hex mapping for display
const colorNameToHex: Record<string, string> = {
  'black': '#374151',
  'graphite black': '#374151',
  'white': '#F9FAFB',
  'pearl white': '#F9FAFB',
  'navy': '#1E3A8A',
  'deep navy': '#1E3A8A',
  'blue': '#3B82F6',
  'red': '#EF4444',
  'green': '#10B981',
  'yellow': '#F59E0B',
  'pink': '#EC4899',
  'purple': '#8B5CF6',
  'gray': '#6B7280',
  'grey': '#6B7280',
  'silver': '#C0C0C0',
  'gold': '#D4AF37',
  'rose gold': '#B76E79',
  'bronze': '#CD7F32',
  'orange': '#F97316',
  'brown': '#92400E',
  'beige': '#F5F5DC',
  'cream': '#FFFDD0',
};

// Helper to get color hex from name
const getColorHex = (colorName: string): string => {
  const normalized = colorName.toLowerCase().trim();
  return colorNameToHex[normalized] || '#6B7280'; // Default gray if not found
};

// Helper to format review date
const formatReviewDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
};

export default function ProductDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { product } = route.params;
  const { user, isGuest } = useAuthStore();

  // State
  const [activeTab, setActiveTab] = useState<'details' | 'support' | 'ratings'>('details');
  
  // Dynamic variants from product database
  const rawColors = product.colors || (product as any).colors || [];
  const rawSizes = product.sizes || (product as any).sizes || [];

  const parsedColors = typeof rawColors === 'string' ? JSON.parse(rawColors) : rawColors;
  const parsedSizes = typeof rawSizes === 'string' ? JSON.parse(rawSizes) : rawSizes;
  
  const productColors = Array.isArray(parsedColors) ? parsedColors.filter((c: string) => c && typeof c === 'string' && c.trim() !== '') : [];
  const productSizes = Array.isArray(parsedSizes) ? parsedSizes.filter((s: string) => s && typeof s === 'string' && s.trim() !== '') : [];
  
  const hasColors = productColors.length > 0;
  const hasSizes = productSizes.length > 0;
  const hasVariants = hasColors || hasSizes;

  // Debug log for variants
  console.log('[ProductDetail] Product:', product.name, '| colors:', productColors, '| sizes:', productSizes, '| hasVariants:', hasVariants);
  
  // Variant selections
  const [selectedColor, setSelectedColor] = useState(hasColors ? productColors[0] : null);
  const [selectedSize, setSelectedSize] = useState(hasSizes ? productSizes[0] : null);
  const [quantity, setQuantity] = useState(1);
  const [showCameraSearch, setShowCameraSearch] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestModalMessage, setGuestModalMessage] = useState('');
  
  // Variant Modal State
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [variantModalAction, setVariantModalAction] = useState<'cart' | 'buy'>('cart');
  const [modalSelectedColor, setModalSelectedColor] = useState(hasColors ? productColors[0] : null);
  const [modalSelectedSize, setModalSelectedSize] = useState(hasSizes ? productSizes[0] : null);
  const [modalQuantity, setModalQuantity] = useState(1);
  
  // Reviews State
  const [reviews, setReviews] = useState<(Review & { buyer?: { full_name: string | null; avatar_url: string | null } })[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  
  // Wishlist State
  const [showWishlistDropdown, setShowWishlistDropdown] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);

  // Use product images if available, otherwise mock an array with the main image
  const productImages = product.images || [product.image, product.image, product.image, product.image, product.image];

  // Stores
  const addItem = useCartStore((state) => state.addItem);
  const setQuickOrder = useCartStore((state) => state.setQuickOrder);
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist, categories, createCategory } = useWishlistStore();
  const isFavorite = isInWishlist(product.id);

  // Constants
  const originalPrice = Math.round((product.price ?? 0) * 1.5); // Mock original price
  const cartItemCount = useCartStore((state) => state.items.length);

  const relatedProducts = trendingProducts.filter((p) => p.id !== product.id).slice(0, 4);

  // Fetch reviews from database
  useEffect(() => {
    const fetchReviews = async () => {
      if (!product.id) return;
      
      setIsLoadingReviews(true);
      try {
        const { reviews: fetchedReviews, total } = await reviewService.getProductReviews(product.id);
        setReviews(fetchedReviews);
        setReviewsTotal(total);
        
        // Calculate average rating
        if (fetchedReviews.length > 0) {
          const avg = fetchedReviews.reduce((sum, r) => sum + r.rating, 0) / fetchedReviews.length;
          setAverageRating(Math.round(avg * 10) / 10);
        }
        console.log('[ProductDetail] Fetched', fetchedReviews.length, 'reviews for product', product.id);
      } catch (error) {
        console.error('[ProductDetail] Error fetching reviews:', error);
      } finally {
        setIsLoadingReviews(false);
      }
    };
    
    fetchReviews();
  }, [product.id]);

  // Debug effect for variant modal state
  useEffect(() => {
    console.log('[ProductDetail] showVariantModal changed to:', showVariantModal);
  }, [showVariantModal]);

  // Build selected variant object
  const buildSelectedVariant = (color?: string | null, size?: string | null) => {
    const variant: { color?: string; size?: string } = {};
    if (hasColors && color) {
      variant.color = color;
    }
    if (hasSizes && size) {
      variant.size = size;
    }
    return Object.keys(variant).length > 0 ? variant : null;
  };

  // Open variant modal
  const openVariantModal = (action: 'cart' | 'buy') => {
    console.log('[ProductDetail] openVariantModal called | action:', action, '| hasVariants:', hasVariants, '| hasColors:', hasColors, '| hasSizes:', hasSizes);
    
    if (isGuest) {
      console.log('[ProductDetail] User is guest, showing login modal');
      setGuestModalMessage(action === 'cart' ? "Sign up to add items to your cart." : "Sign up to buy items.");
      setShowGuestModal(true);
      return;
    }
    
    console.log('[ProductDetail] Opening variant modal | selectedColor:', selectedColor, '| selectedSize:', selectedSize);
    
    // Reset modal selections to current selections
    setModalSelectedColor(selectedColor);
    setModalSelectedSize(selectedSize);
    setModalQuantity(quantity);
    setVariantModalAction(action);
    setShowVariantModal(true);
    
    console.log('[ProductDetail] Variant modal state set to true');
  };

  // Handle variant modal confirm
  const handleVariantModalConfirm = () => {
    // Validate that required variants are selected
    if (hasColors && !modalSelectedColor) {
      Alert.alert('Select Color', 'Please select a color before continuing');
      return;
    }
    
    if (hasSizes && !modalSelectedSize) {
      Alert.alert('Select Size', 'Please select a size before continuing');
      return;
    }
    
    const selectedVariant = buildSelectedVariant(modalSelectedColor, modalSelectedSize);
    
    console.log('[ProductDetail] Adding to cart with variant:', selectedVariant);
    
    if (variantModalAction === 'cart') {
      addItem({ 
        ...product, 
        price: product.price,
        selectedVariant,
        quantity: modalQuantity 
      });
      
      const variantText = selectedVariant 
        ? ` (${[selectedVariant.color, selectedVariant.size].filter(Boolean).join(', ')})`
        : '';
      Alert.alert('Added to Cart', `${product.name}${variantText} has been added to your cart.`);
    } else {
      setQuickOrder({ ...product, selectedVariant }, modalQuantity);
      navigation.navigate('Checkout', {});
    }
    
    // Update main selections
    setSelectedColor(modalSelectedColor);
    setSelectedSize(modalSelectedSize);
    setQuantity(modalQuantity);
    setShowVariantModal(false);
  };

  // Handlers
  const handleAddToCart = () => {
    console.log('[ProductDetail] handleAddToCart clicked | hasVariants:', hasVariants);
    
    // Always show variant modal if variants exist
    if (hasVariants) {
      console.log('[ProductDetail] Product has variants, opening variant modal');
      openVariantModal('cart');
      return;
    }
    
    console.log('[ProductDetail] No variants, adding directly to cart');
    
    const { isGuest } = useAuthStore.getState();
    if (isGuest) {
      setGuestModalMessage("Sign up to add items to your cart.");
      setShowGuestModal(true);
      return;
    }
    
    // Build variant info
    const selectedVariant = buildSelectedVariant();
    
    // Add to cart with variant information
    addItem({ 
      ...product, 
      price: product.price,
      selectedVariant,
      quantity 
    }); 
    
    const variantText = selectedVariant 
      ? ` (${[selectedVariant.color, selectedVariant.size].filter(Boolean).join(', ')})`
      : '';
    Alert.alert('Added to Cart', `${product.name}${variantText} has been added to your cart.`);
  };

  const handleBuyNow = () => {
    console.log('[ProductDetail] handleBuyNow clicked | hasVariants:', hasVariants);
    
    // Always show variant modal if variants exist
    if (hasVariants) {
      console.log('[ProductDetail] Product has variants, opening variant modal');
      openVariantModal('buy');
      return;
    }
    
    console.log('[ProductDetail] No variants, proceeding to checkout');
    
    const { isGuest } = useAuthStore.getState();
    if (isGuest) {
      setGuestModalMessage("Sign up to buy items.");
      setShowGuestModal(true);
      return;
    }
    
    // Build variant info
    const selectedVariant = buildSelectedVariant(selectedColor, selectedSize);
    
    // Set quick order with variant info
    setQuickOrder({ ...product, selectedVariant }, quantity);
    navigation.navigate('Checkout', {});
  };

  const handleShare = async () => {
    await Share.share({ message: `Check out ${product.name} on BazaarX! Γé▒${product.price}` });
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
        id: product.seller_id || 'store_1', 
        name: product.seller || 'TechHub Manila Official',
        image: 'https://images.unsplash.com/photo-1472851294608-41551b33fcc3?w=150', // Mock Store Image
        rating: product.sellerRating || 4.9,
        followers: 1250,
        description: 'Official distributor of premium tech gadgets.'
      } 
    });
  };

  const handleWishlistAction = (categoryId?: string) => {
    const { isGuest } = useAuthStore.getState();
    if (isGuest) {
      setGuestModalMessage("Sign up to create wishlists.");
      setShowGuestModal(true);
      setShowWishlistDropdown(false);
      return;
    }

    if (categoryId) {
       // Add to specific category
       addToWishlist(product, 'medium', 1, categoryId);
       const categoryName = categories.find(c => c.id === categoryId)?.name;
       Alert.alert('Saved!', `Added to ${categoryName}`);
       setShowWishlistDropdown(false);
    } else {
       // Initial click - toggle dropdown
       if (isFavorite) {
         removeFromWishlist(product.id);
       } else {
         setShowWishlistDropdown(!showWishlistDropdown);
       }
    }
  };

  const handleCreateList = () => {
    if (!newListName.trim()) return;
    const newId = createCategory(newListName, 'private');
    addToWishlist(product, 'medium', 1, newId);
    setNewListName('');
    setIsCreatingList(false);
    setShowWishlistDropdown(false);
    Alert.alert('Success', `List created and item added!`);
  };



  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND_COLOR} />

      {/* --- HEADER (Matches Screenshot) --- */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
         <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
           <ArrowLeft size={24} color="#FFF" />
         </Pressable>

         <Pressable style={styles.headerSearchBar} onPress={() => setIsSearchFocused(true)}>
             <Search size={18} color="#9CA3AF" />
             <Text style={styles.headerSearchText}>Search product...</Text>
             <View style={styles.cameraIcon}>
                <Camera size={16} color={BRAND_COLOR} />
             </View>
         </Pressable>

         <View style={styles.headerRight}>
             <Pressable onPress={() => navigation.navigate('MainTabs', { screen: 'Cart' })} style={styles.iconButton}>
               <ShoppingCart size={24} color="#FFF" />
               {cartItemCount > 0 && (
                 <View style={styles.badge}>
                   <Text style={styles.badgeText}>{cartItemCount}</Text>
                 </View>
               )}
             </Pressable>
             <Pressable style={styles.iconButton} onPress={() => { /* Menu Action */ }}>
                <View style={{ gap: 3 }}>
                   <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF' }} />
                   <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF' }} />
                   <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF' }} />
                </View>
             </Pressable>
         </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* --- IMAGE CAROUSEL --- */}
        <View style={styles.imageContainer}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const contentOffsetX = e.nativeEvent.contentOffset.x;
              const index = Math.round(contentOffsetX / (width || 1));
              setCurrentImageIndex(index);
            }}
            scrollEventThrottle={16}
          >
            {productImages.filter((img): img is string => img !== undefined).map((img: string, index: number) => (
              <Image key={index} source={{ uri: img }} style={styles.productImage} />
            ))}
          </ScrollView>
          
          {/* Page Indicator (Top Left) */}
          <View style={styles.pageIndicator}>
            <Text style={styles.pageText}>{currentImageIndex + 1}/{productImages.length}</Text>
          </View>

          {/* Share Icon */}
          <Pressable 
              style={styles.shareFab} 
              onPress={handleShare}
          >
              <Share2 size={20} color={BRAND_COLOR} />
          </Pressable>

          {/* Wishlist / Bookmark FAB */}
           <Pressable 
              style={styles.heartFab} 
              onPress={() => handleWishlistAction()}
          >
             {isFavorite ? (
                <Gift size={20} color="#EF4444" fill="#EF4444" />
             ) : (
                <Gift size={20} color={BRAND_COLOR} strokeWidth={2.5} />
             )}
          </Pressable>

          {/* Inline Wishlist Dropdown */}
          {showWishlistDropdown && !isFavorite && (
              <View style={styles.wishlistDropdown}>
                  <Text style={styles.dropdownHeader}>Save to List</Text>
                  
                  {categories.map((cat) => (
                      <Pressable 
                        key={cat.id} 
                        style={styles.dropdownItem}
                        onPress={() => handleWishlistAction(cat.id)}
                      >
                         <FolderHeart size={16} color="#4B5563" />
                         <Text style={styles.dropdownItemText}>{cat.name}</Text>
                      </Pressable>
                  ))}

                  <View style={styles.dropdownDivider} />

                  {isCreatingList ? (
                    <View style={styles.createListRow}>
                        <TextInput 
                           style={styles.createListInput}
                           placeholder="List Name"
                           value={newListName}
                           onChangeText={setNewListName}
                           autoFocus
                        />
                        <Pressable onPress={handleCreateList}>
                           <PlusCircle size={20} color={BRAND_COLOR} />
                        </Pressable>
                    </View>
                  ) : (
                    <Pressable 
                        style={styles.dropdownItem} 
                        onPress={() => setIsCreatingList(true)}
                    >
                        <PlusCircle size={16} color={BRAND_COLOR} />
                        <Text style={[styles.dropdownItemText, { color: BRAND_COLOR, fontWeight: '700' }]}>Create New List</Text>
                    </Pressable>
                  )}
              </View>
          )}
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
          <Text style={styles.subInfo}>{product.sold} sold this month ΓÇó Free Shipping Available</Text>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.currentPrice}>Γé▒{(product.price ?? 0).toLocaleString()}</Text>
            <Text style={styles.originalPrice}>Γé▒{originalPrice.toLocaleString()}</Text>
          </View>

          {/* Stock & Ratings */}
          <View style={styles.metaRow}>
            <Text style={[
              styles.stockText,
              { color: (product.stock || 0) <= 5 ? '#F97316' : (product.stock || 0) === 0 ? '#EF4444' : '#10B981' }
            ]}>
              {(product.stock || 0) === 0 
                ? 'Out of Stock' 
                : (product.stock || 0) <= 5 
                  ? `Only ${product.stock} left!` 
                  : `In-Stock (${product.stock || 0})`}
            </Text>
          </View>
           <View style={styles.ratingRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={14} color={i < 4 ? '#F59E0B' : '#E5E7EB'} fill={i < 4 ? '#F59E0B' : '#E5E7EB'} />
              ))}
              <Text style={styles.ratingValue}>4.8 ({(product.sold ?? 0).toLocaleString()})</Text>
              <Text style={styles.questionsLink}>14 Questions</Text>
           </View>
           
           {/* --- COLOR SELECTION --- */}
           {hasColors && (
             <View style={styles.variantSection}>
               <Text style={styles.variantLabel}>Color: <Text style={styles.variantSelected}>{selectedColor}</Text></Text>
               <View style={styles.colorOptions}>
                 {productColors.filter((c: string) => c.trim() !== '').map((color: string, index: number) => (
                   <Pressable
                     key={`${color}-${index}`}
                     style={[
                       styles.colorOption,
                       { backgroundColor: getColorHex(color) },
                       selectedColor === color && styles.colorOptionSelected,
                     ]}
                     onPress={() => setSelectedColor(color)}
                   >
                     {selectedColor === color && (
                       <View style={styles.colorCheckmark}>
                         <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>Γ£ô</Text>
                       </View>
                     )}
                   </Pressable>
                 ))}
               </View>
             </View>
           )}
           
           {/* --- SIZE SELECTION --- */}
           {hasSizes && (
             <View style={styles.variantSection}>
               <Text style={styles.variantLabel}>Size: <Text style={styles.variantSelected}>{selectedSize}</Text></Text>
               <View style={styles.sizeOptions}>
                 {productSizes.filter((s: string) => s.trim() !== '').map((size: string, index: number) => (
                   <Pressable
                     key={`${size}-${index}`}
                     style={[
                       styles.sizeOption,
                       selectedSize === size && styles.sizeOptionSelected,
                     ]}
                     onPress={() => setSelectedSize(size)}
                   >
                     <Text style={[
                       styles.sizeOptionText,
                       selectedSize === size && styles.sizeOptionTextSelected,
                     ]}>{size}</Text>
                   </Pressable>
                 ))}
               </View>
             </View>
           )}
        </View>
        <View style={styles.section}>
          <View style={styles.quantityRow}>
             <Pressable 
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                style={styles.qtyBtn}
              >
                <Minus size={20} color={BRAND_COLOR} />
              </Pressable>
              
              <Text style={styles.qtyValue}>{quantity}</Text>
              
              <Pressable 
                onPress={() => quantity == product.stock ? null : setQuantity(quantity + 1)}
                style={styles.qtyBtn}
              >
                <Plus size={20} color={BRAND_COLOR} />
              </Pressable>
          </View>
        </View>

        {/* --- SELLER INFO --- */}
        <Pressable onPress={handleVisitStore} style={styles.sellerSection}>
          <View style={styles.sellerHeader}>
            <Text style={styles.soldByLabel}>Sold by:</Text>
            <View style={styles.sellerNameRow}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1472851294608-41551b33fcc3?w=50' }} style={{width: 20, height: 20, borderRadius: 10}} />
              <Text style={styles.sellerName}>{product.seller || 'TechHub Manila'}</Text>
              <BadgeCheck size={14} color={BRAND_COLOR} fill="#FFF" />
              <ChevronRight size={16} color="#9CA3AF" />
            </View>
            <View style={styles.sellerRating}>
               <Star size={12} fill="#F59E0B" color="#F59E0B" />
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
                    {tab === 'ratings' ? `Ratings (${reviewsTotal})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </Pressable>
              ))}
           </View>
           
           <View style={styles.tabContent}>
              {activeTab === 'ratings' && (
                 <View>
                    {isLoadingReviews ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={BRAND_COLOR} />
                        <Text style={styles.loadingText}>Loading reviews...</Text>
                      </View>
                    ) : reviews.length > 0 ? (
                      <>
                        <Text style={styles.reviewSummary}>
                          {averageRating || product.rating || 4.8} out of 5 stars based on {reviewsTotal} {reviewsTotal === 1 ? 'review' : 'reviews'}.
                        </Text>
                        {reviews.map((review) => (
                          <View key={review.id} style={styles.reviewCard}>
                            <Image 
                              source={{ uri: review.buyer?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' }} 
                              style={styles.reviewerAvatar} 
                            />
                            <View style={styles.reviewContent}>
                              <Text style={styles.reviewerName}>{review.buyer?.full_name || 'Anonymous Buyer'}</Text>
                              <View style={styles.reviewRatingRow}>
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} size={12} color={i < review.rating ? '#FBBF24' : '#E5E7EB'} fill={i < review.rating ? '#FBBF24' : '#E5E7EB'} />
                                ))}
                                <Text style={styles.reviewDate}>{formatReviewDate(review.created_at)}</Text>
                              </View>
                              <Text style={styles.reviewText}>{review.comment || 'No comment provided.'}</Text>
                              {review.images && review.images.length > 0 && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImagesContainer}>
                                  {review.images.map((img, idx) => (
                                    <Image key={idx} source={{ uri: img }} style={styles.reviewImage} />
                                  ))}
                                </ScrollView>
                              )}
                            </View>
                          </View>
                        ))}
                      </>
                    ) : (
                      <View style={styles.noReviewsContainer}>
                        <Star size={40} color="#E5E7EB" />
                        <Text style={styles.noReviewsText}>No reviews yet</Text>
                        <Text style={styles.noReviewsSubtext}>Be the first to review this product!</Text>
                      </View>
                    )}
                 </View>
              )}
              {activeTab === 'details' && (
                 <Text style={styles.textContent}>
                   {product.description || 'High-fidelity sound with detailed staging. Ergonomic design for long-listening comfort.'}
                   {'\n\n'}
                   Features:
                   {'\n'}ΓÇó Active Noise Cancellation
                   {'\n'}ΓÇó 24-Hour Battery Life
                   {'\n'}ΓÇó Water Resistant (IPX4)
                 </Text>
              )}
              {activeTab === 'support' && (
                 <Text style={styles.textContent}>
                   We offer a 7-day return policy for defective items. Please contact our support team for assistance.
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

      {/* --- BOTTOM ACTIONS (Matches Screenshot) --- */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
         <Pressable style={styles.addToCartBtn} onPress={handleAddToCart}>
            <ShoppingCart size={20} color={BRAND_COLOR} style={{ marginRight: 8 }} />
            <Text style={styles.addToCartText}>Add to Cart</Text>
         </Pressable>

         <Pressable style={styles.buyNowBtn} onPress={handleBuyNow}>
            <Text style={styles.buyNowText}>Buy Now</Text>
         </Pressable>
      </View>
      
      {/* --- VARIANT SELECTION MODAL --- */}
      <Modal
        visible={showVariantModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          console.log('[ProductDetail] Variant modal close requested');
          setShowVariantModal(false);
        }}
      >
        <TouchableWithoutFeedback onPress={() => {
          console.log('[ProductDetail] Modal overlay pressed, closing modal');
          setShowVariantModal(false);
        }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {
              console.log('[ProductDetail] Modal content pressed, preventing close');
            }}>
              <View style={[styles.variantModal, { paddingBottom: insets.bottom + 20 }]}>
                {/* Modal Header */}
                <View style={styles.variantModalHeader}>
                  <Image 
                    source={{ uri: productImages[0] }} 
                    style={styles.variantModalImage} 
                  />
                  <View style={styles.variantModalInfo}>
                    <Text style={styles.variantModalPrice}>₱{(product.price ?? 0).toLocaleString()}</Text>
                    <Text style={[
                      styles.variantModalStock,
                      { color: (product.stock || 0) <= 5 ? '#F97316' : (product.stock || 0) === 0 ? '#EF4444' : '#10B981' }
                    ]}>
                      {(product.stock || 0) === 0 ? 'Out of Stock' : `Stock: ${product.stock || 0}`}
                    </Text>
                    <Text style={styles.variantModalSelected}>
                      {[modalSelectedColor, modalSelectedSize].filter(Boolean).join(', ') || 'Select options'}
                    </Text>
                  </View>
                  <Pressable style={styles.variantModalClose} onPress={() => setShowVariantModal(false)}>
                    <X size={22} color="#6B7280" />
                  </Pressable>
                </View>

                <ScrollView style={styles.variantModalContent} showsVerticalScrollIndicator={false}>
                  {/* Color Selection */}
                  {hasColors && (
                    <View style={styles.variantModalSection}>
                      <Text style={styles.variantModalLabel}>Color</Text>
                      <View style={styles.variantModalOptions}>
                        {productColors.filter((c: string) => c.trim() !== '').map((color: string, index: number) => (
                          <Pressable
                            key={`modal-color-${color}-${index}`}
                            style={[
                              styles.variantModalColorOption,
                              { backgroundColor: getColorHex(color) },
                              modalSelectedColor === color && styles.variantModalColorSelected,
                            ]}
                            onPress={() => setModalSelectedColor(color)}
                          >
                            {modalSelectedColor === color && (
                              <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>Γ£ô</Text>
                            )}
                          </Pressable>
                        ))}
                      </View>
                      <Text style={styles.variantModalSelectedText}>{modalSelectedColor}</Text>
                    </View>
                  )}

                  {/* Size Selection */}
                  {hasSizes && (
                    <View style={styles.variantModalSection}>
                      <Text style={styles.variantModalLabel}>Size</Text>
                      <View style={styles.variantModalSizeOptions}>
                        {productSizes.filter((s: string) => s.trim() !== '').map((size: string, index: number) => (
                          <Pressable
                            key={`modal-size-${size}-${index}`}
                            style={[
                              styles.variantModalSizeOption,
                              modalSelectedSize === size && styles.variantModalSizeSelected,
                            ]}
                            onPress={() => setModalSelectedSize(size)}
                          >
                            <Text style={[
                              styles.variantModalSizeText,
                              modalSelectedSize === size && styles.variantModalSizeTextSelected,
                            ]}>{size}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Quantity Selection */}
                  <View style={styles.variantModalSection}>
                    <Text style={styles.variantModalLabel}>Quantity</Text>
                    <View style={styles.variantModalQuantityRow}>
                      <Pressable 
                        style={styles.variantModalQtyBtn}
                        onPress={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                      >
                        <Minus size={18} color={BRAND_COLOR} />
                      </Pressable>
                      <Text style={styles.variantModalQtyValue}>{modalQuantity}</Text>
                      <Pressable 
                        style={styles.variantModalQtyBtn}
                        onPress={() => setModalQuantity(modalQuantity + 1)}
                      >
                        <Plus size={18} color={BRAND_COLOR} />
                      </Pressable>
                    </View>
                  </View>
                </ScrollView>

                {/* Confirm Button */}
                <Pressable 
                  style={[
                    styles.variantModalConfirmBtn,
                    variantModalAction === 'buy' && styles.variantModalBuyBtn,
                    // Disable button if required variants not selected
                    ((hasColors && !modalSelectedColor) || (hasSizes && !modalSelectedSize)) && styles.variantModalConfirmBtnDisabled
                  ]} 
                  onPress={handleVariantModalConfirm}
                  disabled={(hasColors && !modalSelectedColor) || (hasSizes && !modalSelectedSize)}
                >
                  <Text style={[
                    styles.variantModalConfirmText,
                    variantModalAction === 'buy' && { color: '#FFF' },
                    ((hasColors && !modalSelectedColor) || (hasSizes && !modalSelectedSize)) && styles.variantModalConfirmTextDisabled
                  ]}>
                    {variantModalAction === 'cart' ? 'Add to Cart' : 'Buy Now'}
                  </Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      
      <CameraSearchModal visible={showCameraSearch} onClose={() => setShowCameraSearch(false)} />
      
      <StoreChatModal
        visible={showChat}
        onClose={() => setShowChat(false)}
        storeName={product.seller || 'Store'}
        sellerId={product.seller_id}
      />
      
      {showGuestModal && (
        <GuestLoginModal 
            visible={true}
            onClose={() => setShowGuestModal(false)} 
            message={guestModalMessage || "You need an account to buy items."}
        />
      )}

      {/* AI Chat Bubble */}
      <AIChatBubble
        product={{
          id: product.id,
          name: product.name || 'Product',
          description: product.description || '',
          price: product.price || 0,
          category: product.category,
          colors: productColors,
          sizes: productSizes,
          stock: product.stock || 0,
          rating: averageRating || product.rating,
          reviewCount: reviewsTotal,
        }}
        store={{
          id: product.sellerId || '',
          storeName: product.seller || 'Store',
        }}
        onTalkToSeller={() => setShowChat(true)}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  
  // Header
  header: { 
    backgroundColor: BRAND_COLOR,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 36,
    gap: 8,
  },
  headerSearchText: { flex: 1, color: '#9CA3AF', fontSize: 13 },
  cameraIcon: {
      backgroundColor: '#FEE2E2',
      borderRadius: 12,
      padding: 4,
  },
  headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12
  },
  iconButton: {
    padding: 4,
    position: 'relative',
  },
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#FFF',
    borderRadius: 10, width: 16, height: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: BRAND_COLOR, fontSize: 10, fontWeight: 'bold' },

  // Image Area
  imageContainer: {
    width: width,
    height: width, // Square aspect ratio
    position: 'relative',
    backgroundColor: '#FFF',
    zIndex: 1,
  },
  productImage: { width: width, height: width, resizeMode: 'cover' },
  pageIndicator: {
    position: 'absolute', top: 16, left: 16,
    backgroundColor: '#FFF',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, elevation: 2,
  },
  pageText: { color: '#1F2937', fontSize: 12, fontWeight: '700' },
  
  shareFab: {
    position: 'absolute',
    bottom: 96,
    right: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4,
    zIndex: 11,
  },
  heartFab: {
    position: 'absolute', 
    bottom: 40,
    right: 16,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6,
    zIndex: 12,
  },

  // Info Card
  infoCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24, // Kept to match rounded aesthetic even without overlap, or can be 0.
    marginTop: -24,
    zIndex: 2,
    marginBottom: 8,
  },
  tagRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  tagText: { fontSize: 11, fontWeight: '700' },
  productName: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4, lineHeight: 26 },
  subInfo: { fontSize: 12, color: '#6B7280', marginBottom: 16 },
  
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8 },
  currentPrice: { fontSize: 28, fontWeight: '900', color: '#111827' },
  originalPrice: { fontSize: 16, color: '#9CA3AF', textDecorationLine: 'line-through' },
  
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stockText: { fontSize: 13, color: '#10B981', fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingValue: { fontSize: 13, fontWeight: '600', color: '#111827', marginLeft: 4 },
  questionsLink: { fontSize: 13, color: '#8B5CF6', fontWeight: '600', marginLeft: 'auto' },

  // Selectors
  section: { backgroundColor: '#FFF', padding: 16, marginBottom: 8 },
  quantityRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, paddingVertical: 12 },
  qtyBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: BRAND_COLOR, justifyContent: 'center', alignItems: 'center' },
  qtyValue: { fontSize: 20, fontWeight: '700', color: '#111827' },

  // Seller Info
  sellerSection: { backgroundColor: '#FFF', padding: 16, marginBottom: 8, marginHorizontal: 16, borderRadius: 16 },
  sellerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, flexWrap:'wrap' },
  soldByLabel: { fontSize: 13, color: '#6B7280', marginRight: 4 },
  sellerNameRow: { flexDirection: 'row', alignItems: 'center', flex:1, gap:6 },
  sellerName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  sellerRating: { flexDirection:'row', alignItems:'center', gap:4 },
  sellerRatingText: { fontSize: 14, fontWeight:'700', color: '#111827'},
  benefitsRow: { flexDirection:'row', gap:12 },
  benefitChip: { flexDirection:'row', alignItems:'center', gap:6, backgroundColor: '#FFF7ED', paddingHorizontal: 12, paddingVertical:8, borderRadius: 8 },
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
  textContent: { fontSize: 14, color: '#374151', lineHeight: 20 }, 

  // Reviews
  reviewCard: { flexDirection: 'row', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 16 },
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
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6',
    gap: 12, elevation: 8,
  },
  addToCartBtn: {
     flex: 1, height: 48, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
     borderRadius: 24, borderWidth: 2, borderColor: BRAND_COLOR, backgroundColor: '#FFF',
  },
  addToCartText: { color: BRAND_COLOR, fontWeight: '700', fontSize: 16 },
  buyNowBtn: {
     flex: 1, height: 48, justifyContent: 'center', alignItems: 'center',
     borderRadius: 24, backgroundColor: BRAND_COLOR,
  },
  buyNowText: { color: '#FFF', fontWeight: '700', fontSize: 16 },

  // Wishlist Dropdown
  wishlistDropdown: {
      position: 'absolute',
      bottom: 90,
      right: 16,
      width: 200,
      backgroundColor: '#FFF',
      borderRadius: 16,
      padding: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 5,
      zIndex: 20,
      borderWidth: 1,
      borderColor: '#F3F4F6'
  },
  dropdownHeader: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', marginBottom: 8, textTransform: 'uppercase' },
  dropdownItem: {
      flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
  },
  dropdownItemText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  dropdownDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 4 },
  createListRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  createListInput: { flex: 1, fontSize: 13, borderBottomWidth: 1, borderBottomColor: COLORS.primary, paddingVertical: 4, color: '#1F2937' },

  // Variant Selection
  variantSection: { marginTop: 16 },
  variantLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 },
  variantSelected: { fontWeight: '700', color: '#111827' },
  colorOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderColor: BRAND_COLOR,
    borderWidth: 3,
  },
  colorCheckmark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: BRAND_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sizeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    minWidth: 50,
    alignItems: 'center',
  },
  sizeOptionSelected: {
    borderColor: BRAND_COLOR,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
  },
  sizeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  sizeOptionTextSelected: {
    color: BRAND_COLOR,
    fontWeight: '700',
  },

  // Variant Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  variantModal: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  variantModalHeader: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  variantModalImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  variantModalInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  variantModalPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: BRAND_COLOR,
  },
  variantModalStock: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 4,
  },
  variantModalSelected: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  variantModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  variantModalContent: {
    maxHeight: 300,
  },
  variantModalSection: {
    marginBottom: 24,
  },
  variantModalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  variantModalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  variantModalColorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  variantModalColorSelected: {
    borderColor: BRAND_COLOR,
    borderWidth: 3,
  },
  variantModalSelectedText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    textTransform: 'capitalize',
  },
  variantModalSizeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  variantModalSizeOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    minWidth: 60,
    alignItems: 'center',
  },
  variantModalSizeSelected: {
    borderColor: BRAND_COLOR,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
  },
  variantModalSizeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  variantModalSizeTextSelected: {
    color: BRAND_COLOR,
    fontWeight: '700',
  },
  variantModalQuantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  variantModalQtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  variantModalQtyValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    minWidth: 40,
    textAlign: 'center',
  },
  variantModalConfirmBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: BRAND_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  variantModalConfirmBtnDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  variantModalBuyBtn: {
    backgroundColor: BRAND_COLOR,
    borderColor: BRAND_COLOR,
  },
  variantModalConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND_COLOR,
  },
  variantModalConfirmTextDisabled: {
    color: '#9CA3AF',
  },

  // Loading & Empty States for Reviews
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  noReviewsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noReviewsText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  noReviewsSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#9CA3AF',
  },
  reviewImagesContainer: {
    marginTop: 8,
  },
  reviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
});

