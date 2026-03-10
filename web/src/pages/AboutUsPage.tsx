import React, { Suspense, lazy } from "react";
import { BazaarHero } from "../components/ui/bazaar-hero";
import { BazaarFooter } from "../components/ui/bazaar-footer";
import { FloatingNavigation } from "@/components/ui/floating-navigation";

// Lazy load the components moved from HomePage
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

// Loading fallback component
const SectionLoader = () => (
    <div className="w-full py-20 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
    </div>
);

const aboutNavItems = [
    { id: "bazaar-origin", label: "Origin" },
    { id: "bazaar-exchange", label: "Exchange" },
    { id: "bazaar-culture", label: "Culture" },
    { id: "bazaar-modernity", label: "Modernity" },
    { id: "bazaar-gateway", label: "Gateway" },
];

const AboutUsPage: React.FC = () => {
    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--brand-wash)' }}>
            <BazaarHero mode="buyer" headerOnly={true} />
            <FloatingNavigation navItems={aboutNavItems} />

            <div>
                <Suspense fallback={<SectionLoader />}>
                    {/* Bazaar history section  */}
                    <div id="bazaar-origin">
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
                    <div id="bazaar-gateway">
                        <BazaarMarketplaceIntro />
                    </div>
                </Suspense>
            </div>

            <BazaarFooter />
        </div>
    );
};

export default AboutUsPage;
