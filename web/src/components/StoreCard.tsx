import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star, Users, Package } from 'lucide-react';
import { Store } from '../types';

interface StoreCardProps {
  store: Store;
  index?: number;
}

const StoreCard: React.FC<StoreCardProps> = ({ store, index = 0 }) => {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="bg-white rounded-3xl overflow-hidden shadow-golden hover:shadow-xl transition-all duration-500 border border-gray-100 flex flex-col h-full group cursor-pointer"
      onClick={() => navigate(`/store/${store.id}`)}
    >
      {/* Banner */}
      <div className="relative h-32 overflow-hidden bg-gray-100">
        <img
          src={store.banner}
          alt={store.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        {store.isVerified && (
          <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center border border-gray-50">
            <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        {/* Logo & Name Row */}
        <div className="flex items-center gap-3 mb-5 mt-2">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-sm bg-white shrink-0">
            <img
              src={store.logo}
              alt={store.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-h-[2.5rem] flex items-center">
                <h3 className="font-bold text-[var(--text-headline)] text-base line-clamp-2 leading-snug group-hover:text-[var(--brand-primary)] transition-colors">
                  {store.name}
                </h3>
              </div>
              <svg className="w-4 h-4 text-gray-300 group-hover:text-[var(--brand-primary)] transition-colors mt-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className="mb-3 flex items-center gap-1.5 text-gray-400">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="text-[11px] font-medium tracking-tight line-clamp-1">
            {store.location}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-500 font-medium line-clamp-2 leading-relaxed mb-6 flex-1">
          {store.description}
        </p>

        {/* Stats Footer */}
        <div className="pt-4 border-t border-gray-50 flex items-center justify-start gap-x-3">
          {/* Rating */}
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Star className="w-2.5 h-2.5 fill-[var(--brand-primary)] text-[var(--brand-primary)]" />
              <span className="text-[13px] font-bold text-[#1e293b]">{store.rating}</span>
            </div>
            <span className="text-[10px] text-[#94a3b8]">Rating</span>
          </div>

          <div className="h-7 w-px bg-gray-100" />

          {/* Followers */}
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Users className="w-2.5 h-2.5 text-[#94a3b8]" />
              <span className="text-[13px] font-bold text-[#1e293b]">{store.followers.toLocaleString()}</span>
            </div>
            <span className="text-[10px] text-[#94a3b8]">Followers</span>
          </div>

          <div className="h-7 w-px bg-gray-100" />

          {/* Products */}
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Package className="w-2.5 h-2.5 text-[#94a3b8]" />
              <span className="text-[13px] font-bold text-[#1e293b]">{store.products}</span>
            </div>
            <span className="text-[10px] text-[#94a3b8]">Products</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StoreCard;