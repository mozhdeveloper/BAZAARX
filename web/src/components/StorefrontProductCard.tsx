import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface StorefrontProductCardProps {
    product: any;
    index: number;
    seller: any;
    profile: any;
    onAddToCart: (product: any) => void;
    onBuyNow: (product: any) => void;
    onVariantSelect: (product: any, isBuyNow: boolean) => void;
    onLoginRequired: () => void;
}

const StorefrontProductCard: React.FC<StorefrontProductCardProps> = ({
    product,
    index,
    seller,
    profile,
    onAddToCart,
    onBuyNow,
    onVariantSelect,
    onLoginRequired,
}) => {
    const navigate = useNavigate();

    const hasVariants = (product.variants && product.variants.length > 0) ||
        (product.variantLabel2Values && product.variantLabel2Values.length > 0) ||
        (product.variantLabel1Values && product.variantLabel1Values.length > 0);

    const handleCartClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!profile) {
            onLoginRequired();
            return;
        }

        if (product.isVacationMode || product.is_vacation_mode) {
            return;
        }

        if (hasVariants) {
            onVariantSelect(product, false);
            return;
        }

        onAddToCart(product);
    };

    const handleBuyNowClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!profile) {
            onLoginRequired();
            return;
        }

        if (product.isVacationMode || product.is_vacation_mode) {
            return;
        }

        if (hasVariants) {
            onVariantSelect(product, true);
        } else {
            onBuyNow(product);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer flex flex-col h-full"
            onClick={() => navigate(`/product/${product.id}`)}
        >
            <div className="relative aspect-square overflow-hidden">
                <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                {product.originalPrice && product.originalPrice > product.price && (
                    <div
                        title={product.discountBadgeTooltip}
                        className="absolute top-3 left-3 bg-[#DC2626] text-white px-2 py-[2px] rounded text-[11px] font-black uppercase tracking-wider z-10 shadow-sm"
                    >
                        {typeof product.discountBadgePercent === "number" && product.discountBadgePercent > 0
                            ? product.discountBadgePercent
                            : Math.round(
                                ((product.originalPrice - product.price) /
                                    product.originalPrice) *
                                100
                            )}% OFF
                    </div>
                )}
            </div>

            <div className="p-3 flex-1 flex flex-col">
                <div className="mb-auto">
                    <h3 className="text-[13px] font-bold text-[var(--text-headline)] line-clamp-2 mb-2 h-9 group-hover:text-[var(--brand-primary)] transition-colors">
                        {product.name}
                    </h3>

                    <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-[11px] font-bold text-gray-700">{product.rating.toFixed(1)}</span>
                            <span className="text-[11px] text-gray-400">({product.review_count || 0})</span>
                        </div>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-green-100 bg-green-50 text-green-600 text-[9px] font-bold">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Verified
                        </div>
                    </div>

                    <div className="flex items-baseline justify-between gap-1.5 mb-2">
                        <div className="flex items-baseline gap-1.5">
                            <span className={cn(
                                "text-lg font-black flex items-start gap-0.5",
                                product.originalPrice && product.originalPrice > product.price ? "text-[#DC2626]" : "text-[#D97706]"
                            )}>
                                <span className="text-xs mt-1">₱</span>
                                {product.price.toLocaleString()}
                            </span>
                            {product.originalPrice && product.originalPrice > product.price && (
                                <span className="text-[10px] text-gray-400 line-through">
                                    ₱{product.originalPrice.toLocaleString()}
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] font-medium">
                            {product.sold.toLocaleString()} sold
                        </span>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                            <MapPin className="h-2.5 w-2.5 text-gray-400" />
                            {seller.location}
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium">
                            {product.category}
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex gap-1.5">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-xl border-[var(--brand-primary)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/[0.05] hover:text-[var(--brand-primary)] transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleCartClick}
                        disabled={product.isVacationMode || product.is_vacation_mode}
                    >
                        <ShoppingCart className="h-4 w-4 text-[var(--brand-primary)]" />
                    </Button>
                    <Button
                        className={`flex-1 h-9 font-bold rounded-xl shadow-lg active:scale-95 transition-all text-[11px] ${
                            product.isVacationMode || product.is_vacation_mode
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                                : "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white shadow-[var(--brand-primary)]/20"
                        }`}
                        onClick={handleBuyNowClick}
                        disabled={product.isVacationMode || product.is_vacation_mode}
                    >
                        {product.isVacationMode || product.is_vacation_mode ? "Unavailable" : "Buy Now"}
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};

export default React.memo(StorefrontProductCard);
