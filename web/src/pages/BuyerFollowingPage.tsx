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
  ChevronRight,
  ChevronLeft,
  Users
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
    <div className="min-h-screen bg-[var(--brand-wash)]">
      <Header />

      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-orange-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-yellow-100/40 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-all group mb-4"
          >
            <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          </button>

          <h1 className="text-3xl font-extrabold font-heading text-[var(--text-headline)] tracking-tight mb-2">Following</h1>
          <p className="text-[var(--text-muted)] -mb-4">Shops you're following</p>
        </motion.div>



        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-[var(--text-muted)]">Total Following</span>
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-[var(--brand-primary)]" />
              <span className="text-xl font-medium text-[var(--brand-primary)] leading-none">{filteredShops.length}</span>
            </div>
          </div>

          <div className="relative w-full sm:w-80 lg:w-96 flex-shrink-0 self-center">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[var(--brand-primary)] w-4 h-4" />
            <input
              type="text"
              placeholder="Search followed shops..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 border-2 border-[var(--brand-wash-gold)]/20 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/10 focus:border-[var(--brand-primary)] bg-white text-xs sm:text-sm text-[var(--text-headline)] placeholder-[var(--text-muted)] shadow-sm transition-all hover:border-[var(--brand-primary)]/30 h-10"
            />
          </div>
        </motion.div>

        {/* Shops Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredShops.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4"
            >
              <Card>
                <CardContent className="p-12 text-center">
                  <Heart className="h-16 w-16 text-[var(--text-muted)] mx-auto mb-4" />
                  <p className="text-[var(--text-muted)] text-lg mb-2">No shops found</p>
                  <p className="text-[var(--text-muted)] text-sm">
                    {searchQuery
                      ? 'Try a different search term'
                      : 'Start following shops to see them here!'}
                  </p>
                  <Button
                    onClick={() => navigate('/shop')}
                    className="mt-6 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
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
                <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 group h-full flex flex-col">
                  {/* Banner */}
                  <div className="relative h-32 overflow-hidden">
                    <img
                      src={shop.banner}
                      alt={shop.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                  </div>

                  <CardContent className="p-5 flex-1 flex flex-col">
                    {/* Shop Brand Area */}
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src={shop.logo}
                        alt={shop.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-orange-50 shadow-sm shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-bold text-base text-[var(--text-headline)] leading-tight truncate">
                            {shop.name}
                          </h3>
                          <button
                            onClick={() => handleVisitShop(shop.id)}
                            className="p-1 rounded-full hover:bg-orange-50 text-[var(--brand-primary)] transition-all group/visit shrink-0"
                          >
                            <ChevronRight className="h-4 w-4 group-hover/visit:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] line-clamp-1">
                          {shop.location}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-[var(--text-muted)] line-clamp-3 mb-4 flex-1">
                      {shop.description}
                    </p>

                    <div className="pt-4 border-t border-gray-50 mt-auto flex items-center justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-[var(--brand-primary)] text-[var(--brand-primary)]" />
                          <span className="text-[11px] font-bold text-[var(--brand-primary)]">{shop.rating}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                          <Users className="h-3.5 w-3.5 text-gray-400" />
                          <span>{shop.followerCount.toLocaleString()} Followers</span>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleUnfollow(shop.id)}
                        variant="outline"
                        className="text-[var(--brand-primary)] border-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white hover:border-[var(--brand-primary)] px-4 h-9 text-xs font-semibold transition-all duration-300 rounded-full shrink-0"
                      >
                        Following
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
