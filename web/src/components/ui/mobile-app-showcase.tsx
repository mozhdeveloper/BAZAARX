"use client";
import { MobileAppScroll } from "./mobile-app-scroll";
import { AppStoreButton } from "./app-store-button";
import { PlayStoreButton } from "./play-store-button";
import { Download, Smartphone, Star } from "lucide-react";

interface MobileAppShowcaseProps {
  mode?: "buyer" | "seller";
}

export function MobileAppShowcase({ mode = "buyer" }: MobileAppShowcaseProps) {
  return (
    <div className="bg-white">
      <MobileAppScroll
        titleComponent={
          <div className="text-center space-y-4 sm:space-y-6 px-4">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              {mode === "buyer" ? (
                <>
                  <span className="text-[#FF6A00]">Experience <span className="font-fondamento">Bazaar</span></span> On Your Phone
                </>
              ) : (
                <>
                  <span className="text-black">Start Your Business With </span><span className="font-fondamento text-[#FF6A00]">BazaarX</span>
                </>
              )}
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {mode === "buyer"
                ? "Shop anywhere, anytime with our powerful mobile app. Featuring AI-powered search, camera shopping, and seamless checkout experience."
                : "Track sales, manage inventory, and respond to customers instantly. Run your entire business from the palm of your hand."}
            </p>

            {/* App Features */}
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 mt-6 sm:mt-8">
              <div className="flex items-center gap-2 px-2 py-1 bg-white/50 rounded-full sm:bg-transparent">
                <Star className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--brand-primary)] fill-[var(--brand-primary)]" />
                <span className="text-sm font-semibold text-gray-900">4.9 Rating</span>
              </div>

              <div className="hidden sm:block w-px h-6 bg-gray-300"></div>

              <div className="flex items-center gap-2 px-2 py-1 bg-white/50 rounded-full sm:bg-transparent">
                <Download className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--brand-primary)]" />
                <span className="text-sm font-semibold text-gray-900">50K+ Downloads</span>
              </div>

              <div className="hidden sm:block w-px h-6 bg-gray-300"></div>

              <div className="flex items-center gap-2 px-2 py-1 bg-white/50 rounded-full sm:bg-transparent">
                <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--brand-primary)]" />
                <span className="text-sm font-semibold text-gray-900">iOS & Android</span>
              </div>
            </div>
          </div>
        }
      >
        <div className="flex justify-center items-center px-4">
          <img
            src="/phone.png"
            alt="Bazaar Mobile App"
            className="h-auto w-full max-w-[300px] sm:max-w-[500px] md:max-w-4xl object-contain drop-shadow-2xl"
          />
        </div>
      </MobileAppScroll>

      {/* Call to Action Section */}
      <div className="text-center pb-20">
        <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
          {mode === "buyer" ? "Download the Bazaar App Today" : "Start Selling on Mobile Today"}
        </h3>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          {mode === "buyer"
            ? "Join thousands of satisfied customers shopping smarter with AI-powered features, instant notifications, and exclusive mobile-only deals."
            : "Join thousands of successful sellers growing their business with real-time analytics, instant notifications, and powerful management tools."}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <AppStoreButton className="bg-black hover:bg-gray-800 text-white px-8 py-4 rounded-xl font-semibold transition-all hover:scale-105" />

          <PlayStoreButton className="bg-black hover:bg-gray-800 text-white px-8 py-4 rounded-xl font-semibold transition-all hover:scale-105" />
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Available on iPhone 12+ and Android 8.0+ | Experience {mode === "buyer" ? "shopping" : "business"} reimagined
        </p>
      </div>
    </div>
  );
}