import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
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
  Linking,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
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
  ChevronDown,
  Bookmark, // For Wishlist categories
  PlusCircle,
  Gift,
  Edit3,
  MapPin, // Added for seller location
  User, // Added missing import
  Filter, // For Filter icon
  ImageIcon, // For Image filter icon
  CheckCircle,
  ThumbsUp,
  Shield,
  Calendar,
  Phone,
  Mail,
  FileText,
} from 'lucide-react-native';
import { ProductCard, MasonryProductCard } from '../src/components/ProductCard';
import { VariantSelectionModal } from '../src/components/VariantSelectionModal';
import CameraSearchModal from '../src/components/CameraSearchModal';
import { chatService } from '../src/services/chatService';
import { AIChatBubble } from '../src/components/AIChatBubble';
import { AddedToCartModal } from '../src/components/AddedToCartModal';
import { QuantityStepper } from '../src/components/QuantityStepper';
import { AddToRegistryModal } from '../src/components/AddToRegistryModal';
import { useCartStore } from '../src/stores/cartStore';
import { useWishlistStore } from '../src/stores/wishlistStore';
// trendingProducts removed — related products are now fetched from Supabase by category
import { COLORS } from '../src/constants/theme';
import { useAuthStore } from '../src/stores/authStore';
import { GuestLoginModal } from '../src/components/GuestLoginModal';
import { reviewService, type ReviewFeedItem } from '../src/services/reviewService';
import { productService } from '../src/services/productService';
import { sellerService } from '../src/services/sellerService';
import { discountService } from '../src/services/discountService';
import { ActiveDiscount } from '../src/types/discount';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

const { width } = Dimensions.get('window');
const BRAND_COLOR = COLORS.primary;
const BRAND_ACCENT = '#E58C1A'; // mid amber accent matching web app

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

const OCCASIONS = [
  { id: 'wedding', label: 'Wedding', icon: 'Gift' },
  { id: 'baby_shower', label: 'Baby Shower', icon: 'Baby' },
  { id: 'birthday', label: 'Birthday', icon: 'Cake' },
  { id: 'graduation', label: 'Graduation', icon: 'GraduationCap' },
  { id: 'housewarming', label: 'Housewarming', icon: 'Home' },
  { id: 'christmas', label: 'Christmas', icon: 'Tree' },
  { id: 'other', label: 'Other', icon: 'MoreHorizontal' },
];

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

// Create animated components
const AnimatedText = Animated.createAnimatedComponent(Text);

