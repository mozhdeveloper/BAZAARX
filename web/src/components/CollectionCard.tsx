import React from 'react';
import { motion } from 'framer-motion';
import { Collection } from '../types';

interface CollectionCardProps {
  collection: Collection;
  index?: number;
}

const CollectionCard: React.FC<CollectionCardProps> = ({ collection, index = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="group bg-white rounded-xl hover:bg-gray-50 transition-all duration-300 overflow-hidden cursor-pointer"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={collection.image}
          alt={collection.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-white font-bold text-lg mb-1 group-hover:text-[var(--brand-primary)] transition-colors">
            {collection.title}
          </h3>
          <p className="text-white/80 text-sm mb-2">{collection.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-xs">
              {collection.productCount} products
            </span>
            <div className="bg-[var(--brand-primary)] text-white px-3 py-1 rounded-full text-xs font-semibold">
              Explore
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CollectionCard;