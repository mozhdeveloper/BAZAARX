import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Star, MapPin, ChevronRight, Users, Store, Heart } from 'lucide-react';
import { SellerService, SellerData } from '@/services/sellerService';
import { useBuyerStore } from '@/stores/buyerStore';
import { featuredStores } from '@/data/stores';

interface FollowingSectionProps {
  followedShops?: string[];
}

export const FollowingSection = ({ followedShops = [] }: FollowingSectionProps) => {
  const navigate = useNavigate();
  const { unfollowShop } = useBuyerStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [realFollowedShops, setRealFollowedShops] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const prevShopsLength = useRef(followedShops.length);

  useEffect(() => {
    const fetchFollowedShops = async () => {
      if (followedShops.length === 0) {
        setRealFollowedShops([]);
        setIsLoading(false);
        prevShopsLength.current = 0;
        return;
      }

      // Only show full loading if it's the first load or if we are adding new shops
      // If we are just removing shops (unfollowing), skip the loading state for a snappier feel
      if (isLoading || followedShops.length > prevShopsLength.current) {
        setIsLoading(true);
      }

      try {
        const sellerService = SellerService.getInstance();

        // Filter for valid UUIDs to avoid database errors on mock IDs
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const dbIds = followedShops.filter(id => uuidRegex.test(id));

        let dbStores: any[] = [];
        if (dbIds.length > 0) {
          try {
            dbStores = await sellerService.getPublicStores({
              ids: dbIds,
              includeUnverified: true
            });
          } catch (dbError) {
            console.error('Database fetch for stores failed:', dbError);
          }
        }

        // Combine DB stores with featuredStores fallback
        const combinedStores = followedShops.map(id => {
          const dbStore = dbStores.find(s => s.id === id);
          if (dbStore) {
            const featured = featuredStores.find(f => f.id === id);
            return {
              id: dbStore.id,
              name: dbStore.store_name || dbStore.business_name || 'Verified Seller',
              logo: dbStore.avatar_url || featured?.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(dbStore.store_name || 'S')}&background=FB2F00&color=fff&size=100`,
              avatar: dbStore.avatar_url || featured?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(dbStore.store_name || 'S')}&background=FB2F00&color=fff&size=100`,
              banner: featured?.banner || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=200&fit=crop',
              rating: Number(dbStore.rating || 0) || featured?.rating || 0,
              followers: featured?.followers || '1k+',
              reviewCount: Number(dbStore.total_reviews || dbStore.review_count || featured?.totalReviews || 0),
              description: dbStore.store_description || featured?.description || `Quality products from ${dbStore.store_name}`,
              location: dbStore.city ? `${dbStore.city}, ${dbStore.province || ''}` : featured?.location || 'Philippines',
              isVerified: dbStore.approval_status === 'verified' || featured?.isVerified || false
            };
          }

          const featured = featuredStores.find(f => f.id === id);
          if (featured) {
            return {
              id: featured.id,
              name: featured.name,
              logo: featured.logo,
              avatar: featured.avatar,
              banner: featured.banner,
              rating: featured.rating,
              followers: featured.followers.toLocaleString(),
              reviewCount: featured.totalReviews,
              description: featured.description,
              location: featured.location,
              isVerified: featured.isVerified
            };
          }

          return null;
        }).filter(Boolean);

        setRealFollowedShops(combinedStores);
      } catch (error) {
        console.error('Error fetching followed shops:', error);
      } finally {
        setIsLoading(false);
        prevShopsLength.current = followedShops.length;
      }
    };

    fetchFollowedShops();
  }, [followedShops]);

  const filteredShops = realFollowedShops.filter(shop =>
    (shop.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUnfollow = async (shopId: string) => {
    // Optimistic local update
    setRealFollowedShops(prev => prev.filter(s => s.id !== shopId));
    // Trigger global update
    unfollowShop(shopId);
  };

  const handleVisitShop = (shopId: string) => {
    navigate(`/seller/${shopId}`);
  };

  if (isLoading && realFollowedShops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)]" />
        <p className="mt-4 text-[var(--text-muted)] text-sm">Loading followed shops...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Stats Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col sm:flex-row items-center justify-between gap-6"
      >
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm text-[var(--text-muted)]">Total Following</span>
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-[var(--brand-primary)]" />
            <span className="text-xl font-bold text-[var(--brand-primary)] leading-none">
              {searchQuery ? filteredShops.length : followedShops.length}
            </span>
          </div>
        </div>

        <div className="relative w-full sm:w-80 lg:w-96 flex-shrink-0">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[var(--brand-primary)] w-4 h-4" />
          <input
            type="text"
            placeholder="Search followed shops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[var(--brand-wash-gold)]/20 rounded-full focus:outline-none focus:border-[var(--brand-primary)] bg-white text-sm text-[var(--text-headline)] placeholder-[var(--text-muted)] shadow-sm transition-all hover:border-[var(--brand-primary)]/30 h-11"
          />
        </div>
      </motion.div>

      {/* Shops Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredShops.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="col-span-full"
          >
            <Card className="border-dashed border-2 border-gray-200 shadow-none">
              <CardContent className="p-12 text-center">
                <Heart className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                <p className="text-[var(--text-muted)] text-lg font-medium mb-2">
                  {searchQuery ? 'No matching shops' : 'Not following any shops'}
                </p>
                <p className="text-[var(--text-muted)] text-sm mb-6">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Start following shops to see them here!'}
                </p>
                <Button
                  onClick={() => navigate('/stores')}
                  className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-full px-8"
                >
                  Explore Stores
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
              <Card className="relative overflow-hidden hover:shadow-xl transition-all duration-300 group h-full flex flex-col border-gray-100 rounded-2xl bg-white">
                {/* Banner */}
                <div className="relative h-28 overflow-hidden bg-gray-100">
                  <img
                    src={shop.banner}
                    alt={shop.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 blur-[2px] opacity-50"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
                </div>

                <CardContent className="p-5 flex-1 flex flex-col">
                  {/* Shop Brand Area */}
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={shop.logo}
                      alt={shop.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md shrink-0 -mt-10 relative z-10"
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className="flex items-center justify-between gap-1 cursor-pointer group/shop-link"
                        onClick={() => handleVisitShop(shop.id)}
                      >
                        <h3 className="font-bold text-sm text-[var(--text-headline)] leading-tight truncate group-hover/shop-link:text-[var(--brand-primary)] transition-colors">
                          {shop.name}
                        </h3>
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover/shop-link:text-[var(--brand-primary)] group-hover/shop-link:translate-x-0.5 transition-all" />
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                        <MapPin className="h-2.5 w-2.5" />
                        <span className="truncate">{shop.location}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 mb-4 flex-1">
                    {shop.description}
                  </p>

                  <div className="pt-4 border-t border-gray-50 mt-auto flex items-center justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1">
                        <Star className="h-2.5 w-2.5 fill-[var(--brand-primary)] text-[var(--brand-primary)]" />
                        <span className="text-[10px] font-bold text-[var(--text-headline)]">{shop.rating}</span>
                        <span className="text-[9px] text-[var(--text-muted)]">({shop.reviewCount})</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] font-medium">
                        <Users className="h-2.5 w-2.5" />
                        <span>{shop.followers} Followers</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleUnfollow(shop.id)}
                      variant="outline"
                      className="text-[var(--brand-primary)] border-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white px-4 h-8 text-[10px] font-bold transition-all duration-300 rounded-full"
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
  );
};