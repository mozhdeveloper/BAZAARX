import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  Grid,
  List,
  Star,
  MapPin,
  Truck,
  Camera,
  Flame,
  Clock,
  BadgeCheck,
  ShoppingCart,
  RotateCcw,
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
  rating: number;
  sold: number;
  category: string;
  seller: string;
  isVerified: boolean;
  isFreeShipping?: boolean;
  location?: string;
  description?: string;
  sellerRating?: number;
  sellerVerified?: boolean;
};

// FlashSaleProduct interface removed

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
  const { toast } = useToast();
  const { profile, addToCart, setQuickOrder, cartItems } = useBuyerStore();
  const { products: sellerProducts, fetchProducts, subscribeToProducts } = useProductStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedSort, setSelectedSort] = useState("relevance");
  const [priceRange, setPriceRange] = useState<number[]>([0, 100000]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [addedProduct, setAddedProduct] = useState<{
    name: string;
    image: string;
  } | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showVisualSearchModal, setShowVisualSearchModal] = useState(false);

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
  }, [fetchProducts, subscribeToProducts]);

  const allProducts = useMemo<ShopProduct[]>(() => {
    const dbProducts = sellerProducts
      .filter((p) => (p.approvalStatus === "approved" || p.approvalStatus === "pending") && p.isActive)
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        originalPrice: p.originalPrice,
        image: p.images?.[0] || "https://placehold.co/400?text=Product",
        rating: p.rating || 0,
        sold: p.sales || 0,
        category: p.category,
        seller: p.sellerName || "Verified Seller",
        isVerified: p.approvalStatus === "pending",
        location: "Metro Manila",
        description: p.description,
        sellerRating: p.sellerRating || 0,
        sellerVerified: p.approvalStatus === "pending",
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
    setSelectedCategory("All Categories");
    setSelectedSort("relevance");
    setPriceRange([0, 100000]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {!isSupabaseConfigured() && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Database Not Configured</AlertTitle>
            <AlertDescription>
              Supabase environment variables are missing. Collaborators: please ensure you have a <code>.env</code> file with <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Shop Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Shop All Products
              </h1>
              <p className="text-gray-600 mt-1">
                Discover amazing products from trusted sellers
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md w-full lg:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products, brands, or sellers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
              />
              <button
                onClick={() => setShowVisualSearchModal(true)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-400 hover:text-[var(--brand-primary)] hover:bg-orange-50 rounded-lg transition-colors"
                title="Search by image"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Flash Sale Section */}
        <div className="mb-8 bg-white border-l-[12px] border-l-orange-500 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgba(255,106,0,0.15)] transition-all">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-xl text-orange-600">
                <Flame className="w-6 h-6" />
              </div>
              <h2 className="text-4xl font-black text-orange-600 uppercase tracking-wide">FLASH SALE</h2>
            </div>

            <div className="bg-orange-500 text-white rounded-xl px-5 py-2.5 flex items-center gap-3 shadow-sm border border-orange-400/20">
              <Clock className="w-5 h-5 text-white" />
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono tracking-widest">
                  {String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
                </span>
                <span className="text-[10px] text-white/90 font-medium uppercase tracking-wider ml-1">Left</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {flashSales.map((product: any, index: number) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl overflow-hidden cursor-pointer hover:shadow-xl transition-all border border-gray-200 hover:border-orange-500 pb-2"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="relative aspect-square mb-2">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Discount Badge - Mobile Style */}
                  <div className="absolute top-0 right-0 bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-bl-lg z-10">
                    -{product.discount}%
                  </div>
                </div>

                <div className="px-2">
                  <h3 className="font-medium text-xs line-clamp-2 mb-1 text-gray-800 min-h-[2.5em]">
                    {product.name}
                  </h3>

                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-[10px] text-gray-500">{product.rating}</span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <div className="text-base font-bold text-orange-600 leading-none">
                      ₱{product.price.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1">
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

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`lg:w-64 lg:sticky lg:top-20 lg:self-start ${showFilters ? "block" : "hidden lg:block"
              }`}
          >
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-gray-600 hover:text-[#FF5722] gap-1"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
              </div>

              <div className="flex flex-col h-[calc(100vh-140px)] gap-4">
                {/* Vertical Layered Categories */}
                <div className="flex-1 flex flex-col gap-1 min-h-0">
                  <h3 className="text-sm font-semibold text-gray-900 px-1 mb-1">Categories</h3>
                  {categoryOptions.map((category) => {
                    const isSelected = selectedCategory === category;
                    return (
                      <div
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`relative rounded-2xl transition-all duration-500 ease-in-out cursor-pointer overflow-hidden border
                          ${isSelected
                            ? "flex-[12] bg-orange-500 border-orange-400 shadow-md"
                            : "flex-1 bg-white border-gray-100 hover:bg-gray-50"
                          }
                        `}
                      >
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                          <span
                            className={`transition-all duration-500 transform
                                ${isSelected
                                ? "font-bold -rotate-90 text-white text-3xl tracking-widest origin-center whitespace-normal text-center w-64 leading-none"
                                : "font-medium text-gray-600 text-sm whitespace-nowrap"
                              }
                              `}
                          >
                            {category}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Price Range (Fixed at Bottom) */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm shrink-0">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Price Range</h3>
                  <div className="px-2">
                    <Slider
                      min={0}
                      max={100000}
                      step={100}
                      value={priceRange}
                      onValueChange={setPriceRange}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between mt-3 text-sm">
                      <span className="text-gray-600">
                        ₱{priceRange[0].toLocaleString()}
                      </span>
                      <span className="text-gray-600">
                        ₱{priceRange[1].toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-4 mb-6 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="lg:hidden flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium"
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                  </button>

                  <p className="text-gray-600 text-sm">
                    Showing {filteredProducts.length} results
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {/* Sort Dropdown */}
                  <Select value={selectedSort} onValueChange={setSelectedSort}>
                    <SelectTrigger className="w-[180px] border-gray-200">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded-md transition-colors ${viewMode === "grid"
                        ? "bg-white shadow-sm"
                        : "text-gray-400"
                        }`}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-md transition-colors ${viewMode === "list"
                        ? "bg-white shadow-sm"
                        : "text-gray-400"
                        }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Products Grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "space-y-4"
              }
            >
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer ${viewMode === "list" ? "flex" : ""
                    }`}
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <div
                    className={viewMode === "list" ? "w-48 flex-shrink-0" : ""}
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

                    <div className="mt-2 text-sm text-gray-500">
                      <MapPin className="w-3 h-3 mr-1" />
                      {product.location}
                    </div>

                    <div className="mt-2">
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

                          const sellerLocation = product.location || "Metro Manila";
                          const cartItem: any = {
                            id: product.id,
                            name: product.name,
                            price: product.price,
                            originalPrice: product.originalPrice,
                            image: product.image,
                            images: [product.image],
                            seller: {
                              id: `seller-${product.id}`,
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
                            sellerId: `seller-${product.id}`,
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

                          const sellerLocation = product.location || "Metro Manila";
                          const quickOrderItem: any = {
                            id: product.id,
                            name: product.name,
                            price: product.price,
                            originalPrice: product.originalPrice,
                            image: product.image,
                            images: [product.image],
                            seller: {
                              id: `seller-${product.id}`,
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
                            sellerId: `seller-${product.id}`,
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

                          setQuickOrder(quickOrderItem, 1);
                          // Navigate to checkout
                          navigate("/checkout");
                        }}
                        className="w-full bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-xl transition-all active:scale-95"
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

      <BazaarFooter />

      {/* Cart Modal */}
      {addedProduct && showCartModal && (
        <CartModal
          isOpen={showCartModal}
          onClose={() => setShowCartModal(false)}
          productName={addedProduct.name}
          productImage={addedProduct.image}
          cartItemCount={cartItems.length}
        />
      )}

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
    </div>
  );
}
