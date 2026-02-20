/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { VariantSelectionModal } from "../ui/variant-selection-modal";
import { useBuyerStore } from "../../stores/buyerStore";
import { ShopProduct } from "../../types/shop";
import { discountService } from "@/services/discountService";

interface ShopVariantModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: ShopProduct | null;
    isBuyNow: boolean;
    onAddToCartSuccess: (productName: string, productImage: string) => void;
}

export default function ShopVariantModal({
    isOpen,
    onClose,
    product,
    isBuyNow,
    onAddToCartSuccess
}: ShopVariantModalProps) {
    const navigate = useNavigate();
    const addToCart = useBuyerStore((state) => state.addToCart);
    const setQuickOrder = useBuyerStore((state) => state.setQuickOrder);

    if (!product) return null;

    const applyCampaignPrice = (basePrice: number) => {
        if (!product.campaignDiscount) return basePrice;
        return discountService.calculateLineDiscount(basePrice, 1, {
            campaignId: "",
            campaignName: "",
            discountType: product.campaignDiscount.discountType,
            discountValue: product.campaignDiscount.discountValue,
            maxDiscountAmount: product.campaignDiscount.maxDiscountAmount,
            discountedPrice: basePrice,
            originalPrice: basePrice,
            endsAt: new Date(),
        }).discountedUnitPrice;
    };

    const modalProduct = useMemo(() => ({
        ...product,
        price: product.price,
        variants: (product.variants || []).map((variant: any) => ({
            ...variant,
            originalPrice: variant.price,
            price: applyCampaignPrice(variant.price),
        })),
    }), [product]);

    return (
        <VariantSelectionModal
            isOpen={isOpen}
            onClose={onClose}
            product={modalProduct as any}
            buttonText={isBuyNow ? "Proceed to Checkout" : "Add to Cart"}
            onConfirm={(variant, quantity) => {
                const sellerLocation = product.location || "Metro Manila";

                const productBase = {
                    id: product.id,
                    name: product.name,
                    price: variant?.price || product.price,
                    originalPrice: (variant as any)?.originalPrice || product.originalPrice,
                    image: variant?.image || product.image,
                    sellerId: product.sellerId,
                    rating: product.rating,
                    totalReviews: 100,
                    category: product.category,
                    sold: product.sold,
                    isFreeShipping: product.isFreeShipping ?? true,
                    location: sellerLocation,
                    description: product.description || "",
                    specifications: {},
                    variants: product.variants || [],
                };

                const seller = {
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
                };

                const normalizedVariant = variant
                    ? {
                        ...variant,
                        originalPrice: (variant as any).originalPrice ?? variant.price,
                    }
                    : variant;

                if (isBuyNow) {
                    const quickOrderItem: any = {
                        ...productBase,
                        images: product.images || [product.image],
                        image: variant?.image || product.image || (variant as any)?.thumbnail_url,
                        seller,
                        selectedVariant: normalizedVariant,
                    };

                    setQuickOrder(quickOrderItem, quantity, normalizedVariant);
                    onClose();
                    navigate("/checkout");
                } else {
                    const cartItem: any = {
                        ...productBase,
                        images: [product.image],
                        seller,
                        selectedVariant: normalizedVariant,
                    };

                    addToCart(cartItem, quantity, normalizedVariant);
                    onClose();

                    onAddToCartSuccess(
                        product.name,
                        variant?.image || product.image
                    );
                }
            }}
        />
    );
}