export default function ProductDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { product: initialProduct } = route.params;
  const [product, setProduct] = useState(initialProduct);
  const { user, isGuest } = useAuthStore();

  // State
  const [activeTab, setActiveTab] = useState<'details' | 'support' | 'ratings'>('details');

  // Fetch full product details if variants are missing
  useEffect(() => {
    const fetchFullProduct = async () => {
      // Re-fetch only if we don't have variants or structured variants but id exists
      if (product.id && (!product.variants || product.variants.length === 0)) {
        try {
          const fullProduct = await productService.getProductById(product.id);
          if (fullProduct) {
            setProduct(fullProduct as any);
          }

        } catch (error) {
          console.error('[ProductDetail] Error fetching full product:', error);
        }
      }
    };
    fetchFullProduct();
  }, [product.id]);

  const [activeCampaignDiscount, setActiveCampaignDiscount] = useState<ActiveDiscount | null>(null);

  useEffect(() => {
    const loadDiscount = async () => {
      if (product.id) {
        try {
          // First check if the product already has campaign discount info (e.g., from flash sale)
          if ((product as any).activeCampaignDiscount) {
            setActiveCampaignDiscount((product as any).activeCampaignDiscount);
            return;
          }
          // Otherwise fetch from database (regular campaigns)
          const discount = await discountService.getActiveProductDiscount(product.id);
          setActiveCampaignDiscount(discount);
        } catch (e) {
          console.error('[ProductDetail] Error fetching discount:', e);
        }
      }
    };
    loadDiscount();
  }, [product.id, product]);

  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);

  // Warranty Info State
  const [warrantyInfo, setWarrantyInfo] = useState<{
    hasWarranty: boolean;
    warrantyType: string | null;
    warrantyDurationMonths: number | null;
    warrantyProviderName: string | null;
    warrantyProviderContact: string | null;
    warrantyProviderEmail: string | null;
    warrantyTermsUrl: string | null;
    warrantyPolicy: string | null;
  } | null>(null);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);

  useEffect(() => {
    const loadWarrantyInfo = async () => {
      if (product.id) {
        try {
          // Extract warranty info from product data
          const hasWarranty = product.has_warranty || product.hasWarranty || false;
          if (hasWarranty) {
            setWarrantyInfo({
              hasWarranty,
              warrantyType: product.warranty_type || product.warrantyType || null,
              warrantyDurationMonths: product.warranty_duration_months || product.warrantyDurationMonths || null,
              warrantyProviderName: product.warranty_provider_name || product.warrantyProviderName || null,
              warrantyProviderContact: product.warranty_provider_contact || product.warrantyProviderContact || null,
              warrantyProviderEmail: product.warranty_provider_email || product.warrantyProviderEmail || null,
              warrantyTermsUrl: product.warranty_terms_url || product.warrantyTermsUrl || null,
              warrantyPolicy: product.warranty_policy || product.warrantyPolicy || null,
            });
          }
        } catch (e) {
          console.error('[ProductDetail] Error loading warranty info:', e);
        }
      }
    };
    loadWarrantyInfo();
  }, [product.id]);

  useEffect(() => {
    const fetchRelated = async () => {
      const categoryId = (product as any).category_id;
      if (!categoryId) return;
      try {
        const results = await productService.getProducts({ categoryId, limit: 5 });
        const normalized = results
          .filter((p: any) => p.id !== product.id)
          .slice(0, 4)
          .map((p: any) => ({
            ...p,
            image:
              p.primary_image ||
              p.primary_image_url ||
              (Array.isArray(p.images) && p.images.length > 0 && typeof p.images[0] === 'string'
                ? p.images[0]
                : '') ||
              '',
            seller:
              typeof p.seller === 'object'
                ? p.seller?.store_name || 'Verified Seller'
                : p.seller || 'Verified Seller',
          }));
        setRelatedProducts(normalized);
      } catch {
        // related products are optional
      }
    };
    fetchRelated();
  }, [(product as any).category_id]);

  // Structured variants from product_variants table
  const productVariants = product.variants || [];
  const hasStructuredVariants = productVariants.length > 0;

  // ─── Refined Variant Logic (Align with Web) ───

  const dedupe = (opts: any) => {
    if (!Array.isArray(opts)) return [];
    const seen = new Set();
    return opts.reduce((acc: string[], curr: any) => {
      if (curr && typeof curr === 'string' && curr.trim() !== '') {
        const normalized = curr.trim().toLowerCase();
        if (!seen.has(normalized)) {
          seen.add(normalized);
          acc.push(curr.trim());
        }
      }
      return acc;
    }, []);
  };

  // Extract raw values from variants
  const rawValues1 = hasStructuredVariants
    ? [...new Set(productVariants.map((v: any) => v.option_1_value || v.size).filter(Boolean))]
    : (product.option1Values || product.colors || []);
  const rawValues2 = hasStructuredVariants
    ? [...new Set(productVariants.map((v: any) => v.option_2_value || v.color).filter(Boolean))]
    : (product.option2Values || product.sizes || []);

  const deduped1 = dedupe(rawValues1);
  const deduped2 = dedupe(rawValues2);

  const option1Values = deduped1;
  const option2Values = deduped2;
  const dbLabel1 = (product.variant_label_1 as string | undefined)?.trim();
  const dbLabel2 = (product.variant_label_2 as string | undefined)?.trim();
  const hasLegacySizeAxis1 = hasStructuredVariants && productVariants.some((v: any) => !v.option_1_value && !!v.size);
  const hasLegacyColorAxis2 = hasStructuredVariants && productVariants.some((v: any) => !v.option_2_value && !!v.color);
  const variantLabel1 = option1Values.length > 0 ? (dbLabel1 || (hasLegacySizeAxis1 ? 'Size' : 'Option 1')) : undefined;
  const variantLabel2 = option2Values.length > 0 ? (dbLabel2 || (hasLegacyColorAxis2 ? 'Color' : 'Option 2')) : undefined;

  // Check if axis 1 and 2 are effectively identical (redundant case often seen in vinyls/posters)
  const isRedundant = useMemo(() => {
    if (option1Values.length === 0 || option2Values.length === 0) return false;
    if (option1Values.length !== option2Values.length) return false;
    const s1 = [...option1Values].sort().join('|').toLowerCase();
    const s2 = [...option2Values].sort().join('|').toLowerCase();
    return s1 === s2;
  }, [option1Values, option2Values]);

  // If redundant, we suppress the second axis
  const hasOption1 = option1Values.length > 0;
  const hasOption2 = option2Values.length > 0 && !isRedundant;

  const finalVariantLabel1 = variantLabel1 || 'Select';
  const finalVariantLabel2 = variantLabel2 || 'Select';

  const hasVariants = hasOption1 || hasOption2;

  // Legacy aliases for compatibility (e.g. AIChatBubble)
  const productColors = option1Values;
  const productSizes = option2Values;

  // Variant selections
  const [selectedOption1, setSelectedOption1] = useState(hasOption1 ? option1Values[0] : null);
  const [selectedOption2, setSelectedOption2] = useState(hasOption2 ? option2Values[0] : null);

  // Sync state if options change (e.g. after re-fetch)
  useEffect(() => {
    if (hasOption1 && !selectedOption1) setSelectedOption1(option1Values[0]);
    if (hasOption2 && !selectedOption2) setSelectedOption2(option2Values[0]);
  }, [option1Values, option2Values]);
  // Legacy aliases
  const selectedColor = selectedOption1;
  const selectedSize = selectedOption2;
  const setSelectedColor = setSelectedOption1;
  const setSelectedSize = setSelectedOption2;
  const [quantity, setQuantity] = useState(1);

  const handleSelectOption1 = (value: string) => {
    if (selectedOption1 !== value) {
      setSelectedOption1(value);
    }
  };

  const handleSelectOption2 = (value: string) => {
    if (selectedOption2 !== value) {
      setSelectedOption2(value);
    }
  };
  const [showCameraSearch, setShowCameraSearch] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestModalMessage, setGuestModalMessage] = useState('');
  const [isFollowingSeller, setIsFollowingSeller] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

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
  const [showVariantFilterModal, setShowVariantFilterModal] = useState(false); // Filter dropdown state
  const [showSizeGuideModal, setShowSizeGuideModal] = useState(false); // Size guide modal state

  // Match a variant row against our (possibly swapped) option1/option2 selections
  const matchVariant = (v: any, op1: string | null, op2: string | null) => {
    const n = (val: any) => String(val || '').trim().toLowerCase();
    const dbAxis1 = n(v.option_1_value || v.size);
    const dbAxis2 = n(v.option_2_value || v.color);
    const op1Match = !op1 || dbAxis1 === n(op1);
    const op2Match = !op2 || dbAxis2 === n(op2);
    return op1Match && op2Match;
  };

  // Computed modal variant price, stock, and image
  const modalVariantInfo = useMemo(() => {
    if (!hasStructuredVariants) {
      return { price: product.price, stock: product.stock, image: null };
    }
    const matchedVariant = productVariants.find((v: any) => matchVariant(v, modalSelectedOption1, modalSelectedOption2));
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
    const matchedVariant = productVariants.find((v: any) => matchVariant(v, selectedOption1, selectedOption2));
    return {
      price: matchedVariant?.price ?? product.price,
      stock: matchedVariant?.stock ?? product.stock,
      variantId: matchedVariant?.id,
      image: matchedVariant?.thumbnail_url || matchedVariant?.image || null,
    };
  }, [hasStructuredVariants, productVariants, selectedOption1, selectedOption2, product.price, product.stock]);

  useEffect(() => {
    const maxStock = Math.max(1, Number(selectedVariantInfo.stock ?? 1));
    setQuantity((prev) => Math.max(1, Math.min(prev, maxStock)));
  }, [selectedVariantInfo.stock]);

  // Extract seller name robustly (fixes lint errors with mixed object/string types)
  const displayStoreName = useMemo(() => {
    const s = product.seller as any;
    if (typeof s === 'object' && s !== null && s.store_name) {
      return s.store_name;
    }
    return typeof s === 'string' ? s : 'Store';
  }, [product.seller]);

  // Check if seller is restricted (vacation mode, blacklisted, suspended, or rejected)
  const isSellerRestricted = useMemo(() => {
    if ((product as any).isSellerActive === false) return true;
    if ((product as any).is_vacation_mode) return true;
    const seller = (product as any).seller;
    if (typeof seller === 'object' && seller !== null) {
      if (seller.is_permanently_blacklisted) return true;
      if (seller.suspended_at) return true;
      if (seller.approval_status === 'rejected' || seller.approval_status === 'suspended') return true;
    }
    return false;
  }, [product]);

  // Reviews State
  const [reviews, setReviews] = useState<ReviewFeedItem[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [isLoadingMoreReviews, setIsLoadingMoreReviews] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [helpfulReviewIds, setHelpfulReviewIds] = useState<Record<string, boolean>>({});

  // Review Filters
  const [reviewFilters, setReviewFilters] = useState<{ rating?: number; withImages?: boolean }>({});
  const [activeRatingFilter, setActiveRatingFilter] = useState<number | null>(null);
  const [activeImageFilter, setActiveImageFilter] = useState(false);

  // Variant filtering
  const [activeVariantFilter, setActiveVariantFilter] = useState<string | null>(null);

  const toggleRatingFilter = (rating: number | null) => {
    const newRating = rating === null ? null : (activeRatingFilter === rating ? null : rating);
    setActiveRatingFilter(newRating);
    setReviewFilters(prev => ({ ...prev, rating: newRating || undefined }));
  };

  const toggleVariantFilter = (variantId: string | null) => {
    const newVariantId = variantId === null ? null : (activeVariantFilter === variantId ? null : variantId);
    setActiveVariantFilter(newVariantId);
    setReviewFilters(prev => ({ ...prev, variantId: newVariantId || undefined }));
  };

  // Memoized O(1) variant name — avoids .find() scan on productVariants every render
  const activeVariantName = useMemo(() =>
    activeVariantFilter
      ? productVariants.find((v: any) => v.id === activeVariantFilter)?.variant_name || 'Selected Variant'
      : null
    , [activeVariantFilter, productVariants]);

  const toggleImageFilter = () => {
    const newWithImages = !activeImageFilter;
    setActiveImageFilter(newWithImages);
    setReviewFilters(prev => ({ ...prev, withImages: newWithImages || undefined }));
  };

  const effectiveAverageRating = averageRating > 0 ? averageRating : Number(product.rating || 0);
  const effectiveReviewTotal = reviewsTotal > 0
    ? reviewsTotal
    : Number((product as any).reviewCount || (product as any).totalReviews || 0);
  const storedOriginalPrice = (() => {
    const pbPrice = (product as any).original_price ?? (product as any).originalPrice;
    return typeof pbPrice === 'number' ? pbPrice : parseFloat(String(pbPrice || 0));
  })();
  const rawBasePrice: number = (() => {
    if (hasStructuredVariants && selectedVariantInfo.price != null) {
      return Number(selectedVariantInfo.price);
    }
    if (activeCampaignDiscount && storedOriginalPrice > 0) {
      return storedOriginalPrice;
    }
    return Number(product.price ?? 0);
  })();

  // Apply campaign discount on top of the raw price (mirrors web getCampaignAdjustedPrice)
  const getCampaignAdjustedPrice = (rawPrice: number): number => {
    if (!activeCampaignDiscount) return rawPrice;
    return discountService.calculateLineDiscount(rawPrice, 1, activeCampaignDiscount).discountedUnitPrice;
  };

  // regularPrice = what the customer pays for the selected variant
  const regularPrice = getCampaignAdjustedPrice(rawBasePrice);

  // originalPrice = the crossed-out price shown above/beside the sale price
  // If campaign active: rawBasePrice is the "before discount" price
  // If no campaign: use storedOriginalPrice (seller-set compare-at price)
  const originalPrice = activeCampaignDiscount
    ? rawBasePrice
    : storedOriginalPrice;

  const hasDiscount = !!(originalPrice > 0 && regularPrice > 0 && originalPrice > regularPrice);

  // Badge percent: use actual campaign discountValue for percentage campaigns,
  // otherwise derive from price arithmetic (e.g. fixed-amount or stored original_price)
  const discountPercent = hasDiscount
    ? (activeCampaignDiscount?.discountType === 'percentage' && activeCampaignDiscount.discountValue
      ? Math.round(activeCampaignDiscount.discountValue)
      : Math.round(((originalPrice - regularPrice) / originalPrice) * 100))
    : 0;

  const soldCount = Number((product as any).sales_count ?? (product as any).sold ?? 0);

  // Wishlist State
  const [showWishlistModal, setShowWishlistModal] = useState(false);

  // Carousel ref for dynamic scrolling
  const imageCarouselRef = useRef<ScrollView>(null);

  // Menu State
  const [showMenu, setShowMenu] = useState(false);

  // Out of stock pulse animation
  const outOfStockPulse = useRef(new Animated.Value(1)).current;
  const triggerOutOfStockPulse = () => {
    outOfStockPulse.setValue(1);
    Animated.sequence([
      Animated.timing(outOfStockPulse, { toValue: 1.25, duration: 120, useNativeDriver: true }),
      Animated.timing(outOfStockPulse, { toValue: 0.85, duration: 100, useNativeDriver: true }),
      Animated.timing(outOfStockPulse, { toValue: 1.15, duration: 100, useNativeDriver: true }),
      Animated.timing(outOfStockPulse, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  // Memoize product images to avoid sorting + mapping every render
  const productImages: string[] = useMemo(() => {
    const raw = product.images;
    const baseImages = (!raw || !Array.isArray(raw) || raw.length === 0)
      ? (product.image ? [product.image] : [])
      : [...raw].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((img: any) => {
          if (typeof img === 'string') return img;
          return img.image_url || img.url || img.uri || product.image || '';
        }).filter(Boolean) as string[];

    // Include variant-specific images at the end if they aren't already in baseImages
    const variantImages = (productVariants || [])
      .map((v: any) => v.thumbnail_url || v.image)
      .filter(Boolean);

    return Array.from(new Set([...baseImages, ...variantImages]));
  }, [product.images, product.image, productVariants]);

  // Stores
  const addItem = useCartStore((state) => state.addItem);

  // --- NEW: Scroll carousel if variant has a unique image ---
  useEffect(() => {
    if (selectedVariantInfo.image) {
      const imgIndex = productImages.findIndex(img => img === selectedVariantInfo.image);
      if (imgIndex !== -1 && imgIndex !== currentImageIndex) {
        imageCarouselRef.current?.scrollTo({ x: imgIndex * (width - 32), animated: true });
        setCurrentImageIndex(imgIndex);
      }
    }
  }, [selectedVariantInfo.image, productImages]);
  const setQuickOrder = useCartStore((state) => state.setQuickOrder);
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist, categories, createCategory } = useWishlistStore();
  const isFavorite = isInWishlist(product.id);

  // Constants
  const cartItemCount = useCartStore((state) => state.items.length);

  const fetchReviews = async (page = 1, append = false, currentFilters = reviewFilters) => {
    if (!product.id) return;


    if (append) {
      setIsLoadingMoreReviews(true);
    } else {
      setIsLoadingReviews(true);
    }

    try {
      const { reviews: fetchedReviews, total, stats } = await reviewService.getProductReviews(product.id, page, 5, currentFilters);
      const mergedReviews = append
        ? Array.from(new Map([...reviews, ...fetchedReviews].map((review) => [review.id, review])).values())
        : fetchedReviews;

      setReviews(mergedReviews);
      setReviewsTotal(total);
      setAverageRating(stats.averageRating);
      setReviewPage(page);
    } catch (error) {
      console.error('[ProductDetail] Error fetching reviews:', error);
      if (!append) {
        setReviews([]);
        setReviewsTotal(0);
        setAverageRating(0);
      }
    } finally {
      if (append) {
        setIsLoadingMoreReviews(false);
      } else {
        setIsLoadingReviews(false);
      }
    }
  };

  // Fetch reviews from database
  useFocusEffect(
    React.useCallback(() => {
      setReviewPage(1);
      setReviews([]);
      fetchReviews(1, false, reviewFilters);
    }, [product.id, reviewFilters])
  );

  const handleLoadMoreReviews = () => {
    if (isLoadingMoreReviews || reviews.length >= reviewsTotal) {
      return;
    }

    void fetchReviews(reviewPage + 1, true);
  };

  // Build selected variant object with dynamic labels
  const buildSelectedVariant = (option1?: string | null, option2?: string | null) => {
    const variant: any = {};

    const op1 = option1 !== undefined ? option1 : selectedOption1;
    const op2 = option2 !== undefined ? option2 : selectedOption2;

    if (hasOption1 && op1) {
      variant.option1Label = finalVariantLabel1;
      variant.option1Value = op1;
      if (finalVariantLabel1.toLowerCase() === 'color') {
        variant.color = op1;
      }
    }
    if (hasOption2 && op2) {
      variant.option2Label = finalVariantLabel2;
      variant.option2Value = op2;
      if (finalVariantLabel2.toLowerCase() === 'size') {
        variant.size = op2;
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
  const handleVariantModalConfirm = async () => {
    // Validate that required variants are selected
    if (hasOption1 && !modalSelectedOption1) {
      Alert.alert(`Select ${finalVariantLabel1}`, `Please select a ${finalVariantLabel1.toLowerCase()} before continuing`);
      return;
    }

    if (hasOption2 && !modalSelectedOption2) {
      Alert.alert(`Select ${finalVariantLabel2}`, `Please select a ${finalVariantLabel2.toLowerCase()} before continuing`);
      return;
    }

    const selectedVariant = buildSelectedVariant(modalSelectedOption1, modalSelectedOption2);

    // Find matching structured variant to get its price/stock
    let variantPrice = product.price;
    let matchedVariant: any = null;

    if (hasStructuredVariants) {
      matchedVariant = productVariants.find((v: any) => matchVariant(v, modalSelectedOption1, modalSelectedOption2));
      if (matchedVariant?.price) {
        variantPrice = matchedVariant.price;
      }
    }

    if (variantModalAction === 'cart') {
      const addItemResult = await addItem({
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

      if (addItemResult) {
        setTimeout(() => {
          setAddedProductInfo({
            name: `${product.name}${variantText}`,
            image: matchedVariant?.thumbnail_url || productImages[0] || product.image
          });
          setShowAddedToCartModal(true);
        }, 300);
      } else {
        Alert.alert('Unable to Add', useCartStore.getState().error || 'Unable to add item.');
      }
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
    // Animation is handled internally by handleCloseInternal and onClose
  };

  // NEW Handle Confirm from Shared Modal
  const handleSharedModalConfirm = async (
    selectedVariant: {
      option1Value?: string;
      option2Value?: string;
      variantId?: string;
      price?: number;
      stock?: number;
      image?: string | null;
    },
    newQuantity: number
  ) => {
    const variantPrice = selectedVariant.price ?? product.price;
    const variantId = selectedVariant.variantId;

    // Build selected variant object for cart/order
    const variantObj = buildSelectedVariant(selectedVariant.option1Value, selectedVariant.option2Value);

    const discountedPrice = discountService.calculateLineDiscount(variantPrice || 0, 1, activeCampaignDiscount).discountedUnitPrice;

    if (variantModalAction === 'cart') {
      const addItemResult = await addItem({
        ...product,
        originalPrice: variantPrice || 0,
        price: discountedPrice,
        activeCampaignDiscount: activeCampaignDiscount || undefined,
        selectedVariant: {
          ...variantObj,
          variantId,
        },
        quantity: newQuantity
      } as any);

      if (addItemResult) {
        // Show Added Modal after exit animation completes
        setTimeout(() => {
          const variantText = [selectedVariant.option1Value, selectedVariant.option2Value].filter(Boolean).join(', ');
          setAddedProductInfo({
            name: `${product.name}${variantText ? ` (${variantText})` : ''}`,
            image: selectedVariant.image || productImages[0] || product.image || ''
          });
          setShowAddedToCartModal(true);
        }, 300);
      } else {
        Alert.alert('Unable to Add', useCartStore.getState().error || 'Unable to add item.');
      }

    } else {
      setQuickOrder({
        ...product,
        originalPrice: variantPrice || 0,
        price: discountedPrice,
        activeCampaignDiscount: activeCampaignDiscount || undefined,
        selectedVariant: {
          ...variantObj,
          variantId,
        },
      } as any, newQuantity);
      navigation.navigate('Checkout', {});
    }

    // Update main screen selections
    if (selectedVariant.option1Value) setSelectedOption1(selectedVariant.option1Value);
    if (selectedVariant.option2Value) setSelectedOption2(selectedVariant.option2Value);
    setQuantity(newQuantity);
  };

  const handleAddToCart = useCallback(async () => {
    if (hasVariants) {
      openVariantModal('cart');
      return;
    }

    if (isGuest) {
      setGuestModalMessage("Sign up to add items to your cart.");
      setShowGuestModal(true);
      return;
    }

    // Check if seller is restricted
    if (isSellerRestricted) {
      triggerOutOfStockPulse();
      Alert.alert('Store Unavailable', 'This store is temporarily unavailable.');
      return;
    }

    // Build variant info
    const selectedVariant = buildSelectedVariant();

    // Validate quantity against product stock (no variants case)
    if (quantity > (product.stock || 0)) {
      triggerOutOfStockPulse();
      Alert.alert('Insufficient Stock', `Only ${product.stock} items available.`);
      return;
    }

    // Set loading state immediately to show spinner and prevent duplicate clicks
    setIsAddingToCart(true);

    try {
      // Add to cart with discount info embedded so it persists in the cart
      // Use the same regularPrice and originalPrice calculated for display
      const addItemResult = await addItem({
        ...product,
        originalPrice: originalPrice,
        price: regularPrice,
        activeCampaignDiscount: activeCampaignDiscount || undefined,
        selectedVariant,
        quantity
      } as any);

      if (addItemResult) {
        const variantText = selectedVariant
          ? ` (${[selectedVariant.color, selectedVariant.size].filter(Boolean).join(', ')})`
          : '';

        setAddedProductInfo({
          name: `${product.name}${variantText}`,
          image: productImages[0] || product.image || ''
        });
        setShowAddedToCartModal(true);
      } else {
        Alert.alert('Unable to add to cart', useCartStore.getState().error || 'This item is no longer available.');
      }
    } catch (err) {
      console.error('Add to cart failed', err);
      Alert.alert('Unable to add to cart', useCartStore.getState().error || 'This item is no longer available.');
    } finally {
      setIsAddingToCart(false);
    }
  }, [hasVariants, isGuest, product, quantity, activeCampaignDiscount, productImages, addItem, isSellerRestricted]);

  const handleBuyNow = useCallback(() => {
    // Bypass variant modal if variants are already selected
    if (hasVariants) {
      openVariantModal('buy');
      return;
    }

    if (isGuest) {
      setGuestModalMessage("Sign up to buy items.");
      setShowGuestModal(true);
      return;
    }

    // Check if seller is restricted
    if (isSellerRestricted) {
      triggerOutOfStockPulse();
      Alert.alert('Store Unavailable', 'This store is temporarily unavailable.');
      return;
    }

    // Build variant info
    const selectedVariant = buildSelectedVariant(selectedColor, selectedSize);

    const discountedPrice = discountService.calculateLineDiscount(product.price || 0, 1, activeCampaignDiscount).discountedUnitPrice;

    // Set quick order with variant info and discount embedded
    setQuickOrder({
      ...product,
      originalPrice: product.price || 0,
      price: discountedPrice,
      activeCampaignDiscount: activeCampaignDiscount || undefined,
      selectedVariant
    } as any, quantity);
    navigation.navigate('Checkout', {});
  }, [hasVariants, isGuest, product, quantity, activeCampaignDiscount, selectedColor, selectedSize, navigation, setQuickOrder, isSellerRestricted]);

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

  const handleChat = async () => {
    const { isGuest } = useAuthStore.getState();
    if (isGuest) {
      setGuestModalMessage("Sign up to chat with sellers.");
      setShowGuestModal(true);
      return;
    }
    if (chatLoading) return;
    const sellerId = product.seller_id || product.sellerId;
    const buyerId = user?.id;
    if (!sellerId || !buyerId) return;
    setChatLoading(true);
    try {
      const conversation = await chatService.getOrCreateConversation(buyerId, sellerId);
      if (conversation) {
        (navigation as any).navigate('Chat', {
          conversation,
          currentUserId: buyerId,
          userType: 'buyer',
        });
      }
    } catch (error) {
      console.error('[ProductDetail] Error opening chat:', error);
      Alert.alert('Error', 'Could not open chat. Please try again.');
    } finally {
      setChatLoading(false);
    }
  }

  const handleVisitStore = () => {
    const sellerId = product.seller_id || product.sellerId;
    if (!sellerId) {
      Alert.alert('Store Unavailable', 'Store information is not available for this product.');
      return;
    }
    navigation.push('StoreDetail', {
      store: {
        id: sellerId,
        name: displayStoreName,
        image: product.seller_avatar || product.sellerAvatar || null,
        rating: product.sellerRating || 0,
        verified: product.sellerVerified || false,
      }
    });
  };

  // Check follow status on mount
  useEffect(() => {
    const checkFollow = async () => {
      const sellerId = product.seller_id || product.sellerId;
      if (!user || isGuest || !sellerId) return;
      try {
        const following = await sellerService.checkIsFollowing(user.id, sellerId);
        setIsFollowingSeller(following);
      } catch (e) {
        console.error('[PDP] Error checking follow status:', e);
      }
    };
    checkFollow();
  }, [product.seller_id, product.sellerId, user, isGuest]);

  const handleFollowSeller = async () => {
    if (isGuest) {
      setGuestModalMessage('Sign up to follow shops.');
      setShowGuestModal(true);
      return;
    }
    const sellerId = product.seller_id || product.sellerId;
    if (!user || !sellerId) return;
    const prev = isFollowingSeller;
    setIsFollowingSeller(!prev);
    try {
      if (prev) {
        await sellerService.unfollowSeller(user.id, sellerId);
      } else {
        await sellerService.followSeller(user.id, sellerId);
      }
    } catch (e) {
      setIsFollowingSeller(prev);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  const handleWishlistAction = useCallback(() => {
    const { isGuest: guestCheck } = useAuthStore.getState();
    if (guestCheck) {
      setGuestModalMessage("Sign up to create registries.");
      setShowGuestModal(true);
      return;
    }

    // Always open the registry modal so users can add to different folders.
    setShowWishlistModal(true);
  }, [isFavorite, product.id, removeFromWishlist]);

  const handleMarkReviewHelpful = async (reviewId: string) => {
    if (helpfulReviewIds[reviewId]) {
      return;
    }

    if (!user?.id || isGuest) {
      setGuestModalMessage('Sign up to mark reviews as helpful.');
      setShowGuestModal(true);
      return;
    }

    try {
      const result = await reviewService.markReviewHelpful(reviewId, user.id);
      setHelpfulReviewIds((prev) => ({ ...prev, [reviewId]: true }));
      setReviews((prev) =>
        prev.map((review) =>
          review.id === reviewId
            ? {
              ...review,
              helpful_count: result.helpfulCount,
              has_voted_helpful: true,
            }
            : review
        )
      );
    } catch (error) {
      Alert.alert('Error', 'Could not update helpful count. Please try again.');
    }
  };





  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

      {/* --- HEADER SECTION --- */}
      <LinearGradient
        colors={[COLORS.background, COLORS.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          paddingTop: insets.top + 10,
          paddingBottom: 40,
          zIndex: 10,
        }}
      >
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={require('../assets/BazaarX.png')}
              style={{ width: 38, height: 38, marginRight: 6 }}
              contentFit="contain"
            />
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#FB8C00' }}>BazaarX</Text>
          </View>

          <Pressable onPress={() => navigation.navigate('MainTabs', { screen: 'Cart' })} style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingCart size={20} color="#78350F" />
            {cartItemCount > 0 && (
              <View style={[styles.badge, { right: -2, top: -2 }]}>
                <Text style={styles.badgeText}>{cartItemCount > 9 ? '9+' : cartItemCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{
          flex: 1,
          backgroundColor: COLORS.background, // Match theme background
          marginTop: -30, // Overlap the header
          borderTopLeftRadius: 36,
          borderTopRightRadius: 36,
          zIndex: 11,
          elevation: 5,
          // Removed overflow: 'hidden' to allow card shadows
        }}
        contentContainerStyle={{ paddingBottom: 140, paddingTop: 25 }}
      >
        {/* Back Button & Title Area strictly inside Rounded Container */}
        <View style={{ paddingHorizontal: 20, marginBottom: 15 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
            <Pressable onPress={() => navigation.goBack()}>
              <ArrowLeft size={24} color="#78350F" strokeWidth={2.5} />
            </Pressable>
          </View>

          <Text style={[styles.productName, { color: '#431407' }]}>{product.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 2, marginRight: 8 }}>
              {[1, 2, 3, 4, 5].map((s) => {
                const isFilled = s <= Math.round(effectiveAverageRating);
                return (
                  <Star
                    key={s}
                    size={15}
                    color={isFilled ? '#FB8C00' : '#D1D5DB'}
                    fill={isFilled ? '#FB8C00' : 'transparent'}
                  />
                );
              })}
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#B45309' }}>
              {effectiveAverageRating > 0 ? effectiveAverageRating.toFixed(1) : 'No rating'}
              {effectiveReviewTotal > 0 && (
                <Text style={{ fontWeight: '400', color: '#6B7280' }}> ({effectiveReviewTotal.toLocaleString()})</Text>
              )}
            </Text>
          </View>
        </View>

        {/* --- IMAGE CAROUSEL --- */}
        <View style={styles.imageContainer}>
          <ScrollView
            ref={imageCarouselRef}
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
            {productImages.map((img: string, index: number) => (
              <Image key={index} source={{ uri: img }} style={styles.productImage} contentFit="cover" />
            ))}
          </ScrollView>
          <View style={styles.pageIndicator}>
            <Text style={styles.pageText}>{currentImageIndex + 1}/{productImages.length}</Text>
          </View>
        </View>

        <View style={{ padding: 16 }}>
          {/* Price & Heart */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
            <View>
              <View style={styles.priceRow}>
                {hasDiscount ? (
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={[styles.currentPrice, { color: '#DC2626', fontSize: 28 }]}>
                        ₱{regularPrice.toLocaleString()}
                      </Text>
                      <View style={{ backgroundColor: '#DC2626', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }}>
                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '900' }}>{discountPercent}% OFF</Text>
                      </View>
                    </View>
                    {originalPrice > 0 && (
                      <Text style={{ fontSize: 16, color: '#9CA3AF', textDecorationLine: 'line-through', marginTop: 4 }}>
                        ₱{originalPrice.toLocaleString()}
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text style={styles.currentPrice}>₱{regularPrice.toLocaleString()}</Text>
                )}
              </View>
              <AnimatedText style={{
                fontSize: 13,
                marginTop: 4,
                fontWeight: '600',
                color: Number(selectedVariantInfo.stock ?? 0) <= 0 ? '#DC2626' : '#9CA3AF',
                ...(Number(selectedVariantInfo.stock ?? 0) <= 0 ? { transform: [{ scale: outOfStockPulse }] } : {}),
              }}>
                {Number(selectedVariantInfo.stock ?? 0) <= 0 ? 'Out of Stock' : `${selectedVariantInfo.stock} In Stock`}
              </AnimatedText>
            </View>
            <Pressable onPress={() => handleWishlistAction()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Gift size={24} color={BRAND_ACCENT} strokeWidth={1.5} fill={"transparent"} />
            </Pressable>
          </View>

          {/* --- VARIANT SELECTION (Restored/Restyled & Repositioned) --- */}
          {hasOption1 && (
            <View style={styles.variantSection}>
              <Text style={styles.variantLabel}>
                {finalVariantLabel1}: <Text style={styles.variantSelected}>{selectedOption1}</Text>
              </Text>
              <View style={styles.colorOptions}>
                {option1Values.filter((c: string) => c.trim() !== '').map((value: string, index: number) => {
                  const isColor = finalVariantLabel1.toLowerCase() === 'color';
                  const variantImg = isColor
                    ? productVariants.find((v: any) =>
                      v.option_1_value === value
                    )?.thumbnail_url || null
                    : null;
                  const isSelected = selectedOption1 === value;
                  if (isColor) {
                    return (
                      <Pressable
                        key={`${value}-${index}`}
                        style={[styles.variantImgBtn, isSelected && styles.variantImgBtnSelected]}
                        onPress={() => handleSelectOption1(value)}
                      >
                        {variantImg ? (
                          <Image source={{ uri: variantImg }} style={styles.variantImgThumb} contentFit="cover" />
                        ) : (
                          <View style={[styles.variantImgThumb, { backgroundColor: getColorHex(value) }]} />
                        )}
                        {isSelected && (
                          <View style={styles.variantImgCheck}>
                            <CheckCircle size={14} color={BRAND_COLOR} fill="#FFF" />
                          </View>
                        )}
                      </Pressable>
                    );
                  }
                  return (
                    <Pressable
                      key={`${value}-${index}`}
                      style={[styles.sizeOption, isSelected && styles.sizeOptionSelected]}
                      onPress={() => handleSelectOption1(value)}
                    >
                      <Text style={[styles.sizeOptionText, isSelected && styles.sizeOptionTextSelected]}>{value}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {hasOption2 && (
            <View style={styles.variantSection}>
              <Text style={styles.variantLabel}>
                {finalVariantLabel2}: <Text style={styles.variantSelected}>{selectedOption2}</Text>
              </Text>
              <View style={styles.colorOptions}>
                {option2Values.filter((s: string) => s.trim() !== '').map((value: string, index: number) => {
                  const isSelected = selectedOption2 === value;
                  const variantImg = productVariants.find((v: any) =>
                    v.option_2_value === value
                  )?.thumbnail_url || productImages[0] || null;
                  return (
                    <Pressable
                      key={`${value}-${index}`}
                      style={[styles.variantImgBtn, isSelected && styles.variantImgBtnSelected]}
                      onPress={() => handleSelectOption2(value)}
                    >
                      {variantImg ? (
                        <Image source={{ uri: variantImg }} style={styles.variantImgThumb} contentFit="cover" />
                      ) : (
                        <View style={[styles.variantImgThumb, { backgroundColor: '#E5E7EB' }]} />
                      )}
                      {isSelected && (
                        <View style={styles.variantImgCheck}>
                          <CheckCircle size={14} color={BRAND_COLOR} fill="#FFF" />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Size Guide Button — shown if variantLabel1 is "Size" (matches web pattern) */}
          {product.size_guide_image && (
            <View style={{ marginTop: 16 }}>
              <Pressable
                style={styles.sizeGuideButton}
                onPress={() => setShowSizeGuideModal(true)}
              >
                <Ionicons name="shirt-outline" size={20} color={BRAND_COLOR} />
                <Text style={styles.sizeGuideButtonText}>Size Guide</Text>
                <ChevronRight size={16} color={BRAND_COLOR} strokeWidth={2.5} />
              </Pressable>
            </View>
          )}

          <Text style={{ fontSize: 15, color: '#4B5563', lineHeight: 24, marginBottom: 12, marginTop: 20 }}>
            {product.description || "High-quality wireless earbuds with touch controls and a charging case. Great sound and long battery life."}
          </Text>

          {/* --- WARRANTY INFORMATION SECTION (MODAL TRIGGER) --- */}
          {warrantyInfo?.hasWarranty && (
            <Pressable
              style={styles.warrantyTriggerButton}
              onPress={() => setShowWarrantyModal(true)}
            >
              <View style={styles.warrantyTriggerContent}>
                <Shield size={20} color={BRAND_COLOR} />
                <View style={styles.warrantyTriggerText}>
                  <Text style={styles.warrantyTriggerTitle}>Warranty Information</Text>
                  <Text style={styles.warrantyTriggerSubtitle}>
                    {warrantyInfo.warrantyDurationMonths
                      ? `${warrantyInfo.warrantyDurationMonths} Month${warrantyInfo.warrantyDurationMonths > 1 ? 's' : ''} Coverage`
                      : 'Warranty Included'}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={BRAND_COLOR} />
            </Pressable>
          )}
        </View>

        {/* --- SELLER SECTION --- */}
        <View style={styles.sellerSection}>
          <View style={styles.sellerHeader}>
            <Pressable style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 }} onPress={handleVisitStore}>
              <View style={styles.sellerAvatarContainer}>
                <Image
                  source={{ uri: product.seller_avatar || product.sellerAvatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayStoreName) + '&background=FFD89A&color=78350F' }}
                  style={styles.sellerAvatar}
                />
              </View>
              <View style={styles.sellerInfo}>
                <View style={styles.sellerNameRow}>
                  <Text style={styles.sellerName} numberOfLines={1}>{displayStoreName}</Text>
                  {product.sellerVerified && <BadgeCheck size={14} color={COLORS.primary} fill="#FFF" style={{ flexShrink: 0 }} />}
                </View>
                <View style={styles.sellerMetaRow}>
                  <View style={styles.sellerRating}>
                    <Star size={12} color="#FB8C00" fill="#FB8C00" />
                    <Text style={styles.sellerMetaText}>{product.sellerRating || '0.0'}</Text>
                  </View>
                  <View style={styles.sellerMetaDivider} />
                  <Text style={styles.sellerMetaText}>{soldCount.toLocaleString()} items sold</Text>
                </View>
              </View>
            </Pressable>

            <View style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 6 }}>
              <Pressable
                style={[styles.followBtn, isFollowingSeller && styles.followBtnActive]}
                onPress={handleFollowSeller}
              >
                <Heart size={12} color={isFollowingSeller ? '#FFF' : BRAND_COLOR} fill={isFollowingSeller ? '#FFF' : 'none'} />
                <Text style={[styles.followBtnText, isFollowingSeller && styles.followBtnTextActive]}>
                  {isFollowingSeller ? 'Following' : 'Follow'}
                </Text>
              </Pressable>
              <Pressable style={styles.visitStoreBtn} onPress={handleVisitStore}>
                <Text style={styles.visitStoreText}>Visit Store</Text>
                <ChevronRight size={14} color={BRAND_COLOR} strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* --- RATINGS SECTION --- */}
        <View
          style={{ 
            marginTop: 15, 
            marginBottom: 5, 
            paddingVertical: 20, 
            paddingHorizontal: 16 
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: COLORS.primary }}>
                {effectiveAverageRating.toFixed(1)}
              </Text>
              <Star size={20} color="#FBBF24" fill="#FBBF24" />
              <Text style={[styles.sectionTitle, { color: COLORS.textPrimary }]}>Ratings & Reviews</Text>
            </View>
            {reviewsTotal > 2 && (
              <Pressable onPress={() => setActiveTab('ratings')}>
                <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 13 }}>View All</Text>
              </Pressable>
            )}
          </View>

          {/* Review Filters - Wrapped Layout */}
          {/* Added spacing from title */}
          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {/* "All" Rating Filter */}
              <Pressable
                style={[styles.filterChip, activeRatingFilter === null && !activeImageFilter && styles.filterChipActive]}
                onPress={() => {
                  toggleRatingFilter(null);
                  if (activeImageFilter) toggleImageFilter();
                }}
              >
                <Text style={[styles.filterChipText, activeRatingFilter === null && !activeImageFilter && styles.filterChipTextActive]}>All</Text>
              </Pressable>

              <Pressable
                style={[styles.filterChip, activeImageFilter && styles.filterChipActive]}
                onPress={toggleImageFilter}
              >
                <ImageIcon size={14} color={activeImageFilter ? '#FFF' : '#4B5563'} />
                <Text style={[styles.filterChipText, activeImageFilter && styles.filterChipTextActive]}>With Photo</Text>
              </Pressable>

              {[5, 4, 3, 2, 1].map((rating) => (
                <Pressable
                  key={`filter-${rating}`}
                  style={[styles.filterChip, activeRatingFilter === rating && styles.filterChipActive]}
                  onPress={() => toggleRatingFilter(rating)}
                >
                  <Star size={14} color={activeRatingFilter === rating ? '#FFF' : '#FBBF24'} fill={activeRatingFilter === rating ? '#FFF' : '#FBBF24'} />
                  <Text style={[styles.filterChipText, activeRatingFilter === rating && styles.filterChipTextActive]}>{rating}</Text>
                </Pressable>
              ))}

              {/* Variant Filter Dropdown Trigger */}
              {hasStructuredVariants && (
                <Pressable
                  style={[styles.filterChip, activeVariantFilter !== null && styles.filterChipActive, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                  onPress={() => setShowVariantFilterModal(true)}
                >
                  <Text style={[styles.filterChipText, activeVariantFilter !== null && styles.filterChipTextActive]}>
                    {activeVariantFilter
                      ? activeVariantName
                      : 'All Variants'}
                  </Text>
                  <ChevronDown size={14} color={activeVariantFilter !== null ? '#FFF' : '#4B5563'} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Added spacing below filters */}
          <View style={{ height: 24 }} />

          {isLoadingReviews ? (
            <ActivityIndicator size="small" color="#FB8C00" style={{ marginVertical: 20 }} />
          ) : reviews.length > 0 ? (
            <>
              {reviews.map((review, index) => {
                // If on details tab, only show first 2
                if (activeTab === 'details' && index >= 2) return null;

                return (
                  <View key={review.id} style={styles.reviewCard}>
                    <Image
                      source={{ uri: review.buyerAvatar || 'https://ui-avatars.com/api/?name=Buyer&background=FF6A00&color=fff' }}
                      style={styles.reviewerAvatar}
                    />
                    <View style={styles.reviewContent}>
                      <Text style={[styles.reviewerName, { color: COLORS.textHeadline, opacity: 0.8 }]}>{review.buyerName || 'Anonymous Buyer'}</Text>
                      <View style={styles.reviewRatingRow}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={10} color={i < review.rating ? '#FBBF24' : '#E5E7EB'} fill={i < review.rating ? '#FBBF24' : '#E5E7EB'} />
                        ))}
                      </View>
                      <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                        {formatReviewDate(review.createdAt)}
                      </Text>
                      <Text style={[styles.reviewText, { color: COLORS.textHeadline, opacity: 0.7 }]}>{review.comment || 'No written feedback.'}</Text>
                      {review.variantLabel ? (
                        <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                          Variant: {review.variantLabel}
                        </Text>
                      ) : null}
                      {review.images.length > 0 ? (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.reviewImagesContainer}
                        >
                          {review.images.map((imageUrl, idx) => (
                            <Image
                              key={`${review.id}-${idx}`}
                              source={{ uri: imageUrl }}
                              style={styles.reviewImage}
                            />
                          ))}
                        </ScrollView>
                      ) : null}
                      {review.sellerReply ? (
                        <View style={{ marginTop: 8, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#FB8C00' }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#C2410C', opacity: 0.8 }}>Seller response</Text>
                          <Text style={{ fontSize: 12, color: COLORS.textHeadline, opacity: 0.6, marginTop: 2 }}>{review.sellerReply.message}</Text>
                        </View>
                      ) : null}
                      <View style={styles.reviewFooter}>
                        <Pressable
                          style={[
                            styles.helpfulButton,
                            helpfulReviewIds[review.id] && styles.helpfulButtonActive,
                          ]}
                          onPress={() => handleMarkReviewHelpful(review.id)}
                          disabled={!!helpfulReviewIds[review.id]}
                        >
                          <ThumbsUp
                            size={14}
                            color={helpfulReviewIds[review.id] ? BRAND_COLOR : '#6B7280'}
                          />
                          <Text
                            style={[
                              styles.helpfulButtonText,
                              helpfulReviewIds[review.id] && styles.helpfulButtonTextActive,
                            ]}
                          >
                            Helpful ({review.helpfulCount || 0})
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* View All / Load More Logic */}
              {activeTab === 'ratings' && reviews.length < reviewsTotal ? (
                <Pressable
                  onPress={handleLoadMoreReviews}
                  style={{ marginTop: 8, paddingVertical: 10, alignItems: 'center' }}
                  disabled={isLoadingMoreReviews}
                >
                  {isLoadingMoreReviews ? (
                    <ActivityIndicator size="small" color="#FB8C00" />
                  ) : (
                    <Text style={{ color: '#EA580C', fontWeight: '700' }}>Load More Reviews</Text>
                  )}
                </Pressable>
              ) : null}
            </>
          ) : (
            <Text style={{ color: '#9CA3AF', marginVertical: 10 }}>No reviews yet</Text>
          )}
        </View>

        {/* --- RECOMMENDATIONS (Matches Home Grid) --- */}
        <View style={styles.recommendations}>
          <View style={styles.recommendationHeader}>
            <Text style={[styles.sectionTitle, { color: COLORS.textPrimary }]}>You Might Also Like</Text>
            <Pressable onPress={() => navigation.navigate('MainTabs', { screen: 'Shop', params: {} })}>
              <Text style={styles.gridSeeAll}>View All</Text>
            </Pressable>
          </View>
          <View style={styles.gridBody}>
            {relatedProducts.map((p) => (
              <View key={p.id} style={styles.itemBoxContainerVertical}>
                <MasonryProductCard 
                  product={p} 
                  onPress={() => navigation.push('ProductDetail', { product: p })} 
                  width={(width - 24) / 2}
                />
              </View>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* --- BOTTOM ACTIONS (SOLID ORANGE) --- */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={styles.chatSellerBtn} onPress={handleChat}>
          <MessageCircle size={22} color="#FFF" />
        </Pressable>

        <View style={styles.actionButtonsContainer}>
          <Pressable
            style={[styles.addToCartBtn, (isAddingToCart || (Number(selectedVariantInfo.stock ?? 0) <= 0) || isSellerRestricted) && styles.disabledBtn]}
            onPress={handleAddToCart}
            disabled={isAddingToCart || (Number(selectedVariantInfo.stock ?? 0) <= 0) || isSellerRestricted}
          >
            {isAddingToCart ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <ShoppingCart size={20} color={((Number(selectedVariantInfo.stock ?? 0) > 0) && !isSellerRestricted) ? COLORS.primary : COLORS.gray400} />
            )}
          </Pressable>

          <Pressable
            style={[styles.buyNowBtn, ((Number(selectedVariantInfo.stock ?? 0) <= 0) || isSellerRestricted) && styles.disabledBtn]}
            onPress={handleBuyNow}
            disabled={false}
          >
            <AnimatedText style={{
              ...styles.buyNowText,
              ...((Number(selectedVariantInfo.stock ?? 0) <= 0 || isSellerRestricted) ? { color: COLORS.gray400 } : {}),
              ...(Number(selectedVariantInfo.stock ?? 0) <= 0 ? { transform: [{ scale: outOfStockPulse }] } : {}),
            }}>
              {(isSellerRestricted ? 'Store Unavailable' : (Number(selectedVariantInfo.stock ?? 0) > 0 ? 'Buy Now' : 'Out of Stock'))}
            </AnimatedText>
          </Pressable>
        </View>
      </View>

      {/* --- VARIANT SELECTION MODAL (SHARED) --- */}
      <VariantSelectionModal
        visible={showVariantModal}
        onClose={() => setShowVariantModal(false)}
        product={product}
        variants={productVariants} // Pass full variants list for accurate stock validation
        initialSelectedVariant={buildSelectedVariant(selectedOption1, selectedOption2)}
        initialQuantity={quantity}
        onConfirm={handleSharedModalConfirm}
        confirmLabel={variantModalAction === 'cart' ? 'Add to Cart' : 'Buy Now'}
        isBuyNow={variantModalAction === 'buy'}
        activeCampaignDiscount={activeCampaignDiscount}
      />

      <CameraSearchModal visible={showCameraSearch} onClose={() => setShowCameraSearch(false)} />



      <Modal
        visible={showVariantFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowVariantFilterModal(false)}
        statusBarTranslucent={true}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setShowVariantFilterModal(false)}
        >
          <Pressable
            style={{
              width: '80%',
              backgroundColor: COLORS.background,
              borderRadius: 16,
              paddingVertical: 20,
              paddingHorizontal: 16,
              maxHeight: '60%'
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 16, textAlign: 'center' }}>
              Filter Reviews by Variant
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Pressable
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3F4F6',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onPress={() => {
                  toggleVariantFilter(null);
                  setShowVariantFilterModal(false);
                }}
              >
                <Text style={{ fontSize: 16, color: activeVariantFilter === null ? '#EA580C' : '#374151', fontWeight: activeVariantFilter === null ? '700' : '400' }}>
                  All Variants
                </Text>
                {activeVariantFilter === null && <CheckCircle size={20} color="#EA580C" />}
              </Pressable>

              {productVariants.map((variant: any) => {
                // Construct label
                const labelParts: string[] = [];
                if (variant.option_1_value) labelParts.push(variant.option_1_value);
                if (variant.option_2_value) labelParts.push(variant.option_2_value);
                // Fallback to legacy
                if (labelParts.length === 0) {
                  if (variant.color) labelParts.push(variant.color);
                  if (variant.size) labelParts.push(variant.size);
                }
                const label = labelParts.join(' / ') || variant.variant_name || 'Variant';
                const isActive = activeVariantFilter === variant.id;

                return (
                  <Pressable
                    key={variant.id}
                    style={{
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: '#F3F4F6',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onPress={() => {
                      toggleVariantFilter(variant.id);
                      setShowVariantFilterModal(false);
                    }}
                  >
                    <Text style={{ fontSize: 16, color: isActive ? '#EA580C' : '#374151', fontWeight: isActive ? '700' : '400' }}>
                      {label}
                    </Text>
                    {isActive && <CheckCircle size={20} color="#EA580C" />}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              style={{ marginTop: 16, alignSelf: 'center', padding: 10 }}
              onPress={() => setShowVariantFilterModal(false)}
            >
              <Text style={{ color: '#9CA3AF', fontSize: 15 }}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Size Guide Modal */}
      <Modal
        visible={showSizeGuideModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSizeGuideModal(false)}
        statusBarTranslucent={true}
      >
        <Pressable
          style={styles.sizeGuideModalOverlay}
          onPress={() => setShowSizeGuideModal(false)}
        >
          <Pressable
            style={styles.sizeGuideModalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sizeGuideModalHeader}>
              <Text style={styles.sizeGuideModalTitle}>Size Guider</Text>
              <Pressable onPress={() => setShowSizeGuideModal(false)} style={styles.sizeGuideCloseBtn}>
                <X size={24} color="#6B7280" />
              </Pressable>
            </View>
            {/* <ScrollView
              style={styles.sizeGuideImageContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sizeGuideImageContent}
            > */}
            {product.size_guide_image ? (
              <>
                <Image
                  source={{ uri: product.size_guide_image }}
                  style={styles.sizeGuideImage}
                  contentFit="contain"
                />
              </>
            ) : (
              <View style={styles.sizeGuidePlaceholder}>
                <Ionicons name="shirt-outline" size={64} color="#D1D5DB" />
                <Text style={styles.sizeGuidePlaceholderText}>No size guide available</Text>
              </View>
            )}

            {/* </ScrollView> */}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Warranty Information Bottom Sheet Modal */}
      {warrantyInfo?.hasWarranty && (
        <Modal
          visible={showWarrantyModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowWarrantyModal(false)}
          statusBarTranslucent={true}
        >
          <Pressable
            style={styles.warrantyModalOverlay}
            onPress={() => setShowWarrantyModal(false)}
          >
            <Pressable
              style={styles.warrantyModalContent}
              onPress={(e) => e.stopPropagation()}
              onStartShouldSetResponder={() => true}
            >
              {/* Handle Bar */}
              <View style={styles.warrantyModalHandleContainer}>
                <View style={styles.warrantyModalHandle} />
              </View>

              {/* Header */}
              <View style={styles.warrantyModalHeader}>
                <View style={styles.warrantyModalTitleRow}>
                  <Shield size={24} color={BRAND_COLOR} />
                  <Text style={styles.warrantyModalTitle}>Warranty Information</Text>
                </View>
                <Pressable
                  onPress={() => setShowWarrantyModal(false)}
                  style={styles.warrantyModalCloseBtn}
                >
                  <X size={24} color="#6B7280" />
                </Pressable>
              </View>

              {/* Warranty Badge */}
              <View style={styles.warrantyModalBadge}>
                <ShieldCheck size={18} color="#FFF" />
                <Text style={styles.warrantyModalBadgeText}>
                  {warrantyInfo.warrantyDurationMonths
                    ? `${warrantyInfo.warrantyDurationMonths} Month${warrantyInfo.warrantyDurationMonths > 1 ? 's' : ''} Warranty`
                    : 'Warranty Included'}
                </Text>
              </View>

              {/* Scrollable Content */}
              <ScrollView
                style={styles.warrantyModalScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.warrantyModalScrollContent}
              >
                {warrantyInfo.warrantyType && (
                  <View style={styles.warrantyModalDetailRow}>
                    <View style={styles.warrantyModalIconContainer}>
                      <BadgeCheck size={20} color={BRAND_COLOR} />
                    </View>
                    <View style={styles.warrantyModalDetailContent}>
                      <Text style={styles.warrantyModalDetailLabel}>Type</Text>
                      <Text style={styles.warrantyModalDetailValue}>
                        {warrantyInfo.warrantyType === 'local_manufacturer' && 'Local Manufacturer Warranty'}
                        {warrantyInfo.warrantyType === 'international_manufacturer' && 'International Manufacturer Warranty'}
                        {warrantyInfo.warrantyType === 'shop_warranty' && 'Shop Warranty'}
                        {warrantyInfo.warrantyType === 'no_warranty' && 'No Warranty'}
                      </Text>
                    </View>
                  </View>
                )}

                {warrantyInfo.warrantyProviderName && (
                  <View style={styles.warrantyModalDetailRow}>
                    <View style={styles.warrantyModalIconContainer}>
                      <Shield size={20} color={BRAND_COLOR} />
                    </View>
                    <View style={styles.warrantyModalDetailContent}>
                      <Text style={styles.warrantyModalDetailLabel}>Provider</Text>
                      <Text style={styles.warrantyModalDetailValue}>{warrantyInfo.warrantyProviderName}</Text>
                    </View>
                  </View>
                )}

                {warrantyInfo.warrantyProviderContact && (
                  <View style={styles.warrantyModalDetailRow}>
                    <View style={styles.warrantyModalIconContainer}>
                      <Phone size={20} color={BRAND_COLOR} />
                    </View>
                    <View style={styles.warrantyModalDetailContent}>
                      <Text style={styles.warrantyModalDetailLabel}>Contact</Text>
                      <Pressable onPress={() => Linking.openURL(`tel:${warrantyInfo.warrantyProviderContact}`)}>
                        <Text style={styles.warrantyModalDetailLink}>{warrantyInfo.warrantyProviderContact}</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {warrantyInfo.warrantyProviderEmail && (
                  <View style={styles.warrantyModalDetailRow}>
                    <View style={styles.warrantyModalIconContainer}>
                      <Mail size={20} color={BRAND_COLOR} />
                    </View>
                    <View style={styles.warrantyModalDetailContent}>
                      <Text style={styles.warrantyModalDetailLabel}>Email</Text>
                      <Pressable onPress={() => Linking.openURL(`mailto:${warrantyInfo.warrantyProviderEmail}`)}>
                        <Text style={styles.warrantyModalDetailLink}>{warrantyInfo.warrantyProviderEmail}</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {warrantyInfo.warrantyPolicy && (
                  <View style={styles.warrantyModalDetailRow}>
                    <View style={styles.warrantyModalIconContainer}>
                      <FileText size={20} color={BRAND_COLOR} />
                    </View>
                    <View style={styles.warrantyModalDetailContent}>
                      <Text style={styles.warrantyModalDetailLabel}>Coverage</Text>
                      <Text style={styles.warrantyModalDetailValue}>{warrantyInfo.warrantyPolicy}</Text>
                    </View>
                  </View>
                )}

                {warrantyInfo.warrantyTermsUrl && (
                  <Pressable
                    style={styles.warrantyModalTermsLink}
                    onPress={() => {
                      Linking.openURL(warrantyInfo.warrantyTermsUrl!).catch(() => {
                        Alert.alert('Error', 'Could not open warranty terms URL');
                      });
                    }}
                  >
                    <FileText size={20} color={BRAND_COLOR} />
                    <Text style={styles.warrantyModalTermsLinkText}>View Full Terms & Conditions</Text>
                    <ChevronRight size={20} color={BRAND_COLOR} />
                  </Pressable>
                )}
              </ScrollView>

              {/* Info Box */}
              <View style={styles.warrantyModalInfoBox}>
                <View style={styles.warrantyModalInfoBoxRow}>
                  <Shield size={18} color="#FB8C00" />
                  <Text style={styles.warrantyModalInfoBoxText}>
                    This product is covered by warranty. Contact the seller or manufacturer for warranty claims.
                  </Text>
                </View>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {showGuestModal && (
        <GuestLoginModal
          visible={showGuestModal}
          message={guestModalMessage}
          onClose={() => setShowGuestModal(false)}
        />
      )}

      <AddToRegistryModal
        visible={showWishlistModal}
        onClose={() => setShowWishlistModal(false)}
        product={product}
      />

      {/* Add to Cart Loading Modal */}
      <Modal visible={isAddingToCart} transparent animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: '#FFF', padding: 20, borderRadius: 12, minWidth: 200, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 12, fontSize: 16, fontWeight: '600', color: '#111' }}>Adding to cart...</Text>
          </View>
        </View>
      </Modal>

      {/* Product Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
        statusBarTranslucent={true}
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

      {/* AI Chat Bubble */}
      < AIChatBubble
        product={{
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
          images: productImages,
          isFreeShipping: product.is_free_shipping || product.isFreeShipping,
          weight: product.weight ?? undefined,
          dimensions: product.dimensions ?? undefined,
          tags: product.tags,
          isActive: product.is_active,
          approvalStatus: product.approval_status,
        }}
        store={{
          id: product.seller_id || product.sellerId || '',
          store_name: displayStoreName,
          rating: product.sellerRating,
        }}
        onTalkToSeller={handleChat}
      />

    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    // backgroundColor: BRAND_COLOR, // Replaced by gradient
    paddingBottom: 15,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    zIndex: 10,
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
    backgroundColor: '#FF8A00',
    borderRadius: 10, width: 16, height: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

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
  productImage: { width: width - 32, height: width - 32 },
  pageIndicator: {
    position: 'absolute', top: 16, left: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
  },
  pageText: { color: COLORS.textHeadline, fontSize: 12, fontWeight: '700' },

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
  tagText: { fontSize: 11, fontWeight: '700' },
  productName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textHeadline,
    lineHeight: 30,
    marginBottom: 8,
  },
  subInfo: { fontSize: 12, color: COLORS.textMuted, marginBottom: 16 },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8 },
  currentPrice: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
  },
  originalPrice: { fontSize: 16, color: COLORS.textMuted, textDecorationLine: 'line-through', marginLeft: 8 },

  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stockText: { fontSize: 13, color: '#10B981', fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingValue: { fontSize: 13, fontWeight: '600', color: COLORS.textHeadline, marginLeft: 4 },
  questionsLink: { fontSize: 13, color: '#8B5CF6', fontWeight: '600', marginLeft: 'auto' },

  // Selectors
  section: { backgroundColor: 'transparent', padding: 16, marginBottom: 8 },
  sectionMerged: { backgroundColor: 'transparent', paddingHorizontal: 16, marginBottom: 8, paddingTop: 0 }, // Added paddingTop: 0
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
  sellerSection: { backgroundColor: '#FFFFFF', padding: 12, marginBottom: 8, marginHorizontal: 16, borderRadius: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  sellerSectionMerged: { backgroundColor: 'transparent', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8 },
  sellerHeader: { flexDirection: 'row', alignItems: 'center' },
  sellerAvatarContainer: {
    width: 48, height: 48, borderRadius: 24, overflow: 'hidden', marginRight: 12,
    borderWidth: 1, borderColor: '#F3F4F6'
  },
  sellerAvatar: { width: '100%', height: '100%' },
  sellerInfo: { flex: 1, justifyContent: 'center' },
  sellerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  sellerName: { fontSize: 15, fontWeight: '700', color: COLORS.textHeadline, flexShrink: 1 },
  sellerMetaRow: { flexDirection: 'row', alignItems: 'center' },
  sellerMetaText: { fontSize: 12, color: COLORS.textMuted },
  sellerMetaDivider: { width: 1, height: 10, backgroundColor: '#E5E7EB', marginHorizontal: 8 },
  sellerRating: { flexDirection: 'row', alignItems: 'center', gap: 4 }, // Kept for reference but not used in new layout directly

  followBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: BRAND_COLOR,
  } as any,
  followBtnActive: {
    backgroundColor: BRAND_COLOR,
  },
  followBtnText: { fontSize: 11, fontWeight: '700', color: BRAND_COLOR } as any,
  followBtnTextActive: { color: '#FFF' },
  visitStoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  visitStoreText: { fontSize: 13, fontWeight: '700', color: BRAND_COLOR },

  benefitsRow: { flexDirection: 'row', gap: 12, marginTop: 12 }, // Moved benefits out of header if needed, but removed from JSX for now

  // Tabs
  tabContainer: { backgroundColor: 'transparent', paddingHorizontal: 16, paddingTop: 16, marginBottom: 8 },
  tabHeader: { flexDirection: 'row', gap: 24, marginBottom: 16 },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  activeTabBtn: { backgroundColor: BRAND_COLOR },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  activeTabText: { color: '#FFF' },
  tabContent: { paddingBottom: 16 },
  reviewSummary: { fontSize: 14, color: COLORS.textHeadline, marginBottom: 8, fontWeight: '700' },
  textContent: { fontSize: 14, color: COLORS.textHeadline, lineHeight: 20 },

  // Reviews
  reviewCard: { flexDirection: 'row', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 16 },
  reviewerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  reviewContent: { flex: 1 },
  reviewerName: { fontSize: 14, fontWeight: '700', color: COLORS.textHeadline, marginBottom: 2 },
  reviewRatingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 2 },
  reviewDate: { fontSize: 12, color: COLORS.textMuted, marginBottom: 6 },
  reviewText: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },
  reviewFooter: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 4,
  },
  helpfulButtonActive: {
    // Only color changes for text/icon handled in JSX
  },
  helpfulButtonText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  helpfulButtonTextActive: {
    color: BRAND_COLOR,
  },

  recommendations: { paddingHorizontal: 6, paddingTop: 24, marginBottom: 20 },
  recommendationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 6 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#D97706' }, // Matched Home page orange
  gridSeeAll: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  gridBody: { flexDirection: 'row', flexWrap: 'wrap' },
  itemBoxContainerVertical: { width: '50%', paddingHorizontal: 6, marginBottom: 12 },

  // Bottom Bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFBF0', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 15, paddingBottom: 15,
    borderTopLeftRadius: 30, borderTopRightRadius: 20,
    shadowColor: '#D97706', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 15, elevation: 15,
    zIndex: 100,
  },
  actionButtonsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 12,
  },
  chatSellerBtn: {
    height: 52, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center',
    borderRadius: 26, backgroundColor: COLORS.primary, // Solid Brand Primary
  },
  chatSellerText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  addToCartBtn: {
    width: 72, height: 52, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderRadius: 26, backgroundColor: COLORS.background, // Match screen background
    borderWidth: 1, borderColor: COLORS.primary, // Brand Primary outline
  },
  addToCartText: { color: COLORS.primary, fontWeight: '800', fontSize: 14 },
  buyNowBtn: {
    flex: 1, height: 52, justifyContent: 'center', alignItems: 'center',
    borderRadius: 26, backgroundColor: COLORS.primary, // Solid Brand Primary
  },
  buyNowText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  disabledBtn: {
    opacity: 0.5,
  },

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
  createListInput: { flex: 1, fontSize: 13, borderBottomWidth: 1, borderBottomColor: COLORS.primary, paddingVertical: 4, color: COLORS.textHeadline },

  // Variant Selection
  variantSection: { marginTop: 16 },
  variantLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textHeadline, marginBottom: 10 },
  variantSelected: { fontWeight: '700', color: COLORS.textHeadline },
  colorOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 6,
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
    borderRadius: 3,
    backgroundColor: BRAND_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textHeadline,
    textAlign: 'center',
  },
  variantImgBtn: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    position: 'relative',
  },
  variantImgBtnSelected: {
    borderColor: BRAND_COLOR,
    borderWidth: 3,
  },
  variantImgThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  variantImgCheck: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#FFF',
    borderRadius: 8,
  },
  sizeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sizeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: COLORS.background,
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
    color: COLORS.textHeadline,
  },
  sizeOptionTextSelected: {
    color: BRAND_COLOR,
    fontWeight: '700',
  },

  // Size Guide Button
  sizeGuideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFE0B2',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sizeGuideButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND_COLOR,
    flex: 1,
  },

  // Size Guide Modal
  sizeGuideModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeGuideModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  sizeGuideModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sizeGuideModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textHeadline,
  },
  sizeGuideCloseBtn: {
    padding: 4,
  },
  sizeGuideImageContainer: {
    flexGrow: 1,
    flexShrink: 1,
  },
  sizeGuideImageContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 50,
    flexGrow: 1,
  },
  sizeGuideImage: {
    backgroundColor: '#F3F4F6',
    width: '100%',
    height: 400,
    borderRadius: 12,
  },
  sizeGuidePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  sizeGuidePlaceholderText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 16,
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
    gap: 16,
  },

  // Filter Styles
  filtersContainer: { marginBottom: 15 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#f2f2f2ff',
  },
  filterChipActive: {
    backgroundColor: '#374151',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: '#FFF',
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
    color: COLORS.textMuted,
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
    color: COLORS.textHeadline,
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
  variantModalOptionText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textHeadline,
    textAlign: 'center',
  },
  variantModalSelectedText: {
    fontSize: 13,
    color: COLORS.textMuted,
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
    color: COLORS.textHeadline,
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
    color: COLORS.textMuted,
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
    color: COLORS.textHeadline,
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
    backgroundColor: COLORS.background,
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
    color: COLORS.textHeadline,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },

  // Warranty Section Styles
  warrantySection: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  warrantyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  warrantyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  warrantyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  warrantyBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  warrantyDetails: {
    marginBottom: 12,
  },
  warrantyDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  warrantyDetailContent: {
    flex: 1,
  },
  warrantyDetailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  warrantyDetailValue: {
    fontSize: 13,
    color: '#1F2937',
    lineHeight: 18,
  },
  warrantyTermsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingVertical: 4,
  },
  warrantyTermsLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND_COLOR,
    textDecorationLine: 'underline',
    flex: 1,
  },
  warrantyInfoBox: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  warrantyInfoBoxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  warrantyInfoBoxText: {
    flex: 1,
    fontSize: 12,
    color: '#9A3412',
    lineHeight: 18,
  },

  // Warranty Trigger Button (in product details)
  warrantyTriggerButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  warrantyTriggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  warrantyTriggerText: {
    gap: 2,
  },
  warrantyTriggerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  warrantyTriggerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Warranty Bottom Sheet Modal
  warrantyModalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  warrantyModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  warrantyModalHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  warrantyModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
  },
  warrantyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  warrantyModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  warrantyModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  warrantyModalCloseBtn: {
    padding: 4,
  },
  warrantyModalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BRAND_COLOR,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  warrantyModalBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  warrantyModalScrollView: {
    maxHeight: 350,
  },
  warrantyModalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  warrantyModalDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  warrantyModalIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  warrantyModalDetailContent: {
    flex: 1,
    paddingTop: 4,
  },
  warrantyModalDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  warrantyModalDetailValue: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  warrantyModalDetailLink: {
    fontSize: 14,
    color: BRAND_COLOR,
    textDecorationLine: 'underline',
  },
  warrantyModalTermsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF7ED',
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  warrantyModalTermsLinkText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: BRAND_COLOR,
  },
  warrantyModalInfoBox: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginTop: 16,
  },
  warrantyModalInfoBoxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  warrantyModalInfoBoxText: {
    flex: 1,
    fontSize: 13,
    color: '#9A3412',
    lineHeight: 20,
  },
});
