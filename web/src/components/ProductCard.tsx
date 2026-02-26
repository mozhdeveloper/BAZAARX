import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, ShieldCheck, Flame, Star } from 'lucide-react';


interface ProductCardProps {
  product: any;
  index?: number;
  isFlash?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, index = 0, isFlash = false }) => {
  const navigate = useNavigate();
  const hasDiscount =
    product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount
    ? (typeof product.discountBadgePercent === 'number'
      ? product.discountBadgePercent
      : Math.round(
        ((product.originalPrice! - product.price) / product.originalPrice!) *
        100,
      ))
    : 0;

  const isPremiumOutlet = product.sellerTierLevel === 'premium_outlet' || product.isPremiumOutlet;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="product-card-premium product-card-premium-interactive shadow-golden h-full"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div className="relative aspect-square overflow-hidden bg-[#FFF6E5]">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
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


        {product.isVerified && !isFlash && (
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <ShieldCheck className="w-3 h-3 text-[var(--brand-accent)]" />
            <span className="text-[10px] font-bold text-[var(--brand-accent)] uppercase">Verified</span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col justify-between flex-1">
        <div>
          <h3 className="product-title-premium text-[15px] font-bold mb-1.5 line-clamp-2 text-[#1f2937]">
            {product.name}
          </h3>

          <div className="flex items-center mb-4">
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
              ({product.rating || 5.0})
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className={hasDiscount ? "text-[22px] font-black text-[#DC2626] leading-none" : "text-[22px] font-black text-[#D97706] leading-none"}>
              ₱{product.price.toLocaleString()}
            </span>
            {hasDiscount && (
              <span className="text-[14px] text-gray-400 line-through font-medium leading-none">
                ₱{product.originalPrice!.toLocaleString()}
              </span>
            )}
          </div>

          {hasDiscount && isFlash ? (
            <div className="mb-4">
              <div className="w-full h-[6px] bg-[#FEE2E2] rounded-full mb-1.5 border border-[#FCA5A5]/30 overflow-hidden">
                <div
                  className="h-full bg-[#DC2626] rounded-full"
                  style={{ width: `${Math.min(100, Math.max(5, (product.sold || 0) / ((product.sold || 0) + (product.stock || 1)) * 100))}%` }}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-[#DC2626] fill-[#DC2626]" />
                <span className="text-[11px] text-[#DC2626] font-bold uppercase tracking-widest flex items-center gap-1">
                  {(product.sold || 0).toLocaleString()} SOLD
                </span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-4">
              {(product.sold || 0).toLocaleString()} sold
            </div>
          )}
        </div>

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
      </div>
    </motion.div>
  );
};

export default ProductCard;
