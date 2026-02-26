import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useBuyerStore, demoSellers } from '../stores/buyerStore';
import Header from '../components/Header';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  ChevronLeft,
  Users,
  Star,
  Heart,
  MessageCircle,
  Share2,
  MapPin,
  Calendar,
  Clock,
  Shield,
  Award,
  Truck,
  ShoppingCart,
  Filter,
  ThumbsUp,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { CartModal } from "../components/ui/cart-modal";
import ShopBuyNowModal from "../components/shop/ShopBuyNowModal";
import ShopVariantModal from "../components/shop/ShopVariantModal";
import { useToast } from "../hooks/use-toast";
import { BazaarFooter } from "../components/ui/bazaar-footer";
import StorefrontProductCard from '../components/StorefrontProductCard';

import { useProductStore } from '../stores/sellerStore';
import { sellerService, type SellerData } from '../services/sellerService';
import { ProductService } from '../services/productService';
import {
  computeReviewStats,
  reviewService,
  type ReviewFeedItem,
} from '../services/reviewService';
import type { ProductWithSeller } from '@/types/database.types';

import StorefrontReviewsTab, { type Review } from '../components/shop/StorefrontReviewsTab';
import { supabase } from '@/lib/supabase';

export default function SellerStorefrontPage() {
  const navigate = useNavigate();
  const { sellerId } = useParams();
  const {
    followShop,
    unfollowShop,
    isFollowing,
    addToCart,
    addViewedSeller,
    profile
  } = useBuyerStore();
  const { products: allProducts } = useProductStore();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('popular');
  const [reviewFilter, setReviewFilter] = useState('all');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const { toast } = useToast();
  const reviewsStartRef = useRef<HTMLDivElement>(null);

  // Scroll to reviews when filter changes
  useEffect(() => {
    // Only scroll if we are actually viewing the reviews tab and the filter changed from its initial state
    if (reviewsStartRef.current) {
      const offset = 144; // Match the sticky top-36 (144px) of the filters
      const rect = reviewsStartRef.current.getBoundingClientRect();
      const scrollTop = window.scrollY;
      const targetY = rect.top + scrollTop - offset;

      window.scrollTo({
        top: targetY,
        behavior: 'smooth'
      });
    }
  }, [reviewFilter]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [addedProduct, setAddedProduct] = useState<{ name: string; image: string; } | null>(null);
  const [showBuyNowModal, setShowBuyNowModal] = useState(false);
  const [buyNowProduct, setBuyNowProduct] = useState<any>(null);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [variantProduct, setVariantProduct] = useState<any>(null);
  const [isBuyNowAction, setIsBuyNowAction] = useState(false);
  const { cartItems } = useBuyerStore();

  // Real data state
  const [realSeller, setRealSeller] = useState<SellerData | null>(null);
  const [realProducts, setRealProducts] = useState<ProductWithSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewStats, setReviewStats] = useState<{ total: number; avgRating: number; distribution: number[] }>({
    total: 0,
    avgRating: 0,
    distribution: [0, 0, 0, 0, 0] // 1-5 stars
  });

  const [reviews, setReviews] = useState<Review[]>([]);
  const [followersCount, setFollowersCount] = useState(0);

  const handleToggleLike = (reviewId: string) => {
    setReviews(prev => prev.map(review => {
      if (review.id === reviewId) {
        return {
          ...review,
          isLiked: !review.isLiked,
          helpfulCount: review.isLiked ? review.helpfulCount - 1 : review.helpfulCount + 1
        };
      }
      return review;
    }));
  };

  const handlePostReply = (reviewId: string) => {
    if (!replyText.trim()) return;

    setReviews(prev => prev.map(review => {
      if (review.id === reviewId) {
        return {
          ...review,
          replies: [...review.replies, {
            id: Date.now(),
            text: replyText,
            author: profile ? `${profile.firstName} ${profile.lastName}` : "You",
            date: "Just now",
            avatar: profile?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&crop=face",
            isSeller: false
          }]
        };
      }
      return review;
    }));

    setReplyText("");
    setReplyingTo(null);
  };

  // Fetch real seller and products from database
  useEffect(() => {
    const fetchSellerData = async () => {
      if (!sellerId) return;

      setLoading(true);
      try {
        // Fetch seller data
        const sellerData = await sellerService.getStoreById(sellerId);
        if (sellerData) {
          setRealSeller(sellerData);
        }

        // Fetch products for this seller - use 'approved' status for public view
        const productsData = await ProductService.getInstance().getProducts({
          sellerId: sellerId,
          isActive: true,
          approvalStatus: 'approved'
        });
        if (productsData && productsData.length > 0) {
          setRealProducts(productsData);
        }

        // Fetch followers count for this seller
        try {
          const { count } = await supabase
            .from('buyers')
            .select('id', { count: 'exact', head: true })
            .contains('followed_shops', [sellerId]);
          setFollowersCount(count || 0);
        } catch {
          // silently ignore, followers count is non-critical
        }

        // Fetch real reviews for this seller
        try {
          const reviewsData = await reviewService.getSellerReviews(sellerId);
          const mappedReviews: Review[] = (reviewsData || []).map((review: ReviewFeedItem) => ({
            id: review.id,
            author: review.buyerName,
            avatar: review.buyerAvatar,
            rating: review.rating,
            date: formatRelativeDate(review.createdAt),
            content: review.comment || 'Great product!',
            helpfulCount: review.helpfulCount,
            isLiked: false,
            replies: review.sellerReply
              ? [
                {
                  id: 1,
                  text: review.sellerReply.message,
                  author: sellerData?.store_name || realSeller?.store_name || (seller as any)?.name || 'Seller',
                  date: review.sellerReply.repliedAt
                    ? formatRelativeDate(review.sellerReply.repliedAt)
                    : 'Recently',
                  avatar:
                    sellerData?.avatar_url ||
                    'https://ui-avatars.com/api/?name=S&background=D97706&color=fff',
                  isSeller: true,
                },
              ]
              : [],
            productName: review.productName || undefined,
            baseProductName: review.baseProductName || undefined,
            productImage: review.productImage || undefined,
            images: review.images || [],
            variantLabel: review.variantLabel || undefined,
          }));

          setReviews(mappedReviews);

          const stats = computeReviewStats(reviewsData || []);
          setReviewStats({
            total: stats.total,
            avgRating: stats.averageRating,
            distribution: stats.distribution,
          });
        } catch (reviewError) {
          console.error('Error fetching reviews:', reviewError);
        }
      } catch (error) {
        console.error('Error fetching seller data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSellerData();
  }, [sellerId]);

  // Helper function to format relative dates
  const formatRelativeDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${diffDays >= 60 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 365)} year${diffDays >= 730 ? 's' : ''} ago`;
  };

  // Get seller data - prioritize real data
  const demoSeller = demoSellers.find(s => s.id === sellerId);

  // Try to find seller from products if not in demo
  const dbSellerProduct = !demoSeller ? allProducts.find(p => p.sellerId === sellerId) : null;

  // Build seller object from real data or fallback to demo
  const seller = realSeller ? {
    id: realSeller.id,
    name: realSeller.store_name || realSeller.business_name || 'Verified Seller',
    avatar: realSeller.avatar_url || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=150&h=150&fit=crop',
    rating:
      reviewStats.total > 0
        ? Number(reviewStats.avgRating.toFixed(1))
        : Number((realSeller as any).rating || 0),
    totalReviews:
      reviewStats.total ||
      Number((realSeller as any).total_reviews || 0),
    followers: followersCount,
    isVerified: realSeller.is_verified || false,
    tierLevel: (realSeller as any).tier_level || 'standard',
    description: realSeller.store_description || 'Welcome to our store!',
    location: [realSeller.city, realSeller.province].filter(Boolean).join(', ') || 'Philippines',
    established: realSeller.created_at ? new Date(realSeller.created_at).getFullYear().toString() : '2024',
    badges: realSeller.is_verified ? ['Verified Seller'] : [],
    responseTime: '< 24 hours',
    categories: (realSeller as any).product_categories || (realSeller as any).store_category || ['General'],
    products: []
  } : demoSeller || (dbSellerProduct ? {
    id: dbSellerProduct.sellerId,
    name: dbSellerProduct.sellerName || "Verified Seller",
    avatar: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=150&h=150&fit=crop',
    rating: dbSellerProduct.sellerRating || 5.0,
    totalReviews: 10,
    followers: 5,
    isVerified: true,
    tierLevel: (dbSellerProduct as any).sellerTierLevel || 'standard',
    description: 'Welcome to our store!',
    location: dbSellerProduct.sellerLocation || 'Metro Manila',
    established: '2024',
    badges: ['Verified Seller'],
    responseTime: '< 24 hours',
    categories: ['General'],
    products: []
  } : demoSellers[0]);

  const isPremiumOutlet = seller.tierLevel === 'premium_outlet';

  useEffect(() => {
    if (seller) {
      addViewedSeller(seller);
    }
  }, [seller, addViewedSeller]);

  // Demo products for the seller (fallback only)
  const demoProducts = [
    {
      id: 'prod-1',
      name: 'iPhone 15 Pro Max',
      price: 89999,
      originalPrice: 95999,
      image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=400&fit=crop',
      rating: 4.9,
      review_count: 125,
      sold: 1250,
      category: 'Electronics',
      isFreeShipping: true
    },
    {
      id: 'prod-2',
      name: 'MacBook Pro M3',
      price: 125999,
      originalPrice: 135999,
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop',
      rating: 4.8,
      review_count: 42,
      sold: 890,
      category: 'Computers',
      isFreeShipping: true
    },
    {
      id: 'prod-3',
      name: 'AirPods Pro 2',
      price: 15999,
      originalPrice: 17999,
      image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&h=400&fit=crop',
      rating: 4.7,
      review_count: 560,
      sold: 2130,
      category: 'Electronics',
      isFreeShipping: false
    }
  ];

  // Map real products to display format
  const displayProducts = realProducts.length > 0
    ? realProducts.map(p => ({
      id: p.id,
      name: p.name || 'Untitled Product',
      price: p.price || 0,
      originalPrice: p.original_price || undefined,
      image: (p.images && p.images.length > 0 && p.images[0].image_url) || 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=400&h=400&fit=crop',
      rating: p.rating || 5.0,
      review_count: p.review_count || 0,
      sold: p.sales_count || 0,
      category: (p.category && (typeof p.category === 'string' ? p.category : (p.category as any).name)) || 'General',
      isFreeShipping: p.is_free_shipping || false,
      created_at: p.created_at || new Date().toISOString(),
      variants: (p as any).variants || [],
      variantLabel1: (p as any).variant_label_1,
      variantLabel2: (p as any).variant_label_2,
      variantLabel1Values: (p as any).variant_label_1_values || [],
      variantLabel2Values: (p as any).variant_label_2_values || [],
      stock: (p as any).stock || 99,
      sellerLocation: seller?.location,
      sellerName: seller?.name,
      isVerified: seller?.isVerified,
    }))
    : demoProducts.map(p => ({
      ...p,
      created_at: new Date(2024, 0, 1).toISOString(),
      variants: [],
      variantLabel1Values: [],
      variantLabel2Values: [],
      stock: 99,
      sellerLocation: seller?.location,
      sellerName: seller?.name,
      isVerified: seller?.isVerified,
    }));

  // Get all unique categories from the displayed products
  const sellerCategories = Array.from(new Set(displayProducts.map(p => p.category))).sort();

  const filteredProducts = displayProducts
    .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
    .sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.sold - a.sold;
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        default:
          return 0;
      }
    });

  const handleAddToCart = (product: any) => {
    const cartProduct = {
      ...product,
      sellerId: seller.id,
      seller: seller,
      totalReviews: 150,
      location: seller.location,
      description: 'High-quality product from trusted seller',
      specifications: {},
      variants: [],
      images: [product.image]
    };
    addToCart(cartProduct, 1);
  };

  const onVariantSelect = (product: any, isBuyNow: boolean) => {
    setVariantProduct(product);
    setIsBuyNowAction(isBuyNow);
    setShowVariantModal(true);
  };

  const onBuyNow = (product: any) => {
    setBuyNowProduct({
      ...product,
      quantity: 1,
      selectedVariant: null,
      selectedVariantLabel1: null,
      selectedVariantLabel2: null,
    } as any);
    setShowBuyNowModal(true);
  };

  const onLoginRequired = () => {
    toast({
      title: "Login Required",
      description: "Please sign in to proceed with your purchase.",
      variant: "destructive",
    });
    navigate("/login");
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header hideSearch />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
            <p className="text-gray-500">Loading store...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header hideSearch />

      {/* Seller Header - Modern Dark Orange Style */}
      <div className="relative bg-[#2b1203]/80 pt-12 pb-10 overflow-hidden">
        {/* Background Image with Dark Orange Overlay */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-center bg-cover opacity-50 scale-105"
            style={{ backgroundImage: `url(${seller.avatar})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2b1203]/85 via-[#4d2000]/60 to-[#7a3300]/30" />
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="hover:bg-base px-3 -ml-2 text-white/80 hover:text-[var(--brand-primary)] transition-all"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back
            </Button>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">
            {/* Store Avatar */}
            <div className="relative">
              <div className="w-32 h-32 md:w-36 md:h-36 rounded-full bg-white p-1 shadow-2xl overflow-hidden">
                <img
                  src={seller.avatar}
                  alt={seller.name}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
            </div>

            {/* Store Details */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  {seller.name}
                </h1>
                {seller.isVerified && (
                  <Badge className="bg-white text-green-600 hover:bg-white border-none py-0.5 px-3 hidden md:flex items-center gap-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Verified
                  </Badge>
                )}
                {isPremiumOutlet && (
                  <Badge className="bg-purple-500 text-white hover:bg-purple-600 border-none py-0.5 px-3 hidden md:flex items-center gap-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    <Star className="w-3 h-3 fill-white" />
                    Premium Outlet
                  </Badge>
                )}
              </div>

              <div className="flex flex-col gap-1 mb-5">
                <div className="flex items-center justify-center md:justify-start gap-4 text-white/80 text-sm font-medium">
                  <span className="flex items-center">
                    {seller.location}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]/50 hidden md:block" />
                  <span className="flex items-center">
                    Est. {seller.established}
                  </span>
                </div>

                <div className="flex items-center justify-center md:justify-start gap-6 mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-base font-bold">{seller.rating}</span>
                    <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Rating</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-base font-bold">{seller.followers.toLocaleString()}</span>
                    <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Followers</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-6">
                <Button
                  onClick={() => isFollowing(seller.id) ? unfollowShop(seller.id) : followShop(seller.id)}
                  className={cn(
                    "h-10 px-8 rounded-xl font-bold transition-all duration-300 min-w-[130px]",
                    isFollowing(seller.id)
                      ? "bg-[var(--brand-primary)] text-white border border-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] backdrop-blur-md"
                      : "bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark)] shadow-lg shadow-[var(--brand-primary)]/20"
                  )}
                >
                  {isFollowing(seller.id) ? (
                    <><Heart className="w-4 h-4 mr-2 fill-current" /> Following</>
                  ) : (
                    <><Heart className="w-4 h-4 mr-2" /> Follow</>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate(`/messages?sellerId=${seller.id}`)}
                  className="h-10 px-8 rounded-xl font-bold bg-transparent border border-white/20 text-white hover:bg-white/10 hover:text-white transition-all min-w-[130px]"
                >
                  Chat
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl bg-white/5 text-white border border-white/10 hover:bg-white/10 backdrop-blur-md transition-all"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Store Content */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Tabs defaultValue="products" className="space-y-4" onValueChange={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="sticky top-20 z-30 flex justify-center w-full mb-4 py-2 backdrop-blur-[2px]">
            <TabsList className="inline-flex h-auto items-center justify-center rounded-full bg-white p-1 border-0 shadow-sm">
              <TabsTrigger
                value="products"
                className="rounded-full px-6 py-1.5 text-sm font-medium text-gray-500 hover:text-[var(--brand-primary)] data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
              >
                Products
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="rounded-full px-6 py-1.5 text-sm font-medium text-gray-500 hover:text-[var(--brand-primary)] data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
              >
                Reviews
              </TabsTrigger>
              <TabsTrigger
                value="about"
                className="rounded-full px-6 py-1.5 text-sm font-medium text-gray-500 hover:text-[var(--brand-primary)] data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
              >
                About Store
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Products Tab */}
          <TabsContent value="products">
            <div className="space-y-6">
              {/* Filters and Controls */}
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-[150px] h-9 bg-white border-0 rounded-lg text-[var(--text-headline)] text-sm font-medium shadow-md hover:shadow-lg transition-all px-4 focus:ring-0">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-0 p-1 shadow-xl bg-white">
                        <SelectItem
                          value="all"
                          className="rounded-lg data-[state=checked]:text-white data-[state=checked]:bg-[var(--brand-primary)] focus:bg-[var(--brand-primary)] focus:text-white [&:not(:focus)]:data-[state=checked]:bg-transparent [&:not(:focus)]:data-[state=checked]:text-[var(--brand-primary)] cursor-pointer font-medium py-1.5 px-3 mb-1 text-sm transition-colors"
                        >
                          All Categories
                        </SelectItem>
                        {sellerCategories.map((cat) => (
                          <SelectItem
                            key={cat}
                            value={cat}
                            className="rounded-lg data-[state=checked]:text-white data-[state=checked]:bg-[var(--brand-primary)] focus:bg-[var(--brand-primary)] focus:text-white [&:not(:focus)]:data-[state=checked]:bg-transparent [&:not(:focus)]:data-[state=checked]:text-[var(--brand-primary)] cursor-pointer font-medium py-1.5 px-3 mb-1 text-sm transition-colors last:mb-0"
                          >
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[150px] h-9 bg-white border-0 rounded-lg text-[var(--text-headline)] text-sm font-medium shadow-md hover:shadow-lg transition-all px-4 focus:ring-0">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-0 p-1 shadow-xl bg-white">
                        <SelectItem
                          value="popular"
                          className="rounded-lg data-[state=checked]:text-white data-[state=checked]:bg-[var(--brand-primary)] focus:bg-[var(--brand-primary)] focus:text-white [&:not(:focus)]:data-[state=checked]:bg-transparent [&:not(:focus)]:data-[state=checked]:text-[var(--brand-primary)] cursor-pointer font-medium py-1.5 px-3 mb-1 text-sm transition-colors"
                        >
                          Popular
                        </SelectItem>
                        <SelectItem
                          value="newest"
                          className="rounded-lg data-[state=checked]:text-white data-[state=checked]:bg-[var(--brand-primary)] focus:bg-[var(--brand-primary)] focus:text-white [&:not(:focus)]:data-[state=checked]:bg-transparent [&:not(:focus)]:data-[state=checked]:text-[var(--brand-primary)] cursor-pointer font-medium py-1.5 px-3 mb-1 text-sm transition-colors"
                        >
                          Newest
                        </SelectItem>
                        <SelectItem
                          value="price-low"
                          className="rounded-lg data-[state=checked]:text-white data-[state=checked]:bg-[var(--brand-primary)] focus:bg-[var(--brand-primary)] focus:text-white [&:not(:focus)]:data-[state=checked]:bg-transparent [&:not(:focus)]:data-[state=checked]:text-[var(--brand-primary)] cursor-pointer font-medium py-1.5 px-3 mb-1 text-sm transition-colors"
                        >
                          Price: Low to High
                        </SelectItem>
                        <SelectItem
                          value="price-high"
                          className="rounded-lg data-[state=checked]:text-white data-[state=checked]:bg-[var(--brand-primary)] focus:bg-[var(--brand-primary)] focus:text-white [&:not(:focus)]:data-[state=checked]:bg-transparent [&:not(:focus)]:data-[state=checked]:text-[var(--brand-primary)] cursor-pointer font-medium py-1.5 px-3 last:mb-0 text-sm transition-colors"
                        >
                          Price: High to Low
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div></div>
              </div>

              {/* Products Grid */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  "grid gap-4",
                  viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5' : 'grid-cols-1'
                )}
              >
                {filteredProducts.map((product, index) => (
                  <StorefrontProductCard
                    key={product.id}
                    product={product}
                    index={index}
                    seller={seller}
                    profile={profile}
                    onAddToCart={(p) => {
                      handleAddToCart(p);
                      setAddedProduct({ name: p.name, image: p.image });
                      setShowCartModal(true);
                    }}
                    onBuyNow={onBuyNow}
                    onVariantSelect={onVariantSelect}
                    onLoginRequired={onLoginRequired}
                  />
                ))}
              </motion.div>
            </div>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <StorefrontReviewsTab
              reviewStats={reviewStats}
              seller={seller}
              reviews={reviews}
              reviewFilter={reviewFilter}
              setReviewFilter={setReviewFilter}
              reviewsStartRef={reviewsStartRef}
              handleToggleLike={handleToggleLike}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyText={replyText}
              setReplyText={setReplyText}
              handlePostReply={handlePostReply}
            />
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-0 shadow-md overflow-hidden bg-white rounded-2xl">
                <CardContent className="p-0 divide-y divide-gray-100">

                  {/* Description */}
                  {seller.description && (
                    <div className="p-6">
                      <h3 className="font-semibold text-base text-gray-900 mb-2">About {seller.name}</h3>
                      <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-line">{seller.description}</p>
                    </div>
                  )}

                  {/* Store Information */}
                  <div className="p-6">
                    <h3 className="font-semibold text-base text-gray-900 mb-4">Store Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500 w-32 shrink-0">Store Name</span>
                        <span className="text-sm font-medium text-gray-900">{seller.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500 w-32 shrink-0">Location</span>
                        <span className="text-sm font-medium text-gray-900">{seller.location}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500 w-32 shrink-0">Established</span>
                        <span className="text-sm font-medium text-gray-900">{seller.established}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500 w-32 shrink-0">Response Time</span>
                        <span className="text-sm font-medium text-gray-900">{seller.responseTime}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500 w-32 shrink-0">Followers</span>
                        <span className="text-sm font-medium text-gray-900">{followersCount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="p-6">
                    <h3 className="font-semibold text-base text-gray-900 mb-3">Categories</h3>
                    <div className="text-sm text-gray-500">
                      {(sellerCategories.length > 0 ? sellerCategories : seller.categories).join(' | ')}
                    </div>
                  </div>

                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

        </Tabs>
      </div>

      {
        addedProduct && showCartModal && (
          <CartModal
            isOpen={showCartModal}
            onClose={() => setShowCartModal(false)}
            productName={addedProduct.name}
            productImage={addedProduct.image}
            cartItemCount={cartItems.length}
          />
        )
      }

      <ShopBuyNowModal
        isOpen={showBuyNowModal}
        onClose={() => {
          setShowBuyNowModal(false);
          setBuyNowProduct(null);
        }}
        product={buyNowProduct}
      />

      {
        variantProduct && showVariantModal && (
          <ShopVariantModal
            isOpen={showVariantModal}
            onClose={() => {
              setShowVariantModal(false);
              setVariantProduct(null);
              setIsBuyNowAction(false);
            }}
            product={variantProduct}
            isBuyNow={isBuyNowAction}
            onAddToCartSuccess={(name, image) => {
              setAddedProduct({ name, image });
              setShowCartModal(true);
            }}
          />
        )
      }
      <BazaarFooter />
    </div >
  );
}
