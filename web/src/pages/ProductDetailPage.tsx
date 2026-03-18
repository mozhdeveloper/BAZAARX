/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "../hooks/use-toast";
import {
    Minus,
    Plus,
    ShoppingCart,
    Star,
    ChevronRight,
    ChevronLeft,
    MessageCircle,
    MapPin,
    ShieldCheck,
    Gift,
    Heart,
    Ruler,
    X,
    Flame,
    Shield
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import {
    trendingProducts,
    bestSellerProducts,
    newArrivals,
} from "../data/products";
import { useBuyerStore, demoSellers } from "../stores/buyerStore";
import { useProductStore } from "../stores/sellerStore";
import { useChatStore } from "../stores/chatStore";
import { Button } from "../components/ui/button";
import Header from "../components/Header";
import { BazaarFooter } from "../components/ui/bazaar-footer";
import { cn } from "../lib/utils";
import { productService } from "../services/productService";
import { discountService } from "@/services/discountService";
import { warrantyService, type WarrantyInfo } from "@/services/warrantyService";
import { ProductWithSeller } from "../types/database.types";
import type { ActiveDiscount } from "@/types/discount";
// Lazily loaded — these are only needed on interaction or scroll, not initial render
const ProductReviews = lazy(() =>
    import("@/components/reviews/ProductReviews").then((m) => ({
        default: m.ProductReviews,
    }))
);
const CreateRegistryModal = lazy(() =>
    import("../components/CreateRegistryModal").then((m) => ({
        default: m.CreateRegistryModal,
    }))
);
const CartModal = lazy(() =>
    import("../components/ui/cart-modal").then((m) => ({
        default: m.CartModal,
    }))
);
const BuyNowModal = lazy(() =>
    import("../components/ui/buy-now-modal").then((m) => ({
        default: m.BuyNowModal,
    }))
);
import {
    mapDbProductToNormalizedLegacy,
    mapSellerProductToNormalized,
    mapBuyerProductToNormalized,
    buildCurrentSeller,
    mapNormalizedToBuyerProduct,
    type NormalizedProductDetail,
} from "../utils/productMapper";
import {
    enhancedProductData,
    reviewsData,
} from "../data/dummy/productDetailData";

interface ProductDetailPageProps { }

interface EnhancedReview {
    id: number;
    user: string;
    rating: number;
    date: string;
    comment: string;
    helpful: number;
    isLiked: boolean;
    replies: any[];
}

// Helper to get warranty type icon
const getWarrantyTypeIcon = (warrantyType: string) => {
    switch (warrantyType) {
        case 'local_manufacturer':
            return ShieldCheck;
        case 'international_manufacturer':
            return Shield;
        case 'shop_warranty':
            return StoreIcon;
        default:
            return ShieldCheck;
    }
};

// Helper to get warranty type label
const getWarrantyTypeLabel = (warrantyType: string) => {
    switch (warrantyType) {
        case 'local_manufacturer':
            return 'Local Manufacturer Warranty';
        case 'international_manufacturer':
            return 'International Manufacturer Warranty';
        case 'shop_warranty':
            return 'Shop Warranty';
        case 'no_warranty':
            return 'No Warranty';
        default:
            return warrantyType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
};

// Simple Store icon component
const StoreIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
        <path d="M2 7h20" />
        <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" />
    </svg>
);

export default function ProductDetailPage({ }: ProductDetailPageProps) {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {
        addToCart,
        setQuickOrder,
        profile,
        registries,
        createRegistry,
        addToRegistry,
        removeRegistryItem,
        cartItems,
        followShop,
        unfollowShop,
        isFollowing,
        loadFollowedShops,
        campaignDiscountCache,
        updateCampaignDiscountCache,
    } = useBuyerStore();
    const { products: sellerProducts } = useProductStore();

    const [showRegistryModal, setShowRegistryModal] = useState(false);
    const [isCreateRegistryModalOpen, setIsCreateRegistryModalOpen] =
        useState(false);
    const [showSizeGuide, setShowSizeGuide] = useState(false);
    const [isSizeGuideImageLoading, setIsSizeGuideImageLoading] = useState(false);

    // Load followed shops from DB on mount
    useEffect(() => { loadFollowedShops(); }, []);
    const [quantity, setQuantity] = useState(1);
    const [selectedImage, setSelectedImage] = useState(0);
    const [selectedVariantLabel2Index, setSelectedVariantLabel2Index] =
        useState(0);
    const [selectedVariantLabel1, setSelectedVariantLabel1] = useState("");
    const [activeTab, setActiveTab] = useState("Description");
    const [dbProduct, setDbProduct] = useState<ProductWithSeller | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [warrantyInfo, setWarrantyInfo] = useState<WarrantyInfo | null>(null);
    const [isWarrantyLoading, setIsWarrantyLoading] = useState(false);

    // Seed campaign discount instantly if we already have it cached
    const [activeCampaignDiscount, setActiveCampaignDiscount] = useState<ActiveDiscount | null>(
        () => (id ? campaignDiscountCache[id] : null) || null
    );

    // Modal states for Add to Cart and Buy Now
    const [showCartModal, setShowCartModal] = useState(false);
    const [showBuyNowModal, setShowBuyNowModal] = useState(false);
    const [addedProductInfo, setAddedProductInfo] = useState<{
        name: string;
        image: string;
    } | null>(null);

    // Fetch product from database if it's a real product (UUID)
    useEffect(() => {
        const fetchProduct = async () => {
            // Basic check if it's a UUID (real product) or mock id
            if (!id || id.length < 10) return;

            setIsLoading(true);
            try {
                const product = await productService.getProductById(id);
                if (product) {
                    setDbProduct(product);
                }
            } catch (error) {
                console.error("Error fetching product details:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProduct();
    }, [id]);

    // ── Resolve source product & build normalizedProduct via mappers ──────────

    // 1. Try seller-store products (already mapped SellerProduct objects)
    const storeProduct = sellerProducts.find((p) => p.id === id);

    // 2. Try demo / buyer-store lists
    const demoProduct =
        trendingProducts.find((p) => p.id === id) ||
        trendingProducts.find((p) => p.id === id?.split("-")[0]) ||
        bestSellerProducts.find((p) => p.id === id) ||
        bestSellerProducts.find((p) => p.id === id?.split("-")[0]) ||
        newArrivals.find((p) => p.id === id) ||
        newArrivals.find((p) => p.id === id?.split("-")[0]);

    // 3. Build normalizedProduct through the appropriate typed mapper
    const normalizedProduct: NormalizedProductDetail | null = useMemo(() => {
        if (dbProduct) return mapDbProductToNormalizedLegacy(dbProduct);
        if (storeProduct) return mapSellerProductToNormalized(storeProduct);
        if (demoProduct) return mapBuyerProductToNormalized(demoProduct as any);
        return null;
    }, [dbProduct, storeProduct, demoProduct]);

    const isInRegistry = useMemo(() => {
        if (!normalizedProduct) return false;
        return registries.some(reg =>
            reg.products?.some(p => p.id === (normalizedProduct as any).id)
        );
    }, [registries, normalizedProduct]);

    // 4. Derive currentSeller from normalizedProduct
    const currentSeller = useMemo(() => {
        if (!normalizedProduct) return demoSellers[0];
        return buildCurrentSeller(normalizedProduct, demoSellers);
    }, [normalizedProduct]);

    useEffect(() => {
        let isMounted = true;

        const loadActiveDiscount = async () => {
            if (!normalizedProduct?.id) return;

            try {
                const discount = await discountService.getActiveProductDiscount(normalizedProduct.id);
                if (isMounted && discount) {
                    setActiveCampaignDiscount(discount);
                    // Persist to cache so cart/checkout are also instantaneous
                    updateCampaignDiscountCache({ [normalizedProduct.id]: discount });
                } else if (isMounted && !discount) {
                    setActiveCampaignDiscount(null);
                }
            } catch (error) {
                console.error("Failed to fetch active campaign discount for product detail:", error);
            }
        };

        loadActiveDiscount();
        return () => {
            isMounted = false;
        };
    }, [normalizedProduct?.id]);

    // Fetch warranty information when product is loaded
    useEffect(() => {
        const fetchWarranty = async () => {
            if (!normalizedProduct?.id) return;

            setIsWarrantyLoading(true);
            try {
                const warranty = await warrantyService.getProductWarranty(normalizedProduct.id);
                if (warranty) {
                    setWarrantyInfo(warranty);
                }
            } catch (error) {
                console.error("Error fetching warranty information:", error);
            } finally {
                setIsWarrantyLoading(false);
            }
        };

        fetchWarranty();
    }, [normalizedProduct?.id]);

    // ── Variant helpers (operate on normalizedProduct directly) ─────────────

    // Initialize first variant label 1 value when product loads
    useEffect(() => {
        if (normalizedProduct && !selectedVariantLabel1) {
            if (normalizedProduct.label1Options.length > 0) {
                setSelectedVariantLabel1(normalizedProduct.label1Options[0]);
            }
        }
    }, [normalizedProduct?.id]);

    const dbVariants = normalizedProduct?.variants || [];

    // Helper to get the selected variant based on variant labels
    const getSelectedVariant = () => {
        if (dbVariants.length === 0) return null;
        if (dbVariants.length === 1) return dbVariants[0];

        const selectedLabel2Name =
            normalizedProduct?.label2Options[selectedVariantLabel2Index]?.name;

        const normalize = (val: any) => String(val ?? '').trim().toLowerCase();

        const matchedVariant = dbVariants.find((v: any) => {
            const l1 = normalize(v.option_1_value ?? v.size ?? v.variantLabel1Value);
            const l2 = normalize(v.option_2_value ?? v.color ?? v.variantLabel2Value);

            // Skip axis check only when the UI has no active selection for it.
            // Do NOT skip when a variant row is missing the value — that was
            // the bug: every variant matched regardless of what was clicked.
            const label1Match = !selectedVariantLabel1
                ? true
                : l1 === normalize(selectedVariantLabel1);
            const label2Match = !selectedLabel2Name
                ? true
                : l2 === normalize(selectedLabel2Name);

            return label1Match && label2Match;
        });

        return matchedVariant || dbVariants[0];
    };

    const getCampaignAdjustedPrice = (unitPrice: number) => {
        return discountService.calculateLineDiscount(unitPrice, 1, activeCampaignDiscount).discountedUnitPrice;
    };

    // ── Quantity & Stock Clamping ──────────────────────────────────────────

    // Clamp quantity when selected variant changes or product loads
    useEffect(() => {
        const currentVariant = getSelectedVariant();
        const maxStock = currentVariant?.stock ?? normalizedProduct?.stock ?? 0;

        if (maxStock === 0) {
            setQuantity(0);
        } else if (quantity > maxStock) {
            setQuantity(maxStock);
        } else if (quantity === 0 && maxStock > 0) {
            setQuantity(1);
        }

        // --- NEW: Switch main image if variant has one ---
        if (currentVariant?.thumbnail_url || currentVariant?.image) {
            const variantImg = currentVariant.thumbnail_url || currentVariant.image;
            const imgIndex = productData.images.findIndex(img => img === variantImg);
            if (imgIndex !== -1) {
                setSelectedImage(imgIndex);
            }
        }
    }, [selectedVariantLabel1, selectedVariantLabel2Index, normalizedProduct?.id]);

    // productData is now just an alias for normalizedProduct – no more
    // hardcoded enhancedProductData fallback. Every downstream reference to
    // `productData.X` still works because the keys match NormalizedProductDetail.
    const productData = normalizedProduct!;

    const productReviews =
        reviewsData[normalizedProduct?.id || "1"] || reviewsData["1"];

    const [reviews, setReviews] = useState<EnhancedReview[]>(() =>
        productReviews.map((review) => ({
            ...review,
            isLiked: false,
            replies: [],
        })),
    );

    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [replyText, setReplyText] = useState("");
    const [reviewFilter, setReviewFilter] = useState("all");

    const handleQuantityInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value) || 0;
        const currentVariant = getSelectedVariant();
        const maxStock = currentVariant?.stock ?? normalizedProduct?.stock ?? 0;

        if (val > maxStock) {
            if (maxStock > 0) {
                toast({
                    title: "Limited Stock",
                    description: `Only ${maxStock} items available for this selection.`,
                    variant: "destructive",
                });
            }
            setQuantity(maxStock);
        } else {
            setQuantity(val);
        }
    };

    const handleQuantityBlur = () => {
        const currentVariant = getSelectedVariant();
        const maxStock = currentVariant?.stock ?? normalizedProduct?.stock ?? 0;
        if (quantity < 1 && maxStock > 0) {
            setQuantity(1);
        }
    };

    // Set chat target for floating bubble when viewing product
    useEffect(() => {
        if (normalizedProduct && currentSeller) {
            useChatStore.getState().openChat({
                sellerId: normalizedProduct.sellerId || "seller-001",
                sellerName:
                    normalizedProduct.seller ||
                    currentSeller.name ||
                    "Official Store",
                sellerAvatar: currentSeller.avatar,
                productId: normalizedProduct.id,
                productName: normalizedProduct.name,
                productImage:
                    normalizedProduct.images?.[0] || normalizedProduct.image,
            });
            // Start in mini mode (just the bubble)
            useChatStore.getState().setMiniMode(true);
        }

        // Cleanup - clear chat target when leaving page
        return () => {
            useChatStore.getState().closeChat();
            useChatStore.getState().clearChatTarget();
        };
    }, [normalizedProduct?.id]);

    if (!normalizedProduct) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                        Product not found
                    </h2>
                    <p className="text-gray-600 mb-4">
                        The product you're looking for doesn't exist.
                    </p>
                    <button
                        onClick={() => navigate('/shop')}
                        className="flex items-center gap-2 text-gray-600 hover:text-[#ff6a00] transition-colors mb-4 group"
                    >
                        <div className="p-1.5">
                            <ChevronLeft className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-sm">
                            Back to Shop
                        </span>
                    </button>
                </div>
            </div>
        );
    }

    useEffect(() => {
        if (showSizeGuide && normalizedProduct?.sizeGuideImage) {
            setIsSizeGuideImageLoading(true);
        }
    }, [showSizeGuide, normalizedProduct?.sizeGuideImage]);

    const handleAddToCart = () => {
        // Check if user is logged in
        if (!profile) {
            toast({
                title: "Please Login",
                description:
                    "You need to be logged in to add items to your cart.",
                variant: "destructive",
            });
            navigate("/login");
            return;
        }

        if (!normalizedProduct) return;

        // Stock validation - prevent adding out of stock items
        const currentVariant = getSelectedVariant();
        const stockQty = currentVariant?.stock ?? normalizedProduct?.stock ?? 0;

        if (stockQty === 0) {
            toast({
                title: "Out of Stock",
                description: "This product is currently unavailable.",
                variant: "destructive",
            });
            return;
        }

        const productImage = normalizedProduct.image;
        const productImages = normalizedProduct.images;

        // Use DB variant if available, otherwise create virtual variant
        const dbVariant = getSelectedVariant();
        const label2Name =
            normalizedProduct.label2Options[selectedVariantLabel2Index]?.name ||
            dbVariant?.color ||
            "Default";
        const variantName =
            dbVariant?.variant_name ||
            [
                selectedVariantLabel1 ? `${selectedVariantLabel1}` : null,
                label2Name !== "Default" ? `${label2Name}` : null,
            ]
                .filter(Boolean)
                .join(", ") ||
            "Standard";

        const hasVariations =
            dbVariant ||
            selectedVariantLabel1 ||
            label2Name !== "Default" ||
            normalizedProduct.label1Options.length > 0 ||
            normalizedProduct.label2Options.length > 0;

        const selectedVariant = hasVariations
            ? {
                id:
                    dbVariant?.id ||
                    `var-${normalizedProduct.id}-${selectedVariantLabel1 || "default"}-${label2Name}`,
                name: variantName,
                size: dbVariant?.size || selectedVariantLabel1 || undefined,
                color:
                    dbVariant?.color ||
                    (label2Name !== "Default" ? label2Name : undefined),
                price: dbVariant?.price || normalizedProduct.price,
                stock: dbVariant?.stock ?? normalizedProduct.stock ?? 100,
                image:
                    dbVariant?.thumbnail_url ||
                    normalizedProduct.label2Options[
                        selectedVariantLabel2Index
                    ]?.image ||
                    productImage,
            }
            : undefined;

        // Use variant price if available
        const baseUnitPrice =
            selectedVariant?.price || normalizedProduct.price;
        const effectivePrice = getCampaignAdjustedPrice(baseUnitPrice);

        // Create proper product object for buyerStore
        const productForCart = {
            id: normalizedProduct.id,
            name: normalizedProduct.name,
            price: effectivePrice,
            originalPrice: normalizedProduct.originalPrice,
            image: productImage,
            images: productImages,
            seller: {
                id: normalizedProduct.sellerId,
                name: normalizedProduct.seller,
                avatar: normalizedProduct.sellerAvatar,
                rating: normalizedProduct.sellerRating || 4.8,
                totalReviews: normalizedProduct.reviewCount,
                followers: 0,
                isVerified: normalizedProduct.isVerified,
                description: "Trusted seller on BazaarPH",
                location: normalizedProduct.location,
                established: "2024",
                products: [],
                badges: ["Verified"],
                responseTime: "< 1 hour",
                categories: [normalizedProduct.category],
            },
            sellerId: normalizedProduct.sellerId,
            rating: normalizedProduct.rating,
            totalReviews: normalizedProduct.reviewCount,
            category: normalizedProduct.category,
            sold: normalizedProduct.sold,
            isFreeShipping: normalizedProduct.isFreeShipping,
            location: normalizedProduct.location,
            description: normalizedProduct.description,
            specifications: {},
            variants: dbVariants,
        };

        try {
            addToCart(productForCart as any, quantity, selectedVariant);
        } catch (error) {
            console.error("Error calling addToCart:", error);
        }

        // Show cart modal
        setAddedProductInfo({
            name: normalizedProduct.name,
            image: productImage,
        });
        setShowCartModal(true);
    };

    // Helper to proceed to checkout
    const proceedToCheckout = (qty: number, variant?: any) => {
        if (!normalizedProduct) return;

        const productImage =
            normalizedProduct.images?.[0] || normalizedProduct.image;

        const productForQuickOrder = {
            id: normalizedProduct.id,
            name: normalizedProduct.name,
            price: getCampaignAdjustedPrice(variant?.price || normalizedProduct.price),
            originalPrice: normalizedProduct.originalPrice,
            image: variant?.image || productImage,
            images: normalizedProduct.images,
            seller: {
                id: normalizedProduct.sellerId,
                name: normalizedProduct.seller,
                avatar: normalizedProduct.sellerAvatar,
                rating: normalizedProduct.sellerRating || 4.8,
                totalReviews: normalizedProduct.reviewCount,
                followers: 0,
                isVerified: normalizedProduct.isVerified,
                description: "Trusted seller on BazaarPH",
                location: normalizedProduct.location,
                established: "2024",
                products: [],
                badges: ["Verified"],
                responseTime: "< 1 hour",
                categories: [normalizedProduct.category],
            },
            sellerId: normalizedProduct.sellerId,
            rating: normalizedProduct.rating,
            totalReviews: normalizedProduct.reviewCount,
            category: normalizedProduct.category,
            sold: normalizedProduct.sold,
            isFreeShipping: normalizedProduct.isFreeShipping,
            location: normalizedProduct.location,
            description: normalizedProduct.description,
            specifications: {},
            variants: dbVariants,
        };

        setQuickOrder(productForQuickOrder as any, qty, variant);
        navigate("/checkout");
    };

    const handleBuyNow = () => {
        // Check if user is logged in
        if (!profile) {
            toast({
                title: "Please Login",
                description: "You need to be logged in to buy items.",
                variant: "destructive",
            });
            navigate("/login");
            return;
        }

        if (!normalizedProduct) return;

        // Variant label 1 is required if label1Options array exists and none selected
        const needsVariantLabel1 =
            normalizedProduct.label1Options.length > 0 &&
            !selectedVariantLabel1;

        if (needsVariantLabel1) {
            setShowBuyNowModal(true);
            return;
        }

        // Construct the variant object (logic matched with handleAddToCart)
        const dbVariant = getSelectedVariant();
        const label2Name =
            normalizedProduct.label2Options?.[selectedVariantLabel2Index]
                ?.name ||
            dbVariant?.color ||
            "Default";
        const variantName =
            dbVariant?.variant_name ||
            [
                selectedVariantLabel1 ? `${selectedVariantLabel1}` : null,
                label2Name !== "Default" ? `${label2Name}` : null,
            ]
                .filter(Boolean)
                .join(", ") ||
            "Standard";

        const hasVariations =
            dbVariant ||
            selectedVariantLabel1 ||
            label2Name !== "Default" ||
            normalizedProduct.label1Options.length > 0 ||
            normalizedProduct.label2Options.length > 0;

        const variantToCheckout = hasVariations
            ? {
                id:
                    dbVariant?.id ||
                    `var-${normalizedProduct.id}-${selectedVariantLabel1 || "default"}-${label2Name}`,
                name: variantName,
                size: dbVariant?.size || selectedVariantLabel1 || undefined,
                color:
                    dbVariant?.color ||
                    (label2Name !== "Default" ? label2Name : undefined),
                price: dbVariant?.price || normalizedProduct.price,
                stock: dbVariant?.stock ?? normalizedProduct.stock ?? 100,
                image:
                    dbVariant?.thumbnail_url ||
                    normalizedProduct.label2Options?.[
                        selectedVariantLabel2Index
                    ]?.image ||
                    normalizedProduct.images?.[0] ||
                    normalizedProduct.image,
            }
            : undefined;

        proceedToCheckout(quantity, variantToCheckout);
    };

    return (
        <div className="min-h-screen bg-muted/30">
            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-6 -mt-6">
                <button
                    onClick={() => navigate('/shop')}
                    className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors mb-4 group"
                >
                    <div className="p-1.5 rounded-full hover:bg-[var(--brand-wash)] transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-sm">Back to Shop</span>
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
                    {/* Images Section (Left Side) */}
                    <div className="lg:col-span-7 flex flex-col-reverse lg:flex-row gap-4 lg:gap-6">
                        {/* Thumbnails (Vertical on Desktop, Horizontal on Mobile) */}
                        <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto lg:w-24 lg:max-h-[600px] scrollbar-hide py-1">
                            {productData.images.map(
                                (img: string, index: number) => (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedImage(index)}
                                        className={cn(
                                            "flex-shrink-0 w-20 h-20 lg:w-24 lg:h-24 rounded-2xl overflow-hidden border-2 transition-all duration-200 bg-white focus:outline-none",
                                            selectedImage === index
                                                ? "border-[var(--brand-primary)]"
                                                : "border-gray-100/50 hover:border-[var(--brand-wash-gold)]/60",
                                        )}
                                    >
                                        <img
                                            src={img}
                                            alt={`${productData.name} view ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ),
                            )}
                        </div>

                        {/* Main Image */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            key={selectedImage}
                            className="flex-1 bg-white rounded-[2rem] overflow-hidden aspect-[4/5] lg:aspect-auto relative group shadow-md"
                        >
                            <img
                                src={productData.images[selectedImage]}
                                alt={productData.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            {(() => {
                                const currentVariant = getSelectedVariant();
                                const basePrice = currentVariant?.price ?? productData.price;
                                const originalPrice = activeCampaignDiscount ? basePrice : (productData.originalPrice && productData.originalPrice > basePrice ? productData.originalPrice : basePrice);
                                const discountedPrice = getCampaignAdjustedPrice(basePrice);
                                if (originalPrice <= discountedPrice) return null;
                                const percentOff = activeCampaignDiscount?.discountType === 'percentage'
                                    ? Math.round(activeCampaignDiscount.discountValue)
                                    : Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
                                const discountTooltip =
                                    activeCampaignDiscount?.discountType === 'percentage' &&
                                        typeof activeCampaignDiscount.maxDiscountAmount === 'number'
                                        ? `Up to ₱${activeCampaignDiscount.maxDiscountAmount.toLocaleString()} off`
                                        : undefined;
                                return (
                                    <Badge title={discountTooltip} className="absolute top-4 left-4 bg-[var(--price-flash)] hover:bg-[var(--price-flash)]/90 text-white text-[14px] font-black px-2 py-1 rounded-bl-xl shadow-md z-10 border-0">
                                        {percentOff}% OFF
                                    </Badge>
                                );
                            })()}
                        </motion.div>
                    </div>

                    {/* Details Section (Right Side) */}
                    <div className="lg:col-span-5 flex flex-col pt-2">
                        {/* Store Profile - Compact Header */}
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border)]/60">
                            <div
                                className="flex items-center gap-4 group cursor-pointer"
                                onClick={() =>
                                    navigate(
                                        `/seller/${normalizedProduct?.sellerId || "seller-001"}`,
                                    )
                                }
                            >
                                {/* Avatar */}
                                <div className="w-14 h-14 rounded-full bg-white overflow-hidden border border-[var(--border)]/40 shrink-0 shadow-sm relative transition-transform duration-300 group-hover:scale-105">
                                    <img
                                        src={currentSeller.avatar}
                                        alt={currentSeller.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                {/* Info Container */}
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1.5">
                                        <h3 className="font-black text-[var(--text-headline)] text-lg leading-tight font-heading group-hover:text-[var(--brand-primary)] transition-colors">
                                            {normalizedProduct?.seller &&
                                                normalizedProduct.seller !==
                                                "Verified Seller"
                                                ? normalizedProduct.seller
                                                : currentSeller.name ||
                                                "Official Store"}
                                        </h3>
                                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] transition-colors" />
                                    </div>

                                    <div className="flex items-center gap-4 text-xs font-medium leading-none">
                                        <div className="flex items-center gap-1 text-[var(--text-muted)]">
                                            <MapPin className="w-3.5 h-3.5" />
                                            <span>{normalizedProduct?.location || "Metro Manila"}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[var(--brand-primary)]">
                                            <Star className="w-3.5 h-3.5 fill-current" />
                                            <span>{currentSeller.rating}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Follow & Chat Buttons */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const sid = normalizedProduct?.sellerId || "seller-001";
                                        isFollowing(sid) ? unfollowShop(sid) : followShop(sid);
                                    }}
                                    className={cn(
                                        "flex items-center gap-2 px-5 py-2 rounded-full text-sm font-black transition-all active:scale-95",
                                        isFollowing(normalizedProduct?.sellerId || "seller-001")
                                            ? "border border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90"
                                            : "border border-[var(--brand-primary)]/20 bg-[var(--brand-wash)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 hover:shadow-sm"
                                    )}
                                >
                                    <Heart className={cn("w-4 h-4", isFollowing(normalizedProduct?.sellerId || "seller-001") && "fill-current")} />
                                    {isFollowing(normalizedProduct?.sellerId || "seller-001") ? "Following" : "Follow"}
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        useChatStore.getState().openChat({
                                            sellerId:
                                                normalizedProduct?.sellerId ||
                                                "seller-001",
                                            sellerName:
                                                normalizedProduct?.seller ||
                                                "Official Store",
                                            sellerAvatar: currentSeller.avatar,
                                            productId: normalizedProduct?.id,
                                            productName: productData.name,
                                            productImage:
                                                productData.images?.[0] ||
                                                normalizedProduct?.image,
                                        });
                                        useChatStore
                                            .getState()
                                            .setMiniMode(false);
                                    }}
                                    className="flex items-center gap-2 px-5 py-2 rounded-full border border-[var(--brand-primary)]/20 bg-[var(--brand-wash)] text-[var(--brand-primary)] text-sm font-black transition-all hover:bg-[var(--brand-primary)]/10 hover:shadow-sm active:scale-95"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    Chat
                                </button>
                            </div>
                        </div>

                        <h1 className="text-3xl lg:text-4xl font-black text-[var(--text-headline)] mb-3 tracking-tight leading-tight font-heading">
                            {productData.name}
                        </h1>

                        {/* Price Section */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-4">
                                    {(() => {
                                        const currentVariant = getSelectedVariant();
                                        // Use the selected variant's raw price if available, else product default
                                        const basePrice = currentVariant?.price ?? productData.price;
                                        const discountedPrice = getCampaignAdjustedPrice(basePrice);
                                        const originalPrice = activeCampaignDiscount
                                            ? basePrice
                                            : (productData.originalPrice && productData.originalPrice > basePrice ? productData.originalPrice : basePrice);
                                        const hasDiscount = originalPrice > discountedPrice;

                                        return (
                                            <div className="flex items-center gap-4">
                                                <span className={cn(
                                                    "text-4xl font-black",
                                                    hasDiscount ? "text-[#DC2626]" : "text-[var(--brand-primary)]"
                                                )}>
                                                    ₱{discountedPrice.toLocaleString()}
                                                </span>

                                                {hasDiscount && (
                                                    <div className="flex flex-col">
                                                        <span className="text-base text-[var(--text-muted)] line-through font-bold">
                                                            ₱{originalPrice.toLocaleString()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    {/* Campaign Badge removed as requested */}
                                </div>
                            </div>
                        </div>

                        {/* Rating Section (Sold removed) */}
                        <div className="flex items-center gap-3 mb-6 mt-2 border-b border-[var(--border)]/30 pb-4">
                            <div className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 fill-[var(--brand-primary)] text-[var(--brand-primary)]" />
                                <span className="font-black text-[var(--text-headline)] text-sm">
                                    {productData.rating}
                                </span>
                            </div>
                            <span className="text-[var(--border)] font-light">|</span>
                            <span className="text-[var(--text-muted)] text-sm">Trusted Quality</span>

                            {productData.has_warranty && (
                                <>
                                    <span className="text-[var(--border)] font-light">|</span>
                                    <span className="flex items-center gap-1 text-[var(--text-muted)] text-sm">
                                        <Shield className="w-4 h-4 text-[var(--brand-primary)]" />
                                        1 Year Warranty
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Variant Label 2 Selection */}
                        {productData.label2Options &&
                            productData.label2Options.length > 0 &&
                            normalizedProduct?.variants &&
                            normalizedProduct.variants.length > 0 && (
                                <div className="mb-8">
                                    <p className="text-sm font-black text-[var(--text-headline)] mb-3">
                                        {normalizedProduct?.variantLabel2 ||
                                            "Variant Label"}{" "}
                                        <span className="text-[var(--text-accent)] font-medium normal-case">
                                            (
                                            {
                                                productData.label2Options[
                                                    selectedVariantLabel2Index
                                                ]?.name
                                            }
                                            )
                                        </span>
                                    </p>
                                    <div className="flex gap-3">
                                        {productData.label2Options.map(
                                            (option: any, index: number) => (
                                                <button
                                                    key={index}
                                                    onClick={() =>
                                                        setSelectedVariantLabel2Index(
                                                            index,
                                                        )
                                                    }
                                                    className={cn(
                                                        "group relative w-16 h-16 rounded-xl border transition-all overflow-hidden bg-white shadow-sm",
                                                        selectedVariantLabel2Index ===
                                                            index
                                                            ? "border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)] ring-offset-2"
                                                            : "border-[var(--border)]/40 hover:border-[var(--brand-primary)]/30",
                                                    )}
                                                    title={option.name}
                                                >
                                                    <img
                                                        src={
                                                            option.image ||
                                                            normalizedProduct?.image
                                                        }
                                                        alt={option.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    {selectedVariantLabel2Index ===
                                                        index && (
                                                            <div className="absolute inset-0 bg-[var(--brand-primary)]/10" />
                                                        )}
                                                </button>
                                            ),
                                        )}
                                    </div>
                                </div>
                            )}

                        {/* Variant Label 1 Selection */}
                        {productData.label1Options &&
                            productData.label1Options.length > 0 &&
                            normalizedProduct?.variants &&
                            normalizedProduct.variants.length > 0 && (
                                <div className="mb-8">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-sm font-black text-[var(--text-headline)]">
                                            {normalizedProduct?.variantLabel1 ||
                                                "Variant Label"}
                                        </p>
                                        {/* If variantLabel1 is "Size", show size guide */}
                                        {productData.variantLabel1 ===
                                            "Size" && (
                                                <button
                                                    onClick={() => setShowSizeGuide(true)}
                                                    className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-primary)] hover:underline flex items-center gap-1 font-bold">
                                                    <Ruler className="w-3 h-3" />{" "}
                                                    Size Guide
                                                </button>
                                            )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {productData.label1Options.map(
                                            (option: string) => (
                                                <button
                                                    key={option}
                                                    onClick={() =>
                                                        setSelectedVariantLabel1(
                                                            option,
                                                        )
                                                    }
                                                    className={cn(
                                                        "min-w-[3rem] w-auto px-4 h-9 flex items-center justify-center rounded-xl border text-xs transition-all font-medium shadow-sm",
                                                        selectedVariantLabel1 ===
                                                            option
                                                            ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                                                            : "border-[var(--border)]/40 bg-white text-[var(--text-headline)] hover:border-[var(--brand-primary)]",
                                                    )}
                                                >
                                                    {option}
                                                </button>
                                            ),
                                        )}
                                    </div>
                                </div>
                            )}

                        {/* Composition/Description Preview */}
                        <div className="mb-8">
                            <h3 className="text-sm font-black text-[var(--text-headline)] mb-2">
                                Details
                            </h3>
                            <p className="text-sm text-[var(--text-primary)] leading-relaxed line-clamp-3 font-medium">
                                {productData.description}
                            </p>
                        </div>

                        {/* Quantity and Stock */}
                        <div className="flex items-center gap-6 mb-8 -mt-4">
                            <div className="flex items-center border border-[var(--border)]/60 bg-white shadow-sm rounded-full p-1 w-32 justify-between">
                                <button
                                    onClick={() =>
                                        setQuantity(Math.max(1, quantity - 1))
                                    }
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--brand-wash)] text-[var(--text-primary)] transition-colors"
                                >
                                    <Minus className="w-3.5 h-3.5" />
                                </button>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={handleQuantityInput}
                                    onBlur={handleQuantityBlur}
                                    className="w-12 text-center font-black text-[var(--text-headline)] text-lg bg-transparent border-none focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <button
                                    onClick={() => {
                                        const currentVariant =
                                            getSelectedVariant();
                                        const maxStock =
                                            currentVariant?.stock ||
                                            normalizedProduct?.stock ||
                                            100;
                                        setQuantity(
                                            Math.min(maxStock, quantity + 1),
                                        );
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--brand-wash)] text-[var(--text-primary)] transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            {/* Stock Display */}
                            {(() => {
                                const currentVariant = getSelectedVariant();
                                const stockQty =
                                    currentVariant?.stock ??
                                    normalizedProduct?.stock ??
                                    0;
                                return (
                                    <div className="flex items-center gap-2">
                                        {stockQty > 0 ? (
                                            <>
                                                <span
                                                    className={cn(
                                                        "text-xs font-medium px-1 py-1",
                                                        stockQty <= 5
                                                            ? "text-[var(--price-flash)]"
                                                            : "text-[var(--color-success)]",
                                                    )}
                                                >
                                                    {stockQty <= 5
                                                        ? `Only ${stockQty} left!`
                                                        : `${stockQty} in stock`}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-xs font-medium text-red-500 px-1 py-1">
                                                Out of stock
                                            </span>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-row items-center gap-4 mb-10">
                            <button
                                disabled={(() => {
                                    const currentVariant = getSelectedVariant();
                                    const stockQty = currentVariant?.stock ?? normalizedProduct?.stock ?? 0;
                                    return stockQty === 0;
                                })()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isInRegistry) {
                                        // Remove from all registries it belongs to
                                        registries.forEach(reg => {
                                            if (reg.products?.some(p => p.id === (normalizedProduct as any).id)) {
                                                removeRegistryItem(reg.id, (normalizedProduct as any).id);
                                            }
                                        });
                                        toast({
                                            title: "Removed from Registry",
                                            description: "The item has been removed from your registries.",
                                        });
                                    } else {
                                        if (!registries || registries.length === 0) {
                                            setIsCreateRegistryModalOpen(true);
                                        } else {
                                            setShowRegistryModal(true);
                                        }
                                    }
                                }}
                                className="p-3 text-[var(--brand-primary)] transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none hover:scale-110 disabled:hover:scale-100"
                                title={isInRegistry ? "In Registry" : "Add to Registry"}
                            >
                                <Heart
                                    className={cn(
                                        "w-8 h-8 transition-colors duration-300",
                                        isInRegistry ? "fill-[var(--brand-primary)] text-[var(--brand-primary)]" : "text-[var(--brand-primary)]"
                                    )}
                                />
                            </button>

                            <Button
                                onClick={handleAddToCart}
                                disabled={(() => {
                                    const currentVariant = getSelectedVariant();
                                    const stockQty = currentVariant?.stock ?? normalizedProduct?.stock ?? 0;
                                    return stockQty === 0;
                                })()}
                                className="flex-1 h-14 rounded-2xl bg-white hover:bg-[var(--brand-wash)] text-[var(--brand-primary)] border border-[var(--brand-primary)] text-base font-bold transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ShoppingCart className="w-5 h-5" />
                                {(() => {
                                    const currentVariant = getSelectedVariant();
                                    const stockQty = currentVariant?.stock ?? normalizedProduct?.stock ?? 0;
                                    return stockQty > 0 ? "Add to Cart" : "Out of Stock";
                                })()}
                            </Button>

                            <Button
                                onClick={handleBuyNow}
                                disabled={(() => {
                                    const currentVariant = getSelectedVariant();
                                    const stockQty = currentVariant?.stock ?? normalizedProduct?.stock ?? 0;
                                    return stockQty === 0;
                                })()}
                                className="flex-1 h-14 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-base font-bold transition-all active:scale-[0.98] shadow-lg shadow-[var(--brand-primary)]/30 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {(() => {
                                    const currentVariant = getSelectedVariant();
                                    const stockQty = currentVariant?.stock ?? normalizedProduct?.stock ?? 0;
                                    return stockQty > 0 ? "Buy Now" : "Out of Stock";
                                })()}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Tabs / Reviews / Full Desc Section */}
                <div className="mt-6 pt-2">
                    {/* Tab Navigation - Sticky Container */}
                    <div className="sticky top-16 sm:top-18 z-50 py-4 mb-2 flex justify-center">
                        <nav className="inline-flex items-center bg-white p-1 rounded-full border border-gray-100 shadow-md">
                            {["Description", "Reviews", "Warranty"].map(
                                (tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            "px-6 sm:px-10 py-2.5 rounded-full text-sm transition-all duration-300 whitespace-nowrap",
                                            activeTab === tab
                                                ? "bg-[var(--brand-primary)] text-white shadow-lg shadow-[var(--brand-primary)]/30 scale-[1.02] font-bold"
                                                : "text-[var(--text-muted)] hover:text-[var(--brand-primary)] font-medium"
                                        )}
                                    >
                                        {tab}
                                    </button>
                                ),
                            )}
                        </nav>
                    </div>

                    <div className="max-w-4xl mx-auto px-4">
                        {activeTab === "Description" && (
                            <div className="prose prose-lg">
                                <h3 className="text-xl font-bold text-[var(--text-headline)] mb-6 -mt-2">
                                    Product Details
                                </h3>
                                <p className="text-[var(--text-primary)] leading-relaxed mb-8">
                                    {productData.description}
                                </p>

                            </div>
                        )}

                        {activeTab === "Reviews" && (
                            <Suspense fallback={<div className="py-8 text-center text-gray-400 text-sm">Loading reviews...</div>}>
                                <ProductReviews
                                    productId={normalizedProduct.id}
                                    rating={productData.rating}
                                    reviewCount={productData.reviewCount}
                                />
                            </Suspense>
                        )}

                        {activeTab === "Warranty" && (
                            <div className="max-w-3xl mx-auto py-0">
                                {isWarrantyLoading ? (
                                    <div className="bg-white rounded-3xl p-12 border border-[var(--border)]/40 shadow-sm text-center">
                                        <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-[var(--brand-primary)] animate-spin mx-auto mb-4" />
                                        <p className="text-[var(--text-muted)] font-medium">Loading warranty information...</p>
                                    </div>
                                ) : warrantyInfo?.hasWarranty ? (
                                    <div className="space-y-6">
                                        {/* Warranty Header Card */}
                                        <div className="bg-gradient-to-br from-[var(--brand-wash)]/60 to-white rounded-3xl p-8 border border-[var(--border)]/40 shadow-sm">
                                            <div className="flex items-start gap-4 mb-6">
                                                <div className="w-14 h-14 rounded-2xl bg-[var(--brand-primary)]/10 flex items-center justify-center shrink-0">
                                                    {(() => {
                                                        const WarrantyIcon = getWarrantyTypeIcon(warrantyInfo.warrantyType);
                                                        return <WarrantyIcon className="w-7 h-7 text-[var(--brand-primary)]" />;
                                                    })()}
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-xl font-black text-[var(--text-headline)] mb-1">
                                                        {getWarrantyTypeLabel(warrantyInfo.warrantyType)}
                                                    </h3>
                                                    <p className="text-sm text-[var(--text-muted)] font-medium">
                                                        {warrantyInfo.warrantyDurationMonths} months from delivery date
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Warranty Duration Badge */}
                                            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-[var(--border)]/30 inline-flex shadow-sm">
                                                <ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" />
                                                <span className="text-sm font-black text-[var(--text-headline)]">
                                                    {warrantyInfo.warrantyDurationMonths} Month Coverage
                                                </span>
                                            </div>
                                        </div>

                                        {/* Warranty Provider Info */}
                                        {(warrantyInfo.warrantyProviderName || warrantyInfo.warrantyProviderContact || warrantyInfo.warrantyProviderEmail) && (
                                            <div className="bg-white rounded-3xl p-8 border border-[var(--border)]/40 shadow-sm">
                                                <h4 className="text-lg font-black text-[var(--text-headline)] mb-4 flex items-center gap-2">
                                                    <StoreIcon className="w-5 h-5 text-[var(--brand-primary)]" />
                                                    Warranty Provider
                                                </h4>
                                                <div className="space-y-3">
                                                    {warrantyInfo.warrantyProviderName && (
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-[var(--brand-wash)] flex items-center justify-center shrink-0 mt-0.5">
                                                                <svg className="w-4 h-4 text-[var(--brand-primary)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                                                    <circle cx="12" cy="7" r="4" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wide">Provider Name</p>
                                                                <p className="text-sm font-medium text-[var(--text-primary)]">{warrantyInfo.warrantyProviderName}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {warrantyInfo.warrantyProviderContact && (
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-[var(--brand-wash)] flex items-center justify-center shrink-0 mt-0.5">
                                                                <svg className="w-4 h-4 text-[var(--brand-primary)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                                                    <path d="M14.05 2a9 9 0 0 1 8 7.94" />
                                                                    <path d="M14.05 6A5 5 0 0 1 18 9.91" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wide">Contact Number</p>
                                                                <p className="text-sm font-medium text-[var(--text-primary)]">{warrantyInfo.warrantyProviderContact}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {warrantyInfo.warrantyProviderEmail && (
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-[var(--brand-wash)] flex items-center justify-center shrink-0 mt-0.5">
                                                                <svg className="w-4 h-4 text-[var(--brand-primary)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <rect width="20" height="16" x="2" y="4" rx="2" />
                                                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wide">Email Address</p>
                                                                <p className="text-sm font-medium text-[var(--text-primary)]">{warrantyInfo.warrantyProviderEmail}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Warranty Terms Link */}
                                        {warrantyInfo.warrantyTermsUrl && (
                                            <div className="bg-white rounded-3xl p-8 border border-[var(--border)]/40 shadow-sm">
                                                <h4 className="text-lg font-black text-[var(--text-headline)] mb-4 flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-[var(--brand-primary)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                                        <polyline points="14 2 14 8 20 8" />
                                                        <line x1="16" x2="8" y1="13" y2="13" />
                                                        <line x1="16" x2="8" y1="17" y2="17" />
                                                        <line x1="10" x2="8" y1="9" y2="9" />
                                                    </svg>
                                                    Warranty Terms
                                                </h4>
                                                <a
                                                    href={warrantyInfo.warrantyTermsUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-4 rounded-xl bg-[var(--brand-wash)]/40 border border-[var(--brand-primary)]/20 hover:border-[var(--brand-primary)]/40 hover:bg-[var(--brand-wash)] transition-all group"
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-[var(--brand-primary)] flex items-center justify-center shrink-0">
                                                        <svg className="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                            <polyline points="15 3 21 3 21 9" />
                                                            <line x1="10" x2="21" y1="14" y2="3" />
                                                        </svg>
                                                    </div>
                                                    <span className="text-sm font-bold text-[var(--brand-primary)] group-hover:underline flex-1">
                                                        View Full Warranty Terms & Conditions
                                                    </span>
                                                </a>
                                            </div>
                                        )}

                                        {/* Warranty Policy Text */}
                                        {warrantyInfo.warrantyPolicy && (
                                            <div className="bg-white rounded-3xl p-8 border border-[var(--border)]/40 shadow-sm">
                                                <h4 className="text-lg font-black text-[var(--text-headline)] mb-4 flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-[var(--brand-primary)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                                                        <path d="m9 12 2 2 4-4" />
                                                    </svg>
                                                    Warranty Policy
                                                </h4>
                                                <div className="prose prose-sm max-w-none">
                                                    <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-line">
                                                        {warrantyInfo.warrantyPolicy}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-3xl p-12 border border-[var(--border)]/40 shadow-sm text-center">
                                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                            <Shield className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-black text-[var(--text-headline)] mb-2">No Warranty Information</h3>
                                        <p className="text-sm text-[var(--text-muted)] font-medium">
                                            This product does not have warranty coverage. Please contact the seller for more details.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <BazaarFooter />

            {/* Size Guide Modal */}
            {showSizeGuide && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-200 border border-[var(--border)]/40 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[var(--brand-wash)] flex items-center justify-center">
                                    <Ruler className="w-5 h-5 text-[var(--brand-primary)]" />
                                </div>
                                <h2 className="text-2xl font-black text-[var(--text-headline)] font-heading uppercase tracking-tight">Size Guide</h2>
                            </div>
                            <button
                                onClick={() => setShowSizeGuide(false)}
                                className="p-2 hover:bg-[var(--brand-wash)] rounded-full transition-colors text-[var(--text-muted)] hover:text-[var(--brand-primary)]"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Size Table */}
                        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]/40 mb-6">
                            {productData.sizeGuideImage ? (
                                <div className="relative min-h-[220px] flex items-center justify-center bg-white">
                                    {isSizeGuideImageLoading && (
                                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90">
                                            <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-[var(--brand-primary)] animate-spin" />
                                            <p className="mt-3 text-sm text-[var(--text-muted)] font-medium animate-pulse">
                                                Loading size guide...
                                            </p>
                                        </div>
                                    )}
                                    <img
                                        src={productData.sizeGuideImage}
                                        alt="Size Guide"
                                        className={cn(
                                            "max-w-full h-auto object-contain transition-opacity duration-300",
                                            isSizeGuideImageLoading ? "opacity-0" : "opacity-100",
                                        )}
                                        onLoad={() => setIsSizeGuideImageLoading(false)}
                                        onError={() => setIsSizeGuideImageLoading(false)}
                                    />
                                </div>
                            ) : (
                                <div className="py-20 text-center text-gray-400">
                                    <Ruler className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    <p>No size guide image available for this product.</p>
                                </div>
                            )}

                            {/* <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-[var(--brand-primary)] text-white">
                                        <th className="text-left px-5 py-3 font-black text-xs uppercase tracking-wider rounded-tl-2xl">Size</th>
                                        <th className="text-center px-5 py-3 font-black text-xs uppercase tracking-wider">Chest (cm)</th>
                                        <th className="text-center px-5 py-3 font-black text-xs uppercase tracking-wider">Waist (cm)</th>
                                        <th className="text-center px-5 py-3 font-black text-xs uppercase tracking-wider">Hips (cm)</th>
                                        <th className="text-center px-5 py-3 font-black text-xs uppercase tracking-wider rounded-tr-2xl">Height (cm)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]/30">
                                    {[
                                        { size: "XS", chest: "76–81", waist: "61–66", hips: "84–89", height: "155–160" },
                                        { size: "S", chest: "84–89", waist: "69–74", hips: "91–96", height: "160–165" },
                                        { size: "M", chest: "91–96", waist: "76–81", hips: "99–104", height: "165–170" },
                                        { size: "L", chest: "99–104", waist: "84–89", hips: "107–112", height: "170–175" },
                                        { size: "XL", chest: "107–112", waist: "91–96", hips: "114–119", height: "175–180" },
                                        { size: "XXL", chest: "114–119", waist: "99–104", hips: "122–127", height: "180–185" },
                                    ].map((row, i) => (
                                        <tr key={row.size} className={i % 2 === 0 ? "bg-white" : "bg-[var(--brand-wash)]/30"}>
                                            <td className="px-5 py-3 font-black text-[var(--brand-primary)]">{row.size}</td>
                                            <td className="px-5 py-3 text-center text-[var(--text-primary)] font-medium">{row.chest}</td>
                                            <td className="px-5 py-3 text-center text-[var(--text-primary)] font-medium">{row.waist}</td>
                                            <td className="px-5 py-3 text-center text-[var(--text-primary)] font-medium">{row.hips}</td>
                                            <td className="px-5 py-3 text-center text-[var(--text-primary)] font-medium">{row.height}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table> */}
                        </div>

                        <p className="text-xs text-[var(--text-muted)] mt-4 text-center">
                            Sizes may vary slightly by style. When in doubt, size up.
                        </p>
                    </div>
                </div>
            )}

            {/* Registry Selection Modal */}
            {showRegistryModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl scale-100 opacity-100 animate-in zoom-in-95 duration-200 border border-[var(--border)]/40">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-[var(--text-headline)] font-heading uppercase tracking-tight">Add to Registry</h2>
                            <button
                                onClick={() => setShowRegistryModal(false)}
                                className="p-2 hover:bg-[var(--brand-wash)] rounded-full transition-colors text-[var(--text-muted)] hover:text-[var(--brand-primary)]"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[var(--border)] scrollbar-track-transparent">
                            {registries.map((registry) => (
                                <button
                                    key={registry.id}
                                    onClick={() => {
                                        const productToAdd =
                                            mapNormalizedToBuyerProduct(
                                                normalizedProduct!,
                                                currentSeller,
                                            );

                                        addToRegistry(
                                            registry.id,
                                            productToAdd,
                                        );
                                        setShowRegistryModal(false);
                                        toast({
                                            title: "Added to Registry",
                                            description: `${productData.name} has been added to ${registry.title}.`,
                                        });
                                    }}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-[var(--border)]/40 hover:border-[var(--brand-primary)]/40 hover:bg-[var(--brand-wash)]/40 transition-all group text-left shadow-sm hover:shadow-md"
                                >
                                    <div className="w-14 h-14 rounded-xl bg-[var(--brand-wash)] overflow-hidden shrink-0 border border-[var(--border)]/20 shadow-inner">
                                        <img
                                            src={
                                                registry.imageUrl ||
                                                "/public/gradGift.jpeg"
                                            }
                                            alt={registry.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-black text-[var(--text-headline)] group-hover:text-[var(--brand-primary)] transition-colors text-base uppercase tracking-tight">
                                            {registry.title}
                                        </h3>
                                        <p className="text-xs text-[var(--text-muted)] font-bold mt-0.5">
                                            {registry.products?.length || 0}{" "}
                                            items • Shared {registry.sharedDate}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="mt-8 pt-6 border-t border-[var(--border)]/40">
                            <button
                                onClick={() => {
                                    setShowRegistryModal(false);
                                    setIsCreateRegistryModalOpen(true);
                                }}
                                className="w-full py-4 px-4 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--text-muted)] font-black uppercase tracking-tight hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-wash)] transition-all flex items-center justify-center gap-2 transform active:scale-[0.98]"
                            >
                                <Plus className="w-5 h-5" />
                                Create New Registry
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Create Registry Modal */}
            {isCreateRegistryModalOpen && (
                <Suspense fallback={null}>
                    <CreateRegistryModal
                        isOpen={isCreateRegistryModalOpen}
                        onClose={() => setIsCreateRegistryModalOpen(false)}
                        hideBrowseLink={true}
                        onCreate={({ name, category }) => {
                            const newRegistry = {
                                id: `reg-${Date.now()}`,
                                title: name,
                                sharedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                                imageUrl: "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=400&h=400&fit=crop",
                                category: category,
                                products: []
                            };
                            createRegistry(newRegistry);

                            // Close create modal and reopen registry selection modal
                            setIsCreateRegistryModalOpen(false);
                            setShowRegistryModal(true);

                            toast({
                                title: "Registry Created",
                                description: `${name} has been created successfully.`,
                            });
                        }}
                    />
                </Suspense>
            )}

            {/* Cart Modal */}
            {addedProductInfo && (
                <Suspense fallback={null}>
                    <CartModal
                        isOpen={showCartModal}
                        onClose={() => setShowCartModal(false)}
                        productName={addedProductInfo.name}
                        productImage={addedProductInfo.image}
                        cartItemCount={cartItems.length}
                    />
                </Suspense>
            )}

            {/* Buy Now Modal */}
            {normalizedProduct && (
                <Suspense fallback={null}>
                    <BuyNowModal
                        isOpen={showBuyNowModal}
                        onClose={() => setShowBuyNowModal(false)}
                        product={{
                            id: normalizedProduct.id,
                            name: productData.name,
                            price: getCampaignAdjustedPrice(productData.price),
                            originalPrice: activeCampaignDiscount ? productData.price : productData.originalPrice,
                            image:
                                productData.images?.[0] ||
                                normalizedProduct.image ||
                                "",
                            images: productData.images,
                            variantLabel2Values:
                                productData.label2Options?.map(
                                    (c: any) => c.name || c,
                                ) || [],
                            variantLabel1Values: productData.label1Options || [],
                            variants: productData.variants || [],
                            stock: normalizedProduct.stock || 100,
                        }}
                        onConfirm={(qty, variant) => {
                            proceedToCheckout(qty, variant);
                        }}
                    />
                </Suspense>
            )}
        </div>
    );
}
