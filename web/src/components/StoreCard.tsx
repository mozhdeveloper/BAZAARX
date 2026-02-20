import React from 'react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
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
      className="product-card-premium product-card-premium-interactive"
    >
      <div className="relative h-[100px] overflow-hidden">
        <img
          src={store.banner}
          alt={store.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {store.isVerified && (
          <div className="absolute top-2.5 right-2.5 bg-[var(--brand-primary)] text-white p-1 rounded-full shadow-lg">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      <div className="p-6 relative">
        <div className="flex items-start gap-4">
          <div className="w-[64px] h-[64px] -mt-10 relative z-10">
            <img
              src={store.logo}
              alt={store.name}
              className="w-full h-full object-cover rounded-xl shadow-xl border-3 border-white"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="product-title-premium text-lg truncate group-hover:text-[var(--brand-primary)] transition-colors font-bold tracking-tight">
                {store.name}
              </h3>
            </div>

            <p className="text-sm text-[var(--text-secondary)] mb-3.5 line-clamp-2 leading-relaxed font-medium">
              {store.description}
            </p>

            <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] font-bold">
              <div className="flex items-center gap-1">
                <span className="text-yellow-400 text-sm">★</span>
                <span className="text-gray-900">{store.rating}</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-gray-300" />
              <div>{store.followers.toLocaleString()} survivors</div>
            </div>

            <p className="text-[11px] text-[var(--text-muted)] mt-4 font-bold flex items-center gap-1.5 uppercase tracking-wider">
              <MapPin className="w-3 h-3" />
              {store.location}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StoreCard;