import { useState, useEffect } from 'react';
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
  Grid,
  List,
  ThumbsUp,
  Loader2
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

import { useProductStore } from '../stores/sellerStore';
import { sellerService, type SellerData } from '../services/sellerService';
import { ProductService } from '../services/productService';
import { reviewService } from '../services/reviewService';
import type { ProductWithSeller } from '@/types/database.types';

interface Reply {
  id: number;
  text: string;
  author: string;
  date: string;
  avatar: string;
  isSeller?: boolean;
}

interface Review {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  content: string;
  helpfulCount: number;
  isLiked?: boolean;
  replies: Reply[];
  productName?: string;
  productImage?: string;
  images?: string[];
}

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

  // Real data state
  const [realSeller, setRealSeller] = useState<SellerData | null>(null);
  const [realProducts, setRealProducts] = useState<ProductWithSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [realReviews, setRealReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<{ total: number; avgRating: number; distribution: number[] }>({
    total: 0,
    avgRating: 0,
    distribution: [0, 0, 0, 0, 0] // 1-5 stars
  });

  const [reviews, setReviews] = useState<Review[]>([]);

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

        // Fetch real reviews for this seller
        try {
          const reviewsData = await reviewService.getSellerReviews(sellerId);
          if (reviewsData && reviewsData.length > 0) {
            // Map database reviews to UI format
            const mappedReviews: Review[] = reviewsData.map((r: any) => ({
              id: r.id,
              author: r.buyer?.full_name || 'Anonymous Buyer',
              avatar: r.buyer?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.buyer?.full_name || 'A')}&background=FF6A00&color=fff`,
              rating: r.rating,
              date: formatRelativeDate(r.created_at),
              content: r.comment || 'Great product!',
              helpfulCount: r.helpful_count || 0,
              isLiked: false,
              replies: r.seller_reply ? [{
                id: 1,
                text: typeof r.seller_reply === 'string' ? r.seller_reply : r.seller_reply.text || '',
                author: 'Seller',
                date: r.seller_reply_at ? formatRelativeDate(r.seller_reply_at) : 'Recently',
                avatar: sellerData?.business_permit_url || 'https://ui-avatars.com/api/?name=S&background=FF6A00&color=fff',
                isSeller: true
              }] : [],
              productName: r.product?.name || undefined,
              productImage: r.product?.images?.[0] || undefined,
              images: r.images || []
            }));
            
            setRealReviews(mappedReviews);
            setReviews(mappedReviews);

            // Calculate review statistics
            const total = mappedReviews.length;
            const avgRating = total > 0 
              ? mappedReviews.reduce((sum, r) => sum + r.rating, 0) / total 
              : 0;
            const distribution = [0, 0, 0, 0, 0];
            mappedReviews.forEach(r => {
              if (r.rating >= 1 && r.rating <= 5) {
                distribution[r.rating - 1]++;
              }
            });
            setReviewStats({ total, avgRating, distribution });
          }
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
    name: realSeller.business_name || 'Verified Seller',
    avatar: realSeller.profile_picture || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=150&h=150&fit=crop',
    rating: (realSeller as any).rating || 5.0,
    totalReviews: (realSeller as any).products_count || 0,
    followers: 0,
    isVerified: realSeller.is_verified || false,
    description: realSeller.business_description || 'Welcome to our store!',
    location: realSeller.city || realSeller.region || 'Philippines',
    established: realSeller.created_at ? new Date(realSeller.created_at).getFullYear().toString() : '2024',
    badges: realSeller.is_verified ? ['Verified Seller'] : [],
    responseTime: '< 24 hours',
    categories: realSeller.product_categories || ['General'],
    products: []
  } : demoSeller || (dbSellerProduct ? {
    id: dbSellerProduct.sellerId,
    name: dbSellerProduct.sellerName || "Verified Seller",
    avatar: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=150&h=150&fit=crop',
    rating: dbSellerProduct.sellerRating || 5.0,
    totalReviews: 10,
    followers: 5,
    isVerified: true,
    description: 'Welcome to our store!',
    location: dbSellerProduct.sellerLocation || 'Metro Manila',
    established: '2024',
    badges: ['Verified Seller'],
    responseTime: '< 24 hours',
    categories: ['General'],
    products: []
  } : demoSellers[0]);

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
        image: p.primary_image || (p.images && p.images[0]) || 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=400&h=400&fit=crop',
        rating: p.rating || 5.0,
        sold: p.sales_count || 0,
        category: p.category || 'General',
        isFreeShipping: p.is_free_shipping || false
      }))
    : demoProducts;

  const filteredProducts = selectedCategory === 'all'
    ? displayProducts
    : displayProducts.filter(p => p.category === selectedCategory);

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

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header hideSearch />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6A00]" />
            <p className="text-gray-500">Loading store...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
              className="hover:bg-white/10 px-3 -ml-2 text-white/80 hover:text-white transition-all rounded-full backdrop-blur-md bg-white/5"
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
              {seller.isVerified && (
                <div className="absolute bottom-2 right-2 bg-[#FF6A00] text-white p-1.5 rounded-full shadow-lg border-[3px] border-[#1a0b02]">
                  <Shield className="w-4 h-4 fill-current" />
                </div>
              )}
            </div>

            {/* Store Details */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  {seller.name}
                </h1>
                {seller.isVerified && (
                  <Badge className="bg-white text-[#FF6A00] hover:bg-white border-none py-0.5 px-3 hidden md:flex items-center gap-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Verified Store
                  </Badge>
                )}
              </div>

              <div className="flex flex-col gap-1 mb-5">
                <div className="flex items-center justify-center md:justify-start gap-4 text-white/80 text-sm font-medium">
                  <span className="flex items-center">
                    {seller.location}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500/50 hidden md:block" />
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
                      ? "bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-md"
                      : "bg-[#FF6A00] text-white hover:bg-[#E65A00] shadow-lg shadow-orange-600/20"
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
                  className="h-10 px-8 rounded-xl font-bold bg-transparent border-2 border-white/20 text-white hover:bg-white hover:text-[#1a0b02] transition-all min-w-[130px]"
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
        <Tabs defaultValue="products" className="space-y-4">
          <div className="sticky top-20 z-30 flex justify-center w-full mb-4 py-2 backdrop-blur-[2px]">
            <TabsList className="inline-flex h-auto items-center justify-center rounded-full bg-gray-100/80 p-1">
              <TabsTrigger
                value="products"
                className="rounded-full px-6 py-1.5 text-sm font-medium text-gray-500 data-[state=active]:bg-white data-[state=active]:text-[#ff6a00] data-[state=active]:shadow-sm transition-all"
              >
                Products
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="rounded-full px-6 py-1.5 text-sm font-medium text-gray-500 data-[state=active]:bg-white data-[state=active]:text-[#ff6a00] data-[state=active]:shadow-sm transition-all"
              >
                Reviews
              </TabsTrigger>
              <TabsTrigger
                value="about"
                className="rounded-full px-6 py-1.5 text-sm font-medium text-gray-500 data-[state=active]:bg-white data-[state=active]:text-[#ff6a00] data-[state=active]:shadow-sm transition-all"
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
                      <SelectTrigger className="w-[160px] h-8 bg-white border-gray-200 rounded-[12px] text-gray-700 text-[13px] focus:ring-1 focus:ring-orange-100 focus:ring-offset-0 shadow-sm hover:border-gray-300 hover:shadow-md transition-all px-4">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-gray-100 p-1 shadow-xl">
                        <SelectItem
                          value="all"
                          className="rounded-xl data-[state=checked]:bg-[#ff6a00] data-[state=checked]:text-white focus:bg-orange-50 focus:text-[#ff6a00] cursor-pointer"
                        >
                          All Categories
                        </SelectItem>
                        {seller.categories.map((cat) => (
                          <SelectItem
                            key={cat}
                            value={cat}
                            className="rounded-xl data-[state=checked]:bg-[#ff6a00] data-[state=checked]:text-white focus:bg-orange-50 focus:text-[#ff6a00] cursor-pointer"
                          >
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[160px] h-8 bg-white border-gray-200 rounded-[12px] text-gray-700 text-[13px] focus:ring-1 focus:ring-orange-100 focus:ring-offset-0 shadow-sm hover:border-gray-300 hover:shadow-md transition-all px-4">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-gray-100 p-1 shadow-xl">
                        <SelectItem
                          value="popular"
                          className="rounded-xl data-[state=checked]:bg-[#ff6a00] data-[state=checked]:text-white focus:bg-orange-50 focus:text-[#ff6a00] cursor-pointer"
                        >
                          Popular
                        </SelectItem>
                        <SelectItem
                          value="newest"
                          className="rounded-xl data-[state=checked]:bg-[#ff6a00] data-[state=checked]:text-white focus:bg-orange-50 focus:text-[#ff6a00] cursor-pointer"
                        >
                          Newest
                        </SelectItem>
                        <SelectItem
                          value="price-low"
                          className="rounded-xl data-[state=checked]:bg-[#ff6a00] data-[state=checked]:text-white focus:bg-orange-50 focus:text-[#ff6a00] cursor-pointer"
                        >
                          Price: Low to High
                        </SelectItem>
                        <SelectItem
                          value="price-high"
                          className="rounded-xl data-[state=checked]:bg-[#ff6a00] data-[state=checked]:text-white focus:bg-orange-50 focus:text-[#ff6a00] cursor-pointer"
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
                  "grid gap-6",
                  viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'
                )}
              >
                {filteredProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
                      <div className="relative">
                        <img
                          src={product.image}
                          alt={product.name}
                          className={cn(
                            "w-full object-cover group-hover:scale-105 transition-transform",
                            viewMode === 'grid' ? 'h-48' : 'h-32 md:h-48'
                          )}
                        />
                        {product.originalPrice && (
                          <Badge className="absolute top-2 left-2 bg-red-500">
                            {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
                          </Badge>
                        )}
                        {product.isFreeShipping && (
                          <Badge variant="outline" className="absolute top-2 right-2 bg-white text-green-600">
                            <Truck className="h-3 w-3 mr-1" />
                            Free Ship
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <div className={cn(
                          "space-y-3",
                          viewMode === 'list' && 'flex items-center gap-4'
                        )}>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">{product.name}</h3>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-current text-yellow-400" />
                                <span className="text-sm text-gray-600">{product.rating}</span>
                              </div>
                              <span className="text-gray-300">•</span>
                              <span className="text-sm text-gray-600">{product.sold} sold</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-orange-600">
                                ₱{product.price.toLocaleString()}
                              </span>
                              {product.originalPrice && (
                                <span className="text-sm text-gray-500 line-through">
                                  ₱{product.originalPrice.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            onClick={() => handleAddToCart(product)}
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600 w-full"
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Add to Cart
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start"
            >
              {/* Sticky Rating Summary (Left Sidebar) */}
              <div className="md:col-span-5 lg:col-span-4 sticky top-36">
                <div>
                  <div className="text-center mb-2">
                    <div className="text-4xl font-bold text-gray-900 leading-none mb-1">
                      {reviewStats.total > 0 ? reviewStats.avgRating.toFixed(1) : seller.rating}
                    </div>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-3 w-3",
                            i < Math.floor(reviewStats.total > 0 ? reviewStats.avgRating : seller.rating) 
                              ? "fill-current text-yellow-400" 
                              : "text-gray-300"
                          )}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">
                      {reviewStats.total > 0 ? reviewStats.total.toLocaleString() : seller.totalReviews.toLocaleString()} reviews
                    </div>
                  </div>

                  <div className="space-y-1">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = reviewStats.distribution[star - 1] || 0;
                      const percentage = reviewStats.total > 0 
                        ? Math.round((count / reviewStats.total) * 100) 
                        : (star === 5 ? 70 : star === 4 ? 20 : star === 3 ? 6 : star === 2 ? 3 : 1);
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <div className="flex items-center justify-end gap-1.5 w-12 shrink-0">
                            <span className="text-sm font-medium text-gray-700">{star}</span>
                            <Star className="h-3 w-3 fill-current text-yellow-400" />
                          </div>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-400 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-8 text-right tabular-nums">
                            {percentage}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Reviews List (Right Content) */}
              <div className="md:col-span-7 lg:col-span-8 space-y-4">
                {/* Review Filters */}
                <div className="sticky top-36 z-20 flex flex-wrap items-center gap-2 mb-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                  {['all', '5', '4', '3', '2', '1', 'media'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setReviewFilter(filter)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border",
                        reviewFilter === filter
                          ? "bg-orange-50 text-orange-600 border-orange-200"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      {filter === 'all' ? 'All' : filter === 'media' ? 'With Media' : `${filter} Star${filter === '1' ? '' : 's'}`}
                    </button>
                  ))}
                </div>

                {/* Filter reviews based on selected filter */}
                {(() => {
                  const filteredReviews = reviews.filter(review => {
                    if (reviewFilter === 'all') return true;
                    if (reviewFilter === 'media') return review.images && review.images.length > 0;
                    return review.rating === parseInt(reviewFilter);
                  });

                  if (filteredReviews.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <div className="text-gray-400 mb-2">
                          <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">No Reviews Yet</h3>
                        <p className="text-gray-500 text-sm">
                          {reviewFilter === 'all' 
                            ? 'Be the first to review products from this store!'
                            : `No ${reviewFilter === 'media' ? 'reviews with photos' : `${reviewFilter}-star reviews`} found.`}
                        </p>
                      </div>
                    );
                  }

                  return filteredReviews.map((review) => (
                  <Card key={review.id} className="border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <img
                          src={review.avatar}
                          alt={review.author}
                          className="w-10 h-10 rounded-full object-cover border border-gray-100"
                        />
                        <div className="flex-1">
                          <div className="mb-2">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900 text-sm">{review.author}</span>
                              <span className="text-xs text-gray-400 mb-1">{review.date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    "h-3 w-3",
                                    i < review.rating ? "fill-current text-yellow-400" : "text-gray-200"
                                  )}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Product info if available */}
                          {review.productName && (
                            <div className="flex items-center gap-2 mb-2 bg-gray-50 rounded-lg p-2">
                              {review.productImage && (
                                <img 
                                  src={review.productImage} 
                                  alt={review.productName}
                                  className="w-8 h-8 rounded object-cover"
                                />
                              )}
                              <span className="text-xs text-gray-600">
                                Purchased: <span className="font-medium text-gray-800">{review.productName}</span>
                              </span>
                            </div>
                          )}

                          <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                            {review.content}
                          </p>

                          {/* Review Images if available */}
                          {review.images && review.images.length > 0 && (
                            <div className="flex gap-2 mb-3 flex-wrap">
                              {review.images.map((img, idx) => (
                                <img 
                                  key={idx}
                                  src={img} 
                                  alt={`Review image ${idx + 1}`}
                                  className="w-16 h-16 rounded-lg object-cover border border-gray-100 cursor-pointer hover:opacity-80 transition-opacity"
                                />
                              ))}
                            </div>
                          )}

                          {/* Existing Replies */}
                          {review.replies.length > 0 && (
                            <div className="mb-4 pl-4 border-l-2 border-gray-100 space-y-3">
                              {review.replies.map(reply => (
                                <div key={reply.id} className="bg-gray-50/50 p-3 rounded-lg">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-xs text-gray-900">{reply.author}</span>
                                    {reply.isSeller && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-orange-50 text-orange-600 border-orange-200">
                                        Seller
                                      </Badge>
                                    )}
                                    <span className="text-[10px] text-gray-400">{reply.date}</span>
                                  </div>
                                  <p className="text-xs text-gray-600 leading-relaxed">{reply.text}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                            <button
                              onClick={() => handleToggleLike(review.id)}
                              className={cn(
                                "transition-colors flex items-center gap-1.5 group",
                                review.isLiked ? "text-orange-600" : "hover:text-orange-600"
                              )}
                            >
                              <ThumbsUp className={cn(
                                "h-3.5 w-3.5 transition-colors",
                                review.isLiked ? "fill-current text-orange-600" : "group-hover:text-orange-600"
                              )} />
                              Helpful ({review.helpfulCount})
                            </button>
                            <button
                              onClick={() => setReplyingTo(replyingTo === review.id ? null : review.id)}
                              className="hover:text-orange-600 transition-colors"
                            >
                              Reply
                            </button>
                          </div>

                          {replyingTo === review.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0, marginTop: 0 }}
                              animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                              className="overflow-hidden"
                            >
                              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <Textarea
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Write a reply..."
                                  className="min-h-[80px] bg-white border-gray-200 focus:border-[#ff6a00] focus:ring-[#ff6a00] mb-3 text-sm resize-none"
                                />
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setReplyingTo(null)}
                                    className="h-8 text-xs hover:bg-gray-200 hover:text-gray-900"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handlePostReply(review.id)}
                                    className="h-8 text-xs bg-[#ff6a00] hover:bg-[#ff6a00]/90 text-white"
                                  >
                                    Post Reply
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ));
                })()}
              </div>
            </motion.div>
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Store Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Store Name:</span>
                      <span className="font-medium">{seller.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium">{seller.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Established:</span>
                      <span className="font-medium">{seller.established}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Response Time:</span>
                      <span className="font-medium">{seller.responseTime}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {seller.categories.map((category) => (
                      <Badge key={category} variant="outline">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
