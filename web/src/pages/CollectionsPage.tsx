import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Sparkles, TrendingUp, Heart, Star } from 'lucide-react';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';
import { collections } from '../data/collections';
import CollectionCard from '../components/CollectionCard';

const CollectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('All');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filteredCollections = collections.filter(collection => {
    if (activeFilter === 'All') return true;
    return collection.badge === activeFilter.toLowerCase();
  });

  return (
    <div className="min-h-screen bg-transparent">
      <Header />

      {/* Hero Section - Glass-like Gradient */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-0 flex flex-col gap-2">
        {/* Page Navigation */}
        <div className="flex items-center justify-center gap-10 pt-1 pb-1">
          <Link
            to="/shop"
            className="text-sm text-gray-500 hover:text-[var(--brand-primary)] transition-all duration-300"
          >
            Shop
          </Link>
          <Link
            to="/collections"
            className="text-sm font-bold text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)] pb-0.5"
          >
            Collections
          </Link>
          <Link
            to="/stores"
            className="text-sm text-gray-500 hover:text-[var(--brand-primary)] transition-all duration-300"
          >
            Stores
          </Link>
          <Link
            to="/registry"
            className="text-sm text-gray-500 hover:text-[var(--brand-primary)] transition-all duration-300"
          >
            Registry & Gifting
          </Link>
        </div>

        <div className="py-24 bg-hero-gradient backdrop-blur-md shadow-md rounded-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center px-4"
          >
            <h1 className="text-4xl md:text-6xl font-black text-[var(--text-headline)] mb-2 tracking-tight font-primary">
              Discover Handpicked
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-primary)] to-[var(--text-accent)]">
                Collections
              </span>
            </h1>

            <p className="text-medium text-[var(--text-primary)] max-w-2xl mx-auto font-medium">
              Explore carefully curated collections featuring the best products from trusted sellers.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">

        {/* Featured Badge Collections */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-1">
              {['All', 'Trending', 'New', 'Popular'].map((filter) => {
                const isActive = activeFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 whitespace-nowrap border
                      ${isActive
                        ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white shadow-sm scale-105"
                        : "bg-white border-gray-100 text-gray-500 hover:border-[var(--brand-primary)]/30 hover:text-[var(--brand-primary)]"
                      }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-gray-500 font-medium">
              Showing {filteredCollections.length} collections
            </div>
          </div>
        </motion.div>

        {/* Collections Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-16">
          {filteredCollections.map((collection, index) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              index={index}
            />
          ))}
        </div>

        {/* Banner Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] p-12 text-center text-white mb-16"
        >
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Can't Find What You're Looking For?
            </h2>
            <p className="text-lg text-white/90 mb-6 max-w-2xl mx-auto">
              Browse our complete product catalog or search for specific items from thousands of Filipino sellers
            </p>
            <button
              onClick={() => navigate('/shop')}
              className="group bg-white pl-5 pr-1.5 py-1.5 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2 mx-auto"
            >
              <span className="text-[var(--brand-primary)] font-semibold text-base pl-2">
                Browse All Products
              </span>
              <div className="w-8 h-8 bg-[var(--brand-primary)] rounded-full flex items-center justify-center group-hover:bg-[var(--brand-primary-dark)] transition-colors">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </button>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full translate-y-48 -translate-x-48" />
        </motion.div>
      </div>

      <BazaarFooter />
    </div>
  );
};

export default CollectionsPage;
