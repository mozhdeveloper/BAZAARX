import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, ShieldCheck } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  index?: number;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, index = 0 }) => {
  const navigate = useNavigate();
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="group bg-white rounded-xl hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer border border-gray-100"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {hasDiscount && (
          <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
            -{discountPercent}%
          </div>
        )}
        {product.isFreeShipping && (
          <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
            Free Ship
          </div>
        )}
        {product.isVerified && (
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">Verified</span>
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-medium text-[var(--text-primary)] text-sm mb-2 line-clamp-2 group-hover:text-[var(--brand-primary)] transition-colors leading-snug">
          {product.name}
        </h3>

        <div className="flex items-center mb-2">
          <div className="flex text-yellow-400 text-xs mr-1">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'}>★</span>
            ))}
          </div>
          <span className="text-xs text-[var(--text-secondary)] ml-1">({product.rating})</span>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-xl font-bold text-[var(--brand-primary)]">
            ₱{product.price.toLocaleString()}
          </span>
          {hasDiscount && (
            <span className="text-xs text-[var(--text-muted)] line-through">
              ₱{product.originalPrice!.toLocaleString()}
            </span>
          )}
        </div>

        <div className="text-xs text-[var(--text-muted)] mb-3">
          {product.sold.toLocaleString()} sold
        </div>

        <div className="pt-3 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-[var(--text-secondary)] truncate flex-1">
              {product.seller}
            </p>
            {product.sellerVerified && (
              <BadgeCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <div className="flex text-yellow-400" style={{ fontSize: '10px' }}>
              {[...Array(5)].map((_, i) => (
                <span key={i} className={i < Math.floor(product.sellerRating) ? 'text-yellow-400' : 'text-gray-300'}>★</span>
              ))}
            </div>
            <span className="text-xs text-[var(--text-secondary)]">({product.sellerRating})</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;