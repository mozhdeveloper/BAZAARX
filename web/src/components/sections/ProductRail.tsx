import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import ProductCard from '../ProductCard';

interface ProductRailProps {
  title: string;
  subtitle?: string;
  products: any[];
  actionLabel?: string;
  actionLink?: string;
  onActionClick?: () => void;
  isFlash?: boolean;
}

const ProductRail: React.FC<ProductRailProps> = ({
  title,
  subtitle,
  products,
  actionLabel = "View All",
  actionLink,
  onActionClick,
  isFlash
}) => {
  return (
    <section className="py-20 bg-transparent overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid lg:grid-cols-12 gap-10 items-center">
          {/* Left Side: Product Cards (Appears second on mobile) */}
          <div className="lg:col-span-8 order-2 lg:order-1">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  isFlash={isFlash}
                />
              ))}
            </div>
          </div>

          {/* Right Side: Descriptive Content (Appears first on mobile) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-4 order-1 lg:order-2 mb-8 lg:mb-0"
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl lg:text-5xl font-bold text-[var(--text-headline)] mb-6 tracking-tight">
                {title}
              </h2>
            </motion.div>
            {subtitle && (
              <p className="text-xl text-[var(--text-primary)] mb-8 leading-relaxed font-medium">
                {subtitle}
              </p>
            )}

            <Link
              to={actionLink || "#"}
              onClick={(e) => {
                if (!actionLink) {
                  e.preventDefault();
                  onActionClick?.();
                }
              }}
              className="mt-6 inline-flex items-center gap-2 px-8 py-4 bg-[#EA580C] text-white font-bold text-lg rounded-full hover:bg-orange-700 hover:-translate-y-1 transition-all shadow-lg shadow-orange-500/30"
            >
              <span>{actionLabel}</span>
              <svg
                width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className="group-hover:translate-x-1 transition-transform"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
          </motion.div>
        </div>

      </div>
    </section>
  );
};

export default ProductRail;