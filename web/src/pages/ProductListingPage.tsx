/* eslint-disable @typescript-eslint/no-explicit-any */
import { categoryService } from "@/services/categoryService";
import { discountService } from "@/services/discountService";
import { productService } from "@/services/productService";
import { sellerService } from "@/services/sellerService";
import type { Category } from "@/types";
import type { ProductFilters, SortOption } from "@/types/filter.types";
import { DEFAULT_FILTERS, SORT_OPTIONS } from "@/types/filter.types";
import { motion } from "framer-motion";
import {
  ArrowLeft, BadgeCheck, ChevronRight, Loader2, MapPin, Search,
  ShoppingCart, SlidersHorizontal, Star, Truck, X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import ProductFilterModal from "../components/ProductFilterModal";
import ShopBuyNowModal from "../components/shop/ShopBuyNowModal";
import ShopVariantModal from "../components/shop/ShopVariantModal";
import { Badge } from "../components/ui/badge";
import { BazaarFooter } from "../components/ui/bazaar-footer";
import { Button } from "../components/ui/button";
import { CartModal } from "../components/ui/cart-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useToast } from "../hooks/use-toast";
import { useBuyerStore } from "../stores/buyerStore";
import { getSafeImageUrl } from "../utils/imageUtils";

const PAGE_SIZE = 24;

interface ListingProduct {
  id: string; name: string; price: number; originalPrice?: number;
  image: string; images: string[]; rating: number; reviewsCount: number;
  sold: number; category: string; seller: string; sellerId: string;
  isVerified: boolean; isFreeShipping: boolean; location: string;
  stock: number; variants: any[]; variantLabel1Values: string[];
  variantLabel2Values: string[]; isVacationMode: boolean;
  discountBadgePercent?: number; discountBadgeTooltip?: string;
  campaignDiscount?: { discountType: string; discountValue: number; maxDiscountAmount?: number } | null;
}

function normalizeProduct(row: any): ListingProduct {
  const rawImages: any[] = Array.isArray(row.images) ? row.images : [];
  const imageUrls = rawImages.map((img: any) => (typeof img === "string" ? img : img?.image_url)).filter(Boolean);
  const primaryImage = rawImages.find((img: any) => typeof img === "object" && img?.is_primary)?.image_url || row.primary_image_url || row.primary_image || row.image || imageUrls[0] || "https://placehold.co/400x400?text=Product";
  const variants = Array.isArray(row.variants) ? row.variants : [];
  const reviews = Array.isArray(row.reviews) ? row.reviews : [];
  const avgRating = reviews.length > 0 ? Math.round((reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length) * 10) / 10 : 0;
  const sellerCity = row.seller?.business_profile?.[0]?.city || row.seller?.business_profile?.city || "";
  return {
    id: row.id, name: row.name ?? "Unknown Product",
    price: typeof row.price === "number" ? row.price : parseFloat(String(row.price || 0)),
    originalPrice: row.original_price ?? row.originalPrice ?? undefined,
    image: getSafeImageUrl(primaryImage), images: imageUrls.length > 0 ? imageUrls : [primaryImage],
    rating: avgRating, reviewsCount: reviews.length, sold: row.sold_count || row.sold || 0,
    category: typeof row.category === "string" ? row.category : row.category?.name || "",
    seller: row.seller?.store_name || row.sellerName || "Verified Seller",
    sellerId: row.seller_id || row.sellerId || "",
    isVerified: row.seller?.approval_status === "verified" || row.approvalStatus === "approved",
    isFreeShipping: !!(row.is_free_shipping ?? row.isFreeShipping),
    location: sellerCity || "Philippines",
    stock: variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || row.stock || 0,
    variants: variants.map((v: any) => ({ id: v.id, name: v.variant_name, price: Number(v.price ?? row.price ?? 0), stock: v.stock || 0 })),
    variantLabel1Values: row.variantLabel1Values || [], variantLabel2Values: row.variantLabel2Values || [],
    discountBadgePercent: row.discountBadgePercent ?? undefined,
    discountBadgeTooltip: row.discountBadgeTooltip ?? undefined,
    campaignDiscount: row.campaignDiscount ?? null,
    isVacationMode: row.seller?.is_vacation_mode === true,
  };
}

/** Client-side filter pass — applies filters the server can't handle */
function applyClientFilters(products: ListingProduct[], filters: ProductFilters): ListingProduct[] {
  return products.filter((p) => {
    // Category filter — match by name from categoryPath
    if (filters.categoryId && filters.categoryPath.length > 0) {
      const filterCatName = filters.categoryPath[filters.categoryPath.length - 1].toLowerCase();
      if (p.category.toLowerCase() !== filterCatName) return false;
    }
    if (filters.priceRange.min !== null && p.price < filters.priceRange.min) return false;
    if (filters.priceRange.max !== null && p.price > filters.priceRange.max) return false;
    if (filters.minRating !== null && p.rating < filters.minRating) return false;
    if (filters.onSale && !(p.originalPrice && p.originalPrice > p.price) && !p.campaignDiscount) return false;
    if (filters.freeShipping && !p.isFreeShipping) return false;
    if (filters.officialStore && !p.isVerified) return false;
    if (filters.shippedFrom) {
      const loc = (p.location || "").toLowerCase();
      if (filters.shippedFrom === "metro_manila") {
        const mm = ["metro manila","manila","makati","quezon city","taguig","pasig","mandaluyong","pasay","parañaque","paranaque","caloocan","marikina","muntinlupa","las piñas","las pinas","valenzuela","malabon","navotas","pateros","san juan"];
        if (!mm.some((c) => loc.includes(c))) return false;
      }
    }
    return true;
  });
}

function applySorting(products: ListingProduct[], sort: SortOption): ListingProduct[] {
  const sorted = [...products];
  switch (sort) {
    case "price-low": sorted.sort((a, b) => a.price - b.price); break;
    case "price-high": sorted.sort((a, b) => b.price - a.price); break;
    case "rating-high": sorted.sort((a, b) => b.rating - a.rating); break;
    case "newest": sorted.sort((a, b) => b.id.localeCompare(a.id)); break;
    case "best-selling": sorted.sort((a, b) => b.sold - a.sold); break;
    default: break;
  }
  return sorted;
}

export default function ProductListingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToCart, cartItems, profile } = useBuyerStore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [rawProducts, setRawProducts] = useState<ListingProduct[]>([]);
  const [categoryProducts, setCategoryProducts] = useState<ListingProduct[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<ListingProduct[]>([]);
  const [matchedCategory, setMatchedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!!searchParams.get("q") || !!searchParams.get("categoryId"));
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState(searchParams.get("categoryId") || "");
  const [activeCategoryName, setActiveCategoryName] = useState(searchParams.get("category") || "");

  // Filter & sort
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);
  const [sortOption, setSortOption] = useState<SortOption>("relevance");
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Cart/Buy modals
  const [showCartModal, setShowCartModal] = useState(false);
  const [addedProduct, setAddedProduct] = useState<{ name: string; image: string } | null>(null);
  const [showBuyNowModal, setShowBuyNowModal] = useState(false);
  const [buyNowProduct, setBuyNowProduct] = useState<any>(null);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [variantProduct, setVariantProduct] = useState<any>(null);
  const [isBuyNowAction, setIsBuyNowAction] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const rawRef = useRef<ListingProduct[]>([]);
  rawRef.current = rawProducts;
  const prevSearchKeyRef = useRef<string | null>(null);  // tracks previous search to detect changes

  // Matched stores (Shopee-style store profile card above results)
  const [matchedStores, setMatchedStores] = useState<any[]>([]);

  // Fetch active campaign discounts for all loaded products (covers global flash sales + seller campaigns)
  const [activeCampaignDiscounts, setActiveCampaignDiscounts] = useState<Record<string, any>>({});
  useEffect(() => {
    let isMounted = true;
    const productIds = [...new Set(rawProducts.map(p => p.id).filter(Boolean))];
    if (productIds.length === 0) { setActiveCampaignDiscounts({}); return; }
    discountService.getActiveDiscountsForProducts(productIds).then(discounts => {
      if (isMounted) setActiveCampaignDiscounts(discounts);
    }).catch(() => { if (isMounted) setActiveCampaignDiscounts({}); });
    return () => { isMounted = false; };
  }, [rawProducts]);

  // Apply campaign discounts to products (enriches price, originalPrice, badges)
  const enrichedProducts = useMemo(() => {
    if (Object.keys(activeCampaignDiscounts).length === 0) return rawProducts;
    return rawProducts.map(p => {
      const discount = activeCampaignDiscounts[p.id];
      if (!discount) return p;
      // Already discounted by transformProduct
      if (p.originalPrice && p.originalPrice > p.price) {
        return { ...p,
          discountBadgePercent: p.discountBadgePercent ?? (discount.discountType === 'percentage' ? Math.round(discount.discountValue) : undefined),
          discountBadgeTooltip: p.discountBadgeTooltip ?? (discount.discountType === 'percentage' && typeof discount.maxDiscountAmount === 'number' ? `Up to ₱${discount.maxDiscountAmount.toLocaleString()} off` : undefined),
          campaignDiscount: p.campaignDiscount ?? { discountType: discount.discountType, discountValue: discount.discountValue, maxDiscountAmount: discount.maxDiscountAmount },
        };
      }
      // Apply discount now
      const calc = discountService.calculateLineDiscount(p.price, 1, discount);
      if (calc.discountPerUnit <= 0) return p;
      return { ...p,
        price: calc.discountedUnitPrice,
        originalPrice: discount.originalPrice || p.price,
        campaignDiscount: { discountType: discount.discountType, discountValue: discount.discountValue, maxDiscountAmount: discount.maxDiscountAmount },
        discountBadgePercent: discount.discountType === 'percentage' ? Math.round(discount.discountValue) : Math.round(((p.price - calc.discountedUnitPrice) / p.price) * 100),
        discountBadgeTooltip: discount.discountType === 'percentage' && typeof discount.maxDiscountAmount === 'number' ? `Up to ₱${discount.maxDiscountAmount.toLocaleString()} off` : undefined,
      };
    });
  }, [rawProducts, activeCampaignDiscounts]);

  const enrichedCategoryProducts = useMemo(() => {
    if (Object.keys(activeCampaignDiscounts).length === 0) return categoryProducts;
    return categoryProducts.map(p => {
      const discount = activeCampaignDiscounts[p.id];
      if (!discount) return p;
      if (p.originalPrice && p.originalPrice > p.price) {
        return { ...p, discountBadgePercent: p.discountBadgePercent ?? (discount.discountType === 'percentage' ? Math.round(discount.discountValue) : undefined), campaignDiscount: p.campaignDiscount ?? { discountType: discount.discountType, discountValue: discount.discountValue, maxDiscountAmount: discount.maxDiscountAmount } };
      }
      const calc = discountService.calculateLineDiscount(p.price, 1, discount);
      if (calc.discountPerUnit <= 0) return p;
      return { ...p, price: calc.discountedUnitPrice, originalPrice: discount.originalPrice || p.price, campaignDiscount: { discountType: discount.discountType, discountValue: discount.discountValue, maxDiscountAmount: discount.maxDiscountAmount }, discountBadgePercent: discount.discountType === 'percentage' ? Math.round(discount.discountValue) : Math.round(((p.price - calc.discountedUnitPrice) / p.price) * 100) };
    });
  }, [categoryProducts, activeCampaignDiscounts]);

  const enrichedRelatedProducts = useMemo(() => {
    if (Object.keys(activeCampaignDiscounts).length === 0) return relatedProducts;
    return relatedProducts.map(p => {
      const discount = activeCampaignDiscounts[p.id];
      if (!discount) return p;
      if (p.originalPrice && p.originalPrice > p.price) {
        return { ...p, discountBadgePercent: p.discountBadgePercent ?? (discount.discountType === 'percentage' ? Math.round(discount.discountValue) : undefined), campaignDiscount: p.campaignDiscount ?? { discountType: discount.discountType, discountValue: discount.discountValue, maxDiscountAmount: discount.maxDiscountAmount } };
      }
      const calc = discountService.calculateLineDiscount(p.price, 1, discount);
      if (calc.discountPerUnit <= 0) return p;
      return { ...p, price: calc.discountedUnitPrice, originalPrice: discount.originalPrice || p.price, campaignDiscount: { discountType: discount.discountType, discountValue: discount.discountValue, maxDiscountAmount: discount.maxDiscountAmount }, discountBadgePercent: discount.discountType === 'percentage' ? Math.round(discount.discountValue) : Math.round(((p.price - calc.discountedUnitPrice) / p.price) * 100) };
    });
  }, [relatedProducts, activeCampaignDiscounts]);

  // Derived: apply client-side filters + sort
  const products = applySorting(applyClientFilters(enrichedProducts, filters), sortOption);
  const filteredCategoryProducts = applySorting(applyClientFilters(enrichedCategoryProducts, filters), sortOption);
  const filteredRelatedProducts = applySorting(applyClientFilters(enrichedRelatedProducts, filters), sortOption);

  useEffect(() => { categoryService.getActiveCategories().then((d) => { if (d) setCategories(d); }); }, []);

  const executeSearch = useCallback(
    async (query: string, reset = true, categoryIdOverride?: string, categoryNameOverride?: string) => {
      const trimmed = query.trim();
      const catId = categoryIdOverride ?? activeCategoryId;
      const catName = categoryNameOverride ?? activeCategoryName;
      if (!trimmed && !catId) {
        if (reset) { setRawProducts([]); setCategoryProducts([]); setRelatedProducts([]); setMatchedCategory(null); setSearchPerformed(false); }
        return;
      }
      try {
        if (reset) { setIsLoading(true); setOffset(0); setRawProducts([]); setCategoryProducts([]); setRelatedProducts([]); }
        else { setIsLoadingMore(true); }
        const currentOffset = reset ? 0 : offset;

        if (catId && !trimmed) {
          const results = await productService.getProducts({ categoryId: catId, isActive: true, approvalStatus: "approved", limit: PAGE_SIZE, offset: currentOffset });
          const normalized = (results || []).map(normalizeProduct);
          if (reset) { setMatchedCategory(catName || null); setCategoryProducts(normalized); setRelatedProducts([]); setRawProducts(normalized); setOffset(PAGE_SIZE); window.scrollTo({ top: 0 }); }
          else { const ids = new Set(rawRef.current.map((p) => p.id)); const np = normalized.filter((p) => !ids.has(p.id)); setRawProducts((prev) => [...prev, ...np]); setCategoryProducts((prev) => [...prev, ...np]); setOffset((prev) => prev + PAGE_SIZE); }
          setHasMore(results.length === PAGE_SIZE); setSearchPerformed(true); return;
        }

        const normalizedQuery = trimmed.toLowerCase();
        const matched = reset ? categories.find((c) => c.name.toLowerCase() === normalizedQuery) ?? null : null;

        if (reset && matched) {
          const [catR, relR] = await Promise.all([
            productService.getProducts({ categoryId: matched.id, isActive: true, approvalStatus: "approved", limit: PAGE_SIZE, offset: 0 }),
            productService.getProducts({ searchQuery: trimmed, isActive: true, approvalStatus: "approved", limit: PAGE_SIZE, offset: 0 }),
          ]);
          const catProds = (catR || []).map(normalizeProduct);
          const catIds = new Set(catProds.map((p) => p.id));
          const relProds = (relR || []).map(normalizeProduct).filter((p) => !catIds.has(p.id));
          setMatchedCategory(matched.name); setCategoryProducts(catProds); setRelatedProducts(relProds); setRawProducts([...catProds, ...relProds]); setOffset(PAGE_SIZE); setHasMore(relR.length === PAGE_SIZE);
        } else {
          const results = await productService.getProducts({ searchQuery: trimmed, isActive: true, approvalStatus: "approved", limit: PAGE_SIZE, offset: currentOffset });
          const normalized = (results || []).map(normalizeProduct);
          if (reset) { setMatchedCategory(null); setCategoryProducts([]); setRelatedProducts(normalized); setRawProducts(normalized); setOffset(PAGE_SIZE); window.scrollTo({ top: 0 }); }
          else { const ids = new Set(rawRef.current.map((p) => p.id)); const np = normalized.filter((p) => !ids.has(p.id)); setRawProducts((prev) => [...prev, ...np]); setRelatedProducts((prev) => [...prev, ...np]); setOffset((prev) => prev + PAGE_SIZE); }
          setHasMore(results.length === PAGE_SIZE);
        }
        setSearchPerformed(true);
      } catch (error) { console.error("[ProductListingPage] Search error:", error); }
      finally { setIsLoading(false); setIsLoadingMore(false); }
    }, [offset, categories, activeCategoryId, activeCategoryName]
  );

  // Watch URL params for changes (handles initial load, Header search, back/forward navigation)
  useEffect(() => {
    const q = searchParams.get("q") || "";
    const catId = searchParams.get("categoryId") || "";
    const catName = searchParams.get("category") || "";

    // Build a key from current URL params
    const searchKey = `q=${q}&catId=${catId}`;

    // For search queries, wait until categories are loaded (needed for category matching)
    if (q && categories.length === 0) return;

    // Skip if this exact search was already executed (prevents double-fetch on same render)
    if (searchKey === prevSearchKeyRef.current) return;
    prevSearchKeyRef.current = searchKey;

    // Update state to match URL
    setSearchQuery(q);
    setActiveCategoryId(catId);
    setActiveCategoryName(catName);
    setFilters(DEFAULT_FILTERS);
    setSortOption("relevance");

    if (q) {
      executeSearch(q, true, "", "");
    } else if (catId) {
      executeSearch("", true, catId, catName);
    } else {
      setRawProducts([]);
      setCategoryProducts([]);
      setRelatedProducts([]);
      setMatchedCategory(null);
      setSearchPerformed(false);
      setIsLoading(false);
    }

    // Reset the ref when component unmounts so back-navigation works
    return () => { prevSearchKeyRef.current = null; };
  }, [searchParams, categories]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading && (searchQuery.trim() || activeCategoryId)) executeSearch(searchQuery, false);
    }, { rootMargin: "200px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, searchQuery, activeCategoryId, executeSearch]);

  const handleFilterApply = (newFilters: ProductFilters) => { setFilters(newFilters); };
  const handleSortChange = (val: string) => { setSortOption(val as SortOption); };

  // ── Dedicated store search ─────────────────────────────────────────────────
  // Looks up sellers whose store_name matches the query and renders their
  // profile card above the product grid (Shopee-style). Runs independently
  // from product fetching so the card appears as soon as it is found.
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) { setMatchedStores([]); return; }
    let cancelled = false;
    const lowerQ = q.toLowerCase();

    // Fast path: derive from currently-loaded products to render instantly
    const derivedNow = (() => {
      const map = new Map<string, any>();
      rawProducts.forEach((p) => {
        const name = p.seller;
        if (!name || !name.toLowerCase().includes(lowerQ)) return;
        const key = p.sellerId || `__name__:${name.toLowerCase()}`;
        if (map.has(key)) return;
        const count = p.sellerId
          ? rawProducts.filter((pp) => pp.sellerId === p.sellerId).length
          : 0;
        map.set(key, {
          id: key,
          store_name: name,
          avatar_url: null,
          is_verified: p.isVerified,
          rating: null,
          products_count: count > 0 ? count : null,
        });
      });
      return Array.from(map.values());
    })();
    if (derivedNow.length > 0) setMatchedStores(derivedNow);

    // Async: query sellers table for richer data (avatar, verified, rating)
    (async () => {
      try {
        const apiStores = await sellerService.getPublicStores({
          searchQuery: q,
          includeUnverified: true,
          limit: 5,
        });
        if (cancelled) return;
        const merged = new Map<string, any>(
          (apiStores || []).map((s: any) => [
            String(s.id),
            {
              ...s,
              products_count:
                rawProducts.filter((p) => p.sellerId && p.sellerId === String(s.id)).length ||
                s.products_count ||
                null,
            },
          ])
        );
        // Add product-derived stores not returned by the API (RLS / unverified)
        derivedNow.forEach((store) => {
          if (!merged.has(String(store.id))) merged.set(String(store.id), store);
        });
        if (!cancelled && merged.size > 0) {
          setMatchedStores(Array.from(merged.values()));
        }
      } catch {
        // Fast-path derived list remains visible — no action needed
      }
    })();

    return () => { cancelled = true; };
  }, [searchQuery, rawProducts]);

  // Active filter count for badge
  const activeFilterCount = (() => {
    let c = 0;
    if (filters.categoryId) c++;
    if (filters.priceRange.min !== null || filters.priceRange.max !== null) c++;
    if (filters.minRating !== null) c++;
    if (filters.shippedFrom) c++;
    if (filters.onSale || filters.freeShipping || filters.withVouchers || filters.preferredSeller || filters.officialStore) c++;
    if (filters.standardDelivery || filters.sameDayDelivery || filters.cashOnDelivery || filters.pickupAvailable) c++;
    return c;
  })();

  // Filter chips
  const filterChips: { id: string; label: string; onRemove: () => void }[] = [];
  if (filters.categoryId && filters.categoryPath.length > 0) filterChips.push({ id: "category", label: `Category: ${filters.categoryPath.join(" > ")}`, onRemove: () => setFilters((f) => ({ ...f, categoryId: null, categoryPath: [] })) });
  if (filters.priceRange.min !== null || filters.priceRange.max !== null) filterChips.push({ id: "price", label: `₱${filters.priceRange.min ?? 0} – ₱${filters.priceRange.max ?? "∞"}`, onRemove: () => setFilters((f) => ({ ...f, priceRange: { min: null, max: null } })) });
  if (filters.minRating !== null) filterChips.push({ id: "rating", label: `${filters.minRating}★ & up`, onRemove: () => setFilters((f) => ({ ...f, minRating: null })) });
  if (filters.shippedFrom) filterChips.push({ id: "location", label: filters.shippedFrom === "metro_manila" ? "Metro Manila" : "Philippines", onRemove: () => setFilters((f) => ({ ...f, shippedFrom: null })) });
  if (filters.onSale) filterChips.push({ id: "sale", label: "On Sale", onRemove: () => setFilters((f) => ({ ...f, onSale: false })) });
  if (filters.freeShipping) filterChips.push({ id: "freeShip", label: "Free Shipping", onRemove: () => setFilters((f) => ({ ...f, freeShipping: false })) });
  if (filters.officialStore) filterChips.push({ id: "official", label: "Official Store", onRemove: () => setFilters((f) => ({ ...f, officialStore: false })) });
  if (filters.withVouchers) filterChips.push({ id: "vouchers", label: "With Vouchers", onRemove: () => setFilters((f) => ({ ...f, withVouchers: false })) });
  if (filters.standardDelivery || filters.sameDayDelivery || filters.cashOnDelivery || filters.pickupAvailable) {
    const parts = [filters.standardDelivery && "Standard", filters.sameDayDelivery && "Same Day", filters.cashOnDelivery && "COD", filters.pickupAvailable && "Pickup"].filter(Boolean).join(", ");
    filterChips.push({ id: "shipping", label: parts, onRemove: () => setFilters((f) => ({ ...f, standardDelivery: false, sameDayDelivery: false, cashOnDelivery: false, pickupAvailable: false })) });
  }

  const renderProductCard = (product: ListingProduct, index: number) => (
    <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.03, 0.5) }}
      className="bg-white rounded-xl hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer border border-gray-100"
      onClick={() => navigate(`/product/${product.id}`)} role="link" tabIndex={0} aria-label={`View details for ${product.name}`}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate(`/product/${product.id}`); }}>
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img loading="lazy" src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/400x400?text=No+Image"; }} />
        {product.originalPrice && product.originalPrice > product.price && (
          <div title={product.discountBadgeTooltip} className="absolute top-3 left-3 bg-[#DC2626] text-white px-2 py-[2px] rounded text-[11px] font-black uppercase tracking-wider z-10 shadow-sm">
            {typeof product.discountBadgePercent === "number" ? product.discountBadgePercent : Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
          </div>
        )}
        {product.isFreeShipping && <div className="absolute top-3 right-3 bg-emerald-500 text-white p-1.5 rounded-lg shadow-sm"><Truck className="w-3 h-3" /></div>}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="font-bold text-[var(--text-headline)] group-hover:text-[var(--brand-primary)] transition-colors line-clamp-2 h-[40px] text-sm leading-tight">{product.name}</h3>
        <div className="mt-1 flex items-center gap-1.5 flex-wrap h-[20px]">
          <div className="flex items-center"><Star className="w-3.5 h-3.5 text-yellow-500 fill-current" /><span className="text-xs text-[var(--text-muted)] font-medium ml-1">{product.rating} ({product.reviewsCount.toLocaleString()})</span></div>
          {product.isVerified && <Badge variant="outline" className="text-[10px] py-0 px-1.5 gap-1 border-emerald-500/20 bg-emerald-500/5 text-emerald-600"><BadgeCheck className="w-2.5 h-2.5" />Verified</Badge>}
        </div>
        <div className="mt-2 mb-2">
          <div className="flex flex-col justify-end min-h-[36px]">
            {product.originalPrice && product.originalPrice > product.price && <span className="text-[11px] text-gray-400 line-through font-medium leading-none mb-[3px]">₱{product.originalPrice.toLocaleString()}</span>}
            <span className={product.originalPrice && product.originalPrice > product.price ? "text-lg font-black text-[#DC2626] leading-none" : "text-lg font-black text-[#D97706] leading-none"}>₱{product.price.toLocaleString()}</span>
          </div>
          <div className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-1">{product.sold.toLocaleString()} sold</div>
        </div>
        <div className="mt-1 text-[11px] text-[var(--text-muted)] font-medium flex items-center"><MapPin className="w-2.5 h-2.5 mr-1 flex-shrink-0 text-[var(--brand-primary)]" /><span className="line-clamp-1">{product.location}</span></div>
        <div className="mt-1"><p className="text-[10px] text-[var(--text-muted)] font-semibold">{product.seller}</p></div>
        <div className="mt-auto pt-3 flex gap-1.5">
          <Button onClick={(e) => { e.stopPropagation();
            if (!profile) { toast({ title: "Login Required", description: "Please sign in to add items to your cart.", variant: "destructive" }); navigate("/login"); return; }
            if (product.isVacationMode) { toast({ title: "Store on Vacation", description: "This store is temporarily unavailable.", variant: "destructive" }); return; }
            if (product.variants.length > 0 || product.variantLabel1Values.length > 0 || product.variantLabel2Values.length > 0) { setVariantProduct(product); setIsBuyNowAction(false); setShowVariantModal(true); return; }
            if (product.stock === 0) { toast({ title: "Out of Stock", description: "This product is currently unavailable.", variant: "destructive" }); return; }
            addToCart(product as any); setAddedProduct({ name: product.name, image: product.image }); setShowCartModal(true);
          }} variant="outline" size="icon" className="flex-shrink-0 border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white rounded-lg transition-all active:scale-95 h-8 w-8 p-0" title="Add to Cart" aria-label={`Add ${product.name} to cart`}>
            <ShoppingCart className="w-4 h-4" />
          </Button>
          <Button onClick={(e) => { e.stopPropagation();
            if (!profile) { toast({ title: "Login Required", description: "Please sign in to make a purchase.", variant: "destructive" }); navigate("/login"); return; }
            if (product.isVacationMode) { toast({ title: "Store on Vacation", description: "This store is temporarily unavailable.", variant: "destructive" }); return; }
            if (product.variants.length > 0 || product.variantLabel1Values.length > 0 || product.variantLabel2Values.length > 0) { setVariantProduct(product); setIsBuyNowAction(true); setShowVariantModal(true); }
            else { setBuyNowProduct({ ...product, quantity: 1, selectedVariant: null, selectedVariantLabel1: null, selectedVariantLabel2: null }); setShowBuyNowModal(true); }
          }} className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-lg transition-all active:scale-95 h-8 text-xs font-bold" aria-label={`Buy ${product.name} now`}>
            Buy Now
          </Button>
        </div>
      </div>
    </motion.div>
  );

  // Exclude the currently active category from filter options
  const activeCatNameLower = (activeCategoryName || matchedCategory || "").toLowerCase();
  const availableCats = categories
    .filter((c) => c.name.toLowerCase() !== activeCatNameLower)
    .map((c) => ({ id: c.id, name: c.name, path: [c.name] }));

  return (
    <>
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-4">
          {/* Back button */}
          <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors" aria-label="Go back">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {/* Category breadcrumb */}
          {activeCategoryName && !searchQuery && (
            <div className="mb-4 flex items-center gap-3">
              <button onClick={() => navigate("/categories")} className="text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors">Categories</button>
              <ChevronRight className="w-4 h-4 text-gray-300" />
              <span className="text-sm font-bold text-[var(--text-headline)]">{activeCategoryName}</span>
            </div>
          )}

          {/* ── Shopee-style Store Profile Card(s) — appears above products ── */}
          {searchQuery && matchedStores.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">SHOPS RELATED TO</span>
                <span className="text-[11px] font-bold text-[var(--brand-primary)] uppercase tracking-widest">&ldquo;{searchQuery}&rdquo;</span>
              </div>
              <div className="space-y-2">
                {matchedStores.map((store, idx) => {
                  const isNameKey = typeof store.id === 'string' && store.id.startsWith('__name__:');
                  const handleStoreClick = () => {
                    if (isNameKey) navigate(`/stores?q=${encodeURIComponent(store.store_name)}`);
                    else navigate(`/seller/${store.id}`);
                  };
                  return (
                    <motion.div
                      key={store.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      onClick={handleStoreClick}
                      role="link"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleStoreClick(); }}
                      className="bg-white border border-gray-100 rounded-xl px-5 py-4 flex items-center gap-5 cursor-pointer hover:shadow-md hover:border-[var(--brand-primary)]/30 transition-all group w-full"
                    >
                      {/* Avatar */}
                      <div className="w-[64px] h-[64px] rounded-full overflow-hidden bg-orange-50 flex-shrink-0 border-2 border-orange-100 shadow-sm flex items-center justify-center">
                        {store.avatar_url ? (
                          <img loading="lazy" src={store.avatar_url} alt={store.store_name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <span className="text-2xl font-black text-[var(--brand-primary)]">
                            {(store.store_name || '?')[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
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
                        <p className="text-xs text-gray-400 mb-2 truncate">
                          {(store.store_name || '').toLowerCase().replace(/\s+/g, '')}
                        </p>
                        <div className="flex items-center gap-5 text-xs text-gray-500 flex-wrap">
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
                        </div>
                      </div>
                      {/* CTA */}
                      <Button
                        onClick={(e) => { e.stopPropagation(); handleStoreClick(); }}
                        className="flex-shrink-0 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-lg h-9 px-4 text-xs font-bold"
                      >
                        View Store
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Results toolbar: count + sort + filter */}
          {searchPerformed && (
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {products.length > 0 && (
                  <p className="text-sm text-[var(--text-muted)] font-medium">
                    <span className="text-[var(--brand-primary)] font-bold">{products.length}</span> result{products.length !== 1 ? "s" : ""}
                    {searchQuery ? ` for "${searchQuery}"` : activeCategoryName ? ` in ${activeCategoryName}` : ""}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Sort */}
                <Select value={sortOption} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-[160px] h-9 border-none bg-white shadow-sm hover:shadow-md rounded-xl text-sm font-medium text-[var(--text-headline)] focus:ring-0">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-xl bg-white/95 backdrop-blur-md">
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs focus:bg-[var(--brand-primary)] focus:text-white cursor-pointer">{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Filter button */}
                <button onClick={() => setShowFilterModal(true)}
                  className={`relative p-2.5 rounded-xl transition-all ${activeFilterCount > 0 ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" : "bg-white shadow-sm text-gray-600 hover:shadow-md"}`}
                  aria-label="Open filters">
                  <SlidersHorizontal className="w-4 h-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[var(--brand-primary)] text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center min-w-[18px] h-[18px]">{activeFilterCount}</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Active filter chips */}
          {filterChips.length > 0 && (
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
              {filterChips.map((chip) => (
                <button key={chip.id} onClick={chip.onRemove} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors whitespace-nowrap flex-shrink-0">
                  {chip.label}<X className="w-3 h-3" />
                </button>
              ))}
              <button onClick={() => { setFilters(DEFAULT_FILTERS); }} className="text-xs font-semibold text-[var(--brand-primary)] whitespace-nowrap px-2">Clear All</button>
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={`skel-${i}`} className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm flex flex-col animate-pulse">
                  <div className="aspect-square bg-gray-200" />
                  <div className="p-3 flex flex-col gap-2"><div className="h-4 bg-gray-200 rounded w-full" /><div className="h-3 bg-gray-200 rounded w-3/4" /><div className="h-5 bg-gray-200 rounded w-1/2 mt-1" /><div className="h-3 bg-gray-200 rounded w-1/3 mt-1" /></div>
                </div>
              ))}
            </div>
          )}

          {/* Category-matched section */}
          {!isLoading && matchedCategory && filteredCategoryProducts.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <h2 className="text-lg font-bold text-[var(--text-headline)]">{matchedCategory} Category</h2>
                <span className="text-sm text-[var(--text-muted)]">{filteredCategoryProducts.length} items</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">{filteredCategoryProducts.map((p, i) => renderProductCard(p, i))}</div>
            </div>
          )}

          {/* Related / all results */}
          {!isLoading && filteredRelatedProducts.length > 0 && (
            <div>
              {matchedCategory && filteredCategoryProducts.length > 0 && (
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-[var(--text-headline)]">Related Products</h2>
                  <span className="text-sm text-[var(--text-muted)]">{filteredRelatedProducts.length} items</span>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">{filteredRelatedProducts.map((p, i) => renderProductCard(p, i))}</div>
            </div>
          )}

          <div ref={sentinelRef} className="h-1" />

          {isLoadingMore && (
            <div className="flex items-center justify-center gap-2 py-8"><Loader2 className="w-5 h-5 animate-spin text-[var(--brand-primary)]" /><span className="text-sm text-[var(--text-muted)]">Loading more products...</span></div>
          )}

          {!hasMore && products.length > 0 && !isLoadingMore && (
            <div className="text-center py-8"><p className="text-sm text-[var(--text-muted)]">No more products</p></div>
          )}

          {/* Empty state */}
          {!isLoading && searchPerformed && products.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6"><Search className="w-12 h-12 text-gray-400" /></div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{activeFilterCount > 0 ? "No products match your filters" : activeCategoryName ? "No Products Available" : "No Results Found"}</h3>
                <p className="text-gray-600 mb-6">
                  {activeFilterCount > 0 ? "Try adjusting or clearing your filters to see more products."
                    : activeCategoryName ? `There are no products available in "${activeCategoryName}" yet.`
                    : `We couldn't find any products matching "${searchQuery}".`}
                </p>
                <Button onClick={() => { if (activeFilterCount > 0) { setFilters(DEFAULT_FILTERS); } else { setSearchQuery(""); setRawProducts([]); setSearchPerformed(false); navigate(activeCategoryName ? "/categories" : "/shop"); } }}
                  variant="outline" className="px-6 py-2 border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white rounded-lg">
                  {activeFilterCount > 0 ? "Clear Filters" : activeCategoryName ? "Browse Categories" : "Browse All Products"}
                </Button>
              </div>
            </motion.div>
          )}

          {!isLoading && !searchPerformed && !activeCategoryId && (
            <div className="text-center py-20"><div className="max-w-md mx-auto"><div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6"><Search className="w-12 h-12 text-gray-300" /></div><h3 className="text-lg font-semibold text-gray-700 mb-2">Search for products</h3><p className="text-gray-500 text-sm">Enter a keyword above to find products, brands, and more.</p></div></div>
          )}
        </div>

        {/* Filter Modal */}
        <ProductFilterModal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} onApply={handleFilterApply} initialFilters={filters} availableCategories={availableCats} />

        {/* Cart/Buy Modals */}
        {addedProduct && showCartModal && <CartModal isOpen={showCartModal} onClose={() => setShowCartModal(false)} productName={addedProduct.name} productImage={addedProduct.image} cartItemCount={cartItems.length} />}
        <ShopBuyNowModal isOpen={showBuyNowModal} onClose={() => { setShowBuyNowModal(false); setBuyNowProduct(null); }} product={buyNowProduct} />
        {variantProduct && showVariantModal && <ShopVariantModal isOpen={showVariantModal} onClose={() => { setShowVariantModal(false); setVariantProduct(null); setIsBuyNowAction(false); }} product={variantProduct} isBuyNow={isBuyNowAction} onAddToCartSuccess={(name, image) => { setAddedProduct({ name, image }); setShowCartModal(true); }} />}
      </div>
      <BazaarFooter />
    </>
  );
}
