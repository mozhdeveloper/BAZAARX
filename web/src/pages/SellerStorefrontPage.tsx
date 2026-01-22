import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useBuyerStore, demoSellers } from '../stores/buyerStore';
import Header from '../components/Header';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
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
  List
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { useProductStore } from '../stores/sellerStore';

export default function SellerStorefrontPage() {
  const { sellerId } = useParams();
  const {
    followShop,
    unfollowShop,
    isFollowing,
    addToCart,
    addViewedSeller
  } = useBuyerStore();
  const { products: allProducts } = useProductStore();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('popular');

  // Get seller data
  const demoSeller = demoSellers.find(s => s.id === sellerId);

  // Try to find seller from products if not in demo
  const dbSellerProduct = !demoSeller ? allProducts.find(p => p.sellerId === sellerId) : null;

  const seller = demoSeller || (dbSellerProduct ? {
    id: dbSellerProduct.sellerId,
    name: dbSellerProduct.sellerName || "Verified Seller",
    avatar: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=150&h=150&fit=crop', // Default avatar
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

  // Demo products for the seller
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

  const filteredProducts = selectedCategory === 'all'
    ? demoProducts
    : demoProducts.filter(p => p.category === selectedCategory);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Seller Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-6"
          >
            <img
              src={seller.avatar}
              alt={seller.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-orange-100"
            />
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900">{seller.name}</h1>
                    {seller.isVerified && (
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        <Shield className="h-4 w-4 mr-1" />
                        Verified Seller
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-600 mb-4 max-w-2xl">{seller.description}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Star className="h-4 w-4 fill-current text-yellow-400" />
                        <span className="text-2xl font-bold text-gray-900">{seller.rating}</span>
                      </div>
                      <div className="text-sm text-gray-500">{seller.totalReviews.toLocaleString()} reviews</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600 mb-1">{seller.followers.toLocaleString()}</div>
                      <div className="text-sm text-gray-500">Followers</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-lg font-semibold text-gray-900">{seller.responseTime}</span>
                      </div>
                      <div className="text-sm text-gray-500">Response time</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-lg font-semibold text-gray-900">{seller.established}</span>
                      </div>
                      <div className="text-sm text-gray-500">Established</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{seller.location}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {seller.badges.map((badge, index) => (
                      <Badge key={index} variant="outline" className="text-orange-600 border-orange-200">
                        <Award className="h-3 w-3 mr-1" />
                        {badge}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button
                    onClick={() => isFollowing(seller.id) ? unfollowShop(seller.id) : followShop(seller.id)}
                    variant={isFollowing(seller.id) ? 'outline' : 'default'}
                    className={isFollowing(seller.id)
                      ? 'text-red-600 border-red-200 hover:bg-red-50'
                      : 'bg-orange-500 hover:bg-orange-600'
                    }
                  >
                    <Heart className={cn('h-4 w-4 mr-2', isFollowing(seller.id) && 'fill-current')} />
                    {isFollowing(seller.id) ? 'Unfollow' : 'Follow'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Store Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="about">About Store</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <div className="space-y-6">
              {/* Filters and Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="all">All Categories</option>
                      {seller.categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Sort by:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="popular">Popular</option>
                      <option value="newest">Newest</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
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
              className="space-y-6"
            >
              {/* Review Summary */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-900 mb-1">{seller.rating}</div>
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-4 w-4",
                              i < Math.floor(seller.rating) ? "fill-current text-yellow-400" : "text-gray-300"
                            )}
                          />
                        ))}
                      </div>
                      <div className="text-sm text-gray-500">{seller.totalReviews.toLocaleString()} reviews</div>
                    </div>
                    <div className="flex-1">
                      {[5, 4, 3, 2, 1].map((star) => (
                        <div key={star} className="flex items-center gap-2 mb-1">
                          <span className="text-sm w-6">{star}</span>
                          <Star className="h-3 w-3 fill-current text-yellow-400" />
                          <div className="flex-1 h-2 bg-gray-200 rounded">
                            <div
                              className="h-full bg-yellow-400 rounded"
                              style={{ width: `${star === 5 ? 70 : star === 4 ? 20 : star === 3 ? 6 : star === 2 ? 3 : 1}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-500 w-8">
                            {star === 5 ? '70%' : star === 4 ? '20%' : star === 3 ? '6%' : star === 2 ? '3%' : '1%'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sample Reviews */}
              <div className="space-y-4">
                {[1, 2, 3].map((review) => (
                  <Card key={review}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <img
                          src={`https://images.unsplash.com/photo-159475010875${review}?w=40&h=40&fit=crop&crop=face`}
                          alt="Reviewer"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold">Maria S.</span>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-current text-yellow-400" />
                              ))}
                            </div>
                            <span className="text-sm text-gray-500">2 days ago</span>
                          </div>
                          <p className="text-gray-700 mb-3">
                            Excellent seller! Fast shipping and product exactly as described. Highly recommended!
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <button className="hover:text-orange-600">Helpful (12)</button>
                            <button className="hover:text-orange-600">Reply</button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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