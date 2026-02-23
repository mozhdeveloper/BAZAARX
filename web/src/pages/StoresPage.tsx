import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Store,
  Star,
  MapPin,
  Package,
  TrendingUp,
  Award,
  Shield,
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  Filter,
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { featuredStores } from '../data/stores';
import { sellerService, type SellerData } from '../services/sellerService';

// Extended type for stores with product count
interface StoreWithProducts extends SellerData {
  products_count?: number;
}

const StoresPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [sortBy, setSortBy] = useState<'featured' | 'rating' | 'newest' | 'popular'>('featured');
  const location = useLocation();

  // Real stores state
  const [realStores, setRealStores] = useState<StoreWithProducts[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real stores from Supabase
  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      try {
        const stores = await sellerService.getPublicStores({
          searchQuery: searchQuery || undefined,
          location: selectedLocation !== 'All' ? selectedLocation : undefined,
          sortBy: sortBy,
        });
        setRealStores(stores);
      } catch (error) {
        console.error('Error fetching stores:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, [searchQuery, selectedLocation, sortBy]);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q !== null) {
      setSearchQuery(q);
    } else {
      setSearchQuery('');
    }
  }, [location.search]);

  const categories = ['All', 'Electronics', 'Fashion', 'Food & Beverages', 'Home & Living', 'Filipino Crafts', 'Beauty & Personal Care'];
  const locations = ['All', 'Metro Manila', 'Luzon', 'Visayas', 'Mindanao'];

  // Combine real stores with mock data as fallback
  const displayStores = realStores.length > 0
    ? realStores.map(store => {
      // Find matching featured store for additional assets like banner/followers
      const featured = featuredStores.find(f => f.id === store.id || f.name.toLowerCase() === (store.store_name || '').toLowerCase());

      return {
        id: store.id,
        name: store.store_name || store.business_name || 'Verified Seller',
        logo: store.avatar_url || featured?.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(store.store_name || 'S')}&background=FB2F00&color=fff&size=100`,
        avatar: store.avatar_url || featured?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(store.store_name || 'S')}&background=FB2F00&color=fff&size=100`,
        banner: featured?.banner || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=200&fit=crop',
        rating: Number(store.rating || 0) || featured?.rating || 0,
        followers: featured?.followers || (Math.floor(Math.random() * 2000) + 100), // Fallback if not in featured
        products: store.products_count || featured?.products || 0,
        totalReviews: Number((store as any).total_reviews || store.review_count || featured?.totalReviews || 0),
        isVerified: store.is_verified || featured?.isVerified || false,
        description: store.store_description || featured?.description || `Quality products from ${store.store_name || store.business_name}`,
        location: store.city ? `${store.city}, ${store.province || ''}` : featured?.location || 'Philippines',
        categories: (store as any).store_category || (store as any).product_categories || featured?.categories || ['General'],
        badges: store.is_verified ? ['Verified Seller'] : featured?.badges || []
      };
    })
    : featuredStores;

  // Filter by category (client-side since we have all stores)
  const filteredStores = displayStores.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || store.categories.includes(selectedCategory);
    const matchesLocation = selectedLocation === 'All' || store.location.includes(selectedLocation);

    return matchesSearch && matchesCategory && matchesLocation;
  });

  return (
    <div className="min-h-screen bg-transparent">
      <Header />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-0 flex flex-col gap-2">
        {/* Page Navigation */}
        {/* Page Navigation */}
        <div className="flex items-center justify-center gap-10 pt-1 pb-1">
          <Link
            to="/shop"
            className="text-sm text-gray-500 hover:text-[var(--brand-primary)] transition-all duration-300"
          >
            Shop
          </Link>
          <Link
            to="/collections"
            className="text-sm text-gray-500 hover:text-[var(--brand-primary)] transition-all duration-300"
          >
            Collections
          </Link>
          <Link
            to="/stores"
            className="text-sm font-bold text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)] pb-0.5"
          >
            Stores
          </Link>
          <Link
            to="/registry"
            className="text-sm text-gray-500 hover:text-[var(--brand-primary)] transition-all duration-300"
          >
            Registry & Gifting
          </Link>
        </div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <div className="">
            <div className="py-24 bg-hero-gradient backdrop-blur-md shadow-md rounded-3xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center px-4"
              >
                <h1 className="text-4xl md:text-6xl font-black text-[var(--text-headline)] mb-2 tracking-tight font-primary">
                  Discover Trusted {''}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-primary)] to-[var(--text-accent)]">
                    Stores
                  </span>
                </h1>
                <p className="text-medium text-[var(--text-primary)] max-w-2xl mx-auto font-medium">
                  Find your favorite local brands and shop directly from them.
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Stats Summary */}
        <div className="max-w-3xl mx-auto mt-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
            {[
              { label: 'Active Stores', value: '1.2k+' },
              { label: 'Products Listed', value: '50k+' },
              { label: 'Happy Customers', value: '100k+' },
              { label: 'Average Rating', value: '4.8' }
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-gray-700 font-['Montserrat'] tracking-tight">
                  {stat.value}
                </div>
                <div className="text-[9px] md:text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            {/* Category Filter */}
            <div className="flex-1">
              <div className="flex flex-wrap gap-1 md:gap-1">
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 whitespace-nowrap border
                        ${isActive
                          ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white shadow-sm scale-105"
                          : "bg-white border-gray-100 text-gray-500 hover:border-[var(--brand-primary)]/30 hover:text-[var(--brand-primary)]"
                        }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Filters Row */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-gray-400">
                <Filter className="w-4 h-4" />
              </div>

              <div className="flex items-center gap-2">
                {/* Location Filter */}
                <div className="flex items-center gap-3">
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger className="w-[160px] h-9 bg-white border-0 rounded-xl text-gray-700 text-sm focus:ring-0 hover:shadow-md transition-all px-4 font-medium">
                      <SelectValue placeholder="Location" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[var(--brand-primary)]/10 shadow-xl bg-white">
                      <SelectItem value="All">
                        All Locations
                      </SelectItem>
                      {locations.filter(l => l !== 'All').map(loc => (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort By Filter */}
                <div className="flex items-center gap-3">
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'featured' | 'rating' | 'newest' | 'popular')}>
                    <SelectTrigger className="w-[160px] h-9 bg-white border-0 rounded-xl text-gray-700 text-sm focus:ring-0 hover:shadow-md transition-all px-4 font-medium">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[var(--brand-primary)]/10 shadow-xl bg-white">
                      <SelectItem value="featured">
                        Featured Stores
                      </SelectItem>
                      <SelectItem value="rating">
                        Highest Rated
                      </SelectItem>
                      <SelectItem value="newest">
                        Newest Joiners
                      </SelectItem>
                      <SelectItem value="popular">
                        Most Popular
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between -mb-2">
            <p className="text-xs text-gray-600">
              Showing {filteredStores.length} stores
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                navigate('/stores');
                setSelectedCategory('All');
                setSelectedLocation('All');
                setSortBy('featured');
              }}
              className="text-xs text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)] font-medium"
            >
              Clear Filters
            </button>
          </div>
        </motion.div >

        {/* Stores Grid */}
        {
          loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)] mb-4" />
              <p className="text-gray-500">Loading stores...</p>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Store className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No stores found</h3>
              <p className="text-gray-500 text-sm">Try adjusting your filters or search query</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {filteredStores.map((store, index) => (
                <motion.div
                  key={store.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(`/seller/${store.id}`)}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 flex flex-col group cursor-pointer"
                >
                  {/* Store Banner */}
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={store.banner}
                      alt={`${store.name} banner`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {store.isVerified && (
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-sm">
                        <Shield className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                    )}
                  </div>

                  {/* Store Content */}
                  <div className="p-5 flex-1 flex flex-col">
                    {/* Header: Avatar + Info */}
                    <div className="flex items-start gap-4 mb-3">
                      <div className="w-12 h-12 rounded-full border border-gray-100 overflow-hidden bg-gray-50 flex-shrink-0">
                        <img
                          src={store.avatar}
                          alt={store.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <h3 className="font-bold text-base text-gray-900 group-hover:text-[var(--brand-primary)] transition-colors line-clamp-2 leading-tight flex-1">
                            {store.name}
                          </h3>
                          <ChevronRight className="group-hover:text-[var(--brand-primary)] w-4 h-4 text-gray-300 mt-1 flex-shrink-0" />
                        </div>
                      </div>
                    </div>

                    {/* Address - Aligned above description */}
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium mb-1.5">
                      <MapPin className="w-3 h-3 text-gray-300" />
                      <span className="truncate">{store.location}</span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-gray-500 mb-6 line-clamp-2 leading-relaxed">
                      {store.description}
                    </p>

                    {/* Bottom Row: Stats */}
                    <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-[var(--brand-primary)] text-[var(--brand-primary)]" />
                            <span className="text-xs font-bold text-gray-900">{store.rating}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 font-medium mt-0.5">Rating</div>
                        </div>

                        <div className="w-px h-6 bg-gray-100" />

                        <div className="flex flex-col">
                          <div className="flex items-center gap-1 text-gray-900 font-bold text-xs">
                            <Users className="w-3 h-3 text-gray-400" />
                            <span>{store.followers.toLocaleString()}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 font-medium mt-0.5">Followers</div>
                        </div>

                        <div className="w-px h-6 bg-gray-100" />

                        <div className="flex flex-col">
                          <div className="flex items-center gap-1 text-gray-900 font-bold text-xs">
                            <Package className="w-3 h-3 text-gray-400" />
                            <span>{store.products}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 font-medium mt-0.5">Products</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        }

        {/* CTA Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] p-12 text-center text-white"
        >
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Want to Start Your Own Store?
            </h2>
            <p className="text-lg text-white/90 mb-6 max-w-2xl mx-auto">
              Join thousands of Filipino entrepreneurs selling on BazaarX. It's free to start and easy to manage.
            </p>
            <button
              onClick={() => navigate('/seller/auth')}
              className="group bg-white pl-5 pr-1.5 py-1.5 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2 mx-auto"
            >
              <span className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] bg-clip-text text-transparent font-semibold text-base pl-2">
                Start Selling Today
              </span>
              <div className="w-8 h-8 bg-[var(--brand-primary)] rounded-full flex items-center justify-center group-hover:bg-[var(--brand-primary-dark)] transition-colors">
                <ArrowUpRight className="w-4 h-4 text-white" />
              </div>
            </button>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full translate-y-48 -translate-x-48" />
        </motion.div>
      </div >

      <BazaarFooter />
    </div >
  );
};

export default StoresPage;
