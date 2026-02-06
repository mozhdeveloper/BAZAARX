/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Filter,
  Star,
  MapPin,
  Truck,
  Flame,
  Clock,
  BadgeCheck,
  ShoppingCart,
  Gift,
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
import { BuyNowModal } from "../components/ui/buy-now-modal";
import { VariantSelectionModal } from "../components/ui/variant-selection-modal";
import ProductRequestModal from "../components/ProductRequestModal";
import VisualSearchModal from "../components/VisualSearchModal";
import { useToast } from "../hooks/use-toast";
// Hardcoded imports removed for database parity
import { categories } from "../data/categories";
import { useBuyerStore } from "../stores/buyerStore";
import { useProductStore } from "../stores/sellerStore";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { AlertCircle } from "lucide-react";
// import { useProductQAStore } from "../stores/productQAStore";


type ShopProduct = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  rating: number;
  sold: number;
  category: string;
  seller: string;
  sellerId: string;
  isVerified: boolean;
  isFreeShipping?: boolean;
  location?: string;
  description?: string;
  sellerRating?: number;
  sellerVerified?: boolean;
  colors?: string[];
  sizes?: string[];
  stock?: number;
  variants?: {
    id: string;
    name?: string;
    size?: string;
    color?: string;
    price: number;
    stock: number;
    image?: string;
  }[];
};

// Flash sale products are now derived from real products in the component

const categoryOptions = [
  "All Categories",
  ...categories.map((cat) => cat.name),
];

const sortOptions = [
  { value: "relevance", label: "Best Match" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "rating", label: "Customer Rating" },
  { value: "newest", label: "Newest Arrivals" },
  { value: "bestseller", label: "Best Sellers" },
];

