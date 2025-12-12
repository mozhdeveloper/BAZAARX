import React from 'react';
import { motion } from 'framer-motion';

const HeroSection: React.FC = () => {
  return (
    <section className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] text-white py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              Discover Local
              <br />
              <span className="text-white/90">Filipino Excellence</span>
            </h1>
            <p className="text-xl lg:text-2xl text-white/80 mb-8 leading-relaxed">
              Support local businesses and find authentic Filipino products from trusted sellers across the Philippines.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <button className="bg-white text-[var(--brand-primary)] px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/95 transition-colors">
                Start Shopping
              </button>
              <button className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/10 transition-colors">
                Sell Your Products
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8">
              <div>
                <div className="text-2xl lg:text-3xl font-bold">10K+</div>
                <div className="text-white/70 text-sm">Active Sellers</div>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-bold">50K+</div>
                <div className="text-white/70 text-sm">Products</div>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-bold">100K+</div>
                <div className="text-white/70 text-sm">Happy Customers</div>
              </div>
            </div>
          </motion.div>

          {/* Right Visual */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="grid grid-cols-2 gap-4 lg:gap-6">
              <div className="space-y-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-colors">
                  <div className="w-12 h-12 bg-white/20 rounded-lg mb-3 flex items-center justify-center">
                    <span className="text-2xl">🏪</span>
                  </div>
                  <h3 className="font-semibold mb-2">Local Stores</h3>
                  <p className="text-white/70 text-sm">Discover authentic Filipino businesses</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-colors">
                  <div className="w-12 h-12 bg-white/20 rounded-lg mb-3 flex items-center justify-center">
                    <span className="text-2xl">🚚</span>
                  </div>
                  <h3 className="font-semibold mb-2">Fast Delivery</h3>
                  <p className="text-white/70 text-sm">Quick shipping nationwide</p>
                </div>
              </div>
              <div className="space-y-4 mt-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-colors">
                  <div className="w-12 h-12 bg-white/20 rounded-lg mb-3 flex items-center justify-center">
                    <span className="text-2xl">✨</span>
                  </div>
                  <h3 className="font-semibold mb-2">Quality Products</h3>
                  <p className="text-white/70 text-sm">Verified sellers & authentic items</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-colors">
                  <div className="w-12 h-12 bg-white/20 rounded-lg mb-3 flex items-center justify-center">
                    <span className="text-2xl">💯</span>
                  </div>
                  <h3 className="font-semibold mb-2">Secure Shopping</h3>
                  <p className="text-white/70 text-sm">Safe transactions guaranteed</p>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;