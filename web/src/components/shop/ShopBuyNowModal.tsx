/* eslint-disable @typescript-eslint/no-explicit-any */
import { useNavigate } from "react-router-dom";
import { BuyNowModal } from "../ui/buy-now-modal";
import { useBuyerStore } from "../../stores/buyerStore";
import { ShopProduct } from "../../types/shop";

interface ShopBuyNowModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: ShopProduct | null;
}

export default function ShopBuyNowModal({ isOpen, onClose, product }: ShopBuyNowModalProps) {
    const navigate = useNavigate();
    const { setQuickOrder } = useBuyerStore();

    if (!product) return null;

    return (
        <BuyNowModal
            isOpen={isOpen}
            onClose={onClose}
            product={product}
            onConfirm={(quantity, variant) => {
                const sellerLocation = product.location || "Metro Manila";
                const quickOrderItem: any = {
                    id: product.id,
                    name: product.name,
                    price: variant?.price || product.price,
                    originalPrice: product.originalPrice,
                    image: variant?.image || product.image,
                    images: product.images || [product.image],
                    seller: {
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
                    },
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
                    selectedVariant: variant,
                };

                setQuickOrder(quickOrderItem, quantity, variant);
                onClose();
                navigate("/checkout");
            }}
        />
    );
}
