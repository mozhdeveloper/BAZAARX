import { useState } from "react";
import { ArrowUpRight, Menu, Search, Bot, ShoppingBag, Store } from "lucide-react";
import { Link } from "react-router-dom";
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
import AIChatModal from "../AIChatModal";
import { BuyerAuthModal } from "../BuyerAuthModal";

const navigation = [
  { name: "Home", href: "/" },
  { name: "Shop", href: "/shop" },
  { name: "Collections", href: "/collections" },
  { name: "Stores", href: "/stores" },
];

export function BazaarHero() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isBuyerAuthOpen, setIsBuyerAuthOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const heroHeight = window.innerHeight - 100;
    const introSection = document.getElementById("bazaar-marketplace-intro");
    const showAgainPoint = introSection ? introSection.offsetTop - 100 : 999999;

    if (latest > heroHeight && latest < showAgainPoint) {
      setIsHeaderVisible(false);
    } else {
      setIsHeaderVisible(true);
    }
  });

  return (
    <div className="w-full relative container px-2 mx-auto max-w-7xl min-h-[100vh] pb-8">
      <div className="mt-0 bg-white rounded-2xl relative overflow-hidden">
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
                    <span className="text-2xl font-bold text-[#ff6a00] tracking-tight">
                      BazaarX
                    </span>
                  </Link>



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
                            <span className="text-xl font-bold text-[#ff6a00] tracking-tight">
                              BazaarX
                            </span>
                          </a>
                        </SheetTitle>
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
                        <Button
                          variant="outline"
                          onClick={() => setIsAIChatOpen(true)}
                          className="w-full justify-start gap-2 h-12 hover:bg-accent transition-colors"
                        >
                          <Bot className="w-4 h-4" />
                          AI Assistant
                        </Button>
                      </div>
                      <Separator className="mx-6" />
                      <div className="p-6">
                        <Link to="/seller/auth">
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
                  <div className="flex items-center gap-1 mr-2">

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsAIChatOpen(true)}
                      className="cursor-pointer relative group hover:text-[var(--brand-primary)] hover:bg-transparent transition-colors h-9 w-9"
                    >
                      <Bot className="w-5 h-5" />
                    </Button>
                  </div>
                  <Link to="/seller/auth">
                    <Button
                      variant="secondary"
                      className="cursor-pointer bg-white p-0 rounded-full shadow-lg hover:shadow-xl hover:bg-orange-600 transition-all duration-300 group h-10"
                    >
                      <span className="pl-5 py-1.5 text-sm text-[var(--text-primary)] hover:text-white">
                        Start Selling
                      </span>
                      <div className="rounded-full flex items-center justify-center m-auto bg-[var(--brand-primary)] w-8 h-8 ml-3 group-hover:scale-110 transition-transform duration-300">
                        <ArrowUpRight className="w-4 h-4 text-white" />
                      </div>
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.header>
          )}
        </AnimatePresence>

        <Hero
          className="min-h-[95vh]"
          title={
            <div className="flex flex-col items-center gap-3 sm:gap-4 md:gap-6">
              <span className="font-fondamento font-bold tracking-tighter text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[12rem] text-[var(--brand-primary)]">
                BazaarX
              </span>
            </div>
          }
          subtitle="From global factories directly to your doorstep "
          subtitleClassName="font-fondamento text-xl sm:text-2xl md:text-3xl mt-0 sm:mt-1 text-center px-4 w-full whitespace-nowrap overflow-hidden text-ellipsis"
          actions={[
            {
              label: "Start Shopping",
              href: "/shop",
              variant: "default",
              className: "bg-[#FF6A00] hover:bg-base text-white rounded-2xl pl-10 pr-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group flex items-center gap-3",
              icon: (
                <ShoppingBag className="w-6 h-6 text-white transition-colors" />
              )
            },
            {
              label: "Explore Stores",
              href: "/stores",
              variant: "outline",
              className: "bg-white hover:text-gray-900 hover:bg-base text-gray-900 border border-gray-200 rounded-2xl pl-10 pr-8 py-6 text-lg font-semibold shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300 group flex items-center gap-3",
              icon: (
                <Store className="w-6 h-6 text-gray-900" />
              )
            },
          ]}
          titleClassName="bg-gradient-to-r from-[var(--brand-primary)] via-[var(--brand-primary)]/90 to-[var(--brand-primary-dark)] bg-clip-text text-transparent"
        />
      </div>

      {/* AI Chat Modal */}
      <AIChatModal
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
      />

      {/* Buyer Auth Modal */}
      <BuyerAuthModal
        isOpen={isBuyerAuthOpen}
        onClose={() => setIsBuyerAuthOpen(false)}
        initialMode="login"
      />
    </div>
  );
}
