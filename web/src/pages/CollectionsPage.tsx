import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Sparkles, TrendingUp, Heart, Star } from 'lucide-react';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';
import { collections } from '../data/collections';

const CollectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('All');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filteredCollections = collections.filter(collection => {
    if (activeFilter === 'All') return true;
    return collection.badge === activeFilter.toLowerCase();
  });

  return (
    <div className="min-h-screen bg-[var(--brand-wash)]">
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

        <div className="py-24 bg-main-gradient backdrop-blur-md rounded-3xl">
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
                        : "bg-white border-gray-100 text-gray-500 hover:border-orange-200 hover:text-orange-500"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {filteredCollections.map((collection, index) => (
            <motion.div
              layout
              key={collection.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onMouseEnter={() => setHoveredId(collection.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="group cursor-pointer"
              onClick={() => navigate('/shop', { state: { collection: collection.id } })}
            >
              <div className="relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300">
                {/* Image Container */}
                <div className="relative h-80 overflow-hidden">
                  <motion.img
                    src={collection.image}
                    alt={collection.name}
                    className="w-full h-full object-cover"
                    animate={{
                      scale: hoveredId === collection.id ? 1.1 : 1,
                    }}
                    transition={{ duration: 0.3 }}
                  />

                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* Badge */}
                  {collection.badge && (
                    <div className="absolute top-4 right-4 bg-white/50 backdrop-blur-medium p-2 rounded-full text-sm font-medium flex items-center shadow-sm">
                      {collection.badge === 'trending' && (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      )}
                      {collection.badge === 'new' && (
                        <Sparkles className="w-4 h-4 text-blue-500" />
                      )}
                      {collection.badge === 'popular' && (
                        <Heart className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  )}

                  {/* Content Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {collection.name}
                    </h3>
                    <p className="text-white/90 text-sm mb-3 line-clamp-2">
                      {collection.description}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-white/80 text-sm mb-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{collection.rating}</span>
                      </div>
                      <div>•</div>
                      <div>{collection.productCount} Products</div>
                    </div>

                    {/* CTA Button */}
                    <motion.button
                      className="flex items-center gap-2 bg-white/90 backdrop-blur-sm text-gray-900 px-3.5 py-2.5 rounded-full font-medium text-xs group-hover:bg-orange-500 group-hover:text-white hover:text-white"
                      whileHover={{ x: 5 }}
                    >
                      Explore Collection
                      <ArrowRight className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Banner Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 to-red-500 p-12 text-center text-white mb-16"
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
              <span className="bg-gradient-to-r from-[#ff6a00] to-red-600 bg-clip-text text-transparent font-semibold text-base pl-2">
                Browse All Products
              </span>
              <div className="w-8 h-8 bg-[#ff6a00] rounded-full flex items-center justify-center group-hover:bg-[#e65e00] transition-colors">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </button>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full translate-y-48 -translate-x-48" />
        </motion.div>

        {/* Why Shop Collections */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Why Shop Our Collections?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "✨",
                title: "Handpicked Quality",
                description: "Every collection is carefully curated by our team to ensure you get the best products"
              },
              {
                icon: "🎯",
                title: "Themed Selection",
                description: "Find exactly what you need with collections organized by theme, occasion, or style"
              },
              {
                icon: "🇵🇭",
                title: "Support Local",
                description: "All collections feature authentic products from verified Filipino sellers"
              }
            ].map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="text-4xl mb-4">{benefit.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {benefit.title}
                </h3>
                <p className="text-gray-600">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <BazaarFooter />
    </div>
  );
};

export default CollectionsPage;
