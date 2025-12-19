import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, TrendingUp, Heart, Star } from 'lucide-react';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';
import { collections } from '../data/collections';

const CollectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/30 to-white">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 px-4 py-2 rounded-full text-sm font-medium mb-6"
          >
            <Sparkles className="w-4 h-4" />
            Curated Collections
          </motion.div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Discover Handpicked
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
              Collections
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Explore carefully curated collections featuring the best products from Filipino sellers
          </p>
        </motion.div>

        {/* Featured Badge Collections */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Featured Collections</h2>
            <div className="flex gap-2">
              {['All', 'Trending', 'New', 'Popular'].map((filter) => (
                <button
                  key={filter}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    filter === 'All'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-500 hover:text-orange-500'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Collections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {collections.map((collection, index) => (
            <motion.div
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
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                      {collection.badge === 'trending' && (
                        <>
                          <TrendingUp className="w-4 h-4 text-orange-500" />
                          <span className="text-orange-500">Trending</span>
                        </>
                      )}
                      {collection.badge === 'new' && (
                        <>
                          <Sparkles className="w-4 h-4 text-blue-500" />
                          <span className="text-blue-500">New</span>
                        </>
                      )}
                      {collection.badge === 'popular' && (
                        <>
                          <Heart className="w-4 h-4 text-red-500" />
                          <span className="text-red-500">Popular</span>
                        </>
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
                      className="flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-full font-medium text-sm group-hover:bg-orange-500 group-hover:text-white transition-colors"
                      whileHover={{ x: 5 }}
                    >
                      Explore Collection
                      <ArrowRight className="w-4 h-4" />
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
              className="bg-white text-orange-500 px-8 py-3 rounded-full font-semibold text-lg hover:bg-orange-50 transition-colors inline-flex items-center gap-2"
            >
              Browse All Products
              <ArrowRight className="w-5 h-5" />
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
