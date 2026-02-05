import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { categories } from '../data/collections';

const CategoriesFooterStrip: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="py-18 lg:py-20 bg-white overflow-hidden pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true }}
          className="text-center mb-6 relative z-10"
        >
          <h2 className="text-5xl lg:text-5xl font-bold text-[var(--text-primary)] tracking-tight mb-6">
            Shop by <span className="text-[var(--brand-primary)]">Category</span>
          </h2>
          <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto font-medium">
            Find exactly what you're looking for with our diverse range of product categories.
          </p>
        </motion.div>

        <div className="relative h-[400px] flex items-center justify-center">
          {categories.slice(0, 10).map((category, index) => {
            const zIndexValue = categories.length - index;
            const xOffset = (index - 4.5) * 120;
            const rotation = (index - 4.5) * 4;

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
                  src={category.icon}
                  alt={category.name}
                  className="w-full h-full object-cover grayscale-[0.1] group-hover:grayscale-0 transition-all duration-500"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <p className="text-white font-bold text-xl mb-1">{category.name}</p>
                  <p className="text-white/70 text-sm">{category.count} Items</p>
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