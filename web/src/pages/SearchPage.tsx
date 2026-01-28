import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  TrendingUp,
  Clock,
  Star,
  Filter,
  ChevronDown,
  Sparkles,
  Flame,
  ArrowRight,
  Camera
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
import ProductRequestModal from '../components/ProductRequestModal';
import VisualSearchModal from '../components/VisualSearchModal';
import { Slider } from "../components/ui/slider";
import { trendingProducts, bestSellerProducts, newArrivals } from '../data/products';


interface SearchProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  sold: number;
  seller: string;
  sellerRating?: number;
  sellerVerified?: boolean;
  isFreeShipping?: boolean;
  isVerified?: boolean;
  location?: string;
  category: string;
}


interface FlashSaleProduct {
  id: string;
  name: string;
  image: string;
  originalPrice: number;
  salePrice: number;
  discount: number;
  sold: number;
  stock: number;
  rating: number;
}

const flashSaleProducts: FlashSaleProduct[] = [
  {
    id: 'fs1',
    name: 'Wireless Earbuds Pro',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop',
    originalPrice: 2999,
    salePrice: 1499,
    discount: 50,
    sold: 234,
    stock: 500,
    rating: 4.8
  },
  {
    id: 'fs2',
    name: 'Smart Watch Fitness Tracker',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
    originalPrice: 4999,
    salePrice: 2999,
    discount: 40,
    sold: 189,
    stock: 300,
    rating: 4.7
  },
  {
    id: 'fs3',
    name: 'Portable Power Bank 20000mAh',
    image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&h=400&fit=crop',
    originalPrice: 1999,
    salePrice: 999,
    discount: 50,
    sold: 456,
    stock: 200,
    rating: 4.9
  },
  {
    id: 'fs4',
    name: 'LED Desk Lamp with USB',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=400&fit=crop',
    originalPrice: 1499,
    salePrice: 799,
    discount: 47,
    sold: 321,
    stock: 150,
    rating: 4.6
  }
];

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasInitialized = useRef(false);

  // Initialize searchQuery from URL if present
  const [searchQuery, setSearchQuery] = useState(() => {
    return new URLSearchParams(location.search).get('q') || '';
  });
  const [isSearching, setIsSearching] = useState(() => {
    return Boolean(new URLSearchParams(location.search).get('q'));
  });
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('relevance');
  const [priceRange, setPriceRange] = useState<number[]>([0, 100000]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showVisualSearchModal, setShowVisualSearchModal] = useState(false);

  // Flash Sale Countdown
  const [timeLeft, setTimeLeft] = useState({
    hours: 2,
    minutes: 45,
    seconds: 30
  });

  const handleSearch = useCallback((query: string) => {
    if (!query.trim()) return;

    setSearchQuery(query);
    setIsSearching(true);
    setShowResults(false);

    // Simulate search with animation
    setTimeout(() => {
      const allProducts = [...trendingProducts, ...bestSellerProducts, ...newArrivals] as unknown as SearchProduct[];
      const results = allProducts.filter(product =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase())
      );

      setSearchResults(results);
      setIsSearching(false);
      setShowResults(true);
    }, 800);
  }, []);

  // Perform initial search if URL has query param (one-time on mount)
  useEffect(() => {
    if (!hasInitialized.current && searchQuery) {
      // Perform search in async manner
      const searchTimeout = setTimeout(() => {
        const allProducts = [...trendingProducts, ...bestSellerProducts, ...newArrivals] as unknown as SearchProduct[];
        const results = allProducts.filter(product =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.category.toLowerCase().includes(searchQuery.toLowerCase())
        );

        setSearchResults(results);
        setIsSearching(false);
        setShowResults(true);
      }, 800);

      hasInitialized.current = true;

      return () => clearTimeout(searchTimeout);
    }
  }, [searchQuery]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { hours: prev.hours, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  const categories = ['All', 'Electronics', 'Fashion', 'Home & Living', 'Beauty', 'Food & Beverages'];
  const recommendedProducts = bestSellerProducts.slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8">

        {/* Search Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          {/* Large Search Bar */}
          <div className="relative max-w-2xl mx-auto mb-6">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search for products, brands, categories..."
              className="w-full pl-12 pr-44 py-3 text-sm bg-white border-2 border-gray-100 focus:border-[#ff6a00] rounded-full text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all shadow-sm"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-36 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Camera/Visual Search Button */}
            <button
              onClick={() => setShowVisualSearchModal(true)}
              className="absolute right-28 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-[#ff6a00] rounded-full hover:bg-orange-50 transition-colors"
              title="Search by image"
            >
              <Camera className="w-5 h-5" />
            </button>

            <button
              onClick={() => handleSearch(searchQuery)}
              className="absolute right-1.5 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-full text-sm font-semibold hover:shadow-md transition-all active:scale-95"
            >
              Search
            </button>
          </div>

          {/* Popular Searches */}
          {!showResults && (
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="text-sm text-gray-600">Popular:</span>
              {['Wireless Earbuds', 'Smart Watch', 'Phone Case', 'Filipino Crafts', 'Honey'].map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    setSearchQuery(term);
                    handleSearch(term);
                  }}
                  className="px-4 py-1.5 bg-white rounded-full text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors border border-gray-200"
                >
                  {term}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Flash Sale Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 rounded-2xl p-6 text-white relative overflow-hidden"
        >
          {/* Animated Background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <Flame className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold">Flash Sale</h2>
                  <p className="text-s text-white/80">Up to 50% OFF - Limited Time!</p>
                </div>
              </div>

              {/* Countdown Timer */}
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5" />
                <div className="flex gap-2">
                  {[
                    { label: 'Hours', value: timeLeft.hours },
                    { label: 'Mins', value: timeLeft.minutes },
                    { label: 'Secs', value: timeLeft.seconds }
                  ].map((item, index) => (
                    <React.Fragment key={item.label}>
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg p-1 min-w-[50px] text-center">
                        <div className="text-lg font-bold">{String(item.value).padStart(2, '0')}</div>
                        <div className="text-[12px] text-white/80">{item.label}</div>
                      </div>
                      {index < 2 && <div className="text-lg font-bold self-center">:</div>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* Flash Sale Products */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {flashSaleProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="bg-white rounded-xl p-3 cursor-pointer hover:scale-105 transition-transform"
                >
                  <div className="relative mb-2">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      -{product.discount}%
                    </div>
                  </div>

                  <h3 className="text-gray-900 font-semibold text-sm mb-1.5 line-clamp-2 h-8">
                    {product.name}
                  </h3>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-red-500 text-lg font-bold">₱{product.salePrice.toLocaleString()}</span>
                    <span className="text-gray-400 text-xs line-through">₱{product.originalPrice.toLocaleString()}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                      <span>Sold: {product.sold}</span>
                      <span>{Math.round(Math.min((product.sold / product.stock) * 100, 100))}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-red-500 h-1.5 rounded-full"
                        style={{ width: `${Math.min((product.sold / product.stock) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[10px]">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-gray-600">{product.rating}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Loading Animation */}
        <AnimatePresence>
          {isSearching && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full mb-4"
              />
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-gray-600 text-lg"
              >
                Searching for products...
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Results */}
        <AnimatePresence>
          {showResults && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {/* Filters & Sort */}
              <div className="mb-6">
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
                                : "bg-white border-gray-100 text-gray-500 hover:border-orange-200 hover:text-orange-500"
                              }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Filter Dropdowns */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Filter className="w-4 h-4" />
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Sort By */}
                      <div className="flex items-center gap-3">
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger className="w-[150px] h-8 bg-white border-gray-200 rounded-[12px] text-gray-700 text-[12px] focus:ring-1 focus:ring-orange-100 focus:ring-offset-0 shadow-sm hover:border-gray-300 hover:shadow-md transition-all px-4">
                            <SelectValue placeholder="Sort by" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-gray-100 p-1 shadow-xl">
                            <SelectItem value="relevance" className="rounded-xl data-[state=checked]:bg-[#ff6a00] data-[state=checked]:text-white focus:bg-orange-50 focus:text-[#ff6a00] cursor-pointer">Most Relevant</SelectItem>
                            <SelectItem value="price-low" className="rounded-xl data-[state=checked]:bg-[#ff6a00] data-[state=checked]:text-white focus:bg-orange-50 focus:text-[#ff6a00] cursor-pointer">Price: Low to High</SelectItem>
                            <SelectItem value="price-high" className="rounded-xl data-[state=checked]:bg-[#ff6a00] data-[state=checked]:text-white focus:bg-orange-50 focus:text-[#ff6a00] cursor-pointer">Price: High to Low</SelectItem>
                            <SelectItem value="rating" className="rounded-xl data-[state=checked]:bg-[#ff6a00] data-[state=checked]:text-white focus:bg-orange-50 focus:text-[#ff6a00] cursor-pointer">Highest Rated</SelectItem>
                            <SelectItem value="newest" className="rounded-xl data-[state=checked]:bg-[#ff6a00] data-[state=checked]:text-white focus:bg-orange-50 focus:text-[#ff6a00] cursor-pointer">Newest</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Price Range */}
                      <div className="flex items-center gap-2 py-1 px-3 bg-white border border-gray-200 rounded-xl h-8">
                        <span className="text-[12px] text-gray-700 tracking-wider">Price</span>
                        <div className="w-16 lg:w-24 pt-1">
                          <Slider
                            min={0}
                            max={100000}
                            step={100}
                            value={priceRange}
                            onValueChange={setPriceRange}
                            className="w-full text-[#ff6a00]"
                          />
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-700">
                          <div className="flex items-center bg-gray-50/50 px-2 py-0.5 rounded-lg border border-transparent focus-within:border-[#ff6a00] transition-colors">
                            <span className="text-gray-400 font-normal mr-0.5">₱</span>
                            <input
                              type="text"
                              value={priceRange[0].toLocaleString()}
                              onChange={(e) => {
                                const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                setPriceRange([val, priceRange[1]]);
                              }}
                              className="w-12 bg-transparent outline-none text-center"
                            />
                          </div>
                          <span className="text-gray-300 font-normal">-</span>
                          <div className="flex items-center bg-gray-50/50 px-2 py-0.5 rounded-lg border border-transparent focus-within:border-[#ff6a00] transition-colors">
                            <span className="text-gray-400 font-normal mr-0.5">₱</span>
                            <input
                              type="text"
                              value={priceRange[1].toLocaleString()}
                              onChange={(e) => {
                                const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                setPriceRange([priceRange[0], val]);
                              }}
                              className="w-16 bg-transparent outline-none text-center"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between pt-1 -mb-2">
                  <p className="text-xs text-gray-600">
                    Found <span className="font-semibold text-gray-900">{searchResults.length}</span> results for "<span className="font-semibold text-gray-900">{searchQuery}</span>"
                  </p>
                  <button
                    onClick={() => {
                      setSortBy('relevance');
                      setPriceRange([0, 100000]);
                      setSelectedCategory('All');
                    }}
                    className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              {/* Results Grid */}
              {searchResults.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]).length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
                  {searchResults.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]).map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => navigate(`/product/${product.id}`)}
                      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group"
                    >
                      <div className="relative overflow-hidden">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        {product.isFreeShipping && (
                          <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                            Free Shipping
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-orange-500 transition-colors">
                          {product.name}
                        </h3>

                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-orange-500 text-xl font-bold">
                            ₱{product.price.toLocaleString()}
                          </span>
                          {product.originalPrice && (
                            <span className="text-gray-400 text-sm line-through">
                              ₱{product.originalPrice.toLocaleString()}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-gray-600">{product.rating}</span>
                          </div>
                          <span className="text-gray-500">{product.sold} sold</span>
                        </div>

                        <p className="text-xs text-gray-500 mt-2">
                          {product.location}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <div className="w-32 h-32 mx-auto mb-6 relative">
                    <div className="absolute inset-0 bg-orange-100 rounded-full animate-pulse"></div>
                    <div className="relative z-10 flex items-center justify-center h-full text-6xl">
                      🔍
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-600 mb-6">
                    We couldn't find any products matching "<span className="font-semibold">{searchQuery}</span>"
                  </p>

                  {/* CTA to Request Product */}
                  <div className="max-w-md mx-auto">
                    <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-200 rounded-xl p-6 mb-4">
                      <h4 className="font-bold text-gray-900 mb-2">Can't find what you need?</h4>
                      <p className="text-sm text-gray-700 mb-4">
                        Let us know what you're looking for and we'll notify you when it becomes available!
                      </p>
                      <button
                        onClick={() => setShowRequestModal(true)}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 group"
                      >
                        <span>Request This Product</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>

                    <p className="text-sm text-gray-500">
                      Or try different keywords to refine your search
                    </p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recommended Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-orange-500" />
              <h2 className="text-2xl font-bold text-gray-900">Recommended For You</h2>
            </div>
            <button
              onClick={() => navigate('/shop')}
              className="text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {recommendedProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                onClick={() => navigate(`/product/${product.id}`)}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 bg-orange-500 text-white p-2 rounded-full">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {product.name}
                  </h3>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-orange-500 text-xl font-bold">
                      ₱{product.price.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-gray-600 text-sm">{product.rating}</span>
                    <span className="text-gray-400 text-sm">({product.sold})</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <BazaarFooter />

      {/* Visual Search Modal */}
      <VisualSearchModal
        isOpen={showVisualSearchModal}
        onClose={() => setShowVisualSearchModal(false)}
        onRequestProduct={() => {
          setShowVisualSearchModal(false);
          setShowRequestModal(true);
        }}
        products={[...trendingProducts, ...bestSellerProducts, ...newArrivals]}
      />

      {/* Product Request Modal */}
      <ProductRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        initialSearchTerm={searchQuery}
      />
    </div>
  );
};

export default SearchPage;
