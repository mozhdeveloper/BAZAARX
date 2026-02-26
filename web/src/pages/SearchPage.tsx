import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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
  Camera,
  Truck,
  MapPin,
  ShoppingCart,
  BadgeCheck
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
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import ProductRequestModal from '../components/ProductRequestModal';
import VisualSearchModal from '../components/VisualSearchModal';
import { Slider } from "../components/ui/slider";
import { useProductStore } from "../stores/sellerStore";
import { useBuyerStore } from "../stores/buyerStore";
import { useToast } from "../hooks/use-toast";
import { CartModal } from "../components/ui/cart-modal";
import ShopBuyNowModal from "../components/shop/ShopBuyNowModal";
import ShopVariantModal from "../components/shop/ShopVariantModal";


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
  variants?: any[];
  variantLabel1Values?: any[];
  variantLabel2Values?: any[];
  stock?: number;
  sellerId?: string;
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
  const { products: sellerProducts, fetchProducts, subscribeToProducts } = useProductStore();
  const { profile, addToCart, cartItems } = useBuyerStore();

  // Initialize searchQuery from URL if present
  const [searchQuery, setSearchQuery] = useState(() => {
    return new URLSearchParams(location.search).get('q') || '';
  });
  const [isSearching, setIsSearching] = useState(() => {
    return Boolean(new URLSearchParams(location.search).get('q'));
  });
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('relevance');
  const [priceRange, setPriceRange] = useState<number[]>([0, 100000]);

  // New Filter States
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showVisualSearchModal, setShowVisualSearchModal] = useState(false);

  // Modals state
  const [showCartModal, setShowCartModal] = useState(false);
  const [addedProduct, setAddedProduct] = useState<{ name: string; image: string } | null>(null);
  const [showBuyNowModal, setShowBuyNowModal] = useState(false);
  const [buyNowProduct, setBuyNowProduct] = useState<any>(null);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [variantProduct, setVariantProduct] = useState<any>(null);
  const [isBuyNowAction, setIsBuyNowAction] = useState(false);
  const { toast } = useToast();

  // Fetch products on mount
  useEffect(() => {
    const filters = {
      isActive: true,
      approvalStatus: 'approved',
    };
    fetchProducts(filters);

    // Subscribe to real-time updates
    const unsubscribe = subscribeToProducts(filters);

    return () => {
      unsubscribe();
    };
  }, [fetchProducts, subscribeToProducts]);

  // Derived Data for Filters
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const categories = ['Electronics', 'Fashion', 'Home & Living', 'Beauty', 'Food & Beverages', 'Sports & Outdoors', 'Books & Media', 'Automotive', 'Toys & Games', 'Crafts & Handmade'];

    categories.forEach(cat => counts[cat] = 0);

    sellerProducts.forEach(p => {
      const cat = p.category || 'General';
      // Simple matching for demo; in real app, might need exact match or ID match
      const matchedCat = categories.find(c => cat.includes(c) || c.includes(cat));
      if (matchedCat) {
        counts[matchedCat] = (counts[matchedCat] || 0) + 1;
      } else {
        // Fallback or ignore
      }
    });

    return counts;
  }, [sellerProducts]);

  const brandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sellerProducts.forEach(p => {
      const brand = p.sellerName || 'BazaarX Seller';
      counts[brand] = (counts[brand] || 0) + 1;
    });
    return counts;
  }, [sellerProducts]);

  const brands = useMemo(() => Object.keys(brandCounts).slice(0, 8), [brandCounts]);

  // Search Logic
  const handleSearch = useCallback((query: string) => {
    // If empty query, show all (or filtered)
    setSearchQuery(query);
    setIsSearching(true);

    setTimeout(() => {
      let results = sellerProducts.filter((p) => p.approvalStatus === "approved" && p.isActive);

      if (query.trim()) {
        results = results.filter(product =>
          product.name.toLowerCase().includes(query.toLowerCase()) ||
          product.category.toLowerCase().includes(query.toLowerCase())
        );
      }

      const mappedResults = results.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        originalPrice: p.originalPrice,
        image: (p.images && p.images.length > 0) ? p.images[0] : 'https://via.placeholder.com/400',
        rating: p.rating || 4.5,
        sold: p.sales || 0,
        seller: p.sellerName || 'BazaarX Seller',
        isFreeShipping: false,
        isVerified: true,
        location: p.sellerLocation || 'Metro Manila',
        category: p.category || 'General',
        sellerId: p.sellerId,
        variants: p.variants || [],
        variantLabel1Values: p.variantLabel1Values || [],
        variantLabel2Values: p.variantLabel2Values || [],
        stock: p.stock || 0
      }));

      setSearchResults(mappedResults);
      setIsSearching(false);
    }, 500);
  }, [sellerProducts]);

  // Initial Search / Sync
  useEffect(() => {
    if (sellerProducts.length > 0) {
      handleSearch(searchQuery);
    }
  }, [searchQuery, sellerProducts, handleSearch]);

  const filteredResults = searchResults.filter(p => {
    // Price Filter
    if (p.price < priceRange[0] || p.price > priceRange[1]) return false;
    // Category Filter
    if (selectedCategory !== 'All' && !p.category.includes(selectedCategory)) return false;
    // Brand Filter
    if (selectedBrand && p.seller !== selectedBrand) return false;
    return true;
  });

  // Sort Results
  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'newest') return 0; // consistent order
    if (sortBy === 'best-sellers') return b.sold - a.sold;
    return 0; // relevance
  });

  const categories = ['Electronics', 'Fashion', 'Home & Living', 'Food & Beverages', 'Sports & Outdoors', 'Books & Media', 'Automotive', 'Beauty', 'Toys & Games', 'Crafts & Handmade'];
  const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
  const colors = [
    { name: 'Pink', hex: '#F9A8D4' },
    { name: 'Orange', hex: '#F97316' },
    { name: 'Beige', hex: '#FDE68A' },
    { name: 'Yellow', hex: '#FEF08A' },
    { name: 'Green', hex: '#86EFAC' },
    { name: 'Blue', hex: '#93C5FD' },
    { name: 'Purple', hex: '#D8B4FE' },
    { name: 'White', hex: '#FFFFFF' }
  ];
  const tags = ['Bag', 'Backpack', 'Chair', 'Clock', 'Interior', 'Indoor', 'Gift', 'Accessories', 'Fashion', 'Simple'];

  const recommendedProducts = sellerProducts
    .filter((p) => p.approvalStatus === "approved" && p.isActive)
    .slice(0, 4)
    .map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      image: (p.images && p.images.length > 0) ? p.images[0] : 'https://via.placeholder.com/400',
      rating: p.rating || 4.5,
      sold: p.sales || 0,
    }));

  return (
    <div className="min-h-screen bg-transparent">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        {/* Search Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* Page Navigation */}
          <div className="flex items-center justify-center gap-10 pt-1 pb-4 -mt-10">
            <Link to="/shop" className="text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-all duration-300">Shop</Link>
            <Link to="/collections" className="text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-all duration-300">Collections</Link>
            <Link to="/stores" className="text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-all duration-300">Stores</Link>
            <Link to="/registry" className="text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-all duration-300">Registry & Gifting</Link>
          </div>

          {/* Large Search Bar */}
          <div className="relative max-w-3xl mx-auto mb-6">
            <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
              placeholder="Search for products, brands, categories"
              className="w-full pl-14 pr-14 py-4 text-sm bg-white border border-gray-200 focus:border-[var(--brand-primary)] rounded-full text-[var(--text-headline)] placeholder-[var(--text-muted)] focus:outline-none shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-14 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowVisualSearchModal(true)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors"
              title="Search by image"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sidebar */}
          <aside className="w-full lg:w-72 flex-shrink-0">
            <div className="lg:sticky lg:top-24 space-y-10 pr-6">

              {/* Categories */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-6 font-primary">Categories</h2>
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className={`w-full flex justify-between items-center group transition-colors focus:outline-none ${selectedCategory === 'All' ? 'text-[var(--brand-primary)] font-bold' : 'text-[var(--text-primary)] font-medium hover:text-[var(--text-headline)]'}`}
                  >
                    <span className={`text-sm ${selectedCategory === 'All' ? 'font-bold' : 'font-medium'}`}>All Product</span>
                    <span className="text-xs font-semibold">{sellerProducts.length}</span>
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full flex justify-between items-center group transition-colors focus:outline-none ${selectedCategory === cat ? 'text-[var(--brand-primary)] font-bold' : 'text-[var(--text-primary)] font-medium hover:text-[var(--text-headline)]'}`}
                    >
                      <span className="text-sm font-medium">{cat}</span>
                      <span className={`text-xs ${selectedCategory === cat ? 'font-semibold text-[var(--brand-primary)]' : 'font-normal text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}`}>
                        {categoryCounts[cat] || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <h2 className="text-lg font-bold text-gray-900 mb-4 font-primary">Filter By</h2>

                <div className="space-y-6">
                  {/* Price Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <h3 className="font-bold text-gray-900 text-sm whitespace-nowrap">Price</h3>
                      <div className="flex-1">
                        <Slider
                          min={0}
                          max={100000}
                          step={100}
                          value={priceRange}
                          onValueChange={setPriceRange}
                          className="text-[var(--brand-accent)]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-[var(--text-muted)] font-medium mb-1 block">Min</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">₱</span>
                          <input
                            type="text"
                            value={priceRange[0].toLocaleString()}
                            onChange={(e) => {
                              const value = e.target.value.replace(/,/g, '');
                              const numValue = parseInt(value) || 0;
                              if (numValue <= priceRange[1]) {
                                setPriceRange([Math.min(numValue, 100000), priceRange[1]]);
                              }
                            }}
                            className="w-full pl-6 pr-2 py-1.5 text-xs font-bold text-[var(--text-primary)] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]"
                          />
                        </div>
                      </div>
                      <span className="text-[var(--text-muted)] mt-5">-</span>
                      <div className="flex-1">
                        <label className="text-[10px] text-[var(--text-muted)] font-medium mb-1 block">Max</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">₱</span>
                          <input
                            type="text"
                            value={priceRange[1].toLocaleString()}
                            onChange={(e) => {
                              const value = e.target.value.replace(/,/g, '');
                              const numValue = parseInt(value) || 0;
                              if (numValue >= priceRange[0]) {
                                setPriceRange([priceRange[0], Math.min(numValue, 100000)]);
                              }
                            }}
                            className="w-full pl-6 pr-2 py-1.5 text-xs font-bold text-[var(--text-primary)] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Size Section */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 text-sm">Size</h3>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map(size => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(selectedSize === size ? null : size)}
                          className={`w-10 h-10 rounded-full border border-[var(--border)] flex items-center justify-center text-xs font-bold transition-all active:scale-95
                            ${selectedSize === size ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white shadow-md' : 'text-[var(--text-primary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-wash)]'}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Section */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 text-sm">Color</h3>
                    <div className="flex flex-wrap gap-3">
                      {colors.map(color => (
                        <button
                          key={color.name}
                          onClick={() => setSelectedColor(selectedColor === color.name ? null : color.name)}
                          className={`w-6 h-6 rounded-full border border-[var(--border)] shadow-sm hover:scale-110 transition-transform ${selectedColor === color.name ? "ring-2 ring-offset-2 ring-[var(--brand-primary)]" : ""}`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Brands Section */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 text-sm">Brands</h3>
                    <div className="space-y-3">
                      {brands.map(brand => (
                        <button
                          key={brand}
                          onClick={() => setSelectedBrand(selectedBrand === brand ? null : brand)}
                          className="w-full flex justify-between items-center group cursor-pointer hover:text-gray-900"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-sm transition-colors ${selectedBrand === brand ? "text-[var(--brand-primary)] font-bold" : "text-[var(--text-primary)] font-medium"}`}>
                              {brand}
                            </span>
                          </div>
                          <span className={`text-[11px] transition-colors ${selectedBrand === brand ? "text-[var(--brand-primary)] font-bold" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"}`}>
                            {brandCounts[brand] || 0}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Popular Tags */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 text-sm">Popular tags</h3>
                    <div className="flex flex-wrap gap-x-3 gap-y-2">
                      {tags.map(tag => (
                        <button key={tag} className="text-xs text-[var(--text-muted)] font-medium hover:text-[var(--brand-primary)] transition-colors">
                          {tag},
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">

            {/* Results Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-2">
              <p className="text-[var(--text-muted)] text-sm mb-4 sm:mb-0">
                Showing <span className="font-bold text-[var(--brand-primary)]">{sortedResults.length}</span> results
              </p>
              <div className="w-full sm:w-auto">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[160px] h-10 bg-white border border-gray-100 hover:shadow-md -mb-2 rounded-xl text-sm font-medium text-[var(--text-headline)] focus:outline-none focus:ring-0 transition-all hover:border-[var(--brand-primary)]/50">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-gray-100 shadow-xl bg-white p-1">
                    <SelectItem value="relevance" className="text-xs rounded-lg cursor-pointer">Default</SelectItem>
                    <SelectItem value="price-low" className="text-xs rounded-lg cursor-pointer">Price: Low to High</SelectItem>
                    <SelectItem value="price-high" className="text-xs rounded-lg cursor-pointer">Price: High to Low</SelectItem>
                    <SelectItem value="rating" className="text-xs rounded-lg cursor-pointer">Rating</SelectItem>
                    <SelectItem value="newest" className="text-xs rounded-lg cursor-pointer">Newest</SelectItem>
                    <SelectItem value="best-sellers" className="text-xs rounded-lg cursor-pointer">Best Sellers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product Grid */}
            {sortedResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sortedResults.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="product-card-premium product-card-premium-interactive"
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {product.originalPrice && product.originalPrice > product.price && (
                        <Badge className="absolute top-3 left-3 bg-destructive hover:bg-destructive text-white text-xs">
                          {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                        </Badge>
                      )}
                    </div>

                    <div className="p-2 flex-1 flex flex-col">
                      <h3 className="product-title-premium h-10 text-xs">
                        {product.name}
                      </h3>

                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <div className="flex items-center">
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                          <span className="text-xs text-gray-600 ml-1">{product.rating} ({product.sold})</span>
                        </div>
                        {product.isVerified && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 gap-1 border-[var(--brand-wash-gold)] bg-[var(--brand-wash)] text-[var(--color-success)] font-bold shadow-sm">
                            <BadgeCheck className="w-2.5 h-2.5" /> Verified
                          </Badge>
                        )}
                      </div>

                      <div className="mt-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base product-price-premium">₱{product.price.toLocaleString()}</span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="text-xs text-gray-500 line-through">₱{product.originalPrice.toLocaleString()}</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-1.5 text-[11px] text-gray-500 min-h-[2rem] flex items-center">
                        <MapPin className="w-2.5 h-2.5 mr-1 flex-shrink-0" />
                        <span className="line-clamp-1">{product.location}</span>
                      </div>

                      <div className="mt-1">
                        <p className="text-[10px] text-gray-500">{product.category}</p>
                      </div>

                      <div className="mt-auto pt-3 flex gap-1.5">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!profile) {
                              toast({ title: "Login Required", description: "Please sign in.", variant: "destructive" });
                              navigate("/login");
                              return;
                            }
                            const hasVariants = product.variants && product.variants.length > 0;
                            const hasColors = product.variantLabel2Values && product.variantLabel2Values.length > 0;
                            const hasSizes = product.variantLabel1Values && product.variantLabel1Values.length > 0;

                            if (hasVariants || hasColors || hasSizes) {
                              setVariantProduct(product);
                              setIsBuyNowAction(false);
                              setShowVariantModal(true);
                              return;
                            }
                            addToCart(product as any);
                            setAddedProduct({ name: product.name, image: product.image });
                            setShowCartModal(true);
                          }}
                          variant="outline"
                          size="icon"
                          className="flex-shrink-0 border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white rounded-lg transition-all active:scale-95 h-8 w-8 p-0"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!profile) {
                              toast({ title: "Login Required", description: "Please sign in.", variant: "destructive" });
                              navigate("/login");
                              return;
                            }
                            const hasVariants = product.variants && product.variants.length > 0;
                            const hasColors = product.variantLabel2Values && product.variantLabel2Values.length > 0;
                            const hasSizes = product.variantLabel1Values && product.variantLabel1Values.length > 0;

                            if (hasVariants || hasColors || hasSizes) {
                              setVariantProduct(product);
                              setIsBuyNowAction(true);
                              setShowVariantModal(true);
                            } else {
                              setBuyNowProduct({
                                ...product,
                                quantity: 1,
                                selectedVariant: null,
                                selectedVariantLabel1: null,
                                selectedVariantLabel2: null,
                                variants: product.variants || [],
                                variantLabel2Values: product.variantLabel2Values || [],
                                variantLabel1Values: product.variantLabel1Values || [],
                                stock: product.stock || 99,
                              } as any);
                              setShowBuyNowModal(true);
                            }
                          }}
                          className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-lg transition-all active:scale-95 h-8 text-xs font-bold"
                        >
                          Buy Now
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <h3 className="text-xl font-bold text-[var(--text-headline)]">No products found</h3>
                <p className="text-[var(--text-muted)] mt-2">Try adjusting your filters or search query</p>
                <button
                  onClick={() => setShowRequestModal(true)}
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--brand-primary)] text-white font-bold text-sm hover:bg-[var(--brand-primary-dark)] transition-all active:scale-95 shadow-lg shadow-[var(--brand-primary)]/20"
                >
                  <Sparkles className="w-4 h-4" />
                  Request This Product
                </button>
              </div>
            )}
          </main>
        </div>

        {/* Recommended Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-[var(--brand-primary)]" />
              <h2 className="text-2xl font-bold text-[var(--text-headline)] font-primary">Recommended For You</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {recommendedProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => navigate(`/product/${product.id}`)}
                className="bg-[var(--bg-secondary)] rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group"
              >
                <div className="relative overflow-hidden aspect-[4/3]">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 bg-[var(--brand-primary)] text-white p-2 rounded-full shadow-md">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-[var(--text-headline)] mb-1 line-clamp-1 group-hover:text-[var(--brand-primary)] transition-colors">{product.name}</h3>
                  <p className="text-[var(--brand-primary)] font-bold mb-2">₱{product.price.toLocaleString()}</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                    <span className="text-xs text-[var(--text-muted)]">{product.rating} ({product.sold})</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <BazaarFooter />

      <VisualSearchModal
        isOpen={showVisualSearchModal}
        onClose={() => setShowVisualSearchModal(false)}
        onRequestProduct={() => {
          setShowVisualSearchModal(false);
          setShowRequestModal(true);
        }}
      />

      <ProductRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        initialSearchTerm={searchQuery}
      />

      {addedProduct && showCartModal && (
        <CartModal
          isOpen={showCartModal}
          onClose={() => setShowCartModal(false)}
          productName={addedProduct.name}
          productImage={addedProduct.image}
          cartItemCount={cartItems.length}
        />
      )}

      <ShopBuyNowModal
        isOpen={showBuyNowModal}
        onClose={() => {
          setShowBuyNowModal(false);
          setBuyNowProduct(null);
        }}
        product={buyNowProduct}
      />

      {variantProduct && showVariantModal && (
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
      )}
    </div>
  );
};

export default SearchPage;
