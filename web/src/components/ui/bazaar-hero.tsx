"use client";

import { ArrowUpRight, Menu, Search, ShoppingBasket } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";
import BazaarProductGallery3D from "./bazaar-product-gallery-3d";
import { Button } from "./button";
import { Separator } from "./separator";
import { motion } from "framer-motion";

const categories = [
  {
    title: "Electronics",
    image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=200&fit=crop",
    href: "/shop",
  },
  {
    title: "Filipino Crafts",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=200&fit=crop",
    href: "/shop",
  },
  {
    title: "Food & Beverages",
    image: "https://images.unsplash.com/photo-1559496417-e7f25cb247cd?w=200&h=200&fit=crop",
    href: "/shop",
  },
  {
    title: "Fashion",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&h=200&fit=crop",
    href: "/shop",
  },
];

const navigation = [
  { name: "Home", href: "/" },
  { name: "Shop", href: "/shop" },
  { name: "Collections", href: "/shop" },
  { name: "Stores", href: "/shop" },
];

export function BazaarHero() {
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
                <Button variant="ghost" size="icon" className="cursor-pointer relative group hover:text-[var(--brand-primary)] transition-colors">
                  <Search className="w-5 h-5" />
                </Button>
                <Link to="/cart">
                  <Button variant="ghost" size="icon" className="cursor-pointer relative group hover:text-[var(--brand-primary)] transition-colors">
                    <ShoppingBasket className="w-5 h-5" />
                  </Button>
                </Link>
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
                    <Button variant="outline" className="justify-start gap-2 h-12 hover:bg-accent transition-colors">
                      <Search className="w-4 h-4" />
                      Search Products
                    </Button>
                    <Button variant="outline" className="justify-start gap-2 h-12 hover:bg-accent transition-colors relative">
                      <ShoppingBasket className="w-4 h-4" />
                      Cart
                      <span className="absolute right-3 w-5 h-5 bg-[var(--brand-primary)] text-white text-xs rounded-full flex items-center justify-center">
                        3
                      </span>
                    </Button>
                  </div>
                  <Separator className="mx-6" />
                  <div className="p-6">
                    <Button className="w-full h-12 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] hover:from-[var(--brand-primary)]/90 hover:to-[var(--brand-primary-dark)]/90 transition-all duration-300 shadow-lg hover:shadow-xl">
                      Start Selling
                      <ArrowUpRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="hidden md:flex w-1/2 justify-end items-center pr-4 gap-4 ml-auto">
              <Button
                variant="secondary"
                className="cursor-pointer bg-white p-0 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                <span className="pl-4 py-2 text-sm font-medium text-[var(--text-primary)]">Start Selling</span>
                <div className="rounded-full flex items-center justify-center m-auto bg-[var(--brand-primary)] w-10 h-10 ml-2 group-hover:scale-110 transition-transform duration-300">
                  <ArrowUpRight className="w-5 h-5 text-white" />
                </div>
              </Button>
            </div>
          </header>

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
                Support local businesses and find quality products from trusted Filipino sellers across the Philippines.
              </motion.p>
              
              <motion.div
                className="mt-8 flex flex-col sm:flex-row gap-4 justify-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
              >
                <Link to="/shop">
                  <Button className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] px-8 py-3 rounded-full text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                    Start Shopping
                    <ArrowUpRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Button variant="outline" className="px-8 py-3 rounded-full text-[var(--brand-primary)] hover:bg-accent transition-colors">
                  Explore Stores
                </Button>
              </motion.div>
            </div>
          </section>
        </div>

        {/* 3D Product Gallery Section */}
        <motion.div
          className="mt-16 -mx-6 md:-mx-8 lg:-mx-12"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
        >
          <BazaarProductGallery3D />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto mt-16">
          {categories.map((category, index) => (
            <motion.div
              key={category.title}
              className="group relative bg-white backdrop-blur-sm rounded-3xl p-4 sm:p-6 min-h-[250px] sm:min-h-[300px] w-full overflow-hidden transition-all duration-500 shadow-sm hover:shadow-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
            >
              <a href={category.href} className="absolute inset-0 z-20">
                <h2 className="text-center text-2xl sm:text-3xl md:text-4xl lg:text-[clamp(1.5rem,4vw,2.5rem)] font-bold relative z-10 text-[var(--brand-primary)] my-2 sm:my-4 group-hover:text-[var(--brand-primary-dark)] transition-colors duration-300">
                  {category.title}
                </h2>
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <img
                    src={category.image}
                    alt={category.title}
                    className="w-full max-w-[min(40vw,200px)] sm:max-w-[min(30vw,180px)] md:max-w-[min(25vw,160px)] lg:max-w-[min(20vw,140px)] h-auto object-cover rounded-lg opacity-90 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500"
                  />
                </div>
                <div className="absolute bottom-0 right-0 w-16 h-16 md:w-20 md:h-20 bg-white backdrop-blur-sm rounded-tl-xl flex items-center justify-center z-10">
                  <div className="absolute bottom-2 right-2 md:bottom-3 md:right-3 w-10 h-10 md:w-12 md:h-12 bg-[var(--bg-surface)] rounded-full flex items-center justify-center group-hover:bg-[var(--brand-primary)] group-hover:text-white group-hover:scale-110 transition-all duration-300 shadow-lg">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                </div>
              </a>
            </motion.div>
          ))}
        </div>
    </div>
  );
}