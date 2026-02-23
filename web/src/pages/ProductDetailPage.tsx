/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from "react";
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
import { ProductWithSeller } from "../types/database.types";
import type { ActiveDiscount } from "@/types/discount";
import { ProductReviews } from "@/components/reviews/ProductReviews";
import { CreateRegistryModal } from "../components/CreateRegistryModal";
import { CartModal } from "../components/ui/cart-modal";
import { BuyNowModal } from "../components/ui/buy-now-modal";
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
    } = useBuyerStore();
    const { products: sellerProducts } = useProductStore();

    const [showRegistryModal, setShowRegistryModal] = useState(false);
    const [isCreateRegistryModalOpen, setIsCreateRegistryModalOpen] =
        useState(false);


    const [quantity, setQuantity] = useState(1);
    const [selectedImage, setSelectedImage] = useState(0);
    const [selectedVariantLabel2Index, setSelectedVariantLabel2Index] =
        useState(0);
    const [selectedVariantLabel1, setSelectedVariantLabel1] = useState("");
    const [activeTab, setActiveTab] = useState("Description");
    const [dbProduct, setDbProduct] = useState<ProductWithSeller | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeCampaignDiscount, setActiveCampaignDiscount] = useState<ActiveDiscount | null>(null);

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
            if (!normalizedProduct?.id) {
                if (isMounted) setActiveCampaignDiscount(null);
                return;
            }

            try {
                const discount = await discountService.getActiveProductDiscount(normalizedProduct.id);
                if (isMounted) {
                    setActiveCampaignDiscount(discount);
                }
            } catch (error) {
                console.error("Failed to fetch active campaign discount for product detail:", error);
                if (isMounted) {
                    setActiveCampaignDiscount(null);
                }
            }
        };

        loadActiveDiscount();
        return () => {
            isMounted = false;
        };
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

        const matchedVariant = dbVariants.find((v: any) => {
            const l1 = v.option_1_value ?? v.size ?? v.variantLabel1Value;
            const l2 = v.option_2_value ?? v.color ?? v.variantLabel2Value;
            const label1Match =
                !selectedVariantLabel1 || !l1 || l1 === selectedVariantLabel1;
            const label2Match =
                !selectedLabel2Name || !l2 || l2 === selectedLabel2Name;
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
        const maxStock = currentVariant?.stock || normalizedProduct?.stock || 0;

        if (maxStock === 0) {
            setQuantity(0);
        } else if (quantity > maxStock) {
            setQuantity(maxStock);
        } else if (quantity === 0 && maxStock > 0) {
            setQuantity(1);
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
        const maxStock = currentVariant?.stock || normalizedProduct?.stock || 0;

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
        const maxStock = currentVariant?.stock || normalizedProduct?.stock || 0;
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
                        onClick={() => navigate(-1)}
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
                stock: dbVariant?.stock || normalizedProduct.stock || 100,
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
                stock: dbVariant?.stock || normalizedProduct.stock || 100,
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
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors mb-4 group"
                >
                    <div className="p-1.5 rounded-full hover:bg-[var(--brand-wash)] transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-sm">Back</span>
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
                                const basePrice = productData.price;
                                const discountedPrice = getCampaignAdjustedPrice(basePrice);
                                const originalPrice = productData.originalPrice || basePrice;
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
                                    <Badge title={discountTooltip} className="absolute top-4 left-4 bg-[var(--price-flash)] hover:bg-[var(--price-flash)]/90 text-white text-[10px] font-black px-2 py-1 rounded-bl-xl shadow-md z-10 border-0">
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

                            {/* Chat Button */}
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
                                className="flex items-center gap-2 px-6 py-2 rounded-full border border-[var(--brand-primary)]/20 bg-[var(--brand-wash)] text-[var(--brand-primary)] text-sm font-black transition-all hover:bg-[var(--brand-primary)]/10 hover:shadow-sm active:scale-95"
                            >
                                <MessageCircle className="w-4 h-4" />
                                Chat
                            </button>
                        </div>

                        <h1 className="text-3xl lg:text-4xl font-black text-[var(--text-headline)] mb-3 tracking-tight leading-tight font-heading">
                            {productData.name}
                        </h1>

                        {/* Price Section */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex items-baseline gap-2">
                                {(() => {
                                    const currentVariant = getSelectedVariant();
                                    const displayPrice =
                                        currentVariant?.price ||
                                        productData.price;
                                    return (
                                        <span className="text-3xl font-black text-[var(--brand-primary)]">
                                            ₱{displayPrice.toLocaleString()}
                                        </span>
                                    );
                                })()}
                                {productData.originalPrice > (getSelectedVariant()?.price || productData.price) && (
                                    <span className="text-lg text-[var(--text-muted)] line-through decoration-[var(--text-muted)]/50 font-bold">
                                        ₱{productData.originalPrice.toLocaleString()}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Rating & Sold Section */}
                        <div className="flex items-center gap-3 mb-8 mt-2">
                            <div className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 fill-[var(--brand-primary)] text-[var(--brand-primary)]" />
                                <span className="font-black text-[var(--text-headline)] text-sm">
                                    {productData.rating}
                                </span>
                            </div>
                            <span className="text-[var(--border)] font-light">|</span>
                            <p className="text-[var(--text-muted)] text-sm">
                                <span className="text-[var(--brand-primary)] font-bold">
                                    {productData.sold || 0}
                                </span>{" "}
                                products sold
                            </p>
                        </div>

                        {/* Variant Label 2 Selection */}
                        {productData.label2Options &&
                            productData.label2Options.length > 0 && (
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
                            productData.label1Options.length > 0 && (
                                <div className="mb-8">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-sm font-black text-[var(--text-headline)]">
                                            {normalizedProduct?.variantLabel1 ||
                                                "Variant Label"}
                                        </p>
                                        {/* If variantLabel1 is "Size", show size guide */}
                                        {productData.variantLabel1 ===
                                            "Size" && (
                                                <button className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-primary)] hover:underline flex items-center gap-1 font-bold">
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
                                    currentVariant?.stock ||
                                    normalizedProduct?.stock ||
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
                                className="p-3 text-[var(--brand-primary)] hover:scale-110 transition-transform active:scale-95"
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
                                className="flex-1 h-14 rounded-2xl bg-white hover:bg-[var(--brand-wash)] text-[var(--brand-primary)] border border-[var(--brand-primary)] text-base font-bold transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
                            >
                                <ShoppingCart className="w-5 h-5" />
                                Add to Cart
                            </Button>

                            <Button
                                onClick={handleBuyNow}
                                disabled={(() => {
                                    const currentVariant = getSelectedVariant();
                                    const stockQty = currentVariant?.stock || normalizedProduct?.stock || 0;
                                    return stockQty === 0;
                                })()}
                                className="flex-1 h-14 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-base font-bold transition-all active:scale-[0.98] shadow-lg shadow-[var(--brand-primary)]/30 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {(() => {
                                    const currentVariant = getSelectedVariant();
                                    const stockQty = currentVariant?.stock || normalizedProduct?.stock || 0;
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
                            {["Description", "Reviews", "Support"].map(
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
                            <ProductReviews
                                productId={normalizedProduct.id}
                                rating={productData.rating}
                                reviewCount={productData.reviewCount}
                            />
                        )}

                        {activeTab === "Support" && (
                            <div className="max-w-2xl mx-auto py-0 text-center sm:text-left">
                                <div className="bg-[var(--brand-wash)]/40 rounded-3xl p-8 border border-[var(--border)]/50 shadow-sm">
                                    <p className="text-[var(--text-primary)] leading-relaxed mb-6 font-medium">
                                        We offer a 7-day return policy for
                                        defective items. Please contact our
                                        support team for assistance.
                                    </p>
                                    <div className="flex items-center justify-center sm:justify-start gap-3 text-[var(--text-headline)] font-black bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-[var(--border)]/40 inline-flex shadow-sm">
                                        <ShieldCheck className="w-5 h-5 text-[var(--brand-primary)]" />
                                        Warranty: 1 Year Manufacturer Warranty
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <BazaarFooter />
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

            {/* Cart Modal */}
            {addedProductInfo && (
                <CartModal
                    isOpen={showCartModal}
                    onClose={() => setShowCartModal(false)}
                    productName={addedProductInfo.name}
                    productImage={addedProductInfo.image}
                    cartItemCount={cartItems.length}
                />
            )}

            {/* Buy Now Modal */}
            {normalizedProduct && (
                <BuyNowModal
                    isOpen={showBuyNowModal}
                    onClose={() => setShowBuyNowModal(false)}
                    product={{
                        id: normalizedProduct.id,
                        name: productData.name,
                        price: productData.price,
                        originalPrice: productData.originalPrice,
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
            )}
        </div>
    );
}
