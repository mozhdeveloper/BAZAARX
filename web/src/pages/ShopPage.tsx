/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Star,
  MapPin,
  Truck,
  BadgeCheck,
  ShoppingCart,
  Menu,
} from "lucide-react";
import Header from "../components/Header";
import { BazaarFooter } from "../components/ui/bazaar-footer";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Slider } from "../components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { CartModal } from "../components/ui/cart-modal";
import ShopBuyNowModal from "../components/shop/ShopBuyNowModal";
import ShopVariantModal from "../components/shop/ShopVariantModal";
import ProductRequestModal from "../components/ProductRequestModal";
import VisualSearchModal from "../components/VisualSearchModal";
// import CategoryCarousel from "../components/CategoryCarousel";
// import { Checkbox } from "../components/ui/checkbox";
import { useToast } from "../hooks/use-toast";
// Hardcoded imports removed for database parity
import { categories } from "../data/categories";
import { useBuyerStore } from "../stores/buyerStore";
import { useProductStore } from "../stores/sellerStore";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { AlertCircle } from "lucide-react";
// import { useProductQAStore } from "../stores/productQAStore";
import { ShopProduct } from "../types/shop";

// Flash sale products are now derived from real products in the component

const categoryOptions = [
  "All Categories",
  ...categories.map((cat) => cat.name),
];

const sortOptions = [
  { value: "relevance", label: "Default" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "rating", label: "Customer Rating" },
  { value: "newest", label: "Newest Arrivals" },
  { value: "bestseller", label: "Best Sellers" },
];

const brandOptions = [
  { name: "The North Face", count: 24 },
  { name: "Zara Basic", count: 68 },
  { name: "Moschino", count: 35 },
  { name: "Supreme", count: 15 },
  { name: "Ecko Unltd", count: 68 },
];

const sizeOptions = ["S", "M", "L", "XL", "XXL"];

const colorOptions = [
  { name: "Pink", hex: "#fbcfe8" },
  { name: "Orange", hex: "#fb923c" },
  { name: "Beige", hex: "#fef3c7" },
  { name: "Light Yellow", hex: "#fef9c3" },
  { name: "Light Green", hex: "#dcfce7" },
  { name: "Light Blue", hex: "#dbeafe" },
  { name: "Purple", hex: "#ede9fe" },
  { name: "Lavender", hex: "#f5f3ff" },
];

const popularTags = [
  "Bag", "Backpack", "Chair", "Clock", "Interior", "Indoor", "Gift", "Accessories", "Fashion", "Simple"
];

