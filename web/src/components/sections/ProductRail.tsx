import React from 'react';
import { motion } from 'framer-motion';
import { Product } from '../../types';
import ProductCard from '../ProductCard';

interface ProductRailProps {
  title: string;
  subtitle?: string;
  products: Product[];
  actionLabel?: string;
  onActionClick?: () => void;
}

const ProductRail: React.FC<ProductRailProps> = ({
  title,
  subtitle,
  products,
  actionLabel = "View All",
  onActionClick
}) => {
  return (
    <section className="py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)] mb-2">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[var(--text-secondary)]">{subtitle}</p>
            )}
          </div>
          
          <button 
            onClick={onActionClick}
            className="btn-ghost text-sm"
          >
            {actionLabel}
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 lg:gap-6">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
            />
          ))}
        </div>

      </div>
    </section>
  );
};

export default ProductRail;