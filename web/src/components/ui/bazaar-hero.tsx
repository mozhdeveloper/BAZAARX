import { useState } from "react";
import { ArrowUpRight, Menu, Search, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
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
    // Hide header when scrolling past Hero (100vh) until BazaarMarketplaceIntro
    const heroHeight = window.innerHeight - 100;
    const introSection = document.getElementById("bazaar-marketplace-intro");

    // If we can't find the section, defaulting to showing the header might be safer
    // or keep separate logic. For now, we assume it exists.
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
                  <Link to="/" className="flex items-center">
                    <img
                      src="/Logo.png"
                      alt="Bazaar Logo"
                      className="w-12 h-12 object-contain"
                    />
                  </Link>

                  <nav className="hidden lg:flex items-center gap-5">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="cursor-pointer relative group hover:text-[var(--brand-primary)] transition-colors text-[var(--text-primary)] font-medium text-base"
                      >
                        {item.name}
                      </Link>
                    ))}
                    <div className="flex items-center gap-2 ml-2">
                      <Link to="/search">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="cursor-pointer relative group hover:text-[var(--brand-primary)] transition-colors h-9 w-9"
                        >
                          <Search className="w-5 h-5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsAIChatOpen(true)}
                        className="cursor-pointer relative group hover:text-[var(--brand-primary)] transition-colors h-9 w-9"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </Button>
                    </div>
                  </nav>

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
                              src="/Logo.png"
                              alt="Bazaar Logo"
                              className="w-10 h-10 object-contain"
                            />
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
                          <MessageCircle className="w-4 h-4" />
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

                {/* Right Section: Start Selling */}
                <div className="hidden md:flex items-center">
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
          title={
            <div className="flex flex-col items-center gap-3 sm:gap-4 md:gap-6 mt-24 sm:mt-28 md:mt-36">
              <span className="font-fondamento text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[10rem] text-[var(--brand-primary)]">
                BazaarX
              </span>
              <div className="h-32 sm:h-40 md:h-48 lg:h-52 w-px bg-gradient-to-b from-transparent via-[var(--brand-primary)] to-transparent" />
            </div>
          }
          subtitle="Inspired by ancient bazaars. Reimagined as the modern crossroads of global trade."
          subtitleClassName="font-fondamento text-lg sm:text-xl md:text-2xl mt-4 sm:mt-6 text-center px-4"
          actions={[
            {
              label: "Start Shopping",
              onClick: () => setIsBuyerAuthOpen(true),
              variant: "default",
            },
            {
              label: "Explore Stores",
              href: "/stores",
              variant: "outline",
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
