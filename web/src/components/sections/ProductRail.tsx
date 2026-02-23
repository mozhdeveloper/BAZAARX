import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import ProductCard from '../ProductCard';

interface ProductRailProps {
  title: string;
  subtitle?: string;
  products: any[];
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
    <section className="py-20 bg-transparent overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid lg:grid-cols-12 gap-10 items-center">
          {/* Left Side: Product Cards */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                />
              ))}
            </div>
          </div>

          {/* Right Side: Descriptive Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-4"
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
              to="#"
              onClick={(e) => {
                e.preventDefault();
                onActionClick?.();
              }}
              className="group flex items-center gap-2 text-[var(--text-headline)] font-bold text-lg hover:text-[var(--brand-primary)] transition-colors"
            >
              <span className="underline underline-offset-8 decoration-2 decoration-[var(--brand-accent)]/30 group-hover:decoration-[var(--brand-primary)] transition-all">
                {actionLabel}
              </span>
              <svg
                width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className="group-hover:translate-x-1 transition-transform"
              >
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </Link>
          </motion.div>
        </div>

      </div>
    </section>
  );
};

export default ProductRail;