import React, { Suspense, lazy } from "react";
import { BazaarHero } from "../components/ui/bazaar-hero";
import { BazaarFooter } from "../components/ui/bazaar-footer";

import { FloatingNavigation } from "@/components/ui/floating-navigation";

// Lazy load heavy scroll-animated components
const BazaarHistory = lazy(() => import("../components/ui/bazaar-history"));
const BazaarHistoryZoomParallax = lazy(
  () => import("@/components/ui/bazaar-history-zoom-parallax"),
);
const BazaarRevealWords = lazy(
  () => import("@/components/ui/bazaar-history-reveal-words"),
);
const ScrollExpansionHero = lazy(
  () => import("@/components/ui/scroll-expansion-hero"),
);
const BazaarMarketplaceIntro = lazy(
  () => import("@/components/ui/bazaar-marketplace-intro"),
);
const MobileAppShowcase = lazy(() =>
  import("../components/ui/mobile-app-showcase").then((m) => ({
    default: m.MobileAppShowcase,
  })),
);
const BazaarTrustShowcase = lazy(
  () => import("../components/ui/bazaar-trust-showcase"),
);
const POSLiteFeature = lazy(() => import("@/components/sections/PosLite"));
const Hero195 = lazy(() =>
  import("../components/ui/hero-195").then((m) => ({ default: m.Hero195 })),
);
const BazaarXTestimonials = lazy(
  () => import("../components/sections/BazaarXTestimonials"),
);
const BrandTestimonials = lazy(
  () => import("../components/sections/BrandTestimonials"),
);
const FeaturedCollections = lazy(
  () => import("../components/FeaturedCollections"),
);
const ProductRail = lazy(() => import("../components/sections/ProductRail"));
const FeatureStrip = lazy(() => import("../components/sections/FeatureStrip"));
const StoreRail = lazy(() => import("../components/sections/StoreRail"));
const CategoriesFooterStrip = lazy(
  () => import("../components/CategoriesFooterStrip"),
);

// Data imports
import { bestSellerProducts, newArrivals } from "../data/products";
import { featuredStores } from "../data/stores";

// Loading fallback component
const SectionLoader = () => (
  <div className="w-full py-20 flex items-center justify-center">
    <div className="animate-pulse text-gray-400">Loading...</div>
  </div>
);

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <FloatingNavigation />

      {/* Bazaar Hero */}
      <BazaarHero />

      <Suspense fallback={<SectionLoader />}>
        {/* Bazaar history section  */}
        <div id="bazaar-history">
          <BazaarHistory />
        </div>
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        {/* Bazaar history zoom parallax section */}
        <div id="bazaar-exchange">
          <BazaarHistoryZoomParallax />
        </div>
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        {/* Bazaar: trade / craft / gathering */}
        <div id="bazaar-culture">
          <BazaarRevealWords />
        </div>
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        {/* Scroll Expansion Hero */}
        <div id="bazaar-modernity">
          <ScrollExpansionHero
            mediaType="image"
            bgImageSrc="https://magazine.surahotels.com/resize/fit-1150x670-95-1716885535924-dunyanin-en-unlu-kapalicarsilari-istanbul.jpg"
            mediaSrc="https://www.rucksackramblings.com/wp-content/uploads/2017/01/The-Bazaars-Of-Iran-21.jpg"
            title="Your Modern Crossroads of Global Trade"
          />
        </div>
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        {/* Bazaar Marketplace Intro */}
        <div id="bazaar-marketplace-intro">
          <BazaarMarketplaceIntro />
        </div>
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        {/* Categories Footer Strip */}
        <div id="bazaar-categories">
          <CategoriesFooterStrip />
        </div>
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        {/* Trust & Quality Showcase */}
        <div id="bazaar-trust">
          <BazaarTrustShowcase />
        </div>
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        {/* Testimonials from Filipino Sellers */}
        <div id="bazaar-testimonials">
          <BazaarXTestimonials />
        </div>
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        {/* Brand Owner & CEO Testimonials */}
        <BrandTestimonials />
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        {/* POS Lite Feature*/}
        <div id="bazaar-inventory">
          <POSLiteFeature />
        </div>
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        {/* Seller Dashboard Preview - Interactive Demo */}
        <div id="bazaar-dashboard">
          <Hero195 />
        </div>
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        {/* Featured Collections */}
        <div id="bazaar-collections">
          <FeaturedCollections />
        </div>
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        {/* Best Sellers Rail */}
        <div id="bazaar-bestsellers">
          <ProductRail
            title="Best Sellers"
            subtitle="Top-rated products loved by thousands of customers"
            products={bestSellerProducts}
            actionLabel="View All Best Sellers"
          />
        </div>
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        {/* Featured Stores Rail */}
        <div id="bazaar-stores">
          <StoreRail
            title="Featured Stores"
            subtitle="Trusted sellers with verified quality and excellent service"
            stores={featuredStores}
            actionLabel="Explore All Stores"
          />
        </div>
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        {/* New Arrivals Rail */}
        <div id="bazaar-new">
          <ProductRail
            title="New Arrivals"
            subtitle="Fresh finds from our newest sellers and latest collections"
            products={newArrivals.slice(0, 4)}
            actionLabel="Explore New Products"
          />
        </div>
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        {/* Feature Strip 2 - Secure Shopping */}
        <div id="bazaar-confidence">
          <FeatureStrip
            title="Shop with Complete Confidence"
            description="Experience worry-free shopping with our comprehensive buyer protection, secure payments, and dedicated customer support."
            image="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop"
            features={[
              "100% secure payment processing",
              "Buyer protection guarantee",
              "24/7 customer support",
              "Easy returns and refunds",
            ]}
            buttonText="Learn About Protection"
            reverse={true}
          />
        </div>
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        {/* Mobile App Showcase */}
        <div id="bazaar-mobile">
          <MobileAppShowcase />
        </div>
      </Suspense>

      {/* Bazaar Footer */}
      <BazaarFooter />
    </div>
  );
};

export default HomePage;
