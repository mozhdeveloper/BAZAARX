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
import {
  RegistryPrivacy,
  RegistryDeliveryPreference,
} from "../stores/buyerStore";
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
  mapNormalizedToBuyerProduct,
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
    if (demoProduct) return mapBuyerProductToNormalized(demoProduct as any);
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

  // ── Quantity & Stock Clamping ──────────────────────────────────────────

  // Clamp quantity when selected variant changes or product loads
  useEffect(() => {
    const currentVariant = getSelectedVariant();
    const maxStock = currentVariant 
      ? (currentVariant.stock ?? 0) 
      : (normalizedProduct?.stock ?? 0);

    if (maxStock === 0) {
      setQuantity(0);
    } else if (quantity > maxStock) {
      setQuantity(maxStock);
    } else if (quantity === 0 && maxStock > 0) {
      setQuantity(1);
    }
  }, [
    selectedVariantLabel1,
    selectedVariantLabel2Index,
    normalizedProduct?.id,
  ]);

  // productData is now just an alias for normalizedProduct
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
    const maxStock = currentVariant 
      ? (currentVariant.stock ?? 0) 
      : (normalizedProduct?.stock ?? 0);

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
    const maxStock = currentVariant 
      ? (currentVariant.stock ?? 0) 
      : (normalizedProduct?.stock ?? 0);
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
          normalizedProduct.seller || currentSeller.name || "Official Store",
        sellerAvatar: currentSeller.avatar,
        productId: normalizedProduct.id,
        productName: normalizedProduct.name,
        productImage: normalizedProduct.images?.[0] || normalizedProduct.image,
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
      <div className="min-h-screen bg-[var(--brand-wash)]">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-[var(--text-headline)] mb-2">
            Product not found
          </h2>
          <p className="text-[var(--text-muted)] mb-4">
            The product you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors mb-4 group"
          >
            <div className="p-1.5">
              <ChevronLeft className="w-4 h-4" />
            </div>
            <span className="font-medium text-sm">Back to Shop</span>
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
        description: "You need to be logged in to add items to your cart.",
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
          stock: dbVariant ? (dbVariant.stock ?? 0) : (normalizedProduct.stock ?? 0),
          image:
            dbVariant?.thumbnail_url ||
            normalizedProduct.label2Options[selectedVariantLabel2Index]
              ?.image ||
            productImage,
        }
      : undefined;

    // Use variant price if available
    const effectivePrice = selectedVariant?.price || normalizedProduct.price;

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
      normalizedProduct.label1Options.length > 0 && !selectedVariantLabel1;

    if (needsVariantLabel1) {
      setShowBuyNowModal(true);
      return;
    }

    // Construct the variant object (logic matched with handleAddToCart)
    const dbVariant = getSelectedVariant();
    const label2Name =
      normalizedProduct.label2Options?.[selectedVariantLabel2Index]?.name ||
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
          stock: dbVariant ? (dbVariant.stock ?? 0) : (normalizedProduct.stock ?? 0),
          image:
            dbVariant?.thumbnail_url ||
            normalizedProduct.label2Options?.[selectedVariantLabel2Index]
              ?.image ||
            normalizedProduct.images?.[0] ||
            normalizedProduct.image,
        }
      : undefined;

    proceedToCheckout(quantity, variantToCheckout);
  };

  return (
    <div className="min-h-screen bg-[var(--brand-wash)]">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-0">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors mb-2 group"
        >
          <div className="p-1.5 rounded-full bg-white/50 group-hover:bg-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm">Back</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
          {/* Images Section (Left Side) */}
          <div className="lg:col-span-7 flex flex-col-reverse lg:flex-row gap-4 lg:gap-6">
            {/* Thumbnails */}
            <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto lg:w-24 lg:max-h-[600px] scrollbar-hide py-1">
              {productData.images.map((img: string, index: number) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={cn(
                    "flex-shrink-0 w-20 h-20 lg:w-24 lg:h-24 rounded-2xl overflow-hidden border-2 transition-all duration-200 focus:outline-none",
                    selectedImage === index
                      ? "border-[var(--brand-primary)]"
                      : "border-transparent hover:border-[var(--brand-wash-gold)]",
                  )}
                >
                  <img
                    src={img}
                    alt={`${productData.name} view ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>

            {/* Main Image */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              key={selectedImage}
              className="flex-1 bg-[var(--bg-secondary)] rounded-3xl overflow-hidden aspect-[4/5] lg:aspect-auto relative group shadow-md"
            >
              <img
                src={productData.images[selectedImage]}
                alt={productData.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {productData.originalPrice && (
                <Badge className="absolute top-4 left-4 bg-[var(--price-flash)] hover:bg-[var(--price-flash)] text-white text-xs px-2 py-1 shadow-md">
                  {Math.round(
                    ((productData.originalPrice - productData.price) /
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
              className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--brand-wash-gold)]/30 group cursor-pointer"
              onClick={() =>
                navigate(
                  `/seller/${normalizedProduct?.sellerId || "seller-001"}`,
                )
              }
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] overflow-hidden border border-[var(--brand-wash-gold)] shrink-0">
                  <img
                    src={currentSeller.avatar}
                    alt={currentSeller.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h3 className="font-bold text-[var(--text-headline)] text-base leading-tight group-hover:text-[var(--brand-primary)] transition-colors">
                      {normalizedProduct?.seller &&
                      normalizedProduct.seller !== "Verified Seller"
                        ? normalizedProduct.seller
                        : currentSeller.name || "Official Store"}
                    </h3>
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] transition-colors" />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-0.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{" "}
                      {normalizedProduct?.location || "Metro Manila"}
                    </span>
                    <div className="w-px h-3 bg-[var(--brand-wash-gold)]/50" />
                    <div className="flex items-center gap-1 text-[var(--brand-primary)] font-medium text-xs whitespace-nowrap">
                      <Star className="w-3 h-3 fill-current" />{" "}
                      {currentSeller.rating}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    useChatStore.getState().openChat({
                      sellerId: normalizedProduct?.sellerId || "seller-001",
                      sellerName: normalizedProduct?.seller || "Official Store",
                      sellerAvatar: currentSeller.avatar,
                      productId: normalizedProduct?.id,
                      productName: productData.name,
                      productImage:
                        productData.images?.[0] || normalizedProduct?.image,
                    });
                    useChatStore.getState().setMiniMode(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--brand-wash)] hover:bg-[var(--brand-wash-gold)]/30 text-[var(--brand-primary)] text-xs font-medium transition-all border border-[var(--brand-wash-gold)]"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Chat
                </button>
              </div>
            </div>

            <h1 className="text-3xl lg:text-4xl font-bold text-[var(--text-headline)] mb-2 tracking-tight leading-tight font-primary">
              {productData.name}
            </h1>

            {/* Price */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-baseline gap-2">
                {(() => {
                  const currentVariant = getSelectedVariant();
                  const displayPrice =
                    currentVariant?.price || productData.price;
                  return (
                    <span className="text-3xl font-bold text-[var(--brand-primary)]">
                      ₱{displayPrice.toLocaleString()}
                    </span>
                  );
                })()}
                {productData.originalPrice && (
                  <span className="text-lg text-[var(--text-muted)] line-through decoration-[var(--text-muted)]/50">
                    ₱{productData.originalPrice.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center gap-1 bg-[var(--brand-wash)] px-2.5 py-1 rounded-lg">
                <Star className="w-3.5 h-3.5 fill-[var(--brand-primary)] text-[var(--brand-primary)]" />
                <span className="font-medium text-sm text-[var(--brand-primary)]">
                  {productData.rating}
                </span>
              </div>
              <div className="h-4 w-px bg-[var(--brand-wash-gold)]" />
              <p className="text-[var(--text-muted)] text-sm">
                <span className="font-bold text-[var(--text-headline)]">
                  {productData.sold || 0}
                </span>{" "}
                products sold
              </p>
            </div>

            {/* Variant Label 2 Selection */}
            {productData.label2Options &&
              productData.label2Options.length > 0 && (
                <div className="mb-8">
                  <p className="text-sm font-semibold text-[var(--text-headline)] mb-3">
                    {normalizedProduct?.variantLabel2 || "Variant Label"}{" "}
                    <span className="text-[var(--text-muted)] font-normal">
                      (
                      {
                        productData.label2Options[selectedVariantLabel2Index]
                          ?.name
                      }
                      )
                    </span>
                  </p>
                  <div className="flex gap-3">
                    {productData.label2Options.map(
                      (option: any, index: number) => (
                        <button
                          key={index}
                          onClick={() => setSelectedVariantLabel2Index(index)}
                          className={cn(
                            "group relative w-16 h-16 rounded-xl border-2 transition-all overflow-hidden",
                            selectedVariantLabel2Index === index
                              ? "border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)] ring-offset-2"
                              : "border-gray-200 hover:border-[var(--brand-wash-gold)]",
                          )}
                          title={option.name}
                        >
                          <img
                            src={option.image || normalizedProduct?.image}
                            alt={option.name}
                            className="w-full h-full object-cover"
                          />
                          {selectedVariantLabel2Index === index && (
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
                    <p className="text-sm font-semibold text-[var(--text-headline)]">
                      {normalizedProduct?.variantLabel1 || "Variant Label"}
                    </p>
                    {productData.variantLabel1 === "Size" && (
                      <button className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-primary)] hover:underline flex items-center gap-1">
                        <Ruler className="w-3 h-3" /> Size Guide
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {productData.label1Options.map((option: string) => (
                      <button
                        key={option}
                        onClick={() => setSelectedVariantLabel1(option)}
                        className={cn(
                          "min-w-[3rem] w-auto px-4 h-9 flex items-center justify-center rounded-lg border text-xs font-medium transition-all",
                          selectedVariantLabel1 === option
                            ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-primary)]/20"
                            : "border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] bg-[var(--bg-secondary)]",
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            {/* Composition/Description Preview */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-[var(--text-headline)] mb-2">
                Details
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                {productData.description}
              </p>
            </div>

            {/* Quantity and Stock */}
            <div className="flex items-center gap-6 mb-8 -mt-4">
              <div className="flex items-center border border-[var(--border)] bg-[var(--bg-secondary)] rounded-full p-1.5 w-32 justify-between">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--brand-wash)] text-[var(--text-primary)] transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={handleQuantityInput}
                  onBlur={handleQuantityBlur}
                  className="w-12 text-center font-bold text-[var(--text-headline)] text-lg bg-transparent border-none focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={() => {
                    const currentVariant = getSelectedVariant();
                    const maxStock =
                      currentVariant?.stock ?? normalizedProduct?.stock ?? 0;
                    setQuantity(Math.min(maxStock, quantity + 1));
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--brand-wash)] text-[var(--text-primary)] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {/* Stock Display */}
              {(() => {
                const currentVariant = getSelectedVariant();
                const stockQty = currentVariant
                  ? (currentVariant.stock ?? 0)
                  : (normalizedProduct?.stock ?? 0);
                return (
                  <div className="flex items-center gap-2">
                    {stockQty > 0 ? (
                      <span
                        className={cn(
                          "text-sm font-medium",
                          stockQty <= 5
                            ? "text-[var(--text-accent)]"
                            : "text-[var(--color-success)]",
                        )}
                      >
                        {stockQty <= 5
                          ? `Only ${stockQty} left!`
                          : `${stockQty} in stock`}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-[var(--color-error)]">
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
                  if (!registries || registries.length === 0) {
                    setIsCreateRegistryModalOpen(true);
                  } else {
                    setShowRegistryModal(true);
                  }
                }}
                className="h-12 sm:h-14 w-12 sm:w-14 rounded-xl bg-transparent hover:bg-transparent text-[var(--brand-primary)] p-0 flex items-center justify-center font-bold transition-all hover:scale-110 active:scale-95 border-0 shadow-none"
                title="Add to Registry"
              >
                <Heart className="w-7 h-7" />
              </Button>
              <Button
                onClick={handleAddToCart}
                className="flex-1 h-12 sm:h-14 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--brand-wash)] text-[var(--brand-primary)] border border-[var(--brand-primary)] text-sm sm:text-base font-bold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart
              </Button>
              <Button
                onClick={handleBuyNow}
                disabled={(() => {
                  const currentVariant = getSelectedVariant();
                  const stockQty = currentVariant
                    ? (currentVariant.stock ?? 0)
                    : (normalizedProduct?.stock ?? 0);
                  return stockQty === 0;
                })()}
                className="flex-1 h-12 sm:h-14 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-sm sm:text-base font-bold shadow-lg shadow-[var(--brand-primary)]/20 hover:shadow-xl hover:shadow-[var(--brand-primary)]/30 transition-all active:scale-[0.98] border-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(() => {
                  const currentVariant = getSelectedVariant();
                  const stockQty = currentVariant
                    ? (currentVariant.stock ?? 0)
                    : (normalizedProduct?.stock ?? 0);
                  return stockQty > 0 ? "Buy Now" : "Out of Stock";
                })()}
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs / Reviews / Full Desc Section */}
        <div className="mt-4 border-t border-[var(--brand-wash-gold)]/30 -pt-2">
          {/* Tab Navigation */}
          <div className="flex justify-center sticky top-20 z-50 py-4 pointer-events-none">
            <nav className="inline-flex bg-[var(--bg-secondary)]/80 backdrop-blur-md p-1.5 rounded-full shadow-md pointer-events-auto">
              {["description", "reviews", "support"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-6 sm:px-8 py-2.5 rounded-full text-sm font-medium capitalize transition-all duration-300",
                    activeTab === tab
                      ? "bg-[var(--brand-primary)] text-white shadow-md"
                      : "text-[var(--text-muted)] hover:text-[var(--text-headline)] hover:bg-[var(--brand-wash)]",
                  )}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="max-w-4xl mx-auto">
            {activeTab === "description" && (
              <div className="prose prose-lg mx-auto text-[var(--text-secondary)]">
                <h3 className="text-2xl font-bold text-[var(--text-headline)] mb-6 font-primary">
                  Product Details
                </h3>
                <p className="leading-relaxed">{productData.description}</p>
              </div>
            )}

            {activeTab === "reviews" && (
              <ProductReviews
                productId={normalizedProduct.id}
                rating={productData.rating}
                reviewCount={productData.reviewCount}
                variants={productData.variants}
                currentVariantId={getSelectedVariant()?.id}
              />
            )}

            {activeTab === "support" && (
              <div className="max-w-2xl mx-auto py-0 text-center sm:text-left">
                <div className="bg-[var(--bg-secondary)] rounded-2xl p-8 border border-[var(--brand-wash-gold)]/30 shadow-sm">
                  <p className="text-[var(--text-primary)] leading-relaxed mb-6">
                    We offer a 7-day return policy for defective items. Please
                    contact our support team for assistance.
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-[var(--text-headline)] font-medium bg-white p-4 rounded-xl border border-[var(--border)] inline-flex">
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
          <div className="bg-[var(--bg-secondary)] rounded-3xl w-full max-w-md p-6 shadow-2xl scale-100 opacity-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[var(--text-headline)]">
                Add to Registry
              </h2>
              <button
                onClick={() => setShowRegistryModal(false)}
                className="p-2 hover:bg-[var(--brand-wash)] rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-muted)] hover:text-[var(--text-headline)]" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {registries.map((registry) => (
                <button
                  key={registry.id}
                  onClick={() => {
                    const selectedVariant = getSelectedVariant();

                    if (
                      !selectedVariant &&
                      (normalizedProduct?.variants || []).length > 0
                    ) {
                      toast({
                        title: "Select a variant",
                        description:
                          "Please choose a variant before adding to your registry.",
                        variant: "destructive",
                      });
                      return;
                    }

                    const productToAdd = mapNormalizedToBuyerProduct(
                      normalizedProduct!,
                      currentSeller,
                    ) as any;

                    const variantSnapshot = selectedVariant
                      ? {
                          id: selectedVariant.id,
                          name:
                            selectedVariant.name ||
                            selectedVariant.variant_name ||
                            "Variant",
                          price:
                            selectedVariant.price ??
                            selectedVariant.variant_price ??
                            productToAdd.price,
                          stock:
                            selectedVariant.stock ?? productToAdd.stock ?? 0,
                          image: selectedVariant.image || productToAdd.image,
                          attributes: {
                            ...(selectedVariant.option_1_value
                              ? { option1: selectedVariant.option_1_value }
                              : {}),
                            ...(selectedVariant.option_2_value
                              ? { option2: selectedVariant.option_2_value }
                              : {}),
                            ...(selectedVariant.variantLabel1Value
                              ? { label1: selectedVariant.variantLabel1Value }
                              : {}),
                            ...(selectedVariant.variantLabel2Value
                              ? { label2: selectedVariant.variantLabel2Value }
                              : {}),
                          },
                        }
                      : undefined;

                    const registryProduct = {
                      ...productToAdd,
                      requestedQty: Math.max(1, quantity),
                      selectedVariant: variantSnapshot,
                    };

                    addToRegistry(registry.id, registryProduct as any);
                    setShowRegistryModal(false);
                    toast({
                      title: "Added to Registry",
                      description: `${productData.name} has been added to ${registry.title}.`,
                    });
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-[var(--border)] hover:border-[var(--brand-primary)]/30 hover:bg-[var(--brand-wash)] transition-all group text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                    <img
                      src={registry.imageUrl || "/public/gradGift.jpeg"}
                      alt={registry.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-headline)] group-hover:text-[var(--brand-primary)] transition-colors">
                      {registry.title}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      {registry.products?.length || 0} items • Shared{" "}
                      {registry.sharedDate}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => {
                  setShowRegistryModal(false);
                  setIsCreateRegistryModalOpen(true);
                }}
                className="w-full py-3 px-4 rounded-xl border border-dashed border-[var(--text-muted)] text-[var(--text-primary)] font-medium hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-wash)] transition-all flex items-center justify-center gap-2"
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
        hideBrowseLink={true}
        onCreate={({ name, category, privacy, delivery }) => {
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
            privacy,
            delivery,
          };
          createRegistry(newRegistry);
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
            image: productData.images?.[0] || normalizedProduct.image || "",
            images: productData.images,
            variantLabel2Values:
              productData.label2Options?.map((c: any) => c.name || c) || [],
            variantLabel1Values: productData.label1Options || [],
            variants: productData.variants || [],
            stock: normalizedProduct.stock ?? 0,
          }}
          onConfirm={(qty, variant) => {
            proceedToCheckout(qty, variant);
          }}
        />
      )}
    </div>
  );
}