export default function ShopPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToCart, setQuickOrder, cartItems, profile } = useBuyerStore();
  const { toast } = useToast();
  const { products: sellerProducts, fetchProducts, subscribeToProducts } = useProductStore();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedSkinTypes, setSelectedSkinTypes] = useState<string[]>([]);
  const [selectedSort, setSelectedSort] = useState("relevance");
  const [priceRange, setPriceRange] = useState<number[]>([0, 100000]);
  const [showFilters, setShowFilters] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [addedProduct, setAddedProduct] = useState<{
    name: string;
    image: string;
  } | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showVisualSearchModal, setShowVisualSearchModal] = useState(false);
  const [isToolbarSticky, setIsToolbarSticky] = useState(true);
  const [showBuyNowModal, setShowBuyNowModal] = useState(false);
  const [buyNowProduct, setBuyNowProduct] = useState<any>(null);

  // Variant Selection Modal state (for Add to Cart)
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [variantProduct, setVariantProduct] = useState<any>(null);
  const [isBuyNowAction, setIsBuyNowAction] = useState(false);

  // Flash Sale Countdown
  const [timeLeft, setTimeLeft] = useState({
    hours: 2,
    minutes: 45,
    seconds: 30,
  });

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
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

  useEffect(() => {
    // Fetch initial products
    const filters = {
      isActive: true,
    };
    fetchProducts(filters);

    // Subscribe to real-time updates
    const unsubscribe = subscribeToProducts(filters);

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      setSelectedCategory(categoryParam);
      // Wait for layout to settle then scroll
      setTimeout(() => {
        const element = document.getElementById("shop-content");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, [searchParams]);

  // Handle toolbar scroll visibility
  useEffect(() => {
    const handleScroll = () => {
      // Threshold: Header (~80px) + Flash Sale (~400px) + Half of first grid row (~200px)
      // This hide the sticky toolbar after scrolling past the initial focus area
      if (window.scrollY > 850) {
        setIsToolbarSticky(false);
      } else {
        setIsToolbarSticky(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const allProducts = useMemo<ShopProduct[]>(() => {
    const dbProducts = sellerProducts
      .filter((p) => p.approvalStatus === "approved" && p.isActive)
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        originalPrice: p.originalPrice,
        image: p.images?.[0] || "https://placehold.co/400?text=Product",
        images: p.images || [],
        rating: p.rating || 0,
        sold: p.reviews || 0, // Use reviews count as "sold" for display
        category: p.category,
        seller: p.sellerName || "Verified Seller",
        sellerId: p.sellerId,
        isVerified: p.approvalStatus === "approved",
        location: p.sellerLocation || "Metro Manila",
        description: p.description,
        sellerRating: p.sellerRating || 0,
        sellerVerified: p.approvalStatus === "pending",
        variantLabel2Values: p.variantLabel2Values || [],
        variantLabel1Values: p.variantLabel1Values || [],
        stock: p.stock || 99,
        variants: p.variants || [],
      }));

    return dbProducts;
  }, [sellerProducts]);

  const flashSales = useMemo(() => {
    const autoFlash = allProducts
      .filter((p) => (p.originalPrice || 0) > p.price)
      .sort((a, b) => {
        const discountA = a.originalPrice ? (a.originalPrice - a.price) / a.originalPrice : 0;
        const discountB = b.originalPrice ? (b.originalPrice - b.price) / b.originalPrice : 0;
        return discountB - discountA;
      })
      .slice(0, 4)
      .map((p) => ({
        ...p,
        endTime: new Date(Date.now() + 3600000 * 5).toISOString(), // 5 hours from now
        discount: p.originalPrice
          ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
          : 0,
      }));

    const sampleFlashProducts = [
      {
        id: "sample-flash-sale-1",
        name: "Luxe Radiant Glow Serum",
        price: 499,
        originalPrice: 1250,
        image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=400",
        rating: 4.9,
        sold: 2150,
        category: "Skincare",
        seller: "BazaarX Official Store",
        sellerId: "bazaarx-official",
        isVerified: true,
        location: "Metro Manila",
        description: "Advanced radiance-boosting serum for an instant luminous glow.",
        endTime: new Date(Date.now() + 32400000).toISOString(),
        discount: 60,
        isFreeShipping: true,
      },
      {
        id: "sample-flash-sale-2",
        name: "Ultra-Fast Wireless Charger 2.0",
        price: 850,
        originalPrice: 2200,
        image: "https://images.unsplash.com/photo-1615526675258-56655c1276a2?auto=format&fit=crop&q=80&w=400",
        rating: 4.8,
        sold: 1240,
        category: "Electronics",
        seller: "TechHub Philippines",
        sellerId: "tech-hub",
        isVerified: true,
        location: "Quezon City",
        description: "15W fast charging stand for all Qi-enabled devices.",
        endTime: new Date(Date.now() + 28800000).toISOString(),
        discount: 61,
        isFreeShipping: true,
      },
      {
        id: "sample-flash-sale-3",
        name: "Minimalist Ergonomic Desk Chair",
        price: 3450,
        originalPrice: 8500,
        image: "https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&q=80&w=400",
        rating: 4.7,
        sold: 520,
        category: "Home & Living",
        seller: "ZenHome Designs",
        sellerId: "zen-home",
        isVerified: true,
        location: "Makati City",
        description: "Breathable mesh back with adjustable lumbar support.",
        endTime: new Date(Date.now() + 14400000).toISOString(),
        discount: 59,
        isFreeShipping: false,
      },
      {
        id: "sample-flash-sale-4",
        name: "Premium Noise Cancelling Headphones",
        price: 1899,
        originalPrice: 4500,
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400",
        rating: 4.9,
        sold: 890,
        category: "Electronics",
        seller: "AudioPro Store",
        sellerId: "audio-pro",
        isVerified: true,
        location: "Taguig City",
        description: "Listen to your music without distractions.",
        endTime: new Date(Date.now() + 18000000).toISOString(),
        discount: 58,
        isFreeShipping: true,
      },
      {
        id: "sample-flash-sale-5",
        name: "Nordic Ceramic Vases Set",
        price: 320,
        originalPrice: 800,
        image: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?auto=format&fit=crop&q=80&w=400",
        rating: 4.6,
        sold: 1560,
        category: "Home Decor",
        seller: "BazaarX Official Store",
        sellerId: "bazaarx-official",
        isVerified: true,
        location: "Metro Manila",
        description: "Modern minimalist ceramic vases for your home.",
        endTime: new Date(Date.now() + 21600000).toISOString(),
        discount: 60,
        isFreeShipping: true,
      },
      {
        id: "sample-flash-sale-6",
        name: "Eco-Friendly Bamboo Toothbrush Set",
        price: 150,
        originalPrice: 350,
        image: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&q=80&w=400",
        rating: 4.8,
        sold: 3400,
        category: "Personal Care",
        seller: "EcoChoice PH",
        sellerId: "eco-choice",
        isVerified: true,
        location: "Davao City",
        description: "Sustainable bamboo toothbrushes for a greener smile.",
        endTime: new Date(Date.now() + 7200000).toISOString(),
        discount: 57,
        isFreeShipping: true,
      },
    ];

    return [...sampleFlashProducts, ...autoFlash].slice(0, 6);
  }, [allProducts]);

  const filteredProducts = useMemo<ShopProduct[]>(() => {
    const filtered = allProducts.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.seller.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "All Categories" ||
        product.category.toLowerCase() === selectedCategory.toLowerCase();

      // Use slider price range instead of predefined ranges
      const matchesPrice =
        product.price >= priceRange[0] && product.price <= priceRange[1];

      return matchesSearch && matchesCategory && matchesPrice;
    });

    // Apply sorting
    switch (selectedSort) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "bestseller":
        filtered.sort((a, b) => (b.sold || 0) - (a.sold || 0));
        break;
      default:
        // Keep original order for relevance and newest
        break;
    }

    return filtered;
  }, [allProducts, searchQuery, selectedCategory, selectedSkinTypes, selectedSort, priceRange]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedSort("relevance");
    setPriceRange([0, 100000]);
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4 pt-0 pb-4 flex flex-col gap-2">
          {!isSupabaseConfigured() && (
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Database Not Configured</AlertTitle>
              <AlertDescription>
                Supabase environment variables are missing. Collaborators: please ensure you have a <code>.env</code> file with <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.
              </AlertDescription>
            </Alert>
          )}

          {/* Page Navigation */}
          <div className="flex items-center justify-center gap-10 pt-1 pb-1">
            <Link
              to="/shop"
              className="text-sm text-[var(--brand-primary)]"
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
              className="text-sm text-gray-500 hover:text-[var(--brand-primary)] transition-all duration-300"
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

          {/* Shop Header */}
          <div className="py-24 bg-gradient-to-br from-orange-100/20 via-orange-200/50 to-orange-200/50 backdrop-blur-md border border-orange-200/30 rounded-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center px-4"
            >
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-2 tracking-tight">
                Shop All {''}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-primary)] to-red-500">
                  Products
                </span>
              </h1>

              <p className="text-medium text-gray-700 max-w-2xl mx-auto">
                Discover amazing products from trusted sellers.
              </p>
            </motion.div>
          </div>

          <div className="pt-2 pb-0">
            {/* Flash Sale Section */}
            <div className="mb-2 bg-white rounded-xl py-4 px-8 shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgba(255,106,0,0.15)] transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-primary)] to-red-500 uppercase tracking-wide">
                    FLASH SALE
                  </h2>
                </div>

                {/* Ends in + Timer */}
                <div className="bg-gradient-to-r from-[var(--brand-primary)] to-red-500 text-white rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm border border-[var(--brand-primary)]/20">
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-90">
                    Ends in
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold font-mono tracking-widest">
                      {String(timeLeft.hours).padStart(2, "0")}:
                      {String(timeLeft.minutes).padStart(2, "0")}:
                      {String(timeLeft.seconds).padStart(2, "0")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {flashSales.map((product: any, index: number) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all border border-gray-100 hover:border-[var(--brand-primary)] pb-2"
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    <div className="relative aspect-[4/3] mb-2">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover" />
                      <div className="absolute top-0 right-0 bg-[var(--brand-primary)] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl-md z-10">
                        -{product.discount}%
                      </div>
                    </div>

                    <div className="px-3 pb-2">
                      <h3 className="font-semibold text-sm line-clamp-1 mb-1 text-gray-800">
                        {product.name}
                      </h3>

                      {/* Rating */}
                      <div className="flex items-center gap-1 mb-1.5">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-gray-500">{product.rating}</span>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <div className="text-base font-bold text-[var(--brand-primary)] leading-none">
                          ₱{product.price.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {product.originalPrice && (
                            <span className="text-[10px] text-gray-400 line-through">
                              ₱{product.originalPrice.toLocaleString()}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-500">
                            {(product.sold || 0).toLocaleString()} sold
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="w-full">
            {/* Toolbar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: isToolbarSticky ? 1 : 0,
                y: isToolbarSticky ? 0 : -20,
                pointerEvents: isToolbarSticky ? "auto" : "none"
              }}
              className="sticky top-[72px] z-30 mb-6 bg-gray-50/80 backdrop-blur-md py-3 -mx-2 px-2 rounded-xl transition-all duration-300"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="lg:hidden flex items-center gap-2 px-4 py-2 bg-gray-100/80 hover:bg-gray-200/80 rounded-xl text-xs font-semibold text-gray-700 transition-colors"
                  >
                    <Menu className="w-4 h-4" />
                    Categories
                  </button>

                  <p className="text-gray-800 text-sm font-medium">
                    <span className="text-[var(--brand-primary)] font-bold">{filteredProducts.length}</span> Products Found
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 hidden sm:inline">Sort By:</span>
                    <Select value={selectedSort} onValueChange={setSelectedSort}>
                      <SelectTrigger className="w-[120px] md:w-[140px] h-9 border-none bg-transparent hover:bg-gray-100 rounded-xl transition-all text-sm font-medium text-gray-800 focus:ring-0">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-gray-100">
                        {sortOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="text-xs">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Mobile Filters Menu */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="lg:hidden overflow-hidden bg-white/80 backdrop-blur-md rounded-xl border border-gray-100 mb-6 shadow-sm"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-gray-900 text-sm">Filter by Category</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFilters(false)}
                        className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 flex items-center justify-center"
                      >
                        <span className="text-xl leading-none">&times;</span>
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {categoryOptions.map((category) => (
                        <button
                          key={category}
                          onClick={() => {
                            setSelectedCategory(category);
                            setShowFilters(false);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${selectedCategory === category
                            ? "bg-[var(--brand-primary)] text-white font-medium shadow-sm"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Content Layout */}
            <div className="flex flex-col lg:flex-row gap-4 mt-6">
              {/* Sidebar Filters - Desktop Only */}
              <aside className="hidden lg:block w-72 flex-shrink-0">
                <div className="sticky top-24 space-y-10 pr-6">
                  {/* Categories Section */}
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-6 font-primary">Categories</h2>
                    <div className="space-y-4">
                      <button
                        onClick={() => setSelectedCategory("All Categories")}
                        className={`w-full flex justify-between items-center group transition-colors ${selectedCategory === "All Categories" ? "text-[var(--brand-primary)]" : "text-gray-600 hover:text-gray-900"}`}
                      >
                        <span className={`text-sm ${selectedCategory === "All Categories" ? "font-bold" : "font-medium"}`}>All Product</span>
                        <span className="text-xs font-semibold">{allProducts.length}</span>
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.name)}
                          className={`w-full flex justify-between items-center group transition-colors ${selectedCategory === cat.name ? "text-[var(--brand-primary)]" : "text-gray-500 hover:text-gray-900"}`}
                        >
                          <span className="text-sm font-medium">{cat.name}</span>
                          <span className="text-xs font-normal text-gray-400 group-hover:text-gray-600">
                            {allProducts.filter(p => p.category === cat.name).length || Math.floor(Math.random() * 50) + 10}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-8">
                    <h2 className="text-lg font-bold text-gray-900 mb-6 font-primary">Filter By</h2>

                    <div className="space-y-10">
                      {/* Price Section */}
                      <div className="space-y-4">
                        <h3 className="font-bold text-gray-900 text-sm">Price</h3>
                        <div className="pt-2">
                          <Slider
                            defaultValue={[0, 100000]}
                            max={100000}
                            step={100}
                            value={priceRange}
                            onValueChange={setPriceRange}
                            className="text-[var(--brand-primary)]"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-4">
                          Range: <span className="font-medium text-gray-700">₱{priceRange[0].toLocaleString()} - ₱{priceRange[1].toLocaleString()}</span>
                        </p>
                      </div>

                      {/* Size Section */}
                      <div className="space-y-4">
                        <h3 className="font-bold text-gray-900 text-sm">Size</h3>
                        <div className="flex flex-wrap gap-2">
                          {sizeOptions.map((size) => (
                            <button
                              key={size}
                              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-all active:scale-95"
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Color Section */}
                      <div className="space-y-4">
                        <h3 className="font-bold text-gray-900 text-sm">Color</h3>
                        <div className="flex flex-wrap gap-3">
                          {colorOptions.map((color) => (
                            <button
                              key={color.name}
                              className={`w-6 h-6 rounded-full border border-gray-100 shadow-sm hover:scale-110 transition-transform ${color.name === "Orange" ? "ring-2 ring-offset-2 ring-[var(--brand-primary)]" : ""}`}
                              style={{ backgroundColor: color.hex }}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Brands Section */}
                      <div className="space-y-4">
                        <h3 className="font-bold text-gray-900 text-sm">Brands</h3>
                        <div className="space-y-3">
                          {brandOptions.map((brand) => (
                            <div key={brand.name} className="flex justify-between items-center group cursor-pointer hover:text-gray-900">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm transition-colors ${brand.name === "The North Face" ? "text-[var(--brand-primary)] font-bold" : "text-gray-500 font-medium"}`}>
                                  {brand.name}
                                </span>
                              </div>
                              <span className={`text-[11px] transition-colors ${brand.name === "The North Face" ? "text-[var(--brand-primary)]" : "text-gray-400"}`}>
                                {brand.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Popular Tags */}
                      <div className="space-y-4">
                        <h3 className="font-bold text-gray-900 text-sm">Popular tags</h3>
                        <div className="flex flex-wrap gap-x-3 gap-y-2">
                          {popularTags.map((tag) => (
                            <button
                              key={tag}
                              className="text-xs text-gray-400 hover:text-[var(--brand-primary)] transition-colors"
                            >
                              {tag},
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>

              {/* Products Area */}
              <div className="flex-1 min-w-0">
                {/* Mobile Filters Menu handled separately above */}

                {/* Products Grid */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  {filteredProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer"
                      onClick={() => navigate(`/product/${product.id}`)}
                    >
                      <div className="relative aspect-square overflow-hidden">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {product.originalPrice && (
                          <Badge className="absolute top-3 left-3 bg-red-500 hover:bg-red-500 text-white text-xs">
                            {Math.round(
                              ((product.originalPrice - product.price) /
                                product.originalPrice) *
                              100
                            )}
                            % OFF
                          </Badge>
                        )}
                        {product.isFreeShipping && (
                          <div className="absolute top-3 right-3 bg-green-500 text-white p-1.5 rounded-lg">
                            <Truck className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      <div className="p-3 flex-1 flex flex-col">
                        <h3 className="font-semibold text-gray-900 group-hover:text-[var(--brand-primary)] transition-colors duration-200 line-clamp-2 h-10 text-sm">
                          {product.name}
                        </h3>

                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <div className="flex items-center">
                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                            <span className="text-xs text-gray-600 ml-1">
                              {product.rating} ({product.sold.toLocaleString()})
                            </span>
                          </div>
                          {product.isVerified && (
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 px-1.5 gap-1 border-green-200 bg-green-50 text-green-700"
                            >
                              <BadgeCheck className="w-2.5 h-2.5" />
                              Verified
                            </Badge>
                          )}
                        </div>

                        <div className="mt-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-[var(--brand-primary)]">
                              ₱{product.price.toLocaleString()}
                            </span>
                            {product.originalPrice && (
                              <span className="text-xs text-gray-500 line-through">
                                ₱{product.originalPrice.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-1.5 text-[11px] text-gray-500 min-h-[2rem] flex items-center">
                          <MapPin className="w-2.5 h-2.5 mr-1 flex-shrink-0" />
                          <span className="line-clamp-1">{product.location}</span>
                        </div>

                        <div className="mt-1">
                          <p className="text-[10px] text-gray-500">{product.seller}</p>
                        </div>

                        {/* Action Buttons */}
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
                                  variantLabel2Values: product.variantLabel2Values || [],
                                  variantLabel1Values: product.variantLabel1Values || [],
                                  stock: product.stock || 99,
                                } as any);
                                setShowBuyNowModal(true);
                              }
                            }}
                            className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-lg transition-all active:scale-95 h-8 text-xs"
                          >
                            Buy Now
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Load More Button */}
                {filteredProducts.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-12 text-center"
                  >
                    <Button
                      variant="outline"
                      className="px-8 py-3 border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white rounded-xl"
                    >
                      Load More Products
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
        <BazaarFooter />

        {addedProduct && showCartModal && (
          <CartModal
            isOpen={showCartModal}
            onClose={() => setShowCartModal(false)}
            productName={addedProduct.name}
            productImage={addedProduct.image}
            cartItemCount={cartItems.length}
          />
        )}

        <VisualSearchModal
          isOpen={showVisualSearchModal}
          onClose={() => setShowVisualSearchModal(false)}
          onRequestProduct={() => {
            setShowVisualSearchModal(false);
            setShowRequestModal(true);
          }}
          products={allProducts as any}
        />

        <ProductRequestModal
          isOpen={showRequestModal}
          onClose={() => setShowRequestModal(false)}
          initialSearchTerm={searchQuery}
        />

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
    </>
  );
}