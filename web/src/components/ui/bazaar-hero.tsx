import { useState, useMemo, useEffect } from "react";
import { ArrowUpRight, Menu, Search, Bot, ShoppingBag, Store, Camera, Sparkles, Truck, ShieldCheck, CircleCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  motion,
  useScroll,
  useMotionValueEvent,
  AnimatePresence,
} from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";
import { Button } from "./button";
import { Separator } from "./separator";
import { Hero } from "./hero";
import { BuyerAuthModal } from "../BuyerAuthModal";
import ProductRequestModal from "../ProductRequestModal";
import ProductCard from "../ProductCard";
import { trendingProducts } from "../../data/products";
import { useProductStore } from "../../stores/sellerStore";

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
                <div className="flex-1 flex items-center justify-start gap-8">
                  <Sheet>
                    <SheetTrigger asChild className="lg:hidden">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:text-[var(--brand-primary)] transition-colors h-9 w-9"
                      >
                        <Menu className="w-5 h-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent
                      side="left"
                      className="w-[300px] sm:w-[400px] p-0 bg-white/95 backdrop-blur-md border-r border-border/50"
                    >
                      <SheetHeader className="p-6 text-left border-b border-border/50">
                        <SheetTitle className="flex items-center justify-between">
                          <a href="#" className="flex items-center gap-2">
                            <img
                              src="/BazaarX.png"
                              alt="BazaarX Logo"
                              className="h-10 w-auto object-contain"
                            />
                          </a>
                        </SheetTitle>
                        <div className="flex gap-2 mt-4">
                          <Link
                            to="/"
                            className={`flex-1 text-center py-2 rounded-lg text-sm font-medium border ${mode === 'buyer' ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] bg-[var(--brand-accent-light)]' : 'border-gray-200 text-gray-600'}`}
                          >
                            Buyer
                          </Link>
                          <Link
                            to="/sell"
                            className={`flex-1 text-center py-2 rounded-lg text-sm font-medium border ${mode === 'seller' ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] bg-[var(--brand-accent-light)]' : 'border-gray-200 text-gray-600'}`}
                          >
                            Seller
                          </Link>
                        </div>
                      </SheetHeader>
                      <nav className="flex flex-col p-6 space-y-1">
                        {navigation.map((item) => (
                          <Button
                            key={item.name}
                            variant="ghost"
                            className="justify-start px-2 h-12 text-base font-medium hover:bg-accent hover:text-[var(--brand-primary)] transition-colors"
                            onClick={() => {
                              if (item.href.startsWith("#")) {
                                document.getElementById(item.href.slice(1))?.scrollIntoView({ behavior: 'smooth' });
                              } else {
                                navigate(item.href);
                              }
                            }}
                          >
                            {item.name}
                          </Button>
                        ))}
                      </nav>
                      <Separator className="mx-6" />
                      <div className="p-6 flex flex-col gap-4">
                        <Link to="/search">
                          <Button
                            variant="outline"
                            className="w-full justify-start gap-2 h-12 hover:bg-accent transition-colors"
                          >
                            <Search className="w-4 h-4" />
                            Search Products
                          </Button>
                        </Link>
                      </div>
                      <Separator className="mx-6" />
                      <div className="p-6">
                        <Link to={mode === 'buyer' ? '/sell' : '/seller/auth'}>
                          <Button className="w-full h-12 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] transition-all duration-300 shadow-lg hover:shadow-xl">
                            Start Selling
                            <ArrowUpRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </SheetContent>
                  </Sheet>

                  {/* Desktop Nav: All tabs on the left */}
                  <nav className="hidden lg:flex items-center gap-6">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="group relative py-1"
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

                {/* Center Section: Logo */}
                <div className="flex-shrink-0">
                  <Link
                    to="/"
                    className="flex items-center gap-2 hover:scale-110 transition-transform duration-300 transform origin-center"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  >
                    <img
                      src="/BazaarX.png"
                      alt="BazaarX Logo"
                      className="h-10 sm:h-12 w-auto object-contain"
                    />
                  </Link>
                </div>

                {/* Right Section: Header Actions */}
                <div className="flex-1 flex items-center justify-end gap-8">
                  <div className="hidden md:flex items-center gap-2">
                    {mode === "buyer" && (
                      <Link to="/sell">
                        <Button
                          variant="secondary"
                          className="cursor-pointer bg-white p-0 rounded-full shadow-lg hover:shadow-xl hover:bg-[var(--brand-primary-dark)] transition-all duration-300 group h-10"
                        >
                          <span className="pl-5 py-1.5 text-sm text-[var(--text-primary)] hover:text-white">
                            Start Selling
                          </span>
                          <div className="rounded-full flex items-center justify-center m-auto bg-[var(--brand-primary)] w-8 h-8 ml-3 group-hover:bg-[var(--brand-primary-dark)] group-hover:scale-110 transition-all duration-300">
                            <ArrowUpRight className="w-4 h-4 text-white" />
                          </div>
                        </Button>
                      </Link>
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
            <div className={`w-full grid items-center ${mode === "buyer" ? "grid-cols-1 lg:grid-cols-2 gap-24 lg:gap-30" : "grid-cols-1 max-w-6xl mx-auto py-12 lg:py-20"}`}>
              {/* Left Column: Branding & Search */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`flex flex-col items-center ${mode === "buyer" ? "lg:items-start text-center lg:text-left" : "text-center"} gap-6 sm:gap-8 w-full`}
              >
                <div className="flex flex-col gap-6 sm:gap-8">
                  {/* Branding + Main Headline */}
                  <div className="flex flex-col gap-4">
                    {mode === "buyer" ? (
                      <span className="font-bold tracking-tighter text-5xl sm:text-7xl text-[var(--brand-primary)] leading-none">
                        BazaarX
                      </span>
                    ) : (
                      <span className="font-bold tracking-tight text-4xl sm:text-6xl text-[var(--text-headline)] whitespace-nowrap">
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

                  <div className={`w-full mt-2 ${mode === "seller" ? "flex justify-center" : "max-w-2xl"}`}>
                    {mode === "buyer" ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                      >
                        <div className="flex-1 w-full bg-white rounded-xl border border-[var(--btn-border)] flex items-center px-4 py-1 relative shadow group transition-all duration-200 focus-within:ring-1 focus-within:ring-[var(--brand-primary)] focus-within:ring-offset-0">
                          <Search className="h-4 w-4 text-gray-400 group-focus-within:text-[var(--brand-primary)] transition-colors mr-2 flex-shrink-0" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search products, categories, stores..."
                            className="flex-1 h-12 sm:h-10 bg-transparent border-none focus:ring-0 outline-none text-base sm:text-sm text-gray-900 placeholder:text-gray-400"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && searchQuery.trim()) {
                                navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                              }
                            }}
                          />
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex justify-center">
                        <Link to="/seller/auth">
                          <Button className="h-16 px-10 rounded-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] transition-all duration-300 shadow-lg hover:shadow-xl text-xl font-bold group">
                            Start Selling Now
                            <ArrowUpRight className="w-5 h-5 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Right Column: Featured Product Card */}
              {mode === "buyer" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: 50 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                  className="hidden lg:flex justify-center items-center relative"
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
