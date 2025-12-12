export default function BazaarSellerDashboardHero() {
  return (
    <section className="bg-gradient-to-br from-orange-50 via-white to-orange-50 py-12 sm:py-16 lg:py-24 relative overflow-hidden">
      {/* Decorative elements - hidden on mobile for cleaner look */}
      <div className="hidden sm:block absolute top-20 right-20 w-3 h-3 sm:w-4 sm:h-4 bg-orange-400 rounded-full"></div>
      <div className="hidden sm:block absolute top-32 right-32 w-2 h-2 sm:w-3 sm:h-3 bg-orange-600 rounded-sm transform rotate-45"></div>
      <div className="hidden sm:block absolute top-40 right-16 w-1 h-6 sm:w-2 sm:h-8 bg-orange-500"></div>
      <div className="hidden sm:block absolute top-48 right-24 w-4 h-1 sm:w-6 sm:h-2 bg-orange-400"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-4 sm:mb-6">
              Powerful Seller Hub
              <br className="hidden sm:block" />
              <span className="block sm:inline text-orange-600"> For Filipino Entrepreneurs</span>
            </h1>

            <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Manage your entire Bazaar business with our comprehensive seller dashboard. 
              Track sales, manage inventory, analyze customer insights, and grow your business 
              with powerful AI-driven analytics and automated tools.
            </p>
          </div>

          <div className="relative mt-8 lg:mt-0">
            {/* Bazaar Seller Dashboard Card */}
            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl transform rotate-3 sm:rotate-6 hover:rotate-0 transition-transform duration-300 max-w-sm mx-auto lg:max-w-none">
              <div className="text-white mb-3 sm:mb-4">
                <div className="text-xs sm:text-sm text-orange-400 mb-1 sm:mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Bazaar Seller Hub
                </div>
                <div className="text-xs text-gray-400">Dashboard Overview</div>
              </div>

              {/* Sales Analytics Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-0.5 sm:gap-1 mb-3 sm:mb-4">
                {Array.from({ length: 24 }, (_, i) => {
                  const isHighValue = Math.random() > 0.6;
                  const isMediumValue = Math.random() > 0.7;
                  return (
                    <div
                      key={i}
                      className={`w-2 h-2 sm:w-3 sm:h-3 ${
                        isHighValue
                          ? "bg-orange-500"
                          : isMediumValue
                            ? "bg-orange-400"
                            : "bg-gray-800"
                      }`}
                    />
                  );
                })}
              </div>

              {/* Dashboard Stats */}
              <div className="space-y-2 sm:space-y-3 text-white text-xs sm:text-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-orange-400 font-medium">Today's Sales</div>
                    <div className="text-lg font-bold">₱45,250</div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-medium">+23.5% ↗</div>
                    <div className="text-gray-400 text-xs">vs yesterday</div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                  <div>
                    <div className="mb-1">Orders: 127</div>
                    <div className="text-gray-400 text-xs">Products: 89 active</div>
                  </div>
                  <div className="text-right">
                    <div className="mb-1">Rating: 4.8⭐</div>
                    <div className="text-gray-400 text-xs">Reviews: 2.1k</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating decorative elements */}
            <div className="absolute -top-2 -left-2 sm:-top-4 sm:-left-4 w-6 h-6 sm:w-8 sm:h-8 bg-orange-400 rounded-lg transform rotate-45"></div>
            <div className="absolute -bottom-2 -right-2 sm:-bottom-4 sm:-right-4 w-4 h-4 sm:w-6 sm:h-6 bg-orange-500 rounded-full"></div>
            <div className="hidden sm:block absolute top-1/2 -right-8 w-4 h-12 bg-orange-600"></div>

            {/* Scattered elements - hidden on mobile */}
            <div className="hidden sm:block absolute top-8 right-8 w-2 h-2 bg-orange-400 rounded-full"></div>
            <div className="hidden sm:block absolute bottom-12 left-8 w-3 h-3 bg-orange-500 rounded-full"></div>
            <div className="hidden sm:block absolute top-16 left-12 w-2 h-6 bg-orange-600"></div>
          </div>
        </div>

        {/* Trust indicators - Bazaar ecosystem partners */}
        <div className="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-gray-200">
          <p className="text-center text-gray-600 mb-6 text-sm sm:text-base">
            Trusted by thousands of Filipino sellers across the archipelago
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 lg:gap-12 opacity-60">
            {[
              { name: "LBC Express", icon: "📦" },
              { name: "GCash", icon: "💳" },
              { name: "PayMaya", icon: "💰" },
              { name: "2GO Express", icon: "🚚" },
              { name: "BPI", icon: "🏦" }
            ].map((partner, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-4 h-4 sm:w-6 sm:h-6 bg-orange-100 rounded flex items-center justify-center text-xs sm:text-sm">
                  {partner.icon}
                </div>
                <span className="text-gray-600 font-medium text-sm sm:text-base">{partner.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}