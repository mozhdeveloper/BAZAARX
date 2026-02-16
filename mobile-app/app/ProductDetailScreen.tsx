import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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
  MapPin, // Added for seller location
  SlidersHorizontal,
  Bot,
} from 'lucide-react-native';
import { ProductCard } from '../src/components/ProductCard';
import CameraSearchModal from '../src/components/CameraSearchModal';
import StoreChatModal from '../src/components/StoreChatModal';
import { AIChatBubble } from '../src/components/AIChatBubble';
import { AddedToCartModal } from '../src/components/AddedToCartModal';
import { QuantityStepper } from '../src/components/QuantityStepper';
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

  // Structured variants from product_variants table
  const productVariants = product.variants || [];
  const hasStructuredVariants = productVariants.length > 0;

  // Dynamic variant labels from database schema
  // Falls back to "Color"/"Size" for legacy support
  const variantLabel1 = product.variant_label_1 || 'Color';
  const variantLabel2 = product.variant_label_2 || 'Size';

  // Dynamic variants - extract from structured variants
  // Supports both legacy (color/size) and dynamic (option_1_value/option_2_value)
  const rawOptions1 = hasStructuredVariants
    ? [...new Set(productVariants.map((v: any) => v.option_1_value || v.color).filter(Boolean))]
    : (product.option1Values || product.colors || []);
  const rawOptions2 = hasStructuredVariants
    ? [...new Set(productVariants.map((v: any) => v.option_2_value || v.size).filter(Boolean))]
    : (product.option2Values || product.sizes || []);

  const parsedOptions1 = typeof rawOptions1 === 'string' ? JSON.parse(rawOptions1) : rawOptions1;
  const parsedOptions2 = typeof rawOptions2 === 'string' ? JSON.parse(rawOptions2) : rawOptions2;

  const option1Values = Array.isArray(parsedOptions1) ? parsedOptions1.filter((c: string) => c && typeof c === 'string' && c.trim() !== '') : [];
  const option2Values = Array.isArray(parsedOptions2) ? parsedOptions2.filter((s: string) => s && typeof s === 'string' && s.trim() !== '') : [];

  // Legacy aliases for compatibility
  const productColors = option1Values;
  const productSizes = option2Values;

  const hasOption1 = option1Values.length > 0;
  const hasOption2 = option2Values.length > 0;
  const hasColors = hasOption1;  // Legacy alias
  const hasSizes = hasOption2;   // Legacy alias
  const hasVariants = hasOption1 || hasOption2 || hasStructuredVariants;

  // Variant selections
  const [selectedOption1, setSelectedOption1] = useState(hasOption1 ? option1Values[0] : null);
  const [selectedOption2, setSelectedOption2] = useState(hasOption2 ? option2Values[0] : null);
  // Legacy aliases
  const selectedColor = selectedOption1;
  const selectedSize = selectedOption2;
  const setSelectedColor = setSelectedOption1;
  const setSelectedSize = setSelectedOption2;
  const [quantity, setQuantity] = useState(1);
  const [showCameraSearch, setShowCameraSearch] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestModalMessage, setGuestModalMessage] = useState('');

  // Added to Cart Modal State
  const [showAddedToCartModal, setShowAddedToCartModal] = useState(false);
  const [addedProductInfo, setAddedProductInfo] = useState({ name: '', image: '' });

  // Variant Modal State
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [variantModalAction, setVariantModalAction] = useState<'cart' | 'buy'>('cart');
  const [modalSelectedOption1, setModalSelectedOption1] = useState(hasOption1 ? option1Values[0] : null);
  const [modalSelectedOption2, setModalSelectedOption2] = useState(hasOption2 ? option2Values[0] : null);
  // Legacy aliases for modal
  const modalSelectedColor = modalSelectedOption1;
  const modalSelectedSize = modalSelectedOption2;
  const setModalSelectedColor = setModalSelectedOption1;
  const setModalSelectedSize = setModalSelectedOption2;
  const [modalQuantity, setModalQuantity] = useState(1);

  // Computed modal variant price, stock, and image
  const modalVariantInfo = useMemo(() => {
    if (!hasStructuredVariants) {
      return { price: product.price, stock: product.stock, image: null };
    }

    const matchedVariant = productVariants.find((v: any) => {
      // Match by option values OR legacy color/size
      const option1Match = !modalSelectedOption1 || v.option_1_value === modalSelectedOption1 || v.color === modalSelectedOption1;
      const option2Match = !modalSelectedOption2 || v.option_2_value === modalSelectedOption2 || v.size === modalSelectedOption2;
      return option1Match && option2Match;
    });

    return {
      price: matchedVariant?.price ?? product.price,
      stock: matchedVariant?.stock ?? product.stock,
      variantId: matchedVariant?.id,
      image: matchedVariant?.thumbnail_url || matchedVariant?.image || null,
    };
  }, [hasStructuredVariants, productVariants, modalSelectedOption1, modalSelectedOption2, product.price, product.stock]);

  // Main screen variant info (for accurate stock display and validation)
  const selectedVariantInfo = useMemo(() => {
    if (!hasStructuredVariants) {
      return { price: product.price, stock: product.stock, image: null };
    }

    const matchedVariant = productVariants.find((v: any) => {
      // Match by option values OR legacy color/size using main screen state
      const option1Match = !selectedOption1 || v.option_1_value === selectedOption1 || v.color === selectedOption1;
      const option2Match = !selectedOption2 || v.option_2_value === selectedOption2 || v.size === selectedOption2;
      return option1Match && option2Match;
    });

    return {
      price: matchedVariant?.price ?? product.price,
      stock: matchedVariant?.stock ?? product.stock, // Default to product stock if no variant match found (though unlikely if options exist)
      variantId: matchedVariant?.id,
      image: matchedVariant?.thumbnail_url || matchedVariant?.image || null,
    };
  }, [hasStructuredVariants, productVariants, selectedOption1, selectedOption2, product.price, product.stock]);

  // Reviews State
  const [reviews, setReviews] = useState<(Review & { buyer?: { full_name: string | null; avatar_url: string | null } })[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [averageRating, setAverageRating] = useState(0);

  // Wishlist State
  const [showWishlistDropdown, setShowWishlistDropdown] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);

  // Menu State
  const [showMenu, setShowMenu] = useState(false);

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
      } catch (error) {
        console.error('[ProductDetail] Error fetching reviews:', error);
      } finally {
        setIsLoadingReviews(false);
      }
    };

    fetchReviews();
  }, [product.id]);

  // Build selected variant object with dynamic labels
  const buildSelectedVariant = (option1?: string | null, option2?: string | null) => {
    const variant: {
      color?: string;
      size?: string;
      option1Label?: string;
      option1Value?: string;
      option2Label?: string;
      option2Value?: string;
    } = {};

    if (hasOption1 && option1) {
      // Store both the value and the label for display
      variant.option1Label = variantLabel1;
      variant.option1Value = option1;
      // Legacy support: if label is Color, also set color field
      if (variantLabel1.toLowerCase() === 'color') {
        variant.color = option1;
      }
    }
    if (hasOption2 && option2) {
      variant.option2Label = variantLabel2;
      variant.option2Value = option2;
      // Legacy support: if label is Size, also set size field
      if (variantLabel2.toLowerCase() === 'size') {
        variant.size = option2;
      }
    }
    return Object.keys(variant).length > 0 ? variant : null;
  };

  // Open variant modal
  const openVariantModal = (action: 'cart' | 'buy') => {
    if (isGuest) {
      setGuestModalMessage(action === 'cart' ? "Sign up to add items to your cart." : "Sign up to buy items.");
      setShowGuestModal(true);
      return;
    }

    // Reset modal selections to current selections
    setModalSelectedOption1(selectedOption1);
    setModalSelectedOption2(selectedOption2);
    setModalQuantity(quantity);
    setVariantModalAction(action);
    setShowVariantModal(true);
  };

  // Handle variant modal confirm
  const handleVariantModalConfirm = () => {
    // Validate that required variants are selected
    if (hasOption1 && !modalSelectedOption1) {
      Alert.alert(`Select ${variantLabel1}`, `Please select a ${variantLabel1.toLowerCase()} before continuing`);
      return;
    }

    if (hasOption2 && !modalSelectedOption2) {
      Alert.alert(`Select ${variantLabel2}`, `Please select a ${variantLabel2.toLowerCase()} before continuing`);
      return;
    }

    const selectedVariant = buildSelectedVariant(modalSelectedOption1, modalSelectedOption2);

    // Find matching structured variant to get its price/stock
    let variantPrice = product.price;
    let matchedVariant: any = null;

    if (hasStructuredVariants) {
      matchedVariant = productVariants.find((v: any) => {
        const option1Match = !modalSelectedOption1 || v.option_1_value === modalSelectedOption1 || v.color === modalSelectedOption1;
        const option2Match = !modalSelectedOption2 || v.option_2_value === modalSelectedOption2 || v.size === modalSelectedOption2;
        return option1Match && option2Match;
      });

      if (matchedVariant?.price) {
        variantPrice = matchedVariant.price;
      }
    }

    if (variantModalAction === 'cart') {
      addItem({
        ...product,
        price: variantPrice,
        selectedVariant: {
          ...selectedVariant,
          variantId: matchedVariant?.id,
        },
        quantity: modalQuantity
      });

      // Build variant text for display using dynamic labels
      const variantParts: string[] = [];
      if (selectedVariant?.option1Value) {
        variantParts.push(`${variantLabel1}: ${selectedVariant.option1Value}`);
      }
      if (selectedVariant?.option2Value) {
        variantParts.push(`${variantLabel2}: ${selectedVariant.option2Value}`);
      }
      const variantText = variantParts.length > 0 ? ` (${variantParts.join(', ')})` : '';

      // Close variant modal first
      setShowVariantModal(false);

      // Show Added to Cart Modal
      setAddedProductInfo({
        name: `${product.name}${variantText}`,
        image: matchedVariant?.thumbnail_url || productImages[0] || product.image
      });
      setTimeout(() => setShowAddedToCartModal(true), 100); // Small delay for smooth transition
      return;
    } else {
      setQuickOrder({
        ...product,
        price: variantPrice,
        selectedVariant: {
          ...selectedVariant,
          variantId: matchedVariant?.id,
        },
      }, modalQuantity);
      navigation.navigate('Checkout', {});
    }

    // Update main selections
    setSelectedOption1(modalSelectedOption1);
    setSelectedOption2(modalSelectedOption2);
    setQuantity(modalQuantity);
    setShowVariantModal(false);
  };

  // Handlers
  const handleAddToCart = () => {
    openVariantModal('cart');
  };

  const handleBuyNow = () => {
    openVariantModal('buy');
  };

  const handleShare = async () => {
    await Share.share({ message: `Check out ${product.name} on BazaarX! ₱${product.price}` });
  };

  const handleMenuAction = (action: string) => {
    setShowMenu(false);
    switch (action) {
      case 'share':
        handleShare();
        break;
      case 'wishlist':
        handleWishlistAction();
        break;
      case 'report':
        Alert.alert(
          'Report Product',
          'Why are you reporting this product?',
          [
            { text: 'Inappropriate content', onPress: () => Alert.alert('Thank you', 'Your report has been submitted.') },
            { text: 'Counterfeit/Fake', onPress: () => Alert.alert('Thank you', 'Your report has been submitted.') },
            { text: 'Misleading information', onPress: () => Alert.alert('Thank you', 'Your report has been submitted.') },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        break;
      case 'store':
        handleVisitStore();
        break;
    }
  };

  const handleChat = () => {
    if (isGuest) {
      setGuestModalMessage("Sign up to chat with sellers.");
      setShowGuestModal(true);
      return;
    }
    setShowChat(true);
  };

  const handleVisitStore = () => {
    const sellerId = product.seller_id || product.sellerId;
    if (!sellerId) {
      Alert.alert('Store Unavailable', 'Store information is not available for this product.');
      return;
    }
    navigation.push('StoreDetail', {
      store: {
        id: sellerId,
        name: product.seller || 'Store',
        image: product.seller_avatar || product.sellerAvatar || null,
        rating: product.sellerRating || 0,
        verified: product.sellerVerified || false,
      }
    });
  };

  const handleWishlistAction = (categoryId?: string) => {
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFE5CC" />

      {/* --- HEADER (Matches Screenshot) --- */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: '#FFE5CC' }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
          <ArrowLeft size={24} color="#1F2937" />
        </Pressable>

        <View style={styles.searchContainer}>
          <Pressable style={styles.headerSearchBar} onPress={() => setIsSearchFocused(true)}>
            <Search size={18} color="#6B7280" />
            <Text style={styles.headerSearchText}>Search items...</Text>
            <Camera size={18} color="#6B7280" />
          </Pressable>

          <Pressable style={styles.filterButton} onPress={() => { /* Filter Action */ }}>
            <SlidersHorizontal size={20} color="#1F2937" />
          </Pressable>
        </View>

        <View style={styles.headerRight}>
          <Pressable onPress={() => navigation.navigate('MainTabs', { screen: 'Cart' })} style={styles.iconButton}>
            <ShoppingCart size={24} color="#1F2937" />
            {cartItemCount > 0 && (
              <View style={[styles.badge, { backgroundColor: BRAND_COLOR }]}>
                <Text style={[styles.badgeText, { color: '#FFF' }]}>{cartItemCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        
        {/* --- BACK BUTTON & NAV --- */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
          <Pressable onPress={() => navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={22} color="#78350F" />
          </Pressable>
        </View>

        {/* --- TITLE & RATINGS (Moved Top) --- */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={styles.productName}>{product.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
            <View style={{ flexDirection: 'row', gap: 2, marginRight: 8 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={15} color="#FBBF24" fill="#FBBF24" />
              ))}
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1F2937' }}>4.8</Text>
            <Text style={{ fontSize: 13, color: '#9CA3AF', marginHorizontal: 8 }}>|</Text>
            <Text style={{ fontSize: 13, color: '#6B7280' }}>2.3k Reviews</Text>
            <Text style={{ fontSize: 13, color: '#9CA3AF', marginHorizontal: 8 }}>|</Text>
            <Text style={{ fontSize: 13, color: '#6B7280' }}>5.8k Sold</Text>
          </View>
        </View>

        {/* --- IMAGE CAROUSEL --- */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const contentOffsetX = e.nativeEvent.contentOffset.x;
              const index = Math.round(contentOffsetX / (width - 32 || 1));
              setCurrentImageIndex(index);
            }}
            scrollEventThrottle={16}
          >
            {productImages.filter((img): img is string => img !== undefined).map((img: string, index: number) => (
              <Image key={index} source={{ uri: img }} style={styles.productImage} />
            ))}
          </ScrollView>
          <View style={styles.pageIndicator}>
             <Text style={styles.pageText}>{currentImageIndex + 1}/{productImages.length}</Text>
          </View>
        </View>

        <View style={{ padding: 16 }}>
          {/* Price & Heart */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <View style={styles.priceRow}>
              <Text style={styles.currentPrice}>₱{(product.price ?? 0).toLocaleString()}</Text>
            </View>
            <Pressable onPress={() => handleWishlistAction()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={24} color="#FB8C00" strokeWidth={1.5} fill={isFavorite ? "#FB8C00" : "transparent"} />
            </Pressable>
          </View>

          <Text style={{ fontSize: 15, color: '#4B5563', lineHeight: 24, marginBottom: 15 }}>
            {product.description || "High-quality wireless earbuds with touch controls and a charging case. Great sound and long battery life."}
          </Text>

          <View style={{ backgroundColor: '#FFF7ED', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#FB8C00' }}>Free Shipping</Text>
          </View>

          {/* --- SELECTION SUMMARY (Opens Modal) --- */}
          <Pressable
            style={styles.selectionSummaryRow}
            onPress={() => openVariantModal('cart')}
          >
            <View style={styles.selectionHeader}>
              <Text style={styles.selectionLabel}>Selection</Text>
              <Text style={styles.selectionValue} numberOfLines={1}>
                {selectedOption1 || ''}{selectedOption1 && selectedOption2 ? ', ' : ''}{selectedOption2 || ''}
                {(selectedOption1 || selectedOption2) ? ` • Qty: ${quantity}` : `Qty: ${quantity}`}
              </Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </Pressable>
        </View>

          <View style={styles.quantityRow}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#1F2937' }}>Quantity</Text>
            <View style={styles.qtyPill}>
              <Pressable 
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
              >
                <Minus size={22} color="#FB8C00" />
              </Pressable>
              <Text style={styles.qtyValue}>{quantity}</Text>
              <Pressable 
                onPress={() => {
                  if (quantity < (selectedVariantInfo.stock || 0)) {
                    setQuantity(quantity + 1);
                  } else {
                    Alert.alert('Limit Reached', `Only ${selectedVariantInfo.stock} items available.`);
                  }
                }}
                style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
              >
                <Plus size={22} color="#FB8C00" />
              </Pressable>
            </View>
          </View>
          <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 5, textAlign: 'right' }}>{selectedVariantInfo.stock} In Stock</Text>
        </View>

        {/* --- RATINGS SECTION --- */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
          {isLoadingReviews ? (
              <ActivityIndicator size="small" color="#FB8C00" style={{ marginVertical: 20 }} />
          ) : reviews.length > 0 ? (
            <>
              <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 15 }}>
                {averageRating || 4.8} out of 5 stars ({reviewsTotal} Reviews)
              </Text>
              {reviews.slice(0, 3).map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <Image
                    source={{ uri: review.buyer?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' }}
                    style={styles.reviewerAvatar}
                  />
                  <View style={styles.reviewContent}>
                    <Text style={styles.reviewerName}>{review.buyer?.full_name || 'Anonymous Buyer'}</Text>
                    <View style={styles.reviewRatingRow}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={10} color={i < review.rating ? '#FBBF24' : '#E5E7EB'} fill={i < review.rating ? '#FBBF24' : '#E5E7EB'} />
                      ))}
                    </View>
                    <Text style={styles.reviewText}>{review.comment}</Text>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <Text style={{ color: '#9CA3AF', marginVertical: 10 }}>No reviews yet</Text>
          )}
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

      {/* --- BOTTOM ACTIONS (SOLID ORANGE) --- */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          style={styles.aiActionBtn}
          onPress={() => {
            navigation.navigate('AIChat', {
              product: {
                id: product.id,
                name: product.name || 'Product',
                description: product.description || '',
                price: modalVariantInfo.price || product.price || 0,
                originalPrice: product.original_price ?? product.originalPrice,
                category: product.category,
                brand: product.brand ?? undefined,
                colors: productColors,
                sizes: productSizes,
                variants: hasStructuredVariants ? productVariants.map((v: any) => ({
                  size: v.option_2_value || v.size,
                  color: v.option_1_value || v.color,
                  stock: v.stock,
                  price: v.price,
                })) : undefined,
                specifications: product.specifications,
                stock: modalVariantInfo.stock || product.stock || 0,
                lowStockThreshold: product.low_stock_threshold,
                rating: averageRating || product.rating,
                reviewCount: reviewsTotal,
                salesCount: product.sales_count,
                images: productImages.filter((img): img is string => !!img),
                isFreeShipping: product.is_free_shipping || product.isFreeShipping,
                weight: product.weight ?? undefined,
                dimensions: product.dimensions ?? undefined,
                tags: product.tags,
                isActive: product.is_active,
                approvalStatus: product.approval_status,
              },
              store: {
                id: product.seller_id || product.sellerId || '',
                store_name: product.seller || 'Store',
                rating: product.sellerRating,
              }
            });
          }}
        >
          <Bot size={25} color={BRAND_COLOR} />
          <Text style={styles.aiActionText}>BazBot</Text>
        </Pressable>

        <Pressable style={styles.addToCartBtn} onPress={handleAddToCart}>
          <ShoppingCart size={20} color="#FFF" style={{ marginRight: 8 }} />
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
        onRequestClose={() => setShowVariantModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowVariantModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={[styles.variantModal, { paddingBottom: insets.bottom + 20 }]}>
                {/* Modal Header */}
                <View style={styles.variantModalHeader}>
                  <Image
                    source={{ uri: modalVariantInfo.image || productImages[0] }}
                    style={styles.variantModalImage}
                  />
                  <View style={styles.variantModalInfo}>
                    <Text style={styles.variantModalPrice}>₱{(modalVariantInfo.price ?? 0).toLocaleString()}</Text>
                    <Text style={[
                      styles.variantModalStock,
                      { color: (modalVariantInfo.stock || 0) <= 5 ? '#F97316' : (modalVariantInfo.stock || 0) === 0 ? '#EF4444' : '#10B981' }
                    ]}>
                      {(modalVariantInfo.stock || 0) === 0 ? 'Out of Stock' : `Stock: ${modalVariantInfo.stock || 0}`}
                    </Text>
                    <Text style={styles.variantModalSelected}>
                      {[modalSelectedColor, modalSelectedSize].filter(Boolean).join(', ') || 'Select options'}
                    </Text>
                  </View>
                  <Pressable style={styles.variantModalClosing} onPress={() => setShowVariantModal(false)}>
                    <X size={22} color="#9CA3AF" />
                  </Pressable>
                </View>

                <ScrollView style={styles.variantModalContent} showsVerticalScrollIndicator={false}>
                  {/* Option 1 Selection (Dynamic - e.g., Color, Material) */}
                  {hasOption1 && (
                    <View style={styles.variantModalSection}>
                      <Text style={styles.variantModalLabel}>{variantLabel1}</Text>
                      <View style={styles.variantModalOptions}>
                        {option1Values.filter((c: string) => c.trim() !== '').map((value: string, index: number) => (
                          <Pressable
                            key={`modal-option1-${value}-${index}`}
                            style={[
                              styles.variantModalColorOption,
                              { backgroundColor: variantLabel1.toLowerCase() === 'color' ? getColorHex(value) : '#F3F4F6' },
                              modalSelectedOption1 === value && styles.variantModalColorSelected,
                            ]}
                            onPress={() => setModalSelectedOption1(value)}
                          >
                            <Image
                              source={{ uri: productImages[0] || product.image }}
                              style={styles.variantModalOptionImage}
                            />
                            <Text style={[styles.variantModalOptionText, modalSelectedOption1 === value && { color: BRAND_COLOR }]}>{value}</Text>
                          </Pressable>
                        ))}
                      </View>
                      {variantLabel1.toLowerCase() === 'color' && (
                        <Text style={styles.variantModalSelectedText}>{modalSelectedOption1}</Text>
                      )}
                    </View>
                  )}

                  {/* Option 2 Selection (Dynamic - e.g., Size, Style) */}
                  {hasOption2 && (
                    <View style={styles.variantModalSection}>
                      <Text style={styles.variantModalLabel}>{variantLabel2}</Text>
                      <View style={styles.variantModalSizeOptions}>
                        {option2Values.filter((s: string) => s.trim() !== '').map((value: string, index: number) => (
                          <Pressable
                            key={`modal-option2-${value}-${index}`}
                            style={[
                              styles.variantModalSizeOption,
                              modalSelectedOption2 === value && styles.variantModalSizeSelected,
                            ]}
                            onPress={() => setModalSelectedOption2(value)}
                          >
                            <Text style={[
                              styles.variantModalSizeText,
                              modalSelectedOption2 === value && styles.variantModalSizeTextSelected,
                            ]}>{value}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Quantity Selection */}
                  <View style={styles.variantModalSection}>
                    <View style={styles.variantModalQuantityRow}>
                      <Text style={styles.variantModalLabel}>Quantity</Text>
                      <View style={styles.variantModalStepper}>
                        <Pressable
                          style={styles.variantModalQtyBtn}
                          onPress={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                        >
                          <Minus size={18} color="#6B7280" />
                        </Pressable>
                        <TextInput
                          style={styles.variantModalQtyValue}
                          value={modalQuantity.toString()}
                          keyboardType="number-pad"
                          onChangeText={(val) => {
                            const num = parseInt(val) || 1;
                            setModalQuantity(num);
                          }}
                        />
                        <Pressable
                          style={styles.variantModalQtyBtn}
                          onPress={() => {
                            if (modalQuantity < (modalVariantInfo.stock || 99)) {
                              setModalQuantity(modalQuantity + 1);
                            }
                          }}
                        >
                          <Plus size={18} color="#6B7280" />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </ScrollView>

                {/* Confirm Button */}
                <Pressable
                  style={[
                    styles.variantModalConfirmBtn,
                    // Disable button if required variants not selected
                    ((hasOption1 && !modalSelectedOption1) || (hasOption2 && !modalSelectedOption2)) && styles.variantModalConfirmBtnDisabled
                  ]}
                  onPress={handleVariantModalConfirm}
                  disabled={(hasOption1 && !modalSelectedOption1) || (hasOption2 && !modalSelectedOption2)}
                >
                  <Text style={[
                    styles.variantModalConfirmText,
                    ((hasOption1 && !modalSelectedOption1) || (hasOption2 && !modalSelectedOption2)) && styles.variantModalConfirmTextDisabled
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
        sellerId={product.seller_id || product.sellerId}
      />

      {showGuestModal && (
        <GuestLoginModal
          visible={showGuestModal}
          message={guestModalMessage}
          onClose={() => setShowGuestModal(false)}
        />
      )}

      {/* Product Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
          <View style={styles.menuOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.menuContainer}>
                <Pressable style={styles.menuItem} onPress={() => handleMenuAction('share')}>
                  <Share2 size={20} color="#374151" />
                  <Text style={styles.menuItemText}>Share Product</Text>
                </Pressable>
                <Pressable style={styles.menuItem} onPress={() => handleMenuAction('wishlist')}>
                  <Heart size={20} color="#374151" />
                  <Text style={styles.menuItemText}>{isFavorite ? 'Remove from Wishlist' : 'Add to Wishlist'}</Text>
                </Pressable>
                <Pressable style={styles.menuItem} onPress={() => handleMenuAction('store')}>
                  <MapPin size={20} color="#374151" />
                  <Text style={styles.menuItemText}>Visit Store</Text>
                </Pressable>
                <View style={styles.menuDivider} />
                <Pressable style={styles.menuItem} onPress={() => handleMenuAction('report')}>
                  <X size={20} color="#EF4444" />
                  <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Report Product</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Added to Cart Success Modal */}
      <AddedToCartModal
        visible={showAddedToCartModal}
        onClose={() => setShowAddedToCartModal(false)}
        productName={addedProductInfo.name}
        productImage={addedProductInfo.image}
      />

      {/* AI Chat Modal Removed - Now uses separate screen */}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  headerSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  headerSearchText: { flex: 1, color: '#9CA3AF', fontSize: 14 },
  filterButton: {
    padding: 2,
  },
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
    backgroundColor: '#FF8A00',
    borderRadius: 10, width: 16, height: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: BRAND_COLOR, fontSize: 11, fontWeight: 'bold' },

  // Image Area
  imageContainer: {
    width: width - 32,
    height: width - 32,
    marginHorizontal: 16,
    borderRadius: 30, // Increased radius
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
    marginTop: 10
  },
  productImage: { width: width - 32, height: width - 32, resizeMode: 'cover' },
  pageIndicator: {
    position: 'absolute', top: 16, left: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
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
    padding: 16,
    zIndex: 2,
    marginBottom: -12,
  },
  tagRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  tagText: { fontSize: 13, fontWeight: '700' },
  productName: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4, lineHeight: 26 },
  subInfo: { fontSize: 13, color: '#6B7280', marginBottom: 10 },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8 },
  currentPrice: { fontSize: 30, fontWeight: '900', color: BRAND_COLOR },
  originalPrice: { fontSize: 17, color: '#9CA3AF', textDecorationLine: 'line-through' },

  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stockText: { fontSize: 13, color: '#10B981', fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingValue: { fontSize: 14, fontWeight: '600', color: '#111827', marginLeft: 4 },
  questionsLink: { fontSize: 13, color: BRAND_COLOR, fontWeight: '600', marginLeft: 'auto' },

  // Selectors
  selectionSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  selectionHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectionLabel: {
    fontSize: 14,
    color: '#6B7280',
    minWidth: 70,
  },
  selectionValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  section: { backgroundColor: '#FFF', padding: 16, marginBottom: 8 },
  sectionMerged: { backgroundColor: '#FFF', paddingHorizontal: 16, marginBottom: 8, paddingTop: 0 }, // Added paddingTop: 0
  quantityRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12,
    marginTop: 10
  },
  qtyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBF0',
    borderRadius: 30, // More rounded
    borderWidth: 1,
    borderColor: '#FFE0B2',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  qtyValue: { fontSize: 18, fontWeight: '700', color: '#431407', paddingHorizontal: 20 },

  // Seller Info
  sellerSection: { backgroundColor: '#FFF', padding: 12, marginBottom: 8, marginHorizontal: 16, borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  sellerSectionMerged: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8 },
  sellerHeader: { flexDirection: 'row', alignItems: 'center' },
  sellerAvatarContainer: {
    width: 48, height: 48, borderRadius: 24, overflow: 'hidden', marginRight: 12,
    borderWidth: 1, borderColor: '#F3F4F6'
  },
  sellerAvatar: { width: '100%', height: '100%' },
  sellerInfo: { flex: 1, justifyContent: 'center' },
  sellerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  sellerName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sellerMetaRow: { flexDirection: 'row', alignItems: 'center' },
  sellerMetaText: { fontSize: 13, color: '#6B7280' },
  sellerMetaDivider: { width: 1, height: 10, backgroundColor: '#E5E7EB', marginHorizontal: 8 },
  sellerRating: { flexDirection: 'row', alignItems: 'center', gap: 4 }, // Kept for reference but not used in new layout directly

  visitStoreBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: BRAND_COLOR
  },
  visitStoreText: { fontSize: 12, fontWeight: '600', color: BRAND_COLOR },

  benefitsRow: { flexDirection: 'row', gap: 12, marginTop: 12 }, // Moved benefits out of header if needed, but removed from JSX for now

  // Tabs
  tabContainer: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingTop: 16, marginBottom: 8 },
  tabHeader: { flexDirection: 'row', gap: 24, marginBottom: 16 },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  activeTabBtn: { backgroundColor: BRAND_COLOR },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  activeTabText: { color: '#FFF' },
  tabContent: { paddingBottom: 16 },
  reviewSummary: { fontSize: 15, color: '#374151', marginBottom: 4 },
  textContent: { fontSize: 15, color: '#374151', lineHeight: 20 },

  // Reviews
  reviewCard: { flexDirection: 'row', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 16 },
  reviewerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  reviewContent: { flex: 1 },
  reviewerName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  reviewRatingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 2 },
  reviewDate: { fontSize: 12, color: '#9CA3AF' },
  reviewText: { fontSize: 14, color: '#4B5563', lineHeight: 20 },

  // Recommendations
  recommendations: { paddingHorizontal: 20, paddingTop: 16 },
  sectionTitle: { fontSize: 19, fontWeight: '900', color: '#B45309', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: (width - 48) / 2, marginBottom: 12 },

  // Bottom Bar
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6', // Lighter border
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  aiActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 6,
  },
  aiActionText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '600',
  },
  chatSellerBtn: {
    height: 50, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center',
    borderRadius: 15, backgroundColor: '#FB8C00', // Solid Orange
  },
  chatSellerText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  addToCartBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: BRAND_COLOR,
    backgroundColor: '#FFF',
  },
  addToCartText: { color: BRAND_COLOR, fontSize: 14, fontWeight: '700' },
  buyNowBtn: {
    flex: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 8,
    backgroundColor: BRAND_COLOR,
  },
  buyNowText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

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
  optionText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
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
  variantModalClosing: {
    padding: 4,
  },
  variantModalPrice: {
    fontSize: 23,
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
  variantModalSection: {
    paddingTop: 16,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  variantModalContent: {
    maxHeight: 500,
    paddingBottom: 20,
  },
  variantModalLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  variantModalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  variantModalColorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    paddingRight: 12,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 8,
  },
  variantModalColorSelected: {
    borderColor: BRAND_COLOR,
    backgroundColor: '#FFF7ED',
  },
  variantModalOptionImage: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  variantModalOptionText: {
    fontSize: 13,
    color: '#1F2937',
  },
  variantModalSelectedText: {
    fontSize: 12,
    color: BRAND_COLOR,
    marginTop: 8,
  },
  variantModalSizeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  variantModalSizeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  variantModalSizeSelected: {
    borderColor: BRAND_COLOR,
    backgroundColor: '#FFF7ED',
  },
  variantModalSizeText: {
    fontSize: 13,
    color: '#1F2937',
  },
  variantModalSizeTextSelected: {
    color: BRAND_COLOR,
  },
  variantModalQuantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  variantModalStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  variantModalQtyBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  variantModalQtyValue: {
    width: 44,
    height: 32,
    fontSize: 14,
    textAlign: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E5E7EB',
    color: '#1F2937',
    padding: 0,
  },
  variantModalConfirmBtn: {
    height: 50,
    backgroundColor: BRAND_COLOR,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 2,
  },
  variantModalConfirmBtnDisabled: {
    backgroundColor: '#FED7AA',
  },
  variantModalConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  variantModalConfirmTextDisabled: {
    color: 'rgba(255,255,255,0.7)',
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
  // Menu Modal Styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 16,
  },
  menuContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
});

