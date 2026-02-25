import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Heart,
  Star,
  MapPin,
  Package,
  TrendingUp,
  Search,
  Store,
  ChevronRight
} from 'lucide-react';

// Mock followed shops data
const mockFollowedShops = [
  {
    id: '1',
    name: 'TechHub Manila',
    logo: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=100',
    banner: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800',
    description: 'Your one-stop shop for premium electronics and gadgets',
    category: 'Electronics',
    location: 'Makati, Metro Manila',
    rating: 4.8,
    reviewCount: 2341,
    productCount: 156,
    followerCount: 12500,
    isVerified: true,
    lastActive: '2 hours ago',
    tags: ['Fast Shipping', 'Verified', 'Top Rated']
  },
  {
    id: '2',
    name: 'Manila Leather Co.',
    logo: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=100',
    banner: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
    description: 'Handcrafted leather goods made by Filipino artisans',
    category: 'Fashion',
    location: 'Pasig, Metro Manila',
    rating: 4.9,
    reviewCount: 856,
    productCount: 89,
    followerCount: 8200,
    isVerified: true,
    lastActive: '1 day ago',
    tags: ['Handmade', 'Local Artisan', 'Eco-Friendly']
  },
  {
    id: '3',
    name: 'BayanBrew Coffee',
    logo: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=100',
    banner: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800',
    description: 'Premium organic coffee beans from Philippine highlands',
    category: 'Food & Beverages',
    location: 'Benguet',
    rating: 4.7,
    reviewCount: 1234,
    productCount: 45,
    followerCount: 15600,
    isVerified: true,
    lastActive: '3 hours ago',
    tags: ['Organic', 'Local Source', 'Sustainable']
  },
  {
    id: '4',
    name: 'Home & Garden PH',
    logo: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=100',
    banner: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800',
    description: 'Beautiful plants and garden accessories for your home',
    category: 'Home & Garden',
    location: 'Quezon City',
    rating: 4.6,
    reviewCount: 678,
    productCount: 234,
    followerCount: 6800,
    isVerified: false,
    lastActive: '5 hours ago',
    tags: ['Plants', 'Home Decor', 'Garden']
  }
];

export default function BuyerFollowingPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [unfollowedShops, setUnfollowedShops] = useState<Set<string>>(new Set());

  const filteredShops = mockFollowedShops.filter(shop =>
    !unfollowedShops.has(shop.id) &&
    (shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleUnfollow = (shopId: string) => {
    setUnfollowedShops(prev => new Set(prev).add(shopId));
  };

  const handleVisitShop = (shopId: string) => {
    navigate(`/seller/${shopId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Following</h1>
          <p className="text-gray-600">Shops you're following</p>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Following</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredShops.length}</p>
                </div>
                <Store className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Verified Shops</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {filteredShops.filter(s => s.isVerified).length}
                  </p>
                </div>
                <Badge className="bg-blue-500 text-white">✓</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {filteredShops.reduce((acc, s) => acc + s.productCount, 0)}
                  </p>
                </div>
                <Package className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Avg Rating</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(filteredShops.reduce((acc, s) => acc + s.rating, 0) / filteredShops.length).toFixed(1)}
                  </p>
                </div>
                <Star className="h-8 w-8 text-orange-500 fill-orange-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search followed shops..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Shops Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredShops.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="col-span-2"
            >
              <Card>
                <CardContent className="p-12 text-center">
                  <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg mb-2">No shops found</p>
                  <p className="text-gray-400 text-sm">
                    {searchQuery
                      ? 'Try a different search term'
                      : 'Start following shops to see them here!'}
                  </p>
                  <Button
                    onClick={() => navigate('/shop')}
                    className="mt-6 bg-orange-500 hover:bg-orange-600"
                  >
                    Discover Shops
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            filteredShops.map((shop, index) => (
              <motion.div
                key={shop.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
                  {/* Banner */}
                  <div className="relative h-32 overflow-hidden">
                    <img
                      src={shop.banner}
                      alt={shop.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <Badge className="absolute top-3 right-3 bg-white/90 text-gray-900">
                      {shop.category}
                    </Badge>
                  </div>

                  <CardContent className="p-6">
                    {/* Shop Info */}
                    <div className="flex items-start gap-4 mb-4">
                      <img
                        src={shop.logo}
                        alt={shop.name}
                        className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md -mt-10 relative z-10"
                      />
                      <div className="flex-1 mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg text-gray-900">{shop.name}</h3>
                          {shop.isVerified && (
                            <Badge className="bg-blue-500 text-white text-xs px-2 py-0">
                              ✓ Verified
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{shop.description}</p>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {shop.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4 py-3 border-t border-b border-gray-100">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
                          <Star className="h-4 w-4 fill-orange-500" />
                          <span className="font-semibold">{shop.rating}</span>
                        </div>
                        <p className="text-xs text-gray-500">{shop.reviewCount} reviews</p>
                      </div>
                      <div className="text-center border-x border-gray-100">
                        <div className="font-semibold text-gray-900 mb-1">{shop.productCount}</div>
                        <p className="text-xs text-gray-500">Products</p>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-900 mb-1">
                          {shop.followerCount.toLocaleString()}
                        </div>
                        <p className="text-xs text-gray-500">Followers</p>
                      </div>
                    </div>

                    {/* Location & Activity */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{shop.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <TrendingUp className="h-4 w-4" />
                        <span>Active {shop.lastActive}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => handleVisitShop(shop.id)}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        Visit Shop
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                      <Button
                        onClick={() => handleUnfollow(shop.id)}
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Heart className="h-4 w-4 mr-2 fill-current" />
                        Unfollow
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <BazaarFooter />
    </div>
  );
}
