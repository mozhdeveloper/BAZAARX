import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { categories } from '../data/collections';
import CategoryChip from './CategoryChip';

const CategoriesFooterStrip: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <section className="py-12 lg:py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-[var(--text-primary)] mb-4">
            Shop by Category
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Find exactly what you're looking for with our diverse range of product categories
          </p>
        </motion.div>

        <div className="flex flex-wrap gap-3 justify-center">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              viewport={{ once: true }}
            >
              <CategoryChip
                category={category}
                isActive={selectedCategory === category.id}
                onClick={() => setSelectedCategory(
                  selectedCategory === category.id ? null : category.id
                )}
              />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl lg:text-4xl font-bold text-[var(--brand-primary)] mb-2">
                24/7
              </div>
              <div className="text-[var(--text-secondary)]">Customer Support</div>
            </div>
            <div>
              <div className="text-3xl lg:text-4xl font-bold text-[var(--brand-primary)] mb-2">
                Fast
              </div>
              <div className="text-[var(--text-secondary)]">Nationwide Delivery</div>
            </div>
            <div>
              <div className="text-3xl lg:text-4xl font-bold text-[var(--brand-primary)] mb-2">
                100%
              </div>
              <div className="text-[var(--text-secondary)]">Secure Payments</div>
            </div>
            <div>
              <div className="text-3xl lg:text-4xl font-bold text-[var(--brand-primary)] mb-2">
                Free
              </div>
              <div className="text-[var(--text-secondary)]">Returns & Exchanges</div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default CategoriesFooterStrip;