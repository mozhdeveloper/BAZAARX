import { BazaarHero } from "../components/ui/bazaar-hero";
import { FloatingNavigation } from "../components/ui/floating-navigation";
import BazaarXTestimonials from "../components/sections/BazaarXTestimonials";
import BrandTestimonials from "../components/sections/BrandTestimonials";
import BazaarTrustShowcase from "../components/ui/bazaar-trust-showcase";
import { MobileAppShowcase } from "../components/ui/mobile-app-showcase";
import { BazaarFooter } from "../components/ui/bazaar-footer";
import { POSLiteFeature } from "../components/sections/PosLite";
import { Hero195 } from "../components/ui/hero-195";
import FeatureStrip from "../components/sections/FeatureStrip";

export default function SellerLandingPage() {
    const sellerNavItems = [
        { id: "bazaar-dashboard", label: "Dashboard" },
        { id: "bazaar-pos", label: "POS Lite" },
        { id: "bazaar-trust-showcase", label: "Trust" },
        { id: "bazaarxtestimonials", label: "Testimonials" },
        { id: "bazaar-mobile", label: "Mobile App" },
    ];

    return (
        <main className="relative min-h-screen bg-white">
            {/* Dynamic Floating Navigation */}
            <FloatingNavigation navItems={sellerNavItems} />

            {/* Hero Section */}
            <div id="bazaar-hero">
                <BazaarHero mode="seller" scrollTargetId="bazaar-trust-showcase" />
            </div>

            {/* Seller Dashboard Preview */}
            <div id="bazaar-dashboard">
                <Hero195 />
            </div>

            {/* POS Lite */}
            <div id="bazaar-pos">
                <POSLiteFeature />
            </div>

            {/* Trust Showcase */}
            <div id="bazaar-trust-showcase" className="py-8">
                <BazaarTrustShowcase />
            </div>

            {/* Testimonials */}
            <div id="bazaarxtestimonials" className="pb-16">
                <BazaarXTestimonials />
                <div className="h-16"></div>
                <BrandTestimonials />
            </div>

            {/* Mobile App Showcase */}
            <div id="bazaar-mobile">
                <MobileAppShowcase mode="seller" />
            </div>

            <BazaarFooter />
        </main>
    );
}
