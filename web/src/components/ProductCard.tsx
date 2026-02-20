import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, ShieldCheck } from 'lucide-react';


interface ProductCardProps {
  product: any;
  index?: number;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, index = 0 }) => {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="group bg-[#FFFBF0] rounded-[12px] shadow-golden hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border-none"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div className="relative aspect-square overflow-hidden bg-[#FFF6E5]">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {hasDiscount && (
          <div
            title={product.discountBadgeTooltip}
            className="absolute top-3 left-3 bg-[#DC2626] text-white px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider"
          >
            -{discountPercent}%
          </div>
        )}
        {product.isFreeShipping && (
          <div className="absolute top-3 right-3 bg-[var(--brand-accent)] text-white px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider">
            Free Ship
          </div>
        )}
        {product.isVerified && (
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <ShieldCheck className="w-3 h-3 text-[var(--brand-accent)]" />
            <span className="text-[10px] font-bold text-[var(--brand-accent)] uppercase">Verified</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-bold text-[var(--text-headline)] text-sm mb-2 line-clamp-2 transition-colors leading-tight min-h-[2.5rem]">
          {product.name}
        </h3>

        <div className="flex items-center mb-3">
          <div className="flex text-[var(--brand-accent)] text-[10px] mr-1">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className={
                  i < Math.floor(product.rating)
                    ? "fill-current"
                    : "text-gray-300"
                }
              >
                ★
              </span>
            ))}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] font-medium">
            ({product.rating})
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xl font-extrabold text-[var(--price-standard)]">
            ₱{product.price.toLocaleString()}
          </span>
          {hasDiscount && (
            <span className="text-xs text-[var(--text-muted)] line-through">
              ₱{product.originalPrice!.toLocaleString()}
            </span>
          )}
        </div>

        <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mb-4">
          {product.sold.toLocaleString()} sold
        </div>

        <div className="pt-4 border-t border-[var(--brand-accent-light)]/50">
          <div className="flex items-center gap-2">
            <p className="text-xs text-[var(--text-primary)] font-semibold truncate flex-1">
              {product.seller}
            </p>
            {product.sellerVerified && (
              <BadgeCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <div className="flex text-yellow-400" style={{ fontSize: "10px" }}>
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={
                    i < Math.floor(product.sellerRating)
                      ? "text-yellow-400"
                      : "text-gray-300"
                  }
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-xs text-[var(--text-secondary)]">
              ({product.sellerRating})
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
