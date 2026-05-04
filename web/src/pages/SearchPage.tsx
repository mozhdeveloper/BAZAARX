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
  ChevronRight,
  Sparkles,
  Flame,
  ArrowRight,
  Camera,
  Truck,
  MapPin,
  ShoppingCart,
  BadgeCheck,
  Package
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
import { sellerService } from '../services/sellerService';
import { categoryService } from '../services/categoryService';

interface SearchProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  sold: number;
  reviewsCount: number;
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
  campaignBadge?: string;
  campaignBadgeColor?: string;
  discountBadgePercent?: number;
  discountBadgeTooltip?: string;
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
  const manualScrollRef = useRef(false);
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
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState<number[]>([0, 100000]);

  // New Filter States
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [minRating, setMinRating] = useState<number>(0);

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showVisualSearchModal, setShowVisualSearchModal] = useState(false);

  // Modals state
  const [showCartModal, setShowCartModal] = useState(false);
  const [matchedStores, setMatchedStores] = useState<any[]>([]);
  const [isRelatedFallback, setIsRelatedFallback] = useState(false);
  // Ref: seller UUIDs that match the search query (populated by the seller-search effect).
  // Used inside handleSearch to include products from API-matched sellers even when the
  // product name/category doesn't contain the exact search term.
  const apiMatchedSellerIdsRef = useRef<Set<string>>(new Set());
  const [addedProduct, setAddedProduct] = useState<{ name: string; image: string } | null>(null);
  const [showBuyNowModal, setShowBuyNowModal] = useState(false);
  const [buyNowProduct, setBuyNowProduct] = useState<any>(null);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [variantProduct, setVariantProduct] = useState<any>(null);
  const [isBuyNowAction, setIsBuyNowAction] = useState(false);
  const { toast } = useToast();
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // NEW: Fetch categories on mount
  useEffect(() => {
    categoryService.getActiveCategories()
      .then(data => {
        if (data) setCategories(data);
      })
      .catch(err => console.error('Failed to fetch categories:', err));
  }, []);

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

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const categoryNames = categories.map(c => c.name);

    // Initialize only active categories
    categoryNames.forEach(cat => counts[cat] = 0);

    sellerProducts.forEach(p => {
      if (p.approvalStatus !== 'approved' || !p.isActive) return;

      const cat = p.category || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return counts;
  }, [sellerProducts, categories]);

  const otherProductsCount = useMemo(() => {
    const activeCategoryNames = new Set(categories.map(c => c.name.toLowerCase()));
    let count = 0;
    for (const [catName, catCount] of Object.entries(categoryCounts)) {
      if (!activeCategoryNames.has(catName.toLowerCase()) || catName.toLowerCase() === 'others') {
        count += catCount;
      }
    }
    return count;
  }, [categories, categoryCounts]);

  const brandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sellerProducts.forEach(p => {
      const brand = p.sellerName || 'BazaarX Seller';
      counts[brand] = (counts[brand] || 0) + 1;
    });
    return counts;
  }, [sellerProducts]);

  const brands = useMemo(() => Object.keys(brandCounts).slice(0, 8), [brandCounts]);

  // ── Dedicated seller / store search ───────────────────────────────────────────
  // Runs independently from product filtering so that store cards always appear
  // even when products are still loading or have stale cached seller data.
  useEffect(() => {
    const lowerQ = searchQuery.trim().toLowerCase();

    if (!lowerQ) {
      setMatchedStores([]);
      apiMatchedSellerIdsRef.current = new Set();
      return;
    }

    let cancelled = false;

    // Helper: build a store-card object from products already in the store
    const deriveFromProducts = (products: typeof sellerProducts) => {
      const map = new Map<string, any>();
      products.forEach(p => {
        if (!p.sellerName) return;
        if (!p.sellerName.toLowerCase().includes(lowerQ)) return;
        const key = p.sellerId || `__name__:${p.sellerName.toLowerCase()}`;
        if (map.has(key)) return;
        const count = products.filter(pp => pp.sellerId && pp.sellerId === p.sellerId).length;
        map.set(key, {
          id: key,
          store_name: p.sellerName,
          avatar_url: null,
          is_verified: true,
          rating: null,
          products_count: count > 0 ? count : null,
        });
      });
      return map;
    };

    // Fast path: derive from currently-loaded products (zero network latency)
    if (sellerProducts.length > 0) {
      const derived = deriveFromProducts(sellerProducts);
      if (!cancelled && derived.size > 0) {
        setMatchedStores(Array.from(derived.values()));
      }
    }

    // Async: query the sellers table for richer data (avatar, rating, verified badge)
    (async () => {
      try {
        const apiStores = await sellerService.getPublicStores({
          searchQuery: searchQuery.trim(),
          includeUnverified: true,
        });
        if (cancelled) return;

        // Persist matched seller UUIDs so handleSearch can use them for product filtering
        const ids = new Set<string>(apiStores.map((s: any) => String(s.id)));
        apiMatchedSellerIdsRef.current = ids;

        if (apiStores.length > 0) {
          // Enrich API stores with local product counts
          const merged = new Map<string, any>(
            apiStores.map((s: any) => [
              String(s.id),
              {
                ...s,
                products_count:
                  sellerProducts.filter(p => p.sellerId === String(s.id)).length ||
                  s.products_count ||
                  null,
              },
            ])
          );
          // Also add product-derived stores the API didn't return (e.g. unverified sellers
          // whose RLS prevents them from appearing in the sellers table for public reads)
          const productDerived = deriveFromProducts(sellerProducts);
          productDerived.forEach((store, key) => {
            if (!merged.has(key)) merged.set(key, store);
          });
          if (!cancelled) setMatchedStores(Array.from(merged.values()));
        } else {
          // API returned nothing — re-derive from products in case products loaded late
          if (sellerProducts.length > 0) {
            const derived = deriveFromProducts(sellerProducts);
            if (!cancelled && derived.size > 0) setMatchedStores(Array.from(derived.values()));
          }
        }
      } catch {
        // Fast-path product-derived stores remain visible — no action needed
      }
    })();

    return () => { cancelled = true; };
  }, [searchQuery, sellerProducts]);

  // Search Logic — now purely synchronous (no async/await inside)
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setIsSearching(true);

    const lowerQ = query.trim().toLowerCase();

    // ── Filter products ─────────────────────────────────────────────────────────
    // Runs in a short timeout so the loading state renders before heavy computation
    setTimeout(() => {
      let results = sellerProducts.filter(p => p.approvalStatus === 'approved' && p.isActive);
      let relatedFallback = false;

      if (lowerQ) {
        // Snapshot matched seller IDs from the concurrent seller-search effect
        const matchedSellerIds = apiMatchedSellerIdsRef.current;

        results = results.filter(product =>
          product.name.toLowerCase().includes(lowerQ) ||
          product.category.toLowerCase().includes(lowerQ) ||
          (product.sellerName && product.sellerName.toLowerCase().includes(lowerQ)) ||
          (product.sellerId && matchedSellerIds.has(product.sellerId))
        );

        // Fallback 1: word-by-word matching for multi-word queries
        if (results.length === 0) {
          const words = lowerQ.split(/\s+/).filter((w: string) => w.length > 2);
          if (words.length > 0) {
            const allActive = sellerProducts.filter(p => p.approvalStatus === 'approved' && p.isActive);
            results = allActive.filter(product =>
              words.some((word: string) =>
                product.name.toLowerCase().includes(word) ||
                product.category.toLowerCase().includes(word) ||
                (product.sellerName && product.sellerName.toLowerCase().includes(word))
              )
            );
          }
        }

        // Fallback 2: show popular products when no keyword match at all
        if (results.length === 0) {
          const allActive = sellerProducts.filter(p => p.approvalStatus === 'approved' && p.isActive);
          results = [...allActive]
            .sort((a, b) => ((b as any).sales || 0) - ((a as any).sales || 0))
            .slice(0, 12);
          relatedFallback = results.length > 0;
        }
      }

      setIsRelatedFallback(relatedFallback);

      const mappedResults = results.map(p => {
        const product = p as any;
        return {
          ...product,
          id: p.id,
          name: p.name,
          price: p.price,
          originalPrice: p.originalPrice,
          image: (p.images && p.images.length > 0) ? (typeof p.images[0] === 'string' ? p.images[0] : (p.images[0] as any).image_url) : 'https://via.placeholder.com/400',
          rating: p.rating || 4.5,
          sold: p.sales || 0,
          reviewsCount: p.reviews || 0,
          seller: p.sellerName || 'BazaarX Seller',
          isFreeShipping: product.isFreeShipping || product.is_free_shipping || false,
          isVerified: product.isVerified || p.approvalStatus === 'approved',
          location: p.sellerLocation || 'Metro Manila',
          category: p.category || 'General',
          sellerId: p.sellerId,
          variants: p.variants || [],
          variantLabel1Values: p.variantLabel1Values || [],
          variantLabel2Values: p.variantLabel2Values || [],
          stock: p.stock || 0,
          campaignBadge: product.campaignBadge,
          campaignBadgeColor: product.campaignBadgeColor,
          discountBadgePercent: product.discountBadgePercent,
          discountBadgeTooltip: product.discountBadgeTooltip,
          isVacationMode: product.isVacationMode || false,
        };
      });

      setSearchResults(mappedResults);
      setIsSearching(false);
    }, 500);
  }, [sellerProducts]);

  // Sync searchQuery with URL params
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('q') || '';
    setSearchQuery(q);
  }, [location.search]);

  // Initial Search / Sync
  useEffect(() => {
    if (sellerProducts.length > 0) {
      handleSearch(searchQuery);
    }
  }, [searchQuery, sellerProducts, handleSearch]);

  // Scroll to results when category or other filters change
  useEffect(() => {
    if (hasInitialized.current) {
      setTimeout(() => {
        const isClean = selectedCategory === 'All' && !selectedSize && !selectedColor && !selectedBrand && minRating === 0 && priceRange[0] === 0 && priceRange[1] === 100000 && sortBy === 'newest';
        if (isClean && !manualScrollRef.current) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          const element = document.getElementById("search-results-header");
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
        manualScrollRef.current = false;
      }, 100);
    } else {
      hasInitialized.current = true;
    }
  }, [selectedCategory, selectedSize, selectedColor, selectedBrand, minRating, priceRange, sortBy]);

  const filteredResults = searchResults.filter(p => {
    // Price Filter
    if (p.price < priceRange[0] || p.price > priceRange[1]) return false;
    // Category Filter
    if (selectedCategory !== 'All') {
      if (selectedCategory === 'Others') {
        const isActiveCategory = categories.some(c => c.name.toLowerCase() === p.category.toLowerCase() && c.name.toLowerCase() !== 'others');
        if (isActiveCategory && p.category.toLowerCase() !== 'others') return false;
      } else if (!p.category.toLowerCase().includes(selectedCategory.toLowerCase())) {
        return false;
      }
    }
    // Brand Filter
    if (selectedBrand && p.seller !== selectedBrand) return false;
    // Rating Filter
    if (minRating > 0 && (p.rating || 0) < minRating) return false;
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
    .slice(0, 8)
    .map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      originalPrice: p.originalPrice,
      image: (p.images && p.images.length > 0) ? (typeof p.images[0] === 'string' ? p.images[0] : (p.images[0] as any).image_url) : 'https://via.placeholder.com/400',
      rating: p.rating || 4.5,
      sold: p.sales || 0,
      reviewsCount: p.reviews || 0,
      seller: p.sellerName || 'BazaarX Seller',
      sellerId: p.sellerId,
    }));

  return (
    <div className="min-h-screen bg-transparent">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-12">
        {/* Search Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* Page Navigation */}
          <div className="flex items-center justify-center gap-10 pt-1 pb-1">
            <Link to="/shop" className="text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-all duration-300">Shop</Link>
            <Link to="/categories" className="text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-all duration-300">Categories</Link>
            <Link to="/collections" className="text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-all duration-300">Collections</Link>
            <Link to="/stores" className="text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-all duration-300">Stores</Link>
            <Link to="/registry" className="text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-all duration-300">Wishlist & Gifting</Link>
          </div>
        </motion.div>

        {/* ── Shopee-style Store Profile Section ── full-width above products ── */}
        {matchedStores.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            {/* Section Header */}
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">SHOPS RELATED TO</span>
              <span className="text-[11px] font-bold text-[var(--brand-primary)] uppercase tracking-widest">&ldquo;{searchQuery}&rdquo;</span>
            </div>

            {/* Store Cards — one full-width card per store */}
            <div className="space-y-2">
              {matchedStores.map((store, idx) => {
                // Resolve navigation: real UUID → seller page; name-derived key → stores search
                const isNameKey = typeof store.id === 'string' && store.id.startsWith('__name__:');
                const handleStoreClick = () => {
                  if (isNameKey) {
                    navigate(`/stores?q=${encodeURIComponent(store.store_name)}`);
                  } else {
                    navigate(`/seller/${store.id}`);
                  }
                };
                return (
                <motion.div
                  key={store.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={handleStoreClick}
                  className="bg-white border border-gray-100 rounded-xl px-6 py-5 flex items-center gap-6 cursor-pointer hover:shadow-md hover:border-[var(--brand-primary)]/30 transition-all group w-full"
                >
                  {/* Avatar */}
                  <div className="w-[72px] h-[72px] rounded-full overflow-hidden bg-orange-50 flex-shrink-0 border-2 border-orange-100 shadow-sm flex items-center justify-center">
                    {store.avatar_url ? (
                      <img
                        loading="lazy"
                        src={store.avatar_url}
                        alt={store.store_name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-3xl font-black text-[var(--brand-primary)]">
                        {(store.store_name || '?')[0].toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Store Info */}
                  <div className="flex-1 min-w-0">
                    {/* Store Name + Verified */}
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-gray-900 text-base group-hover:text-[var(--brand-primary)] transition-colors truncate leading-tight">
                        {store.store_name}
                      </h3>
                      {store.is_verified && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          <BadgeCheck className="w-2.5 h-2.5" /> Verified
                        </span>
                      )}
                    </div>
                    {/* Slug line (mirrors Shopee's username row) */}
                    <p className="text-xs text-gray-400 mb-2 truncate">
                      {(store.store_name || '').toLowerCase().replace(/\s+/g, '')}
                    </p>
                    {/* Stats row */}
                    <div className="flex items-center gap-6 text-xs text-gray-500 flex-wrap">
                      <span>
                        <strong className="text-gray-800 font-bold">
                          {store.products_count != null ? store.products_count : '—'}
                        </strong>
                        <span className="text-gray-400 ml-1">Products</span>
                      </span>
                      {(store.rating != null && Number(store.rating) > 0) ? (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-current" />
                          <strong className="text-gray-800 font-bold">{Number(store.rating).toFixed(1)}</strong>
                          <span className="text-gray-400">Ratings</span>
                        </span>
                      ) : (
                        <span>
                          <strong className="text-gray-800 font-bold">N/A</strong>
                          <span className="text-gray-400 ml-1">Ratings</span>
                        </span>
                      )}
                      {store.total_reviews != null && Number(store.total_reviews) > 0 && (
                        <span>
                          <strong className="text-gray-800 font-bold">{Number(store.total_reviews).toLocaleString()}</strong>
                          <span className="text-gray-400 ml-1">Reviews</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Visit Store CTA — matches Shopee's button style */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs font-semibold border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white rounded-lg px-5 h-9 transition-all"
                      onClick={(e) => { e.stopPropagation(); handleStoreClick(); }}
                    >
                      View Store
                    </Button>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[var(--brand-primary)] transition-colors" />
                  </div>
                </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sidebar */}
          <aside className="w-full lg:w-72 flex-shrink-0">
            <div className="lg:sticky lg:top-28 lg:h-[calc(100vh-120px)] lg:overflow-y-auto pr-6 scrollbar-hide space-y-10 pb-10">

              {/* Categories */}
              <div>
                <h2 className="text-lg font-bold text-[var(--text-headline)] mb-6 font-primary lg:sticky lg:top-0 lg:z-10 lg:bg-[var(--brand-wash)] lg:py-4 lg:-mt-4 lg:-mx-1 lg:px-1">Categories</h2>
                <div className="space-y-4">
                  <button
                    onClick={() => { manualScrollRef.current = true; setSelectedCategory('All'); }}
                    className={`w-full flex justify-between items-center group transition-colors focus:outline-none ${selectedCategory === 'All' ? 'text-[var(--brand-primary)] font-bold' : 'text-[var(--text-primary)] font-medium hover:text-[var(--text-headline)]'}`}
                  >
                    <span className={`text-sm ${selectedCategory === 'All' ? 'font-bold' : 'font-medium'}`}>All Product</span>
                    <span className="text-xs font-semibold">
                      {sellerProducts.filter(p => p.approvalStatus === 'approved' && p.isActive).length}
                    </span>
                  </button>
                  {categories.filter(c => c.name.toLowerCase() !== 'others').map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { manualScrollRef.current = true; setSelectedCategory(cat.name); }}
                      className={`w-full flex justify-between items-center group transition-colors focus:outline-none ${selectedCategory === cat.name ? 'text-[var(--brand-primary)] font-bold' : 'text-[var(--text-primary)] font-medium hover:text-[var(--text-headline)]'}`}
                    >
                      <span className="text-sm font-medium">{cat.name}</span>
                      <span className={`text-xs ${selectedCategory === cat.name ? 'font-semibold text-[var(--brand-primary)]' : 'font-normal text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}`}>
                        {categoryCounts[cat.name] || 0}
                      </span>
                    </button>
                  ))}
                  {otherProductsCount > 0 && (
                    <button
                      onClick={() => { manualScrollRef.current = true; setSelectedCategory('Others'); }}
                      className={`w-full flex justify-between items-center group transition-colors focus:outline-none ${selectedCategory === 'Others' ? 'text-[var(--brand-primary)] font-bold' : 'text-[var(--text-primary)] font-medium hover:text-[var(--text-headline)]'}`}
                    >
                      <span className={`text-sm ${selectedCategory === 'Others' ? 'font-bold' : 'font-medium'}`}>Others</span>
                      <span className={`text-xs ${selectedCategory === 'Others' ? 'font-semibold text-[var(--brand-primary)]' : 'font-normal text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}`}>
                        {otherProductsCount}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <h2 className="text-lg font-bold text-gray-900 mb-4 font-primary lg:sticky lg:top-0 lg:z-10 lg:bg-[var(--brand-wash)] lg:py-4 lg:-mt-4 lg:-mx-1 lg:px-1">Filter By</h2>

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
                          onValueChange={(val) => { manualScrollRef.current = true; setPriceRange(val); }}
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
                            className="w-full pl-6 pr-2 py-1.5 text-xs font-bold text-[var(--text-primary)] border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--brand-primary)]"
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
                            className="w-full pl-6 pr-2 py-1.5 text-xs font-bold text-[var(--text-primary)] border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--brand-primary)]"
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
                          onClick={() => { manualScrollRef.current = true; setSelectedBrand(selectedBrand === brand ? null : brand); }}
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
          <main className="flex-1 min-h-[calc(100vh-200px)] flex flex-col">
            {/* Results Header */}
            <div id="search-results-header" className="flex flex-col sm:flex-row justify-between items-center mb-2 pb-2 scroll-mt-24 gap-4 h-12">
              <div className="flex items-center h-10">
                <p className="text-[var(--text-muted)] text-sm font-medium leading-none">
                  Showing <span className="font-bold text-[var(--brand-primary)]">{sortedResults.length}</span> results
                </p>
              </div>
              <div className="flex items-center gap-2 h-10">
                <span className="text-sm font-medium text-[var(--text-muted)] whitespace-nowrap">Sort by:</span>
                <Select value={sortBy} onValueChange={(val) => { manualScrollRef.current = true; setSortBy(val); }}>
                  <SelectTrigger className="w-full sm:w-[160px] h-8 bg-white border-none shadow-sm hover:shadow-md rounded-xl text-sm font-medium text-[var(--text-headline)] focus:outline-none focus:ring-0 transition-all">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-xl bg-white">
                    <SelectItem value="newest" className="text-xs rounded-lg cursor-pointer">Newest Arrivals</SelectItem>
                    <SelectItem value="price-low" className="text-xs rounded-lg cursor-pointer">Price: Low to High</SelectItem>
                    <SelectItem value="price-high" className="text-xs rounded-lg cursor-pointer">Price: High to Low</SelectItem>
                    <SelectItem value="rating" className="text-xs rounded-lg cursor-pointer">Rating</SelectItem>
                    <SelectItem value="best-sellers" className="text-xs rounded-lg cursor-pointer">Best Sellers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Related fallback notice */}
            {isRelatedFallback && sortedResults.length > 0 && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-[var(--brand-wash)] border border-[var(--brand-primary)]/20 rounded-xl text-xs text-[var(--text-muted)]">
                <Sparkles className="w-3.5 h-3.5 text-[var(--brand-primary)] flex-shrink-0" />
                <span>No exact matches for <strong className="text-[var(--text-headline)]">&ldquo;{searchQuery}&rdquo;</strong> — showing popular products you might like</span>
              </div>
            )}

            {/* Product Grid */}
            {sortedResults.length > 0 ? (() => {
              const groupedProducts: Record<string, typeof sortedResults> = {};
              const normalProducts: typeof sortedResults = [];

              sortedResults.forEach(product => {
                const badge = (product as any).campaignBadge;
                if (badge) {
                  if (!groupedProducts[badge]) {
                    groupedProducts[badge] = [];
                  }
                  groupedProducts[badge].push(product);
                } else {
                  normalProducts.push(product);
                }
              });

              const renderProduct = (product: any, index: number) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(`/product/${product.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      navigate(`/product/${product.id}`);
                    }
                  }}
                  className="product-card-premium product-card-premium-interactive h-full flex flex-col group cursor-pointer border-0 rounded-2xl overflow-hidden"
                >
                  <div className="relative aspect-square overflow-hidden bg-white/50">
                    <img loading="lazy" 
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=No+Image';
                      }}
                    />
                    {product.originalPrice && (
                      <div
                        title={product.discountBadgeTooltip}
                        className="absolute top-3 left-3 bg-[#DC2626] text-white px-2 py-[2px] rounded text-[11px] font-black uppercase tracking-wider z-10 shadow-sm"
                      >
                        {typeof product.discountBadgePercent === "number"
                          ? product.discountBadgePercent
                          : Math.round(
                            ((product.originalPrice - product.price) /
                              product.originalPrice) *
                            100
                          )}% OFF
                      </div>
                    )}
                    {product.isFreeShipping && (
                      <div className="absolute top-3 right-3 bg-[var(--color-success)] text-white p-1.5 rounded-lg shadow-sm">
                        <Truck className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  <div className="p-3 flex-1 flex flex-col">
                    <h3 className="font-bold text-[var(--text-headline)] group-hover:text-[var(--brand-primary)] transition-colors duration-200 line-clamp-2 h-[40px] text-sm leading-tight">
                      {product.name}
                    </h3>

                    <div className="mt-1 flex items-center gap-1.5 flex-wrap h-[20px]">
                      <div className="flex items-center">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                        <span className="text-xs text-[var(--text-muted)] font-medium ml-1">
                          {product.rating} ({((product as any).reviewsCount || 0).toLocaleString()})
                        </span>
                      </div>
                      {product.isVerified && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 gap-1 border-[var(--color-success)]/20 bg-[var(--color-success)]/5 text-[var(--color-success)]"
                        >
                          <BadgeCheck className="w-2.5 h-2.5" />
                          Verified
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2 mb-2">
                      <div className="flex flex-col justify-end min-h-[48px] mb-2">
                        {product.originalPrice && (
                          <span className="text-[11px] sm:text-[13px] text-gray-400 line-through font-medium leading-none mb-[3px]">
                            ₱{product.originalPrice.toLocaleString()}
                          </span>
                        )}
                        <span className={product.originalPrice ? "text-lg sm:text-[20px] lg:text-[22px] font-black text-[#DC2626] leading-none" : "text-lg sm:text-[20px] lg:text-[22px] font-black text-[#D97706] leading-none"}>
                          ₱{product.price.toLocaleString()}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-1 mt-1 h-[14px]">
                        {(((product as any).lifetimeSold !== undefined ? (product as any).lifetimeSold : product.sold) || 0).toLocaleString()} sold
                      </div>
                    </div>

                    <div className="mt-1.5 text-[11px] text-[var(--text-muted)] font-medium min-h-[2rem] flex items-center">
                      <MapPin className="w-2.5 h-2.5 mr-1 flex-shrink-0 text-[var(--brand-primary)]" />
                      <span className="line-clamp-1">{product.location}</span>
                    </div>

                    <div className="mt-1">
                      <p className="text-[10px] text-[var(--text-muted)] font-semibold">{product.seller}</p>
                    </div>

                    <div className="mt-auto pt-3 flex gap-1.5">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!profile) {
                            toast({
                              title: "Login Required",
                              description: "Please sign in to add items to your cart.",
                              variant: "destructive",
                            });
                            navigate("/login");
                            return;
                          }

                          if ((product as any).isVacationMode) {
                            toast({
                              title: "Store on Vacation",
                              description: "This store is temporarily unavailable.",
                              variant: "destructive",
                            });
                            return;
                          }

                          const hasVariants = (product as any).variants && (product as any).variants.length > 0;
                          const hasColors = product.variantLabel2Values && product.variantLabel2Values.length > 0;
                          const hasSizes = product.variantLabel1Values && product.variantLabel1Values.length > 0;

                          if (hasVariants || hasColors || hasSizes) {
                            setVariantProduct(product);
                            setIsBuyNowAction(false);
                            setShowVariantModal(true);
                            return;
                          }

                          addToCart(product as any);
                          setAddedProduct({
                            name: product.name,
                            image: product.image,
                          });
                          setShowCartModal(true);
                        }}
                        variant="outline"
                        size="icon"
                        className="flex-shrink-0 border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white rounded-lg transition-all active:scale-95 h-8 w-8 p-0"
                        title="Add to Cart"
                        aria-label={`Add ${product.name} to cart`}
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </Button>

                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!profile) {
                            toast({
                              title: "Login Required",
                              description: "Please sign in to make a purchase.",
                              variant: "destructive",
                            });
                            navigate("/login");
                            return;
                          }

                          if ((product as any).isVacationMode) {
                            toast({
                              title: "Store on Vacation",
                              description: "This store is temporarily unavailable.",
                              variant: "destructive",
                            });
                            return;
                          }

                          const hasVariants = (product as any).variants && (product as any).variants.length > 0;
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
                              variants: (product as any).variants || [],
                              variantLabel2Values: (product as any).variantLabel2Values || [],
                              variantLabel1Values: (product as any).variantLabel1Values || [],
                              stock: product.stock || 99,
                            } as any);
                            setShowBuyNowModal(true);
                          }
                        }}
                        className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-lg transition-all active:scale-95 h-8 text-xs font-bold"
                        aria-label={`Buy ${product.name} now`}
                      >
                        Buy Now
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );

              return (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                  {sortedResults.map((product, index) => renderProduct(product, index))}
                </motion.div>
              );
            })()
              : (
                <div className="flex-1 flex flex-col py-10">
                  <div className="flex flex-col items-center mb-10">
                    <h3 className="text-xl font-bold text-[var(--text-headline)]">No products found</h3>
                    <p className="text-[var(--text-muted)] mt-2 text-center">
                      {isRelatedFallback
                        ? 'Your filters are hiding all results. Try adjusting the price range or category.'
                        : searchQuery
                          ? `We couldn't find products for "${searchQuery}". Try a different term or browse the suggestions below.`
                          : 'Try adjusting your filters or search query'}
                    </p>
                    {!isRelatedFallback && (
                      <button
                        onClick={() => setShowRequestModal(true)}
                        className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--brand-primary)] text-white font-bold text-sm hover:bg-[var(--brand-primary-dark)] transition-all active:scale-95 shadow-lg shadow-[var(--brand-primary)]/20"
                      >
                        <Sparkles className="w-4 h-4" />
                        Request This Product
                      </button>
                    )}
                  </div>
                  {recommendedProducts.length > 0 && (
                    <div>
                      <h4 className="text-base font-bold text-[var(--text-headline)] mb-4">You might also like</h4>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                      >
                        {recommendedProducts.map((product, index) => (
                          <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => navigate(`/product/${product.id}`)}
                            className="product-card-premium product-card-premium-interactive h-full flex flex-col group cursor-pointer border-0 rounded-2xl overflow-hidden"
                          >
                            <div className="relative aspect-square overflow-hidden bg-white/50">
                              <img
                                loading="lazy"
                                src={product.image as string}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=No+Image'; }}
                              />
                            </div>
                            <div className="p-3 flex-1 flex flex-col">
                              <h3 className="font-bold text-[var(--text-headline)] group-hover:text-[var(--brand-primary)] transition-colors duration-200 line-clamp-2 text-sm leading-tight">
                                {product.name}
                              </h3>
                              <div className="mt-1 flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                                <span className="text-xs text-[var(--text-muted)] font-medium">{product.rating}</span>
                              </div>
                              <span className={`text-lg font-black mt-2 leading-none ${product.originalPrice ? 'text-[#DC2626]' : 'text-[#D97706]'}`}>
                                ₱{product.price.toLocaleString()}
                              </span>
                              <p className="text-[10px] text-[var(--text-muted)] font-semibold mt-1">{product.seller}</p>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    </div>
                  )}
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
                  <img loading="lazy" 
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
                    <span className="text-xs text-[var(--text-muted)]">{product.rating} ({product.reviewsCount})</span>
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
