import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { categoryService } from '../services/categoryService'; // Adjust path as needed
import type { Category } from '@/types/database.types';

// Adding a local interface to handle the count if your DB returns it
interface CategoryWithCount extends Category {
  product_count?: number;
}

const CategoriesFooterStrip: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        // Using getActiveCategories for the public-facing footer
        const data = await categoryService.getActiveCategories();
        setCategories(data);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (isLoading || categories.length === 0) {
    return null; // Or a skeleton loader
  }

  return (
    <section className="py-18 lg:py-20 bg-transparent overflow-hidden pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true }}
          className="text-center mb-6 relative z-10"
        >
          <h2 className="text-5xl lg:text-5xl font-bold text-[var(--text-headline)] tracking-tight mb-6">
            Shop by <span className="text-[var(--brand-primary)]">Category</span>
          </h2>
          <p className="text-md text-[var(--text-secondary)] max-w-2xl mx-auto font-medium">
            Find exactly what you're looking for with our diverse range of product categories.
          </p>
        </motion.div>

        <div className="relative h-[400px] flex items-center justify-center">
          {categories.slice(0, 10).map((category, index) => {
            // Adjust math slightly based on actual returned length to keep it centered
            const centerOffset = (categories.slice(0, 10).length - 1) / 2;
            const zIndexValue = categories.length - index;
            const xOffset = (index - centerOffset) * 120;
            const rotation = (index - centerOffset) * 4;

            return (
              <motion.div
                key={category.id}
                onClick={() => navigate(`/shop?category=${encodeURIComponent(category.name)}`)}
                style={{ zIndex: zIndexValue }}
                initial={{ opacity: 0, y: 100, rotate: 0 }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  rotate: rotation,
                  x: xOffset,
                }}
                whileHover={{
                  y: -50,
                  scale: 1.15,
                  rotate: 0,
                  zIndex: 100,
                  transition: { duration: 0.3, ease: "easeOut" }
                }}
                transition={{
                  duration: 0.8,
                  delay: index * 0.05,
                  ease: [0.23, 1, 0.32, 1]
                }}
                viewport={{ once: true }}
                className="absolute w-56 h-72 bg-white rounded-[2rem] shadow-2xl overflow-hidden border-[6px] border-white cursor-pointer group"
              >
                <img
                  src={category.image_url || category.icon || '/placeholder-category.jpg'}
                  alt={category.name}
                  className="w-full h-full object-cover grayscale-[0.1] group-hover:grayscale-0 transition-all duration-500"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <p className="text-white font-bold text-xl mb-1">{category.name}</p>
                  {/* Showing count only if it exists in your DB schema */}
                  {category.product_count !== undefined && (
                    <p className="text-white/70 text-sm">{category.product_count} Items</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoriesFooterStrip;