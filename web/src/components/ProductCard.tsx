import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, ShieldCheck, Flame, Star, Heart, Palmtree } from 'lucide-react';
import { useWishlist } from '../hooks/useWishlist';

export interface ProductCardProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating?: number;
  sold?: number;
  stock?: number;
  isVerified?: boolean;
  seller?: string;
  sellerVerified?: boolean;
  discountBadgePercent?: number;
  discountBadgeTooltip?: string;
  sellerTierLevel?: string;
  isPremiumOutlet?: boolean;
  lifetimeSold?: number;
  campaignSold?: number;
  campaignStock?: number;
  reviewsCount?: number;
  isVacationMode?: boolean;
}

interface ProductCardProps {
  product: ProductCardProduct;
  index?: number;
  isFlash?: boolean;
  variant?: 'default' | 'hero';
}

const ProductCard: React.FC<ProductCardProps> = ({ product, index = 0, isFlash = false, variant = 'default' }) => {
  const navigate = useNavigate();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(product.id);
  const hasDiscount =
    (product.originalPrice && product.originalPrice > product.price) ||
    (typeof product.discountBadgePercent === 'number' && product.discountBadgePercent > 0);

  const discountPercent =
    typeof product.discountBadgePercent === 'number'
      ? product.discountBadgePercent
      : product.originalPrice && product.originalPrice > product.price
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : 0;

  const isPremiumOutlet = product.sellerTierLevel === 'premium_outlet' || product.isPremiumOutlet;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="product-card-premium product-card-premium-interactive shadow-golden h-full"
      onClick={() => navigate(`/product/${product.id}`, { state: { flashDiscount: (product as any).activeCampaignDiscount ?? null } })}
    >
      <div className="relative aspect-square overflow-hidden bg-[#FFF6E5]">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=No+Image';
          }}
        />
        {/* Discount Badge */}
        {hasDiscount && (
          <div
            title={product.discountBadgeTooltip}
            className="absolute top-3 left-3 bg-[#DC2626] text-white px-2 py-[2px] rounded text-[11px] font-black uppercase tracking-wider z-10 shadow-sm"
          >
            {discountPercent}% OFF
          </div>
        )}

        {/* Wishlist Heart */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleWishlist(product.id); }}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm transition-all"
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={`w-4 h-4 transition-colors ${wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-400'}`} />
        </button>


        {product.isVerified && !isFlash && (
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <ShieldCheck className="w-3 h-3 text-[var(--brand-accent)]" />
            <span className="text-[10px] font-bold text-[var(--brand-accent)] uppercase">Verified</span>
          </div>
        )}

        {product.isVacationMode && (
          <div className="absolute top-3 left-3 bg-orange-500 text-white px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 shadow-sm">
            <Palmtree className="w-3 h-3" />
            On Vacation
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col justify-between flex-1">
        <div>
          <h3 className="product-title-premium text-[15px] font-bold mb-1.5 line-clamp-2 text-[#1f2937] h-[40px] leading-tight">
            {product.name}
          </h3>

          <div className="flex items-center mb-3 h-[20px]">
            <div className="flex text-[#F59E0B] text-[11px] mr-1.5">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={
                    i < Math.floor(product.rating || 5)
                      ? "fill-current"
                      : "text-gray-300"
                  }
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-[12px] text-gray-500 font-medium">
              {product.rating || 5.0} ({product.reviewsCount || 0})
            </span>
          </div>

          <div className="flex items-end justify-between mb-3 min-h-[48px]">
            <div className="flex flex-col justify-end">
              {hasDiscount && (
                <span className="text-[11px] sm:text-[13px] text-gray-400 line-through font-medium leading-none mb-[3px]">
                  ₱{product.originalPrice!.toLocaleString()}
                </span>
              )}
              <span className={hasDiscount ? "text-lg sm:text-[20px] lg:text-[22px] font-black text-[#DC2626] leading-none" : "text-lg sm:text-[20px] lg:text-[22px] font-black text-[#D97706] leading-none"}>
                ₱{product.price.toLocaleString()}
              </span>
            </div>

            {variant === 'hero' && !isFlash && (
              <div className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-1">
                {((product.lifetimeSold !== undefined ? product.lifetimeSold : product.sold) || 0).toLocaleString()} sold
              </div>
            )}
          </div>

          <div>
            {hasDiscount && isFlash ? (
              <div>
                <div className="w-full h-[6px] bg-[#FEE2E2] rounded-full mb-1.5 border border-[#FCA5A5]/30 overflow-hidden">
                  <div
                    className="h-full bg-[#DC2626] rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(5,
                        (product.campaignSold || product.sold || 0) /
                        ((product.campaignSold || product.sold || 0) + (product.campaignStock || product.stock || 1)) * 100
                      ))}%`
                    }}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-[#DC2626] fill-[#DC2626]" />
                  <span className="text-[11px] text-[#DC2626] font-bold uppercase tracking-widest flex items-center gap-1">
                    {(product.campaignSold || product.sold || 0).toLocaleString()} SOLD
                  </span>
                </div>
              </div>
            ) : variant !== 'hero' ? (
              <div className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-2">
                {((product.lifetimeSold !== undefined ? product.lifetimeSold : product.sold) || 0).toLocaleString()} sold
              </div>
            ) : null}
          </div>
        </div>

        {!isFlash && (
          <div className="pt-4 border-t border-[var(--brand-accent-light)]/50">
            <div className="flex items-center gap-2">
              <p className="text-xs text-[var(--text-primary)] font-semibold truncate flex-1">
                {product.seller || "BazaarX Store"}
              </p>
              {isPremiumOutlet && (
                <div className="flex items-center gap-0.5 bg-purple-100 px-1.5 py-0.5 rounded-full">
                  <Star className="w-3 h-3 text-purple-600 fill-purple-600" />
                  <span className="text-[9px] font-bold text-purple-700 uppercase">Premium</span>
                </div>
              )}
              {product.sellerVerified && (
                <BadgeCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default React.memo(ProductCard);
