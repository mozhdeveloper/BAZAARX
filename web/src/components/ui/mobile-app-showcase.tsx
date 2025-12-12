"use client";
import { MobileAppScroll } from "./mobile-app-scroll";
import { AppStoreButton } from "./app-store-button";
import { PlayStoreButton } from "./play-store-button";
import { Download, Smartphone, Star } from "lucide-react";

export function MobileAppShowcase() {
  return (
    <div className="bg-gradient-to-b from-white via-gray-50 to-white">
      <MobileAppScroll
        titleComponent={
          <div className="text-center space-y-6">
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
              Experience Bazaar
              <span className="block text-[#FF6A00] mt-2">On Your Phone</span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Shop anywhere, anytime with our powerful mobile app. Featuring AI-powered search, 
              camera shopping, and seamless checkout experience.
            </p>
            
            {/* App Features */}
            <div className="flex flex-wrap justify-center gap-6 mt-8">
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
                <Star className="w-5 h-5 text-yellow-500 fill-current" />
                <span className="text-sm font-medium text-gray-700">4.9 Rating</span>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
                <Download className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-gray-700">50K+ Downloads</span>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
                <Smartphone className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">iOS & Android</span>
              </div>
            </div>
          </div>
        }
      >
        {/* Mobile App Screenshots/Interface - iPhone with Dynamic Island */}
        <div className="h-full w-full bg-black relative overflow-hidden rounded-[2.5rem] border-4 border-gray-800">
          
          {/* Dynamic Island */}
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-black rounded-full px-6 py-2 flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div className="w-12 h-3 bg-gray-800 rounded-full"></div>
              <div className="w-3 h-3 bg-gray-800 rounded-full"></div>
            </div>
          </div>

          {/* iPhone Screen Content */}
          <div className="h-full w-full bg-gradient-to-b from-gray-100 to-white relative overflow-hidden mt-8">
          
            {/* App Header with Status Bar */}
            <div className="bg-[#FF6A00] h-20 flex items-end justify-between px-6 pb-4 pt-6 relative">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-[#FF6A00] font-bold text-sm">B</span>
                </div>
                <span className="text-white font-bold text-lg">Bazaar</span>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 bg-white/20 rounded-full"></div>
                <div className="w-6 h-6 bg-white/20 rounded-full"></div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-6 py-4 bg-[#FF6A00]">
              <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg">
                <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
                <span className="text-gray-500 text-sm">Search products...</span>
                <div className="w-5 h-5 bg-[#FF6A00] rounded-full ml-auto"></div>
              </div>
            </div>

            {/* Categories */}
            <div className="px-6 py-4">
              <div className="grid grid-cols-4 gap-3">
                {['Fashion', 'Electronics', 'Home', 'Beauty'].map((category) => (
                  <div key={category} className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-full mx-auto mb-2"></div>
                    <span className="text-xs font-medium text-gray-700">{category}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Featured Products */}
            <div className="px-6 py-2">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Featured Products</h3>
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex gap-3 bg-white p-3 rounded-xl shadow-sm">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-gray-900 truncate">Premium Product {item}</h4>
                      <p className="text-xs text-gray-600 mt-1">High quality item</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[#FF6A00] font-bold text-sm">₱{(item * 299).toLocaleString()}</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-current" />
                          <span className="text-xs text-gray-600">4.{item + 6}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Navigation */}
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3">
              <div className="flex justify-around">
                {['Home', 'Shop', 'Cart', 'Profile'].map((tab, index) => (
                  <div key={tab} className="text-center">
                    <div className={`w-6 h-6 mx-auto mb-1 rounded-full ${index === 0 ? 'bg-[#FF6A00]' : 'bg-gray-300'}`}></div>
                    <span className={`text-xs ${index === 0 ? 'text-[#FF6A00] font-medium' : 'text-gray-500'}`}>{tab}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </MobileAppScroll>

      {/* Call to Action Section */}
      <div className="text-center pb-20">
        <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
          Download the Bazaar App Today
        </h3>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          Join thousands of satisfied customers shopping smarter with AI-powered features, 
          instant notifications, and exclusive mobile-only deals.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <AppStoreButton className="bg-black hover:bg-gray-800 text-white px-8 py-4 rounded-xl font-semibold transition-all hover:scale-105" />
          
          <PlayStoreButton className="bg-black hover:bg-gray-800 text-white px-8 py-4 rounded-xl font-semibold transition-all hover:scale-105" />
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Available on iPhone 12+ and Android 8.0+ | Experience shopping reimagined
        </p>
      </div>
    </div>
  );
}