import { useState } from "react";
import { ArrowUpRight, Menu, Search, Bot, ShoppingBag, Store, Camera } from "lucide-react";
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

const navigation = [
  { name: "Home", href: "/" },
  { name: "Shop", href: "/shop" },
  { name: "Collections", href: "/collections" },
  { name: "Stores", href: "/stores" },
];

interface BazaarHeroProps {
  mode?: "buyer" | "seller";
  scrollTargetId?: string;
}

export function BazaarHero({ mode = "buyer", scrollTargetId = "bazaar-marketplace-intro" }: BazaarHeroProps) {
  const [isBuyerAuthOpen, setIsBuyerAuthOpen] = useState(false);
  const [isProductRequestOpen, setIsProductRequestOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const heroHeight = window.innerHeight - 100;
    const introSection = document.getElementById(scrollTargetId);
    const showAgainPoint = introSection ? introSection.offsetTop - 100 : 999999;

    if (latest > heroHeight && latest < showAgainPoint) {
      setIsHeaderVisible(false);
    } else {
      setIsHeaderVisible(true);
    }
  });

  return (
    <div className="w-full relative container px-2 mx-auto max-w-7xl min-h-[100vh] pb-8">
      <div className="mt-0 bg-transparent rounded-2xl relative overflow-hidden">
        <AnimatePresence>
          {isHeaderVisible && (
            <motion.header
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed top-0 left-0 right-0 z-50 w-full px-6 py-3"
            >
              <div className="flex items-center justify-between w-full">
                {/* Left Section: Logo + Nav */}
                <div className="flex items-center gap-6">
                  <div
                    className="flex items-center gap-4"
                  >
                    <Link
                      to="/"
                      className="flex items-center gap-2 hover:scale-110 transition-transform duration-300 transform origin-left"
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                      <img
                        src="/BazaarX.png"
                        alt="BazaarX Logo"
                        className="h-12 w-auto object-contain"
                      />
                      <span className="text-2xl font-bold text-[var(--brand-primary)] tracking-tight">
                        BazaarX
                      </span>
                    </Link>

                  </div>

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
                            <span className="text-xl font-bold text-[var(--brand-primary)] tracking-tight">
                              BazaarX
                            </span>
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
                          <Button className="w-full h-12 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] hover:from-[var(--brand-primary)]/90 hover:to-[var(--brand-primary-dark)]/90 transition-all duration-300 shadow-lg hover:shadow-xl">
                            Start Selling
                            <ArrowUpRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

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
            </motion.header>
          )}
        </AnimatePresence>

        <Hero
          className="min-h-[95vh]"
          title={
            <div className="flex flex-col items-center gap-3 sm:gap-4 md:gap-6">
              <span className="font-fondamento font-bold tracking-tighter text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[12rem] text-[var(--brand-primary)] leading-[0.85]">
                BazaarX
              </span>
            </div>
          }
          subtitle={mode === "buyer" ? "From global factories directly to your doorstep" : "Inspired by ancient bazaars. Reimagined as the modern crossroads for global trade."}
          subtitleClassName="font-fondamento text-xl sm:text-2xl md:text-3xl !mt-0 sm:!mt-[-0.5rem] text-center px-4 w-full whitespace-nowrap overflow-hidden text-ellipsis text-[var(--text-headline)]"
          titleClassName="bg-gradient-to-r from-[var(--brand-primary)] via-[var(--brand-wash-gold)] to-[var(--brand-primary-dark)] bg-clip-text text-transparent"
        >
          <div className="w-full max-w-4xl mt-12 sm:mt-24 px-4">
            {mode === "buyer" ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="bg-[var(--brand-wash)] p-2 sm:p-3 rounded-[32px] sm:rounded-full shadow-md flex flex-col sm:flex-row items-center gap-3 sm:gap-4 border border-white/40 backdrop-blur-md"
              >
                {/* Search Unit */}
                <div className="flex-1 w-full bg-white rounded-full flex items-center px-4 py-1 relative shadow-inner group">
                  <Search className="h-6 w-6 text-gray-400 group-focus-within:text-[var(--brand-primary)] transition-colors mr-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products, brands, factories..."
                    className="flex-1 h-11 sm:h-14 bg-transparent border-none focus:ring-0 outline-none sm:text-lg text-gray-900 placeholder:text-gray-300 text-xs font-small"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                      }
                    }}
                  />
                </div>

                {/* Action Buttons (Outside search bar, inside container) */}
                <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-0">
                  <div className="relative group/btn">
                    <span className="absolute top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/btn:opacity-100 group-hover/btn:top-12 transition-all duration-300 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-[var(--brand-primary-dark)] whitespace-nowrap pointer-events-none z-50">
                      Start Shopping
                    </span>
                    <Link
                      to="/shop"
                      className="p-2 sm:p-3 rounded-full transition-all text-[var(--brand-primary-dark)] hover:text-[var(--brand-primary)] block"
                    >
                      <ShoppingBag className="w-6 h-6 sm:w-7 sm:h-7" />
                    </Link>
                  </div>

                  <div className="relative group/btn">
                    <span className="absolute top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/btn:opacity-100 group-hover/btn:top-12 transition-all duration-300 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-[var(--brand-primary-dark)] whitespace-nowrap pointer-events-none z-50">
                      Explore Stores
                    </span>
                    <Link
                      to="/stores"
                      className="p-2 sm:p-3 rounded-full transition-all text-[var(--brand-primary-dark)] hover:text-[var(--brand-primary)] block"
                    >
                      <Store className="w-6 h-6 sm:w-7 sm:h-7" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="flex justify-center"
              >
                <Link to="/seller/auth">
                  <Button className="h-14 px-10 rounded-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] hover:from-[var(--brand-primary)]/90 hover:to-[var(--brand-primary-dark)]/90 transition-all duration-300 shadow-lg hover:shadow-xl text-lg font-bold group">
                    Start Selling Now
                    <ArrowUpRight className="w-5 h-5 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </Button>
                </Link>
              </motion.div>
            )}
          </div>
        </Hero>
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
