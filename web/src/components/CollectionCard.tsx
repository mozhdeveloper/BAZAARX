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
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-md hover:shadow-xl transition-all duration-500">
        {/* Image Container */}
        <div className="relative h-[400px] overflow-hidden">
          <motion.img
            src={collection.image}
            alt={collection.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />

          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />

          <div className="absolute inset-x-0 bottom-0 p-8">
            <h3 className="text-3xl font-black text-white mb-3 tracking-tight font-primary">
              {collection.name}
            </h3>
            <p className="text-white/90 text-sm mb-5 line-clamp-2 max-w-sm font-medium leading-relaxed">
              {collection.description}
            </p>

            {/* Stats */}
            <div className="flex items-center gap-6 text-white/80 text-xs font-bold uppercase tracking-widest mb-6">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>{collection.rating}</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-white/40" />
              <div>{collection.productCount} Products</div>
            </div>

            {/* CTA Button */}
            <motion.button
              className="flex items-center gap-3 bg-white text-gray-900 px-7 py-3 rounded-full font-bold text-sm shadow-xl hover:bg-orange-500 hover:text-white transition-all duration-300"
              whileHover={{ x: 5 }}
            >
              Explore Collection
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CollectionCard;
