import React from 'react';
import { motion } from 'framer-motion';
import { Store } from '../../types';
import StoreCard from '../StoreCard';

interface StoreRailProps {
  title: string;
  subtitle?: string;
  stores: Store[];
  actionLabel?: string;
  onActionClick?: () => void;
}

const StoreRail: React.FC<StoreRailProps> = ({
  title,
  subtitle,
  stores,
  actionLabel = "View All Stores",
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store, index) => (
            <StoreCard
              key={store.id}
              store={store}
              index={index}
            />
          ))}
        </div>

      </div>
    </section>
  );
};

export default StoreRail;