import React, { Suspense, lazy } from "react";
import { BazaarHero } from "../components/ui/bazaar-hero";
import { BazaarGuarantee } from "../components/ui/bazaar-guarantee";
import { BazaarFooter } from "../components/ui/bazaar-footer";
import { CampaignCountdown } from '../components/shop/CampaignCountdown';
import { FloatingNavigation } from "@/components/ui/floating-navigation";

// Lazy load heavy scroll-animated components
const MobileAppShowcase = lazy(() =>
  import("../components/ui/mobile-app-showcase").then((m) => ({
    default: m.MobileAppShowcase,
  })),
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

const ConfidenceStats = lazy(() => import("../components/sections/ConfidenceStats"));

// Data imports
import { bestSellerProducts, newArrivals } from "../data/products";
import { featuredStores } from "../data/stores";
import { productService } from "../services/productService";
import { discountService } from "../services/discountService";

// Loading fallback component
const SectionLoader = () => (
  <div className="w-full py-20 flex items-center justify-center">
    <div className="animate-pulse text-gray-400">Loading...</div>
  </div>
);

const buyerNavItems = [
  { id: "bazaar-guarantee", label: "Guarantee" },
  { id: "bazaar-categories", label: "Categories" },
  { id: "bazaar-collections", label: "Collections" },
  { id: "bazaar-bestsellers", label: "Best Sellers" },
  { id: "bazaar-stores", label: "Stores" },
  { id: "bazaar-new", label: "New" },
  { id: "bazaar-confidence", label: "Confidence" },
  { id: "bazaar-mobile", label: "Mobile App" },
];

const HomePage: React.FC = () => {
  const [flashSaleProducts, setFlashSaleProducts] = React.useState<any[]>([]);
  const [flashLoading, setFlashLoading] = React.useState(true);
  const [flashEndsAt, setFlashEndsAt] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadFlashSales = async () => {
      try {
        const data = await discountService.getFlashSaleProducts();
        if (data && data.length > 0) {
          setFlashSaleProducts(data);
          // Find the earliest ending campaign
          const earliest = data
            .map((p: any) => p.campaignEndsAt)
            .filter(Boolean)
            .sort()
          [0];
          if (earliest) setFlashEndsAt(earliest);
        }
      } catch (e) {
        console.error('Failed to load flash deals', e);
      } finally {
        setFlashLoading(false);
      }
    };
    loadFlashSales();
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--brand-wash)' }}>
      <FloatingNavigation navItems={buyerNavItems} />

      {/* Bazaar Hero */}
      <BazaarHero mode="buyer" />

      {/* Bazaar Guarantee Section */}
      <div id="bazaar-guarantee">
        <BazaarGuarantee />
      </div>

      <Suspense fallback={<SectionLoader />}>
        {/* Categories Footer Strip */}
        <div id="bazaar-categories">
          <CategoriesFooterStrip />
        </div>
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        {/* Featured Collections */}
        <div id="bazaar-collections">
          <FeaturedCollections />
        </div>
      </Suspense>

      {/* Flash Sale Rail - only shown when there are active campaigns */}
      {!flashLoading && flashSaleProducts.length > 0 && (
        <Suspense fallback={<SectionLoader />}>
          <div id="bazaar-flash-sales">
            <ProductRail
              title="Flash Sales"
              subtitle="Limited time offers from our trusted sellers!"
              products={flashSaleProducts.slice(0, 4)}
              actionLabel="See All Flash Sales"
              actionLink="/flash-sales"
              isFlash={true}
              countdownEndDate={flashEndsAt ? new Date(flashEndsAt) : undefined}
            />
          </div>
        </Suspense>
      )}

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
            actionLink="/stores"
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
            title="Your Satisfaction, Secured."
            description="BazaarX maintains the highest standards of trust and quality. We ensure strict verification for all sellers so you can shop with complete peace of mind."
            image="https://images.unsplash.com/photo-1562564055-71e051d33c19?auto=format&fit=crop&w=1000&q=80"
            features={[
              "Verified Seller Badges",
              "Secure Payment Processing",
              "24/7 Customer Support",
              "Strict Quality Control",
            ]}
            buttonText="Shop with Confidence"
            buttonAction={() => window.location.href = '/shop'}
          />
          <ConfidenceStats />
        </div>
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        {/* Mobile App Showcase */}
        <div id="bazaar-mobile">
          <MobileAppShowcase mode="buyer" />
        </div>
      </Suspense>

      {/* Bazaar Footer */}
      <BazaarFooter />
    </div>
  );
};

export default HomePage;
