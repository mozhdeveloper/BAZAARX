import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Star, ArrowRight } from 'lucide-react';
import { Collection } from '../types';

interface CollectionCardProps {
  collection: Collection;
  index?: number;
}

const CollectionCard: React.FC<CollectionCardProps> = ({ collection, index = 0 }) => {
  const navigate = useNavigate();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group cursor-pointer"
      onClick={() => navigate('/shop', { state: { collection: collection.id } })}
    >
      <div className="bg-white rounded-2xl p-4 shadow-golden hover:shadow-xl transition-all duration-500 border border-gray-100/50 flex flex-col h-full group-hover:-translate-y-1 group-hover:border-orange-100">
        {/* Title Top */}
        <h3 className="text-base font-bold text-[var(--text-headline)] mb-3 tracking-tight leading-tight min-h-[2.5rem] line-clamp-2">
          {collection.name}
        </h3>

        {/* Image Middle */}
        <div className="relative aspect-[4/3] mb-3 overflow-hidden rounded-xl bg-gray-50 flex items-center justify-center">
          <motion.img
            src={collection.image}
            alt={collection.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 font-medium font-primary">
              {collection.productCount} products
            </span>
          </div>

          <div className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--brand-primary)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="7" y1="17" x2="17" y2="7"></line>
              <polyline points="7 7 17 7 17 17"></polyline>
            </svg>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CollectionCard;
