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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
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
import {
  trendingProducts,
  bestSellerProducts,
  newArrivals,
} from "../data/products";
import { categories } from "../data/categories";
import { useBuyerStore } from "../stores/buyerStore";
import { useProductStore, useAuthStore } from "../stores/sellerStore";
import { useProductQAStore } from "../stores/productQAStore";
import type { Product as BuyerProduct } from "../stores/buyerStore";

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

type LegacyCatalogProduct = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image?: string;
  rating?: number;
  sold?: number;
  category: string;
  seller?: string;
  sellerRating?: number;
  sellerVerified?: boolean;
  isFreeShipping?: boolean;
  isVerified?: boolean;
  location?: string;
  description?: string | null;
};

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
    id: "fs1",
    name: "Wireless Earbuds Pro",
    image:
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop",
    originalPrice: 2999,
    salePrice: 1499,
    discount: 50,
    sold: 234,
    stock: 500,
    rating: 4.8,
  },
  {
    id: "fs2",
    name: "Smart Watch Fitness Tracker",
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
    originalPrice: 4999,
    salePrice: 2999,
    discount: 40,
    sold: 189,
    stock: 300,
    rating: 4.7,
  },
  {
    id: "fs3",
    name: "Portable Power Bank 20000mAh",
    image:
      "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&h=400&fit=crop",
    originalPrice: 1999,
    salePrice: 999,
    discount: 50,
    sold: 456,
    stock: 200,
    rating: 4.9,
  },
  {
    id: "fs4",
    name: "LED Desk Lamp with USB",
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=400&fit=crop",
    originalPrice: 1499,
    salePrice: 799,
    discount: 47,
    sold: 321,
    stock: 150,
    rating: 4.6,
  },
];

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
  const { addToCart, setQuickOrder, cartItems } = useBuyerStore();
  const { products: sellerProducts } = useProductStore();
  const { products: qaProducts } = useProductQAStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedSort, setSelectedSort] = useState("relevance");
  const [priceRange, setPriceRange] = useState<number[]>([0, 10000]);
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

  // Combine seller products (verified) with QA verified products and mock products
  const allProducts = useMemo<ShopProduct[]>(() => {
    // Convert seller products to shop format (only approved ones)
    const seller = useAuthStore.getState().seller;
    const sellerName =
      seller?.businessName || seller?.storeName || "Verified Seller";

    const verifiedSellerProducts = sellerProducts
      .filter((p) => p.approvalStatus === "approved" && p.isActive)
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        originalPrice: p.originalPrice,
        image: p.images[0] || "https://placehold.co/400?text=Product",
        rating: p.rating || 0,
        sold: p.sales || 0,
        category: p.category,
        seller: sellerName,
        isVerified: true,
        isFreeShipping: true,
        location: "Metro Manila",
        description: p.description,
        sellerRating: p.rating || 0,
        sellerVerified: true,
      }));

    // Convert QA verified products to shop format
    const qaVerifiedProducts = qaProducts
      .filter((p) => p.status === "ACTIVE_VERIFIED")
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        originalPrice: undefined,
        image: p.image || "https://placehold.co/400?text=Product",
        rating: 4.5, // Default rating for QA verified products
        sold: 0, // New verified product
        category: p.category,
        seller: p.vendor,
        isVerified: true,
        isFreeShipping: true,
        location: "Metro Manila",
        description: `Quality verified ${p.name}`,
        sellerRating: 4.5,
        sellerVerified: true,
      }));

    // Generate mock products for variety
    const normalizeToShopProduct = (p: LegacyCatalogProduct): ShopProduct => ({
      id: p.id,
      name: p.name,
      price: p.price,
      originalPrice: p.originalPrice,
      image: p.image || "https://placehold.co/400?text=Product",
      rating: p.rating ?? 4.5,
      sold: p.sold ?? 0,
      category: p.category,
      seller: p.seller || "Top Seller",
      isVerified: p.isVerified ?? false,
      isFreeShipping: p.isFreeShipping ?? true,
      location: p.location || "Metro Manila",
      description: p.description || p.name,
      sellerRating: p.sellerRating ?? p.rating ?? 4.5,
      sellerVerified: p.sellerVerified ?? false,
    });

    const baseMockSources: ShopProduct[] = [
      ...trendingProducts,
      ...bestSellerProducts,
      ...newArrivals,
    ].map(normalizeToShopProduct);

    const mockProducts: ShopProduct[] = [];

    for (let i = 0; i < 3; i++) {
      mockProducts.push(
        ...baseMockSources.map((product) => {
          const baseSold = typeof product.sold === "number" ? product.sold : 0;
          const baseRating =
            typeof product.rating === "number" ? product.rating : 4.5;
          return {
            id: `${product.id}-${i}`,
            name: `${product.name} ${i > 0 ? `(Variant ${i + 1})` : ""}`,
            price: Math.round(product.price * (0.8 + Math.random() * 0.4)),
            originalPrice: product.originalPrice,
            image: product.image || "https://placehold.co/400?text=Product",
            rating: baseRating,
            sold: Math.round(baseSold * (0.5 + Math.random() * 1.5)),
            category: product.category,
            seller: product.seller,
            isVerified: product.isVerified,
            isFreeShipping: product.isFreeShipping,
            location: product.location,
            description: product.description || product.name,
            sellerRating: product.sellerRating ?? baseRating,
            sellerVerified: product.sellerVerified,
          };
        })
      );
    }

    // Combine: verified products first (both seller and QA), then mock products
    return [...verifiedSellerProducts, ...qaVerifiedProducts, ...mockProducts];
  }, [sellerProducts, qaProducts]);

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
    setPriceRange([0, 10000]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

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
                Discover amazing products from trusted Filipino sellers
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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 rounded-2xl p-6 text-white relative overflow-hidden"
        >
          {/* Animated Background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" />
            <div
              className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"
              style={{ animationDelay: "1s" }}
            />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Flame className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold">Flash Sale</h2>
                  <p className="text-white/90">Up to 50% OFF - Limited Time!</p>
                </div>
              </div>

              {/* Countdown Timer */}
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6" />
                <div className="flex gap-2">
                  {[
                    { label: "Hours", value: timeLeft.hours },
                    { label: "Mins", value: timeLeft.minutes },
                    { label: "Secs", value: timeLeft.seconds },
                  ].map((item, index) => (
                    <div key={item.label} className="flex items-center">
                      <div className="bg-white/30 backdrop-blur-md rounded-xl p-3 min-w-[70px] text-center border border-white/20 shadow-lg">
                        <div className="text-2xl font-bold">
                          {String(item.value).padStart(2, "0")}
                        </div>
                        <div className="text-xs text-white/90 font-medium">
                          {item.label}
                        </div>
                      </div>
                      {index < 2 && (
                        <div className="text-2xl font-bold mx-2">:</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Flash Sale Products */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {flashSaleProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl p-4 text-gray-900 group cursor-pointer hover:shadow-xl transition-all"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <div className="relative aspect-square mb-3 overflow-hidden rounded-lg">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      -{product.discount}%
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-2">
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                        <div
                          className="bg-orange-500 h-1.5 rounded-full"
                          style={{
                            width: `${(product.sold / product.stock) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-white text-center">
                        {product.sold} sold
                      </div>
                    </div>
                  </div>
                  <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-orange-600 transition-colors">
                    {product.name}
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-orange-600">
                      ₱{product.salePrice}
                    </span>
                    <span className="text-xs text-gray-400 line-through">
                      ₱{product.originalPrice}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`lg:w-64 lg:sticky lg:top-20 lg:self-start ${
              showFilters ? "block" : "hidden lg:block"
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

              <Accordion
                type="multiple"
                defaultValue={["categories", "price"]}
                className="space-y-4"
              >
                {/* Categories */}
                <AccordionItem value="categories" className="border-b-0">
                  <AccordionTrigger className="text-sm font-medium text-gray-900 hover:no-underline py-2">
                    Categories
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {categoryOptions.map((category) => (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all ${
                            selectedCategory === category
                              ? "bg-[#FF5722] text-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Price Range */}
                <AccordionItem value="price" className="border-b-0">
                  <AccordionTrigger className="text-sm font-medium text-gray-900 hover:no-underline py-2">
                    Price Range
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="px-2">
                        <Slider
                          min={0}
                          max={10000}
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
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
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
                      className={`p-2 rounded-md transition-colors ${
                        viewMode === "grid"
                          ? "bg-white shadow-sm"
                          : "text-gray-400"
                      }`}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-md transition-colors ${
                        viewMode === "list"
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
                  className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer ${
                    viewMode === "list" ? "flex" : ""
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

                    <div className="mt-2 flex items-center text-sm text-gray-500">
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
                          const sellerLocation =
                            product.location || "Metro Manila";
                          // Transform simple Product to CartItem format
                          const cartItem: BuyerProduct = {
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
                        className="w-full border-[#FF5722] text-[#FF5722] hover:bg-[#FF5722] hover:text-white rounded-xl gap-2"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Add to Cart
                      </Button>

                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          const sellerLocation =
                            product.location || "Metro Manila";
                          // Create quick order item
                          const quickOrderItem: BuyerProduct = {
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
                        className="w-full bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-xl"
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
      {addedProduct && (
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
}
