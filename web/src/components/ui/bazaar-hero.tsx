"use client";

import { useState } from "react";
import { ArrowUpRight, Menu, Search, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";
//import BazaarProductGallery3D from "./bazaar-product-gallery-3d";
import { Button } from "./button";
import { Separator } from "./separator";
//import { motion } from "framer-motion";
//import AIChatModal from "../AIChatModal";
import { Hero } from "./hero";
import { motion } from "framer-motion";
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

  return (
    <div className="w-full relative container px-2 mx-auto max-w-7xl min-h-screen">

      <div className="mt-6 bg-white rounded-2xl relative">
        <header className="flex items-center">
          <div className="w-full md:w-2/3 lg:w-1/2 bg-white backdrop-blur-sm p-4 rounded-br-2xl flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/Logo.png"
                alt="Bazaar Logo"
                className="w-16 h-16 object-contain"
              />
            </Link>
      <div className="mt-6 bg-white rounded-2xl relative">
        <header className="flex items-center">
          <div className="w-full md:w-2/3 lg:w-1/2 bg-white backdrop-blur-sm p-4 rounded-br-2xl flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/Logo.png"
                alt="Bazaar Logo"
                className="w-16 h-16 object-contain"
              />
            </Link>

            <nav className="hidden lg:flex items-center justify-between w-full">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="cursor-pointer relative group hover:text-[var(--brand-primary)] transition-colors text-[var(--text-primary)] font-medium px-3 py-2"
                >
                  {item.name}
                </Link>
              ))}
              <Link to="/search">
                <Button variant="ghost" size="icon" className="cursor-pointer relative group hover:text-[var(--brand-primary)] transition-colors">
                  <Search className="w-5 h-5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsAIChatOpen(true)}
                className="cursor-pointer relative group hover:text-[var(--brand-primary)] transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
              </Button>
            </nav>
            <nav className="hidden lg:flex items-center justify-between w-full">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="cursor-pointer relative group hover:text-[var(--brand-primary)] transition-colors text-[var(--text-primary)] font-medium px-3 py-2"
                >
                  {item.name}
                </Link>
              ))}
              <Link to="/search">
                <Button
                  variant="ghost"
                  size="icon"
                  className="cursor-pointer relative group hover:text-[var(--brand-primary)] transition-colors"
                >
                  <Search className="w-5 h-5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsAIChatOpen(true)}
                className="cursor-pointer relative group hover:text-[var(--brand-primary)] transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
              </Button>
            </nav>

            <Sheet>
              <SheetTrigger asChild className="lg:hidden ml-auto">
                <Button variant="ghost" size="icon" className="hover:text-[var(--brand-primary)] transition-colors">
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
                        className="w-12 h-12 object-contain"
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
                    <Button variant="outline" className="w-full justify-start gap-2 h-12 hover:bg-accent transition-colors">
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
            <Sheet>
              <SheetTrigger asChild className="lg:hidden ml-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:text-[var(--brand-primary)] transition-colors"
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
                        className="w-12 h-12 object-contain"
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

          <div className="hidden md:flex w-1/2 justify-end items-center pr-4 gap-4 ml-auto">
            <Link to="/seller/auth">
              <Button
                variant="secondary"
                className="cursor-pointer bg-white p-0 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                <span className="pl-4 py-2 text-sm font-medium text-[var(--text-primary)]">Start Selling</span>
                <div className="rounded-full flex items-center justify-center m-auto bg-[var(--brand-primary)] w-10 h-10 ml-2 group-hover:scale-110 transition-transform duration-300">
                  <ArrowUpRight className="w-5 h-5 text-white" />
                </div>
              </Button>
            </Link>
          </div>
        </header>
          <div className="hidden md:flex w-1/2 justify-end items-center pr-4 gap-4 ml-auto">
            <Link to="/seller/auth">
              <Button
                variant="secondary"
                className="cursor-pointer bg-white p-0 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                <span className="pl-4 py-2 text-sm font-medium text-[var(--text-primary)]">
                  Start Selling
                </span>
                <div className="rounded-full flex items-center justify-center m-auto bg-[var(--brand-primary)] w-10 h-10 ml-2 group-hover:scale-110 transition-transform duration-300">
                  <ArrowUpRight className="w-5 h-5 text-white" />
                </div>
              </Button>
            </Link>
          </div>
        </header>

        <Hero
          title={
          <>
          Your Gateway
          <br />
          <span className="text-black">to Global Markets</span>
          </>
        }
          subtitle="Skip the middlemen and explore curated products from makers worldwide—delivered directly to you."
          actions={[
            {
              label: "Start Shopping",
              href: "/shop",
              variant: "default"
            },
            {
              label: "Explore Stores",
              href: "/stores", 
              variant: "outline"
            }
          ]}
          titleClassName="bg-gradient-to-r from-[var(--brand-primary)] via-[var(--brand-primary)]/90 to-[var(--brand-primary-dark)] bg-clip-text text-transparent"
        />
      </div>
        <section className="w-full px-4 py-24">
          <div className="mx-auto text-center">
            <motion.h1
              className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            >
              <span className="bg-gradient-to-r from-[var(--brand-primary)] via-[var(--brand-primary)]/90 to-[var(--brand-primary-dark)] bg-clip-text text-transparent">
                Discover Authentic
              </span>
              <br />
              <span className="text-[var(--text-primary)]">
                Filipino Excellence
              </span>
            </motion.h1>
            <motion.p
              className="text-base md:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            >
              Support local businesses and find quality products from trusted
              Filipino sellers across the Philippines.
            </motion.p>

            <motion.div
              className="mt-8 flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
            >
              <Button
                onClick={() => setIsBuyerAuthOpen(true)}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] px-8 py-3 rounded-full text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Start Shopping
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Button>
              <Link to="/stores">
                <Button
                  variant="outline"
                  className="px-8 py-3 rounded-full text-[var(--brand-primary)] hover:bg-accent transition-colors"
                >
                  Explore Stores
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </div>

      {/* 3D Product Gallery Section
      <motion.div
        className="mt-16 -mx-6 md:-mx-8 lg:-mx-12"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
      >
        <BazaarProductGallery3D />
      </motion.div>
      {/* 3D Product Gallery Section */}
      <motion.div
        className="mt-16 -mx-6 md:-mx-8 lg:-mx-12"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
      >
        <BazaarProductGallery3D />
      </motion.div>

      {/* AI Chat Modal */}
      {/* <AIChatModal isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} /> */}
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
