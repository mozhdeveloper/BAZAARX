import {
    AnimatePresence,
    motion,
    useMotionValueEvent,
    useScroll,
} from "framer-motion";
import { ArrowRight, ArrowUpRight, CircleCheck, Search, ShieldCheck, Truck, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { trendingProducts } from "../../data/products";
import { useBuyerStore } from "../../stores/buyerStore";
import { useProductStore } from "../../stores/sellerStore";
import { BuyerAuthModal } from "../BuyerAuthModal";
import ProductCard from "../ProductCard";
import ProductRequestModal from "../ProductRequestModal";
import { Button } from "./button";
import { Hero } from "./hero";

const navigation = [
  { name: "Home", href: "/" },
  { name: "Learn More", href: "/about-us" },
  { name: "Explore Shop", href: "/shop" },
];

interface BazaarHeroProps {
  mode?: "buyer" | "seller";
  scrollTargetId?: string;
  headerOnly?: boolean;
}

export function BazaarHero({ mode = "buyer", scrollTargetId = "bazaar-marketplace-intro", headerOnly = false }: BazaarHeroProps) {
  const [isBuyerAuthOpen, setIsBuyerAuthOpen] = useState(false);
  const [isProductRequestOpen, setIsProductRequestOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const { profile } = useBuyerStore();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const startHidingPoint = headerOnly ? 100 : window.innerHeight - 100;
    const footerElement = document.getElementById("bazaar-footer");
    const footerTop = footerElement ? footerElement.offsetTop - 300 : document.documentElement.scrollHeight - window.innerHeight - 100;

    // Hide header while scrolling between top section/hero and footer
    if (latest > startHidingPoint && latest < footerTop) {
      setIsHeaderVisible(false);
    } else {
      setIsHeaderVisible(true);
    }
  });

  const { products: fetchedProducts, fetchProducts } = useProductStore();

  useEffect(() => {
    // Fetch products if we don't have enough or if store is empty
    if (fetchedProducts.length === 0) {
      fetchProducts({
        isActive: true,
        approvalStatus: 'approved',
        limit: 12
      });
    }
  }, []);

  const featuredProduct = useMemo(() => {
    // Only use approved and active products
    const approvedProducts = fetchedProducts.filter(p => p.approvalStatus === 'approved' && p.isActive);

    if (approvedProducts.length > 0) {
      // Pick a random approved product
      const product = approvedProducts[Math.floor(Math.random() * approvedProducts.length)];
      // Ensure it has an image property for the card component
      return {
        ...product,
        image: product.images?.[0] || 'https://placehold.co/400?text=Product'
      };
    }

    // Fallback to mock data if no real products are available yet (e.g. initial load or no products in DB)
    return trendingProducts[Math.floor(Math.random() * trendingProducts.length)];
  }, [fetchedProducts]);

  return (
    <div className={`w-full relative container px-2 mx-auto max-w-7xl ${headerOnly ? "h-20" : "min-h-[100vh] pb-8"}`}>
      <div className={`mt-0 bg-transparent rounded-2xl relative ${headerOnly ? "" : ""}`}>
        <AnimatePresence>
          {isHeaderVisible && (
            <motion.header
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed top-0 left-0 right-0 z-50 w-full px-6 py-3"
            >
              <div className="flex items-center w-full">
                {/* Left Section: Desktop Nav + Mobile Menu */}
                <div className="flex-1 flex items-center justify-start gap-4 lg:gap-8">
                  {/* Nav: All tabs on the left */}
                  <nav className="flex items-center gap-3 lg:gap-6 flex-wrap sm:flex-nowrap">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="group relative py-1 whitespace-nowrap"
                        onClick={(e) => {
                          if (item.href.startsWith("#")) {
                            e.preventDefault();
                            document.getElementById(item.href.slice(1))?.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                      >
                        <span className={`text-sm transition-colors duration-200 ${window.location.pathname === item.href ? 'text-[var(--brand-primary)] font-bold' : 'text-[var(--text-muted)] hover:text-[var(--brand-accent)]'}`}>
                          {item.name}
                        </span>
                        {window.location.pathname === item.href && (
                          <motion.div
                            layoutId="nav-underline"
                            className="absolute -bottom-[2px] left-0 right-0 h-0.5 bg-[var(--brand-primary)] rounded-full"
                          />
                        )}
                      </Link>
                    ))}
                  </nav>
                </div>

                <div className="flex-1 flex justify-center px-4 max-w-2xl">
                  {mode === "buyer" ? (
                    <div className="w-full transition-all duration-300 ease-in-out sm:min-w-[200px] md:min-w-[300px] lg:min-w-[400px]">
                      <div className="w-full bg-white hover:bg-white backdrop-blur-md rounded-xl border border-[var(--btn-border)] flex items-center px-2 sm:px-3 py-1 relative shadow-sm group transition-all duration-300">
                        <Search className="h-3.5 w-3.5 text-[var(--text-muted)] group-focus-within:text-[var(--brand-primary)] transition-colors mr-1 sm:mr-2 flex-shrink-0" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search"
                          className="flex-1 h-7 bg-transparent border-none focus:ring-0 outline-none text-[12px] sm:text-[13px] text-gray-900 placeholder:text-gray-400 w-full min-w-0"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && searchQuery.trim()) {
                              navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
                            }
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-shrink-0 mx-2">
                      <Link
                        to="/"
                        className="flex items-center gap-2 hover:scale-110 transition-transform duration-300 transform origin-center"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      >
                        <img loading="eager" 
                          src="/BazaarX.png"
                          alt="BazaarX Logo"
                          className="h-8 md:h-10 lg:h-12 w-auto object-contain"
                        />
                      </Link>
                    </div>
                  )}
                </div>

                <div className="flex-1 flex items-center justify-end gap-2 lg:gap-8 min-w-max">
                  <div className="flex items-center gap-2">
                    {mode === "buyer" ? (
                      <div className="flex items-center gap-3 pr-2">
                        {!profile && (
                          <Link to="/login">
                            <Button
                              variant="ghost"
                              className="bg-transparent hover:bg-transparent flex items-center gap-2 px-2 group"
                            >
                              <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">Login</span>
                              <User className="w-5 h-5 text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors" />
                            </Button>
                          </Link>
                        )}
                        <Link to="/sell">
                          <Button
                            variant="secondary"
                            className="cursor-pointer bg-white p-0 rounded-full shadow-lg hover:shadow-xl hover:bg-[var(--brand-primary-dark)] transition-all duration-300 group h-10 hidden sm:flex"
                          >
                            <span className="pl-5 py-1.5 text-sm text-[var(--text-primary)] group-hover:text-white transition-colors duration-300">
                              Start Selling
                            </span>
                            <div className="rounded-full flex items-center justify-center m-auto bg-[var(--brand-primary)] w-8 h-8 ml-3 group-hover:bg-[var(--brand-primary-dark)] group-hover:scale-110 transition-all duration-300">
                              <ArrowUpRight className="w-4 h-4 text-white" />
                            </div>
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 pr-2">
                        <Link to="/seller/login">
                          <Button
                            variant="ghost"
                            className="bg-transparent hover:bg-transparent flex items-center gap-2 px-2 group"
                          >
                            <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">Login</span>
                            <User className="w-5 h-5 text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors" />
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.header>
          )}
        </AnimatePresence>

        {!headerOnly && (
          <Hero
            className="min-h-[100vh] lg:min-h-[90vh] !overflow-visible"
            gradient={false}
            title={null}
            subtitle={null}
          >
            <div className={`w-full grid items-center ${mode === "buyer" ? "grid-cols-2 gap-8 md:gap-16 lg:gap-30" : "grid-cols-1 max-w-6xl mx-auto py-12 lg:py-20"}`}>
              {/* Left Column: Branding & Search */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`flex flex-col gap-6 sm:gap-8 w-full ${mode === "buyer" ? "items-start text-left" : "items-center text-center max-w-4xl mx-auto"}`}
              >
                <div className="flex flex-col gap-6 sm:gap-8 w-full">
                  {/* Branding + Main Headline */}
                  <div className={`flex flex-col gap-4 ${mode === "seller" ? "items-center" : ""}`}>
                    {mode === "buyer" ? (
                      <span className="font-bold tracking-tighter text-5xl sm:text-7xl text-[var(--brand-primary)] leading-none">
                        BazaarX
                      </span>
                    ) : (
                      <span className="font-bold tracking-tight text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[var(--text-headline)] leading-tight whitespace-nowrap">
                        Build your business with <span className="text-[var(--brand-primary)]">BazaarX.</span>
                      </span>
                    )}

                    <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-[3.5rem] font-black text-[var(--text-headline)] leading-[0.95] tracking-tighter">
                      {mode === "buyer" ? (
                        <>
                          Trust the <span className="text-[var(--brand-primary)] font-fondamento">quality.</span><br />
                          <span className="block">Always.</span>
                        </>
                      ) : (
                        <>
                          Join thousands of <span className="text-[var(--brand-primary)] font-fondamento">trusted sellers.</span>
                        </>
                      )}
                    </h1>

                    <p className={`text-base sm:text-lg md:text-sm text-[var(--text-muted)] max-w-xl leading-relaxed mt-2 font-medium ${mode === "seller" ? "mx-auto" : ""}`}>
                      {mode === "buyer"
                        ? "A modern marketplace rooted in bazaar culture — where every listing is verified, every seller is vetted, and every purchase comes with confidence."
                        : "A modern marketplace rooted in bazaar culture — where trusted sellers connect with thousands of shoppers, every listing is verified, and every transaction is built on trust."}
                    </p>
                  </div>

                  {mode === "buyer" ? (
                    <div className="w-full mt-2 flex flex-col sm:flex-row items-center lg:justify-start gap-4">
                      <Link to="/about-us" className="w-full sm:w-auto">
                        <Button variant="outline" className="h-10 rounded-xl border-2 border-[var(--btn-border)] text-[var(--text-muted)] hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)] bg-white/50 hover:bg-white backdrop-blur-sm transition-all duration-300 shadow-sm hover:shadow-md text-sm w-full sm:w-auto">
                          Learn More
                        </Button>
                      </Link>
                      <Link to="/shop" className="w-full sm:w-auto">
                        <Button className="h-10 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)] transition-all duration-300 shadow-lg hover:shadow-xl text-sm group w-full sm:w-auto">
                          Start Shopping
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="w-full mt-2 flex justify-center">
                      <div className="flex justify-center">
                        <Link to="/seller/auth">
                          <Button className="h-16 px-10 rounded-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] transition-all duration-300 shadow-lg hover:shadow-xl text-xl font-bold group">
                            Start Selling Now
                            <ArrowUpRight className="w-5 h-5 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {mode === "buyer" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: 50 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                  className="flex justify-center items-center relative"
                >
                  {/* Decorative Elements */}
                  <div className="absolute -top-12 -right-12 w-64 h-64 bg-[var(--brand-accent)] opacity-5 rounded-full blur-[80px]" />
                  <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[var(--brand-primary)] opacity-10 rounded-full blur-[60px]" />

                  <div className="relative z-10 w-full max-w-[340px] text-left transform hover:rotate-1 transition-transform duration-700">
                    {/* Floating Badges */}
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute -top-30 -left-12 z-20 bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-xl flex items-center gap-3 border border-orange-100/50 min-w-[140px]"
                    >
                      <Truck className="w-5 h-5 text-[var(--brand-primary)]" />
                      <div>
                        <p className="text-[10px] font-bold text-gray-900 uppercase leading-none mb-1">Fast Delivery</p>
                        <p className="text-[9px] text-gray-400 font-medium">3-5 business days</p>
                      </div>
                    </motion.div>

                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                      className="absolute top-1/2 -right-16 -translate-y-1/2 z-20 bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-xl flex items-center gap-3 border border-green-100/50 min-w-[140px]"
                    >
                      <CircleCheck className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-[10px] font-bold text-gray-900 uppercase leading-none mb-1">QA Certified</p>
                        <p className="text-[9px] text-gray-400 font-medium">Inspected & approved</p>
                      </div>
                    </motion.div>

                    <motion.div
                      animate={{ y: [0, 5, 0] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                      className="absolute -bottom-8 -left-16 z-20 bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-xl flex items-center gap-3 border border-blue-100/50 min-w-[140px]"
                    >
                      <ShieldCheck className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-[10px] font-bold text-gray-900 uppercase leading-none mb-1">Verified Seller</p>
                        <p className="text-[9px] text-gray-400 font-medium">Trustworthy partner</p>
                      </div>
                    </motion.div>

                    {/* Non-clickable container for the card */}
                    <div className="pointer-events-none select-none relative z-10">
                      <ProductCard
                        product={featuredProduct}
                        index={0}
                        variant="hero"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </Hero>
        )}
      </div>

      {/* Buyer Auth Modal */}
      <BuyerAuthModal
        isOpen={isBuyerAuthOpen}
        onClose={() => setIsBuyerAuthOpen(false)}
        initialMode="login"
      />

      <ProductRequestModal
        isOpen={isProductRequestOpen}
        onClose={() => setIsProductRequestOpen(false)}
      />
    </div>
  );
}
