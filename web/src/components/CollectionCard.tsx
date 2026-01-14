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
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="flex-1 bg-white rounded-[2rem] p-7 shadow-sm hover:shadow-xl transition-all duration-500 group cursor-pointer border border-gray-50"
    >
      <div className="mb-8">
        <h4 className="text-xl font-bold text-gray-900 leading-tight">
          {collection.title}
        </h4>
      </div>

      <div className="relative w-full aspect-[4/5] mb-8 overflow-hidden rounded-2xl">
        <img
          src={collection.image}
          alt={collection.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
        />
      </div>

      <div className="flex items-end justify-between">
        <div>
          <span className="block text-sm font-bold text-gray-900">Explore</span>
          <span className="text-xs text-gray-400">{collection.productCount} products</span>
        </div>
        
        <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center 
                        group-hover:bg-[#FF6B00] group-hover:border-[#FF6B00] transition-all duration-300">
          <svg 
            width="20" height="20" viewBox="0 0 24 24" fill="none" 
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className="text-[#FF6B00] group-hover:text-white transition-colors duration-300"
          >
            <line x1="7" y1="17" x2="17" y2="7"></line>
            <polyline points="7 7 17 7 17 17"></polyline>
          </svg>
        </div>
      </div>
    </motion.div>
  );
};

export default CollectionCard;