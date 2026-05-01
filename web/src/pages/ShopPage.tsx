/* eslint-disable @typescript-eslint/no-explicit-any */
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  ChevronRight,
  MapPin,
  Menu,
  ShoppingBag,
  ShoppingCart,
  Star,
  Truck,
  X
} from "lucide-react";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import ProductRequestModal from "../components/ProductRequestModal";
import ShopBuyNowModal from "../components/shop/ShopBuyNowModal";
import ShopVariantModal from "../components/shop/ShopVariantModal";
import { Badge } from "../components/ui/badge";
import { BazaarFooter } from "../components/ui/bazaar-footer";
import { Button } from "../components/ui/button";
import { CartModal } from "../components/ui/cart-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Slider } from "../components/ui/slider";
import VisualSearchModal from "../components/VisualSearchModal";
// import CategoryCarousel from "../components/CategoryCarousel";
// import { Checkbox } from "../components/ui/checkbox";
import { useToast } from "../hooks/use-toast";
// Hardcoded imports removed for database parity
import { isSupabaseConfigured } from "@/lib/supabase";
import { adBoostService, type AdBoostWithProduct } from "@/services/adBoostService";
import { categoryService } from "@/services/categoryService";
import { discountService } from "@/services/discountService";
import { featuredProductService, type FeaturedProductWithDetails } from "@/services/featuredProductService";
import { productService } from "@/services/productService";
import type { Category } from "@/types/database.types";
import { mapDbProductToSellerProduct } from "@/utils/productMapper";
import { AlertCircle } from "lucide-react";
import ProductCard from "../components/ProductCard";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { useBuyerStore } from "../stores/buyerStore";
import { useProductStore } from "../stores/sellerStore";
import { getSafeImageUrl } from "../utils/imageUtils";
// import { useProductQAStore } from "../stores/productQAStore";
import type { ActiveDiscount } from "@/types/discount";
import { CampaignCountdown } from "../components/shop/CampaignCountdown";
import { ShopProduct } from "../types/shop";

// Flash sale products are now derived from real products in the component

const sortOptions = [
  { value: "default", label: "Default" },
  { value: "newest", label: "Newest" },
  { value: "rating", label: "Rating" },
  { value: "popularity", label: "Popularity" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "price-low", label: "Price: Low to High" },
];

const brandOptions: { name: string; count: number }[] = [];

const popularTags = [
  "Bag", "Backpack", "Chair", "Clock", "Interior", "Indoor", "Gift", "Accessories", "Fashion", "Simple"
];

const SHOP_FETCH_LIMIT = 200;

