import React from 'react';
import { motion } from 'framer-motion';
import { Store } from '../types';

interface StoreCardProps {
  store: Store;
  index?: number;
}

const StoreCard: React.FC<StoreCardProps> = ({ store, index = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="group bg-white rounded-xl hover:bg-gray-50 transition-all duration-300 overflow-hidden cursor-pointer"
    >
      <div className="relative h-24 overflow-hidden">
        <img
          src={store.banner}
          alt={store.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {store.isVerified && (
          <div className="absolute top-2 right-2 bg-[var(--brand-primary)] text-white p-1 rounded-full">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      <div className="p-4 relative">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 -mt-8 relative z-10">
            <img
              src={store.logo}
              alt={store.name}
              className="w-full h-full object-cover rounded-lg shadow-sm"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-[var(--text-primary)] text-sm truncate group-hover:text-[var(--brand-primary)] transition-colors">
                {store.name}
              </h3>
              {store.isVerified && (
                <span className="chip-orange text-xs">Verified</span>
              )}
            </div>

            <p className="text-xs text-[var(--text-secondary)] mb-2 line-clamp-2">
              {store.description}
            </p>

            <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center gap-1">
                <span className="text-yellow-400">★</span>
                <span>{store.rating}</span>
              </div>
              <div>{store.followers.toLocaleString()} followers</div>
              <div>{store.products} products</div>
            </div>

            <p className="text-xs text-[var(--text-muted)] mt-2">{store.location}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StoreCard;