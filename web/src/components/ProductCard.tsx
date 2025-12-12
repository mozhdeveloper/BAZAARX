import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
      className="group bg-white rounded-xl hover:bg-gray-50 transition-all duration-300 overflow-hidden cursor-pointer"
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
          <div className="absolute bottom-3 right-3 bg-blue-500 text-white p-1 rounded-full">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-[var(--text-primary)] text-sm mb-2 line-clamp-2 group-hover:text-[var(--brand-primary)] transition-colors">
          {product.name}
        </h3>
        
        <div className="flex items-center mb-2">
          <div className="flex text-yellow-400 text-xs mr-1">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'}>★</span>
            ))}
          </div>
          <span className="text-xs text-[var(--text-secondary)] ml-1">({product.rating})</span>
          <span className="text-xs text-[var(--text-muted)] ml-2">{product.sold.toLocaleString()} sold</span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-[var(--brand-primary)]">
                ₱{product.price.toLocaleString()}
              </span>
              {hasDiscount && (
                <span className="text-sm text-[var(--text-muted)] line-through">
                  ₱{product.originalPrice!.toLocaleString()}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{product.location}</p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
          <p className="text-xs text-[var(--text-secondary)] truncate">{product.seller}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;