export default function ShopPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const manualScrollRef = useRef(false);
  const { addToCart, setQuickOrder, cartItems, profile } = useBuyerStore();
  const { toast } = useToast();
  const { products: sellerProducts, fetchProducts, subscribeToProducts, loading: storeLoading } = useProductStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedSkinTypes, setSelectedSkinTypes] = useState<string[]>([]);
  const [selectedSort, setSelectedSort] = useState("default");
  const [isFeaturedView, setIsFeaturedView] = useState(false);
  const [categoryProducts, setCategoryProducts] = useState<any[]>([]);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [isDiscountsLoading, setIsDiscountsLoading] = useState(false);
  const isProductsLoading = storeLoading || isCategoryLoading || isDiscountsLoading;
  const shuffledIdsRef = useRef<string[]>([]);
  const [priceRange, setPriceRange] = useState<number[]>([0, 100000]);
  const [minRating, setMinRating] = useState<number>(0);
  const [shippedFrom, setShippedFrom] = useState<string | null>(null);
  // Shops & Promos filters
  const [onSale, setOnSale] = useState(false);
  const [freeShipping, setFreeShipping] = useState(false);
  const [withVouchers, setWithVouchers] = useState(false);
  const [preferredSeller, setPreferredSeller] = useState(false);
  const [officialStore, setOfficialStore] = useState(false);
  // Shipping option filters
  const [standardDelivery, setStandardDelivery] = useState(false);
  const [sameDayDelivery, setSameDayDelivery] = useState(false);
  const [cashOnDelivery, setCashOnDelivery] = useState(false);
  const [pickupAvailable, setPickupAvailable] = useState(false);
  const [selectedSellers, setSelectedSellers] = useState<string[]>([]);
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
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredDiscounts, setFeaturedDiscounts] = useState<Record<string, any>>({});

  const hasCompletedOnboarding = profile && profile.preferences?.interestedCategories && profile.preferences.interestedCategories.length > 0;
  const showOnboardingBanner = profile && !hasCompletedOnboarding;

  // Fetch real flash sale products (global admin events from global_flash_sale_slots)
  useEffect(() => {
    discountService.getGlobalFlashSaleProducts()
      .then((data) => {
        if (data && data.length > 0) {
          // Filter out products with 0 stock (including variant stock)
          const inStockProducts = data.filter((p: any) => {
            const variants = p.variants || [];
            if (variants.length > 0) {
              const totalVariantStock = variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
              return totalVariantStock > 0;
            }
            return (p.stock || 0) > 0;
          });
          setFlashSaleProducts(inStockProducts);
        }
      })
      .catch((e) => console.error('Failed to load flash sales:', e));

    // Fetch featured + boosted products, then immediately fetch their discounts
    // so the discount badges appear at the same time as the cards (no delay).
    const loadFeatured = async () => {
      try {
        const [featData, boostData] = await Promise.all([
          featuredProductService.getFeaturedProducts(12).catch(() => [] as FeaturedProductWithDetails[]),
          adBoostService.getActiveBoostedProducts('featured', 12).catch(() => [] as AdBoostWithProduct[]),
        ]);

        setFeaturedProducts(featData);
        setBoostedProducts(boostData);

        // Collect all product IDs from both sources
        const ids = new Set<string>();
        for (const bp of boostData) { if ((bp as any).product?.id) ids.add((bp as any).product.id); }
        for (const fp of featData) { if ((fp as any).product?.id) ids.add((fp as any).product.id); }
        const productIds = [...ids];

        if (productIds.length > 0) {
          const discounts = await discountService.getActiveDiscountsForProducts(productIds).catch(() => ({}));
          setFeaturedDiscounts(discounts);
        }
      } catch (e) {
        console.error('Failed to load featured products:', e);
      } finally {
        setFeaturedLoading(false);
      }
    };

    loadFeatured();
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

    const mapToShopProduct = (p: any): ShopProduct => ({
      id: p.id,
      name: p.name,
      price: p.price,
      originalPrice: p.originalPrice,
      image: p.images?.[0] || "https://placehold.co/400?text=Product",
      images: p.images || [],
      rating: p.rating || 0,
      sold: p.sales || 0,
      reviewsCount: p.reviews || 0,
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
      stock: p.stock || 0,
      variants: p.variants || [],
      lifetimeSold: (p as any).lifetimeSold || p.sales || 0,
      isVacationMode: (p as any).isVacationMode || false,
      createdAt: (p as any).createdAt || "",
    });

    // Helper: check if a product has any available stock (via variants or direct stock field)
    const hasStock = (product: ShopProduct): boolean => {
      const variants = product.variants || [];
      if (variants.length > 0) {
        const totalVariantStock = variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
        return totalVariantStock > 0;
      }
      return (product.stock || 0) > 0;
    };

    // Start with store products (the initial 200-product fetch)
    const storeProducts = sellerProducts
      .filter((p) => p.approvalStatus === "approved" && p.isActive)
      .filter((p) => {
        // Safety net: filter out products from non-verified, blacklisted, or suspended sellers
        const sellerStatus = (p as any).sellerApprovalStatus || (p as any).seller?.approval_status;
        const sellerSuspendedAt = (p as any).sellerSuspendedAt || (p as any).seller?.suspended_at;
        const sellerBlacklistedAt = (p as any).sellerBlacklistedAt || (p as any).seller?.blacklisted_at;
        const sellerPermBlacklisted = (p as any).sellerIsPermBlacklisted || (p as any).seller?.is_permanently_blacklisted;
        const sellerTempBlacklistUntil = (p as any).sellerTempBlacklistUntil || (p as any).seller?.temp_blacklist_until;
        if (sellerStatus && sellerStatus !== 'verified') return false;
        if (sellerSuspendedAt) return false;
        if (sellerBlacklistedAt) return false;
        if (sellerPermBlacklisted) return false;
        if (sellerTempBlacklistUntil && new Date(sellerTempBlacklistUntil) > new Date()) return false;
        return true;
      })
      .map(mapToShopProduct)
      .filter(hasStock);

    // Merge in category-specific products from server-side fetch
    // These may include products not in the initial store fetch
    if (categoryProducts.length > 0) {
      const seenIds = new Set(storeProducts.map(p => p.id));
      const extraProducts = categoryProducts
        .map(mapDbProductToSellerProduct)
        .filter((p: any) => p.approvalStatus === "approved" && p.isActive && !seenIds.has(p.id))
        .filter((p: any) => {
          // Safety net: filter out products from non-verified, blacklisted, or suspended sellers
          const sellerStatus = p.sellerApprovalStatus || p.seller?.approval_status;
          const sellerSuspendedAt = p.sellerSuspendedAt || p.seller?.suspended_at;
          const sellerBlacklistedAt = p.sellerBlacklistedAt || p.seller?.blacklisted_at;
          const sellerPermBlacklisted = p.sellerIsPermBlacklisted || p.seller?.is_permanently_blacklisted;
          const sellerTempBlacklistUntil = p.sellerTempBlacklistUntil || p.seller?.temp_blacklist_until;
          if (sellerStatus && sellerStatus !== 'verified') return false;
          if (sellerSuspendedAt) return false;
          if (sellerBlacklistedAt) return false;
          if (sellerPermBlacklisted) return false;
          if (sellerTempBlacklistUntil && new Date(sellerTempBlacklistUntil) > new Date()) return false;
          return true;
        })
        .map(mapToShopProduct);
      return [...storeProducts, ...extraProducts].filter(hasStock);
    }

    return storeProducts;
  }, [sellerProducts, categories, categoryProducts]);

  useEffect(() => {
    if (sellerProducts.length > 0 && shuffledIdsRef.current.length === 0) {
      const ids = sellerProducts.map(p => p.id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      shuffledIdsRef.current = ids;
    }
  }, [sellerProducts]);

  useEffect(() => {
    let isMounted = true;

    const loadDiscounts = async () => {
      const productIds = [...new Set(allProducts.map(product => product.id).filter(Boolean))];
      if (productIds.length === 0) {
        if (isMounted) { setActiveCampaignDiscounts({}); setIsDiscountsLoading(false); }
        return;
      }

      setIsDiscountsLoading(true);
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
      } finally {
        if (isMounted) setIsDiscountsLoading(false);
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

  // Dynamic filter options derived from actual products
  const dynamicBrandOptions = useMemo(() => {
    const brandMap = new Map<string, number>();
    for (const p of allProducts) {
      const brand = p.seller || 'Unknown';
      brandMap.set(brand, (brandMap.get(brand) || 0) + 1);
    }
    return Array.from(brandMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
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
    // Use a higher limit to match mobile's SHOP_SCREEN_FETCH_LIMIT (200)
    const filters = {
      isActive: true,
      approvalStatus: 'approved',
      limit: SHOP_FETCH_LIMIT,
    };
    fetchProducts(filters);

    // Subscribe to real-time updates
    const unsubscribe = subscribeToProducts(filters);

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  // Fetch category-specific products from server when a category is selected
  // This matches mobile ShopScreen behavior: server-side filtering by category_id
  // ensures products are found even if they weren't in the initial 200-product fetch
  useEffect(() => {
    if (selectedCategory === "All Categories" || !categories.length) {
      setCategoryProducts([]);
      return;
    }

    const categoryObj = selectedCategory === "Others"
      ? null
      : categories.find(c => c.name.toLowerCase() === selectedCategory.toLowerCase());

    if (!categoryObj) {
      setCategoryProducts([]);
      return;
    }

    let cancelled = false;
    const fetchCategoryProducts = async () => {
      setIsCategoryLoading(true);
      try {
        const results = await productService.getProducts({
          categoryId: categoryObj.id,
          isActive: true,
          approvalStatus: 'approved',
          limit: SHOP_FETCH_LIMIT,
        });
        if (!cancelled) {
          setCategoryProducts(results || []);
        }
      } catch (error) {
        console.error('[ShopPage] Error fetching category products:', error);
        if (!cancelled) setCategoryProducts([]);
      } finally {
        if (!cancelled) setIsCategoryLoading(false);
      }
    };

    fetchCategoryProducts();
    return () => { cancelled = true; };
  }, [selectedCategory, categories]);

  useEffect(() => {
    const queryParam = searchParams.get("q") || "";
    const categoryParam = searchParams.get("category");
    const sortParam = searchParams.get("sort");
    const viewParam = searchParams.get("view");

    setSearchQuery(queryParam);

    if (categoryParam) {
      setSelectedCategory(categoryParam);
    } else {
      setSelectedCategory("All Categories");
    }

    if (viewParam === "featured") {
      setIsFeaturedView(true);
    } else {
      setIsFeaturedView(false);
    }

    if (sortParam && sortOptions.some(option => option.value === sortParam)) {
      setSelectedSort(sortParam);
    } else if (!sortParam) {
      setSelectedSort("default");
    }

    setTimeout(() => {
      const isClean = !categoryParam && !queryParam && !sortParam && !viewParam &&
        priceRange[0] === 0 && priceRange[1] === 100000 &&
        minRating === 0;

      if (isClean && !manualScrollRef.current) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (manualScrollRef.current) {
        const element = document.getElementById("shop-results-header");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
      manualScrollRef.current = false;
    }, 100);
  }, [searchParams, location.key, priceRange, minRating]);

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

  // Build ShopProduct[] directly from fetched featured/boosted data.
  // This bypasses the store's 30-product query limit, ensuring ALL featured
  // products (e.g. older ones) appear in the "See All" view.
  const featuredProductsAsShopProducts = useMemo<ShopProduct[]>(() => {
    if (!isFeaturedView) return [];
    const seen = new Set<string>();
    const items: ShopProduct[] = [];

    const addItem = (product: any, isBoosted: boolean) => {
      if (!product || seen.has(product.id)) return;
      const reviews = product.reviews || [];
      const avgRating = reviews.length > 0
        ? Math.round((reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length) * 10) / 10
        : 0;
      const totalStock = product.variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || 0;
      // Skip out-of-stock products (all variants have 0 stock)
      if (totalStock <= 0) return;
      seen.add(product.id);
      const primaryImage = product.images?.find((img: any) => img.is_primary) || product.images?.[0];
      const imageUrl = primaryImage?.image_url || 'https://placehold.co/400x400?text=No+Image';
      items.push({
        id: product.id,
        name: product.name || '',
        price: Number(product.price ?? 0),
        originalPrice: product.original_price ?? undefined,
        image: imageUrl,
        images: (product.images || []).map((img: any) => img.image_url).filter(Boolean),
        rating: avgRating,
        sold: product.sold_count || 0,
        reviewsCount: reviews.length,
        category: product.category?.name || '',
        seller: product.seller?.store_name || 'BazaarX Store',
        sellerId: product.seller_id || '',
        isVerified: true,
        isFreeShipping: product.is_free_shipping ?? false,
        stock: totalStock,
        variants: (product.variants || []).map((v: any) => ({
          id: v.id,
          name: v.variant_name,
          price: Number(v.price ?? product.price ?? 0),
          stock: v.stock || 0,
        })),
        isVacationMode: product.seller?.is_vacation_mode === true,
        createdAt: product.created_at || '',
      });
    };

    for (const bp of boostedProducts) {
      addItem((bp as any).product, true);
    }
    for (const fp of featuredProducts) {
      addItem((fp as any).product, false);
    }

    return items;
  }, [isFeaturedView, featuredProducts, boostedProducts]);

  const productsFilteredWithoutCategory = useMemo<ShopProduct[]>(() => {
    // In featured view, source directly from featuredProductsAsShopProducts
    // to avoid the store's 30-product query limit cutting off older products.
    const sourceProducts = isFeaturedView ? featuredProductsAsShopProducts : pricedProducts;

    const result = sourceProducts.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.seller.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPrice =
        (priceRange[0] === 0 && priceRange[1] === 100000) ||
        (product.price >= priceRange[0] && product.price <= priceRange[1]);

      const matchesRating = minRating === 0 || (product.rating || 0) >= minRating;

      const matchesShippedFrom = !shippedFrom || (() => {
        const loc = (product.location || '').toLowerCase();
        if (shippedFrom === 'metro_manila') {
          return loc.includes('metro manila') || loc.includes('manila') || loc.includes('makati') || loc.includes('quezon city') || loc.includes('taguig') || loc.includes('pasig') || loc.includes('mandaluyong') || loc.includes('pasay') || loc.includes('parañaque') || loc.includes('paranaque') || loc.includes('caloocan') || loc.includes('marikina') || loc.includes('muntinlupa') || loc.includes('las piñas') || loc.includes('las pinas') || loc.includes('valenzuela') || loc.includes('malabon') || loc.includes('navotas') || loc.includes('pateros') || loc.includes('san juan');
        }
        if (shippedFrom === 'philippines') {
          return loc.includes('philippines') || loc.includes('manila') || loc.includes('cebu') || loc.includes('davao') || loc.length > 0;
        }
        return true;
      })();

      // Shops & Promos filters
      const matchesOnSale = !onSale || (product.originalPrice != null && product.originalPrice > product.price);
      const matchesFreeShipping = !freeShipping || product.isFreeShipping === true;
      const matchesVerified = !officialStore || product.isVerified === true;

      // Seller filter
      const matchesSeller = selectedSellers.length === 0 || selectedSellers.includes(product.seller);

      return matchesSearch && matchesPrice && matchesRating && matchesShippedFrom && matchesOnSale && matchesFreeShipping && matchesVerified && matchesSeller;
    });

    return result;
  }, [pricedProducts, featuredProductsAsShopProducts, searchQuery, isFeaturedView, priceRange, minRating, shippedFrom, onSale, freeShipping, officialStore, selectedSellers]);

  // Category count map that reacts to active filters
  const filteredCategoryCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of productsFilteredWithoutCategory) {
      if (!p.category) {
        map.set("Uncategorized", (map.get("Uncategorized") || 0) + 1);
        continue;
      }
      map.set(p.category, (map.get(p.category) || 0) + 1);
    }
    return map;
  }, [productsFilteredWithoutCategory]);

  const filteredProducts = useMemo<ShopProduct[]>(() => {
    const filtered = productsFilteredWithoutCategory.filter((product) => {
      const matchesCategory =
        selectedCategory === "All Categories" ||
        (selectedCategory === "Others"
          ? !categories.some(c => c.name.toLowerCase() === product.category.toLowerCase() && c.name.toLowerCase() !== 'others')
          : product.category.toLowerCase() === selectedCategory.toLowerCase());

      return matchesCategory;
    });

    switch (selectedSort) {
      case "rating":
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "popularity":
        filtered.sort((a, b) => (b.sold || 0) - (a.sold || 0));
        break;
      case "newest":
        filtered.sort((a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        break;
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "default":
      default: {
        const order = shuffledIdsRef.current;
        if (order.length > 0) {
          const indexMap = new Map(order.map((id, i) => [id, i]));
          filtered.sort((a, b) => (indexMap.get(a.id) ?? 9999) - (indexMap.get(b.id) ?? 9999));
        }
        break;
      }
    }

    return filtered;
  }, [productsFilteredWithoutCategory, selectedCategory, selectedSort, categories]);



  const resetFilters = () => {
    setSelectedSort("default");
    setIsFeaturedView(false);
    setPriceRange([0, 100000]);
    setMinRating(0);
    setShippedFrom(null);
    setOnSale(false);
    setFreeShipping(false);
    setWithVouchers(false);
    setPreferredSeller(false);
    setOfficialStore(false);
    setStandardDelivery(false);
    setSameDayDelivery(false);
    setCashOnDelivery(false);
    setPickupAvailable(false);
    setSelectedSellers([]);
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.delete("sort");
      p.delete("view");
      p.delete("category");
      return p;
    });

    const element = document.getElementById("shop-results-header");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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
                setSearchQuery("");
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
              Wishlist & Gifting
            </Link>
          </div>

          {/* Onboarding Banner - Premium Rebranded Style */}
          {showOnboardingBanner && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 relative overflow-hidden rounded-[20px] p-5 shadow-[0_15px_40px_rgba(245,158,11,0.15)]"
              style={{
                background: "linear-gradient(135deg, #EA580C 0%, #F59E0B 100%)"
              }}
            >
              {/* Decorative Background Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1 text-center md:text-left">
                  <p className="text-white/80 font-medium tracking-wide mb-2 uppercase text-xs">
                    Almost there!
                  </p>
                  <h2 className="text-xl md:text-2xl font-black text-white mb-2 leading-tight font-heading">
                    Unlock Your 
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-orange-100 ml-2">
                      BazaarX Experience
                    </span>
                  </h2>
                  <p className="text-white/90 text-sm font-medium max-w-sm mb-5">
                    Complete your onboarding to get personalized product listings and discover trusted sellers.
                  </p>
                  
                  <Link 
                    to="/buyer-onboarding" 
                    className="inline-flex items-center justify-center px-6 py-2.5 bg-[#7C2D12] text-white rounded-full text-sm font-bold shadow-xl hover:scale-105 transition-all duration-300 group"
                  >
                    Complete Profile
                    <ChevronRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                <div className="relative shrink-0 flex items-center justify-center w-32 h-32">
                  {/* Glowing Icon Media Wrapper */}
                  <motion.div
                    animate={{ 
                      y: [0, -6, 0],
                      rotate: [0, 5, 0]
                    }}
                    transition={{ 
                      duration: 4, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                    className="relative z-20 w-20 h-20 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/30 flex items-center justify-center shadow-2xl"
                  >
                    <ShoppingBag size={40} className="text-white drop-shadow-2xl" />
                  </motion.div>
                  
                  {/* Aura Glow */}
                  <div className="absolute inset-0 bg-white/20 blur-[50px] rounded-full scale-150 animate-pulse" />
                  
                  {/* Floating Elements (simulating 3D graphics) */}
                  <motion.div 
                    animate={{ x: [0, 10, 0], y: [0, -12, 0] }}
                    transition={{ duration: 5, repeat: Infinity }}
                    className="absolute top-0 right-0 w-8 h-8 bg-orange-200/40 backdrop-blur-md rounded-lg flex items-center justify-center shadow-lg"
                  >
                    <BadgeCheck size={16} className="text-white" />
                  </motion.div>
                  
                  <motion.div 
                    animate={{ x: [0, -8, 0], y: [0, 10, 0] }}
                    transition={{ duration: 6, repeat: Infinity }}
                    className="absolute bottom-2 left-0 w-7 h-7 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg"
                  >
                    <Star size={14} className="text-white fill-current" />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

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
            {searchQuery === "" && flashSaleProducts.length > 0 && (() => {
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
          {searchQuery === "" && !isFeaturedView && (featuredLoading || featuredProducts.length > 0 || boostedProducts.length > 0) && (
            <div className="mb-10">
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
                  className="text-xs text-[var(--brand-primary)] hover:text-[var(--brand-accent)] font-semibold transition-colors flex items-center gap-1"
                  onClick={() => {
                    manualScrollRef.current = true;
                    setIsFeaturedView(true);
                    setSearchParams(prev => {
                      const params = new URLSearchParams(prev);
                      params.set("view", "featured");
                      return params;
                    });
                    setTimeout(() => {
                      const element = document.getElementById("shop-results-header");
                      if (element) {
                        element.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }, 100);
                  }}
                >
                  See All <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Skeleton Loading State */}
              {featuredLoading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={`skel-${i}`} className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm flex flex-col animate-pulse">
                      <div className="aspect-square bg-gray-200" />
                      <div className="p-3 flex flex-col gap-2">
                        <div className="h-4 bg-gray-200 rounded w-full" />
                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                        <div className="flex gap-0.5 mt-1">
                          {[...Array(5)].map((_, j) => (
                            <div key={j} className="h-3 w-3 bg-gray-200 rounded-full" />
                          ))}
                        </div>
                        <div className="h-5 bg-gray-200 rounded w-1/2 mt-1" />
                        <div className="flex justify-between mt-1">
                          <div className="h-3 bg-gray-200 rounded w-1/3" />
                          <div className="h-3 bg-gray-200 rounded w-1/4" />
                        </div>
                        <div className="h-3 bg-gray-100 rounded w-2/3 mt-2 pt-2 border-t border-gray-50" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sponsored Products Grid */}
              {!featuredLoading && (featuredProducts.length > 0 || boostedProducts.length > 0) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {(() => {
                  const seenIds = new Set<string>();
                  const allItems: { key: string; product: any; isBoosted: boolean }[] = [];

                    for (const bp of boostedProducts) {
                      const product = bp.product;
                      if (!product || seenIds.has(product.id)) continue;
                      const totalStock = (product.variants || []).reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
                      if (totalStock <= 0) continue;
                      seenIds.add(product.id);
                      allItems.push({ key: `boost-${bp.id}`, product, isBoosted: true });
                    }

                    for (const fp of featuredProducts) {
                      const product = (fp as any).product;
                      if (!product || seenIds.has(product.id)) continue;
                      const totalStock = (product.variants || []).reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
                      if (totalStock <= 0) continue;
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

                      // Compute discount info from fetched campaign discounts
                      const featDiscount = featuredDiscounts[product.id];
                      let displayPrice = Number(product.price ?? 0);
                      let originalPrice: number | undefined = product.original_price ?? undefined;
                      let discountPercent: number | undefined;
                      let discountTooltip: string | undefined;
                      if (featDiscount) {
                        originalPrice = featDiscount.originalPrice || displayPrice;
                        if (featDiscount.discountType === 'percentage') {
                          displayPrice = originalPrice * (1 - featDiscount.discountValue / 100);
                          discountPercent = Math.round(featDiscount.discountValue);
                          if (typeof featDiscount.maxDiscountAmount === 'number') {
                            displayPrice = Math.max(displayPrice, originalPrice - featDiscount.maxDiscountAmount);
                            discountTooltip = `Up to ₱${featDiscount.maxDiscountAmount.toLocaleString()} off`;
                          }
                        } else if (featDiscount.discountType === 'fixed_amount') {
                          displayPrice = Math.max(0, originalPrice - featDiscount.discountValue);
                          discountPercent = originalPrice > 0 ? Math.round((featDiscount.discountValue / originalPrice) * 100) : undefined;
                        }
                      }
                      const hasDiscount = originalPrice !== undefined && originalPrice > displayPrice;

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
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=No+Image';
                              }}
                            />
                            {/* Discount Badge */}
                            {hasDiscount && discountPercent && (
                              <div
                                title={discountTooltip}
                                className="absolute top-2 right-2 bg-[#DC2626] text-white px-2 py-[2px] rounded text-[11px] font-black uppercase tracking-wider z-10 shadow-sm"
                              >
                                {discountPercent}% OFF
                              </div>
                            )}
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
                              {hasDiscount && originalPrice && (
                                <span className="text-[11px] text-gray-400 line-through font-medium leading-none block mb-[3px]">
                                  ₱{originalPrice.toLocaleString()}
                                </span>
                              )}
                              <span className={`text-lg font-extrabold leading-none ${hasDiscount ? 'text-[#DC2626]' : 'text-[#D97706]'}`}>
                                ₱{displayPrice?.toLocaleString() || '0'}
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
              )}
            </div>
          )}

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
                                next.delete("view");
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
                          {productsFilteredWithoutCategory.length}
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
                            {filteredCategoryCountMap.get(cat.name) ?? 0}
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
                                if (selectedSort === "price-high" || selectedSort === "price-low") {
                                  setSelectedSort("default");
                                  setSearchParams(prev => { const p = new URLSearchParams(prev); p.delete("sort"); return p; });
                                }
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
                                onChange={(e) => {
                                  setPriceRange([Math.min(Number(e.target.value), priceRange[1]), priceRange[1]]);
                                  if (selectedSort === "price-high" || selectedSort === "price-low") {
                                    setSelectedSort("default");
                                    setSearchParams(prev => { const p = new URLSearchParams(prev); p.delete("sort"); return p; });
                                  }
                                }}
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
                                onChange={(e) => {
                                  setPriceRange([priceRange[0], Math.max(Number(e.target.value), priceRange[0])]);
                                  if (selectedSort === "price-high" || selectedSort === "price-low") {
                                    setSelectedSort("default");
                                    setSearchParams(prev => { const p = new URLSearchParams(prev); p.delete("sort"); return p; });
                                  }
                                }}
                                className="w-full pl-6 pr-2 py-1.5 text-xs font-bold text-[var(--text-primary)] border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--brand-primary)]"
                                placeholder="Max"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Shipped From Section */}
                      <div className="space-y-3">
                        <h3 className="font-bold text-gray-900 text-sm">Shipped From</h3>
                        <div className="space-y-2">
                          {[
                            { id: "philippines", label: "Philippines" },
                            { id: "metro_manila", label: "Metro Manila" },
                          ].map((option) => (
                            <button
                              key={option.id}
                              onClick={() => {
                                manualScrollRef.current = true;
                                setShippedFrom(shippedFrom === option.id ? null : option.id);
                              }}
                              className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-sm transition-all ${
                                shippedFrom === option.id
                                  ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-bold border border-[var(--brand-primary)]/20"
                                  : "text-[var(--text-primary)] font-medium hover:bg-gray-50"
                              }`}
                            >
                              <span>{option.label}</span>
                              {shippedFrom === option.id && (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Rating Section */}
                      <div className="space-y-3">
                        <h3 className="font-bold text-gray-900 text-sm">Ratings</h3>
                        <div className="space-y-2">
                          {[
                            { label: "5 Stars", value: 5 },
                            { label: "4 Stars & up", value: 4 },
                            { label: "3 Stars & up", value: 3 },
                            { label: "2 Stars & up", value: 2 },
                            { label: "1 Star & up", value: 1 },
                          ].map((option) => (
                            <button
                              key={option.value}
                              onClick={() => {
                                manualScrollRef.current = true;
                                setMinRating(minRating === option.value ? 0 : option.value);
                              }}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                                minRating === option.value
                                  ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-bold border border-[var(--brand-primary)]/20"
                                  : "text-[var(--text-primary)] font-medium hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3.5 w-3.5 ${i < option.value ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs">{option.label}</span>
                              {minRating === option.value && (
                                <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Shops & Promos Section */}
                      <div className="space-y-3">
                        <h3 className="font-bold text-gray-900 text-sm">Shops & Promos</h3>
                        <div className="space-y-2">
                          {[
                            { key: "onSale", label: "On Sale", state: onSale, setter: setOnSale },
                            { key: "freeShipping", label: "Free Shipping", state: freeShipping, setter: setFreeShipping },
                            { key: "withVouchers", label: "With Vouchers", state: withVouchers, setter: setWithVouchers },
                            { key: "preferredSeller", label: "Preferred Seller", state: preferredSeller, setter: setPreferredSeller },
                            { key: "officialStore", label: "Official Store", state: officialStore, setter: setOfficialStore },
                          ].map((option) => (
                            <button
                              key={option.key}
                              onClick={() => {
                                manualScrollRef.current = true;
                                option.setter(!option.state);
                              }}
                              className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-sm transition-all ${
                                option.state
                                  ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-bold border border-[var(--brand-primary)]/20"
                                  : "text-[var(--text-primary)] font-medium hover:bg-gray-50"
                              }`}
                            >
                              <span>{option.label}</span>
                              <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${
                                option.state
                                  ? "bg-[var(--brand-primary)] border-[var(--brand-primary)]"
                                  : "border-gray-300"
                              }`}>
                                {option.state && (
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Shipping Option Section */}
                      <div className="space-y-3">
                        <h3 className="font-bold text-gray-900 text-sm">Shipping Option</h3>
                        <div className="space-y-2">
                          {[
                            { key: "standardDelivery", label: "Standard Delivery", state: standardDelivery, setter: setStandardDelivery },
                            { key: "sameDayDelivery", label: "Same Day Delivery", state: sameDayDelivery, setter: setSameDayDelivery },
                            { key: "cashOnDelivery", label: "Cash on Delivery (COD)", state: cashOnDelivery, setter: setCashOnDelivery },
                            { key: "pickupAvailable", label: "Pickup Available", state: pickupAvailable, setter: setPickupAvailable },
                          ].map((option) => (
                            <button
                              key={option.key}
                              onClick={() => {
                                manualScrollRef.current = true;
                                option.setter(!option.state);
                              }}
                              className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-sm transition-all ${
                                option.state
                                  ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-bold border border-[var(--brand-primary)]/20"
                                  : "text-[var(--text-primary)] font-medium hover:bg-gray-50"
                              }`}
                            >
                              <span>{option.label}</span>
                              <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${
                                option.state
                                  ? "bg-[var(--brand-primary)] border-[var(--brand-primary)]"
                                  : "border-gray-300"
                              }`}>
                                {option.state && (
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Sellers Section */}
                      {dynamicBrandOptions.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="font-bold text-gray-900 text-sm">Sellers</h3>
                          <div className="space-y-2">
                            {dynamicBrandOptions.map((brand) => {
                              const isSelected = selectedSellers.includes(brand.name);
                              return (
                                <button
                                  key={brand.name}
                                  onClick={() => {
                                    manualScrollRef.current = true;
                                    setSelectedSellers((prev) =>
                                      isSelected
                                        ? prev.filter((s) => s !== brand.name)
                                        : [...prev, brand.name]
                                    );
                                  }}
                                  className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-sm transition-all ${
                                    isSelected
                                      ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-bold border border-[var(--brand-primary)]/20"
                                      : "text-[var(--text-primary)] font-medium hover:bg-gray-50"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-all flex-shrink-0 ${
                                      isSelected
                                        ? "bg-[var(--brand-primary)] border-[var(--brand-primary)]"
                                        : "border-gray-300"
                                    }`}>
                                      {isSelected && (
                                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </div>
                                    <span className="text-sm truncate">{brand.name}</span>
                                  </div>
                                  <span className={`text-[11px] flex-shrink-0 ${isSelected ? "text-[var(--brand-primary)] font-bold" : "text-[var(--text-muted)]"}`}>
                                    {brand.count}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

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

                    <div className="flex items-center gap-2">
                      <p className="text-[var(--text-muted)] text-sm font-medium leading-none">
                        Showing <span className="text-[var(--brand-primary)] font-bold">{filteredProducts.length}</span> results
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 h-10">
                    <span className="text-sm font-medium text-[var(--text-muted)] whitespace-nowrap">Sort by:</span>
                    <Select value={selectedSort} onValueChange={(val) => {
                      manualScrollRef.current = true;
                      setSelectedSort(val);
                      setSearchParams(prev => {
                        const params = new URLSearchParams(prev);
                        if (val === "default") {
                          params.delete("sort");
                        } else {
                          params.set("sort", val);
                        }
                        return params;
                      });
                    }}>
                      <SelectTrigger className="w-[170px] md:w-[200px] h-8 border-none bg-white shadow-sm hover:shadow-md rounded-xl transition-all text-sm font-medium text-[var(--text-headline)] focus:ring-0">
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

                {/* Active Filter Chips */}
                {(selectedCategory !== "All Categories" || selectedSort !== "default" || isFeaturedView || priceRange[0] !== 0 || priceRange[1] !== 100000 || minRating > 0 || shippedFrom || onSale || freeShipping || withVouchers || preferredSeller || officialStore || standardDelivery || sameDayDelivery || cashOnDelivery || pickupAvailable || selectedSellers.length > 0) && (
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    {isFeaturedView && (
                      <button
                        onClick={() => {
                          setIsFeaturedView(false);
                          setSearchParams(prev => { const p = new URLSearchParams(prev); p.delete("view"); return p; });
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700 hover:bg-amber-500 hover:text-white transition-all"
                      >
                        Featured Products
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    {selectedCategory !== "All Categories" && (
                      <button
                        onClick={() => {
                          manualScrollRef.current = true;
                          setSelectedCategory("All Categories");
                          setSearchParams(prev => { const p = new URLSearchParams(prev); p.delete("category"); return p; });
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--brand-wash)] border border-[var(--brand-primary)]/20 text-xs font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white transition-all"
                      >
                        {selectedCategory}
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    {selectedSort !== "default" && (
                      <button
                        onClick={() => {
                          setSelectedSort("default");
                          setSearchParams(prev => { const p = new URLSearchParams(prev); p.delete("sort"); return p; });
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700 hover:bg-amber-500 hover:text-white transition-all"
                      >
                        {sortOptions.find(o => o.value === selectedSort)?.label || selectedSort}
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    {(priceRange[0] !== 0 || priceRange[1] !== 100000) && (
                      <button
                        onClick={() => { manualScrollRef.current = true; setPriceRange([0, 100000]); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-xs font-semibold text-green-700 hover:bg-green-500 hover:text-white transition-all"
                      >
                        ₱{priceRange[0].toLocaleString()} – ₱{priceRange[1].toLocaleString()}
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    {minRating > 0 && (
                      <button
                        onClick={() => { manualScrollRef.current = true; setMinRating(0); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-50 border border-yellow-200 text-xs font-semibold text-yellow-700 hover:bg-yellow-500 hover:text-white transition-all"
                      >
                        {minRating}+ Stars
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    {shippedFrom && (
                      <button
                        onClick={() => { manualScrollRef.current = true; setShippedFrom(null); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 hover:bg-blue-500 hover:text-white transition-all"
                      >
                         {shippedFrom === "metro_manila" ? "Metro Manila" : "Philippines"}
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    {onSale && (
                      <button
                        onClick={() => { manualScrollRef.current = true; setOnSale(false); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-500 hover:text-white transition-all"
                      >
                         On Sale
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    {freeShipping && (
                      <button
                        onClick={() => { manualScrollRef.current = true; setFreeShipping(false); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-500 hover:text-white transition-all"
                      >
                        Free Shipping
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    {withVouchers && (
                      <button
                        onClick={() => { manualScrollRef.current = true; setWithVouchers(false); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-xs font-semibold text-purple-700 hover:bg-purple-500 hover:text-white transition-all"
                      >
                        With Vouchers
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    {preferredSeller && (
                      <button
                        onClick={() => { manualScrollRef.current = true; setPreferredSeller(false); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-xs font-semibold text-orange-700 hover:bg-orange-500 hover:text-white transition-all"
                      >
                        Preferred Seller
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    {officialStore && (
                      <button
                        onClick={() => { manualScrollRef.current = true; setOfficialStore(false); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-700 hover:bg-indigo-500 hover:text-white transition-all"
                      >
                        Official Store
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    {(standardDelivery || sameDayDelivery || cashOnDelivery || pickupAvailable) && (
                      <button
                        onClick={() => {
                          manualScrollRef.current = true;
                          setStandardDelivery(false);
                          setSameDayDelivery(false);
                          setCashOnDelivery(false);
                          setPickupAvailable(false);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-700 hover:bg-teal-500 hover:text-white transition-all"
                      >
                        {[
                          standardDelivery && "Standard",
                          sameDayDelivery && "Same Day",
                          cashOnDelivery && "COD",
                          pickupAvailable && "Pickup",
                        ].filter(Boolean).join(", ")}
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    {selectedSellers.length > 0 && selectedSellers.map((seller) => (
                      <button
                        key={`seller-${seller}`}
                        onClick={() => { manualScrollRef.current = true; setSelectedSellers((prev) => prev.filter((s) => s !== seller)); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-50 border border-cyan-200 text-xs font-semibold text-cyan-700 hover:bg-cyan-500 hover:text-white transition-all"
                      >
                        {seller}
                        <X className="h-3 w-3" />
                      </button>
                    ))}
                    <button
                      onClick={resetFilters}
                      className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors underline ml-1"
                    >
                      Clear all
                    </button>
                  </div>
                )}

                {isProductsLoading && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 mb-6">
                    {[...Array(8)].map((_, i) => (
                      <div key={`skel-${i}`} className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm flex flex-col animate-pulse">
                        <div className="aspect-square bg-gray-200" />
                        <div className="p-3 flex flex-col gap-2">
                          <div className="h-4 bg-gray-200 rounded w-full" />
                          <div className="h-3 bg-gray-200 rounded w-3/4" />
                          <div className="flex gap-0.5 mt-1">
                            {[...Array(5)].map((_, j) => (
                              <div key={j} className="h-3 w-3 bg-gray-200 rounded-full" />
                            ))}
                          </div>
                          <div className="h-5 bg-gray-200 rounded w-1/2 mt-1" />
                          <div className="flex justify-between mt-1">
                            <div className="h-3 bg-gray-200 rounded w-1/3" />
                            <div className="h-3 bg-gray-200 rounded w-1/4" />
                          </div>
                          <div className="h-3 bg-gray-100 rounded w-2/3 mt-2 pt-2 border-t border-gray-50" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Products Grid */}
                {!isProductsLoading && (() => {
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
                                  stock: product.stock || 0,
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

                {/* Empty State - No Products Found */}
                {!isProductsLoading && filteredProducts.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-16"
                  >
                    <div className="max-w-md mx-auto">
                      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg
                          className="w-12 h-12 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 9h6"
                          />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Products Found</h3>
                      <p className="text-gray-600 mb-6">
                        We couldn't find any products matching your current filters. Try adjusting your search terms or filters.
                      </p>
                      <Button
                        onClick={() => {
                          setSearchParams(prev => {
                            const p = new URLSearchParams(prev);
                            p.delete("query");
                            p.delete("sort");
                            p.delete("view");
                            p.delete("category");
                            return p;
                          });
                          const element = document.getElementById("shop-results-header");
                          if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "start" });
                          } else {
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }
                        }}
                        variant="outline"
                        className="px-6 py-2 border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white rounded-lg transition-all"
                      >
                        Clear All Filters
                      </Button>
                    </div>
                  </motion.div>
                )}

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
