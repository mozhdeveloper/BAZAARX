/* eslint-disable @typescript-eslint/no-explicit-any */
import { useNavigate } from "react-router-dom";
import { VariantSelectionModal } from "../ui/variant-selection-modal";
import { useBuyerStore } from "../../stores/buyerStore";
import { ShopProduct } from "../../types/shop";

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
    const { addToCart, setQuickOrder } = useBuyerStore();

    if (!product) return null;

    return (
        <VariantSelectionModal
            isOpen={isOpen}
            onClose={onClose}
            product={product as any}
            buttonText={isBuyNow ? '🛒 Proceed to Checkout' : '🛒 Add to Cart'}
            onConfirm={(variant, quantity) => {
                const sellerLocation = product.location || "Metro Manila";

                // Common product fields
                const productBase = {
                    id: product.id,
                    name: product.name,
                    price: variant?.price || product.price,
                    originalPrice: product.originalPrice,
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

                if (isBuyNow) {
                    // Buy Now flow
                    const quickOrderItem: any = {
                        ...productBase,
                        images: product.images || [product.image],
                        image: variant?.image || product.image || (variant as any)?.thumbnail_url, // fallback
                        seller,
                        selectedVariant: variant,
                    };

                    setQuickOrder(quickOrderItem, quantity, variant);
                    onClose();
                    navigate("/checkout");
                } else {
                    // Add to Cart flow
                    const cartItem: any = {
                        ...productBase,
                        images: [product.image],
                        seller,
                        selectedVariant: variant,
                    };

                    addToCart(cartItem, quantity, variant);
                    onClose();

                    // Show cart confirmation modal via callback
                    onAddToCartSuccess(
                        product.name,
                        variant?.image || product.image
                    );
                }
            }}
        />
    );
}
