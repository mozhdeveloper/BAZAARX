import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Store,
  Star,
  MapPin,
  Package,
  TrendingUp,
  Award,
  Shield,
  Users,
  Search,
  ChevronDown,
  Filter
} from 'lucide-react';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';
import { featuredStores } from '../data/stores';

const StoresPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [sortBy, setSortBy] = useState('featured');

  const categories = ['All', 'Electronics', 'Fashion', 'Food & Beverages', 'Home & Living', 'Filipino Crafts', 'Beauty & Personal Care'];
  const locations = ['All', 'Metro Manila', 'Luzon', 'Visayas', 'Mindanao'];

  const filteredStores = featuredStores.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || store.categories.includes(selectedCategory);
    const matchesLocation = selectedLocation === 'All' || store.location.includes(selectedLocation);

    return matchesSearch && matchesCategory && matchesLocation;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header hideSearch={true} />

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
            className="text-sm text-gray-500 hover:text-[var(--brand-primary)] transition-all duration-300"
          >
            Collections
          </Link>
          <Link
            to="/stores"
            className="text-sm text-[var(--brand-primary)]"
          >
            Stores
          </Link>
        </div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <div className="">
            <div className="w-full mb-2 mt-0 py-4 bg-gradient-to-br from-orange-100/20 via-orange-200/50 to-orange-200/50 backdrop-blur-md border border-orange-200/30 rounded-3xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-2">
                  Discover Trusted {''}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                    Stores
                  </span>
                </h1>
                <p className="text-medium text-gray-700 max-w-2xl mx-auto">
                  Shop from verified stores and trusted brands .
                </p>
              </motion.div>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="max-w-3xl mx-auto mt-4 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
              {[
                { label: 'Active Stores', value: '1.2k+' },
                { label: 'Products Listed', value: '50k+' },
                { label: 'Happy Customers', value: '100k+' },
                { label: 'Average Rating', value: '4.8' }
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-gray-700 font-['Montserrat'] tracking-tight">
                    {stat.value}
                  </div>
                  <div className="text-[9px] md:text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto pt-2">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Search for stores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-1.5 rounded-full border border-gray-200 text-sm focus:border-orange-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </motion.div>



        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            {/* Category Filter */}
            <div className="flex-1">
              <div className="flex flex-wrap gap-1 md:gap-1">
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 whitespace-nowrap border
                        ${isActive
                          ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white shadow-sm scale-105"
                          : "bg-white border-gray-100 text-gray-500 hover:border-orange-200 hover:text-orange-500"
                        }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Filters Row */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-gray-400">
                <Filter className="w-4 h-4" />
              </div>

              <div className="flex items-center gap-2">
                {/* Location Filter */}
                <div className="relative min-w-[140px]">
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full pl-3 pr-8 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-700 focus:border-orange-500 focus:outline-none appearance-none hover:border-gray-300 transition-colors cursor-pointer bg-white"
                  >
                    <option value="All">All Locations</option>
                    {locations.filter(l => l !== 'All').map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                </div>

                {/* Sort By Filter */}
                <div className="relative min-w-[140px]">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full pl-3 pr-8 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-700 focus:border-orange-500 focus:outline-none appearance-none hover:border-gray-300 transition-colors cursor-pointer bg-white"
                  >
                    <option value="featured">Featured Stores</option>
                    <option value="rating">Highest Rated</option>
                    <option value="newest">Newest Joiners</option>
                    <option value="popular">Most Popular</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between -mb-2">
            <p className="text-xs text-gray-600">
              Showing {filteredStores.length} stores
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setSelectedLocation('All');
                setSortBy('featured');
              }}
              className="text-xs text-orange-500 hover:text-orange-600 font-medium"
            >
              Clear Filters
            </button>
          </div>
        </motion.div>

        {/* Stores Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {filteredStores.map((store, index) => (
            <motion.div
              key={store.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/seller/${store.id}`)}
              className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col h-full"
            >
              {/* Store Header with Background */}
              <div className="relative h-32 bg-gradient-to-br from-orange-400 to-red-500 overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-20 translate-x-20" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-16 -translate-x-16" />
                </div>

                {store.isVerified && (
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 text-blue-600">
                    <Shield className="w-3 h-3" />
                    Verified
                  </div>
                )}
              </div>

              {/* Store Avatar */}
              <div className="px-6 pb-6 flex-1 flex flex-col">
                <div className="relative -mt-12 mb-4">
                  <div className="w-24 h-24 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden">
                    <img
                      src={store.avatar}
                      alt={store.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {store.badges.length > 0 && (
                    <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white p-2 rounded-full">
                      <Award className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Store Info */}
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-500 transition-colors">
                  {store.name}
                </h3>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {store.description}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{store.rating}</span>
                    <span className="text-gray-500">({store.totalReviews.toLocaleString()})</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <Package className="w-4 h-4" />
                    <span>{store.products} products</span>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <MapPin className="w-4 h-4" />
                  <span>{store.location}</span>
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {store.categories.slice(0, 2).map((category, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-orange-50 text-orange-600 text-xs rounded-full font-medium"
                    >
                      {category}
                    </span>
                  ))}
                  {store.categories.length > 2 && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                      +{store.categories.length - 2} more
                    </span>
                  )}
                </div>

                {/* Badges */}
                {store.badges.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {store.badges.map((badge, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded font-medium flex items-center gap-1"
                      >
                        <TrendingUp className="w-3 h-3" />
                        {badge}
                      </span>
                    ))}
                  </div>
                )}

                {/* Visit Store Button */}
                <button className="w-full mt-auto py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                  Visit Store
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-purple-600 p-12 text-center text-white"
        >
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Want to Start Your Own Store?
            </h2>
            <p className="text-lg text-white/90 mb-6 max-w-2xl mx-auto">
              Join thousands of Filipino entrepreneurs selling on BazaarPH. It's free to start and easy to manage.
            </p>
            <button
              onClick={() => navigate('/seller/register')}
              className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold text-lg hover:bg-blue-50 transition-colors inline-flex items-center gap-2"
            >
              Start Selling Today
              <Store className="w-5 h-5" />
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

export default StoresPage;
