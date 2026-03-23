import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { supabase } from '@/lib/supabase';
import { useBuyerStore } from '../stores/buyerStore';
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
  Users,
  Loader2
} from 'lucide-react';

interface FollowedShop {
  id: string;
  name: string;
  logo: string;
  description: string;
  location: string;
  productCount: number;
  followerCount: number;
  isVerified: boolean;
}

export default function BuyerFollowingPage() {
  const navigate = useNavigate();
  const { unfollowShop, loadFollowedShops, followedShops } = useBuyerStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [shops, setShops] = useState<FollowedShop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFollowedShops();
  }, []);

  useEffect(() => {
    const fetchShopDetails = async () => {
      if (followedShops.length === 0) {
        setShops([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data: sellers } = await supabase
          .from('sellers')
          .select('id, store_name, store_description, avatar_url, approval_status')
          .in('id', followedShops);

        if (!sellers) {
          setShops([]);
          setLoading(false);
          return;
        }

        // Get product counts and follower counts in parallel
        const shopList: FollowedShop[] = await Promise.all(
          sellers.map(async (seller) => {
            const [productRes, followerRes] = await Promise.all([
              supabase.from('products').select('id', { count: 'exact', head: true }).eq('seller_id', seller.id).is('deleted_at', null),
              supabase.from('store_followers').select('id', { count: 'exact', head: true }).eq('seller_id', seller.id),
            ]);

            return {
              id: seller.id,
              name: seller.store_name || 'Unnamed Shop',
              logo: seller.avatar_url || '',
              description: seller.store_description || '',
              location: '',
              productCount: productRes.count || 0,
              followerCount: followerRes.count || 0,
              isVerified: seller.approval_status === 'verified',
            };
          })
        );

        setShops(shopList);
      } catch (err) {
        console.error('Failed to load followed shops:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchShopDetails();
  }, [followedShops]);

  const filteredShops = shops.filter(shop =>
    shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shop.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUnfollow = async (shopId: string) => {
    await unfollowShop(shopId);
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
            onClick={() => navigate('/shop')}
            className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-all group mb-4"
          >
            <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Shop</span>
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
          {loading ? (
            <div className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
            </div>
          ) : filteredShops.length === 0 ? (
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
                  {/* Header gradient */}
                  <div className="relative h-24 bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-accent-light)]/30 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    {shop.isVerified && (
                      <Badge className="absolute top-2 right-2 bg-green-500/90 text-white text-[10px]">Verified</Badge>
                    )}
                  </div>

                  <CardContent className="p-5 flex-1 flex flex-col">
                    {/* Shop Brand Area */}
                    <div className="flex items-center gap-3 mb-3">
                      {shop.logo ? (
                        <img loading="lazy" 
                          src={shop.logo}
                          alt={shop.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-orange-50 shadow-sm shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[var(--brand-primary)]/10 border-2 border-orange-50 flex items-center justify-center shrink-0">
                          <Store className="h-5 w-5 text-[var(--brand-primary)]" />
                        </div>
                      )}
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
                          {shop.productCount} products
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-[var(--text-muted)] line-clamp-3 mb-4 flex-1">
                      {shop.description || 'No description available'}
                    </p>

                    <div className="pt-4 border-t border-gray-50 mt-auto flex items-center justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                          <Package className="h-3.5 w-3.5 text-gray-400" />
                          <span>{shop.productCount} Products</span>
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
