import React from 'react';
import { BazaarHero } from '../components/ui/bazaar-hero';
//import ScrollMorphHero from '../components/ui/scroll-morph-hero';
//import { SectionTransition } from '../components/ui/section-transition';
import BazaarTrustShowcase from '../components/ui/bazaar-trust-showcase';
import BazaarHistory from '../components/ui/bazaar-history';
import { MobileAppShowcase } from '../components/ui/mobile-app-showcase';
import { Hero195 } from '../components/ui/hero-195';
import { BazaarFooter } from '../components/ui/bazaar-footer';
import { SmoothScrollProvider } from '../components/ui/smooth-scroll-provider';
import FeaturedCollections from '../components/FeaturedCollections';
import ProductRail from '../components/sections/ProductRail';
import TrendingSection from '../components/TrendingSection';
import FeatureStrip from '../components/sections/FeatureStrip';
import StoreRail from '../components/sections/StoreRail';
import CategoriesFooterStrip from '../components/CategoriesFooterStrip';
import BazaarXTestimonials from '../components/sections/BazaarXTestimonials';
import BrandTestimonials from '../components/sections/BrandTestimonials';
import POSLiteFeature from '@/components/sections/PosLite';
import BazaarHistoryZoomParallax from '@/components/ui/bazaar-history-zoom-parallax';
import BazaarRevealWords from '@/components/ui/bazaar-history-reveal-words';
import ScrollExpansionHero from '@/components/ui/scroll-expansion-hero';
import BazaarMarketplaceIntro from '@/components/ui/bazaar-marketplace-intro';

// Data imports
import { trendingProducts, bestSellerProducts, newArrivals } from '../data/products';
import { featuredStores } from '../data/stores';

const HomePage: React.FC = () => {
  return (
    <SmoothScrollProvider>
      <div className="min-h-screen bg-white">

        {/* Bazaar Hero */}
        <BazaarHero />

        {/* Bazaar history section  */}
        <div id="bazaar-history">
          <BazaarHistory />
        </div>

        {/* Bazaar history zoom parallax section */}
        <BazaarHistoryZoomParallax />

        {/* Bazaar: trade / craft / gathering */}
        <BazaarRevealWords />

        {/* Scroll Expansion Hero */}
        <ScrollExpansionHero
          mediaType="image"
          bgImageSrc="https://magazine.surahotels.com/resize/fit-1150x670-95-1716885535924-dunyanin-en-unlu-kapalicarsilari-istanbul.jpg"
          mediaSrc="https://www.rucksackramblings.com/wp-content/uploads/2017/01/The-Bazaars-Of-Iran-21.jpg"
          title="Your Modern Crossroads of Global Trade"
        />

        {/* Bazaar Marketplace Intro */}
        <div id="bazaar-marketplace-intro">
          <BazaarMarketplaceIntro />
        </div>

        {/* Scroll Morph Hero - Categories Explorer */}
        {/* <div className="h-[120vh] w-full">
          <ScrollMorphHero />
        </div> */}

        {/* Mobile App Showcase */}
        <MobileAppShowcase />

        {/* Transition Section
        <SectionTransition /> */}

        {/* Trust & Quality Showcase */}
        <BazaarTrustShowcase />


        {/* POS Lite Feature*/}
        <POSLiteFeature />

        {/* Seller Dashboard Preview - Interactive Demo */}
        <Hero195 />

        {/* Testimonials from Filipino Sellers */}
        <BazaarXTestimonials />

        {/* Brand Owner & CEO Testimonials */}
        <BrandTestimonials />

        {/* Featured Collections */}
        <FeaturedCollections />

        {/* Trending Products Rail */}
        <TrendingSection products={trendingProducts} />

        {/* Feature Strip 1 - Support Local */}
        <FeatureStrip
          title="Support Local Filipino Businesses"
          description="Every purchase helps strengthen Filipino communities and preserves traditional craftsmanship while supporting local entrepreneurs."
          image="https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=400&fit=crop"
          features={[
            "Verified local sellers from across the Philippines",
            "Direct support to Filipino entrepreneurs and artisans",
            "Authentic products with cultural heritage",
            "Sustainable business practices"
          ]}
          buttonText="Discover Local Sellers"
        />

        {/* Best Sellers Rail */}
        <ProductRail
          title="Best Sellers"
          subtitle="Top-rated products loved by thousands of customers"
          products={bestSellerProducts}
          actionLabel="View All Best Sellers"
        />

        {/* Featured Stores Rail */}
        <StoreRail
          title="Featured Stores"
          subtitle="Trusted sellers with verified quality and excellent service"
          stores={featuredStores}
          actionLabel="Explore All Stores"
        />

        {/* Feature Strip 2 - Secure Shopping */}
        <FeatureStrip
          title="Shop with Complete Confidence"
          description="Experience worry-free shopping with our comprehensive buyer protection, secure payments, and dedicated customer support."
          image="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop"
          features={[
            "100% secure payment processing",
            "Buyer protection guarantee",
            "24/7 customer support",
            "Easy returns and refunds"
          ]}
          buttonText="Learn About Protection"
          reverse={true}
        />

        {/* New Arrivals Rail */}
        <ProductRail
          title="New Arrivals"
          subtitle="Fresh finds from our newest sellers and latest collections"
          products={newArrivals}
          actionLabel="Explore New Products"
        />

        {/* Categories Footer Strip */}
        <CategoriesFooterStrip />

        {/* Bazaar Footer */}
        <BazaarFooter />

      </div>
    </SmoothScrollProvider>
  );
};

export default HomePage;