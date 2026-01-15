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
              Experience <span className="font-fondamento">Bazaar</span>
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
        <div className="flex justify-center items-center">
          <img
            src="/phone.png"
            alt="Bazaar Mobile App"
            className="h-auto w-full max-w-[800px] md:max-w-7xl object-contain"
          />
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