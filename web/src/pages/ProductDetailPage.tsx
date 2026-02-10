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
    Ruler,
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
import { ProductWithSeller } from "../types/database.types";
import { ProductReviews } from "@/components/reviews/ProductReviews";
import { CreateRegistryModal } from "../components/CreateRegistryModal";
import { CartModal } from "../components/ui/cart-modal";
import { BuyNowModal } from "../components/ui/buy-now-modal";
import {
    mapDbProductToNormalizedLegacy,
    mapSellerProductToNormalized,
    mapBuyerProductToNormalized,
    buildCurrentSeller,
    type NormalizedProductDetail,
} from "../utils/productMapper";
import {
    enhancedProductData,
    reviewsData,
} from "../data/dummy/productDetailData";

interface ProductDetailPageProps {}

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

export default function ProductDetailPage({}: ProductDetailPageProps) {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {
        addToCart,
        setQuickOrder,
        profile,
        registries,
        addToRegistry,
        cartItems,
    } = useBuyerStore();
    const { products: sellerProducts } = useProductStore();

    const [showRegistryModal, setShowRegistryModal] = useState(false);
    const [isCreateRegistryModalOpen, setIsCreateRegistryModalOpen] =
        useState(false);
    const { createRegistry } = useBuyerStore();

    const [quantity, setQuantity] = useState(1);
    const [selectedImage, setSelectedImage] = useState(0);
    const [selectedVariantLabel2Index, setSelectedVariantLabel2Index] =
        useState(0);
    const [selectedVariantLabel1, setSelectedVariantLabel1] = useState("");
    const [activeTab, setActiveTab] = useState("description");
    const [dbProduct, setDbProduct] = useState<ProductWithSeller | null>(null);
    const [isLoading, setIsLoading] = useState(false);

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
        if (demoProduct) return mapBuyerProductToNormalized(demoProduct);
        return null;
    }, [dbProduct, storeProduct, demoProduct]);

    // 4. Derive currentSeller from normalizedProduct
    const currentSeller = useMemo(() => {
        if (!normalizedProduct) return demoSellers[0];
        return buildCurrentSeller(normalizedProduct, demoSellers);
    }, [normalizedProduct]);

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
        const effectivePrice =
            selectedVariant?.price || normalizedProduct.price;

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
            price: variant?.price || normalizedProduct.price,
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
        <div className="min-h-screen bg-gray-50">
            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-600 hover:text-[#ff6a00] transition-colors mb-4 group"
                >
                    <div className="p-1.5">
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
                                            "flex-shrink-0 w-20 h-20 lg:w-24 lg:h-24 rounded-2xl overflow-hidden border-2 transition-all duration-200",
                                            selectedImage === index
                                                ? "border-[#ff6a00] ring-2 ring-[#ff6a00]/20"
                                                : "border-transparent hover:border-gray-200",
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
                            className="flex-1 bg-gray-50 rounded-3xl overflow-hidden aspect-[4/5] lg:aspect-auto relative group"
                        >
                            <img
                                src={productData.images[selectedImage]}
                                alt={productData.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            {productData.originalPrice && (
                                <Badge className="absolute top-4 left-4 bg-red-500 hover:bg-red-500 text-white text-xs px-2 py-1">
                                    {Math.round(
                                        ((productData.originalPrice -
                                            productData.price) /
                                            productData.originalPrice) *
                                            100,
                                    )}
                                    % OFF
                                </Badge>
                            )}
                        </motion.div>
                    </div>

                    {/* Details Section (Right Side) */}
                    <div className="lg:col-span-5 flex flex-col pt-2">
                        {/* Store Profile - Compact Header */}
                        <div
                            className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100 group cursor-pointer"
                            onClick={() =>
                                navigate(
                                    `/seller/${normalizedProduct?.sellerId || "seller-001"}`,
                                )
                            }
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gray-50 overflow-hidden border border-gray-100 shrink-0">
                                    <img
                                        src={currentSeller.avatar}
                                        alt={currentSeller.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-base leading-tight">
                                        {normalizedProduct?.seller &&
                                        normalizedProduct.seller !==
                                            "Verified Seller"
                                            ? normalizedProduct.seller
                                            : currentSeller.name ||
                                              "Official Store"}
                                    </h3>
                                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />{" "}
                                            {normalizedProduct?.location ||
                                                "Metro Manila"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
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
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-medium transition-all border border-orange-200"
                                >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    Chat
                                </button>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-1 text-[#ff6a00] font-medium text-xs whitespace-nowrap">
                                        <Star className="w-3 h-3 fill-current" />{" "}
                                        {currentSeller.rating}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-gray-600 group-hover:text-[#ff6a00] transition-colors">
                                        <span>Visit Store</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <span className="text-gray-500 text-sm font-medium mb-1">
                            {productData.category}
                        </span>
                        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2 tracking-tight leading-tight">
                            {productData.name}
                        </h1>

                        {/* Price & Rating */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="flex items-baseline gap-2">
                                {(() => {
                                    const currentVariant = getSelectedVariant();
                                    const displayPrice =
                                        currentVariant?.price ||
                                        productData.price;
                                    return (
                                        <span className="text-3xl font-bold text-[#ff6a00]">
                                            ₱{displayPrice.toLocaleString()}
                                        </span>
                                    );
                                })()}
                                {productData.originalPrice && (
                                    <span className="text-lg text-gray-400 line-through decoration-gray-400/50">
                                        ₱
                                        {productData.originalPrice.toLocaleString()}
                                    </span>
                                )}
                            </div>
                            <div className="h-4 w-px bg-gray-300 mx-2" />
                            <div className="flex items-center gap-1.5">
                                <Star className="w-4 h-4 fill-[#ff6a00] text-[#ff6a00]" />
                                <span className="font-semibold">
                                    {productData.rating}
                                </span>
                            </div>
                        </div>

                        <p className="text-gray-500 text-sm mb-8">
                            <span className="font-bold text-gray-900">
                                {productData.sold || 0}
                            </span>{" "}
                            products sold
                        </p>

                        {/* Variant Label 2 Selection */}
                        {productData.label2Options &&
                            productData.label2Options.length > 0 && (
                                <div className="mb-8">
                                    <p className="text-sm font-semibold text-gray-900 mb-3">
                                        {normalizedProduct?.variantLabel2 ||
                                            "Variant Label"}{" "}
                                        <span className="text-gray-500 font-normal">
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
                                                        "group relative w-16 h-16 rounded-xl border-2 transition-all overflow-hidden",
                                                        selectedVariantLabel2Index ===
                                                            index
                                                            ? "border-[#ff6a00] ring-1 ring-[#ff6a00] ring-offset-2"
                                                            : "border-gray-200 hover:border-gray-300",
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
                                                        <div className="absolute inset-0 bg-[#ff6a00]/10" />
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
                                        <p className="text-sm font-semibold text-gray-900">
                                            {normalizedProduct?.variantLabel1 ||
                                                "Variant Label"}
                                        </p>
                                        {/* If variantLabel1 is "Size", show size guide */}
                                        {productData.variantLabel1 ===
                                            "Size" && (
                                            <button className="text-xs text-gray-500 hover:text-[#ff6a00] hover:underline flex items-center gap-1">
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
                                                        "min-w-[3rem] w-auto px-3 h-8 flex items-center justify-center rounded-lg border-2 text-xs transition-all",
                                                        selectedVariantLabel1 ===
                                                            option
                                                            ? "border-[#ff6a00] bg-[#ff6a00] text-white"
                                                            : "border-gray-200 text-gray-900 hover:border-[#ff6a00]",
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
                            <h3 className="text-sm font-semibold text-gray-900 mb-2">
                                Details
                            </h3>
                            <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                                {productData.description}
                            </p>
                        </div>

                        {/* Quantity and Stock */}
                        <div className="flex items-center gap-6 mb-8 -mt-4">
                            <div className="flex items-center border-2 border-gray-200 rounded-full p-1.5 w-32 justify-between">
                                <button
                                    onClick={() =>
                                        setQuantity(Math.max(1, quantity - 1))
                                    }
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <span className="font-semibold text-gray-900 text-lg">
                                    {quantity}
                                </span>
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
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
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
                                                        "text-sm font-medium",
                                                        stockQty <= 5
                                                            ? "text-orange-500"
                                                            : "text-green-600",
                                                    )}
                                                >
                                                    {stockQty <= 5
                                                        ? `Only ${stockQty} left!`
                                                        : `${stockQty} in stock`}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-sm font-medium text-red-500">
                                                Out of stock
                                            </span>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 -mt-4 mb-8">
                            <Button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                        !registries ||
                                        registries.length === 0
                                    ) {
                                        navigate("/registry", {
                                            state: { openCreateModal: true },
                                        });
                                    } else {
                                        setShowRegistryModal(true);
                                    }
                                }}
                                className="h-12 sm:h-14 w-12 sm:w-14 rounded-full bg-orange-100/50 hover:bg-orange-100 text-[#ff6a00] border-2 border-[#ff6a00] p-0 flex items-center justify-center font-bold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                                title="Add to Registry"
                            >
                                <Gift className="w-6 h-6" />
                            </Button>
                            <Button
                                onClick={handleAddToCart}
                                className="flex-1 h-12 sm:h-14 rounded-full bg-white hover:bg-orange-50 text-[#ff6a00] border-2 border-[#ff6a00] text-sm sm:text-base font-bold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                            >
                                <ShoppingCart className="w-5 h-5 mr-2" />
                                Add to Cart
                            </Button>
                            <Button
                                onClick={handleBuyNow}
                                className="flex-1 h-12 sm:h-14 rounded-full bg-[#ff6a00] hover:bg-[#e65f00] text-white text-sm sm:text-base font-bold shadow-xl shadow-[#ff6a00]/20 hover:shadow-2xl hover:shadow-[#ff6a00]/30 transition-all active:scale-[0.98] border-0"
                            >
                                Buy Now
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Tabs / Reviews / Full Desc Section */}
                <div className="mt-4 border-t border-gray-100 pt-4">
                    {/* Tab Navigation */}
                    <div className="flex justify-center mb-4 sticky top-20 z-50 bg-gray-50/95 backdrop-blur-md py-4">
                        <nav className="inline-flex bg-gray-100/50 p-1 rounded-full">
                            {["description", "reviews", "support"].map(
                                (tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            "px-8 py-3 rounded-full text-sm font-medium capitalize transition-all duration-300",
                                            activeTab === tab
                                                ? "bg-white text-[#ff6a00] shadow-lg shadow-gray-200/50"
                                                : "text-gray-500 hover:text-gray-700",
                                        )}
                                    >
                                        {tab}
                                    </button>
                                ),
                            )}
                        </nav>
                    </div>

                    <div className="max-w-4xl mx-auto">
                        {activeTab === "description" && (
                            <div className="prose prose-lg mx-auto text-gray-600">
                                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                                    Product Details
                                </h3>
                                <p className="leading-relaxed">
                                    {productData.description}
                                </p>
                                <div className="grid grid-cols-2 gap-y-4 mt-8">
                                    {productData.features?.map(
                                        (feature: any, idx: number) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-3"
                                            >
                                                <div className="w-2 h-2 rounded-full bg-[#ff6a00]" />
                                                <span className="text-gray-700 font-medium">
                                                    {feature}
                                                </span>
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === "reviews" && (
                            <ProductReviews
                                productId={normalizedProduct.id}
                                rating={productData.rating}
                                reviewCount={productData.reviewCount}
                            />
                        )}

                        {activeTab === "support" && (
                            <div className="max-w-2xl mx-auto py-0 text-center sm:text-left">
                                <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                                    <p className="text-gray-600 leading-relaxed mb-6">
                                        We offer a 7-day return policy for
                                        defective items. Please contact our
                                        support team for assistance.
                                    </p>
                                    <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-900 font-medium bg-white p-4 rounded-xl border border-gray-100 inline-flex">
                                        <ShieldCheck className="w-5 h-5 text-[#ff6a00]" />
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
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl scale-100 opacity-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">
                                Add to Registry
                            </h2>
                            <button
                                onClick={() => setShowRegistryModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <Minus className="w-5 h-5 rotate-45" />
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                            {registries.map((registry) => (
                                <button
                                    key={registry.id}
                                    onClick={() => {
                                        // Create a simplified product object for the registry
                                        const productToAdd = {
                                            id:
                                                normalizedProduct?.id ||
                                                productData.id ||
                                                "temp-id",
                                            name: productData.name,
                                            price: productData.price,
                                            image: productData.images[0],
                                            // Add other necessary fields as needed by your Product type or make them optional
                                            description:
                                                productData.description || "",
                                            images: productData.images,
                                            seller: currentSeller,
                                            sellerId:
                                                normalizedProduct?.sellerId ||
                                                "unknown",
                                            rating: productData.rating,
                                            totalReviews:
                                                productData.reviewCount,
                                            category: "General",
                                            sold: 0,
                                            isFreeShipping: false,
                                            location: "Metro Manila",
                                            specifications: {},
                                            variants: [],
                                        } as any;

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
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/50 transition-all group text-left"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                                        <img
                                            src={
                                                registry.imageUrl ||
                                                "/public/gradGift.jpeg"
                                            }
                                            alt={registry.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                                            {registry.title}
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            {registry.products?.length || 0}{" "}
                                            items • Shared {registry.sharedDate}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => {
                                    setShowRegistryModal(false);
                                    setIsCreateRegistryModalOpen(true);
                                }}
                                className="w-full py-3 px-4 rounded-xl border border-dashed border-gray-300 text-gray-600 font-medium hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
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
                onCreate={(name, category) => {
                    const newRegistry = {
                        id: `reg-${Date.now()}`,
                        title: name,
                        sharedDate: new Date().toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                        }),
                        imageUrl:
                            "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=400&h=400&fit=crop",
                        category: category,
                        products: [],
                    };
                    createRegistry(newRegistry);
                    setIsCreateRegistryModalOpen(false);
                    // Re-open the add to registry modal to allow adding the product immediately
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
