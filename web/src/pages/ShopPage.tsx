/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams, Link, useLocation } from "react-router-dom";
import {
  Star,
  MapPin,
  Truck,
  BadgeCheck,
  ShoppingCart,
  Menu,
  Flame,
  ChevronRight,
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
import { categoryService } from "@/services/categoryService";
import { useBuyerStore } from "../stores/buyerStore";
import { useProductStore } from "../stores/sellerStore";
import { isSupabaseConfigured } from "@/lib/supabase";
import { discountService } from "@/services/discountService";
import { featuredProductService, type FeaturedProductWithDetails } from "@/services/featuredProductService";
import { adBoostService, type AdBoostWithProduct } from "@/services/adBoostService";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { AlertCircle } from "lucide-react";
import ProductCard from "../components/ProductCard";
import { getSafeImageUrl } from "../utils/imageUtils";
// import { useProductQAStore } from "../stores/productQAStore";
import { ShopProduct } from "../types/shop";
import type { ActiveDiscount } from "@/types/discount";
import { CampaignCountdown } from "../components/shop/CampaignCountdown";

// Flash sale products are now derived from real products in the component
import { bestSellerProducts } from "../data/products";

const sortOptions = [
  { value: "newest", label: "Newest Arrivals" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "rating", label: "Rating" },
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
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const manualScrollRef = useRef(false);
  const suppressNextAutoScrollRef = useRef(false);
  const { addToCart, setQuickOrder, cartItems, profile } = useBuyerStore();
  const { toast } = useToast();
  const { products: sellerProducts, fetchProducts, subscribeToProducts } = useProductStore();
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedSkinTypes, setSelectedSkinTypes] = useState<string[]>([]);
  const [selectedSort, setSelectedSort] = useState("newest");
  const [priceRange, setPriceRange] = useState<number[]>([0, 100000]);
  const [minRating, setMinRating] = useState<number>(0);
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
  const [activeCampaignDiscounts, setActiveCampaignDiscounts] = useState<Record<string, ActiveDiscount>>({});

  // Variant Selection Modal state (for Add to Cart)
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [variantProduct, setVariantProduct] = useState<any>(null);
  const [isBuyNowAction, setIsBuyNowAction] = useState(false);

  // Real flash sale products and accurate countdown
  const [flashSaleProducts, setFlashSaleProducts] = useState<any[]>([]);

  // Featured products
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProductWithDetails[]>([]);
  const [boostedProducts, setBoostedProducts] = useState<AdBoostWithProduct[]>([]);

  // Fetch real flash sale products (global admin events from global_flash_sale_slots)
  useEffect(() => {
    discountService.getGlobalFlashSaleProducts()
      .then((data) => {
        if (data && data.length > 0) {
          setFlashSaleProducts(data);
        }
      })
      .catch((e) => console.error('Failed to load flash sales:', e));

    // Fetch featured products
    featuredProductService.getFeaturedProducts(12).then(data => {
      setFeaturedProducts(data);
    }).catch(e => console.error('Failed to load featured products:', e));

    // Fetch boosted products (ad boosts)
    adBoostService.getActiveBoostedProducts('featured', 12).then(data => {
      setBoostedProducts(data);
    }).catch(e => console.error('Failed to load boosted products:', e));
  }, []);

  // 2. Fetch categories on mount
  useEffect(() => {
    categoryService.getActiveCategories()
      .then(data => {
        if (data) setCategories(data);
      })
      .catch(err => console.error('Failed to fetch categories:', err));
  }, []);

  const allProducts = useMemo<ShopProduct[]>(() => {
    // Create a set of active category names for O(1) lookup
    const activeCategoryNames = new Set(categories.map(c => c.name));

    const dbProducts = sellerProducts
      .filter((p) =>
        p.approvalStatus === "approved" &&
        p.isActive
      )
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        originalPrice: p.originalPrice,
        image: p.images?.[0] || "https://placehold.co/400?text=Product",
        images: p.images || [],
        rating: p.rating || 0,
        sold: p.sales || 0,
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
        lifetimeSold: (p as any).lifetimeSold || p.sales || 0,
      }));

    return dbProducts;
  }, [sellerProducts, categories]);

  useEffect(() => {
    let isMounted = true;

    const loadDiscounts = async () => {
      const productIds = [...new Set(allProducts.map(product => product.id).filter(Boolean))];
      if (productIds.length === 0) {
        if (isMounted) setActiveCampaignDiscounts({});
        return;
      }

      try {
        const discounts = await discountService.getActiveDiscountsForProducts(productIds);
        if (isMounted) {
          setActiveCampaignDiscounts(discounts);
        }
      } catch (error) {
        console.error("Failed to load campaign discounts in shop:", error);
        if (isMounted) {
          setActiveCampaignDiscounts({});
        }
      }
    };

    loadDiscounts();
    return () => {
      isMounted = false;
    };
  }, [allProducts]);

  const pricedProducts = useMemo<ShopProduct[]>(() => {
    return allProducts.map((product) => {
      const activeDiscount = activeCampaignDiscounts[product.id] || null;
      if (!activeDiscount) return product;

      // Check if ProductService already handled this discount
      const alreadyDiscounted = product.originalPrice && product.originalPrice > product.price;

      if (alreadyDiscounted) {
        return {
          ...product,
          discountBadgePercent: activeDiscount.discountType === 'percentage'
            ? Math.round(activeDiscount.discountValue)
            : undefined,
          discountBadgeTooltip:
            activeDiscount.discountType === 'percentage' && typeof activeDiscount.maxDiscountAmount === 'number'
              ? `Up to ₱${activeDiscount.maxDiscountAmount.toLocaleString()} off`
              : undefined,
          campaignDiscount: {
            discountType: activeDiscount.discountType,
            discountValue: activeDiscount.discountValue,
            maxDiscountAmount: activeDiscount.maxDiscountAmount
          },
        };
      }

      // If not already discounted, apply it now
      const calculation = discountService.calculateLineDiscount(product.price, 1, activeDiscount);
      if (calculation.discountPerUnit <= 0) return product;

      return {
        ...product,
        price: calculation.discountedUnitPrice,
        originalPrice: activeDiscount.originalPrice || product.price,
        campaignDiscount: {
          discountType: activeDiscount.discountType,
          discountValue: activeDiscount.discountValue,
          maxDiscountAmount: activeDiscount.maxDiscountAmount
        },
        discountBadgePercent: activeDiscount.discountType === 'percentage'
          ? Math.round(activeDiscount.discountValue)
          : undefined,
        discountBadgeTooltip:
          activeDiscount.discountType === 'percentage' && typeof activeDiscount.maxDiscountAmount === 'number'
            ? `Up to ₱${activeDiscount.maxDiscountAmount.toLocaleString()} off`
            : undefined
      };
    });
  }, [allProducts, activeCampaignDiscounts]);

  const categoryCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of allProducts) {
      if (!p.category) {
        map.set("Uncategorized", (map.get("Uncategorized") || 0) + 1);
        continue;
      }
      map.set(p.category, (map.get(p.category) || 0) + 1);
    }
    return map;
  }, [allProducts]);

  const otherProductsCount = useMemo(() => {
    const activeCategoryNames = new Set(categories.map(c => c.name.toLowerCase()));
    let count = 0;
    for (const [catName, catCount] of categoryCountMap.entries()) {
      if (!activeCategoryNames.has(catName.toLowerCase()) || catName.toLowerCase() === 'others') {
        count += catCount;
      }
    }
    return count;
  }, [categories, categoryCountMap]);

  const categoryOptions = useMemo(() => {
    const options = ["All Categories", ...categories.filter(c => c.name.toLowerCase() !== 'others').map((cat) => cat.name)];
    if (otherProductsCount > 0) {
      options.push("Others");
    }
    return options;
  }, [categories, otherProductsCount]);

  useEffect(() => {
    // Fetch initial products - only approved and active products
    const filters = {
      isActive: true,
      approvalStatus: 'approved',
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
    const timeouts: number[] = [];
    const queryParam = searchParams.get("q") || "";
    const categoryParam = searchParams.get("category");
    const filterParam = searchParams.get("filter");

    // Sorting should not move the viewport; skip one auto-scroll cycle.
    if (suppressNextAutoScrollRef.current) {
      suppressNextAutoScrollRef.current = false;
      return;
    }

    setSearchQuery(queryParam);

    if (categoryParam) {
      // Resolve slug to name for proper filtering and sidebar highlighting
      const matchedCategory = categories.find(
        c => c.slug === categoryParam || c.name.toLowerCase() === categoryParam.toLowerCase()
      );
      
      if (matchedCategory) {
        setSelectedCategory(matchedCategory.name);
      } else if (categoryParam.toLowerCase() === 'others') {
        setSelectedCategory('Others');
      } else {
        setSelectedCategory(categoryParam);
      }
    } else {
      setSelectedCategory("All Categories");
    }

  // Scroll logic - handles both initial mount and updates

  // When "Clear filter" is clicked, scroll back to the featured section after it re-mounts
  if ((location.state as any)?.scrollToFeatured) {
    const featuredTimeoutId = window.setTimeout(() => {
      const element = document.getElementById("featured-section");
      if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
      manualScrollRef.current = false;
    }, 400);
    timeouts.push(featuredTimeoutId);
  } else {
    const scrollTimeoutId = window.setTimeout(() => {
      const isClean =
        !categoryParam &&
        !queryParam &&
        !filterParam &&
        priceRange[0] === 0 &&
        priceRange[1] === 100000 &&
        minRating === 0 &&
        selectedSort === "newest";

      if (isClean && !manualScrollRef.current) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const element = document.getElementById("shop-results-header");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }

      manualScrollRef.current = false;
    }, filterParam === "featured" ? 420 : 100);

    timeouts.push(scrollTimeoutId);
  }

  return () => {
    timeouts.forEach((id) => {
      clearTimeout(id);
    });
  };

  }, [searchParams, location.key, priceRange, minRating, selectedSort, categories]);

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







  // flashSaleProducts comes from the real discount campaigns (state above)

  const featuredProductIds = useMemo(() => {
    const ids = new Set<string>();
    for (const bp of boostedProducts) {
      if (bp.product?.id) ids.add(bp.product.id);
    }
    for (const fp of featuredProducts) {
      const p = (fp as any).product;
      if (p?.id) ids.add(p.id);
    }
    return ids;
  }, [boostedProducts, featuredProducts]);

  const filteredProducts = useMemo<ShopProduct[]>(() => {
    const filterParam = searchParams.get("filter");
    const filtered = pricedProducts.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.seller.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "All Categories" ||
        (selectedCategory === "Others"
          ? !categories.some(c => c.name.toLowerCase() === product.category.toLowerCase() && c.name.toLowerCase() !== 'others')
          : product.category.toLowerCase() === selectedCategory.toLowerCase());

      // Use slider price range instead of predefined ranges
      const matchesPrice =
        product.price >= priceRange[0] && product.price <= priceRange[1];

      const matchesRating = minRating === 0 || (product.rating || 0) >= minRating;

      return matchesSearch && matchesCategory && matchesPrice && matchesRating;
    });

    // When filter=featured is active, show ONLY featured/boosted products
    let result = filtered;
    if (filterParam === "featured" && featuredProductIds.size > 0) {
      result = filtered.filter(product => featuredProductIds.has(product.id));
    }

    // Apply sorting
    switch (selectedSort) {
      case "price-low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "bestseller":
        result.sort((a, b) => (b.sold || 0) - (a.sold || 0));
        break;
      default:
        // Keep original order for relevance and newest
        break;
    }

    return result;
  }, [pricedProducts, searchQuery, selectedCategory, selectedSkinTypes, selectedSort, priceRange, minRating, searchParams, featuredProductIds]);



  const resetFilters = () => {
    setSearchQuery("");
    setSelectedSort("newest");
    setPriceRange([0, 100000]);
    setMinRating(0);
  };

  return (
    <>
      <div className="min-h-screen bg-muted/30">
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-4 flex flex-col gap-2">
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
              className="text-sm font-bold text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)] pb-0.5"
              onClick={() => {
                resetFilters();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Shop
            </Link>
            <Link
              to="/categories"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-all duration-300"
            >
              Categories
            </Link>
            <Link
              to="/collections"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-all duration-300"
            >
              Collections
            </Link>
            <Link
              to="/stores"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-all duration-300"
            >
              Stores
            </Link>
            <Link
              to="/registry"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-all duration-300"
            >
              Registry & Gifting
            </Link>
          </div>

          {/* Shop Header */}
          <div className="py-24 bg-hero-gradient backdrop-blur-md shadow-md rounded-3xl border-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center px-4"
            >
              <h1 className="text-4xl md:text-6xl font-black text-[var(--text-headline)] mb-2 tracking-tight font-heading">
                Shop All {''}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-primary)] to-[var(--text-accent)]">
                  Products
                </span>
              </h1>

              <p className="text-lg text-[var(--text-primary)] max-w-2xl mx-auto font-medium">
                Discover amazing products from trusted sellers.
              </p>
            </motion.div>
          </div>

          <div className="pt-2 pb-0">
            {/* Flash Sale Section — one block per active campaign */}
            {flashSaleProducts.length > 0 && (() => {
              // Group products by campaign
              const campaignMap = new Map<string, { id: string; name: string; endsAt: string; color: string; products: any[] }>();
              for (const p of flashSaleProducts) {
                const key = p.campaignId || 'default';
                if (!campaignMap.has(key)) {
                  campaignMap.set(key, {
                    id: key,
                    name: p.campaignName || 'Flash Sale',
                    endsAt: p.campaignEndsAt || '',
                    color: p.campaignBadgeColor || 'var(--brand-primary)',
                    products: []
                  });
                }
                campaignMap.get(key)!.products.push(p);
              }
              const campaigns = Array.from(campaignMap.values());

              return campaigns.map((campaign, ci) => {
                // Per-campaign countdown
                const endsAt = campaign.endsAt;
                return (
                  <div
                    key={ci}
                    className="mb-2 bg-gradient-to-br from-white via-white to-[var(--brand-wash)]/30 rounded-2xl py-6 px-4 sm:px-6 lg:px-8 shadow-[0_4px_25px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_35px_rgba(255,106,0,0.12)] transition-all duration-500 border border-white/50"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2
                              className="text-2xl md:text-3xl font-black uppercase tracking-tight font-heading leading-none"
                              style={{ color: campaign.color }}
                            >
                              {campaign.name}
                            </h2>
                          </div>
                        </div>

                        {endsAt && <CampaignCountdown endsAt={endsAt} variant="default" />}
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <Link
                          to={`/flash-sales?campaign=${campaign.id}`}
                          className="group flex items-center gap-2 text-[var(--brand-accent)] font-medium text-sm hover:text-[var(--brand-primary-dark)] transition-colors"
                        >
                          <span>View All</span>
                          <svg
                            width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            className="group-hover:translate-x-1 transition-transform"
                          >
                            <line x1="7" y1="17" x2="17" y2="7"></line>
                            <polyline points="7 7 17 7 17 17"></polyline>
                          </svg>
                        </Link>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 shrink-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {campaign.products.slice(0, 6).map((product: any, index: number) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          index={index}
                          isFlash={true}
                        />
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Featured Products Section — Shopee/Lazada-style Sponsored Products */}
          <AnimatePresence>
          {(featuredProducts.length > 0 || boostedProducts.length > 0) && searchParams.get("filter") !== "featured" && (
            <motion.div
              id="featured-section"
              key="featured-section"
              className="mb-10 scroll-mt-24"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
              {/* Section Header */}
              <div className="flex items-center justify-between mb-5 px-1">
                <div className="flex items-center gap-2.5">
                  <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-1.5 rounded-lg shadow-md shadow-amber-200/50">
                    <Star className="h-4 w-4 text-white fill-white" />
                  </div>
                  <h2 className="text-xl font-extrabold text-[var(--text-headline)] tracking-tight">Featured Products</h2>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5 uppercase tracking-wider">
                    Sponsored
                  </span>
                </div>
                <button
                  onClick={() => navigate('/shop?filter=featured')}
                  className="text-xs text-[var(--brand-primary)] hover:text-[var(--brand-accent)] font-semibold transition-colors flex items-center gap-1"
                >
                  See All <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Sponsored Products Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {(() => {
                  const seenIds = new Set<string>();
                  const allItems: { key: string; product: any; isBoosted: boolean }[] = [];

                  for (const bp of boostedProducts) {
                    const product = bp.product;
                    if (!product || seenIds.has(product.id)) continue;
                    seenIds.add(product.id);
                    allItems.push({ key: `boost-${bp.id}`, product, isBoosted: true });
                  }

                  for (const fp of featuredProducts) {
                    const product = (fp as any).product;
                    if (!product || seenIds.has(product.id)) continue;
                    seenIds.add(product.id);
                    allItems.push({ key: `feat-${(fp as any).id}`, product, isBoosted: false });
                  }

                  return allItems.slice(0, 6).map(({ key, product, isBoosted }, idx) => {
                    const primaryImage = product.images?.find((img: any) => img.is_primary) || product.images?.[0];
                    const imageUrl = getSafeImageUrl(primaryImage?.image_url);
                    const reviews = product.reviews || [];
                    const avgRating = reviews.length > 0
                      ? Math.round((reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length) * 10) / 10
                      : 0;
                    const totalStock = product.variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || 0;
                    const sellerName = product.seller?.store_name || 'BazaarX Store';
                    const soldCount = product.soldCount || product.sold_count || 0;

                    return (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.06 }}
                        onClick={() => navigate(`/product/${product.id}`)}
                        className="group relative bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-amber-200 shadow-sm hover:shadow-lg hover:shadow-amber-100/40 transition-all duration-300 cursor-pointer flex flex-col"
                      >
                        {/* Sponsored indicator */}
                        <div className="absolute top-2 left-2 z-10">
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50/90 backdrop-blur-sm border border-amber-200/60 rounded px-1.5 py-0.5 uppercase tracking-wider">
                            Ad
                          </span>
                        </div>

                        {/* Product Image */}
                        <div className="relative aspect-square overflow-hidden bg-gray-50">
                          <img
                            src={imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=No+Image';
                            }}
                          />
                          {/* Gradient overlay at bottom */}
                          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/10 to-transparent" />
                        </div>

                        {/* Product Info */}
                        <div className="p-3 flex flex-col flex-1">
                          {/* Product Name */}
                          <h3 className="text-[13px] font-semibold text-gray-800 line-clamp-2 leading-tight mb-2 group-hover:text-[var(--brand-primary)] transition-colors min-h-[2.5rem]">
                            {product.name}
                          </h3>

                          {/* Rating */}
                          {avgRating > 0 && (
                            <div className="flex items-center gap-1 mb-2">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${i < Math.floor(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`}
                                  />
                                ))}
                              </div>
                              <span className="text-[11px] text-gray-400 font-medium">({reviews.length})</span>
                            </div>
                          )}

                          {/* Price */}
                          <div className="mb-2">
                            <span className="text-lg font-extrabold text-[#D97706] leading-none">
                              ₱{product.price?.toLocaleString() || '0'}
                            </span>
                          </div>

                          {/* Sold count */}
                          {/* Sold count and Stock indicator */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                              {((product as any).lifetimeSold !== undefined ? (product as any).lifetimeSold : soldCount).toLocaleString()} sold
                            </div>
                            <div className={`text-[10px] font-bold ${totalStock < 10 ? 'text-red-500' : 'text-green-600'}`}>
                              {totalStock > 0 ? `${totalStock} in stock` : 'Out of stock'}
                            </div>
                          </div>

                          {/* Seller */}
                          <div className="mt-auto pt-2 border-t border-gray-50">
                            <p className="text-[11px] text-gray-500 font-medium truncate">{sellerName}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  });
                })()}
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          {/* Main Content */}
          <div className="w-full" id="shop-content">
            {/* Toolbar */}


            {/* Mobile Filters Menu */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="lg:hidden overflow-hidden bg-white/80 backdrop-blur-md rounded-xl border border-gray-100 mb-6 shadow-sm"
                  id="mobile-filters-menu"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-[var(--text-headline)] text-sm">Filter by Category</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFilters(false)}
                        className="h-8 w-8 p-0 rounded-full hover:bg-[var(--brand-wash-gold)]/20 flex items-center justify-center"
                      >
                        <span className="text-xl leading-none">&times;</span>
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {categoryOptions.map((category) => (
                        <button
                          key={category}
                          onClick={() => {
                            manualScrollRef.current = true;
                            setSelectedCategory(category);
                            setSearchParams((prev) => {
                              const next = new URLSearchParams(prev);
                              if (category === "All Categories") {
                                next.delete("category");
                              } else {
                                next.set("category", category);
                              }
                              return next;
                            });
                            setShowFilters(false);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 focus:outline-none ${selectedCategory === category
                            ? "bg-[var(--brand-primary)] text-white font-bold shadow-md scale-105"
                            : "bg-[var(--brand-wash)] text-[var(--text-primary)] hover:bg-[var(--brand-wash-gold)] font-medium"
                            }`}
                          aria-pressed={selectedCategory === category}
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
                <div className="sticky top-28 h-[calc(100vh-120px)] overflow-y-auto pr-6 scrollbar-hide space-y-10 pb-10">
                  {/* Categories Section */}
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text-headline)] mb-6 font-primary sticky top-0 z-20 bg-[var(--brand-wash)] py-3 -mt-3.5 -mx-1 px-1">Categories</h2>
                    <div className="space-y-4">
                      <button
                        onClick={() => {
                          manualScrollRef.current = true;
                          setSelectedCategory("All Categories");
                          setSearchParams((prev) => {
                            const next = new URLSearchParams(prev);
                            next.delete("category");
                            return next;
                          });
                        }}
                        className={`w-full flex justify-between items-center group transition-colors focus:outline-none ${selectedCategory === "All Categories" ? "text-[var(--brand-primary)] font-bold" : "text-[var(--text-primary)] font-medium hover:text-[var(--text-headline)]"}`}
                        aria-pressed={selectedCategory === "All Categories"}
                      >
                        <span className={`text-sm ${selectedCategory === "All Categories" ? "font-bold" : "font-medium"}`}>All Product</span>
                        <span className={`text-xs ${selectedCategory === "All Categories" ? "text-[var(--brand-primary)] font-bold" : "text-[var(--text-muted)] font-normal"}`}>
                          {allProducts.length}
                        </span>
                      </button>
                      {categories.filter(c => c.name.toLowerCase() !== 'others').map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            manualScrollRef.current = true;
                            setSelectedCategory(cat.name);
                            setSearchParams((prev) => {
                              const next = new URLSearchParams(prev);
                              next.set("category", cat.name);
                              return next;
                            });
                          }}
                          className={`w-full flex justify-between items-center group transition-colors focus:outline-none ${selectedCategory.toLowerCase() === cat.name.toLowerCase() ? "text-[var(--brand-primary)] font-bold" : "text-[var(--text-primary)] font-medium hover:text-[var(--text-headline)]"}`}
                          aria-pressed={selectedCategory.toLowerCase() === cat.name.toLowerCase()}
                        >
                          <span className={`text-sm ${selectedCategory.toLowerCase() === cat.name.toLowerCase() ? "font-bold" : "font-medium"}`}>{cat.name}</span>
                          <span className={`text-xs ${selectedCategory.toLowerCase() === cat.name.toLowerCase() ? "text-[var(--brand-primary)] font-bold" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)] font-normal"}`}>
                            {categoryCountMap.get(cat.name) ?? 0}
                          </span>
                        </button>
                      ))}

                      {otherProductsCount > 0 && (
                        <button
                          onClick={() => {
                            manualScrollRef.current = true;
                            setSelectedCategory("Others");
                            setSearchParams((prev) => {
                              const next = new URLSearchParams(prev);
                              next.set("category", "Others");
                              return next;
                            });
                          }}
                          className={`w-full flex justify-between items-center group transition-colors focus:outline-none ${selectedCategory.toLowerCase() === "others" ? "text-[var(--brand-primary)] font-bold" : "text-[var(--text-primary)] font-medium hover:text-[var(--text-headline)]"}`}
                          aria-pressed={selectedCategory.toLowerCase() === "others"}
                        >
                          <span className={`text-sm ${selectedCategory.toLowerCase() === "others" ? "font-bold" : "font-medium"}`}>Others</span>
                          <span className={`text-xs ${selectedCategory.toLowerCase() === "others" ? "text-[var(--brand-primary)] font-bold" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)] font-normal"}`}>
                            {otherProductsCount}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    <h2 className="text-lg font-bold text-[var(--text-headline)] mb-4 font-primary sticky top-0 z-20 bg-[var(--brand-wash)] py-3 -mt-3.5 -mx-1 px-1">Filter By</h2>

                    <div className="space-y-6">
                      {/* Price Section */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <h3 className="font-bold text-gray-900 text-sm whitespace-nowrap">Price</h3>
                          <div className="flex-1">
                            <Slider
                              defaultValue={[0, 100000]}
                              max={100000}
                              step={100}
                              value={priceRange}
                              onValueChange={(val) => {
                                manualScrollRef.current = true;
                                setPriceRange(val);
                              }}
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
                                type="number"
                                value={priceRange[0]}
                                onChange={(e) => setPriceRange([Math.min(Number(e.target.value), priceRange[1]), priceRange[1]])}
                                className="w-full pl-6 pr-2 py-1.5 text-xs font-bold text-[var(--text-primary)] border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--brand-primary)]"
                                placeholder="Min"
                              />
                            </div>
                          </div>
                          <span className="text-[var(--text-muted)] mt-5">-</span>
                          <div className="flex-1">
                            <label className="text-[10px] text-[var(--text-muted)] font-medium mb-1 block">Max</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">₱</span>
                              <input
                                type="number"
                                value={priceRange[1]}
                                onChange={(e) => setPriceRange([priceRange[0], Math.max(Number(e.target.value), priceRange[0])])}
                                className="w-full pl-6 pr-2 py-1.5 text-xs font-bold text-[var(--text-primary)] border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--brand-primary)]"
                                placeholder="Max"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Size Section */}
                      <div className="space-y-3">
                        <h3 className="font-bold text-[var(--text-headline)] text-sm">Size</h3>
                        <div className="flex flex-wrap gap-2">
                          {sizeOptions.map((size) => (
                            <button
                              key={size}
                              className="w-9 h-9 rounded-full border border-[var(--border)] bg-white flex items-center justify-center text-xs font-bold text-[var(--text-primary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-all active:scale-95 shadow-sm"
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Color Section */}
                      <div className="space-y-3">
                        <h3 className="font-bold text-[var(--text-headline)] text-sm">Color</h3>
                        <div className="flex flex-wrap gap-2.5">
                          {colorOptions.map((color) => (
                            <button
                              key={color.name}
                              className={`w-5 h-5 rounded-full border border-[var(--border)] shadow-sm hover:scale-110 transition-transform ${color.name === "Orange" ? "ring-2 ring-offset-2 ring-[var(--brand-primary)]" : ""}`}
                              style={{ backgroundColor: color.hex }}
                              title={color.name}
                              aria-label={`Filter by color: ${color.name}`}
                            />
                          ))}
                        </div>
                      </div>



                      {/* Brands Section */}
                      <div className="space-y-3">
                        <h3 className="font-bold text-gray-900 text-sm">Brands</h3>
                        <div className="space-y-3">
                          {brandOptions.map((brand) => (
                            <button
                              key={brand.name}
                              className="w-full flex justify-between items-center group cursor-pointer hover:text-gray-900"
                            >
                              <div className="flex items-center gap-2">
                                <span className={`text-sm transition-colors ${brand.name === "The North Face" ? "text-[var(--brand-primary)] font-bold" : "text-[var(--text-primary)] font-medium"}`}>
                                  {brand.name}
                                </span>
                              </div>
                              <span className={`text-[11px] transition-colors ${brand.name === "The North Face" ? "text-[var(--brand-primary)] font-bold" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"}`}>
                                {brand.count}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Popular Tags */}
                      <div className="space-y-3">
                        <h3 className="font-bold text-gray-900 text-sm">Popular tags</h3>
                        <div className="flex flex-wrap gap-x-3 gap-y-2">
                          {popularTags.map((tag) => (
                            <button
                              key={tag}
                              className="text-xs text-[var(--text-muted)] font-medium hover:text-[var(--brand-primary)] transition-colors"
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
                {/* Featured filter banner */}
                <AnimatePresence>
                {searchParams.get("filter") === "featured" && (
                  <motion.div
                    key="featured-banner"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="mb-4 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-1.5 rounded-lg shadow-sm">
                        <Star className="h-3.5 w-3.5 text-white fill-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-amber-900">Featured &amp; Sponsored Products</p>
                        <p className="text-xs text-amber-700">Showing all featured and boosted listings</p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/shop', { state: { scrollToFeatured: true } })}
                      className="text-xs text-amber-700 hover:text-amber-900 font-semibold underline underline-offset-2 transition-colors whitespace-nowrap"
                    >
                      Clear filter
                    </button>
                  </motion.div>
                )}
                </AnimatePresence>

                {/* Toolbar - Now inside Product Area */}
                <motion.div
                  id="shop-results-header"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  className="mb-4 flex items-center justify-between gap-4 scroll-mt-24"
                >
                  <div className="flex items-center gap-4 h-10">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white hover:bg-[var(--brand-wash)] rounded-xl text-xs font-bold text-[var(--text-primary)] transition-all border border-[var(--border)] shadow-sm"
                      aria-expanded={showFilters}
                      aria-controls="mobile-filters-menu"
                      aria-label={showFilters ? "Close categories menu" : "Open categories menu"}
                    >
                      <Menu className="w-4 h-4" />
                      Categories
                    </button>

                    <p className="text-[var(--text-muted)] text-sm font-medium leading-none">
                      Showing <span className="text-[var(--brand-primary)] font-bold">{filteredProducts.length}</span> results
                    </p>
                  </div>

                  <div className="flex items-center gap-2 h-10">
                    <span className="text-sm font-medium text-[var(--text-muted)] whitespace-nowrap">Sort by:</span>
                    <Select value={selectedSort} onValueChange={(val) => {
                      suppressNextAutoScrollRef.current = true;
                      setSelectedSort(val);
                    }}>
                      <SelectTrigger className="w-[120px] md:w-[160px] h-8 border-none bg-white shadow-sm hover:shadow-md rounded-xl transition-all text-sm font-medium text-[var(--text-headline)] focus:ring-0">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-xl bg-white/95 backdrop-blur-md">
                        {sortOptions.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            className="text-xs focus:bg-[var(--brand-primary)] focus:text-white transition-colors cursor-pointer"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>

                {/* Mobile Filters Menu handled separately above */}

                {/* Products Grid */}
                {(() => {
                  const groupedProducts: Record<string, typeof filteredProducts> = {};
                  const normalProducts: typeof filteredProducts = [];

                  filteredProducts.forEach(product => {
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
                      className="bg-white rounded-xl hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer border-0"
                      onClick={() => navigate(`/product/${product.id}`)}
                      role="link"
                      tabIndex={0}
                      aria-label={`View details for ${product.name}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          navigate(`/product/${product.id}`);
                        }
                      }}
                    >
                      <div className="relative aspect-square overflow-hidden bg-white/50">
                        <img
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
                              {product.rating} ({(((product as any).lifetimeSold !== undefined ? (product as any).lifetimeSold : product.sold) || 0).toLocaleString()})
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

                              const hasVariants = (product as any).variants && (product as any).variants.length > 0;
                              const hasColors = product.variantLabel2Values && product.variantLabel2Values.length > 0;
                              const hasSizes = product.variantLabel1Values && product.variantLabel1Values.length > 0;

                              if (hasVariants || hasColors || hasSizes) {
                                setVariantProduct(product);
                                setIsBuyNowAction(false);
                                setShowVariantModal(true);
                                return;
                              }

                              const totalStock = product.variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || product.stock || 0;

                              if (totalStock === 0) {
                                toast({
                                  title: "Out of Stock",
                                  description: "This product is currently unavailable.",
                                  variant: "destructive",
                                });
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
                    <div className="space-y-12">
                      {Object.entries(groupedProducts).map(([campaignName, campaignProducts]) => (
                        <div key={campaignName} className="bg-gradient-to-br from-white via-white to-[#FEE2E2]/30 rounded-2xl p-6 shadow-sm border border-[#FCA5A5]/20">
                          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight font-heading mb-6 flex items-center gap-2">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#DC2626] to-[#ED4444]">
                              {campaignName}
                            </span>
                            <div className="h-0.5 flex-1 bg-gradient-to-r from-[#DC2626]/20 to-transparent ml-4 rounded-full"></div>
                          </h2>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                          >
                            {campaignProducts.map((p, i) => renderProduct(p, i))}
                          </motion.div>
                        </div>
                      ))}

                      {normalProducts.length > 0 && (
                        <div>
                          {Object.keys(groupedProducts).length > 0 && (
                            <h2 className="text-lg font-bold text-[var(--text-headline)] mb-4 mt-4">More Products</h2>
                          )}
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                          >
                            {normalProducts.map((p, i) => renderProduct(p, i))}
                          </motion.div>
                        </div>
                      )}
                    </div>
                  );
                })()}

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
                      className="px-8 py-3 border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white rounded-xl font-bold transition-all"
                    >
                      Load More Products
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>

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
      <BazaarFooter />
    </>
  );
}