export default function ShopPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToCart, setQuickOrder, cartItems, profile } = useBuyerStore();
  const { toast } = useToast();
  const { products: sellerProducts, fetchProducts, subscribeToProducts } = useProductStore();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
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
        colors: p.colors || [],
        sizes: p.sizes || [],
        stock: p.stock || 99,
        variants: p.variants || [],
      }));

    return dbProducts;
  }, [sellerProducts]);

  const flashSales = useMemo(() => {
    return allProducts
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
  }, [allProducts]);

  const filteredProducts = useMemo<ShopProduct[]>(() => {
    const filtered = allProducts.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.seller.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "All Categories" ||
        product.category === selectedCategory;

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
  }, [allProducts, searchQuery, selectedCategory, selectedSort, priceRange]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedSort("relevance");
    setPriceRange([0, 100000]);
  };

  return (
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
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                Products
              </span>
            </h1>

            <p className="text-medium text-gray-700 max-w-2xl mx-auto">
              Discover amazing products from trusted sellers.
            </p>
          </motion.div>
        </div>

        <div className="py-2 md:py-4">
          {/* Flash Sale Section */}
          <div className="mb-8 bg-white border-l-[8px] border-l-orange-500 rounded-2xl py-4 px-8 shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgba(255,106,0,0.15)] transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-orange-50 rounded-lg text-orange-600">
                  <Flame className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 uppercase tracking-wide">FLASH SALE</h2>
              </div>

              <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm border border-orange-400/20">
                <Clock className="w-4 h-4 text-white" />
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold font-mono tracking-widest">
                    {String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {flashSales.map((product: any, index: number) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all border border-gray-100 hover:border-orange-500 pb-2"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <div className="relative aspect-[4/3] mb-2">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-0 right-0 bg-orange-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl-md z-10">
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
                      <div className="text-base font-bold text-orange-600 leading-none">
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

          <div id="shop-content" className="flex flex-col lg:flex-row gap-8 scroll-mt-24">
            {/* Categories Sidebar */}
            <motion.div
              initial={false}
              animate={{
                height: showFilters ? "auto" : 0,
                opacity: showFilters ? 1 : 0,
                marginBottom: showFilters ? 24 : 0
              }}
              className={`lg:hidden overflow-hidden w-full`}
            >
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex flex-col gap-1">
                  {categoryOptions.map((category) => {
                    const isSelected = selectedCategory === category;
                    return (
                      <button
                        key={category}
                        onClick={() => {
                          setSelectedCategory(category);
                          setShowFilters(false);
                        }}
                        className={`w-full text-left px-4 rounded-xl transition-all duration-300
                          ${isSelected
                            ? "bg-[#ff6a00] text-white font-bold shadow-md py-4 text-base"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-normal py-2.5 text-sm"
                          }
                        `}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* Desktop Sidebar (Fixed/Sticky) */}
            <div className="hidden lg:block w-64 sticky top-20 self-start">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4 px-1">Categories</h3>
                <div className="flex flex-col gap-1">
                  {categoryOptions.map((category) => {
                    const isSelected = selectedCategory === category;
                    return (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`w-full text-left px-4 rounded-xl transition-all duration-300
                          ${isSelected
                            ? "bg-[#ff6a00] text-white font-bold shadow-md py-4 text-base"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-normal py-2.5 text-sm"
                          }
                        `}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="lg:hidden flex items-center gap-2 px-4 py-2 bg-gray-100/80 hover:bg-gray-200/80 rounded-xl text-xs font-semibold text-gray-700 transition-colors"
                    >
                      <Menu className="w-4 h-4" />
                      Categories
                    </button>

                    <p className="text-gray-600 text-xs">
                      Showing {filteredProducts.length} results
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex flex-wrap items-center gap-3 md:gap-4">
                      <Filter className="w-4 h-4 text-gray-400 mr-1" />

                      <Select value={selectedSort} onValueChange={setSelectedSort}>
                        <SelectTrigger className="w-[130px] md:w-[150px] h-8 border-gray-200 rounded-xl bg-white transition-all hover:border-[#ff6a00] hover:shadow-sm text-[12px] text-gray-800">
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

                      {/* Price Range Filter */}
                      <div className="hidden md:flex items-center gap-2 py-1 px-3 bg-white border border-gray-200 rounded-xl h-8">
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
                    <button
                      onClick={resetFilters}
                      className="text-[12px] -mb-3 font-small text-[#ff6a00] hover:text-[#e65f00] transition-colors pr-2"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Products Grid */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {filteredProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer"
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    <div>
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
                    </div>

                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-semibold text-gray-900 group-hover:text-[#FF5722] transition-colors duration-200 line-clamp-2 h-12">
                        {product.name}
                      </h3>

                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-600 ml-1">
                            {product.rating} ({product.sold.toLocaleString()})
                          </span>
                        </div>
                        {product.isVerified && (
                          <Badge
                            variant="outline"
                            className="text-xs gap-1 border-green-200 bg-green-50 text-green-700"
                          >
                            <BadgeCheck className="w-3 h-3" />
                            Verified
                          </Badge>
                        )}
                      </div>

                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-[#FF5722]">
                            ₱{product.price.toLocaleString()}
                          </span>
                          {product.originalPrice && (
                            <span className="text-sm text-gray-500 line-through">
                              ₱{product.originalPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 text-sm text-gray-500 min-h-[2.5rem] flex items-center">
                        <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span>{product.location}</span>
                      </div>

                      <div className="mt-2 flex-grow">
                        <p className="text-xs text-gray-500">{product.seller}</p>
                      </div>

                      {/* Always Visible Action Buttons */}
                      <div className="mt-auto pt-4 space-y-2">

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

                            // Check if product has variants/colors/sizes - show modal if so
                            const hasVariants = (product as any).variants && (product as any).variants.length > 0;
                            const hasColors = product.colors && product.colors.length > 0;
                            const hasSizes = product.sizes && product.sizes.length > 0;
                            
                            if (hasVariants || hasColors || hasSizes) {
                              // Show variant selection modal
                              setVariantProduct({
                                id: product.id,
                                name: product.name,
                                price: product.price,
                                image: product.image,
                                variants: (product as any).variants || [],
                                sizes: product.sizes || [],
                                colors: product.colors || [],
                                sellerId: product.sellerId,
                                seller: product.seller,
                                sellerRating: product.sellerRating,
                                sellerVerified: product.sellerVerified,
                                rating: product.rating,
                                category: product.category,
                                sold: product.sold,
                                isFreeShipping: product.isFreeShipping,
                                location: product.location,
                                description: product.description,
                                originalPrice: product.originalPrice,
                              });
                              setShowVariantModal(true);
                              return;
                            }

                            // No variants - add directly to cart
                            const sellerLocation = product.location || "Metro Manila";
                            const cartItem: any = {
                              id: product.id,
                              name: product.name,
                              price: product.price,
                              originalPrice: product.originalPrice,
                              image: product.image,
                              images: [product.image],
                              seller: {
                                id: product.sellerId,
                                name: product.seller,
                                avatar: "",
                                rating: product.sellerRating || 0,
                                totalReviews: 100,
                                followers: 1000,
                                isVerified: product.sellerVerified || false,
                                description: "",
                                location: sellerLocation,
                                established: "2020",
                                products: [],
                                badges: [],
                                responseTime: "1 hour",
                                categories: [product.category],
                              },
                              sellerId: product.sellerId,
                              rating: product.rating,
                              totalReviews: 100,
                              category: product.category,
                              sold: product.sold,
                              isFreeShipping: product.isFreeShipping ?? true,
                              location: sellerLocation,
                              description: product.description || "",
                              specifications: {},
                              variants: [],
                            };

                            addToCart(cartItem, 1);

                            // Show modal with product info
                            setAddedProduct({
                              name: product.name,
                              image: product.image,
                            });
                            setShowCartModal(true);
                          }}
                          variant="outline"
                          className="w-full border-[#FF5722] text-[#FF5722] hover:bg-[#FF5722] hover:text-white rounded-xl gap-2 transition-all active:scale-95"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          Add to Cart
                        </Button>

                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!profile) {
                              toast({
                                title: "Login Required",
                                description: "Please sign in to buy this product.",
                                variant: "destructive",
                              });
                              navigate("/login");
                              return;
                            }

                            // Set the product for buy now modal
                            setBuyNowProduct({
                              id: product.id,
                              name: product.name,
                              price: product.price,
                              originalPrice: product.originalPrice,
                              image: product.image,
                              images: product.images || [product.image],
                              sellerId: product.sellerId,
                              seller: product.seller,
                              sellerRating: product.sellerRating || 0,
                              sellerVerified: product.sellerVerified || false,
                              rating: product.rating,
                              category: product.category,
                              sold: product.sold,
                              isFreeShipping: product.isFreeShipping ?? true,
                              location: product.location || "Metro Manila",
                              description: product.description || "",
                              variants: product.variants || [],
                              colors: product.colors || [],
                              sizes: product.sizes || [],
                              stock: product.stock || 99,
                            });
                            setShowBuyNowModal(true);
                          }}
                          className="w-full bg-[#FF5722] hover:bg-[#271e1b] text-white rounded-xl transition-all active:scale-95"
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

      {/* Cart Modal */}
      {
        addedProduct && showCartModal && (
          <CartModal
            isOpen={showCartModal}
            onClose={() => setShowCartModal(false)}
            productName={addedProduct.name}
            productImage={addedProduct.image}
            cartItemCount={cartItems.length}
          />
        )
      }

      {/* Visual Search Modal */}
      <VisualSearchModal
        isOpen={showVisualSearchModal}
        onClose={() => setShowVisualSearchModal(false)}
        onRequestProduct={() => {
          setShowVisualSearchModal(false);
          setShowRequestModal(true);
        }}
        products={allProducts as any}
      />

      {/* Product Request Modal */}
      <ProductRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        initialSearchTerm={searchQuery}
      />

      {/* Buy Now Modal */}
      {
        buyNowProduct && (
          <BuyNowModal
            isOpen={showBuyNowModal}
            onClose={() => {
              setShowBuyNowModal(false);
              setBuyNowProduct(null);
            }}
            product={buyNowProduct}
            onConfirm={(quantity, variant) => {
              const sellerLocation = buyNowProduct.location || "Metro Manila";
              const quickOrderItem: any = {
                id: buyNowProduct.id,
                name: buyNowProduct.name,
                price: variant?.price || buyNowProduct.price,
                originalPrice: buyNowProduct.originalPrice,
                image: variant?.image || buyNowProduct.image,
                images: buyNowProduct.images || [buyNowProduct.image],
                seller: {
                  id: buyNowProduct.sellerId,
                  name: buyNowProduct.seller,
                  avatar: "",
                  rating: buyNowProduct.sellerRating || 0,
                  totalReviews: 100,
                  followers: 1000,
                  isVerified: buyNowProduct.sellerVerified || false,
                  description: "",
                  location: sellerLocation,
                  established: "2020",
                  products: [],
                  badges: [],
                  responseTime: "1 hour",
                  categories: [buyNowProduct.category],
                },
                sellerId: buyNowProduct.sellerId,
                rating: buyNowProduct.rating,
                totalReviews: 100,
                category: buyNowProduct.category,
                sold: buyNowProduct.sold,
                isFreeShipping: buyNowProduct.isFreeShipping ?? true,
                location: sellerLocation,
                description: buyNowProduct.description || "",
                specifications: {},
                variants: buyNowProduct.variants || [],
                selectedVariant: variant,
              };

              setQuickOrder(quickOrderItem, quantity, variant);
              setShowBuyNowModal(false);
              setBuyNowProduct(null);
              navigate("/checkout");
            }}
          />
        )
      }

      {/* Variant Selection Modal (for Add to Cart with variants) */}
      {variantProduct && (
        <VariantSelectionModal
          isOpen={showVariantModal}
          onClose={() => {
            setShowVariantModal(false);
            setVariantProduct(null);
          }}
          product={variantProduct}
          onConfirm={(variant, quantity) => {
            const sellerLocation = variantProduct.location || "Metro Manila";
            const cartItem: any = {
              id: variantProduct.id,
              name: variantProduct.name,
              price: variant?.price || variantProduct.price,
              originalPrice: variantProduct.originalPrice,
              image: variant?.image || variantProduct.image,
              images: [variantProduct.image],
              seller: {
                id: variantProduct.sellerId,
                name: variantProduct.seller,
                avatar: "",
                rating: variantProduct.sellerRating || 0,
                totalReviews: 100,
                followers: 1000,
                isVerified: variantProduct.sellerVerified || false,
                description: "",
                location: sellerLocation,
                established: "2020",
                products: [],
                badges: [],
                responseTime: "1 hour",
                categories: [variantProduct.category],
              },
              sellerId: variantProduct.sellerId,
              rating: variantProduct.rating,
              totalReviews: 100,
              category: variantProduct.category,
              sold: variantProduct.sold,
              isFreeShipping: variantProduct.isFreeShipping ?? true,
              location: sellerLocation,
              description: variantProduct.description || "",
              specifications: {},
              variants: variantProduct.variants || [],
            };

            addToCart(cartItem, quantity, variant);
            
            setShowVariantModal(false);
            setVariantProduct(null);
            
            // Show cart confirmation modal
            setAddedProduct({
              name: variantProduct.name,
              image: variant?.image || variantProduct.image,
            });
            setShowCartModal(true);
          }}
        />
      )}
    </div >
  );
}
