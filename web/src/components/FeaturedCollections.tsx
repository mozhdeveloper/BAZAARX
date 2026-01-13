import React from 'react';
import { motion } from 'framer-motion';
import { featuredCollections } from '../data/collections';
import CollectionCard from './CollectionCard';

const FeaturedCollections: React.FC = () => {
  return (
    <section className="py-20 bg-[var(--bg-secondary)] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-[var(--text-primary)]">
            Featured Collections
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-10 items-center">
          {/* Left Side: Collection Cards */}
          <div className="lg:col-span-8 flex flex-col md:flex-row gap-6">
            {featuredCollections.slice(0, 4).map((collection, index) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                index={index}
              />
            ))}
          </div>

          {/* Right Side: Descriptive Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-4"
          >
            <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-4 block">
              Curated collections
            </span>
            <h3 className="text-4xl font-bold text-[var(--text-primary)] leading-tight mb-6">
              Explore Curated Collections
            </h3>
            <p className="text-lg text-[var(--text-secondary)] mb-8 leading-relaxed">
              of the best products from verified Filipino sellers.
            </p>
            
            <button className="group flex items-center gap-2 text-[var(--text-primary)] font-bold text-lg hover:text-[var(--brand-primary)] transition-colors">
              <span className="underline underline-offset-8 decoration-2">View All Collections</span>
              <svg 
                width="20" height="20" viewBox="0 0 24 24" fill="none" 
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className="group-hover:translate-x-1 transition-transform"
              >
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedCollections;