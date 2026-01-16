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

const navigation = [
  { name: "Home", href: "/" },
  { name: "Shop", href: "/shop" },
  { name: "Collections", href: "/collections" },
  { name: "Stores", href: "/stores" },
];

export function BazaarHero() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

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

        <Hero
          title={
            <div className="flex flex-col items-center gap-6 mt-24">
              <span className="font-fondamento text-8xl text-[var(--brand-primary)]">BazaarX</span>
              <div className="h-40 w-px bg-gradient-to-b from-transparent via-[var(--brand-primary)] to-transparent"></div>
            </div>
          }
          subtitle="Inspired by ancient bazaars, reimagined as the modern crossroads of global trade."
          subtitleClassName="font-fondamento text-3xl mt-8"
          titleClassName="bg-gradient-to-r from-[var(--brand-primary)] via-[var(--brand-primary)]/90 to-[var(--brand-primary-dark)] bg-clip-text text-transparent"
        />
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

      {/* AI Chat Modal */}
      {/* <AIChatModal isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} /> */}
    </div>
  );
}